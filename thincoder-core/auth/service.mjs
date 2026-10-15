import { randomUUID, createHash } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { inspect } from 'node:util'
import { setTimeout as sleep } from 'node:timers/promises'
import { CredentialStore } from './credential-store.mjs'
import { OidcClient, RESOURCE, hasPlanScope } from './oidc.mjs'
import { beginLogin, completeLogin, finishLogin } from './login.mjs'
import { tokenSet, refreshDue } from './tokens.mjs'
import { authError, abortError, checkSignal } from './errors.mjs'

const cleanLabel = value => String(value || 'ChatGPT account').replace(/[\x00-\x1f\x7f]/g, '').slice(0, 120)
const absent = () => authError('chatgpt_signed_out', 'Sign in to the selected ChatGPT account first.', { state: 'signed_out' })

function assertCredentialBinding(profile, credentials) {
  if (!credentials || ['issuer', 'subject', 'clientId', 'hostId', 'sessionId'].some(key => !profile[key] || credentials[key] !== profile[key])) {
    throw authError('credential_binding_mismatch', 'The saved ChatGPT credentials do not match this registration. Sign in again.', { state: 'reauth_required' })
  }
}

async function abortable(promise, signal) {
  checkSignal(signal)
  let onAbort
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      onAbort = () => reject(abortError())
      signal.addEventListener('abort', onAbort, { once: true })
      if (signal.aborted) onAbort()
    })])
  } finally { signal.removeEventListener('abort', onAbort) }
}

/** One authority per local host, shared by CLI, VS Code and Desktop main process. */
export class AuthService extends EventEmitter {
  constructor({ store, root, fetch, now = Date.now, requestTimeoutMs, pollIntervalMs = 250 } = {}) {
    super()
    this.store = store || new CredentialStore({ root })
    this.oidc = new OidcClient({ fetch, now, requestTimeoutMs })
    this.now = now
    this.pollIntervalMs = Math.max(25, pollIntervalMs)
    this.pending = new Map()
    this.registrationRetry = null
    this.refreshes = new Map()
    this.controllers = new Map()
    this.states = new Map()
    this.outcomes = new Map()
  }

  beginLogin(options) { return beginLogin(this, options) }
  completeLogin(loginId, callbackUrl) { return completeLogin(this, loginId, callbackUrl) }

  async acceptLogin({ pending, clientId, identity, token }) {
    const binding = { ...identity, clientId, hostId: pending.hostId }
    const profileId = pending.selected?.profileId || `chatgpt-${createHash('sha256').update(JSON.stringify([identity.issuer, identity.subject, clientId, pending.hostId])).digest('hex').slice(0, 32)}`
    const credentials = { ...tokenSet(token, { now: this.now() }), ...binding, sessionId: randomUUID() }
    await this.store.withLock(profileId, async () => {
      checkSignal(pending.controller.signal)
      await this.store.withLock('profiles', async () => {
        const profiles = await this.store.readProfiles()
        const existing = profiles.profiles.find(p => p.profileId === profileId)
        if (existing?.paused) throw authError('profile_paused', 'ChatGPT plan access was disabled while sign-in was in progress.')
        if (existing && ['issuer', 'subject', 'clientId', 'hostId'].some(key => existing[key] !== binding[key])) throw authError('account_identity_mismatch', 'The ChatGPT registration does not match this account.')
        await this.store.writeCredential(profileId, credentials)
        const record = {
          profileId, ...binding, label: existing?.label || `${cleanLabel(identity.email || identity.name)} (${profileId.slice(-6)})`,
          state: hasPlanScope(credentials.scopes) ? 'ready' : 'signed_in_without_plan_scope', paused: false, sessionId: credentials.sessionId,
        }
        profiles.profiles = [...profiles.profiles.filter(p => p.profileId !== profileId), record]
        this.cancelProfile(profiles.activeProfileId)
        this.cancelProfile(profileId)
        profiles.activeProfileId = profileId
        profiles.activation = (profiles.activation || 0) + 1
        await this.store.write('profiles.json', profiles)
      }, { signal: pending.controller.signal })
    }, { signal: pending.controller.signal })
    this.states.delete(profileId)
    if (this.registrationRetry?.clientId === clientId) this.registrationRetry = null
    this.emit('profileChanged', { profileId })
    return this.getStatus(profileId)
  }

