/**
 * 2026-10-16-login-model-refresh.test.mjs — 批内单测件（批档 = `docs/batches/2026-10-16-login-model-refresh.md`，
 * §6 用例 N5 ∥ E5 ∥ B5）：登录成拍模型候选面即时刷新（机制单源 = `docs/core/design/TEAM.md` §2.8 ∥ §5 判据 ⑩）。
 *
 * 三端载体（各走本端既有实现，零替身实现）：
 *   VSC = 真 `handleTeamLogin` + 假 webview sink（`models` 载荷经真探针链落——收序断言）；
 *   CLI = 真 `/team login` 问句面提交（`teamAskSubmit` 三步）⇒ `completeTeamLogin` ⇒ `syncProvidersFromDisk`；
 *   桌面 = 真 `createTeam().login()` + `onProvidersChanged` spy；候选面半经主进程同链 `modelCatalog()`（`model:catalog` 构造体）。
 * 依赖桩：本地 HTTP 桩（`POST /api/client/login` ∥ `GET /v1/models`）+ 临时 config 路径（`_setConfigPathForTest`）
 * + `vscode` ∥ `electron` 假模块（`module.registerHooks`——端壳模块顶层 import 面）。
 *
 * **用毕即删（零留存）**：本档随批档归档、不进 `test/` 收集面；§5 留一行读数。
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import { createServer } from "node:http"
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { registerHooks } from "node:module"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, "..", "..")
/** 仓根相对 ⇒ file URL（跨端模块同源解析——`@thincoder/core` 为软链，真路径同一实例）。 */
const url = (rel) => pathToFileURL(join(ROOT, rel)).href
const readJSON = (path) => JSON.parse(readFileSync(path, "utf8"))

// ─── 端壳模块桩（vscode ∥ electron：被测档顶层 import 面；调用面不在本批断言内）───────────────
const VSCODE_STUB = "data:text/javascript,export const window={createStatusBarItem:()=>({show(){},dispose(){}}),showInputBox:async()=>undefined,showWarningMessage:()=>{},showErrorMessage:()=>{}};export const workspace={};export const commands={};export const StatusBarAlignment={Left:1,Right:2};export class ThemeColor{constructor(id){this.id=id}}"
const ELECTRON_STUB = "data:text/javascript,export const app={getPath:()=>''};export const ipcMain={handle:()=>{}};export const BrowserWindow={};export default {app,ipcMain}"
/** `/rc/*` = 桌面渲染面核包根（三根映射之 `/rc/` → `@thincoder/render-core`——`tools/web-quickcheck/serve.mjs` ∥ `src/main/protocol.mjs` 同根）。 */
const RENDER_CORE = join(ROOT, "thincoder-render-core")
registerHooks({
  resolve(spec, ctx, next) {
    if (spec === "vscode") return { url: VSCODE_STUB, shortCircuit: true, format: "module" }
    if (spec === "electron") return { url: ELECTRON_STUB, shortCircuit: true, format: "module" }
    if (spec.startsWith("/rc/")) return { url: pathToFileURL(join(RENDER_CORE, spec.slice(4))).href, shortCircuit: true }
    return next(spec, ctx)
  },
})

const { _setConfigPathForTest } = await import(url("thincoder-core/config-io.mjs"))
const vsc = await import(url("thincoder-vscode/src/extension/panel-messages-settings.mjs"))
const vscTeam = await import(url("thincoder-vscode/src/extension/team-surface.mjs"))
const vscodeApi = await import(VSCODE_STUB)
const { pushStatus, pushSettings } = await import(url("thincoder-vscode/src/extension/panel-settings-push.mjs"))
const { _resetProbeWindowsForTest } = await import(url("thincoder-vscode/src/extension/settings.mjs"))
const cmdTeam = await import(url("thincoder-cli/src/tui/cmd-team.mjs"))
const { createTeam } = await import(url("thincoder-desktop/renderer/mount-team.mjs"))
const { attachSettings } = await import(url("thincoder-desktop/renderer/mount-settings.mjs"))
const { modelCatalog } = await import(url("thincoder-desktop/src/main/settings.mjs"))

