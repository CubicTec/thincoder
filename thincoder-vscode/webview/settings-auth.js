/** Public account state only. OAuth is owned by the extension host. */
import { vscode } from "./state.js"
import { escHtml } from "./ui.js"
import { t } from "./i18n.js"
const accounts = new Map()
let requestSequence = 0

/** Provider identity belongs to the current config, not a previous row instance. */
export function syncAuthProviders(providers = {}) {
  for (const name of accounts.keys()) if (providers[name]?.auth?.type !== "chatgpt_oauth") accounts.delete(name)
  for (const [name, provider] of Object.entries(providers)) {
    if (provider.auth?.type !== "chatgpt_oauth") continue
    const held = accounts.get(name) ?? {}, configRef = provider.auth.credentialRef || ""
    const changed = held.configRef !== undefined && held.configRef !== configRef
    accounts.set(name, { ...held, configRef, ...(changed ? { status: undefined } : {}) })
  }
}

export function authRowHtml(name, auth) {
  const held = accounts.get(name) ?? {}
  const status = { ...(held.status ?? {}), ...(typeof auth?.enabled === "boolean" ? { enabled: auth.enabled } : {}) }
  const authorizing = held.pendingLogin === true || status.authorizing === true
  const action = (value, label, disabled = false) => `<button class="key-btn" data-auth-action="${value}" data-auth-name="${escHtml(name)}" ${disabled ? "disabled" : ""}>${t(label)}</button>`
  const profiles = held.profiles ?? []
  return `<div class="prov-hint" data-auth-provider="${escHtml(name)}">
    <label class="switch"><input type="checkbox" data-auth-enable="${escHtml(name)}" ${status.enabled ? "checked" : ""}> ${t("auth.experimental")}</label>
    <div>${escHtml(status.label || t("auth.signedOut"))} · ${escHtml(authorizing ? "authorizing" : status.state || "signed_out")}</div>
    <div>${t(status.planAuthorized ? "auth.authorized" : "auth.notAuthorized")} · ${t(({ completed: "auth.verified", failed: "auth.failed", incomplete: "auth.incomplete" })[status.lastInference?.status] || "auth.unverified")}</div>
    <div>${t("auth.limits")}</div>
    ${action("login", "auth.login", !status.enabled || authorizing)}
    ${action("loginNew", "auth.addAccount", !status.enabled || authorizing)}
    ${authorizing ? action("cancel", "auth.cancel") : ""}
    ${profiles.length ? `<select data-auth-select="${escHtml(name)}" ${!status.enabled ? "disabled" : ""}><option value="">${t("auth.select")}</option>${profiles.map((p) => `<option value="${escHtml(p.profileId)}" ${p.profileId === status.profileId ? "selected" : ""}>${escHtml(p.label || p.profileId)}</option>`).join("")}</select>` : ""}
    ${action("logout", "auth.logout", !status.profileId)} ${action("manage", "auth.manage")}
    ${held.notice ? `<div role="status">${escHtml(held.notice)}</div>` : ""}
  </div>`
}
export function bindAuthRows(onChange) {
  const send = (name, action, extra = {}) => {
    if (action === "manage") { vscode.postMessage({ type: "authAction", name, action }); return }
    const held = accounts.get(name) ?? {}
    const login = action === "login" || action === "loginNew"
    if (login && (held.pendingLogin || held.status?.authorizing)) return
    const requestId = ++requestSequence
    accounts.set(name, { ...held, requestId, ...(login ? { pendingLogin: true } : {}), notice: "" })
    if (login) for (const button of document.querySelectorAll("[data-auth-action]")) {
      if (button.dataset.authName === name && ["login", "loginNew"].includes(button.dataset.authAction)) button.disabled = true
    }
    onChange?.() // make Cancel available before any asynchronous host status read
    vscode.postMessage({ type: "authAction", name, action, requestId, ...extra })
  }
  for (const button of document.querySelectorAll("[data-auth-action]")) button.addEventListener("click", () => {
    send(button.dataset.authName, button.dataset.authAction)
  })
  for (const input of document.querySelectorAll("[data-auth-enable]")) input.addEventListener("change", () => send(input.dataset.authEnable, "enable", { enabled: input.checked }))
  for (const select of document.querySelectorAll("[data-auth-select]")) select.addEventListener("change", () => { if (select.value) send(select.dataset.authSelect, "select", { profileId: select.value }) })
}
export function updateAuthMessage(message) {
  const held = accounts.get(message.name) ?? {}
  if (message.type === "authStatus") accounts.set(message.name, { ...held,
    ...(message.status ? { status: message.status, profiles: message.profiles, pendingLogin: message.status.authorizing === true } : {}),
    ...(message.error ? { pendingLogin: false, status: { ...held.status, authorizing: false, state: "temporarily_unavailable" }, notice: message.error } : {}) })
  else if (message.requestId === undefined || message.requestId === held.requestId) accounts.set(message.name, { ...held,
    ...(["login", "loginNew"].includes(message.action) ? { pendingLogin: false } : {}), notice: message.ok === false ? message.error
    : message.remoteRevoked === false ? t("auth.revocationUnknown") : message.action === "cancel" ? t("auth.cancelled") : "" })
}
