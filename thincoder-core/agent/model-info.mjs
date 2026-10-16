/** 账户模型信息装载：运行前刷新目录；工具门复用经过宿主过滤的 read_image 候选。 */
import { ensureProviderModelInfo } from "../provider/list-models.mjs"
import { modelInfoFor } from "../provider/model-info.mjs"
import { providerSpec } from "../model-specs.mjs"
import { applyPendingSessionEffort } from "../session-lifecycle.mjs"

const effortBinding = (provider) => JSON.stringify([
  provider?.format, provider?.name, provider?.model, provider?.baseURL, provider?.auth,
  provider?.thinking, provider?.reasoningEffort,
])

/** spawn 初始化档来自父运行态或目标渠道预设；目录装载前不判断新模型是否支持。 */
export function markInheritedChildEffort(agent) {
  if (typeof agent.provider?.reasoningEffort !== "string") return
  agent._inheritedChildEffort = { provider: agent.provider, binding: effortBinding(agent.provider) }
}

/** 只消费一次，且只信当前账号对精确模型的声明；后续用户改档继续走请求校验。 */
function applyInheritedChildEffort(agent) {
  const inherited = agent._inheritedChildEffort
  if (!inherited) return
  delete agent._inheritedChildEffort
  if (agent.provider !== inherited.provider || effortBinding(agent.provider) !== inherited.binding) return
  const efforts = modelInfoFor(agent.provider)?.reasoningEffortEnum
  if (Array.isArray(efforts) && !efforts.includes(agent.provider.reasoningEffort)) {
    delete agent.provider.reasoningEffort
  }
}

/** 不重建工具表：只启停装配时已通过 toolsFinalize 的图片工具，保留 MCP 与宿主排除规则。 */
export function syncModelTools(agent) {
  const image = agent._readImageTool
  if (!image) return
  const tools = agent.tools.filter((tool) => tool !== image)
  if (providerSpec(agent.provider).multimodal) tools.push(image)
  agent.tools = tools
}

/** 目录不写配置。异步返回后复核账号和模型，旧请求不能替新会话完成装载。 */
export async function refreshAgentModelInfo(agent, { signal } = {}) {
  const provider = agent.provider
  const binding = () => JSON.stringify([provider?.name, provider?.model, provider?.baseURL, provider?.auth])
  const before = binding()
  await ensureProviderModelInfo(provider, { signal })
  if (agent.provider !== provider || binding() !== before) {
    throw new Error("Model or account changed while loading model information — retry with the selected model")
  }
  applyPendingSessionEffort(agent)
  applyInheritedChildEffort(agent)
  syncModelTools(agent)
}
