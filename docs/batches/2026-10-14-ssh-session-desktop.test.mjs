/**
 * 2026-10-14-ssh-session-desktop.test.mjs — 批内单测件（ssh-session 批 · **桌面舱** · 名随批档 ·
 * 住 `docs/batches/` · 不入仓套件 · 随批留存；核 ∥ CLI ∥ VSC 三舱各有自家档）。
 * 运行（自 `thincoder/` 仓根）：`node --test docs/batches/2026-10-14-ssh-session-desktop.test.mjs`
 *
 * 射程（判据源 = `docs/core/design/TOOLS.md` §6.22 ⑧「三端弹窗载荷」＋ 本批档 §2 桌面行）：
 *   A 转口接线（主侧）：门表三值闭集 ∥ `askSecret` 七键白名单 ∥ 提交 / 取消 / 打断三径结算 ∥ 五拒档**不 resolve**
 *     （挂起保留）∥ 桥面 `onSecretInput` 转口（`askQuestion` 同族 —— 零回归）；
 *   B 弹窗渲染载荷（渲染面）：`secretPromptTree` 词面（`keys.title` / `keys.prompt` 端投影 + `${host}` 插值 ∥
 *     字段标签 `ssh.field.<name>` 投影，缺键回退原名）∥ 字段面（掩码 / 必填 / 预填）∥ 两钮 + 提交 / 取消 / Escape
 *     / IME 组字门接线 ∥ `readSecretValues` 读值 + 必填门（节点注入面 —— 值只在返回路）；
 *   C 提交 / 取消出站：`respondSecret` 载荷形 ∥ `submitSecret` 非乐观摘除（回执 `ok` 假 ⇒ 零写留场）∥
 *     值面纪律 canary 扫描（store ∥ 日志 0 命中 · 出站载荷恰携一次）；
 *   D 装配 + 端到端（假 DOM）：`attachSecretPrompt` 订阅随动（开 ∥ 退场 ∥ 切走关 + 项留存 + 切回再开）∥
 *     挂载 ⇒ 填值 ⇒ 提交 ⇒ 摘项退场 ∥ 必填门零出站 ∥ 回合尾 `stopped` 同清；
 *   E 两语键对等（`VIEWS_DICT` 键集相等 + 三新键与 VSC `locales` 逐字同源）∥ 通道三件套（白名单 53 末位
 *     `secret:respond` ∥ 订阅面 25 含 `ev:secret` ∥ `HANDLERS` 行集 = 白名单集 ∥ 四档头计数）。
 *
 * 平 node 直测（假 DOM / 桩窄桥 / 桩宿主；不碰真配置、不发真 IPC）；`/rc/` 解析钩子须先注册（渲染档取核件）。
 */
import test from "node:test"
import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = [join(HERE, "..", ".."), join(HERE, "..", "..", "..")].find((d) => existsSync(join(d, "thincoder-desktop")))
const at = (rel) => pathToFileURL(join(ROOT, rel)).href
const read = (rel) => readFileSync(join(ROOT, rel), "utf8")
const require = createRequire(import.meta.url)

await import(at("thincoder-desktop/test/rc-resolve.mjs")) // `/rc/` 解析钩子（须先于渲染档取件注册）

// ─── 假 DOM（建节点 / 属性 / 监听 / 选择器三形 —— 只覆盖本件消费面）────────────────────────────

class FakeNode {
  constructor(tag = "div") {
    this.tagName = String(tag)
    this.attrs = new Map()
    this.children = []
    this.parent = null
    this.listeners = new Map()
    this.text = ""
    this._value = null
  }
  setAttribute(name, value) { this.attrs.set(String(name), String(value)) }
  getAttribute(name) { return this.attrs.has(String(name)) ? this.attrs.get(String(name)) : null }
  hasAttribute(name) { return this.attrs.has(String(name)) }
  removeAttribute(name) { this.attrs.delete(String(name)) }
  get className() { return this.getAttribute("class") ?? "" }
  get value() { return this._value ?? this.getAttribute("value") ?? "" }
  set value(next) { this._value = String(next) }
  get textContent() { return this.text + this.children.map((child) => child.textContent).join("") }
  append(...nodes) {
    for (const node of nodes) {
      if (node === null || node === undefined) continue
      if (typeof node === "string") { this.text += node; continue }
      node.parent = this
      this.children.push(node)
    }
  }
  remove() {
    if (this.parent === null) return
    const index = this.parent.children.indexOf(this)
    if (index >= 0) this.parent.children.splice(index, 1)
    this.parent = null
  }
  replaceWith(node) {
    if (this.parent === null) return
    const index = this.parent.children.indexOf(this)
    if (index < 0) return
    this.parent.children[index] = node
    node.parent = this.parent
    this.parent = null
  }
  addEventListener(type, listener) {
    const list = this.listeners.get(String(type)) ?? []
    list.push(listener)
    this.listeners.set(String(type), list)
  }
  removeEventListener(type, listener) {
    const list = this.listeners.get(String(type)) ?? []
    this.listeners.set(String(type), list.filter((fn) => fn !== listener))
  }
  focus() { globalThis.document.focused = this }
  querySelectorAll(selector) {
    const hits = []
    const match = matcherOf(selector)
    const walk = (node) => {
      for (const child of node.children) {
        if (match(child)) hits.push(child)
        walk(child)
      }
    }
    walk(this)
    return hits
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null }
}

