/**
 * 2026-10-14-injection-switches.test.mjs — 注入开关键批（`agent.injectDocs` ∥ `agent.injectMemories`，
 * 台账 #1420 · 设计单源 = `docs/core/design/PROMPT-SYSTEM.md` §6.24）批次本地单元件。
 * 名随批次档 · 住批次目录 · **不进仓套件**；复跑（从仓库根 `thincoder/`）：
 *   node --test docs/batches/2026-10-14-injection-switches.test.mjs
 *
 * 用例（U1–U11——定义 = 批档 §2「用例清单」）：
 *   U1 默认零变：无键 ⇒ 三块全在场（项目指令 ∥ 相关文档 ∥ 相关记忆）+ DEFAULTS 两键 = true
 *   U2 `agent.injectDocs=false` ⇒ ①②缺 ∧ ③在；文档检索零执行（SQL spy 零 doc_chunks 查询）
 *   U3 `agent.injectMemories=false` ⇒ ③缺 ∧ ①②在；记忆检索零执行（SQL spy 零 entries 查询）
 *   U4 双关 ⇒ 三块全缺（两类检索皆零执行）
 *   U5 热应用：同一 agent 两次 `prepareRun` 间翻转 `agent.config.agent.injectDocs` ⇒ 第二次组装生效
 *   U6 工程不变式：`engineering=true` + 双关 ⇒ `systemPrompt` 仍以 `assemblePrompt("engineering")` 基底开头
 *   U7 CLI 开关腿：ctx mock 首轮选 `agent.injectDocs` ⇒ `persistRaw` 收 false；再选（off 态）⇒ true；
 *      菜单 ∥ View 行随值；Esc ∥ 异常 ⇒ 零净写；两键共用支（零 askQuestion 兜底支）
 *   U8 VSC 腿：写链行为（`saveAgentSettingsFromPanel` 两键 true/false 均落盘 + 缺席零动）+ 渲染 ∥ 载荷腿
 *      （fake DOM：默认/开 ⇒ 勾选、关 ⇒ 不勾）+ 读链 ∥ 三处穿透 ∥ 两语键对等（结构）
 *   U9 桌面腿：`NAMED_FIELDS` 两键（kind=boolean）∥ `agentBody` 落屏两行 ∥ i18n 两语键对等；
 *      `settings:agent` patch 布尔守卫格（非布尔拒 + 默认装态 = 勾选）
 *   U10 核 `settings` 工具写入面真链：`set` 写两键（JSON 布尔）⇒ 内存热应用 + 同 agent 下一次组装三块缺；
 *      布尔护栏格（非布尔 ⇒ 抛错、磁盘/内存零变）
 *   U11 子代理装配：`depth>0` + `injectDocs=false` ⇒ ① 缺（缺省 ⇒ ① 在；②③ 既受 depth-0 门）；
 *      config 继承面结构核（`subagent-spawn.mjs` childConfig = parent.config）
 *
 * 数据面纪律：只用夹具 ∕ 沙箱（tmpdir——家目录 ∥ config 路径 ∥ 记忆库皆临时）——真库
 * （`~/.thincoder/`）零触碰；零网络（记忆面 = FTS-only 夹具——无 embedder ⇒ 零向量通道）。
 * 挂载面（先例 = `2026-10-04-session-carryover-cli-vsc.test.mjs`）：`@thincoder/core/*` 裸符经
 * resolve 钩子归一为本仓 `thincoder-core/*` file URL（端壳 junction realpath 与测试 file URL 盘符
 * 大小写不同 ⇒ 模块身份分裂双实例；归一后 CLI ∥ VSC ∥ 桌面源码与本案共用同一核实例）。
 */
import test from "node:test"
import assert from "node:assert/strict"
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { registerHooks } from "node:module"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

// 家目录重定向（安全网：核 configDir 于模组装载期取值——一切 (动态) import 之前覆盖）。
const HOME_SANDBOX = mkdtempSync(join(tmpdir(), "inj-home-"))
process.env.HOME = HOME_SANDBOX
process.env.USERPROFILE = HOME_SANDBOX

const ROOT_URL = new URL("../../", import.meta.url) // 仓根（docs/batches 两层深）
const ROOT = fileURLToPath(ROOT_URL)

// 单实例归一（见件头注）：`@thincoder/core/*` 裸符 → 本仓 `thincoder-core/*` file URL。
const CORE_BASE = new URL("thincoder-core/", ROOT_URL)
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith("@thincoder/core/")) {
      return { url: new URL(specifier.slice("@thincoder/core/".length), CORE_BASE).href, shortCircuit: true }
    }
    return next(specifier, context)
  },
})

const mod = (rel) => import(new URL(rel, ROOT_URL).href)
const text = (rel) => readFileSync(join(ROOT, rel), "utf8")

// ─── 核面取件 ────────────────────────────────────────────────────────────────
const coreCfg = await mod("thincoder-core/config.mjs")
const coreIo = await mod("thincoder-core/config-io.mjs")
const schemaMod = await mod("thincoder-core/memory/schema.mjs")
const originMod = await mod("thincoder-core/memory/origin.mjs")
const coreMemory = await mod("thincoder-core/memory/core.mjs")
const codeIndexMod = await mod("thincoder-core/memory/code-index.mjs")
const conventionsMod = await mod("thincoder-core/conventions.mjs")
const setupMod = await mod("thincoder-core/agent/setup.mjs")
const overlaysMod = await mod("thincoder-core/prompt-overlays.mjs")
const settingsToolMod = await mod("thincoder-core/agent-tools/settings.mjs")
const cliCmdConfigMod = await mod("thincoder-cli/src/tui/cmd-config.mjs")
const vscWriteMod = await mod("thincoder-vscode/src/extension/settings-panel-write.mjs")
const desktopAgentView = await mod("thincoder-desktop/renderer/views/settings-agent.mjs")
const desktopDict = (await mod("thincoder-desktop/renderer/i18n-views.mjs")).VIEWS_DICT

