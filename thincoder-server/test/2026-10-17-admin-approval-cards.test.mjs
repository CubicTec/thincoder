/**
 * 2026-10-17-admin-approval-cards.test.mjs — 批内单测件（批档 = `docs/batches/2026-10-17-admin-approval-cards.md`）：
 * 被测面 = 管理面审批卡面（`agent/ADMIN-AGENT.md` §11.5 ∥ KD-SV-224–227）——判类门挡 ∥ 单件/批卡 ∥ 批/拒/always 结算 ∥
 * 兜底三径（回合收 ∥ 中止 ∥ 流断 ∥ 无流即时拒）∥ 应答端点契约（400/401/403/404）∥ 会话行 `autoApprove`（v25）+ PATCH 第三键 ∥
 * `readonlyOf` 四缝判类（含合并面路由）。假模型出口 ∥ 假工具面 ∥ 内存库 ∥ 真路由/真 HTTP。
 * 用毕即删（零留存）：§5 留一行读数。运行 = `cd thincoder-server && node --test test/2026-10-17-admin-approval-cards.test.mjs`。
 */
import { test } from "node:test"
import assert from "node:assert/strict"

const SRC = new URL("../src/", import.meta.url)
const { openDatabase, SCHEMA_VERSION, migrate } = await import(new URL("store/db.mjs", SRC))
const { createMember } = await import(new URL("accounts/members.mjs", SRC))
const { createSession, SESSION_COOKIE } = await import(new URL("accounts/session.mjs", SRC))
const { createRouteTable, createGatewayServer } = await import(new URL("gateway/server.mjs", SRC))
const CHAT = await import(new URL("agent/chat.mjs", SRC))
const ASKS = await import(new URL("agent/chat-asks.mjs", SRC))
const { registerChatRoutes } = await import(new URL("agent/chat-routes.mjs", SRC))
const { createChatTools, readonlyOf: chatReadonlyOf } = await import(new URL("agent/chat-tools.mjs", SRC))
const { createEnvTools } = await import(new URL("agent/chat-env-tools.mjs", SRC))
const { createMcpAdminTools, readonlyOf: mcpAdminReadonlyOf } = await import(new URL("mcp/admin-tools.mjs", SRC))
const { createMcpToolFace } = await import(new URL("mcp/face.mjs", SRC))

const TS = "2026-10-17T00:00:00.000Z"
const JSON_HEADERS = { "content-type": "application/json" }

// ── 夹具（内存库 ∥ 成员/会话 ∥ 假模型出口 ∥ 假工具面）────────────────────────────

function seedProvider(db) {
  db.prepare("INSERT INTO providers (name, base_url, api_key, models_json, proxy, model_meta_json, created_at, updated_at) VALUES (?, ?, ?, ?, 0, '{}', ?, ?)")
    .run("test", "http://127.0.0.1:1/v1", "", JSON.stringify(["m1"]), TS, TS)
}

/** 库 + 成员 + 会话 cookie（`role = "admin"` 缺省——管理面；`user` 用于 403 形）。 */
async function fixture({ role = "admin" } = {}) {
  const db = openDatabase(":memory:")
  seedProvider(db)
  const { member } = await createMember(db, { username: role === "admin" ? "boss" : "plain", name: "Boss", role })
  const { token } = createSession(db, member.id)
  return { db, admin: member, cookie: `${SESSION_COOKIE}=${token}` }
}

/** 假工具面（`readonlyOf` 缺省 = 仅 `ls` 读类；`invoke` 逐条记名）。 */
function fakeTools({ readonlyOf = (name) => name === "ls" } = {}) {
  const invoked = []
  return {
    invoked,
    face: {
      names: ["bash", "members", "ls"],
      schemas: [],
      ...(readonlyOf === null ? {} : { readonlyOf }),
      invoke: async (name, args) => {
        invoked.push({ name, args })
        return { ok: true, summary: `${name} ok`, output: `${name} out` }
      },
    },
  }
}

/** 脚本化模型出口（逐步返回；`steps` 耗尽 ⇒ 末步复用）。 */
function fakeModel(steps) {
  const calls = []
  let index = 0
  const chat = async ({ messages }) => {
    calls.push(messages.map((message) => message.role))
    const step = steps[Math.min(index, steps.length - 1)]
    index += 1
    return step
  }
  return { chat, calls }
}

const toolCall = (id, name, args) => ({ id, name, arguments: JSON.stringify(args) })
const PERMISSION = { type: "ask", kind: "permission" }
const BATCH = { type: "ask", kind: "batch" }

/** 帧集（`emit` 直收）。 */
function sink() {
  const frames = []
  return { frames, emit: (frame) => frames.push(frame) }
}

