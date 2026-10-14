/**
 * ssh-session.mjs — SSH 会话面单点（池 ∥ 生命周期 ∥ 动作 ∥ 凭据窗 ∥ 非密预填）。
 * 设计 = `docs/core/design/TOOLS.md` §6.22（D-TO17/D-TO18 · 台账 #1436）；需求 = `docs/core/requirements/TOOLS.md` §4.8。
 * 工具面 = `tools/ssh.mjs`（薄接线）；传输面 = `agent-tools/ssh-transport.mjs`（askpass 链 / 沉降 / 遮蔽 / 帽
 * ——拆档由 = 机制档触 500 顾问线，§6.22 落点表「实施轮先审拆分」）。
 *
 * - 池：`_sshSessions`（照 `bash-async.mjs` 池先例——载体经 `carrierField` 吸收）；帽 `SSH_SESSION_MAX = 4`
 *   条存活会话；超限**显式拒**（零静默关旧）。
 * - 连接（预探路——父侧 2026-10-14 裁定 A）：探连 = **全会话形** + `NumberOfPasswordPrompts=0`；探连成功
 *   ⇒ **该连接直接升格为会话**（密钥机全程恰 1 次连接）；认证类失败 ⇒ 终止探连 → 弹凭据窗 → **单次**
 *   带密会话（`NumberOfPasswordPrompts=1`）；指纹 / 不可达 / 连接超时 ⇒ **弹窗之前硬停**（E3 语义）。
 * - 生命周期：闲置 600 s 自动关（digest 注记）· `close` = stdin 结束 → 1.5 s 宽限 → 杀树 · 回合中断存活
 *   （F2 豁免）· 会话中止逐条杀 + 清池（`agent-tools/async-discard.mjs` `SSH_SPEC`）· depth>0 排除
 *   （`agent/helpers.mjs` `SUBAGENT_TOOL_EXCLUSIONS`）。
 * 模块图：→ ssh-transport.mjs（运行面）· agent/helpers.mjs（轮转清理）· tools/process-tree.mjs（树杀）·
 * context.mjs（pushReal）· async-settle.mjs（池 ∥ 载体 ∥ 墓碑 ∥ 控制器链）· subagent-scheduler.mjs
 * （取号 ∥ 令牌 ∥ 入池守卫）——叶子向、无环。
 */
