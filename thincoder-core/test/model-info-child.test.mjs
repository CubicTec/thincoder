/** Model-gated tools must survive child creation without bypassing host or role filters. */
import test, { beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createAgent, SUBAGENT_TOOL_EXCLUSIONS } from "../agent.mjs"
import { assembleAgent } from "../agent/assemble.mjs"
import { refreshAgentModelInfo } from "../agent/model-info.mjs"
import { ensureChildApiKey } from "../agent/spawn-child.mjs"
import { buildSpawnChild } from "../agent-tools/subagent-spawn.mjs"
import { PLAIN_TASK_BOOK_MIN } from "../agent-tools/spawn-gates.mjs"
import { resolveChildProvider } from "../agent-tools/subagent-async.mjs"
import { executeEscalateAction } from "../agent-tools/subagent-actions.mjs"
import { consultStartTool } from "../agent-tools/consult.mjs"
import { recordModelCatalog, _clearModelInfoForTest } from "../provider/model-info.mjs"
import { _setAuthServiceForTest } from "../provider/auth-context.mjs"
import { providerAuthStub } from "./fixtures/provider-auth.mjs"

const originalFetch = globalThis.fetch
const roots = []
const read = { name: "fixture_read", readonly: true }
const write = { name: "fixture_write", readonly: false }
const question = { name: "question", readonly: true }
const ssh = { name: "ssh", readonly: true }
const bash = { name: "bash", readonly: false, parameters: { properties: { command: {}, async: {} } } }
const names = (agent) => agent.tools.map((tool) => tool.name)

