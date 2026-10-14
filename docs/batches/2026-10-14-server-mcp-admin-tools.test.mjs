/**
 * 2026-10-14-server-mcp-admin-tools.test.mjs — thincoder-server 批内单测件（`server-mcp-admin-tools` 批 · MCP 管面工具 `mcp`（第九件）；
 * 名随批档 · 住 `docs/batches/` · 随批留存 · **不入任何门**）。
 * 运行（自 `thincoder/` 仓根）：`node --test docs/batches/2026-10-14-server-mcp-admin-tools.test.mjs`
 *
 * 射程（判据源 = 批档 `docs/batches/2026-10-14-server-mcp-admin-tools.md` §2 用例清单 ∥
 * `docs/server/design/agent/ADMIN-AGENT.md` §12.2（机制六面）∥ §7 本批行 ①–⑥ ∥ §8 N85 ∥ B81 ∥ E63）：
 *   U1 list 视图逐值（两行：一 stdio ∥ 一 http 携秘密）——`hasSecrets` 布尔、零秘密、零 `mcp_event`；
 *   U2 add（真 store ＋ 假 config）⇒ 行在场、结果四键、`mcp_event` `server_add` 逐值 ＋ 驱动层 `chat_call`（**两行**）；
 *   U3 update ⇒ 字段级三态（缺席 = 不变 ∥ 显式 `null` = 清 ∥ 敏感空串 = 不变）、`keys` 逐值、`server_update` 无值；
 *   U4 remove ＋ 停用（`enabled:false`）⇒ 行消失 ＋ 关会话靶断（假 face 件）＋ `server_remove`/`server_update` 逐值；
 *   U5 probe 成（假件）⇒ `{ probe: { ok:true, toolCount, latencyMs } }` 逐值 ＋ 冷却清 ＋ 零副作用（库逐值不变）；
 *   U6 probe 败 ∥ 缺核 ⇒ 工具面 `ok:true` ＋ `probe.ok:false` ＋ error 人话（自含读数——沿 routes 口径）；
 *   U7 寻址两形（`id` ∥ `name` 命中同行）＋ `update` 缺 `id` ⇒ 拒（库零变）；
 *   U8 凭据面（`token`/`headers`/`env` 入参）⇒ 结果/摘要/审计 detail/日志 四扫描零值（**列名键**零值——袋内非列名键值 = 残余披露类
 *      〔§12.2③〕，本腿不置断言）；
 *   U9 形错六形逐形 ⇒ 工具级错误人话、库零变、零外呼、零 `mcp_event`；结构扫 = 名集九件 ∥ 能力段含 `mcp` ∥ 四件零改 ∥
 *      routes 五端点计数不变 ∥ 零迁移（新档零 SQL）。
 * 载体 = `node --test`（内存真 db ∥ 真 store/face ＋ 两替身缝（`deps.mcpProbeImpl`/`deps.mcpRemoveImpl`）∥
 * 真装配路径 `runChatTurn`——假模型出口 ∥ 假环境核件）。
 */
import test from "node:test"
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"

const ROOT = process.cwd()
if (!existsSync(join(ROOT, "thincoder-server"))) throw new Error(`须从仓库根（thincoder/）运行——cwd = ${ROOT}`)
const load = (rel) => import(pathToFileURL(join(ROOT, rel)).href)

const DB = await load("thincoder-server/src/store/db.mjs")
const MEMBERS = await load("thincoder-server/src/accounts/members.mjs")
const CHAT = await load("thincoder-server/src/agent/chat.mjs")
const CHAT_ENV = await load("thincoder-server/src/agent/chat-env.mjs")
const ADMIN_TOOLS = await load("thincoder-server/src/mcp/admin-tools.mjs")
const MCP_FACE = await load("thincoder-server/src/mcp/face.mjs")
const MCP_STORE = await load("thincoder-server/src/mcp/store.mjs")

