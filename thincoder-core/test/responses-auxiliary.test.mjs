/** Auxiliary state must not commit partially streamed Responses output. All network is fake. */
import test from "node:test"
import assert from "node:assert/strict"
import { compressIfNeeded, compressFallback } from "../context.mjs"
import { pruneStaleToolOutputs, shrinkOversized } from "../context-degrade.mjs"
import { summarizeRunExplorations } from "../explore-distill.mjs"
import { requireCompletedResponse } from "../provider/errors.mjs"

const provider = { name: "auxiliary-test", format: "responses", baseURL: "https://api.openai.com/v1", apiKey: "fixture-only", model: "test-model", stateful: false, builtinTools: false }
const frame = (event) => `data: ${JSON.stringify(event)}\n\n`
function fakeResponse(end, text = "PARTIAL DERIVED CONTENT") {
  const terminal = end?.type === "response.completed"
    ? { ...end, response: { ...end.response, output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text }] }] } }
    : end
  return new Response(frame({ type: "response.output_text.delta", delta: text }) + (terminal ? frame(terminal) : ""), { headers: { "content-type": "text/event-stream" } })
}
const endings = [
  { type: "response.failed", response: { error: { code: "server_error", message: "summary generation failed" } } },
  { type: "response.incomplete", response: { incomplete_details: { reason: "max_output_tokens" } } },
  null,
]
const completed = { type: "response.completed", response: { id: "r_complete", status: "completed", output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text: "COMPLETE SUMMARY" }] }] } }
const agentFor = (history) => ({ provider: { ...provider }, config: { agent: {}, traces: { enabled: false } }, history, tasks: [], cwd: "/tmp", _lastPromptTokens: 1234, _usageAtLen: history.length })
const longHistory = () => Array.from({ length: 20 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: `Important history ${i}` }))
const explorationHistory = () => [
  { role: "user", content: "Inspect code" },
  ...Array.from({ length: 3 }, (_, i) => [
    { role: "assistant", content: "", tool_calls: [{ id: `read_${i}`, type: "function", function: { name: "read", arguments: `{"file":"file_${i}"}` } }] },
    { role: "tool", tool_call_id: `read_${i}`, content: `Important original file data ${i}` },
  ]).flat(),
  { role: "assistant", content: "Exploration finished" },
]

test("failed, incomplete and EOF compaction preserves full original history and accounting", async () => {
  const fetch = globalThis.fetch
  try {
    for (const ending of endings) {
      globalThis.fetch = async () => fakeResponse(ending)
      const agent = agentFor(longHistory())
      const reference = agent.history
      const before = structuredClone(agent.history)
      await assert.rejects(() => compressIfNeeded(agent, 1, {}, { force: true }))
      assert.equal(agent.history, reference); assert.deepEqual(agent.history, before)
      assert.equal(agent._lastPromptTokens, 1234); assert.equal(agent._usageAtLen, before.length)
      assert.equal(agent._lastCompressInfo, undefined)
    }
  } finally { globalThis.fetch = fetch }
})

test("failed, incomplete and EOF exploration distillation preserves original tool results", async () => {
  const fetch = globalThis.fetch
  try {
    for (const ending of endings) {
      globalThis.fetch = async () => fakeResponse(ending)
      const agent = agentFor(explorationHistory())
      const reference = agent.history; const before = structuredClone(agent.history)
      let persisted = 0
      await summarizeRunExplorations(agent, { onDistilled() { persisted++ } })
      assert.equal(agent.history, reference); assert.deepEqual(agent.history, before)
      assert.equal(agent._lastPromptTokens, 1234); assert.equal(agent._usageAtLen, before.length)
      assert.equal(persisted, 0)
    }
  } finally { globalThis.fetch = fetch }
})

