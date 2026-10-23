import test from "node:test"
import assert from "node:assert/strict"
import { registerHooks, createRequire } from "node:module"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
const root = new URL("../../../", import.meta.url)
const opened = []
globalThis.__authOpened = opened
registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith("/rc/")) return { url: new URL(`thincoder-render-core/${specifier.slice(4)}`, root).href, shortCircuit: true }
  if (specifier === "electron") return { url: "data:text/javascript,export const shell={openExternal:async(url)=>{if(globalThis.__authOpenError)throw globalThis.__authOpenError;globalThis.__authOpened.push(url)}}", shortCircuit: true }
  return next(specifier, context)
} })
const { authRowNode } = await import("../../renderer/views/settings-auth.mjs")
const { channelFormTree } = await import("../../renderer/views/settings-controls.mjs")
const { providersBody } = await import("../../renderer/views/settings-sections-providers.mjs")
const { createProviderExits } = await import("../../renderer/mount-settings-segments-providers.mjs")
const { initDict } = await import("../../renderer/i18n.mjs")
const { _setConfigPathForTest, _resetConfigPathForTest, addProviderEntry, persistRaw, loadRaw } = await import("@thincoder/core/config-io.mjs")
const { setAuthService } = await import("@thincoder/core/auth/service.mjs")
const { providerList } = await import("../../src/main/providers.mjs")
const { authActionChannel } = await import("../../src/main/auth.mjs")
initDict({ locale: "en" })
const nodes = (node) => !node || typeof node !== "object" ? [] : [node, ...(node.children ?? []).flatMap(nodes)]

test("Desktop settings show explicit opt-in, scope and inference evidence without API key controls", () => {
  const actions = []
  const row = { name: "openai-chatgpt", authType: "chatgpt_oauth", authStatus: { enabled: false, state: "signed_out", planAuthorized: false } }
  const tree = authRowNode(row, { onAuthAction: (...args) => actions.push(args) })
  const flat = nodes(tree)
  assert.equal(flat.find((n) => n.props?.["data-auth-action"] === "login").props.disabled, true)
  flat.find((n) => n.props?.["data-auth-enable"]).props.onChange({ target: { checked: true } })
  assert.deepEqual(actions[0], ["openai-chatgpt", "enable", { enabled: true }])
  assert.match(JSON.stringify(tree), /Plan use not authorized/)
  assert.match(JSON.stringify(tree), /Inference not verified/)
  const cards = providersBody({ rows: [row] }, {}, { verifyControl: () => null })
  assert.equal(cards.flatMap(nodes).some((n) => n.props?.["data-action"] === "settings:providerKeyEdit"), false)
})

test("Desktop adding ChatGPT hides key input; API-key Responses retains its key input", () => {
  const presets = [{ name: "openai-chatgpt", authType: "chatgpt_oauth" }, { name: "openai-responses", authType: "api_key" }]
  const hasKey = (shape) => nodes(channelFormTree({ shape, presets })).some((n) => n.props?.name === "key")
  assert.equal(hasKey("openai-chatgpt"), false)
  assert.equal(hasKey("openai-responses"), true)
})

test("Desktop cancel remains usable during sign-in and duplicate clicks do not create a second request", async () => {
  let state = { settings: { providers: {} } }, complete
  const calls = []
  const exits = createProviderExits({ store: { get: () => state }, setSettings: (patch) => { state = { settings: { ...state.settings, ...patch } } },
    ask: async (channel, payload) => { calls.push([channel, payload]); return payload.action === "login" ? new Promise((resolve) => { complete = resolve }) : { ok: true } },
    loadProviders: async () => {}, onProvidersChanged() {} })
  exits.handlers.onAuthAction("openai-chatgpt", "login")
  exits.handlers.onAuthAction("openai-chatgpt", "login")
  assert.equal(calls.length, 1)
  exits.handlers.onAuthAction("openai-chatgpt", "cancel")
  assert.equal(calls[1][1].action, "cancel")
  complete({ ok: false, reason: "Sign-in cancelled" })
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(state.settings.providers.authBusy["openai-chatgpt"], false)
  assert.equal(state.settings.providers.authNotice["openai-chatgpt"], "Sign-in cancelled")
})

