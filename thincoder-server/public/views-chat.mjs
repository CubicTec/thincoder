/**
 * views-chat.mjs — 管理·对话（webui/WEBUI.md §2.10——`#/admin/chat`；机制全文 = agent/ADMIN-AGENT.md §11）：
 * 会话条（会话列表 + 「新会话」钮——空/加载/失败三态）∥ 对话区（消息流四形：用户气泡（核 `mdInline`）∥
 * 助手文本（核 `md`）∥ 工具卡（核件 `renderToolCard`/`finishToolCard`——名 + 参数摘要 → 结果摘要；失败判据 = 核
 * `isToolFailure`）∥ notice 行（灰条））∥ 输入区（多行输入 + 发送钮；空值不提交 ∥ 在途禁用 + 运行中指示）。
 * 非壳页（对话流无上界——`SHELL_PAGES` 五路径不动——§2.10）。
 *
 * 呈现面复用渲染核（console-chat-align 批——KD-SV-101）：文本面 = `md.mjs` **单源**（注入点 = `paintMarkdown` 单点）；
 * 流式 = `flow/stream.mjs` `createStreamRenderer`（rAF 节流 + 增量画件——本页零自持重渲）；工具卡 = `flow/tool-card.mjs`；
 * 滚动 = `scroll.mjs` `applyPin`/`createPinWatch`（闸门 = 上滚不夺位 ∥ 回底恢复跟随）；核件词面 = `setStrings` 装订。
 *
 * 取数 = `GET /api/admin/agent/chats` ∥ `.../:id`（读时读——进页取列表 ∥ 选中取详情）；发送 = `POST .../:id/messages`
 * ——**流式读取不走 `ctx.api`**（页面自持 `fetch` + `ReadableStream` 逐行读 NDJSON：`delta` 追加当前气泡 ∥ `call`/`result`
 * 工具卡 ∥ `end` ⇒ 重读详情〔读时单源——与流式视图收口，两径共用核件〕）；断连/离页 = 读流中止（回合照跑——落库单源；
 * 「重读」即全量）；发送失败/流前错误 = 就地人话（`mapError`）。判权全在后端（界面显隐非判据——§3）；文案经 `t()` 取值（§2.2）。
 * 批内件直测面 = `renderChat` + 纯函数（`splitLines`/`parseFrame`/`argsText`/`noticeText`）。
 */
import { mapError, t, langTag } from "./i18n.mjs"
import { openModal, showNote } from "./modal.mjs"
import { deriveModels } from "./views-models.mjs"
import { md, mdInline } from "/rc/md.mjs"
import { renderToolCard, finishToolCard, renderToolHistory } from "/rc/flow/tool-card.mjs"
import { isToolFailure } from "/rc/lib.mjs"
import { createStreamRenderer } from "/rc/flow/stream.mjs"
import { applyPin, createPinWatch } from "/rc/scroll.mjs"
import { setStrings } from "/rc/i18n.mjs"
import { ZH_CORE } from "./i18n-zh-core.mjs"
import { EN_CORE } from "./i18n-en-core.mjs"

/** 重渲代际（重渲 ⇒ 在途读流中止）+ 挂载点卫（离页 ＝ 路由卸载——`mount.isConnected === false`）——零全局清理钩子；
 *  沿 `views-sandbox.mjs` 先例（回合照跑——落库单源）。 */
let renderGeneration = 0

/** 跟底旗标宿主键（核 `createPinWatch` 读写面——本页私有；缺省 = 跟底）。 */
const PIN_FLAG = "_chatFollowPin"

/** 核件词面部件（当前语言别持——门面同源档；`langTag()` ⇒ `zh-CN` ∥ `en`）。 */
const coreStrings = () => (langTag() === "en" ? EN_CORE : ZH_CORE)

// ── 纯函数（批内件直测）────────────────────────────────────────────────────

