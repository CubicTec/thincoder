/**
 * 2026-10-14-design-token-recovery.test.mjs — 设计令牌可恢复性批 · 批次本地单元件（随批留存归档）。
 * 名随批次档 · 住批次目录 · 不进仓套件；复跑 = 从仓库根（thincoder/）：
 *   node --test docs/batches/2026-10-14-design-token-recovery.test.mjs
 *
 * 腿（设计档 DESIGN-TOKEN-SETTLEMENT.md §10 回收读口用例面 :227-229）：
 *   U-SL10 reveal 活槽 ⇒ 全串 designToken（单槽限 ∥ 零写）
 *   U-SL11 reveal 缺 designId（含空串视同缺省）/ 非 boolean ⇒ 拒
 *   U-SL12 过期 / 畸形槽 ⇒ 掩蔽（designToken=— 如实注因；值零出现）
 *   U-SL13 未知 designId ⇒ 拒 + 在场 id 列（零槽 ⇒ (none)）
 *   U-SL14 缺省三态零揭值（无参 ∥ designId 过滤 ∥ 空串）——默认面回归
 *   U-SL15 日志面（logEvent + 测试缝）：含 token 值形串 ⇒ 落盘零 token 值
 * 夹具：槽面 = `sessionSlots._setSessionsDirForTest` 临时会话目录 + `_slot` 直钉槽 1；
 *   日志面 = `log.mjs._setLogsDirForTest` 临时目录（同 2026-10-07-ledger-tool.test.mjs 先例）。
 */
import test from "node:test"
import assert from "node:assert/strict"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { randomUUID } from "node:crypto"

const ROOT = process.cwd()
if (!existsSync(join(ROOT, "thincoder-core"))) throw new Error(`从仓库根（thincoder/）运行（cwd = ${ROOT}）`)
const mod = (rel) => import(pathToFileURL(resolve(ROOT, rel)).href)

const sessionSlots = await mod("thincoder-core/session-slots.mjs")
const subagentMod = await mod("thincoder-core/agent-tools/subagent.mjs")
const LOG = await mod("thincoder-core/log.mjs")

const DAY = 86400000
const created = []
const tmpBase = (tag) => { const d = mkdtempSync(join(tmpdir(), `dtr-${tag}-`)); created.push(d); return d }
test.after(() => { for (const d of created.splice(0)) rmSync(d, { recursive: true, force: true }) })

const sessionsDir = tmpBase("sessions")
mkdirSync(sessionsDir, { recursive: true })
sessionSlots._setSessionsDirForTest(sessionsDir)
test.after(() => sessionSlots._resetSessionsDirForTest())

const mkTok = (expiresAt) => `${randomUUID()}:${expiresAt}`
/** 槽面夹具（同批先例）：槽文件（权威表）+ 内存 Map 同源写入；`_slot` 直钉槽 1（零认领副作用）。 */
function mkSlotCase(name, tokens) {
  const cwd = join(tmpBase(name), name)
  mkdirSync(cwd, { recursive: true })
  writeFileSync(sessionSlots.slotPath(cwd, 1), JSON.stringify({ version: 2, cwd, engDesignTokens: tokens }), "utf8")
  const agent = { cwd, _slot: 1, _engDesignTokens: new Map(Object.entries(tokens)), config: { agent: { engineering: true, engTokenTtlMs: 7 * DAY } } }
  return { agent, tokens }
}
const slotCall = (args, agent) => subagentMod.subagentTool.execute({ action: "design-slots", ...args }, { agent })
/** 拒面读数：拒 = throw 且消息匹配。 */
async function refusal(p, re) {
  let msg = null
  try { await p } catch (e) { msg = String(e?.message ?? e) }
  assert.notEqual(msg, null, "应拒（throw）")
  assert.match(msg, re)
  return msg
}
const RECOVERY_LINE = "design-slots: pass designId + designToken verbatim to the eng-coder spawn — the gate checks exact equality."