/** 选择器两形（本件用到的闭集）：`[attr]` ∥ `.class`。 */
function matcherOf(selector) {
  const text = String(selector)
  if (text.startsWith("[") && text.endsWith("]")) {
    const name = text.slice(1, -1)
    return (node) => node?.hasAttribute?.(name) === true
  }
  if (text.startsWith(".")) {
    const want = text.slice(1)
    return (node) => (node?.getAttribute?.("class") ?? "").split(/\s+/).includes(want)
  }
  return () => false
}

const fakeDocument = { createElement: (tag) => new FakeNode(tag), body: new FakeNode("body"), documentElement: new FakeNode("html"), focused: null }
globalThis.document = fakeDocument
globalThis.Node = FakeNode

/** 走节点上注册的监听（假 DOM 面 —— 只测本件两路：`submit` 卡面 ∥ 钮 `click`）。 */
function fire(node, type, event = {}) {
  for (const listener of node?.listeners?.get(type) ?? []) listener(event)
}

const flush = () => new Promise((resolve) => setImmediate(resolve))

/** 文件内容行（去尾空行 —— 与仓内回线判据同式）。 */
const contentLines = (text) => { const parts = String(text).split("\n"); if (parts.length && parts[parts.length - 1] === "") parts.pop(); return parts.length }

// ─── 取件 ────────────────────────────────────────────────────────────────────────────────────

const i18n = await import(at("thincoder-desktop/renderer/i18n.mjs"))
const { VIEWS_DICT } = await import(at("thincoder-desktop/renderer/i18n-views.mjs"))
const { initialState, createStore } = await import(at("thincoder-desktop/renderer/store.mjs"))
const { reduce } = await import(at("thincoder-desktop/renderer/events.mjs"))
const {
  attachSecretPrompt, clearSecret, closeSecretPrompt, onSecretRequest, readSecretValues,
  renderSecretPrompt, respondSecret, secretPromptNode, secretPromptTree, submitSecret,
} = await import(at("thincoder-desktop/renderer/secret-prompt.mjs"))
const { createGates } = await import(at("thincoder-desktop/src/main/suspensions.mjs"))
const { createBridge } = await import(at("thincoder-desktop/src/main/agent-bridge.mjs"))

/** 核字典投影（本件夹具 —— 生产面由 `config:read` 下发；键名 / 值面 = 三端同源）。 */
const CORE_ZH = {
  "ssh.credential.title": "SSH 凭据",
  "ssh.credential.prompt": "请输入 ${host} 的登录凭据。",
  "ssh.field.user": "用户名",
  "ssh.field.password": "密码",
}
const CORE_EN = {
  "ssh.credential.title": "SSH credentials",
  "ssh.credential.prompt": "Enter the credentials for ${host}.",
  "ssh.field.user": "User",
  "ssh.field.password": "Password",
}

const CANARY = "sec-CANARY-9f2b-do-not-log"

/** 设计定形载荷（§6.22 ⑧ 逐键）：`{ kind, sessionId, host, user, port, fields, keys }`。 */
const secretRequest = () => ({
  kind: "ssh-credential",
  sessionId: "session-abc",
  host: "10.0.0.5",
  user: "liwei",
  port: 22,
  fields: [
    { name: "user", masked: false, required: false, prefill: "liwei" },
    { name: "password", masked: true, required: true, prefill: null },
  ],
  keys: { title: "ssh.credential.title", prompt: "ssh.credential.prompt" },
})

const secretItem = (promptId = "p1") => ({ promptId, ...secretRequest() })

