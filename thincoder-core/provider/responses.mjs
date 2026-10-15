/** Responses transport: auth-bound requests, lossless replay and strict SSE terminal gate. */
import { effectiveFetchTimeoutMs } from "./core.mjs"
import { proxyFetch } from "../proxy.mjs"
import { rateGate, recordRate, estimateRequestTokens } from "./rate.mjs"
import { buildBody } from "./responses-request.mjs"
import { resolveProviderAuth } from "./auth-context.mjs"
import { isChatGPTProvider, responsesProfileBinding } from "./capabilities.mjs"
import { requestResponses } from "./responses-http.mjs"
import { ProviderError } from "./errors.mjs"
import { parseStream } from "./responses-stream.mjs"
export { parseStream } from "./responses-stream.mjs"
export { buildBody, isStoreRequiredHost, builtinToolsFor } from "./responses-request.mjs"

/** Only a named lost reference can justify full replay; generic 400/404 is insufficient. */
export function isChainInvalidError(error) {
  return !!error && [400, 404].includes(error.status)
    && ["previous_response_not_found", "previous_response_id_not_found", "response_not_found"].includes(error.code)
    && (error.param === "previous_response_id" || error.code.startsWith("previous_response_"))
}

export async function chat(provider, opts = {}) {
  const { messages = [], onToken, onReasoning, onWait, signal, purpose = "main" } = opts
  let built = buildBody(provider, messages, opts.tools, opts)
  const auth = await resolveProviderAuth(provider, { signal, purpose, path: "/responses", method: "POST" })
  const requestSignal = auth.signal ?? signal
  try {
    if (auth.binding !== responsesProfileBinding(provider)) throw new ProviderError(provider, "Request authentication binding changed", { stage: "authentication", retryClass: "never" })
    const estimated = estimateRequestTokens({ messages, tools: opts.tools })
    await rateGate(provider, estimated, onWait, requestSignal)
    const headers = { ...auth.headers, "Content-Type": "application/json" }
    const send = (body) => requestResponses(() => proxyFetch(auth.url ?? `${provider.baseURL.replace(/\/+$/, "")}/responses`, {
      method: "POST", headers, body: JSON.stringify(body), signal: requestSignal,
      redirect: "error", _headerTimeoutMs: effectiveFetchTimeoutMs(provider), _bodyIdleMs: 120_000,
    }, provider.proxyUri), { provider, signal: requestSignal, onWait })
    let response
    try {
      response = await send({ ...built.body, ...(built.previousResponseId ? { previous_response_id: built.previousResponseId } : {}) })
    } catch (error) {
      if (isChatGPTProvider(provider) || !built.previousResponseId || !isChainInvalidError(error)) throw error
      provider._responsesChain = null
      built = buildBody(provider, messages, opts.tools, opts)
      response = await send(built.body)
    }
    const official = new URL(provider.baseURL).hostname === "api.openai.com"
    const result = await parseStream(response, { onToken, onReasoning, signal: requestSignal, provider, toolMapping: built.toolMapping,
      allowResponseDone: !isChatGPTProvider(provider) && !official })
    recordRate(provider, estimated, result.usage)
    provider._responsesChain = result.terminalStatus === "completed" && built.newChain && result.responseId
      ? { ...built.newChain, id: result.responseId } : null
    result._warnings = [...built.warnings, ...(result._warnings ?? [])]
    result.profileBinding = responsesProfileBinding(provider)
    result.billingSource = isChatGPTProvider(provider) ? "chatgpt_plan" : "api_key"
    if (result.terminalStatus === "completed") result.responsesReplay = {
      schemaVersion: 1, profileBinding: responsesProfileBinding(provider), modelBinding: provider.model,
      endpointBinding: provider.baseURL.replace(/\/+$/, ""),
      orderedReplayableItems: [...built.fullInput, ...result.outputItems], messageCount: messages.length,
      lastTerminalStatus: "completed",
    }
    return result
  } finally { auth.release?.() }
}