test("completed auxiliary responses can compact and distill with original lifecycle", async () => {
  const fetch = globalThis.fetch
  globalThis.fetch = async () => fakeResponse(completed, "COMPLETE SUMMARY")
  try {
    const compact = agentFor(longHistory())
    assert.equal(await compressIfNeeded(compact, 1, {}, { force: true }), true)
    assert.match(compact.history[0].content, /COMPLETE SUMMARY/)
    assert.equal(compact._lastPromptTokens, null); assert.equal(compact._lastCompressInfo.mode, "summary")
    const distill = agentFor(explorationHistory()); let persisted = 0
    await summarizeRunExplorations(distill, { onDistilled() { persisted++ } })
    assert.equal(persisted, 1); assert.equal(distill._lastPromptTokens, null)
    assert.ok(distill.history.some((m) => m.content === "[Exploration summary]\nCOMPLETE SUMMARY"))
  } finally { globalThis.fetch = fetch }
})

test("auxiliary guard rejects missing terminal, interruptions and unexecuted tool requests", () => {
  for (const result of [{ content: "answer" }, { terminalStatus: "completed", partial: true }, { terminalStatus: "completed", interrupted: true }, { terminalStatus: "completed", toolCalls: [{ id: "c" }] }]) {
    assert.throws(() => requireCompletedResponse(provider, result, "test"), { code: "incomplete_auxiliary_response" })
  }
  const good = { terminalStatus: "completed", content: "answer" }
  assert.equal(requireCompletedResponse(provider, good), good)
  const legacy = { content: "answer", finishReason: "stop" }
  assert.equal(requireCompletedResponse({ format: "openai" }, legacy), legacy)
  assert.throws(() => requireCompletedResponse({ format: "openai" }, { ...legacy, partial: true }))
})

test("partial difficulty classification never changes the selected reasoning effort", async () => {
  const { classifyAndApply } = await import("../auto-think.mjs")
  const fetch = globalThis.fetch
  const agent = agentFor([{ role: "user", content: "Review a multi-file refactor" }])
  agent.provider.model = "glm-5.2"; agent.provider.reasoningEffort = "low"; agent.config.agent.autoThink = true
  try {
    globalThis.fetch = async () => fakeResponse(endings[0], "high")
    assert.equal(await classifyAndApply(agent, 0), null)
    assert.equal(agent.provider.reasoningEffort, "low")
    globalThis.fetch = async () => fakeResponse(completed, "high")
    assert.equal(await classifyAndApply(agent, 0), "max")
    assert.equal(agent.provider.reasoningEffort, "max")
  } finally { globalThis.fetch = fetch }
})

test("Responses goal judge partial YES and request failure leave goal active", async () => {
  const { goalTool } = await import("../agent-tools/goal.mjs")
  const fetch = globalThis.fetch
  try {
    for (const ending of endings) {
      globalThis.fetch = async () => fakeResponse(ending, "YES, the criteria were met")
      const agent = agentFor(longHistory())
      agent.goal = { objective: "Fix bug", criteria: "tests pass", status: "active" }
      const before = structuredClone(agent.history)
      const result = await goalTool.execute({ action: "complete" }, { agent, depth: 0 })
      assert.match(result, /unverified/); assert.equal(agent.goal.status, "active"); assert.deepEqual(agent.history, before)
    }
    globalThis.fetch = async () => { throw new Error("network failed") }
    const agent = agentFor(longHistory()); agent.goal = { objective: "Fix bug", criteria: "tests pass", status: "active" }
    assert.match(await goalTool.execute({ action: "complete" }, { agent, depth: 0 }), /unverified/)
    assert.equal(agent.goal.status, "active")
    globalThis.fetch = async () => fakeResponse(completed, "YES, checked")
    assert.match(await goalTool.execute({ action: "complete" }, { agent, depth: 0 }), /verified complete/)
    assert.equal(agent.goal.status, "complete")
  } finally { globalThis.fetch = fetch }
})

