import test from 'node:test'
import assert from 'node:assert/strict'
import { AuthService } from '../auth/service.mjs'
import { createAuthClient, getAuthClient, publicAuthStatus } from '../auth/client.mjs'
import { setAuthService } from '../auth/service.mjs'
import { listModelCatalog } from '../provider/list-models.mjs'
import { _setAuthServiceForTest, clearInferenceStatus } from '../provider/auth-context.mjs'
import { OidcClient, SCOPES, TOKEN } from '../auth/oidc.mjs'
import { fixture, body, claims, discovery, jwt } from './fixtures/chatgpt-auth.mjs'

const gate = () => {
  let resolve, reject
  const promise = new Promise((done, fail) => { resolve = done; reject = fail })
  return { promise, resolve, reject }
}

test('logout in a peer invalidates already-started sign-in before account activation', async t => {
  const f = await fixture(t), first = await f.login()
  const attempt = await f.prepare({ profileId: first.profileId })
  const peer = new AuthService({ root: f.root, fetch: f.service.oidc.fetch }); t.after(() => peer.dispose())
  await peer.logout(first.profileId)
  await assert.rejects(f.service.completeLogin(attempt.attempt.loginId, attempt.callback.href), { code: 'login_superseded' })
  assert.equal((await f.service.getStatus(first.profileId)).state, 'signed_out')
  assert.equal(await f.service.store.readCredential(first.profileId), null)
})

test('overlapping sign-ins cannot overwrite a newer accepted account session', async t => {
  const f = await fixture(t), first = await f.login()
  const attempt = await f.prepare({ profileId: first.profileId })
  const firstToken = jwt(claims(attempt.query.get('nonce')))
  await f.login({ profileId: first.profileId })
  const current = await f.service.store.readCredential(first.profileId)
  f.token({ access_token: 'obsolete-access', refresh_token: 'obsolete-refresh', token_type: 'Bearer', expires_in: 3600, scope: SCOPES, id_token: firstToken })
  await assert.rejects(f.service.completeLogin(attempt.attempt.loginId, attempt.callback.href), { code: 'login_superseded' })
  assert.deepEqual(await f.service.store.readCredential(first.profileId), current)
})

test('pause during refresh discovery prevents dispatch of a rotating refresh token', async t => {
  const f = await fixture(t), status = await f.login()
  const credentials = await f.service.store.readCredential(status.profileId)
  await f.service.store.writeCredential(status.profileId, { ...credentials, expiresAt: Date.now() - 1 })
  const entered = gate(), resume = gate()
  const discover = f.service.oidc.discovery.bind(f.service.oidc)
  f.service.oidc.discovery = async (...args) => { entered.resolve(); await resume.promise; return discover(...args) }
  const refresh = f.service.refresh(status.profileId)
  await entered.promise
  await f.service.pauseProfile(status.profileId)
  const before = f.calls.filter(call => call.url === TOKEN).length
  resume.resolve()
  await assert.rejects(refresh, { code: 'profile_paused' })
  assert.equal(f.calls.filter(call => call.url === TOKEN).length, before)
  assert.equal((await f.service.store.readCredential(status.profileId)).refreshPending, undefined)
})

test('malformed discovery and JWKS documents fail as sanitized authentication errors', async t => {
  for (const value of [null, [], 'bad', 1]) {
    const f = await fixture(t); f.metadata(value)
    await assert.rejects(f.service.oidc.discovery(), error => error.name === 'AuthError')
  }
  for (const value of [null, { keys: [null] }, { keys: [{ kid: 'test-key', key_ops: {} }] }]) {
    const f = await fixture(t); f.keys(value)
    await assert.rejects(f.service.oidc.verifyIdToken(jwt(claims('n')), { clientId: 'oaiapp_test', nonce: 'n' }), error => error.name === 'AuthError')
  }
})

test('OIDC body-read errors never expose transport diagnostics or secret-bearing text', async () => {
  const oidc = new OidcClient({ fetch: async () => ({ ok: true, text: async () => { throw new Error('SECRET-TOKEN transport diagnostic') } }) })
  await assert.rejects(oidc.discovery(), error => error.name === 'AuthError' && !String(error).includes('SECRET'))
})

