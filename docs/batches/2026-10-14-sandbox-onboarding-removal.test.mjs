/**
 * 2026-10-14-sandbox-onboarding-removal.test.mjs — thincoder-server 批内单测件（`sandbox-onboarding-removal` 批 ·
 * 任务式装机（托管接入）退场——产品码面删净自证）。名随批档 · 住 `docs/batches/` · 不入仓套件 · 随批留存。
 * 运行（自 `thincoder/` 仓根）：`node --import ./thincoder-server/test/rc-resolve.mjs --test docs/batches/2026-10-14-sandbox-onboarding-removal.test.mjs`
 *
 * 射程（判据源 = 批档 §2「本批条目」+ `sandbox/SANDBOX.md` §16 R87② 删码清单）：
 *   ① 两服务件删净（整档不可 import ∥ 仓内零引用）
 *   ② `routes.mjs` 零 onboarding 注册（子族端点数 36 ∥ 路径面零命中 ∥ 导出面独件）
 *   ③ `tools.mjs` 掩蔽单源存续（导出面 = `maskSecrets` 独件 + 掩蔽行为）
 *   ④ `run.mjs` 共享件存续（五件；任务面两件 `runAgentTask`/`buildModelExit` 已删）
 *   ⑤ UI 面零残留（`views-sandbox.mjs` 源 ∥ i18n 两表键面 ∥ `admin.sandbox.*` 全域引用闭合）
 *   ⑥ 表 `sandbox_onboarding` 停机留史（新库在表 18 列 ∥ 仓内零读写面）
 *   ⑦ 扫描闸（`src` + `public` 全域：`onboarding|onboard|托管接入` 余项 = migrations.mjs 表史 12 处）
 *   ⑧ 审计面：`views-audit.mjs` kind 映射 ↔ 两表 `audit.sandboxKind.*` 键集双向闭合（零 onboarding ∥ 主机凭据两键在册）
 */
import test from "node:test"
import assert from "node:assert/strict"
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import { pathToFileURL } from "node:url"

const ROOT = process.cwd()
if (!existsSync(join(ROOT, "thincoder-server"))) throw new Error(`须从仓库根（thincoder/）运行——cwd = ${ROOT}`)
const SERVER_DIR = join(ROOT, "thincoder-server")
const load = (rel) => import(pathToFileURL(join(SERVER_DIR, rel)).href)
const readServer = (rel) => readFileSync(join(SERVER_DIR, rel), "utf8")

// 桩（`dom.mjs` 顶层触 `document`——先桩后 import；本件不调渲染函数）
globalThis.document = { getElementById: () => null }

const PATTERN = /onboarding|onboard|托管接入/i

/** 收录 `src` ∥ `public` 全域文本档（`.mjs`/`.css`/`.html`）。 */
function walkText(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walkText(path, out)
    else if (/\.(mjs|css|html)$/.test(name)) out.push(path)
  }
  return out
}

/** 逐行命中（`{ file, line, text }`）。 */
function scan(pattern, dirs = [join(SERVER_DIR, "src"), join(SERVER_DIR, "public")]) {
  const hits = []
  for (const file of dirs.flatMap((dir) => walkText(dir))) {
    const text = readFileSync(file, "utf8")
    text.split("\n").forEach((line, index) => {
      if (pattern.test(line)) hits.push({ file: relative(SERVER_DIR, file).replace(/\\/g, "/"), line: index + 1, text: line.trim() })
    })
  }
  return hits
}

// ── ① 两服务件删净 ──────────────────────────────────────────────────────────

test("① 两服务件删净：整档不可 import ∥ 仓内（src/public/bin/test）零引用", async () => {
  await assert.rejects(import(pathToFileURL(join(SERVER_DIR, "src/sandbox/onboarding.mjs")).href), "`onboarding.mjs` 应已删（整档）")
  await assert.rejects(import(pathToFileURL(join(SERVER_DIR, "src/sandbox/onboarding-routes.mjs")).href), "`onboarding-routes.mjs` 应已删（整档）")
  const dirs = ["src", "public", "bin", "test"].map((name) => join(SERVER_DIR, name))
  const hits = scan(/sandbox\/onboarding(?:-routes)?\.mjs/, dirs)
  assert.deepEqual(hits, [], `被删两档仍被引用：${JSON.stringify(hits)}`)
  const routesSrc = readServer("src/sandbox/routes.mjs")
  assert.ok(!/onboarding/i.test(routesSrc), "`routes.mjs` 零 onboarding 面残留（注释/import/注册）")
})

