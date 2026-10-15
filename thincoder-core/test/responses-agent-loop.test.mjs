/** Actual agent loop + OAuth request codec + SSE parser; no external requests or login. */
import test, { afterEach } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createAgent } from "../agent.mjs"
import { runTurnLoop } from "../agent/turn-loop.mjs"
import { _setAuthServiceForTest, clearInferenceStatus } from "../provider/auth-context.mjs"
import { _setSessionsDirForTest, _resetSessionsDirForTest } from "../session-slots.mjs"

const originalFetch = globalThis.fetch
const roots = []
const profile = "agent-loop-fixture"
const token = "fixture-only-access-token"
const toolSchema = { type: "function", function: {
  name: "read", description: "Read a local fixture", parameters: {
    type: "object", properties: { path: { type: "string" } }, required: ["path"],
  },
} }
const reasoning = { type: "reasoning", id: "rs_fixture", summary: [], encrypted_content: "opaque-reasoning-fixture" }
const functionCall = { type: "function_call", id: "fc_fixture", call_id: "call_fixture", namespace: "thincoder", name: "read", arguments: '{"path":"sample.txt"}' }
const message = (text, phase = "final_answer") => ({ type: "message", id: `msg_${phase}`, role: "assistant", phase, content: [{ type: "output_text", text }] })
const terminal = (id, output) => ({ type: "response.completed", response: { id, status: "completed", output } })

// Deliberately split UTF-8/SSE into transport chunks rather than returning parsed objects.
function sse(events) {
  const bytes = new TextEncoder().encode(events.map((ev) => `data: ${JSON.stringify(ev)}\n\n`).join(""))
  return new Response(new ReadableStream({ start(controller) {
    for (let i = 0; i < bytes.length; i += 31) controller.enqueue(bytes.slice(i, i + 31))
    controller.close()
  } }), { headers: { "content-type": "text/event-stream", "x-request-id": "req_fixture" } })
}

afterEach(() => {
  globalThis.fetch = originalFetch
  _setAuthServiceForTest(null)
  clearInferenceStatus(profile)
  _resetSessionsDirForTest()
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "thincoder-agent-loop-")); roots.push(root)
  const cwd = join(root, "project"); mkdirSync(cwd)
  writeFileSync(join(cwd, "sample.txt"), "Fixture file content: café")
  _setSessionsDirForTest(join(root, "sessions"))
  const observed = { requests: [], streamed: [], toolCalls: [], toolResults: [], executions: 0, releases: 0 }
  _setAuthServiceForTest({ async getAuthContext(profileId, { signal }) {
    assert.equal(profileId, profile)
    return { profileId, signal, accessToken: token, release() { observed.releases++ } }
  } })
  const read = { name: "read", readonly: true, async execute(args, ctx) {
    observed.executions++
    assert.equal(ctx.agent, agent)
    const journal = JSON.parse(readFileSync(agent._responsesStatePath, "utf8"))
    assert.equal(journal.pendingToolTransaction.status, "executing")
    assert.deepEqual(journal.pendingToolTransaction.callIds, [functionCall.call_id])
    return readFileSync(join(ctx.cwd, args.path), "utf8")
  } }
  const agent = createAgent({
    provider: { name: "loop-test", format: "responses", baseURL: "https://api.openai.com/v1", model: "gpt-5.6", auth: { type: "chatgpt_oauth", enabled: true, credentialRef: profile } },
    config: { agent: {}, traces: { enabled: false } }, cwd, tools: [read],
    history: [{ role: "user", content: "Read sample.txt and report its content." }],
  })
  // beginRun normally initializes these counters; direct loop intentionally skips memory/preflight.
  Object.assign(agent, { _turnSeq: 0, _zeroWriteTurns: 0, _zeroWriteStreak: 0 })
  const run = () => runTurnLoop(agent, {
    maxTurns: 3, threshold: Number.MAX_SAFE_INTEGER, toolSchemas: [toolSchema], toolByName: new Map([["read", read]]),
    systemPrompt: "Read the requested fixture, then answer.", depth: 0,
    callbacks: {
      onToken(text) { observed.streamed.push(text) },
      onToolCall(...args) { observed.toolCalls.push(args) },
      onToolResult(...args) { observed.toolResults.push(args) },
    },
  })
  const serve = (rounds) => { globalThis.fetch = async (url, opts) => {
    assert.equal(url, "https://api.openai.com/v1/responses")
    assert.equal(opts.method, "POST"); assert.equal(opts.redirect, "error")
    assert.equal(opts.headers.Authorization, `Bearer ${token}`)
    const body = JSON.parse(opts.body); observed.requests.push(body)
    assert.equal(body.store, false); assert.equal(body.stream, true)
    assert.ok(!Object.hasOwn(body, "previous_response_id"))
    assert.ok(!Object.hasOwn(body, "max_output_tokens"))
    assert.ok(!JSON.stringify(body).includes(token))
    const events = rounds[observed.requests.length - 1]
    assert.ok(events, "Unexpected additional model request")
    return sse(events)
  } }
  return { agent, observed, run, serve }
}