test("failed advisor reply preserves streamed display but cannot become successful review or execute tools", async () => {
  const { runAdvisorToolLoop } = await import("../advisor/loop.mjs")
  const agent = agentFor(userHistory())
  const messages = [{ role: "user", content: "Review code" }]
  const output = []; let executions = 0
  const tools = { schemas: [], byName: new Map([["read", { execute() { executions++; return "data" } }]]) }
  const chat = async (_provider, opts) => {
    opts.onToken("PARTIAL REVIEW")
    return { content: "PARTIAL REVIEW", partial: true, terminalStatus: "failed", toolCalls: [{ id: "c", name: "read", arguments: "{}" }] }
  }
  await assert.rejects(() => runAdvisorToolLoop(provider, messages, (part) => output.push(part), undefined, agent, "/tmp", tools, "code", null, null, { chat }), { code: "incomplete_auxiliary_response" })
  assert.ok(output.some((part) => part.text === "PARTIAL REVIEW")); assert.equal(executions, 0)
  assert.equal(messages.length, 1); assert.equal(agent._lastAdvisorOutput, undefined)
})
function userHistory() { return [{ role: "user", content: "Review code" }] }

test("ChatGPT auto-think omits its internal output cap and still requires completion", async () => {
  const { classifyAndApply } = await import("../auto-think.mjs")
  const { _setAuthServiceForTest } = await import("../provider/auth-context.mjs")
  const fetch = globalThis.fetch; let body; let released = 0
  _setAuthServiceForTest({ async getAuthContext(profileId, { signal }) {
    return { profileId, signal, accessToken: "fixture-only", release() { released++ } }
  } })
  globalThis.fetch = async (_url, opts) => { body = JSON.parse(opts.body); return fakeResponse(completed, "high") }
  try {
    const agent = agentFor(userHistory()); delete agent.provider.apiKey
    agent.provider.auth = { type: "chatgpt_oauth", enabled: true, credentialRef: "aux-profile" }
    agent.provider.model = "glm-5.2"; agent.provider.reasoningEffort = "low"; agent.config.agent.autoThink = true
    assert.equal(await classifyAndApply(agent, 0), "max")
    assert.ok(!Object.hasOwn(body, "max_output_tokens")); assert.equal(body.stream, true); assert.equal(body.store, false)
    assert.equal(released, 1)
  } finally { globalThis.fetch = fetch; _setAuthServiceForTest(null) }
})

test("legacy non-Responses goal judge fallback remains unchanged", async () => {
  const { goalTool } = await import("../agent-tools/goal.mjs")
  const fetch = globalThis.fetch
  globalThis.fetch = async () => new Response("unauthorized", { status: 401 })
  try {
    const agent = agentFor(longHistory()); agent.provider.format = "openai"
    agent.goal = { objective: "Fix bug", criteria: "tests pass", status: "active" }
    assert.match(await goalTool.execute({ action: "complete" }, { agent, depth: 0 }), /verified complete/)
    assert.equal(agent.goal.status, "complete")
  } finally { globalThis.fetch = fetch }
})

test("advisor keeps native reasoning and message phase across its own tool rounds", async () => {
  const { runAdvisorToolLoop } = await import("../advisor/loop.mjs")
  const fetch = globalThis.fetch; const bodies = []; let executed = 0
  const tool = { type: "function", function: { name: "read", parameters: { type: "object", properties: {} } } }
  const native = [
    { type: "reasoning", id: "r_advisor", summary: [], encrypted_content: "opaque-advisor" },
    { type: "message", id: "m_advisor", role: "assistant", phase: "commentary", content: [{ type: "output_text", text: "Checking" }] },
    { type: "function_call", id: "fc_advisor", call_id: "call_advisor", name: "read", arguments: "{}" },
  ]
  globalThis.fetch = async (_url, opts) => {
    bodies.push(JSON.parse(opts.body))
    return new Response(frame({ type: "response.completed", response: { id: `r_${bodies.length}`, status: "completed", output: bodies.length === 1 ? native : completed.response.output } }))
  }
  try {
    const messages = [{ role: "system", content: "Review carefully" }, ...userHistory()]
    const tools = { schemas: [tool], byName: new Map([["read", { execute() { executed++; return "file contents" } }]]) }
    const result = await runAdvisorToolLoop(provider, messages, undefined, undefined, agentFor(userHistory()), "/tmp", tools)
    assert.match(result, /COMPLETE SUMMARY/); assert.equal(executed, 1); assert.equal(bodies.length, 2)
    assert.equal(bodies[1].input.find((i) => i.type === "reasoning").encrypted_content, "opaque-advisor")
    assert.equal(bodies[1].input.find((i) => i.type === "message").phase, "commentary")
    assert.equal(bodies[1].input.filter((i) => i.type === "function_call").length, 1)
    assert.equal(bodies[1].input.at(-1).type, "function_call_output")
    assert.ok(!Object.hasOwn(bodies[1], "previous_response_id"))
  } finally { globalThis.fetch = fetch }
})

