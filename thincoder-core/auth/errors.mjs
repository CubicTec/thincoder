/** Authentication errors are safe to show: never include URLs, forms, or server bodies. */
export class AuthError extends Error {
  constructor(code, message, { state = 'temporarily_unavailable', retryable = false, status } = {}) {
    super(message)
    this.name = 'AuthError'
    this.code = code
    this.state = state
    this.retryable = retryable
    if (status !== undefined) this.status = status
  }
}
export const authError = (code, message, options) => new AuthError(code, message, options)
export const abortError = () => new DOMException('Authentication operation cancelled', 'AbortError')
export function checkSignal(signal) { if (signal?.aborted) throw abortError() }
