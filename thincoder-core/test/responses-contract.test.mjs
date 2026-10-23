/** Offline SIWC/Responses contract regression suite; no credentials or paid inference. */
import test from "node:test"
import assert from "node:assert/strict"
import { buildBody, normalizeUsage } from "../provider/responses-request.mjs"
import { parseStream, responseEvents } from "../provider/responses-stream.mjs"
import { SIWC_UNSUPPORTED_FIELDS } from "../provider/capabilities.mjs"
import { responsesError } from "../provider/errors.mjs"
import { requestResponses } from "../provider/responses-http.mjs"
import { _rateHooks } from "../provider/rate.mjs"
import { providerAuthStub } from "./fixtures/provider-auth.mjs"

const api = { name: "openai-responses", model: "test-model", apiKey: "fixture-api-key", baseURL: "https://api.openai.com/v1", builtinTools: false }
const plan = { name: "openai-chatgpt", model: "test-model", baseURL: api.baseURL, format: "responses", auth: { type: "chatgpt_oauth", credentialRef: "fixture-profile" } }
const user = [{ role: "user", content: "hello" }]
const localTools = [{ type: "function", function: { name: "read_file", parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } } }]
const call = { type: "function_call", id: "fc_1", call_id: "call_1", name: "read_file", namespace: "thincoder", arguments: '{"path":"a"}' }
const reasoning = { type: "reasoning", id: "rs_1", encrypted_content: "opaque-not-a-secret-fixture", summary: [{ type: "summary_text", text: "Looking" }], status: "completed" }
const assistant = { type: "message", id: "msg_1", role: "assistant", phase: "commentary", status: "completed", content: [{ type: "output_text", text: "Hello 世界", annotations: [] }] }
const frame = (event, newline = "\n") => `data: ${JSON.stringify(event)}${newline}${newline}`
const completed = (output = [], more = {}) => ({ type: "response.completed", response: { id: "resp_1", status: "completed", output, ...more } })
function stream(parts) { return { headers: new Headers({ "x-request-id": "req_fixture" }), body: (async function* () { for (const p of parts) yield typeof p === "string" ? Buffer.from(p) : p })() } }

// Stable, reviewable official policy fixture (2026-10-15).
test("SIWC exact unsupported fields and mandatory stateless shape", () => {
  assert.deepEqual(SIWC_UNSUPPORTED_FIELDS, ["background", "conversation", "max_output_tokens", "max_tool_calls", "metadata", "moderation", "multi_agent", "prompt", "prompt_cache_retention", "safety_identifier", "temperature", "top_logprobs", "top_p", "truncation", "user", "previous_response_id"])
  const result = buildBody({ ...plan, _responsesChain: { id: "must-not-send" } }, user, localTools)
  assert.equal(result.body.store, false); assert.equal(result.body.stream, true)
  assert.ok(Array.isArray(result.body.input)); assert.equal(result.previousResponseId, null); assert.equal(result.newChain, null)
  assert.deepEqual(result.body.include, ["reasoning.encrypted_content"])
  assert.equal(result.body.tools[0].type, "namespace")
  assert.equal(result.body.tools[0].tools[0].strict, false)
  for (const field of SIWC_UNSUPPORTED_FIELDS) {
    assert.ok(!Object.hasOwn(result.body, field))
    assert.throws(() => buildBody({ ...plan, [field]: true }, user, []), (e) => e.param === field && e.stage === "configuration")
  }
  for (const extra of [{ maxTokens: 10 }, { builtinTools: true }, { builtinTools: [{ type: "web_search" }] }, { stateful: true }, { store: true }, { stream: false }]) {
    assert.throws(() => buildBody({ ...plan, ...extra }, user, []))
  }
})

test("API-key route retains independent limits, flat tools and explicit choice codec", () => {
  const { body } = buildBody({ ...api, maxTokens: 100, temperature: 0.25 }, user, localTools, { toolChoice: { type: "function", function: { name: "read_file" } } })
  assert.equal(body.max_output_tokens, 100); assert.equal(body.temperature, 0.25)
  assert.equal(body.tools[0].type, "function"); assert.deepEqual(body.tool_choice, { type: "function", name: "read_file" })
})

