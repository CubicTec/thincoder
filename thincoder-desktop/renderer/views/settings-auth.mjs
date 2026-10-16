/** Descriptor-only account controls. Public status has no credentials. */
import { t } from "../i18n.mjs"
import { wire } from "./chat-tool.mjs"
export function authRowNode(row, handlers) {
  const status = row.authStatus ?? {}
  const authorizing = row.authBusy === true || status.authorizing === true
  const mutating = row.authMutating === true
  const act = (action, extra) => handlers.onAuthAction?.(row.name, action, extra)
  const button = (action, key, disabled = false) => ({ tag: "button", props: wire({ type: "button", class: "settings-row-action",
    "data-auth-action": action, disabled }, disabled ? undefined : () => act(action)), children: [t(key)] })
  return { tag: "div", props: { class: "settings-row", "data-auth-provider": row.name }, children: [
    { tag: "label", props: { class: "settings-field-label" }, children: [
      { tag: "input", props: { type: "checkbox", checked: status.enabled === true, disabled: mutating, "data-auth-enable": row.name,
        onChange: (event) => act("enable", { enabled: event.target.checked === true }) } }, t("auth.experimental")] },
    { tag: "div", children: [`${status.label || t("auth.signedOut")} · ${authorizing ? "authorizing" : status.state || "signed_out"}`] },
    { tag: "div", children: [t(status.planAuthorized ? "auth.authorized" : "auth.notAuthorized"), " · ",
      t(({ completed: "auth.verified", failed: "auth.failed", incomplete: "auth.incomplete" })[status.lastInference?.status] || "auth.unverified")] },
    { tag: "div", children: [t("auth.limits")] },
    button("login", "auth.login", !status.enabled || authorizing || mutating),
    button("loginNew", "auth.addAccount", !status.enabled || authorizing || mutating),
    authorizing ? button("cancel", "auth.cancel") : null,
    row.authProfiles?.length ? { tag: "select", props: { "data-auth-select": row.name, disabled: !status.enabled || mutating,
      onChange: (event) => { if (event.target.value) act("select", { profileId: event.target.value }) } }, children: [
      { tag: "option", props: { value: "" }, children: [t("auth.select")] },
      ...row.authProfiles.map((p) => ({ tag: "option", props: { value: p.profileId, selected: p.profileId === status.profileId }, children: [p.label || p.profileId] }))] } : null,
    button("logout", "auth.logout", !status.profileId || mutating), button("manage", "auth.manage"),
    row.authNotice ? { tag: "div", props: { role: "status" }, children: [row.authNotice] } : null,
  ] }
}
