import test, { after } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

const home = mkdtempSync(join(tmpdir(), "thincoder-acp-auth-"))
process.env.HOME = home
process.env.USERPROFILE = home
after(() => rmSync(home, { recursive: true, force: true }))
const { defaultIsConfigured, defaultProviderStatus } = await import("../../src/acp.mjs")
const { createRequireConfigured, createSessionHandlers, applyConfigOption } = await import("../../src/acp/handlers-session.mjs")
const { runAcpLogin } = await import("../../src/acp/login.mjs")

const plan = (auth = {}) => ({ name: "openai-chatgpt", baseURL: "https://api.openai.com/v1", format: "responses",
  auth: { type: "chatgpt_oauth", enabled: true, credentialRef: "fixture-profile", ...auth } })
const legacy = { name: "legacy", baseURL: "https://fixture.example/v1", apiKey: "fixture-key" }
function configure(providers, defaultModel) {
  mkdirSync(join(home, ".thincoder"), { recursive: true })
  writeFileSync(join(home, ".thincoder/config.json"), JSON.stringify({ providers, defaultModel }), { mode: 0o600 })
}

test("ACP accepts configured OAuth without a key and rejects disabled/unbound or modelless providers", () => {
  configure([plan()], "openai-chatgpt:fixture-model")
  assert.equal(defaultIsConfigured(), true)
  assert.equal(defaultProviderStatus().ok, true)
  for (const provider of [plan({ enabled: false }), plan({ credentialRef: undefined })]) {
    configure([provider], "openai-chatgpt:fixture-model")
    assert.equal(defaultIsConfigured(), false)
    const gate = createRequireConfigured({ isConfigured: defaultIsConfigured, providerStatus: defaultProviderStatus })()
    assert.match(gate.error.message, /auth login --enable/)
    assert.doesNotMatch(gate.error.message, /set providers\[\]\.apiKey/)
  }
  configure([plan()])
  assert.equal(defaultIsConfigured(), false)
  configure([legacy], "legacy:fixture-model")
  assert.equal(defaultIsConfigured(), true)
  configure([{ ...legacy, apiKey: "" }], "legacy:fixture-model")
  assert.equal(defaultIsConfigured(), false)
})

test("ACP terminal login recognizes an already configured OAuth reference without a key wizard", async () => {
  configure([plan()], "openai-chatgpt:fixture-model")
  const tty = Object.getOwnPropertyDescriptor(process.stdin, "isTTY"), log = console.error, lines = []
  Object.defineProperty(process.stdin, "isTTY", { value: true, configurable: true })
  console.error = (line) => lines.push(line)
  try {
    assert.equal(await runAcpLogin(), 0)
    assert.match(lines.join(" "), /authorization is verified per request/)
    configure([plan({ enabled: false })], "openai-chatgpt:fixture-model")
    assert.equal(await runAcpLogin(), 1)
    assert.match(lines.at(-1), /setup incomplete/)
  } finally {
    console.error = log
    if (tty) Object.defineProperty(process.stdin, "isTTY", tty)
    else delete process.stdin.isTTY
  }
})

test("ACP provider switching replaces credential/endpoint binding and rejects unknown or empty models", () => {
  const agent = { provider: { ...legacy, model: "old" }, providers: [legacy, plan()], activeProvider: "legacy", activeModel: "old" }
  assert.equal(applyConfigOption(agent, "model", "openai-chatgpt:plan-model"), true)
  assert.equal(agent.provider.apiKey, undefined)
  assert.equal(agent.provider.auth.credentialRef, "fixture-profile")
  assert.equal(agent.provider.baseURL, "https://api.openai.com/v1")
  assert.equal(agent.activeProvider, "openai-chatgpt")
  assert.equal(agent.activeModel, "plan-model")
  assert.equal(applyConfigOption(agent, "model", "legacy:new-model"), true)
  assert.equal(agent.provider.auth, undefined)
  assert.equal(agent.provider.apiKey, "fixture-key")
  const before = structuredClone(agent)
  assert.equal(applyConfigOption(agent, "model", "unknown:model"), false)
  assert.equal(applyConfigOption(agent, "model", "legacy:"), false)
  assert.deepEqual(agent, before)
})

test("ACP rejects provider changes during a turn and still permits cancel/close after auth removal", () => {
  const notifications = [], cancelled = [], released = []
  const session = { busy: true, agent: { provider: { ...legacy, model: "old" }, providers: [legacy, plan()] }, cancel: () => cancelled.push(true) }
  const sessions = new Map([["fixture", session]])
  let ready = true
  const handlers = createSessionHandlers({ getCwd: () => home, sessions, notifyRef: { current: (...args) => notifications.push(args) },
    requestRef: { current() {} }, createSession() {}, requireConfigured: () => ready ? {} : { error: { message: "signed out" } },
    releaseClosedSlot: () => released.push(true), log() {} })
  const result = handlers["session/set_config_option"]({ sessionId: "fixture", configId: "model", value: "openai-chatgpt:model" })
  assert.match(result.error.message, /active turn/)
  assert.equal(session.agent.provider.name, "legacy")
  assert.equal(notifications.length, 0)
  ready = false
  assert.deepEqual(handlers["session/cancel"]({ sessionId: "fixture" }), {})
  assert.deepEqual(handlers["session/close"]({ sessionId: "fixture" }), {})
  assert.equal(cancelled.length, 2)
  assert.equal(sessions.size, 0)
  assert.equal(released.length, 1)
})
