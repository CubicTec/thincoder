/**
 * 2026-10-14-sandbox-egress-removal.test.mjs — thincoder-server 批内单测件（`sandbox-egress-removal` 批 · 沙盒出站闸整套摘除——
 * 删净面 + 收窄面七腿；名随批档 · 住 `docs/batches/` · 不入仓套件 · 随批留存）。
 * 运行（自 `thincoder/` 仓根）：`node --test docs/batches/2026-10-14-sandbox-egress-removal.test.mjs`
 *
 * 腿（判据源 = 批档 §2 测试随正清单末行 ∥ 删净判据 1–6）：
 *   ① 两档删净（闸面两批内件）+ 判据 1 四面零 `egress`/`dns-gate` 引用
 *   ② 建盒链步名表 6 无 ③ ∥ 容器载荷零 `Dns` ∥ 网络创建零桥名 Options（真链跑一遍）
 *   ③ 端点面 −6（规则四 ∥ 待批二——逐 `routes.add` 计数）
 *   ④ 成员行无 `pending`（行形逐键）∥ me 表 −2 键/表（两表同构）
 *   ⑤ 两表（`sandbox_rules` ∥ `sandbox_pending`）零读写面——仅 `src/store/migrations.mjs` 建表史
 *   ⑥ 审计映射撤净（本批 −2：`egress_apply_failed` + `approval`）∥ 三面闭合（`sandboxKind` 映射 ≡ zh ≡ en）
 *   ⑦ 扫描闸：删净判据 1/2/4/5 逐条（判据 3 = 腿 ⑤）
 * 假件口径：Docker = 注入 `clientForRunner`（逐条记录 op/body）∥ SSH = 注入 `host`（逐条记录 command）；内存库 ∥ 零网络。
 */
import test from "node:test"
import assert from "node:assert/strict"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"

const ROOT = process.cwd()
if (!existsSync(join(ROOT, "thincoder-server"))) throw new Error(`须从仓库根（thincoder/）运行——cwd = ${ROOT}`)
const SERVER = join(ROOT, "thincoder-server")
const load = (rel) => import(pathToFileURL(join(ROOT, rel)).href)
const publicFile = (name) => readFileSync(join(SERVER, "public", name), "utf8")

const DB = await load("thincoder-server/src/store/db.mjs")
const BOX = await load("thincoder-server/src/sandbox/box.mjs")
const SANDBOX = await load("thincoder-server/src/sandbox/routes.mjs")
const SESSION = await load("thincoder-server/src/accounts/session.mjs")
const REGISTRY = await load("thincoder-server/src/sandbox/registry.mjs")
const QUOTA = await load("thincoder-server/src/sandbox/quota.mjs")

const NOW = 1_770_000_000_000
const CONFIG = { host: "10.0.0.5", port: 3000 }

// ── 扫描面（代码域文本件——`node_modules`/`.git`/`data` 略；判据 1/2/4/5 逐条）────

const SKIP_DIRS = new Set(["node_modules", ".git", "data"])
const BINARY_EXT = /\.(db|db-wal|db-shm|png|jpe?g|gif|ico|gz|tgz|tar|zip|woff2?|ttf|pdf)$/i

/** 递归收代码域文本件（`rel` = `.` ⇒ `thincoder-server` 全域）。 */
function codeFiles(rel) {
  const out = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(path)
        continue
      }
      if (!BINARY_EXT.test(entry.name)) out.push(path)
    }
  }
  walk(join(SERVER, rel))
  return out
}

/** 命中面（逐行扫——出 `<相对路径>:<行号>: <行>`；判据 grep 的命令等价物）。 */
function hits(files, pattern) {
  const out = []
  for (const file of files) {
    readFileSync(file, "utf8").split("\n").forEach((line, index) => {
      if (pattern.test(line)) out.push(`${file.slice(SERVER.length + 1).replace(/\\/g, "/")}:${index + 1}: ${line.trim()}`)
    })
  }
  return out
}

