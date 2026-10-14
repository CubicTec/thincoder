/**
 * 2026-10-13-sandbox-outbound-member-face-ui.test.mjs — thincoder-server 批内单测件（我的·工作区——sandbox-outbound-member-face 批（UI 面）；
 * 名随批档 · 住 `docs/batches/` · 不入仓套件 · 随批留存）。判据源 = `webui/SANDBOX.md` §2.2/§4（成员面）
 * ∥ 批档 §2 条目 ③④。
 * 运行（自 `thincoder/` 仓根）：`node --test docs/batches/2026-10-13-sandbox-outbound-member-face-ui.test.mjs`
 *
 * 射程（腿 ↔ 验收轴对照在括号；2026-10-14 随正——待批列 ∥ 提示行 ∥ 10s 轮询随 sandbox-egress-removal 批退场）：
 *   ① 页在册/接线（`renderMeSandbox` 导出 ∥ `PAGES` 行 + import ∥ `SHELL_PAGES` 零改——非壳页）（④ 页落定 ∥ 脚手架）
 *   ② 逐列渲染（四列表头 + 行逐值：名 ∥ 盒状态（运行中/已停 + 回收原因三值 + 枚举外原值兜底）∥ 快照数 ∥ 所属 runner（未绑定 ⇒ 表句））
 *   ③ 空态 ∥ 恒本人过滤（仅打成员端点 ∥ 渲染 = 响应逐行——零越界取数）∥ 零写控件（写面随 #1216 ②）
 *   ④ 读败面（503 `sandbox_unavailable` ∥ 404 数据面缺位 ⇒ 页内提示 ∥ 余码 ⇒ `loadFailed` ∥ `fail` 收口）
 *   ⑤ i18n 两表逐键同步（`me.sandbox.*` 14 键 + shell `nav.page.me.sandbox` 1 键 ∥ 键集相等 ∥ 占位符对位 ∥ en 零 CJK）
 *   ⑥ IA 计数（我的 7——ledger 末位 ∥ 路由解析 ∥ `labelKey` 两表在盘）∥ 静态面（行数/行宽 ∥ 零外链 ∥ 代码段零 CJK ∥ `t` 字面量闭合 ∥ 类名双向闭合）
 *
 * 桩说明：`dom.mjs` 顶层触 `document`（先桩后 import）；本档零外部网络 ∥ 零真库（stub ctx 路由表）；本档无定时器面（轮询随摘除批退场）。
 */
import test from "node:test"
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"

const ROOT = process.cwd()
if (!existsSync(join(ROOT, "thincoder-server"))) throw new Error(`须从仓库根（thincoder/）运行——cwd = ${ROOT}`)
const PUBLIC_DIR = join(ROOT, "thincoder-server", "public")
const readPublic = (name) => readFileSync(join(PUBLIC_DIR, name), "utf8")
const linesOf = (name) => { const text = readPublic(name); return text.split("\n").length - (text.endsWith("\n") ? 1 : 0) }
const load = (name) => import(pathToFileURL(join(PUBLIC_DIR, name)).href)

// 桩（`dom.mjs` 顶层触 `document`——先桩后 import；本档不调 `h` 真实现）
globalThis.document = { getElementById: () => null }

const [{ ZH }, { EN }, PAGE, NAV] = await Promise.all([load("i18n-zh.mjs"), load("i18n-en.mjs"), load("views-me-sandbox.mjs"), load("nav.mjs")])
const VIEW_SRC = readPublic("views-me-sandbox.mjs")
const CSS = readPublic("style.css")