import { createWriteStream, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { cleanupOldToolResults } from "../agent/helpers.mjs"
import { pushReal } from "../context.mjs"
import { t } from "../i18n.mjs"
import { killProcessTree } from "../tools/process-tree.mjs"
import {
  bindChildController, buildChildSignal, carrierField, getAsyncPool, writeTombstone, tombstoneOf,
} from "./async-settle.mjs"
import { assertPoolKeyFree, consumeSubagentToken, nextSubagentId } from "./subagent-scheduler.mjs"
import {
  SSH_RETURN_CAP, SSH_SETTLE_MS, SSH_TIMEOUT_MS, bodyText, capText, classifyFailure, createMask, drain,
  failureText, idLabel, settleNote, sshConfigDir, spawnSession, statusLine, unlinkAskpass, waitSettled,
  writeAskpassWrapper,
} from "./ssh-transport.mjs"

/** 并存活会话帽（照 `BG_TASK_MAX` 族）。超限显式拒。 */
export const SSH_SESSION_MAX = 4
/** 闲置自动关闭（§6.22 ④）：600 s 无 send/read ⇒ 关闭 + 注记；不做配置项。 */
export const SSH_IDLE_MS = 600_000

/** `close` 宽限：stdin 结束 → 1.5 s → 杀树（§6.22 ④）。 */
const CLOSE_GRACE_MS = 1500
/** 非密预填档（§6.22 ⑨）：`configDir/ssh-hosts.json`——白名单字段，密码零字段。 */
const HOSTS_FILE = "ssh-hosts.json"

/** 测试缝（闲置窗缩短——生产从不调用）。 */
let _idleMs = null
export function _setSshIdleMsForTest(ms) { _idleMs = ms }
const idleMs = () => _idleMs ?? SSH_IDLE_MS
const toolResultsDir = () => join(sshConfigDir(), "tool-results")

/** 池（写侧：父字段优先 / 借用 history 载体——`ensureBgPool` 同式）。 */
function sshPool(parent) {
  if (parent?._sshSessions instanceof Map) return parent._sshSessions
  const borrowed = carrierField(parent, "_sshSessions")
  if (borrowed instanceof Map) { parent._sshSessions = borrowed; return borrowed }
  parent._sshSessions = new Map()
  if (parent?.history && typeof parent.history === "object") parent.history._sshSessions = parent._sshSessions
  return parent._sshSessions
}

/** 条目查找（id 形归一：`ssh#N` ∥ `N`；键形单源 `String(id)`）。 */
function findEntry(parent, id) {
  const pool = getAsyncPool(parent, "ssh")
  if (!(pool instanceof Map)) return null
  const key = String(id ?? "").trim().replace(/^ssh#/i, "")
  if (!key) return null
  return pool.get(key) ?? pool.get(Number(key)) ?? null
}

/** 会话不存在 / 已终结 ⇒ 可读句（墓碑区分「结束过」与「从未存在」——E5 语义）。 */
function missingEntry(parent, id) {
  const key = String(id ?? "").trim().replace(/^ssh#/i, "")
  const t = tombstoneOf(parent, key)
  if (t?.role === "ssh") {
    const why = t.status === "discarded" ? "was closed when the run was stopped"
      : t.status === "connect-failed" ? "was never established (the connect attempt failed)"
      : t.status === "failed" ? "ended (the remote closed the connection)"
      : "is closed"
    return `Error: ssh session ssh#${key} ${why} — open a new session with action:'connect'`
  }
  return `Error: unknown ssh session id: ${id ?? "(missing)"}`
}

// ─── 生命周期 ───────────────────────────────────────────────────────────────

function clearIdle(entry) {
  if (entry.idleTimer) { clearTimeout(entry.idleTimer); entry.idleTimer = null }
}

/** 终态单点：状态 / 计时器 / log / 包装档 / 出池 / 墓碑（幂等）。 */
function finalize(entry, { state = "dead", status = "failed" } = {}) {
  if (entry.state === "dead" || entry.state === "closed") return
  entry.state = state
  clearIdle(entry)
  try { entry.logStream?.end() } catch { /* 尽力面 */ }
  unlinkAskpass(entry)
  getAsyncPool(entry.parent, "ssh")?.delete(String(entry.id))
  writeTombstone(entry.parent, entry.id, status, "ssh")
}

/** 硬收尾（杀树 + 出池 + 墓碑；退出 / 闲置 / 中止三径共用）。 */
function hardClose(entry, state, status) {
  clearIdle(entry)
  try { killProcessTree(entry.child) } catch { /* 尽力面 */ }
  finalize(entry, { state, status })
}

/** 闲置自动关闭（§6.22 ④）：关闭 + 注记（注入面照异步结算先例）。 */
function armIdle(entry) {
  clearIdle(entry)
  entry.idleTimer = setTimeout(() => {
    const idleS = Math.round((Date.now() - entry.lastActivityAt) / 1000)
    const parent = entry.parent
    hardClose(entry, "closed", "consumed")
    if (parent?.history) {
      pushReal(parent, {
        role: "user",
        content: `[System reminder: ssh session ${idLabel(entry)} (${escapeLite(entry.host)}) was closed after ${idleS}s idle (no send/read). Open a new session if you still need it.]`,
      })
    }
  }, idleMs())
  entry.idleTimer.unref?.()
}

/** 转义（`agent/helpers.mjs escapeXml` 同式——本档只此一处插值，自持小实现避免多一跳）。 */
function escapeLite(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

/** 新建条目（领取 id → 令牌消费同步配对 → 入池守卫——ED-5 同式，逐字照 `bash-async.mjs`）。 */
function createEntry(parent, id, { host, user, port, label }) {
  const entry = {
    id, host, user: user ?? null, port: port ?? null, label: label ?? null,
    parent, child: null, state: "connecting",
    buf: "", bufDropped: false, bytes: 0, _notify: null, _waiters: new Set(),
    promptRe: null, mask: createMask(),
    askpassFile: null, logPath: join(toolResultsDir(), `${Date.now()}-ssh-${id}.log`), logStream: null,
    startedAt: Date.now(), lastActivityAt: Date.now(), lastDataAt: Date.now(),
    idleTimer: null, closing: false, controller: null, exitInfo: null, spawnError: null,
    // 远端断开（会话态子进程退出）⇒ 终态 + 墓碑（E5）；探连期退出不走此钩（由 connect 判定径处置）。
    onRemoteExit: (e) => finalize(e, { state: "dead", status: "failed" }),
  }
  return entry
}

/** 杀单点（会话中止收尾面共用——`killBgTree` 同式）。 */
export function killSshTree(entry) {
  entry.discarded = true
  clearIdle(entry)
  try { killProcessTree(entry.child) } catch { /* 尽力面 */ }
  try { entry.logStream?.end() } catch { /* 尽力面 */ }
  unlinkAskpass(entry)
}

// ─── 非密预填档（§6.22 ⑨）──────────────────────────────────────────────────

const hostsFile = () => join(sshConfigDir(), HOSTS_FILE)
/** 读键 = `host[:port]`（缺省 22）。 */
const hostKey = (host, port) => (port && Number(port) !== 22 ? `${host}:${port}` : String(host))

function lookupHostRecord(host, port) {
  try {
    const all = JSON.parse(readFileSync(hostsFile(), "utf8"))
    const rec = all?.[hostKey(host, port)]
    return rec && typeof rec === "object" ? rec : null
  } catch { return null }
}

/** 写入 = **认证成功后**；白名单 = 非密字段（host / port / user / lastUsedAt——密码零字段）。 */
function saveHostRecord(host, port, user) {
  if (!user) return
  try {
    mkdirSync(sshConfigDir(), { recursive: true })
    let all = {}
    try { all = JSON.parse(readFileSync(hostsFile(), "utf8")) ?? {} } catch { all = {} }
    if (typeof all !== "object" || all === null) all = {}
    all[hostKey(host, port)] = { host, port: Number(port) || 22, user, lastUsedAt: new Date().toISOString() }
    writeFileSync(hostsFile(), JSON.stringify(all, null, 2), "utf8")
  } catch { /* 预填 = 增益面——写失败不进连接语义 */ }
}

// ─── 动作（工具面薄接线消费）────────────────────────────────────────────────

/**
 * 连接（§6.22 ⑤ + 裁定 A 预探路）：探连 ⇒ 升格 ∥ 认证失败 ⇒ 凭据窗 ⇒ 单次带密会话。
 * @returns {{ text?: string, error?: string }}
 */
export async function connectSsh(parent, ctx, { host, user, port, label, promptPattern } = {}) {
  if (!parent) return { error: "no agent context — ssh sessions need a session-level pool (depth-0 only)" }
  if (typeof host !== "string" || !host.trim()) return { error: "connect requires host" }
  const pool = sshPool(parent)
  const live = [...pool.values()].filter((e) => e.state === "connecting" || e.state === "ready")
  if (live.length >= SSH_SESSION_MAX) {
    return {
      error: `ssh session cap reached (${live.length}/${SSH_SESSION_MAX} live: ${live.map(idLabel).join(", ")})` +
        " — close one (action:'close') before opening another",
    }
  }
  let promptRe = null
  if (promptPattern) {
    try { promptRe = new RegExp(String(promptPattern)) } catch (e) { return { error: `promptPattern is not a valid regex: ${e.message}` } }
  }
  const record = lookupHostRecord(host, port)
  const effectiveUser = user || record?.user || null
  const userFromRecord = !user && record?.user ? record.user : null
  const id = nextSubagentId(parent)
  consumeSubagentToken(parent, id, "ssh connect", "ssh")
  await cleanupOldToolResults(toolResultsDir())
  mkdirSync(toolResultsDir(), { recursive: true })
  const entry = createEntry(parent, id, { host, user: effectiveUser, port, label })
  entry.promptRe = promptRe
  entry._notify = ctx?.onOutput ?? null
  const ctrl = new AbortController()
  entry.controller = ctrl
  bindChildController(ctrl, buildChildSignal(parent, ctx)) // 回合中断（Ctrl+I）不中止 ⇒ 会话存活（F2 豁免）
  entry.askpassFile = writeAskpassWrapper(id)
  entry.logStream = createWriteStream(entry.logPath, { flags: "a" })
  entry.logStream.on("error", () => { /* 尽力面 */ })
  /** 沉降等待（探连 ∥ 带密会话同径）：返回 reason + 已等时长。 */
  const settle = async () => {
    const t0 = Date.now()
    const reason = await waitSettled(entry, { signal: ctx?.signal ?? null })
    return { reason, waitedMs: Date.now() - t0 }
  }
  /** 升格为会话（探连成功 ∥ 带密会话成功同径）。 */
  const promote = (reason, waitedMs) => {
    entry.state = "ready"
    entry.lastActivityAt = Date.now()
    armIdle(entry)
    saveHostRecord(entry.host, entry.port, entry.user)
    const { text, dropped } = drain(entry)
    const notes = [
      `— connected (${settleNote(entry, reason, waitedMs)})`,
      `log: ${entry.logPath}`,
      userFromRecord ? `user "${userFromRecord}" came from the local ssh-hosts record` : "",
      dropped ? "in-memory buffer overflowed — full output in the log" : "",
    ].filter(Boolean)
    return { text: `${statusLine(entry)}\n${bodyText(capText(text, SSH_RETURN_CAP, entry))}\n${notes.join("; ")}` }
  }
  try {
    assertPoolKeyFree(pool, id, "ssh")
    pool.set(String(id), entry)
    spawnSession(entry, { user: effectiveUser, port, secret: null }) // 探连：全会话形 + NumberOfPasswordPrompts=0
    let { reason, waitedMs } = await settle()
    // 「已就绪」判据要求进程尚在（静默窗与退出同刻的竞争面——升格一条死连接不成立）。
    if ((reason === "prompt" || reason === "silence") && entry.exitInfo) reason = "exited"
    if (reason === "aborted") {
      hardClose(entry, "closed", "consumed")
      return { error: `ssh connect interrupted before the session was ready (${entry.host})` }
    }
    if (reason === "timeout") {
      hardClose(entry, "closed", "consumed")
      return { error: `ssh connect did not settle within ${SSH_TIMEOUT_MS}ms (${entry.host}) — the connection is closed; retry or increase the wait` }
    }
    if (reason === "exited") {
      const cls = entry.spawnError
        ? { kind: "spawn", message: `ssh client not available (${entry.spawnError}) — install system OpenSSH or check PATH` }
        : classifyFailure(entry.buf)
      if (!cls || cls.kind !== "auth") {
        const text = failureText(entry, cls)
        hardClose(entry, "closed", "connect-failed") // 杀树收尾（finalize 只出池——活子进程会成无句柄悬挂）
        return { error: text }
      }
      // 认证类失败 ⇒ 凭据窗（值只走回调返回路 + 子进程环境——NS4：零入参 ∥ 零入结果 ∥ 零落盘）。
      const input = await askCredential(ctx, { host, user: effectiveUser, port, sessionId: id })
      if (!input) {
        hardClose(entry, "closed", "consumed")
        return { error: `ssh connect to ${entry.host} cancelled — no credential was provided (no connection was attempted with one)` }
      }
      if (!String(input.password ?? "").length) {
        hardClose(entry, "closed", "consumed")
        return { error: "ssh connect cancelled — an empty password is never submitted (submit a password or cancel the window)" }
      }
      entry.user = input.user || effectiveUser || null
      entry.mask.add(input.password) // 遮蔽先注册后写入（回显面零泄）
      spawnSession(entry, { user: entry.user, port, secret: input.password }) // 单次带密会话（PP=1）
      ;({ reason, waitedMs } = await settle())
      if ((reason === "prompt" || reason === "silence") && entry.exitInfo) reason = "exited"
      if (reason !== "prompt" && reason !== "silence") {
        const cls2 = entry.spawnError ? { message: "ssh client not available" } : classifyFailure(entry.buf)
        const text = failureText(entry, cls2 ?? { message: "authentication rejected" }, " — the session was not established")
        // 带密会话未就绪（aborted ∥ timeout）时子进程可能仍活——必走杀树径（否则出池后无句柄可收）。
        hardClose(entry, "closed", "connect-failed")
        return { error: text }
      }
    }
    return promote(reason, waitedMs)
  } catch (e) {
    hardClose(entry, "closed", "connect-failed") // 异常径同走杀树（子进程可能仍在飞）
    return { error: e?.noUi ? `Error: ${e.message}` : `ssh connect failed: ${e?.message ?? String(e)}` }
  } finally {
    entry._notify = null
  }
}

/** 凭据窗（§6.22 ⑧）：无 UI ⇒ 可读错（不挂起、不静默——`question.mjs` 无 UI 抛例同旨）；词面 = i18n 键。
 *  端侧回调自身拒绝（CLI `refuseSecretInput()` 形：抛可读句）⇒ 同族直出（`noUi` 标记 = 失败句不另加前缀）。 */
async function askCredential(ctx, { host, user, port, sessionId }) {
  if (typeof ctx?.onSecretInput !== "function") {
    const err = new Error(t("ssh.no_ui"))
    err.noUi = true // 可读句直出（catch 面不另加前缀——失败句单源 = 核字典）
    throw err
  }
  let res
  try {
    res = await ctx.onSecretInput({
      kind: "ssh-credential",
      sessionId: sessionId != null ? `ssh#${sessionId}` : null,
      host, user: user ?? null, port: port ?? null,
      fields: [
        { name: "user", masked: false, required: false, prefill: user ?? "" },
        { name: "password", masked: true, required: true, prefill: "" },
      ],
      keys: { title: "ssh.credentialTitle", prompt: "ssh.credentialPrompt" },
    })
  } catch (e) {
    // 端侧拒绝（无交互面 / 载荷成形外）⇒ 同族可读句直出（不裹「connect failed」前缀）。
    const err = new Error(e?.message ?? String(e))
    err.noUi = true
    throw err
  }
  if (!res || typeof res !== "object") return null
  return res
}

/** 缓冲溢出注记（三动作同式——丢弃面显式化；全量恒在 log）。 */
const droppedNote = (dropped) => (dropped ? "\n— in-memory buffer overflowed — full output in the log" : "")

/** `send`（§6.22 动作表）：不结尾换行 ⇒ 补 `\r`（设备 Enter 语义）；沉降到点返回该轮输出。 */
export async function sendSsh(parent, ctx, { id, data, settle = true, timeoutMs } = {}) {
  const entry = findEntry(parent, id)
  if (!entry) return { error: missingEntry(parent, id) }
  if (entry.state !== "ready") return { error: `ssh session ${idLabel(entry)} is not ready (state: ${entry.state})` }
  const payload = String(data ?? "")
  if (!payload) return { error: "send requires data" }
  const line = /[\r\n]$/.test(payload) ? payload : `${payload}\r`
  entry.lastActivityAt = Date.now()
  armIdle(entry)
  try { entry.child.stdin.write(line) } catch (e) { return { error: `ssh session ${idLabel(entry)} write failed: ${e?.message ?? String(e)}` } }
  if (settle === false) {
    return { text: `${statusLine(entry)}\n(written without waiting for settle — use action:'read' to collect the output)` }
  }
  entry._notify = ctx?.onOutput ?? null
  const t0 = Date.now()
  const reason = await waitSettled(entry, { timeoutMs, signal: ctx?.signal ?? null })
  entry._notify = null
  const { text, dropped } = drain(entry)
  return {
    text: `${statusLine(entry)}\n${bodyText(capText(text, SSH_RETURN_CAP, entry))}\n— ${settleNote(entry, reason, Date.now() - t0)}${droppedNote(dropped)}`,
  }
}

/** `read`：上次读后新增输出（存量即返；无则等至静默/超时——§6.22 ③/⑥）。 */
export async function readSsh(parent, ctx, { id, timeoutMs, maxChars } = {}) {
  const entry = findEntry(parent, id)
  if (!entry) return { error: missingEntry(parent, id) }
  if (entry.state !== "ready") return { error: `ssh session ${idLabel(entry)} is not ready (state: ${entry.state})` }
  const cap = Number.isFinite(Number(maxChars)) && Number(maxChars) > 0 ? Math.floor(Number(maxChars)) : SSH_RETURN_CAP
  entry.lastActivityAt = Date.now()
  armIdle(entry)
  if (!entry.buf) {
    entry._notify = ctx?.onOutput ?? null
    const t0 = Date.now()
    const reason = await waitSettled(entry, { timeoutMs, signal: ctx?.signal ?? null })
    entry._notify = null
    const { text, dropped } = drain(entry)
    const body = text ? bodyText(capText(text, cap, entry)) : "(no new output)"
    return { text: `${statusLine(entry)}\n${body}\n— ${settleNote(entry, reason, Date.now() - t0)}${droppedNote(dropped)}` }
  }
  const { text, dropped } = drain(entry)
  return { text: `${statusLine(entry)}\n${bodyText(capText(text, cap, entry))}\n— buffered output since the last read${droppedNote(dropped)}` }
}

/** `secret_input`（§6.22 动作表 + ⑦）：凭据窗 → 掩码写入 + `\r`；值永不出现于返回。 */
export async function secretInputSsh(parent, ctx, { id, label } = {}) {
  const entry = findEntry(parent, id)
  if (!entry) return { error: missingEntry(parent, id) }
  if (entry.state !== "ready") return { error: `ssh session ${idLabel(entry)} is not ready (state: ${entry.state})` }
  if (typeof ctx?.onSecretInput !== "function") {
    return { error: `Error: ${t("ssh.no_ui")}` }
  }
  const res = await ctx.onSecretInput({
    kind: "ssh-secret",
    sessionId: idLabel(entry),
    host: entry.host, user: entry.user, port: entry.port,
    fields: [{ name: "secret", masked: true, required: true, prefill: "" }],
    keys: { title: "ssh.secretTitle", prompt: "ssh.secretPrompt" },
  })
  const value = res && typeof res === "object" ? String(res.secret ?? "") : ""
  if (!value) return { text: `${statusLine(entry)}\n(secret input cancelled — nothing was written)` }
  entry.mask.add(value) // 先注册遮蔽，后写入（回显面零泄）
  entry.lastActivityAt = Date.now()
  armIdle(entry)
  try { entry.child.stdin.write(`${value}\r`) } catch (e) { return { error: `ssh session ${idLabel(entry)} write failed: ${e?.message ?? String(e)}` } }
  entry._notify = ctx?.onOutput ?? null
  const t0 = Date.now()
  const reason = await waitSettled(entry, { signal: ctx?.signal ?? null })
  entry._notify = null
  const { text, dropped } = drain(entry)
  const tag = label ? ` (${escapeLite(label)})` : ""
  return { text: `${statusLine(entry)}\nsecret written${tag} — value never echoed\n${bodyText(capText(text, SSH_RETURN_CAP, entry))}\n— ${settleNote(entry, reason, Date.now() - t0)}${droppedNote(dropped)}` }
}

/** `close`：stdin 结束 → 1.5 s 宽限 → 杀树；返回末段输出 + 关闭确认。 */
export async function closeSsh(parent, ctx, { id } = {}) {
  const entry = findEntry(parent, id)
  if (!entry) return { error: missingEntry(parent, id) }
  const { text, dropped } = drain(entry)
  if (entry.state !== "ready") {
    const was = entry.state
    finalize(entry, { state: "closed", status: "consumed" })
    return { text: `${statusLine(entry)}\n${bodyText(capText(text, SSH_RETURN_CAP, entry))}\n— closed (it was already ${was})` }
  }
  entry.closing = true
  try { entry.child.stdin.end() } catch { /* 进程可能已退出——宽限后杀树 */ }
  const exited = await new Promise((resolve) => {
    const t = setTimeout(() => resolve(false), CLOSE_GRACE_MS)
    entry.child.once("exit", () => { clearTimeout(t); resolve(true) })
  })
  if (!exited) killProcessTree(entry.child)
  finalize(entry, { state: "closed", status: "consumed" })
  return { text: `${statusLine(entry)}\n${bodyText(capText(text, SSH_RETURN_CAP, entry))}\n— closed${exited ? "" : " (the remote did not exit within 1.5s — the process tree was killed)"}${droppedNote(dropped)}` }
}

/** `list`：在活会话清单（id / host / user / 状态 / 空闲秒）——上下文压缩后的恢复路。 */
export function listSsh(parent) {
  const pool = getAsyncPool(parent, "ssh")
  const live = [...(pool?.values() ?? [])].filter((e) => e.state === "connecting" || e.state === "ready")
  if (live.length === 0) return { text: "(no live ssh sessions)" }
  const lines = live.sort((a, b) => a.id - b.id).map((e) => {
    const idle = Math.max(0, Math.round((Date.now() - e.lastActivityAt) / 1000))
    return `[ssh (${idLabel(e)}) ${e.host}${e.user ? ` user ${e.user}` : ""} — ${e.state} · idle ${idle}s]`
  })
  return { text: lines.join("\n") }
}

// 常量转口（工具面 / 测试档经本档取——机制档不重复导出）。
export { SSH_SETTLE_MS, SSH_TIMEOUT_MS, SSH_RETURN_CAP }
export { _setSshBinaryForTest, _setSshConfigDirForTest } from "./ssh-transport.mjs"