// ── ② routes 零 onboarding 注册（端点数 + 导出面）──────────────────────────────

test("② `registerSandboxRoutes` 零 onboarding 注册：子族端点数 36 ∥ 路径面零命中 ∥ 导出面独件", async () => {
  const DB = await load("src/store/db.mjs")
  const SERVER = await load("src/gateway/server.mjs")
  const ROUTES = await load("src/sandbox/routes.mjs")
  assert.deepEqual(Object.keys(ROUTES), ["registerSandboxRoutes"], "导出面独件（任务式注册入口不留）")
  const db = DB.openDatabase(":memory:")
  const routes = SERVER.createRouteTable()
  const added = []
  const wrapped = { ...routes, add: (method, path, handler) => { added.push(`${method} ${path}`); return routes.add(method, path, handler) } }
  ROUTES.registerSandboxRoutes(wrapped, { db })
  assert.equal(added.length, 36, "沙盒子族端点数（36——四端点族退场后）")
  assert.deepEqual(added.filter((entry) => /onboarding/i.test(entry)), [], "零 onboarding 路径注册")
  assert.deepEqual(added.filter((entry) => /\/credential$/.test(entry)).sort(), ["DELETE /api/admin/sandbox/runners/:id/credential", "PUT /api/admin/sandbox/runners/:id/credential"], "主机凭据两端点存续（留守面）")
})

// ── ③ tools.mjs 掩蔽单源 ─────────────────────────────────────────────────────

test("③ `tools.mjs`：导出面 = `maskSecrets` 独件（五工具/步进 id 删净）∥ 掩蔽行为逐值", async () => {
  const TOOLS = await load("src/agent/tools.mjs")
  assert.deepEqual(Object.keys(TOOLS), ["maskSecrets"], "导出面独件（任务面五工具与 STEP_IDS 不留）")
  const secret = "sk-secret-1234"
  assert.equal(TOOLS.maskSecrets(`cmd --key ${secret} done`, [secret]), "cmd --key *** done", "长秘密全文掩蔽")
  assert.equal(TOOLS.maskSecrets("plain text", [null, "ab"]), "plain text", "短值/非串不掩（防误伤）")
  assert.equal(TOOLS.maskSecrets(null, []), "", "空值归一空串")
})

// ── ④ run.mjs 共享件存续 ─────────────────────────────────────────────────────

test("④ `run.mjs`：共享五件存续 ∥ 任务面两件已删（值逐值）", async () => {
  const RUN = await load("src/agent/run.mjs")
  assert.deepEqual(Object.keys(RUN).sort(), ["DEFAULT_MAX_CALLS", "DEFAULT_MAX_DURATION_MS", "TRIMMED_FACES", "loadCoreChat", "providerModelRefs"], "导出面 = 共享五件")
  assert.equal(RUN.DEFAULT_MAX_CALLS, 60, "预算常量（调用 60）")
  assert.equal(RUN.DEFAULT_MAX_DURATION_MS, 20 * 60 * 1000, "预算常量（时长 20 分钟）")
  assert.ok(Array.isArray(RUN.TRIMMED_FACES) && !RUN.TRIMMED_FACES.includes("mcp"), "裁剪面清单在册（mcp 已解裁）")
  assert.equal(typeof RUN.loadCoreChat, "function", "核装载存续（chat 面复用）")
  assert.equal(RUN.providerModelRefs([{ name: "p", models: [{ name: "m" }] }])[0], "p/m", "providerModelRefs 取件形（provider/model）")
  assert.equal(RUN.providerModelRefs([{ name: "p", models: [{ name: "m", alias: "alias" }] }])[0], "alias", "providerModelRefs 别名优先")
  assert.equal(RUN.runAgentTask, undefined, "任务面 `runAgentTask` 已删")
  assert.equal(RUN.buildModelExit, undefined, "任务面 `buildModelExit` 已删")
})

// ── ⑤ UI 面零残留（源 + 键面 + 键覆盖）────────────────────────────────────────

