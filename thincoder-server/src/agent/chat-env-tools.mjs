/**
 * chat-env-tools.mjs — 环境工具面五族七件（`agent/ADMIN-AGENT.md` §14.2/§14.3 ∥ KD-SV-113；admin-agent-awareness 批——台账 #1310）：
 * 件 = `get_current_time` ∥ `process` ∥ `timer` ∥ `ls` ∥ `read` ∥ `grep` ∥ `bash`——**核件原文复用**（实现 ∥ schema ∥ 描述
 * 三面同源；动载 `@thincoder/core/tools/*` + `agent-tools/timer.mjs`——沿 `loadCoreChat` 先例）；本面只做 ① ctx 适配
 * ② 结果归一 ③ 限幅处置 ④ timer 挂表/出列。**不收窄 schema**（端池参数运行期处置——§14.2）。
 *
 * ctx 适配（§14.2）：`{ cwd, signal, agent, depth: 0 }`——`cwd` = 相对路径基准（`deps.cwd ?? process.cwd()`——无围栏）∥
 * `signal` = 回合中止信号（透传 ⇒ bash 树杀）∥ `agent` = timer 垫片（`{ _pendingTimers, history }`——核 `timer` 工具直写；
 * 帽 = 核 `TIMER_MAX_PENDING` 8）∥ `depth: 0`。
 * 结果归一（KD-SV-113）：`{ ok, subject, summary, output }`——`ok` = 调用完成（未抛错；命令非零退出 ⇒ `ok:true`，
 * 退出码在输出文本内 `(exit code N)`——**不解析**）；`output` = 核件文本原文（**模型可见形**——落库 ≤4000 字截断归会话面）；
 * `subject` = 主语原文（审计数据源——§14.4）；`summary` = 人话单行。**模型可见形 = 文本原文（非 JSON 壳——KD-SV-113 被否栏）**。
 * 限幅（§14.3——`bash` 三件）：超时缺省 120_000 ms（核 `BASH_TIMEOUT_MS`；无上限——自造 600s 顶已按用户 2026-10-12 15:00 裁撤）
 * ∥ 输出三层（工具层 200K 字 ∥ 每流 2MB = 核件；落库 ≤4_000 字 = 会话面；帧/审计摘要 ≤300 字）∥ 工作目录 = `ctx.cwd`。
 * 端池参数（§14.2——服务面无驻留池）：`bash.async:true` ⇒ 显式拒；`process.kill` 的 `id` 靶 ⇒ 核件自然报「未知后台任务 id」；
 * `kill pid` 在册（与 bash 等价——含杀 server 自身进程的操作者自伤面，R62②披露）。
 * timer 投递（§14.4）：进程内按会话挂垫片（零持久化——重启天然空，沿中止登记表先例）；**回合边界投递** = 出列（幂等——
 * 核 `takeExpiredTimers`）⇒ 行文（核 `injectTimerReminders` 单源逐字）；**不自动开轮**（无空闲唤醒面——如实登记）。
 */
/** 七件（§14.2 表——族序：时间 ∥ 进程 ∥ 提醒 ∥ 文件读取族 ∥ 命令）。 */
export const ENV_TOOL_NAMES = Object.freeze(["get_current_time", "process", "timer", "ls", "read", "grep", "bash"])

/** 五族（§14.2 表逐行——断言/展示面）。 */
export const ENV_TOOL_FAMILIES = Object.freeze([
  { family: "时间", tools: Object.freeze(["get_current_time"]) },
  { family: "进程", tools: Object.freeze(["process"]) },
  { family: "提醒", tools: Object.freeze(["timer"]) },
  { family: "文件读取族", tools: Object.freeze(["ls", "read", "grep"]) },
  { family: "命令", tools: Object.freeze(["bash"]) },
])

/** 限幅取值（§14.3）：缺省 = 核 `BASH_TIMEOUT_MS`（`thincoder-core/tools/shared.mjs:26`）∥ 无上限（自造 600s 顶已撤——用户 2026-10-12 15:00）。 */
export const ENV_BASH_TIMEOUT_DEFAULT_MS = 120_000

let coreToolsCache = null // 懒载缓存（真核七件 + 形转换 + timer 两读面）
let coreToolsError = null // 装载失败缓存（零重试）
let warnedDegraded = false // 缺核警告旗（一进程一条）

/** 缺核退化警告（模块级旗——一进程一条；用法同 `gateway/reasoning-levels.mjs` 的 `noteDegraded`）。
 *  出 = 本条是否发出；`error` = 失败因（携进日志——免「真核 API 漂移」与「未装载」同为一条人话不可辨）。 */
