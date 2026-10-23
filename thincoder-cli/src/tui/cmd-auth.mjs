import { authCommand } from "../cli/auth-command.mjs"
import { loadRaw } from "@thincoder/core/config-io.mjs"
import { reloadRuntimeConfig } from "./config-helpers.mjs"
import { C } from "./ansi.mjs"

/** Reuse argv actions; run sign-in in the background so /auth cancel stays usable. */
export async function handleAuthCommand(ctx, args = []) {
  const run = async () => {
    const changesConfig = ["add", "enable", "disable", "login", "select", "logout"].includes(args[0])
    const before = changesConfig ? JSON.stringify(loadRaw().providers) : null
    const code = await authCommand(args, { output: (line) => ctx.pushLine(line, C.tool), error: (line) => ctx.pushLine(line, C.error) })
    // A local enable/disable may be saved before the account service reports a failure.
    if (changesConfig && (code === 0 || JSON.stringify(loadRaw().providers) !== before)) {
      await reloadRuntimeConfig(ctx.agent, { preserveSession: true })
    }
    ctx.render()
  }
  if (args[0] === "login") { void run().catch((e) => ctx.pushLine(`[auth] ${e.message}`, C.error)); return }
  await run()
}
