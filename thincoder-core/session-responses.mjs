/** Durable native Responses state, append commits and tool transactions; independent of slot allocation. */
import { createHash, randomUUID } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, openSync, fsyncSync, closeSync, unlinkSync } from "node:fs"
import { dirname } from "node:path"
import { stripLocalMessageFields } from "./escape.mjs"
import { responsesProfileBinding, responsesCredentialBinding } from "./provider/responses-binding.mjs"
import { messagesToItems } from "./provider/responses-items.mjs"

const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex")
export const responsesHistoryFingerprint = (messages) => hash(stripLocalMessageFields(messages))
export const createResponsesState = (identity = null) => ({ schemaVersion: 1, identity, replay: null, transactions: [], pendingToolTransaction: null })
export const responsesSessionPath = (slotFile) => `${slotFile}.responses.json`

const record = (value) => !!value && typeof value === "object" && !Array.isArray(value)
const text = (value) => typeof value === "string" && value.length > 0
const validCall = (call) => record(call) && text(call.id) && text(call.name) && typeof call.arguments === "string"
function validJournal(data) {
  if (!record(data) || data.schemaVersion !== 1 || !Array.isArray(data.transactions)) return false
  const keys = new Set()
  for (const transaction of data.transactions) {
    if (!record(transaction) || !text(transaction.key) || keys.has(transaction.key) || !Array.isArray(transaction.results)
      || transaction.results.some((result) => !record(result) || !validCall(result.toolCall) || typeof result.ok !== "boolean" || typeof result.result !== "string")) return false
    if (new Set(transaction.results.map((result) => result.toolCall.id)).size !== transaction.results.length) return false
    keys.add(transaction.key)
  }
  const pending = data.pendingToolTransaction
  if (pending != null && (!record(pending) || !text(pending.key) || !Array.isArray(pending.callIds)
    || !pending.callIds.length || pending.callIds.some((id) => !text(id)) || new Set(pending.callIds).size !== pending.callIds.length
    || !["executing", "results_ready"].includes(pending.status)
    || (pending.historyStart !== undefined && (!Number.isInteger(pending.historyStart) || pending.historyStart < 0)))) return false
  if (pending?.status === "results_ready" && !data.transactions.some((entry) => entry.key === pending.key
    && entry.results.length === pending.callIds.length && entry.results.every((entry) => pending.callIds.includes(entry.toolCall.id)))) return false
  const checkpoint = data.toolHistoryCheckpoint
  if (checkpoint != null && (!record(checkpoint) || !Number.isInteger(checkpoint.messageCount) || checkpoint.messageCount < 0 || !text(checkpoint.digest))) return false
  if (data.transactions.length && pending == null && checkpoint == null) return false
  const replay = data.replay
  return replay == null || (record(replay) && replay.schemaVersion === 1 && Array.isArray(replay.orderedReplayableItems)
    && replay.orderedReplayableItems.every(record) && Number.isInteger(replay.messageCount) && replay.messageCount >= 0
    && text(replay.profileBinding) && text(replay.modelBinding) && text(replay.endpointBinding) && text(replay.historyDigest))
}

export function attachResponsesSession(agent, slotFile) {
  const path = responsesSessionPath(slotFile)
  if (agent._responsesStatePath === path) return
  agent._responsesStatePath = path
  agent._responsesState = createResponsesState(agent._sessionStart ?? null)
  agent._responsesStateUnsupported = false
  delete agent._responsesRecoveryRequired
  delete agent._responsesWriteFailed
  if (!existsSync(path)) return
  // Latch closed before parsing: retries must never replace an unreadable journal.
  agent._responsesStateUnsupported = true
  const data = JSON.parse(readFileSync(path, "utf8"))
  if (!validJournal(data)) {
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
    || checkpoint.digest !== responsesHistoryFingerprint(agent.history.slice(0, checkpoint.messageCount)))) {
    agent._responsesRecoveryRequired = true
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
  if (agent._responsesWriteFailed) throw new Error("Responses journal persistence failed; recovery is required before saving again")
  const path = agent._responsesStatePath
  if (!path || !agent._responsesState) return
  agent._responsesState.identity ??= agent._sessionStart ?? null
  const tmp = `${path}.${process.pid}.${randomUUID()}.tmp`
  try {
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
    writeFileSync(tmp, JSON.stringify(agent._responsesState), { mode: 0o600, flag: "wx" })
    const fd = openSync(tmp, "r")
    try { fsyncSync(fd) } finally { closeSync(fd) }
    renameSync(tmp, path)
    if (process.platform !== "win32") {
      const dir = openSync(dirname(path), "r")
      try { fsyncSync(dir) } finally { closeSync(dir) }
    }
  } catch (error) {
    // In-memory acknowledgement may already have cleared pending. A failed durable
    // commit must remain closed in this process as well as after a restart.
    agent._responsesRecoveryRequired = true
    agent._responsesWriteFailed = true
    try { unlinkSync(tmp) } catch { /* best effort cleanup of an uncommitted temp */ }
    throw error
  }
}

