/**
 * 2026-10-16-context-perception.test.mjs — context-perception 批单测件（批档 = `docs/batches/2026-10-16-context-perception.md`，
 * 设计 = `docs/core/design/CONTEXT-COMPACTION.md` §6.2 阈值链 / §6.16.4 stats 报面 / §6.16.10 S5 · P1–P3（P4 边界 ⊂ P1 · P5 基线失效 ⊂ P2）· C1 · C10）。
 *
 * 覆盖（本批四条验收面）：
 *   ① 阈值链（`config.mjs` `outputReserve` / `resolveCompactThreshold`）：T1 无显式 · T2 显式小值（上限支）·
 *      T3 封顶档 · T4 守卫档 · T5 可用窗口支 + 逐档不变式（§6.2 表：占比 ∈ [75%, 80%]）。
 *   ② prune 合格集（`token-window.mjs` `collectStaleToolOutputs` + `context-degrade.mjs` 应用面）：保护尾外 ∧ role=tool ∧
 *      ≥ PRUNE_MIN_TOKENS；配对 / 数组引用 / 索引守恒；记录面（`_fullHistory`）零改；基线失效；短历史 no-op。
 *   ③ compact（`agent-tools/context.mjs`）：排队当次零执行（零 fetch、历史逐位等）+ focus fail-closed。
 *   ④ 报告行（S5）：首行恰一个具名百分比（分母 = 窗口）+ 压缩线数值 / 距线值；第 4 行 = `historyPercent` 状态行口径。
 *
 * **用毕即删（零留存）**：本档不入长期测试树（批收口即删）；§5 留一行读数。
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

// 取件路由 = 与消费面同源（TESTING.md §2.2 双实例族防御）：仓根 file URL 绝对形
const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, "..", "..")
const url = (rel) => pathToFileURL(join(ROOT, rel)).href

const { resolveCompactThreshold, outputReserve, usableWindow, providerSpec } = await import(url("thincoder-core/config.mjs"))
const { collectStaleToolOutputs, contextUsage, estimateTokens, historyPercent, PRUNE_MIN_TOKENS } = await import(url("thincoder-core/token-window.mjs"))
const { pruneStaleToolOutputs } = await import(url("thincoder-core/context-degrade.mjs"))
const { contextTool } = await import(url("thincoder-core/agent-tools/context.mjs"))
const { advisorContextBudget } = await import(url("thincoder-core/advisor/compaction.mjs"))

const specOf = (provider) => providerSpec(provider)

// ─── ① 阈值链（§6.2 / D-CC30）──────────────────────────────────────────────────────────

test("T1 无显式：kimi-k3（1M 窗 / 规格 131_072）⇒ 800_000（上限支 80%）", () => {
  const provider = { model: "kimi-k3" }
  const spec = specOf(provider)
  assert.equal(spec.context, 1_000_000)
  assert.equal(outputReserve(provider, spec), 131_072) // 低于封顶（250_000）⇒ 原值
  assert.deepEqual(resolveCompactThreshold(null, provider), { value: 800_000, auto: true })
})

test("T2 显式小值：8_192 于 1M 窗 ⇒ 800_000（上限支）", () => {
  const provider = { model: "kimi-k3", maxTokens: 8_192 }
  const spec = specOf(provider)
  assert.equal(outputReserve(provider, spec), 8_192)
  assert.deepEqual(resolveCompactThreshold(null, provider), { value: 800_000, auto: true })
})

test("T3 封顶档：deepseek 显式 384_000 ⇒ 预留封顶 250_000、阈值 750_000（75%）", () => {
  const provider = { model: "deepseek-flash", maxTokens: 384_000 }
  const spec = specOf(provider)
  assert.equal(spec.context, 1_000_000)
  assert.equal(outputReserve(provider, spec), 250_000) // min(384_000, ⌊1M × 0.25⌋)
  assert.deepEqual(resolveCompactThreshold(null, provider), { value: 750_000, auto: true })
})

test("T4 守卫档：doubao-2-1 规格 maxOutput(524_288) ≥ 窗口(256_000) ⇒ 192_000（封顶后守卫零触发）", () => {
  const provider = { model: "doubao-seed-2-1-pro-260915" }
  const spec = specOf(provider)
  assert.equal(spec.context, 256_000)
  const reserve = outputReserve(provider, spec)
  assert.equal(reserve, 64_000) // min(524_288, ⌊256_000 × 0.25⌋)
  assert.equal(usableWindow(spec.context, reserve), 192_000) // 正数 ⇒ 退化守卫不触发
  assert.deepEqual(resolveCompactThreshold(null, provider), { value: 192_000, auto: true })
})

test("T5 可用窗口支：显式 32_000 于 128_000 窗（预留 25%）⇒ 96_000 = 窗口 − 预留", () => {
  const provider = { model: "kimi-k2.6", maxTokens: 32_000 }
  const spec = specOf(provider)
  assert.equal(spec.context, 128_000)
  assert.equal(outputReserve(provider, spec), 32_000) // 恰在封顶线上
  assert.deepEqual(resolveCompactThreshold(null, provider), { value: 96_000, auto: true })
})

test("T6 逐档不变式：§6.2 代表行阈值逐值吻合且占比 ∈ [75.0%, 80.0%]", () => {
  const rows = [
    // [provider, 期望阈值, 期望占比（%）]
    [{ model: "kimi-k3" }, 800_000, 80.0], // T10 档
    [{ model: "deepseek-flash" }, 750_000, 75.0], // T05 档（规格 384_000 ⇒ 封顶 25% 后 750_000）
    [{ model: "deepseek-flash", maxTokens: 384_000 }, 750_000, 75.0], // 同一档（显式 = 规格值）
    [{ model: "deepseek-flash", maxTokens: 393_216 }, 750_000, 75.0],
    [{ model: "minimax-m1" }, 192_000, 75.0], // T04 档（256_000 / 128_000）
    [{ model: "kimi-for-coding-highspeed" }, 196_608, 75.0], // T03 档（262_144 / 131_072）
    [{ model: "qwen3.5-27b" }, 196_608, 75.0], // T08 档（262_144 / 65_536）
    [{ model: "claude-opus-4" }, 160_000, 80.0], // T09 档（200_000 / 32_000）
    [{ model: "claude-3.5-haiku" }, 160_000, 80.0], // T21 档（200_000 / 8_192）
    [{ model: "gpt-4o" }, 102_400, 80.0], // T14 档（128_000 / 16_000）
    [{ model: "gemini-2.5-flash" }, 800_000, 80.0], // T19 档（1M / 64_000）
    [{ model: "gemini-2.5-pro" }, 1_600_000, 80.0], // T22 档（2M / 64_000）
    [{ model: "kimi-for-coding" }, 838_860, 80.0], // T13 档（1_048_576 / 131_072）
  ]
  for (const [provider, expected, pct] of rows) {
    const { value } = resolveCompactThreshold(null, provider)
    const window = specOf(provider).context
    assert.equal(value, expected, `${provider.model} 阈值`)
    assert.equal(Math.round((value / window) * 1000) / 10, pct, `${provider.model} 占比`)
    assert.ok(value / window >= 0.75 && value / window <= 0.8, `${provider.model} 占比越界`)
  }
})

test("T7 显式 compactThreshold 优先（阈值链第一位）", () => {
  assert.deepEqual(resolveCompactThreshold(123_456, { model: "deepseek-flash", maxTokens: 384_000 }), { value: 123_456, auto: false })
})

test("T8 评审面读数随动：deepseek 判死线 600_000 / 压缩触发 480_000（机制零改）", () => {
  const budget = advisorContextBudget({ model: "deepseek-flash" })
  assert.deepEqual(budget, { limit: 600_000, compactAt: 480_000 })
})

// ─── ② prune 合格集与应用面（§6.16.3 / D-CC25）────────────────────────────────────────

/** 60 条历史（1M 窗 ⇒ keepTail = 24、tailStart = 36）：尾外 12 条大 tool（≥200 tok）+ 1 条门槛下 + 保护尾内 1 条大 tool。 */
function pruneFixture() {
  const history = []
  const push = (m) => history.push(m)
  const pairedTool = (id, size) => {
    push({ role: "assistant", content: "", tool_calls: [{ id, type: "function", function: { name: "read", arguments: "{}" } }] })
    push({ role: "tool", tool_call_id: id, content: "X".repeat(size) })
  }
  for (let i = 1; i <= 12; i++) pairedTool(`t${i}`, 1_200) // 各估 300 tok ⇒ 合格 12 条（§6.16.10 P1）
  pairedTool("t13", 400) // 估 100 tok ⇒ 门槛下
  while (history.length < 36) push(history.length % 2 === 0 ? { role: "assistant", content: "note" } : { role: "user", content: "go on" })
  while (history.length < 49) push(history.length % 2 === 0 ? { role: "assistant", content: "note" } : { role: "user", content: "go on" })
  pairedTool("t14", 1_200) // 保护尾内（tailStart = 36）⇒ 不动
  while (history.length < 60) push(history.length % 2 === 0 ? { role: "assistant", content: "note" } : { role: "user", content: "go on" })
  return history
}

