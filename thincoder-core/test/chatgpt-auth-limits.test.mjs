import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { AuthService } from '../auth/service.mjs'
import { resolveProviderAuth, recordProviderInference, _setAuthServiceForTest } from '../provider/auth-context.mjs'
import { createAuthClient, publicAuthStatus } from '../auth/client.mjs'
import { presetToEntry } from '../config-presets.mjs'
import { fixture } from './fixtures/chatgpt-auth.mjs'
import { TOKEN } from '../auth/oidc.mjs'

test('usage-limit gate is shared across services and clears only on explicit account resume', async t => {
  const f = await fixture(t), status = await f.login()
  const peer = new AuthService({ root: f.root, pollIntervalMs: 25 }); t.after(() => peer.dispose())
  const context = await peer.getAuthContext(status.profileId)
  const before = await f.service.store.readCredential(status.profileId)
  await f.service.recordUsageLimit(status.profileId)
  for (let i = 0; i < 40 && !context.signal.aborted; i++) await sleep(20)
  assert.equal(context.signal.aborted, true)
  assert.equal((await peer.getStatus(status.profileId)).state, 'usage_limited')
  await assert.rejects(peer.getAuthContext(status.profileId), { code: 'subscription_sharing_usage_limit_exceeded', state: 'usage_limited' })
  await assert.rejects(f.service.refresh(status.profileId), { code: 'subscription_sharing_usage_limit_exceeded' })
  await f.service.recordInference(status.profileId, { status: 'completed', model: 'fixture', accessToken: 'must-not-persist' })
  assert.equal((await f.service.getStatus(status.profileId)).state, 'usage_limited')
  assert.deepEqual(await f.service.store.readCredential(status.profileId), before)
  assert.equal((await readFile(join(f.root, 'profiles.json'), 'utf8')).includes('must-not-persist'), false)
  await peer.resumeProfile(status.profileId)
  assert.equal((await f.service.getStatus(status.profileId)).state, 'ready')
  const resumed = await f.service.getAuthContext(status.profileId); resumed.release()
  await f.service.recordInference(status.profileId, { status: 'usage_limited' })
  await peer.switchProfile(status.profileId)
  assert.equal((await f.service.getStatus(status.profileId)).state, 'ready')
  const selected = await f.service.getAuthContext(status.profileId); selected.release()
  await f.service.recordUsageLimit(status.profileId)
  await f.login({ profileId: status.profileId })
  assert.equal((await peer.getStatus(status.profileId)).state, 'ready')
})


test('gateway and status observe a different client explicitly resuming a persisted usage pause', async t => {
  const f = await fixture(t), status = await f.login()
  const peer = new AuthService({ root: f.root }); t.after(() => peer.dispose())
  const provider = { ...presetToEntry('openai-chatgpt'), auth: { type: 'chatgpt_oauth', enabled: true, credentialRef: status.profileId }, model: 'fixture' }
  _setAuthServiceForTest(f.service)
  t.after(() => _setAuthServiceForTest(null))
  const limited = { code: 'subscription_sharing_usage_limit_exceeded' }
  await recordProviderInference(provider, limited)
  assert.equal(publicAuthStatus(await f.service.getStatus(status.profileId)).state, 'usage_limited')
  await assert.rejects(resolveProviderAuth(provider, { path: '/responses' }), limited)
  await peer.resumeProfile(status.profileId)
  assert.equal(publicAuthStatus(await f.service.getStatus(status.profileId)).state, 'ready')
  const resumed = await resolveProviderAuth(provider, { path: '/responses' }); resumed.release()
  await recordProviderInference(provider, { terminalStatus: 'completed' })
  assert.equal(f.service.getInferenceStatus(status.profileId).status, 'completed')
  await recordProviderInference(provider, limited)
  await assert.rejects(peer.getAuthContext(status.profileId), limited)
})


test('concurrent usage-limit reports share persistence without leaving a stale local pause', async t => {
  const f = await fixture(t), status = await f.login()
  const peer = new AuthService({ root: f.root }); t.after(() => peer.dispose())
  const provider = { ...presetToEntry('openai-chatgpt'), auth: { type: 'chatgpt_oauth', enabled: true, credentialRef: status.profileId }, model: 'fixture' }
  let release, writes = 0
  const gate = new Promise(resolve => { release = resolve })
  const persist = f.service.recordUsageLimit.bind(f.service)
  f.service.recordUsageLimit = async id => { writes++; await gate; return persist(id) }
  _setAuthServiceForTest(f.service)
  t.after(() => _setAuthServiceForTest(null))
  const limited = { code: 'subscription_sharing_usage_limit_exceeded' }
  const first = recordProviderInference(provider, limited), second = recordProviderInference(provider, limited)
  release(); await Promise.all([first, second])
  assert.equal(writes, 1)
  assert.equal(f.service.getInferenceStatus(status.profileId).sharedPauseSaved, true)
  await peer.resumeProfile(status.profileId)
  const resumed = await resolveProviderAuth(provider, { path: '/responses' }); resumed.release()
})

