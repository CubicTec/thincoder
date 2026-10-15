import { test, afterEach } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import { syncBuiltinESMExports } from "node:module"
import { mkdtempSync, readFileSync, writeFileSync, readdirSync, rmSync, existsSync, mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  attachResponsesSession, ensureResponsesSession, responsesSessionPath, persistResponsesSession,
  prepareResponsesContext, stageResponsesReplay, commitResponsesReplay, runResponsesToolTransaction,
  acknowledgeResponsesToolTransaction, checkpointResponsesHistory, resetResponsesSession,
  moveResponsesSession, unlinkResponsesSession,
} from "../responses-session.mjs"
import { _setSessionsDirForTest, _resetSessionsDirForTest } from "../session-slots.mjs"

const roots = []
const temp = () => { const dir = mkdtempSync(join(tmpdir(), "thincoder-native-regression-")); roots.push(dir); return dir }
afterEach(() => {
  _resetSessionsDirForTest()
  for (const dir of roots.splice(0)) rmSync(dir, { recursive: true, force: true })
})
const provider = () => ({ name: "test", format: "responses", baseURL: "https://api.openai.com/v1", apiKey: "fixture-only", model: "test-model" })
const calls = [{ id: "call-a", name: "write_file", arguments: '{"path":"a"}' }]
const toolMessage = () => ({ role: "tool", tool_call_id: "call-a", content: "Written" })
const agentFor = (extra = {}) => ({ provider: provider(), history: [{ role: "user", content: "Write it" }], _sessionStart: "session-a", ...extra })
const disk = agent => JSON.parse(readFileSync(agent._responsesStatePath, "utf8"))
const execute = async () => [{ toolCall: calls[0], ok: true, content: "Written" }]
const messages = agent => [{ role: "system", content: "system" }, ...agent.history]
const replay = () => ({ terminalStatus: "completed", responsesReplay: {
  schemaVersion: 1, profileBinding: "api_key:test", modelBinding: "test-model",
  endpointBinding: "https://api.openai.com/v1", messageCount: 2,
  orderedReplayableItems: [{ type: "reasoning", encrypted_content: "opaque-test", summary: [] }],
} })

test("first Responses tool requires a journal and writes executing intent before invocation", async () => {
  const agent = agentFor()
  let invocations = 0
  await assert.rejects(runResponsesToolTransaction(agent, calls, async () => { invocations++ }), /durable session journal/)
  assert.equal(invocations, 0)
  const slot = join(temp(), "slot.json.1")
  agent._recordStore = { slotFile: slot }
  await ensureResponsesSession(agent)
  assert.equal(agent._responsesStatePath, responsesSessionPath(slot))
  await runResponsesToolTransaction(agent, calls, async () => {
    invocations++
    assert.equal(disk(agent).pendingToolTransaction.status, "executing")
    return execute()
  })
  assert.equal(invocations, 1)
  assert.equal(disk(agent).pendingToolTransaction.status, "results_ready")
})

test("fresh main sessions and child sessions establish separate durable paths before tools", async () => {
  const root = temp()
  _setSessionsDirForTest(root)
  const main = agentFor({ cwd: join(root, "project"), tasks: [], config: { agent: {} } })
  await ensureResponsesSession(main)
  assert.ok(main._responsesStatePath)
  assert.ok(existsSync(main._responsesStatePath))
  const child = agentFor({ cwd: main.cwd })
  await ensureResponsesSession(child, 1)
  assert.notEqual(child._responsesStatePath, main._responsesStatePath)
  await runResponsesToolTransaction(child, calls, execute)
  assert.ok(existsSync(child._responsesStatePath))
  assert.equal(disk(main).pendingToolTransaction, null)
})

test("crash after tool completion and before output acknowledgement stays blocked", async () => {
  const slot = join(temp(), "slot.json.1")
  const agent = agentFor()
  attachResponsesSession(agent, slot)
  await runResponsesToolTransaction(agent, calls, execute)
  assert.throws(() => acknowledgeResponsesToolTransaction(agent), /incomplete/)
  const restored = agentFor()
  attachResponsesSession(restored, slot)
  assert.equal(disk(restored).pendingToolTransaction.status, "results_ready")
  assert.throws(() => prepareResponsesContext(restored, messages(restored)), /unknown outcome/)
})

test("acknowledged tools require persisted matching history on restart", async () => {
  const slot = join(temp(), "slot.json.1")
  const agent = agentFor()
  attachResponsesSession(agent, slot)
  await runResponsesToolTransaction(agent, calls, execute)
  agent.history.push(toolMessage())
  acknowledgeResponsesToolTransaction(agent)
  assert.equal(disk(agent).pendingToolTransaction, null)
  const missing = agentFor()
  attachResponsesSession(missing, slot)
  assert.throws(() => prepareResponsesContext(missing, messages(missing)), /saved history/)
  checkpointResponsesHistory(missing)
  persistResponsesSession(missing)
  assert.throws(() => prepareResponsesContext(missing, messages(missing)), /saved history/)
  const intact = agentFor({ history: structuredClone(agent.history) })
  attachResponsesSession(intact, slot)
  assert.doesNotThrow(() => prepareResponsesContext(intact, messages(intact)))
})

