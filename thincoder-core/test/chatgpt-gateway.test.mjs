import { test, afterEach } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { chat, createProvider } from "../provider/core.mjs"
import { listModelCatalog, listModels } from "../provider/list-models.mjs"
import { resolveProviderAuth, _setAuthServiceForTest, getInferenceStatus, clearInferenceStatus } from "../provider/auth-context.mjs"
import { normalizeProviderAuth } from "../provider/auth-config.mjs"
import { resolveProviderPlan } from "../model-ref.mjs"
import { presetToEntry, PROVIDER_PRESETS } from "../config-presets.mjs"
import { generateTitle } from "../generate-title.mjs"
import { redactSecret } from "../log.mjs"
import { attachResponsesSession, prepareResponsesContext, stageResponsesReplay, runResponsesToolTransaction, acknowledgeResponsesToolTransaction } from "../responses-session.mjs"
import { pushReal } from "../context-push.mjs"

const originalFetch = globalThis.fetch
const provider = () => ({ ...presetToEntry("openai-chatgpt"), auth: { type: "chatgpt_oauth", enabled: true, credentialRef: "profile-a" }, model: "test-model" })
const roots = []
const temp = () => { const dir = mkdtempSync(join(tmpdir(), "thincoder-responses-")); roots.push(dir); return dir }
const mocks = () => {
  let acquired = 0, released = 0
  _setAuthServiceForTest({ async getAuthContext(id, { signal }) {
    acquired++
    return { profileId: id, accessToken: "synthetic-test-token", signal, release() { released++ } }
  } })
  return { counts: () => ({ acquired, released }) }
}
afterEach(() => {
  globalThis.fetch = originalFetch
  _setAuthServiceForTest(null)
  clearInferenceStatus("profile-a")
  clearInferenceStatus("profile-b")
  for (const path of roots.splice(0)) rmSync(path, { recursive: true, force: true })
})
const json = (data) => new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } })
const stream = (output) => new Response(`event: response.completed\ndata: ${JSON.stringify({ type: "response.completed", response: { id: "resp-test", status: "completed", output, usage: { input_tokens: 7, output_tokens: 3, total_tokens: 10 } } })}\n\n`, { headers: { "content-type": "text/event-stream", "x-request-id": "request-test" } })
const message = (text) => ({ type: "message", id: "msg-test", role: "assistant", phase: "final_answer", content: [{ type: "output_text", text, annotations: [] }] })

test("both new presets are opt-in and old OpenAI remains unchanged", () => {
  assert.deepEqual(PROVIDER_PRESETS.openai, { baseURL: "https://api.openai.com/v1", desc: "OpenAI" })
  const a = presetToEntry("openai-chatgpt")
  a.auth.enabled = true
  assert.equal(presetToEntry("openai-chatgpt").auth.enabled, false)
  assert.equal(presetToEntry("openai-responses").stateful, false)
  assert.equal(createProvider(provider()).auth.credentialRef, "profile-a")
  assert.throws(() => createProvider({ ...provider(), apiKey: "synthetic-key" }), /cannot be combined/)
  assert.throws(() => createProvider({ baseURL: "https://example.com", model: "m" }), /apiKey is required/)
})

test("configuration rejects tokens/unknown auth and subscription selection never falls back to API billing", () => {
  for (const auth of [{ type: "other" }, { type: "chatgpt_oauth", accessToken: "secret" }, { type: "chatgpt_oauth", credentialRef: "../bad" }]) assert.throws(() => normalizeProviderAuth(auth))
  const disabled = presetToEntry("openai-chatgpt")
  const key = { name: "key", apiKey: "synthetic-key", baseURL: "https://example.com" }
  const result = resolveProviderPlan({ providers: [key, disabled], defaultModel: "key:m", slot: { provider: disabled.name, model: "m" } })
  assert.equal(result.state, "invalid")
  assert.equal(result.channel, "openai-chatgpt")
  assert.equal(resolveProviderPlan({ providers: [provider()], defaultModel: "openai-chatgpt:m" }).state, "ok")
})

test("OAuth targets fail closed before credential acquisition", async () => {
  const mock = mocks()
  for (const extra of [{ baseURL: "https://evil.example/v1" }, { baseURL: "https://api.openai.com@evil.example/v1" },
    { baseURL: "https://api.openai.com/v1?x=1" }, { format: "openai" }, { headers: { Authorization: "evil" } },
    { chatPath: "/responses" }, { auth: { type: "chatgpt_oauth", enabled: false, credentialRef: "profile-a" } }]) {
    await assert.rejects(resolveProviderAuth({ ...provider(), ...extra }, { path: "/responses", method: "POST" }))
  }
  await assert.rejects(resolveProviderAuth(provider(), { path: "/chat/completions", method: "POST" }))
  assert.equal(mock.counts().acquired, 0)
})