test("advisor rebuilds its ephemeral native replay explicitly after local history compaction", async () => {
  const { runAdvisorToolLoop } = await import("../advisor/loop.mjs")
  const output = []; const contexts = []; let calls = 0
  const messages = [{ role: "system", content: "Review" }, ...Array.from({ length: 29 }, () => ({ role: "user", content: "a".repeat(48) }))]
  const small = { ...provider, context: 1, maxTokens: 1 }
  const tools = { schemas: [], byName: new Map([["read", { async execute() { return "b".repeat(1800) } }]]) }
  const chat = async (_provider, opts) => {
    calls++; contexts.push(opts.responsesContext)
    if (calls === 2) {
      opts.onToken("Review done")
      return { terminalStatus: "completed", content: "Review done", toolCalls: [] }
    }
    return { terminalStatus: "completed", content: "", toolCalls: [{ id: "c1", name: "read", arguments: "{}" }], responsesReplay: {
      schemaVersion: 1, profileBinding: `api_key:${provider.name}`, modelBinding: provider.model, endpointBinding: provider.baseURL,
      messageCount: opts.messages.length, orderedReplayableItems: [{ type: "reasoning", summary: [], encrypted_content: "opaque" }],
    } }
  }
  const result = await runAdvisorToolLoop(small, messages, (part) => output.push(part.text), undefined, agentFor(userHistory()), "/tmp", tools, "code", null, null, { chat })
  assert.match(result, /Review done/); assert.equal(calls, 2)
  assert.equal(contexts[1], undefined)
  assert.ok(output.some((text) => text.includes("opaque reasoning was not transferred")))
})

test("history rewrites checkpoint durable tool history only after successful auxiliary completion", async () => {
  const { mkdtempSync, readFileSync, rmSync } = await import("node:fs")
  const { tmpdir } = await import("node:os")
  const { join } = await import("node:path")
  const { attachResponsesSession, persistResponsesSession, checkpointResponsesHistory, responsesSessionPath } = await import("../responses-session.mjs")
  const directory = mkdtempSync(join(tmpdir(), "aux-checkpoint-")); const fetch = globalThis.fetch
  try {
    for (const kind of ["compact", "distill"]) {
      const agent = agentFor(kind === "compact" ? longHistory() : explorationHistory())
      const slot = join(directory, kind)
      attachResponsesSession(agent, slot)
      agent._responsesState.transactions.push({ key: "completed-tool-transaction", results: [] })
      checkpointResponsesHistory(agent); persistResponsesSession(agent)
      const before = readFileSync(responsesSessionPath(slot), "utf8")
      globalThis.fetch = async () => fakeResponse(endings[0])
      if (kind === "compact") await assert.rejects(() => compressIfNeeded(agent, 1, {}, { force: true }))
      else await summarizeRunExplorations(agent, {})
      assert.equal(readFileSync(responsesSessionPath(slot), "utf8"), before)
      globalThis.fetch = async () => fakeResponse(completed, "COMPLETE SUMMARY")
      if (kind === "compact") await compressIfNeeded(agent, 1, {}, { force: true })
      else await summarizeRunExplorations(agent, {})
      const after = JSON.parse(readFileSync(responsesSessionPath(slot), "utf8"))
      assert.equal(after.toolHistoryCheckpoint.messageCount, agent.history.length)
      assert.notEqual(after.toolHistoryCheckpoint.digest, JSON.parse(before).toolHistoryCheckpoint.digest)
    }
  } finally { globalThis.fetch = fetch; rmSync(directory, { recursive: true, force: true }) }
})

