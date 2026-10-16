import test from "node:test"
import assert from "node:assert/strict"
import { registerHooks } from "node:module"

// Exercise the actual command dispatch with synthetic assembly/inference only.
// No HOME, credentials, tools, browser or model endpoint is touched.
const fixture = { agent: null, calls: [], wizard: null }
globalThis.__chatCommandAuthFixture = fixture
const sources = new Map([
  ["@thincoder/core/agent.mjs", `export async function runAgent(agent, prompt) { globalThis.__chatCommandAuthFixture.calls.push(["run", agent, prompt]) }`],
  ["@thincoder/core/config.mjs", `export const configPath = "/fixture/config.json"; export function loadConfig() { return {} }`],
  ["@thincoder/core/provider/wait-status.mjs", `export function waitStatusText() { return "" }`],
  ["./cli/make-agent.mjs", `export async function assembleAgent() { return globalThis.__chatCommandAuthFixture.agent }; export function attachManifest() {}; export function teamConfig() {}; export function gitAuthor() {}; export function validateProvider() {}`],
  ["./cli/setup-wizard.mjs", `export async function setupWizard() { const f = globalThis.__chatCommandAuthFixture; f.calls.push(["wizard"]); return f.wizard }`],
  ["./cli/permission.mjs", `export function summarize() {}; export function askPermission() { return false }`],
  ["./crash-reports.mjs", `export function recentCrashHint() { return null }`],
])
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (sources.has(specifier)) return { url: `data:text/javascript,${encodeURIComponent(sources.get(specifier))}`, shortCircuit: true }
  return nextResolve(specifier, context)
} })
const { chatCommand } = await import("../../src/command-interactive.mjs")
hooks.deregister()

const oauth = (auth = {}) => ({ name: "openai-chatgpt", model: "fixture-model", format: "responses",
  baseURL: "https://api.openai.com/v1", auth: { type: "chatgpt_oauth", enabled: true, credentialRef: "fixture-profile", ...auth } })

async function run(provider, { tty = false, wizard = null, config = {} } = {}) {
  fixture.agent = { provider, activeProvider: provider?.name, config }
  fixture.calls = []
  fixture.wizard = wizard
  const errors = [], exits = []
  const oldTty = Object.getOwnPropertyDescriptor(process.stdin, "isTTY")
  const oldError = console.error, oldWrite = process.stdout.write
  Object.defineProperty(process.stdin, "isTTY", { value: tty, configurable: true })
  console.error = (...values) => errors.push(values.join(" "))
  process.stdout.write = () => true
  try {
    await chatCommand(["fixture prompt"], { exitSoon: (code) => exits.push(code), noKeyMessage: () => "missing fixture key" })
    return { errors, exits, calls: fixture.calls }
  } finally {
    console.error = oldError
    process.stdout.write = oldWrite
    if (oldTty) Object.defineProperty(process.stdin, "isTTY", oldTty)
    else delete process.stdin.isTTY
  }
}

test("one-shot chat runs keyless OAuth in TTY and piped modes without the API-key wizard", async () => {
  for (const tty of [false, true]) {
    const result = await run(oauth(), { tty })
    assert.deepEqual(result.exits, [])
    assert.deepEqual(result.errors, [])
    assert.equal(result.calls.length, 1)
    assert.equal(result.calls[0][0], "run")
    assert.equal(result.calls[0][1].provider.apiKey, undefined)
  }
})

test("one-shot chat fails closed for disabled, unbound or mixed OAuth configuration", async () => {
  const invalid = await run(oauth({ enabled: false }), { config: { providerState: "invalid" } })
  assert.deepEqual(invalid.exits, [1])
  assert.equal(invalid.calls.length, 0)
  assert.match(invalid.errors.join(" "), /auth login --enable/)
  for (const provider of [oauth({ enabled: false }), oauth({ credentialRef: undefined }), { ...oauth(), apiKey: "fixture-key" }, { ...oauth(), baseURL: "https://elsewhere.example/v1" }]) {
    for (const tty of [false, true]) {
      const result = await run(provider, { tty })
      assert.deepEqual(result.exits, [1])
      assert.equal(result.calls.length, 0)
      assert.match(result.errors.join(" "), /\[auth\]/)
    }
  }
})

test("one-shot chat preserves legacy key, missing-key and invalid-provider paths", async () => {
  const keyed = { name: "legacy", model: "fixture", baseURL: "https://api.example/v1", apiKey: "fixture-key" }
  assert.equal((await run(keyed)).calls[0][0], "run")
  const missing = await run({ ...keyed, apiKey: "" })
  assert.deepEqual(missing.exits, [1])
  assert.deepEqual(missing.errors, ["missing fixture key"])
  const interactive = await run({ ...keyed, apiKey: "" }, { tty: true, wizard: keyed })
  assert.deepEqual(interactive.calls.map(([kind]) => kind), ["wizard", "run"])
  const invalid = await run({}, { config: { providerState: "invalid" } })
  assert.deepEqual(invalid.exits, [1])
  assert.equal(invalid.calls.length, 0)
})