test("safe in-process compaction checkpoints allow restart without false missing-output recovery", async () => {
  const slot = join(temp(), "slot.json.1")
  const agent = agentFor()
  attachResponsesSession(agent, slot)
  await runResponsesToolTransaction(agent, calls, execute)
  agent.history.push(toolMessage())
  acknowledgeResponsesToolTransaction(agent)
  agent.history = [{ role: "user", content: "[Compacted context: the authorised write completed.]" }]
  checkpointResponsesHistory(agent)
  persistResponsesSession(agent)
  const restored = agentFor({ history: structuredClone(agent.history) })
  attachResponsesSession(restored, slot)
  assert.doesNotThrow(() => prepareResponsesContext(restored, messages(restored)))
})

test("abandoned successful replay cannot attach to a later partial failure", () => {
  const agent = agentFor()
  stageResponsesReplay(agent, replay(), "system")
  assert.ok(agent._pendingResponsesReplay)
  prepareResponsesContext(agent, messages(agent))
  assert.equal(agent._pendingResponsesReplay, undefined)
  stageResponsesReplay(agent, replay(), "system")
  stageResponsesReplay(agent, { terminalStatus: "failed", content: "partial" }, "system")
  agent.history.push({ role: "assistant", content: "partial [Incomplete]" })
  commitResponsesReplay(agent, agent.history.at(-1))
  assert.equal(agent._responsesState.replay, null)
})

test("native state survives legacy sidecar rebuild and reused identity preserves orphan bytes", () => {
  const root = temp()
  const slot = join(root, "slot.json.1")
  const agent = agentFor()
  attachResponsesSession(agent, slot)
  persistResponsesSession(agent)
  const original = readFileSync(responsesSessionPath(slot), "utf8")
  mkdirSync(`${slot}.d`)
  rmSync(`${slot}.d`, { recursive: true })
  assert.equal(readFileSync(responsesSessionPath(slot), "utf8"), original)
  const reused = agentFor({ _sessionStart: "session-b" })
  attachResponsesSession(reused, slot)
  const orphan = readdirSync(root).find(name => name.includes(".orphan-"))
  assert.ok(orphan)
  assert.equal(readFileSync(join(root, orphan), "utf8"), original)
  persistResponsesSession(reused)
  assert.equal(disk(reused).identity, "session-b")
})

test("future protocol schema is preserved across attempted save and slot moves", () => {
  const root = temp()
  const slot = join(root, "slot.json.1")
  const next = join(root, "slot.json.2")
  const bytes = '{"schemaVersion":999,"valuable":"future-native-data"}'
  writeFileSync(responsesSessionPath(slot), bytes)
  const agent = agentFor()
  attachResponsesSession(agent, slot)
  assert.throws(() => prepareResponsesContext(agent, messages(agent)), /unsupported/)
  persistResponsesSession(agent)
  assert.equal(readFileSync(responsesSessionPath(slot), "utf8"), bytes)
  moveResponsesSession(slot, next)
  assert.equal(readFileSync(responsesSessionPath(next), "utf8"), bytes)
  unlinkResponsesSession(next)
  assert.equal(existsSync(responsesSessionPath(next)), false)
  resetResponsesSession(agent)
  assert.equal(agent._responsesStateUnsupported, undefined)
})

test("malformed saved journal stays blocked across repeated attempts and cannot be replaced by fresh state", async () => {
  const slot = join(temp(), "slot.json.1")
  const bytes = '{"schemaVersion":1,"pendingToolTransaction":'
  writeFileSync(responsesSessionPath(slot), bytes)
  const agent = agentFor({ _recordStore: { slotFile: slot } })
  try { attachResponsesSession(agent, slot) } catch { /* Initial failure may be surfaced immediately. */ }
  await ensureResponsesSession(agent)
  assert.throws(() => prepareResponsesContext(agent, messages(agent)), /unsupported|recovery|could not/i)
  try { persistResponsesSession(agent) } catch { /* Preservation may fail explicitly or no-op. */ }
  assert.equal(readFileSync(responsesSessionPath(slot), "utf8"), bytes)
})

test("failed orphan preservation leaves the old session journal latched closed", () => {
  const slot = join(temp(), "slot.json.1")
  const prior = agentFor()
  attachResponsesSession(prior, slot)
  persistResponsesSession(prior)
  const bytes = readFileSync(responsesSessionPath(slot), "utf8")
  const originalRename = fs.renameSync
  const next = agentFor({ _sessionStart: "session-b" })
  fs.renameSync = (from, to) => {
    if (from === responsesSessionPath(slot)) throw Object.assign(new Error("File temporarily busy"), { code: "EBUSY" })
    return originalRename(from, to)
  }
  syncBuiltinESMExports()
  try { assert.throws(() => attachResponsesSession(next, slot), /busy/) }
  finally { fs.renameSync = originalRename; syncBuiltinESMExports() }
  assert.throws(() => prepareResponsesContext(next, messages(next)), /unsupported|recovery/i)
  persistResponsesSession(next)
  assert.equal(readFileSync(responsesSessionPath(slot), "utf8"), bytes)
})

test("tool transaction deduplication is scoped to its endpoint as well as account and model", async () => {
  const agent = agentFor()
  attachResponsesSession(agent, join(temp(), "slot.json.1"))
  let invoked = 0
  const run = async () => { invoked++; return execute() }
  await runResponsesToolTransaction(agent, calls, run)
  agent.history.push(toolMessage())
  acknowledgeResponsesToolTransaction(agent)
  await runResponsesToolTransaction(agent, calls, run)
  assert.equal(invoked, 1)
  agent.provider = { ...agent.provider, baseURL: "https://other-provider.example/v1" }
  await runResponsesToolTransaction(agent, calls, run)
  assert.equal(invoked, 2)
})
