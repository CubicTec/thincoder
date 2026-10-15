import test from 'node:test'
import { promises as fs } from 'node:fs'
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir, stat, symlink, chmod, utimes } from 'node:fs/promises'
import { hostname } from 'node:os'
import { join } from 'node:path'
import { generateKeyPairSync, createHash } from 'node:crypto'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { inspect } from 'node:util'
import { setTimeout as sleep } from 'node:timers/promises'
import { AuthService, getAuthService, setAuthService } from '../auth/service.mjs'
import { CredentialStore } from '../auth/credential-store.mjs'
import { OidcClient, ISSUER, AUTHORIZE, TOKEN, DISCOVERY, RESOURCE, SCOPES } from '../auth/oidc.mjs'
import { tokenSet, refreshDue } from '../auth/tokens.mjs'

import { fixture, jwt, claims, body, encode, discovery, revokeUrl } from './fixtures/chatgpt-auth.mjs'

test('first registration uses loopback PKCE, trusted signed identity, atomic private credentials and stable host', async t => {
  const f = await fixture(t)
  const { attempt, callback, query } = await f.prepare()
  assert.equal(query.get('client_id'), 'dynamic_agent_client')
  assert.equal(query.get('agent_name_hint'), 'ThinCoder')
  assert.equal(query.get('resource'), RESOURCE)
  assert.equal(query.get('scope'), SCOPES)
  assert.equal(query.get('code_challenge_method'), 'S256')
  assert.match(query.get('ext_agent_host_id'), /^urn:uuid:/)
  assert.equal((await f.service.getStatus()).state, 'authorizing')
  const status = await f.service.completeLogin(attempt.loginId, callback.href)
  assert.equal((await attempt.completion).profileId, status.profileId)
  assert.equal(status.state, 'ready'); assert.equal(status.planAuthorized, true)
  const exchange = f.calls.find(call => call.url === TOKEN).init.body
  assert.equal(exchange.get('client_id'), 'oaiapp_test')
  assert.equal(exchange.get('redirect_uri'), attempt.redirectUri)
  assert.equal(exchange.get('resource'), RESOURCE)
  assert.equal(createHash('sha256').update(exchange.get('code_verifier')).digest('base64url'), query.get('code_challenge'))
  assert.equal(JSON.stringify(status).includes('fixture-'), false)
  const context = await f.service.getAuthContext(status.profileId)
  assert.equal(context.accessToken, 'fixture-access-only')
  assert.equal(JSON.stringify(context).includes('fixture-'), false)
  assert.equal(inspect(context).includes('fixture-'), false)
  context.release()
  assert.throws(() => context.accessToken, { name: 'AbortError' })
  const host = await f.service.store.getHost()
  const restarted = new CredentialStore({ root: f.root })
  assert.deepEqual(await restarted.getHost(), host)
  if (process.platform !== 'win32') {
    assert.equal((await stat(f.root)).mode & 0o777, 0o700)
    assert.equal((await stat(join(f.root, 'credentials', `${status.profileId}.json`))).mode & 0o777, 0o600)
  }
  const rawProfile = await readFile(join(f.root, 'profiles.json'), 'utf8')
  assert.equal(rawProfile.includes('fixture-access'), false)
  assert.equal(rawProfile.includes('fixture-refresh'), false)
})

test('real loopback listener accepts only correct host, path and state and consumes callback once', async t => {
  const f = await fixture(t)
  const { attempt, callback } = await f.prepare()
  const wrong = new URL(callback); wrong.pathname = '/callback'
  assert.equal((await fetch(wrong)).status, 400)
  const wrongState = new URL(callback); wrongState.searchParams.set('state', 'wrong')
  assert.equal((await fetch(wrongState)).status, 400)
  assert.equal(f.calls.filter(call => call.url === TOKEN).length, 0)
  assert.equal((await fetch(callback)).status, 200)
  assert.equal((await attempt.completion).state, 'ready')
  await assert.rejects(f.service.completeLogin(attempt.loginId, callback.href), { code: 'invalid_callback' })
})