// ── 夹具（库种子 ∥ 假主机 ∥ 假 Docker 客户端）────────────────────────────────

/** 库种子（成员 ∥ 节点 ∥ 工作区——列面 = 现行段；零闸/待批行）。 */
function seedDb({ bound = true } = {}) {
  const db = DB.openDatabase(":memory:")
  const created = new Date(NOW).toISOString()
  db.prepare("INSERT INTO members (username, name, password_hash, role, created_at) VALUES ('root','管理员','h','admin',?)").run(created)
  db.prepare("INSERT INTO api_keys (member_id, key_hash, key_hint, status, created_at) VALUES (1,'KH','sk-tc-1','active',?)").run(created)
  db.prepare("INSERT INTO sandbox_runners (name, address, status, runtime_json, created_at) VALUES ('node-a','http://10.0.0.9:2375','active','{}',?)").run(created)
  db.prepare(`INSERT INTO sandbox_workspaces (name, owner_member_id, key_id, key_plain, runner_id, limits_json, created_at)
    VALUES ('ws-1', 1, 1, 'sk-tc-plain', ${bound ? 1 : "NULL"}, '{}', ?)`).run(created)
  return db
}

/** 假主机面（SSH——逐条记录 command；配额径读数 = xfs + pquota）。 */
function fakeHost(workspaceId) {
  const calls = []
  const stdoutOf = (command) => {
    if (command.includes("findmnt")) return "/ xfs rw,pquota\n"
    if (command.includes("bsize=")) return "bsize=4096\n"
    if (command.includes("report -p -b -n")) return `${QUOTA.PROJECT_ID_BASE + workspaceId} 0 0 ${(REGISTRY.DEFAULT_SETTINGS.diskMb * 1024 * 1024) / 4096} 0 [------]\n`
    return ""
  }
  const call = async (row, command) => {
    calls.push({ command })
    return { exitCode: 0, stdout: stdoutOf(command), stderr: "" }
  }
  return { calls, call, run: call, execOf: () => (command) => call(null, command) }
}

/** 假 Docker 客户端（盒链直调面——同名法：containers/createNetwork/inspectNetwork/createContainer/startContainer）。 */
function fakeClient() {
  const calls = []
  const state = { containers: [], network: null }
  return {
    calls,
    state,
    containers: async () => ({ json: state.containers }),
    createNetwork: async (body) => {
      calls.push({ op: "createNetwork", body })
      state.network = { Name: body.Name, Driver: body.Driver, IPAM: { Config: [{ Subnet: "172.31.9.0/24" }] } }
      return { json: { Id: "net-1" } }
    },
    inspectNetwork: async (name) => {
      calls.push({ op: "inspectNetwork", name })
      if (state.network === null) throw Object.assign(new Error("network not found"), { status: 404 })
      return { json: state.network }
    },
    createContainer: async (name, body) => {
      calls.push({ op: "createContainer", name, body })
      state.containers.push({ Id: "c1", Names: [`/${name}`], State: "created" })
      return { json: { Id: "c1" } }
    },
    startContainer: async (ref) => {
      calls.push({ op: "startContainer", ref })
      return { json: {} }
    },
  }
}

function makeReq(token) {
  return {
    headers: { cookie: `tc_session=${token}`, "content-type": "application/json" },
    readableEnded: false,
    on(event, cb) {
      if (event === "end") cb()
      return this
    },
    off() {
      return this
    },
    resume() {},
  }
}

function makeRes() {
  const out = { status: null, payload: null }
  return {
    out,
    res: {
      headersSent: false,
      writeHead(status) {
        out.status = status
      },
      end(text) {
        out.payload = text === undefined || text === "" ? null : JSON.parse(text)
      },
    },
  }
}

// ── ① 两档删净 + 判据 1 四面零引用 ──────────────────────────────────────────

