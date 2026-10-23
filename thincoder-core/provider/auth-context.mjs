/** Request-scoped credentials: the ordinary provider object never receives OAuth tokens. */
import { assertProviderAuthConfig, isChatGptProvider, OPENAI_RESOURCE } from "./auth-config.mjs"
import { resolveProviderSecrets } from "../env-ref.mjs"
import { getAuthService } from "../auth/service.mjs"

let authServiceOverride = null
export function _setAuthServiceForTest(service) { authServiceOverride = service }
const authService = () => authServiceOverride ?? getAuthService()

/** Project a request outcome onto its account; account state belongs to AuthService. */
export async function recordProviderInference(provider, result) {
  if (!isChatGptProvider(provider) || !provider.auth.credentialRef) return
  const code = result?.code ?? result?.error?.code
  const status = code === "subscription_sharing_usage_limit_exceeded" ? "usage_limited" : result?.terminalStatus ?? "failed"
  await authService().recordInference(provider.auth.credentialRef, {
    status, model: provider.model,
    ...(result?.requestId ? { requestId: result.requestId } : {}),
  })
}

export async function resolveProviderAuth(provider, { signal, path, method = "POST", purpose = "main" } = {}) {
  provider = { ...provider, ...(provider.auth ? { auth: { ...provider.auth } } : {}) }
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
  const service = authService()
  const context = await service.getAuthContext(provider.auth.credentialRef, { signal })
  try {
    return {
      url: `${OPENAI_RESOURCE}${path}`,
      headers: { Authorization: `Bearer ${context.accessToken}` },
      signal: context.signal, release: () => context.release(),
      binding: context.profileId, purpose,
    }
  } catch (error) { context.release(); throw error }
}
