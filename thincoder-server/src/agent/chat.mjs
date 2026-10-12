/**
 * chat.mjs — 聊天式驱动（`agent/ADMIN-AGENT.md` §11 ∥ KD-SV-88/89；admin-agent-chat 批——台账 #1254）：
 * 会话装配（系统简报 + 历史重放）∥ 回合环（预算 ∥ 工具循环——与任务式同一环语义）∥ 帧流编解码（`turn`/`delta`/`usage`/`call`/`result`/`end`）
 * ∥ 逐条落库（库两表——v14）∥ 终态收尾（成功 ∥ 模型错误 ∥ 预算超限 ∥ 空回合 ∥ 手动中止）∥ 重启收尾（`running` ⇒ `idle` + notice）。
 *
 * 回合语义（§11）：用户发一条 ⇒ 环跑到**自然结束**（模型无工具调用 = 成功——与任务式的 `report` 终态不同源故本档自持环体；
 * 预算常量/模型出口装配与 `run.mjs` **同源复用**——`DEFAULT_MAX_CALLS`/`DEFAULT_MAX_DURATION_MS`/`loadCoreChat`）。终止五形：
 * ① 自然结束（`succeeded`）∥ ② 预算超限 `budget` ∥ ③ 模型出口抛错 `model_error` ∥ ④ 空回合 `empty_turn` ∥ ⑤ 手动中止 `aborted`（KD-SV-107）——②③④⑤ ⇒ notice 行 + `chat_stop` 审计 + `end` 帧 `failed`。
 * 中止面（KD-SV-107——chat-shell-align 批）：**进程内登记表**（`Set<chatId>`——`requestChatAbort` ∥ `isChatAbortRequested` ∥ `clearChatAbort`；零持久化，
 * 重启天然空）+ **双通道生效**：① `AbortSignal` 透传模型出口（在途调用当即中断）∥ ② 环内检查点（每模型调用前 ∥ 每工具调用前）。
 * 帧面读数（KD-SV-106——§11.3）：`{ type: "turn", n }`（每次模型调用前）∥ `{ type: "usage", … }`（每次模型调用后、有源才发）∥ `end` 增 `durationMs`/`calls`（可字段）；**零落库**（帧面 = 视图面）。
 * 图片面（KD-SV-109）：`images`（dataURL 串列——两门已过）⇒ user 行 `data_json.imageParts`（parts 数组素形 ∥ 回放 `content` 数组）；详情响应仅 `imageCount`。
 * 档位面（KD-SV-110——console-reasoning-levels 批）：起跑读行（与 `model` 同点）⇒ 出口装配：行值 ∈ 当刻模型核枚举
 * （别名解上游真名后）⇒ provider 配置携 `reasoningEffort`；**未设 ∥ 表外 ∥ 缺核 ⇒ 零字段**（默认静默——与今日同形；档位不阻断回合）。
 * ②③ 下已生成文本 ⇒ `assistant` 行如实落库（部分文本——回放逐字一致；与 notice 行各自一行）；零文本 ⇒ 零 `assistant` 行。
 * 库面（会话 ∥ 消息序两表读写 + 行形展平 + 两条库面常量 + `parseJson`）= `chat-store.mjs`（admin-agent-awareness 批拆档：本档越 §6 预案触发线 650 ⇒
 * 机械搬运 + 重导出，行为零改；依赖方向单源 = `chat.mjs` → `chat-store.mjs`）。
 * 环境感知（KD-SV-112——admin-agent-awareness 批）：每回合三活体行（时空 ∥ 所在/身份 ∥ 所管现况——`chat-env.mjs` 造；块级降级）+ timer 到期行
 * **尾插**于历史与本轮之后（瞬态不落库——值随实况）；第四块「能力与边界」= 简报静态段 `CHAT_LIMITS_BLOCK` + 活体面 `tools.schemas`。
 * 环境工具面（KD-SV-113——`chat-env-tools.mjs`）：核件五族七件原文复用（ctx 适配 ∥ 结果归一 `{ ok, subject, summary, output }` ∥ `bash` 限幅三件）；
 * 工具动作审计（KD-SV-114）：`chat_call` detail 扩 `subject`（命令原文/路径——≤2000 字，与 `call` 同链掩蔽）∥ `truncated`（结果可见形截断位）。
 *
 * 口径：**执行不依赖连接**（断连照跑到终态——落库单源；`emit` 写失败即吞，回合不受影响）；消息逐条增量落库（KD-SV-89）；
 * 审计 = `agent_event`（`chat_call` 逐调用 ∥ `chat_stop` 异常收尾——KD-SV-91；`chat_start` 归 `chat-routes.mjs`）；
 * 秘密零入库（工具入参 `apiKey` 等敏感键 ⇒ 摘要掩蔽后入帧/入库/入审计）；工具结果 = 模型可见形（截断 ≤4000 字——回放逐字一致）。
 * 注入缝（§11——批内件依托）：模型出口 ∥ 工具面 = **模块级 setter + 参数覆盖**（默认 `null` ⇒ 回落真件，生产行为不变）。
 */
