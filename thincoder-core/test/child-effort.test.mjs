/** Spawned children validate inherited effort only after their account catalog is ready. */
import test, { beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createAgent } from "../agent.mjs"
import { buildSpawnChild } from "../agent-tools/subagent-spawn.mjs"
import { refreshAgentModelInfo } from "../agent/model-info.mjs"
import { callModelTurn } from "../agent/chat-call.mjs"
import { attachResponsesSession } from "../responses-session.mjs"
import { buildBody } from "../provider/responses-request.mjs"
import { recordModelCatalog, _clearModelInfoForTest } from "../provider/model-info.mjs"
import { _setAuthServiceForTest } from "../provider/auth-context.mjs"

const originalFetch = globalThis.fetch, originalNow = Date.now
const roots = []
const user = [{ role: "user", content: "Review the child task." }]
const levels = ["low", "medium", "high", "xhigh", "max"]
const rows = [
  { slug: "gpt-6.1-sol", spec: { thinkApi: "effort", thinking: true,
    reasoningEffortEnum: [...levels, "ultra"], ultraReasoningEffort: "xhigh", defaultReasoningEffort: "medium" } },
  { slug: "gpt-6-luna", spec: { thinkApi: "effort", thinking: true,
    reasoningEffortEnum: levels, defaultReasoningEffort: "medium" } },
]
const catalog = (models = rows) => new Response(JSON.stringify({ models: models.map(({ slug, spec }) => ({
  slug, display_name: slug, visibility: "list",
  supported_reasoning_levels: spec.reasoningEffortEnum?.map(effort => ({ effort })),
  default_reasoning_level: spec.defaultReasoningEffort,
  multi_agent_reasoning_effort: spec.ultraReasoningEffort,
})) }))
const response = (text) => new Response(`data: ${JSON.stringify({ type: "response.completed", response: {
  id: "fixture-response", status: "completed",
  output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text }] }],
} })}\n\n`, { headers: { "content-type": "text/event-stream" } })