test("Desktop host opens system browser and IPC returns no OAuth credentials or URLs", async () => {
  const dir = mkdtempSync(join(tmpdir(), "desktop-auth-test-"))
  _setConfigPathForTest(join(dir, "config.json"))
  let signedIn = false
  setAuthService({ dispose() {}, async getStatus() { return { profileId: "account-a", label: "Account A", state: signedIn ? "ready" : "signed_out", planAuthorized: signedIn, accessToken: "SECRET" } },
    async listProfiles() { return signedIn ? [await this.getStatus()] : [] },
    async beginLogin({ openBrowser }) { await openBrowser("https://auth.openai.com/authorize?id_token_hint=SECRET"); signedIn = true; return { completion: Promise.resolve(await this.getStatus()), cancel() {} } } })
  try {
    addProviderEntry({ preset: "openai-chatgpt" })
    await authActionChannel({ action: "enable", name: "openai-chatgpt", enabled: true })
    const login = await authActionChannel({ action: "login", name: "openai-chatgpt" })
    assert.equal(login.ok, true)
    assert.equal(opened.length, 1)
    assert.equal(JSON.stringify(login).includes("SECRET"), false)
    const listing = await providerList()
    assert.equal(listing.providers[0].authType, "chatgpt_oauth")
    assert.equal(listing.providers[0].authStatus.lastInference, null)
    assert.equal(JSON.stringify(listing).includes("SECRET"), false)
    assert.deepEqual(loadRaw().providers[0].auth, { type: "chatgpt_oauth", enabled: true, credentialRef: "account-a" })
    persistRaw((raw) => { raw.providers[0].proxy = true })
    assert.equal(loadRaw().providers[0].auth.credentialRef, "account-a")
    const { CHANNELS } = createRequire(import.meta.url)("../../src/preload/preload.cjs")
    assert.ok(CHANNELS.includes("auth:action"))
    assert.ok(CHANNELS.includes("team:rotate"), "OAuth actions must coexist with the upstream team rotation bridge")
  } finally { _resetConfigPathForTest(); rmSync(dir, { recursive: true, force: true }) }
})

test("Desktop first-run subscription setup saves without a key and opens account settings", async () => {
  const { createWizard } = await import("../../renderer/mount-onboarding.mjs")
  const { wizardModel } = await import("../../renderer/views/onboarding.mjs")
  let state = { settings: { configured: false, wizard: { step: 1 }, providers: { presets: [{ name: "openai-chatgpt", authType: "chatgpt_oauth" }] } } }
  const events = [], OldFormData = globalThis.FormData
  globalThis.FormData = class { get(key) { return key === "preset" ? "openai-chatgpt" : "" } }
  try {
    const wizard = createWizard({ store: { get: () => state, set: (s) => { state = s } }, submitChannel: async () => { events.push("save"); return true }, openSettings: () => events.push("settings") })
    wizard.handlers.onPresetChange("openai-chatgpt")
    assert.equal(wizardModel(state).selectedPreset, "openai-chatgpt")
    wizard.handlers.onSubmit({ currentTarget: { closest: () => ({}) } })
    await new Promise((resolve) => setImmediate(resolve))
    assert.deepEqual(events, ["save", "settings"])
    assert.equal(state.settings.wizard.dismissed, true)
  } finally { globalThis.FormData = OldFormData }
})

test("Desktop account catalog uses the shared admission probe and provider-aware capabilities", async () => {
  const { modelCatalog, modelList } = await import("../../src/main/settings.mjs")
  const { _setAuthServiceForTest } = await import("@thincoder/core/provider/auth-context.mjs")
  const { admissionOf, _resetAdmissionForTest, recordAdmission, probeChannelModels } = await import("@thincoder/core/provider/list-models.mjs")
  const dir = mkdtempSync(join(tmpdir(), "desktop-account-catalog-")), previousFetch = globalThis.fetch
  _setConfigPathForTest(join(dir, "config.json"))
  addProviderEntry({ preset: "openai-chatgpt" })
  persistRaw((raw) => { raw.providers[0].auth = { type: "chatgpt_oauth", enabled: true, credentialRef: "catalog-account" } })
  _setAuthServiceForTest({ async getAuthContext(profileId, { signal }) { return { profileId, signal, accessToken: "SYNTHETIC", release() {} } } })
  globalThis.fetch = async () => new Response(JSON.stringify({ models: [{ slug: "gpt-6-luna", display_name: "Account Luna", visibility: "list",
    supported_reasoning_levels: [{ effort: "low" }, { effort: "high" }], default_reasoning_level: "high" }] }), { status: 200 })
  try {
    recordAdmission("openai-chatgpt", { ok: false, reason: "old failure" })
    const catalog = await modelCatalog()
    assert.equal(admissionOf("openai-chatgpt").ok, true)
    assert.deepEqual(catalog.models[0], { provider: "openai-chatgpt", id: "gpt-6-luna", label: "Account Luna", effortEnum: ["low", "high"], thinkOff: false, effortDefault: "high" })
    assert.deepEqual((await modelList({ provider: "openai-chatgpt" })).models[0], { id: "gpt-6-luna", label: "Account Luna", effortEnum: ["low", "high"], thinkOff: false, effortDefault: "high" })
    const probe = await probeChannelModels("openai-chatgpt", loadRaw().providers[0])
    assert.deepEqual(probe.models, ["gpt-6-luna"])
    assert.equal(probe.catalog[0].displayName, "Account Luna")
    globalThis.fetch = async () => { throw new Error("offline") }
    const failed = await modelCatalog()
    assert.equal(admissionOf("openai-chatgpt").ok, false)
    assert.equal(admissionOf("openai-chatgpt").reason, failed.unavailable[0].reason)
  } finally { globalThis.fetch = previousFetch; _setAuthServiceForTest(null); _resetAdmissionForTest(); _resetConfigPathForTest(); rmSync(dir, { recursive: true, force: true }) }
})

