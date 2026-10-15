/** Native Responses state and durable tool transaction journal, separate from display history. */
import { createHash, randomUUID } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, openSync, fsyncSync, closeSync, unlinkSync } from "node:fs"
import { dirname } from "node:path"
import { stripLocalMessageFields } from "./escape.mjs"
import { responsesProfileBinding } from "./provider/capabilities.mjs"
import { messagesToItems } from "./provider/responses-items.mjs"

const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex")
const fingerprint = (messages) => hash(stripLocalMessageFields(messages))
const fresh = (identity = null) => ({ schemaVersion: 1, identity, replay: null, transactions: [], pendingToolTransaction: null })
export const responsesSessionPath = (slotFile) => `${slotFile}.responses.json`

export function attachResponsesSession(agent, slotFile) {
  const path = responsesSessionPath(slotFile)
  if (agent._responsesStatePath === path) return
  agent._responsesStatePath = path
  agent._responsesState = fresh(agent._sessionStart ?? null)
  agent._responsesStateUnsupported = false
  delete agent._responsesRecoveryRequired
  if (!existsSync(path)) return
  // Latch closed before parsing: retries must never replace an unreadable journal.
  agent._responsesStateUnsupported = true
  const data = JSON.parse(readFileSync(path, "utf8"))
  if (data?.schemaVersion !== 1 || !Array.isArray(data.transactions)) {
    agent._responsesStateUnsupported = true
    return // preserve future schema bytes; never overwrite with an older client
  }
  if (data.identity != null && data.identity !== (agent._sessionStart ?? null)) {
    // Slot reuse after an old client deleted/moved only its known files. Preserve the orphan.
    renameSync(path, `${path}.orphan-${randomUUID()}`)
    agent._responsesStateUnsupported = false
    return
  }
  agent._responsesState = data
  agent._responsesStateUnsupported = false
  const checkpoint = data.toolHistoryCheckpoint
  if (checkpoint && (checkpoint.messageCount > agent.history.length
    || checkpoint.digest !== fingerprint(agent.history.slice(0, checkpoint.messageCount)))) {
    agent._responsesRecoveryRequired = true
  }
}

/** Attach before the first model/tool call, including new CLI/ACP sessions. */
export async function ensureResponsesSession(agent, depth = 0) {
  if (agent.provider?.format !== "responses" || agent._responsesStatePath) return
  if (agent._recordStore?.slotFile) return attachResponsesSession(agent, agent._recordStore.slotFile)
  if (!agent.cwd) throw new Error("Responses tool sessions require a durable session path")
  if (depth === 0) {
    const { saveSession } = await import("./session.mjs")
    saveSession(agent)
  } else {
    // Children never claim or overwrite the parent's display slot. Keep forensic journals.
    const { sessionPath } = await import("./session-slots.mjs")
    attachResponsesSession(agent, `${sessionPath(agent.cwd)}.children/${randomUUID()}`)
  }
}

export function unlinkResponsesSession(slotFile) {
  try { unlinkSync(responsesSessionPath(slotFile)) } catch (e) { if (e.code !== "ENOENT") throw e }
}

export function moveResponsesSession(src, dst, agent) {
  if (agent?._responsesStatePath === responsesSessionPath(src)) return
  if (existsSync(responsesSessionPath(src))) renameSync(responsesSessionPath(src), responsesSessionPath(dst))
}

export function persistResponsesSession(agent) {
  if (agent._responsesStateUnsupported) return // leave future bytes untouched, including old-format saves
  const path = agent._responsesStatePath
  if (!path || !agent._responsesState) return
  agent._responsesState.identity ??= agent._sessionStart ?? null
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
  const tmp = `${path}.${process.pid}.${randomUUID()}.tmp`
  writeFileSync(tmp, JSON.stringify(agent._responsesState), { mode: 0o600, flag: "wx" })
  const fd = openSync(tmp, "r")
  try { fsyncSync(fd) } finally { closeSync(fd) }
  renameSync(tmp, path)
  if (process.platform !== "win32") {
    const dir = openSync(dirname(path), "r")
    try { fsyncSync(dir) } finally { closeSync(dir) }
  }
}

