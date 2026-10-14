/**
 * 2026-10-14-ssh-session-cli.test.mjs — 批内单测件（SSH-SESSION 批 · **CLI 腿** · 台账 #1436）。
 * 姊妹件 = `2026-10-14-ssh-session.test.mjs`（核腿——另舱；本件不涉核工具本体 / 会话池 / askpass 链）。
 * 名随批档留存 · 住 `docs/batches/` · 不入仓套件（`thincoder-cli/test/` 收集面为空——单元档随批次本地）。
 * 跑法（`thincoder/` 仓根）：
 *   node --test docs/batches/2026-10-14-ssh-session-cli.test.mjs
 *
 * 判据源 = `docs/core/design/TOOLS.md` §6.22 ⑧（三端弹窗载荷 `ctx.onSecretInput`）∥ ⑦（凭据零入上下文
 * ——端面零留存）∥ ⑨（非密字段预填）∥ ⑧ 末段（无 UI ⇒ 可读错误句）；批档 §2「验收对照」CLI 行。
 * 九腿（逐条对上验收标准）：
 *   腿1 回调接线可注入 —— `buildToolCallbacks` 的 `onSecretInput` 面（注入 ⇒ 直递 ∥ 未注入 ⇒ 端面显式拒句）
 *   腿2 模态状态进出 + 掩码零留存 —— 真实键面驱动（预填 → 推进 → 掩码回显 → 提交返值 ∧ 状态 0 命中）
 *   腿3 取消 ⇒ null（可读句归工具面——用例表 E4；端面零文案）—— Esc 整窗取消 ∧ 状态 0 命中
 *   腿4 无 UI 径抛句 —— CLI 未注入面 ∥ ACP 会话面（装配 = `src/acp.mjs`）两处同句 + ssh 不入剔除
 *   腿5 负控 —— modalOpen 不计入（面属在飞回合族）∥ 键面吞面（PgUp 不落 loadOlder）∥ 必填空驻留 ∥ 未激活零动作
 *   腿6 词面投影 —— `keys.title` / `keys.prompt` = i18n 键（核字典 + 端投影；缺键回键名本身；字段标签 `ssh.field.<name>`）
 *   腿7 掩码族 ⇒ 搜索不进场 —— 2026-10-14 裁 A（凭据窗 ∥ 团队问句面 ∥ 密码步三处泄漏类同修；非掩码步照旧）
 *   腿8 反交错明文口 —— 搜索已开 + 掩码面弹出交错：键入零落 search.query ∧ 掩码层正常收字 ∧ 退场后搜索态原样（2026-10-14 fix 轮）
 *   腿9 无 UI 拒句归核字典 —— `SECRET_NO_UI_TEXT` = `ssh.no_ui` 投影值（端零字面副本）
 * 纪律：零真机 ∥ 零网络 ∥ 零真实用户配置（纯内存夹具——不起进程、不读盘、零残留）。
 */
import test from "node:test"
import assert from "node:assert/strict"
import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT_RAW = [join(HERE, "..", ".."), join(HERE, "..", "..", "..")]
  .find((d) => existsSync(join(d, "thincoder-cli")) && existsSync(join(d, "thincoder-core")))
if (ROOT_RAW === undefined) throw new Error("按件位未定位到仓库根（须含 thincoder-cli/ 与 thincoder-core/）")
/** 盘符大小写归一（同 `2026-10-10-login-entry-completion-cli.test.mjs` 注）：Node 模块缓存按 URL 串键，
 *  `.native` 规范形 ⇒ 大小写两态同串。 */
const ROOT = realpathSync.native(ROOT_RAW)

const cli = (rel) => import(pathToFileURL(join(ROOT, "thincoder-cli", rel)).href)
const core = (rel) => import(pathToFileURL(join(ROOT, "thincoder-cli/node_modules/@thincoder/core", rel)).href)