  async getStatus(profileId) {
    await this.store.init()
    const profiles = await this.store.readProfiles()
    const id = profileId || profiles.activeProfileId
    const profile = profiles.profiles.find(p => p.profileId === id)
    const authorizing = [...this.pending.values()].some(p => p.selected?.profileId === id || (!id && !p.selected))
    if (!profile) return { profileId: id || null, label: null, state: authorizing ? 'authorizing' : 'signed_out', planAuthorized: false, active: false, lastInference: null }
    const credentials = await this.store.readCredential(id)
    let bound = false
    try { assertCredentialBinding(profile, credentials); bound = true } catch { /* public status never exposes credential diagnostics */ }
    let state = !credentials ? 'signed_out' : hasPlanScope(credentials.scopes) ? 'ready' : 'signed_in_without_plan_scope'
    if (credentials && this.states.has(id)) state = this.states.get(id)
    if (profile.state === 'reauth_required' || (credentials && !bound)) state = 'reauth_required'
    if (credentials?.refreshPending && state !== 'refreshing') state = 'reauth_required'
    if (authorizing) state = 'authorizing'
    return { profileId: id, label: profile.label, email: profile.email, clientId: profile.clientId, state,
      planAuthorized: bound && hasPlanScope(credentials.scopes), paused: profile.paused === true, active: profiles.activeProfileId === id,
      lastInference: this.outcomes.get(id)?.lastInference || null }
  }

  async listProfiles() {
    await this.store.init()
    const profiles = await this.store.readProfiles()
    return Promise.all(profiles.profiles.map(profile => this.getStatus(profile.profileId)))
  }

  cancelProfile(profileId) {
    for (const controller of this.controllers.get(profileId) || []) controller.abort(abortError())
    this.controllers.delete(profileId)
  }

  async switchProfile(profileId) {
    await this.store.init()
    await this.store.withLock('profiles', async () => {
      const profiles = await this.store.readProfiles()
      const profile = profiles.profiles.find(p => p.profileId === profileId)
      if (!profile || !await this.store.readCredential(profileId) || profile.state === 'signed_out') throw absent()
      if (profiles.activeProfileId !== profileId) {
        this.cancelProfile(profiles.activeProfileId)
        profiles.activeProfileId = profileId
        profiles.activation = (profiles.activation || 0) + 1
        await this.store.write('profiles.json', profiles)
      }
    })
    this.emit('profileChanged', { profileId })
    return this.getStatus(profileId)
  }

  async pauseProfile(profileId) {
    this.cancelProfile(profileId)
    for (const pending of this.pending.values()) if (pending.selected?.profileId === profileId) finishLogin(this, pending, abortError())
    await this.store.withLock('profiles', async () => {
      const profiles = await this.store.readProfiles()
      const profile = profiles.profiles.find(p => p.profileId === profileId)
      if (!profile) throw absent()
      profile.paused = true
      if (profiles.activeProfileId === profileId) profiles.activation = (profiles.activation || 0) + 1
      await this.store.write('profiles.json', profiles)
    })
    this.emit('profileChanged', { profileId })
    return this.getStatus(profileId)
  }

  async resumeProfile(profileId) {
    await this.store.withLock('profiles', async () => {
      const profiles = await this.store.readProfiles()
      const profile = profiles.profiles.find(p => p.profileId === profileId)
      if (!profile) throw absent()
      profile.paused = false
      await this.store.write('profiles.json', profiles)
    })
    return this.getStatus(profileId)
  }

  async markReauthRequired(profileId) {
    await this.store.withLock('profiles', async () => {
      const latest = await this.store.readProfiles()
      const saved = latest.profiles.find(p => p.profileId === profileId)
      if (saved) saved.state = 'reauth_required'
      await this.store.write('profiles.json', latest)
    })
  }