test("① 两档删净：闸面两批内件不存 ∥ 判据 1 四面零 `egress`/`dns-gate` 引用", () => {
  for (const name of ["2026-10-13-sandbox-exec-rebuild-egress.test.mjs", "2026-10-14-egress-probe-fix.test.mjs"]) {
    assert.equal(existsSync(join(ROOT, "docs", "batches", name)), false, `闸面批内件仍在：${name}`)
  }
  const alive = hits(["src", "bin", "deploy", "public"].flatMap((dir) => codeFiles(dir)), /egress|dns[-_]?gate/i)
  assert.deepEqual(alive, [], `判据 1 四面仍有出站闸引用：\n${alive.join("\n")}`)
})

// ── ② 建盒链（步名表 ∥ 载荷 ∥ 网络选项）──────────────────────────────────────

test("② 建盒链步 6（无 ③）∥ 载荷零 `Dns` ∥ 网络创建零桥名 Options（真链一遍：零闸面外呼）", async () => {
  assert.deepEqual(
    BOX.BOX_CHAIN_STEPS,
    ["① 卷目录准备", "② 配额就位", "④ 镜像就位", "⑤ 网络", "⑥ 容器", "⑦ 启动"],
    "步名表（6 步——③ 闸复核已退场）",
  )
  const db = seedDb()
  const workspace = db.prepare("SELECT * FROM sandbox_workspaces WHERE id = 1").get()
  const runner = db.prepare("SELECT * FROM sandbox_runners WHERE id = 1").get()
  const host = fakeHost(workspace.id)
  const client = fakeClient()
  const result = await BOX.createWorkspaceBox(db, workspace, runner, { db, config: CONFIG, now: () => NOW, host, clientForRunner: () => client, log: null })
  assert.equal(result.workspaceId, workspace.id, "链未跑通")
  // ① 卷目录（两条——`mkdir -p` ∥ `chown 1000:1000`；路径随 `DEFAULT_SETTINGS.workspaceRoot`）；零 nft/探针外呼
  const expectedPath = `${REGISTRY.DEFAULT_SETTINGS.workspaceRoot}/${workspace.id}`
  assert.deepEqual(host.calls.slice(0, 2).map((item) => item.command), [`mkdir -p ${expectedPath}`, `chown 1000:1000 ${expectedPath}`])
  assert.equal(host.calls.some((item) => /nft|command -v/.test(item.command)), false, `闸面外呼仍在：${host.calls.map((item) => item.command).join(" ∥ ")}`)
  // ⑤ 网络：载荷逐键 = `{ Name, Driver }`——零桥名 Options
  const networkCall = client.calls.find((item) => item.op === "createNetwork")
  assert.deepEqual(networkCall.body, { Name: "tc-ws-1", Driver: "bridge" }, "网络载荷逐键（零 Options）")
  assert.ok(client.calls.some((item) => item.op === "inspectNetwork"), "网络读回复核未命中")
  assert.equal(JSON.stringify(client.calls).includes("bridge.name"), false, "桥名 Options 仍在")
  assert.equal(JSON.stringify(client.calls).includes("tcws"), false, "桥名锚仍在")
  // ⑥ 容器载荷：零 `Dns`（盒走 docker 缺省解析）
  const created = client.calls.find((item) => item.op === "createContainer")
  assert.equal(Object.hasOwn(created.body.HostConfig, "Dns"), false, "载荷仍携 Dns 注入")
  assert.equal(JSON.stringify(created.body).includes("Dns"), false, "载荷仍携 Dns 注入")
  assert.equal(created.body.HostConfig.NetworkMode, "tc-ws-1", "网络模式逐值")
  assert.deepEqual(created.body.Env.map((line) => line.split("=")[0]), ["OPENAI_BASE_URL", "OPENAI_API_KEY", "TC_SERVER_URL", "HOME"], "盒 env 四键保持")
  db.close()
})

