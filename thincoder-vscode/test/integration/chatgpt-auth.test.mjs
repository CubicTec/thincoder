import test from "node:test"
import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import { readFileSync, mkdtempSync, rmSync } from "node:fs"
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
  assert.deepEqual(posted.at(-1), { type: "authAction", name: "openai-chatgpt", action: "login" })
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