import { recordAudit } from "../accounts/audit.mjs"
import { findMemberById } from "../accounts/members.mjs"
import { HttpError } from "../gateway/errors.mjs"
import { levelsOf, noteDegraded } from "../gateway/reasoning-levels.mjs"
import { buildEnvLines, CHAT_LIMITS_BLOCK } from "./chat-env.mjs"
import { createEnvTools, noteEnvToolsDegraded, takeTimerLines, timerPadOf } from "./chat-env-tools.mjs"
import { createChatTools } from "./chat-tools.mjs"
import { appendMessage, chatRowOr404, imagePartsOf, listMessages, parseJson } from "./chat-store.mjs"
import { DEFAULT_MAX_CALLS, DEFAULT_MAX_DURATION_MS, loadCoreChat } from "./run.mjs"
import { maskSecrets } from "./tools.mjs"

// ── 库面重导出（拆档轮 2026-10-12——实现 = `chat-store.mjs`；既有导入方面零改）────────────────────
export {
  appendMessage,
  chatRowOr404,
  chatView,
  createChat,
  getChatDetail,
  imagePartsOf,
  listChats,
  listMessages,
  messageView,
  CHAT_EXCERPT_MAX,
  CHAT_ROLES,
} from "./chat-store.mjs"

/** 会话状态（库 CHECK 两值——v14 段）。 */
export const CHAT_STATUSES = Object.freeze(["idle", "running"])
/** notice `data.reason` 枚举（**五值**——重启收尾 ∥ 预算超限 ∥ 模型错误 ∥ 空回合 ∥ 手动中止；末位 = chat-shell-align 批 KD-SV-107）。 */
export const CHAT_NOTICE_REASONS = Object.freeze(["restart", "budget", "model_error", "empty_turn", "aborted"])

/** 工具结果落库上限（模型可见形——KD-SV-89/§11「≤4000 字：回放逐字一致」）。 */
export const CHAT_TOOL_CONTENT_MAX = 4000
/** `call` 帧 `args` 摘要上限（字符串；掩蔽后截断——§11/`gateway/API.md` §2.8）。 */
export const CHAT_CALL_ARGS_MAX = 500
/** `result` 帧摘要上限（掩蔽后——同上）。 */
export const CHAT_RESULT_SUMMARY_MAX = 300
/** 审计 `subject` 上限（命令原文/路径——≤2000 字，逾限截断并注记；KD-SV-114）。 */
export const CHAT_SUBJECT_MAX = 2000

/** 系统简报基础段（§11——管理面用途句 + 行动纪律句；提示词级，非机制门）。 */
const CHAT_SYSTEM_BASE = [
  "你是 ThinCoder server 的管理面 agent（聊天式驱动）。用途 = 运维/管理：托管接入 ∥ 机队（节点/容器）∥ 成员与 provider 管理 ∥ 审查排障——非开发用途。",
  "你可以调用管理面工具（members ∥ providers ∥ models ∥ usage ∥ audit ∥ runners ∥ docker）直接读写 server 管理面；工具结果 = `{ ok, … }`（`ok:false` 时看 message 自行纠正或改路线）。",
  "",
  "# 行动纪律",
  "- 先查后动：先取读数（list ∥ summary ∥ 详情），再动作；不确定 ⇒ 问用户。",
  "- 结果用逐句人话；读数引用工具返回的原值。",
  "- 破坏性动作（删节点 ∥ 吊销凭据 ∥ 重置密码 ∥ 删 provider ∥ 停模型）先说明将做什么、再执行。",
  "- 报错说清停在哪一步与原因；不臆测、不编造读数。",
].join("\n")

/** 系统简报 = 基础段 + **第四块「能力与边界」**（§14.1 ④——`CHAT_LIMITS_BLOCK` 静态段；活体面 = 当回合 `tools.schemas`）。 */
export const CHAT_SYSTEM_BRIEF = `${CHAT_SYSTEM_BASE}\n\n${CHAT_LIMITS_BLOCK}`