test('malformed successful initial token response does not leak a raw type error', async t => {
  const f = await fixture(t), attempt = await f.prepare()
  f.token(null)
  await assert.rejects(f.service.completeLogin(attempt.attempt.loginId, attempt.callback.href), error => error.name === 'AuthError' && error.code === 'invalid_token_response')
  assert.deepEqual(await f.service.listProfiles(), [])
})

test('damaged persisted token metadata cannot produce an inference authorization', async t => {
  const f = await fixture(t), status = await f.login()
  const valid = await f.service.store.readCredential(status.profileId)
  for (const change of [{ expiresAt: null }, { expiresAt: undefined }, { accessToken: undefined }, { accessToken: 'bad\r\nheader' }, { scopes: `${SCOPES}-suffix` }]) {
    await f.service.store.writeCredential(status.profileId, { ...valid, ...change })
    await assert.rejects(f.service.getAuthContext(status.profileId), { code: 'credential_storage_invalid' })
    assert.equal((await f.service.getStatus(status.profileId)).state, 'reauth_required')
  }
})

test('ID token audience arrays reject non-string audience members', async t => {
  const f = await fixture(t)
  await assert.rejects(f.service.oidc.verifyIdToken(jwt({ ...claims('n'), aud: ['oaiapp_test', null], azp: 'oaiapp_test' }), { clientId: 'oaiapp_test', nonce: 'n' }), { code: 'invalid_id_token' })
})

test('a malformed non-success refresh response cannot authorize replay of a possibly rotated token', async t => {
  const f = await fixture(t), status = await f.login()
  const credentials = await f.service.store.readCredential(status.profileId)
  await f.service.store.writeCredential(status.profileId, { ...credentials, expiresAt: Date.now() - 1 })
  let calls = 0
  f.tokenHandler(() => { calls++; return new Response('upstream gateway failure', { status: 502 }) })
  await assert.rejects(f.service.getAuthContext(status.profileId), { code: 'refresh_outcome_unknown' })
  await assert.rejects(f.service.getAuthContext(status.profileId), { code: 'reauth_required' })
  assert.equal(calls, 1)
})

test('aborting login during discovery does not launch a browser or retain a listener', async t => {
  const f = await fixture(t), entered = gate(), resume = gate()
  f.service.oidc.discovery = async () => { entered.resolve(); await resume.promise; return discovery }
  let opened = 0
  const controller = new AbortController()
  const pending = f.service.beginLogin({ signal: controller.signal, openBrowser: () => { opened++ } })
  await entered.promise; controller.abort(); resume.resolve()
  await assert.rejects(pending, { name: 'AbortError' })
  assert.equal(opened, 0)
  assert.equal(f.service.pending.size, 0)
})

test('mismatched saved credentials are omitted from returning-login hints', async t => {
  const f = await fixture(t), status = await f.login()
  const credentials = await f.service.store.readCredential(status.profileId)
  await f.service.store.writeCredential(status.profileId, { ...credentials, clientId: 'other-account', idToken: 'SECRET-FOREIGN-ID-TOKEN' })
  const attempt = await f.service.beginLogin({ profileId: status.profileId })
  assert.equal(new URL(attempt.authorizationUrl).searchParams.has('id_token_hint'), false)
  attempt.cancel()
})

test('malformed or unknown account-directory schemas fail closed without overwriting storage', async t => {
  const f = await fixture(t)
  await f.service.store.init()
  for (const value of [null, [], { version: 99, profiles: [] }, { version: 1, profiles: [null] }, { version: 1, profiles: [], activeProfileId: 'missing' }]) {
    await f.service.store.write('profiles.json', value)
    await assert.rejects(f.service.getStatus(), { code: 'credential_storage_invalid' })
    assert.deepEqual(await f.service.store.read('profiles.json'), value)
  }
})

test('OIDC JSON size limits stop reading oversized response streams', async () => {
  let cancelled = false
  const oidc = new OidcClient({ fetch: async () => new Response(new ReadableStream({
    pull(controller) { controller.enqueue(new Uint8Array(128 * 1024)) },
    cancel() { cancelled = true },
  })) })
  await assert.rejects(oidc.discovery(), { code: 'auth_response_invalid' })
  assert.equal(cancelled, true)
})