test('inference snapshots belong to the selected service and expose only outcome metadata', async t => {
  const f = await fixture(t), signedIn = await f.login()
  const peer = new AuthService({ root: f.root }); t.after(() => peer.dispose())
  const raw = { providers: [{ name: 'openai-chatgpt', auth: { type: 'chatgpt_oauth', enabled: true, credentialRef: signedIn.profileId } }] }
  const client = createAuthClient({ service: f.service, read: () => raw })
  const peerClient = createAuthClient({ service: peer, read: () => raw })
  const before = await readFile(join(f.root, 'profiles.json'), 'utf8')
  await f.service.recordInference(signedIn.profileId, {
    status: 'completed', model: 'fixture', requestId: 'request-only',
    accessToken: 'SECRET', body: { prompt: 'PRIVATE' }, headers: { Authorization: 'SECRET' },
  })
  const status = await client.status()
  assert.deepEqual(status.lastInference, { status: 'completed', model: 'fixture', at: f.service.getInferenceStatus(signedIn.profileId).at })
  assert.equal(Number.isFinite(status.lastInference.at), true)
  assert.deepEqual((await client.list())[0].lastInference, status.lastInference)
  assert.equal((await peerClient.status()).lastInference, null)
  assert.equal(peer.getInferenceStatus(signedIn.profileId), null)
  assert.equal(await readFile(join(f.root, 'profiles.json'), 'utf8'), before)
  const snapshot = f.service.getInferenceStatus(signedIn.profileId)
  assert.equal(snapshot.requestId, 'request-only')
  assert.equal(JSON.stringify(snapshot).includes('SECRET'), false)
  assert.equal(JSON.stringify(snapshot).includes('PRIVATE'), false)
  assert.equal(JSON.stringify(status).includes('request-only'), false)
  snapshot.status = 'usage_limited'
  assert.equal(f.service.getInferenceStatus(signedIn.profileId).status, 'completed')
})

test('an unsaved usage pause stops an already-waiting refresh before token dispatch', async t => {
  const f = await fixture(t), signedIn = await f.login()
  const peer = new AuthService({ root: f.root }); t.after(() => peer.dispose())
  const credentials = await f.service.store.readCredential(signedIn.profileId)
  await f.service.store.writeCredential(signedIn.profileId, { ...credentials, expiresAt: Date.now() - 1 })
  let entered, resume
  const discoveryStarted = new Promise(resolve => { entered = resolve })
  const discoveryReady = new Promise(resolve => { resume = resolve })
  const discover = f.service.oidc.discovery.bind(f.service.oidc)
  f.service.oidc.discovery = async (...args) => { entered(); await discoveryReady; return discover(...args) }
  const refresh = f.service.refresh(signedIn.profileId)
  await discoveryStarted
  const write = f.service.store.write.bind(f.service.store)
  let writes = 0
  f.service.store.write = async (name, value) => {
    if (name === 'profiles.json') { writes++; throw new Error('SECRET storage diagnostic') }
    return write(name, value)
  }
  await assert.rejects(f.service.recordInference(signedIn.profileId, { status: 'usage_limited', model: 'fixture' }), error => {
    assert.equal(error.code, 'subscription_sharing_usage_limit_exceeded')
    assert.match(error.message, /shared pause could not be saved/)
    assert.equal(String(error).includes('SECRET'), false)
    return true
  })
  await f.service.recordInference(signedIn.profileId, { status: 'completed', model: 'late-response' })
  await f.service.recordInference(signedIn.profileId, { status: 'usage_limited' })
  assert.equal(writes, 1)
  const tokenRequests = f.calls.filter(call => call.url === TOKEN).length
  resume()
  await assert.rejects(refresh, { code: 'subscription_sharing_usage_limit_exceeded' })
  assert.equal(f.calls.filter(call => call.url === TOKEN).length, tokenRequests)
  assert.equal((await f.service.store.readCredential(signedIn.profileId)).refreshPending, undefined)
  assert.equal((await f.service.getStatus(signedIn.profileId)).state, 'usage_limited')
  await assert.rejects(f.service.getAuthContext(signedIn.profileId), { code: 'subscription_sharing_usage_limit_exceeded' })
  await assert.rejects(f.service.refresh(signedIn.profileId), { code: 'subscription_sharing_usage_limit_exceeded' })
  assert.equal((await peer.getStatus(signedIn.profileId)).state, 'ready')
  f.service.store.write = write
  await f.service.store.writeCredential(signedIn.profileId, credentials)
  await f.service.resumeProfile(signedIn.profileId)
  assert.equal(f.service.getInferenceStatus(signedIn.profileId), null)
  const resumed = await f.service.getAuthContext(signedIn.profileId); resumed.release()
})

test('account lifecycle actions clear their own inference evidence without a client cache', async t => {
  const f = await fixture(t), signedIn = await f.login()
  const complete = () => f.service.recordInference(signedIn.profileId, { status: 'completed', model: 'fixture' })
  const cleared = async () => {
    assert.equal(f.service.getInferenceStatus(signedIn.profileId), null)
    assert.equal((await f.service.getStatus(signedIn.profileId)).lastInference, null)
  }
  await complete(); await f.service.resumeProfile(signedIn.profileId); await cleared()
  await complete(); await f.service.switchProfile(signedIn.profileId); await cleared()
  await complete(); await f.login({ profileId: signedIn.profileId }); await cleared()
  await complete(); await f.service.logout(signedIn.profileId); await cleared()
})
