/**
 * 2026-10-14-ssh-session-vsc.test.mjs — SSH 会话工具 **VSC 腿**（批 `2026-10-14-ssh-session` ·
 * 台账 #1436）批次本地单元件。名随批次档 · 住批次目录 · **不进仓套件**；复跑（从仓库根 `thincoder/`）：
 *   node --test docs/batches/2026-10-14-ssh-session-vsc.test.mjs
 *
 * 用例（V1–V9；设计单源 = `docs/core/design/TOOLS.md` §6.22 ⑧「三端弹窗载荷」——VSC 行 =
 * `panel-callbacks.mjs` 卡片（`makeAskInPanel` 同族）+ 消化面回落 + webview 卡面）：
 *   V1 回调接线（host）：`buildPanelCallbacks` 供给 `onSecretInput`——载荷原样透传 + 单调
 *      promptId + status waiting；应答按 promptId 配对 resolve（值面 = 返回值原样）。
 *   V2 取消径：`values: null` ⇒ resolve null（工具侧得可读句）。
 *   V3 abort 径：Stop / abort ⇒ `secretInputCancelled` 出站 + resolve null（不挂起）。
 *   V4 配对纪律：错序应答各归其位；未知 promptId ⇒ no-op（不误 resolve 错队头）。
 *   V5 消化面回落（结构）：无人值守 digest 的显式取消桩在位（autoTurn 块内——question 同形）。
 *   V6 卡面渲染（fake DOM）：标题 / 提示词（词键 + `${host}` 插值——词典取生产同径
 *      `loadLocaleStrings`（核投影 ⊕ 本地档））/ 字段（标签词、掩码 `type=password`、
 *      非密 `prefill`、密字段零预填）；渲染期零出站（值只走返回路）。
 *   V7 提交 / 取消出站：提交 ⇒ `secretInputResponse` 携 `values` 对象 + promptId；取消 ⇒ null；
 *      两径摘卡 + 回焦输入框。
 *   V8 必填门：空必填字段 ⇒ 零出站 + 聚焦该字段（不静默提交空值）。
 *   V9 两语键对等（结构）+ 本地副本逐字同核投影（双源同值）+ 协议面三型在盘（host ∥
 *      webview 两侧——`secretInput` / `secretInputResponse` / `secretInputCancelled`）。
 *   V10 词面合同（跨仓）：核发射键字面（`thincoder-core/agent-tools/ssh-session.mjs`）在端
 *      词典可解为词（非键名自身）——键形漂移由本用例看住。
 *
 * 数据面纪律：零网络 / 零磁盘 / 零真 ssh——夹具 = 假面板 + mini 假 DOM；值面断言只用假凭据串。
 * 挂载面（先例 = `2026-10-14-injection-switches.test.mjs:47-56`）：`@thincoder/core/*` 裸符经
 * resolve 钩子归一为本仓 file URL（端壳 junction realpath 与测试 file URL 盘符大小写不同 ⇒
 * 模块身份分裂双实例）；`vscode` 裸符（端壳宿主供给的内建模块）钩到 data: 空壳——导入期零 API 消费。
 */
import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { registerHooks } from "node:module"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT_URL = new URL("../../", import.meta.url) // 仓根（docs/batches 两层深）
const ROOT = fileURLToPath(ROOT_URL)
const CORE_BASE = new URL("thincoder-core/", ROOT_URL)
const RC_BASE = new URL("thincoder-render-core/", ROOT_URL)

// `vscode` 宿主模块空壳（导入期零 API 消费——只需可解析）。
const VSCODE_STUB = "data:text/javascript," + encodeURIComponent(
  "export const window = {}; export const workspace = {}; export const env = { language: 'en' };\n"
)

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "vscode") return { url: VSCODE_STUB, shortCircuit: true }
    if (specifier.startsWith("@thincoder/core/")) {
      return { url: new URL(specifier.slice("@thincoder/core/".length), CORE_BASE).href, shortCircuit: true }
    }
    if (specifier.startsWith("@thincoder/render-core/")) {
      return { url: new URL(specifier.slice("@thincoder/render-core/".length), RC_BASE).href, shortCircuit: true }
    }
    return next(specifier, context)
  },
})

const text = (rel) => readFileSync(join(ROOT, rel), "utf8")