// ── U-SL10 活槽 reveal（单槽限 ∥ 零写） ──────────────────────────────────────
test("U-SL10 · reveal 活槽 ⇒ 槽行尾全串 designToken + 回收行（单槽限——他槽值零出现；零写）", async () => {
  const t = Date.now()
  const { agent, tokens } = mkSlotCase("r10", { dA: mkTok(t + DAY), dB: mkTok(t + 2 * DAY) })
  const filePath = sessionSlots.slotPath(agent.cwd, 1)
  const fileBefore = readFileSync(filePath, "utf8")
  const memBefore = [...agent._engDesignTokens.entries()]
  const out = await slotCall({ designId: "dA", reveal: true }, agent)
  const lines = out.split("\n")
  assert.equal(lines.length, 3, "槽行 + 回收行 + 计数尾行（三行整）")
  assert.match(lines[0], /^- designId=dA status=live ageDays=6\.0 expiresAt=\d{4}-\d{2}-\d{2}T[\d:.]+Z batch=— designToken=/, "现行槽行字段 + 尾追加 designToken")
  assert.ok(lines[0].endsWith(`designToken=${tokens.dA}`), "全串 token（逐字）")
  assert.equal(lines[1], RECOVERY_LINE, "回收行逐字（designId + designToken 原样入 spawn——门禁严格相等）")
  assert.equal(lines[2], "design-slots: 1 slot(s) — 1 live / 0 expired (filtered by designId)", "计数尾行 + (filtered by designId) 注")
  assert.equal(out.includes(tokens.dB), false, "单槽限——他槽 token 零出现")
  assert.deepEqual([...agent._engDesignTokens.entries()], memBefore, "零写：内存槽零变")
  assert.equal(readFileSync(filePath, "utf8"), fileBefore, "零写：槽文件字节零变")
})

// ── U-SL11 reveal 拒面 ──────────────────────────────────────────────────────
test("U-SL11 · reveal 缺 designId（含空串视同缺省）/ 非 boolean ⇒ 拒（fail-closed）", async () => {
  const t = Date.now()
  const { agent } = mkSlotCase("r11", { dA: mkTok(t + DAY) })
  const fileBefore = readFileSync(sessionSlots.slotPath(agent.cwd, 1), "utf8")
  const noId = /design-slots: reveal:true requires the designId parameter — one slot at a time \(no bulk dump\)\./
  await refusal(slotCall({ reveal: true }, agent), noId)
  await refusal(slotCall({ reveal: true, designId: "" }, agent), noId)
  await refusal(slotCall({ reveal: true, designId: "   " }, agent), noId)
  await refusal(slotCall({ reveal: "true", designId: "dA" }, agent), /reveal must be a boolean \(got "true"\)/)
  await refusal(slotCall({ reveal: 1, designId: "dA" }, agent), /reveal must be a boolean \(got 1\)/)
  assert.equal(agent._engDesignTokens.size, 1, "拒面零写：内存零变")
  assert.equal(readFileSync(sessionSlots.slotPath(agent.cwd, 1), "utf8"), fileBefore, "拒面零写：槽文件字节零变")
})

// ── U-SL12 掩蔽 ─────────────────────────────────────────────────────────────
test("U-SL12 · 过期 / 畸形槽 reveal ⇒ 掩蔽（designToken=— 如实注因；值零出现；无回收行）", async () => {
  const t = Date.now()
  const malformed = "not-a-token"
  const { agent, tokens } = mkSlotCase("r12", { dExp: mkTok(t - 2 * DAY), dBad: malformed, dLive: mkTok(t + DAY) })
  const outExp = await slotCall({ designId: "dExp", reveal: true }, agent)
  assert.ok(outExp.includes("designToken=— (expired — masked; passes no gate)"), "过期 ⇒ 掩蔽 + 如实注因")
  assert.equal(outExp.includes(tokens.dExp), false, "过期值零出现")
  assert.equal(outExp.includes("verbatim"), false, "掩蔽 ⇒ 无回收行")
  const outBad = await slotCall({ designId: "dBad", reveal: true }, agent)
  assert.match(outBad, /- designId=dBad status=live .*designToken=— \(malformed — masked; passes no gate\)/, "畸形槽列表记 live、口面照掩蔽（两判据分列——设计档 §10 掩蔽口径）")
  assert.equal(outBad.includes(malformed), false, "畸形值零出现")
  const outLive = await slotCall({ designId: "dLive", reveal: true }, agent)
  assert.ok(outLive.includes(`designToken=${tokens.dLive}`), "同夹具正控：活槽仍揭")
})

