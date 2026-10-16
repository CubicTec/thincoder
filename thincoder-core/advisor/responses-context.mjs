/** A review owns ephemeral native Responses replay, independent of the main session. */
import { createHash } from "node:crypto"
import { responsesProfileBinding, responsesCredentialBinding } from "../provider/capabilities.mjs"
import { stripLocalMessageFields } from "../escape.mjs"

const digest = (history) => createHash("sha256").update(JSON.stringify(stripLocalMessageFields(history))).digest("hex")

export function createAdvisorResponsesContext(provider) {
  const requestProvider = provider.format === "responses" ? { ...provider, stateful: false, _responsesChain: null } : provider
  let context = null, replayDigest = null
  return {
    provider: requestProvider,
    prepare(messages, onText) {
      if (context && (context.profileBinding !== responsesProfileBinding(requestProvider)
        || (context.credentialBinding !== undefined && context.credentialBinding !== responsesCredentialBinding(requestProvider))
        || context.modelBinding !== requestProvider.model
        || context.endpointBinding !== requestProvider.baseURL.replace(/\/+$/, "")
        || replayDigest !== digest(messages.slice(0, context.messageCount)))) {
        context = null; replayDigest = null
        onText("\n[Advisor Responses context rebuilt after a checkpoint change; opaque reasoning was not transferred.]\n")
      }
      return context ?? undefined
    },
    record(response, messages) {
      if (!response.responsesReplay) return
      context = { ...response.responsesReplay, messageCount: messages.length }
      replayDigest = digest(messages)
    },
  }
}