const { DEFAULTS, loadConfig, _setConfigPathForTest, _resetConfigPathForTest } = coreCfg
const { createMemory } = schemaMod
const { normalizeOrigin } = originMod
const { put } = coreMemory
const { _upsertDocFile } = codeIndexMod
const { clearDeclarationCache } = conventionsMod
const { prepareRun } = setupMod
const { assemblePrompt } = overlaysMod
const { settingsTool } = settingsToolMod
const { handleConfigCommand } = cliCmdConfigMod
const { saveAgentSettingsFromPanel } = vscWriteMod

// ─── 夹具工具 ────────────────────────────────────────────────────────────────
const created = []
const sandbox = (tag) => { const d = mkdtempSync(join(tmpdir(), `inj-${tag}-`)); created.push(d); return d }
const cleanup = () => { for (const d of created.splice(0)) { try { rmSync(d, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }) } catch { /* 留 tmp */ } } }
test.after(() => {
  _resetConfigPathForTest()
  for (const d of created.splice(0)) { try { rmSync(d, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }) } catch { /* 留 tmp */ } }
  rmSync(HOME_SANDBOX, { recursive: true, force: true })
})

const QUERY = "needle"
const RULES_MARK = "Project instructions (follow these as project conventions):"
const DOC_PREFIX = "[Relevant documentation"
const MEM_PREFIX = "[Relevant memories"

/** 项目夹具：目录 + 项目级 `AGENTS.md`（项目指令块内容源——沙箱家目录无用户级档）+ `PROJECT-MANIFEST.json`。
 *  声明面 = `docRoot.design` 指向 `docs`（§6.14 面⑦ 范围谓词：未声明 ⇒ 文档行全隐藏——检索零命中，夹具必须显式声明）。 */
const mkProj = (base, mark) => {
  const dir = join(base, "proj")
  mkdirSync(join(dir, "docs"), { recursive: true })
  writeFileSync(join(dir, "AGENTS.md"), `# Fixture rules\n\nRULES-MARK:${mark}\n`)
  writeFileSync(join(dir, "PROJECT-MANIFEST.json"), JSON.stringify({ docRoot: { design: "docs" } }, null, 2))
  clearDeclarationCache()
  return dir
}
/** 记忆夹具（FTS-only——无 embedder ⇒ 零向量通道 ∥ 零网络）。 */
const newMemory = (dbPath, codeOrigin) => {
  const mem = createMemory({ dbPath })
  mem.codeOrigin = normalizeOrigin(codeOrigin)
  return mem
}
const seedDocs = (mem, codeOrigin) => _upsertDocFile(mem, normalizeOrigin(codeOrigin), "docs/guide.md", ["needle doc body"], 1)
const seedMemory = (mem) => put(mem, { type: "knowledge", title: "needle memory", content: "needle memory body" })

/** SQL spy（先例 = `2026-10-10-agent-loop-allotment.test.mjs:116-138`——本档简化：只收 SQL 串）。 */
const spyDb = (memory, sink) => {
  const real = memory.db
  memory.db = new Proxy(real, {
    get(t, k) {
      if (k === "prepare") {
        return (sql, ...rest) => {
          const st = t.prepare(sql, ...rest)
          return new Proxy(st, {
            get(s, k2) {
              const v = Reflect.get(s, k2)
              if (typeof v !== "function") return v
              if (k2 === "all" || k2 === "get" || k2 === "run") return (...args) => { sink.push(sql); return v.apply(s, args) }
              return v.bind(s)
            },
          })
        }
      }
      const v = Reflect.get(t, k)
      return typeof v === "function" ? v.bind(t) : v
    },
  })
  return real
}
const docQueries = (calls) => calls.filter((sql) => sql.includes("doc_chunks_fts MATCH"))
const memQueries = (calls) => calls.filter((sql) => sql.includes("entries_fts MATCH"))

/** 直驱 `prepareRun`（agent 假体 = 核面最小集——先例 allotment `drive()`）。 */
const drive = async (cwd, memory, { input = QUERY, cfgAgent = {}, depth = 0 } = {}) => {
  const agent = { cwd, history: [], _pendingReminders: [], config: { agent: { ...cfgAgent } }, tools: [], memory }
  const out = await prepareRun(agent, input, {}, { depth })
  return { agent, out }
}
const hasBlock = (agent, prefix) => agent.history.some((m) => typeof m.content === "string" && m.content.startsWith(prefix))
const countBlock = (agent, prefix) => agent.history.filter((m) => typeof m.content === "string" && m.content.startsWith(prefix)).length
const hasRules = (out, mark = null) => out.systemPrompt.includes(RULES_MARK) && (mark === null || out.systemPrompt.includes(`RULES-MARK:${mark}`))

/* ═══ U1 默认零变 ═══════════════════════════════════════════════════════════ */

