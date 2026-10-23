/** Explicit local ↔ wire function identity table. Never infer identity by splitting dots. */
import { createHash } from "node:crypto"
import { ProviderError } from "./errors.mjs"
import { isChatGptProvider } from "./auth-config.mjs"

export function wireFunctionIdentity(provider, local) {
  const name = /^[a-zA-Z0-9_-]{1,64}$/.test(local) ? local : `fn_${createHash("sha256").update(String(local)).digest("hex").slice(0, 32)}`
  return { name, ...(isChatGptProvider(provider) ? { namespace: "thincoder" } : {}) }
}

function validateStrictSchema(schema, provider, path = "parameters") {
  if (!schema || typeof schema !== "object") return
  if (schema.type === "object" || schema.properties) {
    const properties = Object.keys(schema.properties ?? {})
    if (schema.additionalProperties !== false || !Array.isArray(schema.required) || properties.some((key) => !schema.required.includes(key))) {
      throw new ProviderError(provider, `strict function schema at ${path} requires additionalProperties:false and every property in required`, { stage: "configuration", param: "tools" })
    }
  }
  for (const [key, value] of Object.entries(schema)) {
    if (["properties", "$defs", "definitions"].includes(key)) for (const [name, nested] of Object.entries(value ?? {})) validateStrictSchema(nested, provider, `${path}.${key}.${name}`)
    if (["items", "anyOf", "allOf", "oneOf"].includes(key)) for (const nested of Array.isArray(value) ? value : [value]) validateStrictSchema(nested, provider, `${path}.${key}`)
  }
}

export function buildResponsesTools(provider, tools = []) {
  const namespace = isChatGptProvider(provider) ? "thincoder" : null
  const byLocal = new Map()
  const byWire = new Map()
  const definitions = []
  for (const tool of tools ?? []) {
    if (tool.type && tool.type !== "function") throw new ProviderError(provider, "Only local function tools are supported", { stage: "configuration", param: "tools" })
    const fn = tool.function ?? tool
    const local = fn.name
    if (typeof local !== "string" || !local || byLocal.has(local)) throw new ProviderError(provider, "Missing or duplicate local function identity", { stage: "configuration", param: "tools" })
    const { name } = wireFunctionIdentity(provider, local)
    const key = JSON.stringify([namespace, name])
    if (byWire.has(key)) throw new ProviderError(provider, "Function wire identity collision", { stage: "configuration", param: "tools" })
    const identity = { name, ...(namespace ? { namespace } : {}) }
    byLocal.set(local, identity)
    byWire.set(key, local)
    if (fn.strict === true) {
      if (!fn.parameters || typeof fn.parameters !== "object") throw new ProviderError(provider, "strict function schema requires explicit parameters", { stage: "configuration", param: "tools" })
      validateStrictSchema(fn.parameters, provider)
    }
    definitions.push({
      type: "function", name,
      ...(fn.description != null ? { description: fn.description } : {}),
      parameters: fn.parameters ?? { type: "object", properties: {} },
      // Omitting strict can normalize optional fields into required on Responses. Preserve legacy semantics.
      strict: fn.strict === true,
    })
  }
  return {
    tools: definitions.length && namespace
      ? [{ type: "namespace", name: namespace, description: "ThinCoder local tools governed by the user's permissions.", tools: definitions }]
      : definitions,
    byLocal, byWire, namespace,
  }
}

export function resolveResponseTool(item, mapping, provider) {
  if (!mapping) return item.name
  const key = JSON.stringify([item.namespace ?? null, item.name])
  const local = mapping.byWire.get(key)
  if (local) return local
  // Some compatible endpoints serialize a qualified name; exact registered aliases only.
  for (const [name, wire] of mapping.byLocal) {
    if (!item.namespace && wire.namespace && item.name === `${wire.namespace}.${wire.name}`) return name
  }
  throw new ProviderError(provider, "Response names an unregistered function identity", {
    code: "invalid_function_identity", stage: "stream", retryClass: "never", terminalStatus: "failed",
  })
}

export function encodeToolChoice(choice, mapping, provider) {
  if (choice === undefined) return undefined
  if (["auto", "none", "required"].includes(choice)) return choice
  if (choice?.type !== "function") throw new ProviderError(provider, "Unsupported Responses tool_choice", { stage: "configuration", param: "tool_choice" })
  const name = choice.function?.name ?? choice.name
  const wire = mapping.byLocal.get(name)
  if (!wire) throw new ProviderError(provider, "tool_choice names an unregistered function", { stage: "configuration", param: "tool_choice" })
  // Forced-function schema takes a name, not Chat Completions' nested function object.
  return { type: "function", name: wire.namespace ? `${wire.namespace}.${wire.name}` : wire.name }
}