test("P1 prune 合格集：保护尾外 ∧ role=tool ∧ ≥ PRUNE_MIN_TOKENS（只读）", () => {
  const history = pruneFixture()
  const agent = { provider: { model: "kimi-k3" }, history, _fullHistory: [...history] }
  const snapshot = JSON.stringify(history)
  const r = collectStaleToolOutputs(history, agent.provider)
  assert.equal(PRUNE_MIN_TOKENS, 200)
  assert.deepEqual(r.indexes, [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23]) // 12 条
  assert.equal(r.tokens, 3_600) // 12 × 300
  assert.equal(r.candidates, 14) // t1–t14
  assert.equal(r.tailKept, 1) // t14（保护尾内）
  assert.equal(r.belowMin, 1) // t13（< 200 tok）
  assert.equal(r.tailCount, 24)
  assert.equal(JSON.stringify(history), snapshot) // 合格集 = 只读
})

test("P2 prune 应用面：原位换内容、配对 / 引用 / 索引守恒、记录面零改、基线失效", () => {
  const history = pruneFixture()
  const idsBefore = history.map((m) => m.tool_call_id ?? null)
  const agent = { provider: { model: "kimi-k3" }, history, _fullHistory: [...history], _lastPromptTokens: 777, _usageAtLen: 12 }
  const fullRefs = agent._fullHistory.slice() // 记录面原件引用（与历史共享消息对象）
  const fullBefore = JSON.stringify(agent._fullHistory)
  const beforeTokens = estimateTokens(history)
  const r = pruneStaleToolOutputs(agent)
  assert.equal(r.pruned, 12)
  assert.equal(r.freed, 3_600)
  assert.ok(estimateTokens(history) < beforeTokens) // 历史估算下降（§6.16.10 P1）
  assert.equal(agent.history, history) // 数组引用不变（VSC 共享数组契约）
  assert.equal(history.length, 60)
  assert.deepEqual(history.map((m) => m.tool_call_id ?? null), idsBefore) // 各索引 tool_call_id 全等
  // 12 条合格项全部换 stub（原对象未被改 = copy-on-write）
  for (const i of [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23]) {
    assert.match(history[i].content, /^\[pruned: stale tool output dropped \(1200 chars\) — re-run the tool if you need it again\.\]$/)
    assert.equal(history[i].tool_call_id, idsBefore[i])
  }
  assert.equal(history[25].content.length, 400) // 门槛下不动
  assert.equal(history[50].content.length, 1_200) // 保护尾内不动
  // 记录面深等（内容 + 顺序）+ 引用未换
  assert.equal(JSON.stringify(agent._fullHistory), fullBefore)
  assert.equal(agent._fullHistory.every((m, i) => m === fullRefs[i]), true)
  assert.equal(agent._lastPromptTokens, null)
  assert.equal(agent._usageAtLen, null)
  // 配对守恒：每个 tool 消息的 owner assistant 仍在原位
  const owners = new Set(history.filter((m) => m.role === "assistant").flatMap((m) => (m.tool_calls ?? []).map((tc) => tc.id)))
  for (const m of history.filter((x) => x.role === "tool")) assert.ok(owners.has(m.tool_call_id))
})

