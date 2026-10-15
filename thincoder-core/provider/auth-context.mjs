/** Request-scoped credentials: the ordinary provider object never receives OAuth tokens. */
import { assertProviderAuthConfig, isChatGptProvider, OPENAI_RESOURCE } from "./auth-config.mjs"
import { resolveProviderSecrets } from "../env-ref.mjs"

let authServiceOverride = null
export function _setAuthServiceForTest(service) { authServiceOverride = service }
const inference = new Map()
const pausePending = new Map()
export function getInferenceStatus(profileId) { return inference.get(profileId) ?? null }
export function clearInferenceStatus(profileId) { inference.delete(profileId) }
export async function recordProviderInference(provider, result) {
  if (!isChatGptProvider(provider)) return
  const code = result?.code ?? result?.error?.code
  const status = code === "subscription_sharing_usage_limit_exceeded" ? "usage_limited" : result?.terminalStatus ?? "failed"
  const id = provider.auth.credentialRef
  const previous = inference.get(id)
  const localPause = previous?.status === "usage_limited" && previous.sharedPauseSaved !== true
  if (localPause) { await pausePending.get(id); return } // share in-flight persistence; failures remain closed
  const outcome = {
    status, at: Date.now(), model: provider.model,
    ...(result?.requestId ? { requestId: result.requestId } : {}),
    ...(status === "usage_limited" ? { sharedPauseSaved: false } : {}),
  }
  inference.set(id, outcome)
  if (status === "usage_limited") {
    const operation = (async () => {
      const service = authServiceOverride ?? (await import("../auth/service.mjs")).getAuthService()
      try {
        if (service.recordUsageLimit) {
          await service.recordUsageLimit(id)
          outcome.sharedPauseSaved = true // shared metadata now governs cross-client resume
        }
      } catch {
        const error = new Error("ChatGPT usage is paused in this process, but its shared pause could not be saved. Check credential storage before resuming another client.")
        error.code = "subscription_sharing_usage_limit_exceeded"
        throw error
      }
    })()
    pausePending.set(id, operation)
    try { await operation } finally { if (pausePending.get(id) === operation) pausePending.delete(id) }
  }
}

export async function resolveProviderAuth(provider, { signal, path, method = "POST", purpose = "main" } = {}) {
  assertProviderAuthConfig(provider)
  if (!isChatGptProvider(provider)) {
    const resolved = resolveProviderSecrets(provider)
    return {
      url: `${resolved.baseURL.replace(/\/+$/, "")}${path}`,
      headers: { ...(resolved.headers ?? {}), Authorization: `Bearer ${resolved.apiKey ?? ""}` },
      signal, release() {}, binding: `api_key:${provider.name ?? provider.baseURL}`, purpose,
    }
  }
  if (!((path === "/models" && method === "GET") || (path === "/responses" && method === "POST"))) {
    throw new Error("ChatGPT OAuth target is not allowed")
  }
  const outcome = inference.get(provider.auth.credentialRef)
  if (outcome?.status === "usage_limited" && outcome.sharedPauseSaved !== true) {
    const error = new Error("ChatGPT plan app usage is paused after a usage-limit response. Check ChatGPT Settings → Usage and explicitly reselect the account when ready.")
    error.code = "subscription_sharing_usage_limit_exceeded"
    throw error
  }
  const service = authServiceOverride ?? (await import("../auth/service.mjs")).getAuthService()
  const context = await service.getAuthContext(provider.auth.credentialRef, { signal })
  return {
    url: `${OPENAI_RESOURCE}${path}`,
    headers: { Authorization: `Bearer ${context.accessToken}` },
    signal: context.signal, release: () => context.release(),
    binding: context.profileId, purpose,
  }
}
