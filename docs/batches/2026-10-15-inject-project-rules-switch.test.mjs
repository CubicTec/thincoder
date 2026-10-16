/**
 * 2026-10-15-inject-project-rules-switch.test.mjs — 批内单元测试件（#1465 · 随批档归档 ·
 * 不进 `test/` 套件）。复跑（仓根 `thincoder/`）：
 *   node --test docs/batches/2026-10-15-inject-project-rules-switch.test.mjs
 *
 * 覆盖判据（批档 §2 验收对照 1 / 2 / 3 / 4 的可机判部分 + 设计 §6.27 三向断言）：
 *   T1 默认零行为变 —— 三键缺省 ⇒ ① ② ③ 三块全在（正向）。
 *   T2 正交反向① —— `agent.injectProjectRules=false` ⇒ ① 块消失 ∧ ② ③ 仍在。
 *   T3 正交反向② —— `agent.injectDocs=false` ⇒ ② 块消失 ∧ ① ③ 仍在（本批新语义·职责收窄实证）。
 *   T4 记忆键零动 —— `agent.injectMemories=false` ⇒ ③ 消失 ∧ ① ② 仍在。
 *   T4b 工程模式不变式 —— 关三键后槽位装配（`assemblePrompt`）逐字节同（纪律走提示词本体）。
 *   T5 键面进 `settings` 工具类型表 —— 新键经 DEFAULTS 派生为 `boolean`（list 面可见可写的机械前提）。
 *   T6 判据 `!== false` —— 仅显式 `false` 阻断；`true` ∥ 缺省（`undefined`）∥ 非布尔真值均放行。
 *   T7 消费点读键单源 —— 核 `agent/setup.mjs` 判点读 `injectProjectRules`（源码级结构断言——
 *      防「新键加了但判点仍读旧键」的静默半实施）。
 *
 * 夹具：tmp 项目目录（`AGENTS.md` + `PROJECT-MANIFEST.json` 使其为「声明项目」——
 * ② 相关文档块的检索准入过滤需要声明范围才算命中）。`memory.db` 用最小假件（不碰真实库）。
 */
import test from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const HERE = fileURLToPath(new URL(".", import.meta.url)) // docs/batches/
const ROOT = join(HERE, "..", "..") // 仓根 thincoder/
const mod = (rel) => pathToFileURL(join(ROOT, rel)).href

const { prepareRun } = await import(mod("thincoder-core/agent/setup.mjs"))
const { DEFAULTS } = await import(mod("thincoder-core/config.mjs"))
const { _buildShapeTable } = await import(mod("thincoder-core/agent-tools/settings.mjs"))

// ─── 夹具：声明项目 tmp 目录（唯一（每例各自建，避免 scope 缓存串味））────────────

function makeFixture() {
  const dir = mkdtempSync(join(tmpdir(), "ipr-u-"))
  writeFileSync(join(dir, "AGENTS.md"), "# Fixture project conventions\nDo the thing.\n")
  writeFileSync(join(dir, "project_rules.md"), "Extra fixture rules.\n")
  // 声明项目（② 相关文档块的检索准入过滤 = 声明范围门）
  writeFileSync(join(dir, "PROJECT-MANIFEST.json"), JSON.stringify({ name: "fixture", docRoot: { design: "docs/design" } }))
  mkdirSync(join(dir, "docs", "design"), { recursive: true })
  return dir
}

/** 最小 memory 假件：`docSearch` 需 `.all()` 出一行文档；`memorySearch` 出一行记忆。 */
function makeMemory(dir) {
  return {
    codeOrigin: dir,
    db: {
      prepare: (sql) => ({
        get: () => ({ n: 1 }),
        all: () => sql.includes("FROM doc_chunks_fts")
          ? [{ rowid: 1, path: join(dir, "docs", "design", "x.md"), language: "md", heading: "H", content: "doc body", line_start: 1, line_end: 2, rank: 0, origin: dir }]
          : [{ type: "knowledge", title: "MemTitle", content: "mem body" }],
      }),
    },
  }
}

const mkAgent = (dir, agentCfg) => ({
  cwd: dir,
  history: [],
  _pendingReminders: [],
  config: { agent: { ...DEFAULTS.agent, ...agentCfg } },
  tools: [],
  provider: {},
  memory: makeMemory(dir),
})

const PROJECT_RULES_MARK = "Project instructions (follow these as project conventions):"
const DOCS_MARK = "[Relevant documentation"
const MEMORIES_MARK = "[Relevant memories"

