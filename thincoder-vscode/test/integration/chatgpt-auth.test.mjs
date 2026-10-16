import test from "node:test"
import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
const opened = []
globalThis.__authVscode = { remoteName: undefined, openExternal: async (url) => { opened.push(url); return true } }
registerHooks({ resolve(specifier, context, next) {
  if (specifier === "vscode") return { url: 'data:text/javascript,export const env=globalThis.__authVscode;export const Uri={parse:(v)=>v};export const window={};', shortCircuit: true }
  return next(specifier, context)
} })
globalThis.window = {}
globalThis.document = { getElementById: () => null, querySelectorAll: () => [], querySelector: () => null }
const posted = []
globalThis.acquireVsCodeApi = () => ({ postMessage: (m) => posted.push(m) })
const { setStrings } = await import("../../webview/i18n.js")
setStrings(JSON.parse(readFileSync(new URL("../../locales/en.json", import.meta.url), "utf8")))
const { authRowHtml, updateAuthMessage, bindAuthRows } = await import("../../webview/settings-auth.js")
const { providersCardHtml } = await import("../../webview/settings-providers.js")
const { SS } = await import("../../webview/settings-state.js")
const { _setConfigPathForTest, _resetConfigPathForTest, addProviderEntry, persistRaw, loadRaw } = await import("@thincoder/core/config-io.mjs")
const { setAuthService } = await import("@thincoder/core/auth/service.mjs")
const { handleAuthAction } = await import("../../src/extension/panel-auth.mjs")
const { providerFromConfig, isProviderConfigured, storeProviderKey } = await import("../../src/extension/presets.mjs")

test("VS Code subscription row hides key editing and distinguishes scope from inference", () => {
  SS.providerStatus = { providers: { "openai-chatgpt": { configured: true, auth: { type: "chatgpt_oauth", enabled: true } } } }
  updateAuthMessage({ type: "authStatus", name: "openai-chatgpt", status: { enabled: true, label: "Account <A>", profileId: "account-a", state: "signed_in_without_plan_scope", planAuthorized: false }, profiles: [] })
  const html = providersCardHtml()
  assert.ok(!html.includes("window._editKey"))
  assert.ok(html.includes("Plan use not authorized"))
  assert.ok(html.includes("Inference not verified"))
  assert.ok(html.includes("Account &lt;A&gt;"))
  assert.ok(!html.includes('prov-dot ok'))
})

test("VS Code renderer emits only actions/references and logout uncertainty remains visible", () => {
  const controls = [{ dataset: { authAction: "login", authName: "openai-chatgpt" }, addEventListener: (_type, cb) => { controls[0].click = cb } }]
  document.querySelectorAll = (selector) => selector === "[data-auth-action]" ? controls : []
  bindAuthRows(); controls[0].click()
  assert.deepEqual(posted.at(-1), { type: "authAction", name: "openai-chatgpt", action: "login", requestId: posted.at(-1).requestId })
  assert.ok(Number.isSafeInteger(posted.at(-1).requestId))
  updateAuthMessage({ type: "authResult", name: "openai-chatgpt", ok: true, remoteRevoked: false })
  assert.match(authRowHtml("openai-chatgpt", {}), /remote revocation was not confirmed/)
  document.querySelectorAll = () => []
})

test("VS Code shares host auth state, preserves config references, and refuses remote loopback login", async () => {
  const dir = mkdtempSync(join(tmpdir(), "vscode-auth-test-"))
  _setConfigPathForTest(join(dir, "config.json"))
  const messages = []
  const panel = { _panel: { webview: { postMessage: (m) => messages.push(m) } }, _pushSettings() {} }
  let signedIn = false
  setAuthService({ dispose() {}, async getStatus() { return { profileId: "account-a", label: "Account A", state: signedIn ? "ready" : "signed_out", planAuthorized: signedIn, refreshToken: "SECRET" } },
    async listProfiles() { return signedIn ? [await this.getStatus()] : [] },
    async beginLogin({ openBrowser }) { await openBrowser("https://auth.openai.com/authorize?id_token_hint=SECRET"); signedIn = true; return { completion: Promise.resolve(await this.getStatus()), cancel() {} } } })
  try {
    addProviderEntry({ preset: "openai-chatgpt" })
    await handleAuthAction(panel, { action: "enable", enabled: true })
    globalThis.__authVscode.remoteName = "ssh-remote"
    await handleAuthAction(panel, { action: "login" })
    assert.equal(opened.length, 0)
    assert.ok(messages.some((m) => m.type === "authResult" && m.ok === false && /local VS Code/.test(m.error)))
    globalThis.__authVscode.remoteName = undefined
    await handleAuthAction(panel, { action: "login" })
    assert.equal(opened.length, 1)
    assert.ok(!JSON.stringify(messages).includes("SECRET"))
    assert.equal(isProviderConfigured("openai-chatgpt"), true)
    persistRaw((raw) => { raw.defaultModel = "openai-chatgpt:catalog-slug"; raw.providers[0].proxy = true })
    const provider = providerFromConfig("openai-chatgpt")
    assert.equal(provider.auth.credentialRef, "account-a")
    assert.equal(provider.model, "catalog-slug")
    assert.equal(provider.format, "responses")
    assert.equal((await storeProviderKey("openai-chatgpt", "not-allowed")).status, "conflict")
    assert.equal(loadRaw().providers[0].apiKey, undefined)
    assert.deepEqual(loadRaw().providers[0].auth, { type: "chatgpt_oauth", enabled: true, credentialRef: "account-a" })
  } finally { _resetConfigPathForTest(); rmSync(dir, { recursive: true, force: true }) }
})

