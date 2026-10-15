/** Retry only explicit admission failures. An ambiguous sent POST is never replayed. */
import { responsesError, parseRetryAfter } from "./errors.mjs"
import { sleepInterruptible } from "./core.mjs"

export async function requestResponses(request, { provider, signal, onWait, maxAttempts = 3 } = {}) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError")
    let response
    try { response = await request() } catch (error) {
      if (error?.name === "AbortError" || signal?.aborted) throw error
      throw responsesError(provider, { detail: "Responses connection failed after sending may have begun; retry explicitly to avoid duplicate usage" }, { stage: "transport" })
    }
    if (response.ok) return response
    const body = await response.text().catch(() => "Unable to read error response")
    const error = responsesError(provider, body, { status: response.status, requestId: response.headers?.get?.("x-request-id"), stage: "admission" })
    if (!error.retryable || attempt === maxAttempts - 1) throw error
    const header = response.headers?.get?.("retry-after")
    const ms = header != null ? parseRetryAfter(header, attempt) : 2 ** attempt * 1000
    onWait?.({ phase: "retry", seconds: Math.ceil(ms / 1000), code: error.code })
    await sleepInterruptible(ms, signal)
  }
}
