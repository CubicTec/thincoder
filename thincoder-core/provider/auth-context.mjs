/** Request-scoped credentials: the ordinary provider object never receives OAuth tokens. */
import { assertProviderAuthConfig, isChatGptProvider, OPENAI_RESOURCE } from "./auth-config.mjs"
import { resolveProviderSecrets } from "../env-ref.mjs"

let authServiceOverride = null
export function _setAuthServiceForTest(service) { authServiceOverride = service }
const inference = new Map()
export function getInferenceStatus(profileId) { return inference.get(profileId) ?? null }
export function clearInferenceStatus(profileId) { inference.delete(profileId) }
export function recordProviderInference(provider, result) {
  if (!isChatGptProvider(provider)) return
  const code = result?.code ?? result?.error?.code
  const status = code === "subscription_sharing_usage_limit_exceeded" ? "usage_limited" : result?.terminalStatus ?? "failed"
  inference.set(provider.auth.credentialRef, {
    status, at: Date.now(), model: provider.model,
    ...(result?.requestId ? { requestId: result.requestId } : {}),
  })
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
  if (inference.get(provider.auth.credentialRef)?.status === "usage_limited") {
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
