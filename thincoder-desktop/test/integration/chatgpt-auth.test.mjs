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
  if (specifier === "electron") return { url: "data:text/javascript,export const shell={openExternal:async(url)=>globalThis.__authOpened.push(url)}", shortCircuit: true }
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

test("Desktop composer keeps subscription display order and needs explicit catalog retry", async () => {
  const { createComposerSync } = await import("../../renderer/composer-sync.mjs")
  let state = {}, requests = 0, delayed = 0
  const pushed = []
  const sync = createComposerSync({ store: { get: () => state, set: (s) => { state = s } }, push: (m) => pushed.push(m),
    call: async () => { requests++; return { ok: true, automaticRetry: false, models: [{ provider: "openai-chatgpt", id: "z-slug", label: "First model" }, { provider: "openai-chatgpt", id: "a-slug", label: "Second model" }], unavailable: [{ provider: "api", reason: "offline" }] } },
    delay: async () => { delayed++ } })
  sync.refreshCandidates()
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(requests, 1); assert.equal(delayed, 0)
  assert.deepEqual(pushed[0].models.map((m) => [m.id, m.label]), [["z-slug", "First model"], ["a-slug", "Second model"]])
  sync.refreshCandidates()
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(requests, 2)
})
