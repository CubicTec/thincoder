/**
 * i18n-en-core.mjs — 控制台文案表·English·核件词面（webui/WEBUI.md §2.2——KD-SV-51 拆表）：域界 = 核件发射键（管理面 chat
 * 呈现面消费——`thincoder-render-core` 原键名，注册经 `setStrings`）；门面 = `i18n-en.mjs`（六部件展开合体 + `Object.freeze`——`EN` 导出名不变）。
 * 值逐字同 VSC locales（`thincoder-vscode/locales/en.json`——批内件逐键相等断言，漂移即红）。本档 = en 族（零 CJK）。
 */
export const EN_CORE = Object.freeze({
  // ── 核件词面（管理面 chat——console-chat-align 批；§2.10） ──────────────────────
  "tool.running": "running…",
  "tool.initial": "Running…",
  "tool.truncated": "… (truncated at 64K — full text in history)",
  "tool.error": "error",
  "tool.done": "done",
})
