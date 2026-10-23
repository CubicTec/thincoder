/** Request identity for native replay and in-flight ownership; never retain plaintext keys. */
import { createHash } from "node:crypto"
import { resolveProviderSecrets } from "../env-ref.mjs"
import { isChatGptProvider } from "./auth-config.mjs"

export const responsesProfileBinding = (provider) => isChatGptProvider(provider)
  ? provider.auth.credentialRef : `api_key:${provider.name ?? provider.baseURL}`

export function responsesCredentialBinding(provider) {
  if (isChatGptProvider(provider)) return responsesProfileBinding(provider)
  const resolved = resolveProviderSecrets(provider)
  return createHash("sha256").update(JSON.stringify({ apiKey: resolved.apiKey, headers: resolved.headers })).digest("hex")
}
