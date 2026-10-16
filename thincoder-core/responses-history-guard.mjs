/** Context rewriting must never hide an unresolved Responses tool outcome. */
import { ProviderError } from "./provider/errors.mjs"
import { assertFunctionPairs, messagesToItems } from "./provider/responses-items.mjs"

export const RESPONSES_HISTORY_BOUNDARY_ERROR = "responses_history_boundary_unresolved"

export function assertResponsesHistoryBoundary(agent, purpose = "context rewrite") {
  let unresolved = agent?._responsesState?.pendingToolTransaction || agent?._responsesRecoveryRequired || agent?._responsesStateUnsupported
  if (!unresolved && agent?.provider?.format === "responses") {
    try { assertFunctionPairs(messagesToItems(agent.history ?? [], agent.provider).items, agent.provider) }
    catch { unresolved = true }
  }
  if (!unresolved) return
  // Keep the gate closed even after a provider switch: the unresolved journal belongs to history.
  throw new ProviderError(agent.provider, `${purpose} is blocked until the Responses tool transaction is resolved. Check completed side effects and recover or start a new session; history was not rewritten.`, {
    code: RESPONSES_HISTORY_BOUNDARY_ERROR, stage: "context_boundary", retryClass: "never", retryable: false,
  })
}