/** 本批键（14 me + 1 shell——两表逐键同步；§2.2 ∥ `webui/SANDBOX.md` §3 键族登记本批条；`dirty` 三键退场随 D 裁 2026-10-14 ∥ `colPending`/`pending` 退场随 sandbox-egress-removal 批 2026-10-14）。 */
const NEW_ME_KEYS = [
  "me.sandbox.title", "me.sandbox.colName", "me.sandbox.colState", "me.sandbox.colCheckpoints", "me.sandbox.colRunner",
  "me.sandbox.stateRunning", "me.sandbox.stateStopped", "me.sandbox.stopIdle", "me.sandbox.stopWallclock",
  "me.sandbox.stopManual", "me.sandbox.empty", "me.sandbox.unbound", "me.sandbox.unavailable",
  "me.sandbox.loadFailed",
]
const NEW_SHELL_KEY = "nav.page.me.sandbox"
/** CJK 机检类（Han ∥ CJK 标点 ∥ 全角形——「—」「…」「≤」等中性形不在内）。 */
const CJK = /[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef]/
const placeholders = (text) => [...String(text).matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort().join(",")
const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/([^:])\/\/.*$/gm, "$1")

// ── 桩 DOM（`h` 同 app 语义近似——`class`/`text`/事件/受控属性）──────────────────────

function makeNode(tag) {
  const classes = new Set()
  return {
    tag, children: [], listeners: {}, attrs: {}, parent: null, open: false, textContent: "", className: "", value: "", hidden: false, disabled: false, checked: false,
    classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name), contains: (name) => classes.has(name) },
    append(...items) {
      for (const item of items.flat(Infinity)) {
        if (item === null || item === undefined || item === false) continue
        if (typeof item === "object") item.parent = this
        this.children.push(item)
      }
    },
    replaceChildren(...items) { this.children = []; this.append(...items) },
    addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn) },
    setAttribute(name, value) { this.attrs[name] = String(value) },
    remove() { if (this.parent !== null) this.parent.children = this.parent.children.filter((child) => child !== this); this.parent = null },
    focus() {},
    fire(type, event = {}) { return Promise.all((this.listeners[type] ?? []).map((fn) => fn({ preventDefault() {}, ...event }))) },
  }
}

const stubDocument = () => ({ body: makeNode("body"), createElement: (tag) => makeNode(tag), createTextNode: (text) => ({ textContent: String(text) }), getElementById: () => null })

function fH(tag, props = {}, ...children) {
  const node = makeNode(tag)
  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === false) continue
    if (key === "class") node.className = String(value)
    else if (key === "text") node.textContent = String(value)
    else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2), value)
    else if (["value", "checked", "disabled", "hidden"].includes(key)) node[key] = value
    else node.setAttribute(key, value)
  }
  for (const child of children.flat(Infinity)) { if (child === null || child === undefined || child === false) continue; node.append(child) }
  return node
}

function fFindAll(root, pred, out = []) {
  if (root !== null && typeof root === "object") {
    if (pred(root)) out.push(root)
    for (const child of root.children ?? []) fFindAll(child, pred, out)
  }
  return out
}
const textOf = (node) => (typeof node === "string" ? node : [node?.textContent ?? "", ...(node?.children ?? []).map(textOf)].filter(Boolean).join(" "))

/** 表格近似（`dom.mjs table()` 同形：`.table-wrap > table > thead/tbody`；cell 支持节点数组）。 */
const fTable = (headers, rows) => fH("div", { class: "table-wrap" },
  fH("table", {},
    fH("thead", {}, fH("tr", {}, ...headers.map((label) => fH("th", { text: label })))),
    fH("tbody", {}, ...rows.map((cells) => fH("tr", {}, ...cells.map((cell) => fH("td", {}, ...(Array.isArray(cell) ? cell : [cell]))))))))

/** 桩 ctx（api 路由表 `"METHOD path"` ⇒ handler；全调用入 `calls`）。 */
function fCtx(routes = {}) {
  const calls = []
  const ctx = {
    h: fH,
    table: fTable,
    state: { member: { username: "alice", role: "user" }, system: null },
    api: async (path, { method = "GET", body } = {}) => {
      calls.push([method, path, body ?? null])
      const handler = routes[`${method} ${path}`]
      if (handler === undefined) throw new Error(`unexpected ${method} ${path}`)
      return handler(body)
    },
    fmtTs: (ts) => `ts:${ts}`,
    fmtValue: (value) => (value === null || value === undefined ? "—" : String(value)),
    flash: (message) => calls.push(["flash", message]),
    fail: (error) => calls.push(["fail", String(error?.message ?? error)]),
  }
  return { ctx, calls }
}