// ─── mini 假 DOM（沿 `2026-10-14-injection-switches.test.mjs:390-438` 收缩 + querySelector 族）───
class FakeNode {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase(); this.attrs = {}; this.dataset = {}; this.children = []
    this.listeners = []; this.textContent = ""; this.value = ""; this.type = ""; this.parent = null
    this._classes = new Set()
  }
  set className(v) { this._classes = new Set(String(v).split(/\s+/).filter(Boolean)) }
  get className() { return [...this._classes].join(" ") }
  get classList() {
    return {
      add: (...c) => { for (const x of c) this._classes.add(x) },
      remove: (...c) => { for (const x of c) this._classes.delete(x) },
      contains: (c) => this._classes.has(c),
    }
  }
  setAttribute(k, v) { this.attrs[k] = String(v) }
  getAttribute(k) { return this.attrs[k] ?? null }
  addEventListener(type, fn) { this.listeners.push({ type, fn }) }
  removeEventListener() {}
  appendChild(n) { this.children.push(n); n.parent = this; return n }
  remove() {
    const p = this.parent
    if (p) { const i = p.children.indexOf(this); if (i >= 0) p.children.splice(i, 1) }
    this.parent = null
  }
  scrollIntoView() {}
  focus() { FOCUSED = this }
  matches(sel) {
    const s = String(sel)
    return s.startsWith(".") ? this._classes.has(s.slice(1)) : this.tagName === s.toUpperCase()
  }
  querySelectorAll(sel) { const out = []; const walk = (n) => { for (const c of n.children) { if (c.matches(sel)) out.push(c); walk(c) } }; walk(this); return out }
  querySelector(sel) { return this.querySelectorAll(sel)[0] ?? null }
  fire(type, event = {}) {
    for (const l of this.listeners) if (l.type === type) l.fn({ type, preventDefault() {}, stopPropagation() {}, target: this, ...event })
  }
}
let FOCUSED = null
const _byId = new Map()
const ROOTS = []
globalThis.Node = FakeNode
globalThis.document = {
  getElementById(id) { if (!_byId.has(id)) _byId.set(id, new FakeNode("div")); return _byId.get(id) },
  createElement: (t) => new FakeNode(t),
  createTextNode: (v) => ({ textContent: String(v) }),
  querySelector: () => null,
  querySelectorAll(sel) { const out = []; for (const r of ROOTS) out.push(...r.querySelectorAll(sel)); return out },
  addEventListener: () => {},
  removeEventListener: () => {},
  body: new FakeNode("body"),
  documentElement: new FakeNode("html"),
}
const postedWv = []
globalThis.acquireVsCodeApi = () => ({ postMessage: (m) => postedWv.push(m) })
globalThis.window = { _vscode: { postMessage: (m) => postedWv.push(m) }, addEventListener: () => {}, removeEventListener: () => {} }

// ─── 面取件 ──────────────────────────────────────────────────────────────────
const mod = (rel) => import(new URL(rel, ROOT_URL).href)
const EN_LOCALE = JSON.parse(text("thincoder-vscode/locales/en.json"))
const ZH_LOCALE = JSON.parse(text("thincoder-vscode/locales/zh.json"))
const { setStrings } = await mod("thincoder-vscode/webview/i18n.js")
const { loadLocaleStrings } = await mod("thincoder-vscode/src/i18n.mjs")
const { projectDictionary } = await mod("thincoder-core/i18n.mjs")
// 词典 = 生产同径（核投影底座 ⊕ 本地档叠加——`thincoder-vscode/src/i18n.mjs` `_load`）；
// webview 收到的 `i18n` 消息即此形（本地键恒胜 ⇒ 本地副本值必须逐字同核投影）。
const EN_DICT = loadLocaleStrings("en")
const ZH_DICT = loadLocaleStrings("zh")
setStrings(EN_DICT)
const { showSecretInput } = await mod("thincoder-vscode/webview/secret-input.js")
const { buildPanelCallbacks } = await mod("thincoder-vscode/src/extension/panel-callbacks.mjs")
const { handleSecretInputResponse } = await mod("thincoder-vscode/src/extension/panel-messages-turn.mjs")

// ─── 夹具 ────────────────────────────────────────────────────────────────────
/** 假面板（回调接线所需最小面；`_refreshStatus` 计数供「释放必刷」断言）。 */
const mkPanel = () => {
  const posted = []
  const panel = {
    _questionQueue: [], _permissionQueue: [], _secretQueue: [],
    _autoApprove: false, _status: null, _refreshCount: 0,
    _setStatus(s) { this._status = s },
    _refreshStatus() { this._refreshCount += 1; this._setStatus(this._secretQueue.length > 0 ? "waiting" : "idle") },
    _abortController: new AbortController(),
    _panel: { webview: { postMessage: (m) => posted.push(m) } },
  }
  return { panel, posted }
}

