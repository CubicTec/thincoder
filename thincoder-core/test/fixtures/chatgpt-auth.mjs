import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { generateKeyPairSync, sign } from 'node:crypto'
import { AuthService } from '../../auth/service.mjs'
import { ISSUER, AUTHORIZE, TOKEN, DISCOVERY, SCOPES } from '../../auth/oidc.mjs'

export const jwksUrl = `${ISSUER}/.well-known/jwks.json`
export const revokeUrl = `${ISSUER}/api/accounts/oauth/revoke`
export const discovery = { issuer: ISSUER, authorization_endpoint: AUTHORIZE, token_endpoint: TOKEN, jwks_uri: jwksUrl,
  revocation_endpoint: revokeUrl, id_token_signing_alg_values_supported: ['RS256', 'ES256'] }
const rsa = generateKeyPairSync('rsa', { modulusLength: 2048 })
export const jwk = { ...rsa.publicKey.export({ format: 'jwk' }), kid: 'test-key', use: 'sig', alg: 'RS256' }
export const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url')
export function jwt(claims, { key = rsa.privateKey, header = { alg: 'RS256', kid: 'test-key' } } = {}) {
  const input = `${encode(header)}.${encode(claims)}`
  return `${input}.${sign('sha256', Buffer.from(input), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url')}`
}
export const body = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
export const claims = (nonce, clientId = 'oaiapp_test') => ({ iss: ISSUER, sub: 'subject-1', aud: clientId, iat: Date.now() / 1000 - 1, exp: Date.now() / 1000 + 3600, nonce, email: 'same@example.test' })

export async function fixture(t, options = {}) {
  const root = await mkdtemp(join(tmpdir(), 'thincoder-auth-'))
  const calls = []
  let nextToken, tokenHandler, nextDiscovery = discovery, nextKeys = { keys: [jwk] }, revokeStatus = 200
  const fetch = async (url, init = {}) => {
    calls.push({ url, init })
    assert.equal(init.redirect, 'error')
    if (url === DISCOVERY) return body(nextDiscovery)
    if (url === jwksUrl) return body(nextKeys)
    if (url === TOKEN) return tokenHandler ? tokenHandler(init) : body(nextToken)
    if (url === revokeUrl) return new Response('', { status: revokeStatus })
    throw new Error('Unexpected endpoint')
  }
  const service = new AuthService({ root, fetch, pollIntervalMs: 30, ...options })
  t.after(async () => { service.dispose(); await rm(root, { recursive: true, force: true }) })
  const prepare = async ({ profileId, clientId = 'oaiapp_test', overrides = {}, tokenOverrides = {} } = {}) => {
    const attempt = await service.beginLogin({ profileId })
    const query = new URL(attempt.authorizationUrl).searchParams
    nextToken = { access_token: 'fixture-access-only', refresh_token: 'fixture-refresh-only', token_type: 'Bearer', expires_in: 3600, scope: SCOPES,
      id_token: jwt({ ...claims(query.get('nonce'), clientId), ...overrides }), ...tokenOverrides }
    const callback = new URL(attempt.redirectUri)
    callback.search = new URLSearchParams({ state: query.get('state'), code: 'fixture-code', client_id: clientId }).toString()
    return { attempt, callback, query }
  }
  const login = async options => { const prepared = await prepare(options); return service.completeLogin(prepared.attempt.loginId, prepared.callback.href) }
  return { root, service, calls, prepare, login,
    token: value => { nextToken = value }, tokenHandler: value => { tokenHandler = value },
    metadata: value => { nextDiscovery = value }, keys: value => { nextKeys = value }, revokeStatus: value => { revokeStatus = value } }
}