const { pushAuthStatus } = await import("../../src/extension/panel-auth.mjs")
const { fullStatus, lastModelsPayload } = await import("../../src/extension/settings.mjs")
const { _probeWindow, _probeBatch, endProbeWindow, _resetProbeWindowsForTest } = await import("../../src/extension/provider-probe-window.mjs")
const { _setAuthServiceForTest } = await import("@thincoder/core/provider/auth-context.mjs")
const { admissionOf, _resetAdmissionForTest } = await import("@thincoder/core/provider/list-models.mjs")

const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
async function withCatalog(run) {
  const dir = mkdtempSync(join(tmpdir(), "vscode-catalog-test-"))
  const oldFetch = globalThis.fetch
  _setConfigPathForTest(join(dir, "config.json"))
  addProviderEntry({ preset: "openai-chatgpt" })
  persistRaw((raw) => {
    raw.providers[0].auth = { type: "chatgpt_oauth", enabled: true, credentialRef: "account-a" }
    raw.defaultModel = "openai-chatgpt:global-model"
  })
  _setAuthServiceForTest({ async getAuthContext(profileId, { signal }) { return { profileId, accessToken: "SYNTHETIC", signal, release() {} } } })
  _resetAdmissionForTest()
  const messages = [], panel = { webview: { postMessage: (m) => messages.push(m) } }
  try { await run({ panel, messages }) }
  finally {
    globalThis.fetch = oldFetch; _setAuthServiceForTest(null); _resetProbeWindowsForTest(); _resetAdmissionForTest()
    _resetConfigPathForTest(); rmSync(dir, { recursive: true, force: true })
  }
}
const catalogResponse = (slug) => new Response(JSON.stringify({ models: [{ slug, display_name: `Label ${slug}`, visibility: "list" }] }), { status: 200 })

test("VS Code disabled subscription clears candidates and the session-restore catalog cache", async () => withCatalog(async ({ panel, messages }) => {
  globalThis.fetch = async () => catalogResponse("account-a-model")
  await fullStatus(panel)
  assert.deepEqual(lastModelsPayload().map((m) => m.id), ["account-a-model"])
  persistRaw((raw) => { raw.providers[0].auth.enabled = false })
  await fullStatus(panel)
  assert.deepEqual(messages.filter((m) => m.type === "models").at(-1).models, [])
  assert.deepEqual(lastModelsPayload(), [])
}))

test("VS Code stale failed probe cannot overwrite admission after the account changes", async () => withCatalog(async ({ panel }) => {
  const old = deferred(), started = deferred()
  globalThis.fetch = () => { started.resolve(); return old.promise }
  const staleWindow = _probeWindow(panel)
  const pending = _probeBatch(staleWindow, ["openai-chatgpt"])
  await started.promise
  persistRaw((raw) => { raw.providers[0].auth.credentialRef = "account-b" })
  endProbeWindow(panel)
  globalThis.fetch = async () => catalogResponse("account-b-model")
  const current = _probeWindow(panel)
  await _probeBatch(current, ["openai-chatgpt"])
  old.reject(new Error("old account disconnected"))
  await pending
  assert.equal(admissionOf("openai-chatgpt").ok, true)
  assert.equal(staleWindow.diag.size, 0)
  assert.deepEqual(current.models.get("openai-chatgpt").map((m) => m.id), ["account-b-model"])
}))

