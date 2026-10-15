import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { AuthService } from '../auth/service.mjs'
import { resolveProviderAuth, recordProviderInference, getInferenceStatus, clearInferenceStatus, _setAuthServiceForTest } from '../provider/auth-context.mjs'
import { publicAuthStatus } from '../auth/client.mjs'
import { presetToEntry } from '../config-presets.mjs'
import { fixture } from './fixtures/chatgpt-auth.mjs'

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
  f.service.recordOutcome(status.profileId, { state: 'ready', lastInference: 'completed', accessToken: 'must-not-persist' })
  assert.equal((await f.service.getStatus(status.profileId)).state, 'usage_limited')
  assert.deepEqual(await f.service.store.readCredential(status.profileId), before)
  assert.equal((await readFile(join(f.root, 'profiles.json'), 'utf8')).includes('must-not-persist'), false)
  await peer.resumeProfile(status.profileId)
  assert.equal((await f.service.getStatus(status.profileId)).state, 'ready')
  const resumed = await f.service.getAuthContext(status.profileId); resumed.release()
  await f.service.recordOutcome(status.profileId, { state: 'usage_limited' })
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
  t.after(() => { _setAuthServiceForTest(null); clearInferenceStatus(status.profileId) })
  const limited = { code: 'subscription_sharing_usage_limit_exceeded' }
  await recordProviderInference(provider, limited)
  assert.equal(publicAuthStatus(await f.service.getStatus(status.profileId), getInferenceStatus(status.profileId)).state, 'usage_limited')
  await assert.rejects(resolveProviderAuth(provider, { path: '/responses' }), limited)
  await peer.resumeProfile(status.profileId)
  assert.equal(publicAuthStatus(await f.service.getStatus(status.profileId), getInferenceStatus(status.profileId)).state, 'ready')
  const resumed = await resolveProviderAuth(provider, { path: '/responses' }); resumed.release()
  await recordProviderInference(provider, { terminalStatus: 'completed' })
  assert.equal(getInferenceStatus(status.profileId).status, 'completed')
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
  t.after(() => { _setAuthServiceForTest(null); clearInferenceStatus(status.profileId) })
  const limited = { code: 'subscription_sharing_usage_limit_exceeded' }
  const first = recordProviderInference(provider, limited), second = recordProviderInference(provider, limited)
  release(); await Promise.all([first, second])
  assert.equal(writes, 1)
  assert.equal(getInferenceStatus(status.profileId).sharedPauseSaved, true)
  await peer.resumeProfile(status.profileId)
  const resumed = await resolveProviderAuth(provider, { path: '/responses' }); resumed.release()
})
