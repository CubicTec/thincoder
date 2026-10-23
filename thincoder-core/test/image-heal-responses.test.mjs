/** Image recovery must rebuild native replay without weakening Responses session ownership. */
import test, { beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createAgent } from "../agent.mjs"
import { callModelTurn } from "../agent/chat-call.mjs"
import { healImageRejection } from "../agent/image-heal.mjs"
import { ProviderError } from "../provider/errors.mjs"
import { attachResponsesSession, commitResponsesReplay } from "../session-responses.mjs"
import { recordModelCatalog, _clearModelInfoForTest } from "../provider/model-info.mjs"
import { _setAuthServiceForTest } from "../provider/auth-context.mjs"
import { providerAuthStub } from "./fixtures/provider-auth.mjs"

const originalFetch = globalThis.fetch, roots = []
const image = { type: "image_url", image_url: { url: "data:image/png;base64,AA==" } }
const user = { role: "user", content: [{ type: "text", text: "Review the fixture image." }, image] }
const ctx = { systemPrompt: "Fixture", toolSchemas: [], callbacks: {}, depth: 1, turn: 0 }
const completed = (text = "Checked", extra = []) => new Response(`data: ${JSON.stringify({ type: "response.completed", response: {
  id: "image-fixture-response", status: "completed",
  output: [...extra, { type: "message", role: "assistant", content: [{ type: "output_text", text }] }],
} })}\n\n`, { headers: { "content-type": "text/event-stream" } })
const rejected = () => new Response(JSON.stringify({ error: { message: "Invalid image payload", code: "invalid_image" } }), { status: 400 })
const imageCount = (input) => input.flatMap(item => Array.isArray(item.content) ? item.content : [])
  .filter(part => part.type === "input_image" || part.type === "image_url").length