// ── U-SL13 未知 designId ────────────────────────────────────────────────────
test("U-SL13 · 未知 designId ⇒ 拒 + 在场 id 列（零槽 ⇒ (none)）", async () => {
  const t = Date.now()
  const { agent } = mkSlotCase("r13", { dOld: mkTok(t + DAY), dNew: mkTok(t + 2 * DAY) })
  const msg = await refusal(slotCall({ designId: "ghost" }, agent), /unknown designId "ghost"/)
  assert.match(msg, /held design ids: /)
  assert.ok(msg.includes("dOld") && msg.includes("dNew"), "在场 id 逐个列报")
  await refusal(slotCall({ designId: "ghost", reveal: true }, agent), /unknown designId "ghost"/)
  const empty = mkSlotCase("r13b", {})
  await refusal(slotCall({ designId: "ghost" }, empty.agent), /held design ids: \(none\)/)
})

// ── U-SL14 缺省三态零揭值（默认面回归） ─────────────────────────────────────
test("U-SL14 · 缺省三态零揭值：无参 ∥ designId 过滤 ∥ 空串视同缺省（默认面逐字零变）", async () => {
  const t = Date.now()
  const { agent, tokens } = mkSlotCase("r14", { dA: mkTok(t + DAY), dB: mkTok(t + 2 * DAY) })
  const none = await slotCall({}, agent)
  const blank = await slotCall({ designId: "" }, agent)
  const blankWs = await slotCall({ designId: "   " }, agent)
  assert.equal(blank, none, "空串 = 无参逐字零变")
  assert.equal(blankWs, none, "空白串 = 无参逐字零变")
  const lines = none.split("\n")
  assert.deepEqual(lines.map((l) => /^- designId=(\S+)/.exec(l)?.[1] ?? null), ["dA", "dB", null], "逐槽行（龄序）+ 计数尾行")
  assert.equal(lines.at(-1), "design-slots: 2 slot(s) — 2 live / 0 expired", "缺省计数尾行零注（现行形）")
  const filtered = await slotCall({ designId: "dB" }, agent)
  assert.deepEqual(filtered.split("\n"), [lines[1], "design-slots: 1 slot(s) — 1 live / 0 expired (filtered by designId)"], "过滤 ⇒ 单槽行 + (filtered by designId) 注")
  for (const out of [none, blank, blankWs, filtered]) {
    assert.equal(out.includes(tokens.dA) || out.includes(tokens.dB), false, "三态零揭值（token 值零出现）")
  }
})

// ── U-SL15 日志面（二次泄露堵口） ───────────────────────────────────────────
test("U-SL15 · 日志面：含 token 值形串 ⇒ 落盘零 token 值（SECRET_FORM 截断到形态前）", async () => {
  const logDir = tmpBase("logs")
  LOG._setLogsDirForTest(logDir)
  try {
    const token = mkTok(Date.now() + DAY)
    LOG.logEvent("t:recovery", { head: `design-slots: - designId=dA status=live ... designToken=${token}`, tail: `after ${token} suffix` })
    LOG.logEvent("t:recovery-name", { designToken: token }) // 字段名黑名单照旧（整字段丢弃——零改）
    const raw = readFileSync(LOG.todayLogPath(), "utf8")
    assert.equal(raw.includes(token), false, "落盘零 token 值（head 截断到形态前）")
    const events = raw.split("\n").filter(Boolean).map((l) => JSON.parse(l))
    const first = events.find((e) => e.ev === "t:recovery")
    assert.ok(typeof first.head === "string" && first.head.endsWith("designToken="), "head 保留形态前前缀（内容级截断）")
    assert.equal(first.tail, "after ", "同 SECRET_FORM 单源（任意字段同扫）")
    assert.equal("designToken" in (events.find((e) => e.ev === "t:recovery-name") ?? {}), false, "字段名黑名单整字段丢弃")
    assert.equal(LOG.sanitizeString("head", `prefix ${token} suffix`), "prefix ", "形态前截断（宁可丢信息不漏密钥）")
    assert.equal(LOG.sanitizeString("head", "no secret here"), "no secret here", "正控：无形态 ⇒ 原样")
  } finally {
    LOG._resetLogsDirForTest()
  }
})