  async refresh(profileId) {
    if (this.refreshes.has(profileId)) return this.refreshes.get(profileId)
    const promise = this.store.withLock(profileId, async () => {
      // Another process may have rotated the token while this process waited.
      let credentials = await this.store.readCredential(profileId)
      const profiles = await this.store.readProfiles()
      const profile = profiles.profiles.find(p => p.profileId === profileId)
      if (profile?.state === 'reauth_required') throw authError('reauth_required', 'Sign in to this ChatGPT account again.', { state: 'reauth_required' })
      if (!credentials || !profile || profile.state === 'signed_out') throw absent()
      if (profile.paused) throw authError('profile_paused', 'ChatGPT plan access is disabled for this saved account.')
      assertCredentialBinding(profile, credentials)
      if (credentials.refreshPending) {
        await this.markReauthRequired(profileId)
        throw authError('refresh_outcome_unknown', 'An earlier ChatGPT refresh did not finish safely. Sign in again before resuming.', { state: 'reauth_required' })
      }
      if (!refreshDue(credentials, this.now())) return credentials
      if (credentials.refreshContractUnknown) throw authError('refresh_contract_unknown', 'ChatGPT returned an undocumented refresh schedule. Update ThinCoder before renewing this session.')
      if (credentials.earliestRefreshAt && this.now() < credentials.earliestRefreshAt) throw authError('refresh_not_yet_allowed', 'ChatGPT has not yet allowed this session to refresh.', { retryable: true })
      if (!credentials.refreshToken) throw authError('reauth_required', 'This ChatGPT session cannot renew. Sign in again.', { state: 'reauth_required' })
      await this.oidc.discovery() // No durable refresh intent until discovery is available.
      this.states.set(profileId, 'refreshing')
      await this.store.writeCredential(profileId, { ...credentials, refreshPending: { id: randomUUID(), startedAt: this.now() } })
      try {
        const response = await this.oidc.exchange({ grant_type: 'refresh_token', client_id: profile.clientId, refresh_token: credentials.refreshToken, resource: RESOURCE })
        if (response.id_token) await this.oidc.verifyIdToken(response.id_token, { clientId: profile.clientId, identity: profile, accessToken: response.access_token })
        credentials = { ...credentials, ...tokenSet(response, { now: this.now(), previous: credentials }), refreshPending: null }
        await this.store.writeCredential(profileId, credentials)
        this.states.delete(profileId)
        return credentials
      } catch (error) {
        if (error.refreshRejected) {
          if (error.code === 'invalid_grant') await this.store.removeCredential(profileId)
          else await this.store.writeCredential(profileId, credentials)
        } else if (error.state !== 'reauth_required') {
          // Includes a malformed HTTP 200, identity failure or disk failure after
          // rotation. Retain the durable intent; never replay the old token.
          error = authError('refresh_outcome_unknown', 'The ChatGPT refresh did not finish safely. Sign in again before resuming.', { state: 'reauth_required' })
        }
        this.states.set(profileId, error.state || 'temporarily_unavailable')
        if (error.state === 'reauth_required') await this.markReauthRequired(profileId)
        throw error
      }
    })
    this.refreshes.set(profileId, promise)
    try { return await promise } finally { if (this.refreshes.get(profileId) === promise) this.refreshes.delete(profileId) }
  }

  async getAuthContext(profileId, { signal } = {}) {
    checkSignal(signal)
    await this.store.init()
    const profiles = await this.store.readProfiles()
    const id = profileId || profiles.activeProfileId
    const profile = profiles.profiles.find(p => p.profileId === id)
    if (!profile || profile.state === 'signed_out') throw absent()
    if (profile.state === 'reauth_required') throw authError('reauth_required', 'Sign in to this ChatGPT account again.', { state: 'reauth_required' })
    if (profile.paused) throw authError('profile_paused', 'ChatGPT plan access is disabled for this saved account.')
    if (profiles.activeProfileId !== id) throw authError('profile_not_active', 'Select this saved ChatGPT account before starting a request.', { state: 'signed_out' })
    const controller = new AbortController()
    const combined = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal
    const registered = this.controllers.get(id) || new Set()
    registered.add(controller); this.controllers.set(id, registered)
    let released = false, checking = false
    const release = () => {
      if (released) return
      released = true
      clearInterval(watcher)
      combined.removeEventListener('abort', release)
      registered.delete(controller)
      if (!registered.size) this.controllers.delete(id)
    }
    const verifyBinding = async () => {
      const latest = await this.store.readProfiles()
      const current = latest.profiles.find(p => p.profileId === id)
      if (latest.activation !== profiles.activation || latest.activeProfileId !== id || !current || ['signed_out', 'reauth_required'].includes(current.state) || current.paused || current.sessionId !== profile.sessionId) throw abortError()
    }
    const watcher = setInterval(async () => {
      if (checking || released) return
      checking = true
      try { await verifyBinding() } catch { controller.abort(abortError()) } finally { checking = false }
    }, this.pollIntervalMs)
    watcher.unref()
    combined.addEventListener('abort', release, { once: true })
    try {
      let credentials = await this.store.readCredential(id)
      if (!credentials) throw absent()
      assertCredentialBinding(profile, credentials)
      if (!hasPlanScope(credentials.scopes)) throw authError('plan_scope_missing', 'This ChatGPT sign-in does not grant plan usage. Authorize ChatGPT plan usage first.', { state: 'signed_in_without_plan_scope' })
      if (credentials.refreshPending || refreshDue(credentials, this.now())) credentials = await abortable(this.refresh(id), combined)
      checkSignal(combined)
      await verifyBinding()
      if (this.now() >= credentials.expiresAt) {
        if (credentials.earliestRefreshAt > this.now()) throw authError('refresh_not_yet_allowed', 'ChatGPT has not yet allowed this session to refresh.', { retryable: true })
        throw authError('token_expired', 'The ChatGPT session has expired and is not yet renewable.', { state: 'reauth_required' })
      }
      if (!hasPlanScope(credentials.scopes)) throw authError('plan_scope_missing', 'ChatGPT plan usage permission is no longer granted.', { state: 'signed_in_without_plan_scope' })
      const context = { type: 'chatgpt_oauth', profileId: id, credentialRef: id, clientId: profile.clientId,
        issuer: profile.issuer, subject: profile.subject, hostId: profile.hostId, signal: combined, release }
      Object.defineProperty(context, 'accessToken', { get() { checkSignal(combined); if (released) throw abortError(); return credentials.accessToken }, enumerable: false })
      Object.defineProperty(context, 'toJSON', { value: () => ({ type: 'chatgpt_oauth', profileId: id, clientId: profile.clientId }) })
      Object.defineProperty(context, inspect.custom, { value: () => ({ type: 'chatgpt_oauth', profileId: id, accessToken: '[REDACTED]' }) })
      return Object.freeze(context)
    } catch (error) { release(); throw error }
  }

