/** Account catalog specifications must reach runtime behavior without network or credentials. */
import test, { beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createAgent } from "../agent.mjs"
import { assembleAgent } from "../agent/assemble.mjs"
import { prepareRun } from "../agent/setup.mjs"
import { refreshAgentModelInfo } from "../agent/model-info.mjs"
import { recordToolResults } from "../agent/record-results.mjs"
import { appendImagePointer } from "../agent/setup-reminders.mjs"
import { readImageTool } from "../tools/file.mjs"
import { compressIfNeeded } from "../context.mjs"
import { summarizeRunExplorations } from "../explore-distill.mjs"
import { buildBody } from "../provider/responses-request.mjs"
import { recordModelCatalog, _clearModelInfoForTest } from "../provider/model-info.mjs"
import { _setAuthServiceForTest } from "../provider/auth-context.mjs"
import { providerAuthStub } from "./fixtures/provider-auth.mjs"

const originalFetch = globalThis.fetch
const roots = []
const user = [{ role: "user", content: "Describe the fixture." }]
const imagePart = { type: "image_url", image_url: { url: "data:image/png;base64,AA==" } }

beforeEach(() => {
  _clearModelInfoForTest()
  globalThis.fetch = async () => { throw new Error("Runtime specification tests must not use the network") }
  _setAuthServiceForTest(providerAuthStub({ async getAuthContext() {
    throw new Error("Fresh catalog fixtures must not acquire credentials")
  } }))
})

