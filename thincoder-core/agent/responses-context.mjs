/** Responses request preparation and completed-response staging for the agent loop. */
import { randomUUID } from "node:crypto"
import { saveSession } from "../session.mjs"
import { sessionPath } from "../session-slots.mjs"
import {
  attachResponsesSession, createResponsesState, responsesHistoryFingerprint,
  checkpointResponsesHistory, persistResponsesSession,
} from "../session-responses.mjs"
import { responsesProfileBinding, responsesCredentialBinding } from "../provider/responses-binding.mjs"

/** Attach before the first model/tool call, including new CLI/ACP sessions. */
export async function ensureResponsesSession(agent, depth = 0) {
  if (agent.provider?.format !== "responses" || agent._responsesStatePath) return
  if (agent._recordStore?.slotFile) return attachResponsesSession(agent, agent._recordStore.slotFile)
  if (!agent.cwd) throw new Error("Responses tool sessions require a durable session path")
  if (depth === 0) {
    saveSession(agent)
  } else {
    // Children never claim or overwrite the parent's display slot. Keep forensic journals.
    attachResponsesSession(agent, `${sessionPath(agent.cwd)}.children/${randomUUID()}`)
  }
}

export function prepareResponsesContext(agent, messages) {
  if (agent.provider?.format !== "responses") return undefined
  if (agent._responsesStateUnsupported) throw new Error("Responses session schema is unsupported; use the newer client or start a new session")
  delete agent._pendingResponsesReplay
  if (agent._responsesRecoveryRequired) throw new Error("Responses tool outputs are not present in the saved history. Check completed side effects and start a new session; automatic recovery is blocked.")
  const state = agent._responsesState ??= createResponsesState()
  if (state.pendingToolTransaction) {
    throw new Error("A previous Responses tool transaction has an unknown outcome. Check its side effects before starting a new session; automatic tool replay is blocked.")
  }
  checkpointResponsesHistory(agent)
  const replay = state.replay
  if (!replay) return undefined
  const bound = replay.profileBinding === responsesProfileBinding(agent.provider) && replay.modelBinding === agent.provider.model
    && replay.endpointBinding === agent.provider.baseURL?.replace(/\/+$/, "")
    && replay.credentialBinding === responsesCredentialBinding(agent.provider)
  const prefixMatches = Number.isInteger(replay.messageCount) && replay.messageCount <= messages.length
    && replay.historyDigest === responsesHistoryFingerprint(messages.slice(0, replay.messageCount))
  if (bound && prefixMatches) return replay
  state.replay = null
  agent._responsesReplayWarning = "Responses context was rebuilt from visible history after a model, account, or context checkpoint change; opaque reasoning was not transferred."
  persistResponsesSession(agent)
  return undefined
}

/** Stage only a terminal-success replay. pushReal commits it with the display assistant. */
export function stageResponsesReplay(agent, response, systemPrompt) {
  delete agent._pendingResponsesReplay
  if (!response.responsesReplay || response.terminalStatus !== "completed") return
  agent._pendingResponsesReplay = { replay: response.responsesReplay, systemPrompt }
  if (agent._responsesReplayWarning) {
    response._warnings = [...(response._warnings ?? []), { name: "responses-context-rebuilt", message: agent._responsesReplayWarning }]
    delete agent._responsesReplayWarning
  }
}
