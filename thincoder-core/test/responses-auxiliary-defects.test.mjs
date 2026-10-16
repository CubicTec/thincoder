/** Derived state must stay attached to a complete review and its original target. */
import test from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { runAdvisorReview } from "../advisor/run.mjs"
import { advisorIncompleteMarker } from "../advisor/compaction.mjs"
import { goalTool } from "../agent-tools/goal.mjs"
import { classifyAndApply } from "../auto-think.mjs"
import { ensureSessionTitle } from "../generate-title.mjs"

const provider = { name: "aux-defect-fixture", format: "responses", model: "test-model", apiKey: "fixture-only", baseURL: "https://api.openai.com/v1", stateful: false, builtinTools: false }
const create = () => ({ provider: { ...provider }, history: [
  { role: "user", content: "Please verify the work in this session" },
  { role: "assistant", content: "I ran the required tests" },
  { role: "user", content: "Complete the goal once verified" },
], tasks: [], cwd: "/tmp", config: { agent: {}, traces: { enabled: false } } })
const frame = (event) => `data: ${JSON.stringify(event)}\n\n`
const message = (text) => ({ type: "message", role: "assistant", content: [{ type: "output_text", text }] })
const response = (output) => new Response(frame({ type: "response.completed", response: { id: "aux", status: "completed", output } }))

test("a reasoning-only completed advisor response remains inconclusive and is not saved as a prior review", async () => {
  const fetch = globalThis.fetch, agent = create(), output = []
  const partial = "Still checking the evidence. ".repeat(12)
  globalThis.fetch = async () => response([{ type: "reasoning", summary: [{ type: "summary_text", text: partial }] }])
  try {
    const result = await runAdvisorReview(agent, "code", { onOutput(part) { output.push(part.text) } }, null, null, ["fixture.mjs"])
    assert.equal(advisorIncompleteMarker(result), "empty")
    assert.match(result, /Still checking the evidence/)
    assert.equal(agent._lastAdvisorOutput, undefined)
    assert.ok(output.some((text) => text.includes("Review incomplete:")))
  } finally { globalThis.fetch = fetch }
})

test("advisor timeout after streamed findings preserves display without saving a successful prior", async () => {
  const fetch = globalThis.fetch, agent = create(), output = []
  const root = mkdtempSync(join(tmpdir(), "advisor-incomplete-"))
  writeFileSync(join(root, "fixture.mjs"), "export const checked = true\n")
  agent.cwd = root; agent.config.advisor = { timeoutMs: 60_000 }
  agent._lastAdvisorOutput = "The previous completed review"
  let requests = 0
  globalThis.fetch = async () => {
    requests++
    return response([message("Preliminary findings still require verification. ".repeat(8)), {
      type: "function_call", id: "fc_read", call_id: "read1", name: "read", arguments: '{"path":"fixture.mjs"}',
    }])
  }
  try {
    const result = await runAdvisorReview(agent, "code", { onOutput(part) {
      output.push(part.text)
      if (part.kind === "tool") agent.config.advisor.timeoutMs = 0.0001
    } }, null, null, ["fixture.mjs"])
    assert.equal(requests, 1)
    assert.equal(advisorIncompleteMarker(result), "timeout")
    assert.match(result, /Preliminary findings/)
    assert.equal(agent._lastAdvisorOutput, "The previous completed review")
    assert.ok(output.some((text) => text.includes("Review incomplete:")))
  } finally { globalThis.fetch = fetch; rmSync(root, { recursive: true, force: true }) }
})

test("a goal judge cannot complete a newer goal or resurrect a cancelled one", async () => {
  const fetch = globalThis.fetch
  try {
    for (const kind of ["replacement", "cancel", "criteria"]) {
      const agent = create()
      agent.goal = { objective: "Old goal", criteria: "Old tests pass", status: "active" }
      let expected
      globalThis.fetch = async () => {
        if (kind === "replacement") agent.goal = { objective: "New goal", criteria: "New checks", status: "active" }
        if (kind === "cancel") agent.goal = null
        if (kind === "criteria") agent.goal.criteria = "A newer, stricter check"
        expected = structuredClone(agent.goal)
        return response([message("YES, the old tests pass")])
      }
      assert.match(await goalTool.execute({ action: "complete" }, { agent, depth: 0 }), /unverified|changed/)
      assert.deepEqual(agent.goal, expected)
    }
  } finally { globalThis.fetch = fetch }
})

test("late difficulty classification cannot change the newly selected provider", async () => {
  const fetch = globalThis.fetch, agent = create()
  agent.config.agent.autoThink = true
  agent.provider.model = "glm-5.2"; agent.provider.reasoningEffort = "low"
  globalThis.fetch = async () => {
    agent.provider = { ...provider, model: "gpt-5.6", reasoningEffort: "low" }
    return response([message("high")])
  }
  try {
    assert.equal(await classifyAndApply(agent, 0), null)
    assert.equal(agent.provider.reasoningEffort, "low")
  } finally { globalThis.fetch = fetch }
})

test("goal judge requires a YES word and keeps its request out of the main Responses chain", async () => {
  const fetch = globalThis.fetch, agent = create()
  agent.goal = { objective: "Verify tests", criteria: "Tests pass", status: "active" }
  const chain = { id: "main-response", key: "main-chain", outputSent: 0 }
  agent.provider._responsesChain = chain
  globalThis.fetch = async (_url, options) => {
    assert.ok(!Object.hasOwn(JSON.parse(options.body), "previous_response_id"))
    return response([message("Yesterday, the tests were still failing.")])
  }
  try {
    assert.match(await goalTool.execute({ action: "complete" }, { agent, depth: 0 }), /ambiguous/)
    assert.equal(agent.goal.status, "active")
    assert.equal(agent.provider._responsesChain, chain)
  } finally { globalThis.fetch = fetch }
})

test("late session title cannot overwrite the user's title or a replacement session", async () => {
  const fetch = globalThis.fetch
  try {
    for (const kind of ["title", "session"]) {
      const agent = create(); agent._sessionStart = 1
      globalThis.fetch = async () => {
        if (kind === "title") agent.title = "My chosen title"
        else { agent._sessionStart = 2; agent.history = [{ role: "user", content: "Different new request" }] }
        return response([message("Old generated title")])
      }
      await ensureSessionTitle(agent)
      assert.equal(agent.title, kind === "title" ? "My chosen title" : undefined)
    }
  } finally { globalThis.fetch = fetch }
})