/** 工作区夹具（`gateway/API.md` §2.7 行形——行增 `runnerName`）。 */
const fWs = (over = {}) => ({ id: 1, name: "box-a", runnerName: "node-1", boxState: "running", checkpointCount: 3, ...over })

const rowsOf = (mount) => fFindAll(mount, (node) => node.tag === "tr").filter((row) => fFindAll(row, (cell) => cell.tag === "td").length > 0)
const cellsOf = (row) => fFindAll(row, (cell) => cell.tag === "td").map((cell) => textOf(cell))

// ── ① 页在册/接线 ────────────────────────────────────────────────────────────

test("① 页在册：`renderMeSandbox` 导出 ∥ `PAGES` 行 + import ∥ `SHELL_PAGES` 零改（非壳页）∥ 纯函数导出面", () => {
  assert.equal(typeof PAGE.renderMeSandbox, "function", "页函数导出")
  for (const name of ["boxStateLabel", "boxStateClass", "stopReasonLabel"]) assert.equal(typeof PAGE[name], "function", `纯函数导出：${name}`)
  const appSrc = readPublic("app.mjs")
  assert.ok(appSrc.includes('import { renderMeSandbox } from "./views-me-sandbox.mjs"'), "app 导入面")
  assert.ok(appSrc.includes('"/me/sandbox": renderMeSandbox,'), "PAGES 行")
  const shell = appSrc.match(/const SHELL_PAGES = new Set\(\[([^\]]*)\]\)/)[1]
  assert.deepEqual([...shell.matchAll(/"([^"]+)"/g)].map((match) => match[1]),
    ["/admin/members", "/admin/providers", "/admin/models", "/admin/audit", "/me/usage"], "壳页五路径零改（成员页非壳——不扩钉表五页）")
})

// ── ② 逐列渲染（六列 + 态/原因映射 + 枚举外兜底）──────────────────────────────────