/** 深搜 / 全收（描述符面小工具 —— 与批内先例同形）。 */
const collectDeep = (node, pred, out = []) => {
  if (node === null || typeof node !== "object") return out
  if (Array.isArray(node)) { for (const item of node) collectDeep(item, pred, out); return out }
  if (pred(node)) out.push(node)
  collectDeep(node.children ?? null, pred, out)
  return out
}
const findDeep = (node, pred) => collectDeep(node, pred)[0] ?? null
const byClass = (node, name) => findDeep(node, (n) => String(n?.props?.class ?? "").split(/\s+/).includes(name))

/** 门表夹具（`post` 记录出站；`agents` 表供 `always` 径 —— 本件零用）。 */
function makeGates() {
  const posts = []
  const gates = createGates({ post: (channel, payload) => posts.push({ channel, payload }), agents: new Map() })
  return { gates, posts }
}

// ─── A 转口接线（主侧）────────────────────────────────────────────────────────────────────────

test("A1 门表：`askSecret` ⇒ `ev:secret` 出站（七键白名单 —— 表外键不入）", () => {
  const { gates, posts } = makeGates()
  const req = { ...secretRequest(), junk: "nope" }
  void gates.askSecret("7", req)
  assert.equal(posts.length, 1, "恰一次出站")
  const { channel, payload } = posts[0]
  assert.equal(channel, "ev:secret", "凭据门通道")
  assert.deepEqual(
    Object.keys(payload).sort(),
    ["fields", "host", "key", "keys", "kind", "port", "promptId", "sessionId", "user"].sort(),
    "载荷 = 设计七键 + 会话键 + 待决标识",
  )
  assert.equal(payload.key, "7")
  assert.equal(typeof payload.promptId, "string")
  assert.equal(payload.kind, "ssh-credential")
  assert.equal(payload.host, "10.0.0.5")
  assert.equal(payload.user, "liwei")
  assert.equal(payload.port, 22)
  assert.equal(payload.fields.length, 2)
  assert.equal(payload.keys.title, "ssh.credential.title")
  assert.equal("junk" in payload, false, "表外键不入出站")
  assert.equal(gates.table.size, 1, "门入表")
})

test("A2 门表：缺省归一（`fields` 非数组 ⇒ `[]` ∥ `keys` 非载体（含数组）⇒ `{}` ∥ 余键 ⇒ `null`）", () => {
  const { gates, posts } = makeGates()
  void gates.askSecret("7", { fields: "nope", keys: 3 })
  const { payload } = posts[0]
  assert.deepEqual(payload.fields, [])
  assert.deepEqual(payload.keys, {})
  assert.equal(payload.host, null)
  assert.equal(payload.user, null)
  assert.equal(payload.port, null)
  assert.equal(payload.kind, null)
  void gates.askSecret("8", { keys: [] })
  assert.deepEqual(posts[1].payload.keys, {}, "数组亦非载体（拒收 —— 与 `values` 同族收紧）")
})

test("A3 提交径：`secret:respond { values }` ⇒ resolve 同值对象 + 摘表", async () => {
  const { gates, posts } = makeGates()
  const pending = gates.askSecret("7", secretRequest())
  const { promptId } = posts[0].payload
  const values = { user: "liwei", password: CANARY }
  assert.deepEqual(gates.respond({ promptId, values }), { ok: true })
  assert.deepEqual(await pending, values, "值原样回门（零转写）")
  assert.equal(gates.table.size, 0, "命中 ⇒ 摘表")
})

test("A4 取消径：`values: null` ⇒ resolve `null`（与打断同判）", async () => {
  const { gates, posts } = makeGates()
  const pending = gates.askSecret("7", secretRequest())
  assert.deepEqual(gates.respond({ promptId: posts[0].payload.promptId, values: null }), { ok: true })
  assert.equal(await pending, null)
  assert.equal(gates.table.size, 0)
})

test("A5 拒档：`bad-values` ∥ 跨 kind 两向 `bad-kind` ∥ `unknown-prompt` —— 四档皆不 resolve", async () => {
  const { gates, posts } = makeGates()
  const pending = gates.askSecret("7", secretRequest())
  const { promptId } = posts[0].payload
  let settled = false
  pending.then(() => { settled = true })
  const single = gates.askSingle("7", "bash", { command: "ls" })
  const approvalId = posts[1].payload.promptId
  single.then(() => { settled = true })

  assert.deepEqual(gates.respond({ promptId, values: "nope" }), { ok: false, reason: "bad-values" }, "非载体且非 null")
  assert.deepEqual(gates.respond({ promptId, values: [1] }), { ok: false, reason: "bad-values" }, "数组亦拒")
  assert.deepEqual(gates.respond({ promptId, answer: "x" }), { ok: false, reason: "bad-kind" }, "作答载荷打凭据门")
  assert.deepEqual(gates.respond({ promptId: approvalId, values: { a: "b" } }), { ok: false, reason: "bad-kind" }, "凭据载荷打审批门")
  assert.deepEqual(gates.respond({ promptId: "nope", values: null }), { ok: false, reason: "unknown-prompt" })
  await flush()
  assert.equal(settled, false, "四档皆挂起保留")
  assert.equal(gates.table.size, 2, "两门皆在表（可重交）")
})

