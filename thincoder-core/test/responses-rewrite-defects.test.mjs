/** Synthetic auxiliary races and pair-safe context rewrites. Never uses live inference. */
import test from "node:test"
import assert from "node:assert/strict"
import { compactMessages } from "../advisor/compaction.mjs"
import { compressIfNeeded } from "../context.mjs"
import { summarizeRunExplorations } from "../explore-distill.mjs"
import { runCompactionCheck } from "../agent/run-stages.mjs"

const provider = { name: "rewrite-fixture", format: "responses", model: "test-model", apiKey: "fixture-only", baseURL: "https://api.openai.com/v1", stateful: false, builtinTools: false }
const history = () => Array.from({ length: 20 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: `History ${i}` }))
const batch = (count) => [
  { role: "assistant", content: "Inspecting files", tool_calls: Array.from({ length: count }, (_, i) => ({ id: `call_${i}`, type: "function", function: { name: "read", arguments: "{}" } })) },
  ...Array.from({ length: count }, (_, i) => ({ role: "tool", tool_call_id: `call_${i}`, content: `File ${i}` })),
]
const create = (messages) => ({ provider: { ...provider }, history: messages, tasks: [], config: { traces: { enabled: false } }, _sessionStart: 1, _lastPromptTokens: 1234, _usageAtLen: messages.length })
const response = () => new Response(`data: ${JSON.stringify({ type: "response.completed", response: { id: "summary", status: "completed", output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text: "Verified summary" }] }] } })}\n\n`)

function assertPairs(messages) {
  const calls = new Set(), outputs = new Set()
  for (const message of messages) {
    for (const call of message.tool_calls ?? []) calls.add(call.id)
    if (message.role === "tool") {
      assert.ok(calls.has(message.tool_call_id), `orphan output: ${message.tool_call_id}`)
      assert.ok(!outputs.has(message.tool_call_id), `duplicate output: ${message.tool_call_id}`)
      outputs.add(message.tool_call_id)
    }
  }
  assert.deepEqual(outputs, calls)
}

test("advisor trimming preserves complete tool batches across the 20-message cut", () => {
  for (const count of [1, 2, 19, 20, 21, 30]) {
    const messages = [{ role: "system", content: "Review" }, ...history(), ...batch(count), { role: "assistant", content: "Checked" }]
    compactMessages(messages)
    assertPairs(messages)
    assert.ok(messages.some((message) => message.content === "Checked"))
  }
})

test("advisor trimming is a no-op when preserving one tool batch leaves no removable history", () => {
  const messages = [{ role: "system", content: "Review" }, ...batch(21)]
  const before = structuredClone(messages)
  compactMessages(messages)
  assert.deepEqual(messages, before)
  assertPairs(messages)
})

test("late auxiliary summaries cannot overwrite a changed history, session or provider", async () => {
  const fetch = globalThis.fetch
  try {
    for (const kind of ["compact", "distill"]) {
      for (const change of ["replacement", "in-place", "session", "model", "account"]) {
        const agent = create(kind === "compact" ? history() : [{ role: "user", content: "Inspect" }, ...batch(3)])
        let after
        globalThis.fetch = async () => {
          if (change === "replacement") agent.history = [{ role: "user", content: "New unrelated session" }]
          if (change === "in-place") agent.history[0].content = "A newer correction"
          if (change === "session") agent._sessionStart = 2
          if (change === "model") agent.provider.model = "changed-model"
          if (change === "account") agent.provider.auth = { type: "chatgpt_oauth", credentialRef: "changed-profile" }
          after = structuredClone(agent.history)
          return response()
        }
        const invoke = kind === "compact"
          ? () => compressIfNeeded(agent, 1, {}, { force: true })
          : () => summarizeRunExplorations(agent, {})
        await assert.rejects(invoke, { code: "context_history_changed" }, `${kind}/${change}`)
        assert.deepEqual(agent.history, after)
        assert.equal(agent._lastPromptTokens, 1234)
        assert.equal(agent._lastCompressInfo, undefined)
      }
    }
  } finally { globalThis.fetch = fetch }
})

test("stale compaction does not count as a summary failure or truncate the newer history", async () => {
  const fetch = globalThis.fetch, agent = create(history())
  agent._compressFailures = 2
  agent._pendingCompact = { focus: "Keep current evidence" }
  const replacement = history().map((message) => ({ ...message, content: "New session contents" }))
  globalThis.fetch = async () => { agent.history = replacement; return response() }
  let failures = 0, compressed = 0
  try {
    await assert.rejects(() => runCompactionCheck(agent, {
      threshold: 1, callbacks: { onCompressFail() { failures++ }, onCompress() { compressed++ } }, compactionOverhead: {}, recentCallSigs: [],
    }), { code: "context_history_changed" })
    assert.equal(agent.history, replacement)
    assert.equal(agent._compressFailures, 2)
    assert.equal(failures, 0); assert.equal(compressed, 0)
  } finally { globalThis.fetch = fetch }
})

test("a context change in the compression lifecycle hook is rejected before network admission", async () => {
  const fetch = globalThis.fetch, agent = create(history())
  let requests = 0
  globalThis.fetch = async () => { requests++; return response() }
  try {
    await assert.rejects(() => compressIfNeeded(agent, 1, { onCompressStart() {
      agent._sessionStart = 2
    } }, { force: true }), { code: "context_history_changed" })
    assert.equal(requests, 0)
  } finally { globalThis.fetch = fetch }
})

test("advisor rebuilds its native context when request credentials change", async () => {
  const { createAdvisorResponsesContext } = await import("../advisor/responses-context.mjs")
  const { responsesProfileBinding, responsesCredentialBinding } = await import("../provider/responses-binding.mjs")
  const replay = createAdvisorResponsesContext({ ...provider, headers: { "x-account-fixture": "first" } })
  const messages = [{ role: "user", content: "Review" }, { role: "assistant", content: "Checked" }]
  replay.record({ responsesReplay: {
    schemaVersion: 1, profileBinding: responsesProfileBinding(replay.provider),
    credentialBinding: responsesCredentialBinding(replay.provider), modelBinding: provider.model,
    endpointBinding: provider.baseURL, orderedReplayableItems: [],
  } }, messages)
  assert.ok(replay.prepare(messages))
  replay.provider.headers["x-account-fixture"] = "second"
  const warnings = []
  assert.equal(replay.prepare(messages, (text) => warnings.push(text)), undefined)
  assert.match(warnings.join(""), /opaque reasoning was not transferred/)
})