test("② 逐列渲染：四列表头 ∥ 盒状态两态 + 回收原因三值 + 枚举外原值兜底 ∥ 快照数 ∥ 所属 runner（未绑定 ⇒ 表句）", async () => {
  try {
    globalThis.document = stubDocument()
    const rows = [
      fWs({ id: 1, name: "box-a", boxState: "running", checkpointCount: 3, runnerName: "node-1" }),
      fWs({ id: 2, name: "box-b", boxState: "stopped", stopReason: "idle_ttl", checkpointCount: 0, runnerName: null }),
      fWs({ id: 3, name: "box-c", boxState: "stopped", stopReason: "wallclock_ttl", checkpointCount: 12, runnerName: "node-2" }),
      fWs({ id: 4, name: "box-d", boxState: "stopped", stopReason: "manual", checkpointCount: 1, runnerName: "" }),
      fWs({ id: 5, name: "box-e", boxState: "weird", checkpointCount: 0, runnerName: "node-3" }),
      { id: 6, name: "box-f", boxState: "running", runnerName: "node-4" }, // 缺位字段（`checkpointCount` 不在）⇒ 中性占位（不假造）
    ]
    const { ctx, calls } = fCtx({ "GET /api/me/sandbox/workspaces": () => ({ workspaces: rows }) })
    const mount = makeNode("section")
    await PAGE.renderMeSandbox(ctx, mount)
    assert.deepEqual(fFindAll(mount, (node) => node.tag === "th").map((cell) => cell.textContent),
      [ZH["me.sandbox.colName"], ZH["me.sandbox.colState"], ZH["me.sandbox.colCheckpoints"], ZH["me.sandbox.colRunner"]], "四列表头（名 ∥ 盒状态 ∥ 快照数 ∥ 所属 runner）")
    const body = rowsOf(mount)
    assert.equal(body.length, 6, "响应逐行渲染")
    const [first, second, third, fourth, fifth, sixth] = body.map(cellsOf)
    assert.deepEqual([first[0], first[2], first[3]], ["box-a", "3", "node-1"], "行逐值（名 ∥ 快照数 ∥ 所属 runner）")
    assert.ok(first[1].includes(ZH["me.sandbox.stateRunning"]) && second[1].includes(ZH["me.sandbox.stateStopped"]) && second[1].includes(ZH["me.sandbox.stopIdle"]), "盒状态两态 + 空闲回收")
    assert.ok(third[1].includes(ZH["me.sandbox.stopWallclock"]) && fourth[1].includes(ZH["me.sandbox.stopManual"]), "回收原因三值（墙钟/手动）")
    assert.equal(second[3], ZH["me.sandbox.unbound"], "未绑定（`runnerName` null ⇒ 表句）")
    assert.equal(fourth[3], ZH["me.sandbox.unbound"], "`runnerName` 空串 ⇒ 同表句")
    assert.equal(fifth[1], "weird", "盒状态枚举外 ⇒ 原值兜底（不假造）")
    assert.equal(sixth[2], "—", "缺位字段（`checkpointCount`）⇒ 中性占位（不代断言业务值）")
    // 纯函数面（枚举外兜底 ∥ 类映射）
    assert.deepEqual([PAGE.boxStateLabel("running"), PAGE.boxStateLabel("stopped"), PAGE.boxStateLabel("weird"), PAGE.boxStateLabel(null)],
      [ZH["me.sandbox.stateRunning"], ZH["me.sandbox.stateStopped"], "weird", "—"], "态文案（枚举外/空 ⇒ 原值/占位）")
    assert.deepEqual([PAGE.boxStateClass("running"), PAGE.boxStateClass("stopped"), PAGE.boxStateClass("weird")], ["badge ok", "badge off", "badge"], "态徽标类（零新颜色变量）")
    assert.deepEqual([PAGE.stopReasonLabel("idle_ttl"), PAGE.stopReasonLabel("wallclock_ttl"), PAGE.stopReasonLabel("manual"), PAGE.stopReasonLabel("future")],
      [ZH["me.sandbox.stopIdle"], ZH["me.sandbox.stopWallclock"], ZH["me.sandbox.stopManual"], "future"], "回收原因文案（枚举外原值兜底）")
    assert.deepEqual(calls.map(([method, path]) => `${method} ${path}`), ["GET /api/me/sandbox/workspaces"], "读面 = 成员端点单打")
  } finally { delete globalThis.document }
})

// ── ③ 空态 ∥ 恒本人过滤 ∥ 零写控件 ──────────────────────────────────────────────

test("③ 空态 ∥ 恒本人过滤（响应逐行——零越界取数）∥ 零写控件（写面随 #1216 ②）", async () => {
  try {
    globalThis.document = stubDocument()
    const empty = fCtx({ "GET /api/me/sandbox/workspaces": () => ({ workspaces: [] }) })
    const emptyMount = makeNode("section")
    await PAGE.renderMeSandbox(empty.ctx, emptyMount)
    assert.ok(textOf(emptyMount).includes(ZH["me.sandbox.empty"]), "空态句在册")
    assert.equal(rowsOf(emptyMount).length, 0, "空态 ⇒ 零数据行")
    // 恒本人过滤 = 服务端属性：页零成员参数、零跨成员取数（仅一个成员端点，渲染 = 响应逐行）
    const list = fCtx({ "GET /api/me/sandbox/workspaces": () => ({ workspaces: [fWs({ id: 9, name: "mine" })] }) })
    const mount = makeNode("section")
    await PAGE.renderMeSandbox(list.ctx, mount)
    assert.deepEqual(list.calls.map(([method, path]) => `${method} ${path}`), ["GET /api/me/sandbox/workspaces"], "仅打本人端点（零 owner/member 参数）")
    assert.deepEqual(rowsOf(mount).map((row) => cellsOf(row)[0]), ["mine"], "渲染 = 响应逐行（零越界）")
    // 零写控件
    const writeNodes = fFindAll(mount, (node) => ["button", "input", "select", "textarea", "form"].includes(node.tag))
    assert.deepEqual(writeNodes, [], "零写控件（成员写面随 #1216 ②）")
  } finally { delete globalThis.document }
})

// ── ④ 读败面（503 ∥ 404 ⇒ 页内提示；余码 ⇒ loadFailed）─────────────────────────────

