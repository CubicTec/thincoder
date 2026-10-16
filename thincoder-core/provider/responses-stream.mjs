/** Strict Responses SSE state machine. No executable tool is released before completed. */
import { terminateBody } from "../stream-destroy.mjs"
import { ProviderError, responsesError } from "./errors.mjs"
import { normalizeUsage } from "./responses-request.mjs"
import { replayableItem } from "./responses-items.mjs"
import { resolveResponseTool } from "./responses-tools.mjs"

export const MAX_RESPONSES_FRAME_BYTES = 8 * 1024 * 1024
const protocolError = (message, code = "invalid_responses_stream") => new ProviderError(null, message, {
  code, stage: "stream", retryClass: "manual_retry", retryable: false, terminalStatus: "transport_error",
})

/** Lines are decoded incrementally: chunk boundaries never define frames or characters. */
export async function* responseEvents(body, { signal, onChunk, maxFrameBytes = MAX_RESPONSES_FRAME_BYTES } = {}) {
  if (!body?.[Symbol.asyncIterator] && !body?.[Symbol.iterator]) throw protocolError("Responses body is not a readable stream")
  const decoder = new TextDecoder("utf-8", { fatal: true })
  let pending = "", data = [], event = "", bytes = 0
  const dispatch = () => {
    const value = data.join("\n")
    data = []; bytes = 0
    const header = event; event = ""
    if (!value) return null
    if (value === "[DONE]") return { type: "transport.done" }
    let parsed
    try { parsed = JSON.parse(value) } catch { throw protocolError("Malformed JSON in Responses SSE data") }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw protocolError("Invalid Responses SSE event")
    if (header === "error" && !parsed.type) return { type: "error", error: parsed }
    if (!parsed.type && !header) throw protocolError("Responses SSE event has no type")
    return parsed.type ? parsed : { ...parsed, type: header }
  }
  const line = (value) => {
    bytes += Buffer.byteLength(value) + 1
    if (bytes > maxFrameBytes) throw protocolError("Responses SSE frame exceeds size limit", "responses_frame_too_large")
    if (value === "") return dispatch()
    if (value.startsWith(":")) return null
    const colon = value.indexOf(":")
    const key = colon < 0 ? value : value.slice(0, colon)
    let val = colon < 0 ? "" : value.slice(colon + 1)
    if (val.startsWith(" ")) val = val.slice(1)
    if (key === "data") data.push(val)
    if (key === "event") event = val
    return null
  }
  for await (const chunk of body) {
    onChunk?.()
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError")
    pending += typeof chunk === "string" ? chunk : decoder.decode(chunk, { stream: true })
    let end
    while ((end = pending.indexOf("\n")) >= 0) {
      const raw = pending.slice(0, end)
      pending = pending.slice(end + 1)
      const ev = line(raw.endsWith("\r") ? raw.slice(0, -1) : raw)
      if (ev) yield ev
    }
    if (bytes + Buffer.byteLength(pending) > maxFrameBytes) throw protocolError("Responses SSE frame exceeds size limit", "responses_frame_too_large")
  }
  pending += decoder.decode()
  if (pending) { const ev = line(pending.endsWith("\r") ? pending.slice(0, -1) : pending); if (ev) yield ev }
  const tail = dispatch()
  if (tail) yield tail
}

