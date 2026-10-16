/** Responses request codec and stateful compatibility policy.
 * SIWC policy comes from authentication, never merely the destination hostname.
 * Native replay lives in explicit request context; ordinary history remains the UI source.
 * Existing API-key host chain behavior is retained behind narrow recovery rules.
 */
import { createHash } from "node:crypto"
import { providerSpec, isBailianHost } from "../config.mjs"
import { thinkOffPath } from "../think-off.mjs"
import { isChatGPTProvider, responsesProfileBinding, validateResponsesConfig, validateResponsesBody } from "./capabilities.mjs"
import { resolveProviderSecrets } from "../env-ref.mjs"
import { buildResponsesTools, encodeToolChoice } from "./responses-tools.mjs"
import { requestItems } from "./responses-items.mjs"

/** 白名单：已实证 previous_response_id 的官方端（2026-08-31 真机验证：
 *  百炼 store:true 全链路 ✅；GLM（open.bigmodel.cn/api/v1）store:true 全链路 ✅）。 */
function isStatefulHost(baseURL) {
  try {
    const host = new URL(baseURL).hostname
    return /(^|\.)openai\.com$/.test(host) || isBailianHost(baseURL) || /(^|\.)bigmodel\.cn$/.test(host)
  } catch {
    return false
  }
}

/** store 必开 host（链保留依赖 store:true——真机：百炼 store:false → 链 400；GLM 同）。
 *  OpenAI 官方 store:false 链仍可用，不在内。 */
export function isStoreRequiredHost(baseURL) {
  try {
    const host = new URL(baseURL).hostname
    return isBailianHost(baseURL) || /(^|\.)bigmodel\.cn$/.test(host)
  } catch {
    return false
  }
}

/** 灰名单：格式完整但链未证实/不支持——显式全量 + 一次性 warning（不靠服务端报错）。
 *  2026-08-31 真机后仅剩 DeepSeek（官方明确 previous_response_id 不支持且参数静默忽略）。 */
function isNonStatefulHost(baseURL) {
  try {
    const host = new URL(baseURL).hostname
    return /(^|\.)deepseek\.com$/.test(host)
  } catch {
    return false
  }
}

/** 链 key：system 部分 + 最后一条 user 消息（turn 内不变、跨 turn 变、压缩后变）。 */
function chainKey(messages) {
  const instructions = (messages ?? []).filter((m) => m.role === "system" || m.role === "developer")
  const lastUser = (messages ?? []).findLast((m) => m.role === "user")
  return createHash("sha256").update(JSON.stringify({ instructions, lastUser })).digest("hex")
}

/** Compare the actual replay prefix, not just the last user turn. Display history omits
 * output IDs/annotations and opaque reasoning; none of those may manufacture new input. */
export function chainReplayItems(items) {
  return items.filter((item) => item.type !== "reasoning").map((item) => {
    if (item.type === "message" || item.role) return { role: item.role, content: item.content.map((part) => {
      const { annotations, ...content } = part
      return content
    }) }
    const { id, status, ...content } = item
    return content
  })
}
const replayDigest = (items) => createHash("sha256").update(JSON.stringify(items)).digest("hex")
export function chainReplayCheckpoint(items) {
  const replay = chainReplayItems(items)
  return { replayCount: replay.length, replayDigest: replayDigest(replay) }
}

/** 内置工具声明（2026-08-31 用户拍板"内置工具还是要用"，一期 web_search）。
 *  按 host 映射默认集；provider.builtinTools === false 关闭、数组显式覆盖。
 *  注意：内置工具由**服务端执行**——绕过我们的工具权限门/审计（产品决策，用户拍板）。 */
export function builtinToolsFor(baseURL, providerBuiltin) {
  if (providerBuiltin === false) return []
  if (Array.isArray(providerBuiltin)) return providerBuiltin
  try {
    const host = new URL(baseURL).hostname
    if (/(^|\.)openai\.com$/.test(host) || isBailianHost(baseURL) || /(^|\.)deepseek\.com$/.test(host)) {
      return [{ type: "web_search" }]
    }
  } catch { /* fallthrough */ }
  return []
}

/** Responses usage → 内部 cache 字段形状。 */
export function normalizeUsage(usage) {
  if (!usage) return null
  return {
    ...structuredClone(usage),
    prompt_tokens: usage.input_tokens ?? 0,
    reasoning_tokens: usage.output_tokens_details?.reasoning_tokens ?? 0,
    completion_tokens: usage.output_tokens ?? 0,
    total_tokens: usage.total_tokens ?? (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0),
    prompt_cache_hit_tokens: usage.input_tokens_details?.cached_tokens ?? 0,
    prompt_cache_miss_tokens: Math.max(0, (usage.input_tokens ?? 0) - (usage.input_tokens_details?.cached_tokens ?? 0)),
  }
}

/**
 * 组装请求体 + 链状态机决策。
 * @returns {{ body, previousResponseId, warnings, newChain: {id,key}|null }}
 */
