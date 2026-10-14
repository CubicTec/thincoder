/**
 * 2026-10-13-sandbox-outbound-member-face.test.mjs — thincoder-server 批内单测件（`sandbox-outbound-member-face` 批 · 服务面：
 * 成员端点 `runnerName`（闸面九腿随 sandbox-egress-removal 批整套摘除删——2026-10-14 随正）；名随批档 · 住 `docs/batches/` · 不入仓套件 · 随批留存）。
 * 运行（自 `thincoder/` 仓根）：`node --test docs/batches/2026-10-13-sandbox-outbound-member-face.test.mjs`
 *
 * 射程（判据源 = 批档 §2）：成员端点 `runnerName`（绑定 ⇒ 节点名 ∥ 未绑定 ⇒ null）∥ 恒本人过滤（他人工作区零出现）。
 * 假引擎 = 真 HTTP 假 Docker（真 fetch 链）；链路 = 进程内网关 + 账号面 + 沙盒面。
 */
import test from "node:test"
import assert from "node:assert/strict"
import { existsSync, mkdtempSync } from "node:fs"
import { createServer } from "node:http"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"

const ROOT = process.cwd()
if (!existsSync(join(ROOT, "thincoder-server"))) throw new Error(`须从仓库根（thincoder/）运行——cwd = ${ROOT}`)
const load = (rel) => import(pathToFileURL(join(ROOT, rel)).href)

const DB = await load("thincoder-server/src/store/db.mjs")
const CONFIG = await load("thincoder-server/src/ops/config.mjs")
const SERVER = await load("thincoder-server/src/gateway/server.mjs")
const SANDBOX = await load("thincoder-server/src/sandbox/routes.mjs")
const DOCKER = await load("thincoder-server/src/sandbox/docker.mjs")
const MEMBERS = await load("thincoder-server/src/accounts/members.mjs")
const ACCOUNT_ROUTES = await load("thincoder-server/src/accounts/routes.mjs")
const SESSION = await load("thincoder-server/src/accounts/session.mjs")

const PASSWORD = "password-123"
const TEMP = mkdtempSync(join(tmpdir(), "tc-outbound-"))
const SERVER_HOST = "10.0.0.5" // 服务器段取值点 = 盒 env `OPENAI_BASE_URL` 地址（`sandboxPublicBase`——config.host/port）
const SERVER_PORT = 3000

// ── 假 Docker 引擎（真 HTTP——真 fetch 链；自检两读在案）────────────────────────

async function startFakeDocker() {
  const version = { Version: "29.1.3", ApiVersion: "1.52", MinAPIVersion: "1.44", Os: "linux", Arch: "amd64" }
  const calls = []
  const server = createServer((req, res) => {
    const chunks = []
    req.on("data", (chunk) => chunks.push(chunk))
    req.on("end", () => {
      const url = new URL(req.url, "http://engine")
      calls.push({ method: req.method, path: url.pathname })
      const json = (status, payload) => {
        res.writeHead(status, { "content-type": "application/json" })
        res.end(JSON.stringify(payload))
      }
      const p = url.pathname.replace(/^\/v?[0-9.]+/, "") || "/"
      if (p === "/version") return json(200, version)
      if (p === "/info") return json(200, { ServerVersion: version.Version, Containers: 0, ContainersRunning: 0 })
      return json(404, { message: `unknown path ${url.pathname}` }) // 容器列表（删节点 keep 径）/collect ⇒ 不可达判据
    })
  })
  await new Promise((resolve, reject) => {
    server.once("error", reject)
    server.listen(0, "127.0.0.1", resolve)
  })
  return {
    base: `http://127.0.0.1:${server.address().port}`,
    calls,
    async close() {
      server.closeAllConnections?.()
      await new Promise((resolve) => server.close(resolve))
    },
  }
}

// ── 盒链假件（建工作区走建盒链——SSH = 逐条记录 ∥ Docker = 注入客户端；2026-10-14 随正）──────────

const NOW = 1_770_000_000_000 // 固定时钟（假件默认值用）