/** 写盘面 = 临时 config（核 `_setConfigPathForTest` 缝）；`raw` 传入 = 逐字落（畸形档径用）。 */
function seedConfig(initial, raw = null) {
  const dir = mkdtempSync(join(tmpdir(), "login-refresh-"))
  const path = join(dir, "config.json")
  writeFileSync(path, raw ?? JSON.stringify(initial, null, 2))
  _setConfigPathForTest(path)
  return path
}

/** 本地桩：登录 200（密码 `good`——否则 401 ∥ 字面 `429` ⇒ 429）+ 渠 `GET /v1/models` 两行。 */
function startStub() {
  const server = createServer((req, res) => {
    if (req.method === "POST" && req.url === "/api/client/login") {
      let raw = ""
      req.on("data", (chunk) => { raw += chunk })
      req.on("end", () => {
        let body = {}
        try { body = JSON.parse(raw) } catch { body = {} }
        if (body.password === "good") {
          res.writeHead(200, { "content-type": "application/json" })
          res.end(JSON.stringify({ token: "tok-1", member: { username: body.username, name: "Member One" } }))
        } else if (body.password === "429") {
          res.writeHead(429, { "content-type": "application/json" })
          res.end("{}")
        } else {
          res.writeHead(401, { "content-type": "application/json" })
          res.end("{}")
        }
      })
      return
    }
    if (req.method === "GET" && req.url === "/v1/models") {
      res.writeHead(200, { "content-type": "application/json" })
      res.end(JSON.stringify({ data: [{ id: "team-model-1" }, { id: "team-model-2" }] }))
      return
    }
    res.writeHead(404)
    res.end("")
  })
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve({ server, base: `http://127.0.0.1:${server.address().port}` }))
  })
}
const closeStub = (server) => new Promise((resolve) => server.close(resolve))

/** 登成后档形（真核登录写入；端侧读面/候选面据此断言）。 */
async function seededLogin(base, { password = "good", manualTeam = false } = {}) {
  const initial = manualTeam
    ? { providers: [{ name: "team", baseURL: `${base}/v1`, apiKey: "" }, { name: "local", baseURL: `${base}/v1`, apiKey: "k-local" }] }
    : {}
  const path = seedConfig(initial)
  const { teamLogin } = await import(url("thincoder-core/team.mjs"))
  const receipt = await teamLogin({ server: base, username: "member", password })
  return { path, receipt }
}

// ─── VSC 面（真 handler + 假 webview sink）───────────────────────────────────────────────
function vscPanel() {
  const sink = []
  const panel = {
    _panel: { webview: { postMessage: (message) => { sink.push(message) } } },
    _pushStatus() { return pushStatus(this) },
    _pushSettings() { return pushSettings(this) },
    _pushMcpStatus() {},
    _pushIndexStatus() {},
    _agentSettingsSession() { return null },
  }
  return { panel, sink }
}
const orderOf = (sink) => sink.map((message) => message.type)
const findOf = (sink, type) => sink.find((message) => message.type === type)
async function waitFor(pred, ms = 5000) {
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    if (pred()) return true
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  return false
}

