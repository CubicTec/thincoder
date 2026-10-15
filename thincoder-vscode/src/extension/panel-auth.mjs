/** Host-only SIWC bridge. Never serialize a login handle, token, or OAuth URL. */
import * as vscode from "vscode"
import { endProbeWindow } from "./provider-probe-window.mjs"
import { getAuthClient, PLAN_HELP_URL } from "@thincoder/core/auth/client.mjs"
import { resolveProviders } from "@thincoder/core/config-io.mjs"

export async function pushAuthStatus(panel, name) {
  const client = getAuthClient()
  const names = name ? [name] : resolveProviders().providers.filter((p) => p.auth?.type === "chatgpt_oauth").map((p) => p.name)
  for (const provider of names) {
    try {
      panel?.webview.postMessage({ type: "authStatus", name: provider, status: await client.status(provider), profiles: await client.list() })
    } catch (e) {
      panel?.webview.postMessage({ type: "authStatus", name: provider, error: e.message })
    }
  }
}

export async function handleAuthAction(panel, msg) {
  const target = panel?._panel
  const action = msg.action === "loginNew" ? "login" : msg.action
  const name = typeof msg.name === "string" ? msg.name : "openai-chatgpt"
  try {
    if (msg.action === "manage") { await vscode.env.openExternal(vscode.Uri.parse(PLAN_HELP_URL)); return }
    if (action === "login" && vscode.env.remoteName) throw new Error("ChatGPT sign-in currently supports local VS Code only; Remote SSH and Dev Containers are not supported")
    const operation = getAuthClient().run({ action, newAccount: msg.action === "loginNew", name, profileId: msg.profileId, enabled: msg.enabled,
      openBrowser: async (url) => {
        if (new URL(url).origin !== "https://auth.openai.com") throw new Error("Untrusted sign-in destination")
        if (!(await vscode.env.openExternal(vscode.Uri.parse(url)))) throw new Error("Unable to open the system browser")
      } }).then((value) => ({ value }), (error) => ({ error }))
    if (action === "login") await pushAuthStatus(target, name)
    const outcome = await operation
    if (outcome.error) throw outcome.error
    const result = outcome.value
    target?.webview.postMessage({ type: "authResult", name, ok: true,
      ...(msg.action === "logout" ? { remoteRevoked: result.remoteRevoked === true } : {}) })
    endProbeWindow(target)
    panel._pushSettings()
    await pushAuthStatus(target, name)
  } catch (e) {
    target?.webview.postMessage({ type: "authResult", name, ok: false, error: e.message })
    await pushAuthStatus(target, name)
  }
}
