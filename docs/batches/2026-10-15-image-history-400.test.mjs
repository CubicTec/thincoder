/**
 * 2026-10-15-image-history-400.test.mjs — 批内件（image-history-400 · 台账 #1450 · 实施轮）。
 * 名随批次档 · 住批次目录 · 不进仓套件；复跑 = 从仓库根（thincoder/）：
 *   node --test docs/batches/2026-10-15-image-history-400.test.mjs
 *
 * 用例 = 设计档 §6.26 表逐条（T-1..T-10 ∥ W-1）；单源 = `docs/core/design/PROVIDER.md` §6.26：
 *   T-1 图像语义词表（正 ∥ 反样本）        T-2 T1 ⇒ 全剥 + 注记（文本 part 逐字 ∥ 条数 ∥ dropped=2）
 *   T-3 非图像错误零误伤（history 不变 ∥ 原错照抛 ∥ 请求计数 = 1）
 *   T-4 图像语义文本 ∧ 零图 ⇒ 零动作       T-5 T2 结构兜底（streak=1）
 *   T-6 剥除后自熄（无重试风暴）           T-7 剥除 + 重发再败 ⇒ 新错照抛、不二次剥除
 *   T-8 人读线零损（copy-on-write 真值）   T-9 capHistoryImages 缺省参占位逐字 = 批前字面
 *   T-10 413 图像词首撞（照抛 ∥ 自增）→ 复撞（T2 生效）
 *   W-1 接线：node:http 假服务端（首 400 图像语义 ∥ 次 SSE 200）直驱 callModelTurn ⇒ 请求计数 = 2
 *        ∧ 第二请求体无 image part ∧ 回合成功 ∧ 成功清账
 * AC 回指：AC-1（T-2 ∥ W-1）· AC-2（T-8）· AC-3（T-1 反样本 ∥ T-3）· AC-4（T-6 ∥ W-1 计数）·
 *          AC-5（T-9——机检锚一半；另一半 = git diff 检读，仓外命令）。
 */