/** 回合终态文案（②③④——人话；`content` 面；notice 行同落）。 */
export function noticeTextOf(reason, detail = null) {
  if (reason === "restart") return "server 重启——本轮中断（如实收尾）"
  if (reason === "budget") return detail ?? "预算超限——本轮已停"
  if (reason === "model_error") return detail ? `模型调用失败：${detail}` : "模型调用失败——本轮中断"
  if (reason === "empty_turn") return "模型空回合（无文本无工具调用）——本轮无输出"
  if (reason === "aborted") return "已手动中止——本轮已停"
  return String(detail ?? reason)
}

// ── 回合中止登记表（§11.2③/KD-SV-107——进程内，零持久化：重启天然空）────────────────────

/** 已登记中止的会话 id 集（检查点读面；路由 `…/abort` = 写面）。 */
const abortRequests = new Set()
/** 在途回合的信号触发口（`chatId ⇒ AbortController`——在途模型调用当即中断；随回合 `finally` 删）。 */
const abortSignals = new Map()

/** 登记中止（路由面）：置集 + 触发在途信号（无在途 ⇒ 只置集——下一检查点即收尾）。 */
export function requestChatAbort(id) {
  const key = Number(id)
  abortRequests.add(key)
  abortSignals.get(key)?.abort()
}

/** 中止是否已登记（环内两检查点读面）。 */
export function isChatAbortRequested(id) {
  return abortRequests.has(Number(id))
}

/** 清登记（回合收尾 `finally` 单点——登记表随回合生命周期，零残留）。 */
export function clearChatAbort(id) {
  const key = Number(id)
  abortRequests.delete(key)
  abortSignals.delete(key)
}

// ── 注入缝（§11——模块级；默认 null ⇒ 回落真件）───────────────────────────────
let injectedChat = null
let injectedTools = null

/** 模块级注入（批内件：假模型出口 ∥ 假工具面）；README = 默认 null（生产行为不变）。 */
export function setChatTestDeps({ chat = null, tools = null } = {}) {
  injectedChat = chat
  injectedTools = tools
}

/** 当前注入面（诊断/收尾复位用）。 */
export function getChatTestDeps() {
  return { chat: injectedChat, tools: injectedTools }
}

// ── 在途门（`running` ⇒ 400 人话——单文单源：路由预检 ∥ 置位两处同用）────────

/** 在途门报文（§11/E40——单文单源）。 */
export const CHAT_BUSY_MESSAGE = "本会话正在执行——等它结束"

/** 在途门 + 置在途（**同步段**——检查与置位无 await 间点，单写者下无竞态）：`running` ⇒ 400 人话。 */
export function claimChatTurn(db, id, { now = Date.now } = {}) {
  const row = chatRowOr404(db, id)
  assertChatIdle(row)
  db.prepare("UPDATE agent_chats SET status = 'running', updated_at = ? WHERE id = ?").run(new Date(now()).toISOString(), row.id)
  return db.prepare("SELECT * FROM agent_chats WHERE id = ?").get(row.id)
}

/** 在途门只读预检（报文与置位同一个——路由按 §2.8 行序先检在途再校模型）。 */
export function assertChatIdle(row) {
  if (row.status === "running") throw new HttpError("invalid_request_error", CHAT_BUSY_MESSAGE)
  return row
}

/** 收尾（回合终结 ⇒ `idle`；`updated_at` 随动）。 */
export function settleChatIdle(db, id, { now = Date.now } = {}) {
  db.prepare("UPDATE agent_chats SET status = 'idle', updated_at = ? WHERE id = ?").run(new Date(now()).toISOString(), Number(id))
}

/**
 * 重启收尾（§11 ∥ KD-SV-86——装配期执行，无端点）：在途 `running` ⇒ `idle` + notice 行（`restart`）+ `chat_stop` 审计；
 * 已落库消息零动。出 = 收尾会话数。
 */
export function resumeRunningChats(db, { now = Date.now } = {}) {
  const rows = db.prepare("SELECT * FROM agent_chats WHERE status = 'running' ORDER BY id").all()
  for (const row of rows) {
    settleChatIdle(db, row.id, { now })
    appendMessage(db, row.id, { role: "notice", content: noticeTextOf("restart"), data: { reason: "restart" }, now })
    recordAudit(db, {
      type: "agent_event",
      actor: actorNameOf(db, row.created_by),
      actorId: row.created_by ?? null,
      target: `chat:${row.id}`,
      detail: { kind: "chat_stop", chatId: row.id, reason: "restart", summary: noticeTextOf("restart") },
      ts: now(),
    })
  }
  return rows.length
}

/** 行为人名快照（会话发起 admin——`agent_event` actor 口径 = 名快照 ∥ 缺 ⇒ "admin"）。 */
function actorNameOf(db, memberId) {
  if (memberId === null || memberId === undefined) return "admin"
  return findMemberById(db, Number(memberId))?.name ?? "admin"
}