/** NDJSON 行切分（流式读取帧切面）：`buffer + chunk` ⇒ 完整行 + 残行（不足一行留待下一块——末帧无换行由调用方再切一次）。 */
export function splitLines(buffer, chunk) {
  const parts = `${buffer}${chunk}`.split("\n")
  const rest = parts.pop() ?? ""
  return { lines: parts.filter((line) => line.trim() !== ""), rest }
}

/** 帧解析（坏行/非对象 ⇒ `null`——调用方跳过：零未押异常）。 */
export function parseFrame(line) {
  let frame = null
  try { frame = JSON.parse(String(line)) } catch { return null }
  return frame !== null && typeof frame === "object" && typeof frame.type === "string" ? frame : null
}

/** 工具参数摘要取读（两形兼容）：流帧 `args` 恒字符串（§11）∥ 存量对象形 ⇒ JSON 串；空 ⇒ 空串。 */
export function argsText(args) {
  if (typeof args === "string") return args
  if (args === null || args === undefined) return ""
  try { return JSON.stringify(args) } catch { return String(args) }
}

/** notice 行四形（§2.10）：`data.reason` **精确值**判定（契约枚举 = `restart` ∥ `budget` ∥ `model_error` ∥ `empty_turn`——§11/API §2.8）
 *  ⇒ 表键 ∥ 未命中（含人话句）⇒ 服务端原文兜底（零信息丢；档面零 CJK——文案全入两表）；子串匹配会误吞未来新值，故严格判值。 */
const NOTICE_KEYS = {
  restart: "admin.chat.noticeInterrupted",
  budget: "admin.chat.noticeBudget",
  model_error: "admin.chat.noticeModelError",
  empty_turn: "admin.chat.noticeEmpty",
}

/** notice 行文案（纯函数——批内件直测）。 */
export function noticeText(message) {
  const reason = typeof message?.data?.reason === "string" ? message.data.reason : ""
  const key = NOTICE_KEYS[reason]
  if (key !== undefined) return t(key)
  const content = String(message?.content ?? "")
  return content === "" ? "—" : content
}

// ── 呈现面（核件接线——渲染单源；本页零自持渲染实现）─────────────────────────

/** 文本面注入点（**全页唯一** `innerHTML` 写口）：核 `md`/`mdInline` 产物已全量转义，真值自服务端来。 */
function paintMarkdown(node, html) {
  node.innerHTML = html
  return node
}

/** 工具结果文案（核件入参单点——**失败判据 = 核 `isToolFailure`** 单源：本页零自持判据）。
 *  服务端结构化失败位（`ok:false`——§12「错误 ⇒ `ok:false` + 人话 message」）在文本面无判形（人话 message 不携
 *  `Error:` 头 ∥ 状态位行）⇒ 判据不命中的失败立核判据头（核件红面 ∥ 自动展开的唯一入口；呈现零自持）。 */
function resultText(summary, ok) {
  const text = String(summary ?? "")
  return ok === false && !isToolFailure(text) ? `Error: ${text}` : text
}

/** 消息节点（四形——§2.10）：user 气泡（核 `mdInline`）∥ assistant 文本（核 `md`）∥ tool 卡（核件回读径）∥ notice 灰条；
 *  空助手文本 ⇒ 零节点（§11 部分文本口径）。 */
function messageNode(ctx, message) {
  const { h } = ctx
  const content = String(message?.content ?? "")
  if (message?.role === "user") return paintMarkdown(h("div", { class: "chat-msg user" }), mdInline(content))
  if (message?.role === "assistant") return content === "" ? null : paintMarkdown(h("div", { class: "chat-msg assistant" }), md(content))
  if (message?.role === "tool") {
    const data = message.data ?? {}
    return renderToolHistory(String(data.name ?? ""), resultText(data.summary, data.ok))
  }
  if (message?.role === "notice") return h("div", { class: "chat-msg notice", text: noticeText(message) })
  return h("div", { class: "chat-msg", text: content }) // 枚举外 role 兜底（防御——服务端 CHECK 四值）
}