/** 装配一次 ⇒ ③ 块在场读数（systemPrompt + transient history 两处都看——块可能落任一面）。 */
async function probe(agentCfg) {
  const dir = makeFixture()
  const agent = mkAgent(dir, agentCfg)
  const run = await prepareRun(agent, "hello", {}, { depth: 0 })
  const all = [run.systemPrompt, ...agent.history.map((m) => (typeof m.content === "string" ? m.content : ""))].join("\n")
  return {
    projectRules: all.includes(PROJECT_RULES_MARK),
    docs: all.includes(DOCS_MARK),
    memories: all.includes(MEMORIES_MARK),
  }
}

// ─── T1 默认零行为变（正向：三块全在）────────────────────────────────────────

test("T1 默认零行为变：三键缺省 ⇒ ① 项目指令块 ∧ ② 文档块 ∧ ③ 记忆块 全在", async () => {
  const r = await probe({})
  assert.deepEqual(r, { projectRules: true, docs: true, memories: true }, "缺省装配 = 三块全在（#1420 落地态逐项）")
})

// ─── T2/T3/T4 三键正交（三向反向断言）───────────────────────────────────────

test("T2 正交反向①：injectProjectRules=false ⇒ ① 消失 ∧ ② ③ 仍在", async () => {
  const r = await probe({ injectProjectRules: false })
  assert.deepEqual(r, { projectRules: false, docs: true, memories: true }, "关 ① 不牵连 ② ③")
})

test("T3 正交反向②：injectDocs=false ⇒ ② 消失 ∧ ① ③ 仍在（职责收窄实证）", async () => {
  const r = await probe({ injectDocs: false })
  assert.deepEqual(r, { projectRules: true, docs: false, memories: true }, "关 ② 不牵连 ① ③——injectDocs 收窄为只管 ②")
})

test("T4 记忆键零动：injectMemories=false ⇒ ③ 消失 ∧ ① ② 仍在", async () => {
  const r = await probe({ injectMemories: false })
  assert.deepEqual(r, { projectRules: true, docs: true, memories: false }, "关 ③ 不牵连 ① ②")
})

test("T4b 工程模式不变式：关三键后槽位装配（assemblePrompt）逐字节同——纪律走提示词本体", async () => {
  // 无 AGENTS.md 夹具 ⇒ 项目指令块两条路都不产 ⇒ 纯槽位装配对比
  const dir = mkdtempSync(join(tmpdir(), "ipr-eng-"))
  writeFileSync(join(dir, "PROJECT-MANIFEST.json"), JSON.stringify({ name: "fixture" }))
  const mkEng = (agentCfg, role) => ({
    cwd: dir, history: [], _pendingReminders: [],
    config: { agent: { ...DEFAULTS.agent, engineering: true, ...agentCfg } },
    tools: [], provider: {}, _role: role,
    memory: { codeOrigin: dir, db: { prepare: () => ({ get: () => ({ n: 1 }), all: () => [] }) } },
  })
  const off = { injectProjectRules: false, injectDocs: false, injectMemories: false }
  for (const [role, depth] of [["engineering", 0], ["eng-coder", 1]]) {
    const on = await prepareRun(mkEng({}, role), "hi", {}, { depth })
    const offRun = await prepareRun(mkEng(off, role), "hi", {}, { depth })
    assert.equal(on.systemPrompt, offRun.systemPrompt, `${role} depth${depth} 槽位装配逐字节同`)
  }
})

// ─── T5 settings 工具类型表派生（list 面可见可写的机械前提）──────────────────

test("T5 settings 工具面：新键经 DEFAULTS 自动派生为 boolean（零改码即入类型表）", () => {
  const typeMap = _buildShapeTable(DEFAULTS)
  assert.equal(typeMap["agent.injectProjectRules"], "boolean", "新键派生类型 = boolean")
  assert.equal(typeMap["agent.injectDocs"], "boolean", "同族既有键（回归）")
  assert.equal(typeMap["agent.injectMemories"], "boolean", "同族既有键（回归）")
  assert.equal(DEFAULTS.agent.injectProjectRules, true, "DEFAULTS 默认 = true")
})

// ─── T6 判据 `!== false`（仅显式 false 阻断）────────────────────────────────

test("T6 判据 `!== false`：显式 false 阻断；true ∥ undefined ∥ 非布尔真值放行", async () => {
  assert.equal((await probe({ injectProjectRules: true })).projectRules, true, "显式 true ⇒ 在")
  assert.equal((await probe({ injectProjectRules: undefined })).projectRules, true, "缺省（undefined）⇒ 在")
  assert.equal((await probe({ injectProjectRules: 0 })).projectRules, true, "非布尔值 ⇒ 放行（只认显式 false）")
  assert.equal((await probe({ injectProjectRules: false })).projectRules, false, "显式 false ⇒ 阻断")
})

