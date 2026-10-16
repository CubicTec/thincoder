import { hasProviderCredentials } from "@thincoder/core/provider/auth-config.mjs"

/** Config-only gate; credential liveness/scope is still checked per request. */
export function isConfiguredProvider(provider) {
  return [provider?.name, provider?.model, provider?.baseURL].every((v) => typeof v === "string" && v.trim())
    && hasProviderCredentials(provider)
}