test("④ 读败面：503 `sandbox_unavailable` ⇒ 页内提示 ∥ 404 数据面缺位 ⇒ 同面 ∥ 余码 ⇒ `loadFailed` ∥ `fail` 收口", async () => {
  try {
    globalThis.document = stubDocument()
    const fail = (over) => () => { throw Object.assign(new Error("engine down"), over) }
    const cases = [
      [{ code: "sandbox_unavailable", status: 503 }, ZH["me.sandbox.unavailable"], "503 ⇒ 不可用句"],
      [{ status: 404 }, ZH["me.sandbox.unavailable"], "404（server 面缺位）⇒ 同句"],
      [{ status: 500, code: "internal_error" }, ZH["me.sandbox.loadFailed"], "余码 ⇒ 读取失败句"],
    ]
    for (const [errorShape, expected, label] of cases) {
      const { ctx, calls } = fCtx({ "GET /api/me/sandbox/workspaces": fail(errorShape) })
      const mount = makeNode("section")
      await PAGE.renderMeSandbox(ctx, mount)
      assert.ok(textOf(mount).includes(expected), `${label}：${expected}`)
      assert.equal(rowsOf(mount).length, 0, `${label}：零数据行（不假造）`)
      assert.equal(calls.filter(([tag]) => tag === "fail").length, 1, `${label}：fail 收口一次`)
    }
  } finally { delete globalThis.document }
})

// ── ⑤ i18n 两表逐键同步（me 14 键 + shell 1 键）──────────────────────────────────

test("⑤ i18n：`me.sandbox.*` 14 键 + `nav.page.me.sandbox` 1 键逐键在场 ∥ 键集相等 ∥ 占位符对位 ∥ en 零 CJK", async () => {
  const [zhMe, enMe, zhShell, enShell] = await Promise.all([load("i18n-zh-me.mjs"), load("i18n-en-me.mjs"), load("i18n-zh-shell.mjs"), load("i18n-en-shell.mjs")])
  const zhKeys = Object.keys(zhMe.ZH_ME), enKeys = Object.keys(enMe.EN_ME)
  // 键集相等（自称名族在 shell；`.one` 变体族 = en 独有——沿既有口径排除）
  const base = (keys) => new Set(keys.map((key) => key.replace(/\.one$/, "")))
  const zhBase = base(zhKeys), enBase = base(enKeys)
  assert.deepEqual([...zhBase].filter((key) => !enBase.has(key)), [], "仅 zh 键")
  assert.deepEqual([...enBase].filter((key) => !zhBase.has(key)), [], "仅 en 键（`.one` 变体除外）")
  for (const key of NEW_ME_KEYS) {
    for (const [lang, table] of [["zh", zhMe.ZH_ME], ["en", enMe.EN_ME]]) {
      assert.ok(typeof table[key] === "string" && table[key].trim() !== "", `${lang} 表缺键：${key}`)
    }
    assert.equal(placeholders(zhMe.ZH_ME[key]), placeholders(enMe.EN_ME[key]), `占位符不对位：${key}`)
    assert.equal(CJK.test(enMe.EN_ME[key]), false, `en 值含 CJK：${key}`)
  }
  assert.equal(NEW_ME_KEYS.length, 14, "本批 me 键数（dirty 三键退场随 D 裁 ∥ colPending/pending 退场随摘除批）")
  for (const [lang, table] of [["zh", zhShell.ZH_SHELL], ["en", enShell.EN_SHELL]]) {
    assert.ok(typeof table[NEW_SHELL_KEY] === "string" && table[NEW_SHELL_KEY].trim() !== "", `${lang} shell 表缺键：${NEW_SHELL_KEY}`)
    assert.equal(CJK.test(table[NEW_SHELL_KEY] ?? "") && lang === "en", false, `${lang} 值零 CJK 口径（zh 除外）`)
  }
  // 键引用闭合（页内 `t` 字面量 ⊆ 两表；含动态键的两纯函数映射表）
  for (const match of stripComments(VIEW_SRC).matchAll(/\bt\(\s*"([^"]+)"\s*[,)]/g)) {
    assert.ok(match[1] in ZH && match[1] in EN, `t 字面量悬空：${match[1]}`)
  }
  for (const match of stripComments(VIEW_SRC).matchAll(/"(me\.sandbox\.[\w]+)"/g)) {
    assert.ok(match[1] in ZH && match[1] in EN, `映射表键悬空：${match[1]}`)
  }
})