export function buildBody(provider, messages, tools, opts = {}) {
  validateResponsesConfig(provider, opts)
  const siwc = isChatGPTProvider(provider)
  const toolMapping = buildResponsesTools(provider, tools)
  const { instructions: extracted, items } = requestItems(provider, messages, toolMapping, opts.responsesContext)
  const toolsFlat = toolMapping.tools.length ? toolMapping.tools : undefined
  const spec = providerSpec(provider)
  const warnings = []
  const wantStateful = !siwc && provider.stateful !== false && opts.stateful !== false
  const hostStateful = isStatefulHost(provider.baseURL)
  const hostNonStateful = isNonStatefulHost(provider.baseURL)

  let chain = provider._responsesChain ?? null
  const resolved = resolveProviderSecrets(provider)
  // Hash credentials/header routing rather than retaining their plaintext in chain state.
  const key = replayDigest({ model: provider.model, turn: chainKey(messages),
    endpoint: provider.baseURL.replace(/\/+$/, ""), binding: responsesProfileBinding(provider),
    apiKey: resolved.apiKey, headers: resolved.headers })

  if (!wantStateful) {
    chain = null // stateful:false 显式覆盖：残留链（同 session 开过）必须作废
  } else if (hostNonStateful && !opts.forceStateful) {
    // 灰名单：链不支持/未证实（DeepSeek 静默忽略 → 无声丢上下文）——显式全量 + 一次警告
    if (wantStateful) {
      warnings.push({ name: "responses-stateful-unsupported", message: "endpoint 未实证支持 previous_response_id；已发送全量上下文（可 provider.stateful=false 关闭此消息）" })
    }
    chain = null
  } else if (chain && chain.key !== key) {
    chain = null // 跨 turn/压缩/换模型：链失效，全量重建
  } else if (chain && !hostStateful && !opts.forceStateful) {
    chain = null // 非白名单 host 且无显式 forceStateful：不冒险开链
  }
  // 2026-08-31 真机冒烟：百炼/GLM 开链 = 云端留存 7 天——首次知情警告（不刷屏）
  if (wantStateful && hostStateful && isStoreRequiredHost(provider.baseURL) && !provider._responsesStoreWarned) {
    provider._responsesStoreWarned = true
    warnings.push({ name: "responses-store-retention", message: "链生效需要 store:true——对话将在云端留存 7 天（provider.stateful=false 可退出）" })
  }

  const body = {
    model: provider.model,
    input: items, // 占位：chain 有效时下方替换为增量
    stream: true,
    // 2026-08-31 真机冒烟实锤：百炼/GLM 链要求 R1 store:true（store:false → 链 400
    // Not found）；OpenAI 官方 store:false 链仍可用。开链时 = 对话在云端留存 7 天
    // （警告上报）；灰名单全量 store:false。
    store: wantStateful && hostStateful && isStoreRequiredHost(provider.baseURL),
    ...(extracted ? { instructions: extracted } : {}),
    ...(toolsFlat ? { tools: toolsFlat } : {}),
    // 显式才发（#907-D5）：仅 provider.maxTokens 显式设定时发送——spec.maxOutput 是规格侧
    // 保守猜测非渠道合同值，恒发 = 渠道口径漂移 400 风险；无显式值 ⇒ 服务端默认（模型上限兜底）。
    ...(provider.maxTokens != null ? { max_output_tokens: provider.maxTokens } : {}),
  }
  // 内置工具声明追加（2026-08-31 用户拍板）：web_search 与本地 function 工具共存
  const builtin = siwc ? [] : builtinToolsFor(provider.baseURL, provider.builtinTools)
  if (builtin.length) body.tools = [...(toolsFlat ?? []), ...builtin]
  if (provider.temperature != null) {
    let t = provider.temperature
    if (spec.tempRange) {
      t = Math.min(spec.tempRange[1], Math.max(spec.tempRange[0], t))
      t = Math.round(t * 100) / 100 // 与 core.mjs 同语义（round3 #7）
    }
    body.temperature = t
  }
  // 账户目录与 API 规格共用 providerSpec；显式档位优先，未设置才取模型默认。
  // effort 族的 off 必须编码为 none，不能只删字段而让服务端继续默认思考。
  let effort = provider.reasoningEffort || spec.defaultReasoningEffort
  if (spec.thinkApi === "effort" && provider.thinking === null && provider.reasoningEffort == null) {
    if (!thinkOffPath(spec)) throw new Error(`Model "${provider.model}" does not support disabling reasoning`)
    effort = "none"
  }
  if (effort && spec.reasoningEffortEnum && !spec.reasoningEffortEnum.includes(effort)) {
    throw new Error(`Model "${provider.model}" does not support reasoning effort "${effort}"; choose ${spec.reasoningEffortEnum.join("|")}`)
  }
  if (effort) body.reasoning = { effort }
  if (opts.toolChoice !== undefined) body.tool_choice = encodeToolChoice(opts.toolChoice, toolMapping, provider)
  if (opts.parallelToolCalls !== undefined) body.parallel_tool_calls = opts.parallelToolCalls
  if (siwc || new URL(provider.baseURL).hostname === "api.openai.com") body.include = ["reasoning.encrypted_content"]

  // 链模式：turn 内增量 = 上一链轮未发送的 function_call_output（工具结果）。
  // 注意：assistant 的 function_call item 与服务端链输出重复（服务端自动含上轮 output），
  // 增量只发工具结果即可；新 user 消息/压缩/换模型已由 chainKey 挡掉 → 全量。
  const outputs = items.filter((i) => i.type === "function_call_output")
  let previousResponseId = null
  if (chain && chain.id) {
    const replay = chainReplayItems(items)
    const suffix = replay.slice(chain.replayCount)
    if (!Number.isInteger(chain.replayCount) || chain.replayCount < 0
      || replayDigest(replay.slice(0, chain.replayCount)) !== chain.replayDigest
      || !suffix.length || suffix.some((item) => item.type !== "function_call_output")) {
      chain = null // Changed history or intervening instructions require complete replay.
    } else {
      body.input = suffix
      previousResponseId = chain.id
    }
  } else {
    body.input = items
  }

  const newChain = chain
    ? { ...chain, key, outputSent: outputs.length }
    : (wantStateful && (hostStateful || opts.forceStateful) ? { id: null, key, outputSent: outputs.length } : null)

  validateResponsesBody(provider, body)
  return { body, previousResponseId, warnings, newChain, toolMapping, fullInput: items }
}