test('callbacks reject missing or mismatched issued client ID and denial before exchange', async t => {
  const f = await fixture(t)
  for (const change of [u => u.searchParams.delete('client_id'), u => u.searchParams.set('client_id', 'dynamic_agent_client'), u => u.searchParams.set('error', 'access_denied')]) {
    const { attempt, callback } = await f.prepare()
    change(callback)
    await assert.rejects(f.service.completeLogin(attempt.loginId, callback.href))
  }
  assert.equal(f.calls.filter(call => call.url === TOKEN).length, 0)
  assert.deepEqual(await f.service.listProfiles(), [])
})

test('returning sign-in reuses host/client, requires the selected verified identity, and never merges same-email workspaces', async t => {
  const f = await fixture(t)
  const first = await f.login()
  const second = await f.login({ clientId: 'oaiapp_other_workspace' })
  assert.notEqual(first.profileId, second.profileId)
  assert.equal((await f.service.listProfiles()).length, 2)
  const { attempt, callback, query } = await f.prepare({ profileId: first.profileId, overrides: { sub: 'other-subject' } })
  assert.equal(query.get('client_id'), 'oaiapp_test')
  assert.equal(query.has('agent_name_hint'), false)
  assert.ok(query.get('id_token_hint'))
  assert.equal(query.get('login_hint'), 'same@example.test')
  await assert.rejects(f.service.completeLogin(attempt.loginId, callback.href), { code: 'account_identity_mismatch' })
  assert.equal((await f.service.getStatus()).profileId, second.profileId)
  const reauth = await f.prepare({ profileId: first.profileId })
  reauth.callback.searchParams.delete('client_id')
  const result = await f.service.completeLogin(reauth.attempt.loginId, reauth.callback.href)
  assert.equal(result.profileId, first.profileId)
})

test('identity without final granted plan scope remains signed in but cannot obtain inference credentials', async t => {
  const f = await fixture(t)
  const status = await f.login({ tokenOverrides: { scope: 'openid profile email', refresh_token: undefined } })
  assert.equal(status.state, 'signed_in_without_plan_scope')
  assert.equal(status.planAuthorized, false)
  await assert.rejects(f.service.getAuthContext(status.profileId), { code: 'plan_scope_missing' })
})

test('ID token rejects bad signature, none/HS256 algorithm confusion, wrong issuer/audience/azp/nonce, expiry, nbf and unknown keys', async t => {
  const f = await fixture(t)
  const otherKey = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey
  const base = claims('expected')
  const client = f.service.oidc
  const invalidTokens = [
    jwt(base, { key: otherKey }),
    `${encode({ alg: 'none', kid: 'test-key' })}.${encode(base)}.eA`,
    jwt(base, { header: { alg: 'HS256', kid: 'test-key' } }),
    jwt({ ...base, iss: 'https://attacker.example' }),
    jwt({ ...base, aud: 'wrong-client' }),
    jwt({ ...base, aud: ['oaiapp_test', 'another-client'] }),
    jwt({ ...base, azp: 'wrong-client' }),
    jwt({ ...base, nonce: 'wrong' }),
    jwt({ ...base, exp: Date.now() / 1000 - 60 }),
    jwt({ ...base, nbf: Date.now() / 1000 + 120 }),
    jwt({ ...base, iat: Date.now() / 1000 + 120 }),
    jwt(base, { header: { alg: 'RS256', kid: 'unknown' } }),
    jwt(base, { header: { alg: 'RS256', kid: 'test-key', jku: 'https://attacker.example/keys' } }),
  ]
  for (const token of invalidTokens) await assert.rejects(client.verifyIdToken(token, { clientId: 'oaiapp_test', nonce: 'expected' }), { code: 'invalid_id_token' })
  assert.equal((await client.verifyIdToken(jwt(base), { clientId: 'oaiapp_test', nonce: 'expected' })).subject, 'subject-1')
})

test('trusted discovery rejects alternate endpoints, cross-origin JWKS and redirect responses', async t => {
  for (const invalid of [ { ...discovery, issuer: 'https://evil.example' }, { ...discovery, token_endpoint: 'https://evil.example/token' }, { ...discovery, jwks_uri: 'https://evil.example/keys' }, { ...discovery, revocation_endpoint: 'https://auth.openai.com@evil.example/revoke' } ]) {
    const f = await fixture(t); f.metadata(invalid)
    await assert.rejects(f.service.beginLogin(), { code: 'untrusted_auth_endpoint' })
  }
  const redirected = new OidcClient({ fetch: async () => ({ ok: true, url: 'https://evil.example/', text: async () => JSON.stringify(discovery) }) })
  await assert.rejects(redirected.discovery(), { code: 'untrusted_auth_endpoint' })
})