const { createTuiState } = await cli("src/tui/tui-state.mjs")
const { computeLayout } = await cli("src/tui/layout.mjs")
const { renderFrame, attentionKind } = await cli("src/tui/render-frame.mjs")
const { createKeyHandler } = await cli("src/tui/key-handler.mjs")
const { handleSecretPromptKeys } = await cli("src/tui/key-handler-modals.mjs")
const { createInteraction } = await cli("src/tui/interaction.mjs")
const { buildToolCallbacks } = await cli("src/tui/tool-events.mjs")
const { modalOpen } = await cli("src/tui/timer-watch.mjs")
const { SECRET_NO_UI_TEXT, refuseSecretInput, secretMaskActive } = await cli("src/tui/secret-prompt.mjs")
const { buildAcpCallbacks } = await cli("src/acp/bridge.mjs")
const { t } = await core("i18n.mjs")

// ─── 夹具 ──────────────────────────────────────────────────────────────────────────────────────

/** 唯一随机串（空间无碰撞；本件全程扫它以判「零入状态 / 零上屏」）。 */
const SECRET = "hun7er·ssh-9f3a·QZ"
const PAYLOAD = {
  kind: "ssh-credential",
  sessionId: "ssh#1",
  host: "10.0.0.6",
  user: "admin",
  port: 22,
  fields: [
    { name: "user", masked: false, required: true, prefill: "admin" },
    { name: "password", masked: true, required: true, prefill: "" },
  ],
  keys: { title: "ssh.credential.title", prompt: "ssh.credential.prompt" },
}

const summarize = (obj) => {
  const s = JSON.stringify(obj)
  if (s === "{}") return ""
  return s.length > 80 ? s.slice(0, 80) + "…" : s
}

const tick = () => new Promise((r) => setImmediate(r))
const noop = () => {}

/** ctx 夹具：真实 state（createTuiState）+ 真实 interaction ∥ 真实键面（createKeyHandler）——
 *  与 `index.mjs` 装配同形（转口全为记录型替身，零副作用）。 */
function makeCtx(extra = {}) {
  const agent = extra.agent ?? {
    providers: [], config: {}, provider: null, cwd: ROOT, tasks: [], _pendingTimers: [], history: [], title: "",
  }
  const state = createTuiState({ cols: 100, rows: 30, agent })
  state._agent = agent
  const lines = []
  const calls = { renders: 0, submits: 0, loadOlder: 0, pastes: 0, tabs: 0 }
  const pushLine = (text, color) => { lines.push({ text: text ?? "", color }) }
  const pushLabel = (text, color) => { lines.push({ text, color }) }
  const render = () => { calls.renders++ }
  const inter = createInteraction({ agent, state, pushLine, pushLabel, render, summarize })
  const handler = createKeyHandler({
    agent, state, render, popPicker: noop, renderPickerLines: noop,
    handleSlash: async () => {}, handleTab: () => { calls.tabs++ },
    submit: () => { calls.submits++ }, pasteClipboardImage: () => { calls.pastes++ },
    wizardChooseProvider: noop, wizardSubmitText: noop, cancelWizard: noop,
    wizardProviderItems: () => [], wizardRouteItems: () => [], wizardChooseRoute: noop, wizardBackToRoute: noop,
    teamAskSubmit: noop, teamAskCancel: noop, renderWizard: noop, pushLine,
    cleanup: noop, showPicker: async () => null, loadOlder: () => { calls.loadOlder++ },
  })
  return { agent, state, lines, calls, inter, handler, render, pushLine }
}

const bareDeps = (ctx, extra = {}) => ({
  agent: ctx.agent, state: ctx.state, pushLine: ctx.pushLine, render: ctx.render, scheduleRender: ctx.render,
  ensureAssistantLabel: noop, saveSessionImpl: noop, ...extra,
})
const frameOf = (ctx, cols = 100) =>
  renderFrame(ctx.state, ctx.agent, { cols, rows: 30, slashCommands: [] }).frame
const boxOf = (ctx) => computeLayout(ctx.state, { cols: 100, rows: 30 }).boxLines.join("\n")

// ─── 腿 1 · 回调接线可注入（§6.22 ⑧ 回调解）─────────────────────────────────────────────────────

