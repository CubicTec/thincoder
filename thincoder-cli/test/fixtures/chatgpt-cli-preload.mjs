/** Synthetic transport for the real CLI executable integration test only. */
import assert from "node:assert/strict"
import { writeFileSync } from "node:fs"
import { AuthService, setAuthService } from "@thincoder/core/auth/service.mjs"

// Keep real account inference state; only credentials and network are synthetic.
const authService = new AuthService({ store: {}, fetch() { throw new Error("Unexpected authentication network access") } })
authService.getAuthContext = async (profileId, { signal }) => {
  assert.equal(profileId, "cli-fixture-profile")
  authService.assertInferenceAvailable(profileId)
  return { profileId, signal, accessToken: "synthetic-cli-token", release() {} }
}
setAuthService(authService)
const requests = []
const catalogRequests = []
const saveReport = () => writeFileSync(process.env.THINCODER_TEST_REPORT, JSON.stringify({ requests, catalogRequests }), { mode: 0o600 })
globalThis.fetch = async (url, options) => {
  const method = options.method ?? "GET"
  if (url === "https://api.openai.com/v1/models") {
    assert.equal(process.env.THINCODER_TEST_AUTH, "oauth", "API-key fixture must not request the account catalog")
    assert.equal(method, "GET")
    assert.equal(options.body, undefined)
    assert.equal(options.redirect, "error")
    assert.equal(options.headers.Authorization, "Bearer synthetic-cli-token")
    assert.equal(requests.length, 0, "Account catalog must load before inference")
    catalogRequests.push({ url, method })
    saveReport()
    return Response.json({ models: [{
      slug: "gpt-5.6", display_name: "CLI fixture model", visibility: "list", context_window: 256_000,
      input_modalities: ["text", "image"], default_reasoning_level: "high",
      supported_reasoning_levels: [{ effort: "low", description: "Low" }, { effort: "high", description: "High" }],
    }] })
  }
  assert.equal(url, "https://api.openai.com/v1/responses", "Unexpected network request is blocked by the fixture")
  assert.equal(method, "POST")
  const body = JSON.parse(options.body)
  assert.equal(body.stream, true)
  assert.equal(body.store, false)
  assert.equal(body.previous_response_id, undefined)
  if (process.env.THINCODER_TEST_AUTH === "oauth") {
    assert.equal(options.redirect, "error")
    assert.equal(options.headers.Authorization, "Bearer synthetic-cli-token")
    assert.equal(body.max_output_tokens, undefined)
    assert.equal(catalogRequests.length, 1, "Fresh account catalog should be reused for the first turn")
    assert.equal(body.reasoning.effort, "high", "Inference must use the account catalog default effort")
  } else assert.equal(options.headers.Authorization, "Bearer synthetic-api-key")
  requests.push({ url, method, body })
  saveReport()
  const status = process.env.THINCODER_TEST_TERMINAL || "completed"
  const text = status === "completed" ? "CLI-FIXTURE-OK" : "CLI-FIXTURE-PARTIAL"
  const events = [{ type: "response.output_text.delta", delta: text },
    { type: `response.${status}`, response: { id: "resp_cli_fixture", status,
      output: [{ type: "message", id: "msg_cli_fixture", role: "assistant", phase: "final_answer", content: [{ type: "output_text", text }] }],
      ...(status === "incomplete" ? { incomplete_details: { reason: "max_output_tokens" } } : {}) } }]
  return new Response(events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(""), { headers: { "content-type": "text/event-stream" } })
}