test("A6 打断径：`denyGates(key)` ⇒ 凭据门按取消结算（`null`）", async () => {
  const { gates } = makeGates()
  const pending = gates.askSecret("7", secretRequest())
  gates.denyGates("7")
  assert.equal(await pending, null)
  assert.equal(gates.table.size, 0)
})

test("A7 桥面：`onSecretInput` ⇒ `askSecret(key, req)` 转口（悬起 Promise 透传；`onQuestion` 零回归）", async () => {
  const secretCalls = []
  const questionCalls = []
  const bridge = createBridge({
    post: () => {},
    askSecret: (key, req) => { secretCalls.push({ key, req }); return Promise.resolve({ password: CANARY }) },
    askQuestion: (key, question, options) => { questionCalls.push({ key, question, options }); return Promise.resolve("answer") },
  })
  const handle = bridge("7")
  assert.equal(typeof handle.onSecretInput, "function", "回调面含凭据门")
  const req = secretRequest()
  const out = handle.onSecretInput(req)
  assert.equal(secretCalls.length, 1)
  assert.equal(secretCalls[0].key, "7", "会话键前置")
  assert.equal(secretCalls[0].req, req, "载荷原样转口（桥零转写）")
  assert.deepEqual(await out, { password: CANARY }, "返回值 = 门 Promise 透传")
  assert.equal(typeof handle.onQuestion, "function", "提问门零回归")
  assert.equal(await handle.onQuestion("q", ["a"]), "answer")
  assert.deepEqual(questionCalls[0], { key: "7", question: "q", options: ["a"] })
})

// ─── B 弹窗渲染载荷（渲染面）────────────────────────────────────────────────────────────────

test("B1 弹窗树：标题 / 提示词（核字典投影 + `${host}` 插值）∥ 字段面（掩码 / 必填 / 预填 / 标签投影）∥ 两钮", () => {
  i18n.initDict({ locale: "zh", dict: CORE_ZH })
  const tree = secretPromptTree(secretItem(), {})
  assert.equal(tree.card.tag, "form")
  assert.equal(tree.card.props.role, "dialog")
  assert.equal(tree.card.props["aria-label"], "凭据输入", "卡面可及名（`secret.label`）")
  assert.equal(tree.card.props["data-prompt-id"], "p1", "待决标识锚")
  assert.equal(tree.backdrop.props.class, "auto-backdrop")

  const texts = collectDeep(tree.card, (n) => n?.props?.class === "auto-confirm-text").map((n) => n.children.join(""))
  assert.deepEqual(texts, ["SSH 凭据", "请输入 10.0.0.5 的登录凭据。"], "标题 + 提示词（插值已落）")

  const rows = collectDeep(tree.card, (n) => n?.props?.["data-secret-row"] !== undefined)
  assert.equal(rows.length, 2, "逐字段一行")
  const [userRow, passwordRow] = rows
  assert.equal(userRow.props["data-secret-row"], "user")
  assert.equal(userRow.children[0].children[0], "用户名", "标签 = `ssh.field.<name>` 投影")
  const userInput = userRow.children[1]
  assert.equal(userInput.props.type, "text")
  assert.equal(userInput.props.value, "liwei", "非密预填落地")
  assert.equal("required" in userInput.props, false, "非必填不携 required")
  assert.equal(passwordRow.children[0].children[0], "密码")
  const passwordInput = passwordRow.children[1]
  assert.equal(passwordInput.props.type, "password", "掩码字段 = 密码输入（零回显）")
  assert.equal(passwordInput.props.required, true, "必填落地")
  assert.equal("value" in passwordInput.props, false, "密码零预填")
  const maskedPrefill = secretPromptTree({ ...secretItem(), fields: [{ name: "password", masked: true, required: true, prefill: "must-not-render" }] }, {})
  const maskedInput = collectDeep(maskedPrefill.card, (n) => n?.props?.["data-secret-input"] !== undefined)[0]
  assert.equal("value" in maskedInput.props, false, "掩码字段忽略载荷预填（NS4 纵深防线 —— 切片 ∥ DOM 两面零值）")

  const submit = byClass(tree.card, "secret-submit")
  const cancel = byClass(tree.card, "secret-cancel")
  assert.equal(submit.props.type, "submit", "提交 = 表单提交（Enter 原生可达）")
  assert.equal(submit.children[0], "提交")
  assert.equal(cancel.props.type, "button")
  assert.equal(cancel.children[0], "取消")
})

