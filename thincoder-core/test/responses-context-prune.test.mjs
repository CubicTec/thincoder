/** Context pruning through the actual dispatcher and durable Responses transaction lifecycle. */
import test from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createAgent } from "../agent.mjs"
import { contextTool } from "../agent-tools/context.mjs"
import { executeToolCalls } from "../agent/dispatch.mjs"
import { recordToolResults } from "../agent/record-results.mjs"
import { runCompactionCheck } from "../agent/run-stages.mjs"
import { attachResponsesSession, runResponsesToolTransaction, acknowledgeResponsesToolTransaction } from "../session-responses.mjs"

const originalData = "x".repeat(12000)
const call = (id, action) => ({ id, name: "context", arguments: JSON.stringify({ action }) })
const history = () => [
  { role: "assistant", content: "", tool_calls: [{ id: "old-read", type: "function", function: { name: "read", arguments: "{}" } }] },
  { role: "tool", tool_call_id: "old-read", content: originalData },
  ...Array.from({ length: 20 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: "History" })),
]
const create = (cwd, format) => createAgent({
  provider: { name: "prune-test", format, model: "gpt-5.6", baseURL: "https://api.openai.com/v1", apiKey: "fixture-only", stateful: false, builtinTools: false },
  config: { agent: {}, traces: { enabled: false } }, cwd, tools: [contextTool], history: history(),
})
const boundary = (agent) => runCompactionCheck(agent, { threshold: Number.MAX_SAFE_INTEGER, callbacks: {}, compactionOverhead: {}, recentCallSigs: [] })

test("actual Responses context prune dispatch queues until every transaction output is acknowledged, then applies once", async () => {
  const root = mkdtempSync(join(tmpdir(), "responses-prune-")), fetch = globalThis.fetch
  let requests = 0, executions = 0
  globalThis.fetch = async () => { requests++; throw new Error("This deterministic boundary must not fetch") }
  try {
    const agent = create(root, "responses")
    attachResponsesSession(agent, join(root, "slot"))
    const tools = new Map([["context", { ...contextTool, async execute(args, ctx) {
      executions++
      assert.equal(ctx.agent._responsesState.pendingToolTransaction.status, "executing")
      assert.equal(ctx.agent.history[1].content, originalData)
      return contextTool.execute(args, ctx)
    } }]])
    const calls = [call("prune-now", "prune"), call("stats-now", "stats")]
    agent.history.push({ role: "assistant", content: "", tool_calls: calls.map((tc) => ({ id: tc.id, type: "function", function: { name: tc.name, arguments: tc.arguments } })) })
    const results = await runResponsesToolTransaction(agent, calls, () => executeToolCalls(agent, tools, calls, {}, 0))
    assert.equal(executions, 2); assert.ok(results.every((r) => r.ok))
    assert.match(results[0].result, /^Pruning queued/)
    assert.equal(agent.history[1].content, originalData)
    assert.equal(agent._responsesState.pendingToolTransaction.status, "results_ready")
    assert.ok(agent._pendingResponsesPrune)
    const length = agent.history.length
    await assert.rejects(() => boundary(agent), { code: "responses_history_boundary_unresolved" })
    assert.equal(agent.history.length, length); assert.equal(agent.history[1].content, originalData)

    await recordToolResults(agent, tools, results.slice(0, 1))
    assert.throws(() => acknowledgeResponsesToolTransaction(agent), /outputs are incomplete/)
    await assert.rejects(() => boundary(agent), { code: "responses_history_boundary_unresolved" })
    assert.ok(agent._pendingResponsesPrune)
    await recordToolResults(agent, tools, results.slice(1))
    acknowledgeResponsesToolTransaction(agent)
    await boundary(agent)
    assert.match(agent.history[1].content, /^\[pruned:/)
    assert.equal(agent._pendingResponsesPrune, undefined)
    assert.match(agent.history.at(-1).content, /context prune completed\. Pruned 1 stale tool output/)
    assert.equal(agent.history.filter((m) => m.role === "tool" && ["prune-now", "stats-now"].includes(m.tool_call_id)).length, 2)
    const journal = JSON.parse(readFileSync(agent._responsesStatePath, "utf8"))
    assert.equal(journal.pendingToolTransaction, null)
    assert.equal(journal.toolHistoryCheckpoint.messageCount, agent.history.length)
    const after = JSON.stringify(agent.history)
    await boundary(agent)
    assert.equal(JSON.stringify(agent.history), after); assert.equal(requests, 0)
  } finally { globalThis.fetch = fetch; rmSync(root, { recursive: true, force: true }) }
})

test("actual non-Responses context prune dispatch retains immediate legacy behavior", async () => {
  const root = mkdtempSync(join(tmpdir(), "legacy-prune-"))
  try {
    const agent = create(root, "openai"), tools = new Map([["context", contextTool]])
    const results = await executeToolCalls(agent, tools, [call("prune-legacy", "prune")], {}, 0)
    assert.equal(results[0].ok, true); assert.match(results[0].result, /^Pruned 1 stale tool output/)
    assert.match(agent.history[1].content, /^\[pruned:/)
    assert.equal(agent._pendingResponsesPrune, undefined)
  } finally { rmSync(root, { recursive: true, force: true }) }
})
