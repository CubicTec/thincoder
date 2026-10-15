import { createServer } from 'node:http'
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { AUTHORIZE, RESOURCE, SCOPES } from './oidc.mjs'
import { authError, abortError, checkSignal } from './errors.mjs'

const random = () => randomBytes(32).toString('base64url')
const equal = (a, b) => typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b))
const callbackError = () => authError('invalid_callback', 'The ChatGPT sign-in callback could not be verified.', { state: 'reauth_required' })

/** The pending attempt is memory-only; it never replaces an active registration. */
export async function beginLogin(service, { profileId, openBrowser, signal, timeoutMs = 300000, newAccount = false } = {}) {
  checkSignal(signal)
  const host = await service.store.getHost()
  if (newAccount) { profileId = undefined; service.registrationRetry = null }
  if (service.registrationRetry?.expiresAt <= service.now()) service.registrationRetry = null
  const retry = !profileId && service.registrationRetry?.hostId === host.hostId ? service.registrationRetry : null
  const profiles = await service.store.readProfiles()
  const selected = profileId ? profiles.profiles.find(p => p.profileId === profileId) : null
  if (profileId && !selected) throw authError('profile_not_found', 'The selected ChatGPT account was not found.', { state: 'signed_out' })
  if (selected?.paused) throw authError('profile_paused', 'Enable ChatGPT plan access before signing in to this saved account.')
  const credentials = selected ? await service.store.readCredential(profileId) : null
  await service.oidc.discovery(signal)
  const loginId = randomUUID()
  const controller = new AbortController()
  let resolveCompletion, rejectCompletion
  const completion = new Promise((resolve, reject) => { resolveCompletion = resolve; rejectCompletion = reject })
  // Hosts may await completion later. A cancelled browser attempt must not cause an unhandled rejection.
  completion.catch(() => {})
  const pending = { loginId, selected, hostId: host.hostId, controller, resolveCompletion, rejectCompletion, completion, busy: false }
  const server = createServer(async (req, res) => {
    const headers = { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'", 'X-Content-Type-Options': 'nosniff' }
    if (req.method !== 'GET' || req.headers.host !== new URL(pending.redirectUri).host || req.url?.length > 8192 || !['127.0.0.1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)) {
      res.writeHead(400, headers); res.end('Invalid sign-in callback.'); return
    }
    try {
      await service.completeLogin(loginId, `${new URL(pending.redirectUri).origin}${req.url}`)
      res.writeHead(200, headers); res.end('ChatGPT sign-in completed. You may return to ThinCoder.')
    } catch {
      res.writeHead(400, headers); res.end('ChatGPT sign-in was not completed. Return to ThinCoder and try again.')
    }
  })
  server.requestTimeout = 10000
  server.headersTimeout = 10000
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
  pending.server = server
  pending.redirectUri = `http://127.0.0.1:${server.address().port}/auth/callback`
  // Generate these only after listening, as required by the loopback flow.
  pending.state = random()
  pending.nonce = random()
  pending.verifier = random()
  pending.clientId = selected?.clientId || retry?.clientId || 'dynamic_agent_client'
  const url = new URL(AUTHORIZE)
  const params = {
    client_id: pending.clientId, ext_agent_host_id: host.hostId, response_type: 'code',
    redirect_uri: pending.redirectUri, scope: SCOPES, resource: RESOURCE, state: pending.state,
    nonce: pending.nonce, code_challenge_method: 'S256', code_challenge: createHash('sha256').update(pending.verifier).digest('base64url'),
  }
  if (pending.clientId === 'dynamic_agent_client') params.agent_name_hint = 'ThinCoder'
  else if (selected) {
    if (credentials?.idToken) params.id_token_hint = credentials.idToken
    if (selected.email) params.login_hint = selected.email
  }
  url.search = new URLSearchParams(params).toString()
  const cancel = () => finishLogin(service, pending, abortError())
  pending.abortListener = cancel
  pending.externalSignal = signal
  signal?.addEventListener('abort', cancel, { once: true })
  pending.timer = setTimeout(() => finishLogin(service, pending, authError('login_timeout', 'ChatGPT sign-in timed out.', { state: 'signed_out' })), timeoutMs)
  pending.timer.unref()
  service.pending.set(loginId, pending)
  if (signal?.aborted) cancel()
  const result = { loginId, redirectUri: pending.redirectUri, completion, cancel }
  // Authorization URLs can contain an ID token hint; exclude them from JSON/log inspection.
  Object.defineProperty(result, 'authorizationUrl', { value: url.href, enumerable: false })
  if (openBrowser) {
    try { await openBrowser(url.href) } catch { cancel(); throw authError('browser_open_failed', 'The system browser could not open ChatGPT sign-in.') }
  }
  return result
}

export function finishLogin(service, pending, error, status) {
  if (!service.pending.has(pending.loginId)) return
  service.pending.delete(pending.loginId)
  clearTimeout(pending.timer)
  pending.externalSignal?.removeEventListener('abort', pending.abortListener)
  if (error) pending.controller.abort()
  pending.server.close()
  pending.server.closeIdleConnections?.()
  pending.verifier = null
  if (error) pending.rejectCompletion(error)
  else pending.resolveCompletion(status)
}

export async function completeLogin(service, loginId, callbackUrl) {
  const pending = service.pending.get(loginId)
  if (!pending || pending.busy) throw callbackError()
  let callback
  try { callback = new URL(callbackUrl) } catch { throw callbackError() }
  if (callback.origin + callback.pathname !== pending.redirectUri || callback.username || callback.password || callback.hash) throw callbackError()
  for (const key of ['state', 'code', 'client_id', 'error']) if (callback.searchParams.getAll(key).length > 1) throw callbackError()
  if (!equal(callback.searchParams.get('state'), pending.state)) throw callbackError()
  pending.busy = true
  try {
    if (callback.searchParams.has('error')) throw authError('authorization_denied', 'ChatGPT sign-in was not authorized.', { state: 'signed_out' })
    const code = callback.searchParams.get('code')
    const clientId = callback.searchParams.get('client_id') || (pending.clientId !== 'dynamic_agent_client' ? pending.clientId : null)
    if (!code || code.length > 4096 || !clientId || clientId === 'dynamic_agent_client' || clientId.length > 512 || !/^[A-Za-z0-9_-]+$/.test(clientId)) throw callbackError()
    if (pending.clientId !== 'dynamic_agent_client' && clientId !== pending.clientId) throw callbackError()
    pending.issuedClientId = clientId
    const signal = pending.controller.signal
    const token = await service.oidc.exchange({
      grant_type: 'authorization_code', client_id: clientId, code, code_verifier: pending.verifier,
      redirect_uri: pending.redirectUri, resource: RESOURCE,
    }, signal)
    const identity = await service.oidc.verifyIdToken(token.id_token, { clientId, nonce: pending.nonce, identity: pending.selected, accessToken: token.access_token, signal })
    checkSignal(signal)
    const status = await service.acceptLogin({ pending, clientId, identity, token })
    finishLogin(service, pending, null, status)
    return status
  } catch (error) {
    if (error.code === 'invalid_grant' && !pending.selected && pending.issuedClientId) {
      // Keep only an unverified registration candidate. A later explicit retry
      // creates fresh OAuth values; no identity, profile or tokens are activated.
      service.registrationRetry = { clientId: pending.issuedClientId, hostId: pending.hostId, expiresAt: service.now() + 600000 }
    }
    finishLogin(service, pending, error)
    throw error
  }
}