test("B2 弹窗树接线：提交 / 取消 / Escape / IME 组字门 / 他键零动作", () => {
  i18n.initDict({ locale: "zh", dict: CORE_ZH })
  let submitted = 0
  let cancelled = 0
  const tree = secretPromptTree(secretItem(), { onSubmit: () => { submitted += 1 }, onCancel: () => { cancelled += 1 } })
  let prevented = false
  tree.card.props.onSubmit({ preventDefault: () => { prevented = true } })
  assert.equal(submitted, 1)
  assert.equal(prevented, true, "表单默认动作被拦（零导航）")
  byClass(tree.card, "secret-cancel").props.onClick()
  assert.equal(cancelled, 1)
  let stopped = false
  tree.card.props.onKeydown({ key: "Escape", stopPropagation: () => { stopped = true } })
  assert.equal(cancelled, 2)
  assert.equal(stopped, true, "框内 Escape 不冒泡（不连带关上层）")
  tree.card.props.onKeydown({ key: "Escape", isComposing: true })
  assert.equal(cancelled, 2, "IME 组字期 Escape 不触取消（组字门）")
  tree.card.props.onKeydown({ key: "a" })
  assert.equal(cancelled, 2, "他键零动作")
})

test("B3 词面兜底：缺核投影 ⇒ 字段标签回退原名；en 语两钮词在场", () => {
  i18n.initDict({ locale: "en", dict: {} })
  const tree = secretPromptTree(secretItem(), {})
  const rows = collectDeep(tree.card, (n) => n?.props?.["data-secret-row"] !== undefined)
  assert.equal(rows[1].children[0].children[0], "password", "缺键 ⇒ 字段原名（不空标）")
  assert.equal(byClass(tree.card, "secret-submit").children[0], "Submit")
  assert.equal(byClass(tree.card, "secret-cancel").children[0], "Cancel")
  i18n.initDict({ locale: "en", dict: CORE_EN })
  const en = secretPromptTree(secretItem(), {})
  const enTexts = collectDeep(en.card, (n) => n?.props?.class === "auto-confirm-text").map((n) => n.children.join(""))
  assert.deepEqual(enTexts, ["SSH credentials", "Enter the credentials for 10.0.0.5."], "en 投影 + 插值")
  assert.equal(collectDeep(en.card, (n) => n?.props?.["data-secret-row"] !== undefined)[0].children[0].children[0], "User")
})

test("B4 `readSecretValues`：取值 / 必填缺项 / 非必填空值不报缺 / 无节点面零抛", () => {
  const card = new FakeNode("form")
  const user = new FakeNode("input")
  user.setAttribute("data-secret-input", "user")
  user.setAttribute("value", "liwei")
  const password = new FakeNode("input")
  password.setAttribute("data-secret-input", "password")
  password.setAttribute("required", "")
  card.append(user, password)
  assert.deepEqual(readSecretValues(card), { values: { user: "liwei", password: "" }, missing: ["password"] })
  password.value = CANARY
  assert.deepEqual(readSecretValues(card), { values: { user: "liwei", password: CANARY }, missing: [] })
  assert.deepEqual(readSecretValues(null), { values: {}, missing: [] }, "无节点面 ⇒ 空包（零抛）")
})

// ─── C 提交 / 取消出站 + 值面纪律 ────────────────────────────────────────────────────────────

function makeHost(receipt = { ok: true }) {
  const calls = []
  return {
    calls,
    invoke: async (channel, payload) => { calls.push({ channel, payload }); return typeof receipt === "function" ? receipt(channel, payload) : receipt },
  }
}