test("腿1 回调接线可注入：askSecretInput ⇒ onSecretInput 直递 ∥ 未注入 ⇒ 端面显式拒句（不挂起）", async () => {
  const ctx = makeCtx()
  const seen = []
  const cbs = buildToolCallbacks(bareDeps(ctx, {
    askSecretInput: async (p) => { seen.push(p); return { user: "u", password: "p" } },
  }))
  assert.equal(typeof cbs.callbacks.onSecretInput, "function", "onSecretInput 在场上（注入面）")
  const out = await cbs.callbacks.onSecretInput(PAYLOAD)
  assert.deepEqual(out, { user: "u", password: "p" }, "返回值直递（{<name>:<值>}）")
  assert.equal(seen.length, 1)
  assert.equal(seen[0], PAYLOAD, "载荷直递（零改写）")

  const bare = buildToolCallbacks(bareDeps(ctx))
  assert.equal("onQuestion" in bare.callbacks, false, "负控：onQuestion 未注入 ⇒ 键缺席（既有形）")
  assert.equal(typeof bare.callbacks.onSecretInput, "function", "凭据窗未注入 ⇒ 键仍在（拒绝面——不是缺席）")
  assert.throws(() => bare.callbacks.onSecretInput(PAYLOAD), (e) => e.message === SECRET_NO_UI_TEXT,
    "无 UI ⇒ 可读句抛（不挂起、不静默——照 question.mjs 无 UI 抛例）")
  assert.match(SECRET_NO_UI_TEXT, /ssh-agent/, "句含指引（改密钥 / agent——用例表 E6）")
})

// ─── 腿 2 · 模态状态进出 + 掩码零留存（§6.22 ⑦/⑧/⑨）────────────────────────────────────────────

test("腿2 模态状态进出 + 掩码零留存：预填 → 推进 → 掩码回显 → 提交返值 ∧ 状态 0 命中", async () => {
  const ctx = makeCtx()
  const p = ctx.inter.askSecretInput(PAYLOAD)
  const face = ctx.state.secretPrompt
  assert.ok(face, "面在场（模态族第四支）")
  assert.equal(face.kind, "ssh-credential")
  assert.equal(face.index, 0, "步 1 = user（字段序）")
  assert.equal(ctx.state.input.join(""), "admin", "非密字段预填（设计 ⑨——可改）")
  assert.equal(secretMaskActive(ctx.state), false, "非掩码步")
  assert.equal(computeLayout(ctx.state, { cols: 100, rows: 30 }).overlay, face,
    "overlay 第四支 = 凭据窗（行契约 { lines, scroll }）")
  const f1 = frameOf(ctx)
  assert.ok(f1.includes("10.0.0.6"), "目标行（host）")
  assert.ok(f1.includes("\u276f " + t("ssh.field.user") + ":"), "步 1 问句行（当前字段——标签已投影）")
  assert.ok(f1.includes("SSH Credentials"), "输入框标题（第四支）")
  assert.equal(attentionKind(ctx.state), "blocked", "注意力族（与审批 / 提问同族——等待你的回答）")

  ctx.handler("", { name: "return" })
  await tick()
  assert.equal(ctx.state.secretPrompt, face, "步内推进（同面）")
  assert.equal(face.index, 1, "步 2 = password")
  assert.equal(ctx.state.input.length, 0, "掩码步零预填（密码零预填——设计 ⑨）")
  assert.equal(secretMaskActive(ctx.state), true, "掩码判据（layout 消费）")
  assert.equal(ctx.calls.submits, 0, "Enter 归面（未落编辑族 submit）")
  const faceLines = ctx.state.secretPrompt.lines.map((l) => l.text).join("\n")
  assert.ok(faceLines.includes("\u276f " + t("ssh.field.password") + ":"), "步 2 问句行（当前字段——标签同投）")
  assert.ok(faceLines.includes(t("ssh.field.user") + ": admin"), "已填非密字段留上下文行（同 teamAskLines 行形）")

  ctx.handler(SECRET) // 真实键面：可打印键落编辑族（输入框编辑）
  assert.equal(ctx.state.input.join(""), SECRET, "输入框原值（显示层变换——提交值原样）")
  const box = boxOf(ctx)
  assert.ok(box.includes("\u2022".repeat(SECRET.length)), "掩码回显（每字符 •——maskEcho 先例）")
  assert.ok(!box.includes(SECRET), "明文零上屏（输入框帧）")
  assert.ok(!JSON.stringify(ctx.state.secretPrompt).includes(SECRET), "面体态零明文（零留面体态）")
  assert.ok(!frameOf(ctx).includes(SECRET), "整帧零明文")
  assert.ok(frameOf(ctx).includes("SSH Credentials"), "输入框标题（第四支）")
  assert.ok(frameOf(ctx).includes("Type then Enter"), "状态行（面内键面提示）")

  ctx.handler("", { name: "return" })
  const out = await p
  assert.deepEqual(out, { user: "admin", password: SECRET }, "提交 = 值映射（字段序）")
  assert.equal(ctx.state.secretPrompt, null, "末步 ⇒ 面退场")
  assert.equal(ctx.state.input.length, 0, "输入框归还（清空）")
  assert.ok(!JSON.stringify(ctx.state).includes(SECRET), "掩码零留存：全状态 0 命中（NS4/⑦）")
  assert.ok(!JSON.stringify(ctx.lines).includes(SECRET), "对话行零命中（零入上下文）")
  assert.equal(computeLayout(ctx.state, { cols: 100, rows: 30 }).overlay, null, "overlay 退场")
  assert.equal(ctx.calls.submits, 0, "全窗零落 submit（模态独占）")
})

