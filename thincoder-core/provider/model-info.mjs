/** 账户目录规格：仅保留本客户端能执行的能力字段，进程内快照不写入 provider 配置。 */
import { assertProviderAuthConfig, isChatGptProvider } from "./auth-config.mjs"

const CATALOG_TTL_MS = 60_000
const WIRE_EFFORTS = new Set(["none", "minimal", "low", "medium", "high", "xhigh", "max"])
export const isWireReasoningEffort = (value) => WIRE_EFFORTS.has(value)
const catalogs = new Map() // endpoint + credentialRef → { ts, models: Map<exact slug, spec> }
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value)

/** 缺失字段沿用静态规格；畸形字段不构成能力声明。ultra 保留为客户端模式，另存合法请求档位。 */
export function parseModelInfo(record) {
  if (!object(record)) return undefined
  const spec = {}
  const context = record.context_window == null ? record.max_context_window : record.context_window
  if (Number.isSafeInteger(context) && context > 0) spec.context = context

  const levels = record.supported_reasoning_levels
  if (Array.isArray(levels) && levels.every((level) => object(level) && typeof level.effort === "string")) {
    spec.reasoningEffortEnum = [...new Set(levels.map((level) => level.effort).filter((effort) => WIRE_EFFORTS.has(effort) || effort === "ultra"))]
    if (spec.reasoningEffortEnum.includes("ultra")) {
      // Codex resolve_reasoning_effort_for_model：目录指定 → max → 最后一个普通档 → medium。
      // 不发送 hosted multi_agent；主动委派由本客户端的现有 subagent 工具执行。
      const ordinary = spec.reasoningEffortEnum.filter((effort) => effort !== "ultra")
      spec.ultraReasoningEffort = ordinary.includes(record.multi_agent_reasoning_effort)
        ? record.multi_agent_reasoning_effort : ordinary.includes("max") ? "max" : ordinary.at(-1) ?? "medium"
    }
    spec.thinkApi = "effort"
    spec.thinking = spec.reasoningEffortEnum.some((effort) => effort !== "none")
    if (spec.reasoningEffortEnum.includes(record.default_reasoning_level)) spec.defaultReasoningEffort = record.default_reasoning_level
  }
  if (Array.isArray(record.input_modalities) && record.input_modalities.every((modality) => typeof modality === "string")) {
    spec.multimodal = record.input_modalities.includes("image")
  }
  return Object.keys(spec).length ? spec : undefined
}

function accountKey(provider) {
  if (!isChatGptProvider(provider)) return null
  try { assertProviderAuthConfig(provider) } catch { return null }
  return JSON.stringify([provider.baseURL.replace(/\/+$/, ""), provider.auth.credentialRef])
}

function copySpec(spec) {
  return { ...spec, ...(spec.reasoningEffortEnum ? { reasoningEffortEnum: [...spec.reasoningEffortEnum] } : {}) }
}

/** 成功目录整体替换：删除的模型或字段不能从上次快照残留。调用方使用发起请求时的 provider。 */
export function recordModelCatalog(provider, rows) {
  const key = accountKey(provider)
  if (!key || !Array.isArray(rows)) return
  const models = new Map()
  for (const row of rows) {
    if (typeof row?.slug === "string" && row.slug && object(row.spec) && Object.keys(row.spec).length) models.set(row.slug, copySpec(row.spec))
  }
  catalogs.set(key, { ts: Date.now(), models })
}

/** 同账户、同 endpoint、精确 slug；TTL 只决定是否刷新，最后一次成功信息仍可用于展示。 */
export function modelInfoFor(provider) {
  const key = accountKey(provider)
  const spec = key && catalogs.get(key)?.models.get(provider?.model)
  return spec ? copySpec(spec) : undefined
}

export function hasFreshModelCatalog(provider) {
  const key = accountKey(provider)
  const snapshot = key && catalogs.get(key)
  if (!snapshot) return false
  const age = Date.now() - snapshot.ts
  return age >= 0 && age < CATALOG_TTL_MS
}

export function _clearModelInfoForTest() { catalogs.clear() }