test("Instructions, developers, images and tool-only assistant messages preserve meaning", () => {
  const { body } = buildBody(plan, [
    { role: "system", content: "first" }, { role: "system", content: [{ type: "text", text: "second" }] },
    { role: "developer", content: "policy" }, { role: "user", content: [{ type: "image_url", image_url: { url: "data:image/png;base64,AA==", detail: "low" } }] },
    { role: "assistant", content: "", tool_calls: [{ id: "c1", function: { name: "read_file", arguments: "{}" } }] },
    { role: "tool", tool_call_id: "c1", content: "done" },
  ], localTools)
  assert.equal(body.instructions, "first\n\nsecond"); assert.equal(body.input[0].role, "developer")
  assert.deepEqual(body.input[1].content[0], { type: "input_image", image_url: "data:image/png;base64,AA==", detail: "low" })
  assert.equal(body.input[2].type, "function_call"); assert.equal(body.input[2].namespace, "thincoder")
  assert.equal(body.input[3].type, "function_call_output"); assert.equal(body.input.length, 4)
  for (const type of ["input_audio", "input_video", "unknown"]) assert.throws(() => buildBody(plan, [{ role: "user", content: [{ type }] }], []), /Unsupported/)
})

test("Namespace mapping is explicit and collision-safe for dotted local identities", async () => {
  const tools = ["a.read_file", "b.read_file", "read_file"].map((name) => ({ type: "function", function: { name } }))
  const { body, toolMapping } = buildBody(plan, user, tools)
  const defs = body.tools[0].tools
  assert.equal(new Set(defs.map((d) => d.name)).size, 3)
  const output = defs.map((d, i) => ({ ...call, name: d.name, id: `fc_${i}`, call_id: `c${i}` }))
  const result = await parseStream(stream([frame(completed(output))]), { provider: plan, toolMapping })
  assert.deepEqual(result.toolCalls.map((c) => c.name), tools.map((t) => t.function.name))
  await assert.rejects(() => parseStream(stream([frame(completed([{ ...call, namespace: "other" }]))]), { provider: plan, toolMapping }), /unregistered/)
})

test("Native replay retains opaque reasoning, namespace, phase and exact ordering", async () => {
  const { toolMapping } = buildBody(plan, user, localTools)
  const result = await parseStream(stream([frame(completed([reasoning, call, assistant]))]), { provider: plan, toolMapping })
  assert.equal(result.outputItems[0].encrypted_content, reasoning.encrypted_content)
  assert.equal(result.outputItems[2].phase, "commentary"); assert.ok(!Object.hasOwn(result.outputItems[2], "status"))
  const history = [...user, { role: "assistant", content: "Hello 世界", tool_calls: [{ id: "call_1", function: { name: "read_file", arguments: call.arguments } }] }, { role: "tool", tool_call_id: "call_1", content: "file" }]
  const context = { schemaVersion: 1, profileBinding: "fixture-profile", modelBinding: plan.model, messageCount: 2, orderedReplayableItems: [...buildBody(plan, user, localTools).body.input, ...result.outputItems] }
  const { body } = buildBody(plan, history, localTools, { responsesContext: context })
  assert.deepEqual(body.input.map((i) => i.type ?? i.role), ["user", "reasoning", "function_call", "message", "function_call_output"])
  for (const change of [{ profileBinding: "other" }, { modelBinding: "other" }, { messageCount: 999 }, { schemaVersion: 2 }]) assert.throws(() => buildBody(plan, history, localTools, { responsesContext: { ...context, ...change } }), /context|replay/i)
})