test("N5·VSC：登录成 ⇒ sink 收序 teamStatus → providerStatus → 回执 → models（载荷含 team 渠）", async () => {
  const { server, base } = await startStub()
  _resetProbeWindowsForTest()
  try {
    seedConfig({})
    const { panel, sink } = vscPanel()
    await vsc.handleTeamLogin(panel, { server: base, username: "member", password: "good" })
    const landed = await waitFor(() => sink.some((message) => message.type === "models"))
    const order = orderOf(sink)
    assert.ok(landed, `models 未达——收序=${order.join(",")}`)
    for (const type of ["teamStatus", "providerStatus", "teamLoginResult"]) assert.ok(order.includes(type), `缺 ${type}——收序=${order.join(",")}`)
    const at = (type) => order.indexOf(type)
    assert.ok(at("teamStatus") < at("providerStatus"), `收序错：${order.join(",")}`)
    assert.ok(at("providerStatus") < at("teamLoginResult"), `回执未后置于同步推送：${order.join(",")}`)
    assert.ok(at("teamLoginResult") < at("models"), `探针拍应先于…（as-of 本批：models 落于回执后）：${order.join(",")}`)
    assert.equal(findOf(sink, "teamLoginResult").ok, true)
    assert.ok(findOf(sink, "models").models.some((row) => row.provider === "team"), "models 载荷零 team 渠行")
  } finally {
    _resetProbeWindowsForTest()
    await closeStub(server)
  }
})

test("E5·VSC：登录败四径（网络 ∥ 凭据 401 ∥ 429 ∥ 写盘败）⇒ 零刷新（无 teamStatus ∥ 无 models）", async () => {
  const { server, base } = await startStub()
  const dead = await startStub()
  await closeStub(dead.server) // 网络不可达径：已关闭端口
  _resetProbeWindowsForTest()
  try {
    const paths = [
      { name: "401", server: base, config: {}, password: "bad", reason: "credentials" },
      { name: "429", server: base, config: {}, password: "429", reason: "rate_limited" },
      { name: "network", server: dead.base, config: {}, password: "good", reason: "network" },
      { name: "write_failed", server: base, config: null, raw: "{ \"providers\": [", password: "good", reason: "write_failed" },
    ]
    for (const path of paths) {
      seedConfig(path.config, path.raw ?? null)
      const { panel, sink } = vscPanel()
      await vsc.handleTeamLogin(panel, { server: path.server, username: "member", password: path.password })
      await waitFor(() => orderOf(sink).includes("teamLoginResult"))
      assert.deepEqual(orderOf(sink), ["teamLoginResult"], `${path.name}：应只落回执——收序=${orderOf(sink).join(",")}`)
      assert.equal(findOf(sink, "teamLoginResult").reason, path.reason, path.name)
      assert.equal(findOf(sink, "teamLoginResult").ok, false, path.name)
    }
  } finally {
    _resetProbeWindowsForTest()
    await closeStub(server)
  }
})

test("B5·VSC：同名手工条目冲突（成但携 notice）⇒ 仍恰一次刷新 ∧ models 零 team 行 ∧ 手工条目逐字零改", async () => {
  const { server, base } = await startStub()
  _resetProbeWindowsForTest()
  try {
    const { path, receipt } = await seededLogin(base, { manualTeam: true })
    assert.equal(receipt.ok, true)
    assert.equal(receipt.notice, "manual-name-conflict")
    const before = readJSON(path).providers[0]
    const { panel, sink } = vscPanel()
    await vsc.handleTeamLogin(panel, { server: base, username: "member", password: "good" })
    const landed = await waitFor(() => sink.some((message) => message.type === "models"))
    assert.ok(landed, `models 未达——收序=${orderOf(sink).join(",")}`)
    assert.equal(findOf(sink, "teamLoginResult").notice, "manual-name-conflict")
    assert.equal(orderOf(sink).filter((type) => type === "models").length, 1, "models 应恰一次")
    const models = findOf(sink, "models").models
    assert.equal(models.filter((row) => row.provider === "team").length, 0, "候选面零 team 行（零假造）")
    assert.ok(models.some((row) => row.provider === "local"), "对照渠应有行（证明探针真跑）")
    assert.deepEqual(readJSON(path).providers[0], before, "手工条目逐字零改")
  } finally {
    _resetProbeWindowsForTest()
    await closeStub(server)
  }
})

