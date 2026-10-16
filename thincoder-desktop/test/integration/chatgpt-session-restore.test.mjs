/** Actual Desktop disk-slot restore + first-turn admission, entirely synthetic. */
import test from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createAgent } from "@thincoder/core/agent.mjs"
import { validateProvider } from "@thincoder/core/agent/assemble.mjs"
import { _setSessionsDirForTest, _resetSessionsDirForTest } from "@thincoder/core/session-slots.mjs"
import { newSlotData, saveSlotData } from "@thincoder/core/session-slot-write.mjs"
import { createAgentHost } from "../../src/main/agent-host.mjs"

for (const [state, auth] of [
  ["disabled", { type: "chatgpt_oauth", enabled: false, credentialRef: "fixture-account" }],
  ["unbound", { type: "chatgpt_oauth", enabled: true }],
]) {
  test(`Desktop restored ${state} OAuth session rejects its first turn despite a keyed global default`, async () => {
    const dir = mkdtempSync(join(tmpdir(), "desktop-oauth-restore-"))
    const originalFetch = globalThis.fetch
    let network = 0, runs = 0
    globalThis.fetch = async () => { network++; throw new Error("No network is allowed in this regression") }
    _setSessionsDirForTest(join(dir, "sessions"))
    const paid = { name: "paid-api", model: "paid-model", baseURL: "https://api.openai.com/v1", format: "responses", apiKey: "synthetic-key" }
    const subscription = { name: "openai-chatgpt", baseURL: "https://api.openai.com/v1", format: "responses", auth }
    const providers = [paid, subscription]
    saveSlotData(dir, 1, { ...newSlotData(dir), title: "Synthetic restore", activeProvider: subscription.name, activeModel: "subscription-model" })
    const host = createAgentHost({
      emit() {}, projects: { currentCwd: () => dir },
      assemble: async () => {
        const config = { agent: {}, defaultModel: "paid-api:paid-model", provider: paid, providersList: providers }
        const agent = createAgent({ provider: { ...paid }, config, cwd: dir, tools: [] })
        Object.assign(agent, { providers, activeProvider: paid.name, activeModel: paid.model })
        return validateProvider(agent, config)
      },
      run: async () => { runs++; return "This runner must not be entered" },
    })
    try {
      const restored = await host.ensure("1", 1)
      assert.equal(restored.provider.name, "openai-chatgpt")
      assert.equal(restored.provider.model, "subscription-model")
      assert.equal(restored.provider.apiKey, undefined)
      const receipt = await host.send("1", "Synthetic first message")
      await new Promise((resolve) => setImmediate(resolve))
      assert.deepEqual(receipt, { ok: false, reason: "provider-invalid", providerKind: "provider", started: false })
      assert.equal(runs, 0)
      assert.equal(network, 0)
      assert.equal(host.agents.has("1"), false)
    } finally {
      host.dispose("1")
      globalThis.fetch = originalFetch
      _resetSessionsDirForTest()
      rmSync(dir, { recursive: true, force: true })
    }
  })
}
