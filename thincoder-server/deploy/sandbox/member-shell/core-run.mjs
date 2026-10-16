/**
 * core-run.mjs — 核回合驱动（member-face-chat 批 · 盒壳；member-face-parity 批扩十一回调 ∥ ask 回路 ∥ 行扩）
 *
 * 职责 = 把盒 env 接进核装配序、把一个回合跑成帧流（`agent/MEMBER-AGENT.md` §3.10「最小壳」）。
 * **不是第二套 agent**：循环/会话/提示词/工具一律取核件（`@thincoder/core`）——壳零 agent 循环
 * 自实现（AC-50④ 判据：import 面断言）。壳↔核 = **核既有导出件**（`sandbox/EXECUTION.md` §8
 * 会话读写面——核码零改）。
 *
 * 核件坐标（本档实际消费面——实施当刻实读）：
 *   装配 `core/agent/assemble.mjs` `assembleAgent`/`validateProvider` ∥ 回合 `core/agent.mjs`
 *   `runAgent` ∥ 会话 `core/session.mjs`（`applySession`/`saveSession`/`loadSlotFile`/`listSlots`/
 *   `newSession`/`loadManifest`/`slotPath`/`deleteSlot`/`renameSlot`）∥ 偏好与四旗写面
 *   `core/session-slot-write.mjs`（`setSlotPrefs`/`setSlotAutoApprove`/`setSlotPlanMode`/
 *   `setSlotEngineering`/`setSlotAdvisorGuard`）∥ 配置 `core/config.mjs` `loadConfig` ∥ 事件 token
 *   文法 `core/agent/relay-prefix.mjs` `parseRelayPath`（本批：relay 前缀 token **零剥离** ⇒ `sub` 帧）
 *   ∥ 停单件控制面 `core/agent-tools/subagent-async.mjs`（`cancelSyncChild`/`executeCancelAction`）+
 *   `core/agent-tools/async-settle.mjs` `getAsyncPool`（同桌面 `subagent-face.mjs:33-34` 先例）。
 *
 * **核导入 = 动态（`loadCore`）**：本档顶层零 `@thincoder/core` 静态 import——包只在镜像内
 * （件位 `/opt/thincoder/app/node_modules/@thincoder/core`）可解析；开发机侧单元测试经
 * `createCoreRun({ core })` 注入假件（见批内测试档）。
 *
 * **盒↔核 接口假设（四处——实施批自定形，已在批档 §5 披露）**：
 *   ① 配置桥 `withBoxProvider`：核 `loadConfig()`（盒内 config.json 缺席 ⇒ 核全默认）覆写
 *      provider 面 = 盒 env 的 server 网关（单渠道；`providers[].model` 不设——渠道单值模型
 *      2026-10-09 已退场，模型身份 = 会话槽选定）；会话槽 `activeProvider` 恒 `BOX_PROVIDER`。
 *   ② 会话行形（读指令回呈）：`{ id, model, reasoning, title, count, flags, status, excerpt, updatedAt }`
 *      —— `id` = 槽号（`.id` 复合形的服务器侧拼装归 server）；`model` = 槽 `activeModel`（成员面
 *      外标）∥ `reasoning` = 槽 `effort`（`null` = 未设）∥ `title` = 槽 `title`（空串 = 未命名）∥
 *      `count` = 槽 `history` 消息数 ∥ `flags` = 槽四旗（KD-SV-218 读面）∥ `status` = `running`/`idle`
 *      （本壳在途态）∥ `excerpt` = 首条用户消息 ≤40 字。
 *   ③ MCP 桩件并面（`mcp/MCP.md` §6.1）：逐回合取表（`./mcp-tools.mjs`——`GET /api/box/mcp`，秘密零出服务器）⇒ 防撞过滤
 *      ⇒ `runAgent(…, { extraTools })`（件序 = 成员件先 ∥ MCP 件后）；失败降级 = 零件 + 日志一条（回合不阻断）。
 *   ④ server 域成员件并面（§3.11(7)／KD-SV-222）：`./member-tools.mjs` 四件（建/启/停/销毁——工作区 key 第三门）
 *      同经 `extraTools` 缝注入；**防撞 `taken` = 装配后基集 ∪ 注入件名集（成员件四件）**——同名 MCP 件
 *      不得顶掉注入件（核 `setup.mjs:220` `toolByName` 后到者胜——先者留存）。
 */

import { existsSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { randomUUID } from "node:crypto"
import {
  RESULT_SUMMARY_MAX, answerSettlementOf, askFrame, callFrame, capText, compressFrame, deltaFrame, endFrame,
  reasoningFrame, resultFrame, subFrame, tasksFrame, toolOutputFrame, turnFrame, usageFrame, waitFrame,
} from "./protocol.mjs"
import { createMcpTools } from "./mcp-tools.mjs"
import { MEMBER_TOOL_NAMES, createMemberTools } from "./member-tools.mjs"

/** 工具结果全文截断（核 `thincoder-render-core/lib.mjs:27` `MAX_TOOL_OUTPUT` 镜像——渲染核不件位于盒
 *  镜像（件位契约 = 核 + 壳），故与 `isToolFailureText` 同法镜像；网页侧仍以渲染核原文为准）。 */
export const MAX_TOOL_OUTPUT = 64 * 1024

/** 盒内单渠道名（会话槽 `activeProvider` 恒此值——成员面外标 = 服务器开放清单标识）。 */
export const BOX_PROVIDER = "server"

/** 壳侧错误（kind 供结果面分类与 `end.reason` 取值——`not_found` ∥ `invalid_request` ∥ `write_failed` ∥
 *  `model_error`（模型未就绪旧值 `provider_invalid` 已归并至此——少一扩展值）∥ 其余原文）。 */
export class ShellError extends Error {
  constructor(kind, message) {
    super(message)
    this.name = "ShellError"
    this.kind = kind
  }
}

/** 会话四旗（KD-SV-218——槽字段键序；读 = 行 `flags` ∥ 写 = `session.update` 四件）。 */
export const FLAG_KEYS = Object.freeze(["autoApprove", "planMode", "engineering", "advisorGuard"])

/** 四旗写面（核 `session-slot-write.mjs:146-165` 四件——名对位）。 */
const FLAG_SETTERS = Object.freeze({
  autoApprove: "setSlotAutoApprove",
  planMode: "setSlotPlanMode",
  engineering: "setSlotEngineering",
  advisorGuard: "setSlotAdvisorGuard",
})

/** `@` 候选上限（§3.11(6) `GET /api/me/chat/files`——≤50 行）∥ 遍历访问上限（防御面：巨树不空转）。 */
export const FILE_LIST_LIMIT = 50
export const FILE_SCAN_LIMIT = 4000

/** 遍历忽略目录（§3.11(6) 逐值——其余目录一律扫）。 */
const IGNORED_DIRS = new Set(["node_modules", ".git"])

/** 复合 id / 裸号 ⇒ 槽号（`<workspaceId>:<槽号>` 容错——服务器的归属校验在其侧；盒只取尾号）。 */
export function slotOf(sessionId) {
  if (typeof sessionId === "number" && Number.isInteger(sessionId) && sessionId >= 1) return sessionId
  const m = /(?:^|:)(\d+)$/.exec(String(sessionId ?? "").trim())
  const n = m ? Number(m[1]) : NaN
  return Number.isInteger(n) && n >= 1 ? n : null
}

/** 配置桥①：核默认配置 ⇒ 覆写 provider 面 = 盒 env（server 网关；`OPENAI_BASE_URL`/`OPENAI_API_KEY`）。 */
export function withBoxProvider(config, env) {
  const entry = {
    name: BOX_PROVIDER,
    baseURL: String(env.OPENAI_BASE_URL ?? "").replace(/\/+$/, ""),
    apiKey: env.OPENAI_API_KEY ?? "",
  }
  config.providers = [entry]
  config.providersList = config.providers
  config.provider = { ...entry } // 核 loadConfig 语义 = 独立拷贝（PROVIDER.md 既有形）
  config.defaultModel = null // 模型身份 = 会话槽选定（渠道单值模型退场）
  config.providerState = "ok"
  config.providerStateReason = null
  config.providerInvalidReason = null
  return config
}

/** 工具失败判据（镜像 `thincoder-render-core/lib.mjs` `isToolFailure`——两行同判据；
 *  渲染核不件位于盒镜像（件位契约 = 核 + 壳），故此镜像；网页侧仍以渲染核原文判定为准）。 */
export function isToolFailureText(text) {
  const t = String(text ?? "").trim()
  if (!t) return false
  if (/^Error[:：]/.test(t)) return true
  return t.split("\n").some((line) => /^\((?:exit code (\d+)|killed: (.+)|spawn failed)\)$/.test(line.trim()))
}

/** 内容取文（字符串 ∥ parts 数组——图块跳过；核槽 history 的 content 两形）。 */
function textOf(content) {
  if (typeof content === "string") return content
  if (Array.isArray(content)) {
    return content.filter((b) => b?.type === "text").map((b) => String(b.text ?? "")).join("\n")
  }
  return ""
}

/** 槽四旗读面（KD-SV-218——槽字段；未设 ⇒ 假）。 */
function flagsOf(data) {
  return {
    autoApprove: data?.autoApprove === true,
    planMode: data?.planMode === true,
    engineering: data?.engineering === true,
    advisorGuard: data?.advisor?.guard === true,
  }
}

/** 读史投射：核槽 `history`（人读线）⇒ 展示行集（role 四值面取三值——notice 无源不造）。
 *  `data` 按 role 同 `gateway/API.md` §2.8：assistant 携 `toolCalls` ∥ tool 携 `toolCallId`/`name`/`ok`/`summary`
 *  （member-face-parity 批扩 `content` = 全文——截断单源 = `MAX_TOOL_OUTPUT`，活流/回读同径 §3.11(6)）。 */
export function projectMessages(data) {
  const history = Array.isArray(data?.history) ? data.history : []
  const rows = []
  let seq = 0
  for (const m of history) {
    if (!m || typeof m !== "object") continue
    const role = m.role
    if (role !== "user" && role !== "assistant" && role !== "tool") continue
    seq += 1
    const content = textOf(m.content)
    let rowData = null
    if (role === "assistant" && Array.isArray(m.tool_calls) && m.tool_calls.length > 0) {
      rowData = {
        toolCalls: m.tool_calls.map((tc) => ({
          id: tc?.id ?? "",
          name: tc?.function?.name ?? "",
          args: tc?.function?.arguments ?? "",
        })),
      }
    } else if (role === "tool") {
      rowData = {
        toolCallId: m.tool_call_id ?? null,
        name: m.name ?? null,
        ok: !isToolFailureText(content),
        summary: capText(content, RESULT_SUMMARY_MAX),
        content: capText(content, MAX_TOOL_OUTPUT),
      }
    }
    rows.push({ seq, role, content, data: rowData, createdAt: m.ts ?? null })
  }
  return rows
}

/** 首条真实用户消息（excerpt 源——≤40 字；无 ⇒ 空串）。`[System reminder:` 行按核读面单源
 *  `isRealUserMsg`（`thincoder-core/history-window.mjs`）同判跳过——提醒行不算首条用户消息。 */
function excerptOf(data) {
  const history = Array.isArray(data?.history) ? data.history : []
  for (const m of history) {
    if (m?.role !== "user") continue
    const text = textOf(m.content)
    if (text.startsWith("[System reminder:")) continue
    return capText(text, 40)
  }
  return ""
}

/** 工作区根遍历（`files.list` 指令——§3.11(6)）：忽略 `node_modules`/`.git`，`q` 在场 ⇒ 径/名子串过滤
 *  （大小写无关）；出 = `[{ name, path }]`（相对径——`@` 引用原文），≤ `FILE_LIST_LIMIT` 行；坏目录跳过。 */
export function listFilesOf(cwd, { q = "", limit = FILE_LIST_LIMIT, scanLimit = FILE_SCAN_LIMIT } = {}) {
  const needle = String(q ?? "").trim().toLowerCase()
  const queue = [""]
  const files = []
  let scanned = 0
  while (queue.length > 0 && files.length < limit && scanned < scanLimit) {
    const rel = queue.shift()
    let entries
    try {
      entries = readdirSync(rel === "" ? cwd : join(cwd, rel), { withFileTypes: true })
    } catch {
      continue // 不可读目录 ⇒ 跳过（权限/竞态——零抛）
    }
    for (const entry of entries) {
      if (scanned >= scanLimit || files.length >= limit) break
      scanned += 1
      const path = rel === "" ? entry.name : `${rel}/${entry.name}`
      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name) || entry.isSymbolicLink()) continue
        queue.push(path)
        continue
      }
      if (!entry.isFile()) continue
      if (needle !== "" && !path.toLowerCase().includes(needle)) continue
      files.push({ name: entry.name, path })
    }
  }
  return files
}