test("⑤ UI 面：`views-sandbox.mjs` 源零命中 ∥ i18n 两表零 onboarding 键 ∥ `admin.sandbox.*` 全域引用键闭合", async () => {
  const viewSrc = readServer("public/views-sandbox.mjs")
  assert.ok(!/onboarding|托管接入/i.test(viewSrc), "`views-sandbox.mjs` 零「托管接入」钮/弹窗/任务区残留")
  const { ZH } = await load("public/i18n-zh.mjs")
  const { EN } = await load("public/i18n-en.mjs")
  for (const [lang, TABLE] of [["zh", ZH], ["en", EN]]) {
    const onboardingKeys = Object.keys(TABLE).filter((key) => /onboarding/i.test(key))
    assert.deepEqual(onboardingKeys, [], `${lang} 表 onboarding 族键删净`)
    for (const key of ["admin.sandbox.hostCredPort", "admin.sandbox.hostCredUser"]) assert.equal(typeof TABLE[key], "string", `${lang} 表凭据面对键在册：${key}`)
  }
  // `admin.sandbox.*` 全域字面引用（含 `field(h, "键", …)` ∥ `t("键")` 两形）⇒ 两表在册（删错键 = 欠账即红）
  const PUB = join(SERVER_DIR, "public")
  const consumers = readdirSync(PUB).filter((name) => name.endsWith(".mjs") && !name.startsWith("i18n-"))
  assert.ok(consumers.length > 10, `消费面扫件数非空（现 ${consumers.length}）`)
  let literalCount = 0
  for (const name of consumers) {
    const src = readFileSync(join(PUB, name), "utf8")
    const literalKeys = new Set([...src.matchAll(/"(admin\.sandbox\.[A-Za-z0-9_.]+)"/g)].map((match) => match[1]))
    for (const key of literalKeys) {
      literalCount += 1
      assert.equal(typeof ZH[key], "string", `${name} 引用键缺于 zh 表：${key}`)
      assert.equal(typeof EN[key], "string", `${name} 引用键缺于 en 表：${key}`)
    }
  }
  assert.ok(literalCount > 40, `引用键字面计数非空（现 ${literalCount}）`)
})

// ── ⑥ 表停机留史 ─────────────────────────────────────────────────────────────

test("⑥ 表 `sandbox_onboarding` 停机留史：新库在表（18 列）∥ 仓内零读写面", async () => {
  const DB = await load("src/store/db.mjs")
  const db = DB.openDatabase(":memory:")
  const names = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name)
  assert.ok(names.includes("sandbox_onboarding"), "表在表（零迁移——建表史原样）")
  assert.equal(db.prepare("PRAGMA table_info(sandbox_onboarding)").all().length, 18, "列面 18（v18 段重建后原样）")
  const hits = scan(/sandbox_onboarding/, [join(SERVER_DIR, "src")]).filter((hit) => hit.file !== "src/store/migrations.mjs")
  assert.deepEqual(hits, [], `表读写面应只在建表史（migrations.mjs）：${JSON.stringify(hits)}`)
})

// ── ⑦ 扫描闸（验收① 机检面）─────────────────────────────────────────────────

test("⑦ 扫描闸：`src` + `public` 全域 `onboarding|onboard|托管接入` 余项 = migrations.mjs 表史 12 处", () => {
  const hits = scan(PATTERN)
  const outside = hits.filter((hit) => hit.file !== "src/store/migrations.mjs")
  assert.deepEqual(outside, [], `活面残留（仅建表史/停机留史注合法）：${JSON.stringify(outside)}`)
  assert.equal(hits.length, 12, `建表史命中 12 处（现 ${hits.length}）`)
})

// ── ⑧ 审计面（kind 映射 ↔ 两表键集双向闭合）──────────────────────────────────

test("⑧ 审计面：`views-audit.mjs` kind 映射 ↔ 两表 `audit.sandboxKind.*` 双向闭合 ∥ 映射零 onboarding ∥ 主机凭据两键在册", async () => {
  const src = readServer("public/views-audit.mjs")
  const mapKeys = [...new Set([...src.matchAll(/"audit\.sandboxKind\.([A-Za-z0-9_]+)"/g)].map((match) => match[1]))]
  assert.deepEqual(mapKeys.filter((key) => /^onboarding/.test(key)), [], "映射零 onboarding_* 行（五 kind 删净）")
  for (const key of ["host_credential_set", "host_credential_revoke"]) assert.equal(mapKeys.includes(key), true, `主机凭据留守键在册：${key}`)
  const { ZH_SYSTEM } = await load("public/i18n-zh-system.mjs")
  const { EN_SYSTEM } = await load("public/i18n-en-system.mjs")
  for (const [lang, TABLE] of [["zh", ZH_SYSTEM], ["en", EN_SYSTEM]]) {
    const tableKeys = [...new Set(Object.keys(TABLE).filter((key) => key.startsWith("audit.sandboxKind.")).map((key) => key.slice("audit.sandboxKind.".length)))]
    assert.deepEqual(tableKeys.sort(), [...mapKeys].sort(), `${lang} 表 kind 键集 = 映射键集（双向闭合——漏映/悬空同红）`)
  }
})