test('JWKS key rotation accepts new published key and rejects wrong key type or changed alg', async t => {
  const f = await fixture(t)
  await f.service.oidc.verifyIdToken(jwt(claims('n')), { clientId: 'oaiapp_test', nonce: 'n' })
  const ec = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
  const ecJwk = { ...ec.publicKey.export({ format: 'jwk' }), kid: 'rotated', use: 'sig', alg: 'ES256' }
  f.keys({ keys: [ecJwk] })
  const token = jwt(claims('n'), { key: ec.privateKey, header: { alg: 'ES256', kid: 'rotated' } })
  assert.equal((await f.service.oidc.verifyIdToken(token, { clientId: 'oaiapp_test', nonce: 'n' })).subject, 'subject-1')
  await assert.rejects(f.service.oidc.verifyIdToken(jwt(claims('n'), { header: { alg: 'RS256', kid: 'rotated' } }), { clientId: 'oaiapp_test', nonce: 'n' }), { code: 'invalid_id_token' })
})

test('earliest_refresh_at follows official devkit Unix seconds / timestamp strings, preserves raw value and honors exact floor', () => {
  const response = { access_token: 'a', refresh_token: 'r', token_type: 'Bearer', expires_in: 120, scope: SCOPES }
  const now = 1792051200000
  for (const earliest of [(now + 90000) / 1000, new Date(now + 90000).toISOString()]) {
    const saved = tokenSet({ ...response, earliest_refresh_at: earliest }, { now })
    assert.equal(saved.earliest_refresh_at, earliest)
    assert.equal(saved.earliestRefreshAt, now + 90000)
    assert.equal(refreshDue(saved, now + 89999), false)
    assert.equal(refreshDue(saved, now + 90000), true)
  }
  for (const earliest of ['1792051290', {}, 'not-a-date', -1, NaN]) assert.equal(tokenSet({ ...response, earliest_refresh_at: earliest }, { now }).refreshContractUnknown, true)
  assert.equal(tokenSet({ ...response, earliest_refresh_at: now }, { now }).earliestRefreshAt, now * 1000, 'numeric milliseconds must never be auto-detected')
  assert.throws(() => tokenSet({ ...response, expires_in: '3600' }), { code: 'invalid_token_response' })
})

test('concurrent in-process refresh is single-flight and atomically replaces all rotating token fields', async t => {
  const f = await fixture(t)
  const status = await f.login()
  const old = await f.service.store.readCredential(status.profileId)
  await f.service.store.writeCredential(status.profileId, { ...old, expiresAt: Date.now() - 1 })
  let refreshCalls = 0
  f.tokenHandler(async init => {
    refreshCalls++
    const form = init.body
    assert.equal(form.get('client_id'), 'oaiapp_test')
    assert.equal(form.get('resource'), RESOURCE)
    assert.equal(form.get('refresh_token'), 'fixture-refresh-only')
    assert.equal(form.has('scope'), false)
    await sleep(70)
    return body({ access_token: 'rotated-access', refresh_token: 'rotated-refresh', token_type: 'Bearer', expires_in: 7200, scope: SCOPES, earliest_refresh_at: Date.now() / 1000 + 300 })
  })
  const contexts = await Promise.all(Array.from({ length: 6 }, () => f.service.getAuthContext(status.profileId)))
  assert.equal(refreshCalls, 1)
  for (const context of contexts) { assert.equal(context.accessToken, 'rotated-access'); context.release() }
  const latest = await f.service.store.readCredential(status.profileId)
  assert.equal(latest.refreshToken, 'rotated-refresh')
  assert.equal(latest.expiresIn, 7200)
  assert.notEqual(latest.version, old.version)
})