test("U1 默认零变：无键 ⇒ 三块全在场 + DEFAULTS 两键 = true", async () => {
  try {
    const base = sandbox("u1")
    const proj = mkProj(base, "u1")
    const mem = newMemory(join(base, "m.db"), proj)
    seedDocs(mem, proj)
    await seedMemory(mem)
    const sink = []
    spyDb(mem, sink)
    const { agent, out } = await drive(proj, mem)

    assert.ok(hasRules(out, "u1"), "① 项目指令块在场（项目 AGENTS.md 随提示词注入）")
    assert.ok(hasBlock(agent, DOC_PREFIX), "② 相关文档块在场")
    assert.ok(hasBlock(agent, MEM_PREFIX), "③ 相关记忆块在场")
    assert.ok(docQueries(sink).length >= 1, "文档检索照跑（正对照——开关只是不阻断缺省行为）")
    assert.ok(memQueries(sink).length >= 1, "记忆检索照跑（正对照）")
    assert.equal(DEFAULTS.agent.injectDocs, true, "DEFAULTS.agent.injectDocs = true")
    assert.equal(DEFAULTS.agent.injectMemories, true, "DEFAULTS.agent.injectMemories = true")
  } finally { cleanup() }
})

/* ═══ U2 ∥ U3 ∥ U4 三块开关真值格 ════════════════════════════════════════════ */

test("U2 injectDocs=false ⇒ ①②缺 ∧ ③在（文档检索零执行）", async () => {
  try {
    const base = sandbox("u2")
    const proj = mkProj(base, "u2")
    const mem = newMemory(join(base, "m.db"), proj)
    seedDocs(mem, proj)
    await seedMemory(mem)
    const sink = []
    spyDb(mem, sink)
    const { agent, out } = await drive(proj, mem, { cfgAgent: { injectDocs: false } })

    assert.equal(hasRules(out, "u2"), false, "① 项目指令块缺（关 = 不读 + 不注入）")
    assert.equal(hasBlock(agent, DOC_PREFIX), false, "② 相关文档块缺")
    assert.ok(hasBlock(agent, MEM_PREFIX), "③ 相关记忆块在（记忆键未关——零波及其余）")
    assert.equal(docQueries(sink).length, 0, "文档检索零执行（SQL spy 零 doc_chunks 查询——关 = 检索不执行）")
    assert.ok(memQueries(sink).length >= 1, "记忆检索照跑（正对照）")
  } finally { cleanup() }
})

test("U3 injectMemories=false ⇒ ③缺 ∧ ①②在（记忆检索零执行）", async () => {
  try {
    const base = sandbox("u3")
    const proj = mkProj(base, "u3")
    const mem = newMemory(join(base, "m.db"), proj)
    seedDocs(mem, proj)
    await seedMemory(mem)
    const sink = []
    spyDb(mem, sink)
    const { agent, out } = await drive(proj, mem, { cfgAgent: { injectMemories: false } })

    assert.ok(hasRules(out, "u3"), "① 项目指令块在")
    assert.ok(hasBlock(agent, DOC_PREFIX), "② 相关文档块在")
    assert.equal(hasBlock(agent, MEM_PREFIX), false, "③ 相关记忆块缺")
    assert.equal(memQueries(sink).length, 0, "记忆检索零执行（SQL spy 零 entries 查询）")
    assert.ok(docQueries(sink).length >= 1, "文档检索照跑（正对照）")
  } finally { cleanup() }
})

test("U4 双关 ⇒ 三块全缺（两类检索皆零执行）", async () => {
  try {
    const base = sandbox("u4")
    const proj = mkProj(base, "u4")
    const mem = newMemory(join(base, "m.db"), proj)
    seedDocs(mem, proj)
    await seedMemory(mem)
    const sink = []
    spyDb(mem, sink)
    const { agent, out } = await drive(proj, mem, { cfgAgent: { injectDocs: false, injectMemories: false } })

    assert.equal(hasRules(out, "u4"), false, "① 缺")
    assert.equal(hasBlock(agent, DOC_PREFIX), false, "② 缺")
    assert.equal(hasBlock(agent, MEM_PREFIX), false, "③ 缺")
    assert.equal(docQueries(sink).length, 0, "文档检索零执行")
    assert.equal(memQueries(sink).length, 0, "记忆检索零执行")
  } finally { cleanup() }
})

/* ═══ U5 热应用 ══════════════════════════════════════════════════════════════ */

test("U5 热应用：同一 agent 两次组装间翻转 injectDocs ⇒ 第二次生效", async () => {
  try {
    const base = sandbox("u5")
    const proj = mkProj(base, "u5")
    const mem = newMemory(join(base, "m.db"), proj)
    seedDocs(mem, proj)
    const agent = { cwd: proj, history: [], _pendingReminders: [], config: { agent: {} }, tools: [], memory: mem }
    await prepareRun(agent, QUERY, {}, { depth: 0 })
    assert.equal(countBlock(agent, DOC_PREFIX), 1, "首轮（缺省）⇒ 文档块在场")
    const lenAfterFirst = agent.history.length

    agent.config.agent.injectDocs = false // 翻转（= settings 工具 ∥ /config 写入后的活 config）
    await prepareRun(agent, QUERY, {}, { depth: 0 })
    assert.ok(agent.history.length > lenAfterFirst, "第二次组装确实发生（历史增长）")
    assert.equal(countBlock(agent, DOC_PREFIX), 1, "第二次未新增文档块（本会话即热——逐 run 现读活 config）")

    agent.config.agent.injectDocs = true // 翻回
    await prepareRun(agent, QUERY, {}, { depth: 0 })
    assert.equal(countBlock(agent, DOC_PREFIX), 2, "翻回 ⇒ 再注入（同一 agent——零重启零重载）")
  } finally { cleanup() }
})

/* ═══ U6 工程不变式 ══════════════════════════════════════════════════════════ */

