import { test, afterEach } from "node:test"
import assert from "node:assert/strict"
import { parseModelInfo, recordModelCatalog, modelInfoFor, hasFreshModelCatalog, _clearModelInfoForTest } from "../provider/model-info.mjs"
import { listModelCatalog, ensureProviderModelInfo } from "../provider/list-models.mjs"
import { _setAuthServiceForTest } from "../provider/auth-context.mjs"
import { providerAuthStub } from "./fixtures/provider-auth.mjs"
import { providerSpec, specForModel } from "../model-specs.mjs"
import { requestBudget } from "../config.mjs"

const originalFetch = globalThis.fetch
const originalNow = Date.now
const provider = (credentialRef = "profile-a", model = "gpt-6-luna") => ({
  name: "openai-chatgpt", format: "responses", baseURL: "https://api.openai.com/v1", model,
  auth: { type: "chatgpt_oauth", enabled: true, credentialRef },
})
const model = (slug, info = {}) => ({ slug, display_name: slug, visibility: "list", ...info })
const rows = (slug, info) => [{ id: slug, slug, spec: parseModelInfo(info) }]
const json = (data) => new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } })
function mockAuth() {
  const acquired = [], released = []
  _setAuthServiceForTest(providerAuthStub({ async getAuthContext(profileId, { signal }) {
    acquired.push(profileId)
    return { profileId, accessToken: "synthetic-test-token", signal, release() { released.push(profileId) } }
  } }))
  return { acquired, released }
}
afterEach(() => {
  globalThis.fetch = originalFetch
  Date.now = originalNow
  _setAuthServiceForTest(null)
  _clearModelInfoForTest()
})

test("catalog parser takes the active window and only supported capability fields", () => {
  assert.deepEqual(parseModelInfo({
    context_window: 272000, max_context_window: 1050000, max_output_tokens: 999999,
    supported_reasoning_levels: [{ effort: "low" }, { effort: "high" }, { effort: "high" }, { effort: "ultra" }],
    default_reasoning_level: "high", input_modalities: ["text", "image"],
    base_instructions: "untrusted prompt", tool_instructions: "untrusted tools", unknown: true,
  }), { context: 272000, reasoningEffortEnum: ["low", "high", "ultra"], ultraReasoningEffort: "high", thinkApi: "effort", thinking: true, defaultReasoningEffort: "high", multimodal: true })
})

test("missing and malformed optional metadata preserves the static fallback", () => {
  for (const record of [null, [], {}, { context_window: "272000" }, { context_window: 0 }, { context_window: -1 },
    { context_window: 1.5 }, { context_window: Number.MAX_SAFE_INTEGER + 1 }, { context_window: Infinity },
    { supported_reasoning_levels: "high", default_reasoning_level: "high" },
    { supported_reasoning_levels: [{ effort: 3 }] }, { supported_reasoning_levels: ["high"] },
    { input_modalities: "image" }, { input_modalities: ["image", null] },
    { context_window: "invalid", max_context_window: 1050000 }]) assert.equal(parseModelInfo(record), undefined)
  assert.deepEqual(parseModelInfo({ max_context_window: 1050000 }), { context: 1050000 })
  assert.deepEqual(parseModelInfo({ context_window: null, max_context_window: 1050000 }), { context: 1050000 })
})

test("reasoning metadata can disable modes and retains Ultra separately from wire effort", () => {
  assert.deepEqual(parseModelInfo({ supported_reasoning_levels: [{ effort: "none" }], default_reasoning_level: "none", input_modalities: ["text"] }),
    { reasoningEffortEnum: ["none"], thinkApi: "effort", thinking: false, defaultReasoningEffort: "none", multimodal: false })
  for (const levels of [[], [{ effort: "future-mode" }]]) {
    assert.deepEqual(parseModelInfo({ supported_reasoning_levels: levels, default_reasoning_level: "ultra" }),
      { reasoningEffortEnum: [], thinkApi: "effort", thinking: false })
  }
  assert.deepEqual(parseModelInfo({ supported_reasoning_levels: [{ effort: "ultra" }], default_reasoning_level: "ultra" }),
    { reasoningEffortEnum: ["ultra"], ultraReasoningEffort: "medium", thinkApi: "effort", thinking: true, defaultReasoningEffort: "ultra" })
  assert.deepEqual(parseModelInfo({ supported_reasoning_levels: [{ effort: "low" }], default_reasoning_level: "high" }),
    { reasoningEffortEnum: ["low"], thinkApi: "effort", thinking: true })
})