/**
 * 核回合驱动（会话读写 + 回合）。
 * @param {{env?: object, cwd?: string, core: object, fetchImpl?: Function, log?: object, promptIdOf?: Function}} opts
 *   `core` = 核面束（生产 = `loadCore()`；测试 = 假件）——键：assembleAgent ∥ validateProvider ∥
 *   runAgent ∥ applySession ∥ saveSession ∥ loadSlotFile ∥ listSlots ∥ newSession ∥ setSlotPrefs ∥
 *   loadManifest ∥ slotPath ∥ deleteSlot ∥ renameSlot ∥ 四旗四件 ∥ loadConfig ∥ parseRelayPath ∥
 *   cancelSyncChild ∥ executeCancelAction ∥ getAsyncPool。
 *   `fetchImpl`/`log` = MCP 取表与调用桥两缝（`mcp-tools.mjs` 同源——测试假件/降级日志面）；
 *   `promptIdOf` = ask 帧 promptId 铸造缝（缺省 = `node:crypto` randomUUID）。
 */
export function createCoreRun({
  env = process.env,
  cwd = process.env.TC_WORKSPACE_DIR ?? "/workspace",
  core,
  fetchImpl = globalThis.fetch,
  log = console,
  promptIdOf = () => randomUUID(),
}) {
  if (!core) throw new Error("createCoreRun: core bundle required")
  const loadConfig = () => withBoxProvider(core.loadConfig(), env)
  const mcp = createMcpTools({ env, fetchImpl, log })
  const memberTools = createMemberTools({ env, fetchImpl, log }) // server 域四件（一装配期一次——env 恒定）

  const sessionExists = (slot) => existsSync(core.slotPath(cwd, slot)) || Boolean(core.loadManifest(cwd)?.slots?.[slot])

  /** 槽事实（model/title/count/flags——源自槽文件本身；不可读 ⇒ null）。 */
  const slotFacts = (slot) => {
    try {
      const d = core.loadSlotFile(cwd, slot)
      if (!d) return null
      return {
        model: typeof d.activeModel === "string" ? d.activeModel : null,
        effort: Object.hasOwn(d, "effort") ? (d.effort ?? null) : null,
        title: typeof d.title === "string" ? d.title : "",
        count: Array.isArray(d.history) ? d.history.length : 0,
        flags: flagsOf(d),
      }
    } catch {
      return null
    }
  }

  /** 会话行（接口假设②）。`runningSlots` = 本壳在途槽集（KD-SV-223——会话键表）。 */
  const rowOf = (slot, { meta = null, runningSlots = null } = {}) => {
    const facts = slotFacts(slot)
    return {
      id: slot,
      model: facts?.model ?? null,
      reasoning: facts?.effort ?? null,
      title: facts?.title ?? "",
      count: facts?.count ?? 0,
      flags: facts?.flags ?? flagsOf(null),
      status: runningSlots?.has(slot) === true ? "running" : "idle",
      excerpt: meta ? capText(String(meta.firstMessage ?? ""), 40) : "",
      updatedAt: meta?.updatedAt ?? null,
    }
  }

  /** 回合宿主（每回合一件——`index.mjs` 造并随 `runTurn` 传入）：ask 待决表 ∥ 停单件 ∥ 兜底收口。
   *  - `ask(kind, body)` ⇒ 登记核回调承诺（结算 = `settleAnswer`）；
   *  - `settleAnswer(payload)`：下行 `answer` ⇒ 结算（映射单点 = `protocol.mjs answerSettlementOf`；
   *    `always` ⇒ 槽 `autoApprove` 置真——行 `flags` 随槽读面回推）；不合 ⇒ 假（零结算）；
   *  - `cancelKey(key)`：停单件（核既有控制面——同步族 `cancelSyncChild` ∥ 异步族 `executeCancelAction`）；
   *  - `close()`：兜底收口（`end` ∥ 中止 ∥ 掉线——单件 = 拒 ∥ 批 = `deny` ∥ 问询/秘密 = 取消）。 */
  function createTurnHost() {
    const pending = new Map() // promptId ⇒ { kind, resolve }
    let agent = null
    let slot = null
    const denyValueOf = (kind) => {
      if (kind === "permission") return false
      if (kind === "batch") return "deny"
      return null // question ∥ secret ⇒ 取消
    }
    return {
      size: () => pending.size,
      ask(kind, body) {
        return new Promise((resolve) => {
          pending.set(String(body.promptId), { kind, resolve })
        })
      },
      attach(runningAgent, runningSlot) {
        agent = runningAgent
        slot = runningSlot
      },
      settleAnswer(payload) {
        const promptId = String(payload?.promptId ?? "")
        const entry = pending.get(promptId)
        if (!entry) return false // 未知/已了结 ⇒ 零副作用（服务端侧同判据 400）
        const settled = answerSettlementOf(entry.kind, payload)
        if (!settled.ok) return false // 体与 kind 不符 ⇒ 零结算（承诺保持挂起——服务端已 400 零副作用）
        pending.delete(promptId)
        if (settled.always === true) {
          try {
            core.setSlotAutoApprove(cwd, slot, true) // 同桌面「always」语义（KD-SV-217 映射单点）
          } catch (e) {
            log?.warn?.(`[shell] 「always」槽写入失败（${slot}）：${e?.message ?? e}`) // 结算照走（旗面失败不阻断回合）
          }
        }
        entry.resolve(settled.value)
        return true
      },
      /** 停单件（§3.11(5)）：键形 = 核文法（`<role>#<id>`——`parseRelayPath` 单源）；命中 ⇒ 中止并回真。 */
      cancelKey(key) {
        if (agent === null) return false
        const text = String(key ?? "")
        const path = core.parseRelayPath(`${text}/`)
        if (path === null || path.head !== text) return false
        try {
          if (agent._syncChildAborts?.has(text)) {
            const result = core.cancelSyncChild(agent, text)
            if (result?.status === "cancelled") return true
          }
        } catch {
          /* 同步族取消失败 ⇒ 落异步族判据（零抛） */
        }
        const id = Number(text.slice(text.indexOf("#") + 1))
        const entry = core.getAsyncPool(agent, "subagent")?.get(id) ?? core.getAsyncPool(agent, "advisor")?.get(id)
        if (!entry || entry.done === true) return false
        try {
          const result = JSON.parse(core.executeCancelAction({ id }, { agent, depth: 0, callbacks: {} }))
          return result?.status === "cancelled"
        } catch (e) {
          log?.warn?.(`[shell] 停单件失败（${text}）：${e?.message ?? e}`)
          return false
        }
      },
      close() {
        for (const [promptId, entry] of pending) {
          pending.delete(promptId)
          entry.resolve(denyValueOf(entry.kind))
        }
      },
    }
  }

  return {
    cwd,

    /** 列表 = 核盘面实读投影（`listSlots`）。 */
    listSessions({ runningSlots = null } = {}) {
      const metas = core.listSlots(cwd) ?? []
      return metas.map((meta) => rowOf(meta.slot, { meta, runningSlots }))
    },

    /** 读史：槽文件 ⇒ { session, messages }；槽不存在 ⇒ null（入参槽号面 = `slot` 优先——服务器下行形）。 */
    readSession(sessionId, { runningSlots = null } = {}) {
      const slot = slotOf(sessionId)
      if (slot === null) return null
      const data = core.loadSlotFile(cwd, slot)
      if (!data && !sessionExists(slot)) return null
      const row = rowOf(slot, { runningSlots })
      row.excerpt = excerptOf(data)
      row.updatedAt = data?.updatedAt ?? row.updatedAt
      return { session: row, messages: projectMessages(data) }
    },

    /** 新建 = 核全新槽分配（`newSession`；模型缺省由 server 选定后随 `{ model }` 落槽）。 */
    async createSession({ model = null } = {}) {
      const slot = await core.newSession(cwd)
      if (model && !core.setSlotPrefs(cwd, slot, { provider: BOX_PROVIDER, model })) {
        throw new ShellError("write_failed", "会话模型写入失败")
      }
      return { id: slot }
    },

    /** 改（换模型/设档/四旗）：换模型 ⇒ 档位清 `null`（§3.4）；四旗 ⇒ 核写面四件（KD-SV-218）。
     *  返回更新后行；槽不存在 ⇒ null。入参槽号面 = `slot`（服务器下行形——`member-routes.mjs`）∥
     *  `sessionId`/`id` 兼容容错。**一次一件由 server 门把守**（`gateway/API.md` §2.11 PATCH——盒侧
     *  再立第二判据 = 双源）；本档按补丁序合成（`model` 先置 ⇒ `effort` 后写 ⇒ 四旗逐件）。 */
    updateSession(args = {}) {
      const { model, reasoning } = args
      const slot = slotOf(args.slot ?? args.sessionId ?? args.id)
      if (slot === null || !sessionExists(slot)) return null
      const patch = {}
      if (typeof model === "string" && model !== "") {
        patch.provider = BOX_PROVIDER
        patch.model = model
        patch.effort = null
      }
      if (Object.hasOwn(args, "reasoning")) patch.effort = reasoning ?? null
      const flags = FLAG_KEYS.filter((key) => Object.hasOwn(args, key))
      if (Object.keys(patch).length === 0 && flags.length === 0) {
        throw new ShellError("invalid_request_error", "至少需要一个字段（model ∥ reasoning ∥ 四旗）")
      }
      if (Object.keys(patch).length > 0 && !core.setSlotPrefs(cwd, slot, patch)) {
        throw new ShellError("write_failed", "会话偏好写入失败")
      }
      for (const key of flags) {
        if (!core[FLAG_SETTERS[key]](cwd, slot, args[key] === true)) {
          throw new ShellError("write_failed", `会话旗写入失败：${key}`)
        }
      }
      return { session: rowOf(slot) }
    },

    /** 重命名（`session.rename` 指令——核 `renameSlot`；`{ok:false}` ⇒ 抛 `invalid_request`（服务端 400 人话零改）；
     *  槽不存在 ⇒ null——读/改同判）。 */
    renameSession(args = {}) {
      const slot = slotOf(args.slot ?? args.sessionId ?? args.id)
      if (slot === null) return null
      const title = typeof args.title === "string" ? args.title : null
      if (title === null) throw new ShellError("invalid_request_error", "title 必填（字符串）")
      const out = core.renameSlot(cwd, slot, title)
      if (out?.ok !== true) {
        throw new ShellError("invalid_request_error", `会话重命名失败：${reasonTextOf(out?.reason)}`)
      }
      return { session: rowOf(slot) }
    },

    /** 删除（`session.delete` 指令——核 `deleteSlot`；无该槽 ⇒ null——服务端 404 不辨）。 */
    deleteSession(args = {}) {
      const slot = slotOf(args.slot ?? args.sessionId ?? args.id)
      if (slot === null) return null
      if (!core.deleteSlot(cwd, slot)) return null
      return { ok: true }
    },

    /** `@` 候选（`files.list` 指令——§3.11(6)）：工作区根遍历，≤50 行（零存在性泄露面：只列本人工作区）。 */
    listFiles(args = {}) {
      return { files: listFilesOf(cwd, { q: args?.q }) }
    },

    /** 回合宿主工厂（`index.mjs` 每回合造一件——`answer`/`abort{key}` 两入口的结算面）。 */
    createHost: createTurnHost,

    /**
     * 跑一回合：装配 ⇒ 施槽 ⇒ `runAgent`（十一回调 → onFrame）⇒ 落槽 ⇒ 兜底收口未决 ask。
     * 返回 end 帧数据（{ status, reason, durationMs, calls }）；`signal` 中止 ⇒ failed/aborted。
     * `images` = dataURL 列（视觉门在 server——本档只按 parts 形携入）；`host` = 回合宿主（缺省自造）。
     */
    async runTurn({ sessionId, content, images = [], signal, onFrame = () => {}, host = null }) {
      const slot = slotOf(sessionId)
      if (slot === null) throw new ShellError("not_found", "会话不存在")
      const data = core.loadSlotFile(cwd, slot)
      if (!data && !sessionExists(slot)) throw new ShellError("not_found", "会话不存在")

      const turnHost = host ?? createTurnHost()
      const agent = await core.assembleAgent({ cwd, deps: { loadConfig } })
      if (data) core.applySession(agent, data, { slot })
      agent._slot = slot // 钉槽（saveSession 认领面——沿 CLI D-3 先例）
      core.validateProvider(agent, agent.config)
      if (agent._providerInvalid) throw new ShellError("model_error", `模型未就绪：${agent._providerInvalidReason ?? "未知"}`)
      turnHost.attach(agent, slot)

      // 工具面并面（装配序 = assembleAgent ⇒ 取表 ⇒ 防撞过滤 ⇒ runAgent extraTools；读时读零缓存）：
      // 件序 = 成员件先（server 域四件——§3.11(7)）∥ MCP 件后；防撞 `taken` = 装配后基集（`agent.tools`）
      // ∪ 注入件名集（成员件四件——KD-SV-222）；同名 MCP 件不得顶掉注入件（核 `setup.mjs:220` `toolByName`
      // 后到者胜 ⇒ 先者留存）。取表/建桩失败 ⇒ 空表 + 日志一条（`mcp-tools.mjs` 内）——回合照跑。
      const baseNames = (Array.isArray(agent.tools) ? agent.tools : []).map((tool) => tool?.name).filter((name) => typeof name === "string" && name !== "")
      const taken = new Set([...baseNames, ...MEMBER_TOOL_NAMES])
      const mcpTools = await mcp.load({ taken, signal })
      const extraTools = [...memberTools, ...mcpTools]

      const started = Date.now()
      let calls = 0

      /** relay 前缀 token 分流（§3.11(1)/(5)）：前缀在场 ⇒ `sub` 帧（**零剥离**——页面核件解析前缀）；
       *  真 = 已消费（零主文转发）。事件 token 判位 = 核 `subagent-event.mjs` 同形（`⟦ev⟧` ∥ `[model]` 起手）。 */
      const routeToken = (text, face = "text", payload = {}) => {
        const raw = String(text ?? "")
        const path = core.parseRelayPath(raw)
        if (path === null) return false
        const isEvent = path.rest.startsWith("⟦ev⟧") || path.rest.startsWith("[model]")
        onFrame(isEvent
          ? subFrame({ token: raw, ev: true })
          : subFrame({ token: raw, ev: false, face, text: payload.text, args: payload.args }))
        return true
      }
      /** 定时器活读投影（`usage.timers` 段源——`agent._pendingTimers`）。 */
      const timersOf = () => {
        const list = Array.isArray(agent._pendingTimers) ? agent._pendingTimers : []
        const now = Date.now()
        return { count: list.length, expired: list.filter((t) => typeof t?.expiresAt === "number" && t.expiresAt <= now).length }
      }
      /** 单件审批 ask（`onPermissionRequest` 两参径 ∥ `onPermissionRequired` 四参径——子代理门归属面）。 */
      const askPermission = (name, args, extra = {}) => {
        const raw = String(name ?? "")
        const path = core.parseRelayPath(raw)
        const body = {
          promptId: promptIdOf(),
          tool: path === null ? raw : path.rest,
          args: JSON.stringify(args ?? {}),
        }
        const owner = extra.owner ?? (path === null ? null : path.head)
        if (typeof owner === "string" && owner !== "") body.owner = owner
        if (extra.diff !== undefined && extra.diff !== null) body.diff = extra.diff
        const frame = askFrame("permission", body)
        onFrame(frame)
        return turnHost.ask("permission", frame)
      }

      const callbacks = {
        onToken: (text) => {
          const raw = String(text ?? "")
          if (routeToken(raw, "text")) return
          // 非前缀机器 token（防御面——`⟦ev⟧` 事件 / `[model]` 元数据；深度 0 不外发）
          if (/^⟦ev⟧/.test(raw) || /^\[model\]/.test(raw)) return
          onFrame(deltaFrame(raw))
        },
        onReasoning: (text) => {
          const raw = String(text ?? "")
          if (routeToken(raw, "think")) return
          onFrame(reasoningFrame(raw))
        },
        onToolCall: (name, args, id) => {
          calls += 1
          if (routeToken(String(name ?? ""), "toolCall", { args: args ?? {} })) return
          onFrame(callFrame({ id, name, args: JSON.stringify(args ?? {}) }))
        },
        onToolResult: (name, result, id) => {
          const contentText = typeof result === "string" ? result : String(result ?? "")
          onFrame(resultFrame({ id, ok: !isToolFailureText(contentText), summary: capText(contentText, RESULT_SUMMARY_MAX), content: contentText }))
        },
        onToolOutput: (name, chunk, id) => {
          const text = typeof chunk === "string" ? chunk : String(chunk?.text ?? "")
          if (routeToken(String(name ?? ""), "toolOutput", { text })) return
          onFrame(toolOutputFrame({ id, name, text }))
        },
        onAgentTurn: (n) => onFrame(turnFrame(n)),
        onUsage: (usage) => onFrame(usageFrame(usage, { timers: timersOf() })),
        onPermissionRequest: (name, args) => askPermission(name, args),
        onPermissionRequired: (name, args, diffInfo) => askPermission(name, args, { diff: diffInfo ?? null }),
        onBatchPermissionRequest: (req) => {
          const frame = askFrame("batch", {
            promptId: promptIdOf(),
            count: Number.isInteger(req?.count) ? req.count : (Array.isArray(req?.tools) ? req.tools.length : 0),
            tools: Array.isArray(req?.tools) ? req.tools : [],
          })
          onFrame(frame)
          return turnHost.ask("batch", frame)
        },
        onQuestion: (question, options) => {
          const frame = askFrame("question", { promptId: promptIdOf(), question, options })
          onFrame(frame)
          return turnHost.ask("question", frame)
        },
        onSecretInput: (req) => {
          const frame = askFrame("secret", { promptId: promptIdOf(), ...(req ?? {}) })
          onFrame(frame)
          return turnHost.ask("secret", frame)
        },
        onTaskUpdate: (items) => onFrame(tasksFrame(items)),
        onCompressStart: () => onFrame(compressFrame({ status: "start" })),
        onCompress: (info) => onFrame(compressFrame({
          status: info?.mode === "fallback" ? "fallback" : "done",
          tokensFreed: info?.tokensFreed,
          elapsedMs: info?.elapsedMs,
        })),
        onCompressFail: (error) => onFrame(compressFrame({ status: "failed", error: String(error?.message ?? error ?? "压缩失败") })),
        onWait: (info) => onFrame(waitFrame(info)),
      }

      // 本轮用户消息（parts 形——携图 ⇒ `[text, image_url…]`；纯文本 ⇒ 串原样）
      const input = Array.isArray(images) && images.length > 0
        ? [{ type: "text", text: String(content ?? "") }, ...images.map((url) => ({ type: "image_url", image_url: { url: String(url) } }))]
        : String(content ?? "")

      let status = "succeeded"
      let reason
      let message
      try {
        await core.runAgent(agent, input, callbacks, { signal, extraTools })
      } catch (e) {
        status = "failed"
        if (signal?.aborted) {
          reason = "aborted"
          message = "已中止本回合"
        } else if (e?.name === "ContinueError") {
          reason = "budget"
          message = "本回合已超出预算（模型调用轮数上限）"
        } else {
          reason = "model_error"
          message = String(e?.message ?? e)
        }
      } finally {
        turnHost.close() // 兜底结算（`end` ∥ 中止 ∥ 掉线——未决 ask 全量收口；§3.11(2)）
      }
      try {
        core.saveSession(agent)
      } catch (e) {
        if (status === "succeeded") {
          status = "failed"
          reason = "save_failed"
          message = `会话保存失败：${e?.message ?? e}`
        }
      }
      return endFrame({ status, reason, message, durationMs: Date.now() - started, calls })
    },
  }
}