test("request replay rejects orphaned, duplicate and incomplete tool exchanges before sending", () => {
  const invocation = { role: "assistant", content: "", tool_calls: [{ id: "call_1", function: { name: "read_file", arguments: "{}" } }] }
  const output = { role: "tool", tool_call_id: "call_1", content: "data" }
  for (const provider of [plan, api]) {
    for (const invalid of [[output], [invocation], [output, invocation], [invocation, output, output], [invocation, invocation, output]]) {
      assert.throws(() => buildBody(provider, [...user, ...invalid], localTools), { code: "invalid_responses_context" })
    }
    assert.equal(buildBody(provider, [...user, invocation, output], localTools).body.input.length, 3)
  }
  const context = { schemaVersion: 1, profileBinding: plan.auth.credentialRef, modelBinding: plan.model, messageCount: 1,
    orderedReplayableItems: [{ type: "function_call_output", call_id: "call_1", output: "orphan" }] }
  assert.throws(() => buildBody(plan, user, localTools, { responsesContext: context }), /Orphaned/)
  context.orderedReplayableItems = [reasoning, call]
  assert.equal(buildBody(plan, [...user, output], localTools, { responsesContext: context }).body.input.at(-1).type, "function_call_output")
})

test("SSE handles CRLF, LF, byte-split UTF-8, multiline data, comments and terminal tail", async () => {
  const raw = `: keepalive\r\n\r\nevent: response.output_text.delta\r\ndata: {"type":"response.output_text.delta",\r\ndata: "delta":"Hello 世界"}\r\n\r\n${frame(completed([assistant])).trimEnd()}`
  const bytes = Buffer.from(raw)
  const result = await parseStream(stream([...bytes].map((n) => Buffer.from([n]))))
  assert.equal(result.content, "Hello 世界"); assert.equal(result.terminalStatus, "completed")
  assert.equal(result.finishReason, "stop")
})

test("Only completed releases tools; failed/incomplete/EOF/malformed frames keep partial text", async () => {
  const { toolMapping } = buildBody(plan, user, localTools)
  const starts = [frame({ type: "response.output_text.delta", delta: "partial" }), frame({ type: "response.output_item.done", output_index: 0, item: call })]
  const endings = ["", frame({ type: "response.incomplete", response: { incomplete_details: { reason: "max_output_tokens" } } }), frame({ type: "response.failed", response: { error: { code: "subscription_sharing_usage_limit_exceeded", message: "limit" } } }), "data: {broken}\n\n", "data: [DONE]\n\n"]
  for (const ending of endings) {
    const result = await parseStream(stream([...starts, ending]), { provider: plan, toolMapping })
    assert.equal(result.partial, true); assert.equal(result.content, "partial"); assert.deepEqual(result.toolCalls, []); assert.deepEqual(result.outputItems, [])
    assert.notEqual(result.terminalStatus, "completed"); assert.equal(result.error.retryable, false)
  }
  await assert.rejects(() => parseStream(stream([])), /without a completed/)
  await assert.rejects(() => parseStream(stream([frame({ type: "response.done", response: { status: "completed" } })])), /not an official/)
  assert.equal((await parseStream(stream([frame({ type: "response.done", response: { status: "completed" } })]), { allowResponseDone: true })).terminalStatus, "completed")
})

test("Function arguments assemble by item index, complete once and must be valid JSON", async () => {
  const { toolMapping } = buildBody(plan, user, localTools)
  const response = stream([
    frame({ type: "response.output_item.added", output_index: 0, item: { ...call, arguments: "" } }),
    frame({ type: "response.function_call_arguments.delta", item_id: call.id, delta: '{"path":' }),
    frame({ type: "response.function_call_arguments.delta", output_index: 0, delta: '"a"}' }),
    frame({ type: "response.function_call_arguments.done", item_id: call.id, arguments: call.arguments }),
    frame({ type: "response.completed", response: { id: "resp_1" } }),
  ])
  const result = await parseStream(response, { provider: plan, toolMapping })
  assert.equal(result.toolCalls.length, 1); assert.equal(result.toolCalls[0].arguments, call.arguments)
  await assert.rejects(() => parseStream(stream([frame(completed([call, call]))]), { provider: plan, toolMapping }), /duplicate/)
  await assert.rejects(() => parseStream(stream([frame(completed([{ ...call, arguments: '{"x":' }]))]), { provider: plan, toolMapping }), /incomplete JSON/)
})