// ─── 腿 3 · 取消 ⇒ null（E4 可读句归工具面；端面零文案）───────────────────────────────────────

test("腿3 取消（Esc）⇒ null：面退场 + 输入框归还 + 状态 0 命中", async () => {
  const ctx = makeCtx()
  const p = ctx.inter.askSecretInput(PAYLOAD)
  ctx.handler("", { name: "return" })
  await tick()
  ctx.handler(SECRET)
  assert.equal(secretMaskActive(ctx.state), true)
  const linesBefore = ctx.lines.length
  ctx.handler("", { name: "escape" })
  assert.equal(await p, null, "取消 ⇒ null（§6.22 ⑧ 契约形）")
  assert.equal(ctx.state.secretPrompt, null, "面退场")
  assert.equal(ctx.state.input.length, 0, "输入框归还（清空 + 光标归零）")
  assert.equal(ctx.state.cursor, 0)
  assert.equal(ctx.lines.length, linesBefore, "零行（零新文案——同 /team login 口径；可读句 = 工具面 E4）")
  assert.ok(!JSON.stringify(ctx.state).includes(SECRET), "掩码零留存（取消径同清）")
})

// ─── 腿 4 · 无 UI 径抛句（CLI 未注入面 ∥ ACP 会话面）──────────────────────────────────────────

test("腿4 无 UI 径抛句：CLI 面 ∥ ACP 面两处同句；ssh 不入 ACP 装配剔除（密钥 / agent 径照常）", async () => {
  assert.throws(() => refuseSecretInput(), (e) => e.message === SECRET_NO_UI_TEXT, "端面拒件（同步抛）")

  const cb = buildAcpCallbacks({ sessionId: "1", notify: noop, request: async () => noop, onSecretInput: refuseSecretInput })
  assert.throws(() => cb.onSecretInput(PAYLOAD), (e) => e.message === SECRET_NO_UI_TEXT,
    "ACP 凭据径 = 可读句（不挂起、不静默）")
  const bare = buildAcpCallbacks({ sessionId: "1", notify: noop, request: async () => noop })
  assert.equal("onSecretInput" in bare, false, "缺省零注入（核工具自身抛句——同 question 无 UI 例）")

  const acpSrc = readFileSync(join(ROOT, "thincoder-cli/src/acp.mjs"), "utf8")
  assert.match(acpSrc, /onSecretInput: refuseSecretInput/, "ACP 装配：拒件注入（acp.mjs——ACP 支落点）")
  assert.ok(acpSrc.includes('ACP_EXCLUDED_TOOLS = ["question"]'),
    "ssh 不入装配剔除（工具本体保留——密钥 / agent 径照常可用 S1–S4）")
  assert.match(readFileSync(join(ROOT, "thincoder-cli/src/acp/session.mjs"), "utf8"), /onSecretInput/,
    "会话转口在档（session.mjs → bridge.mjs）")
})

// ─── 腿 5 · 负控（模态判据 / 键面吞面 / 必填驻留 / 未激活）──────────────────────────────────────