test("P3 prune 无合格项（短历史）：零改动、回执 0、基线不失效", () => {
  // 短历史：唯一的 tool 结果与其 owner 同在保护尾（配对修复把 owner 拉回 tail ⇒ 合格集空）
  const history = [
    { role: "user", content: "hi" },
    { role: "assistant", content: "", tool_calls: [{ id: "t1", type: "function", function: { name: "read", arguments: "{}" } }] },
    { role: "tool", tool_call_id: "t1", content: "X".repeat(4_000) },
  ]
  const agent = { provider: { model: "kimi-k3" }, history, _lastPromptTokens: 321, _usageAtLen: 2 }
  const snapshot = JSON.stringify(history)
  const collected = collectStaleToolOutputs(history, agent.provider)
  assert.deepEqual(collected.indexes, [])
  assert.equal(collected.tailKept, 1)
  const r = pruneStaleToolOutputs(agent)
  assert.equal(r.pruned, 0)
  assert.equal(JSON.stringify(history), snapshot)
  assert.equal(agent._lastPromptTokens, 321)
  assert.equal(agent._usageAtLen, 2)
})

// ─── ③ compact 排队（§6.16.2 / D-CC24）───────────────────────────────────────────────

test("C1 compact 只排队：当次零执行（零 fetch、历史逐位等）、focus 回显 + 回查锚在场", async () => {
  const history = [
    { role: "user", content: "do the work" },
    { role: "assistant", content: "ok" },
  ]
  const agent = { provider: { model: "kimi-k3" }, history, _slot: null, cwd: null }
  const before = JSON.stringify(history)
  const realFetch = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => { calls++; throw new Error("network must not be touched by compact") }
  try {
    const receipt = await contextTool.execute({ action: "compact", focus: "next: land the threshold chain" }, { agent, depth: 0 })
    assert.equal(calls, 0)
    assert.equal(agent._pendingCompact.focus, "next: land the threshold chain")
    assert.equal(JSON.stringify(agent.history), before) // 历史零改
    assert.match(receipt, /next safe point/)
    assert.match(receipt, /Focus: next: land the threshold chain/)
    assert.match(receipt, /read_history path="cwd:/) // 未绑定槽 ⇒ cwd 发现面（不抛）
  } finally {
    globalThis.fetch = realFetch
  }
})

test("C10 focus fail-closed：缺失 / 空白 ⇒ Error 回执且不排队", async () => {
  for (const focus of [undefined, "", "   "]) {
    const agent = { provider: { model: "kimi-k3" }, history: [{ role: "user", content: "hi" }] }
    const receipt = await contextTool.execute({ action: "compact", focus }, { agent, depth: 0 })
    assert.match(receipt, /^Error: 'focus' is required/)
    assert.equal(agent._pendingCompact, undefined)
  }
})

// ─── ④ 报告行（S5 / §6.16.4 首行定稿 · D-CC29）────────────────────────────────────────

function statsFixture() {
  const history = [
    { role: "user", content: "u".repeat(4_000) }, // ≈1000 tok
    { role: "assistant", content: "a".repeat(2_000) }, // ≈500 tok
  ]
  return {
    provider: { model: "deepseek-flash", maxTokens: 384_000 },
    history,
    _lastPromptTokens: 600_000,
    _usageAtLen: 1,
    _ctxBasis: { threshold: 750_000, overhead: { systemPrompt: "s".repeat(400), tools: [{ name: "read" }] } },
  }
}

test("S5 stats 首行两名分明：恰一个具名百分比（分母 = 窗口）+ 压缩线 / 距线数值", async () => {
  const agent = statsFixture()
  const report = await contextTool.execute({ action: "stats" }, { agent })
  const lines = report.split("\n")
  const m = /^Context ≈(\d+) tokens \((\d+)% of (\d+) window\); compaction line (\d+) \((\d+) to the line\)$/.exec(lines[0])
  assert.ok(m, `首行形态不合定稿: ${lines[0]}`)
  const [, totalStr, pctStr, windowStr, thresholdStr, toGoStr] = m
  const [total, pct, window, threshold, toGo] = [totalStr, pctStr, windowStr, thresholdStr, toGoStr].map(Number)

  // 复算等值（S1/S5）
  const usage = contextUsage(agent, agent._ctxBasis.overhead)
  assert.equal(total, usage.total)
  assert.equal(window, usage.window)
  assert.equal(threshold, usage.threshold)
  assert.equal(pct, Math.round((total / window) * 100))
  assert.equal(toGo, Math.max(0, threshold - total))

  // 两名分明：首行百分比恰 1 个；旧式「vs compaction threshold」与状态行分母口径不混入
  assert.equal((lines[0].match(/%/g) ?? []).length, 1)
  assert.doesNotMatch(lines[0], /vs compaction threshold/)

  // F-CC1 载荷全保：各段绝对量 + basis / 可清理面
  assert.match(lines[1], /^Segments ≈: system \d+ · tools \d+ · history \d+ \(basis: measured\)$/)
  assert.match(lines[2], /^History: tool outputs \d+ tokens in \d+ msgs · prunable stale \d+ tokens in \d+ msgs · protected tail \d+ msgs$/)

  // 第 4 行 = 状态行同一函数（historyPercent）——口径零改
  const line4 = new RegExp(`^Status line: context ${historyPercent(agent.history, agent.provider)}% \\(\\d+ history estimate / ${window} window\\)$`)
  assert.match(lines[3], line4)
})

test("S4 stats 空历史 / 无 _ctxBasis：不抛、total = overhead、阈值走 resolveCompactThreshold 兜底", async () => {
  const agent = { provider: { model: "kimi-k3" }, history: [] }
  const report = await contextTool.execute({ action: "stats" }, { agent })
  const first = report.split("\n")[0]
  assert.equal(first, "Context ≈0 tokens (0% of 1000000 window); compaction line 800000 (800000 to the line)")
  const usage = contextUsage(agent, {})
  assert.equal(usage.basis, "estimated")
  assert.equal(usage.total, 0)
  assert.equal(usage.threshold, resolveCompactThreshold(undefined, agent.provider).value)
})