const PASSWORD = "password-123"
const FIXED = Date.parse("2026-10-14T06:00:00.000Z")
const STAMP = new Date(FIXED).toISOString()
const TOKEN = "secret-token-abcdef123456"
const HDR_AUTH = "secret-hdr-auth-abcdef123456"
const HDR_KEY = "secret-hdr-xkey-abcdef123456"
const ENV_KEY = "secret-env-abcdef123456"
const ENV_TOOL_NAMES = ["get_current_time", "process", "timer", "ls", "read", "grep", "bash", "read_history"]

// ── 夹具与假件 ────────────────────────────────────────────────────────────────

/** 世界夹具：真库（内存）+ admin 成员 + 会话 + 假 config（密文列键文件落临时目录——零入仓）。 */
async function world(t, { servers = [] } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "tc-mcp-admin-"))
  const db = DB.openDatabase(":memory:")
  const { member } = await MEMBERS.createMember(db, { username: "admin", role: "admin", password: PASSWORD })
  const config = { db: join(dir, "gateway.db") }
  const chat = CHAT.createChat(db, { model: "fake/fake-model", createdBy: member.id })
  for (const row of servers) MCP_STORE.insertMcpServer(db, { ...row, config, now: () => FIXED })
  t.after(() => {
    db.close()
    rmSync(dir, { recursive: true, force: true })
  })
  return { db, dir, member, config, chat }
}

/** 管面工具（真装配——`createMcpAdminTools`；actor 沿会话）。 */
function toolsOf(w, { deps = {} } = {}) {
  return ADMIN_TOOLS.createMcpAdminTools({ db: w.db, deps: { config: w.config, ...deps }, log: null, now: () => FIXED, actor: "admin", actorId: w.member.id })
}

const call = (tools, args) => tools.invoke("mcp", args, {})

/** 假模型：脚本回合（用尽 ⇒ 恒末回合）；捕获每轮 `messages`/`tools`。 */
function scriptedChat(turns) {
  const state = { i: 0, calls: [] }
  const chat = async ({ messages, tools }) => {
    state.calls.push({ messages: JSON.parse(JSON.stringify(messages)), tools: JSON.parse(JSON.stringify(tools ?? [])) })
    const spec = turns[Math.min(state.i, turns.length - 1)]
    state.i += 1
    return { content: spec?.content ?? "", toolCalls: spec?.toolCalls ?? [] }
  }
  return { chat, state }
}

const toolTurn = (calls) => ({ content: "", toolCalls: calls.map((item, index) => ({ id: `call-${index}`, name: "mcp", arguments: JSON.stringify(item) })) })

/** 假环境核件（八件 ＋ `toOpenAISchema`——环境族在场；零核依赖）。 */
function fakeCoreTools() {
  const tool = (name) => ({ name, description: name, parameters: { type: "object" }, execute: async () => "ok" })
  return {
    getCurrentTimeTool: tool("get_current_time"),
    processTool: tool("process"),
    timerTool: tool("timer"),
    lsTool: tool("ls"),
    readTool: tool("read"),
    grepTool: tool("grep"),
    bashTool: tool("bash"),
    readHistoryTool: tool("read_history"),
    toOpenAISchema: (item) => ({ type: "function", function: { name: item.name, description: item.description, parameters: item.parameters } }),
  }
}

/** 真装配一轮（假模型出口；`deps` 透传——真装配路径 `runChatTurn`）。 */
async function turn(w, { args, deps = {}, content = "管理一下 MCP", log = null } = {}) {
  const model = scriptedChat([toolTurn([args]), { content: "办好了" }])
  const frames = []
  CHAT.claimChatTurn(w.db, w.chat.id, { now: () => FIXED })
  const result = await CHAT.runChatTurn({
    db: w.db,
    chatId: w.chat.id,
    content,
    emit: (frame) => frames.push(frame),
    now: () => FIXED,
    log,
    deps: { chat: model.chat, config: w.config, coreTools: fakeCoreTools(), ...deps },
  })
  return { result, frames, model }
}

// ── 读数小件 ─────────────────────────────────────────────────────────────────

