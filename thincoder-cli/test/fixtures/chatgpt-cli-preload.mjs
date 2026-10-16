/** Synthetic transport for the real CLI executable integration test only. */
import assert from "node:assert/strict"
import { writeFileSync } from "node:fs"
import { _setAuthServiceForTest } from "@thincoder/core/provider/auth-context.mjs"

_setAuthServiceForTest({ async getAuthContext(profileId, { signal }) {
  assert.equal(profileId, "cli-fixture-profile")
  return { profileId, signal, accessToken: "synthetic-cli-token", release() {} }
} })
const requests = []
globalThis.fetch = async (url, options) => {
  assert.equal(url, "https://api.openai.com/v1/responses", "Unexpected network request is blocked by the fixture")
  const body = JSON.parse(options.body)
  assert.equal(body.stream, true)
  assert.equal(body.store, false)
  assert.equal(body.previous_response_id, undefined)
  if (process.env.THINCODER_TEST_AUTH === "oauth") {
    assert.equal(options.redirect, "error")
    assert.equal(options.headers.Authorization, "Bearer synthetic-cli-token")
    assert.equal(body.max_output_tokens, undefined)
  } else assert.equal(options.headers.Authorization, "Bearer synthetic-api-key")
  requests.push({ url, body })
  writeFileSync(process.env.THINCODER_TEST_REPORT, JSON.stringify(requests), { mode: 0o600 })
  const status = process.env.THINCODER_TEST_TERMINAL || "completed"
  const text = status === "completed" ? "CLI-FIXTURE-OK" : "CLI-FIXTURE-PARTIAL"
  const events = [{ type: "response.output_text.delta", delta: text },
    { type: `response.${status}`, response: { id: "resp_cli_fixture", status,
      output: [{ type: "message", id: "msg_cli_fixture", role: "assistant", phase: "final_answer", content: [{ type: "output_text", text }] }],
      ...(status === "incomplete" ? { incomplete_details: { reason: "max_output_tokens" } } : {}) } }]
  return new Response(events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(""), { headers: { "content-type": "text/event-stream" } })
}
