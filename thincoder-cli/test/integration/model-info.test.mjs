import test from "node:test"
import assert from "node:assert/strict"
import { registerHooks } from "node:module"

// Exercise the real command/picker/startup handlers. Only their core/host boundary
// is replaced: no account, network, terminal takeover, or configuration writes.
const fromCommand = (url = "") => /\/(?:command-interactive|model-picker|cmd-think|cmd-session|startup|slash-commands)\.mjs$/.test(url)
const moduleOf = (source) => ({ shortCircuit: true, url: `data:text/javascript,${encodeURIComponent(source)}` })
registerHooks({ resolve(specifier, context, next) {
  const parent = context.parentURL ?? ""
  if (specifier === "@thincoder/core/agent/model-info.mjs" && fromCommand(parent)) return moduleOf(`
    export async function refreshAgentModelInfo(agent) {
      const s=globalThis.__cliModelInfo, p=agent.provider;
      s.refreshes.push(p.model);
      if(s.refreshImpl) await s.refreshImpl(agent);
      if(s.failRefresh) throw new Error(s.failRefresh);
      s.ready.add(s.key(p));
    }`)
  if (specifier === "@thincoder/core/config.mjs" && fromCommand(parent)) return moduleOf(`
    export const providerSpec=p=>globalThis.__cliModelInfo.spec(p);
    export const specForModel=()=>({thinking:true,thinkApi:'effort',reasoningEffortEnum:['none','low']});
    export const specMatch=model=>{globalThis.__cliModelInfo.matchQueries.push(model);return {matched:model!=='hidden-model'}};
    export const resolveCompactThreshold=(explicit,p)=>({value:explicit??Math.min(providerSpec(p).context-providerSpec(p).maxOutput,Math.floor(providerSpec(p).context*0.8)),auto:explicit==null});
    export const configPath='/fixture/config.json';
    export const loadConfig=()=>globalThis.__cliModelInfo.agent.config;`)
  if (specifier === "@thincoder/core/session.mjs" && fromCommand(parent)) return moduleOf(`
    const state=()=>globalThis.__cliModelInfo;
    export function saveSession(agent){state().saved.push(agent.provider.model)}
    export const loadSlotFile=()=>state().restored;
    export const resumeSlot=async()=>({slot:1,data:state().restored});
    export function applySession(agent,data){
      const p=agent.providers.find(p=>p.name===data.activeProvider);
      agent.provider={...p,model:data.activeModel};
      agent.activeProvider=p.name;agent.activeModel=data.activeModel;agent.history=data.history??[];
    }
    export const sessionDescriptor=(_agent,data)=>({history:data.history??[],total:(data.history??[]).length});
    export const listSlots=()=>state().slots;
    export const ledgerHealth=()=>({refused:0,scene:null});
    export const switchToSlot=()=>state().restored;
    export const renameSlot=()=>({ok:true});
    export const activeSlot=()=>1;
    export const slotOccupancy=()=>({occupied:false});
    export const readEndMarker=()=>null;`)
  if (parent.endsWith("/tui/model-picker.mjs") && specifier === "./config-helpers.mjs") return moduleOf(`
    export async function carryoverDefaultModel(value){globalThis.__cliModelInfo.writes.push(value);return {ok:true,written:true}}`)
  if (parent.endsWith("/tui/model-picker.mjs") && specifier === "./provider-admin.mjs") return moduleOf(`
    export const createProviderAdmin=()=>({});
    export const isDerivedProviderHidden=()=>false;
    export const cascadeRemoveProvider=()=>{};`)
  if (parent.endsWith("/command-interactive.mjs")) {
    if (specifier === "./cli/make-agent.mjs") return moduleOf(`
      export const assembleAgent=async()=>globalThis.__cliModelInfo.agent;
      export const attachManifest=()=>{};
      export const teamConfig=()=>null;
      export const gitAuthor=()=>"fixture";
      export const validateProvider=()=>{};`)
    if (specifier === "./crash-reports.mjs") return moduleOf("export const recentCrashHint=()=>null")
    if (specifier === "@thincoder/core/ledger-variant-notice.mjs") return moduleOf("export const ledgerVariantNotice=()=>null")
    if (specifier === "./tui.mjs") return moduleOf("export const startTUI=(agent,opts)=>globalThis.__cliModelInfo.startTUI(agent,opts)")
  }
  return next(specifier, context)
} })
const { handleThinkCommand } = await import("../../src/tui/cmd-think.mjs")
const { createModelPicker } = await import("../../src/tui/model-picker.mjs")
const { tuiCommand } = await import("../../src/command-interactive.mjs")
const { showStartup } = await import("../../src/tui/startup.mjs")
const { handleSessionCommand } = await import("../../src/tui/cmd-session.mjs")
const { createSlashCommands } = await import("../../src/tui/slash-commands.mjs")