const serverRows = (db) => db.prepare("SELECT * FROM mcp_servers ORDER BY id").all()
const cols = (row) => ({ name: row.name, transport: row.transport, command: row.command, args_json: row.args_json, url: row.url, ws_url: row.ws_url, enabled: row.enabled, secret_cipher: row.secret_cipher })
const auditRows = (db) => db.prepare("SELECT * FROM audit_events ORDER BY id").all().map((row) => ({ ...row, parsed: JSON.parse(row.detail ?? "{}") }))
const mcpEvents = (db) => auditRows(db).filter((row) => row.type === "mcp_event").map((row) => row.parsed)
const chatCalls = (db) => auditRows(db).filter((row) => row.type === "agent_event" && row.parsed.kind === "chat_call").map((row) => row.parsed)
const toolRows = (db, chatId) => db.prepare("SELECT * FROM agent_chat_messages WHERE chat_id = ? AND role = 'tool' ORDER BY seq").all(chatId)
const faceCleanup = (t) => t.after(() => { MCP_FACE.closeMcpConnections({ deps: { mcpCloseImpl: () => {} } }) }) // 模块级状态（冷却 ∥ 关闭靶）收尾——零跨用例泄漏

// ── U1 list 视图逐值 ─────────────────────────────────────────────────────────

test("U1 list：视图逐值（stdio ∥ http 携秘密）——hasSecrets 布尔 ∥ 零秘密 ∥ 零 mcp_event", async (t) => {
  const w = await world(t, {
    servers: [
      { name: "local", transport: "stdio", command: "npx", args: ["-y", "pkg"] },
      { name: "zhipu", transport: "http", url: "https://mcp.example.com/sse", headers: { Authorization: HDR_AUTH, "X-Api-Key": HDR_KEY }, token: TOKEN },
    ],
  })
  const result = await call(toolsOf(w), { op: "list" })
  assert.equal(result.ok, true)
  assert.deepEqual(
    result.servers.map((row) => ({ id: row.id, name: row.name, transport: row.transport, target: row.target, enabled: row.enabled, hasSecrets: row.hasSecrets, createdAt: row.createdAt, updatedAt: row.updatedAt })),
    [
      { id: 1, name: "local", transport: "stdio", target: "npx", enabled: true, hasSecrets: false, createdAt: STAMP, updatedAt: STAMP },
      { id: 2, name: "zhipu", transport: "http", target: "https://mcp.example.com/sse", enabled: true, hasSecrets: true, createdAt: STAMP, updatedAt: STAMP },
    ],
  )
  // 视图键面 = 白名单（零额外键）
  assert.deepEqual(Object.keys(result.servers[1]).sort(), ["createdAt", "enabled", "hasSecrets", "id", "name", "target", "transport", "updatedAt"])
  // 零秘密（三值扫描——含袋内值）
  const text = JSON.stringify(result)
  for (const secret of [TOKEN, HDR_AUTH, HDR_KEY, ENV_KEY]) assert.ok(!text.includes(secret), `list 结果泄漏：${secret}`)
  assert.deepEqual(mcpEvents(w.db), [])
  assert.deepEqual(chatCalls(w.db), []) // 直调（驱动层未涉）——list 零域审计
})

// ── U2 add（真 store ＋ 假 config）───────────────────────────────────────────

