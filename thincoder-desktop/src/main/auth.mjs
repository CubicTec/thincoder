/** SIWC IPC is reference/intent only; system browser and OAuth stay in main. */
import { shell } from "electron"
import { getAuthClient, PLAN_HELP_URL } from "@thincoder/core/auth/client.mjs"
export async function authActionChannel(payload) {
  try {
    if (payload?.action === "manage") { await shell.openExternal(PLAN_HELP_URL); return { ok: true } }
    const result = await getAuthClient().run({ action: payload?.action === "loginNew" ? "login" : payload?.action, newAccount: payload?.action === "loginNew", name: payload?.name,
      profileId: payload?.profileId, enabled: payload?.enabled,
      openBrowser: async (url) => {
        if (new URL(url).origin !== "https://auth.openai.com") throw new Error("Untrusted sign-in destination")
        await shell.openExternal(url)
      } })
    return { ok: true, ...result }
  } catch (error) { return { ok: false, reason: error.message } }
}