export function noteEnvToolsDegraded(log = null, error = null) {
  if (warnedDegraded === true) return false
  warnedDegraded = true
  log?.warn?.("chat_env_tools_core_missing", {
    cause: error === null ? null : String(error?.message ?? error),
    message: "环境工具面不可用：@thincoder/core 未装载——环境族不注册（回合不阻断；生产镜像内核为声明依赖）",
  })
  return true
}

/**
 * 核件装载（动载——沿 `loadCoreChat` 先例；失败缓存零重试）：七件 + `toOpenAISchema`（形转换单源）+
 * timer 两读面（§14.4）。缺核 ⇒ 抛（调用侧退化——环境族不注册；生产镜像内核为声明依赖，§14.5）。
 */
export async function loadCoreEnvTools() {
  if (coreToolsCache !== null) return coreToolsCache
  if (coreToolsError !== null) throw coreToolsError
  try {
    const [ops, timer, search, file, bash, shared, timers] = await Promise.all([
      import("@thincoder/core/tools/ops.mjs"), // get_current_time ∥ process（`:51`/`:140`）
      import("@thincoder/core/agent-tools/timer.mjs"), // timer
      import("@thincoder/core/tools/search.mjs"), // ls ∥ grep
      import("@thincoder/core/tools/file.mjs"), // read
      import("@thincoder/core/tools/bash.mjs"), // bash
      import("@thincoder/core/tools/shared.mjs"), // toOpenAISchema（schema 形单源）
      import("@thincoder/core/agent/timers.mjs"), // takeExpiredTimers ∥ injectTimerReminders（§14.4）
    ])
    coreToolsCache = Object.freeze({
      getCurrentTimeTool: ops.getCurrentTimeTool,
      processTool: ops.processTool,
      timerTool: timer.timerTool,
      lsTool: search.lsTool,
      readTool: file.readTool,
      grepTool: search.grepTool,
      bashTool: bash.bashTool,
      toOpenAISchema: shared.toOpenAISchema,
      takeExpiredTimers: timers.takeExpiredTimers,
      injectTimerReminders: timers.injectTimerReminders,
    })
    return coreToolsCache
  } catch (e) {
    coreToolsError = e
    throw e
  }
}

/**
 * 环境工具面装配（§14.2）：`coreTools` = 核件注入口（批内件走仓内直引真件；缺省 ⇒ 动载）。
 * 出 = `{ names, schemas, invoke }`——`invoke(name, args, ctx)` 不抛（未知件 ∥ 参数不合 ∥ 核件抛错 ⇒ `{ ok:false, … }`）。
 */
export async function createEnvTools({ coreTools = null } = {}) {
  const core = coreTools ?? (await loadCoreEnvTools())
  const toolOf = {
    get_current_time: core.getCurrentTimeTool,
    process: core.processTool,
    timer: core.timerTool,
    ls: core.lsTool,
    read: core.readTool,
    grep: core.grepTool,
    bash: core.bashTool,
  }
  const missing = ENV_TOOL_NAMES.filter((name) => !toolOf[name])
  if (missing.length > 0) throw new Error(`环境工具面缺件：${missing.join(" ∥ ")}（核件装载不完整）`)
  if (typeof core.toOpenAISchema !== "function") throw new Error("环境工具面缺件：toOpenAISchema（schema 形转换单源）")
  const schemas = ENV_TOOL_NAMES.map((name) => core.toOpenAISchema(toolOf[name]))

  /** 工具调用入口（不抛——见档头；`ok` = 调用完成，非命令退出码语义）。 */
  async function invoke(name, args = {}, ctx = {}) {
    const tool = toolOf[name]
    if (!tool) {
      const message = `未知环境工具：${String(name)}（${ENV_TOOL_NAMES.join(" ∥ ")}）`
      return { ok: false, subject: "", summary: message, message }
    }
    const params = args !== null && typeof args === "object" && !Array.isArray(args) ? args : {}
    const subject = subjectOf(name, params)
    const refused = refuseEndpointParams(name, params, subject) // 端池参数处置（§14.2——服务面无驻留池）
    if (refused !== null) return refused
    try {
      const output = await tool.execute(params, {
        cwd: ctx.cwd ?? process.cwd(),
        signal: ctx.signal,
        agent: ctx.agent ?? null,
        depth: 0,
      })
      const text = typeof output === "string" ? output : JSON.stringify(output ?? null)
      return { ok: true, subject, summary: summaryOf(name, subject, text), output: text }
    } catch (e) {
      const message = e?.message ?? String(e)
      return { ok: false, subject, summary: message, message } // 工具级错误回灌（回合不停）
    }
  }

  return { names: ENV_TOOL_NAMES, schemas, invoke }
}