test("U2 add：行在场 ∥ 结果四键 ∥ mcp_event server_add 逐值 ∥ 两行审计（chat_call subject=null）", async (t) => {
  const w = await world(t)
  const { result, frames } = await turn(w, { args: { op: "add", name: "zhipu", transport: "http", url: "https://mcp.example.com/sse", token: TOKEN, headers: { Authorization: HDR_AUTH }, enabled: true } })
  assert.equal(result.status, "succeeded", `回合应成功：${result.reason ?? ""}`)
  const rows = serverRows(w.db)
  assert.equal(rows.length, 1)
  assert.deepEqual({ name: rows[0].name, transport: rows[0].transport, url: rows[0].url, enabled: rows[0].enabled }, { name: "zhipu", transport: "http", url: "https://mcp.example.com/sse", enabled: 1 })
  assert.ok(rows[0].secret_cipher !== null, "凭据应入密文列")
  // 结果四键（模型可见形 = JSON 落库）
  const payload = JSON.parse(toolRows(w.db, w.chat.id)[0].content)
  assert.deepEqual(Object.keys(payload).sort(), ["hasSecrets", "id", "name", "ok", "summary", "transport"])
  assert.deepEqual({ id: payload.id, name: payload.name, transport: payload.transport, hasSecrets: payload.hasSecrets }, { id: 1, name: "zhipu", transport: "http", hasSecrets: true })
  // mcp_event server_add 逐值（detail 形同 routes；actor = 会话 actor）
  const events = auditRows(w.db).filter((row) => row.type === "mcp_event")
  assert.deepEqual(events.map((row) => row.parsed), [{ kind: "server_add", id: 1, name: "zhipu", transport: "http" }])
  assert.equal(events[0].actor_name, "admin")
  assert.equal(events[0].actor_id, w.member.id)
  // 驱动层 chat_call 一行（**两行** = mcp_event + chat_call；subject = null 钉死）
  const calls = chatCalls(w.db)
  assert.equal(calls.length, 1)
  assert.deepEqual({ tool: calls[0].tool, subject: calls[0].subject, resultCode: calls[0].resultCode }, { tool: "mcp", subject: null, resultCode: 0 })
  assert.deepEqual(JSON.parse(calls[0].call), { op: "add", name: "zhipu", transport: "http", url: "https://mcp.example.com/sse", token: "***", headers: { Authorization: "***" }, enabled: true })
  // 帧面（result 摘要零秘密）
  const resultFrame = frames.find((frame) => frame.type === "result")
  assert.equal(resultFrame.ok, true)
  assert.ok(!resultFrame.summary.includes(TOKEN))
})

// ── U3 update 字段级三态 ─────────────────────────────────────────────────────

test("U3 update：三态（缺席=不变 ∥ 显式 null=清 ∥ 敏感空串=不变）∥ keys 逐值 ∥ server_update 无值", async (t) => {
  const w = await world(t, { servers: [{ name: "local", transport: "stdio", command: "npx", args: ["-y", "pkg"], token: TOKEN }] })
  const tools = toolsOf(w)
  const rowOf = () => serverRows(w.db)[0]
  const base = cols(rowOf())
  // ① 缺席 = 不变（只改 command）
  const first = await call(tools, { op: "update", id: 1, command: "node" })
  assert.deepEqual({ ok: first.ok, keys: first.keys }, { ok: true, keys: ["command"] })
  assert.deepEqual(cols(rowOf()), { ...base, command: "node" })
  const after1 = cols(rowOf())
  // ② 显式 null = 清（args 清空）
  const second = await call(tools, { op: "update", id: 1, args: null })
  assert.deepEqual(second.keys, ["args"])
  assert.deepEqual(cols(rowOf()), { ...after1, args_json: null })
  const after2 = cols(rowOf())
  // ③ 敏感空串 = 不变（token 空串——密文列逐值不变，keys 零改）
  const third = await call(tools, { op: "update", id: 1, token: "" })
  assert.deepEqual(third.keys, [])
  assert.deepEqual(cols(rowOf()), after2)
  // ④ 显式 null = 清敏感（清空唯一入口——密文列归 NULL）
  const fourth = await call(tools, { op: "update", id: 1, token: null })
  assert.deepEqual(fourth.keys, ["token"])
  assert.equal(rowOf().secret_cipher, null)
  // 审计四行（server_update 逐值——`keys` 只键名；detail 携零值）
  assert.deepEqual(mcpEvents(w.db), [
    { kind: "server_update", id: 1, name: "local", keys: ["command"] },
    { kind: "server_update", id: 1, name: "local", keys: ["args"] },
    { kind: "server_update", id: 1, name: "local", keys: [] },
    { kind: "server_update", id: 1, name: "local", keys: ["token"] },
  ])
  const detailText = JSON.stringify(mcpEvents(w.db))
  for (const value of ["node", "pkg", TOKEN]) assert.ok(!detailText.includes(value), `server_update 泄漏值：${value}`)
})

// ── U4 remove ＋ 停用（关会话靶断）────────────────────────────────────────────

