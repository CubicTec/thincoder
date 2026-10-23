/** Responses prune requests wait until all results in their tool transaction are acknowledged. */
import { pruneStaleToolOutputs } from "./context-degrade.mjs"
import { PRUNE_MIN_TOKENS } from "./token-window.mjs"
import { assertResponsesHistoryBoundary } from "./responses-history-guard.mjs"
import { checkpointResponsesHistory, persistResponsesSession } from "./session-responses.mjs"

/** Immediate legacy-provider receipt; the deferred Responses path uses the same final report. */
export function pruneReceipt(agent) {
  const r = pruneStaleToolOutputs(agent)
  const scan = `(scanned ${r.candidates} tool result(s): ${r.tailKept} inside the protected tail, ${r.belowMin} below the ${PRUNE_MIN_TOKENS}-token floor)`
  if (r.pruned === 0) {
    return `Nothing to prune — no stale tool output matched ${scan}. The context and the session record are unchanged.`
  }
  return `Pruned ${r.pruned} stale tool output(s) ≈${r.freed} tokens freed ${scan}. ` +
    `Tool pairing is intact and the session record is unchanged — the full text is still on disk; re-run a tool if you need its output again.`
}

export function requestContextPrune(agent) {
  if (agent.provider?.format !== "responses") return pruneReceipt(agent)
  agent._pendingResponsesPrune = { identity: agent._sessionStart ?? null }
  return "Pruning queued for the next acknowledged tool boundary, before the next model request. No history has been pruned yet; completion will be reported at that boundary."
}

/** Also gates normal compaction, including when there is no pending prune. */
export function applyPendingContextPrune(agent) {
  assertResponsesHistoryBoundary(agent, "Context update")
  const pending = agent._pendingResponsesPrune
  if (!pending) return
  if (pending.identity !== (agent._sessionStart ?? null)) { delete agent._pendingResponsesPrune; return }
  const receipt = pruneReceipt(agent)
  delete agent._pendingResponsesPrune
  agent.history.push({ role: "user", content: `[System reminder: context prune completed. ${receipt}]`, transient: true })
  checkpointResponsesHistory(agent)
  persistResponsesSession(agent)
}