test('refresh terminal failure retains registration and requires reauthorization; temporary failure preserves renewable credentials', async t => {
  for (const terminal of [false, true]) {
    const f = await fixture(t)
    const status = await f.login()
    const credentials = await f.service.store.readCredential(status.profileId)
    await f.service.store.writeCredential(status.profileId, { ...credentials, expiresAt: Date.now() - 1 })
    f.tokenHandler(() => body({ error: terminal ? 'invalid_grant' : 'server_error', error_description: 'SECRET SERVER BODY' }, terminal ? 400 : 503))
    await assert.rejects(f.service.getAuthContext(status.profileId), error => error.state === (terminal ? 'reauth_required' : 'temporarily_unavailable') && !error.message.includes('SECRET'))
    assert.equal((await f.service.store.readCredential(status.profileId))?.refreshToken ?? null, terminal ? null : credentials.refreshToken)
    assert.equal((await f.service.getStatus(status.profileId)).state, terminal ? 'reauth_required' : 'temporarily_unavailable')
  }
})

test('switch and logout abort active account-bound requests across independent service instances', async t => {
  const f = await fixture(t)
  const first = await f.login()
  const second = await f.login({ clientId: 'oaiapp_second' })
  await f.service.switchProfile(first.profileId)
  const peer = new AuthService({ root: f.root, pollIntervalMs: 25 }); t.after(() => peer.dispose())
  const context = await peer.getAuthContext(first.profileId)
  await f.service.switchProfile(second.profileId)
  for (let i = 0; i < 40 && !context.signal.aborted; i++) await sleep(20)
  assert.equal(context.signal.aborted, true)
  await assert.rejects(peer.getAuthContext(first.profileId), { code: 'profile_not_active' })
  const current = await f.service.getAuthContext(second.profileId)
  const logout = await f.service.logout(second.profileId)
  assert.equal(current.signal.aborted, true)
  assert.equal(logout.localSignedOut, true); assert.equal(logout.remoteRevoked, true)
  assert.equal(await f.service.store.readCredential(second.profileId), null)
  assert.equal((await f.service.listProfiles()).length, 2)
  const returning = await f.prepare({ profileId: second.profileId, clientId: 'oaiapp_second' })
  assert.equal(returning.query.has('id_token_hint'), false)
  assert.equal(returning.query.get('client_id'), 'oaiapp_second')
  returning.attempt.cancel()
})

test('unconfirmed remote revocation is reported, local credentials always removed, and host/client mappings retained', async t => {
  const f = await fixture(t)
  const status = await f.login()
  const host = await f.service.store.getHost()
  f.revokeStatus(503)
  const result = await f.service.logout(status.profileId)
  assert.equal(result.localSignedOut, true)
  assert.equal(result.remoteRevoked, false)
  assert.equal((await f.service.getStatus(status.profileId)).state, 'signed_out')
  assert.deepEqual(await f.service.store.getHost(), host)
  const revokes = f.calls.filter(call => call.url === revokeUrl)
  assert.equal(revokes.length, 2)
  assert.equal(revokes[0].init.body.get('client_id'), 'oaiapp_test')
  assert.equal(revokes[0].init.body.get('token_type_hint'), 'refresh_token')
})

test('storage rejects traversal, symlink credentials and world-readable token files; stale dead lock recovers', async t => {
  const f = await fixture(t)
  await f.service.store.init()
  assert.throws(() => f.service.store.path('credentials/../../config.json'), { code: 'credential_storage_unsafe' })
  const target = join(f.root, 'target.json'); await writeFile(target, '{}', { mode: 0o600 })
  if (process.platform !== 'win32') {
    await symlink(target, join(f.root, 'credentials', 'symlink.json'))
    await assert.rejects(f.service.store.readCredential('symlink'), { code: 'credential_storage_unsafe' })
    await f.service.store.writeCredential('insecure', {})
    await chmod(join(f.root, 'credentials', 'insecure.json'), 0o644)
    await assert.rejects(f.service.store.readCredential('insecure'), { code: 'credential_storage_unsafe' })
  }
  const lock = join(f.root, 'locks', 'dead.lock')
  await mkdir(lock, { mode: 0o700 })
  await writeFile(join(lock, 'owner.json'), JSON.stringify({ owner: 'dead', pid: 2147483647, host: hostname(), leaseUntil: 1 }), { mode: 0o600 })
  await utimes(lock, new Date(0), new Date(0))
  assert.equal(await f.service.store.withLock('dead', async () => 'recovered'), 'recovered')
})