test("Desktop composer keeps subscription display order and needs explicit catalog retry", async () => {
  const { createComposerSync } = await import("../../renderer/composer-sync.mjs")
  let state = {}, requests = 0, delayed = 0
  const pushed = []
  const sync = createComposerSync({ store: { get: () => state, set: (s) => { state = s } }, push: (m) => pushed.push(m),
    call: async () => { requests++; return { ok: true, automaticRetry: false, models: [{ provider: "openai-chatgpt", id: "z-slug", label: "First model", effortEnum: ["low", "high"], effortDefault: "high" }, { provider: "openai-chatgpt", id: "a-slug", label: "Second model" }], unavailable: [{ provider: "api", reason: "offline" }] } },
    delay: async () => { delayed++ } })
  sync.refreshCandidates()
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(requests, 1); assert.equal(delayed, 0)
  assert.deepEqual(pushed[0].models.map((m) => [m.id, m.label]), [["z-slug", "First model"], ["a-slug", "Second model"]])
  assert.equal(pushed[0].models[0].effortDefault, "high")
  assert.equal(Object.hasOwn(pushed[0].models[1], "effortDefault"), false)
  sync.refreshCandidates()
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(requests, 2)
})

const flush = () => new Promise((resolve) => setImmediate(resolve))
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done }); return { promise, resolve } }
const catalog = (id) => ({ ok: true, automaticRetry: false, models: id ? [{ provider: "openai-chatgpt", id, label: id }] : [], unavailable: [] })

test("Desktop composer discards in-flight account A models and fetches the latest account", async () => {
  const { createComposerSync } = await import("../../renderer/composer-sync.mjs")
  let state = {}, requests = 0
  const first = deferred(), second = deferred(), pushed = []
  const sync = createComposerSync({ store: { get: () => state, set: (next) => { state = next } }, push: (m) => pushed.push(m),
    call: () => (++requests === 1 ? first.promise : second.promise) })
  sync.refreshCandidates()
  sync.refreshCandidates()
  first.resolve(catalog("account-a-model"))
  await flush()
  assert.equal(requests, 2)
  assert.equal(pushed.some((m) => m.models.some((row) => row.id === "account-a-model")), false)
  second.resolve(catalog("account-b-model"))
  await flush()
  assert.equal(state.modelCandidates.models[0].id, "account-b-model")
})

test("Desktop composer queued refresh survives a failed earlier request", async () => {
  const { createComposerSync } = await import("../../renderer/composer-sync.mjs")
  let state = {}, requests = 0
  const first = deferred()
  const sync = createComposerSync({ store: { get: () => state, set: (next) => { state = next } }, push() {},
    call: () => ++requests === 1 ? first.promise : Promise.resolve(catalog("new-model")) })
  sync.refreshCandidates(); sync.refreshCandidates()
  first.resolve({ ok: false, reason: "old-account-offline" })
  await flush()
  assert.equal(requests, 2)
  assert.equal(state.modelCandidates.models[0].id, "new-model")
})