test("N5·VSC（扩展侧径 = 状态栏 item ∥ 命令面板）：登录成 ⇒ 同拍全状态链（sink 收 models 含 team 渠）", async () => {
  const { server, base } = await startStub()
  _resetProbeWindowsForTest()
  try {
    seedConfig({})
    const { panel, sink } = vscPanel()
    let settingsPushes = 0
    panel._pushSettings = function () { settingsPushes += 1; return pushSettings(this) }
    const answers = [base, "member", "good"]
    vscodeApi.window.showInputBox = async () => answers.shift()
    await vscTeam.initTeamSurface(panel) // _chatPanel 接线（item 命令 `thincoder.team` 同入口）
    await vscTeam.runTeamCommand()
    const landed = await waitFor(() => sink.some((message) => message.type === "models"))
    assert.ok(landed, `models 未达（扩展侧径）——收序=${orderOf(sink).join(",")}`)
    assert.equal(settingsPushes, 1, "全状态链应恰一次")
    assert.ok(orderOf(sink).includes("teamStatus"), `teamStatus 未达——收序=${orderOf(sink).join(",")}`)
    assert.ok(findOf(sink, "models").models.some((row) => row.provider === "team"), "models 载荷零 team 渠行")
  } finally {
    _resetProbeWindowsForTest()
    await closeStub(server)
  }
})

test("E5·VSC（扩展侧径）：登录败 ⇒ 零刷新（零推送）+ 原生四句出词", async () => {
  const { server, base } = await startStub()
  _resetProbeWindowsForTest()
  try {
    seedConfig({})
    const { panel, sink } = vscPanel()
    let settingsPushes = 0
    panel._pushSettings = function () { settingsPushes += 1; return pushSettings(this) }
    const errors = []
    const answers = [base, "member", "bad"]
    vscodeApi.window.showInputBox = async () => answers.shift()
    vscodeApi.window.showErrorMessage = (message) => { errors.push(message) }
    await vscTeam.initTeamSurface(panel)
    await vscTeam.runTeamCommand()
    const chainDone = await waitFor(() => errors.length === 1, 2000) // 链尾信号（失败支末位出词）
    assert.ok(chainDone, "败径未出原生错误提示")
    assert.deepEqual(orderOf(sink), [], `败径应零推送——收序=${orderOf(sink).join(",")}`)
    assert.equal(settingsPushes, 0, "败径零全状态链")
    assert.equal(errors.length, 1, "败径应出原生错误提示（零静默）")
  } finally {
    _resetProbeWindowsForTest()
    await closeStub(server)
  }
})

// ─── CLI 面（真 `/team login` 问句面提交）─────────────────────────────────────────────────
function cliCtx() {
  const lines = []
  const state = { team: {}, teamAsk: null, input: [], cursor: 0 }
  const ctx = {
    agent: { providers: [] },
    state,
    pushLine: (text) => lines.push(text),
    render: () => {},
    showPicker: async () => null,
    openModelPicker: async () => {},
    onModalClose: () => {},
  }
  return { ctx, lines, state }
}
async function cliSubmit(ctx, { server, username, password }) {
  ctx.state.teamAsk = { step: "server", fields: {}, error: null, busy: false, scroll: 0, lines: [] }
  for (const value of [server, username, password]) {
    ctx.state.input = [...value]
    ctx.state.cursor = value.length
    await cmdTeam.teamAskSubmit(ctx)
  }
}

test("N5·CLI：`/team login` 成 ⇒ `syncProvidersFromDisk` 返后 `agent.providers` 含 team 派生条目", async () => {
  const { server, base } = await startStub()
  try {
    seedConfig({})
    const { ctx, state } = cliCtx()
    await cliSubmit(ctx, { server: base, username: "member", password: "good" })
    const entry = ctx.agent.providers.find((provider) => provider.name === "team")
    assert.ok(entry !== undefined, `agent.providers 无 team 条目：${JSON.stringify(ctx.agent.providers)}`)
    assert.equal(entry.derived, true)
    assert.equal(entry.apiKey, "tok-1")
    assert.equal(entry.baseURL, `${base}/v1`)
    assert.equal(state.teamAsk, null, "成拍面退场")
    assert.equal(state.team.loggedIn, true)
  } finally {
    await closeStub(server)
  }
})