test("account catalog preserves display names/order and never mixes API models shape", async () => {
  const mock = mocks()
  const requests = []
  globalThis.fetch = async (url, opts) => {
    requests.push({ url, opts })
    return json({ models: [{ slug: "z", display_name: "Zed", visibility: "list" }, { slug: "a", display_name: "Alpha", visibility: "list" }, { slug: "hidden", display_name: "Hidden", visibility: "hide" }] })
  }
  const catalog = await listModelCatalog(provider())
  assert.deepEqual(catalog.map((m) => [m.id, m.displayName]), [["z", "Zed"], ["a", "Alpha"]])
  assert.deepEqual(await listModels(provider()), ["z", "a"])
  assert.equal(requests[0].url, "https://api.openai.com/v1/models")
  assert.equal(requests[0].opts.redirect, "error")
  assert.deepEqual(mock.counts(), { acquired: 2, released: 2 })
  globalThis.fetch = async () => json({ data: [{ id: "wrong" }] })
  await assert.rejects(listModels(provider()), /expected models array/)
  globalThis.fetch = async () => json({ models: [] })
  assert.deepEqual(await listModels(provider()), [])
})

test("API key model facade retains sorted IDs and existing headers", async () => {
  globalThis.fetch = async (_url, opts) => {
    assert.equal(opts.headers.Authorization, "Bearer key")
    assert.equal(opts.headers["X-Test"], "existing")
    return json({ data: [{ id: "z" }, { id: "a" }] })
  }
  assert.deepEqual(await listModels({ baseURL: "https://example.com/v1", apiKey: "key", headers: { "X-Test": "existing" } }), ["a", "z"])
})

test("titles for subscription stay local and consume no inference or credentials", async () => {
  const mock = mocks()
  globalThis.fetch = async () => { throw new Error("network must not be used") }
  assert.equal(await generateTitle("A sufficiently long conversation topic", provider()), "A sufficiently long conversation topic")
  assert.equal(mock.counts().acquired, 0)
})

test("API Responses title uses streaming Responses, never Chat Completions", async () => {
  globalThis.fetch = async (url, opts) => {
    assert.equal(url, "https://api.openai.com/v1/responses")
    assert.equal(JSON.parse(opts.body).stream, true)
    return stream([message("A short title")])
  }
  assert.equal(await generateTitle("A sufficiently long conversation topic", { ...presetToEntry("openai-responses"), apiKey: "key", model: "test" }), "A short title")
})

test("mocked two-turn function exchange persists native reasoning/phase across restart", async () => {
  mocks()
  const p = provider()
  const agent = { provider: p, history: [{ role: "user", content: "Read it" }] }
  const slot = join(temp(), "slot.json.1")
  attachResponsesSession(agent, slot)
  const tools = [{ type: "function", function: { name: "read_file", parameters: { type: "object", properties: {} } } }]
  const bodies = []
  globalThis.fetch = async (_url, opts) => {
    const body = JSON.parse(opts.body); bodies.push(body)
    assert.equal(opts.headers.Authorization, "Bearer synthetic-test-token")
    if (bodies.length === 1) return stream([
      { type: "reasoning", id: "reason-a", encrypted_content: "opaque-test", summary: [] },
      { type: "function_call", id: "fc-a", call_id: "call-a", namespace: "thincoder", name: "read_file", arguments: "{}" },
    ])
    return stream([message("File read")])
  }
  const system = "Follow user permissions"
  const messages = [{ role: "system", content: system }, ...agent.history]
  const first = await chat(p, { messages, tools })
  stageResponsesReplay(agent, first, system)
  pushReal(agent, { role: "assistant", content: "", tool_calls: first.toolCalls.map((tc) => ({ id: tc.id, type: "function", function: { name: tc.name, arguments: tc.arguments } })) })
  let executions = 0
  const execute = async () => { executions++; return [{ toolCall: first.toolCalls[0], ok: true, result: "fixture contents" }] }
  await runResponsesToolTransaction(agent, first.toolCalls, execute)
  await assert.rejects(runResponsesToolTransaction(agent, first.toolCalls, execute), /unresolved/)
  assert.equal(executions, 1)
  pushReal(agent, { role: "tool", tool_call_id: "call-a", content: "fixture contents" })
  acknowledgeResponsesToolTransaction(agent)
  await runResponsesToolTransaction(agent, first.toolCalls, execute)
  assert.equal(executions, 1)
  const restored = { provider: p, history: structuredClone(agent.history) }
  attachResponsesSession(restored, slot)
  const nextMessages = [{ role: "system", content: system }, ...restored.history]
  const second = await chat(p, { messages: nextMessages, tools, responsesContext: prepareResponsesContext(restored, nextMessages) })
  assert.equal(second.content, "File read")
  assert.equal(bodies[1].input.filter((i) => i.type === "function_call").length, 1)
  assert.equal(bodies[1].input.find((i) => i.type === "reasoning").encrypted_content, "opaque-test")
  assert.equal(bodies[1].input.at(-1).type, "function_call_output")
  assert.equal(second.outputItems.at(-1).phase, "final_answer")
  assert.equal(getInferenceStatus("profile-a").status, "completed")
  assert.ok(!readFileSync(`${slot}.responses.json`, "utf8").includes("synthetic-test-token"))
})