function fakeHost({ fail = () => false, stdoutOf = () => "" } = {}) {
  const calls = []
  const call = async (row, command, opts = {}) => {
    calls.push({ command, stdin: opts.stdin ?? null, label: opts.label ?? null })
    if (fail(command)) return { exitCode: 1, stdout: "", stderr: "boom（假件）" }
    return { exitCode: 0, stdout: stdoutOf(command), stderr: "" }
  }
  const run = async (row, command, opts = {}) => {
    const out = await call(row, command, opts)
    if (out.exitCode !== 0) throw new Error(`主机命令非零退出（exit=${out.exitCode}）：boom（假件）`)
    return out
  }
  return { calls, call, run, execOf: (row) => (command, opts = {}) => call(row, command, opts) }
}

/** 建盒链假主机：xfs 配额径 + nft 在位——项目 id / diskMb 由 `limit` 命令记忆（读回核自洽）。 */
function chainHost() {
  const memo = { projectId: 100001, diskMb: 4096 }
  return fakeHost({
    stdoutOf: (command) => {
      const limit = command.match(/limit -p bhard=(\d+)m (\d+)/)
      if (limit) {
        memo.diskMb = Number(limit[1])
        memo.projectId = Number(limit[2])
        return ""
      }
      if (command.includes("findmnt")) return "/ xfs rw,pquota\n"
      if (command.includes("xfs_info")) return "bsize=4096\n"
      if (command.includes("report -p -b -n")) return `${memo.projectId} 0 0 ${(memo.diskMb * 1024 * 1024) / 4096} 0 [------]\n`
      if (command === "sh -c 'command -v nft'") return "/usr/sbin/nft\n"
      return ""
    },
  })
}