/** 等待条件成真（5ms 轮询——上限 2s）。 */
async function until(pred, label) {
  for (let i = 0; i < 400; i++) {
    const hit = pred()
    if (hit) return hit
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  throw new Error(`等待超时：${label}`)
}

/** 直跑一回合（假模型 + 假工具面；`emit` 缺省 = 无流唤醒轮形）。 */
function runTurn({ db, chatId, chat, tools = null, emit = null, content = "hi", senderId = null }) {
  return CHAT.runChatTurn({ db, chatId, content, emit, deps: { chat, ...(tools === null ? {} : { tools }) }, senderId })
}

const auditOf = (db, kind) => db.prepare("SELECT * FROM audit_events WHERE type = 'agent_event' ORDER BY id").all()
  .map((row) => ({ ...row, detail: JSON.parse(row.detail) }))
  .filter((row) => row.detail.kind === kind)
const toolRowsOf = (db, chatId) => db.prepare("SELECT * FROM agent_chat_messages WHERE chat_id = ? AND role = 'tool' ORDER BY seq").all(chatId)
  .map((row) => ({ ...row, data: JSON.parse(row.data_json) }))

/** 已受理会话（建行——模型可用性归路由面，直跑不经门）。 */
function newChat(db, admin) {
  return CHAT.createChat(db, { model: "test/m1", createdBy: admin.id })
}

// ── ①② 单件卡 / 读类零弹（N86 ∥ B84）──────────────────────────────────────────

test("N86 单件 permission 卡：ask ⇒ once ⇒ 执行 + 帧序 + 审计", async () => {
  const { db, admin } = await fixture()
  const chat = newChat(db, admin)
  const tools = fakeTools()
  const model = fakeModel([
    { toolCalls: [toolCall("c1", "bash", { command: "echo hi" })] },
    { content: "完成" },
  ])
  const frames = sink()
  const run = runTurn({ db, chatId: chat.id, chat: model.chat, tools: tools.face, emit: frames.emit, senderId: admin.id })
  const ask = await until(() => frames.frames.find((frame) => frame.type === "ask"), "ask 帧")
  assert.equal(ask.kind, "permission")
  assert.equal(ask.tool, "bash")
  assert.match(ask.args, /echo hi/) // args = 掩蔽截断串（与 call 帧同链）
  assert.equal(frames.frames.some((frame) => frame.type === "call"), false) // 应答前零 call 帧（卡先于执行）
  assert.equal(await ASKS.answerChatAsk(chat.id, ask.promptId, { verdict: "once" }), true)
  const result = await run
  assert.equal(result.status, "succeeded")
  assert.deepEqual(tools.invoked.map((item) => item.name), ["bash"])
  assert.ok(frames.frames.some((frame) => frame.type === "call" && frame.name === "bash"))
  assert.ok(frames.frames.some((frame) => frame.type === "result" && frame.ok === true))
  assert.equal(toolRowsOf(db, chat.id)[0].data.ok, true)
  const calls = auditOf(db, "chat_call")
  assert.equal(calls.length, 1)
  assert.equal(calls[0].detail.tool, "bash")
  assert.equal(calls[0].detail.resultCode, 0)
})

test("B84 读类零弹（含注入面缺 readonlyOf ⇒ 读类——既有消费零破）", async () => {
  const { db, admin } = await fixture()
  const chat = newChat(db, admin)
  const tools = fakeTools()
  const model = fakeModel([{ toolCalls: [toolCall("c1", "ls", { path: "." })] }, { content: "完成" }])
  const frames = sink()
  const result = await runTurn({ db, chatId: chat.id, chat: model.chat, tools: tools.face, emit: frames.emit })
  assert.equal(result.status, "succeeded")
  assert.equal(frames.frames.some((frame) => frame.type === "ask"), false)
  assert.equal(tools.invoked.length, 1)

  const bare = fakeTools({ readonlyOf: null }) // 缺席面（注入口/假件）⇒ 读类
  const chat2 = newChat(db, admin)
  const model2 = fakeModel([{ toolCalls: [toolCall("c2", "bash", { command: "echo x" })] }, { content: "完成" }])
  const frames2 = sink()
  const result2 = await runTurn({ db, chatId: chat2.id, chat: model2.chat, tools: bare.face, emit: frames2.emit })
  assert.equal(result2.status, "succeeded")
  assert.equal(frames2.frames.some((frame) => frame.type === "ask"), false)
  assert.equal(bare.invoked.length, 1)
})

// ── ③ 批卡（N87 ∥ approveAll ∥ oneByOne）─────────────────────────────────────

test("N87 同批次两写类 ⇒ 恰一批卡；approveAll ⇒ 先序执行", async () => {
  const { db, admin } = await fixture()
  const chat = newChat(db, admin)
  const tools = fakeTools()
  const model = fakeModel([
    { toolCalls: [toolCall("c1", "bash", { command: "echo a" }), toolCall("c2", "members", { op: "create", username: "x" })] },
    { content: "完成" },
  ])
  const frames = sink()
  const run = runTurn({ db, chatId: chat.id, chat: model.chat, tools: tools.face, emit: frames.emit })
  const asks = await until(() => (frames.frames.filter((frame) => frame.type === "ask").length > 0 ? frames.frames.filter((frame) => frame.type === "ask") : null), "批卡")
  assert.equal(asks.length, 1)
  assert.deepEqual(asks[0], { type: "ask", kind: "batch", promptId: asks[0].promptId, count: 2, tools: ["bash", "members"] })
  await ASKS.answerChatAsk(chat.id, asks[0].promptId, { verdict: "approveAll" })
  const result = await run
  assert.equal(result.status, "succeeded")
  assert.deepEqual(tools.invoked.map((item) => item.name), ["bash", "members"]) // 先序
})

test("N87 批卡 oneByOne ⇒ 逐件依序弹卡；always 后同回合免问", async () => {
  const { db, admin } = await fixture()
  const chat = newChat(db, admin)
  const tools = fakeTools()
  const model = fakeModel([
    { toolCalls: [toolCall("c1", "bash", { command: "echo a" }), toolCall("c2", "members", { op: "create", username: "x" }), toolCall("c3", "bash", { command: "echo b" })] },
    { content: "完成" },
  ])
  const frames = sink()
  const run = runTurn({ db, chatId: chat.id, chat: model.chat, tools: tools.face, emit: frames.emit })
  const batch = await until(() => frames.frames.find((frame) => frame.type === "ask"), "批卡")
  assert.equal(batch.kind, "batch")
  await ASKS.answerChatAsk(chat.id, batch.promptId, { verdict: "oneByOne" })
  const first = await until(() => frames.frames.find((frame) => frame.type === "ask" && frame.promptId !== batch.promptId && frame.tool === "bash"), "第一件卡")
  await ASKS.answerChatAsk(chat.id, first.promptId, { verdict: "once" })
  const second = await until(() => frames.frames.find((frame) => frame.type === "ask" && frame.promptId !== batch.promptId && frame.promptId !== first.promptId && frame.tool === "members"), "第二件卡")
  await ASKS.answerChatAsk(chat.id, second.promptId, { verdict: "always" })
  const result = await run
  assert.equal(result.status, "succeeded")
  assert.deepEqual(tools.invoked.map((item) => item.name), ["bash", "members", "bash"]) // 第三件 = always 免问（零第三卡）
  const asks = frames.frames.filter((frame) => frame.type === "ask")
  assert.equal(asks.length, 3) // 批卡 + 两件卡（第三件零卡）
  assert.equal(db.prepare("SELECT auto_approve FROM agent_chats WHERE id = ?").get(chat.id).auto_approve, 1)
})

// ── ④ always（N88 ∥ PATCH 复位）──────────────────────────────────────────────

test("N88 always ⇒ 行 auto_approve=1；同回合 + 下回合零弹；PATCH 复位后弹回", async () => {
  const { db, admin, cookie } = await fixture()
  const chat = newChat(db, admin)
  const tools = fakeTools()
  // 回合 A：两次写类（两次模型响应）⇒ 首卡 always ⇒ 第二件免问
  const modelA = fakeModel([
    { toolCalls: [toolCall("a1", "bash", { command: "echo a" })] },
    { toolCalls: [toolCall("a2", "bash", { command: "echo b" })] },
    { content: "完成" },
  ])
  const framesA = sink()
  const runA = runTurn({ db, chatId: chat.id, chat: modelA.chat, tools: tools.face, emit: framesA.emit })
  const askA = await until(() => framesA.frames.find((frame) => frame.type === "ask"), "回合 A ask")
  await ASKS.answerChatAsk(chat.id, askA.promptId, { verdict: "always" })
  assert.equal((await runA).status, "succeeded")
  assert.equal(framesA.frames.filter((frame) => frame.type === "ask").length, 1)
  assert.deepEqual(tools.invoked.map((item) => item.name), ["bash", "bash"])
  assert.equal(db.prepare("SELECT auto_approve FROM agent_chats WHERE id = ?").get(chat.id).auto_approve, 1)

  // 回合 B：起跑读行 ⇒ 零弹
  const modelB = fakeModel([{ toolCalls: [toolCall("b1", "bash", { command: "echo c" })] }, { content: "完成" }])
  const framesB = sink()
  assert.equal((await runTurn({ db, chatId: chat.id, chat: modelB.chat, tools: tools.face, emit: framesB.emit })).status, "succeeded")
  assert.equal(framesB.frames.some((frame) => frame.type === "ask"), false)

  // PATCH 复位（HTTP 第三键——下回合生效）
  const server = await startServer({ db, deps: {} })
  try {
    const patched = await api(server.base, cookie, "PATCH", `/api/admin/agent/chats/${chat.id}`, { autoApprove: false })
    assert.equal(patched.status, 200)
    assert.equal(patched.data.chat.autoApprove, false)
    assert.deepEqual(Object.keys(patched.data.chat).sort(), ["autoApprove", "createdAt", "id", "model", "reasoning", "status", "updatedAt"].sort())
    assert.equal(db.prepare("SELECT auto_approve FROM agent_chats WHERE id = ?").get(chat.id).auto_approve, 0)
  } finally {
    await closeServer(server.server)
  }

  // 回合 C：弹回
  const modelC = fakeModel([{ toolCalls: [toolCall("c1", "bash", { command: "echo d" })] }, { content: "完成" }])
  const framesC = sink()
  const runC = runTurn({ db, chatId: chat.id, chat: modelC.chat, tools: tools.face, emit: framesC.emit })
  const askC = await until(() => framesC.frames.find((frame) => frame.type === "ask"), "回合 C ask")
  await ASKS.answerChatAsk(chat.id, askC.promptId, { verdict: "reject" })
  assert.equal((await runC).status, "succeeded")
})

// ── ⑤ 拒执行形（B82）──────────────────────────────────────────────────────────

test("B82 reject ⇒ 零执行 + 工具行 + 审计 −1 + 回合续跑", async () => {
  const { db, admin } = await fixture()
  const chat = newChat(db, admin)
  const tools = fakeTools()
  const model = fakeModel([{ toolCalls: [toolCall("c1", "bash", { command: "echo no" })] }, { content: "继续完成" }])
  const frames = sink()
  const run = runTurn({ db, chatId: chat.id, chat: model.chat, tools: tools.face, emit: frames.emit })
  const ask = await until(() => frames.frames.find((frame) => frame.type === "ask"), "ask 帧")
  await ASKS.answerChatAsk(chat.id, ask.promptId, { verdict: "reject" })
  const result = await run
  assert.equal(result.status, "succeeded") // 回合续跑
  assert.equal(tools.invoked.length, 0)
  const row = toolRowsOf(db, chat.id)[0]
  assert.equal(row.data.ok, false)
  assert.equal(row.data.summary, ASKS.ASK_REJECTED_MESSAGE)
  assert.deepEqual(JSON.parse(row.content), { ok: false, message: ASKS.ASK_REJECTED_MESSAGE })
  assert.ok(frames.frames.some((frame) => frame.type === "call"))
  assert.ok(frames.frames.some((frame) => frame.type === "result" && frame.ok === false))
  const calls = auditOf(db, "chat_call")
  assert.equal(calls.length, 1)
  assert.equal(calls[0].detail.resultCode, -1)
  const assistant = db.prepare("SELECT * FROM agent_chat_messages WHERE chat_id = ? AND role = 'assistant'").all(chat.id)
  assert.ok(assistant.some((message) => message.content === "继续完成"))
})

// ── ⑥ 兜底三径（B83）──────────────────────────────────────────────────────────

test("B83② 应答前中止 ⇒ 未决拒值 + aborted 收尾", async () => {
  const { db, admin } = await fixture()
  const chat = newChat(db, admin)
  const tools = fakeTools()
  const model = fakeModel([{ toolCalls: [toolCall("c1", "bash", { command: "echo x" })] }, { content: "不应到达" }])
  const frames = sink()
  const run = runTurn({ db, chatId: chat.id, chat: model.chat, tools: tools.face, emit: frames.emit })
  await until(() => frames.frames.find((frame) => frame.type === "ask"), "ask 帧")
  CHAT.requestChatAbort(chat.id) // 中止 ⇒ 在决 ask 同拍拒值（KD-SV-227）
  const result = await run
  assert.equal(result.status, "failed")
  assert.match(result.reason, /中止/)
  assert.equal(tools.invoked.length, 0)
  const rows = toolRowsOf(db, chat.id) // B83：工具行/审计同 B82（中止径拒值也落行）
  assert.equal(rows.length, 1)
  assert.equal(rows[0].data.summary, ASKS.ASK_REJECTED_MESSAGE)
  assert.deepEqual(JSON.parse(rows[0].content), { ok: false, message: ASKS.ASK_REJECTED_MESSAGE })
  assert.equal(auditOf(db, "chat_call")[0].detail.resultCode, -1)
  assert.ok(frames.frames.some((frame) => frame.type === "call"))
  assert.ok(frames.frames.some((frame) => frame.type === "result" && frame.ok === false))
  assert.ok(db.prepare("SELECT * FROM agent_chat_messages WHERE chat_id = ? AND role = 'notice'").all(chat.id).some((row) => JSON.parse(row.data_json).reason === "aborted"))
  assert.equal(auditOf(db, "chat_stop").length, 1)
})

test("B83③ 无流（唤醒轮）⇒ 写类即时拒（零卡）", async () => {
  const { db, admin } = await fixture()
  const chat = newChat(db, admin)
  const tools = fakeTools()
  const model = fakeModel([{ toolCalls: [toolCall("c1", "bash", { command: "echo x" })] }, { content: "完成" }])
  const result = await runTurn({ db, chatId: chat.id, chat: model.chat, tools: tools.face, emit: null })
  assert.equal(result.status, "succeeded")
  assert.equal(tools.invoked.length, 0)
  assert.equal(toolRowsOf(db, chat.id)[0].data.summary, ASKS.ASK_NO_STREAM_MESSAGE)
})

test("B83① 应答前流断（res close）⇒ 未决拒值、回合照跑完", async () => {
  const { db, admin, cookie } = await fixture()
  const chat = newChat(db, admin)
  const tools = fakeTools()
  const model = fakeModel([{ toolCalls: [toolCall("c1", "bash", { command: "echo x" })] }, { content: "已完成" }])
  const server = await startServer({ db, deps: { chat: model.chat, tools: tools.face } })
  const controller = new AbortController()
  try {
    const stream = await openStream(server.base, cookie, chat.id, { signal: controller.signal })
    const ask = await stream.wait((frame) => frame.type === "ask", "ask 帧")
    assert.equal(ask.kind, "permission")
    controller.abort() // 浏览器断连 ⇒ 服务端 res close ⇒ settleChatAsks
    await until(() => db.prepare("SELECT status FROM agent_chats WHERE id = ?").get(chat.id).status === "idle", "回合收尾")
    assert.equal(tools.invoked.length, 0)
    assert.equal(toolRowsOf(db, chat.id)[0].data.summary, ASKS.ASK_REJECTED_MESSAGE)
  } finally {
    await closeServer(server.server)
  }
})

test("B83①补 流断后再现写类 ⇒ 即时拒（无问面——不吊死回合）", async () => {
  const { db, admin, cookie } = await fixture()
  const chat = newChat(db, admin)
  const tools = fakeTools()
  const model = fakeModel([
    { toolCalls: [toolCall("c1", "bash", { command: "echo a" })] },
    { toolCalls: [toolCall("c2", "bash", { command: "echo b" })] },
    { content: "完成" },
  ])
  const server = await startServer({ db, deps: { chat: model.chat, tools: tools.face } })
  const controller = new AbortController()
  try {
    const stream = await openStream(server.base, cookie, chat.id, { signal: controller.signal })
    await stream.wait((frame) => frame.type === "ask", "首张 ask")
    controller.abort() // 流断 ⇒ 宿主落无问面态（后续写类即时拒）
    await until(() => db.prepare("SELECT status FROM agent_chats WHERE id = ?").get(chat.id).status === "idle", "回合收尾")
    assert.equal(tools.invoked.length, 0)
    const rows = toolRowsOf(db, chat.id)
    assert.deepEqual(rows.map((row) => row.data.summary), [ASKS.ASK_REJECTED_MESSAGE, ASKS.ASK_NO_STREAM_MESSAGE])
    assert.equal(auditOf(db, "chat_call").length, 2)
  } finally {
    await closeServer(server.server)
  }
})

test("B83①补二 起跑窗（宿主未登记）流断 ⇒ 随后写类零卡即时拒、回合照跑完", async () => {
  const { db, admin, cookie } = await fixture()
  const chat = newChat(db, admin)
  // 起跑窗锚点 = `buildChatToolFace` 的 MCP 建连 await（`createChatAskHost` 在其后）——闸门把宿主登记前的那扇窗撑开（第三回合才拉闸）
  db.prepare("INSERT INTO mcp_servers (name, transport, command, args_json, enabled, created_at, updated_at) VALUES ('gate', 'stdio', 'node', '[]', 1, ?, ?)").run(TS, TS)
  let release = () => {}
  const gate = new Promise((resolve) => { release = resolve })
  let connects = 0
  let windowEntered = false
  const write = (id) => ({ toolCalls: [toolCall(id, "members", { op: "create", username: `u-${id}` })] })
  const model = fakeModel([write("a1"), { content: "完成" }, write("a2"), { content: "完成" }, write("a3"), { content: "完成" }])
  const server = await startServer({
    db,
    deps: {
      chat: model.chat,
      mcpConnectImpl: async () => { connects += 1; if (connects === 3) { windowEntered = true; await gate } return [] },
    },
  })
  try {
    // 清理面：正常收尾的 res close 不登记（路由判 `res.writableEnded`）——连续两回合均照常弹卡并成功结算（不污染下一回合）
    const cards = []
    const normalTurn = async () => {
      const stream = await openStream(server.base, cookie, chat.id)
      const ask = await stream.wait((frame) => frame.type === "ask", "正常回合 ask")
      cards.push(ask)
      assert.equal(await ASKS.answerChatAsk(chat.id, ask.promptId, { verdict: "once" }), true) // 卡在决（未被误降无问面）
      await stream.done()
    }
    await normalTurn()
    await normalTurn()
    assert.equal(cards.length, 2) // 第二回合仍弹卡（未被他回合残留误判为断流）
    assert.ok(cards.every((card) => card.kind === "permission"))
    assert.deepEqual(toolRowsOf(db, chat.id).map((row) => row.data.ok), [true, true]) // 两卡均放行并执行（非误拒）

    // 起跑窗断流：MCP 建连闸撑开窗口 ⇒ 宿主登记前断流（起跑窗内零帧 ⇒ 响应头未刷出：不 `await fetch` 头，否则窗口被让过去）
    const controller = new AbortController()
    const request = fetch(`${server.base}/api/admin/agent/chats/${chat.id}/messages`, {
      method: "POST",
      headers: { ...JSON_HEADERS, cookie },
      body: JSON.stringify({ content: "hi" }),
      signal: controller.signal,
    }).then(() => null, () => null)
    await until(() => windowEntered, "MCP 建连进入（起跑窗）")
    assert.equal(model.calls.length, 4) // 窗口实证①：模型未调用 ⇒ 宿主（建连之后才登记）尚未存在
    controller.abort() // 宿主登记前断流（起跑窗）
    await request // 客户端侧断连结算
    await new Promise((resolve) => setTimeout(resolve, 100)) // 服务端 res close 落定（建连闸仍闭——窗内）
    assert.equal(model.calls.length, 4) // 窗口实证②：此刻仍在起跑窗（宿主未登记）
    release() // 放行建连 ⇒ 回合继续（宿主此后才登记）
    // 判定：写类调用零等待（不弹无人应答的卡）+ 回合跑完（不吊死——`until` 2s 上限即判据）
    await until(() => db.prepare("SELECT status FROM agent_chats WHERE id = ?").get(chat.id).status === "idle", "回合收尾")
    assert.equal(model.calls.length, 6) // 回合照跑完（工具回灌后第二次模型调用）
    const rows = toolRowsOf(db, chat.id)
    assert.equal(rows.length, 3) // 前两回合卡片放行各一行 + 本回合拒行
    assert.equal(rows[2].data.summary, ASKS.ASK_NO_STREAM_MESSAGE) // 零卡 ⇒ 无问面即时拒
    assert.equal(JSON.parse(rows[2].content).message, ASKS.ASK_NO_STREAM_MESSAGE)
    assert.equal(auditOf(db, "chat_call")[2].detail.resultCode, -1)
  } finally {
    release()
    await closeServer(server.server)
  }
})

test("B83①补三 批卡 oneByOne 后断流 ⇒ 余件零卡即时拒、回合照跑完", async () => {
  const { db, admin, cookie } = await fixture()
  const chat = newChat(db, admin)
  // 首件执行闸：首件放行后在真实 I/O 位拉闸——客户端恰在此窗断流（此后 `admit` 的逐件径不得再造无人应答的卡）
  let releaseTool = () => {}
  const toolGate = new Promise((resolve) => { releaseTool = resolve })
  const invoked = []
  const face = {
    names: ["bash", "members"],
    schemas: [],
    readonlyOf: (name) => name === "ls",
    invoke: async (name) => {
      invoked.push(name)
      if (name === "bash") await toolGate
      return { ok: true, summary: `${name} ok`, output: `${name} out` }
    },
  }
  const model = fakeModel([
    { toolCalls: [toolCall("c1", "bash", { command: "echo a" }), toolCall("c2", "members", { op: "create", username: "u-x" })] },
    { content: "完成" },
  ])
  const server = await startServer({ db, deps: { chat: model.chat, tools: face } })
  const controller = new AbortController()
  try {
    const stream = await openStream(server.base, cookie, chat.id, { signal: controller.signal })
    const batch = await stream.wait((frame) => frame.type === "ask", "批卡")
    assert.equal(batch.kind, "batch")
    await ASKS.answerChatAsk(chat.id, batch.promptId, { verdict: "oneByOne" })
    const first = await stream.wait((frame) => frame.type === "ask" && frame.promptId !== batch.promptId && frame.tool === "bash", "首件卡")
    await ASKS.answerChatAsk(chat.id, first.promptId, { verdict: "once" })
    await until(() => invoked.length === 1, "首件执行中（闸门）")
    controller.abort() // 首件执行期间断流 ⇒ 余件弹卡口须零等待（不造无人应答的卡）
    await stream.task // 客户端侧断连结算
    await new Promise((resolve) => setTimeout(resolve, 100)) // 服务端 res close 落定
    releaseTool() // 首件返回 ⇒ 环内走到余件
    await until(() => db.prepare("SELECT status FROM agent_chats WHERE id = ?").get(chat.id).status === "idle", "回合收尾")
    assert.deepEqual(invoked, ["bash"]) // 余件零执行
    const rows = toolRowsOf(db, chat.id)
    assert.equal(rows.length, 2)
    assert.equal(rows[0].data.ok, true) // 首件已放行并执行
    assert.equal(rows[1].data.summary, ASKS.ASK_NO_STREAM_MESSAGE) // 余件 = 无问面即时拒（零卡——非挂死）
    assert.deepEqual(auditOf(db, "chat_call").map((row) => row.detail.resultCode), [0, -1])
  } finally {
    releaseTool()
    await closeServer(server.server)
  }
})



// ── ⑦ 应答端点契约（E64 ∥ PATCH 三键互斥 ∥ 行形四端）──────────────────────────

test("E64 应答端点：三态 ∥ 400 零副作用 ∥ 未知/已了结 ∥ 体与 kind 不符", async () => {
  const { db, admin, cookie } = await fixture()
  const plain = await createMember(db, { username: "plain", name: "Plain", role: "user" }) // 同库 —— 403 面（异库会话 ⇒ 401 非 403）
  const userCookie = `${SESSION_COOKIE}=${createSession(db, plain.member.id).token}`
  const chat = newChat(db, admin)
  const tools = fakeTools()
  const model = fakeModel([{ toolCalls: [toolCall("c1", "bash", { command: "echo x" })] }, { content: "完成" }])
  const server = await startServer({ db, deps: { chat: model.chat, tools: tools.face } })
  try {
    const stream = await openStream(server.base, cookie, chat.id)
    const ask = await stream.wait((frame) => frame.type === "ask", "ask 帧")
    const answerPath = `/api/admin/agent/chats/${chat.id}/asks/${ask.promptId}`

    assert.equal((await api(server.base, null, "POST", answerPath, { verdict: "once" })).status, 401)
    assert.equal((await api(server.base, userCookie, "POST", answerPath, { verdict: "once" })).status, 403)
    const mismatch = await api(server.base, cookie, "POST", answerPath, { answer: "x" }) // 体与 kind 不符
    assert.equal(mismatch.status, 400)
    const unknown = await api(server.base, cookie, "POST", `/api/admin/agent/chats/${chat.id}/asks/ask-unknown`, { verdict: "once" })
    assert.equal(unknown.status, 400)
    const missing = await api(server.base, cookie, "POST", `/api/admin/agent/chats/999/asks/${ask.promptId}`, { verdict: "once" })
    assert.equal(missing.status, 404)
    const ok = await api(server.base, cookie, "POST", answerPath, { verdict: "once" }) // 三错形零副作用 ⇒ 仍在决
    assert.equal(ok.status, 200)
    assert.deepEqual(ok.data, { ok: true })
    const settled = await api(server.base, cookie, "POST", answerPath, { verdict: "once" }) // 已了结
    assert.equal(settled.status, 400)
    await stream.done()
    const end = stream.frames.find((frame) => frame.type === "end")
    assert.equal(end.status, "succeeded")
    assert.deepEqual(tools.invoked.map((item) => item.name), ["bash"])
  } finally {
    await closeServer(server.server)
  }
})

test("PATCH 三键互斥 ∥ autoApprove 形校验 ∥ 会话行四端同形", async () => {
  const { db, admin, cookie } = await fixture()
  const server = await startServer({ db, deps: {} })
  try {
    const created = await api(server.base, cookie, "POST", "/api/admin/agent/chats", { model: "test/m1" })
    assert.equal(created.status, 200)
    assert.deepEqual(Object.keys(created.data.chat).sort(), ["autoApprove", "createdAt", "id", "model", "reasoning", "status", "updatedAt"].sort())
    assert.equal(created.data.chat.autoApprove, false)
    const chatId = created.data.chat.id

    assert.equal((await api(server.base, cookie, "PATCH", `/api/admin/agent/chats/${chatId}`, { model: "test/m1", autoApprove: true })).status, 400) // 双携
    assert.equal((await api(server.base, cookie, "PATCH", `/api/admin/agent/chats/${chatId}`, { autoApprove: "yes" })).status, 400) // 非布尔
    assert.equal(db.prepare("SELECT auto_approve FROM agent_chats WHERE id = ?").get(chatId).auto_approve, 0) // 库零变
    const set = await api(server.base, cookie, "PATCH", `/api/admin/agent/chats/${chatId}`, { autoApprove: true })
    assert.equal(set.status, 200)
    assert.equal(set.data.chat.autoApprove, true)
    const listed = await api(server.base, cookie, "GET", "/api/admin/agent/chats")
    assert.equal(listed.data.chats[0].autoApprove, true) // 列表同形
    const detail = await api(server.base, cookie, "GET", `/api/admin/agent/chats/${chatId}`)
    assert.equal(detail.data.chat.autoApprove, true) // 详情同形
  } finally {
    await closeServer(server.server)
  }
})

// ── ⑧ 结构（v25 ∥ 七端点 ∥ readonlyOf 四缝）──────────────────────────────────

test("结构：v25 迁移（列面/默认/幂等）∥ 七端点", async () => {
  assert.equal(SCHEMA_VERSION, 25)
  const db = openDatabase(":memory:")
  assert.equal(Number(db.prepare("PRAGMA user_version").get().user_version), 25)
  assert.ok(db.prepare("PRAGMA table_info(agent_chats)").all().some((column) => column.name === "auto_approve"))
  assert.equal(migrate(db), 25) // 幂等（再开零变）
  const { member } = await createMember(db, { username: "boss", name: "Boss", role: "admin" })
  const info = db.prepare("INSERT INTO agent_chats (model, status, created_by, created_at, updated_at) VALUES (?, 'idle', ?, ?, ?)").run("test/m1", member.id, TS, TS)
  const row = db.prepare("SELECT * FROM agent_chats WHERE id = ?").get(Number(info.lastInsertRowid))
  assert.equal(row.auto_approve, 0) // 存量/新行默认 = 问

  const routes = createRouteTable()
  registerChatRoutes(routes, { db })
  assert.equal(routes.size, 7) // 六端点 + ask 应答（KD-SV-224）
})

test("readonlyOf 四缝判类（管理族逐动词表 ∥ 环境族核旗 ∥ MCP 恒写 ∥ 管面 list 免）", async () => {
  // 管理族（chat-tools）
  assert.equal(chatReadonlyOf("members", { op: "list" }), true)
  assert.equal(chatReadonlyOf("providers", { op: "list" }), true)
  assert.equal(chatReadonlyOf("models", { op: "list" }), true)
  assert.equal(chatReadonlyOf("usage", { op: "rows" }), true)
  assert.equal(chatReadonlyOf("audit", { op: "query" }), true)
  assert.equal(chatReadonlyOf("runners", { op: "list" }), true)
  assert.equal(chatReadonlyOf("members", { op: "create" }), false)
  assert.equal(chatReadonlyOf("models", { op: "test" }), false)
  assert.equal(chatReadonlyOf("docker", { op: "ps" }), false)
  assert.equal(chatReadonlyOf("exec", { command: "true" }), false)

  // 环境族（核旗逐字）
  const coreTool = (name, readonly) => ({ name, description: "", parameters: { type: "object", properties: {} }, readonly, execute: async () => "" })
  const coreTools = {
    getCurrentTimeTool: coreTool("get_current_time", true),
    processTool: coreTool("process", false),
    timerTool: coreTool("timer", true),
    lsTool: coreTool("ls", true),
    readTool: coreTool("read", true),
    grepTool: coreTool("grep", true),
    bashTool: coreTool("bash", false),
    readHistoryTool: coreTool("read_history", true),
    toOpenAISchema: (tool) => ({ type: "function", function: { name: tool.name, description: "", parameters: tool.parameters } }),
  }
  const env = await createEnvTools({ coreTools })
  for (const name of ["get_current_time", "ls", "read", "grep", "timer", "read_history"]) assert.equal(env.readonlyOf(name), true, name)
  for (const name of ["bash", "process"]) assert.equal(env.readonlyOf(name), false, name)

  // MCP 管面（`mcp.list` 免；余问）
  const { db } = await fixture()
  const mcpAdmin = createMcpAdminTools({ db })
  assert.equal(mcpAdmin.readonlyOf("mcp", { op: "list" }), true)
  for (const op of ["add", "update", "remove", "probe"]) assert.equal(mcpAdmin.readonlyOf("mcp", { op }), false, op)
  assert.equal(mcpAdminReadonlyOf("mcp", { op: "list" }), true)

  // MCP 面（核件恒写类）
  db.prepare("INSERT INTO mcp_servers (name, transport, command, args_json, enabled, created_at, updated_at) VALUES ('s1', 'stdio', 'node', '[]', 1, ?, ?)").run(TS, TS)
  const face = await createMcpToolFace({
    db,
    deps: { mcpConnectImpl: async () => [{ name: "s1_echo", description: "d", parameters: { type: "object", properties: {} }, execute: async () => "ok" }] },
  })
  assert.ok(face !== null)
  assert.equal(face.readonlyOf("s1_echo"), false)
})

test("合并面判类（真装配）：读类直执行 ∥ 写类单件卡 ⇒ reject 零执行", async () => {
  const { db, admin } = await fixture()
  const chat = newChat(db, admin)
  const model = fakeModel([
    { toolCalls: [toolCall("c1", "members", { op: "list" }), toolCall("c2", "members", { op: "create" })] },
    { content: "完成" },
  ])
  const frames = sink()
  const run = runTurn({ db, chatId: chat.id, chat: model.chat, tools: null, emit: frames.emit }) // tools 缺省 ⇒ 真装配（chatTools + 管面 mcp）
  const ask = await until(() => frames.frames.find((frame) => frame.type === "ask"), "写类卡")
  assert.equal(ask.kind, "permission") // 仅写类入卡（读类零弹）
  assert.equal(ask.tool, "members")
  await ASKS.answerChatAsk(chat.id, ask.promptId, { verdict: "reject" })
  assert.equal((await run).status, "succeeded")
  const calls = auditOf(db, "chat_call")
  assert.deepEqual(calls.map((row) => [row.detail.tool, row.detail.resultCode]), [["members", 0], ["members", -1]]) // 读类执行 ∥ 写类拒
})

// ── HTTP 面小件 ───────────────────────────────────────────────────────────────

async function startServer({ db, deps = {} }) {
  const routes = createRouteTable()
  registerChatRoutes(routes, { db, deps })
  const server = createGatewayServer({ routes })
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
  return { server, base: `http://127.0.0.1:${server.address().port}`, routes }
}

/** 关服务器（先断开活连接——失败路径上的在途流不拖死 `close`）。 */
async function closeServer(server) {
  server.closeAllConnections?.()
  await new Promise((resolve) => server.close(resolve))
}

async function api(base, cookie, method, path, body) {
  const headers = { ...JSON_HEADERS, ...(cookie === null ? {} : { cookie }) }
  const response = await fetch(`${base}${path}`, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  let data = null
  try { data = await response.json() } catch { /* 无 JSON 体 */ }
  return { status: response.status, data }
}

/** NDJSON 读流（逐行帧集 + 等待面）。 */
async function openStream(base, cookie, chatId, { signal } = {}) {
  const response = await fetch(`${base}/api/admin/agent/chats/${chatId}/messages`, {
    method: "POST",
    headers: { ...JSON_HEADERS, cookie },
    body: JSON.stringify({ content: "hi" }),
    ...(signal ? { signal } : {}),
  })
  assert.equal(response.status, 200)
  const reader = response.body.getReader()
  const frames = []
  const decoder = new TextDecoder()
  let buffer = ""
  const task = (async () => {
    for (;;) {
      const chunk = await reader.read()
      if (chunk.done) return
      buffer += decoder.decode(chunk.value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""
      for (const line of lines) if (line.trim() !== "") frames.push(JSON.parse(line))
    }
  })().catch(() => { /* 主动断连（B83①） */ })
  return { frames, task, wait: (pred, label) => until(() => frames.find(pred), label), done: () => task }
}
