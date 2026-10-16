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

/** Native browser, filesystem and connector errors may echo sensitive values. */
export function safeAuthError(error) {
  if (error instanceof AuthError) return error
  if (error?.name === 'AbortError') return abortError()
  return authError('auth_operation_failed', 'The ChatGPT account operation could not be completed. Check local configuration and credential storage, then try again.')
}
