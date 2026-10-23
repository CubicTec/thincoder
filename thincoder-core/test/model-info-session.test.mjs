/** 冷目录恢复、延迟结果与会话档位优先级；仅使用内存会话和模拟目录。 */
import { test, afterEach } from "node:test"
import assert from "node:assert/strict"
import { applySession, resetSessionState } from "../session-lifecycle.mjs"
import { refreshAgentModelInfo } from "../agent/model-info.mjs"
import { recordModelCatalog, _clearModelInfoForTest } from "../provider/model-info.mjs"
import { _setAuthServiceForTest } from "../provider/auth-context.mjs"
import { providerAuthStub } from "./fixtures/provider-auth.mjs"
import { buildBody } from "../provider/responses-request.mjs"
import { resolveEnableThinking, providerSpec } from "../config.mjs"

const originalFetch = globalThis.fetch
const originalNow = Date.now
const user = [{ role: "user", content: "fixture" }]
const provider = (name = "account-b") => ({ name, format: "responses", baseURL: "https://api.openai.com/v1",
  auth: { type: "chatgpt_oauth", enabled: true, credentialRef: name } })
const fixtureModel = "account-session-fixture"
const agentFor = (providers) => ({
  provider: { name: "api-default", model: "gpt-6-astra" }, activeProvider: "api-default", activeModel: "gpt-6-astra",
  providers, config: { defaultModel: "api-default:gpt-6-astra", agent: {} }, tools: [],
})
const session = (name = "account-b", effort = "high", model = fixtureModel) => ({
  activeProvider: name, activeModel: model, effort, history: [],
})
const catalog = (model = fixtureModel, levels = ["low", "high"], defaultEffort = "low") => new Response(JSON.stringify({ models: [{
  slug: model, display_name: model, visibility: "list",
  supported_reasoning_levels: levels.map((effort) => ({ effort })), default_reasoning_level: defaultEffort,
}] }))
function mockAuth() {
  _setAuthServiceForTest(providerAuthStub({ async getAuthContext(profileId, { signal }) {
    return { profileId, signal, accessToken: "synthetic-session-token", release() {} }
  } }))
}
function seed(p, model = fixtureModel) {
  recordModelCatalog(p, [{ id: model, slug: model, spec: {
    thinking: true, thinkApi: "effort", reasoningEffortEnum: ["low", "high"], defaultReasoningEffort: "low",
  } }])
}
afterEach(() => {
  globalThis.fetch = originalFetch
  Date.now = originalNow
  _setAuthServiceForTest(null)
  _clearModelInfoForTest()
})

test("cold account session waits for its catalog before restoring a supported effort", async () => {
  mockAuth()
  globalThis.fetch = async () => catalog()
  const p = provider(), agent = agentFor([p])
  applySession(agent, session())
  assert.equal(agent.provider.reasoningEffort, undefined)
  await refreshAgentModelInfo(agent)
  assert.equal(agent._slotEffort, "high")
  assert.equal(agent.provider.reasoningEffort, "high")
  assert.equal(buildBody(agent.provider, user, []).body.reasoning.effort, "high")
  assert.equal(p.reasoningEffort, undefined)
  // A later manual change must survive another run or /think refresh.
  agent.provider.reasoningEffort = "low"
  await refreshAgentModelInfo(agent)
  assert.equal(agent.provider.reasoningEffort, "low")
})

test("a restarted Ultra session restores the selected mode and normalizes only the request", async () => {
  mockAuth()
  globalThis.fetch = async () => catalog("gpt-6-astra", ["low", "medium", "max", "ultra"], "medium")
  const p = provider(), agent = agentFor([p])
  applySession(agent, session(p.name, "ultra", "gpt-6-astra"))
  assert.equal(agent.provider.reasoningEffort, undefined)
  await refreshAgentModelInfo(agent)
  assert.equal(agent._slotEffort, "ultra")
  assert.equal(agent.provider.reasoningEffort, "ultra")
  assert.equal(buildBody(agent.provider, user, []).body.reasoning.effort, "max")
  assert.equal(p.reasoningEffort, undefined)
})

test("cold Luna session does not apply API-only off before account metadata arrives", async () => {
  mockAuth()
  globalThis.fetch = async () => catalog("gpt-6-luna", ["low", "medium", "high"], "medium")
  const agent = agentFor([provider()])
  applySession(agent, session("account-b", "off", "gpt-6-luna"))
  assert.equal(agent.provider.thinking, undefined)
  await refreshAgentModelInfo(agent)
  assert.equal(agent._slotEffort, "off") // Unsupported saved preferences are not rewritten.
  assert.equal(agent.provider.thinking, undefined)
  assert.equal(agent.provider.reasoningEffort, undefined)
  assert.equal(buildBody(agent.provider, user, []).body.reasoning.effort, "medium")
})

