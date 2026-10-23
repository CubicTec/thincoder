/** Ultra coordinates the existing local subagent tool and follows the current request mode. */
import test, { beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createAgent } from "../agent.mjs"
import { prepareRun } from "../agent/setup.mjs"
import { callModelTurn } from "../agent/chat-call.mjs"
import { beginRun } from "../agent/run-start.mjs"
import { summarizeRunExplorations } from "../explore-distill.mjs"
import { attachResponsesSession } from "../session-responses.mjs"
import { parseModelInfo, recordModelCatalog, _clearModelInfoForTest } from "../provider/model-info.mjs"
import { _setAuthServiceForTest } from "../provider/auth-context.mjs"
import { providerAuthStub } from "./fixtures/provider-auth.mjs"

const originalFetch = globalThis.fetch
const roots = []
const modePrefix = "[System reminder: Ultra mode is active."
const modeMessages = agent => agent.history.filter(m => m.role === "user" && m.content?.startsWith(modePrefix))
const timeIndex = agent => agent.history.findLastIndex(m => m.content?.startsWith("[System reminder: current time is "))

beforeEach(() => {
  _clearModelInfoForTest()
  globalThis.fetch = async () => { throw new Error("Ultra mode tests must not use real network") }
  _setAuthServiceForTest(providerAuthStub({ async getAuthContext(profileId, { signal }) {
    return { profileId, signal, accessToken: "fixture-only", release() {} }
  } }))
})
afterEach(() => {
  globalThis.fetch = originalFetch
  _setAuthServiceForTest(null)
  _clearModelInfoForTest()
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

const ultraSpec = { thinking: true, thinkApi: "effort", reasoningEffortEnum: ["low", "high", "max", "ultra"],
  defaultReasoningEffort: "max", ultraReasoningEffort: "max" }
function catalog(provider, spec = ultraSpec) {
  recordModelCatalog(provider, [{ slug: provider.model, spec }])
}
function fixture({ effort = "ultra", spec = ultraSpec, autoThink = false, role } = {}) {
  const cwd = mkdtempSync(join(tmpdir(), "thincoder-ultra-mode-")); roots.push(cwd)
  const provider = { name: "ultra-mode-fixture", model: "gpt-6-astra", format: "responses",
    baseURL: "https://api.openai.com/v1", reasoningEffort: effort,
    auth: { type: "chatgpt_oauth", enabled: true, credentialRef: "ultra-fixture-only" } }
  catalog(provider, spec)
  const config = Object.freeze({ agent: Object.freeze({ autoThink, subagentAutoThink: true,
    injectDocs: false, injectMemories: false, poolLimits: Object.freeze({ other: 2, engCoder: 1 }) }),
    traces: Object.freeze({ enabled: false }) })
  return createAgent({ provider, config, cwd, role, tools: [], history: [{ role: "user", content: "Inspect two independent modules." }] })
}
const prepare = (agent, opts = {}) => prepareRun(agent, "Inspect two independent modules.", {}, { resume: true, ...opts })
const event = text => new Response(`data: ${JSON.stringify({ type: "response.completed", response: {
  id: "ultra-fixture-result", status: "completed", output: [{ type: "message", role: "assistant",
    content: [{ type: "output_text", text }] }],
} })}\n\n`, { headers: { "content-type": "text/event-stream" } })

test("prepareRun enables Ultra after family tool assembly without changing system prefix or configuration", async () => {
  const agent = fixture({ effort: "max" })
  const ordinary = await prepare(agent)
  assert.equal(modeMessages(agent).length, 0)
  const configBefore = structuredClone(agent.config)
  agent.provider.reasoningEffort = "ultra"
  const providerBefore = structuredClone(agent.provider)
  const active = await prepare(agent)
  assert.ok(active.toolByName.has("subagent"), "Use the existing family tool, absent from agent.tools")
  const [reminder] = modeMessages(agent)
  assert.ok(reminder, "Ultra must provide an active delegation instruction")
  assert.equal(reminder.transient, true)
  assert.match(reminder.content, /proactively delegate independent/i)
  assert.ok(agent.history.indexOf(reminder) < timeIndex(agent), "The current time must remain after the Ultra reminder")
  assert.equal(active.systemPrompt, ordinary.systemPrompt)
  assert.deepEqual(agent.config, configBefore)
  assert.deepEqual(agent.provider, providerBefore)
})

test("resuming Ultra preserves its stable history prefix and disabling it removes old instructions", async () => {
  const agent = fixture()
  await prepare(agent)
  const [reminder] = modeMessages(agent)
  assert.ok(reminder)
  const prefix = agent.history.slice(0, agent.history.indexOf(reminder) + 1)
  await prepare(agent)
  assert.deepEqual(modeMessages(agent), [reminder])
  assert.deepEqual(agent.history.slice(0, prefix.length), prefix)
  agent.provider.reasoningEffort = "max"
  await prepare(agent)
  assert.equal(modeMessages(agent).length, 0)
  assert.ok(agent.history.some(m => m.content === "Inspect two independent modules."))
  agent.provider.reasoningEffort = "ultra"
  await prepare(agent)
  assert.equal(modeMessages(agent).length, 1)
})

test("Ultra follows the effective default and removes stale reminders when catalog support disappears", async () => {
  const agent = fixture({ spec: { ...ultraSpec, defaultReasoningEffort: "ultra" } })
  delete agent.provider.reasoningEffort
  await prepare(agent)
  assert.equal(modeMessages(agent).length, 1)
  catalog(agent.provider, { ...ultraSpec, reasoningEffortEnum: ["low", "high", "max"], defaultReasoningEffort: "max" })
  await prepare(agent)
  assert.equal(modeMessages(agent).length, 0)
})

test("an Ultra-only catalog still activates local delegation with its ordinary wire fallback", async () => {
  const spec = parseModelInfo({ supported_reasoning_levels: [{ effort: "ultra" }], default_reasoning_level: "ultra" })
  const agent = fixture({ spec })
  delete agent.provider.reasoningEffort
  await prepare(agent)
  assert.equal(modeMessages(agent).length, 1)
  assert.equal(spec.ultraReasoningEffort, "medium")
  assert.equal(agent.provider.reasoningEffort, undefined)
})

test("ordinary models, missing wire mappings and absent local subagent tools cannot activate Ultra", async () => {
  for (const spec of [
    { ...ultraSpec, reasoningEffortEnum: ["low", "high", "max"] },
    { ...ultraSpec, ultraReasoningEffort: undefined },
    { ...ultraSpec, ultraReasoningEffort: "ultra" },
  ]) {
    const agent = fixture({ spec })
    agent.history.push({ role: "user", content: `${modePrefix} stale instructions]`, transient: true })
    await prepare(agent)
    assert.equal(modeMessages(agent).length, 0)
  }
  const agent = fixture()
  const out = await prepare(agent, { toolDecorate: { subagent: {
    name: "fixture_without_delegation", description: "Fixture without a delegation tool", parameters: { type: "object", properties: {} },
  } } })
  assert.equal(out.toolByName.has("subagent"), false)
  assert.equal(modeMessages(agent).length, 0)
})

test("child runs never receive Ultra delegation even when engineering children have a restricted subagent tool", async () => {
  for (const role of ["explore", "eng-coder", "eng-designer"]) {
    const agent = fixture({ role })
    agent.history.push({ role: "user", content: `${modePrefix} stale parent instructions]`, transient: true })
    const before = structuredClone(agent.config)
    const out = await prepare(agent, { depth: 1 })
    assert.equal(out.toolByName.has("subagent"), role.startsWith("eng-"))
    assert.equal(modeMessages(agent).length, 0)
    assert.equal(agent.provider.reasoningEffort, "ultra")
    assert.deepEqual(agent.config, before)
  }
})

test("a classifier downgrade removes Ultra before the task request without tripping history ownership", async () => {
  const agent = fixture({ autoThink: true })
  attachResponsesSession(agent, join(agent.cwd, "slot.json"))
  const prepared = await prepare(agent)
  assert.equal(modeMessages(agent).length, 1)
  const requests = []
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body); requests.push(body)
    return event(requests.length === 1 ? "low" : "Task completed")
  }
  await callModelTurn(agent, { ...prepared, callbacks: {}, depth: 0, turn: 0 })
  assert.equal(requests.length, 2)
  assert.equal(agent.provider.reasoningEffort, "low")
  assert.equal(requests[1].reasoning.effort, "low")
  assert.ok(!JSON.stringify(requests[1].input).includes(modePrefix), "The task request must not carry the old Ultra mode")
  assert.equal(modeMessages(agent).length, 0)
  assert.equal(agent.config.agent.subagentAutoThink, true)
})