test("U6 工程不变式：engineering=true + 双关 ⇒ systemPrompt 仍以工程基底开头", async () => {
  try {
    const base = sandbox("u6")
    const proj = mkProj(base, "u6")
    const mem = newMemory(join(base, "m.db"), proj)
    seedDocs(mem, proj)
    await seedMemory(mem)
    const { agent, out } = await drive(proj, mem, { cfgAgent: { engineering: true, injectDocs: false, injectMemories: false } })

    const { prompt: engBase } = assemblePrompt("engineering")
    assert.ok(engBase.length > 0, "工程基底非空（正对照——防止 startsWith 空串假绿）")
    assert.ok(out.systemPrompt.startsWith(engBase), "槽位装配零触（persona→common→discipline 基底逐字开头）")
    assert.equal(hasRules(out), false, "双关下项目指令块仍缺（开关真实生效）")
    assert.equal(hasBlock(agent, DOC_PREFIX) || hasBlock(agent, MEM_PREFIX), false, "两检索块亦零注入（工程模式不吃这两面——只是沿用同一开关）")
  } finally { cleanup() }
})

/* ═══ U7 CLI `/config` 开关腿 ════════════════════════════════════════════════ */

/** ctx mock（沿 `2026-09-30-heap-snapshot-switch.test.mjs:186-219` 先例）。 */
function makeCmdCtx({ agentCfg = {}, pick = "agent.injectDocs", persistThrows = false } = {}) {
  const lines = []
  const writes = []
  const menu = []
  const asked = []
  let call = 0
  const agent = {
    config: { agent: { ...agentCfg }, embedding: {}, traces: {}, diagnostics: {} },
    providers: [], activeProvider: "", activeModel: null, provider: {},
  }
  const ctx = {
    agent,
    pushLine: (t) => lines.push(t),
    pushLabel: () => {},
    maskKey: () => "****",
    pickModelForSlot: async () => null,
    askQuestion: async (q) => { asked.push(q); return "" },
    persistRaw: async (mutate) => {
      if (persistThrows) throw new Error("disk-write-refused")
      const raw = { agent: { maxTurns: 200 } } // 族内他键保留探针（raw.agent 重建支不得整键覆盖）
      mutate(raw)
      writes.push(raw)
    },
    showPicker: async (_t, entries) => {
      call += 1
      if (call === 1) { menu.push(...entries); return pick === null ? null : (entries.find((e) => e.action === pick) ?? null) }
      return null // 第二轮 = Esc 退出
    },
  }
  return { ctx, lines, writes, menu, asked }
}

const rowText = (menu, action) => menu.find((e) => e.action === action)?.text

test("U7 CLI 开关腿：菜单两行 ∥ 共用支写布尔 ∥ 再选翻转 ∥ View 两行", async () => {
  const base = sandbox("u7")
  _setConfigPathForTest(join(base, "config.json"))
  try {
    // ① 缺省（开）⇒ 菜单 on；选择 ⇒ 写 false（两键各一次）
    for (const action of ["agent.injectDocs", "agent.injectMemories"]) {
      const h = makeCmdCtx({ agentCfg: {}, pick: action })
      await handleConfigCommand(h.ctx)
      const key = action.slice("agent.".length)
      assert.equal(rowText(h.menu, action), `${action} = on（${key === "injectDocs" ? "文档注入——项目指令文件 + 相关文档" : "记忆注入——往期相关记忆召回"}——默认开）`, `菜单行随值（默认开 ⇒ on——${action}）`)
      assert.equal(h.writes.length, 1, `${action}：恰一次写`)
      assert.equal(h.writes[0].agent[key], false, `${action}：开 ⇒ 写 false（显式布尔）`)
      assert.equal(h.writes[0].agent.maxTurns, 200, "族内他键保留（共用支不整键覆盖）")
      assert.ok(h.lines.includes(`${action} = off（即热——下一次提示词组装生效）`), `${action}：确认行逐字（即热——无「重启」注）`)
      assert.equal(h.asked.length, 0, `${action}：零 askQuestion（continue 在位——未掉进数值兜底支）`)
    }
    // ② 显式关态 ⇒ 菜单 off；选择 ⇒ 写 true
    for (const action of ["agent.injectDocs", "agent.injectMemories"]) {
      const key = action.slice("agent.".length)
      const h = makeCmdCtx({ agentCfg: { [key]: false }, pick: action })
      await handleConfigCommand(h.ctx)
      assert.equal(rowText(h.menu, action), `${action} = off（${key === "injectDocs" ? "文档注入——项目指令文件 + 相关文档" : "记忆注入——往期相关记忆召回"}——默认开）`, `菜单行随值（显式关 ⇒ off——${action}）`)
      assert.equal(h.writes[0].agent[key], true, `${action}：关 ⇒ 写 true（翻转）`)
      assert.ok(h.lines.includes(`${action} = on（即热——下一次提示词组装生效）`), `${action}：确认行逐字（on）`)
    }
    // ③ View 详情两行
    const view = makeCmdCtx({ agentCfg: { injectDocs: true, injectMemories: false }, pick: "view" })
    await handleConfigCommand(view.ctx)
    assert.ok(view.lines.includes("agent.injectDocs: on（文档注入——项目指令文件 + 相关文档——默认开）"), "View 行：injectDocs on")
    assert.ok(view.lines.includes("agent.injectMemories: off（记忆注入——往期相关记忆召回——默认开）"), "View 行：injectMemories off")
    // ④ 负腿：Esc ∥ 保存异常 ⇒ 零净写
    const esc = makeCmdCtx({ pick: null })
    await handleConfigCommand(esc.ctx)
    assert.equal(esc.writes.length, 0, "Esc ⇒ 零写")
    const boom = makeCmdCtx({ persistThrows: true })
    await handleConfigCommand(boom.ctx)
    assert.equal(boom.writes.length, 0, "异常 ⇒ 零净写")
    assert.ok(boom.lines.some((l) => l.startsWith("Save failed:")), "失败面可见（不静默）")
  } finally { _resetConfigPathForTest(); cleanup() }
})