test('two real child processes share one rotating refresh authority', async t => {
  const f = await fixture(t)
  const status = await f.login()
  const credentials = await f.service.store.readCredential(status.profileId)
  await f.service.store.writeCredential(status.profileId, { ...credentials, expiresAt: Date.now() - 1 })
  let refreshCount = 0
  const server = createServer(async (request, response) => {
    let raw = ''; for await (const chunk of request) raw += chunk
    const form = new URLSearchParams(raw)
    assert.equal(form.get('refresh_token'), 'fixture-refresh-only')
    refreshCount++
    await sleep(150)
    response.setHeader('Content-Type', 'application/json')
    response.end(JSON.stringify({ access_token: 'child-access', refresh_token: 'child-refresh', token_type: 'Bearer', expires_in: 3600, scope: SCOPES }))
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise(resolve => server.close(resolve)))
  const local = `http://127.0.0.1:${server.address().port}`
  const module = new URL('../auth/service.mjs', import.meta.url).href
  const script = `
    import { AuthService } from ${JSON.stringify(module)};
    const service = new AuthService({root: process.argv[1], fetch: async (url, init) => {
      if (url.endsWith('/.well-known/openid-configuration')) return new Response(JSON.stringify(${JSON.stringify(discovery)}));
      const response = await fetch(${JSON.stringify(local)}, init);
      return new Response(await response.text(), {status: response.status});
    }});
    const context = await service.getAuthContext(process.argv[2]);
    if (context.accessToken !== 'child-access') throw new Error('Wrong token generation');
    process.stdout.write('ok'); context.release(); service.dispose();`
  const run = () => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--input-type=module', '-e', script, f.root, status.profileId], { stdio: ['ignore', 'pipe', 'pipe'] })
    let out = '', err = ''
    child.stdout.on('data', chunk => { out += chunk }); child.stderr.on('data', chunk => { err += chunk })
    child.on('error', reject); child.on('exit', code => code === 0 ? resolve(out) : reject(new Error(`Child failed: ${err}`)))
  })
  assert.deepEqual(await Promise.all([run(), run()]), ['ok', 'ok'])
  assert.equal(refreshCount, 1)
  assert.equal((await f.service.store.readCredential(status.profileId)).refreshToken, 'child-refresh')
})

test('singleton seam, aborted requests and cancelled pending login remain token-free', async t => {
  const f = await fixture(t)
  setAuthService(f.service)
  assert.equal(getAuthService(), f.service)
  const controller = new AbortController(); controller.abort()
  await assert.rejects(f.service.beginLogin({ signal: controller.signal }), { name: 'AbortError' })
  const pending = await f.service.beginLogin()
  pending.cancel()
  await assert.rejects(pending.completion, { name: 'AbortError' })
  assert.equal((await f.service.getStatus()).state, 'signed_out')
  setAuthService(undefined)
})

test('persisted pause blocks stale clients and aborts other process contexts without deleting credentials', async t => {
  const f = await fixture(t)
  const status = await f.login()
  const peer = new AuthService({ root: f.root, pollIntervalMs: 25 }); t.after(() => peer.dispose())
  const context = await peer.getAuthContext(status.profileId)
  const before = await f.service.store.readCredential(status.profileId)
  await f.service.pauseProfile(status.profileId)
  for (let i = 0; i < 40 && !context.signal.aborted; i++) await sleep(20)
  assert.equal(context.signal.aborted, true)
  assert.equal((await peer.getStatus(status.profileId)).paused, true)
  await assert.rejects(peer.getAuthContext(status.profileId), { code: 'profile_paused' })
  await assert.rejects(f.service.beginLogin({ profileId: status.profileId }), { code: 'profile_paused' })
  assert.deepEqual(await f.service.store.readCredential(status.profileId), before)
  await f.service.resumeProfile(status.profileId)
  const resumed = await peer.getAuthContext(status.profileId)
  assert.equal(resumed.accessToken, 'fixture-access-only'); resumed.release()
})

test('mismatched profile/token bindings cannot infer or revoke another registration', async t => {
  const f = await fixture(t)
  const status = await f.login()
  const credentials = await f.service.store.readCredential(status.profileId)
  await f.service.store.writeCredential(status.profileId, { ...credentials, clientId: 'another-registration' })
  await assert.rejects(f.service.getAuthContext(status.profileId), { code: 'credential_binding_mismatch' })
  const logout = await f.service.logout(status.profileId)
  assert.equal(logout.remoteRevoked, false)
  assert.equal(f.calls.filter(call => call.url === revokeUrl).length, 0)
  assert.equal(await f.service.store.readCredential(status.profileId), null)
})