const PAYLOAD = {
  kind: "ssh-credential",
  sessionId: "ssh#1",
  host: "10.0.0.5",
  user: "ops",
  port: 22,
  fields: [
    { name: "user", masked: false, required: true, prefill: "ops" },
    { name: "password", masked: true, required: true, prefill: null },
  ],
  keys: { title: "ssh.credentialTitle", prompt: "ssh.credentialPrompt" },
}

/* ═══ V1 回调接线（host） ═══════════════════════════════════════════════════ */

test("V1 回调接线：onSecretInput 供给 ⇒ 载荷透传 + promptId + waiting；应答按 id 配对 resolve", async () => {
  const { panel, posted } = mkPanel()
  const cbs = buildPanelCallbacks(panel, {})

  assert.equal(typeof cbs.onSecretInput, "function", "buildPanelCallbacks 供给 onSecretInput（§6.22 ⑧ 注入缝）")

  const p = cbs.onSecretInput(PAYLOAD)
  assert.equal(panel._status, "waiting", "卡片在场 ⇒ 状态 waiting（question 同族）")
  assert.equal(panel._secretQueue.length, 1, "队列登记恰一条")
  assert.equal(posted.length, 1, "出站恰一帧（渲染前零多余消息）")

  const msg = posted[0]
  assert.equal(msg.type, "secretInput", "出站型 = secretInput")
  assert.equal(msg.payload, PAYLOAD, "载荷原样透传（零改写——结构化字段 + 词键）")
  assert.equal(msg.promptId, 1, "promptId = 面板单调计数（首帧 = 1）")

  handleSecretInputResponse(panel, { type: "secretInputResponse", values: { user: "ops", password: "pw-a1" }, promptId: 1 })
  const values = await p
  assert.deepEqual(values, { user: "ops", password: "pw-a1" }, "resolve 值 = 返回值原样（值只走返回路）")
  assert.equal(panel._secretQueue.length, 0, "应答后出队")
  assert.equal(panel._refreshCount, 1, "释放 ⇒ 状态栏必刷（questionResponse 同构）")
  assert.equal(panel._status, "idle", "队列空 ⇒ 回落到回合态（此处理想态 idle）")
})

/* ═══ V2 取消径 ═════════════════════════════════════════════════════════════ */

test("V2 取消径：values null ⇒ resolve null（工具侧可读句）", async () => {
  const { panel } = mkPanel()
  const cbs = buildPanelCallbacks(panel, {})
  const p = cbs.onSecretInput(PAYLOAD)
  handleSecretInputResponse(panel, { type: "secretInputResponse", values: null, promptId: 1 })
  assert.equal(await p, null, "取消 ⇒ null（不挂起）")
  assert.equal(panel._secretQueue.length, 0, "取消同样出队")
})

/* ═══ V3 abort 径 ═══════════════════════════════════════════════════════════ */

test("V3 abort 径：Stop / abort ⇒ secretInputCancelled 出站 + resolve null（不挂起）", async () => {
  const { panel, posted } = mkPanel()
  const cbs = buildPanelCallbacks(panel, {})
  const p = cbs.onSecretInput(PAYLOAD)
  panel._abortController.abort()
  assert.equal(await p, null, "abort ⇒ resolve null（回合不悬挂）")
  const cancel = posted.find((m) => m.type === "secretInputCancelled")
  assert.ok(cancel, "abort ⇒ secretInputCancelled 出站")
  assert.equal(cancel.promptId, 1, "取消帧携同 id（webview 摘对应卡）")
  assert.equal(panel._secretQueue.length, 0, "abort 后队列清空")
})

/* ═══ V4 配对纪律 ═══════════════════════════════════════════════════════════ */