test("VS Code account changes replace an in-flight catalog and clear its old selectable rows", async () => withCatalog(async ({ panel, messages }) => {
  const old = deferred(), started = deferred()
  globalThis.fetch = () => { started.resolve(); return old.promise }
  const pending = fullStatus(panel)
  await started.promise
  persistRaw((raw) => { raw.providers[0].auth.credentialRef = "account-b" })
  globalThis.fetch = async () => catalogResponse("account-b-model")
  await fullStatus(panel)
  old.resolve(catalogResponse("account-a-model"))
  await pending
  assert.deepEqual(lastModelsPayload().map((m) => m.id), ["account-b-model"])
  assert.ok(!messages.some((m) => m.type === "models" && m.models.some((row) => row.id === "account-a-model")))
}))

test("VS Code session model and local title survive OAuth without an API key", async () => withCatalog(async () => {
  const { resolveTurnStage } = await import("../../src/extension/panel-turn-stages.mjs")
  const { generateTitle } = await import("../../src/extension/generate-title.mjs")
  const panel = { _activeData: () => ({ activeProvider: "openai-chatgpt", activeModel: "session-model" }) }
  const turn = await resolveTurnStage({ panel, turnSlot: 1 })
  assert.equal(turn.done, false)
  assert.equal(turn.p.model, "session-model")
  assert.equal(turn.slotStamp.activeModel, "session-model")
  globalThis.fetch = () => { throw new Error("Title must not use inference") }
  assert.equal(await generateTitle("Repair the settings dialog", "openai-chatgpt"), "Repair the settings dialog")
}))

test("VS Code locks both sign-in controls and ignores a superseded action result", () => {
  const name = "test-duplicate-account"
  const controls = ["login", "loginNew"].map((action) => ({ dataset: { authAction: action, authName: name },
    addEventListener(_type, cb) { this.click = cb } }))
  document.querySelectorAll = (selector) => selector === "[data-auth-action]" ? controls : []
  updateAuthMessage({ type: "authStatus", name, status: { enabled: true, authorizing: false }, profiles: [] })
  bindAuthRows()
  const before = posted.length
  controls[0].click(); controls[1].click()
  assert.equal(posted.length, before + 1)
  assert.equal(controls.every((b) => b.disabled), true)
  const first = posted.at(-1).requestId
  updateAuthMessage({ type: "authStatus", name, status: { enabled: true, authorizing: false }, profiles: [] })
  controls[1].click()
  const second = posted.at(-1).requestId
  updateAuthMessage({ type: "authResult", name, requestId: second, action: "loginNew", ok: true })
  updateAuthMessage({ type: "authResult", name, requestId: first, action: "login", ok: false, error: "stale failure" })
  assert.ok(!authRowHtml(name, { enabled: true }).includes("stale failure"))
  document.querySelectorAll = () => []
})

test("VS Code newer auth snapshot wins when an earlier status read finishes last", async () => withCatalog(async ({ panel, messages }) => {
  const old = deferred(), started = deferred()
  let count = 0
  setAuthService({ dispose() {}, async listProfiles() { return [] }, async getStatus() {
    if (count++ === 0) { started.resolve(); return old.promise }
    return { profileId: "account-a", label: "new label", state: "ready", planAuthorized: true }
  } })
  const pending = pushAuthStatus(panel, "openai-chatgpt")
  await started.promise
  await pushAuthStatus(panel, "openai-chatgpt")
  old.resolve({ profileId: "account-a", label: "stale label", state: "ready", planAuthorized: true })
  await pending
  assert.deepEqual(messages.filter((m) => m.type === "authStatus").map((m) => m.status.label), ["new label"])
}))

test("VS Code malformed config and native browser errors remain sanitized and do not reject refresh", async () => {
  const dir = mkdtempSync(join(tmpdir(), "vscode-auth-error-")), path = join(dir, "config.json")
  const previousOpen = globalThis.__authVscode.openExternal
  const messages = [], target = { webview: { postMessage: (m) => messages.push(m) } }
  _setConfigPathForTest(path)
  writeFileSync(path, '{"SECRET_NATIVE_ERROR":')
  try {
    await pushAuthStatus(target)
    globalThis.__authVscode.openExternal = async () => { throw new Error("SECRET_NATIVE_ERROR https://auth.openai.com/?code=PRIVATE") }
    await handleAuthAction({ _panel: target }, { action: "manage" })
    assert.ok(messages.some((m) => m.type === "authStatus" && m.error))
    assert.ok(messages.some((m) => m.type === "providerError" && m.scope === "panel"))
    assert.ok(!JSON.stringify(messages).includes("SECRET_NATIVE_ERROR"))
    assert.ok(!JSON.stringify(messages).includes("code=PRIVATE"))
  } finally {
    globalThis.__authVscode.openExternal = previousOpen
    _resetConfigPathForTest(); rmSync(dir, { recursive: true, force: true })
  }
})

