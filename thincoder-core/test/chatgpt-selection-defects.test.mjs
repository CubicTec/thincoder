import test from "node:test"
import assert from "node:assert/strict"
import { resolveProviderPlan } from "../model-ref.mjs"
import { validateProvider } from "../agent/assemble.mjs"

const keyed = { name: "api", baseURL: "https://fixture.example/v1", apiKey: "fixture-key" }
test("a removed ChatGPT preset cannot fall back to API billing from a saved slot or default", () => {
  for (const input of [
    { providers: [keyed], defaultModel: "api:paid-model", slot: { provider: "openai-chatgpt", model: "plan-model" } },
    { providers: [keyed], defaultModel: "openai-chatgpt:plan-model" },
    { providers: [keyed], defaultModel: "openai-chatgpt:" },
  ]) {
    const plan = resolveProviderPlan(input)
    assert.equal(plan.state, "invalid")
    assert.deepEqual(plan.provider, {})
    assert.match(plan.reason, /API billing fallback is disabled/)
  }
})

test("explicit keyed slots and legacy missing-provider fallback keep their prior behavior", () => {
  const selected = resolveProviderPlan({ providers: [keyed], defaultModel: "openai-chatgpt:missing", slot: { provider: "api", model: "chosen-model" } })
  assert.equal(selected.provider.name, "api")
  assert.equal(selected.provider.model, "chosen-model")
  const legacy = resolveProviderPlan({ providers: [keyed], defaultModel: "api:default-model", slot: { provider: "removed-legacy", model: "old" } })
  assert.equal(legacy.provider.name, "api")
  assert.equal(legacy.provider.model, "default-model")
})

test("shared runtime validation rejects unavailable OAuth despite otherwise complete model fields", () => {
  const provider = { name: "openai-chatgpt", model: "plan-model", baseURL: "https://api.openai.com/v1", format: "responses",
    auth: { type: "chatgpt_oauth", enabled: true, credentialRef: "fixture-profile" } }
  for (const auth of [{ ...provider.auth, enabled: false }, { type: "chatgpt_oauth", enabled: true }]) {
    const agent = { provider: { ...provider, auth } }
    validateProvider(agent, {})
    assert.equal(agent._providerInvalid, true)
    assert.match(agent._providerInvalidReason, /API billing fallback is disabled/)
    agent.provider = provider
    validateProvider(agent, {})
    assert.equal(agent._providerInvalid, undefined)
  }
  const legacy = { provider: { ...keyed, model: "model" } }
  validateProvider(legacy, {})
  assert.equal(legacy._providerInvalid, undefined)
})