test("E5·CLI：登录败（网络 ∥ 401 ∥ 429 ∥ 写盘败）⇒ 零刷新（`agent.providers` 不变）", async () => {
  const { server, base } = await startStub()
  const dead = await startStub()
  await closeStub(dead.server)
  try {
    const paths = [
      { name: "network", server: dead.base, password: "good", config: {} },
      { name: "401", server: base, password: "bad", config: {} },
      { name: "429", server: base, password: "429", config: {} },
      { name: "write_failed", server: base, password: "good", config: {}, raw: "{ \"providers\": [" },
    ]
    for (const path of paths) {
      seedConfig(path.config, path.raw ?? null)
      const { ctx, lines } = cliCtx()
      await cliSubmit(ctx, { server: path.server, username: "member", password: path.password })
      assert.deepEqual(ctx.agent.providers, [], `${path.name}：agent.providers 应不变`)
      assert.ok(ctx.state.teamAsk !== null, `${path.name}：败径应停留问句面`)
      assert.ok(ctx.state.teamAsk.error !== null, `${path.name}：败径应就地出词`)
      assert.ok(lines.length === 0, `${path.name}：败径零结果行`)
    }
  } finally {
    await closeStub(server)
  }
})

test("B5·CLI：同名手工条目冲突 ⇒ 成 ∧ `agent.providers` 零 team 派生条目（手工条目零改）", async () => {
  const { server, base } = await startStub()
  try {
    const { path } = await seededLogin(base, { manualTeam: true })
    const before = readJSON(path).providers
    const { ctx } = cliCtx()
    await cliSubmit(ctx, { server: base, username: "member", password: "good" })
    assert.equal(ctx.agent.providers.some((provider) => provider.derived === true), false, "零派生条目（零假造）")
    assert.deepEqual(readJSON(path).providers, before, "手工条目逐字零改")
  } finally {
    await closeStub(server)
  }
})

// ─── 桌面面（真 `createTeam().login()` + spy ∥ 候选面经主进程 `modelCatalog()`）──────────────
function installDesktopDom(values) {
  const form = { querySelectorAll: () => [], getAttribute: () => null, values }
  globalThis.document = {
    querySelector: () => null,
    querySelectorAll: () => [form],
    addEventListener: () => {},
    removeEventListener: () => {},
  }
  globalThis.FormData = class { constructor(source) { this._source = source } get(key) { return this._source.values[key] ?? null } }
}
function desktopTeam(ask) {
  let state = { settings: { team: {} } }
  const counters = { providers: 0, changed: 0 }
  const team = createTeam({
    ask,
    store: { get: () => state },
    setSettings: (patch) => { state = { ...state, settings: { ...state.settings, ...patch } } },
    report: () => {},
    invalidateDrafts: () => {},
    loadProviders: async () => { counters.providers += 1 },
    onProvidersChanged: () => { counters.changed += 1 },
  })
  return { team, counters, face: () => state.settings.team }
}

test("N5·桌面：登录成 ⇒ `onProvidersChanged` 恰一次（∥ `loadProviders` 恰一次）∧ `model:catalog` 含 team 渠", async () => {
  const { server, base } = await startStub()
  try {
    const { path, receipt } = await seededLogin(base)
    assert.equal(receipt.ok, true)
    installDesktopDom({ server: base, username: "member", password: "good" })
    const { team, counters } = desktopTeam(async (channel) => channel === "team:login"
      ? { ok: true }
      : { ok: true, loggedIn: true, server: base, member: { username: "member", name: "Member One" }, label: "desktop@host" })
    await team.handlers.onTeamLogin()
    const chainDone = await waitFor(() => counters.providers === 1, 2000) // 链尾信号（`loadProviders` → `onProvidersChanged` 同尾）
    assert.ok(chainDone, "登录链未达尾（loadProviders 未落）")
    assert.equal(counters.changed, 1, "onProvidersChanged 应恰一次")
    assert.equal(counters.providers, 1, "loadProviders 应恰一次")
    const catalog = await modelCatalog()
    assert.ok(catalog.models.some((row) => row.provider === "team"), `model:catalog 零 team 行：${JSON.stringify(catalog)}`)
    assert.equal(readJSON(path).team.token, "tok-1", "同档（登录写盘面）")
  } finally {
    await closeStub(server)
  }
})