test("U4 remove ＋ 停用：行消失 ∥ 关会话靶断（假 face 件）∥ server_remove/server_update 逐值", async (t) => {
  const w = await world(t, { servers: [{ name: "web", transport: "stdio", command: "npx" }, { name: "zhipu", transport: "stdio", command: "npx" }] })
  faceCleanup(t)
  // 假 face 件：假建连造出两服务器件 ⇒ 关会话靶（`face.mjs` `latestByServer`）成立；`deps.mcpRemoveImpl` 捕获关闭调用
  const face = await MCP_FACE.createMcpToolFace({
    db: w.db,
    deps: { config: w.config, mcpConnectImpl: async (cfg) => [{ name: `${cfg.name}_search`, _mcpName: cfg.name, description: "d", parameters: {}, execute: async () => "ok" }] },
    log: null,
    now: () => FIXED,
  })
  assert.deepEqual([...face.names].sort(), ["web_search", "zhipu_search"])
  const closed = []
  const tools = toolsOf(w, { deps: { mcpRemoveImpl: (target, name) => closed.push({ target, name }) } })
  // ① 停用 ⇒ `server_update`（keys 含 enabled）+ 关该服务器会话
  const disabled = await call(tools, { op: "update", id: 2, enabled: false })
  assert.deepEqual({ ok: disabled.ok, keys: disabled.keys }, { ok: true, keys: ["enabled"] })
  assert.equal(serverRows(w.db)[1].enabled, 0)
  assert.deepEqual(closed.map((item) => item.name), ["zhipu"])
  assert.deepEqual(closed[0].target.tools.map((tool) => tool.name), ["zhipu_search"])
  // ② 删 ⇒ 行消失 + 关会话 + `server_remove`
  const removed = await call(tools, { op: "remove", id: 1 })
  assert.deepEqual({ ok: removed.ok, id: removed.id, name: removed.name }, { ok: true, id: 1, name: "web" })
  assert.deepEqual(serverRows(w.db).map((row) => row.name), ["zhipu"])
  assert.deepEqual(closed.map((item) => item.name), ["zhipu", "web"])
  assert.deepEqual(closed[1].target.tools.map((tool) => tool.name), ["web_search"])
  assert.deepEqual(mcpEvents(w.db), [
    { kind: "server_update", id: 2, name: "zhipu", keys: ["enabled"] },
    { kind: "server_remove", id: 1, name: "web" },
  ])
})

// ── U5 probe 成（假件）───────────────────────────────────────────────────────

test("U5 probe 成：读数逐值 ∥ 探活体 = 库内行 ∥ 冷却清 ∥ 零副作用（库逐值不变）", async (t) => {
  const w = await world(t, { servers: [{ name: "zhipu", transport: "http", url: "https://mcp.example.com/sse", token: TOKEN }] })
  faceCleanup(t)
  // 冷却起点（假建连抛 ⇒ `face.mjs` 冷却表置位）
  await MCP_FACE.createMcpToolFace({ db: w.db, deps: { config: w.config, mcpConnectImpl: async () => { throw new Error("boom") } }, log: null, now: () => FIXED })
  assert.equal(MCP_FACE.isMcpCoolingDown("zhipu", FIXED + 1), true)
  const seen = []
  const tools = toolsOf(w, { deps: { mcpProbeImpl: async (cfg) => { seen.push(cfg); return { ok: true, toolCount: 3, latencyMs: 12 } } } })
  const before = JSON.stringify(serverRows(w.db))
  const result = await call(tools, { op: "probe", name: "zhipu" })
  assert.deepEqual({ ok: result.ok, probe: result.probe }, { ok: true, probe: { ok: true, toolCount: 3, latencyMs: 12 } })
  assert.ok(result.summary.includes("探活成功"))
  // 探活体 = 库内行解出的核 config 形（缺省项零字段——引件面 `resolveProbeConfig`）
  assert.deepEqual(seen, [{ name: "zhipu", url: "https://mcp.example.com/sse", token: TOKEN }])
  // 冷却清 + 零副作用（库逐值不变 ∥ 零 `mcp_event`）
  assert.equal(MCP_FACE.isMcpCoolingDown("zhipu", FIXED + 1), false)
  assert.equal(JSON.stringify(serverRows(w.db)), before)
  assert.deepEqual(mcpEvents(w.db), [])
})

