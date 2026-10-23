/** Auto effort must work on reasoning-only Responses models without changing the parent or persisted settings. */
import test, { beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { classifyAndApply } from "../auto-think.mjs"
import { callModelTurn } from "../agent/chat-call.mjs"
import { attachResponsesSession } from "../session-responses.mjs"
import { createAgent } from "../agent.mjs"
import { buildSpawnChild } from "../agent-tools/subagent-spawn.mjs"
import { PLAIN_TASK_BOOK_MIN } from "../agent-tools/spawn-gates.mjs"
import { recordModelCatalog, _clearModelInfoForTest } from "../provider/model-info.mjs"
import { _setAuthServiceForTest } from "../provider/auth-context.mjs"
import { providerAuthStub } from "./fixtures/provider-auth.mjs"

const originalFetch = globalThis.fetch
beforeEach(() => {
  _clearModelInfoForTest()
  globalThis.fetch = async () => { throw new Error("No real network in auto-think tests") }
  _setAuthServiceForTest(providerAuthStub({ async getAuthContext(profileId, { signal }) {
    return { profileId, signal, accessToken: "fixture-only", release() {} }
  } }))
})
afterEach(() => {
  globalThis.fetch = originalFetch
  _setAuthServiceForTest(null)
  _clearModelInfoForTest()
})

const result = (text, status = "completed") => new Response(`data: ${JSON.stringify({ type: `response.${status}`, response: {
  id: "classification", status,
  output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text }] }],
} })}\n\n`, { headers: { "content-type": "text/event-stream" } })

function fixture({ oauth = false, model = "gpt-6.1-sol" } = {}) {
  const provider = { name: "auto-think-fixture", model, format: "responses", baseURL: "https://api.openai.com/v1",
    stateful: true, reasoningEffort: "medium",
    ...(oauth ? { auth: { type: "chatgpt_oauth", enabled: true, credentialRef: "autothink-fixture" } } : { apiKey: "fixture-only" }) }
  if (oauth) recordModelCatalog(provider, [{ id: model, slug: model, spec: {
    thinkApi: "effort", thinking: true, reasoningEffortEnum: ["low", "medium", "high", "xhigh", "max"], defaultReasoningEffort: "low",
  } }])
  return { provider, history: [{ role: "user", content: "Review the assigned coding task." }],
    config: { agent: { autoThink: true }, traces: { enabled: false } }, cwd: "/tmp", _role: "explore" }
}

for (const [difficulty, effort] of [["low", "low"], ["medium", "high"], ["high", "max"]]) {
  test(`reasoning-only task classified ${difficulty} receives ${effort} effort`, async () => {
    const agent = fixture()
    const originalConfig = structuredClone(agent.config)
    let calls = 0
    globalThis.fetch = async (_url, options) => {
      calls++
      const body = JSON.parse(options.body)
      assert.equal(body.reasoning.effort, "low")
      assert.equal(body.max_output_tokens, 4096)
      assert.ok(!body.tools?.length)
      assert.ok(!Object.hasOwn(body, "previous_response_id"))
      return result(difficulty)
    }
    assert.equal(await classifyAndApply(agent, 0), effort)
    assert.equal(calls, 1)
    assert.equal(agent.provider.reasoningEffort, effort)
    assert.deepEqual(agent.config, originalConfig)
  })
}

test("account classification sends low effort without an output-token limit", async () => {
  const agent = fixture({ oauth: true })
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body)
    assert.equal(body.model, "gpt-6.1-sol")
    assert.equal(body.reasoning.effort, "low")
    assert.ok(!Object.hasOwn(body, "max_output_tokens"))
    return result("high")
  }
  assert.equal(await classifyAndApply(agent, 0), "max")
})

test("incomplete and unparseable classifications preserve the configured fallback", async () => {
  for (const [text, status] of [["high", "incomplete"], ["unknown", "completed"]]) {
    const agent = fixture()
    globalThis.fetch = async () => result(text, status)
    assert.equal(await classifyAndApply(agent, 0), null)
    assert.equal(agent.provider.reasoningEffort, "medium")
  }
})

