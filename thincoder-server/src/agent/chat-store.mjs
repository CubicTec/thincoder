/**
 * chat-store.mjs — 管理面 chat **库面**（`agent/ADMIN-AGENT.md` §11 ∥ KD-SV-89——v14 两表单源；admin-agent-awareness 批拆档，
 * 台账 #1310：`chat.mjs` 越 §6 预案触发线 ⇒ 库面段抽出；**机械搬运 + 重导出**，行为零改）。
 *
 * 面 = 会话行/消息序**读写**（读时读，无后台常驻）∥ 行形展平（`chatView` ∥ `messageView`）∥ 两条库面常量
 * （`CHAT_ROLES` = 库 CHECK 镜像 ∥ `CHAT_EXCERPT_MAX` = 列表 `excerpt` 上限）∥ `data_json` 解码助手 `parseJson`
 * （聊天面 `replayMessages` 同用 ⇒ 导出）。
 * **依赖方向单源**：唯一方向 = `chat.mjs` → 本档（本档零反引——不 import `chat.mjs`；零循环）。回合环 ∥ 帧流 ∥ 环境块 ∥
 * 工具面 ∥ 在途门 ∥ 重放编解码 = `chat.mjs` 面（本档只出库面）。
 * 导出面经 `chat.mjs` 重导出（既有导入方零改——含批内件经 `CHAT.CHAT_EXCERPT_MAX` 的命名空间取法）。
 */
import { HttpError } from "../gateway/errors.mjs"

/** 消息角色（库 CHECK 四值——v14 段；notice = 回放滤除的收尾行）。 */
export const CHAT_ROLES = Object.freeze(["user", "assistant", "tool", "notice"])
/** 会话列表 `excerpt` 上限（首条用户消息截断——`gateway/API.md` §2.8）。 */
export const CHAT_EXCERPT_MAX = 40

/** `data_json` 解码（对象形——坏 JSON ∥ 非对象 ⇒ `fallback`）。 */
export function parseJson(text, fallback = null) {
  try {
    const value = JSON.parse(text ?? "")
    return value === null || typeof value !== "object" ? fallback : value
  } catch {
    return fallback
  }
}

// ── 库面（会话 ∥ 消息序——v14 两表；读时读，无后台常驻）───────────────────────

/** 会话行 or 404（`not_found`）。 */
export function chatRowOr404(db, id) {
  const row = db.prepare("SELECT * FROM agent_chats WHERE id = ?").get(Number(id))
  if (!row) throw new HttpError("not_found", `会话不存在：${String(id)}`)
  return row
}

/** 会话读数（§2.8 行形——`excerpt` = 首条用户消息截断 ≤40 字；无消息 ⇒ 空串）。 */
export function chatView(db, row) {
  const first = db.prepare("SELECT content FROM agent_chat_messages WHERE chat_id = ? AND role = 'user' ORDER BY seq LIMIT 1").get(row.id)
  const content = typeof first?.content === "string" ? first.content : ""
  return {
    id: row.id,
    model: row.model,
    reasoning: row.reasoning ?? null, // 会话级思考档位（v16——`null` = 未设；KD-SV-110）
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    excerpt: content.length > CHAT_EXCERPT_MAX ? content.slice(0, CHAT_EXCERPT_MAX) : content,
  }
}

/** 会话列表（倒序——新在前）。 */
export function listChats(db, { limit = 100 } = {}) {
  const rows = db.prepare("SELECT * FROM agent_chats ORDER BY id DESC LIMIT ?").all(Number(limit))
  return { chats: rows.map((row) => chatView(db, row)) }
}

/** 图片轮附加形（KD-SV-109——dataURL 数组 ⇒ parts 数组素形；空 ⇒ `null` 零键）。 */
export function imagePartsOf(images = []) {
  const list = Array.isArray(images) ? images : []
  if (list.length === 0) return null
  return { imageParts: list.map((url) => ({ type: "image_url", image_url: { url: String(url) } })) }
}

/** 消息读数（§2.8 行形；`data` = 附加形解码——**图片只出计数**（user 行 `imageCount`——dataURL 零下发）∥ 序 = `seq` 升序）。 */
export function messageView(row) {
  const data = parseJson(row.data_json, null)
  if (row.role === "user" && Array.isArray(data?.imageParts)) {
    return { seq: row.seq, role: row.role, content: row.content, data: { imageCount: data.imageParts.length }, createdAt: row.created_at }
  }
  return {
    seq: row.seq,
    role: row.role,
    content: row.content,
    data,
    createdAt: row.created_at,
  }
}

/** 消息全量（seq 升序）。 */
export function listMessages(db, chatId) {
  return db.prepare("SELECT * FROM agent_chat_messages WHERE chat_id = ? ORDER BY seq").all(Number(chatId))
}

/** 会话详情（`{ chat, messages }`——不存在 ⇒ null）。 */
export function getChatDetail(db, id) {
  const row = db.prepare("SELECT * FROM agent_chats WHERE id = ?").get(Number(id))
  if (!row) return null
  return { chat: chatView(db, row), messages: listMessages(db, row.id).map(messageView) }
}

/** 建会话（`model` 合法性归路由面——KD-SV-87 同判）：出 = 会话行。 */
export function createChat(db, { model, createdBy = null, now = Date.now } = {}) {
  const ts = new Date(now()).toISOString()
  const info = db.prepare("INSERT INTO agent_chats (model, status, created_by, created_at, updated_at) VALUES (?, 'idle', ?, ?, ?)").run(String(model), createdBy, ts, ts)
  return db.prepare("SELECT * FROM agent_chats WHERE id = ?").get(Number(info.lastInsertRowid))
}

/** 追加一条消息（`seq` = 会话内自增——逐条增量落库）。出 = 行。 */
export function appendMessage(db, chatId, { role, content = "", data = null, now = Date.now } = {}) {
  if (!CHAT_ROLES.includes(role)) throw new Error(`消息角色非法：${String(role)}（${CHAT_ROLES.join(" ∥ ")}）`)
  const ts = new Date(now()).toISOString()
  const info = db
    .prepare(
      `INSERT INTO agent_chat_messages (chat_id, seq, role, content, data_json, created_at)
       VALUES (?, (SELECT COALESCE(MAX(seq), 0) + 1 FROM agent_chat_messages WHERE chat_id = ?), ?, ?, ?, ?)`,
    )
    .run(Number(chatId), Number(chatId), role, String(content ?? ""), data === null ? null : JSON.stringify(data), ts)
  db.prepare("UPDATE agent_chats SET updated_at = ? WHERE id = ?").run(ts, Number(chatId))
  return db.prepare("SELECT * FROM agent_chat_messages WHERE id = ?").get(Number(info.lastInsertRowid))
}
