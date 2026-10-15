/**
 * provider/errors.mjs — 错误分类与流规则编译族（2026-09-05 module-split：core.mjs
 * 557 > 500 硬限——parseRetryAfter/isNonRetryableError/betaBaseURL/compileStreamRules
 * verbatim 迁入，语义零变；core.mjs import 回（chat 调用点零改）。
 * 注：retry.mjs（anthropic/google/responses 通道）自 2026-09-08 起导入本文件的
 * parseRetryAfter/isNonRetryableError（ENG-SESSION-PROVIDER-CLEANUP D2.2/D2.4 去重——
 * 单实现；早先的"循环依赖回避"复制已随依赖方向实测消解）。
 */

import { RETRYABLE_STATUS, RATE_LIMIT_BACKOFF_MS } from "./rate.mjs"

/** Parse Retry-After: 秒数 or HTTP-date；上限 300s（会诊 #11）— 异常头不得让 CLI 睡数小时。
 *  header 缺失/非法时退回指数退避表（rateLimitHits 计数取档）。 */
export function parseRetryAfter(header, rateLimitHits = 0) {
  const fallback = RATE_LIMIT_BACKOFF_MS[Math.min(rateLimitHits, RATE_LIMIT_BACKOFF_MS.length - 1)]
  if (header == null) return fallback
  let waitMs = 0
  const numeric = Number(header.trim())
  if (Number.isFinite(numeric) && numeric >= 0) waitMs = numeric * 1000
  else {
    const date = Date.parse(header.trim())
    if (Number.isFinite(date)) waitMs = Math.max(0, date - Date.now())
  }
  if (waitMs <= 0) return fallback
  return Math.min(waitMs, 300_000)
}

/**
 * Detect errors that should NOT be retried — quota, billing, auth, invalid params.
 * Different providers use wildly different error formats. Check body text for known patterns.
 */
export function isNonRetryableError(status, text) {
  // Auth errors: never retry
  if (status === 401 || status === 403) return true
  // 400-level non-429: usually invalid params
  if (status >= 400 && status < 500 && status !== 429 && !RETRYABLE_STATUS.has(status)) return true
  // For 429, check if it's actually a billing/quota error (not rate limit)
  if (status === 429) {
    const lower = text.toLowerCase()
    // Chinese providers often return 429 for billing issues
    if (lower.includes("余额不足") || lower.includes("余额") || lower.includes("充值")) return true
    if (lower.includes("insufficient") && (lower.includes("balance") || lower.includes("quota") || lower.includes("credit"))) return true
    if (lower.includes("quota") && (lower.includes("exceeded") || lower.includes("insufficient"))) return true
    // Standard OpenAI billing error (error.type === "insufficient_quota" or similar)
    try {
      const j = JSON.parse(text)
      const errType = j?.error?.type || ""
      if (typeof errType === "string" && (errType.includes("quota") || errType.includes("billing") || errType.includes("insufficient") || errType.includes("balance"))) return true
      const errCode = j?.error?.code || ""
      if (typeof errCode === "string" && (errCode === "1113" || errCode === "1114")) return true // GLM billing codes
    } catch {}
  }
  return false
}

export function betaBaseURL(baseURL) {
  // DeepSeek prefix continuation uses /beta endpoint; only handle /v1 suffix, append /beta when /v1 is missing
  if (/\/v1$/.test(baseURL)) return baseURL.replace(/\/v1$/, "/beta")
  return baseURL.endsWith("/") ? baseURL + "beta" : baseURL + "/beta"
}

/**
 * Compile stream rules from config format (string patterns) to executable RegExp objects.
 * Rules format: { pattern: "regex source", message: "reminder text", action: "abort"|"warn" }
 */
export function compileStreamRules(rules) {
  if (!rules?.length) return null
  return rules.map((r) => {
    try {
      return { ...r, _regex: new RegExp(r.pattern, r.flags ?? "") }
    } catch {
      // Invalid regex — skip silently so one bad rule doesn't break the whole pipeline
      return null
    }
  }).filter(Boolean)
}

/**
 * Provider-level pre-flight error (MODEL-400-FIX F-1 — 请求体组装前断言): carries the
 * provider identity so a fail-fast throw is readable ("which provider + what to fix")
 * instead of a wire-time serde 400 or a bare message without context.
 */
export class ProviderError extends Error {
  constructor(provider, message, detail = {}) {
    super(`provider "${provider?.name ?? provider?.model ?? "unknown"}": ${redactProviderDetail(String(message))}`)
    this.name = "ProviderError"
    for (const key of ["status", "code", "param", "requestId", "stage", "retryClass", "terminalStatus", "retryable", "errorKind"]) {
      if (detail[key] !== undefined) this[key] = redactProviderDetail(detail[key])
    }
    if (detail.redactedDetail !== undefined) this.redactedDetail = redactProviderDetail(detail.redactedDetail)
  }
}

/**
 * F-1 (MODEL-400-FIX) 根因兜底——请求体组装前断言：渠道裸克隆（`{...渠道}`——渠道条目不携
 * 模型，克隆链未重派生 `.model` 时）provider.model 为 undefined/null——
 * JSON.stringify 会丢 undefined 键 → 无 model 请求 → serde 400。
 * fail-fast 报可读错误（带 provider 名 + 修复线索），不发病体。core.mjs chatImpl openai body 组装
 * 前调用（单行——core.mjs 500 行硬限）。
 * 2026-10-09 清除批（R3）：指引收正——模型身份唯二 = 顶层 `defaultModel` 复合串 ∥ 会话槽选定
 * （渠道单值模型退场，不再作指引）。
 */