test("C1 `respondSecret`：窄桥载荷形（提交 / 取消两向）+ 回执透传 + 抛 ⇒ `null` 且值不入日志", async () => {
  const host = makeHost({ ok: true })
  assert.deepEqual(await respondSecret(host, "p1", { password: CANARY }), { ok: true })
  assert.deepEqual(host.calls[0], { channel: "secret:respond", payload: { promptId: "p1", values: { password: CANARY } } })
  await respondSecret(host, "p1", null)
  assert.deepEqual(host.calls[1].payload, { promptId: "p1", values: null }, "取消 = `values: null`")

  const logged = []
  const restore = console.error
  console.error = (...args) => logged.push(args.map(String).join(" "))
  try {
    const broken = { invoke: () => Promise.reject(new Error("bridge down")) }
    assert.equal(await respondSecret(broken, "p1", { password: CANARY }), null)
    const throwing = { invoke: () => { throw new Error("sync blow") } }
    assert.equal(await respondSecret(throwing, "p1", { password: CANARY }), null)
  } finally {
    console.error = restore
  }
  assert.equal(logged.length, 2, "两径皆记错（不静默）")
  assert.equal(logged.join("\n").includes(CANARY), false, "值不入日志")
})

test("C2 `submitSecret`：回执 `ok` 真 ⇒ 摘项 + 清位标；回执拒 ⇒ 零写留场（非乐观摘除）", async () => {
  const store = createStore(initialState())
  store.set({ activeSession: "7" })
  const seed = onSecretRequest(store.get(), { channel: "ev:secret", key: "7", ...secretItem() })
  store.set(seed)
  assert.equal(store.get().secretPrompt["7"].promptId, "p1")
  assert.deepEqual(store.get().tabBadges["7"], ["approval"], "置 `approval` 位标")

  const failing = makeHost({ ok: false, reason: "unknown-prompt" })
  const logged = []
  const restore = console.error
  console.error = (...args) => logged.push(args.map(String).join(" "))
  try {
    assert.equal(await submitSecret({ store, host: failing }, "p1", { password: CANARY }), false)
  } finally {
    console.error = restore
  }
  assert.equal(store.get().secretPrompt["7"].promptId, "p1", "回执拒 ⇒ 项留场（可重试）")
  assert.deepEqual(store.get().tabBadges["7"], ["approval"], "位标零动")
  assert.equal(logged.join("\n").includes(CANARY), false, "值不入日志（失败径）")

  const ok = makeHost({ ok: true })
  assert.equal(await submitSecret({ store, host: ok }, "p1", { password: CANARY }), true)
  assert.equal(store.get().secretPrompt["7"], undefined, "回执 `ok` 真 ⇒ 摘项")
  assert.deepEqual(store.get().tabBadges["7"] ?? [], [], "位标随清（全族皆清）")
})

test("C3 值面纪律：全链 canary —— store 0 命中 ∥ 日志 0 命中 ∥ 出站载荷恰携一次", async () => {
  const store = createStore(initialState())
  store.set({ activeSession: "7" })
  store.set(onSecretRequest(store.get(), { channel: "ev:secret", key: "7", ...secretItem() }))
  const host = makeHost({ ok: true })
  const logged = []
  const restore = console.error
  console.error = (...args) => logged.push(args.map(String).join(" "))
  try {
    await submitSecret({ store, host }, "p1", { user: "liwei", password: CANARY })
  } finally {
    console.error = restore
  }
  assert.equal(store.get().secretPrompt["7"], undefined, "回执 `ok` 真 ⇒ 摘项（全链走到尾）")
  const hits = (text) => String(text).split(CANARY).length - 1
  assert.equal(hits(JSON.stringify(store.get())), 0, "渲染面状态持久面 0 命中")
  assert.equal(hits(logged.join("\n")), 0, "日志 0 命中")
  assert.equal(hits(JSON.stringify(host.calls)), 1, "出站载荷恰携一次（返回路）")
  assert.deepEqual(host.calls[0].payload.values, { user: "liwei", password: CANARY })
})

// ─── D 装配 + 端到端（假 DOM）────────────────────────────────────────────────────────────────

function seedSession(key = "7") {
  const store = createStore(initialState())
  store.set({ activeSession: key })
  store.set(onSecretRequest(store.get(), { channel: "ev:secret", key, ...secretItem() }))
  return { store, host: makeHost({ ok: true }) }
}

test("D1 装配：活动会话有待答项 ⇒ 弹窗在场（背板 + 卡）；会话无项 ⇒ 零节点", () => {
  i18n.initDict({ locale: "zh", dict: CORE_ZH })
  const { store, host } = seedSession()
  const face = attachSecretPrompt(host, { store })
  try {
    const card = secretPromptNode()
    assert.ok(card, "待答项在场 ⇒ 开")
    assert.equal(card.getAttribute("data-prompt-id"), "p1")
    assert.equal(fakeDocument.body.children.includes(card), true, "卡挂 `document.body`")
    assert.ok(fakeDocument.body.children.some((node) => node.getAttribute("class") === "auto-backdrop"), "背板同挂")
    closeSecretPrompt()
    const bare = createStore(initialState())
    bare.set({ activeSession: "9" })
    attachSecretPrompt(host, { store: bare })
    assert.equal(secretPromptNode(), null, "无项 ⇒ 零节点")
  } finally {
    face.detach()
    closeSecretPrompt()
  }
})