// ─── T7 消费点读键单源（源码级结构断言）─────────────────────────────────────

test("T7 消费点单源：setup.mjs 判点读 injectProjectRules（防「加键不改判点」静默半实施）", () => {
  const src = readFileSync(join(ROOT, "thincoder-core", "agent", "setup.mjs"), "utf8")
  assert.ok(
    /const\s+injectProjectRules\s*=\s*agent\.config\?\.agent\?\.injectProjectRules\s*!==\s*false/.test(src),
    "消费点变量 = agent.config?.agent?.injectProjectRules !== false",
  )
  assert.ok(
    /const\s+projectRules\s*=\s*injectProjectRules\s*\?/.test(src),
    "① 项目指令判点读新变量（不再受 injectDocs 牵连）",
  )
  assert.ok(!/projectRules\s*=\s*injectDocs\s*\?/.test(src), "判点已不再读 injectDocs（旧式零残留）")
})

// ─── T8–T11 三端配置面落点（源码级结构断言——落点在场性）──────────────────────

const rd = (rel) => readFileSync(join(ROOT, rel), "utf8")

test("T8 VSC 三处穿透齐：默认种 ∥ raw 读 ∥ agentFields 白名单（缺一 ⇒ config.json 关不掉）", () => {
  const src = rd("thincoder-vscode/src/agent/setup.mjs")
  assert.match(src, /let\s+cfgInjectProjectRules\s*=\s*DEFAULTS\.agent\?\.injectProjectRules\s*!==\s*false/, "① 默认种")
  assert.match(src, /cfgInjectProjectRules\s*=\s*raw\.agent\?\.injectProjectRules\s*\?\?\s*cfgInjectProjectRules/, "② raw 读")
  assert.match(src, /injectProjectRules:\s*cfgInjectProjectRules\s*,/, "③ agentFields 白名单")
})

test("T9 CLI /config：主菜单项 ∥ view 行 ∥ toggle 谓词并入（非自动点）", () => {
  const src = rd("thincoder-cli/src/tui/cmd-config.mjs")
  assert.match(src, /action:\s*"agent\.injectProjectRules"/, "主菜单项")
  assert.match(src, /pushLine\(`agent\.injectProjectRules:/, "view 面板行")
  assert.match(src, /choice\.action\s*===\s*"agent\.injectProjectRules"\s*\|\|/, "toggle 分支判别式显式并入")
})

test("T10 桌面设置面：NAMED_FIELDS 二十一键表含新键 ∥ 两语词面齐", () => {
  const fields = rd("thincoder-desktop/renderer/views/settings-agent.mjs")
  assert.match(fields, /path:\s*"agent\.injectProjectRules"/, "NAMED_FIELDS 新增行")
  const i18n = rd("thincoder-desktop/renderer/i18n-views.mjs")
  assert.equal((i18n.match(/"settings\.injectProjectRules":/g) ?? []).length, 2, "中英两语各一键")
})

test("T11 VSC UI 链齐：读链两处 ∥ 写链 ∥ 控件 ∥ 载荷 ∥ EDIT_FIELDS ∥ 两语词面+Help", () => {
  const s = rd("thincoder-vscode/src/extension/settings.mjs")
  assert.match(s, /injectProjectRules:\s*a\?\.injectProjectRules\s*\?\?\s*d\.injectProjectRules/, "读链归一")
  assert.match(s, /injectProjectRules:\s*s\.injectProjectRules/, "快照携键")
  assert.match(rd("thincoder-vscode/src/extension/settings-panel-write.mjs"), /if\s*\(payload\.injectProjectRules\s*!==\s*undefined\)/, "写链布尔写")
  const wa = rd("thincoder-vscode/webview/settings-agent.js")
  assert.match(wa, /id="ag-injectprojectrules"/, "控件在场")
  assert.match(wa, /injectProjectRules:\s*chk\("ag-injectprojectrules"\)/, "载荷出值")
  assert.match(wa, /"ag-injectprojectrules":\s*\["injectProjectRules"\]/, "EDIT_FIELDS 差异提交")
  for (const loc of ["locales/zh.json", "locales/en.json"]) {
    const j = JSON.parse(rd(`thincoder-vscode/${loc}`))
    assert.ok(j["settings.injectProjectRules"], `${loc} 词面键`)
    assert.ok(j["settings.injectProjectRulesHelp"], `${loc} Help 悬浮键`)
    assert.ok(!/项目指令文件 \+ 相关文档/.test(j["settings.injectDocs"] ?? ""), `${loc} injectDocs 词面已收窄（EN 同判）`)
  }
})
