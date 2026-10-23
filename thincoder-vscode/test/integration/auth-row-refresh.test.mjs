import test, { after } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { GlobalRegistrator } from "@happy-dom/global-registrator"

GlobalRegistrator.register()
const posted = []
globalThis.acquireVsCodeApi = () => ({ postMessage: (message) => posted.push(message), getState() {}, setState() {} })
document.body.innerHTML = readFileSync(new URL("../../webview/index.html", import.meta.url), "utf8")
  .match(/<body>([\s\S]*)<\/body>/)[1].replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "")

const { setStrings } = await import("../../webview/i18n.js")
setStrings(JSON.parse(readFileSync(new URL("../../locales/en.json", import.meta.url), "utf8")))
const { SS } = await import("../../webview/settings-state.js")
const { syncAuthProviders, updateAuthMessage } = await import("../../webview/settings-auth.js")
const { providersCardHtml, bindAddProviderForm, installProviderHandlers } = await import("../../webview/settings-providers.js")
const { initMessageLoop } = await import("../../webview/chat-messages.js")
initMessageLoop({})
installProviderHandlers()
after(async () => {
  window.dispatchEvent(new Event("unload"))
  await GlobalRegistrator.unregister()
})

const accountRow = (name = "chatgpt-a") => [...document.querySelectorAll("[data-auth-provider]")].find((row) => row.dataset.authProvider === name)
const action = (name, kind) => accountRow(name).querySelector(`[data-auth-action="${kind}"]`)
const receive = (message) => window.dispatchEvent(new MessageEvent("message", { data: message }))

function setup() {
  posted.length = 0
  syncAuthProviders({})
  SS.providerStatus = { providers: {
    openai: { configured: true, masked: "sk-****" },
    "chatgpt-a": { auth: { type: "chatgpt_oauth", enabled: true } },
    "chatgpt-b": { auth: { type: "chatgpt_oauth", enabled: true } },
  } }
  syncAuthProviders(SS.providerStatus.providers)
  for (const name of ["chatgpt-a", "chatgpt-b"]) updateAuthMessage({ type: "authStatus", name,
    status: { enabled: true, authorizing: false, state: "signed_out" }, profiles: [] })
  const panel = document.getElementById("settings-panel")
  panel.style.display = "flex"
  panel.innerHTML = providersCardHtml()
  bindAddProviderForm()
  window._editKey("openai")
  const draft = document.querySelector("#rowline-openai input[type=password]")
  draft.value = "unsaved-key-draft"
  draft.focus()
  return { draft, card: document.getElementById("providers-card"), peer: accountRow("chatgpt-b") }
}

function assertDraftSurvives({ draft, card, peer }) {
  assert.ok(document.querySelector("#rowline-openai input[type=password]") === draft, "the edited API-key input survives")
  assert.equal(draft.value, "unsaved-key-draft")
  assert.ok(document.getElementById("providers-card") === card, "the provider card survives")
  assert.ok(accountRow("chatgpt-b") === peer, "the other account row survives")
}

test("VS Code account status and errors update their row while API-key drafts survive", () => {
  const refs = setup()
  receive({ type: "authStatus", name: "chatgpt-a", status: { enabled: true, label: "Current account", state: "ready" }, profiles: [] })
  assertDraftSurvives(refs)
  assert.ok(document.activeElement === refs.draft, "the API-key input keeps focus")
  assert.match(accountRow().textContent, /Current account/)
  receive({ type: "authResult", name: "chatgpt-a", action: "logout", ok: false, error: "Account operation failed" })
  assertDraftSurvives(refs)
  assert.match(accountRow().textContent, /Account operation failed/)
})

test("VS Code ignores stale auth receipts without replacing the account row", () => {
  const refs = setup()
  action("chatgpt-a", "login").click()
  const requestId = posted.at(-1).requestId
  const current = accountRow()
  receive({ type: "authResult", name: "chatgpt-a", action: "login", requestId: requestId - 1, ok: false, error: "Stale failure" })
  assert.ok(accountRow() === current, "a stale receipt does not replace the account row")
  assertDraftSurvives(refs)
  assert.doesNotMatch(accountRow().textContent, /Stale failure/)
  assert.ok(action("chatgpt-a", "cancel"))
})

test("VS Code immediate Cancel and Manage keep login generation and other controls intact", () => {
  const refs = setup()
  action("chatgpt-a", "login").click()
  const login = posted.at(-1)
  assert.equal(login.action, "login")
  assert.ok(action("chatgpt-a", "cancel"), "Cancel is available before the host replies")
  assert.equal(action("chatgpt-a", "login").disabled, true)
  assert.equal(action("chatgpt-a", "loginNew").disabled, true)
  action("chatgpt-a", "loginNew").click()
  assert.equal(posted.length, 1, "the concurrent sign-in is blocked")
  action("chatgpt-a", "manage").click()
  assert.deepEqual(posted.at(-1), { type: "authAction", name: "chatgpt-a", action: "manage" })
  receive({ type: "authResult", name: "chatgpt-a", action: "login", requestId: login.requestId, ok: false, error: "Current sign-in failure" })
  assert.match(accountRow().textContent, /Current sign-in failure/)
  action("chatgpt-a", "loginNew").click()
  action("chatgpt-a", "cancel").click()
  assert.equal(posted.at(-1).action, "cancel")
  assert.ok(posted.at(-1).requestId > login.requestId)
  assertDraftSurvives(refs)
  const beforeManage = posted.length
  action("chatgpt-b", "manage").click()
  assert.equal(posted.length, beforeManage + 1, "refreshing one row must not rebind its sibling")
})