test("E5·桌面：登录败四径 ⇒ 零刷新（`onProvidersChanged` 零调用）+ 段内失败提示", async () => {
  installDesktopDom({ server: "http://127.0.0.1:1", username: "member", password: "bad" })
  for (const reason of ["network", "credentials", "rate_limited", "write_failed"]) {
    const { team, counters, face } = desktopTeam(async () => ({ ok: false, reason }))
    await team.handlers.onTeamLogin()
    const chainDone = await waitFor(() => face().notice?.kind === "failure", 2000) // 链尾信号（失败支末位写）
    assert.ok(chainDone, `${reason}：失败面未落（链未达尾）`)
    assert.equal(counters.changed, 0, `${reason}：onProvidersChanged 应零调用`)
    assert.equal(counters.providers, 0, `${reason}：loadProviders 应零调用`)
    assert.equal(face().notice.kind, "failure", reason)
    assert.equal(face().notice.reason, reason, reason)
  }
})

test("B5·桌面：同名手工条目冲突 ⇒ 恰一次 ∧ `model:catalog` 零 team 行（零假造）", async () => {
  const { server, base } = await startStub()
  try {
    const { path, receipt } = await seededLogin(base, { manualTeam: true })
    assert.equal(receipt.notice, "manual-name-conflict")
    const before = readJSON(path).providers[0]
    installDesktopDom({ server: base, username: "member", password: "good" })
    const { team, counters, face } = desktopTeam(async (channel) => channel === "team:login"
      ? { ok: true, notice: "manual-name-conflict" }
      : { ok: true, loggedIn: false, server: null, member: null, label: null })
    await team.handlers.onTeamLogin()
    const chainDone = await waitFor(() => counters.providers === 1, 2000) // 链尾信号（同登录成支尾）
    assert.ok(chainDone, "登录链未达尾（loadProviders 未落）")
    assert.equal(counters.changed, 1, "onProvidersChanged 应恰一次")
    assert.equal(face().notice.kind, "manualConflict")
    const catalog = await modelCatalog()
    assert.equal(catalog.models.filter((row) => row.provider === "team").length, 0, "候选面零 team 行")
    assert.ok(catalog.models.some((row) => row.provider === "local"), "对照渠应有行（证明探针真跑）")
    assert.deepEqual(readJSON(path).providers[0], before, "手工条目逐字零改")
  } finally {
    await closeStub(server)
  }
})

test("N5·桌面（装配面径）：`attachSettings` 注入键真接通（`mount-settings.mjs:155` 的 `createTeam` deps 增键）", async () => {
  const { server, base } = await startStub()
  try {
    seedConfig({})
    installDesktopDom({ server: base, username: "member", password: "good" })
    let changed = 0
    const host = {
      invoke: async (channel) => (channel === "team:login"
        ? { ok: true }
        : channel === "team:status"
          ? { ok: true, loggedIn: true, server: base, member: { username: "member", name: "Member One" }, label: "desktop@host" }
          : { ok: false, reason: "not-stubbed" }),
    }
    const face = attachSettings(host, { onProvidersChanged: () => { changed += 1 } })
    await face.handlers.onTeamLogin()
    const landed = await waitFor(() => changed === 1, 2000)
    assert.ok(landed, "装配面注入的 onProvidersChanged 未达恰一次")
  } finally {
    await closeStub(server)
  }
})
