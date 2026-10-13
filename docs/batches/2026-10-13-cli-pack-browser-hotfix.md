# 2026-10-13 · cli-pack-browser-hotfix
> 六段 append-only，一段一作者：§1 讨论（主 agent）· §2 批次任务与设计（eng-designer）· §3 设计评审（评审子代理）· §4 用户批准（主 agent）· §5 实施记录（eng-coder）· §6 验证与收口（父代理）。
> 编制：主 agent · 2026-10-13 · 来源 = 用户 2026-10-13 17:32 报障（thincoder@0.12.72 装后启动即崩：ERR_MODULE_NOT_FOUND @thincoder/core/browser/clipboard.mjs）——P0 快车道；台账 #1362。
> 台账 = #1362（RELEASE · 归批）。前情 = 无（独立批）。
## §1 讨论（主 agent）
**状态行**：🔄 进行中（…）
<§1 模板占位：本批条目 / 关键判据 / 授权口径>

**轻通道轮 · CLI 发布 P0（核包 `files` 白名单缺 `browser/`——装后启动即崩）**（round 行 = 台账 #1362——「收尾链待跑」；每笔 = 披露 ∥ 变更 ∥ 实走 ∥ 冻结；§5 = 不适用——实施面 = 父侧直笔，记 §1）

## 笔 1 · 核包 `files` 白名单补 `browser/` + 号 0.10.6（P0 热修）

- **披露（笔前）**：本笔 = 轻通道（缺陷修复——实现与「发布物必须可装载」相抵；报障原话在案）｜变更 = `thincoder-core/package.json` `files` 补 `"browser/"` + 版本 `0.10.5 ⇒ 0.10.6` ∥ `thincoder-core/CHANGELOG.md` 0.10.6 段（Fixed）｜reach = 核打包面 / 发布面（三产品声明随正 `^0.10.6`——`RELEASE.md` §5.2 步骤 4）｜回滚 = revert（未发布 ⇒ 改回即退——§5.0 P5）。
- **根因（实据）**：`tools/browser.mjs:13-15` ∥ `permission.mjs:16` 引 `../browser/*`，而 `files` 白名单未列 `browser/`（该目录 2026-10-07 落地；0.10.5 = 目录出现后首个核发布 ⇒ 首装即崩；0.10.4 及以前装机不受影响）。
- **变更（实读）**：`thincoder-core/package.json`（`files` + `"browser/"`；`version` 0.10.6）∥ `thincoder-core/CHANGELOG.md`（0.10.6 段——含教训行）∥ 三产品声明（`thincoder-cli` ∥ `thincoder-vscode` ∥ `thincoder-desktop`：`^0.10.5 ⇒ ^0.10.6`）∥ `docs/RELEASE.md` 声明面三处 + 变更行。
- **实走（全绿）**：① 打包内容判据（`npm pack --dry-run --json`）= 根 `.mjs` 100/100 零缺 ∥ **`browser/` 九件在包** ∥ prompts 16 ∥ tool-docs 51；② 真包装机冒烟（`.thincoder/tmp/pack-smoke-1013`）= 复刻崩点 `import @thincoder/core/tools/browser.mjs` ⇒ **IMPORT_OK** ∥ `thincoder -v` ⇒ 0.12.72 ∥ 无 TTY 直启 ⇒ 干净走到 TTY 守卫（零模块错）；③ 发布干跑 exit 0（325 件——`prepublishOnly → npm test` 段过）。
- **冻结**：待（发布轮完成 + 收尾链 §2/§3/§4/§6 后）。

## §2 批次任务与设计（eng-designer）
**状态行**：（eng-designer 写入时更新）
<§2 模板占位：本批条目（覆盖） / 设计档落点 / 机制设计 / 受影响文件与测试覆盖 / 验收对照 / 关键决策 / 上抛项>
## §3 设计评审（评审子代理）
## §4 用户批准（主 agent）
## §5 实施记录（eng-coder）
## §6 验证与收口（父代理）