// ── 重放与编解码 ─────────────────────────────────────────────────────────────

/** 历史重放（§11/KD-SV-89）：库行 ⇒ 模型消息数组（**notice 滤除**；assistant 携 `tool_calls`；tool 携 `tool_call_id`）。 */
export function replayMessages(rows = []) {
  const messages = []
  for (const row of rows) {
    if (row.role === "user") {
      const data = parseJson(row.data_json, null)
      const parts = Array.isArray(data?.imageParts) ? data.imageParts : []
      // 图片轮 ⇒ `content` 数组（文本素 + parts——KD-SV-109）；无图轮恒字符串形（存量零变）
      messages.push(parts.length === 0
        ? { role: "user", content: row.content }
        : { role: "user", content: [{ type: "text", text: row.content }, ...parts] })
      continue
    }
    if (row.role === "assistant") {
      const data = parseJson(row.data_json, null)
      const calls = Array.isArray(data?.toolCalls) ? data.toolCalls : []
      if (calls.length > 0) {
        messages.push({
          role: "assistant",
          content: row.content,
          tool_calls: calls.map((call) => ({
            id: call.id,
            type: "function",
            function: { name: call.name, arguments: typeof call.args === "string" ? call.args : JSON.stringify(call.args ?? {}) },
          })),
        })
      } else {
        messages.push({ role: "assistant", content: row.content })
      }
      continue
    }
    if (row.role === "tool") {
      const data = parseJson(row.data_json, null)
      messages.push({ role: "tool", tool_call_id: data?.toolCallId ?? "", content: row.content })
    }
    // notice ⇒ 滤除（收尾行不入模型上下文——§11）
  }
  return messages
}

/** 回合装配（系统简报 + 历史重放 + 本轮消息——§11）。 */
export function buildTurnMessages(rows = []) {
  return [{ role: "system", content: CHAT_SYSTEM_BRIEF }, ...replayMessages(rows)]
}

/** 回合内工具调用归一（核 `{ id, name, arguments }` ∥ OpenAI `{ id, function:{ name, arguments } }` 两形——同任务面口径）。 */
export function normalizeToolCalls(toolCalls = []) {
  return (Array.isArray(toolCalls) ? toolCalls : []).map((call, index) => ({
    id: call?.id || `call_${index + 1}`,
    name: call?.name ?? call?.function?.name ?? "",
    arguments: typeof call?.arguments === "string" ? call.arguments : typeof call?.function?.arguments === "string" ? call.function.arguments : "{}",
  }))
}

/** 工具入参解析（非 JSON 对象 ⇒ null——调用侧落工具级错误，回合不停）。 */
export function parseToolArgs(text) {
  try {
    const value = JSON.parse(text === "" ? "{}" : text)
    return value !== null && typeof value === "object" && !Array.isArray(value) ? value : null
  } catch {
    return null
  }
}

/** 敏感键名（入参摘要掩蔽——秘密零入帧/库/审计；provider 密钥面 ⟮apiKey⟯ 为主）。 */
const SENSITIVE_KEYS = Object.freeze(["apikey", "secret", "password", "sudosecret", "token", "authorization", "newpassword", "oldpassword"])

/** 入参掩蔽（深拷——敏感键值 ⇒ `"***"`；键名大小写无关）。 */
export function maskArgs(value) {
  if (Array.isArray(value)) return value.map((item) => maskArgs(item))
  if (value === null || typeof value !== "object") return value
  const out = {}
  for (const [key, item] of Object.entries(value)) {
    out[key] = SENSITIVE_KEYS.includes(String(key).toLowerCase()) ? "***" : maskArgs(item)
  }
  return out
}

// ── 截断口径（上限含注记——总长不越设计上限：`args` ≤500 ∥ 摘要 ≤300 ∥ 工具结果 ≤4000）────────

/** 尾注截断（`max` = 含注记总长上限——设计句「截断 ≤N 字」字面成立）。 */
export function capText(text, max, note = "…（截断）") {
  const value = typeof text === "string" ? text : text === null || text === undefined ? "" : String(text)
  if (value.length <= max) return value
  const room = Math.max(0, max - note.length)
  return `${value.slice(0, room)}${note}`
}

/** 工具结果落库截断（模型可见形——KD-SV-89/§11「≤4000 字：回放逐字一致」）。 */
export function capToolContent(text) {
  const value = typeof text === "string" ? text : text === null || text === undefined ? "" : String(text)
  return capText(value, CHAT_TOOL_CONTENT_MAX, `…（截断——实长 ${value.length}）`)
}