test("V4 配对纪律：错序应答各归其位；未知 promptId ⇒ no-op", async () => {
  const { panel } = mkPanel()
  const cbs = buildPanelCallbacks(panel, {})
  const p1 = cbs.onSecretInput(PAYLOAD)
  const p2 = cbs.onSecretInput({ ...PAYLOAD, kind: "ssh-secret", keys: { title: "ssh.secretTitle", prompt: "ssh.secretPrompt" } })
  assert.equal(panel._secretQueue.length, 2, "两问并存")

  // 错序：先答后问（id 2）——不得 resolve 队头
  handleSecretInputResponse(panel, { type: "secretInputResponse", values: { secret: "s-2" }, promptId: 2 })
  assert.deepEqual(await p2, { secret: "s-2" }, "id 2 应答命中 id 2")
  assert.equal(panel._secretQueue.length, 1, "id 1 仍在队")

  // 未知 id ⇒ no-op（陈旧 / 迟到响应不误 resolve）
  handleSecretInputResponse(panel, { type: "secretInputResponse", values: { password: "late" }, promptId: 999 })
  assert.equal(panel._secretQueue.length, 1, "未知 promptId ⇒ 队列零动")

  handleSecretInputResponse(panel, { type: "secretInputResponse", values: { password: "pw-1" }, promptId: 1 })
  assert.deepEqual(await p1, { password: "pw-1" }, "id 1 应答命中 id 1")
  assert.equal(panel._secretQueue.length, 0, "两问全清")
})

/* ═══ V5 消化面回落（结构） ═════════════════════════════════════════════════ */