function fixture() {
  const provider = { name: "openai-chatgpt", model: "gpt-6-astra", baseURL: "https://fixture.invalid", format: "responses", auth: { type: "chatgpt_oauth", credentialRef: "account-a", enabled: true } }
  const agent = { provider, providers: [provider], activeProvider: provider.name, activeModel: provider.model,
    tools: [], tasks: [], history: [], cwd: "/fixture/project", _slot: 1,
    config: { memory: { projectDir: null }, agent: { autoThink: false, compactThresholdAuto: true, compactThresholdResolved: 57600 } } }
  const s = { agent, ready: new Set(), refreshes: [], matchQueries: [], writes: [], saved: [], slots: [], restored: null, menus: [], lines: [], fields: [], started: [],
    catalog: { context: 500000, maxOutput: 128000, reasoningEffortEnum: ["low", "medium", "high", "xhigh", "max"], defaultReasoningEffort: "medium", specSource: "catalog", contextSource: "catalog" },
    key: (p) => `${p.auth?.credentialRef ?? "api"}:${p.model}`,
  }
  s.spec = (p) => {
    let spec = { context: 1050000, maxOutput: 128000, thinking: true, thinkApi: "effort", reasoningEffortEnum: ["none", "low", "medium", "high"], multimodal: true }
    if (p.auth?.type === "chatgpt_oauth" && s.ready.has(s.key(p))) spec = { ...spec, ...s.catalog }
    const k = Number(p.context)
    return Number.isInteger(k) && k > 0 ? { ...spec, context: k * 1024, contextSource: "config" } : spec
  }
  const state = { lines: [], _linesChars: 0, picker: null }
  const ctx = { agent, state, C: { tool: "tool", warn: "warn", error: "error", dim: "dim" }, ansi: { bold: "" },
    pushLine(text) { s.lines.push(text); state.lines.push({ text }) }, pushLabel(text) { s.lines.push(text) },
    async showPicker(title, entries) { s.menus.push({ title, entries }); return null },
    async syncProviderField(...args) { s.fields.push(args) },
    closePicker() {}, renderPickerLines() {}, render() {},
    persistRaw() { throw new Error("unexpected raw write") }, askQuestion() { throw new Error("unexpected question") }, maskKey: () => "", startWizard() { throw new Error("unexpected wizard") },
  }
  s.startTUI = async (shownAgent, opts) => { s.started.push({ agent: shownAgent, opts }); showStartup({ ...ctx, agent: shownAgent, opts }) }
  globalThis.__cliModelInfo = s
  return { s, agent, ctx }
}

test("/think shows account efforts and the effective default without persisting it", async () => {
  const { s, agent, ctx } = fixture()
  await handleThinkCommand(ctx)
  assert.deepEqual(s.refreshes, ["gpt-6-astra"])
  assert.match(s.menus[0].entries[0].text, /Effort: medium \(model default\)/)
  assert.deepEqual(s.menus[0].entries.filter(e => e.action === "effort").map(e => e.level), s.catalog.reasoningEffortEnum)
  assert.equal(Object.hasOwn(agent.provider, "reasoningEffort"), false)
  assert.deepEqual(s.fields, [])
})

test("/think accepts catalog effort and rejects API-only none and unadvertised ultra", async () => {
  const { s, agent, ctx } = fixture()
  await handleThinkCommand(ctx, ["effort", "max"])
  assert.equal(agent.provider.reasoningEffort, "max")
  assert.deepEqual(s.fields, [["openai-chatgpt", "reasoningEffort", "max"]])
  for (const level of ["none", "ultra"]) await handleThinkCommand(ctx, ["effort", level])
  await handleThinkCommand(ctx, ["off"])
  assert.equal(s.fields.length, 1)
  assert.equal(agent.provider.reasoningEffort, "max")
  assert.ok(s.lines.some(line => line.includes("Usage: /think effort <low|medium|high|xhigh|max>")))
  assert.ok(s.lines.some(line => line.includes("No off path")))
})