test("D2 端到端：挂载 ⇒ 填值 ⇒ 提交 ⇒ 出站携真值 ⇒ 回执 `ok` ⇒ 摘项 + 退场", async () => {
  i18n.initDict({ locale: "zh", dict: CORE_ZH })
  const { store, host } = seedSession()
  const face = attachSecretPrompt(host, { store })
  try {
    const card = secretPromptNode()
    const input = card.querySelectorAll("[data-secret-input]").find((node) => node.getAttribute("data-secret-input") === "password")
    input.value = CANARY
    fire(card, "submit", { preventDefault() {} })
    await flush()
    assert.equal(host.calls.length, 1, "恰一次出站")
    assert.deepEqual(host.calls[0], { channel: "secret:respond", payload: { promptId: "p1", values: { user: "liwei", password: CANARY } } })
    assert.equal(store.get().secretPrompt["7"], undefined, "切片摘项")
    assert.equal(secretPromptNode(), null, "弹窗退场")
    assert.equal(fakeDocument.body.children.length, 0, "背板 ∥ 卡两件同清")
  } finally {
    face.detach()
    closeSecretPrompt()
  }
})

test("D3 必填门：必填空 ⇒ 零出站 + `data-invalid` + 置焦该字段", async () => {
  i18n.initDict({ locale: "zh", dict: CORE_ZH })
  const { store, host } = seedSession()
  const face = attachSecretPrompt(host, { store })
  try {
    const card = secretPromptNode()
    fire(card, "submit", { preventDefault() {} })
    await flush()
    assert.equal(host.calls.length, 0, "零出站")
    const input = card.querySelectorAll("[data-secret-input]").find((node) => node.getAttribute("data-secret-input") === "password")
    assert.equal(input.getAttribute("data-invalid"), "required")
    assert.equal(fakeDocument.focused, input, "置焦首缺项")
    assert.ok(store.get().secretPrompt["7"], "项留场（可补填）")
  } finally {
    face.detach()
    closeSecretPrompt()
  }
})

test("D4 取消径：取消钮 ⇒ `values: null` 出站 ⇒ 摘项 + 退场", async () => {
  i18n.initDict({ locale: "zh", dict: CORE_ZH })
  const { store, host } = seedSession()
  const face = attachSecretPrompt(host, { store })
  try {
    const card = secretPromptNode()
    const cancel = card.querySelector(".secret-cancel")
    assert.ok(cancel, "取消钮在场")
    fire(cancel, "click", {})
    await flush()
    assert.deepEqual(host.calls[0], { channel: "secret:respond", payload: { promptId: "p1", values: null } })
    assert.equal(secretPromptNode(), null)
    assert.equal(store.get().secretPrompt["7"], undefined)
  } finally {
    face.detach()
    closeSecretPrompt()
  }
})

test("D5 会话切换：切走即关 ∥ 项留存（零键门）∥ 切回即开", () => {
  i18n.initDict({ locale: "zh", dict: CORE_ZH })
  const { store, host } = seedSession()
  const face = attachSecretPrompt(host, { store })
  try {
    assert.ok(secretPromptNode(), "本键在场 ⇒ 开")
    store.set({ activeSession: "8" })
    assert.equal(secretPromptNode(), null, "切走 ⇒ 关")
    assert.equal(store.get().secretPrompt["7"].promptId, "p1", "项留存（零键门）")
    store.set({ activeSession: "7" })
    assert.equal(secretPromptNode()?.getAttribute("data-prompt-id"), "p1", "切回即见")
  } finally {
    face.detach()
    closeSecretPrompt()
  }
})

test("D6 回合尾 `stopped` ⇒ 凭据项与提问族同点出场（归约面）", () => {
  const store = createStore(initialState())
  store.set(onSecretRequest(store.get(), { channel: "ev:secret", key: "7", ...secretItem() }))
  const next = reduce(store.get(), { channel: "ev:activity", event: "stopped", key: "7" })
  assert.equal(next.secretPrompt["7"], undefined, "终局同清")
  assert.equal((next.tabBadges["7"] ?? []).includes("approval"), false, "位标随清")
  assert.equal(clearSecret(next, "7"), next, "幂等（无本键项 ⇒ 原引用）")
})