/** The append boundary commits native state without depending on agent request orchestration. */
export function commitResponsesReplay(agent, message) {
  const pending = agent._pendingResponsesReplay
  if (!pending || message.role !== "assistant") return
  const state = agent._responsesState ??= createResponsesState()
  const all = [{ role: "system", content: pending.systemPrompt }, ...agent.history]
  const between = all.slice(pending.replay.messageCount, -1)
  const hostedIds = new Set(pending.replay.orderedReplayableItems.filter((item) => item.type === "web_search_call").map((item) => item.id))
  // Hosted output has already been included by the transport. The display-only
  // tool message added before the assistant is a mirror, not a second replay item.
  const extra = messagesToItems(between, agent.provider).items.filter((item) => item.type !== "web_search_call" || !hostedIds.has(item.id))
  state.replay = {
    ...pending.replay,
    orderedReplayableItems: [...pending.replay.orderedReplayableItems, ...extra],
    messageCount: all.length,
    historyDigest: responsesHistoryFingerprint(all),
  }
  delete agent._pendingResponsesReplay
  checkpointResponsesHistory(agent)
  persistResponsesSession(agent)
}

/** Persist before invocation; a crash/throw keeps an explicit unknown outcome, never a replay. */
export async function runResponsesToolTransaction(agent, calls, execute) {
  if (agent.provider?.format !== "responses") return execute()
  if (agent._responsesStateUnsupported || agent._responsesRecoveryRequired) throw new Error("Responses journal requires recovery; tool execution is blocked")
  if (!agent._responsesStatePath) throw new Error("Responses tools require a durable session journal before execution")
  const state = agent._responsesState ??= createResponsesState()
  if (state.pendingToolTransaction) throw new Error("A Responses tool transaction is still unresolved; refusing duplicate execution")
  if (!Array.isArray(calls) || !calls.length || calls.some((call) => !validCall(call)) || new Set(calls.map((call) => call.id)).size !== calls.length) throw new Error("Responses tool calls are invalid or duplicated")
  const key = hash({ binding: responsesProfileBinding(agent.provider), credential: responsesCredentialBinding(agent.provider), endpoint: agent.provider.baseURL?.replace(/\/+$/, ""), model: agent.provider.model, calls })
  const previous = state.transactions.find((entry) => entry.key === key)
  if (previous) return structuredClone(previous.results)
  const journal = agent._responsesStatePath, session = agent._sessionStart, history = agent.history
  state.pendingToolTransaction = { key, callIds: calls.map((c) => c.id), status: "executing", startedAt: Date.now(), historyStart: agent.history.length }
  persistResponsesSession(agent)
  const results = await execute()
  if (agent._responsesState !== state || agent._responsesStatePath !== journal || agent._sessionStart !== session || agent.history !== history) {
    // The original journal deliberately retains its executing marker. Never write
    // old results to a newly selected session or let recordToolResults do so.
    throw new Error("Session changed during Responses tool execution; results were not committed. Check the original transaction's side effects before resuming it.")
  }
  if (!Array.isArray(results) || results.length !== calls.length || results.some((entry) => !validCall(entry?.toolCall)
    || typeof entry.result !== "string" || !calls.some((call) => hash(call) === hash(entry.toolCall)))
    || new Set(results.map((entry) => entry.toolCall.id)).size !== calls.length) {
    throw new Error("Responses tool results are incomplete or do not match the executing transaction")
  }
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
  state.toolHistoryCheckpoint = { messageCount: agent.history.length, digest: responsesHistoryFingerprint(agent.history) }
}

/** Called only after every tool output has been recorded. A crash before this stays blocked. */
export function acknowledgeResponsesToolTransaction(agent) {
  const state = agent._responsesState
  if (!state?.pendingToolTransaction) return
  if (state.pendingToolTransaction.status !== "results_ready") throw new Error("Responses tool results are unresolved")
  const ids = agent.history.slice(state.pendingToolTransaction.historyStart ?? 0).filter((m) => m.role === "tool").map((m) => m.tool_call_id)
  if (!state.pendingToolTransaction.callIds.every((id) => ids.filter((saved) => saved === id).length === 1)) throw new Error("Responses tool outputs are incomplete or duplicated")
  state.toolHistoryCheckpoint = { messageCount: agent.history.length, digest: responsesHistoryFingerprint(agent.history) }
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
  delete agent._responsesWriteFailed
}