test("selecting Ultra after setup adds delegation to the actual request while preserving the selected mode", async () => {
  const agent = fixture({ effort: "max" })
  attachResponsesSession(agent, join(agent.cwd, "slot.json"))
  const prepared = await prepare(agent)
  agent.provider.reasoningEffort = "ultra"
  let request
  globalThis.fetch = async (_url, options) => { request = JSON.parse(options.body); return event("Task completed") }
  await callModelTurn(agent, { ...prepared, callbacks: {}, depth: 0, turn: 1 })
  assert.equal(request.reasoning.effort, "max")
  assert.ok(JSON.stringify(request.input).includes(modePrefix))
  assert.equal(Object.hasOwn(request, "multi_agent"), false)
  assert.equal(agent.provider.reasoningEffort, "ultra")
  assert.equal(modeMessages(agent).length, 1)
})

test("removing Ultra after classification preserves this run's first exploration block for distillation", async () => {
  const agent = fixture({ autoThink: true })
  agent.tools.push({ name: "read", description: "Fixture reader", parameters: { type: "object", properties: {} } })
  attachResponsesSession(agent, join(agent.cwd, "slot.json"))
  const prepared = await beginRun(agent, "Inspect two independent modules.", {}, { depth: 0, resume: true })
  let calls = 0
  globalThis.fetch = async () => event(++calls === 1 ? "low" : calls === 2 ? "Task completed" : "The three files share an interface.")
  await callModelTurn(agent, { ...prepared, callbacks: {}, depth: 0, turn: 0 })
  agent.history.push({ role: "assistant", content: "", tool_calls: [1, 2, 3].map(id => ({
    id: `read-${id}`, type: "function", function: { name: "read", arguments: "{}" },
  })) }, ...[1, 2, 3].map(id => ({ role: "tool", tool_call_id: `read-${id}`, name: "read", content: `Fixture file ${id}` })))
  await summarizeRunExplorations(agent, {}, undefined, 0, { systemPrompt: prepared.systemPrompt, tools: prepared.toolSchemas })
  assert.equal(calls, 3, "The first three read results must still trigger exploration distillation")
  assert.ok(agent.history.some(m => m.content?.startsWith("[Exploration summary]")))
})

test("Ultra synchronization cannot hide a session history change during classification", async () => {
  const agent = fixture({ autoThink: true })
  attachResponsesSession(agent, join(agent.cwd, "slot.json"))
  const prepared = await prepare(agent)
  let calls = 0
  globalThis.fetch = async () => {
    calls++
    agent.history[0].content = "Changed while classification was running"
    return event("low")
  }
  await assert.rejects(callModelTurn(agent, { ...prepared, callbacks: {}, depth: 0, turn: 0 }),
    error => error.code === "responses_request_history_changed")
  assert.equal(calls, 1)
})
