import { ensureResponsesSession, prepareResponsesContext, stageResponsesReplay } from "../responses-session.mjs"
/**
 * agent/chat-call.mjs — 单回合模型调用（2026-09-29 P2 三拆：agent.mjs runAgent 段 4 逐字迁入 +
 * `streamOutputAllowed` 定义随迁——agent.mjs re-export 保 import 面）。
 * 接口 = callModelTurn(agent, ctx) → response；错误走原样：AbortError-中断分支处理完照旧 `throw e`，
 * 由 runAgent 的 catch/finally 收束。
 */
import { chat } from "../provider/index.mjs"
import { responsesProfileBinding, responsesCredentialBinding } from "../provider/capabilities.mjs"
import { ProviderError } from "../provider/errors.mjs"
import { createHash } from "node:crypto"
import { stripLocalMessageFields } from "../escape.mjs"

const historyDigest = (history) => createHash("sha256").update(JSON.stringify(stripLocalMessageFields(history))).digest("hex")

/** 流式输出门（§2.5 #78 并入——VSC 三态门，纯函数可直驱测试）：depth 0 恒通；
 *  consult 子代理豁免（其输出进会诊面板）；其余经 `streamOutput` 显式选择进入。 */
export function streamOutputAllowed(depth, role, streamOutput = false) {
  return depth === 0 || role === "consult" || streamOutput === true
}

export async function callModelTurn(agent, {
  systemPrompt, toolSchemas, streamOutput, callbacks, signal, streamRuleFired, autoTurn, depth, turn,
}) {
  await ensureResponsesSession(agent, depth)
  const history = agent.history, historyLength = history.length, digest = historyDigest(history)
  const session = agent._sessionStart, journal = agent._responsesStatePath
  const binding = agent.provider?.format === "responses" ? {
    profile: responsesProfileBinding(agent.provider), credential: responsesCredentialBinding(agent.provider),
    model: agent.provider.model, endpoint: agent.provider.baseURL?.replace(/\/+$/, ""), enabled: agent.provider.auth?.enabled,
  } : null
  const assertOwnership = () => {
    if (!binding) return
    if (history !== agent.history || session !== agent._sessionStart || journal !== agent._responsesStatePath
      || digest !== historyDigest(agent.history.slice(0, historyLength))) {
      throw new ProviderError(agent.provider, "Session history changed while Responses was running; the old response was not committed or executed", {
        code: "responses_request_history_changed", stage: "context_boundary", retryClass: "never", retryable: false,
      })
    }
    if (agent.provider?.format !== "responses" || binding.profile !== responsesProfileBinding(agent.provider)
      || binding.model !== agent.provider.model || binding.endpoint !== agent.provider.baseURL?.replace(/\/+$/, "")
      || binding.enabled !== agent.provider.auth?.enabled || binding.credential !== responsesCredentialBinding(agent.provider)) {
      throw new ProviderError(agent.provider, "Provider changed while Responses was running; the old response was not committed or executed", {
        code: "responses_request_binding_changed", stage: "context_boundary", retryClass: "never", retryable: false,
      })
    }
  }
  const messages = [{ role: "system", content: systemPrompt }, ...agent.history]
  let response

  // Auto-think: classify difficulty and set reasoning effort on turn 0; silent on failure.
  if (agent.config?.agent?.autoThink && turn === 0) {
    const { classifyAndApply } = await import("../auto-think.mjs")
    await classifyAndApply(agent, turn).catch(() => {})
  }

  try {
    assertOwnership()
    response = await chat(agent.provider, {
      messages, tools: toolSchemas,
      responsesContext: prepareResponsesContext(agent, messages),
      // §2.5 #78 并入（VSC onToken 三态门）：depth 0 恒通；consult 子代理豁免（其输出进
      // 会诊面板）；escalate 等经 opts.streamOutput 显式选择进入；其余子代理不流式。
      onToken: streamOutputAllowed(depth, agent._role, streamOutput) ? callbacks.onToken : null,
      onReasoning: callbacks.onReasoning,
      onWait: callbacks.onWait,
      signal,
      streamRules: agent.config.agent?.streamRules ?? [],
      firedPatterns: streamRuleFired,
      // LOGGING（LOGGING.md）：llm:* 事件的语义上下文（stage=turn 主循环回合——含
      // digest 消化轮 auto=true；child=子代理 id（spawn 时 stamp 于 child._logId））
      // TRACES.md §6.1 D-TR4：轨迹元数据增补（role/depth/kind/session/cwd——trace-store 只读
      // logCtx，签名不变）；kind：depth>0 = subagent（consult 孩子 = consult）——子代理
      // 对回靠 role+depth+child id（children 无 _sessionStart——不经 depth-0 设置——
      // session 字段对子代理轨迹为 null——见 trace-store/agent.mjs 注释）。
      logCtx: {
        stage: "turn", turn: turn + 1, auto: autoTurn, child: agent._logId,
        role: agent._role ?? null,
        depth,
        kind: depth > 0 ? (agent._role === "consult" ? "consult" : "subagent") : "turn",
        session: agent._sessionStart ?? null,
        cwd: agent.cwd,
        traces: agent.config?.traces?.enabled !== false,
      },
    })
  } catch (e) {
    assertOwnership()
    // User interrupt (Ctrl+I): controller.abort({ interrupt: true, message }).
    // Inject into history; the outer loop recreates the controller and resumes.
    if (e.name === "AbortError" && signal?.reason?.interrupt) {
      const msg = `[User interrupt: ${signal.reason.message}]`
      // Dedup: if already handled during tool execution (interrupt branch below),
      // don't push a duplicate — the outer loop still recreates the controller.
      if (agent.history.at(-1)?.content !== msg) {
        agent.history.push({ role: "user", content: msg })
      }
    }
    throw e
  }

  // Partial/failed/interrupted responses have no replay envelope, but still must
  // belong to this session before turn-loop commits any display text or reminders.
  assertOwnership()
  stageResponsesReplay(agent, response, systemPrompt)
  return response
}
