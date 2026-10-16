import test from "node:test"
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const bin = fileURLToPath(new URL("../../bin/thincoder.cjs", import.meta.url))
const preload = fileURLToPath(new URL("../fixtures/chatgpt-cli-preload.mjs", import.meta.url))
function run({ oauth = true, enabled = true, terminal = "completed" } = {}) {
  const root = mkdtempSync(join(tmpdir(), "thincoder-real-cli-"))
  const home = join(root, "home"), cwd = join(root, "project"), report = join(root, "requests.json")
  mkdirSync(join(home, ".thincoder"), { recursive: true }); mkdirSync(cwd)
  const provider = { name: oauth ? "openai-chatgpt" : "openai-responses", baseURL: "https://api.openai.com/v1", format: "responses", stateful: false, builtinTools: false,
    ...(oauth ? { auth: { type: "chatgpt_oauth", enabled, credentialRef: "cli-fixture-profile" } } : { apiKey: "synthetic-api-key" }) }
  writeFileSync(join(home, ".thincoder/config.json"), JSON.stringify({ providers: [provider], defaultModel: `${provider.name}:gpt-5.6`,
    diagnostics: { heapWatch: false }, traces: { enabled: false }, agent: { autoThink: false } }), { mode: 0o600 })
  try {
    const result = spawnSync(process.execPath, ["--import", preload, bin, "chat", "Return a short fixture reply without using tools."],
      { cwd, input: "", encoding: "utf8", timeout: 20000, env: { ...process.env, HOME: home, USERPROFILE: home,
        THINCODER_TEST_REPORT: report, THINCODER_TEST_AUTH: oauth ? "oauth" : "api_key", THINCODER_TEST_TERMINAL: terminal } })
    assert.equal(result.error, undefined)
    return { ...result, requests: existsSync(report) ? JSON.parse(readFileSync(report, "utf8")) : [] }
  } finally { rmSync(root, { recursive: true, force: true }) }
}

test("actual CLI executable assembles and completes a keyless OAuth agent turn with mocked transport", () => {
  const result = run()
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /CLI-FIXTURE-OK/)
  assert.equal(result.requests.length, 1)
  assert.doesNotMatch(result.stdout + result.stderr, /synthetic-cli-token|First time using/)
})

test("actual CLI executable rejects disabled OAuth and incomplete output without success or key fallback", () => {
  const disabled = run({ enabled: false })
  assert.equal(disabled.status, 1, disabled.stderr)
  assert.equal(disabled.requests.length, 0)
  assert.match(disabled.stderr, /auth login --enable/)
  const partial = run({ terminal: "incomplete" })
  assert.equal(partial.status, 1, partial.stderr)
  assert.equal(partial.requests.length, 1)
  assert.doesNotMatch(partial.stdout, /CLI-FIXTURE-OK/)
})

test("actual CLI executable preserves API-key Responses operation", () => {
  const result = run({ oauth: false })
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /CLI-FIXTURE-OK/)
  assert.equal(result.requests.length, 1)
})