/** `call` 帧 `args` = **字符串**摘要（JSON 序列化 ⇒ 掩蔽后截断 ≤500 字——恒为字符串，非对象；§11）。 */
export function argsTextOf(rawArguments) {
  const parsed = parseToolArgs(rawArguments)
  const source = parsed === null ? String(rawArguments ?? "") : JSON.stringify(maskArgs(parsed))
  return capText(maskSecrets(source, []), CHAT_CALL_ARGS_MAX)
}

/** 敏感值集（本轮工具入参中的敏感键值——下游文本一并掩蔽；沿任务面 `maskSecrets(text, secrets)` 口径）。 */
export function secretValuesOf(value, out = []) {
  if (Array.isArray(value)) {
    for (const item of value) secretValuesOf(item, out)
    return out
  }
  if (value === null || typeof value !== "object") return out
  for (const [key, item] of Object.entries(value)) {
    if (SENSITIVE_KEYS.includes(String(key).toLowerCase())) {
      if (typeof item === "string" && item.length >= 4) out.push(item) // 短值不掩（会误伤普通文本——沿任务面 maskSecrets 门）
      continue
    }
    secretValuesOf(item, out)
  }
  return out
}

/** 工具结果摘要（`result` 帧 ∥ tool 行 `data.summary`——掩蔽后截断 ≤300 字）。 */
export function summaryOfResult(result, secrets = []) {
  const base = typeof result?.summary === "string" && result.summary !== "" ? result.summary : typeof result?.message === "string" ? result.message : JSON.stringify(result ?? null)
  return capSummary(base, secrets)
}

/** 摘要口径（掩蔽 + 截断 ≤300 字——`result` 帧 ∥ tool 行 ∥ notice/`chat_stop` 三面同源）。 */
export function capSummary(text, secrets = []) {
  const raw = typeof text === "string" ? text : text === null || text === undefined ? "" : String(text)
  return capText(maskSecrets(raw, secrets), CHAT_RESULT_SUMMARY_MAX)
}

/** 审计 `subject` 口径（KD-SV-114——主语原文 ≤2000 字含注记；**与 `call` 同链过会话面掩蔽**——「原文」非免掩蔽）。 */
export function capSubject(subject, secrets = []) {
  return capText(maskSecrets(subject ?? "", secrets), CHAT_SUBJECT_MAX)
}

/** 环境工具结果 → 模型可见文本（核件 `output` 文本原文——**非 JSON 壳**，KD-SV-113 被否栏；错误 ⇒ 人话 message）。 */
export function envToolText(result) {
  if (typeof result?.output === "string") return result.output
  if (typeof result?.message === "string") return result.message
  return ""
}

/** 工具面合并（§14.2——管理面七件 ∪ 环境五族七件）：名/schema 并集；`invoke(name, args, ctx)` 按名路由（环境族携 ctx）。 */
function mergeToolFaces(base, extra) {
  if (extra === null) return base
  const envNames = new Set(extra.names)
  return {
    names: [...base.names, ...extra.names],
    schemas: [...base.schemas, ...extra.schemas],
    invoke: (name, args, ctx) => (envNames.has(name) ? extra.invoke(name, args, ctx) : base.invoke(name, args)),
  }
}

/** 聊天面工具面装配（§14.2）：管理面七件 + 环境五族七件（动载核件——沿 `loadCoreChat` 先例）。
 *  缺核 ⇒ 环境族不注册 + 一条警告（回合不阻断——模型出口同源缺核时回合走 `model_error` 收尾）。 */
async function buildChatToolFace({ db, deps, log }) {
  const chatTools = createChatTools({
    db,
    runtime: deps.runtime ?? null,
    config: deps.config ?? {},
    env: deps.env ?? process.env,
    fetchImpl: deps.fetchImpl ?? fetch,
    ...(deps.discoverFetchImpl ? { discoverFetchImpl: deps.discoverFetchImpl } : {}),
    guard: deps.guard ?? null,
    log,
  })
  let envTools = null
  try {
    envTools = await createEnvTools({ coreTools: deps.coreTools ?? null })
  } catch (e) {
    noteEnvToolsDegraded(log, e) // 环境族不注册（回合不阻断）
    return { tools: chatTools, envTools: null }
  }
  return { tools: mergeToolFaces(chatTools, envTools), envTools }
}

/** 模型出口装配（§5/§11——与任务面同源：库单源 `providers` ⇒ 核 provider 客户端；**透传 `onToken`** ⇒ `delta` 帧增量）。
 *  档位（KD-SV-110）：`reasoning` 非空且 ∈ 当刻模型核枚举（别名解上游真名后——dispatch 命中名）⇒ provider 配置携
 *  `reasoningEffort`；**未设 ∥ 表外 ∥ 缺核 ⇒ 零字段**（默认静默——与今日行为逐字同；核载荷门/枚举门单源消费）。 */
