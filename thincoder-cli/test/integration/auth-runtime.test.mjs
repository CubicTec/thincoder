import test from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, rmSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { _setConfigPathForTest, _resetConfigPathForTest, persistRaw } from "@thincoder/core/config-io.mjs"
import { loadConfig } from "@thincoder/core/config.mjs"
import { injectProxy } from "@thincoder/core/proxy.mjs"
import { setAuthService } from "@thincoder/core/auth/service.mjs"
import { handleAuthCommand } from "../../src/tui/cmd-auth.mjs"
import { reloadRuntimeConfig } from "../../src/tui/config-helpers.mjs"

async function withRuntime(run) {
  const root = mkdtempSync(join(tmpdir(), "auth-runtime-")), path = join(root, "config.json")
  _setConfigPathForTest(path)
  persistRaw((raw) => Object.assign(raw, {
    providers: [{ name: "openai-chatgpt", baseURL: "https://api.openai.com/v1", format: "responses", proxy: true,
      auth: { type: "chatgpt_oauth", enabled: true, credentialRef: "account-a" }, reasoningEffort: "medium" }],
    defaultModel: "openai-chatgpt:gpt-6-astra", proxy: { uri: "http://127.0.0.1:19999" }, agent: { autoThink: false },
  }))
  const service = { dispose() {},
    async getStatus(id) { return { profileId: id, label: id, state: "ready", planAuthorized: true } },
    async listProfiles() { return [{ profileId: "account-a" }, { profileId: "account-b" }] },
    async switchProfile() {}, async pauseProfile() {}, async resumeProfile() {},
  }
  setAuthService(service)
  const config = loadConfig()
  injectProxy(config.providersList, config)
  config.agent.autoThink = true // A live session override differs from the disk default.
  const agent = { config, providers: config.providersList, activeProvider: "openai-chatgpt", activeModel: "gpt-6.1-sol",
    provider: { ...config.providersList[0], model: "gpt-6.1-sol", reasoningEffort: "high", thinking: null } }
  const lines = [], ctx = { agent, pushLine: (line) => lines.push(line), render() {} }
  try { await run({ agent, ctx, lines, service, bytes: () => readFileSync(path) }) }
  finally { setAuthService(null); _resetConfigPathForTest(); rmSync(root, { recursive: true, force: true }) }
}

test("TUI auth status and list preserve the live provider object and session settings", async () => withRuntime(async ({ agent, ctx, bytes }) => {
  const provider = agent.provider, providers = agent.providers, before = bytes()
  await handleAuthCommand(ctx, ["status"])
  await handleAuthCommand(ctx, ["list"])
  assert.equal(agent.provider, provider)
  assert.equal(agent.providers, providers)
  assert.deepEqual(bytes(), before)
}))

test("TUI successful account selection reloads the proxy but keeps session model, effort and Auto", async () => withRuntime(async ({ agent, ctx }) => {
  await handleAuthCommand(ctx, ["select", "account-b"])
  assert.equal(agent.provider.auth.credentialRef, "account-b")
  assert.equal(agent.provider.proxyUri, "http://127.0.0.1:19999")
  assert.equal(agent.activeModel, "gpt-6.1-sol")
  assert.equal(agent.provider.model, "gpt-6.1-sol")
  assert.equal(agent.provider.reasoningEffort, "high")
  assert.equal(agent.provider.thinking, null)
  assert.equal(agent.config.agent.autoThink, true)
  assert.equal(agent.providers, agent.config.providersList)
}))

test("TUI failed account selection leaves the runtime and config untouched", async () => withRuntime(async ({ agent, ctx, lines, bytes }) => {
  const provider = agent.provider, before = bytes()
  await handleAuthCommand(ctx, ["select", "missing-account"])
  assert.ok(lines.some((line) => line.includes("Unknown ChatGPT account")))
  assert.equal(agent.provider, provider)
  assert.deepEqual(bytes(), before)
}))

test("TUI an already-saved disable updates runtime even if the account service then fails", async () => withRuntime(async ({ agent, ctx, lines, service }) => {
  service.pauseProfile = async () => { throw new Error("Synthetic account-store failure") }
  await handleAuthCommand(ctx, ["disable"])
  assert.ok(lines.some((line) => line.startsWith("[auth]")))
  assert.equal(agent.provider.auth.enabled, false)
  assert.equal(agent.provider.reasoningEffort, "high")
  assert.equal(agent.config.agent.autoThink, true)
}))

test("TUI account reload keeps a neutral session effort instead of reviving its disk default", async () => withRuntime(async ({ agent, ctx }) => {
  delete agent.provider.reasoningEffort
  delete agent.provider.thinking
  await handleAuthCommand(ctx, ["select", "account-b"])
  assert.equal(Object.hasOwn(agent.provider, "reasoningEffort"), false)
  assert.equal(Object.hasOwn(agent.provider, "thinking"), false)
}))

test("account reload keeps a removed selected provider invalid while native config reload adopts its default", async () => withRuntime(async ({ agent }) => {
  persistRaw((raw) => {
    raw.providers = [{ name: "api", baseURL: "https://api.example/v1", apiKey: "SYNTHETIC" }]
    raw.defaultModel = "api:gpt-6-astra"
  })
  await reloadRuntimeConfig(agent, { preserveSession: true })
  assert.equal(agent.activeProvider, "openai-chatgpt")
  assert.equal(agent.provider.model, "gpt-6.1-sol")
  assert.equal(agent.provider.baseURL, undefined)
  assert.equal(agent.provider.apiKey, undefined)
  await reloadRuntimeConfig(agent)
  assert.equal(agent.activeProvider, "api")
  assert.equal(agent.provider.model, "gpt-6-astra")
  assert.equal(agent.config.agent.autoThink, false)
}))