export function assertProviderModel(provider) {
  if (!provider.model) {
    throw new ProviderError(provider, "model is undefined — provider cloned without model re-derivation (set the default model (provider:model) or the session slot model)")
  }
}

/**
 * #907-D8：Responses 流内错误码 → 分类（最小集五码）。宿主 = 本文件（分类族单源——与
 * parseRetryAfter / isNonRetryableError 同族）；消费面 = responses.mjs 流内错误出口
 * （response.failed onFailed ∥ type:"error" 帧处置）。HTTP 级分类（isNonRetryableError）
 * 零改——本函数只服务流内错误面。未列码 → null（不发明分类，服务端消息原样透传）。
 * retryable 是信息位：本批不接自动重试（无流内重试消费面），仅供上层展示/上报。
 */
export function classifyResponsesErrorCode(code) {
  switch (code) {
    case "subscription_sharing_usage_limit_exceeded":
      return { kind: "quota", retryable: false, hint: "ChatGPT plan app usage limit reached; check ChatGPT Settings → Usage" }
    case "subscription_sharing_unsupported_capability":
      return { kind: "invalid_request", retryable: false, hint: "Remove the unsupported parameter or capability" }
    case "subscription_sharing_user_not_eligible":
    case "subscription_sharing_route_not_supported":
    case "chatpass_v2_scope_not_authorized":
    case "chatpass_v2_invalid_authorization_context":
      return { kind: "permission", retryable: false, hint: null }
    case "subscription_sharing_invalid_user":
      return { kind: "authentication", retryable: false, hint: null }
    case "subscription_sharing_usage_unavailable":
    case "subscription_sharing_user_unavailable":
      return { kind: "server", retryable: true, hint: null }
    case "context_length_exceeded":
      return { kind: "context_overflow", retryable: false, hint: "上下文超限——/compact 压缩历史后重试" }
    case "insufficient_quota":
      return { kind: "quota", retryable: false, hint: "配额/计费不足——检查 provider 余额或套餐额度" }
    case "invalid_prompt":
      return { kind: "invalid_request", retryable: false, hint: null }
    case "server_is_overloaded":
    case "server_error":
      return { kind: "server", retryable: true, hint: null }
    default:
      return null
  }
}

/** Keep diagnostics useful without propagating credentials from upstream error echoes. */
export function redactProviderDetail(value, depth = 0) {
  if (depth > 5) return "[truncated]"
  if (typeof value === "string") return value.slice(0, 8192)
    .replace(/Bearer\s+[^\s"'<>]+/gi, "Bearer [redacted]")
    .replace(/([?&](?:code|id_token_hint|state)=)[^&\s"\']+/gi, "$1[redacted]")
    .replace(/\bsk-[A-Za-z0-9_-]+/g, "[redacted]")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[redacted]")
    .replace(/((?:access_token|refresh_token|id_token|code_verifier|client_secret|authorization|cookie|api[_-]?key)["']?\s*[:=]\s*["']?)[^\s"'&,}]+/gi, "$1[redacted]")
  if (Array.isArray(value)) return value.slice(0, 30).map((v) => redactProviderDetail(v, depth + 1))
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).slice(0, 40).map(([k, v]) => [k,
    /^(?:access_token|refresh_token|id_token|code|code_verifier|client_secret|authorization|cookie|api[_-]?key)$/i.test(k) && k !== "code"
      ? "[redacted]" : redactProviderDetail(v, depth + 1),
  ]))
  return value
}

/** HTTP and SSE use the same structured diagnostics; diagnostic detail is never a code. */
export function responsesError(provider, payload, { status, requestId, stage = "admission", terminalStatus } = {}) {
  let parsed = payload
  if (typeof payload === "string") { try { parsed = JSON.parse(payload) } catch { parsed = { detail: payload } } }
  const raw = parsed?.error ?? parsed ?? {}
  const code = typeof raw.code === "string" ? raw.code : undefined
  const cls = classifyResponsesErrorCode(code)
  const message = raw.message ?? raw.detail ?? parsed?.detail ?? `Responses request failed${status ? ` (${status})` : ""}`
  const unavailable = ["subscription_sharing_usage_unavailable", "subscription_sharing_user_unavailable"].includes(code)
  const planStop = code?.startsWith("subscription_sharing_") || code?.startsWith("chatpass_v2_")
  const retryable = stage === "admission" && (unavailable || (!planStop && (status === 503 || status === 429)))
    && !isNonRetryableError(status, typeof payload === "string" ? payload : JSON.stringify(parsed))
  return new ProviderError(provider, `${typeof message === "string" ? message : JSON.stringify(message)}${cls?.hint ? `（${cls.hint}）` : ""}`, {
    status, code, param: raw.param, requestId, stage, terminalStatus,
    errorKind: cls?.kind, retryable,
    retryClass: retryable ? "bounded_backoff" : stage === "transport" ? "manual_retry" : "never",
    redactedDetail: parsed,
  })
}

/** Auxiliary consumers may commit derived state only from a completed, usable response.
 * Main conversation display intentionally does not call this: partial text stays visible. */
export function requireCompletedResponse(provider, response, purpose = "auxiliary", { allowToolCalls = false } = {}) {
  const incomplete = !response || response.partial || response.interrupted || response.error
    || (provider?.format === "responses" && response.terminalStatus !== "completed")
    || (!allowToolCalls && response.toolCalls?.length)
  if (!incomplete) return response
  if (response?.error instanceof Error) throw response.error
  throw new ProviderError(provider, `${purpose} did not produce a completed response; derived state was not changed`, {
    code: "incomplete_auxiliary_response", stage: purpose, terminalStatus: response?.terminalStatus ?? "incomplete",
    retryClass: "manual_retry", retryable: false,
  })
}