test("腿5 负控：modalOpen 不计入 ∥ PgUp 吞（不落 loadOlder）∥ 必填空驻留 ∥ 未激活零动作", async () => {
  assert.equal(modalOpen({ secretPrompt: { lines: [], scroll: 0 } }), false,
    "凭据窗属在飞回合面（state.processing 门承担——不入 modalOpen，同审批 / 提问族）")

  const ctx = makeCtx()
  assert.equal(handleSecretPromptKeys("", { name: "escape" }, ctx), false, "面未在场 ⇒ 零动作")

  const p = ctx.inter.askSecretInput(PAYLOAD)
  const scroll0 = ctx.state.scroll
  ctx.handler("", { name: "pageup" })
  assert.equal(ctx.state.scroll, scroll0, "PgUp 面内吞（零滚动）")
  assert.equal(ctx.calls.loadOlder, 0, "PgUp 不触发 loadOlder")
  ctx.handler("", { name: "up" })
  assert.equal(ctx.state.historyIndex, -1, "↑ 面内吞（零历史导航）")

  ctx.state.input = []
  ctx.state.cursor = 0
  ctx.handler("", { name: "return" })
  await tick()
  assert.equal(ctx.state.secretPrompt?.index, 0, "必填且空 ⇒ 驻留（零推进零提交）")
  assert.equal(ctx.calls.submits, 0)

  // Enter 变体（评审 🔵-5 已落）：裸 `\r` ∥ `enter` 两形同归面（不落编辑族——掩码缓冲零 `\n` 污染）
  ctx.handler("root")
  ctx.handler("\r", {})
  await tick()
  assert.equal(ctx.state.secretPrompt?.index, 1, "裸 `\\r` 形 Enter ⇒ 归面推进（user 已填）")
  ctx.handler("x")
  ctx.handler("", { name: "enter" })
  assert.deepEqual(await p, { user: "root", password: "x" }, "`enter` 形 Enter ⇒ 归面提交")
  assert.equal(ctx.state.secretPrompt, null, "末步 ⇒ 面退场")
  assert.equal(ctx.calls.submits, 0, "全窗零落编辑族 submit（含 Enter 变体）")
  assert.equal(computeLayout(ctx.state, { cols: 100, rows: 30 }).overlay, null, "退场复核（overlay 归还）")
})

// ─── 腿 6 · 词面投影（keys = i18n 键——核字典 + 端投影）──────────────────────────────────────

test("腿6 词面投影：keys.title / keys.prompt = i18n 键（核字典 + 端投影——含插值与字段标签）", async () => {
  // ① 真键（设计载荷实键）：标题 / 问句行投影 + `${host}` 插值 + 字段标签 `ssh.field.<name>`
  const ctx = makeCtx()
  const p = ctx.inter.askSecretInput({ ...PAYLOAD, keys: { title: "ssh.credentialTitle", prompt: "ssh.credentialPrompt" } })
  const frame = frameOf(ctx, 140)
  assert.ok(frame.includes(t("ssh.credentialTitle")), "标题 = 核字典投影（overlay 标题行）")
  assert.ok(frame.includes(t("ssh.credentialPrompt", { host: "10.0.0.6" })), "prompt = 投影 + ${host} 插值")
  assert.ok(!frame.includes("${host}"), "占位串零残留（插值到位）")
  assert.ok(frame.includes(t("ssh.field.user")), "字段标签 = ssh.field.<name> 投影")
  assert.ok(!frame.includes("\u276f user:"), "裸字段名零上屏（投影后）")
  ctx.handler("", { name: "return" })
  await tick()
  assert.ok(ctx.state.secretPrompt.lines.some((l) => l.text.includes(t("ssh.field.user"))), "已填行标签同投影")
  assert.ok(ctx.state.secretPrompt.lines.some((l) => l.text.includes("\u276f " + t("ssh.field.password"))), "当前字段行同投影")
  ctx.handler("", { name: "escape" })
  assert.equal(await p, null)

  // ② 键缺 ⇒ t() 兜底回键名本身（缺键不抛不空白）
  const ctx2 = makeCtx()
  const p2 = ctx2.inter.askSecretInput(PAYLOAD)
  const frame2 = frameOf(ctx2, 140)
  assert.ok(frame2.includes("ssh.credential.title"), "缺键 ⇒ 回键名本身（i18n 契约——不抛不空白）")
  assert.ok(frame2.includes("ssh.credential.prompt"))
  ctx2.handler("", { name: "escape" })
  assert.equal(await p2, null)

  // ③ 字段名不在字典 ⇒ 回退原名（不空标——同 VSC / 桌面 fieldWord）
  const ctx3 = makeCtx()
  const p3 = ctx3.inter.askSecretInput({ ...PAYLOAD, fields: [{ name: "pin", masked: true, required: true, prefill: "" }] })
  assert.ok(frameOf(ctx3, 140).includes("\u276f pin:"), "未知字段名 ⇒ 标签回退原名")
  ctx3.handler("", { name: "escape" })
  assert.equal(await p3, null)
})