test("/think ultra persists the local selection and reports the distinct model effort", async () => {
  const { s, agent, ctx } = fixture()
  s.catalog.reasoningEffortEnum.push("ultra")
  s.catalog.ultraReasoningEffort = "high"
  await handleThinkCommand(ctx, ["ultra"])
  assert.equal(agent.provider.reasoningEffort, "ultra")
  assert.deepEqual(s.fields, [["openai-chatgpt", "reasoningEffort", "ultra"]])
  assert.ok(s.lines.includes("Thinking mode: Ultra (proactive subagents; model effort high)"))
  assert.equal(agent.provider.model, "gpt-6-astra")
  assert.equal(agent.config.agent.compactThresholdResolved, 57600)
  assert.equal(agent.config.agent.compactThreshold, undefined)
})

test("the Ultra menu item, receipt, and selected header explain the local mode", async () => {
  const { s, agent, ctx } = fixture()
  s.catalog.reasoningEffortEnum.push("ultra")
  s.catalog.ultraReasoningEffort = "max"
  ctx.showPicker = async (title, entries) => {
    s.menus.push({ title, entries })
    return s.menus.length === 1 ? entries.find(e => e.level === "ultra") : null
  }
  await handleThinkCommand(ctx)
  assert.match(s.menus[0].entries.find(e => e.level === "ultra").text, /Ultra \(proactive subagents; model effort max\)/)
  assert.equal(agent.provider.reasoningEffort, "ultra")
  assert.deepEqual(s.fields, [["openai-chatgpt", "reasoningEffort", "ultra"]])
  assert.match(s.menus[1].entries[0].text, /Effort: Ultra \(proactive subagents; model effort max\)/)
  assert.ok(s.lines.includes("Thinking mode: Ultra (proactive subagents; model effort max)"))
})

test("Ultra follows the ordinary manual-effort Auto gate without changing Auto", async () => {
  const { s, agent, ctx } = fixture()
  s.catalog.reasoningEffortEnum.push("ultra")
  s.catalog.ultraReasoningEffort = "max"
  agent.config.agent.autoThink = true
  await handleThinkCommand(ctx, ["effort", "high"])
  await handleThinkCommand(ctx, ["ultra"])
  await handleThinkCommand(ctx, ["effort", "ultra"])
  assert.equal(agent.config.agent.autoThink, true)
  assert.equal(Object.hasOwn(agent.provider, "reasoningEffort"), false)
  assert.deepEqual(s.fields, [])
  assert.equal(s.lines.filter(line => line.includes("turn Auto off first via /think")).length, 3)
  ctx.showPicker = async () => ({ action: "auto" })
  await handleThinkCommand(ctx)
  assert.equal(agent.config.agent.autoThink, false)
  const beforeUltra = s.lines.length
  await handleThinkCommand(ctx, ["effort", "ultra"])
  assert.equal(agent.provider.reasoningEffort, "ultra")
  assert.deepEqual(s.fields, [["openai-chatgpt", "reasoningEffort", "ultra"]])
  assert.ok(!s.lines.slice(beforeUltra).some(line => line.startsWith("Auto-think:")))
  await handleThinkCommand(ctx)
  assert.equal(agent.config.agent.autoThink, true)
  assert.equal(Object.hasOwn(agent.provider, "reasoningEffort"), false)
  assert.deepEqual(s.fields.at(-1), ["openai-chatgpt", "reasoningEffort", undefined])
})

test("an account's Ultra default is described without persisting it or labeling Auto as Ultra", async () => {
  const { s, agent, ctx } = fixture()
  s.catalog.reasoningEffortEnum.push("ultra")
  s.catalog.ultraReasoningEffort = "high"
  s.catalog.defaultReasoningEffort = "ultra"
  await handleThinkCommand(ctx)
  assert.match(s.menus[0].entries[0].text, /Ultra \(proactive subagents; model effort high\) \(model default\)/)
  assert.equal(Object.hasOwn(agent.provider, "reasoningEffort"), false)
  assert.deepEqual(s.fields, [])
  agent.config.agent.autoThink = true
  await handleThinkCommand(ctx)
  assert.match(s.menus[1].entries[0].text, /Auto: ON .* Effort: automatic$/)
  assert.ok(!s.menus[1].entries.some(e => e.level === "ultra"))
  assert.deepEqual(s.fields, [])
})