beforeEach(() => {
  _clearModelInfoForTest()
  globalThis.fetch = async () => { throw new Error("No real network in image recovery tests") }
  _setAuthServiceForTest(providerAuthStub({ async getAuthContext(profileId, { signal }) {
    return { profileId, signal, accessToken: "fixture-only", release() {} }
  } }))
})
afterEach(() => {
  globalThis.fetch = originalFetch
  _setAuthServiceForTest(null)
  _clearModelInfoForTest()
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function fixture() {
  const cwd = mkdtempSync(join(tmpdir(), "thincoder-image-recovery-"))
  roots.push(cwd)
  const provider = { name: "image-recovery-fixture", format: "responses", model: "gpt-6.1-sol",
    baseURL: "https://api.openai.com/v1", stateful: false, builtinTools: false, reasoningEffort: "medium",
    auth: { type: "chatgpt_oauth", enabled: true, credentialRef: "image-recovery-fixture" } }
  recordModelCatalog(provider, [{ slug: provider.model, spec: { multimodal: true, thinkApi: "effort",
    reasoningEffortEnum: ["low", "medium", "high"], defaultReasoningEffort: "medium" } }])
  const agent = createAgent({ provider, config: { agent: {}, traces: { enabled: false } }, cwd, tools: [] })
  agent.history = [structuredClone(user)]
  agent._fullHistory = [...agent.history]
  attachResponsesSession(agent, join(cwd, "slot.json"))
  return agent
}

test("native Responses status and legacy image errors recover while numeric status takes priority", () => {
  for (const error of [new ProviderError({ name: "fixture" }, "Invalid image payload", { status: 400 }),
    new Error("LLM API error 400: Invalid image payload")]) {
    const agent = fixture(), original = structuredClone(agent._fullHistory)
    assert.deepEqual(healImageRejection(agent, error), { healed: true, dropped: 1 })
    assert.equal(imageCount(agent.history), 0)
    assert.deepEqual(agent._fullHistory, original)
  }
  const agent = fixture()
  const throttled = new ProviderError(agent.provider, "LLM API error 400: image", { status: 429 })
  assert.deepEqual(healImageRejection(agent, throttled), { healed: false, dropped: 0 })
  assert.equal(imageCount(agent.history), 1)
})

test("a healed Responses resend rebuilds opaque replay and preserves the full image record", async () => {
  const agent = fixture(), requests = []
  globalThis.fetch = async (_url, options) => {
    requests.push(JSON.parse(options.body))
    if (requests.length === 2) return rejected()
    return completed("Checked", requests.length === 1
      ? [{ type: "reasoning", id: "opaque-before-heal", encrypted_content: "fixture-opaque-reasoning", summary: [] }] : [])
  }
  const first = await callModelTurn(agent, ctx)
  agent.history.push({ role: "assistant", content: first.content })
  commitResponsesReplay(agent, agent.history.at(-1))
  agent.history.push({ role: "user", content: "Continue the review." })
  agent._fullHistory = [...agent.history]
  const original = structuredClone(agent._fullHistory)
  const result = await callModelTurn(agent, { ...ctx, turn: 1 })
  assert.equal(requests.length, 3)
  assert.equal(imageCount(requests[1].input), 1)
  assert.ok(requests[1].input.some(item => item.type === "reasoning"))
  assert.equal(imageCount(requests[2].input), 0)
  assert.equal(requests[2].input.some(item => item.type === "reasoning"), false)
  assert.equal(imageCount(result.responsesReplay.orderedReplayableItems), 0)
  assert.deepEqual(agent._fullHistory, original)
  assert.equal(agent._imageFailStreak, 0)
  assert.ok(agent.history.some(message => typeof message.content === "string" && message.content.includes("1 image(s) were dropped")))
  assert.ok(result._warnings.some(warning => warning.name === "responses-context-rebuilt"))
  assert.ok(agent._pendingResponsesReplay)
})

test("session or provider changes during either outcome of the healed resend remain rejected", async () => {
  for (const outcome of ["success", "failure"]) {
    for (const change of ["history", "prefix", "session", "model", "account"]) {
      const agent = fixture()
      let calls = 0
      globalThis.fetch = async () => {
        if (++calls === 1) return rejected()
        if (change === "history") agent.history = [{ role: "user", content: "New task" }]
        if (change === "prefix") agent.history[0].content = "New prefix"
        if (change === "session") agent._sessionStart = "new-session"
        if (change === "model") agent.provider.model = "gpt-6-luna"
        if (change === "account") agent.provider.auth.credentialRef = "new-account"
        return outcome === "success" ? completed() : rejected()
      }
      await assert.rejects(callModelTurn(agent, ctx), {
        code: ["model", "account"].includes(change) ? "responses_request_binding_changed" : "responses_request_history_changed",
      }, `${outcome}/${change}`)
      assert.equal(calls, 2)
      assert.equal(agent._pendingResponsesReplay, undefined)
    }
  }
})

test("interrupting the healed resend preserves Ctrl+I and makes no third request", async () => {
  const agent = fixture(), controller = new AbortController()
  let calls = 0
  globalThis.fetch = async () => {
    if (++calls === 1) return rejected()
    controller.abort({ interrupt: true, message: "Use a different image" })
    throw new DOMException("Aborted", "AbortError")
  }
  await assert.rejects(callModelTurn(agent, { ...ctx, signal: controller.signal }), { name: "AbortError" })
  assert.equal(calls, 2)
  assert.equal(agent.history.at(-1).content, "[User interrupt: Use a different image]")
  assert.equal(agent._pendingResponsesReplay, undefined)
})

test("a rejected healed resend is not attempted again", async () => {
  const agent = fixture()
  let calls = 0
  globalThis.fetch = async () => { calls++; return rejected() }
  await assert.rejects(callModelTurn(agent, ctx), { status: 400 })
  assert.equal(calls, 2)
  assert.equal(imageCount(agent.history), 0)
  assert.equal(imageCount(agent._fullHistory), 1)
  assert.equal(agent._pendingResponsesReplay, undefined)
})