test("Oversized and malformed UTF-8 SSE frames fail closed", async () => {
  await assert.rejects(async () => { for await (const _ of responseEvents(stream(["data: " + "x".repeat(100)]).body, { maxFrameBytes: 32 })) { /* consume */ } }, /size limit/)
  await assert.rejects(() => parseStream(stream([Buffer.from([0xff, 0xff])])), /decoding failed/)
})

test("Usage preserves reasoning/cache raw detail without double-counting output", () => {
  const usage = normalizeUsage({ input_tokens: 10, output_tokens: 20, input_tokens_details: { cached_tokens: 4 }, output_tokens_details: { reasoning_tokens: 7 }, total_tokens: 30 })
  assert.equal(usage.completion_tokens, 20); assert.equal(usage.reasoning_tokens, 7); assert.equal(usage.total_tokens, 30)
  assert.equal(usage.prompt_cache_hit_tokens, 4); assert.equal(usage.output_tokens_details.reasoning_tokens, 7)
})

test("Structured error/detail shape, exact codes, request ID and secret redaction", () => {
  const error = responsesError(plan, { error: { code: "subscription_sharing_unsupported_capability", param: "temperature", message: "Bearer secret", access_token: "secret" } }, { status: 400, requestId: "req_1" })
  assert.equal(error.code, "subscription_sharing_unsupported_capability"); assert.equal(error.param, "temperature"); assert.equal(error.requestId, "req_1")
  assert.equal(error.retryable, false); assert.ok(!JSON.stringify(error).includes('"secret"'))
  const detail = responsesError(plan, { detail: "region unavailable" }, { status: 403 })
  assert.equal(detail.code, undefined); assert.deepEqual(detail.redactedDetail, { detail: "region unavailable" }); assert.equal(detail.retryable, false)
  const limited = responsesError(plan, { error: { code: "subscription_sharing_usage_limit_exceeded", message: "app limit" } }, { status: 429 })
  assert.equal(limited.retryable, false)
})

test("HTTP admission retry is bounded; ambiguous network and plan limits never retry", async () => {
  const sleep = _rateHooks.sleep; const waits = []; _rateHooks.sleep = async (ms) => { waits.push(ms) }
  try {
    let calls = 0
    await assert.rejects(() => requestResponses(async () => { calls++; throw new Error("socket reset") }, { provider: plan }), (e) => e.stage === "transport" && e.retryClass === "manual_retry")
    assert.equal(calls, 1)
    calls = 0
    await assert.rejects(() => requestResponses(async () => { calls++; return new Response(JSON.stringify({ error: { code: "subscription_sharing_usage_limit_exceeded" } }), { status: 429 }) }, { provider: plan }))
    assert.equal(calls, 1)
    calls = 0
    await assert.rejects(() => requestResponses(async () => { calls++; return new Response('{"detail":"routing unavailable"}', { status: 503, headers: { "retry-after": "2", "x-request-id": "req_503" } }) }, { provider: plan }), (e) => e.status === 503 && e.requestId === "req_503")
    assert.equal(calls, 3); assert.deepEqual(waits, [2000, 2000])
  } finally { _rateHooks.sleep = sleep }
})

test("Summary part events and streamed message phases remain replayable", async () => {
  const result = await parseStream(stream([
    frame({ type: "response.output_item.added", output_index: 0, item: { ...reasoning, summary: [] } }),
    frame({ type: "response.reasoning_summary_part.added", output_index: 0, summary_index: 0, part: { type: "summary_text", text: "" } }),
    frame({ type: "response.reasoning_summary_text.delta", item_id: reasoning.id, summary_index: 0, delta: "Check safely" }),
    frame({ type: "response.reasoning_summary_part.done", output_index: 0, summary_index: 0, part: { type: "summary_text", text: "Check safely" } }),
    frame({ type: "response.output_item.added", output_index: 1, item: { ...assistant, content: [] } }),
    frame({ type: "response.output_text.delta", item_id: assistant.id, content_index: 0, delta: "hello" }),
    frame({ type: "response.completed", response: { status: "completed" } }),
  ]))
  assert.equal(result.reasoning, "Check safely"); assert.equal(result.outputItems[0].summary[0].text, "Check safely")
  assert.equal(result.outputItems[1].phase, "commentary"); assert.equal(result.outputItems[1].content[0].text, "hello")
})