export async function parseStream(response, {
  onToken, onReasoning, signal, provider, toolMapping, previousCallIds = [], allowResponseDone = false, maxFrameBytes, readIdleMs = 120_000,
} = {}) {
  const result = { content: "", reasoning: "", toolCalls: [], usage: null, finishReason: null,
    builtinToolResults: [], outputItems: [], terminalStatus: "in_progress" }
  const items = new Map()
  const itemIndices = new Map()
  const completedItems = new Set()
  let terminal = false
  const requestId = response.headers?.get?.("x-request-id") ?? undefined
  if (requestId) result.requestId = requestId
  let idleTimer, idleError
  const armIdle = () => {
    clearTimeout(idleTimer)
    idleTimer = setTimeout(() => {
      idleError = protocolError("Responses stream idle timeout", "responses_idle_timeout")
      terminateBody(response, idleError)
    }, readIdleMs)
    idleTimer.unref?.()
  }
  const addItem = (ev, done = false) => {
    const index = ev.output_index ?? itemIndices.get(ev.item?.id) ?? items.size
    const item = { ...(items.get(index) ?? {}), ...(ev.item ?? {}) }
    items.set(index, item)
    if (item.id) itemIndices.set(item.id, index)
    if (done) completedItems.add(index)
  }
  const updatePart = (ev, field, part, delta = false) => {
    const index = ev.output_index ?? itemIndices.get(ev.item_id)
    const item = items.get(index)
    if (!item) return
    const partIndex = field === "summary" ? ev.summary_index ?? 0 : ev.content_index ?? 0
    const content = item[field] ??= []
    const prior = content[partIndex]
    content[partIndex] = delta ? { ...(prior ?? part), text: (prior?.text ?? "") + (part.text ?? "") } : { ...part }
  }
  const text = (value) => { if (typeof value === "string" && value) { result.content += value; onToken?.(value) } }
  const reasoning = (value) => { if (typeof value === "string" && value) { result.reasoning += value; onReasoning?.(value) } }
  const receiveMeta = (resp) => {
    if (resp?.usage) result.usage = normalizeUsage(resp.usage)
    if (resp?.id) result.responseId = resp.id
  }
  const fail = (error, status) => {
    result.terminalStatus = status ?? error.terminalStatus ?? "transport_error"
    result.toolCalls = []; result.outputItems = []; result.builtinToolResults = []
    result.partial = true
    result.error = error
    result.errorDetail = error.message.slice(0, 1000)
    result._warnings = [{ name: error.responsesErrFrame ? "responses-error-frame" : "responses-incomplete", message: result.errorDetail }]
    return result
  }
  armIdle()
  try {
    for await (const ev of responseEvents(response.body, { signal, maxFrameBytes, onChunk: armIdle })) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError")
      switch (ev.type) {
        case "response.output_item.added": addItem(ev); break
        case "response.output_item.done": addItem(ev, true); break
        case "response.output_text.delta":
          updatePart(ev, "content", { type: "output_text", text: ev.delta ?? "" }, true)
          text(ev.delta); break
        case "response.output_text.done":
          updatePart(ev, "content", { type: "output_text", text: ev.text ?? "" }); break
        case "response.content_part.added":
        case "response.content_part.done":
          if (ev.part) updatePart(ev, "content", ev.part)
          break
        case "response.reasoning_summary_part.added":
        case "response.reasoning_summary_part.done":
          if (ev.part) updatePart(ev, "summary", ev.part)
          break
        case "response.reasoning_summary_text.done":
          updatePart(ev, "summary", { type: "summary_text", text: ev.text ?? "" }); break
        case "response.refusal.delta": text(ev.delta); break
        case "response.reasoning_text.delta": reasoning(ev.delta); break
        case "response.reasoning_summary_text.delta":
          updatePart(ev, "summary", { type: "summary_text", text: ev.delta ?? "" }, true)
          reasoning(ev.delta); break
        case "response.content_part.delta":
          if (ev.part?.type === "reasoning_text") reasoning(ev.delta)
          else if (ev.part?.type === "output_text") text(ev.delta)
          break
        case "response.function_call_arguments.delta": {
          const index = ev.output_index ?? itemIndices.get(ev.item_id)
          const item = items.get(index)
          if (!item || item.type !== "function_call") throw protocolError("Function arguments have no matching function item")
          item.arguments = (item.arguments ?? "") + (ev.delta ?? "")
          break
        }
        case "response.function_call_arguments.done": {
          if (ev.item) addItem(ev, true)
          else {
            const index = ev.output_index ?? itemIndices.get(ev.item_id)
            const item = items.get(index)
            if (!item) throw protocolError("Completed function arguments have no matching function item")
            if (typeof ev.arguments === "string") item.arguments = ev.arguments
            completedItems.add(index)
          }
          break
        }
        case "error": {
          const error = responsesError(provider, ev.error ? ev : { error: ev }, { status: response.status, requestId, stage: "stream", terminalStatus: "failed" })
          error.responsesErrFrame = true
          throw error
        }
        case "response.failed":
          receiveMeta(ev.response)
          throw responsesError(provider, ev.response, { status: response.status, requestId, stage: "stream", terminalStatus: "failed" })
        case "response.incomplete": {
          receiveMeta(ev.response)
          result.finishReason = ev.response?.incomplete_details?.reason === "content_filter" ? "content_filter" : "length"
          return fail(responsesError(provider, { error: { code: "response_incomplete", message: `Response incomplete: ${ev.response?.incomplete_details?.reason ?? "unknown"}` } }, { requestId, stage: "stream", terminalStatus: "incomplete" }), "incomplete")
        }
        case "response.done":
          if (!allowResponseDone) throw protocolError("response.done is not an official successful terminal event")
          // Third-party compatibility only; the official route must use response.completed.
          // falls through
        case "response.completed": {
          if (ev.response?.status && ev.response.status !== "completed") throw protocolError("Completed event has a contradictory response status")
          receiveMeta(ev.response)
          const output = Array.isArray(ev.response?.output) ? ev.response.output : [...items.entries()].sort(([a], [b]) => a - b).map(([index, item]) => {
            if (item.type === "function_call" && !completedItems.has(index)) throw protocolError("Function call did not finish before the terminal event")
            return item
          })
          // Compatible streams can omit final message items. Preserve visible history as text,
          // without manufacturing missing encrypted reasoning or function calls.
          if (result.content && !output.some((item) => item.type === "message" && item.content?.length)) {
            output.push({ type: "message", role: "assistant", content: [{ type: "output_text", text: result.content }] })
          }
          const seenCalls = new Set(previousCallIds)
          const toolCalls = []
          for (const item of output) {
            if (item.type !== "function_call") continue
            if (typeof item.call_id !== "string" || !item.call_id || seenCalls.has(item.call_id)
              || (item.status !== undefined && item.status !== "completed")) throw protocolError("Invalid, duplicate or unfinished function call")
            let args
            try { args = JSON.parse(item.arguments) } catch { throw protocolError("Function call arguments are incomplete JSON") }
            if (!args || typeof args !== "object" || Array.isArray(args)) throw protocolError("Function call arguments must be an object")
            seenCalls.add(item.call_id)
            const name = resolveResponseTool(item, toolMapping, provider)
            toolCalls.push({ id: item.call_id, name, arguments: item.arguments })
            // Compatibility aliases may resolve to a local tool, but replay must use
            // the registered wire identity rather than perpetuating the alias.
            if (toolMapping) Object.assign(item, toolMapping.byLocal.get(name))
          }
          result.outputItems = output.map((item) => replayableItem(item, provider))
          result.toolCalls = toolCalls
          result.builtinToolResults = output.filter((item) => item.type === "web_search_call").map((item) => ({ id: item.id ?? "", query: item.action?.query ?? "", status: item.status ?? "completed", sources: item.action?.sources ?? [] }))
          // Some compatible endpoints send only final items, without text deltas.
          const finalText = output.filter((item) => item.type === "message").flatMap((item) => item.content ?? []).map((part) => part.text ?? part.refusal ?? "").join("")
          if (finalText.startsWith(result.content)) text(finalText.slice(result.content.length))
          else if (finalText) result.content = finalText
          if (!result.reasoning) for (const item of output) if (item.type === "reasoning") for (const part of item.summary ?? []) reasoning(part.text)
          if (signal?.aborted) throw new DOMException("Aborted", "AbortError")
          result.terminalStatus = "completed"; result.finishReason = "stop"; terminal = true
          break
        }
        case "transport.done": throw protocolError("Stream ended without a completed Responses event", "responses_missing_terminal")
        default: break
      }
      if (terminal) break
    }
    if (!terminal) throw protocolError("Stream ended without a completed Responses event", "responses_missing_terminal")
    return result
  } catch (error) {
    if (signal?.aborted) {
      if (!signal.reason?.interrupt) throw signal.reason instanceof Error ? signal.reason : new DOMException("Aborted", "AbortError")
      return { ...fail(protocolError("Response interrupted"), "interrupted"), interrupted: true, interruptMessage: signal.reason.message }
    }
    const structured = idleError ?? (error instanceof ProviderError ? error : protocolError("Responses stream transport or decoding failed"))
    if (result.content || result.reasoning) return fail(structured)
    throw structured
  } finally { clearTimeout(idleTimer) }
}