// ── ⑥ IA 计数 ∥ 静态面 ─────────────────────────────────────────────────────────

test("⑥ IA：我的 7（`#/me/ledger` 末位）∥ 路由解析 ∥ `labelKey` 两表在盘 ∥ 静态面（行数/行宽 ∥ 零外链 ∥ 代码段零 CJK ∥ 类名双向闭合）", () => {
  const me = NAV.NAV_GROUPS.find((group) => group.key === "me")
  assert.deepEqual(me.items.map((item) => item.path), ["/me/chat", "/me/keys", "/me/usage", "/me/account", "/me/projects", "/me/sandbox", "/me/ledger"], "我的 7——ledger 末位（2026-10-13 team-ledger 批随正 ∥ 2026-10-14 chat 批随正）")
  assert.deepEqual(me.items.at(-1), { key: "ledger", labelKey: "nav.page.me.ledger", path: "/me/ledger" }, "末位项（ledger——labelKey 单源；2026-10-13 team-ledger 批随正）")
  for (const item of me.items) assert.ok(item.labelKey in ZH && item.labelKey in EN, `labelKey 两表在盘：${item.labelKey}`)
  assert.deepEqual(NAV.resolveRoute("/me/sandbox", "user"), { path: "/me/sandbox" }, "user 可达（非 admin 面）")
  assert.deepEqual(NAV.resolveRoute("/me/sandbox/extra", "user"), { path: "/me/sandbox", sub: "extra" }, "子段容许零改")
  // 静态面（本档实读行数/行宽——硬线 ≤500 ∥ ≤300）
  const lines = linesOf("views-me-sandbox.mjs")
  assert.ok(lines <= 500, `views-me-sandbox.mjs 越 500 硬线：${lines}`)
  assert.ok(Math.max(...VIEW_SRC.split("\n").map((line) => line.length)) <= 300, "行宽 ≤300")
  assert.deepEqual([/https?:\/\//.test(VIEW_SRC), VIEW_SRC.includes("@import")], [false, false], "零外链（KD-SV-9）")
  assert.equal(CJK.test(stripComments(VIEW_SRC)), false, "档面代码段零 CJK（文案全入两表）")
  const cssClasses = new Set([...CSS.matchAll(/\.([a-z][a-z0-9-]*)/g)].map((match) => match[1]))
  const used = new Set()
  for (const match of VIEW_SRC.matchAll(/\bclass(?:Name)?\s*[:=]\s*([^\n;]*?)(?=\s*\bclass(?:Name)?\s*[:=]|[;\n]|$)/g)) {
    const window = match[1].replace(/\$\{[^}]*\}/g, " ").split("//")[0].split("}")[0].split(/,\s*[A-Za-z_$][\w$]*\s*:/)[0]
    for (const literal of window.matchAll(/["'`]([^"'`]*)["'`]/g)) for (const token of literal[1].split(/\s+/)) if (token) used.add(token)
  }
  for (const token of used) assert.ok(cssClasses.has(token), `档面类无样式规则：${token}`)
  for (const token of ["badge", "ok", "off", "warn", "hint"]) assert.ok(cssClasses.has(token), `本批类在盘：${token}`)
  // AC-19 canon 不破（零新变量 ∥ 零新悬停规则——本批 CSS 增量零变量/零 hover）
  const cssClean = stripComments(CSS)
  assert.equal([...cssClean.match(/:root\s*\{[^}]*\}/)[0].matchAll(/(--[\w-]+)\s*:/g)].length, 76, ":root 76（本批零新变量——后续批增量后现值；2026-10-14 随正）")
  assert.equal([...cssClean.matchAll(/:hover/g)].length, 8, "悬停八条（零新悬停规则）")
})