/** 重命名失败因 ⇒ 人话（核 `session-rename.mjs` reason 四值——§6.12 契约）。 */
function reasonTextOf(reason) {
  if (reason === "file-missing") return "会话不存在"
  if (reason === "parse-failure") return "会话文件不可解析"
  if (reason === "mtime-conflict") return "会话正被改写——请重试"
  if (reason === "invalid-slot") return "会话号非法"
  return String(reason ?? "未知")
}

/** 生产核面束（仅入口调用——动态 import：包只在盒镜像内可解析，见档头）。 */
export async function loadCore() {
  const [agentMod, assembleMod, sessionMod, slotWriteMod, configMod, relayMod, subagentAsyncMod, asyncSettleMod] = await Promise.all([
    import("@thincoder/core/agent.mjs"),
    import("@thincoder/core/agent/assemble.mjs"),
    import("@thincoder/core/session.mjs"),
    import("@thincoder/core/session-slot-write.mjs"),
    import("@thincoder/core/config.mjs"),
    import("@thincoder/core/agent/relay-prefix.mjs"),
    import("@thincoder/core/agent-tools/subagent-async.mjs"),
    import("@thincoder/core/agent-tools/async-settle.mjs"),
  ])
  return {
    runAgent: agentMod.runAgent,
    assembleAgent: assembleMod.assembleAgent,
    validateProvider: assembleMod.validateProvider,
    applySession: sessionMod.applySession,
    saveSession: sessionMod.saveSession,
    loadSlotFile: sessionMod.loadSlotFile,
    listSlots: sessionMod.listSlots,
    newSession: sessionMod.newSession,
    loadManifest: sessionMod.loadManifest,
    slotPath: sessionMod.slotPath,
    deleteSlot: sessionMod.deleteSlot,
    renameSlot: sessionMod.renameSlot,
    setSlotPrefs: slotWriteMod.setSlotPrefs,
    setSlotAutoApprove: slotWriteMod.setSlotAutoApprove,
    setSlotPlanMode: slotWriteMod.setSlotPlanMode,
    setSlotEngineering: slotWriteMod.setSlotEngineering,
    setSlotAdvisorGuard: slotWriteMod.setSlotAdvisorGuard,
    loadConfig: configMod.loadConfig,
    parseRelayPath: relayMod.parseRelayPath,
    cancelSyncChild: subagentAsyncMod.cancelSyncChild,
    executeCancelAction: subagentAsyncMod.executeCancelAction,
    getAsyncPool: asyncSettleMod.getAsyncPool,
  }
}
