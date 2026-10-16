/** Host-only SIWC bridge. Never serialize a login handle, token, or OAuth URL. */
import * as vscode from "vscode"
import { endProbeWindow } from "./provider-probe-window.mjs"
import { getAuthClient, PLAN_HELP_URL } from "@thincoder/core/auth/client.mjs"
import { authError, safeAuthError } from "@thincoder/core/auth/errors.mjs"
import { resolveProviders } from "@thincoder/core/config-io.mjs"

const statusRequests = new WeakMap()
function claimStatus(panel, name) {
  let requests = statusRequests.get(panel)
  if (!requests) { requests = new Map(); statusRequests.set(panel, requests) }
  const token = {}
  requests.set(name, token)
  return () => requests.get(name) === token
}

export async function pushAuthStatus(panel, name) {
  if (!panel?.webview) return
  const client = getAuthClient()
  let names
  try {
    names = name ? [name] : resolveProviders().providers.filter((p) => p.auth?.type === "chatgpt_oauth").map((p) => p.name)
  } catch (error) {
    panel.webview.postMessage({ type: "authStatus", name: name || "openai-chatgpt", error: safeAuthError(error).message })
    return
  }
  if (!name) for (const provider of statusRequests.get(panel)?.keys() ?? []) {
    if (!names.includes(provider)) statusRequests.get(panel).delete(provider)
  }
  await Promise.all(names.map(async (provider) => {
    const latest = claimStatus(panel, provider)
    try {
      const signature = () => JSON.stringify(resolveProviders().providers.find((p) => p.name === provider)?.auth)
      const started = signature()
      const status = await client.status(provider), profiles = await client.list()
      if (latest() && signature() === started) panel.webview.postMessage({ type: "authStatus", name: provider, status, profiles })
    } catch (error) {
      if (latest()) panel.webview.postMessage({ type: "authStatus", name: provider, error: safeAuthError(error).message })
    }
  }))
}

export async function handleAuthAction(panel, msg) {
  const target = panel?._panel
  if (msg.action === "manage") {
    // Help is not an account mutation: preserve status generations and notices.
    try {
      if (!(await vscode.env.openExternal(vscode.Uri.parse(PLAN_HELP_URL)))) throw authError("browser_unavailable", "Unable to open the system browser")
    } catch (error) {
      target?.webview.postMessage({ type: "providerError", scope: "panel", reason: safeAuthError(error).message })
    }
    return
  }
  const action = msg.action === "loginNew" ? "login" : msg.action
  const name = typeof msg.name === "string" ? msg.name : "openai-chatgpt"
  if (target?.webview) claimStatus(target, name) // invalidate snapshots started before this intent
  const requestId = Number.isSafeInteger(msg.requestId) ? msg.requestId : undefined
  try {
    if (action === "login" && vscode.env.remoteName) throw authError("remote_unsupported", "ChatGPT sign-in currently supports local VS Code only; Remote SSH and Dev Containers are not supported")
    const operation = getAuthClient().run({ action, newAccount: msg.action === "loginNew", name, profileId: msg.profileId, enabled: msg.enabled,
      openBrowser: async (url) => {
        if (new URL(url).origin !== "https://auth.openai.com") throw authError("untrusted_browser_url", "Untrusted sign-in destination")
        if (!(await vscode.env.openExternal(vscode.Uri.parse(url)))) throw authError("browser_unavailable", "Unable to open the system browser")
      } }).then((value) => ({ value }), (error) => ({ error }))
    if (action === "login") await pushAuthStatus(target, name)
    const outcome = await operation
    if (outcome.error) throw outcome.error
    const result = outcome.value
    target?.webview.postMessage({ type: "authResult", name, action: msg.action, requestId, ok: true,
      ...(msg.action === "logout" ? { remoteRevoked: result.remoteRevoked === true } : {}) })
    endProbeWindow(target)
    // Settings refresh is a separate outcome: account success must not turn into
    // an unhandled rejection or a false sign-in failure if the follow-up fails.
    void Promise.resolve().then(() => panel._pushSettings()).catch((error) => {
      target?.webview.postMessage({ type: "providerError", scope: "panel", reason: safeAuthError(error).message })
    })
    await pushAuthStatus(target, name)
  } catch (e) {
    target?.webview.postMessage({ type: "authResult", name, action: msg.action, requestId, ok: false, error: safeAuthError(e).message })
    await pushAuthStatus(target, name)
  }
}