test("Luna and API providers without advertised Ultra reject both direct forms without changing Auto", async () => {
  for (const api of [false, true]) {
    const { s, agent, ctx } = fixture()
    if (api) {
      delete agent.provider.auth
      s.catalog.reasoningEffortEnum.push("ultra")
      s.catalog.ultraReasoningEffort = "max"
    } else agent.provider.model = agent.activeModel = "gpt-6-luna"
    agent.config.agent.autoThink = true
    await handleThinkCommand(ctx, ["ultra"])
    await handleThinkCommand(ctx, ["effort", "ultra"])
    assert.equal(agent.config.agent.autoThink, true)
    assert.equal(Object.hasOwn(agent.provider, "reasoningEffort"), false)
    assert.deepEqual(s.fields, [])
    assert.equal(s.lines.filter(line => line.startsWith("Usage: /think effort <")).length, 2)
  }
})

test("think completion follows the hydrated account and removes Ultra after an account switch", () => {
  const { s, agent, ctx } = fixture()
  s.catalog.reasoningEffortEnum.push("ultra")
  s.catalog.ultraReasoningEffort = "max"
  const { completions } = createSlashCommands(ctx)
  assert.deepEqual(completions("/think u"), [])
  s.ready.add(s.key(agent.provider))
  assert.deepEqual(completions("/think u"), ["/think ultra"])
  assert.deepEqual(completions("/t u"), ["/t ultra"])
  assert.deepEqual(completions("/think effort "), s.catalog.reasoningEffortEnum.map(e => `/think effort ${e}`))
  agent.provider.auth = { ...agent.provider.auth, credentialRef: "account-b" }
  assert.deepEqual(completions("/think u"), [])
  assert.deepEqual(completions("/think effort u"), [])
})

test("an Ultra choice from an older account menu cannot write to the new provider binding", async () => {
  for (const replaceProvider of [true, false]) {
    const { s, agent, ctx } = fixture()
    s.catalog.reasoningEffortEnum.push("ultra")
    s.catalog.ultraReasoningEffort = "max"
    ctx.showPicker = async (_title, entries) => {
      const choice = entries.find(e => e.level === "ultra")
      assert.ok(choice)
      const auth = { ...agent.provider.auth, credentialRef: "account-without-ultra" }
      if (replaceProvider) agent.provider = { ...agent.provider, auth }
      else agent.provider.auth = auth
      return choice
    }
    await handleThinkCommand(ctx)
    assert.equal(Object.hasOwn(agent.provider, "reasoningEffort"), false)
    assert.deepEqual(s.fields, [])
    assert.ok(s.lines.includes("Model or account changed — reopen /think to choose current capabilities"))
    assert.ok(!s.lines.some(line => line.startsWith("Thinking mode: Ultra")))
  }
})

test("API none retains the existing off shape, while a catalog failure writes nothing", async () => {
  const { s, agent, ctx } = fixture()
  delete agent.provider.auth
  await handleThinkCommand(ctx, ["effort", "none"])
  assert.equal(agent.provider.thinking, null)
  assert.equal(Object.hasOwn(agent.provider, "reasoningEffort"), false)
  assert.ok(s.lines.includes("Thinking: OFF"))
  const before = s.fields.length
  s.failRefresh = "catalog offline"
  await handleThinkCommand(ctx, ["effort", "high"])
  assert.equal(s.fields.length, before)
  assert.ok(s.lines.some(line => line.includes("Model information unavailable: catalog offline")))
})

