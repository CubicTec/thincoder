/** A summary may replace only the exact context for which it was requested. */
import { createHash } from "node:crypto"
import { stripLocalMessageFields } from "./escape.mjs"
import { ProviderError } from "./provider/errors.mjs"
import { assertResponsesHistoryBoundary } from "./responses-history-guard.mjs"

export const CONTEXT_HISTORY_CHANGED = "context_history_changed"
const digest = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex")
const providerBinding = (provider) => digest([
  provider?.format, provider?.name, provider?.model, provider?.baseURL,
  provider?.auth?.type, provider?.auth?.credentialRef, provider?.auth?.enabled, provider?.apiKey,
])

/** Capture before awaiting the auxiliary model; recheck immediately before committing. */
export function captureContextRewrite(agent, purpose) {
  assertResponsesHistoryBoundary(agent, purpose)
  const history = agent.history
  const historyDigest = digest(stripLocalMessageFields(history))
  const binding = providerBinding(agent.provider)
  const session = agent._sessionStart
  const journal = agent._responsesStatePath
  return () => {
    assertResponsesHistoryBoundary(agent, purpose)
    if (agent.history === history && historyDigest === digest(stripLocalMessageFields(agent.history))
      && session === agent._sessionStart && journal === agent._responsesStatePath
      && binding === providerBinding(agent.provider)) return
    throw new ProviderError(agent.provider, `${purpose} was discarded because the session, provider or history changed while it was running; current history was not rewritten.`, {
      code: CONTEXT_HISTORY_CHANGED, stage: "context_boundary", retryClass: "never", retryable: false,
    })
  }
}