test("Request-scoped OAuth two-round tool replay releases credentials and never sends chain IDs", async () => {
  const { chat } = await import("../provider/responses.mjs")
  const { _setAuthServiceForTest } = await import("../provider/auth-context.mjs")
  const active = { ...plan, auth: { ...plan.auth, enabled: true } }
  const fetch = globalThis.fetch; const requests = []; let releases = 0; let authCalls = 0
  _setAuthServiceForTest(providerAuthStub({ async getAuthContext(profileId, { signal }) {
    authCalls++
    return { profileId, signal, accessToken: "fixture-oauth-token", release() { releases++ } }
  } }))
  globalThis.fetch = async (url, opts) => {
    requests.push({ url, opts, body: JSON.parse(opts.body) })
    return new Response(frame(completed(requests.length === 1 ? [reasoning, call] : [assistant])), { headers: { "content-type": "text/event-stream", "x-request-id": "req_transport" } })
  }
  try {
    const first = await chat(active, { messages: user, tools: localTools })
    assert.equal(first.billingSource, "chatgpt_plan"); assert.equal(first.requestId, "req_transport")
    const messages = [...user, { role: "assistant", content: "", tool_calls: [{ id: call.call_id, function: { name: "read_file", arguments: call.arguments } }] }, { role: "tool", tool_call_id: call.call_id, content: "file text" }]
    const context = { ...first.responsesReplay, messageCount: first.responsesReplay.messageCount + 1 }
    const second = await chat(active, { messages, tools: localTools, responsesContext: context })
    assert.equal(second.content, "Hello 世界"); assert.equal(releases, 2); assert.equal(authCalls, 2)
    assert.deepEqual(requests[1].body.input.map((i) => i.type ?? i.role), ["user", "reasoning", "function_call", "function_call_output"])
    for (const { url, opts, body } of requests) {
      assert.equal(url, "https://api.openai.com/v1/responses"); assert.equal(opts.redirect, "error")
      assert.equal(opts.headers.Authorization, "Bearer fixture-oauth-token")
      assert.equal(body.store, false); assert.ok(!Object.hasOwn(body, "previous_response_id"))
    }
    assert.ok(!JSON.stringify(first).includes("fixture-oauth-token")); assert.ok(!JSON.stringify(active).includes("fixture-oauth-token"))
    await assert.rejects(() => chat({ ...active, maxTokens: 1 }, { messages: user }), /unsupported/)
    await assert.rejects(() => chat({ ...active, baseURL: "https://example.com/v1" }, { messages: user }), /official/)
    assert.equal(authCalls, 2); assert.equal(requests.length, 2)
  } finally { globalThis.fetch = fetch; _setAuthServiceForTest(null) }
})

test("API chain recovery is only for an explicitly missing previous response reference", async () => {
  const { chat, isChainInvalidError } = await import("../provider/responses.mjs")
  assert.equal(isChainInvalidError({ status: 400 }), false)
  assert.equal(isChainInvalidError({ status: 404 }), false)
  assert.equal(isChainInvalidError({ status: 400, code: "invalid_request", param: "temperature" }), false)
  const fetch = globalThis.fetch
  try {
    for (const lost of [false, true]) {
      const provider = { ...api }; const requests = []
      globalThis.fetch = async (_url, opts) => {
        requests.push(JSON.parse(opts.body))
        if (requests.length === 1) return new Response(frame(completed([{ ...call, namespace: undefined }])))
        if (requests.length === 2) return new Response(JSON.stringify({ error: { code: lost ? "previous_response_not_found" : "invalid_request", param: lost ? "previous_response_id" : "tools", message: "bad request" } }), { status: 400 })
        return new Response(frame(completed([assistant])))
      }
      await chat(provider, { messages: user, tools: localTools })
      const messages = [...user, { role: "assistant", content: "", tool_calls: [{ id: call.call_id, function: { name: "read_file", arguments: call.arguments } }] }, { role: "tool", tool_call_id: call.call_id, content: "data" }]
      if (lost) {
        assert.equal((await chat(provider, { messages, tools: localTools })).terminalStatus, "completed")
        assert.equal(requests.length, 3)
        assert.ok(requests[1].previous_response_id)
        assert.ok(!requests[2].previous_response_id); assert.equal(requests[2].input[0].role, "user")
      } else {
        await assert.rejects(() => chat(provider, { messages, tools: localTools }), (e) => e.code === "invalid_request")
        assert.equal(requests.length, 2)
      }
    }
  } finally { globalThis.fetch = fetch }
})