test("a fresh account catalog applies session effort immediately without network", async () => {
  const p = provider(), agent = agentFor([p])
  seed(p)
  globalThis.fetch = async () => { throw new Error("fresh catalog must not fetch") }
  applySession(agent, session())
  assert.equal(agent.provider.reasoningEffort, "high")
  await refreshAgentModelInfo(agent)
  assert.equal(buildBody(agent.provider, user, []).body.reasoning.effort, "high")
})

test("stale catalog and failed refresh defer validation until the next successful catalog", async () => {
  let now = 1000
  Date.now = () => now
  const p = provider(), agent = agentFor([p])
  seed(p)
  now += 60000
  mockAuth()
  globalThis.fetch = async () => { throw new Error("fixture catalog unavailable") }
  applySession(agent, session())
  assert.equal(agent.provider.reasoningEffort, undefined)
  await assert.rejects(refreshAgentModelInfo(agent), /catalog unavailable/)
  globalThis.fetch = async () => catalog(fixtureModel, ["low"], "low")
  await refreshAgentModelInfo(agent)
  assert.equal(agent.provider.reasoningEffort, undefined)
  assert.equal(buildBody(agent.provider, user, []).body.reasoning.effort, "low")
})

test("session switch while catalog loads cannot apply the old session preference to the new one", async () => {
  mockAuth()
  let finish, started
  const fetchStarted = new Promise((resolve) => { started = resolve })
  globalThis.fetch = async () => new Promise((resolve) => { finish = resolve; started() })
  const agent = agentFor([provider("account-a"), provider("account-b")])
  applySession(agent, session("account-a", "high"))
  const pending = refreshAgentModelInfo(agent)
  await fetchStarted
  applySession(agent, session("account-b", "low"))
  finish(catalog())
  await assert.rejects(pending, /Model or account changed/)
  globalThis.fetch = async () => catalog()
  await refreshAgentModelInfo(agent)
  assert.equal(agent.provider.auth.credentialRef, "account-b")
  assert.equal(buildBody(agent.provider, user, []).body.reasoning.effort, "low")
})

test("reset clears deferred preference even if the selected provider object stays the same", async () => {
  const p = provider(), agent = agentFor([p])
  applySession(agent, session())
  const selected = agent.provider
  resetSessionState(agent)
  assert.equal(agent.provider, selected)
  seed(p)
  await refreshAgentModelInfo(agent)
  assert.equal(agent._slotEffort, null)
  assert.equal(agent.provider.reasoningEffort, undefined)
  assert.equal(buildBody(agent.provider, user, []).body.reasoning.effort, "low")
})

test("in-place model or account changes invalidate a deferred preference before a later refresh", async () => {
  for (const change of ["model", "account"]) {
    _clearModelInfoForTest()
    const p = provider(), agent = agentFor([p])
    applySession(agent, session())
    if (change === "model") agent.provider.model = "second-session-fixture"
    else agent.provider.auth = { ...agent.provider.auth, credentialRef: "account-c" }
    seed(agent.provider, agent.provider.model)
    await refreshAgentModelInfo(agent)
    assert.equal(agent.provider.reasoningEffort, undefined)
    assert.equal(buildBody(agent.provider, user, []).body.reasoning.effort, "low")
  }
})

test("a user effort change while catalog loads supersedes deferred session preference", async () => {
  mockAuth()
  let finish, started
  const fetchStarted = new Promise((resolve) => { started = resolve })
  globalThis.fetch = async () => new Promise((resolve) => { finish = resolve; started() })
  const agent = agentFor([provider()])
  applySession(agent, session())
  const pending = refreshAgentModelInfo(agent)
  await fetchStarted
  agent.provider.reasoningEffort = "low"
  finish(catalog())
  await pending
  assert.equal(buildBody(agent.provider, user, []).body.reasoning.effort, "low")
})

test("valid session effort clears configured off for account Responses and legacy Qwen", async () => {
  const p = { ...provider(), thinking: null }, agent = agentFor([p])
  seed(p)
  applySession(agent, session())
  assert.equal(agent.provider.thinking, undefined)
  assert.equal(buildBody(agent.provider, user, []).body.reasoning.effort, "high")
  assert.equal(p.thinking, null)

  const qwen = { name: "qwen", baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1", apiKey: "synthetic-key", thinking: null }
  const legacy = agentFor([qwen])
  applySession(legacy, session("qwen", "high", "qwen3.8-flash"))
  assert.equal(legacy.provider.thinking, undefined)
  assert.equal(legacy.provider.reasoningEffort, "high")
  assert.equal(resolveEnableThinking(legacy.provider, providerSpec(legacy.provider)), true)
  assert.equal(qwen.thinking, null)
})
