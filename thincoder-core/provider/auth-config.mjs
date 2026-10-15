/** Authentication references are configuration; tokens are never provider fields. */
export const OPENAI_RESOURCE = "https://api.openai.com/v1"
export const isChatGptProvider = (provider) => provider?.auth?.type === "chatgpt_oauth"

export function normalizeProviderAuth(auth) {
  if (auth === undefined) return undefined
  if (!auth || typeof auth !== "object" || Array.isArray(auth)) throw new Error("provider auth must be an object")
  const allowed = auth.type === "api_key" ? ["type"] : ["type", "credentialRef", "enabled"]
  if (!["api_key", "chatgpt_oauth"].includes(auth.type)) throw new Error("provider auth.type must be api_key or chatgpt_oauth")
  if (Object.keys(auth).some((key) => !allowed.includes(key))) throw new Error("provider auth accepts references only; token or unknown fields are forbidden")
  if (auth.type === "api_key") return { type: "api_key" }
  if (auth.enabled !== undefined && typeof auth.enabled !== "boolean") throw new Error("provider auth.enabled must be boolean")
  if (auth.credentialRef !== undefined && (typeof auth.credentialRef !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(auth.credentialRef))) {
    throw new Error("provider auth.credentialRef must be an opaque profile ID")
  }
  return { type: "chatgpt_oauth", enabled: auth.enabled === true, ...(auth.credentialRef ? { credentialRef: auth.credentialRef } : {}) }
}

export function assertProviderAuthConfig(provider, { requireReady = true } = {}) {
  const auth = normalizeProviderAuth(provider?.auth)
  if (auth?.type !== "chatgpt_oauth") return
  if (provider.apiKey) throw new Error("ChatGPT OAuth and API key credentials cannot be combined")
  if (provider.format !== "responses") throw new Error("ChatGPT plan usage requires format: responses")
  if (typeof provider.baseURL !== "string" || provider.baseURL.replace(/\/+$/, "") !== OPENAI_RESOURCE) {
    throw new Error("ChatGPT OAuth requires the official https://api.openai.com/v1 endpoint")
  }
  if (provider.headers && Object.keys(provider.headers).length) throw new Error("Custom provider headers are not allowed with ChatGPT OAuth")
  if (provider.chatPath !== undefined) throw new Error("ChatGPT OAuth does not allow chatPath overrides")
  if (requireReady && !auth.enabled) throw new Error("ChatGPT plan integration is disabled; enable it explicitly in account settings")
  if (requireReady && !auth.credentialRef) throw new Error("Sign in with ChatGPT first; no account is selected")
}

/** Pure configuration readiness, never a claim that OAuth scope/inference is verified. */
export function hasProviderCredentials(provider) {
  if (!isChatGptProvider(provider)) return typeof provider?.apiKey === "string" && provider.apiKey.trim() !== ""
  try { assertProviderAuthConfig(provider); return true } catch { return false }
}