test("Desktop composer clears cached account models immediately and accepts an empty catalog", async () => {
  const { createComposerSync } = await import("../../renderer/composer-sync.mjs")
  let state = {}, requests = 0
  const empty = deferred(), pushed = []
  const sync = createComposerSync({ store: { get: () => state, set: (next) => { state = next } }, push: (m) => pushed.push(m),
    call: () => ++requests === 1 ? Promise.resolve(catalog("account-a-model")) : empty.promise })
  sync.refreshCandidates(); await flush()
  sync.refreshCandidates()
  assert.deepEqual(state.modelCandidates.models, [])
  assert.deepEqual(pushed.at(-1).models, [])
  empty.resolve(catalog(null)); await flush()
  assert.deepEqual(pushed.at(-1).models, [])
  assert.deepEqual(state.modelCandidates.models, [])
})

test("Desktop provider diagnostics recognize ready OAuth references without requiring an API key", async () => {
  const { providerKindOf } = await import("../../src/main/turn-input.mjs")
  const provider = { name: "openai-chatgpt", baseURL: "https://api.openai.com/v1", format: "responses", auth: { type: "chatgpt_oauth", enabled: true, credentialRef: "account-a" } }
  assert.equal(providerKindOf({ config: { providersList: [provider] } }), "defaultModel")
  assert.equal(providerKindOf({ config: { providersList: [{ ...provider, auth: { ...provider.auth, enabled: false } }] } }), "provider")
})

test("Desktop host-reported sign-in state keeps Cancel available after a renderer refresh", () => {
  const flat = nodes(authRowNode({ name: "openai-chatgpt", authStatus: { enabled: true, authorizing: true }, authProfiles: [] }, {}))
  assert.equal(flat.find((n) => n.props?.["data-auth-action"] === "login").props.disabled, true)
  assert.ok(flat.find((n) => n.props?.["data-auth-action"] === "cancel"))
})

const providerReceipt = (profileId) => ({ ok: true, presets: [], defaultModel: "openai-chatgpt:model", providers: [
  { name: "openai-chatgpt", authType: "chatgpt_oauth", authStatus: { profileId, enabled: true, state: "ready" } },
] })
function settingsHarness(ask, initial = { providers: {}, model: {} }) {
  let state = { settings: initial }
  return { get: () => state, deps: { ask, store: { get: () => state }, report() {},
    setSettings: (patch) => { state = { settings: { ...state.settings, ...patch } } } } }
}

test("Desktop settings discard stale provider and model responses", async () => {
  const { createReads } = await import("../../renderer/mount-settings-reads.mjs")
  const oldProviders = deferred(), newProviders = deferred(), oldModels = deferred(), newModels = deferred()
  let reads = 0, modelReads = 0
  const harness = settingsHarness((channel) => channel === "provider:list"
    ? (++reads === 1 ? oldProviders.promise : newProviders.promise)
    : (++modelReads === 1 ? oldModels.promise : newModels.promise))
  const api = createReads(harness.deps)
  const first = api.loadProviders(), second = api.loadProviders()
  newProviders.resolve(providerReceipt("account-b")); await flush()
  oldProviders.resolve(providerReceipt("account-a")); await flush()
  assert.equal(harness.get().settings.providers.providers[0].authStatus.profileId, "account-b")
  assert.equal(modelReads, 1)
  const newerModels = api.loadModels("different-provider")
  newModels.resolve({ ok: true, models: [{ id: "new-model" }] }); await newerModels
  oldModels.resolve({ ok: true, models: [{ id: "old-model" }] }); await Promise.all([first, second])
  assert.equal(harness.get().settings.model.provider, "different-provider")
  assert.equal(harness.get().settings.model.models[0].id, "new-model")
})

test("Desktop settings do not preserve a catalog across account changes with the same provider name", async () => {
  const { createReads } = await import("../../renderer/mount-settings-reads.mjs")
  const calls = []
  const harness = settingsHarness(async (channel) => { calls.push(channel); return channel === "provider:list" ? providerReceipt("account-b") : { ok: true, models: [{ id: "b-model" }] } },
    { providers: { providers: providerReceipt("account-a").providers }, model: { state: "ready", provider: "openai-chatgpt", current: "model", models: [{ id: "a-model" }] } })
  await createReads(harness.deps).loadProviders({ models: false })
  assert.deepEqual(calls, ["provider:list", "model:list"])
  assert.equal(harness.get().settings.model.models[0].id, "b-model")
})