test('an expired access token never refreshes before a future server floor and malformed floors fail closed', async t => {
  const f = await fixture(t)
  const status = await f.login()
  const credentials = await f.service.store.readCredential(status.profileId)
  await f.service.store.writeCredential(status.profileId, { ...credentials, expiresAt: Date.now() - 1, earliestRefreshAt: Date.now() + 60000 })
  const count = f.calls.filter(call => call.url === TOKEN).length
  await assert.rejects(f.service.getAuthContext(status.profileId), { code: 'refresh_not_yet_allowed' })
  await f.service.store.writeCredential(status.profileId, { ...credentials, expiresAt: Date.now() - 1, refreshContractUnknown: true })
  await assert.rejects(f.service.getAuthContext(status.profileId), { code: 'refresh_contract_unknown' })
  assert.equal(f.calls.filter(call => call.url === TOKEN).length, count)
})

test('request cancellation returns promptly without cancelling a shared refresh or losing rotation', async t => {
  const f = await fixture(t)
  const status = await f.login()
  const credentials = await f.service.store.readCredential(status.profileId)
  await f.service.store.writeCredential(status.profileId, { ...credentials, expiresAt: Date.now() - 1 })
  let started, finish
  const began = new Promise(resolve => { started = resolve })
  const gate = new Promise(resolve => { finish = resolve })
  f.tokenHandler(async () => {
    started(); await gate
    return body({ access_token: 'after-cancel', refresh_token: 'rotated-after-cancel', token_type: 'Bearer', expires_in: 3600, scope: SCOPES })
  })
  const controller = new AbortController()
  const pending = f.service.getAuthContext(status.profileId, { signal: controller.signal })
  await began; controller.abort()
  await assert.rejects(pending, { name: 'AbortError' })
  finish()
  const context = await f.service.getAuthContext(status.profileId)
  assert.equal(context.accessToken, 'after-cancel'); context.release()
  assert.equal((await f.service.store.readCredential(status.profileId)).refreshToken, 'rotated-after-cancel')
})

test('concurrent stale-lock reclaimers cannot remove a newly acquired refresh authority', async t => {
  const f = await fixture(t)
  await f.service.store.init()
  const store = new CredentialStore({ root: f.root, leaseMs: 1000, lockTimeoutMs: 3000 })
  const path = join(f.root, 'locks', 'reclaim.lock')
  const ownerPath = join(path, 'owner.json')
  await mkdir(path, { mode: 0o700 })
  await writeFile(ownerPath, JSON.stringify({ owner: 'dead', pid: 2147483647, host: hostname(), leaseUntil: 1 }), { mode: 0o600 })
  await utimes(path, new Date(0), new Date(0))
  const originalRead = fs.readFile, originalRename = fs.rename
  let staleReads = 0, renameArrivals = 0, releaseReads, releaseRenames
  const readBarrier = new Promise(resolve => { releaseReads = resolve })
  const renameBarrier = new Promise(resolve => { releaseRenames = resolve })
  let active = 0, maxActive = 0, activeBeforeSecondRename = -1
  fs.readFile = async function (target, ...args) {
    const result = await originalRead.call(this, target, ...args)
    if (target === ownerPath && String(result).includes('"owner":"dead"') && staleReads < 2) {
      staleReads++
      if (staleReads === 2) releaseReads()
      await readBarrier
    }
    return result
  }
  fs.rename = async function (source, destination) {
    if (source === path && destination.includes('.stale-')) {
      const order = ++renameArrivals
      if (order === 2) releaseRenames()
      await renameBarrier
      if (order === 2) {
        await sleep(80)
        activeBeforeSecondRename = active
      }
    }
    return originalRename.call(this, source, destination)
  }
  const rescue = setTimeout(() => { releaseReads(); releaseRenames() }, 1500)
  try {
    await Promise.all([1, 2].map(() => store.withLock('reclaim', async () => {
      active++; maxActive = Math.max(maxActive, active)
      await sleep(120)
      active--
    })))
    assert.equal(renameArrivals, 2, 'force both contenders to observe the same expired generation')
    assert.equal(activeBeforeSecondRename, 0, 'a live authority must wait until all stale observations finish')
    assert.equal(maxActive, 1)
  } finally {
    clearTimeout(rescue); fs.readFile = originalRead; fs.rename = originalRename
  }
})