export async function buildChatExit({ db, ref, reasoning = null, chatImpl = null, env = process.env, log = null } = {}) {
  const { createProviderRegistry, listProviderEntries } = await import("../gateway/providers.mjs")
  const registry = createProviderRegistry(listProviderEntries(db), { env })
  const hit = registry.dispatch(ref)
  if (hit.miss) throw new Error(`模型不可用：${String(ref)}（注册表未命中——建会话时已校验，此处为复检）`)
  const chat = chatImpl ?? (await loadCoreChat())
  let reasoningEffort = null
  if (typeof reasoning === "string" && reasoning !== "") {
    try {
      if ((await levelsOf(hit.model)).includes(reasoning)) reasoningEffort = reasoning
    } catch (e) {
      noteDegraded(log, "chat_assembly", e) // 缺核 ⇒ 零字段（档位面退中性——回合不阻断；真因入日志）
    }
  }
  return async ({ messages, tools, onToken, signal }) => // `signal` 透传核（回合中止——KD-SV-107；缺 ⇒ 核不挂取消链）
    chat(
      {
        baseURL: hit.provider.baseURL,
        apiKey: hit.provider.apiKey,
        model: hit.model,
        name: hit.provider.name,
        ...(reasoningEffort === null ? {} : { reasoningEffort }), // 未设 ∥ 表外 ⇒ 零字段（口径②）
      },
      { messages, tools, onToken, signal },
    )
}

/** `usage` 帧成形（§11.3——核 `chat()` 返回的 usage 形 ⇒ 帧面短键；入参缺 ∥ 非对象 ⇒ `null` = 无源零帧；单键缺/非数 ⇒ 0）。 */
export function usageFrameOf(usage) {
  if (usage === null || typeof usage !== "object") return null
  const num = (value) => (typeof value === "number" && Number.isFinite(value) ? value : 0)
  return {
    type: "usage",
    prompt: num(usage.prompt_tokens),
    completion: num(usage.completion_tokens),
    cacheHit: num(usage.prompt_cache_hit_tokens),
    cacheMiss: num(usage.prompt_cache_miss_tokens),
  }
}

/**
 * 跑一个回合（§11——调用前须 `claimChatTurn` 置在途）：`content` = 本轮用户消息 ∥ `images` = 图片 dataURL 串列（空 = 纯文本轮；
 * 两门归路由面）∥ `emit` = 帧出口（`{ type, … }` 对象；断连写失败不反噬回合）∥ `deps` = 注入面（`chat` ∥ `tools` ∥ `runtime` ∥ `config` ∥ `env` ∥ `fetchImpl` ∥ `guard` ∥ `budget`
 * ∥ `cwd`（环境工具面相对路径基准）∥ `coreTools`（核件注入口——环境族真件/替身））。
 * 出 = `{ status, reason, calls, durationMs }`。落库/审计全在本函数内（执行不依赖连接——单源）；中止登记表随 `finally` 清。
 */
