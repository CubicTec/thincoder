/** Reconcile the current local Ultra delegation mode without changing the system prefix. */
import { providerSpec } from "../config.mjs"
import { loadSlot } from "../prompt-files.mjs"
import { isWireReasoningEffort } from "../provider/model-info.mjs"

const PREFIX = "[System reminder: Ultra mode is active."
const TIME_PREFIX = "[System reminder: current time is "
const PROMPT = loadSlot("ultra-mode.md").trim()
const isModeReminder = message => message.role === "user" && typeof message.content === "string" && message.content.startsWith(PREFIX)

/** Tools may be executable objects (setup) or their actual outgoing OpenAI schemas (call). */
function active(agent, depth, tools) {
  if (depth !== 0 || !tools.some(tool => (tool?.name ?? tool?.function?.name) === "subagent")) return false
  const spec = providerSpec(agent.provider)
  return (agent.provider?.reasoningEffort || spec.defaultReasoningEffort) === "ultra"
    && spec.reasoningEffortEnum?.includes("ultra")
    && isWireReasoningEffort(spec.ultraReasoningEffort)
}

/**
 * One live instruction: keep identical active text in place for prefix caching, remove
 * stale/disabled instructions on mode changes and resume, and restore it after compaction.
 * New instructions precede the latest time reminder; existing injection order is unchanged.
 */
export function syncUltraModeReminder(agent, { depth = 0, tools = [] } = {}) {
  const enabled = active(agent, depth, tools)
  if (enabled && !PROMPT) throw new Error("ultra-mode.md missing from the installation — restore prompts/ultra-mode.md before using Ultra")
  const content = enabled ? `${PREFIX}\n${PROMPT}\n]` : null
  const history = agent.history
  let kept = false, changed = false
  for (let i = 0; i < history.length;) {
    const message = history[i]
    if (!isModeReminder(message)) { i++; continue }
    if (!kept && content && message.content === content) { kept = true; i++; continue }
    history.splice(i, 1)
    if (Number.isInteger(agent._runStartHistoryLen) && i < agent._runStartHistoryLen) agent._runStartHistoryLen--
    changed = true
  }
  if (content && !kept) {
    const time = history.findLastIndex(message => message.role === "user" && typeof message.content === "string" && message.content.startsWith(TIME_PREFIX))
    const index = time < 0 ? history.length : time
    history.splice(index, 0, { role: "user", content, transient: true })
    if (Number.isInteger(agent._runStartHistoryLen) && index < agent._runStartHistoryLen) agent._runStartHistoryLen++
    changed = true
  }
  if (changed) {
    agent._lastPromptTokens = null
    agent._usageAtLen = null
  }
  return changed
}
