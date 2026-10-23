/** Local client adapter. Config contains references only; OAuth stays in AuthService. */
import { getAuthService } from "./service.mjs"
import { authError, abortError, safeAuthError } from "./errors.mjs"
import { loadRaw, persistRaw, addProviderEntry } from "../config-io.mjs"

export const PLAN_HELP_URL = "https://chatgpt.com/settings/usage"
const text = (value) => typeof value === "string" ? value : null

/** Deliberate allowlist: never spread credential/service objects over client IPC. */
export function publicAuthStatus(value) {
  const inference = value?.lastInference
  return {
    profileId: text(value?.profileId), label: text(value?.label),
    state: inference?.status === "usage_limited" && inference.sharedPauseSaved !== true ? "usage_limited" : text(value?.state) ?? "signed_out", planAuthorized: value?.planAuthorized === true,
    lastInference: inference && ["completed", "failed", "incomplete"].includes(inference.status)
      ? { status: inference.status, at: Number.isFinite(inference.at) ? inference.at : null, model: text(inference.model) } : null,
  }
}

export function createAuthClient({ service = getAuthService(), read = loadRaw, write = persistRaw, add = addProviderEntry } = {}) {
  const pending = new Map()
  function entry(name = "openai-chatgpt") {
    const value = (read().providers ?? []).find((p) => p?.name === name)
    if (!value || value.auth?.type !== "chatgpt_oauth") throw authError("provider_not_configured", "Add the openai-chatgpt provider first")
    return value
  }
  function patch(name, change) {
    const result = write((raw) => {
      const value = (raw.providers ?? []).find((p) => p?.name === name)
      if (!value || value.auth?.type !== "chatgpt_oauth") throw authError("provider_not_configured", "ChatGPT provider no longer exists")
      change(value)
    })
    if (!result?.ok) throw authError("auth_config_save_failed", "Unable to save the ChatGPT account configuration")
  }
  async function status(name = "openai-chatgpt") {
    const value = entry(name)
    const ref = value.auth.credentialRef
    // Unbound provider must never inherit another client's selected account by accident.
    const snapshot = ref ? await service.getStatus(ref) : { state: "signed_out" }
    return { ...publicAuthStatus(snapshot), provider: name,
      enabled: value.auth.enabled === true, configured: !!ref, source: "ChatGPT plan", helpUrl: PLAN_HELP_URL,
      authorizing: pending.has(name) }
  }
  async function list() {
    return (await service.listProfiles()).map(publicAuthStatus)
  }
  async function run({ action, name = "openai-chatgpt", profileId, enabled, newAccount = false, openBrowser, signal } = {}) {
    if (action === "add") {
      if (name !== "openai-chatgpt") throw authError("invalid_auth_action", "The ChatGPT preset must be added as openai-chatgpt")
      const error = add({ preset: "openai-chatgpt" })
      if (error) throw authError("provider_add_failed", "Unable to add the ChatGPT provider. Check local configuration and try again.")
      return status(name)
    }
    const value = entry(name)
    if (action === "status") return status(name)
    if (action === "list") return { profiles: await list(), ...await status(name) }
    if (action === "cancel") { pending.get(name)?.cancel(); return status(name) }
    if (action === "enable") {
      if (typeof enabled !== "boolean") throw authError("invalid_auth_action", "enabled must be a boolean")
      if (!enabled) pending.get(name)?.cancel()
      patch(name, (p) => { p.auth.enabled = enabled })
      if (enabled && value.auth.credentialRef) await service.resumeProfile(value.auth.credentialRef)
      if (!enabled && value.auth.credentialRef) await service.pauseProfile(value.auth.credentialRef)
      return status(name)
    }
    if (action === "logout") {
      pending.get(name)?.cancel()
      const result = value.auth.credentialRef ? await service.logout(value.auth.credentialRef) : { localSignedOut: true, remoteRevoked: false }
      return { ...await status(name), localSignedOut: result.localSignedOut === true, remoteRevoked: result.remoteRevoked === true }
    }
    if (value.auth.enabled !== true) throw authError("profile_paused", "Enable experimental ChatGPT plan access before signing in or selecting an account")
    if (action === "select") {
      if (typeof profileId !== "string" || !(await list()).some((p) => p.profileId === profileId)) throw authError("profile_not_found", "Unknown ChatGPT account")
      pending.get(name)?.cancel()
      await service.switchProfile(profileId)
      patch(name, (p) => { p.auth.credentialRef = profileId; delete p.apiKey })
      return status(name)
    }
    if (action !== "login") throw authError("invalid_auth_action", "Unknown authentication action")
    if (pending.has(name)) throw authError("login_in_progress", "Sign-in is already in progress; cancel it before trying again")
    if (typeof openBrowser !== "function") throw authError("browser_required", "A system browser is required for sign-in")
    // Claim before async beginLogin so rapid duplicate clicks cannot start two listeners.
    const held = { cancel: () => controller.abort() }
    const controller = new AbortController()
    const abort = () => controller.abort()
    if (signal?.aborted) controller.abort()
    signal?.addEventListener("abort", abort, { once: true })
    pending.set(name, held)
    let login
    try {
      login = await service.beginLogin({ profileId: newAccount ? undefined : value.auth.credentialRef, newAccount, openBrowser, signal: controller.signal })
      held.cancel = () => { controller.abort(); login.cancel() }
      const result = await login.completion
      if (controller.signal.aborted && login.committed !== true) throw abortError()
      if (!result?.profileId) throw authError("invalid_login_result", "Sign-in returned no account reference")
      try {
        patch(name, (p) => {
          if (p.auth.enabled !== true) throw authError("profile_paused", "Experimental access was disabled during sign-in")
          p.auth.credentialRef = result.profileId
          delete p.apiKey
        })
      } catch (error) {
        if (error?.code === "profile_paused") throw error
        throw authError("auth_config_save_failed", "ChatGPT sign-in succeeded, but its account reference could not be saved. Fix local configuration, then select the saved account.")
      }
    } catch (error) {
      if (controller.signal.aborted && login?.committed !== true) throw abortError()
      throw error
    } finally {
      if (pending.get(name) === held) pending.delete(name)
      signal?.removeEventListener("abort", abort)
    }
    return status(name)
  }
  const boundary = operation => async (...args) => {
    try { return await operation(...args) } catch (error) { throw safeAuthError(error) }
  }
  return { status: boundary(status), list: boundary(list), run: boundary(run) }
}
let singleton, singletonService
export function getAuthClient() {
  const service = getAuthService()
  if (singletonService !== service) { singletonService = service; singleton = createAuthClient({ service }) }
  return singleton
}