test('ambiguous dispatched refresh cannot automatically reuse a potentially consumed rotating token', async t => {
  const f = await fixture(t)
  const status = await f.login()
  const credentials = await f.service.store.readCredential(status.profileId)
  await f.service.store.writeCredential(status.profileId, { ...credentials, expiresAt: Date.now() - 1 })
  let calls = 0
  f.tokenHandler(() => { calls++; throw new TypeError('Connection dropped after request was sent') })
  await assert.rejects(f.service.getAuthContext(status.profileId), { code: 'refresh_outcome_unknown' })
  assert.equal((await f.service.getStatus(status.profileId)).state, 'reauth_required')
  assert.equal((await f.service.store.readCredential(status.profileId)).refreshToken, credentials.refreshToken)
  await assert.rejects(f.service.getAuthContext(status.profileId), { code: 'reauth_required' })
  assert.equal(calls, 1)
})

test('crash-left refresh intent blocks old-token reuse after lock recovery and cannot claim successor revocation', async t => {
  const f = await fixture(t)
  const status = await f.login()
  const credentials = await f.service.store.readCredential(status.profileId)
  await f.service.store.writeCredential(status.profileId, { ...credentials, refreshPending: { id: 'interrupted-process', startedAt: Date.now() - 60000 } })
  const before = f.calls.filter(call => call.url === TOKEN).length
  await assert.rejects(f.service.getAuthContext(status.profileId), { code: 'refresh_outcome_unknown' })
  assert.equal(f.calls.filter(call => call.url === TOKEN).length, before)
  assert.equal((await f.service.getStatus(status.profileId)).state, 'reauth_required')
  assert.equal((await f.service.logout(status.profileId)).remoteRevoked, false)
})

test('malformed successful refresh leaves durable uncertainty and cannot replay a consumed token', async t => {
  const f = await fixture(t)
  const status = await f.login()
  const credentials = await f.service.store.readCredential(status.profileId)
  await f.service.store.writeCredential(status.profileId, { ...credentials, expiresAt: Date.now() - 1 })
  let calls = 0
  f.tokenHandler(() => { calls++; return body({ access_token: 'rotated-but-incomplete' }) })
  await assert.rejects(f.service.getAuthContext(status.profileId), { code: 'refresh_outcome_unknown' })
  assert.ok((await f.service.store.readCredential(status.profileId)).refreshPending)
  await assert.rejects(f.service.getAuthContext(status.profileId), { code: 'reauth_required' })
  assert.equal(calls, 1)
})

test('initial invalid_grant retains only issued registration for the next explicit fresh OAuth attempt', async t => {
  const f = await fixture(t)
  const first = await f.prepare()
  f.tokenHandler(() => body({ error: 'invalid_grant' }, 400))
  await assert.rejects(f.service.completeLogin(first.attempt.loginId, first.callback.href), { code: 'invalid_grant' })
  assert.deepEqual(await f.service.listProfiles(), [])
  assert.equal((await f.service.store.readProfiles()).activeProfileId, null)
  f.tokenHandler(null)
  const retry = await f.prepare()
  assert.equal(retry.query.get('client_id'), 'oaiapp_test')
  assert.equal(retry.query.has('agent_name_hint'), false)
  assert.equal(retry.query.has('id_token_hint'), false)
  assert.notEqual(retry.query.get('state'), first.query.get('state'))
  assert.notEqual(retry.query.get('nonce'), first.query.get('nonce'))
  assert.notEqual(retry.query.get('code_challenge'), first.query.get('code_challenge'))
  retry.callback.searchParams.delete('client_id')
  assert.equal((await f.service.completeLogin(retry.attempt.loginId, retry.callback.href)).state, 'ready')
  assert.equal(f.service.registrationRetry, null)
  const fresh = await f.service.beginLogin({ newAccount: true })
  assert.equal(new URL(fresh.authorizationUrl).searchParams.get('client_id'), 'dynamic_agent_client')
  fresh.cancel()
})
