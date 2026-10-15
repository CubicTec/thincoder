/** Local SIWC commands; no tokens or authorization URLs are printed. */
import { spawn } from "node:child_process"
import { getAuthClient, authStatusText } from "@thincoder/core/auth/client.mjs"

export function openSystemBrowser(url) {
  if (process.env.SSH_CONNECTION || process.env.SSH_TTY || process.env.REMOTE_CONTAINERS) {
    throw new Error("ChatGPT sign-in currently supports local hosts only; remote credential transfer is not implemented")
  }
  const parsed = new URL(url)
  if (parsed.origin !== "https://auth.openai.com") throw new Error("Untrusted sign-in destination")
  const [command, args] = process.platform === "darwin" ? ["open", [url]]
    : process.platform === "win32" ? ["rundll32.exe", ["url.dll,FileProtocolHandler", url]] : ["xdg-open", [url]]
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "ignore", windowsHide: true })
    child.once("error", () => reject(new Error("Unable to open the system browser")))
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error("Unable to open the system browser")))
  })
}

export const AUTH_USAGE = "Usage: thincoder auth add | enable | disable | login [--enable] [--new] | status | list | select <profileId> | logout | cancel [openai-chatgpt]"
export async function authCommand(args = [], { client = getAuthClient(), output = console.log, error = console.error,
  openBrowser = openSystemBrowser, signal } = {}) {
  const [action = "status", ...rest] = args
  const known = ["add", "enable", "disable", "login", "status", "list", "select", "logout", "cancel"]
  if (!known.includes(action)) { error(AUTH_USAGE); return 1 }
  const profileId = action === "select" ? rest.shift() : undefined
  const enable = rest.includes("--enable")
  const newAccount = rest.includes("--new")
  const positional = rest.filter((a) => a !== "--enable" && a !== "--new")
  if (positional.length > 1 || ((enable || newAccount) && action !== "login") || (action === "select" && !profileId)) { error(AUTH_USAGE); return 1 }
  const name = positional[0] || "openai-chatgpt"
  if (name.startsWith("-")) { error(AUTH_USAGE); return 1 }
  try {
    if (enable) await client.run({ action: "enable", name, enabled: true })
    if (action === "login") output("Opening the system browser. Sign-in and plan authorization are separate; no inference test will run.")
    const result = await client.run({ action: action === "disable" ? "enable" : action, name,
      ...(action === "enable" || action === "disable" ? { enabled: action === "enable" } : {}), profileId, newAccount, openBrowser, signal })
    if (action === "list") for (const p of result.profiles) output(`${p.profileId}  ${p.label || p.profileId}  ${p.state}${p.planAuthorized ? " (plan authorized)" : ""}`)
    output(authStatusText(result))
    if (action === "logout") output(result.remoteRevoked ? "Signed out locally; remote session revoked." : "Signed out locally; remote revocation was not confirmed.")
    if (action === "status") output(`Usage and account management: ${result.helpUrl}`)
    return 0
  } catch (e) { error(`[auth] ${e.message}`); return 1 }
}
