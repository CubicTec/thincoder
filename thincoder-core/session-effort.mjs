/** Session effort selection, independent of slot loading and persistence. */
// 会话级档位（§6.21 判据句 4）复用 off 形族与当前 provider 规格，不另设族别表。
import { providerSpec } from "./model-specs.mjs"
import { thinkOffShape, thinkOffPath } from "./think-off.mjs"
import { isChatGptProvider } from "./provider/auth-config.mjs"
import { hasFreshModelCatalog } from "./provider/model-info.mjs"

/** 会话档位施加单源：目录就绪后校验；有效非 none 档清除低优先级配置留下的 off 标记。 */
function applySessionEffort(provider, effort) {
  const spec = providerSpec(provider)
  if (effort === "off") {
    if (thinkOffPath(spec)) {
      const shape = thinkOffShape(spec)
      provider.thinking = shape
      if (shape === null) provider.reasoningEffort = "none"
    }
  } else if (spec.reasoningEffortEnum?.includes(effort)) {
    provider.reasoningEffort = effort
    if (effort !== "none" && (provider.thinking === null || provider.thinking?.type === "disabled")) delete provider.thinking
  }
}

const effortBinding = (provider) => JSON.stringify([
  provider?.name, provider?.model, provider?.baseURL, provider?.auth,
  provider?.thinking, provider?.reasoningEffort,
])

/** 成功装载后只消费一次；换会话、模型、账号或用户新改档都不能被旧恢复操作覆盖。 */
export function applyPendingSessionEffort(agent) {
  const pending = agent._pendingSessionEffort
  if (!pending) return
  delete agent._pendingSessionEffort
  if (agent.provider === pending.provider && effortBinding(agent.provider) === pending.binding) {
    applySessionEffort(agent.provider, pending.effort)
  }
}

/** Restore immediately only when model capabilities are ready; otherwise keep this selection pending. */
export function restoreSessionEffort(agent, effort) {
  if (isChatGptProvider(agent.provider) && !hasFreshModelCatalog(agent.provider)) {
    agent._pendingSessionEffort = { provider: agent.provider, binding: effortBinding(agent.provider), effort }
  } else applySessionEffort(agent.provider, effort)
}