test("unresolved Responses boundaries block summary, fallback, shrinking, pruning and run-stage bookkeeping before fetch", async () => {
  const { runCompactionCheck } = await import("../agent/run-stages.mjs")
  const fetch = globalThis.fetch; let requests = 0
  globalThis.fetch = async () => { requests++; return fakeResponse(completed) }
  const error = { code: "responses_history_boundary_unresolved" }
  try {
    for (const blocked of [
      { _responsesState: { pendingToolTransaction: { status: "executing" } } },
      { _responsesState: { pendingToolTransaction: { status: "results_ready" } } },
      { _responsesRecoveryRequired: true }, { _responsesStateUnsupported: true },
    ]) {
      for (const operation of ["summary", "distill", "fallback", "shrink", "prune", "stage"]) {
        const agent = Object.assign(agentFor(operation === "distill" ? explorationHistory() : longHistory()), structuredClone(blocked))
        agent._pendingCompact = { focus: "retain evidence" }; agent._compressFailures = 2
        const reference = agent.history; const before = structuredClone(agent)
        if (operation === "summary") await assert.rejects(() => compressIfNeeded(agent, 1, {}, { force: true }), error)
        if (operation === "distill") await assert.rejects(() => summarizeRunExplorations(agent, {}), error)
        if (operation === "fallback") assert.throws(() => compressFallback(agent), error)
        if (operation === "shrink") assert.throws(() => shrinkOversized(agent), error)
        if (operation === "prune") assert.throws(() => pruneStaleToolOutputs(agent), error)
        if (operation === "stage") await assert.rejects(() => runCompactionCheck(agent, { threshold: 1, callbacks: {}, compactionOverhead: {}, recentCallSigs: [] }), error)
        assert.equal(agent.history, reference); assert.deepEqual(agent, before)
      }
    }
    assert.equal(requests, 0)
  } finally { globalThis.fetch = fetch }
})

test("a transaction beginning during an auxiliary request blocks the subsequent history rewrite", async () => {
  const fetch = globalThis.fetch
  try {
    for (const kind of ["summary", "distill"]) {
      const agent = agentFor(kind === "summary" ? longHistory() : explorationHistory())
      const reference = agent.history, before = structuredClone(agent.history)
      globalThis.fetch = async () => {
        agent._responsesState = { pendingToolTransaction: { status: "executing" } }
        return fakeResponse(completed, "COMPLETE SUMMARY")
      }
      const operation = kind === "summary" ? () => compressIfNeeded(agent, 1, {}, { force: true }) : () => summarizeRunExplorations(agent, {})
      await assert.rejects(operation, { code: "responses_history_boundary_unresolved" })
      assert.equal(agent.history, reference); assert.deepEqual(agent.history, before)
      assert.equal(agent._lastPromptTokens, 1234); assert.equal(agent._lastCompressInfo, undefined)
    }
  } finally { globalThis.fetch = fetch }
})

test("completed Responses tool boundaries permit summary, distillation and deterministic rewrites", async () => {
  const fetch = globalThis.fetch; let requests = 0
  globalThis.fetch = async () => { requests++; return fakeResponse(completed, "COMPLETE SUMMARY") }
  const ready = (history) => Object.assign(agentFor(history), { _responsesState: { schemaVersion: 1, transactions: [], pendingToolTransaction: null } })
  try {
    assert.equal(await compressIfNeeded(ready(longHistory()), 1, {}, { force: true }), true)
    const distill = ready(explorationHistory())
    await summarizeRunExplorations(distill, {})
    assert.ok(distill.history.some((m) => m.content.startsWith("[Exploration summary]")))
    assert.equal(compressFallback(ready(longHistory())), true)
    assert.equal(shrinkOversized(ready([{ role: "user", content: "x".repeat(9000) }])), true)
    const prune = ready([
      { role: "assistant", content: "", tool_calls: [{ id: "old", function: { name: "read", arguments: "{}" } }] },
      { role: "tool", tool_call_id: "old", content: "x".repeat(12000) }, ...longHistory(),
    ])
    assert.equal(pruneStaleToolOutputs(prune).pruned, 1)
    assert.equal(requests, 2)
  } finally { globalThis.fetch = fetch }
})