test("metadata is isolated by account, official endpoint, auth mode, and exact model slug", () => {
  const a = provider(), b = provider("profile-b")
  recordModelCatalog(a, rows(a.model, { context_window: 272000 }))
  recordModelCatalog(b, rows(b.model, { context_window: 500000 }))
  assert.equal(modelInfoFor(a).context, 272000)
  assert.equal(modelInfoFor(b).context, 500000)
  assert.equal(modelInfoFor({ ...a, baseURL: `${a.baseURL}/` }).context, 272000)
  for (const other of [{ ...a, model: `${a.model}-snapshot` }, { ...a, model: `openai/${a.model}` }]) {
    assert.equal(modelInfoFor(other), undefined)
    assert.equal(hasFreshModelCatalog(other), true)
  }
  for (const other of [provider("profile-c"),
    { ...a, auth: undefined, apiKey: "synthetic-key" }, { ...a, auth: { type: "api_key" } },
    { ...a, auth: { ...a.auth, enabled: false } }, { ...a, baseURL: "https://other.example/v1" },
    { ...a, format: "openai" }, { ...a, headers: { "X-Custom": "header" } }, { ...a, apiKey: "synthetic-key" }]) {
    assert.equal(modelInfoFor(other), undefined)
    assert.equal(hasFreshModelCatalog(other), false)
  }
  assert.equal(providerSpec({ ...a, auth: undefined, apiKey: "synthetic-key" }).context, 1050000)
})

test("provider spec layers catalog metadata then manual context without changing API specs", () => {
  const p = provider()
  const original = structuredClone(specForModel(p.model))
  recordModelCatalog(p, rows(p.model, { context_window: 272000, supported_reasoning_levels: [{ effort: "low" }], default_reasoning_level: "low", input_modalities: ["text"] }))
  const spec = providerSpec(p)
  assert.equal(spec.context, 272000)
  assert.equal(spec.specSource, "catalog")
  assert.equal(spec.contextSource, "catalog")
  assert.equal(spec.multimodal, false)
  assert.deepEqual(spec.reasoningEffortEnum, ["low"])
  assert.equal(spec.defaultReasoningEffort, "low")
  assert.equal(spec.maxOutput, 128000)
  assert.equal(requestBudget(p).window, 272000)
  assert.equal(requestBudget(p).windowSource, "catalog")
  assert.equal(requestBudget(p).limit, 144000)
  assert.equal(requestBudget(p).maxTokens, undefined)
  assert.equal(requestBudget({ ...p, context: 200 }).windowSource, "provider-override")
  assert.equal(providerSpec({ ...p, context: "200" }).context, 204800)
  assert.equal(providerSpec({ ...p, context: 200 }).contextSource, "config")
  assert.equal(providerSpec({ ...p, context: "invalid" }).contextSource, "catalog")
  assert.deepEqual(specForModel(p.model), original)
  assert.notEqual(providerSpec({ model: p.model }), specForModel(p.model))
  recordModelCatalog(p, rows(p.model, { input_modalities: ["text"] }))
  assert.equal(providerSpec(p).specSource, "catalog")
  assert.equal(providerSpec(p).contextSource, undefined)
  assert.equal(providerSpec(p).context, 1050000)
  assert.equal(requestBudget(p).windowSource, "spec")
  recordModelCatalog(p, rows(p.model, { supported_reasoning_levels: [{ effort: "low" }] }))
  assert.equal(providerSpec(p).defaultReasoningEffort, undefined)
})

test("successful replacement removes old fields and models; external mutations cannot change the snapshot", () => {
  const p = provider()
  const catalog = rows(p.model, { context_window: 272000, supported_reasoning_levels: [{ effort: "low" }], default_reasoning_level: "low", input_modalities: ["text"] })
  recordModelCatalog(p, catalog)
  catalog[0].spec.context = 1
  catalog[0].spec.reasoningEffortEnum.push("ultra")
  const read = modelInfoFor(p)
  read.context = 2
  read.reasoningEffortEnum.push("high")
  assert.equal(modelInfoFor(p).context, 272000)
  assert.deepEqual(modelInfoFor(p).reasoningEffortEnum, ["low"])
  recordModelCatalog(p, rows(p.model, { context_window: 500000 }))
  assert.deepEqual(modelInfoFor(p), { context: 500000 })
  assert.equal(providerSpec(p).multimodal, true)
  assert.equal(providerSpec(p).defaultReasoningEffort, "medium")
  recordModelCatalog(p, [])
  assert.equal(modelInfoFor(p), undefined)
  assert.equal(providerSpec(p).context, 1050000)
  assert.equal(hasFreshModelCatalog(p), true)
})

