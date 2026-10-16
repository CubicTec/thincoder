/**
 * login.mjs — `thincoder acp --login` (ACP-CLIENT.md §11.2 改法 4): the terminal
 * authentication flow advertised through `initialize.authMethods[].args = ["--login"]`
 * (the client APPENDS these args to its configured `thincoder acp` invocation).
 *
 * Exit status semantics (schema `AuthMethodTerminal` 逐字): "A zero exit status signals
 * success; any other termination signals failure." — never the stdio service mode, and
 * never a silent hang on a non-interactive stdin (non-TTY ⇒ one actionable line + exit 1).
 */
import { configPath, loadConfig, writeConfigAtomic } from "@thincoder/core/config.mjs"
import { isChatGptProvider } from "@thincoder/core/provider/auth-config.mjs"
import { isConfiguredProvider } from "./provider-readiness.mjs"
import { setupWizard } from "../cli/setup-wizard.mjs"

/** Run the login flow. @returns {Promise<number>} process exit code (0 = success). */
export async function runAcpLogin() {
  if (!process.stdin.isTTY) {
    console.error(`[acp] --login needs an interactive terminal (stdin is not a TTY) — run "thincoder acp --login" locally, or use "thincoder auth login --enable" and the TUI /model for ChatGPT.`)
    return 1
  }
  const current = loadConfig()
  if (isChatGptProvider(current.provider) || (!current.provider?.name && current.providers?.some(isChatGptProvider))) {
    if (isConfiguredProvider(current.provider)) {
      console.error("[acp] ChatGPT account reference and model configured; authorization is verified per request.")
      return 0
    }
    console.error('[acp] ChatGPT setup incomplete — run "thincoder auth login --enable" locally, then choose a model with /model in the TUI.')
    return 1
  }
  const provider = await setupWizard()
  if (!provider) {
    console.error(`[acp] setup did not select a runnable model. For ChatGPT, complete "thincoder auth login --enable" and /model in the TUI; otherwise retry "thincoder acp --login".`)
    return 1
  }
  // 校验并补齐 defaultModel（§11.5 判据 = `loadConfig().provider` 可解析）。wizard 已写
  // `raw.defaultModel = "<name>:<model>"`；此处为兜底核对——仍不可解析 ⇒ 按刚配置的渠道补齐。
  let cfg = loadConfig()
  if (!isConfiguredProvider(cfg.provider)) {
    // writeConfigAtomic 在配置不可解析时**抛错**（config-io.mjs「refusing to overwrite」）——
    // 包住并复用同一失败文案（不落 bin 顶层 rejection 通道）。
    let r
    try {
      r = writeConfigAtomic(configPath, (raw) => { raw.defaultModel = `${provider.name}:${provider.model}` })
    } catch (e) {
      r = { ok: false, reason: e?.message ?? String(e) }
    }
    if (!r.ok) {
      console.error(`[acp] login incomplete — ${r.reason}: retry "thincoder acp --login" (or edit ${configPath}).`)
      return 1
    }
    cfg = loadConfig()
  }
  if (!isConfiguredProvider(cfg.provider)) {
    console.error(`[acp] login incomplete — credentials still unresolvable: ${cfg.providerInvalidReason ?? "unknown reason"} (fix via /config → 默认模型, or edit ${configPath}).`)
    return 1
  }
  console.error(`[acp] login OK — credentials at ${configPath} are ready; ACP clients can now drive sessions without an interactive terminal.`)
  return 0
}