test("OAuth agent loop executes one completed read and replays native reasoning plus one output", async () => {
  const { agent, observed, run, serve } = fixture()
  serve([
    [{ type: "response.output_text.delta", delta: "Reading the fixture." }, terminal("resp_tool", [reasoning, message("Reading the fixture.", "commentary"), functionCall])],
    [{ type: "response.output_text.delta", delta: "The file says café." }, terminal("resp_final", [message("The file says café.")])],
  ])
  assert.equal(await run(), "The file says café.")
  await agent._pendingDistill
  assert.equal(observed.executions, 1); assert.equal(observed.requests.length, 2)
  assert.equal(observed.releases, 2); assert.equal(observed.toolCalls.length, 1); assert.equal(observed.toolResults.length, 1)
  const input = observed.requests[1].input
  assert.deepEqual(input.filter((item) => item.type === "reasoning"), [reasoning])
  assert.deepEqual(input.filter((item) => item.type === "function_call"), [functionCall])
  assert.deepEqual(input.filter((item) => item.type === "function_call_output"), [{ type: "function_call_output", call_id: functionCall.call_id, output: "Fixture file content: café" }])
  assert.ok(input.some((item) => item.type === "message" && item.phase === "commentary"))
  assert.equal(agent.history.at(-1).content, "The file says café.")
  assert.equal(agent.history.filter((item) => item.role === "tool").length, 1)
  const journal = JSON.parse(readFileSync(agent._responsesStatePath, "utf8"))
  assert.equal(journal.pendingToolTransaction, null)
  assert.equal(journal.transactions.length, 1)
  assert.equal(journal.replay.lastTerminalStatus, "completed")
  assert.ok(!JSON.stringify({ provider: agent.provider, history: agent.history, journal }).includes(token))
})

for (const [label, ending, code] of [
  ["failed", { type: "response.failed", response: { status: "failed", error: { code: "server_error", message: "Fixture stream failed" } } }, "server_error"],
  ["incomplete", { type: "response.incomplete", response: { status: "incomplete", incomplete_details: { reason: "max_output_tokens" } } }, "response_incomplete"],
  ["EOF", null, "responses_missing_terminal"],
]) {
  test(`OAuth agent loop rejects ${label} partial output without executing a pending read`, async () => {
    const { agent, observed, run, serve } = fixture()
    serve([[
      { type: "response.output_item.added", output_index: 0, item: { ...functionCall, arguments: "" } },
      { type: "response.function_call_arguments.delta", output_index: 0, item_id: functionCall.id, delta: functionCall.arguments },
      { type: "response.function_call_arguments.done", output_index: 0, item_id: functionCall.id, arguments: functionCall.arguments },
      { type: "response.output_item.done", output_index: 0, item: functionCall },
      { type: "response.output_text.delta", delta: "Unfinished answer" },
      ...(ending ? [ending] : []),
    ]])
    await assert.rejects(run, { code })
    assert.equal(observed.executions, 0); assert.equal(observed.toolCalls.length, 0); assert.equal(observed.toolResults.length, 0)
    assert.equal(observed.requests.length, 1); assert.equal(observed.releases, 1)
    assert.equal(observed.streamed.join(""), "Unfinished answer")
    assert.match(agent.history.at(-1).content, /Unfinished answer\n\[Incomplete response:/)
    assert.ok(!agent.history.some((item) => item.role === "tool" || item.tool_calls?.length))
    const journal = JSON.parse(readFileSync(agent._responsesStatePath, "utf8"))
    assert.equal(journal.pendingToolTransaction, null); assert.deepEqual(journal.transactions, [])
    assert.equal(journal.replay, null); assert.equal(agent._pendingResponsesReplay, undefined)
  })
}