/** 新会话弹窗（模型下拉 = `deriveModels` 同源；缺省 = 最近一条会话所用模型——KD-SV-87「最近一次成功所用」的**列表面读法**
 *  （会话行无逐轮成功位：取倒序首行〔最近〕所用模型为近似，实施当刻数据面无更近读源；未在列表 ⇒ 空选）∥ 无模型/未选 ⇒ 提交门）；
 *  提交 ⇒ 建会话 ⇒ 选中新会话；败 ⇒ 窗内人话。 */
function openNewChatModal(ctx, { chats, created }) {
  const { h } = ctx
  const select = h("select", {}, h("option", { value: "", text: t("admin.chat.modelPick") }))
  const note = h("p", { class: "hint error", hidden: true })
  const submitBtn = h("button", { type: "submit", text: t("admin.chat.create") })
  const modal = openModal({
    title: t("admin.chat.newChat"),
    body: h("div", {},
      h("form", { class: "provider-form stacked", novalidate: true, onsubmit: submit },
        h("label", {}, h("span", { text: t("admin.chat.modelLabel") }), select),
        h("p", { class: "hint", text: t("admin.chat.newChatHint") }),
        note, submitBtn)),
  })
  // 模型下拉源（provider 注册表展平——零新端点）；空/失败 ⇒ 提示项 + 提交门（前端先行）
  ctx.api("/api/admin/providers").then((data) => {
    const models = deriveModels(data?.providers ?? [])
    select.replaceChildren(...(models.length === 0
      ? [h("option", { value: "", text: t("admin.chat.noModels") })]
      : [h("option", { value: "", text: t("admin.chat.modelPick") }), ...models.map((row) => h("option", { value: row.id, text: row.id }))]))
    const preferred = String(chats?.[0]?.model ?? "")
    if (preferred !== "" && models.some((row) => row.id === preferred)) select.value = preferred
  }).catch(() => select.replaceChildren(h("option", { value: "", text: t("admin.chat.noModels") })))

  async function submit(event) {
    event.preventDefault()
    note.hidden = true
    const model = select.value
    if (model === "") return showNote(note, t("admin.chat.modelRequired")) // 提交门（空选不提交）
    submitBtn.disabled = true
    try {
      const data = await ctx.api("/api/admin/agent/chats", { method: "POST", body: { model } })
      modal.close()
      await created(data?.chat)
    } catch (error) {
      submitBtn.disabled = false
      showNote(note, mapError(error))
    }
  }
}

// ── 页面 ────────────────────────────────────────────────────────────────────