/* ═══ U8 VSC 腿 ══════════════════════════════════════════════════════════════ */

test("U8-A VSC 写链行为：两键 true/false 均落盘 ∥ 缺席零动", async () => {
  const base = sandbox("u8w")
  const cfg = join(base, "config.json")
  writeFileSync(cfg, JSON.stringify({}, null, 2))
  _setConfigPathForTest(cfg)
  try {
    const disk = () => JSON.parse(readFileSync(cfg, "utf8"))
    saveAgentSettingsFromPanel({ injectDocs: false })
    assert.equal(disk().agent?.injectDocs, false, "{} 载荷 injectDocs:false ⇒ 盘面 false（显式布尔）")
    assert.ok("injectDocs" in disk().agent, "false 落盘为显式布尔（键在场——非删键）")
    saveAgentSettingsFromPanel({ injectMemories: false })
    assert.equal(disk().agent?.injectMemories, false, "injectMemories:false ⇒ 盘面 false")
    assert.equal(disk().agent?.injectDocs, false, "前键零动（逐字段 patch）")
    saveAgentSettingsFromPanel({ injectDocs: false, injectMemories: false }) // 判别性前置复位（防「同值」假绿）
    assert.equal(disk().agent?.injectDocs, false, "前置复位 = false")
    saveAgentSettingsFromPanel({ injectDocs: true, injectMemories: true })
    assert.equal(disk().agent?.injectDocs, true, "true ⇒ 盘面 true")
    assert.equal(disk().agent?.injectMemories, true, "true ⇒ 盘面 true")
    saveAgentSettingsFromPanel({ maxTurns: 55 })
    assert.equal(disk().agent?.injectDocs, true, "载荷缺席 ⇒ 该键零动（缺席 ≠ 清空）")
    assert.equal(disk().agent?.injectMemories, true, "载荷缺席 ⇒ 该键零动")
    assert.equal(disk().agent?.maxTurns, 55, "对照字段照常写（写面在盘）")
  } finally { _resetConfigPathForTest(); cleanup() }
})

// ─── VSC webview 装载面 mini 假 DOM（沿 `2026-09-29-vsc-carryover-settings.test.mjs:34-135` 收缩）───
const _byId = new Map()
const camelOf = (name) => name.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())
class FakeNode {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase(); this.id = ""; this.attrs = {}; this.dataset = {}; this.children = []
    this.listeners = []; this.textContent = ""; this.value = ""; this.checked = false; this.parent = null
    this._classes = new Set()
  }
  set className(v) { this._classes = new Set(String(v).split(/\s+/).filter(Boolean)) }
  get className() { return [...this._classes].join(" ") }
  get classList() {
    return {
      add: (...c) => { for (const x of c) this._classes.add(x) },
      remove: (...c) => { for (const x of c) this._classes.delete(x) },
      contains: (c) => this._classes.has(c),
      toggle: (c) => { this._classes.has(c) ? this._classes.delete(c) : this._classes.add(c) },
    }
  }
  replaceChildren() { this.children = [] }
  setAttribute(k, v) { this.attrs[k] = String(v) }
  getAttribute(k) { return this.attrs[k] ?? null }
  addEventListener(type, fn) { this.listeners.push({ type, fn }) }
  removeEventListener() {}
  focus() {}
  appendChild(n) { this.children.push(n); n.parent = this; return n }
  remove() {}
  closest() { return null }
  querySelector() { return null }
  querySelectorAll() { return [] }
  fire(type, event = {}) { for (const l of this.listeners) if (l.type === type) l.fn({ type, preventDefault() {}, stopPropagation() {}, target: this, ...event }) }
  set innerHTML(v) { this._html = String(v) }
  get innerHTML() { return this._html ?? "" }
}
globalThis.Node = FakeNode
globalThis.document = {
  getElementById(id) { if (!_byId.has(id)) _byId.set(id, new FakeNode("div")); return _byId.get(id) },
  createElement: (t) => new FakeNode(t),
  createTextNode: (v) => ({ textContent: String(v) }),
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {},
  removeEventListener: () => {},
  body: new FakeNode("body"),
  documentElement: new FakeNode("html"),
}
const posted = []
globalThis.window = { _vscode: { postMessage: (m) => posted.push(m) }, addEventListener: () => {}, removeEventListener: () => {} }
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0)

const vscMod = (rel) => import(new URL(`thincoder-vscode/${rel}`, ROOT_URL).href)
const EN_LOCALE = JSON.parse(text("thincoder-vscode/locales/en.json"))
const ZH_LOCALE = JSON.parse(text("thincoder-vscode/locales/zh.json"))
const { setStrings } = await vscMod("webview/i18n.js")
setStrings(EN_LOCALE)
const { agentCardHtml, bindAgentControls } = await vscMod("webview/settings-agent.js")
const { SS } = await vscMod("webview/settings-state.js")