// ── ③ 端点面 −6 ─────────────────────────────────────────────────────────────

const DEAD_ENDPOINTS = [
  "GET /api/admin/sandbox/rules",
  "POST /api/admin/sandbox/rules",
  "PATCH /api/admin/sandbox/rules/:id",
  "DELETE /api/admin/sandbox/rules/:id",
  "GET /api/admin/sandbox/pending",
  "POST /api/admin/sandbox/pending/:id/resolve",
]

test("③ 端点面 −6：规则四 ∥ 待批二全无 ∥ 逐 `routes.add` 计数 = 30（前值 36）", () => {
  const db = seedDb({ bound: false })
  const routes = { keys: [], add(method, path) { this.keys.push(`${method} ${path}`) } }
  SANDBOX.registerSandboxRoutes(routes, { db, config: CONFIG, log: null, now: () => NOW })
  for (const dead of DEAD_ENDPOINTS) assert.equal(routes.keys.includes(dead), false, `退场端点仍在：${dead}`)
  assert.deepEqual(routes.keys.filter((key) => /\/rules|\/pending/.test(key)), [], "规则/待批词面端点未清")
  assert.equal(routes.keys.length, 30, "端点总数（−6 后 = 30）")
  for (const alive of ["GET /api/admin/sandbox/overview", "GET /api/me/sandbox/workspaces", "POST /api/admin/sandbox/runners/:id/containers"]) {
    assert.ok(routes.keys.includes(alive), `留守端点缺位：${alive}`)
  }
  db.close()
})

// ── ④ 成员行无 `pending` + me 表 −2 键/表 ───────────────────────────────────

test("④ 成员行逐键无 `pending` ∥ me 表 −2 键/表（14 键同构）", async () => {
  const db = seedDb({ bound: false }) // 未绑 ⇒ 零引擎外呼
  const map = new Map()
  SANDBOX.registerSandboxRoutes({ add: (method, path, handler) => map.set(`${method} ${path}`, handler) }, { db, config: CONFIG, log: null, now: () => NOW })
  const { token } = SESSION.createSession(db, 1) // 会话用真钟（`resolveSession` 无 now 注入面）
  const { res, out } = makeRes()
  await map.get("GET /api/me/sandbox/workspaces")(makeReq(token), res, { params: {} })
  assert.equal(out.status, 200, `成员面读数失败：${JSON.stringify(out.payload)}`)
  const row = out.payload.workspaces[0]
  assert.deepEqual(Object.keys(row).sort(), ["boxState", "checkpointCount", "id", "name", "runnerName", "stopReason"], "成员行逐键（六键——零 `pending`）")
  assert.equal(JSON.stringify(out.payload).includes("pending"), false, "成员面仍出 `pending`")
  const zhMe = (await load("thincoder-server/public/i18n-zh-me.mjs")).ZH_ME
  const enMe = (await load("thincoder-server/public/i18n-en-me.mjs")).EN_ME
  for (const [lang, table] of [["zh", zhMe], ["en", enMe]]) {
    assert.equal("me.sandbox.colPending" in table, false, `${lang} 表退场键仍在：me.sandbox.colPending`)
    assert.equal("me.sandbox.pending" in table, false, `${lang} 表退场键仍在：me.sandbox.pending`)
  }
  const zhKeys = Object.keys(zhMe).filter((key) => key.startsWith("me.sandbox."))
  const enKeys = Object.keys(enMe).filter((key) => key.startsWith("me.sandbox."))
  assert.equal(zhKeys.length, 14, "me 表键数（−2 后 = 14）")
  assert.deepEqual(zhKeys, enKeys, "两表不同构")
  db.close()
})

// ── ⑤ 两表零读写面（建表史白名单）───────────────────────────────────────────

