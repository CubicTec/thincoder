import test from "node:test"
import assert from "node:assert/strict"
import { createProviderExits } from "../../renderer/mount-settings-segments-providers.mjs"
import { initDict } from "../../renderer/i18n.mjs"
initDict({ locale: "en" })
const flush = () => new Promise((resolve) => setImmediate(resolve))
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done }); return { promise, resolve } }
function harness(ask, providers = {}) {
  let state = { settings: { providers } }, refreshes = 0
  const reports = []
  const setSettings = (patch) => { state = { settings: { ...state.settings, ...patch } } }
  const exits = createProviderExits({ ask, store: { get: () => state }, setSettings, report: (...args) => reports.push(args),
    loadProviders: async () => { refreshes++ }, onProvidersChanged: () => { refreshes++ } })
  return { get: () => state.settings.providers, set: (patch) => setSettings({ providers: { ...state.settings.providers, ...patch } }),
    action: exits.handlers.onAuthAction, reports, refreshes: () => refreshes }
}

test("Desktop Manage usage preserves revocation evidence and does not supersede a pending sign-in", async () => {
  const login = deferred()
  const h = harness(async (_channel, payload) => payload.action === "login" ? login.promise : { ok: true },
    { authNotice: { account: "Remote revocation was not confirmed" } })
  h.action("account", "manage"); await flush()
  assert.equal(h.get().authNotice.account, "Remote revocation was not confirmed")
  assert.equal(h.refreshes(), 0)
  h.action("account", "login")
  h.action("account", "manage"); await flush()
  assert.equal(h.get().authBusy.account, true)
  login.resolve({ ok: false, reason: "Sign-in failed; try again" }); await flush()
  assert.equal(h.get().authNotice.account, "Sign-in failed; try again")
  assert.equal(h.get().authBusy.account, false)
})

test("Desktop slow Manage usage failure does not overwrite a newer auth result", async () => {
  const manage = deferred()
  const h = harness(async (_channel, payload) => payload.action === "manage" ? manage.promise : { ok: false, reason: "Sign-in failed" })
  h.action("account", "manage")
  h.action("account", "login"); await flush()
  manage.resolve({ ok: false, reason: "Unable to open usage page" }); await flush()
  assert.equal(h.get().authNotice.account, "Sign-in failed")
  assert.equal(h.reports.length, 1)
  assert.equal(h.reports[0][1].reason, "Unable to open usage page")
})

test("Desktop pending auth generations cannot be duplicated by a settings snapshot", async () => {
  const first = deferred(), second = deferred(), actions = []
  const h = harness((_channel, payload) => { actions.push(payload.action); return actions.length === 1 ? first.promise : second.promise })
  h.action("account", "login")
  h.set({ authBusy: {} })
  h.action("account", "loginNew")
  assert.deepEqual(actions, ["login"])
  first.resolve({ ok: false, reason: "Cancelled" }); await flush()
  h.action("account", "enable", { enabled: true })
  h.set({ authMutating: {} })
  h.action("account", "select", { profileId: "another" })
  assert.deepEqual(actions, ["login", "enable"])
  second.resolve({ ok: true }); await flush()
  assert.equal(h.get().authMutating.account, false)
})
