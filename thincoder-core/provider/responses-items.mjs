/** Responses input codec and native replay schema. UI messages are not protocol state. */
import { ProviderError } from "./errors.mjs"
import { wireFunctionIdentity } from "./responses-tools.mjs"
import { responsesProfileBinding, responsesCredentialBinding } from "./capabilities.mjs"

const pick = (item, fields) => Object.fromEntries(fields.filter((k) => item[k] !== undefined).map((k) => [k, structuredClone(item[k])]))
const invalid = (provider, message, param = "input") => new ProviderError(provider, message, { code: "invalid_responses_context", param, stage: "configuration", retryClass: "never" })

function parts(content, role, provider) {
  const list = Array.isArray(content) ? content : [content ?? ""]
  return list.map((part) => {
    if (typeof part === "string") return { type: role === "assistant" ? "output_text" : "input_text", text: part }
    if (["text", "input_text", "output_text"].includes(part?.type) && typeof part.text === "string") {
      return { type: role === "assistant" ? "output_text" : "input_text", text: part.text }
    }
    if (role !== "assistant" && part?.type === "image_url" && typeof part.image_url?.url === "string") {
      return { type: "input_image", image_url: part.image_url.url, ...(part.image_url.detail ? { detail: part.image_url.detail } : {}) }
    }
    if (role !== "assistant" && part?.type === "input_image" && (part.image_url || part.file_id)) return pick(part, ["type", "image_url", "file_id", "detail"])
    if (role !== "assistant" && part?.type === "input_file" && (part.file_data || part.file_id || part.file_url)) return pick(part, ["type", "file_data", "file_id", "file_url", "filename"])
    if (role === "assistant" && part?.type === "refusal" && typeof part.refusal === "string") return { type: "refusal", refusal: part.refusal }
    throw invalid(provider, `Unsupported ${role} content part: ${part?.type ?? typeof part}`)
  })
}

/** All system instructions survive in order; developer messages remain ordered input. */
export function messagesToItems(messages, provider, mapping) {
  const items = []
  const instructions = []
  for (const m of messages ?? []) {
    if (m.role === "system") {
      const text = parts(m.content, "system", provider)
      if (text.some((p) => p.type !== "input_text")) throw invalid(provider, "System instructions must be text")
      instructions.push(text.map((p) => p.text).join("\n"))
    } else if (["user", "developer", "assistant"].includes(m.role)) {
      const content = parts(m.content, m.role, provider)
      if (m.role !== "assistant" || content.some((p) => p.text || p.refusal)) {
        items.push({ role: m.role, content, ...(m.phase ? { phase: m.phase } : {}) })
      }
      for (const tc of m.tool_calls ?? []) {
        const local = tc.function?.name ?? tc.name
        if (typeof local !== "string" || !local || !tc.id) throw invalid(provider, "Historical function call is missing an identity")
        const identity = mapping?.byLocal.get(local) ?? wireFunctionIdentity(provider, local)
        items.push({ type: "function_call", call_id: tc.id, ...identity, arguments: tc.function?.arguments ?? tc.arguments ?? "{}" })
      }
    } else if (m.role === "tool" || m.role === "function") {
      if (typeof m.tool_call_id === "string" && m.tool_call_id.startsWith("web_search_call_")) {
        let parsed
        try { parsed = JSON.parse(m.content) } catch { throw invalid(provider, "Invalid hosted web-search replay item") }
        items.push({ type: "web_search_call", id: parsed.id ?? m.tool_call_id.slice(16), status: "completed", action: { type: "search", query: parsed.query ?? "", sources: parsed.sources ?? [] } })
      } else {
        const callId = m.tool_call_id ?? m.name
        if (!callId) throw invalid(provider, "Tool output is missing call_id")
        items.push({ type: "function_call_output", call_id: callId, output: typeof m.content === "string" ? m.content : JSON.stringify(m.content ?? "") })
      }
    } else throw invalid(provider, `Unsupported message role: ${m.role}`)
  }
  return { items, instructions: instructions.join("\n\n") }
}

/** Explicit input fields only: no response envelopes, usage or output-only status. */
export function replayableItem(item, provider) {
  if (item.type === "reasoning") return pick(item, ["type", "id", "summary", "content", "encrypted_content"])
  if (item.type === "function_call") return pick(item, ["type", "id", "call_id", "name", "namespace", "arguments", "caller"])
  if (item.type === "function_call_output") return pick(item, ["type", "call_id", "output", "name", "namespace", "caller"])
  if (item.type === "web_search_call") return pick(item, ["type", "id", "status", "action"])
  if (item.type === "message" || item.role) {
    if (!["user", "assistant", "developer"].includes(item.role)) throw invalid(provider, "Native replay has an unsupported role")
    const result = pick(item, ["type", "id", "role", "phase"])
    result.content = Array.isArray(item.content) ? item.content.map((p) => {
      if (p?.type === "output_text") return pick(p, ["type", "text", "annotations"])
      if (p?.type === "refusal") return pick(p, ["type", "refusal"])
      return parts([p], item.role, provider)[0]
    }) : parts(item.content, item.role, provider)
    return result
  }
  throw invalid(provider, `Unsupported native replay item: ${item.type}`)
}

export function requestItems(provider, messages, mapping, context) {
  const all = messagesToItems(messages, provider, mapping)
  if (!context) { assertFunctionPairs(all.items, provider); return all }
  if (context.schemaVersion !== 1 || context.profileBinding !== responsesProfileBinding(provider) || context.modelBinding !== provider.model) {
    throw invalid(provider, "Responses replay binding changed; explicitly rebuild context from visible history before switching account or model", "responsesContext")
  }
  if (context.endpointBinding !== undefined && context.endpointBinding !== provider.baseURL.replace(/\/+$/, "")) {
    throw invalid(provider, "Responses endpoint changed; explicitly rebuild context before transferring history", "responsesContext")
  }
  if (context.credentialBinding !== undefined && context.credentialBinding !== responsesCredentialBinding(provider)) {
    throw invalid(provider, "Responses credentials changed; explicitly rebuild context before transferring history", "responsesContext")
  }
  if (!Array.isArray(context.orderedReplayableItems) || !Number.isInteger(context.messageCount) || context.messageCount < 0 || context.messageCount > messages.length) {
    throw invalid(provider, "Responses replay checkpoint is invalid; rebuild context explicitly", "responsesContext")
  }
  const items = [
    ...context.orderedReplayableItems.map((i) => replayableItem(i, provider)),
    ...messagesToItems(messages.slice(context.messageCount), provider, mapping).items,
  ]
  assertFunctionPairs(items, provider)
  return { instructions: all.instructions, items }
}

/** Validate the assembled full replay before stateful transport can select its output suffix. */
export function assertFunctionPairs(items, provider) {
  const seen = new Set(), pending = new Set()
  for (const item of items) {
    if (item.type !== "function_call" && item.type !== "function_call_output") continue
    if (typeof item.call_id !== "string" || !item.call_id) throw invalid(provider, "Function replay is missing call_id; rebuild complete tool exchanges")
    if (item.type === "function_call") {
      if (seen.has(item.call_id)) throw invalid(provider, "Duplicate function call in Responses replay; rebuild complete tool exchanges")
      seen.add(item.call_id); pending.add(item.call_id)
    } else if (!pending.delete(item.call_id)) {
      throw invalid(provider, "Orphaned or duplicate function output in Responses replay; rebuild complete tool exchanges")
    }
  }
  if (pending.size) throw invalid(provider, "Responses replay has unfinished function calls; record every tool output before continuing")
}