test("U8-B VSC 渲染 ∥ 载荷腿（fake DOM）：默认/开 ⇒ 勾选、关 ⇒ 不勾 ∥ change ⇒ 布尔出站", () => {
  SS.agentSettings = {} // 缺省 = 开（`!== false`）
  const htmlDefault = agentCardHtml()
  assert.ok(htmlDefault.includes('id="ag-injectdocs" checked>'), "缺省 ⇒ 勾选（判据 `!== false`）")
  assert.ok(htmlDefault.includes('id="ag-injectmemories" checked>'), "缺省 ⇒ 勾选（memories）")
  assert.ok(htmlDefault.includes(EN_LOCALE["settings.injectDocs"]), "词键出词（injectDocs label）")
  assert.ok(htmlDefault.includes(EN_LOCALE["settings.injectMemories"]), "词键出词（injectMemories label）")
  assert.ok(htmlDefault.includes(`title="${EN_LOCALE["settings.injectDocsHelp"]}"`), "悬浮说明键出词（injectDocs）")
  assert.ok(htmlDefault.indexOf('id="ag-autothink"') < htmlDefault.indexOf('id="ag-injectdocs"'), "位序 = autoThink 后位")

  SS.agentSettings = { injectDocs: false, injectMemories: false }
  const htmlOff = agentCardHtml()
  assert.ok(htmlOff.includes('id="ag-injectdocs"') && !htmlOff.includes('id="ag-injectdocs" checked'), "false ⇒ 不勾（injectDocs）")
  assert.ok(htmlOff.includes('id="ag-injectmemories"') && !htmlOff.includes('id="ag-injectmemories" checked'), "false ⇒ 不勾（memories）")

  // 载荷腿：绑定 + change 驱动（控件桩件 = 本席预置面）
  const card = new FakeNode("section")
  const anchor = new FakeNode("input"); anchor.id = "ag-maxturns"; anchor.closest = () => card
  _byId.set("ag-maxturns", anchor)
  const docChk = new FakeNode("input"); docChk.id = "ag-injectdocs"; _byId.set("ag-injectdocs", docChk)
  const memChk = new FakeNode("input"); memChk.id = "ag-injectmemories"; _byId.set("ag-injectmemories", memChk)
  card.querySelectorAll = (sel) => {
    const all = [docChk, memChk]
    return sel === "input, select" ? all : all.filter((n) => n.tagName === String(sel).toUpperCase())
  }
  bindAgentControls()
  const drain = (from) => posted.slice(from).filter((m) => m.type === "saveAgentSettings")
  docChk.checked = true
  let at = posted.length
  docChk.fire("change")
  let sent = drain(at)
  assert.equal(sent.length, 1, "change ⇒ saveAgentSettings 出站")
  assert.deepEqual(sent.at(-1).settings, { injectDocs: true }, "载荷 = 该字段单键（EDIT_FIELDS 差异提交）")
  memChk.checked = false
  at = posted.length
  memChk.fire("change")
  sent = drain(at)
  assert.deepEqual(sent.at(-1).settings, { injectMemories: false }, "false 布尔随载荷（显式写）")
})

test("U8-C VSC 读链 ∥ 三处穿透 ∥ 两语键对等（结构）", () => {
  const read = (rel) => text(`thincoder-vscode/${rel}`)
  assert.match(read("webview/settings-agent.js"), /id="ag-injectdocs"/, "webview：控件行 ①在场")
  assert.match(read("webview/settings-agent.js"), /as\.injectDocs !== false \? "checked" : ""/, "webview：判勾判据 `!== false`")
  assert.match(read("webview/settings-agent.js"), /injectDocs: chk\("ag-injectdocs"\)/, "webview：载荷键在场")
  assert.match(read("webview/settings-agent.js"), /"ag-injectdocs": \["injectDocs"\]/, "webview：EDIT_FIELDS 登记（漏登记 = 静默全量保存）")
  assert.match(read("webview/settings-agent.js"), /injectMemories: chk\("ag-injectmemories"\)/, "webview：memories 载荷键在场")
  assert.match(read("src/extension/settings-panel-write.mjs"), /patch\.injectDocs = !!payload\.injectDocs/, "写面：injectDocs 显式布尔写行")
  assert.match(read("src/extension/settings-panel-write.mjs"), /patch\.injectMemories = !!payload\.injectMemories/, "写面：injectMemories 显式布尔写行")
  assert.match(read("src/extension/settings.mjs"), /injectDocs: a\?\.injectDocs \?\? d\.injectDocs/, "读链 loadAgentSettings 载键")
  assert.match(read("src/extension/settings.mjs"), /injectDocs: s\.injectDocs/, "读链 push 快照携键")
  assert.match(read("src/agent/setup.mjs"), /let cfgInjectDocs = DEFAULTS\.agent\?\.injectDocs !== false/, "agent 装配：默认种（穿透①）")
  assert.match(read("src/agent/setup.mjs"), /cfgInjectDocs = raw\.agent\?\.injectDocs \?\? cfgInjectDocs/, "agent 装配：raw 读（穿透②）")
  assert.match(read("src/agent/setup.mjs"), /injectDocs: cfgInjectDocs, injectMemories: cfgInjectMemories,/, "agent 装配：agentFields 携两键（穿透③——缺则 config.json 对该键关不掉）")
  for (const key of ["settings.injectDocs", "settings.injectMemories", "settings.injectDocsHelp", "settings.injectMemoriesHelp"]) {
    assert.equal(typeof EN_LOCALE[key], "string", `en 词键在场：${key}`)
    assert.equal(typeof ZH_LOCALE[key], "string", `zh 词键在场：${key}`)
  }
  assert.deepEqual(Object.keys(EN_LOCALE).sort(), Object.keys(ZH_LOCALE).sort(), "两语键集相等（增键两语同增）")
})

/* ═══ U9 桌面腿 ══════════════════════════════════════════════════════════════ */