test('public auth adapter sanitizes native errors from every exposed operation', async () => {
  const raw = { providers: [{ name: 'openai-chatgpt', auth: { type: 'chatgpt_oauth', enabled: true, credentialRef: 'account-a' } }] }
  const unsafe = () => { throw new Error('https://auth.openai.com/?code=SECRET-CODE&refresh_token=SECRET-TOKEN') }
  for (const method of ['status', 'list', 'run']) {
    const client = createAuthClient({ read: () => raw, service: { getStatus: unsafe, listProfiles: unsafe } })
    await assert.rejects(method === 'run' ? client.run({ action: 'status' }) : client[method](), error => error.name === 'AuthError' && !JSON.stringify(error).includes('SECRET') && !String(error).includes('SECRET'))
  }
  const client = createAuthClient({ read: () => raw, service: { resumeProfile() {} }, write: () => ({ ok: false, reason: 'SECRET-CONFIG' }) })
  await assert.rejects(client.run({ action: 'enable', enabled: true }), error => error.code === 'auth_config_save_failed' && !String(error).includes('SECRET'))
})

test('add with an unsupported provider name fails before mutating config', async () => {
  let writes = 0
  const client = createAuthClient({ add() { writes++; return null } })
  await assert.rejects(client.run({ action: 'add', name: 'other-provider' }), { code: 'invalid_auth_action' })
  assert.equal(writes, 0)
})

test('failed post-login config save explains the recoverable saved account without leaking diagnostics', async () => {
  const raw = { providers: [{ name: 'openai-chatgpt', auth: { type: 'chatgpt_oauth', enabled: true } }] }
  const client = createAuthClient({ read: () => raw, service: { async beginLogin() { return { completion: Promise.resolve({ profileId: 'saved-account' }), cancel() {} } } },
    write: () => ({ ok: false, reason: 'SECRET-CONFIG' }) })
  await assert.rejects(client.run({ action: 'login', openBrowser() {} }), error => error.code === 'auth_config_save_failed' && /sign-in succeeded/.test(error.message) && /select the saved account/.test(error.message) && !String(error).includes('SECRET'))
})

test('cancelling during credential persistence cannot activate the cancelled sign-in', async t => {
  const f = await fixture(t), old = await f.login()
  const previous = await f.service.store.readCredential(old.profileId)
  const attempt = await f.prepare({ profileId: old.profileId })
  const entered = gate(), resume = gate()
  const write = f.service.store.writeCredential.bind(f.service.store)
  let blocked = false
  f.service.store.writeCredential = async (...args) => {
    await write(...args)
    if (!blocked) { blocked = true; entered.resolve(); await resume.promise }
  }
  const completing = f.service.completeLogin(attempt.attempt.loginId, attempt.callback.href)
  await entered.promise; attempt.attempt.cancel(); resume.resolve()
  await assert.rejects(completing, { name: 'AbortError' })
  await assert.rejects(attempt.attempt.completion, { name: 'AbortError' })
  assert.deepEqual(await f.service.store.readCredential(old.profileId), previous)
  assert.equal((await f.service.store.readProfiles()).profiles[0].sessionId, previous.sessionId)
})

test('failed durable refresh-intent persistence does not leave status refreshing forever', async t => {
  const f = await fixture(t), status = await f.login()
  const credentials = await f.service.store.readCredential(status.profileId)
  await f.service.store.writeCredential(status.profileId, { ...credentials, expiresAt: Date.now() - 1 })
  const write = f.service.store.writeCredential.bind(f.service.store)
  f.service.store.writeCredential = async (...args) => { await write(...args); throw new Error('synthetic directory fsync failure') }
  await assert.rejects(f.service.getAuthContext(status.profileId))
  assert.equal((await f.service.getStatus(status.profileId)).state, 'reauth_required')
})