beforeEach(() => {
  _clearModelInfoForTest()
  globalThis.fetch = async () => { throw new Error("No real network in child effort tests") }
  _setAuthServiceForTest({ async getAuthContext(profileId, { signal }) {
    return { profileId, signal, accessToken: "fixture-only", release() {} }
  } })
})
afterEach(() => {
  globalThis.fetch = originalFetch
  Date.now = originalNow
  _setAuthServiceForTest(null)
  _clearModelInfoForTest()
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function spawn({ model = "gpt-6-luna", effort = "ultra", wantAsync = false } = {}) {
  const cwd = mkdtempSync(join(tmpdir(), "thincoder-child-effort-"))
  roots.push(cwd)
  const provider = Object.freeze({ name: "child-effort-fixture", model: "gpt-6.1-sol", format: "responses",
    baseURL: "https://api.openai.com/v1", stateful: false, reasoningEffort: effort,
    auth: Object.freeze({ type: "chatgpt_oauth", enabled: true, credentialRef: "child-effort-fixture" }) })
  const config = Object.freeze({ provider, providersList: Object.freeze([provider]),
    agent: Object.freeze({ autoThink: false, subagentAutoThink: true }), traces: Object.freeze({ enabled: false }) })
  const parent = createAgent({ provider, config, cwd, tools: [] })
  const { child } = buildSpawnChild(parent, { agent: parent, depth: 0, callbacks: {} },
    { model, task: user[0].content }, "explore", wantAsync, [], [], null)
  child.history = structuredClone(user)
  attachResponsesSession(child, join(cwd, "child.json"))
  return { parent, child }
}
const wireEffort = (agent) => buildBody(agent.provider, user, []).body.reasoning?.effort

test("spawned Luna Auto falls back to its catalog default when classification fails", async () => {
  for (const [model, wantAsync] of [["gpt-6-luna", false], ["child-effort-fixture:gpt-6-luna", true]]) {
    const { parent, child } = spawn({ model, wantAsync })
    recordModelCatalog(child.provider, rows)
    const requests = []
    globalThis.fetch = async (_url, options) => {
      requests.push(JSON.parse(options.body))
      return response(requests.length === 1 ? "unknown" : "Task completed")
    }
    await refreshAgentModelInfo(child)
    await callModelTurn(child, { systemPrompt: "Fixture", toolSchemas: [], callbacks: {}, depth: 1, turn: 0 })
    assert.deepEqual(requests.map(body => body.reasoning.effort), ["low", "medium"])
    assert.equal(Object.hasOwn(child.provider, "reasoningEffort"), false)
    assert.equal(parent.provider.reasoningEffort, "ultra")
    assert.equal(wireEffort(parent), "xhigh")
    assert.equal(parent.config.agent.autoThink, false)
  }
})

test("cold and expired catalogs keep Sol Ultra when the refreshed account supports it", async () => {
  for (const expired of [false, true]) {
    _clearModelInfoForTest()
    const { child } = spawn({ model: "gpt-6.1-sol" })
    let now = originalNow()
    Date.now = () => now
    if (expired) {
      recordModelCatalog(child.provider, [{ slug: child.provider.model, spec: { reasoningEffortEnum: levels } }])
      now += 60_001
    }
    let calls = 0
    globalThis.fetch = async () => { calls++; return catalog() }
    await refreshAgentModelInfo(child)
    assert.equal(calls, 1)
    assert.equal(child.provider.reasoningEffort, "ultra")
    assert.equal(wireEffort(child), "xhigh")
  }
})

test("supported inherited Luna effort and a different provider selection remain valid", async () => {
  for (const model of ["gpt-6-luna", "child-effort-fixture:gpt-6-luna"]) {
    const { parent, child } = spawn({ model, effort: "high" })
    recordModelCatalog(child.provider, rows)
    await refreshAgentModelInfo(child)
    assert.equal(child.provider.reasoningEffort, "high")
    assert.equal(wireEffort(child), "high")
    assert.equal(parent.provider.reasoningEffort, "high")
  }
})

test("a main agent's explicitly unsupported effort still fails before the request", async () => {
  const { parent } = spawn()
  parent.provider = { ...parent.provider, model: "gpt-6-luna" }
  recordModelCatalog(parent.provider, rows)
  await refreshAgentModelInfo(parent)
  assert.equal(parent.provider.reasoningEffort, "ultra")
  assert.throws(() => wireEffort(parent), /does not support reasoning effort "ultra"/)
})

test("removing Ultra from a main agent's refreshed account catalog still fails explicitly", async () => {
  const { parent } = spawn()
  recordModelCatalog(parent.provider, rows)
  await refreshAgentModelInfo(parent)
  assert.equal(wireEffort(parent), "xhigh")
  recordModelCatalog(parent.provider, [{ slug: parent.provider.model, spec: rows[1].spec }])
  await refreshAgentModelInfo(parent)
  assert.equal(parent.provider.reasoningEffort, "ultra")
  assert.throws(() => wireEffort(parent), /does not support reasoning effort "ultra"/)
})

test("catalog failure leaves inherited effort intact until a successful retry", async () => {
  const { child } = spawn()
  globalThis.fetch = async () => { throw new Error("Catalog unavailable") }
  await assert.rejects(refreshAgentModelInfo(child), /Catalog unavailable/)
  assert.equal(child.provider.reasoningEffort, "ultra")
  globalThis.fetch = async () => catalog()
  await refreshAgentModelInfo(child)
  assert.equal(child.provider.reasoningEffort, undefined)
  assert.equal(wireEffort(child), "medium")
})

test("later explicit child effort and later catalog removals are not silently normalized", async () => {
  for (const model of ["gpt-6-luna", "gpt-6.1-sol"]) {
    const { child } = spawn({ model, effort: model === "gpt-6-luna" ? "high" : "ultra" })
    recordModelCatalog(child.provider, rows)
    await refreshAgentModelInfo(child)
    if (model === "gpt-6-luna") child.provider.reasoningEffort = "ultra"
    else recordModelCatalog(child.provider, [{ slug: model, spec: rows[1].spec }])
    await refreshAgentModelInfo(child)
    assert.equal(child.provider.reasoningEffort, "ultra")
    assert.throws(() => wireEffort(child), /does not support reasoning effort "ultra"/)
  }
})

test("changes to a child before catalog loading supersede its inherited effort", async () => {
  const changes = [
    child => { child.provider = { ...child.provider } },
    child => { child.provider.model = "changed-model" },
    child => { child.provider.auth = { ...child.provider.auth, credentialRef: "changed-account" } },
    child => { child.provider.reasoningEffort = "new-explicit-effort" },
  ]
  for (const change of changes) {
    const { child } = spawn()
    change(child)
    const effort = child.provider.reasoningEffort
    recordModelCatalog(child.provider, [{ slug: child.provider.model, spec: rows[1].spec }])
    await refreshAgentModelInfo(child)
    assert.equal(child.provider.reasoningEffort, effort)
    assert.throws(() => wireEffort(child), /does not support reasoning effort/)
  }
})

test("an in-flight account change rejects the stale load without clearing effort", async () => {
  const { child } = spawn()
  globalThis.fetch = async () => {
    child.provider.auth = { ...child.provider.auth, credentialRef: "new-account" }
    return catalog()
  }
  await assert.rejects(refreshAgentModelInfo(child), /Model or account changed/)
  assert.equal(child.provider.reasoningEffort, "ultra")
  recordModelCatalog(child.provider, rows)
  await refreshAgentModelInfo(child)
  assert.equal(child.provider.reasoningEffort, "ultra")
  assert.throws(() => wireEffort(child), /does not support reasoning effort "ultra"/)
})

test("a missing model or missing effort declaration never clears against a static fallback", async () => {
  for (const catalogRows of [[], [{ slug: "gpt-6.1-sol", spec: { context: 200_000 } }]]) {
    const { child } = spawn({ model: "gpt-6.1-sol" })
    recordModelCatalog(child.provider, catalogRows)
    await refreshAgentModelInfo(child)
    assert.equal(child.provider.reasoningEffort, "ultra")
  }
})