const walkTree = (tree, visit) => {
  for (const node of Array.isArray(tree) ? tree : [tree]) {
    if (node === null || typeof node !== "object") continue
    visit(node)
    if (Array.isArray(node.children)) walkTree(node.children, visit)
  }
}
const rowNodeOf = (tree, path) => {
  let hit = null
  walkTree(tree, (n) => { if (hit === null && n.props?.["data-field-name"] === path) hit = n })
  return hit
}
const controlOf = (row) => (row?.children ?? []).find((c) => c?.tag === "input") ?? null

test("U9-A 桌面 NAMED_FIELDS 两键 ∥ agentBody 落屏（默认装态 = 勾选）", () => {
  const entries = desktopAgentView.NAMED_FIELDS.filter((e) => e.path === "agent.injectDocs" || e.path === "agent.injectMemories")
  assert.equal(entries.length, 2, "NAMED_FIELDS 含两键")
  assert.deepEqual(entries.map((e) => e.path), ["agent.injectDocs", "agent.injectMemories"], "两键同序")
  for (const e of entries) {
    assert.equal(e.kind, "boolean", `${e.path}：控型 = boolean`)
    assert.equal(typeof e.word, "string", `${e.path}：词键在位`)
  }
  const fieldOf = (entry) => ({ path: entry.path, value: true, sensitive: false, kind: "boolean", slotAuthority: false })
  const body = desktopAgentView.agentBody({ state: "ready", fields: desktopAgentView.NAMED_FIELDS.map(fieldOf) }, {})
  for (const path of ["agent.injectDocs", "agent.injectMemories"]) {
    const row = rowNodeOf(body, path)
    assert.ok(row, `${path}：具名行落屏`)
    assert.equal(controlOf(row)?.props?.checked, true, `${path}：值 true ⇒ 勾选（默认装态）`)
  }
  const offBody = desktopAgentView.agentBody({ state: "ready", fields: [{ path: "agent.injectDocs", value: false, sensitive: false, kind: "boolean", slotAuthority: false }] }, {})
  assert.equal(controlOf(rowNodeOf(offBody, "agent.injectDocs"))?.props?.checked, undefined, "值 false ⇒ 不勾")
})

test("U9-B 桌面 i18n 两语键对等 ∥ 值逐字同 VSC 同键", () => {
  for (const key of ["settings.injectDocs", "settings.injectMemories"]) {
    assert.equal(typeof desktopDict.en[key], "string", `桌面 en 词键在场：${key}`)
    assert.equal(typeof desktopDict.zh[key], "string", `桌面 zh 词键在场：${key}`)
    assert.equal(desktopDict.en[key], EN_LOCALE[key], `${key}：en 值逐字同 VSC`)
    assert.equal(desktopDict.zh[key], ZH_LOCALE[key], `${key}：zh 值逐字同 VSC`)
  }
  assert.deepEqual(Object.keys(desktopDict.en).sort(), Object.keys(desktopDict.zh).sort(), "桌面两语键集相等")
})

test("U9-C 桌面 settings:agent patch：布尔写落盘 ∥ 非布尔拒 ∥ 默认装态 = 勾选（读面）", async () => {
  const base = sandbox("u9")
  const cfg = join(base, "config.json")
  writeFileSync(cfg, JSON.stringify({}, null, 2))
  _setConfigPathForTest(cfg)
  try {
    const desktopSettings = await mod("thincoder-desktop/src/main/settings.mjs")
    const disk = () => JSON.parse(readFileSync(cfg, "utf8"))
    const read0 = desktopSettings.settingsAgent({})
    assert.equal(read0.ok, true, "读面 ok")
    assert.equal(read0.fields.find((f) => f.path === "agent.injectDocs")?.value, true, "读面：缺省 = true（loadConfig 合并 ⇒ 面板默认勾选）")
    assert.equal(read0.fields.find((f) => f.path === "agent.injectMemories")?.value, true, "读面：缺省 = true（memories）")

    const w1 = desktopSettings.settingsAgent({ patch: { "agent.injectDocs": false } })
    assert.equal(w1.ok, true, "布尔 patch ⇒ ok")
    assert.equal(disk().agent?.injectDocs, false, "写盘落值 false")
    assert.equal(w1.fields.find((f) => f.path === "agent.injectDocs")?.value, false, "写后回读 = false")

    const before = readFileSync(cfg, "utf8")
    const bad = desktopSettings.settingsAgent({ patch: { "agent.injectDocs": "off" } })
    assert.equal(bad.ok, false, "非布尔 ⇒ 拒（核 `_checkKnownKeyValue` 类型表——DEFAULTS 派生）")
    assert.match(String(bad.reason), /expects boolean/, "拒因 = 类型表期望（boolean）")
    assert.equal(readFileSync(cfg, "utf8"), before, "拒写 ⇒ 零写盘")

    const w2 = desktopSettings.settingsAgent({ patch: { "agent.injectMemories": false } })
    assert.equal(w2.ok, true, "memories 布尔 patch ⇒ ok")
    assert.equal(disk().agent?.injectMemories, false, "写盘落值 false（memories）")
  } finally { _resetConfigPathForTest(); cleanup() }
})

/* ═══ U10 核 `settings` 工具写入面真链 ═══════════════════════════════════════ */