// ── U6 probe 败 ∥ 缺核（自含读数）────────────────────────────────────────────

test("U6 probe 败 ∥ 缺核：工具面 ok:true ＋ probe.ok:false ＋ error 人话（自含读数）", async (t) => {
  const w = await world(t, { servers: [{ name: "zhipu", transport: "stdio", command: "definitely-not-a-real-mcp-bin" }] })
  // ① 假件抛 ⇒ 工具级读数（自含——回合不停）
  const thrown = await call(toolsOf(w, { deps: { mcpProbeImpl: async () => { throw new Error("连接被拒") } } }), { op: "probe", id: 1 })
  assert.deepEqual({ ok: thrown.ok, probe: thrown.probe }, { ok: true, probe: { ok: false, error: "连接被拒" } })
  assert.ok(thrown.summary.includes("探活失败"))
  // ② 假件回错误读数（`ok:false` 仍自含）
  const refused = await call(toolsOf(w, { deps: { mcpProbeImpl: async () => ({ ok: false, error: "ECONNREFUSED" }) } }), { op: "probe", id: 1 })
  assert.deepEqual(refused.probe, { ok: false, error: "ECONNREFUSED" })
  // ③ 缺核（无注入）⇒ 读数为错（核件未装载 ⇒ 自含错误；即便环境有核，命令不存在 ⇒ 建连失败——两径同判）
  const bare = await call(toolsOf(w), { op: "probe", id: 1 })
  assert.equal(bare.ok, true)
  assert.equal(bare.probe.ok, false)
  assert.ok(typeof bare.probe.error === "string" && bare.probe.error.length > 0, "缺核应出自含 error 人话")
  assert.deepEqual(mcpEvents(w.db), []) // 探活零落库零审计
})

// ── U7 寻址两形 ＋ update 缺 id ──────────────────────────────────────────────

test("U7 寻址：id ∥ name 命中同行 ∥ update 缺 id 拒 ∥ 未命中人话（库零变/零外呼）", async (t) => {
  const w = await world(t, { servers: [{ name: "alpha", transport: "stdio", command: "npx" }, { name: "beta", transport: "http", url: "https://b.example.com/sse" }] })
  const seen = []
  const tools = toolsOf(w, { deps: { mcpProbeImpl: async (cfg) => { seen.push(cfg); return { ok: true, toolCount: 1, latencyMs: 1 } } } })
  // 两形命中同行（探活体逐值相等）
  const byId = await call(tools, { op: "probe", id: 2 })
  const byName = await call(tools, { op: "probe", name: "beta" })
  assert.equal(byId.probe.ok, true)
  assert.equal(byName.probe.ok, true)
  assert.deepEqual(seen[0], seen[1])
  assert.deepEqual(seen[0], { name: "beta", url: "https://b.example.com/sse" })
  // update 缺 id ⇒ 拒（按名寻址不可改名——库零变）
  const noId = await call(tools, { op: "update", name: "beta2", command: "y" })
  assert.equal(noId.ok, false)
  assert.match(noId.message, /update 须携 id/)
  assert.equal(serverRows(w.db)[1].name, "beta")
  // 未命中（probe ∥ remove）⇒ 工具级错误人话；零外呼
  const missName = await call(tools, { op: "probe", name: "nope" })
  assert.deepEqual({ ok: missName.ok, message: missName.message }, { ok: false, message: "MCP 服务器不存在：nope（先 mcp.list 查在册）" })
  const missId = await call(tools, { op: "remove", id: 99 })
  assert.equal(missId.ok, false)
  assert.match(missId.message, /MCP 服务器不存在：99/)
  assert.equal(seen.length, 2)
  // remove 两形（按名可达）
  const removed = await call(tools, { op: "remove", name: "alpha" })
  assert.deepEqual({ ok: removed.ok, name: removed.name }, { ok: true, name: "alpha" })
  assert.deepEqual(serverRows(w.db).map((row) => row.name), ["beta"])
  assert.deepEqual(mcpEvents(w.db).map((event) => event.kind), ["server_remove"])
})