test("VS Code successful account change surfaces a sanitized follow-up settings failure", async () => withCatalog(async ({ panel, messages }) => {
  setAuthService({ dispose() {}, async listProfiles() { return [] }, async getStatus() { return { profileId: "account-a", state: "ready", planAuthorized: true } }, async resumeProfile() {} })
  await handleAuthAction({ _panel: panel, async _pushSettings() { throw new Error("SECRET_REFRESH_ERROR") } }, { action: "enable", name: "openai-chatgpt", enabled: true })
  await new Promise((resolve) => setImmediate(resolve))
  assert.ok(messages.some((m) => m.type === "authResult" && m.ok === true))
  assert.ok(messages.some((m) => m.type === "providerError" && m.scope === "panel"))
  assert.ok(!JSON.stringify(messages).includes("SECRET_REFRESH_ERROR"))
}))

test("VS Code disabled or unbound saved OAuth session never falls back to the keyed default", async () => withCatalog(async () => {
  const { resolveTurnStage } = await import("../../src/extension/panel-turn-stages.mjs")
  addProviderEntry({ preset: "openai", key: "SYNTHETIC_API_KEY" })
  persistRaw((raw) => { raw.defaultModel = "openai:paid-default" })
  const messages = []
  const panel = { _activeData: () => ({ activeProvider: "openai-chatgpt", activeModel: "session-model" }),
    _panel: { webview: { postMessage: (m) => messages.push(m) } } }
  for (const auth of [
    { type: "chatgpt_oauth", enabled: false, credentialRef: "account-a" },
    { type: "chatgpt_oauth", enabled: true },
  ]) {
    persistRaw((raw) => { raw.providers[0].auth = auth })
    const turn = await resolveTurnStage({ panel, turnSlot: 1 })
    assert.equal(turn.done, true)
    assert.equal(turn.p, undefined)
    assert.equal(messages.at(-1).type, "error")
    assert.equal(messages.at(-1).needsSetup, true)
  }
}))

test("VS Code exposes Cancel immediately and Manage usage does not supersede sign-in errors", () => {
  const name = "test-cancel-before-status"
  const controls = ["login", "manage"].map((action) => ({ dataset: { authAction: action, authName: name },
    addEventListener(_type, cb) { this.click = cb } }))
  document.querySelectorAll = (selector) => selector === "[data-auth-action]" ? controls : []
  updateAuthMessage({ type: "authStatus", name, status: { enabled: true, authorizing: false }, profiles: [] })
  let visible
  bindAuthRows(() => { visible = authRowHtml(name, { enabled: true }) })
  controls[0].click()
  const requestId = posted.at(-1).requestId
  assert.match(visible, /data-auth-action="cancel"/)
  controls[1].click()
  assert.equal(posted.at(-1).requestId, undefined)
  updateAuthMessage({ type: "authResult", name, requestId, action: "login", ok: false, error: "current sign-in failure" })
  assert.match(authRowHtml(name, { enabled: true }), /current sign-in failure/)
  document.querySelectorAll = () => []
})

test("VS Code Manage usage failures do not publish account results or invalidate pending status", async () => withCatalog(async ({ panel, messages }) => {
  const status = deferred(), started = deferred(), oldOpen = globalThis.__authVscode.openExternal
  setAuthService({ dispose() {}, async listProfiles() { return [] }, async getStatus() {
    started.resolve(); return status.promise
  } })
  const pending = pushAuthStatus(panel, "openai-chatgpt")
  await started.promise
  try {
    globalThis.__authVscode.openExternal = async () => false
    await handleAuthAction({ _panel: panel }, { action: "manage", name: "openai-chatgpt" })
    status.resolve({ profileId: "account-a", label: "Current account", state: "ready", planAuthorized: true })
    await pending
    assert.equal(messages.some((m) => m.type === "authResult"), false)
    assert.equal(messages.filter((m) => m.type === "authStatus").length, 1)
    assert.ok(messages.some((m) => m.type === "providerError" && m.scope === "panel" && /browser/.test(m.reason)))
  } finally { globalThis.__authVscode.openExternal = oldOpen }
}))
