import { createPublicKey, verify, createHash, timingSafeEqual } from 'node:crypto'
import { authError, checkSignal } from './errors.mjs'

export const ISSUER = 'https://auth.openai.com'
export const RESOURCE = 'https://api.openai.com/v1'
export const AUTHORIZE = `${ISSUER}/api/accounts/authorize`
export const TOKEN = `${ISSUER}/api/accounts/oauth/token`
export const DISCOVERY = `${ISSUER}/.well-known/openid-configuration`
export const SCOPES = 'openid profile email offline_access resource.invoke chatgpt.tokens.use.direct'
export const hasPlanScope = scopes => Array.isArray(scopes) && ['resource.invoke', 'chatgpt.tokens.use.direct'].every(scope => scopes.includes(scope))
const invalid = () => authError('invalid_id_token', 'The ChatGPT account identity could not be verified.', { state: 'reauth_required' })
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const invalidResponse = () => authError('auth_response_invalid', 'The authentication service returned an invalid response.')

export function trustedAuthUrl(value) {
  let url
  try { url = new URL(value) } catch { throw authError('untrusted_auth_endpoint', 'The authentication endpoint is not trusted.') }
  if (url.origin !== ISSUER || url.username || url.password || url.hash || url.search) throw authError('untrusted_auth_endpoint', 'The authentication endpoint is not trusted.')
  return url.href
}

async function boundedJson(response) {
  const limit = 1024 * 1024
  let reader
  try {
    let text
    if (response.body?.getReader) {
      reader = response.body.getReader()
      const chunks = []
      let bytes = 0
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        bytes += value.byteLength
        if (bytes > limit) throw invalidResponse()
        chunks.push(value)
      }
      text = Buffer.concat(chunks).toString('utf8')
    } else text = await response.text()
    if (Buffer.byteLength(text) > limit) throw invalidResponse()
    return JSON.parse(text)
  } catch {
    // Transport errors can contain request URLs or echoed token bodies.
    reader?.cancel().catch(() => {})
    throw invalidResponse()
  } finally { reader?.releaseLock() }
}

export class OidcClient {
  constructor({ fetch: fetchImpl = globalThis.fetch, now = Date.now, requestTimeoutMs = 15000 } = {}) {
    this.fetch = fetchImpl
    this.now = now
    this.requestTimeoutMs = requestTimeoutMs
    this.metadata = null
    this.jwks = null
  }

