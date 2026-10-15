import test from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createAuthClient, publicAuthStatus, authStatusText } from "@thincoder/core/auth/client.mjs"
import { authCommand, openSystemBrowser } from "../../src/cli/auth-command.mjs"
import { _setConfigPathForTest, _resetConfigPathForTest, addProviderEntry, persistRaw, loadRaw, resolveProviders, setProviderKey } from "@thincoder/core/config-io.mjs"

function fixture({ scope = true, enabled = false } = {}) {
  const raw = { providers: [{ name: "openai-chatgpt", baseURL: "https://api.openai.com/v1", format: "responses", auth: { type: "chatgpt_oauth", enabled }, builtinTools: false }] }
  const calls = []
  const profiles = [{ profileId: "account-a", label: "Account A", state: scope ? "ready" : "signed_in_without_plan_scope", planAuthorized: scope, accessToken: "SECRET", refreshToken: "REFRESH" }]
  const service = {
    async getStatus(id) { calls.push(["status", id]); return profiles.find((p) => p.profileId === id) ?? { state: "signed_out" } },
    async listProfiles() { return profiles },
    async switchProfile(id) { calls.push(["select", id]) },
    async pauseProfile(id) { calls.push(["pause", id]) },
    async resumeProfile(id) { calls.push(["resume", id]) },
    async logout(id) { calls.push(["logout", id]); profiles[0].state = "signed_out"; profiles[0].planAuthorized = false; return { localSignedOut: true, remoteRevoked: false, accessToken: "SECRET" } },
    async beginLogin(opts) { calls.push(["login", opts.profileId]); await opts.openBrowser("https://auth.openai.com/authorize?code=PRIVATE"); return { completion: Promise.resolve(profiles[0]), cancel() {} } },
  }
  const client = createAuthClient({ service, read: () => raw, write: (mutate) => { mutate(raw); return { ok: true } }, inference: () => null })
  return { raw, calls, profiles, service, client }
}

test("CLI explicit opt-in opens only the host browser and persists only an account reference", async () => {
  const f = fixture(), output = [], errors = [], urls = []
  assert.equal(await authCommand(["login"], { client: f.client, output: (v) => output.push(v), error: (v) => errors.push(v), openBrowser: (v) => urls.push(v) }), 1)
  assert.equal(urls.length, 0)
  assert.equal(await authCommand(["login", "--enable"], { client: f.client, output: (v) => output.push(v), error: (v) => errors.push(v), openBrowser: (v) => urls.push(v) }), 0)
  assert.equal(urls.length, 1)
  assert.deepEqual(f.raw.providers[0].auth, { type: "chatgpt_oauth", enabled: true, credentialRef: "account-a" })
  assert.ok(!JSON.stringify({ raw: f.raw, output }).includes("SECRET"))
  assert.ok(!output.join("\n").includes("PRIVATE"))
  assert.match(output.at(-1), /plan use authorized; inference not verified/)
})

test("identity-only login is not presented as authorized or inference-verified", async () => {
  const { client } = fixture({ scope: false, enabled: true })
  const status = await client.run({ action: "login", openBrowser() {} })
  assert.equal(status.planAuthorized, false)
  assert.equal(status.lastInference, null)
  assert.match(authStatusText(status), /signed in; plan use not authorized/)
  assert.equal(JSON.stringify(status).includes("SECRET"), false)
})

test("saved-account list and select do not expose token or registration objects", async () => {
  const f = fixture({ enabled: true })
  const list = await f.client.list()
  assert.equal(JSON.stringify(list).includes("SECRET"), false)
  assert.equal(list[0].clientId, undefined)
  await f.client.run({ action: "select", profileId: "account-a" })
  assert.equal(f.raw.providers[0].auth.credentialRef, "account-a")
  await assert.rejects(f.client.run({ action: "select", profileId: "unknown" }), /Unknown/)
})