test("/model uses fresh account tokens for the auto budget and persists the selected model", async () => {
  const { s, agent, ctx } = fixture()
  await createModelPicker(ctx).selectModel({ provider: "openai-chatgpt", model: "gpt-6.1-sol" })
  assert.deepEqual(s.refreshes, ["gpt-6.1-sol"])
  assert.equal(agent.config.agent.compactThresholdResolved, 372000)
  assert.equal(agent.config.agent.compactThreshold, undefined)
  assert.equal(agent.config.defaultModel, "openai-chatgpt:gpt-6.1-sol")
  assert.deepEqual(s.saved, ["gpt-6.1-sol"])
  assert.equal(s.writes[0].model, "gpt-6.1-sol")
  assert.ok(s.lines.some(line => line.includes("context 500000 tokens (account catalog), output reserve 128000 tokens")))
})

test("/model keeps manual context and compaction settings and identifies configuration as their source", async () => {
  const { s, agent, ctx } = fixture()
  agent.providers[0].context = "200"
  agent.config.agent.compactThresholdAuto = false
  agent.config.agent.compactThreshold = 12345
  await createModelPicker(ctx).selectModel({ provider: "openai-chatgpt", model: "gpt-6-luna" })
  assert.equal(agent.config.agent.compactThreshold, 12345)
  assert.ok(s.lines.some(line => line.includes("context 204800 tokens (provider configuration override)")))
})

test("partial catalog capabilities do not claim that the static context came from the account", async () => {
  const { s, ctx } = fixture()
  delete s.catalog.context
  delete s.catalog.contextSource
  await createModelPicker(ctx).selectModel({ provider: "openai-chatgpt", model: "gpt-6-luna" })
  assert.ok(s.lines.some(line => line.includes("context 1050000 tokens (model specification)")))
  assert.ok(!s.lines.some(line => line.includes("(account catalog)")))
})

test("a catalog context for an unknown model does not trigger a static fallback warning", async () => {
  const { s, ctx } = fixture()
  await createModelPicker(ctx).selectModel({ provider: "openai-chatgpt", model: "hidden-model" })
  assert.ok(s.lines.some(line => line.includes("context 500000 tokens (account catalog)")))
  assert.deepEqual(s.matchQueries, [])
  assert.ok(!s.lines.some(line => line.includes("not found in MODEL_SPECS")))
})

test("/model preserves explicit out-of-catalog selection when loading fails", async () => {
  const { s, agent, ctx } = fixture()
  s.failRefresh = "catalog offline"
  await createModelPicker(ctx).selectModel({ provider: "openai-chatgpt", model: "hidden-model" })
  assert.equal(agent.provider.model, "hidden-model")
  assert.equal(agent.config.defaultModel, "openai-chatgpt:hidden-model")
  assert.deepEqual(s.saved, ["hidden-model"])
  assert.ok(s.lines.some(line => line.includes("catalog offline; selection kept")))
})

test("a late catalog result cannot persist an older model selection over the current one", async () => {
  const { s, agent, ctx } = fixture()
  let finish
  const waiting = new Promise(resolve => { finish = resolve })
  s.refreshImpl = async (target) => { if (target.provider.model === "gpt-6.1-sol") await waiting }
  const picker = createModelPicker(ctx)
  const oldSelection = picker.selectModel({ provider: "openai-chatgpt", model: "gpt-6.1-sol" })
  await picker.selectModel({ provider: "openai-chatgpt", model: "gpt-6-luna" })
  finish()
  await oldSelection
  assert.equal(agent.provider.model, "gpt-6-luna")
  assert.deepEqual(s.saved, ["gpt-6-luna"])
  assert.deepEqual(s.writes.map(row => row.model), ["gpt-6-luna"])
})

test("TUI startup refreshes the restored model before showing its auto budget", async () => {
  const { s, agent } = fixture()
  s.restored = { activeProvider: "openai-chatgpt", activeModel: "gpt-6.1-sol", history: [] }
  await tuiCommand({ exitSoon() { throw new Error("unexpected exit") } })
  assert.deepEqual(s.refreshes, ["gpt-6.1-sol"])
  assert.equal(agent.config.agent.compactThresholdResolved, 372000)
  assert.equal(agent.config.agent.compactThreshold, undefined)
  assert.equal(s.started.length, 1)
  assert.equal(s.started[0].opts.modelInfoWarning, undefined)
})