// ── U8 凭据只写零回显（四扫描）───────────────────────────────────────────────

test("U8 凭据面：token/headers/env 入参 ⇒ 结果/摘要/审计 detail/日志 四扫描零值", async (t) => {
  const w = await world(t)
  const logs = []
  const log = { warn: (event, fields) => logs.push({ event, fields }), info: (event, fields) => logs.push({ event, fields }) }
  const args = { op: "add", name: "zhipu", transport: "http", url: "https://mcp.example.com/sse", token: TOKEN, headers: { Authorization: HDR_AUTH, "X-Api-Key": HDR_KEY }, env: { ZHIPU_API_KEY: ENV_KEY } }
  const { result, frames } = await turn(w, { args, log })
  assert.equal(result.status, "succeeded", `回合应成功：${result.reason ?? ""}`)
  const toolRow = toolRows(w.db, w.chat.id)[0]
  const calls = chatCalls(w.db)
  const faces = [
    { name: "结果面", text: toolRow.content },
    { name: "摘要面", text: `${JSON.stringify(toolRow.data_json)}${frames.filter((frame) => frame.type === "result").map((frame) => frame.summary).join("")}` },
    { name: "审计 detail", text: JSON.stringify(auditRows(w.db).map((row) => row.parsed)) },
    { name: "日志面", text: JSON.stringify(logs) },
  ]
  // 列名键（`token` ∥ `headers.Authorization`）= 掩蔽面在册 ⇒ 四扫描零值
  for (const secret of [TOKEN, HDR_AUTH]) {
    for (const face of faces) assert.ok(!face.text.includes(secret), `${face.name} 泄漏：${secret}`)
  }
  // 掩蔽形（链上 `***`——非免回声而是掩蔽）
  assert.deepEqual(JSON.parse(calls[0].call).token, "***")
  assert.deepEqual(JSON.parse(calls[0].call).headers.Authorization, "***")
  // 袋内非列名键值（HDR_KEY ∥ ENV_KEY）= 掩蔽面残余（§12.2③ 披露类——本腿不置断言）；结果面仍零值
  assert.ok(!toolRow.content.includes(HDR_KEY) && !toolRow.content.includes(ENV_KEY))
  assert.equal(JSON.parse(toolRow.content).hasSecrets, true)
})

// ── U9 形错六形 ＋ 结构扫 ────────────────────────────────────────────────────

test("U9a 形错六形：逐形工具级错误人话 ∥ 库零变 ∥ 零外呼 ∥ 零 mcp_event", async (t) => {
  const w = await world(t)
  const external = []
  const tools = toolsOf(w, { deps: { mcpProbeImpl: async (cfg) => { external.push(cfg); return { ok: true, toolCount: 0, latencyMs: 0 } } } })
  const cases = [
    { args: { op: "add", name: "   ", transport: "stdio", command: "x" }, match: /不可为空/ }, // 名空
    { args: { op: "add", name: "t", transport: "ftp" }, match: /传输方式非法/ }, // 传输表外
    { args: { op: "add", name: "t", transport: "stdio" }, match: /command 必填/ }, // 必填缺（stdio 无 command）
    { args: { op: "probe", name: "nope" }, match: /不存在/ }, // 未命中
    { args: { op: "wat" }, match: /未知 mcp 动词/ }, // 未知动词
    { args: {}, match: /缺 op/ }, // 缺 op
  ]
  for (const item of cases) {
    const out = await call(tools, item.args)
    assert.equal(out.ok, false, `应拒：${JSON.stringify(item.args)}`)
    assert.ok(typeof out.message === "string" && out.message.length > 0)
    assert.match(out.message, item.match)
  }
  // 重名（先成一笔，再同名 ⇒ 拒、库零变）
  const okAdd = await call(tools, { op: "add", name: "dup", transport: "stdio", command: "x" })
  assert.equal(okAdd.ok, true)
  const dup = await call(tools, { op: "add", name: "dup", transport: "stdio", command: "y" })
  assert.equal(dup.ok, false)
  assert.match(dup.message, /已存在/)
  assert.equal(serverRows(w.db).length, 1) // 逐形库零变（仅成功那笔一行）
  assert.deepEqual(external, []) // 零外呼
  assert.deepEqual(mcpEvents(w.db).map((event) => event.kind), ["server_add"]) // 零新行（仅成功那笔）
})

