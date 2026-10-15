/** Public account state only. OAuth is owned by the extension host. */
import { vscode } from "./state.js"
import { escHtml } from "./ui.js"
import { t } from "./i18n.js"
const accounts = new Map()

export function authRowHtml(name, auth) {
  const held = accounts.get(name) ?? {}
  const status = held.status ?? { enabled: auth?.enabled === true }
  const action = (value, label, disabled = false) => `<button class="key-btn" data-auth-action="${value}" data-auth-name="${escHtml(name)}" ${disabled ? "disabled" : ""}>${t(label)}</button>`
  const profiles = held.profiles ?? []
  return `<div class="prov-hint" data-auth-provider="${escHtml(name)}">
    <label class="switch"><input type="checkbox" data-auth-enable="${escHtml(name)}" ${status.enabled ? "checked" : ""}> ${t("auth.experimental")}</label>
    <div>${escHtml(status.label || t("auth.signedOut"))} · ${escHtml(status.authorizing ? "authorizing" : status.state || "signed_out")}</div>
    <div>${t(status.planAuthorized ? "auth.authorized" : "auth.notAuthorized")} · ${t(({ completed: "auth.verified", failed: "auth.failed", incomplete: "auth.incomplete" })[status.lastInference?.status] || "auth.unverified")}</div>
    <div>${t("auth.limits")}</div>
    ${action("login", "auth.login", !status.enabled || status.authorizing)}
    ${action("loginNew", "auth.addAccount", !status.enabled || status.authorizing)}
    ${status.authorizing ? action("cancel", "auth.cancel") : ""}
    ${profiles.length ? `<select data-auth-select="${escHtml(name)}" ${!status.enabled ? "disabled" : ""}><option value="">${t("auth.select")}</option>${profiles.map((p) => `<option value="${escHtml(p.profileId)}" ${p.profileId === status.profileId ? "selected" : ""}>${escHtml(p.label || p.profileId)}</option>`).join("")}</select>` : ""}
    ${action("logout", "auth.logout", !status.profileId)} ${action("manage", "auth.manage")}
    ${held.notice ? `<div role="status">${escHtml(held.notice)}</div>` : ""}
  </div>`
}
export function bindAuthRows() {
  const send = (name, action, extra = {}) => vscode.postMessage({ type: "authAction", name, action, ...extra })
  for (const button of document.querySelectorAll("[data-auth-action]")) button.addEventListener("click", () => {
    if (["login", "loginNew"].includes(button.dataset.authAction)) button.disabled = true
    send(button.dataset.authName, button.dataset.authAction)
  })
  for (const input of document.querySelectorAll("[data-auth-enable]")) input.addEventListener("change", () => send(input.dataset.authEnable, "enable", { enabled: input.checked }))
  for (const select of document.querySelectorAll("[data-auth-select]")) select.addEventListener("change", () => { if (select.value) send(select.dataset.authSelect, "select", { profileId: select.value }) })
}
export function updateAuthMessage(message) {
  const held = accounts.get(message.name) ?? {}
  if (message.type === "authStatus") accounts.set(message.name, { ...held,
    ...(message.status ? { status: message.status, profiles: message.profiles } : {}), ...(message.error ? { notice: message.error } : {}) })
  else accounts.set(message.name, { ...held, notice: message.ok === false ? message.error
    : message.remoteRevoked === false ? t("auth.revocationUnknown") : "" })
}