test("U10 settings 工具：set 两键 ⇒ 内存热应用 + 下次组装三块缺 ∥ 非布尔拒（零变）", async () => {
  try {
    const base = sandbox("u10")
    const proj = mkProj(base, "u10")
    const cfg = join(base, "config.json")
    const mem = newMemory(join(base, "m.db"), proj)
    seedDocs(mem, proj)
    await seedMemory(mem)

    const tool = settingsTool({ configPath: cfg })
    const agent = { cwd: proj, history: [], _pendingReminders: [], config: { agent: {} }, tools: [], memory: mem }
    const ctx = { agent }
    let out = await prepareRun(agent, QUERY, {}, { depth: 0 })
    assert.ok(hasRules(out, "u10") && hasBlock(agent, DOC_PREFIX) && hasBlock(agent, MEM_PREFIX), "前置：三块全在场（无键缺省）")

    const setDoc = await tool.execute({ action: "set", key: "agent.injectDocs", value: "false" }, ctx)
    assert.match(setDoc, /agent\.injectDocs = false \(boolean\)/, "工具回执 = JSON 值解析后布尔 + persisted + hot-applied")
    assert.equal(agent.config.agent.injectDocs, false, "内存活 config 热应用（本会话即热）")
    assert.equal(JSON.parse(readFileSync(cfg, "utf8")).agent.injectDocs, false, "盘面落值 false")
    await tool.execute({ action: "set", key: "agent.injectMemories", value: "false" }, ctx)
    assert.equal(agent.config.agent.injectMemories, false, "memories 内存热应用")

    const docBefore = countBlock(agent, DOC_PREFIX)
    const memBefore = countBlock(agent, MEM_PREFIX)
    assert.equal(docBefore, 1, "前置：首轮注入一份文档块（计数基线）")
    out = await prepareRun(agent, QUERY, {}, { depth: 0 })
    assert.equal(hasRules(out), false, "写入后组装：① 缺（systemPrompt 重建）")
    assert.equal(countBlock(agent, DOC_PREFIX), docBefore, "写入后组装：② 未新增（关 = 检索不执行 + 不注入）")
    assert.equal(countBlock(agent, MEM_PREFIX), memBefore, "写入后组装：③ 未新增")

    // 布尔护栏格：非布尔 ⇒ 抛错、磁盘 / 内存零变
    const diskBefore = readFileSync(cfg, "utf8")
    await assert.rejects(
      () => tool.execute({ action: "set", key: "agent.injectDocs", value: "off" }, ctx),
      /expects boolean/,
      "非布尔（off）⇒ `_checkKnownKeyValue` 抛错",
    )
    assert.equal(readFileSync(cfg, "utf8"), diskBefore, "护栏拒 ⇒ 磁盘零变")
    assert.equal(agent.config.agent.injectDocs, false, "护栏拒 ⇒ 内存零变")
  } finally { cleanup() }
})

/* ═══ U11 子代理装配 ═════════════════════════════════════════════════════════ */

test("U11 子代理：depth>0 + injectDocs=false ⇒ ① 缺（缺省 ⇒ ① 在；②③ 既受 depth-0 门）", async () => {
  try {
    const base = sandbox("u11")
    const proj = mkProj(base, "u11")
    const mem = newMemory(join(base, "m.db"), proj)
    seedDocs(mem, proj)
    await seedMemory(mem)

    const off = await drive(proj, mem, { cfgAgent: { injectDocs: false }, depth: 1 })
    assert.equal(hasRules(off.out), false, "子代理 + injectDocs=false ⇒ ① 缺（config 继承父 ⇒ 装配随开关）")
    assert.equal(hasBlock(off.agent, DOC_PREFIX) || hasBlock(off.agent, MEM_PREFIX), false, "②③ 既受 depth-0 门 ⇒ 子代理恒不注入（零变）")

    const on = await drive(proj, mem, { depth: 1 })
    assert.ok(hasRules(on.out, "u11"), "子代理缺省 ⇒ ① 在（「项目指令块不分 depth」零变）")

    // config 继承面结构核：子代理 config = 父 config（工程角色仅浅拷贝 + engineering:true）
    const spawn = text("thincoder-core/agent-tools/subagent-spawn.mjs")
    assert.match(spawn, /const childConfig = engineeringRole[\s\S]{0,240}: parent\.config/, "spawn 链继承面在位（childConfig = parent.config）")
  } finally { cleanup() }
})

/* ═══ 结构自检：三端界面键位一致（词键对等）═════════════════════════════════ */

test("UI 键位自检：三端两键同形（CLI 词 / 桌面词键 / VSC 词键）", () => {
  const cli = text("thincoder-cli/src/tui/cmd-config.mjs")
  assert.match(cli, /agent\.injectDocs = \$\{ac\.injectDocs !== false \? "on" : "off"\}（文档注入——项目指令文件 \+ 相关文档——默认开）/, "CLI：injectDocs 菜单行（判据 `!== false`）")
  assert.match(cli, /agent\.injectMemories = \$\{ac\.injectMemories !== false \? "on" : "off"\}（记忆注入——往期相关记忆召回——默认开）/, "CLI：injectMemories 菜单行")
  const coreSetup = text("thincoder-core/agent/setup.mjs")
  assert.match(coreSetup, /const injectDocs = agent\.config\?\.agent\?\.injectDocs !== false/, "核判点：injectDocs 判据 `!== false`")
  assert.match(coreSetup, /const injectMemories = agent\.config\?\.agent\?\.injectMemories !== false/, "核判点：injectMemories 判据 `!== false`")
  assert.match(coreSetup, /const projectRules = injectDocs \? await loadProjectInstructions\(agent\.cwd\) : null/, "① 判点：关 ⇒ 调用不执行（helper 签名零改）")
  assert.match(coreSetup, /if \(injectDocs\) \{/, "② 判点在场")
  assert.match(coreSetup, /if \(injectMemories\) \{/, "③ 判点在场")
  const coreConfig = text("thincoder-core/config.mjs")
  assert.match(coreConfig, /injectDocs: true,\n\s*injectMemories: true,/, "DEFAULTS：两键默认 true（settings 类型面 ∥ list 面派生）")
})