test('model catalog quota stays attributed to the account that sent the request', async t => {
  const entered = gate(), resume = gate(), paused = []
  const original = globalThis.fetch
  const provider = { name: 'openai-chatgpt', baseURL: 'https://api.openai.com/v1', format: 'responses', auth: { type: 'chatgpt_oauth', enabled: true, credentialRef: 'account-old' } }
  _setAuthServiceForTest({ async getAuthContext(id) { return { profileId: id, accessToken: 'synthetic-token', release() {} } }, async recordUsageLimit(id) { paused.push(id) } })
  globalThis.fetch = async () => { entered.resolve(); await resume.promise; return body({ error: { code: 'subscription_sharing_usage_limit_exceeded' } }, 429) }
  t.after(() => { globalThis.fetch = original; _setAuthServiceForTest(null); clearInferenceStatus('account-old'); clearInferenceStatus('account-new') })
  const request = listModelCatalog(provider)
  await entered.promise
  provider.auth.credentialRef = 'account-new'
  resume.resolve()
  await assert.rejects(request, { code: 'subscription_sharing_usage_limit_exceeded' })
  assert.deepEqual(paused, ['account-old'])
})

test('auth client singleton follows an explicitly replaced service authority', t => {
  setAuthService({ dispose() {}, async listProfiles() { return [{ profileId: 'first' }] } })
  const first = getAuthClient()
  setAuthService({ dispose() {}, async listProfiles() { return [{ profileId: 'second' }] } })
  t.after(() => setAuthService(undefined))
  assert.notEqual(getAuthClient(), first)
  return getAuthClient().list().then(profiles => assert.equal(profiles[0].profileId, 'second'))
})

test('successful peer refresh clears an old process-local transient refresh failure', async t => {
  const f = await fixture(t), status = await f.login()
  const credentials = await f.service.store.readCredential(status.profileId)
  await f.service.store.writeCredential(status.profileId, { ...credentials, expiresAt: Date.now() - 1 })
  f.tokenHandler(() => body({ error: 'server_error' }, 503))
  await assert.rejects(f.service.getAuthContext(status.profileId), { code: 'token_exchange_failed' })
  assert.equal((await f.service.getStatus(status.profileId)).state, 'temporarily_unavailable')
  const peer = new AuthService({ root: f.root, fetch: f.service.oidc.fetch }); t.after(() => peer.dispose())
  f.tokenHandler(() => body({ access_token: 'peer-access', refresh_token: 'peer-refresh', token_type: 'Bearer', expires_in: 3600, scope: SCOPES }))
  const context = await peer.getAuthContext(status.profileId); context.release()
  assert.equal((await f.service.getStatus(status.profileId)).state, 'ready')
})


test('corrupt host records never silently create a new host registration', async t => {
  const f = await fixture(t)
  const host = await f.service.store.getHost()
  for (const saved of [null, false, 0, { ...host, version: 99 }]) {
    await f.service.store.write('host.json', saved)
    await assert.rejects(f.service.store.getHost(), { code: 'credential_storage_unsafe' })
    assert.deepEqual(await f.service.store.read('host.json'), saved)
  }
})

test('public inference timestamps cannot smuggle arbitrary nested metadata', () => {
  const status = publicAuthStatus({ profileId: 'account' }, { status: 'completed', at: { token: 'SECRET' }, model: 'fixture' })
  assert.equal(status.lastInference.at, null)
  assert.equal(JSON.stringify(status).includes('SECRET'), false)
})

test('failed enable configuration write does not resume a globally paused account', async () => {
  const raw = { providers: [{ name: 'openai-chatgpt', auth: { type: 'chatgpt_oauth', enabled: false, credentialRef: 'account' } }] }
  let resumes = 0
  const client = createAuthClient({ read: () => raw, service: { resumeProfile() { resumes++ } }, write: () => ({ ok: false }) })
  await assert.rejects(client.run({ action: 'enable', enabled: true }), { code: 'auth_config_save_failed' })
  assert.equal(resumes, 0)
})

test('disposing service during login initialization cannot create a late browser or listener', async t => {
  const f = await fixture(t), entered = gate(), resume = gate()
  f.service.oidc.discovery = async () => { entered.resolve(); await resume.promise; return discovery }
  let browsers = 0
  const pending = f.service.beginLogin({ openBrowser() { browsers++ } })
  await entered.promise; f.service.dispose(); resume.resolve()
  await assert.rejects(pending, { name: 'AbortError' })
  assert.equal(browsers, 0)
  assert.equal(f.service.pending.size, 0)
  await assert.rejects(f.service.getAuthContext('unused'), { name: 'AbortError' })
})