/** 端池参数处置（§14.2）：`bash.async` 显式拒 ∥ 超时取值校验（仅拒非有限值/小于 1——无上限）；过 ⇒ `null`。 */
function refuseEndpointParams(name, params, subject) {
  if (name !== "bash") return null
  const refusal = (message) => ({ ok: false, subject, summary: message, message })
  if (params.async === true) {
    return refusal("bash async 不可用：管理面无后台任务池（去掉 async 同步执行；长命令用 timeout 兜底）")
  }
  const timeout = params.timeout
  if (timeout !== undefined && timeout !== null && timeout !== "") {
    const value = Number(timeout)
    // 无上限（用户 2026-10-12 15:00 裁撤自造 600s 顶——核件本无上限，跑飞可由 process 杀）：
    // 仅拒非有限值/小于 1（零静默钳制——取值范围外的输入显式报错，不静默改写）。
    if (!Number.isFinite(value) || value < 1) {
      return refusal(`bash timeout 非法：${String(timeout)}（须为 ≥1 的毫秒数；缺省 ${ENV_BASH_TIMEOUT_DEFAULT_MS} ms）`)
    }
  }
  return null
}

/** 主语原文（审计数据源——§14.4）：命令原文 ∥ 路径 ∥ 正则；余件取紧凑主事词；`get_current_time` 无主事词 ⇒ 空。 */
export function subjectOf(name, args = {}) {
  const text = (value) => (typeof value === "string" ? value : value === null || value === undefined ? "" : String(value))
  if (name === "bash") return text(args.command)
  if (name === "read") return text(args.path ?? args.filePath)
  if (name === "ls") return text(args.path ?? ".")
  if (name === "grep") return text(args.pattern)
  if (name === "process") {
    const action = text(args.action ?? "list")
    if (action === "kill") {
      if (args.pid !== undefined && args.pid !== null && args.pid !== "") return `kill pid ${text(args.pid)}`
      if (args.id !== undefined && args.id !== null && args.id !== "") return `kill id ${text(args.id)}`
      return "kill"
    }
    return args.name !== undefined && args.name !== null && args.name !== "" ? `list ${text(args.name)}` : "list"
  }
  if (name === "timer") {
    const seconds = args.seconds === undefined || args.seconds === null ? 180 : Number(args.seconds)
    const message = typeof args.message === "string" && args.message !== "" ? ` ${args.message}` : ""
    return `set ${Number.isFinite(seconds) ? seconds : text(args.seconds)}s${message}`
  }
  return "" // get_current_time（无主事词）
}

/** 人话单行摘要（§14.2）：bash ⇒ 核件结果末行状态行；get_current_time/timer ⇒ 核件返回首行；余 = 工具名 + 主语。 */
export function summaryOf(name, subject = "", text = "") {
  const value = typeof text === "string" ? text : ""
  if (name === "bash") return statusLineOf(value)
  if (name === "get_current_time" || name === "timer") return value.split("\n").find((line) => line.trim() !== "") ?? ""
  return subject === "" ? name : `${name} ${subject}`
}

/** 状态行（核件 bash 结果末行形 `(exit code N)` ∥ `(killed: …)`；无 ⇒ 末非空行）。 */
function statusLineOf(text) {
  const lines = text.split("\n").map((line) => line.trim()).filter((line) => line !== "")
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/^\(.*\)$/.test(lines[i])) return lines[i]
  }
  return lines.at(-1) ?? ""
}

// ── timer 投递面（§14.4——进程内垫片 ∥ 回合边界出列；不自动开轮）────────────────────────

/** 会话垫片表（进程内——零持久化：重启天然空；沿中止登记表先例）。 */
const timerPads = new Map()

/** 会话垫片（`{ _pendingTimers, history }`——核 `timer` 工具直写 `_pendingTimers`；`history` = 核注入单点落点）。 */
export function timerPadOf(chatId) {
  const key = Number(chatId)
  let pad = timerPads.get(key)
  if (!pad) {
    pad = { _pendingTimers: [], history: [] }
    timerPads.set(key, pad)
  }
  return pad
}

/** 在途 timer 条数（诊断/断言面——零副作用）。 */
export function pendingTimerCount(chatId) {
  return timerPadOf(chatId)._pendingTimers.length
}

/** 回合边界投递（§14.4）：出列（幂等——核 `takeExpiredTimers`）⇒ 行文（核 `injectTimerReminders` 单源逐字）。
 *  **不自动开轮**（无空闲唤醒面）；核缺失 ⇒ 零行 + 一条警告（回合不阻断）。出 = 行文数组。 */
export async function takeTimerLines(chatId, { now = Date.now, log = null, coreTools = null } = {}) {
  try {
    const core = coreTools ?? (await loadCoreEnvTools())
    const pad = timerPadOf(chatId)
    const lines = core.injectTimerReminders(pad, core.takeExpiredTimers(pad, now()))
    pad.history.length = 0 // 垫片 history = 核注入单点落点（本面消费返回值——行文不驻留）
    return lines
  } catch (e) {
    noteEnvToolsDegraded(log, e)
    return []
  }
}
