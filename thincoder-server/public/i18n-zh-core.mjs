/**
 * i18n-zh-core.mjs — 控制台文案表·中文·核件词面（webui/WEBUI.md §2.2——KD-SV-51 拆表）：域界 = 核件发射键（管理面 chat
 * 呈现面消费——`thincoder-render-core` 原键名，注册经 `setStrings`）；门面 = `i18n-zh.mjs`（六部件展开合体 + `Object.freeze`——`ZH` 导出名不变）。
 * 值逐字同 VSC locales（`thincoder-vscode/locales/zh.json`——批内件逐键相等断言，漂移即红）。本档 = zh 族（唯一 CJK 载体——零 CJK 机检口径 §6 AC-14 按前缀排除）。
 */
export const ZH_CORE = Object.freeze({
  // ── 核件词面（管理面 chat——console-chat-align 批；§2.10） ──────────────────────
  "tool.running": "执行中…",
  "tool.initial": "执行中…",
  "tool.truncated": "…（已截断于 64K——完整文本在历史中）",
  "tool.error": "错误",
  "tool.done": "完成",
})