// ─── 腿 7 · 掩码族在场 ⇒ 搜索不入场（2026-10-14 裁 A——三处泄漏类同修）────────────────────────────

test("腿7 掩码族 ⇒ 搜索不进场（凭据窗 ∥ 团队问句面 ∥ 密码步同守；非掩码步照旧）", async () => {
  // ① 凭据窗（掩码步）：Ctrl+F 不入场 ∧ 键入归面（零明文显示）
  const ctx = makeCtx()
  const p = ctx.inter.askSecretInput(PAYLOAD)
  ctx.handler("", { name: "return" })
  await tick()
  assert.equal(secretMaskActive(ctx.state), true, "步 2 = 掩码步")
  ctx.handler("\u0006", { name: "f", ctrl: true })
  assert.equal(ctx.state.search, null, "凭据窗在场 ⇒ 搜索不进场（掩码形不破）")
  ctx.handler(SECRET)
  assert.equal(ctx.state.search, null, "键入后仍零搜索态（字符未改道 search.query）")
  assert.equal(ctx.state.input.join(""), SECRET, "键入归面（输入框原值）")
  assert.ok(!frameOf(ctx).includes(SECRET), "键入零明文显示")
  assert.ok(boxOf(ctx).includes("\u2022".repeat(SECRET.length)), "掩码回显照旧")
  ctx.handler("", { name: "escape" })
  assert.equal(await p, null)

  // ② 团队问句面（掩码步）：同守
  const c2 = makeCtx()
  c2.state.teamAsk = { step: "password", fields: {}, lines: [], scroll: 0 }
  c2.handler("\u0006", { name: "f", ctrl: true })
  assert.equal(c2.state.search, null, "团队问句面在场 ⇒ 搜索不进场")

  // ③ 向导团队密码步：同守（判据单源 = ask-steps.mjs askMaskActive）
  const c3 = makeCtx()
  c3.state.wizard = { step: "password", fields: {}, lines: [], scroll: 0 }
  c3.handler("\u0006", { name: "f", ctrl: true })
  assert.equal(c3.state.search, null, "向导密码步 ⇒ 搜索不进场")

  // ④ 负控：向导非密码步（server）⇒ 搜索照旧可进（零扩面）∧ 已开搜索 Esc 仍可退
  const c4 = makeCtx()
  c4.state.wizard = { step: "server", fields: {}, lines: [], scroll: 0 }
  c4.handler("\u0006", { name: "f", ctrl: true })
  assert.notEqual(c4.state.search, null, "非掩码步 ⇒ 搜索照旧进场（设计优先级链未动）")
  c4.handler("", { name: "escape" })
  assert.equal(c4.state.search, null, "已开搜索不受入场守卫（Esc 退出照旧）")
})

// ─── 腿 8 · 反交错明文口（搜索已开 + 掩码面弹出——键路由每键重判 · 2026-10-14 fix 轮）────────────