export async function runChatTurn({ db, chatId, content, images = [], emit = null, deps = {}, now = Date.now, log = null } = {}) {
  const chat = chatRowOr404(db, chatId)
  const budget = { maxCalls: deps.budget?.maxCalls ?? DEFAULT_MAX_CALLS, maxDurationMs: deps.budget?.maxDurationMs ?? DEFAULT_MAX_DURATION_MS }
  const emitFrame = (frame) => {
    try {
      emit?.(frame)
    } catch (e) {
      log?.warn("chat_stream_write_failed", { chatId: chat.id, message: e?.message ?? String(e) }) // 断连照跑（落库单源）
    }
  }
  const actor = actorNameOf(db, chat.created_by)
  const auditChatCall = ({ tool, call, subject = null, resultCode, truncated = false, summary }) =>
    recordAudit(db, {
      type: "agent_event",
      actor,
      actorId: chat.created_by ?? null,
      target: `chat:${chat.id}`,
      detail: { kind: "chat_call", chatId: chat.id, tool, call, subject, resultCode, truncated, summary },
      ts: now(),
    })
  const auditChatStop = (reason, summary) =>
    recordAudit(db, {
      type: "agent_event",
      actor,
      actorId: chat.created_by ?? null,
      target: `chat:${chat.id}`,
      detail: { kind: "chat_stop", chatId: chat.id, reason, summary },
      ts: now(),
    })

  try {
    appendMessage(db, chat.id, { role: "user", content, data: imagePartsOf(images), now }) // 逐条增量落库（本轮消息先落——断连亦留痕；图片轮携 parts 形）
    const messages = buildTurnMessages(listMessages(db, chat.id))
    // 环境块（§14.1/KD-SV-112）：三活体行尾插（历史与本轮之后——前缀缓存理由）+ timer 到期行随组同落；**瞬态不落库**（不进回放）。
    const envLines = buildEnvLines({ db, model: chat.model, reasoning: chat.reasoning ?? null, cwd: deps.cwd ?? process.cwd(), now, env: deps.env ?? process.env })
    const timerLines = await takeTimerLines(chat.id, { now, log, coreTools: deps.coreTools ?? null })
    for (const line of [...envLines, ...timerLines]) messages.push({ role: "user", content: line })
    // 工具面（§14.2）：注入面（deps.tools ∥ 模块级）优先；否则 = 管理面七件 + 环境五族七件合并。
    const injectedFace = deps.tools ?? injectedTools ?? null
    const face = injectedFace === null ? await buildChatToolFace({ db, deps, log }) : { tools: injectedFace, envTools: null }
    const tools = face.tools
    const envNames = new Set(face.envTools?.names ?? [])

    const started = now()
    let calls = 0
    const turnSecrets = [] // 本轮已见敏感值（工具入参）——下游文本（结果/摘要/notice）一并掩蔽

    /** 异常收尾（②③④——notice 行 + `chat_stop` 审计 + `end` 帧 `failed`）：部分文本 ⇒ `assistant` 行如实落库。 */
    const closeFailed = (reason, detail, partialText = "") => {
      if (typeof partialText === "string" && partialText.trim() !== "") {
        appendMessage(db, chat.id, { role: "assistant", content: partialText, now })
      }
      const text = capSummary(noticeTextOf(reason, detail), turnSecrets) // 摘要口径（≤300 字 + 掩蔽）——notice 行 ∥ `chat_stop` 审计 ∥ `end` 帧三面同源
      appendMessage(db, chat.id, { role: "notice", content: text, data: { reason }, now })
      auditChatStop(reason, text)
      const durationMs = now() - started
      emitFrame({ type: "end", status: "failed", reason: text, durationMs, calls }) // 帧面读数（§11.3——可字段）
      return { status: "failed", reason: text, calls, durationMs }
    }

    // 中止信号（KD-SV-107——在途调用当即中断之口）：登记 ⇒ 路由 `…/abort` 即触发；`finally` 清登记。
    const controller = new AbortController()
    abortSignals.set(chat.id, controller)
    // 环境工具面 ctx（§14.2）：`cwd` = 相对路径基准（无围栏）∥ `signal` = 中止信号透传（bash 树杀同源）∥ `agent` = timer 垫片（§14.4）∥ `depth: 0`。
    const envCtx = { cwd: deps.cwd ?? process.cwd(), signal: controller.signal, agent: timerPadOf(chat.id), depth: 0 }

    // 模型出口装配（§5）：注册表缺位/引用缺位 ⇒ 按「模型错误」收尾（五终态不外溢第三形）
    let modelExit
    try {
      modelExit = deps.chat ?? injectedChat ?? (await buildChatExit({ db, ref: chat.model, reasoning: chat.reasoning ?? null, env: deps.env ?? process.env, log }))
    } catch (e) {
      return closeFailed("model_error", e?.message ?? String(e), "")
    }

    let modelCalls = 0
    for (;;) {
      const elapsed = now() - started
      if (elapsed > budget.maxDurationMs) {
        return closeFailed("budget", `预算超限（时长 ${Math.round(elapsed / 1000)}s > 上限 ${Math.round(budget.maxDurationMs / 1000)}s）——停`)
      }
      if (calls >= budget.maxCalls) {
        return closeFailed("budget", `预算超限（工具调用 ${calls} ≥ 上限 ${budget.maxCalls} 次）——停`)
      }
      if (isChatAbortRequested(chat.id)) return closeFailed("aborted", null, "") // 检查点①（模型调用前）
      let turn
      let streamed = ""
      modelCalls += 1
      emitFrame({ type: "turn", n: modelCalls }) // 帧面读数（§11.3——每次模型调用前）
      try {
        turn = await modelExit({
          messages,
          tools: tools.schemas,
          signal: controller.signal,
          onToken: (token) => {
            if (typeof token !== "string" || token === "") return
            streamed += token
            emitFrame({ type: "delta", text: token })
          },
        })
      } catch (e) {
        // 中止 ⇒ 第五终态（`AbortError` 与模型错误同形 ⇒ 判决读登记表）
        if (isChatAbortRequested(chat.id)) return closeFailed("aborted", null, streamed)
        return closeFailed("model_error", e?.message ?? String(e), streamed)
      }
      const usageFrame = usageFrameOf(turn?.usage)
      if (usageFrame !== null) emitFrame(usageFrame) // 每次模型调用后（有源才发）
      const text = typeof turn?.content === "string" && turn.content !== "" ? turn.content : streamed // 已生成文本优先（流式增量兜底——如实落库）
      const toolCalls = normalizeToolCalls(turn?.toolCalls)
      if (toolCalls.length === 0) {
        if (text.trim() === "") return closeFailed("empty_turn", null, "")
        appendMessage(db, chat.id, { role: "assistant", content: text, now })
        messages.push({ role: "assistant", content: text })
        const durationMs = now() - started
        emitFrame({ type: "end", status: "succeeded", durationMs, calls }) // 帧面读数（§11.3）
        return { status: "succeeded", reason: null, calls, durationMs }
      }
      // 有工具调用：assistant 行（文本 + `toolCalls` 摘要——回放据以重建消息数组）
      const pending = toolCalls.map((call) => ({ ...call, args: argsTextOf(call.arguments) }))
      appendMessage(db, chat.id, {
        role: "assistant",
        content: text,
        data: { toolCalls: pending.map((call) => ({ id: call.id, name: call.name, args: call.args })) },
        now,
      })
      messages.push({
        role: "assistant",
        content: text,
        tool_calls: pending.map((call) => ({ id: call.id, type: "function", function: { name: call.name, arguments: call.args } })),
      })
      for (let index = 0; index < pending.length; index++) {
        const call = pending[index]
        const overBudget = calls >= budget.maxCalls || now() - started > budget.maxDurationMs
        if (overBudget) {
          // 预算在调用途中触发：未执行调用逐条落「未执行」结果（消息序一致——回放不缺 tool 行）
          for (const rest of pending.slice(index)) {
            const unrun = { ok: false, message: "预算超限——未执行（回合已停）" }
            const unrunText = JSON.stringify(unrun)
            appendMessage(db, chat.id, { role: "tool", content: unrunText, data: { toolCallId: rest.id, name: rest.name, ok: false, summary: unrun.message }, now })
            messages.push({ role: "tool", tool_call_id: rest.id, content: unrunText })
          }
          const detail = calls >= budget.maxCalls
            ? `预算超限（工具调用 ${calls} ≥ 上限 ${budget.maxCalls} 次）——停`
            : `预算超限（时长 ${Math.round((now() - started) / 1000)}s > 上限 ${Math.round(budget.maxDurationMs / 1000)}s）——停`
          return closeFailed("budget", detail, "")
        }
        if (isChatAbortRequested(chat.id)) return closeFailed("aborted", null, "") // 检查点②（工具调用前）
        calls += 1
        emitFrame({ type: "call", id: call.id, name: call.name, args: call.args })
        const args = parseToolArgs(call.arguments)
        const secrets = args === null ? [] : secretValuesOf(args)
        turnSecrets.push(...secrets)
        const result = args === null ? { ok: false, message: "工具入参非 JSON 对象" } : await tools.invoke(call.name, args, envCtx)
        const summary = summaryOfResult(result, secrets)
        emitFrame({ type: "result", id: call.id, ok: result?.ok === true, summary })
        // 模型可见形：环境族 = 核件文本原文（`output`——非 JSON 壳，KD-SV-113 被否栏）；管理族 = 结构化结果（既有形零变）
        const rawText = envNames.has(call.name) ? envToolText(result) : JSON.stringify(result ?? null)
        const resultText = maskSecrets(rawText, secrets)
        const truncated = resultText.length > CHAT_TOOL_CONTENT_MAX // 结果可见形截断位（KD-SV-114——审计 `truncated`）
        const trimmed = capToolContent(resultText) // 模型可见形（≤4000 字含注记——回放逐字一致）
        appendMessage(db, chat.id, { role: "tool", content: trimmed, data: { toolCallId: call.id, name: call.name, ok: result?.ok === true, summary }, now })
        messages.push({ role: "tool", tool_call_id: call.id, content: trimmed })
        auditChatCall({
          tool: call.name,
          call: capText(maskSecrets(call.args, secrets), CHAT_CALL_ARGS_MAX),
          subject: envNames.has(call.name) ? capSubject(result?.subject ?? "", secrets) : null, // 主语原文（命令/路径——§14.4；管理族零主事词 ⇒ null）
          resultCode: result?.ok === true ? 0 : -1,
          truncated,
          summary,
        }) // 逐调用一行（读动作同落——KD-SV-91；详情扩字段——KD-SV-114）
      }
    }
  } finally {
    clearChatAbort(chat.id) // 登记表随回合生命周期（单源——零残留）
    settleChatIdle(db, chat.id, { now })
  }
}