afterEach(() => {
  globalThis.fetch = originalFetch
  _setAuthServiceForTest(null)
  _clearModelInfoForTest()
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function provider(model = "account-runtime-fixture") {
  return {
    name: "account-runtime-test", format: "responses", baseURL: "https://api.openai.com/v1", model,
    auth: { type: "chatgpt_oauth", enabled: true, credentialRef: "runtime-fixture-only" },
  }
}

function catalog(p, specs) {
  recordModelCatalog(p, Object.entries(specs).map(([id, spec]) => ({ id, slug: id, spec })))
}

function directory() {
  const path = mkdtempSync(join(tmpdir(), "thincoder-model-runtime-"))
  roots.push(path)
  return path
}

function agentFor(p, config = { agent: { injectDocs: false, injectMemories: false } }) {
  return createAgent({ provider: p, config, tools: [], cwd: directory() })
}

const prepare = (agent) => prepareRun(agent, "fixture", {}, { depth: 1, resume: true })

test("prepareRun follows catalog window changes without mutating config shared by parent and child", async () => {
  const p = provider()
  const childProvider = { ...p, model: "account-child-fixture" }
  const sharedConfig = Object.freeze({ agent: Object.freeze({
    compactThresholdResolved: 12_000, compactThresholdAuto: true, injectDocs: false, injectMemories: false,
  }) })
  const parent = agentFor(p, sharedConfig)
  const child = agentFor(childProvider, sharedConfig)
  catalog(p, {
    [p.model]: { context: 128_000 },
    [childProvider.model]: { context: 96_000 },
  })
  // The 32K output reservation bounds the first/child windows; the enlarged
  // parent window reaches the 80% ratio instead. The loaded estimate stays untouched.
  assert.equal((await prepare(parent)).threshold, 96_000)

  catalog(p, {
    [p.model]: { context: 256_000 },
    [childProvider.model]: { context: 96_000 },
  })
  assert.equal((await prepare(parent)).threshold, 204_800)
  assert.equal((await prepare(child)).threshold, 64_000)
  assert.equal(parent.config, child.config)
  assert.equal(sharedConfig.agent.compactThreshold, undefined)
  assert.equal(sharedConfig.agent.compactThresholdResolved, 12_000)
  assert.equal(sharedConfig.agent.compactThresholdAuto, true)
})

test("prepareRun preserves an explicitly configured compaction threshold after a catalog refresh", async () => {
  const p = provider()
  const config = Object.freeze({ agent: Object.freeze({
    compactThreshold: 43_210, compactThresholdAuto: false, injectDocs: false, injectMemories: false,
  }) })
  const agent = agentFor(p, config)
  catalog(p, { [p.model]: { context: 128_000 } })
  assert.equal((await prepare(agent)).threshold, 43_210)
  catalog(p, { [p.model]: { context: 1_000_000 } })
  assert.equal((await prepare(agent)).threshold, 43_210)
  assert.equal(config.agent.compactThreshold, 43_210)
})

test("refresh toggles the finalized image candidate and never restores a host-excluded tool", async () => {
  const p = provider()
  const ordinary = { name: "fixture_read", readonly: true }
  const mcp = { name: "mcp.fixture", readonly: true }
  const cwd = directory()
  catalog(p, { [p.model]: { multimodal: false } })
  const assemble = (excluded) => assembleAgent({
    cwd,
    deps: {
      loadConfig: () => ({ provider: p, providersList: [p], agent: {}, memory: {} }),
      injectProxy: () => {}, createMemory: () => ({}), discoverRules: () => [],
      author: () => "fixture", team: () => null,
      assembleBuiltinTools: async () => [ordinary, readImageTool],
    },
    toolsFinalize: (tools) => [...tools.filter((tool) => !excluded || tool !== readImageTool), mcp],
  })
  const agent = await assemble(false)
  const excluded = await assemble(true)
  assert.deepEqual(agent.tools, [ordinary, mcp])

  catalog(p, { [p.model]: { multimodal: true } })
  await refreshAgentModelInfo(agent)
  await refreshAgentModelInfo(agent)
  await refreshAgentModelInfo(excluded)
  assert.deepEqual(agent.tools, [ordinary, mcp, readImageTool])
  assert.deepEqual(excluded.tools, [ordinary, mcp])

  catalog(p, { [p.model]: { multimodal: false } })
  await refreshAgentModelInfo(agent)
  assert.deepEqual(agent.tools, [ordinary, mcp])
})

for (const [model, vision] of [["account-vision-fixture", true], ["kimi-k3", false]]) {
  test(`read_image execution honors catalog vision=${vision} for ${model}`, async () => {
    const p = provider(model)
    catalog(p, { [model]: { multimodal: vision } })
    const agent = agentFor(p)
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ioAAAAASUVORK5CYII=", "base64")
    writeFileSync(join(agent.cwd, "fixture.png"), png)
    const execute = () => readImageTool.execute({ path: "fixture.png" }, { agent, cwd: agent.cwd })
    if (vision) {
      const result = JSON.parse(await execute())
      assert.equal(result.images.length, 1)
      assert.equal(result.images[0].image_url.url, `data:image/png;base64,${png.toString("base64")}`)
    } else {
      await assert.rejects(execute)
    }
  })

  test(`tool result image injection honors catalog vision=${vision} for ${model}`, async () => {
    const p = provider(model)
    catalog(p, { [model]: { multimodal: vision } })
    const agent = agentFor(p)
    const tools = new Map([[readImageTool.name, readImageTool]])
    const result = JSON.stringify({ text: "fixture image", images: [imagePart] })
    await recordToolResults(agent, tools, [
      { toolCall: { id: "image-1", name: "read_image" }, result, ok: true },
      { toolCall: { id: "image-2", name: "read_image" }, result, ok: true },
    ])
    assert.deepEqual(agent.history.map((message) => message.role), ["tool", "tool", "user", "user"])
    const injected = agent.history.filter((message) => Array.isArray(message.content))
    assert.equal(injected.length, vision ? 2 : 0)
    if (vision) assert.deepEqual(injected[0].content, [{ type: "text", text: "fixture image" }, imagePart])
    assert.equal(agent._fullHistory.length, vision ? 4 : 2)
  })

  test(`pasted image pointers honor catalog vision=${vision} for ${model}`, () => {
    const p = provider(model)
    catalog(p, { [model]: { multimodal: vision } })
    const message = { role: "user", content: "Describe this image." }
    const attach = () => appendImagePointer(message, ["/fixture/image.png"], p, { depth: 0 })
    if (vision) {
      attach()
      assert.ok(message.content.includes("/fixture/image.png"))
    } else {
      assert.throws(attach)
      assert.equal(message.content, "Describe this image.")
    }
  })
}

test("Responses uses the account default effort, explicit supported effort, and none for thinking:null", () => {
  const p = provider()
  catalog(p, { [p.model]: {
    reasoningEffortEnum: ["none", "low", "high"], defaultReasoningEffort: "high",
    thinking: true, thinkApi: "effort",
  } })
  const body = (settings = {}) => buildBody({ ...p, ...settings }, user, []).body
  assert.equal(body().reasoning.effort, "high")
  assert.equal(body({ reasoningEffort: "low" }).reasoning.effort, "low")
  assert.equal(body({ thinking: null }).reasoning.effort, "none")
  // 与既有 Chat Completions 载荷规则同序：显式 effort 高于旧 off 标记。
  assert.equal(body({ thinking: null, reasoningEffort: "high" }).reasoning.effort, "high")
})

test("Responses rejects disabling reasoning when the current account model has no none effort", () => {
  const p = provider()
  catalog(p, { [p.model]: {
    reasoningEffortEnum: ["low", "high"], defaultReasoningEffort: "low",
    thinking: true, thinkApi: "effort",
  } })
  assert.throws(() => buildBody({ ...p, thinking: null }, user, []))
})

test("internal compaction and exploration summaries preserve the account effort for models without none", async () => {
  const p = provider()
  catalog(p, { [p.model]: {
    reasoningEffortEnum: ["low", "high"], defaultReasoningEffort: "high",
    thinking: true, thinkApi: "effort",
  } })
  const bodies = []
  let releases = 0
  _setAuthServiceForTest(providerAuthStub({ async getAuthContext(profileId, { signal }) {
    assert.equal(profileId, p.auth.credentialRef)
    return { profileId, signal, accessToken: "fixture-token-only", release() { releases++ } }
  } }))
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "https://api.openai.com/v1/responses")
    assert.equal(options.headers.Authorization, "Bearer fixture-token-only")
    bodies.push(JSON.parse(options.body))
    return new Response(`data: ${JSON.stringify({ type: "response.completed", response: {
      id: `summary-${bodies.length}`, status: "completed",
      output: [{ type: "message", id: `message-${bodies.length}`, role: "assistant",
        content: [{ type: "output_text", text: "Completed account summary." }] }],
    } })}\n\n`, { headers: { "content-type": "text/event-stream" } })
  }
  const config = { agent: {}, traces: { enabled: false } }
  const compact = agentFor(p, config)
  compact.history = Array.from({ length: 20 }, (_, i) => ({
    role: i % 2 ? "assistant" : "user", content: `Preserve fixture fact ${i}`,
  }))
  assert.equal(await compressIfNeeded(compact, 1, {}, { force: true }), true)
  assert.equal(compact._lastCompressInfo.mode, "summary")
  assert.ok(compact.history.some((message) => message.content.includes("Completed account summary.")))

  const distill = agentFor(p, config)
  distill.history = [{ role: "user", content: "Inspect fixture files." }, ...Array.from({ length: 3 }, (_, i) => [
    { role: "assistant", content: "", tool_calls: [{ id: `read-${i}`, type: "function", function: {
      name: "read", arguments: JSON.stringify({ path: `fixture-${i}.txt` }),
    } }] },
    { role: "tool", tool_call_id: `read-${i}`, content: `Preserve file fact ${i}` },
  ]).flat(), { role: "assistant", content: "Inspection complete." }]
  let persisted = 0
  await summarizeRunExplorations(distill, { onDistilled() { persisted++ } })
  assert.equal(persisted, 1)
  assert.ok(distill.history.some((message) => message.content.includes("Completed account summary.")))
  assert.equal(distill.history.some((message) => message.role === "tool"), false)
  assert.equal(bodies.length, 2)
  assert.equal(releases, 2)
  for (const body of bodies) assert.equal(body.reasoning.effort, "high")
  assert.equal(Object.hasOwn(p, "thinking"), false)
  assert.equal(Object.hasOwn(p, "reasoningEffort"), false)
})

test("an existing Qwen API channel still disables thinking for internal compaction", async () => {
  const p = { name: "qwen-fixture", model: "qwen3.8-flash", apiKey: "fixture-api-key",
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1", format: "openai" }
  const bodies = []
  globalThis.fetch = async (url, options) => {
    assert.equal(url, `${p.baseURL}/chat/completions`)
    bodies.push(JSON.parse(options.body))
    return new Response(`data: ${JSON.stringify({ choices: [{ delta: { content: "Existing channel summary." }, finish_reason: "stop" }] })}\n\ndata: [DONE]\n\n`,
      { headers: { "content-type": "text/event-stream" } })
  }
  const compact = agentFor(p, { agent: {}, traces: { enabled: false } })
  compact.history = Array.from({ length: 20 }, (_, i) => ({
    role: i % 2 ? "assistant" : "user", content: `Preserve Qwen fixture fact ${i}`,
  }))
  assert.equal(await compressIfNeeded(compact, 1, {}, { force: true }), true)
  assert.equal(compact._lastCompressInfo.mode, "summary")
  assert.equal(bodies.length, 1)
  assert.equal(bodies[0].reasoning_effort, "none")
  assert.equal(bodies[0].enable_thinking, false)
})