test("腿8 反交错明文口：搜索已开 + 凭据窗弹出 ⇒ 键入零落 search.query ∧ 掩码正常收字 ∧ 退场后 query 原样", async () => {
  // ① 凭据窗（本修主面）：搜索已开 → 凭据窗弹出 → 掩码步键入
  const ctx = makeCtx()
  ctx.handler("\u0006", { name: "f", ctrl: true })
  assert.ok(ctx.state.search, "搜索已开（前置）")
  for (const ch of "log") ctx.handler(ch)
  assert.equal(ctx.state.search.query, "log", "查询词在场（前置）")

  const p = ctx.inter.askSecretInput(PAYLOAD)
  assert.ok(ctx.state.secretPrompt, "凭据窗弹出（与搜索态并存——交错）")
  ctx.handler("z")
  assert.equal(ctx.state.search.query, "log", "步 1 键入零落 search.query（面开即让位）")
  ctx.handler("", { name: "return" })
  await tick()
  assert.ok(ctx.state.search, "Enter 归掩码面：搜索不退场（键路由优先）")
  assert.equal(ctx.state.secretPrompt.index, 1, "步 2 = 掩码步")

  for (const ch of SECRET) ctx.handler(ch)
  assert.equal(ctx.state.search.query, "log", "键入零落 search.query（明文口封口）")
  assert.equal(ctx.state.input.join(""), SECRET, "掩码层正常收字")
  assert.ok(!frameOf(ctx).includes(SECRET), "键入零明文上屏")

  ctx.handler("", { name: "escape" })
  assert.equal(await p, null, "Esc 归掩码面（整窗取消——不落搜索退场）")
  assert.equal(ctx.state.secretPrompt, null, "面退场")
  assert.equal(ctx.state.search.query, "log", "退场后 query 原样")
  assert.ok(ctx.state.search, "搜索态保留（掩码退场即恢复）")
  ctx.handler("x")
  assert.equal(ctx.state.search.query, "logx", "退场后搜索层恢复收字（零残留改道）")

  // ② 同族交错：团队问句面（掩码步）在场 + 搜索已开 ⇒ 同让位
  const c2 = makeCtx()
  c2.handler("\u0006", { name: "f", ctrl: true })
  c2.handler("l")
  c2.state.teamAsk = { step: "password", fields: {}, lines: [], scroll: 0 }
  c2.handler("p")
  assert.equal(c2.state.search.query, "l", "团队问句面交错：键入零落 search.query")
  assert.ok(c2.state.search, "搜索态保留")

  // ③ 同族交错：向导团队密码步 ⇒ 同让位（askMaskActive 单源）
  const c3 = makeCtx()
  c3.handler("\u0006", { name: "f", ctrl: true })
  c3.handler("l")
  c3.state.wizard = { step: "password", fields: {}, lines: [], scroll: 0 }
  c3.handler("p")
  assert.equal(c3.state.search.query, "l", "向导密码步交错：键入零落 search.query")

  // ④ 负控：非掩码步（向导 server）交错 ⇒ 搜索照旧收字（守卫零扩面）
  const c4 = makeCtx()
  c4.handler("\u0006", { name: "f", ctrl: true })
  c4.state.wizard = { step: "server", fields: {}, lines: [], scroll: 0 }
  c4.handler("l")
  assert.equal(c4.state.search.query, "l", "非掩码步 ⇒ 搜索照旧收字")
})

// ─── 腿 9 · 无 UI 拒句归一（核字典投影 `ssh.no_ui`——端零字面副本 · 2026-10-14 fix 轮）────────

test("腿9 无 UI 拒句归核字典：SECRET_NO_UI_TEXT = ssh.no_ui 投影值（端零字面副本）", async () => {
  assert.equal(SECRET_NO_UI_TEXT, t("ssh.no_ui"), "端常量 = 核字典投影值（单源）")
  assert.throws(() => refuseSecretInput(), (e) => e.message === t("ssh.no_ui"), "拒件抛句 = 投影值")
  assert.match(SECRET_NO_UI_TEXT, /ssh-agent/, "指引句照旧（用例表 E6——投影值不减）")

  const srcRoot = join(ROOT, "thincoder-cli/src")
  const hits = readdirSync(srcRoot, { recursive: true })
    .filter((p) => /\.(mjs|cjs|js)$/.test(p))
    .filter((p) => readFileSync(join(srcRoot, p), "utf8").includes("use key-based auth or ssh-agent"))
  assert.deepEqual(hits, [], "端全树零字面副本（拒句只住核字典——端取键投影）")
  assert.match(readFileSync(join(srcRoot, "tui/secret-prompt.mjs"), "utf8"), /t\("ssh\.no_ui"\)/,
    "端取键 = ssh.no_ui（核字典）")
})