test("Interrupt and transport failures never expose a pending function call", async () => {
  const controller = new AbortController()
  const body = (async function* () {
    yield Buffer.from(frame({ type: "response.output_text.delta", delta: "partial" }))
    yield Buffer.from(frame({ type: "response.output_item.done", output_index: 0, item: call }))
    controller.abort({ interrupt: true, message: "stop" })
    throw new DOMException("Aborted", "AbortError")
  })()
  const result = await parseStream({ body }, { signal: controller.signal })
  assert.equal(result.interrupted, true); assert.equal(result.terminalStatus, "interrupted"); assert.deepEqual(result.toolCalls, [])
  const failed = await parseStream({ body: (async function* () { yield Buffer.from(frame({ type: "response.output_text.delta", delta: "partial" })); throw new Error("reset") })() })
  assert.equal(failed.terminalStatus, "transport_error"); assert.deepEqual(failed.toolCalls, [])
})

test("Explicit strict schemas are validated without changing business optional fields", () => {
  const invalid = [{ type: "function", function: { name: "read_file", strict: true, parameters: { type: "object", properties: { path: { type: "string" } } } } }]
  assert.throws(() => buildBody(plan, user, invalid), /strict function schema/)
  const valid = structuredClone(invalid)
  valid[0].function.parameters.required = ["path"]
  valid[0].function.parameters.additionalProperties = false
  assert.equal(buildBody(plan, user, valid).body.tools[0].tools[0].strict, true)
  assert.deepEqual(invalid[0].function.parameters, { type: "object", properties: { path: { type: "string" } } })
})

test("Idle watchdog terminates a stalled body and retains partial display only", async () => {
  const { PassThrough } = await import("node:stream")
  const body = new PassThrough()
  const parsing = parseStream({ body }, { readIdleMs: 10 })
  body.write(frame({ type: "response.output_text.delta", delta: "partial" }))
  body.write(frame({ type: "response.output_item.done", item: call }))
  // Keep test event loop alive while the production watchdog remains unref'd.
  const hold = setTimeout(() => {}, 100)
  try {
    const result = await parsing
    assert.equal(result.partial, true); assert.equal(result.error.code, "responses_idle_timeout")
    assert.equal(body.destroyed, true); assert.deepEqual(result.toolCalls, [])
  } finally { clearTimeout(hold) }
})

// Real SIWC HTTP streams can finish with output:[] after complete item events.
test("empty terminal output retains completed stream tools and opaque replay items", async () => {
  const { toolMapping } = buildBody(plan, user, localTools)
  const output = [reasoning, call, assistant]
  const events = output.map((item, output_index) => frame({ type: "response.output_item.done", output_index, item }))
  const result = await parseStream(stream([...events, frame(completed([]))]), { provider: plan, toolMapping })
  assert.equal(result.terminalStatus, "completed")
  assert.equal(result.toolCalls.length, 1)
  assert.equal(result.toolCalls[0].arguments, call.arguments)
  assert.equal(result.content, "Hello 世界")
  assert.deepEqual(result.outputItems.map(i => i.type), ["reasoning", "function_call", "message"])
  assert.equal(result.outputItems[0].encrypted_content, reasoning.encrypted_content)
  assert.equal(result.outputItems[2].phase, "commentary")
})

test("empty terminal output cannot release an unfinished streamed function", async () => {
  const { toolMapping } = buildBody(plan, user, localTools)
  await assert.rejects(() => parseStream(stream([
    frame({ type: "response.output_item.added", output_index: 0, item: call }),
    frame(completed([])),
  ]), { provider: plan, toolMapping }), /did not finish/)
})