beforeEach(() => {
  _clearModelInfoForTest()
  globalThis.fetch = async () => { throw new Error("Child model tests must not use the network") }
  _setAuthServiceForTest(providerAuthStub({ async getAuthContext() { throw new Error("Fresh fixtures must not acquire credentials") } }))
})
afterEach(() => {
  globalThis.fetch = originalFetch
  _setAuthServiceForTest(null)
  _clearModelInfoForTest()
  SUBAGENT_TOOL_EXCLUSIONS.delete("read_image")
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

async function parentFixture({ excluded = false, readonly = true } = {}) {
  const cwd = mkdtempSync(join(tmpdir(), "thincoder-model-child-")); roots.push(cwd)
  const provider = { name: "child-catalog-fixture", model: "text-parent", format: "responses",
    baseURL: "https://api.openai.com/v1", auth: { type: "chatgpt_oauth", enabled: true, credentialRef: "child-fixture" } }
  recordModelCatalog(provider, [
    { id: "text-parent", slug: "text-parent", spec: { multimodal: false } },
    { id: "vision-child", slug: "vision-child", spec: { multimodal: true } },
  ])
  // Preserve the exact host-decorated candidate, including its permission metadata.
  const image = { name: "read_image", readonly, description: "host-approved image reader" }
  const config = { provider, providersList: [provider], agent: {}, memory: {} }
  const parent = await assembleAgent({ cwd, deps: {
    loadConfig: () => config, injectProxy: () => {}, createMemory: () => ({}),
    discoverRules: () => [], author: () => "fixture", team: () => null,
    assembleBuiltinTools: async () => [read, write, question, ssh, bash, image],
  }, toolsFinalize: (tools) => tools.filter((tool) => !excluded || tool !== image) })
  assert.equal(names(parent).includes("read_image"), false)
  return { parent, image }
}

function spawn(parent, role = "explore") {
  return buildSpawnChild(parent, { agent: parent, depth: 0, callbacks: {} },
    { ...PLAIN_TASK_BOOK_MIN, goal: "Inspect the image fixture.", model: "vision-child" }, role, false, [], [], null).child
}

test("createAgent retains its approved image candidate across capability changes", async () => {
  const { parent, image } = await parentFixture()
  const child = createAgent({ provider: { ...parent.provider }, tools: [read, image], config: parent.config, cwd: parent.cwd })
  await refreshAgentModelInfo(child)
  assert.deepEqual(child.tools, [read])
  child.provider.model = "vision-child"
  await refreshAgentModelInfo(child)
  await refreshAgentModelInfo(child)
  assert.deepEqual(child.tools, [read, image])
})

for (const role of ["explore", "plan", "coder"]) {
  test(`${role} child of a text-only parent inherits the approved image candidate and role restrictions`, async () => {
    const { parent, image } = await parentFixture()
    const before = [...parent.tools]
    const child = spawn(parent, role)
    await refreshAgentModelInfo(child)
    assert.equal(child.tools.find((tool) => tool.name === "read_image"), image)
    assert.equal(names(child).includes("question"), false)
    assert.equal(names(child).includes("ssh"), false)
    assert.equal(names(child).includes("fixture_write"), role === "coder")
    if (role === "coder") assert.equal(Object.hasOwn(child.tools.find((tool) => tool.name === "bash").parameters.properties, "async"), false)
    else assert.equal(child.tools.every((tool) => tool.readonly), true)
    assert.deepEqual(parent.tools, before)
  })
}

test("host exclusion, child read-only filtering and child exclusions cannot be bypassed on refresh", async () => {
  const excluded = await parentFixture({ excluded: true })
  const child = spawn(excluded.parent)
  await refreshAgentModelInfo(child)
  assert.equal(names(child).includes("read_image"), false)

  const writableImage = await parentFixture({ readonly: false })
  for (const role of ["explore", "plan"]) {
    const readonlyChild = spawn(writableImage.parent, role)
    await refreshAgentModelInfo(readonlyChild)
    assert.equal(names(readonlyChild).includes("read_image"), false)
  }

  const approved = await parentFixture()
  SUBAGENT_TOOL_EXCLUSIONS.add("read_image")
  const excludedChild = spawn(approved.parent, "coder")
  await refreshAgentModelInfo(excludedChild)
  assert.equal(names(excludedChild).includes("read_image"), false)
})

function consultant(parent, auth) {
  const provider = auth === "oauth" ? { ...parent.provider, model: "vision-child" }
    : { name: "vision-api-fixture", model: "kimi-k3", baseURL: "https://fixture.invalid/v1", apiKey: "fixture-only" }
  if (auth !== "oauth") parent.config.providersList.push(provider)
  parent.config.agent.consultModels = [{ provider: provider.name, model: provider.model }]
}

test("child credential readiness preserves OAuth bindings, rejects invalid accounts and retains API-key trim", async () => {
  const { parent } = await parentFixture()
  const valid = resolveChildProvider(parent, "vision-child")
  const before = structuredClone(valid)
  assert.equal(ensureChildApiKey(valid), valid)
  assert.deepEqual(valid, before)
  assert.equal(Object.hasOwn(valid, "apiKey"), false)

  for (const change of [{ enabled: false }, { credentialRef: undefined }]) {
    const invalid = { ...parent.provider, auth: { ...parent.provider.auth, ...change } }
    const keyedParent = { provider: { name: "keyed-parent", apiKey: "parent-key-must-not-be-used" },
      config: { providersList: [invalid] } }
    const childProvider = resolveChildProvider(keyedParent, `${invalid.name}:vision-child`)
    assert.equal(ensureChildApiKey(childProvider), null)
    assert.equal(Object.hasOwn(childProvider, "apiKey"), false)
  }
  assert.equal(ensureChildApiKey({ ...valid, apiKey: "mixed-key-must-not-be-used" }), null)
  const keyed = { apiKey: "  fixture-only  " }
  assert.equal(ensureChildApiKey(keyed), keyed)
  assert.equal(keyed.apiKey, "fixture-only")
  assert.equal(ensureChildApiKey({ apiKey: "  " }), null)
})

for (const auth of ["oauth", "api_key"]) {
  for (const async of [false, true]) {
    test(`${auth} ${async ? "asynchronous" : "synchronous"} escalation inherits image candidates from a text-only parent`, async () => {
      const { parent, image } = await parentFixture()
      consultant(parent, auth)
      let child
      const release = Promise.withResolvers()
      const ready = Promise.withResolvers()
      const ctx = { agent: parent, callbacks: {}, runAgent: async (agent) => {
        child = agent
        try { await refreshAgentModelInfo(child); ready.resolve() } catch (error) { ready.reject(error); throw error }
        await release.promise
        return "Fixture inspection completed."
      } }
      const running = executeEscalateAction({ task: "Inspect the image fixture.", async }, ctx)
      try {
        assert.ok(child, "Escalation must pass credential readiness and reach the child runner")
        await ready.promise
        assert.equal(child.tools.find((tool) => tool.name === "read_image"), image)
        assert.equal(names(child).includes("question"), false)
        assert.equal(names(child).includes("ssh"), false)
        if (auth === "oauth") assert.equal(Object.hasOwn(child.provider, "apiKey"), false)
      } finally {
        const entry = async ? [...(parent._asyncSubagents?.values() ?? [])][0] : null
        release.resolve()
        await running
        if (entry) await entry.promise
      }
    })
  }

  test(`${auth} consultation inherits only the approved read-only candidate from its text-only parent`, async () => {
    const { parent, image } = await parentFixture()
    consultant(parent, auth)
    let child
    const settled = Promise.withResolvers()
    await consultStartTool.execute({ problem: "Inspect the image fixture." }, {
      agent: parent, callbacks: { onToken(token) { if (token.includes("⟦ev⟧settled")) settled.resolve() } },
      runAgent: async (agent) => { child = agent; await refreshAgentModelInfo(child); return "Fixture inspection completed." },
    })
    assert.ok(child, "Consultation must pass credential readiness and reach the child runner")
    await settled.promise
    assert.equal(child.tools.find((tool) => tool.name === "read_image"), image)
    assert.equal(child.tools.every((tool) => tool.readonly), true)
    assert.equal(names(child).includes("question"), false)
    assert.equal(names(child).includes("ssh"), false)
    assert.equal(names(child).includes("main_history"), true)
    if (auth === "oauth") assert.equal(Object.hasOwn(child.provider, "apiKey"), false)
  })
}
