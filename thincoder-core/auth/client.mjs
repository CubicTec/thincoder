/** Local client adapter. Config contains references only; OAuth stays in AuthService. */
import { getAuthService } from "./service.mjs"
import { loadRaw, persistRaw, addProviderEntry } from "../config-io.mjs"
import { getInferenceStatus, clearInferenceStatus } from "../provider/auth-context.mjs"

export const PLAN_HELP_URL = "https://chatgpt.com/settings/usage"
const text = (value) => typeof value === "string" ? value : null

/** Deliberate allowlist: never spread credential/service objects over client IPC. */
export function publicAuthStatus(value, inference = null) {
  return {
    profileId: text(value?.profileId), label: text(value?.label),
    state: inference?.status === "usage_limited" ? "usage_limited" : text(value?.state) ?? "signed_out", planAuthorized: value?.planAuthorized === true,
    lastInference: inference && ["completed", "failed", "incomplete"].includes(inference.status)
      ? { status: inference.status, at: inference.at, model: text(inference.model) } : null,
  }
}

/** Human evidence is intentionally distinct: configuration, scope and completed inference. */
export function authStatusText(value) {
  if (!value?.enabled) return "Experimental ChatGPT plan access is disabled"
  if (!value?.profileId) return "Not signed in"
  if (!value.planAuthorized) return `${value.label || value.profileId}: ${value.state === "signed_in_without_plan_scope" ? "signed in; plan use not authorized" : value.state}`
  const last = value.lastInference?.status
  return `${value.label || value.profileId}: ${value.state}; plan use authorized; ${last ? `last inference ${last}` : "inference not verified"}`
}

export function createAuthClient({ service = getAuthService(), read = loadRaw, write = persistRaw, add = addProviderEntry,
  inference = getInferenceStatus, clearInference = clearInferenceStatus } = {}) {
  const pending = new Map()
  function entry(name = "openai-chatgpt") {
    const value = (read().providers ?? []).find((p) => p?.name === name)
    if (!value || value.auth?.type !== "chatgpt_oauth") throw new Error("Add the openai-chatgpt provider first")
    return value
  }
  function patch(name, change) {
    const result = write((raw) => {
      const value = (raw.providers ?? []).find((p) => p?.name === name)
      if (!value || value.auth?.type !== "chatgpt_oauth") throw new Error("ChatGPT provider no longer exists")
      change(value)
    })
    if (!result?.ok) throw new Error(result?.reason || "Unable to save authentication reference")
  }
  async function status(name = "openai-chatgpt") {
    const value = entry(name)
    const ref = value.auth.credentialRef
    // Unbound provider must never inherit another client's selected account by accident.
    const snapshot = ref ? await service.getStatus(ref) : { state: "signed_out" }
    return { ...publicAuthStatus(snapshot, ref ? inference(ref) : null), provider: name,
      enabled: value.auth.enabled === true, configured: !!ref, source: "ChatGPT plan", helpUrl: PLAN_HELP_URL,
      authorizing: pending.has(name) }
  }
  async function list() {
    return (await service.listProfiles()).map((p) => publicAuthStatus(p, inference(p.profileId)))
  }
  async function run({ action, name = "openai-chatgpt", profileId, enabled, newAccount = false, openBrowser, signal } = {}) {
    if (action === "add") {
      const error = add({ preset: "openai-chatgpt" })
      if (error) throw new Error(error)
      return status(name)
    }
    const value = entry(name)
    if (action === "status") return status(name)
    if (action === "list") return { profiles: await list(), ...await status(name) }
    if (action === "cancel") { pending.get(name)?.cancel(); return status(name) }
    if (action === "enable") {
      if (typeof enabled !== "boolean") throw new Error("enabled must be a boolean")
      if (!enabled) pending.get(name)?.cancel()
      if (enabled && value.auth.credentialRef) { await service.resumeProfile(value.auth.credentialRef); clearInference(value.auth.credentialRef) }
      patch(name, (p) => { p.auth.enabled = enabled })
      if (!enabled && value.auth.credentialRef) await service.pauseProfile(value.auth.credentialRef)
      return status(name)
    }
    if (action === "logout") {
      pending.get(name)?.cancel()
      const result = value.auth.credentialRef ? await service.logout(value.auth.credentialRef) : { localSignedOut: true, remoteRevoked: false }
      if (value.auth.credentialRef) clearInference(value.auth.credentialRef)
      return { ...await status(name), localSignedOut: result.localSignedOut === true, remoteRevoked: result.remoteRevoked === true }
    }
    if (value.auth.enabled !== true) throw new Error("Enable experimental ChatGPT plan access before signing in or selecting an account")
    if (action === "select") {
      if (typeof profileId !== "string" || !(await list()).some((p) => p.profileId === profileId)) throw new Error("Unknown ChatGPT account")
      pending.get(name)?.cancel()
      await service.switchProfile(profileId)
      clearInference(profileId)
      patch(name, (p) => { p.auth.credentialRef = profileId; delete p.apiKey })
      return status(name)
    }
    if (action !== "login") throw new Error("Unknown authentication action")
    if (pending.has(name)) throw new Error("Sign-in is already in progress; cancel it before trying again")
    if (typeof openBrowser !== "function") throw new Error("A system browser is required for sign-in")
    // Claim before async beginLogin so rapid duplicate clicks cannot start two listeners.
    const held = { cancel: () => controller.abort() }
    const controller = new AbortController()
    const abort = () => controller.abort()
    if (signal?.aborted) controller.abort()
    signal?.addEventListener("abort", abort, { once: true })
    pending.set(name, held)
    try {
      const login = await service.beginLogin({ profileId: newAccount ? undefined : value.auth.credentialRef, newAccount, openBrowser, signal: controller.signal })
      held.cancel = () => { controller.abort(); login.cancel() }
      const result = await login.completion
      if (controller.signal.aborted) throw new Error("Sign-in cancelled")
      if (!result?.profileId) throw new Error("Sign-in returned no account reference")
      clearInference(result.profileId)
      patch(name, (p) => {
        if (p.auth.enabled !== true) throw new Error("Experimental access was disabled during sign-in")
        p.auth.credentialRef = result.profileId
        delete p.apiKey
      })
    } finally {
      if (pending.get(name) === held) pending.delete(name)
      signal?.removeEventListener("abort", abort)
    }
    return status(name)
  }
  return { status, list, run }
}
let singleton
export function getAuthClient() { return singleton ??= createAuthClient() }