test("Desktop late sign-in cancellation cannot overwrite a newer account selection notice", async () => {
  const login = deferred(), reads = [], changed = []
  const harness = settingsHarness(async (_channel, payload) => payload.action === "login" ? login.promise : { ok: true })
  const exits = createProviderExits({ ...harness.deps, loadProviders: async () => { reads.push(true) }, onProvidersChanged: () => changed.push(true) })
  exits.handlers.onAuthAction("openai-chatgpt", "login")
  exits.handlers.onAuthAction("openai-chatgpt", "select", { profileId: "account-b" })
  await flush()
  login.resolve({ ok: false, reason: "The old sign-in was cancelled" }); await flush()
  assert.equal(harness.get().settings.providers.authNotice["openai-chatgpt"], "")
  assert.equal(harness.get().settings.providers.authBusy["openai-chatgpt"], false)
  assert.equal(changed.length, 1)
  const before = reads.length
  exits.handlers.onAuthAction("openai-chatgpt", "manage"); await flush()
  assert.equal(reads.length, before)
  assert.equal(changed.length, 1)
})

test("Desktop auth bridge handles rejected requests without retaining a busy sign-in", async () => {
  const harness = settingsHarness(async () => { throw new Error("PRIVATE-BROWSER-URL") })
  const exits = createProviderExits({ ...harness.deps, loadProviders: async () => {} })
  exits.handlers.onAuthAction("openai-chatgpt", "login"); await flush()
  assert.equal(harness.get().settings.providers.authBusy["openai-chatgpt"], false)
  assert.match(harness.get().settings.providers.authNotice["openai-chatgpt"], /could not be completed/)
  assert.equal(JSON.stringify(harness.get()).includes("PRIVATE-BROWSER-URL"), false)
})

test("Desktop first-run subscription save is single-flight and respects dismissal while saving", async () => {
  const { createWizard } = await import("../../renderer/mount-onboarding.mjs")
  let state = { settings: { configured: false, wizard: { step: 1 }, providers: {} } }
  const save = deferred(), events = [], OldFormData = globalThis.FormData
  globalThis.FormData = class { get(key) { return key === "preset" ? "openai-chatgpt" : "" } }
  try {
    const wizard = createWizard({ store: { get: () => state, set: (s) => { state = s } },
      submitChannel: () => { events.push("save"); return save.promise }, openSettings: () => events.push("settings") })
    const event = { currentTarget: { closest: () => ({}) } }
    wizard.handlers.onSubmit(event); wizard.handlers.onSubmit(event)
    assert.deepEqual(events, ["save"])
    wizard.handlers.onDismiss()
    save.resolve(true); await flush()
    assert.deepEqual(events, ["save"])
    assert.equal(state.settings.wizard.dismissed, true)
  } finally { globalThis.FormData = OldFormData }
})

test("Desktop native browser failures cannot echo private URL or storage details through IPC", async () => {
  globalThis.__authOpenError = new Error("Failed opening https://auth.openai.com/?code=SECRET at /private/credentials")
  try {
    const receipt = await authActionChannel({ action: "manage", name: "openai-chatgpt" })
    assert.equal(receipt.ok, false)
    assert.match(receipt.reason, /could not be completed/)
    assert.equal(JSON.stringify(receipt).includes("SECRET"), false)
    assert.equal(JSON.stringify(receipt).includes("/private/credentials"), false)
  } finally { delete globalThis.__authOpenError }
})

test("Desktop account mutation controls are locked while saving, without blocking Cancel", async () => {
  const mutation = deferred(), calls = []
  const harness = settingsHarness((_channel, payload) => { calls.push(payload.action); return mutation.promise })
  const exits = createProviderExits({ ...harness.deps, loadProviders: async () => {} })
  exits.handlers.onAuthAction("openai-chatgpt", "enable", { enabled: true })
  exits.handlers.onAuthAction("openai-chatgpt", "enable", { enabled: false })
  assert.deepEqual(calls, ["enable"])
  assert.equal(harness.get().settings.providers.authMutating["openai-chatgpt"], true)
  const flat = nodes(authRowNode({ name: "openai-chatgpt", authMutating: true, authBusy: true, authStatus: { enabled: true, profileId: "a" } }, {}))
  assert.equal(flat.find((n) => n.props?.["data-auth-enable"]).props.disabled, true)
  assert.equal(flat.find((n) => n.props?.["data-auth-action"] === "cancel").props.disabled, false)
  mutation.resolve({ ok: true }); await flush()
  assert.equal(harness.get().settings.providers.authMutating["openai-chatgpt"], false)
})