/** 管理·对话页（非壳页——§2.10；沿视图档先例：先建壳，后异步取数）。 */
export async function renderChat(ctx, mount) {
  const { h } = ctx
  const generation = ++renderGeneration
  setStrings(coreStrings()) // 核件词面装订（装配期 ∥ 语言切换重挂本页 ⇒ 重注册——核 i18n 模块级态）
  let chats = []
  let activeId = null
  let detail = null
  let busy = false
  let liveAssistant = null
  let liveRaw = ""
  let liveTools = new Map()
  let emptyShown = false

  mount.append(h("h2", { text: t("admin.chat.title") }))

  // ── 会话条（会话列表 + 「新会话」钮）────────────────────────────────────────
  const listBox = h("div", { class: "chat-list" }, h("p", { class: "hint", text: t("common.loading") }))
  const chatsCard = h("section", { class: "card" },
    h("div", { class: "toolbar" },
      h("h3", { text: t("admin.chat.chatsTitle") }),
      h("button", { type: "button", text: t("admin.chat.newChat"), onclick: () => openNewChatModal(ctx, { chats, created }) })),
    listBox)

  // ── 对话区（消息流 + 「重读」）─────────────────────────────────────────────
  const threadTitle = h("h3", { text: t("admin.chat.title") })
  const rereadBtn = h("button", { type: "button", class: "tiny", text: t("admin.chat.reread"), disabled: true, onclick: () => { if (activeId !== null) loadDetail(activeId) } })
  const threadBox = h("div", { class: "chat-thread" }, h("p", { class: "hint", text: t("admin.chat.noChatSelected") }))
  const threadCard = h("section", { class: "card" }, h("div", { class: "toolbar" }, threadTitle, rereadBtn), threadBox)

  // ── 输入区（多行输入 + 发送钮；空值不提交 ∥ 在途禁用）───────────────────────
  const input = h("textarea", { rows: "3", placeholder: t("admin.chat.inputPh") })
  const sendBtn = h("button", { type: "submit", text: t("admin.chat.send") })
  const runningHint = h("span", { class: "hint", hidden: true, text: t("admin.chat.running") })
  const note = h("p", { class: "hint error", hidden: true })
  const form = h("form", { class: "chat-form", novalidate: true, onsubmit: submit },
    input,
    h("div", { class: "info-actions" }, sendBtn, runningHint, h("span", { class: "hint", text: t("admin.chat.inputHint") })),
    note)
  mount.append(chatsCard, threadCard, h("section", { class: "card" }, form))

  /** 输入区态（在途 ⇒ 发送钮禁用 + 运行中指示；无选中会话 ⇒ 禁发）。 */
  function renderCompose() {
    const running = busy || detail?.chat?.status === "running"
    sendBtn.disabled = running || activeId === null
    runningHint.hidden = !running
  }

  // ── 滚动（核件单源：`applyPin` 写口 ∥ `createPinWatch` 旗标维护——上滚不夺位）──
  threadBox[PIN_FLAG] = true // 缺省跟底（直写模式——对话流现行语义）
  createPinWatch(threadBox, { flagKey: PIN_FLAG }).attach() // 近底 ⇒ 翻真（自愈）；上滚 ⇒ 翻假（本页零滚动自持实现）

  /** 跟底写（旗标门——上滚阅读期间零写；核写口）。 */
  function followPinned() { applyPin(threadBox, threadBox[PIN_FLAG]) }

  /** 显式回底（选中会话 ∥ 重读——重 pin；核写口）。 */
  function pinBottom() { threadBox[PIN_FLAG] = true; applyPin(threadBox, true) }

  /** 流式重渲器（核 `createStreamRenderer` 单源）：`token()` 帧内现取气泡指针（无气泡 ⇒ null）；
   *  帧尾 = 旗标门跟底。本页零自持重渲（禁每帧全量 `md`/整面 `innerHTML`）。 */
  const streamRenderer = createStreamRenderer({
    token: () => (liveAssistant === null ? null : { el: liveAssistant, raw: liveRaw }),
    frameEnd: () => followPinned(),
  })

  /** 会话条重渲（活动态高亮——行 = 模型 ∥ 摘要 ∥ 时间；在途徽标）。 */
  function renderList() {
    if (chats.length === 0) { listBox.replaceChildren(h("p", { class: "hint", text: t("admin.chat.chatsEmpty") })); return }
    listBox.replaceChildren(...chats.map((row) => h("button", {
      type: "button", class: row.id === activeId ? "chat-row tiny active" : "chat-row tiny", onclick: () => selectChat(row.id),
    },
      h("span", { class: "pick-head" }, h("span", { text: String(row.model ?? "") }), row.status === "running" ? h("span", { class: "badge", text: t("admin.chat.statusRunning") }) : null),
      h("span", { class: "hint", text: String(row.excerpt ?? "") === "" ? "—" : String(row.excerpt) }),
      h("span", { class: "hint", text: ctx.fmtTs(row.updatedAt) }))))
  }

  /** 选中会话（列表高亮 + 取详情——读时读）。 */
  function selectChat(chatId) {
    activeId = chatId
    detail = null
    renderList()
    renderCompose()
    loadDetail(chatId)
  }

  /** 对话区重渲（读时单源——`end` ⇒ 重读即此；流式视图随重读丢弃）。 */
  function renderThread() {
    liveAssistant = null
    liveRaw = ""
    liveTools = new Map()
    emptyShown = false
    threadTitle.textContent = String(detail?.chat?.model ?? t("admin.chat.title"))
    rereadBtn.disabled = activeId === null
    const messages = Array.isArray(detail?.messages) ? detail.messages : []
    if (messages.length === 0) {
      emptyShown = true
      threadBox.replaceChildren(h("p", { class: "hint", text: t("admin.chat.threadEmpty") }))
      return
    }
    threadBox.replaceChildren(...messages.map((message) => messageNode(ctx, message)).filter((node) => node !== null))
    pinBottom() // 重读径照旧：回底（显式动作——核写口）
  }

  /** 流式行入列（`end` ⇒ 重读整段替代——读时单源；空态提示随首行让位）。 */
  function appendLive(node) {
    if (emptyShown) { threadBox.replaceChildren(node); emptyShown = false } else threadBox.append(node)
    followPinned()
  }

  /** `delta` 帧（核流式画件——增量重渲 + 帧尾跟底；气泡行随首块建）。 */
  function appendDelta(text) {
    if (liveAssistant === null) {
      liveAssistant = h("div", { class: "chat-msg assistant" })
      liveRaw = ""
      appendLive(liveAssistant)
    }
    liveRaw += String(text ?? "")
    streamRenderer.markToken()
  }

  /** `call` 帧（核件建卡——名 + 参数摘要，结果位「执行中…」）。 */
  function appendCall(frame) {
    const name = String(frame.name ?? "")
    const { el, ref } = renderToolCard({ name, args: argsText(frame.args), id: String(frame.id ?? "") })
    liveTools.set(String(frame.id ?? ""), { ref, name })
    appendLive(el)
  }

  /** `result` 帧（核件结算——结果摘要 + 失败判据单源）。 */
  function applyResult(frame) {
    const entry = liveTools.get(String(frame.id ?? ""))
    if (entry === undefined) return
    finishToolCard(entry.ref, entry.name, resultText(frame.summary, frame.ok))
    followPinned()
  }

  /** 帧分发（`end` 帧回传——流后重读触发点；未知帧跳过）。 */
  function applyFrame(frame, ended) {
    if (frame === null) return ended
    if (frame.type === "delta") { appendDelta(frame.text); return ended }
    if (frame.type === "call") { appendCall(frame); return ended }
    if (frame.type === "result") { applyResult(frame); return ended }
    if (frame.type === "end") return frame
    return ended
  }

  /**
   * 发送一条并读流（单 POST + NDJSON 帧流——§11）：`delta` 追加当前气泡 ∥ `call`/`result` 工具卡 ∥ `end` ⇒ 重读详情。
   * 断连/离页 = 读流中止（回合照跑——落库单源）；流前错误（判权/形/在途/不存在/模型不可用）= 统一信封 ⇒ 就地人话。
   * **流归属**：帧只写「本流所向会话 == 当前选中会话」的视图（切走 ⇒ 丢帧不串台）；`end` 重读同卫。
   * 返回 = 回合是否已受理（`true` ⇒ 落库已起——调用方不还原草稿；`false` ⇒ 零副作用）。
   */
  async function streamTurn(chatId, content) {
    let response = null
    try {
      response = await fetch(`/api/admin/agent/chats/${chatId}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content }),
      })
    } catch (error) { showNote(note, mapError(error)); return false }
    if (!response.ok) {
      let payload = null
      try { payload = await response.json() } catch { /* 无 JSON 体 ⇒ 以状态判 */ }
      const error = new Error(payload?.error?.message ?? t("app.httpFailed", { status: response.status }))
      error.status = response.status
      error.code = payload?.error?.code ?? null
      showNote(note, mapError(error))
      if (response.status === 401 && error.code !== "invalid_credentials") ctx.fail(error) // 会话失效 ⇒ 回登录（api 封装同口径）
      return false
    }
    let reader = null
    try { reader = response.body.getReader() } catch { showNote(note, t("admin.chat.streamBroken")); return false } // 200 无流体（角落）⇒ 就地人话
    const decoder = new TextDecoder()
    let buffer = ""
    let ended = null
    /** 帧落地（流归属卫：非当前选中会话 ⇒ 只记 `end`，不写视图）。 */
    const land = (line) => {
      const frame = parseFrame(line)
      if (frame === null) return
      if (frame.type === "end") { ended = frame; return }
      if (activeId === chatId) applyFrame(frame, ended) // 切走 ⇒ 丢帧（视图不串台；落库单源——回来重读即全量）
    }
    try {
      for (;;) {
        if (generation !== renderGeneration || mount.isConnected === false) { // 重渲/离页 ⇒ 读流中止（回合照跑）
          try { await reader.cancel() } catch { /* 已关 */ }
          return true
        }
        const { value, done } = await reader.read()
        if (done) break
        const split = splitLines(buffer, decoder.decode(value, { stream: true }))
        buffer = split.rest
        for (const line of split.lines) land(line)
      }
      for (const line of splitLines(buffer, "").lines) land(line) // 末帧无换行收尾
    } catch {
      streamRenderer.flush() // 断连：已到文本落地（尾帧兜底——已画者零重复）
      showNote(note, t("admin.chat.streamBroken")) // 断连——读流中止（零未押异常；回合已在服务端）
      return true
    }
    streamRenderer.flush() // 回合尾同步尾帧（rAF 未及——重读置换前必须画出）
    if (ended !== null && activeId === chatId) await loadDetail(chatId) // `end` ⇒ 重读（读时单源；切走 ⇒ 不抳——避免把视图换成另一会话）
    return true
  }

  /** 发送（空值不提交——就地必填提示；在途禁用；回合未受理 ⇒ 草稿还原——零丢失，沿弹窗体例）。 */
  async function submit(event) {
    event.preventDefault()
    const content = input.value.trim()
    if (content === "") { showNote(note, t("admin.chat.messageRequired")); return }
    if (activeId === null || sendBtn.disabled) return
    note.hidden = true
    input.value = ""
    busy = true
    renderCompose()
    let accepted = false
    try { accepted = await streamTurn(activeId, content) }
    catch (error) { showNote(note, mapError(error)) } // 未押角落（事件兵底）——就地人话，不吞静默
    finally { busy = false; renderCompose() }
    if (!accepted && input.value === "") input.value = content // 零副作用失败（网络/信封拒）⇒ 还原；流中/断连不还原（落库已起）
  }

  /** 会话详情（读时读——`detail` 单源：消息流 ∥ 工具卡 ∥ notice 皆自此渲染）。 */
  async function loadDetail(chatId) {
    threadBox.replaceChildren(h("p", { class: "hint", text: t("common.loading") }))
    try {
      const data = await ctx.api(`/api/admin/agent/chats/${chatId}`)
      if (generation !== renderGeneration) return
      detail = data
      renderThread()
    } catch (error) {
      if (generation !== renderGeneration) return
      ctx.fail(error)
      threadBox.replaceChildren(h("p", { class: "hint error" }, t("admin.chat.detailFailed"), " ",
        h("button", { type: "button", class: "tiny", text: t("admin.chat.retry"), onclick: () => loadDetail(chatId) })))
    }
    if (generation === renderGeneration) renderCompose()
  }

  /** 会话列表（读时读——进页一次 ∥ 新会话后刷新；倒序由服务端定）。 */
  async function loadChats() {
    try {
      const data = await ctx.api("/api/admin/agent/chats")
      if (generation !== renderGeneration) return
      chats = Array.isArray(data?.chats) ? data.chats : []
      renderList()
    } catch (error) {
      if (generation !== renderGeneration) return
      ctx.fail(error)
      listBox.replaceChildren(h("p", { class: "hint error" }, t("admin.chat.listFailed"), " ",
        h("button", { type: "button", class: "tiny", text: t("admin.chat.retry"), onclick: () => loadChats() })))
    }
  }

  /** 新会话落地（列表刷新 + 选中——`POST` 回执的 `chat`）。 */
  async function created(chat) {
    await loadChats()
    if (chat?.id !== undefined && chat?.id !== null) selectChat(chat.id)
  }

  renderCompose()
  await loadChats()
}
