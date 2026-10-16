import test from "node:test"
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { PROVIDER_PRESETS } from "@thincoder/core/config.mjs"

const wizardUrl = new URL("../../src/cli/setup-wizard.mjs", import.meta.url).href
for (const [name, input] of [["before provider selection", ""], ["during model entry", "1\n"]]) {
  test(`setup wizard cancels cleanly on terminal EOF ${name}`, () => {
    const home = mkdtempSync(join(tmpdir(), "thincoder-wizard-eof-"))
    try {
      const result = spawnSync(process.execPath, ["--input-type=module", "-e",
        `const { setupWizard } = await import(${JSON.stringify(wizardUrl)}); console.error("RESULT:" + JSON.stringify(await setupWizard()))`],
      { input, encoding: "utf8", timeout: 5000, env: { ...process.env, HOME: home, USERPROFILE: home } })
      assert.equal(result.error, undefined)
      assert.equal(result.status, 0, result.stderr)
      assert.match(result.stderr, /Setup cancelled/)
      assert.match(result.stderr, /RESULT:null/)
      assert.equal(existsSync(join(home, ".thincoder/config.json")), false)
    } finally { rmSync(home, { recursive: true, force: true }) }
  })
}

test("setup wizard returns the saved Responses format/options for its first request", () => {
  const home = mkdtempSync(join(tmpdir(), "thincoder-wizard-binding-"))
  try {
    mkdirSync(join(home, ".thincoder"))
    writeFileSync(join(home, ".thincoder/config.json"), JSON.stringify({ proxy: { uri: "http://127.0.0.1:19999" },
      providers: [{ name: "openai-responses", baseURL: "https://api.openai.com/v1", headers: { "X-Fixture": "preserved" }, context: 256 }] }))
    const choice = Object.keys(PROVIDER_PRESETS).indexOf("openai-responses") + 1
    assert.ok(choice > 0)
    const source = `import { registerHooks } from "node:module";
      registerHooks({ resolve(s,c,n) { if(s === "../tui/model-catalog.mjs") return {url:"data:text/javascript,export async function probeChannelModels(){return {ok:true,list:['fixture-model']}}",shortCircuit:true}; return n(s,c) } });
      globalThis.fetch = () => { throw new Error("Unexpected real network request") };
      const { setupWizard } = await import(${JSON.stringify(wizardUrl)}); console.error("RESULT:"+JSON.stringify(await setupWizard()));`
    const result = spawnSync(process.execPath, ["--input-type=module", "-e", source], {
      input: `${choice}\nfixture-model\nsynthetic-key\n\ny\n`, encoding: "utf8", timeout: 5000,
      env: { ...process.env, HOME: home, USERPROFILE: home },
    })
    assert.equal(result.error, undefined)
    assert.equal(result.status, 0, result.stderr)
    const provider = JSON.parse(result.stderr.match(/RESULT:(.*)/)?.[1] ?? "null")
    assert.equal(provider.format, "responses")
    assert.equal(provider.model, "fixture-model")
    assert.equal(provider.apiKey, "synthetic-key")
    assert.equal(provider.context, 256)
    assert.equal(provider.proxyUri, "http://127.0.0.1:19999")
    assert.deepEqual(provider.headers, { "X-Fixture": "preserved" })
    assert.equal(provider.stateful, PROVIDER_PRESETS["openai-responses"].stateful)
    assert.equal(provider.builtinTools, PROVIDER_PRESETS["openai-responses"].builtinTools)
  } finally { rmSync(home, { recursive: true, force: true }) }
})