test("unresolved tool side effects block restart and unknown native schema is preserved", async () => {
  const slot = join(temp(), "slot.json.1")
  const agent = { provider: provider(), history: [] }
  attachResponsesSession(agent, slot)
  await assert.rejects(runResponsesToolTransaction(agent, [{ id: "call", name: "write", arguments: "{}" }], async () => { throw new Error("process interrupted") }))
  const resumed = { provider: provider(), history: [] }
  attachResponsesSession(resumed, slot)
  assert.throws(() => prepareResponsesContext(resumed, []), /unknown outcome/)
  const future = join(temp(), "future")
  writeFileSync(`${future}.responses.json`, '{"schemaVersion":99,"valuable":"keep"}')
  const other = { provider: provider(), history: [] }
  attachResponsesSession(other, future)
  assert.throws(() => prepareResponsesContext(other, []), /unsupported/)
  assert.equal(JSON.parse(readFileSync(`${future}.responses.json`)).valuable, "keep")
})

test("account/model/history changes checkpoint opaque state explicitly", () => {
  const agent = { provider: provider(), history: [{ role: "user", content: "hello" }] }
  stageResponsesReplay(agent, { terminalStatus: "completed", responsesReplay: { schemaVersion: 1, profileBinding: "profile-a", credentialBinding: "profile-a", modelBinding: "test-model", endpointBinding: "https://api.openai.com/v1", messageCount: 2,
    orderedReplayableItems: [{ type: "reasoning", encrypted_content: "opaque", summary: [] }] } }, "system")
  pushReal(agent, { role: "assistant", content: "answer" })
  assert.ok(prepareResponsesContext(agent, [{ role: "system", content: "system" }, ...agent.history]))
  agent.provider = { ...provider(), model: "other" }
  assert.equal(prepareResponsesContext(agent, [{ role: "system", content: "system" }, ...agent.history]), undefined)
  assert.match(agent._responsesReplayWarning, /rebuilt/)
})

test("usage-limit response pauses subsequent same-profile calls without fallback", async () => {
  const mock = mocks()
  let calls = 0
  globalThis.fetch = async () => { calls++; return new Response(JSON.stringify({ error: { code: "subscription_sharing_usage_limit_exceeded", message: "Limit" } }), { status: 429 }) }
  await assert.rejects(chat(provider(), { messages: [{ role: "user", content: "hi" }] }), { code: "subscription_sharing_usage_limit_exceeded" })
  await assert.rejects(chat(provider(), { messages: [{ role: "user", content: "hi" }] }), /paused/)
  assert.equal(calls, 1)
  assert.equal(mock.counts().acquired, 1)
})

test("OAuth diagnostic keys and callback parameters are redacted", () => {
  for (const key of ["access_token", "refresh_token", "id_token", "code_verifier", "id_token_hint", "cookie"]) assert.equal(redactSecret(key, "synthetic-sensitive-value"), "[REDACTED]")
  assert.ok(!redactSecret("error", "callback?code=synthetic-sensitive-value").includes("synthetic-sensitive-value"))
})


test("usage-limit admission awaits shared pause and catalog uses the same gate", async () => {
  let pauses = 0
  _setAuthServiceForTest({ async getAuthContext(profileId, { signal }) {
    if (pauses) throw Object.assign(new Error("Usage paused"), { code: "subscription_sharing_usage_limit_exceeded" })
    return { profileId, signal, accessToken: "synthetic-test-token", release() {} }
  }, async recordUsageLimit(profileId) {
    await Promise.resolve()
    assert.equal(profileId, "profile-a"); pauses++
  } })
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { code: "subscription_sharing_usage_limit_exceeded", message: "Limit" } }), { status: 429 })
  await assert.rejects(listModels(provider()), { code: "subscription_sharing_usage_limit_exceeded" })
  assert.equal(pauses, 1)
  await assert.rejects(chat(provider(), { messages: [{ role: "user", content: "hi" }] }), /paused/)
  assert.equal(pauses, 2) // the shared service is authoritative, including admission failures
})


test("failed shared usage pause remains locally blocked without leaking storage errors", async () => {
  let acquisitions = 0
  _setAuthServiceForTest({ async getAuthContext(profileId, { signal }) {
    acquisitions++
    return { profileId, signal, accessToken: "synthetic-test-token", release() {} }
  }, async recordUsageLimit() { throw new Error("sensitive-storage-diagnostic") } })
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { code: "subscription_sharing_usage_limit_exceeded", message: "Limit" } }), { status: 429 })
  await assert.rejects(chat(provider(), { messages: [{ role: "user", content: "hi" }] }), error => {
    assert.equal(error.code, "subscription_sharing_usage_limit_exceeded")
    assert.match(error.message, /shared pause could not be saved/)
    assert.ok(!error.message.includes("sensitive-storage-diagnostic")); return true
  })
  await assert.rejects(chat(provider(), { messages: [{ role: "user", content: "hi" }] }), /paused/)
  assert.equal(acquisitions, 1)
})
