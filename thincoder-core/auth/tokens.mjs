import { randomUUID } from 'node:crypto'
import { authError } from './errors.mjs'

const bearer = value => typeof value === 'string' && value.length > 0 && value.length <= 65536 && /^[A-Za-z0-9\-._~+/]+=*$/.test(value)
const opaque = value => typeof value === 'string' && value.length > 0 && value.length <= 65536 && !/[\s\x00-\x1f\x7f]/.test(value)
const scope = value => typeof value === 'string' && /^[\x21\x23-\x5b\x5d-\x7e]+$/.test(value)

/** Saved JSON is untrusted input too; corrupted metadata must fail closed. */
export function assertTokenSet(value) {
  if (!value || !bearer(value.accessToken) || value.tokenType !== 'Bearer' ||
      !Number.isSafeInteger(value.expiresAt) || value.expiresAt <= 0 ||
      !Array.isArray(value.scopes) || value.scopes.some(item => !scope(item)) ||
      (value.refreshToken != null && !opaque(value.refreshToken)) ||
      (value.idToken != null && (typeof value.idToken !== 'string' || !value.idToken || value.idToken.length > 65536)) ||
      (value.earliestRefreshAt != null && (!Number.isSafeInteger(value.earliestRefreshAt) || value.earliestRefreshAt < 0)) ||
      (value.refreshContractUnknown !== undefined && typeof value.refreshContractUnknown !== 'boolean')) {
    throw authError('credential_storage_invalid', 'The saved ChatGPT session is invalid. Sign in again.', { state: 'reauth_required' })
  }
}

/** Preserve earliest_refresh_at exactly. Never infer seconds vs milliseconds by magnitude. */
export function tokenSet(response, { now = Date.now(), previous } = {}) {
  if (!response || typeof response !== 'object' || !bearer(response.access_token) || typeof response.token_type !== 'string' || response.token_type.toLowerCase() !== 'bearer' || !Number.isSafeInteger(response.expires_in) || response.expires_in <= 0 || !Number.isSafeInteger(now + response.expires_in * 1000) || typeof response.scope !== 'string' || response.scope.length > 65536 || response.scope.split(' ').filter(Boolean).some(item => !scope(item))) {
    throw authError('invalid_token_response', 'ChatGPT returned an invalid token response.')
  }
  if (response.refresh_token !== undefined && (typeof response.refresh_token !== 'string' || !response.refresh_token || /[\s\x00-\x1f\x7f]/.test(response.refresh_token) || response.refresh_token.length > 65536)) throw authError('invalid_token_response', 'ChatGPT returned an invalid refresh token.')
  if (response.id_token !== undefined && (typeof response.id_token !== 'string' || !response.id_token || response.id_token.length > 65536)) throw authError('invalid_token_response', 'ChatGPT returned an invalid identity token.')
  if (previous?.refreshToken && !response.refresh_token) throw authError('invalid_token_response', 'ChatGPT did not return the required replacement refresh token.')
  const scopes = [...new Set(response.scope.split(/\s+/).filter(Boolean))]
  if (scopes.includes('offline_access') && !response.refresh_token) throw authError('invalid_token_response', 'ChatGPT did not return the requested renewable session.')
  const earliest = response.earliest_refresh_at ?? null
  // Official devkit (0a36fef): packages/local/src/index.ts uses numeric Unix
  // seconds * 1000, or Date.parse for a string. Never coerce a numeric string or
  // auto-detect milliseconds by magnitude. Preserve the raw wire field above.
  let earliestRefreshAt = null
  let refreshContractUnknown = false
  if (earliest !== null) {
    if (typeof earliest === 'number' && Number.isFinite(earliest) && earliest >= 0 && Number.isSafeInteger(earliest * 1000)) earliestRefreshAt = earliest * 1000
    else if (typeof earliest === 'string' && !/^\d+(?:\.\d+)?$/.test(earliest) && Number.isFinite(Date.parse(earliest))) earliestRefreshAt = Date.parse(earliest)
    else refreshContractUnknown = true
  }
  return {
    version: randomUUID(), accessToken: response.access_token, refreshToken: response.refresh_token || null,
    idToken: response.id_token ?? previous?.idToken ?? null, tokenType: 'Bearer', scopes,
    receivedAt: now, expiresIn: response.expires_in, expiresAt: now + response.expires_in * 1000,
    earliest_refresh_at: earliest, earliestRefreshAt, refreshContractUnknown,
  }
}

export function refreshDue(credentials, now = Date.now()) {
  if (credentials.refreshContractUnknown) return now >= credentials.expiresAt
  return now >= Math.max(credentials.expiresAt - 60000, credentials.earliestRefreshAt || 0)
}