// ─── E 两语键对等 ∥ 通道三件套 ──────────────────────────────────────────────────────────────

test("E1 两语键对等：`VIEWS_DICT` 键集相等 ∥ 三新键两语在场非空 ∥ 与 VSC `locales` 逐字同源", () => {
  const en = Object.keys(VIEWS_DICT.en).sort()
  const zh = Object.keys(VIEWS_DICT.zh).sort()
  assert.deepEqual(en, zh, "两语键集相等（增键两语同增）")
  const vscEn = JSON.parse(read("thincoder-vscode/locales/en.json"))
  const vscZh = JSON.parse(read("thincoder-vscode/locales/zh.json"))
  for (const key of ["secret.label", "secret.submit", "secret.cancel"]) {
    assert.equal(typeof VIEWS_DICT.en[key], "string")
    assert.notEqual(VIEWS_DICT.en[key], "")
    assert.equal(typeof VIEWS_DICT.zh[key], "string")
    assert.notEqual(VIEWS_DICT.zh[key], "")
    assert.equal(VIEWS_DICT.en[key], vscEn[key], `en ${key} 与 VSC 逐字`)
    assert.equal(VIEWS_DICT.zh[key], vscZh[key], `zh ${key} 与 VSC 逐字`)
  }
  i18n.initDict({ locale: "zh", dict: {} })
  assert.equal(i18n.t("secret.submit"), "提交")
  i18n.initDict({ locale: "en", dict: {} })
  assert.equal(i18n.t("secret.label"), "Credential input")
})

test("E2 通道三件套：白名单 53（末位 `secret:respond`）∥ 订阅面 25（含 `ev:secret`）∥ `HANDLERS` = 白名单集 ∥ 四档头计数", () => {
  const preload = require(join(ROOT, "thincoder-desktop/src/preload/preload.cjs"))
  assert.equal(preload.CHANNELS.length, 53)
  assert.equal(new Set(preload.CHANNELS).size, 53, "零重复项")
  assert.deepEqual(preload.CHANNELS.slice(-1), ["secret:respond"], "定序末位 = 本批新通道")
  assert.equal(preload.EVENT_CHANNELS.length, 25)
  const question = preload.EVENT_CHANNELS.indexOf("ev:question")
  const secret = preload.EVENT_CHANNELS.indexOf("ev:secret")
  assert.equal(secret, question + 1, "序同桥面表（`ev:question` 之后）")
  const registry = read("thincoder-desktop/src/main/ipc-registry.mjs")
  const table = (registry.match(/const HANDLERS = Object\.freeze\(\{[\s\S]*?\n\}\)/) ?? [""])[0]
  const rows = [...table.matchAll(/"([^"]+)":/g)].map((match) => match[1])
  assert.equal(rows.length, 53)
  assert.deepEqual([...rows].sort(), [...preload.CHANNELS].sort(), "HANDLERS 行集 = 白名单集（闭合）")
  assert.equal(rows[rows.length - 1], "secret:respond", "表尾本批行")
  assert.match(read("thincoder-desktop/src/main/ipc.mjs"), /\*\*五十三项\*\*白名单面/)
  assert.match(registry, /\*\*五十三项\*\*（B1 批三新/)
  assert.match(read("thincoder-desktop/src/preload/preload.cjs"), /请求白名单 = \*\*五十三项\*\*/)
  assert.match(read("thincoder-desktop/src/preload/preload.cjs"), /→ `secret:respond`；顺序供白名单定序断言/)
  assert.match(read("thincoder-desktop/renderer/events-subscribe.mjs"), /\*\*SSH 会话批增 `ev:secret`\*\*/)
  assert.match(read("thincoder-desktop/src/main/agent-host.mjs"), /askSecret, denyGates, respond \} = createGates/)
  assert.match(read("thincoder-desktop/src/main/agent-host.mjs"), /post, askSingle, askBatch, askQuestion, askSecret, tokensOf,/)
  assert.match(read("thincoder-desktop/src/main/ipc.mjs"), /questionRespond as secretRespond/, "凭据出口 = 同体别名（零第二实现）")
  assert.ok(contentLines(read("thincoder-desktop/src/main/ipc.mjs")) <= 300, "`ipc.mjs` ≤300 内容行回线零破（#685 拆点纪律）")
  assert.match(read("thincoder-desktop/src/main/suspensions.mjs"), /secret: "ev:secret"/)
})