test("⑤ 两表仅建表史：`sandbox_rules`/`sandbox_pending` 命中面 ⊆ `src/store/migrations.mjs`", () => {
  const hitsAll = hits(codeFiles("src"), /sandbox_pending|sandbox_rules/)
  const files = [...new Set(hitsAll.map((line) => line.slice(0, line.indexOf(":"))))]
  assert.deepEqual(files, ["src/store/migrations.mjs"], `两表词面越出建表史：\n${hitsAll.join("\n")}`)
  const migrations = readFileSync(join(SERVER, "src/store/migrations.mjs"), "utf8")
  for (const table of ["sandbox_rules", "sandbox_pending"]) {
    assert.ok(migrations.includes(`CREATE TABLE IF NOT EXISTS ${table} (`), `建表史缺 DDL：${table}`)
  }
  assert.ok(migrations.includes("INSERT INTO sandbox_rules ("), "种子史行未留（停机留史 = DDL/种子全留）")
})

// ── ⑥ 审计映射撤净（−2）+ 三面闭合 ─────────────────────────────────────────

test("⑥ 审计映射撤净（本批 −2：`egress_apply_failed` + `approval`）∥ 映射 ≡ zh ≡ en（34 条闭合）", async () => {
  const auditSrc = publicFile("views-audit.mjs")
  const zhSystem = (await load("thincoder-server/public/i18n-zh-system.mjs")).ZH_SYSTEM
  const enSystem = (await load("thincoder-server/public/i18n-en-system.mjs")).EN_SYSTEM
  const mapped = [...new Set([...auditSrc.matchAll(/"audit\.sandboxKind\.([a-z_]+)"/g)].map((match) => match[1]))].sort()
  assert.ok(mapped.length > 0, "映射面未命中")
  assert.equal(mapped.includes("egress_apply_failed"), false, "退场 kind 仍在映射")
  const keysOf = (table) => Object.keys(table).filter((key) => key.startsWith("audit.sandboxKind.")).map((key) => key.slice("audit.sandboxKind.".length)).sort()
  const zhKeys = keysOf(zhSystem)
  const enKeys = keysOf(enSystem)
  assert.deepEqual(mapped, zhKeys, "映射 vs zh 表不闭合")
  assert.deepEqual(zhKeys, enKeys, "zh vs en 不闭合")
  assert.equal(mapped.length, 34, "映射条数（本批 −2 后 = 34）")
})

// ── ⑦ 扫描闸（判据 1/2/4/5 逐条）─────────────────────────────────────────────

test("⑦ 扫描闸：判据 1/2/4/5 逐条零命中（判据 3 = 腿 ⑤）", () => {
  // 判据 1：`thincoder-server/{src,bin,deploy,public}` 零 `egress|dns[-_]?gate`（大小写不敏感）
  const face = ["src", "bin", "deploy", "public"].flatMap((dir) => codeFiles(dir))
  const one = hits(face, /egress|dns[-_]?gate/i)
  assert.deepEqual(one, [], `判据 1 未净：\n${one.join("\n")}`)
  // 判据 2：名称面三行（`src`）
  const src = codeFiles("src")
  for (const [label, pattern] of [
    ["求值/下发族", /evaluateEgress|ensureEgressApplied|dispatchEgressAll|pushEgressRuleset/],
    ["规则/待批族", /HARD_DENY_CIDRS|markPending|sweepPendingTimeouts|resolvePending|listPending/],
    ["持答/带入族", /openPendingOf|importSegmentDenies/],
  ]) {
    const found = hits(src, pattern)
    assert.deepEqual(found, [], `判据 2 未净（${label}）：\n${found.join("\n")}`)
  }
  // 判据 4 / 5：`thincoder-server` 全域零键面
  const all = codeFiles(".")
  const four = hits(all, /egressEnforce|pendingTimeoutSeconds/)
  assert.deepEqual(four, [], `判据 4 未净：\n${four.join("\n")}`)
  const five = hits(all, /egress_apply_failed/)
  assert.deepEqual(five, [], `判据 5 未净：\n${five.join("\n")}`)
})