function fakeClient({ containers = [], network = null, archive = Buffer.from("tar-payload"), failOn = () => false } = {}) {
  const calls = []
  const state = { containers: containers.map((item) => ({ ...item })), network }
  const guard = (op) => {
    const message = failOn(op)
    if (message) {
      const e = new Error(message)
      e.status = 500
      throw e
    }
  }
  const find = (id) => state.containers.find((item) => item.Id === id)
  return {
    calls,
    state,
    info: async () => ({ json: { ServerVersion: "29.1.3", Containers: state.containers.length, ContainersRunning: 0 } }),
    containers: async () => {
      guard("containers")
      return { json: state.containers }
    },
    containerState: async (id) => {
      guard("containerState")
      const item = find(id) ?? {}
      return { state: { status: item.State ?? "stopped", running: item.State === "running", startedAt: item.StartedAt ?? new Date(NOW - 1000).toISOString(), finishedAt: null, exitCode: 0 } }
    },
    createNetwork: async (body) => {
      guard("createNetwork")
      state.network = { Name: body.Name, Options: body.Options, IPAM: { Config: [{ Subnet: "172.31.9.0/24" }] } }
      calls.push({ op: "createNetwork", body })
      return { json: { Id: "net-1" } }
    },
    inspectNetwork: async (name) => {
      calls.push({ op: "inspectNetwork", name })
      if (state.network === null) {
        const e = new Error("network not found")
        e.status = 404
        throw e
      }
      return { json: state.network }
    },
    deleteNetwork: async (name) => {
      calls.push({ op: "deleteNetwork", name })
      state.network = null
      return { json: {} }
    },
    archiveGet: async (id, path) => {
      guard("archiveGet")
      calls.push({ op: "archiveGet", id, path })
      return { status: 200, buffer: archive }
    },
    archivePut: async (id, path, tar) => {
      guard("archivePut")
      calls.push({ op: "archivePut", id, path, bytes: tar.length })
      return { status: 200, json: { message: "ok" } }
    },
    createContainer: async (name, body) => {
      guard("createContainer")
      const item = { Id: `c${state.containers.length + 1}`, Names: [`/${name}`], State: "created", StartedAt: new Date(NOW - 1000).toISOString() }
      state.containers.push(item)
      calls.push({ op: "createContainer", name, body })
      return { json: { Id: item.Id } }
    },
    startContainer: async (ref) => {
      guard("startContainer")
      const item = find(ref) ?? state.containers.find((entry) => String(entry.Names?.[0] ?? "").replace(/^\//, "") === ref)
      if (item) item.State = "running"
      calls.push({ op: "startContainer", ref })
      return { json: {} }
    },
    stopContainer: async (ref) => {
      guard("stopContainer")
      const item = find(ref) ?? state.containers.find((entry) => String(entry.Names?.[0] ?? "").replace(/^\//, "") === ref)
      if (item) item.State = "exited"
      calls.push({ op: "stopContainer", ref })
      return { json: {} }
    },
    deleteContainer: async (ref, opts = {}) => {
      guard("deleteContainer")
      calls.push({ op: "deleteContainer", ref, force: opts.force })
      state.containers = state.containers.filter((entry) => entry.Id !== ref && String(entry.Names?.[0] ?? "").replace(/^\//, "") !== ref)
      return { json: {} }
    },
    imageDetail: async (ref) => {
      throw new DOCKER.DockerError("api", `No such image: ${ref}`, { status: 404, apiMessage: `No such image: ${ref}` })
    },
    pullImage: async () => ({ text: "" }),
    buildImage: async () => ({ text: "" }),
  }
}

// ── 进程内应用（网关 + 账号面 + 沙盒面）────────────────────────────────────────

async function call(base, method, path, { body, cookie } = {}) {
  const headers = { "content-type": "application/json" }
  if (cookie) headers.cookie = cookie
  const res = await fetch(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    /* 非 JSON 体：以 text 判 */
  }
  return { status: res.status, text, json, setCookies: res.headers.getSetCookie?.() ?? [] }
}

async function startApp({ host = SERVER_HOST, port = SERVER_PORT } = {}) {
  const db = DB.openDatabase(":memory:")
  await MEMBERS.createMember(db, { username: "admin", role: "admin", password: PASSWORD })
  await MEMBERS.createMember(db, { username: "bob", role: "user", password: PASSWORD })
  await MEMBERS.createMember(db, { username: "carol", role: "user", password: PASSWORD })
  const routes = SERVER.createRouteTable()
  const config = CONFIG.validateConfig({ host, port, db: join(TEMP, "gateway.db") })
  SANDBOX.registerSandboxRoutes(routes, { db, config, log: null, deps: { host: chainHost(), clientForRunner: () => fakeClient() } })
  ACCOUNT_ROUTES.registerAccountRoutes(routes, { db })
  const server = SERVER.createGatewayServer({ config, routes, log: null })
  await new Promise((resolve, reject) => {
    server.once("error", reject)
    server.listen(0, "127.0.0.1", resolve)
  })
  const base = `http://127.0.0.1:${server.address().port}`
  const login = async (username) => {
    const res = await call(base, "POST", "/api/login", { body: { username, password: PASSWORD } })
    const line = res.setCookies.find((item) => item.startsWith(`${SESSION.SESSION_COOKIE}=`)) ?? null
    return line ? line.split(";")[0] : null
  }
  const adminCookie = await login("admin")
  const memberCookie = { bob: await login("bob"), carol: await login("carol") }
  return {
    db,
    base,
    memberCookie,
    /** 控制台面调用（admin 会话）。 */
    api: (method, path, options = {}) => call(base, method, path, { cookie: adminCookie, ...options }),
    /** 规则面读数（`GET /api/admin/sandbox/rules`——`{ rules, rulesRev }`）。 */
    rulesState: async () => {
      const res = await call(base, "GET", "/api/admin/sandbox/rules", { cookie: adminCookie })
      assert.equal(res.status, 200, `规则面读数失败：${res.text}`)
      return res.json
    },
    /** 审计行（按 `type`）。 */
    auditRows: (type) => db.prepare("SELECT * FROM audit_events WHERE type = ? ORDER BY id").all(type),
    /** `sandbox_event` 行（按 `detail.kind`）。 */
    audits: (kind) => db.prepare("SELECT * FROM audit_events WHERE type = 'sandbox_event' ORDER BY id").all().filter((row) => JSON.parse(row.detail ?? "{}").kind === kind),
    async close() {
      server.closeAllConnections?.()
      await new Promise((resolve) => server.close(resolve))
      db.close()
    },
  }
}

/** 添节点（走真自检链）。出 = 节点行。 */
async function addRunner(app, name, address) {
  const res = await app.api("POST", "/api/admin/sandbox/runners", { body: { name, address } })
  assert.equal(res.status, 200, `添节点失败：${res.text}`)
  return res.json.runner
}

/** 建工作区（控制台面——写门需可用节点）。出 = 工作区行。 */
async function createWorkspace(app, name, username) {
  const owner = MEMBERS.findMemberByUsername(app.db, username)
  const res = await app.api("POST", "/api/admin/sandbox/workspaces", { body: { name, ownerMemberId: owner.id } })
  assert.equal(res.status, 200, `建工作区失败：${res.text}`)
  return res.json.workspace
}

// ── 成员面腿（`runnerName` 两支 ∥ 恒本人过滤）──────────────────────────────────

test("成员行 `runnerName`：绑定 ⇒ 节点名 ∥ 未绑定 ⇒ null ∥ 恒本人过滤（他人工作区零出现）", async () => {
  const engineA = await startFakeDocker()
  const engineB = await startFakeDocker()
  const app = await startApp()
  try {
    const nodeA = await addRunner(app, "node-a", engineA.base)
    const ws1 = await createWorkspace(app, "bob-ws", "bob")
    assert.equal(ws1.runnerName, "node-a", "建面同拍：放置 ⇒ 绑定节点名")

    // 容量门：node-b 只容一盒（满员 ⇒ 无候选 ⇒ 留未绑）
    app.db.prepare("INSERT INTO sandbox_settings (k, v) VALUES ('maxBoxesPerRunner', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v").run(JSON.stringify(1))

    // 弃置续跑（2026-10-14 随正）：卸 node-a（保留卷）⇒ 行归一 + 立即重放置（有在线候选 ⇒ 重绑 node-b；链尾 await——确定性）
    await addRunner(app, "node-b", engineB.base)
    const del = await app.api("DELETE", `/api/admin/sandbox/runners/${nodeA.id}`, { body: { containers: "keep", confirm: true } })
    assert.equal(del.status, 200, `卸节点失败：${del.text}`)

    const bob = await call(app.base, "GET", "/api/me/sandbox/workspaces", { cookie: app.memberCookie.bob })
    assert.equal(bob.status, 200, `成员面读数失败：${bob.text}`)
    assert.deepEqual(bob.json.workspaces.map((row) => row.name), ["bob-ws"], "恒本人过滤：carol 的工作区零出现")
    const row = bob.json.workspaces[0]
    assert.deepEqual(Object.keys(row).sort(), ["boxState", "checkpointCount", "id", "name", "runnerName", "stopReason"], "行形逐键（§2.7——`dirty` 键退场随 D 裁 2026-10-14）")
    assert.equal(row.runnerName, "node-b", "弃置续跑 ⇒ 重绑在线节点（绑定 ⇒ 节点名）")

    // 未绑定支：node-b 满员（maxBoxesPerRunner = 1）⇒ 创建无候选 ⇒ 留未绑 ⇒ null
    const ws2 = await createWorkspace(app, "carol-ws", "carol")
    assert.equal(ws2.runnerName, null, "满员无候选 ⇒ 创建留未绑")
    const carol = await call(app.base, "GET", "/api/me/sandbox/workspaces", { cookie: app.memberCookie.carol })
    assert.deepEqual(carol.json.workspaces.map((item) => [item.name, item.runnerName]), [["carol-ws", null]], "未绑定 ⇒ null（端侧呈「未绑定」）∥ 只见本人")
  } finally {
    await app.close()
    await engineA.close()
    await engineB.close()
  }
})