  async request(url, options = {}) {
    trustedAuthUrl(url)
    checkSignal(options.signal)
    const signal = options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(this.requestTimeoutMs)]) : AbortSignal.timeout(this.requestTimeoutMs)
    let response
    try { response = await this.fetch(url, { ...options, signal, redirect: 'error' }) }
    catch (error) {
      checkSignal(options.signal)
      throw authError('auth_network_unavailable', 'The ChatGPT authentication service is temporarily unavailable.', { retryable: true })
    }
    if (response.url && response.url !== url) throw authError('untrusted_auth_endpoint', 'Authentication redirects are not allowed.')
    return response
  }

  async discovery(signal) {
    if (this.metadata && this.now() - this.metadata.fetchedAt < 3600000) return this.metadata.value
    const response = await this.request(DISCOVERY, { signal })
    if (!response.ok) throw authError('auth_discovery_unavailable', 'ChatGPT sign-in information is temporarily unavailable.', { retryable: true })
    const data = await boundedJson(response)
    if (!object(data) || data.issuer !== ISSUER || data.authorization_endpoint !== AUTHORIZE || data.token_endpoint !== TOKEN) throw authError('untrusted_auth_endpoint', 'The ChatGPT authentication configuration is not trusted.')
    trustedAuthUrl(data.jwks_uri)
    if (data.revocation_endpoint) trustedAuthUrl(data.revocation_endpoint)
    if (!Array.isArray(data.id_token_signing_alg_values_supported)) throw invalid()
    this.metadata = { value: data, fetchedAt: this.now() }
    return data
  }

  async keys(signal, force = false) {
    const metadata = await this.discovery(signal)
    if (!force && this.jwks && this.now() - this.jwks.fetchedAt < 300000) return this.jwks.value
    const response = await this.request(metadata.jwks_uri, { signal })
    if (!response.ok) throw authError('auth_keys_unavailable', 'ChatGPT identity verification is temporarily unavailable.', { retryable: true })
    const data = await boundedJson(response)
    if (!object(data) || !Array.isArray(data.keys) || data.keys.length > 100 || data.keys.some(key => !object(key) || (key.key_ops !== undefined && (!Array.isArray(key.key_ops) || key.key_ops.some(op => typeof op !== 'string'))))) throw invalid()
    this.jwks = { value: data.keys, fetchedAt: this.now() }
    return data.keys
  }

  async verifyIdToken(token, { clientId, nonce, identity, accessToken, signal } = {}) {
    if (typeof token !== 'string' || token.length > 65536) throw invalid()
    const parts = token.split('.')
    if (parts.length !== 3 || parts.some(part => !/^[A-Za-z0-9_-]+$/.test(part))) throw invalid()
    let header, claims
    try { header = JSON.parse(Buffer.from(parts[0], 'base64url')); claims = JSON.parse(Buffer.from(parts[1], 'base64url')) } catch { throw invalid() }
    if (!object(header) || !object(claims) || ['crit', 'jku', 'jwk', 'x5u'].some(key => key in header) || !['RS256', 'ES256'].includes(header.alg) || typeof header.kid !== 'string' || !header.kid) throw invalid()
    const metadata = await this.discovery(signal)
    if (!metadata.id_token_signing_alg_values_supported.includes(header.alg)) throw invalid()
    const matches = keys => keys.filter(key => key.kid === header.kid && (!key.alg || key.alg === header.alg) && (!key.use || key.use === 'sig') && (!key.key_ops || key.key_ops.includes('verify')))
    let candidates = matches(await this.keys(signal))
    if (!candidates.length) candidates = matches(await this.keys(signal, true))
    if (candidates.length !== 1) throw invalid()
    const jwk = candidates[0]
    if ((header.alg === 'RS256' && jwk.kty !== 'RSA') || (header.alg === 'ES256' && (jwk.kty !== 'EC' || jwk.crv !== 'P-256')) || jwk.d) throw invalid()
    try {
      const key = createPublicKey({ key: jwk, format: 'jwk' })
      if (header.alg === 'RS256' && (key.asymmetricKeyDetails?.modulusLength || 0) < 2048) throw invalid()
      if (!verify('sha256', Buffer.from(`${parts[0]}.${parts[1]}`), { key, dsaEncoding: 'ieee-p1363' }, Buffer.from(parts[2], 'base64url'))) throw invalid()
    } catch { throw invalid() }
    const now = this.now() / 1000
    const aud = typeof claims.aud === 'string' ? [claims.aud] : claims.aud
    if (typeof clientId !== 'string' || !clientId || claims.iss !== ISSUER || typeof claims.sub !== 'string' || !claims.sub || !Array.isArray(aud) || aud.some(value => typeof value !== 'string' || !value) || !aud.includes(clientId) || (aud.length > 1 && claims.azp !== clientId) || (claims.azp !== undefined && claims.azp !== clientId)) throw invalid()
    if (!Number.isFinite(claims.exp) || claims.exp <= now - 30 || !Number.isFinite(claims.iat) || claims.iat > now + 30 || (claims.nbf !== undefined && (!Number.isFinite(claims.nbf) || claims.nbf > now + 30))) throw invalid()
    if (nonce !== undefined && claims.nonce !== nonce) throw invalid()
    if (identity && (claims.iss !== identity.issuer || claims.sub !== identity.subject)) throw authError('account_identity_mismatch', 'The sign-in belongs to a different saved ChatGPT account.', { state: 'reauth_required' })
    if (claims.at_hash !== undefined) {
      if (typeof claims.at_hash !== 'string' || typeof accessToken !== 'string' || !accessToken) throw invalid()
      const expected = Buffer.from(createHash('sha256').update(accessToken).digest().subarray(0, 16).toString('base64url'))
      const actual = Buffer.from(claims.at_hash)
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw invalid()
    }
    return { issuer: claims.iss, subject: claims.sub, email: typeof claims.email === 'string' ? claims.email : null, name: typeof claims.name === 'string' ? claims.name : null }
  }

  async exchange(fields, signal) {
    await this.discovery(signal)
    let response
    try {
      response = await this.request(TOKEN, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(fields), signal,
      })
    } catch (error) {
      if (fields.grant_type === 'refresh_token' && error.code === 'auth_network_unavailable') {
        // A transport failure after dispatch cannot prove the server did not
        // consume a rotating refresh token. Never automatically reuse it.
        throw authError('refresh_outcome_unknown', 'The ChatGPT refresh result is unknown. Sign in again before resuming.', { state: 'reauth_required' })
      }
      throw error
    }
    let result
    try { result = await boundedJson(response) }
    catch (error) {
      if (response.ok) throw error
      result = {}
    }
    if (!response.ok) {
      // An unstructured proxy error is not evidence that an upstream server
      // rejected, rather than consumed, a rotating refresh token.
      const explicitRejection = object(result) && ['invalid_grant', 'invalid_client', 'invalid_scope', 'access_denied', 'invalid_request', 'unauthorized_client', 'unsupported_grant_type', 'server_error', 'temporarily_unavailable'].includes(result.error)
      if (fields.grant_type === 'refresh_token' && !explicitRejection) throw authError('refresh_outcome_unknown', 'The ChatGPT refresh result is unknown. Sign in again before resuming.', { state: 'reauth_required' })
      const code = ['invalid_grant', 'invalid_client', 'invalid_scope', 'access_denied'].includes(result?.error) ? result.error : 'token_exchange_failed'
      const terminal = ['invalid_grant', 'invalid_client', 'invalid_scope', 'access_denied'].includes(code)
      const error = authError(code, terminal ? 'ChatGPT authorization must be renewed.' : 'ChatGPT authorization is temporarily unavailable.', { state: terminal ? 'reauth_required' : 'temporarily_unavailable', retryable: !terminal, status: response.status })
      error.refreshRejected = explicitRejection
      throw error
    }
    if (!object(result)) throw authError('invalid_token_response', 'ChatGPT returned an invalid token response.')
    return result
  }

  async revoke(refreshToken, clientId, signal) {
    const metadata = await this.discovery(signal)
    if (!metadata.revocation_endpoint) return false
    const response = await this.request(metadata.revocation_endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: refreshToken, token_type_hint: 'refresh_token', client_id: clientId }), signal,
    })
    if (response.status === 200) return true
    if (response.status >= 500) throw authError('revocation_unavailable', 'Remote ChatGPT sign-out could not be confirmed.', { retryable: true, status: response.status })
    return false
  }
}