test("TUI startup refreshes the auto budget even when the restored model is unchanged", async () => {
  const { s, agent } = fixture()
  s.restored = { activeProvider: "openai-chatgpt", activeModel: "gpt-6-astra", history: [] }
  await tuiCommand({ exitSoon() { throw new Error("unexpected exit") } })
  assert.deepEqual(s.refreshes, ["gpt-6-astra"])
  assert.equal(agent.config.agent.compactThresholdResolved, 372000)
  assert.equal(agent.config.agent.compactThreshold, undefined)
  assert.equal(s.started[0].agent.config.agent.compactThresholdResolved, 372000)
})

test("offline catalog failures are visible inside the started TUI and keep auth available", async () => {
  const { s, ctx } = fixture()
  s.restored = { activeProvider: "openai-chatgpt", activeModel: "gpt-6-astra", history: Array.from({ length: 100 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: `History ${i}` })) }
  s.failRefresh = "catalog offline"
  await tuiCommand({ exitSoon() { throw new Error("unexpected exit") } })
  assert.equal(s.started.length, 1)
  assert.ok(s.lines.some(line => line.includes("Model information unavailable: catalog offline")))
  assert.ok(s.lines.some(line => line.includes("/auth login --enable")))
  assert.match(ctx.state.lines.at(-1).text, /Model information unavailable: catalog offline/)
})

test("switching a session refreshes its model and shows catalog failure after rebuilding the view", async () => {
  const { s, agent, ctx } = fixture()
  s.restored = { activeProvider: "openai-chatgpt", activeModel: "gpt-6.1-sol", history: [] }
  s.slots = [{ slot: 2, updatedAt: 0, turnCount: 0 }]
  ctx.showPicker = async () => ({ slot: 2 })
  await handleSessionCommand(ctx)
  assert.equal(agent.provider.model, "gpt-6.1-sol")
  assert.equal(agent.config.agent.compactThresholdResolved, 372000)
  assert.equal(agent.config.agent.compactThreshold, undefined)
  s.failRefresh = "catalog offline"
  await handleSessionCommand(ctx)
  assert.ok(ctx.state.lines.some(line => line.text.includes("Model information unavailable: catalog offline")))
})

test("a late session catalog failure cannot rebuild a newer session view", async () => {
  const { s, agent, ctx } = fixture()
  let finish, began
  const waiting = new Promise(resolve => { finish = resolve })
  const started = new Promise(resolve => { began = resolve })
  s.refreshImpl = async target => {
    if (target.provider.model === "gpt-6.1-sol") { began(); await waiting; throw new Error("old request failed") }
  }
  s.slots = [{ slot: 2, updatedAt: 0, turnCount: 0 }, { slot: 3, updatedAt: 0, turnCount: 0 }]
  s.restored = { activeProvider: "openai-chatgpt", activeModel: "gpt-6.1-sol", history: [] }
  ctx.showPicker = async () => ({ slot: 2 })
  const oldSwitch = handleSessionCommand(ctx)
  await started
  s.restored = { activeProvider: "openai-chatgpt", activeModel: "gpt-6-luna", history: [] }
  ctx.showPicker = async () => ({ slot: 3 })
  await handleSessionCommand(ctx)
  const currentLines = ctx.state.lines
  finish(); await oldSwitch
  assert.equal(agent.provider.model, "gpt-6-luna")
  assert.equal(ctx.state.lines, currentLines)
  assert.ok(s.lines.some(line => line.includes("Switched to slot 3")))
  assert.ok(!s.lines.some(line => line.includes("Switched to slot 2") || line.includes("old request failed")))
})

test("a pending session switch leaves a newly cleared conversation intact", async () => {
  const { s, agent, ctx } = fixture()
  let finish, began
  const waiting = new Promise(resolve => { finish = resolve })
  const started = new Promise(resolve => { began = resolve })
  s.refreshImpl = async () => { began(); await waiting }
  s.slots = [{ slot: 2, updatedAt: 0, turnCount: 0 }]
  s.restored = { activeProvider: "openai-chatgpt", activeModel: "gpt-6.1-sol", history: [] }
  ctx.showPicker = async () => ({ slot: 2 })
  const oldSwitch = handleSessionCommand(ctx)
  await started
  agent.history = []
  const newView = [{ text: "New session" }]
  ctx.state.lines = newView
  finish(); await oldSwitch
  assert.equal(ctx.state.lines, newView)
  assert.ok(!s.lines.some(line => line.includes("Switched to slot 2")))
})
