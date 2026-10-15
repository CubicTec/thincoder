import test from "node:test"
import assert from "node:assert/strict"
import { registerHooks } from "node:module"

// Host-side fake model boundary: no browser, credentials, MCP server or network.
globalThis.__auxiliaryResponse = null
globalThis.__catalogRequests = []
registerHooks({ resolve(specifier, context, next) {
  if (specifier === "@thincoder/core/provider/index.mjs") return { shortCircuit: true,
    url: "data:text/javascript,export async function chat(){return globalThis.__auxiliaryResponse}" }
  if (specifier === "@thincoder/core/provider/list-models.mjs" && context.parentURL?.endsWith("/tui/model-catalog.mjs")) return { shortCircuit: true,
    url: "data:text/javascript,export async function listModels(){return []};export async function listModelCatalog(p){globalThis.__catalogRequests.push(p.auth.credentialRef);return [{id:'z-slug',displayName:'First model'},{id:'a-slug',displayName:'Second model'}]}" }
  return next(specifier, context)
} })
const { extractCandidates } = await import("../../src/distill.mjs")
const { handleMcpCommand } = await import("../../src/tui/cmd-mcp.mjs")
const { getProviderModels, modelDisplayName } = await import("../../src/tui/model-catalog.mjs")
const provider = { name: "mock", format: "responses" }
const candidates = [{ type: "knowledge", title: "Approved fact", content: "A fact", tags: [] }]

test("distillation accepts completed Responses only, even when partial output is valid JSON", async () => {
  for (const terminalStatus of ["failed", "incomplete", undefined]) {
    globalThis.__auxiliaryResponse = { content: JSON.stringify(candidates), terminalStatus }
    await assert.rejects(extractCandidates(provider, "session", { traces: false }), { code: "incomplete_auxiliary_response" })
  }
  globalThis.__auxiliaryResponse = { content: JSON.stringify(candidates), terminalStatus: "completed" }
  assert.deepEqual(await extractCandidates(provider, "session", { traces: false }), candidates)
})

test("MCP AI setup cannot probe or save syntactically valid partial model output", async () => {
  globalThis.__auxiliaryResponse = { content: '{"name":"partial","url":"https://invalid.example/mcp"}', terminalStatus: "incomplete" }
  const lines = [], writes = []
  await handleMcpCommand({ agent: { provider, tools: [], config: { traces: { enabled: false } } }, pushLine: (line) => lines.push(line), pushLabel() {},
    askQuestion: async () => "A read-only server", showPicker: async () => { throw new Error("partial output reached confirmation") }, persistRaw: (value) => writes.push(value) }, ["ai"])
  assert.equal(writes.length, 0)
  assert.ok(lines.some((line) => line.includes("MCP configuration did not produce a completed response")))
})

test("CLI subscription model menu preserves display labels, server order and account isolation", async () => {
  const p = { name: "openai-chatgpt", auth: { type: "chatgpt_oauth", credentialRef: "account-a" } }
  assert.deepEqual(await getProviderModels(p), ["z-slug", "a-slug"])
  assert.equal(modelDisplayName(p, "z-slug"), "First model")
  await getProviderModels(p)
  p.auth.credentialRef = "account-b"
  assert.equal(modelDisplayName(p, "z-slug"), "z-slug")
  await getProviderModels(p)
  assert.deepEqual(globalThis.__catalogRequests, ["account-a", "account-a", "account-b"])
})