test("account metadata for a new slug does not warn that the model is unknown", (t) => {
  const warnings = []
  t.mock.method(console, "warn", (message) => warnings.push(message))
  const p = provider("profile-a", "account-only-model")
  recordModelCatalog(p, rows(p.model, { context_window: 262144 }))
  assert.equal(providerSpec(p).context, 262144)
  assert.equal(providerSpec(p).maxOutput, 32000)
  assert.deepEqual(warnings, [])
})

test("catalog fetch keeps order and display fields while recording only parsed visible metadata", async () => {
  const auth = mockAuth()
  const p = provider()
  let requests = 0
  globalThis.fetch = async (url, opts) => {
    requests++
    assert.equal(url, "https://api.openai.com/v1/models")
    assert.equal(opts.redirect, "error")
    return json({ models: [model("z", { context_window: 500000, base_instructions: "untrusted" }), model(p.model), model("hidden", { visibility: "hide", context_window: 272000 })] })
  }
  assert.deepEqual(await listModelCatalog(p), [
    { id: "z", slug: "z", displayName: "z", visibility: "list", spec: { context: 500000 } },
    { id: p.model, slug: p.model, displayName: p.model, visibility: "list" },
  ])
  assert.equal(modelInfoFor({ ...p, model: "z" }).context, 500000)
  assert.equal(modelInfoFor({ ...p, model: "hidden" }), undefined)
  await listModelCatalog(p)
  assert.equal(requests, 2)
  assert.deepEqual(auth.acquired, ["profile-a", "profile-a"])
  assert.deepEqual(auth.released, auth.acquired)
})

test("ensure uses a successful snapshot for 60 seconds, supports explicit refresh, and allows unlisted models", async () => {
  mockAuth()
  const p = provider("profile-a", "unlisted-model")
  let now = 1000, requests = 0
  Date.now = () => now
  globalThis.fetch = async () => { requests++; return json({ models: [] }) }
  await ensureProviderModelInfo(p)
  now += 59999
  await ensureProviderModelInfo(p)
  assert.equal(requests, 1)
  now++
  await ensureProviderModelInfo(p)
  assert.equal(requests, 2)
  await ensureProviderModelInfo(p, { fresh: true })
  assert.equal(requests, 3)
  await ensureProviderModelInfo({ ...p, auth: undefined, apiKey: "synthetic-key" })
  assert.equal(requests, 3)
})

test("a failed or malformed refresh preserves the last successful data and remains retryable", async () => {
  const auth = mockAuth()
  const p = provider()
  let now = 1000, requests = 0
  Date.now = () => now
  recordModelCatalog(p, rows(p.model, { context_window: 272000 }))
  now += 60000
  globalThis.fetch = async () => { requests++; throw new Error("catalog offline") }
  await assert.rejects(ensureProviderModelInfo(p), /catalog offline/)
  assert.equal(hasFreshModelCatalog(p), false)
  assert.equal(providerSpec(p).context, 272000)
  await assert.rejects(ensureProviderModelInfo(p), /catalog offline/)
  assert.equal(requests, 2)
  globalThis.fetch = async () => json({ data: [] })
  await assert.rejects(ensureProviderModelInfo(p), /expected models array/)
  assert.equal(modelInfoFor(p).context, 272000)
  globalThis.fetch = async () => json({ models: [model(p.model, { context_window: 500000 })] })
  await ensureProviderModelInfo(p)
  assert.equal(hasFreshModelCatalog(p), true)
  assert.equal(providerSpec(p).context, 500000)
  assert.equal(auth.acquired.length, 4)
  assert.deepEqual(auth.released, auth.acquired)
})

test("an in-flight catalog is bound to the requesting account when settings change", async () => {
  const auth = mockAuth()
  const p = provider()
  let finish
  globalThis.fetch = () => new Promise((resolve) => { finish = resolve })
  const pending = listModelCatalog(p)
  while (!finish) await Promise.resolve()
  p.auth.credentialRef = "profile-b"
  finish(json({ models: [model(p.model, { context_window: 272000 })] }))
  await pending
  assert.equal(modelInfoFor(provider()).context, 272000)
  assert.equal(modelInfoFor(p), undefined)
  assert.deepEqual(auth.acquired, ["profile-a"])
  assert.deepEqual(auth.released, ["profile-a"])
})