export function prepareResponsesContext(agent, messages) {
  if (agent.provider?.format !== "responses") return undefined
  if (agent._responsesStateUnsupported) throw new Error("Responses session schema is unsupported; use the newer client or start a new session")
  delete agent._pendingResponsesReplay
  if (agent._responsesRecoveryRequired) throw new Error("Responses tool outputs are not present in the saved history. Check completed side effects and start a new session; automatic recovery is blocked.")
  const state = agent._responsesState ??= fresh()
  if (state.pendingToolTransaction) {
    throw new Error("A previous Responses tool transaction has an unknown outcome. Check its side effects before starting a new session; automatic tool replay is blocked.")
  }
  checkpointResponsesHistory(agent)
  const replay = state.replay
  if (!replay) return undefined
  const bound = replay.profileBinding === responsesProfileBinding(agent.provider) && replay.modelBinding === agent.provider.model
    && replay.endpointBinding === agent.provider.baseURL?.replace(/\/+$/, "")
  const prefixMatches = Number.isInteger(replay.messageCount) && replay.messageCount <= messages.length
    && replay.historyDigest === fingerprint(messages.slice(0, replay.messageCount))
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

export function commitResponsesReplay(agent, message) {
  const pending = agent._pendingResponsesReplay
  if (!pending || message.role !== "assistant") return
  const state = agent._responsesState ??= fresh()
  const all = [{ role: "system", content: pending.systemPrompt }, ...agent.history]
  const between = all.slice(pending.replay.messageCount, -1)
  const extra = messagesToItems(between, agent.provider).items
  state.replay = {
    ...pending.replay,
    orderedReplayableItems: [...pending.replay.orderedReplayableItems, ...extra],
    messageCount: all.length,
    historyDigest: fingerprint(all),
  }
  delete agent._pendingResponsesReplay
  checkpointResponsesHistory(agent)
  persistResponsesSession(agent)
}

/** Persist before invocation; a crash/throw keeps an explicit unknown outcome, never a replay. */
export async function runResponsesToolTransaction(agent, calls, execute) {
  if (agent.provider?.format !== "responses") return execute()
  if (!agent._responsesStatePath) throw new Error("Responses tools require a durable session journal before execution")
  const state = agent._responsesState ??= fresh()
  const key = hash({ binding: responsesProfileBinding(agent.provider), endpoint: agent.provider.baseURL?.replace(/\/+$/, ""), model: agent.provider.model, calls })
  const previous = state.transactions.find((entry) => entry.key === key)
  if (previous) return structuredClone(previous.results)
  if (state.pendingToolTransaction) throw new Error("A Responses tool transaction is still unresolved; refusing duplicate execution")
  state.pendingToolTransaction = { key, callIds: calls.map((c) => c.id), status: "executing", startedAt: Date.now() }
  persistResponsesSession(agent)
  const results = await execute()
  // Dispatch results also carry executable tool objects. Journal only the data contract
  // consumed by recordToolResults/post-turn; never serialize runtime functions or agents.
  const saved = results.map(({ toolCall, result, ok }) => ({ toolCall: structuredClone(toolCall), result, ok: ok === true }))
  state.transactions.push({ key, results: saved })
  state.pendingToolTransaction.status = "results_ready"
  persistResponsesSession(agent)
  return results
}

/** An explicit, in-process history checkpoint may follow compaction or distillation. */
export function checkpointResponsesHistory(agent) {
  const state = agent._responsesState
  if (!state?.transactions?.length || state.pendingToolTransaction || agent._responsesRecoveryRequired) return
  state.toolHistoryCheckpoint = { messageCount: agent.history.length, digest: fingerprint(agent.history) }
}

/** Called only after every tool output has been recorded. A crash before this stays blocked. */
export function acknowledgeResponsesToolTransaction(agent) {
  const state = agent._responsesState
  if (!state?.pendingToolTransaction) return
  if (state.pendingToolTransaction.status !== "results_ready") throw new Error("Responses tool results are unresolved")
  const ids = new Set(agent.history.filter((m) => m.role === "tool").map((m) => m.tool_call_id))
  if (!state.pendingToolTransaction.callIds.every((id) => ids.has(id))) throw new Error("Responses tool outputs are incomplete")
  state.toolHistoryCheckpoint = { messageCount: agent.history.length, digest: fingerprint(agent.history) }
  state.pendingToolTransaction = null
  persistResponsesSession(agent)
}

export function resetResponsesSession(agent) {
  delete agent._responsesState
  delete agent._responsesStatePath
  delete agent._responsesStateUnsupported
  delete agent._pendingResponsesReplay
  delete agent._responsesReplayWarning
  delete agent._responsesRecoveryRequired
}