test("cancelling a child also cancels its classifier and cannot apply a late result", async () => {
  const agent = fixture(), controller = new AbortController()
  let observedAbort = false
  globalThis.fetch = async (_url, options) => {
    options.signal.addEventListener("abort", () => { observedAbort = true }, { once: true })
    controller.abort()
    return result("high")
  }
  assert.equal(await classifyAndApply(agent, 0, { signal: controller.signal }), null)
  assert.equal(observedAbort, true)
  assert.equal(agent.provider.reasoningEffort, "medium")
})

test("disabling auto or changing the task during classification leaves the effort unchanged", async () => {
  for (const change of [agent => { agent.config.agent.autoThink = false }, agent => { agent.history.push({ role: "user", content: "A different task now" }) }]) {
    const agent = fixture()
    globalThis.fetch = async () => { change(agent); return result("high") }
    assert.equal(await classifyAndApply(agent, 0), null)
    assert.equal(agent.provider.reasoningEffort, "medium")
  }
})

test("a refreshed account catalog cannot receive an effort it no longer supports", async () => {
  const agent = fixture({ oauth: true })
  globalThis.fetch = async () => {
    recordModelCatalog(agent.provider, [{ slug: agent.provider.model, spec: { reasoningEffortEnum: ["low", "medium"] } }])
    return result("high")
  }
  assert.equal(await classifyAndApply(agent, 0), null)
  assert.equal(agent.provider.reasoningEffort, "medium")
})

test("interrupting a classifier preserves the normal Ctrl+I path and sends no task request", async () => {
  const agent = fixture(), controller = new AbortController()
  const dir = mkdtempSync(join(tmpdir(), "thincoder-autothink-interrupt-"))
  agent.cwd = dir
  attachResponsesSession(agent, join(dir, "slot.json"))
  let calls = 0
  globalThis.fetch = async (_url, options) => {
    calls++
    assert.equal(calls, 1, "The cancelled classifier must not be followed by the task request")
    controller.abort({ interrupt: true, message: "Use the new task" })
    assert.equal(options.signal.aborted, true)
    throw new DOMException("Aborted", "AbortError")
  }
  try {
    await assert.rejects(callModelTurn(agent, { systemPrompt: "Fixture", toolSchemas: [], callbacks: {},
      depth: 1, turn: 0, signal: controller.signal }), { name: "AbortError" })
    assert.equal(calls, 1)
    assert.equal(agent.history.at(-1).content, "[User interrupt: Use the new task]")
    assert.equal(agent.provider.reasoningEffort, "medium")
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test("models with a valid off path keep the existing non-reasoning classifier", async () => {
  const agent = fixture({ model: "glm-5.2" })
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body)
    assert.equal(body.max_output_tokens, 32)
    return result("high")
  }
  assert.equal(await classifyAndApply(agent, 0), "max")
})

test("disabled auto and later tool turns make no classifier request", async () => {
  const agent = fixture()
  assert.equal(await classifyAndApply(agent, 1), null)
  agent.config.agent.autoThink = false
  assert.equal(await classifyAndApply(agent, 0), null)
})

test("a spawned child selects effort before its task request while the parent remains manual", async () => {
  const dir = mkdtempSync(join(tmpdir(), "thincoder-autothink-child-"))
  const source = fixture()
  source.config.agent = { autoThink: false, subagentAutoThink: true }
  const parent = createAgent({ ...source, cwd: dir, tools: [] })
  const { child } = buildSpawnChild(parent, { agent: parent, depth: 0, callbacks: {} },
    { ...PLAIN_TASK_BOOK_MIN, goal: "Review a difficult concurrency bug." }, "explore", false, [], [], null)
  child.history = [{ role: "user", content: "Review a difficult concurrency bug." }]
  attachResponsesSession(child, join(dir, "child.json"))
  const requests = []
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body)
    requests.push(body)
    return result(requests.length === 1 ? "high" : "Task completed")
  }
  try {
    await callModelTurn(child, { systemPrompt: "Fixture", toolSchemas: [], callbacks: {}, depth: 1, turn: 0 })
    assert.equal(requests.length, 2)
    assert.deepEqual(requests.map(body => body.reasoning.effort), ["low", "max"])
    assert.equal(child.provider.reasoningEffort, "max")
    assert.equal(parent.provider.reasoningEffort, "medium")
    assert.equal(parent.config.agent.autoThink, false)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