test("V5 消化面回落（结构）：无人值守 digest 的显式取消桩在位（autoTurn 块内）", () => {
  const src = text("thincoder-vscode/src/extension/panel-chat.mjs")
  assert.match(
    src,
    /if \(autoTurn && !panel\._autoApprove\) \{[\s\S]*?callbacks\.onSecretInput = async \(\) => null/,
    "digest / 手动档 autoturn 块内 onSecretInput 取消桩（凭据窗不得挂起无人值守回合）",
  )
  assert.match(src, /callbacks\.onQuestion = async \(\) => null/, "同块 question 桩在盘（同族对照——零漂移）")
})

/* ═══ V6 卡面渲染（fake DOM） ═══════════════════════════════════════════════ */

test("V6 卡面渲染：词键出词 + ${host} 插值 + 掩码 / 预填 / 必填语义；渲染期零出站", () => {
  const ctx = { messagesEl: new FakeNode("div"), inputEl: new FakeNode("textarea") }
  ROOTS.push(ctx.messagesEl)
  const before = postedWv.length
  showSecretInput(ctx, PAYLOAD, 7)

  const card = ctx.messagesEl.querySelector(".secret-card")
  assert.ok(card, "卡面落屏（#messages 追加）")
  assert.equal(card.dataset.promptId, "7", "卡携 promptId（host 按 id 配对 / 取消摘卡）")
  assert.equal(card.getAttribute("role"), "alert", "无障碍角色在盘")
  assert.equal(card.getAttribute("aria-label"), EN_DICT["secret.label"], "卡 aria-label = 词键出词")

  assert.equal(card.querySelector(".secret-title").textContent, EN_DICT["ssh.credentialTitle"], "标题 = 词键出词（核投影 ⊕ 本地档）")
  assert.equal(
    card.querySelector(".secret-prompt").textContent,
    EN_DICT["ssh.credentialPrompt"].replace("${host}", "10.0.0.5"),
    "提示词 = 词键出词 + ${host} 用载荷 host 插值",
  )

  const inputs = card.querySelectorAll(".secret-input")
  assert.equal(inputs.length, 2, "逐字段一输入")
  assert.equal(inputs[0].type, "text", "非掩码字段 = text")
  assert.equal(inputs[1].type, "password", "掩码字段 = password（回显遮蔽）")
  assert.equal(inputs[0].value, "ops", "prefill 落值（非密字段预填）")
  assert.equal(inputs[1].value, "", "密字段无预填（零记忆）")
  const labels = card.querySelectorAll("label")
  assert.equal(labels[0].textContent, EN_DICT["ssh.field.user"], "字段标签 = ssh.field.<name> 词键")
  assert.equal(labels[1].textContent, EN_DICT["ssh.field.password"], "掩码字段标签同源")
  assert.ok(!/console\./.test(text("thincoder-vscode/webview/secret-input.js")), "卡面零日志（值面纪律——NS4）")

  // 密字段零预填（NS4 硬化）：载荷即使误填 `prefill` 也不落 DOM（三端同判据——CLI ∥ 桌面）
  const ctx2 = { messagesEl: new FakeNode("div"), inputEl: new FakeNode("textarea") }
  ROOTS.push(ctx2.messagesEl)
  showSecretInput(ctx2, { ...PAYLOAD, fields: [{ name: "password", masked: true, required: true, prefill: "leak" }] }, 8)
  assert.equal(ctx2.messagesEl.querySelector(".secret-input").value, "", "密字段恒零预填（prefill 被忽略——零记忆）")

  assert.equal(postedWv.length, before, "渲染期零出站（值只走返回路）")
})

/* ═══ V7 提交 / 取消出站 ════════════════════════════════════════════════════ */

test("V7 提交 / 取消出站：values 对象 ∥ null；两径摘卡 + 回焦输入框", () => {
  const ctx = { messagesEl: new FakeNode("div"), inputEl: new FakeNode("textarea") }
  ROOTS.push(ctx.messagesEl)

  // 提交径
  showSecretInput(ctx, PAYLOAD, 11)
  let card = ctx.messagesEl.querySelector(".secret-card")
  const inputs = card.querySelectorAll(".secret-input")
  inputs[1].value = "pw-x9"
  const btns = card.querySelectorAll(".perm-btn")
  assert.equal(btns[0].textContent, EN_DICT["secret.submit"], "提交钮 = 词键出词")
  assert.equal(btns[1].textContent, EN_DICT["secret.cancel"], "取消钮 = 词键出词")
  const before = postedWv.length
  btns[0].fire("click")
  assert.equal(postedWv.length, before + 1, "提交 ⇒ 恰一帧出站")
  const sent = postedWv.at(-1)
  assert.equal(sent.type, "secretInputResponse", "出站型 = secretInputResponse")
  assert.deepEqual(sent.values, { user: "ops", password: "pw-x9" }, "values = { <name>: <值> }（全字段）")
  assert.equal(sent.promptId, 11, "promptId 随帧")
  assert.equal(ctx.messagesEl.querySelector(".secret-card"), null, "提交径摘卡（输入值随节点丢弃——零留存）")
  assert.equal(FOCUSED, ctx.inputEl, "摘卡后回焦输入框")

  // 取消径
  showSecretInput(ctx, PAYLOAD, 12)
  card = ctx.messagesEl.querySelector(".secret-card")
  const cancelBtn = card.querySelectorAll(".perm-btn")[1]
  const before2 = postedWv.length
  cancelBtn.fire("click")
  const sent2 = postedWv.at(-1)
  assert.equal(postedWv.length, before2 + 1, "取消 ⇒ 恰一帧出站")
  assert.equal(sent2.type, "secretInputResponse", "取消同为 secretInputResponse（判别式单型）")
  assert.equal(sent2.values, null, "取消 ⇒ values null")
  assert.equal(sent2.promptId, 12, "取消帧携同 id")
  assert.equal(ctx.messagesEl.querySelector(".secret-card"), null, "取消径摘卡")
  assert.equal(FOCUSED, ctx.inputEl, "取消后回焦输入框")

  // 回车提交 + IME 组字门
  showSecretInput(ctx, PAYLOAD, 13)
  card = ctx.messagesEl.querySelector(".secret-card")
  const pw = card.querySelectorAll(".secret-input")[1]
  pw.value = "pw-enter"
  const before3 = postedWv.length
  pw.fire("keydown", { key: "Enter", keyCode: 229 })
  assert.equal(postedWv.length, before3, "组字期回车零提交（IME 门——选字确认归输入法）")
  pw.fire("keydown", { key: "Enter" })
  assert.equal(postedWv.length, before3 + 1, "输入框回车 ⇒ 提交出站")
  assert.deepEqual(postedWv.at(-1).values, { user: "ops", password: "pw-enter" }, "回车提交同路径取值")
})

/* ═══ V8 必填门 ═════════════════════════════════════════════════════════════ */

test("V8 必填门：空必填字段 ⇒ 零出站 + 聚焦该字段", () => {
  const ctx = { messagesEl: new FakeNode("div"), inputEl: new FakeNode("textarea") }
  ROOTS.push(ctx.messagesEl)
  showSecretInput(ctx, PAYLOAD, 21)
  const card = ctx.messagesEl.querySelector(".secret-card")
  const inputs = card.querySelectorAll(".secret-input")
  inputs[1].value = "" // 必填密字段留空
  const before = postedWv.length
  card.querySelectorAll(".perm-btn")[0].fire("click")
  assert.equal(postedWv.length, before, "空必填 ⇒ 零出站（不静默提交空值）")
  assert.equal(FOCUSED, inputs[1], "聚焦首个空必填字段")
  assert.ok(ctx.messagesEl.querySelector(".secret-card"), "卡不摘（可继续填写）")
})

/* ═══ V9 两语键对等 + 协议面三型在盘 ════════════════════════════════════════ */

test("V9 两语键对等（结构）+ 协议面三型在盘（host ∥ webview 两侧）", () => {
  assert.deepEqual(Object.keys(EN_LOCALE).sort(), Object.keys(ZH_LOCALE).sort(), "两语键集相等（增键两语同增）")
  const SSH_KEYS = ["ssh.credentialTitle", "ssh.credentialPrompt", "ssh.secretTitle", "ssh.secretPrompt",
    "ssh.field.user", "ssh.field.password", "ssh.field.secret"]
  const END_KEYS = ["secret.label", "secret.submit", "secret.cancel"]
  for (const key of [...END_KEYS, ...SSH_KEYS]) {
    for (const [tag, loc] of [["en", EN_LOCALE], ["zh", ZH_LOCALE]]) {
      assert.equal(typeof loc[key], "string", `${tag} 词键在场：${key}`)
      assert.ok(loc[key].length > 0, `${tag} 词键非空：${key}`)
    }
  }
  // 双源同值（核域键本地副本 vs 核投影——本地键恒胜 ⇒ 值不同即端差）：逐字同值硬断言；
  // 同时钓住键形（键形漂移 = 卡面出键名自身的静默破——核域键字面以核字典为准）。
  for (const key of SSH_KEYS) {
    assert.equal(EN_LOCALE[key], projectDictionary("en")[key], `en 本地副本逐字同核投影：${key}`)
    assert.equal(ZH_LOCALE[key], projectDictionary("zh")[key], `zh 本地副本逐字同核投影：${key}`)
  }
  // 卡面消费的键位在盘（卡面 → 字典的引用闭包）
  const cardSrc = text("thincoder-vscode/webview/secret-input.js")
  for (const key of ["secret.label", "secret.submit", "secret.cancel"]) {
    assert.ok(cardSrc.includes(`"${key}"`), `卡面引用键在盘：${key}`)
  }
  assert.match(cardSrc, /`ssh\.field\.\$\{raw\}`/, "字段标签词键形 = ssh.field.<name>（缺键回退原名）")

  // 协议面三型（host 产 / 消费 ∥ webview 消费 / 产）
  const callbacksSrc = text("thincoder-vscode/src/extension/panel-callbacks.mjs")
  assert.match(callbacksSrc, /type: "secretInput", payload, promptId: id/, "host 产 secretInput")
  assert.match(callbacksSrc, /type: "secretInputCancelled", promptId: id/, "host 产 secretInputCancelled")
  const dispatchSrc = text("thincoder-vscode/src/extension/panel-messages.mjs")
  assert.match(dispatchSrc, /case "secretInputResponse": handleSecretInputResponse\(panel, msg\); break/, "host 分发表收 secretInputResponse")
  const wvSrc = text("thincoder-vscode/webview/chat-messages.js")
  assert.match(wvSrc, /case "secretInput":[\s\S]*?showSecretInput\(ctx, m\.payload, m\.promptId\)/, "webview 分发收 secretInput")
  assert.match(wvSrc, /case "secretInputCancelled":/, "webview 分发收 secretInputCancelled（abort 摘卡）")
  assert.match(text("thincoder-vscode/webview/secret-input.js"), /type: "secretInputResponse", values: values \?\? null/, "webview 产 secretInputResponse")
})

/* ═══ V10 词面合同（跨仓） ══════════════════════════════════════════════════ */

test("V10 词面合同：核发射键字面在端词典可解为词（键形漂移由本用例看住）", () => {
  const coreSrc = text("thincoder-core/agent-tools/ssh-session.mjs")
  const emitted = [...coreSrc.matchAll(/keys:\s*\{\s*title:\s*"([^"]+)",\s*prompt:\s*"([^"]+)"\s*\}/g)]
    .flatMap((m) => [m[1], m[2]])
  assert.ok(emitted.length >= 4, `核发射锚点在场（两 kind × title/prompt——实读 ${emitted.length} 键）`)
  for (const [tag, dict] of [["en", EN_DICT], ["zh", ZH_DICT]]) {
    for (const key of emitted) {
      assert.equal(typeof dict[key], "string", `${tag} 发射键在端词典在场：${key}`)
      assert.notEqual(dict[key], key, `${tag} 发射键解析为词（非键名自身）：${key}`)
    }
  }
})