test("U9b 结构：名集九件（含 mcp）∥ 能力段含 mcp ∥ 四件零改 ∥ routes 五端点 ∥ 零迁移（零 SQL）", async (t) => {
  const w = await world(t)
  // ① 名集九件（真回合捕获——并面后工具面；管面 `mcp` 为第四面 ⇒ 名列末位）
  const { model } = await turn(w, { args: { op: "list" } })
  const names = model.state.calls[0].tools.map((schema) => schema.function.name)
  assert.deepEqual(names, ["members", "providers", "models", "usage", "audit", "runners", "docker", "exec", ...ENV_TOOL_NAMES, "mcp"])
  assert.deepEqual(mcpEvents(w.db), []) // list ⇒ 零域审计
  assert.equal(chatCalls(w.db).length, 1) // …仅驱动层 chat_call 一行
  // ② 能力段含 `mcp`（对位断言：注册名 ∈ 能力段字面——独立 token）＋ 简报同拍
  const tokens = new Set(CHAT_ENV.CHAT_LIMITS_BLOCK.split(/[^\w]+/).filter((token) => token !== ""))
  assert.ok(tokens.has("mcp"), "能力段应以独立 token 含 mcp")
  assert.ok(CHAT_ENV.CHAT_LIMITS_BLOCK.includes("已配服务器的工具随回合并入"), "能力段应叙已配服务器工具可用")
  assert.ok(CHAT.CHAT_SYSTEM_BRIEF.split("\n")[1].includes("∥ mcp"), "系统简报管理族行应含 mcp")
  // ③ schema 描述（说明书第二面——两义同叙 ＋ 凭据指引句）
  const schema = model.state.calls[0].tools.find((item) => item.function.name === "mcp")
  assert.ok(schema.function.description.includes("可直接调用"), "schema 描述应叙已配服务器工具可用")
  assert.ok(schema.function.description.includes("永不回显"), "schema 描述应含凭据指引句")
  assert.deepEqual(schema.function.parameters.properties.op.enum, ["list", "add", "update", "remove", "probe"])
  // ④ 四件零改（git 面判——本批零触声明）＋ routes 五端点计数不变
  const scoped = ["thincoder-server/src/agent/chat-tools.mjs", "thincoder-server/src/mcp/store.mjs", "thincoder-server/src/mcp/face.mjs", "thincoder-server/src/mcp/routes.mjs"]
  const diff = spawnSync("git", ["diff", "HEAD", "--name-only", "--", ...scoped], { cwd: ROOT, encoding: "utf8" })
  assert.equal(diff.status, 0, `git 面判失败：${diff.stderr}`)
  assert.equal(diff.stdout.trim(), "", `零改声明不破（应零行）：${diff.stdout}`)
  const routesSource = readFileSync(join(ROOT, "thincoder-server/src/mcp/routes.mjs"), "utf8")
  assert.equal((routesSource.match(/routes\.add\(/g) ?? []).length, 5, "routes 五端点计数应不变")
  // ⑤ 零迁移/零自造 SQL（新档源扫）＋ 零新端点
  const source = readFileSync(join(ROOT, "thincoder-server/src/mcp/admin-tools.mjs"), "utf8")
  for (const pattern of ["db.prepare(", "CREATE TABLE", "ALTER TABLE", "INSERT INTO", "DELETE FROM", "routes.add("]) {
    assert.equal((source.match(new RegExp(pattern.replace(/[.()]/g, "\\$&"), "g")) ?? []).length, 0, `新档不应含：${pattern}`)
  }
  assert.equal(w.db.prepare("PRAGMA user_version").get().user_version, 24, "结构版本应仍为 v24（零迁移）")
})
