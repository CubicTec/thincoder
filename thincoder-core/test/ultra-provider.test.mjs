import test, { afterEach } from "node:test"
import assert from "node:assert/strict"
import { parseModelInfo, recordModelCatalog, _clearModelInfoForTest } from "../provider/model-info.mjs"
import { providerSpec } from "../model-specs.mjs"
import { buildBody } from "../provider/responses-request.mjs"

const provider = { name: "account", model: "gpt-6-astra", format: "responses", baseURL: "https://api.openai.com/v1",
  auth: { type: "chatgpt_oauth", enabled: true, credentialRef: "ultra-test" } }
const metadata = (levels, extra = {}) => ({ supported_reasoning_levels: levels.map(effort => ({ effort })), ...extra })
const load = (info, p = provider) => recordModelCatalog(p, [{ slug: p.model, spec: parseModelInfo(info) }])
afterEach(_clearModelInfoForTest)

test("Ultra preserves the selected mode and uses the account's ordinary reasoning effort", () => {
  load(metadata(["low", "medium", "max", "ultra"], { multi_agent_reasoning_effort: "medium" }))
  const p = { ...provider, reasoningEffort: "ultra" }
  assert.ok(providerSpec(p).reasoningEffortEnum.includes("ultra"))
  assert.equal(providerSpec(p).ultraReasoningEffort, "medium")
  const { body } = buildBody(p, [{ role: "user", content: "Review this task." }], [])
  assert.deepEqual(body.reasoning, { effort: "medium" })
  assert.equal(p.reasoningEffort, "ultra")
  assert.equal(Object.hasOwn(body, "multi_agent"), false)
  assert.equal(Object.hasOwn(body, "max_output_tokens"), false)
  assert.equal(body.store, false)
  assert.equal(body.stream, true)
})

test("Ultra wire fallback follows Codex: max, last ordinary effort, then medium", () => {
  for (const [levels, hint, expected] of [
    [["low", "max", "ultra"], undefined, "max"],
    [["low", "max", "ultra"], "ultra", "max"],
    [["low", "max", "ultra"], "future-mode", "max"],
    [["low", "high", "ultra"], "medium", "high"],
    [["ultra"], undefined, "medium"],
  ]) {
    load(metadata(levels, { multi_agent_reasoning_effort: hint }))
    assert.equal(buildBody({ ...provider, reasoningEffort: "ultra" }, [], []).body.reasoning.effort, expected)
  }
})

test("Ultra is account/model scoped and never enabled by its mapping hint alone", () => {
  load(metadata(["low", "max", "ultra"]))
  const reject = p => assert.throws(() => buildBody({ ...p, reasoningEffort: "ultra" }, [], []), /does not support reasoning effort/)
  reject({ ...provider, model: "gpt-6-luna" })
  reject({ ...provider, auth: { ...provider.auth, credentialRef: "other" } })
  reject({ ...provider, auth: undefined, apiKey: "synthetic-only" })
  load(metadata(["low", "max"], { multi_agent_reasoning_effort: "max" }))
  assert.equal(providerSpec(provider).ultraReasoningEffort, undefined)
  reject(provider)
})

test("ordinary effort and catalog defaults remain independent of Ultra", () => {
  load(metadata(["low", "medium", "max", "ultra"], { default_reasoning_level: "low", multi_agent_reasoning_effort: "max" }))
  assert.equal(buildBody(provider, [], []).body.reasoning.effort, "low")
  assert.equal(buildBody({ ...provider, reasoningEffort: "medium" }, [], []).body.reasoning.effort, "medium")
  load(metadata(["low", "max", "ultra"], { default_reasoning_level: "ultra" }))
  assert.equal(buildBody(provider, [], []).body.reasoning.effort, "max")
})