async function pendingClientLogin(t) {
  const f = await fixture(t), opened = gate(), opener = gate()
  const raw = { providers: [{ name: 'openai-chatgpt', auth: { type: 'chatgpt_oauth', enabled: true } }] }
  const client = createAuthClient({ service: f.service, read: () => raw, write: change => { change(raw); return { ok: true } } })
  let query
  const login = client.run({ action: 'login', openBrowser(url) { query = new URL(url).searchParams; opened.resolve(); return opener.promise } })
  login.catch(() => {})
  await opened.promise
  const pending = [...f.service.pending.values()][0]
  const callback = new URL(query.get('redirect_uri'))
  callback.search = new URLSearchParams({ state: query.get('state'), code: 'fixture-code', client_id: 'oaiapp_test' })
  f.token({ access_token: 'fixture-access-only', refresh_token: 'fixture-refresh-only', token_type: 'Bearer', expires_in: 3600, scope: SCOPES,
    id_token: jwt(claims(query.get('nonce'))) })
  t.after(() => opener.resolve())
  return { ...f, raw, client, login, opener, commit: () => f.service.completeLogin(pending.loginId, callback.href) }
}

test('cancel after durable OAuth commit cannot report failure while the browser opener is pending', async t => {
  const f = await pendingClientLogin(t)
  const committed = await f.commit()
  await f.client.run({ action: 'cancel' })
  f.opener.resolve()
  const status = await f.login
  assert.equal(status.state, 'ready')
  assert.equal(f.raw.providers[0].auth.credentialRef, committed.profileId)
})

test('logout after durable commit applies to the new account even while its browser opener is pending', async t => {
  const f = await pendingClientLogin(t)
  const committed = await f.commit()
  await f.client.run({ action: 'logout' })
  f.opener.resolve()
  await f.login
  assert.equal(f.raw.providers[0].auth.credentialRef, committed.profileId)
  assert.equal((await f.service.getStatus(committed.profileId)).state, 'signed_out')
  assert.equal(await f.service.store.readCredential(committed.profileId), null)
})

test('pre-commit cancellation while the browser opener is pending remains unbound', async t => {
  const f = await pendingClientLogin(t)
  await f.client.run({ action: 'cancel' })
  f.opener.resolve()
  await assert.rejects(f.login, { name: 'AbortError' })
  assert.equal(f.raw.providers[0].auth.credentialRef, undefined)
  assert.deepEqual(await f.service.listProfiles(), [])
})


test('disable after durable commit pauses the new account while its browser opener is pending', async t => {
  const f = await pendingClientLogin(t)
  const committed = await f.commit()
  await f.client.run({ action: 'enable', enabled: false })
  f.opener.resolve()
  await f.login
  assert.equal(f.raw.providers[0].auth.credentialRef, committed.profileId)
  assert.equal(f.raw.providers[0].auth.enabled, false)
  assert.equal((await f.service.getStatus(committed.profileId)).paused, true)
  await assert.rejects(f.service.getAuthContext(committed.profileId), { code: 'profile_paused' })
})

test('late browser-opener failure cannot overturn an already committed sign-in', async t => {
  const f = await pendingClientLogin(t)
  const committed = await f.commit()
  f.opener.reject(new Error('SECRET OPENER FAILURE'))
  const status = await f.login
  assert.equal(status.state, 'ready')
  assert.equal(f.raw.providers[0].auth.credentialRef, committed.profileId)
})

test('browser-opener failure before commit stays sanitized and leaves no saved account', async t => {
  const f = await pendingClientLogin(t)
  f.opener.reject(new Error('SECRET OPENER FAILURE'))
  await assert.rejects(f.login, error => error.code === 'browser_open_failed' && !String(error).includes('SECRET'))
  assert.equal(f.raw.providers[0].auth.credentialRef, undefined)
  assert.deepEqual(await f.service.listProfiles(), [])
  assert.equal(f.service.pending.size, 0)
})