test("disable pauses the durable profile; re-enable resumes it and logout reports revoke uncertainty", async () => {
  const f = fixture({ enabled: true })
  await f.client.run({ action: "select", profileId: "account-a" })
  await f.client.run({ action: "enable", enabled: false })
  assert.deepEqual(f.calls.at(-2), ["pause", "account-a"])
  await f.client.run({ action: "enable", enabled: true })
  assert.ok(f.calls.some(([type]) => type === "resume"))
  const result = await f.client.run({ action: "logout" })
  assert.equal(result.remoteRevoked, false)
  assert.equal(result.localSignedOut, true)
  assert.equal(result.planAuthorized, false)
  assert.equal(result.accessToken, undefined)
  assert.equal(f.raw.providers[0].auth.credentialRef, "account-a")
})

test("duplicate login and cancel cannot bind a completed stale login", async () => {
  const f = fixture({ enabled: true })
  let resolve, reject
  f.service.beginLogin = async () => ({ completion: new Promise((yes, no) => { resolve = yes; reject = no }), cancel: () => reject(new Error("cancelled")) })
  const login = f.client.run({ action: "login", openBrowser() {} })
  await Promise.resolve()
  await assert.rejects(f.client.run({ action: "login", openBrowser() {} }), /already in progress/)
  const rejected = assert.rejects(login, /cancelled/)
  await f.client.run({ action: "cancel" })
  resolve(f.profiles[0])
  await rejected
  assert.equal(f.raw.providers[0].auth.credentialRef, undefined)
})

test("--new starts a fresh registration and malformed CLI flags cannot mutate config", async () => {
  const f = fixture({ enabled: true })
  f.raw.providers[0].auth.credentialRef = "account-a"
  assert.equal(await authCommand(["login", "--new"], { client: f.client, output() {}, error() {}, openBrowser() {} }), 0)
  assert.ok(f.calls.some(([type, id]) => type === "login" && id === undefined))
  assert.equal(await authCommand(["login", "--bad"], { client: f.client, output() {}, error() {}, openBrowser() {} }), 1)
  assert.throws(() => openSystemBrowser("https://evil.example/authorize"), /Untrusted/)
})

test("configuration round-trip preserves opt-in/reference and API-key provider independence", () => {
  const root = mkdtempSync(join(tmpdir(), "thincoder-client-test-"))
  _setConfigPathForTest(join(root, "config.json"))
  try {
    assert.equal(addProviderEntry({ preset: "openai-chatgpt" }), null)
    assert.equal(addProviderEntry({ preset: "openai-responses", key: "fixture-api-key" }), null)
    persistRaw((raw) => { raw.providers[0].auth = { type: "chatgpt_oauth", enabled: true, credentialRef: "account-a" }; raw.providers[0].proxy = true })
    assert.deepEqual(resolveProviders().providers[0].auth, loadRaw().providers[0].auth)
    assert.match(setProviderKey("openai-chatgpt", "wrong-key"), /not accepted/)
    assert.equal(loadRaw().providers[0].apiKey, undefined)
    assert.equal(loadRaw().providers[1].apiKey, "fixture-api-key")
    assert.ok(!readFileSync(join(root, "config.json"), "utf8").includes("accessToken"))
  } finally { _resetConfigPathForTest(); rmSync(root, { recursive: true, force: true }) }
})

test("scope, configuration, usage limits and completed inference remain distinct evidence", () => {
  const ready = { profileId: "account-a", state: "ready", planAuthorized: true, accessToken: "SECRET" }
  assert.equal(publicAuthStatus(ready).lastInference, null)
  const completed = publicAuthStatus(ready, { status: "completed", at: 42, model: "slug", requestId: "private", token: "SECRET" })
  assert.deepEqual(completed.lastInference, { status: "completed", at: 42, model: "slug" })
  assert.equal(publicAuthStatus(ready, { status: "usage_limited" }).state, "usage_limited")
  assert.equal(publicAuthStatus(ready, { status: "usage_limited" }).lastInference, null)
})
