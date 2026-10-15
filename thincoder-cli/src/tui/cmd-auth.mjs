import { authCommand } from "../cli/auth-command.mjs"
import { resolveProviders } from "@thincoder/core/config-io.mjs"
import { C } from "./ansi.mjs"

/** Reuse argv actions; run sign-in in the background so /auth cancel stays usable. */
export async function handleAuthCommand(ctx, args = []) {
  const run = async () => {
    await authCommand(args, { output: (line) => ctx.pushLine(line, C.tool), error: (line) => ctx.pushLine(line, C.error) })
    const providers = resolveProviders().providers
    ctx.agent.providers = providers
    if (ctx.agent.config) ctx.agent.config.providers = providers
    const active = providers.find((p) => p.name === ctx.agent.activeProvider)
    if (active?.auth?.type === "chatgpt_oauth") ctx.agent.provider = { ...active, model: ctx.agent.activeModel }
    ctx.render()
  }
  if (args[0] === "login") { void run().catch((e) => ctx.pushLine(`[auth] ${e.message}`, C.error)); return }
  await run()
}
