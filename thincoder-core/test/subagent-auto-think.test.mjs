/** Child auto-thinking overrides must preserve parent configuration and spawn gates. */
import test, { afterEach } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createAgent } from "../agent.mjs"
import { DEFAULTS, loadConfig, _setConfigPathForTest, _resetConfigPathForTest } from "../config.mjs"
import { settingsTool } from "../agent-tools/settings.mjs"
import { buildSpawnChild } from "../agent-tools/subagent-spawn.mjs"
import { ENG_TASK_BOOK_MIN, PLAIN_TASK_BOOK_MIN } from "../agent-tools/spawn-gates.mjs"
import { generateDesignToken } from "../agent-tools/design-token.mjs"

const roots = []
function tempRoot() {
  const root = mkdtempSync(join(tmpdir(), "thincoder-subagent-auto-think-"))
  roots.push(root)
  return root
}
afterEach(() => {
  _resetConfigPathForTest()
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

const provider = { name: "fixture", model: "kimi-k3", baseURL: "https://fixture.invalid/v1",
  apiKey: "fixture-only", reasoningEffort: "medium" }

test("loadConfig preserves boolean child overrides and falls back to inheritance for absent or invalid values", () => {
  assert.equal(DEFAULTS.agent.subagentAutoThink, null)
  const configPath = join(tempRoot(), "config.json")
  _setConfigPathForTest(configPath)
  for (const value of [undefined, null, true, false, 0, 1, "true", "false", [], {}]) {
    const agent = { autoThink: true, ...(value === undefined ? {} : { subagentAutoThink: value }) }
    const raw = { defaultModel: "fixture:kimi-k3", providers: [{ ...provider, model: undefined }], agent }
    writeFileSync(configPath, JSON.stringify(raw))
    const loaded = loadConfig()
    assert.equal(loaded.agent.autoThink, true)
    assert.equal(loaded.agent.subagentAutoThink, typeof value === "boolean" ? value : null)
    assert.deepEqual(JSON.parse(readFileSync(configPath, "utf8")), JSON.parse(JSON.stringify(raw)),
      "Soft fallback must not rewrite the user's setting")
  }
})

test("settings persists child booleans and null clears the override back to inheritance", async () => {
  const configPath = join(tempRoot(), "config.json")
  writeFileSync(configPath, JSON.stringify({ agent: { autoThink: true } }))
  const agent = { config: { agent: { autoThink: true, subagentAutoThink: null } } }
  const settings = settingsTool({ configPath })
  for (const value of [true, false]) {
    await settings.execute({ action: "set", key: "agent.subagentAutoThink", value: JSON.stringify(value) }, { agent })
    assert.equal(agent.config.agent.subagentAutoThink, value)
    assert.equal(JSON.parse(readFileSync(configPath, "utf8")).agent.subagentAutoThink, value)
    assert.equal(agent.config.agent.autoThink, true)
  }
  await settings.execute({ action: "set", key: "agent.subagentAutoThink", value: "null" }, { agent })
  assert.equal(agent.config.agent.subagentAutoThink, null)
  assert.equal(Object.hasOwn(JSON.parse(readFileSync(configPath, "utf8")).agent, "subagentAutoThink"), false)
  assert.equal(agent.config.agent.autoThink, true)
})

test("settings rejects non-boolean child overrides without changing memory or disk", async () => {
  const configPath = join(tempRoot(), "config.json")
  const agent = { config: { agent: { autoThink: true, subagentAutoThink: false } } }
  writeFileSync(configPath, JSON.stringify(agent.config))
  const settings = settingsTool({ configPath })
  const diskBefore = readFileSync(configPath, "utf8")
  const configBefore = structuredClone(agent.config)
  for (const value of ["true", "false", 0, 1, [], {}]) {
    await assert.rejects(settings.execute({ action: "set", key: "agent.subagentAutoThink", value: JSON.stringify(value) }, { agent }),
      /agent\.subagentAutoThink.*expects boolean/)
    assert.equal(readFileSync(configPath, "utf8"), diskBefore)
    assert.deepEqual(agent.config, configBefore)
  }
})

function spawnFixture(root, role, autoThink, subagentAutoThink, wantAsync) {
  const parentProvider = Object.freeze({ ...provider })
  const config = Object.freeze({ provider: parentProvider, providersList: Object.freeze([parentProvider]),
    agent: Object.freeze({ autoThink, engineering: false, subagentTurns: 17,
      ...(subagentAutoThink === undefined ? {} : { subagentAutoThink }) }), memory: Object.freeze({}) })
  const parent = createAgent({ provider: parentProvider, config, cwd: root, tools: [] })
  const args = { ...(role.startsWith("eng-") ? ENG_TASK_BOOK_MIN : PLAIN_TASK_BOOK_MIN), goal: "Inspect the fixture." }
  if (role.startsWith("eng-")) {
    args.round = "initial"
    args.batchDoc = join(root, "batch.md")
    writeFileSync(args.batchDoc, "# Fixture batch\n")
  }
  if (role === "eng-coder") {
    args.designId = "auto-think-fixture"
    args.designToken = generateDesignToken(parent)
    parent._engDesignTokens = new Map([[args.designId, args.designToken]])
  }
  const before = structuredClone(config)
  const { child } = buildSpawnChild(parent, { agent: parent, depth: 0, callbacks: {} }, args,
    role, wantAsync, [], [], null)
  return { parent, child, before }
}

for (const role of ["explore", "plan", "coder", "eng-designer", "eng-coder"]) {
  test(`${role} spawn applies child overrides and preserves inherited settings and parent state`, () => {
    const root = tempRoot()
    for (const wantAsync of [false, true]) {
      for (const autoThink of [false, true]) {
        for (const override of [undefined, null, true, false]) {
          const { parent, child, before } = spawnFixture(root, role, autoThink, override, wantAsync)
          assert.equal(child.config.agent.autoThink, typeof override === "boolean" ? override : autoThink)
          assert.equal(child.config.agent.subagentTurns, 17)
          assert.equal(child.config.agent.engineering, role.startsWith("eng-"))
          assert.equal(parent.config.agent.autoThink, autoThink)
          assert.deepEqual(parent.config, before)
          assert.deepEqual(child.provider, parent.provider)
          assert.notEqual(child.provider, parent.provider)
          if (!role.startsWith("eng-") && typeof override !== "boolean") assert.equal(child.config, parent.config)
          else {
            assert.notEqual(child.config, parent.config)
            assert.notEqual(child.config.agent, parent.config.agent)
          }
          if (role.startsWith("eng-")) assert.equal(child._batchDoc, join(root, "batch.md"))
          if (role === "eng-coder") assert.equal(child._engTaskAuthorized, true)
        }
      }
    }
  })
}