  /** Record only sanitized outcome metadata; never prompts, bodies, headers or credentials. */
  recordOutcome(profileId, { state, lastInference } = {}) {
    if (['ready', 'usage_limited', 'reauth_required', 'temporarily_unavailable'].includes(state)) this.states.set(profileId, state)
    if (lastInference === 'completed') this.outcomes.set(profileId, { lastInference: { status: 'completed', at: new Date(this.now()).toISOString() } })
  }

  async logout(profileId) {
    await this.store.init()
    const profiles = await this.store.readProfiles()
    const id = profileId || profiles.activeProfileId
    if (!id) return { localSignedOut: true, remoteRevoked: false }
    this.cancelProfile(id)
    for (const pending of this.pending.values()) if (pending.selected?.profileId === id) finishLogin(this, pending, abortError())
    let remoteRevoked = false
    await this.store.withLock(id, async () => {
      const credentials = await this.store.readCredential(id)
      const registration = (await this.store.readProfiles()).profiles.find(p => p.profileId === id)
      let bindingValid = false
      try { if (registration) { assertCredentialBinding(registration, credentials); bindingValid = true } } catch { /* clear locally without transmitting mismatched tokens */ }
      await this.store.withLock('profiles', async () => {
        const latest = await this.store.readProfiles()
        const profile = latest.profiles.find(p => p.profileId === id)
        if (profile) { profile.state = 'signed_out'; profile.sessionId = randomUUID() }
        if (latest.activeProfileId === id) { latest.activeProfileId = null; latest.activation = (latest.activation || 0) + 1 }
        await this.store.write('profiles.json', latest)
      })
      try {
        if (bindingValid && credentials?.refreshToken) {
          for (let attempt = 0; attempt < 2 && !remoteRevoked; attempt++) {
            try {
              remoteRevoked = await this.oidc.revoke(credentials.refreshToken, credentials.clientId)
              // An unobserved rotation may have replaced this refresh token.
              // Invalid-token HTTP 200 cannot confirm revocation of that successor.
              if (credentials.refreshPending) remoteRevoked = false
              break // Non-retryable rejection or confirmed revocation.
            } catch (error) {
              if (!error.retryable) break
              if (attempt === 0) await sleep(200)
            }
          }
        }
      } finally { await this.store.removeCredential(id) }
    })
    this.states.delete(id); this.outcomes.delete(id)
    this.emit('logout', { profileId: id, remoteRevoked })
    return { profileId: id, localSignedOut: true, remoteRevoked }
  }

  toJSON() { return { type: 'AuthService' } }
  [inspect.custom]() { return this.toJSON() }

  dispose() {
    this.registrationRetry = null
    for (const pending of this.pending.values()) finishLogin(this, pending, abortError())
    for (const profileId of this.controllers.keys()) this.cancelProfile(profileId)
    this.removeAllListeners()
  }
}

let singleton
export function getAuthService(options) { return singleton ||= new AuthService(options) }
/** Explicit host/test dependency injection; never persisted or selected by provider configuration. */
export function setAuthService(service) { singleton?.dispose?.(); singleton = service }
export { AuthError } from './errors.mjs'