import test from "node:test"
import assert from "node:assert/strict"
import http from "node:http"
import { join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const ROOT = fileURLToPath(new URL("../../", import.meta.url)) // 仓根（thincoder/）
const mod = (rel) => import(pathToFileURL(join(ROOT, rel)).href)

const ERRORS = await mod("thincoder-core/provider/errors.mjs") // looksLikeImageRejection
const NORM = await mod("thincoder-core/provider/normalize.mjs") // stripRejectedImages ∥ capHistoryImages
const HEAL = await mod("thincoder-core/agent/image-heal.mjs") // healImageRejection ∥ clearImageFailStreak
const CHAT = await mod("thincoder-core/agent/chat-call.mjs") // callModelTurn（接线面）

/* ── 夹具 ── */

/** image part（与 record-results 注入面同形——read_image 输出）。 */
const img = (tag) => ({ type: "image_url", image_url: { url: `data:image/png;base64,${tag}` } })

/** 图像语义 400 错误（构造位文案 = `provider/core.mjs:416` 族）。 */
const img400 = (text = "image exceeds 5 MB maximum") => new Error(`LLM API error 400: ${text}`)

/** 测试 agent：history ∥ _fullHistory 双线同对象（pushReal 语义——T-8 copy-on-write 判据面）。 */
function makeAgent(history) {
  return {
    history,
    _fullHistory: [...history],
    provider: { model: "gpt-4o", baseURL: "http://127.0.0.1:1", apiKey: "k" },
    config: { agent: { streamRules: [] }, traces: { enabled: false } },
    cwd: process.cwd(),
  }
}

/** callModelTurn 上下文（depth 0 主回合形态）。 */
const turnCtx = () => ({
  systemPrompt: "sys",
  toolSchemas: [],
  streamOutput: false,
  callbacks: {},
  signal: new AbortController().signal,
  streamRuleFired: undefined,
  autoTurn: false,
  depth: 0,
  turn: 0,
})

const hasImagePart = (m) => Array.isArray(m?.content) && m.content.some((p) => p?.type === "image_url")
const NOTE_PREFIX = "[System reminder: the provider rejected the image payload (HTTP 4xx)"

/* ── 就地假服务端（W-1 口径：node:http + 真 fetch 走 proxyFetch 直连分支；零外网） ── */

function collectBody(req) {
  return new Promise((resolve) => {
    let data = ""
    req.setEncoding("utf8")
    req.on("data", (c) => { data += c })
    req.on("end", () => resolve(data))
  })
}

async function withServer(handler, fn) {
  const bodies = []
  const srv = http.createServer(async (req, res) => {
    const body = await collectBody(req)
    bodies.push(body)
    handler(req, res, bodies.length - 1)
  })
  await new Promise((r) => srv.listen(0, "127.0.0.1", r))
  try {
    return await fn(`http://127.0.0.1:${srv.address().port}`, bodies)
  } finally {
    const closed = new Promise((r) => srv.close(r))
    srv.closeAllConnections() // keep-alive 连接即时断开——close 回调不悬等
    await closed
  }
}

/** 400 错误响应（首请求毒图拒绝形）。 */
const send400 = (res, message) => {
  res.writeHead(400, { "content-type": "application/json" })
  res.end(JSON.stringify({ error: { message } }))
}
/** SSE 200 单帧（回合成功形）。 */
const sendSSE = (res, text) => {
  res.writeHead(200, { "content-type": "text/event-stream" })
  res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: text }, finish_reason: "stop" }] })}\n\n`)
  res.end("data: [DONE]\n\n")
}
/** 请求体有 image part 否。 */
const bodyHasImage = (body) =>
  JSON.parse(body).messages.some((m) => Array.isArray(m.content) && m.content.some((p) => p?.type === "image_url"))

/* ── T-1 词表 ── */
test("T-1 图像语义词表：正样本全 true ∥ 反样本全 false", () => {
  for (const t of [
    "image exceeds 5 MB maximum",
    "unsupported image format",
    "Invalid 'messages[1].content[0].image_url'",
    "图片格式不支持",
    "图像过大",
  ]) assert.equal(ERRORS.looksLikeImageRejection(t), true, `正样本 ${t}`)
  for (const t of ["context_length_exceeded", "invalid tool schema", "余额不足"]) {
    assert.equal(ERRORS.looksLikeImageRejection(t), false, `反样本 ${t}`)
  }
})

/* ── T-2 T1 全剥 + 注记 ── */
test("T-2 T1 全剥：image part 归零 ∥ 原文本 part 逐字保留 ∥ 条数不变（注记 +1）∥ dropped=2", () => {
  const PH = "[image omitted — the provider rejected the image payload; dropped from history so the session can continue. Re-read a smaller copy if the image is still needed.]"
  assert.equal(NORM.IMAGE_REJECTED_PLACEHOLDER, PH, "占位常量逐字（§6.26）")
  const textPart = { type: "text", text: "look at these" }
  const history = [
    { role: "user", content: [textPart, img("AAA"), img("BBB")] },
    { role: "assistant", content: "ok" },
  ]
  const agent = makeAgent(history)
  const r = HEAL.healImageRejection(agent, img400())
  assert.equal(r.healed, true)
  assert.equal(r.dropped, 2)
  assert.equal(agent.history.length, 3, "剥除前后条数不变（2）+ 注记另计 +1")
  const parts = agent.history[0].content
  assert.equal(parts.filter((p) => p?.type === "image_url").length, 0, "image part 归零")
  assert.equal(parts[0], textPart, "原文本 part 原引用逐字保留")
  assert.deepEqual(parts[0], { type: "text", text: "look at these" })
  assert.equal(parts[1].text, PH)
  assert.equal(parts[2].text, PH)
  assert.equal(agent.history[1], history[1], "未命中消息原引用（copy-on-write）")
  assert.equal(agent.history.at(-1).role, "user")
  assert.equal(
    agent.history.at(-1).content,
    "[System reminder: the provider rejected the image payload (HTTP 4xx) — 2 image(s) were dropped from the context so the session can continue; the request was re-sent. Re-read a downscaled copy with read_image if still needed, and tell the user which image(s) were dropped.]",
    "注记逐字（N = 剥除数）",
  )
})

/* ── T-3 非图像错误零误伤 ── */
test("T-3 非图像错误零误伤：healed=false ∥ history 逐条不变 ∥ 原错照抛（请求计数 = 1）", async () => {
  const history = [{ role: "user", content: [{ type: "text", text: "hi" }, img("AAA")] }]
  const agent = makeAgent(history)
  const snapshot = structuredClone(history)
  const r = HEAL.healImageRejection(agent, new Error("LLM API error 400: invalid tool schema"))
  assert.equal(r.healed, false)
  assert.equal(r.dropped, 0)
  assert.deepEqual(agent.history, snapshot, "history 逐条 deepEqual 不变")

  await withServer((req, res) => send400(res, "invalid tool schema"), async (baseURL, bodies) => {
    const w = makeAgent([{ role: "user", content: [{ type: "text", text: "hi" }, img("AAA")] }])
    w.provider = { model: "gpt-4o", baseURL, apiKey: "k" }
    await assert.rejects(() => CHAT.callModelTurn(w, turnCtx()), /LLM API error 400: .*invalid tool schema/)
    assert.equal(bodies.length, 1, "原错照抛、零重发（请求计数 = 1）")
    assert.equal(hasImagePart(w.history[0]), true, "history 未动（图仍在场）")
  })
})

/* ── T-4 零图零动作 ── */
test("T-4 图像语义文本 ∧ 零图 ⇒ healed=false 零动作", () => {
  const history = [{ role: "user", content: "no images here" }]
  const agent = makeAgent(history)
  const snapshot = structuredClone(history)
  const r = HEAL.healImageRejection(agent, img400())
  assert.equal(r.healed, false)
  assert.equal(r.dropped, 0)
  assert.deepEqual(agent.history, snapshot)
})

/* ── T-5 T2 结构兜底 ── */
test("T-5 结构兜底（T2）：streak=1 + 400 无图像词 + 图在场 ⇒ healed=true", () => {
  const agent = makeAgent([{ role: "user", content: [img("AAA")] }])
  agent._imageFailStreak = 1
  const r = HEAL.healImageRejection(agent, new Error("LLM API error 400: invalid request"))
  assert.equal(r.healed, true)
  assert.equal(r.dropped, 1)
  assert.equal(agent.history.filter(hasImagePart).length, 0)
})

/* ── T-6 自熄 ── */
test("T-6 自熄：剥除后同错二发（史无图）⇒ healed=false，无重试风暴", () => {
  const agent = makeAgent([{ role: "user", content: [img("AAA")] }])
  const err = img400()
  assert.equal(HEAL.healImageRejection(agent, err).healed, true)
  const after = structuredClone(agent.history)
  const r2 = HEAL.healImageRejection(agent, err)
  assert.equal(r2.healed, false)
  assert.equal(r2.dropped, 0)
  assert.deepEqual(agent.history, after, "零二次动作（无二次剥除 ∥ 无第二注记）")
  assert.equal(agent.history.filter((m) => typeof m.content === "string" && m.content.startsWith(NOTE_PREFIX)).length, 1)
})

/* ── T-7 重发再败 ── */
test("T-7 剥除 + 重发再败 ⇒ 新错照抛（计数 = 2 ∥ 不二次剥除 ∥ 历史保持已剥除态）", async () => {
  await withServer(
    (req, res, n) => (n === 0 ? send400(res, "image exceeds 5 MB maximum") : send400(res, "second failure marker")),
    async (baseURL, bodies) => {
      const agent = makeAgent([{ role: "user", content: [{ type: "text", text: "t" }, img("AAA")] }])
      agent.provider = { model: "gpt-4o", baseURL, apiKey: "k" }
      await assert.rejects(() => CHAT.callModelTurn(agent, turnCtx()), /second failure marker/, "新错照抛")
      assert.equal(bodies.length, 2, "一次剥除 + 一次重发（不循环）")
      assert.equal(bodyHasImage(bodies[0]), true, "首请求携图（毒图在飞）")
      assert.equal(bodyHasImage(bodies[1]), false, "重发请求体无 image part")
      assert.equal(agent.history.filter(hasImagePart).length, 0, "历史保持已剥除态")
      assert.equal(
        agent.history.filter((m) => typeof m.content === "string" && m.content.startsWith(NOTE_PREFIX)).length,
        1,
        "恰一条注记（不二次剥除）",
      )
    },
  )
})

/* ── T-8 人读线零损 ── */
test("T-8 人读线零损：剥除后 _fullHistory 内 message 对象仍携 image（copy-on-write 真值断言）", () => {
  const msg = { role: "user", content: [{ type: "text", text: "t" }, img("AAA")] }
  const agent = makeAgent([msg]) // _fullHistory 与 history 同对象（pushReal 双写语义）
  const fullBefore = structuredClone(agent._fullHistory)
  const r = HEAL.healImageRejection(agent, img400())
  assert.equal(r.healed, true)
  assert.equal(agent._fullHistory[0], msg, "人读线同对象未被改写")
  assert.equal(agent._fullHistory[0].content[1].type, "image_url", "图仍在场（真值）")
  assert.deepEqual(agent._fullHistory, fullBefore, "人读线逐字不变")
  assert.notEqual(agent.history[0], msg, "机读线为新对象（copy-on-write）")
  assert.equal(agent.history[0].content[1].type, "text")
})

/* ── T-9 capHistoryImages 缺省参零扰 ── */
test("T-9 capHistoryImages 缺省参零扰：占位逐字 = 批前字面", () => {
  const big = "A".repeat(NORM.IMAGE_HISTORY_BYTES_BUDGET + 1)
  const messages = [{
    role: "user",
    content: [{ type: "text", text: "t" }, { type: "image_url", image_url: { url: `data:image/png;base64,${big}` } }],
  }]
  const out = NORM.capHistoryImages(messages)
  assert.equal(out[0].content[1].type, "text")
  assert.equal(out[0].content[1].text, "[image omitted — dropped to keep the request under the history image budget]")
  const small = [{ role: "user", content: [img("AAA")] }]
  assert.equal(NORM.capHistoryImages(small), small, "未触驱逐 ⇒ 原引用返回（缺省零扰）")
})

/* ── T-10 413 首撞 / 复撞 ── */
test("T-10 413 图像词：首撞照抛（streak 自增）∥ 复撞走 T2 自愈", () => {
  const agent = makeAgent([{ role: "user", content: [img("AAA")] }])
  const err413 = new Error("LLM API error 413: request body too large — remove historical images")
  const r1 = HEAL.healImageRejection(agent, err413)
  assert.equal(r1.healed, false, "首撞不触 T1（413 ≠ 400——D-PR32 指引径原样照抛）")
  assert.equal(agent._imageFailStreak, 1, "自增 1")
  assert.equal(hasImagePart(agent.history[0]), true, "首撞零动作（图在场）")
  const r2 = HEAL.healImageRejection(agent, err413)
  assert.equal(r2.healed, true, "复撞（streak ≥ 1）⇒ T2 生效")
  assert.equal(r2.dropped, 1)
})

/* ── W-1 接线（假服务端直驱） ── */
test("W-1 接线：首请求 400 图像语义 + 次 SSE 200 ⇒ 计数 = 2 ∥ 第二请求体无 image part ∥ 回合成功", async () => {
  await withServer(
    (req, res, n) => (n === 0 ? send400(res, "image exceeds 5 MB maximum") : sendSSE(res, "healed ok")),
    async (baseURL, bodies) => {
      const agent = makeAgent([{ role: "user", content: [{ type: "text", text: "look" }, img("AAA")] }])
      agent.provider = { model: "gpt-4o", baseURL, apiKey: "k" }
      const res = await CHAT.callModelTurn(agent, turnCtx())
      assert.equal(res.content, "healed ok", "回合返回成功")
      assert.equal(bodies.length, 2, "请求计数 = 2（一次重发——非重试）")
      assert.equal(bodyHasImage(bodies[0]), true, "首请求携图")
      assert.equal(bodyHasImage(bodies[1]), false, "第二请求体无 image part")
      assert.ok(
        JSON.parse(bodies[1]).messages.some((m) => typeof m.content === "string" && m.content.startsWith(NOTE_PREFIX)),
        "重发体携机读注记（模型知晓图已移除）",
      )
      assert.equal(hasImagePart(agent.history[0]), false, "历史无图（会话已自愈）")
      assert.equal(agent._imageFailStreak, 0, "成功路径清账")
    },
  )
})
