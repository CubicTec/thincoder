/** Auth-specific Responses policy, verified against OpenAI SIWC preview 2026-10-15.
 * Source: https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations
 * This snapshot is an internal policy, not an API version or request header. */
import { ProviderError } from "./errors.mjs"
import { isChatGptProvider } from "./auth-config.mjs"

export const SIWC_POLICY = "siwc-2026-10-15"
export const SIWC_UNSUPPORTED_FIELDS = Object.freeze([
  "background", "conversation", "max_output_tokens", "max_tool_calls", "metadata",
  "moderation", "multi_agent", "prompt", "prompt_cache_retention", "safety_identifier",
  "temperature", "top_logprobs", "top_p", "truncation", "user", "previous_response_id",
])

export function capabilityError(provider, param, message) {
  return new ProviderError(provider, message, {
    code: "subscription_sharing_unsupported_capability", param,
    stage: "configuration", retryClass: "never", retryable: false,
  })
}

/** Reject explicit unsupported configuration before acquiring credentials or sending. */
export function validateResponsesConfig(provider, opts = {}) {
  if (!isChatGptProvider(provider)) return
  for (const field of SIWC_UNSUPPORTED_FIELDS) {
    if (provider[field] !== undefined || opts[field] !== undefined) {
      throw capabilityError(provider, field, `${field} is unsupported for ChatGPT plan HTTP Responses`)
    }
  }
  if (provider.maxTokens != null) throw capabilityError(provider, "max_output_tokens", "maxTokens is unsupported for ChatGPT plan usage; remove this output limit")
  if (provider.stateful === true || opts.stateful === true || provider.store === true || provider.stream === false) {
    throw capabilityError(provider, "store", "ChatGPT plan HTTP requests require stateless store:false and stream:true")
  }
  if (provider.builtinTools === true || (Array.isArray(provider.builtinTools) && provider.builtinTools.length)) {
    throw capabilityError(provider, "tools", "Hosted tools have not been enabled for ThinCoder ChatGPT plan usage")
  }
}

export function validateResponsesBody(provider, body) {
  if (!isChatGptProvider(provider)) return
  for (const field of SIWC_UNSUPPORTED_FIELDS) {
    if (Object.hasOwn(body, field)) throw capabilityError(provider, field, `Unsupported Responses field: ${field}`)
  }
  if (body.store !== false || body.stream !== true || !Array.isArray(body.input)) {
    throw capabilityError(provider, "input", "ChatGPT plan HTTP requires an input array, store:false and stream:true")
  }
  if (body.input.some((item) => item.role === "system")) {
    throw capabilityError(provider, "input", "Use instructions or developer messages instead of system input items")
  }
  if (body.input.some((item) => item.type === "web_search_call")) {
    throw capabilityError(provider, "input", "Hosted tool replay is not enabled for ChatGPT plan usage")
  }
  if (body.tools?.some((tool) => tool.type !== "namespace" || tool.tools?.some((t) => t.type !== "function"))) {
    throw capabilityError(provider, "tools", "Local functions must be grouped in namespaces")
  }
}
