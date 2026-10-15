# 2026-10-15 OpenAI ChatGPT 计划接入

> 归属：core / provider + CLI / VS Code / Desktop。
> 需求：[OPENAI-CHATGPT](../core/requirements/OPENAI-CHATGPT.md)。
> 设计：[OPENAI-CHATGPT](../core/design/OPENAI-CHATGPT.md)。
> 维护者指南：[验收、拆分与回滚](2026-10-15-openai-chatgpt-acceptance.md)。

## 1. 范围与基线

在 CubicTec/thincoder fork 实施本地 ChatGPT plan 接入，保留方便 upstream PR 的提交粒度。
基线 dbd07a5bd6e5a59e60f97bdd82345904f434f285；分支 feat/openai-chatgpt-plan。
本批只进行离线/合成凭据测试，没有真实登录、凭据导入、付费推理、发行包发布或 upstream PR。
功能默认关闭；server 原生 Responses、凭据迁移、公共 token 池、Remote SSH/Containers 登录不在范围。

## 2. 契约与实现

官方 SIWC 页面独立核验成立；数字 earliest_refresh_at 按官方 devkit 的 Unix 秒解释，日期字符串保留日期语义。
认证/协议分层，精确官方端点，禁止重定向和隐式 API Key 计费回退，scope 与推理成功分开。
共享 AuthService、Responses codec、native journal、辅助调用守卫、CLI/VSC/Desktop 账户界面与首次配置均已接线。
详细边界见设计档，不把合成 OAuth 成功等同于真实账户可用。

独立审查发现并修复：并发 stale-reaper 锁竞争、刷新结果未知时旧 token 重放、未完成摘要破坏历史、
首回合无持久工具 journal、工具完成与结果提交间崩溃窗口、陈旧 staged replay、损坏 journal 重试覆盖、
orphan 保存失败后误开放，以及真实 dispatch 结果携函数导致 DataCloneError。
最终复查另覆盖：未决事务的压缩/裁剪边界、跨客户端用量暂停恢复，以及并发 quota 落盘结果被陈旧对象遮蔽。
这些均有回归；实际主循环测试包含一轮只读文件工具、第二次原生 replay、最后文本以及失败终态不执行工具。

## 3. 提交粒度与依赖

以下是本地被测试的提交。GitHub connector 创建 tree 返回 403 Resource not accessible by integration，未创建远端分支。
完整功能分支和粒度化提交保留在本地，待 fork 写权限恢复后直接推送；没有向 upstream 提交 PR。
依赖顺序见维护者指南，不应跳过基础提交直接 cherry-pick UI。

- d28c5d5a：契约/需求/初始设计。
- 5907e367：Auth core 与 25 个独立验收，package files 包含 auth/。
- e8a36104：Responses transport、错误、namespace、短期请求认证；累计 core 43 个。
- f006f6d1：共享 gateway/catalog/config、会话 journal、实际 agent loop、辅助调用；累计 core 82 个。
- 70096bdb：CLI + shared adapter；CLI 11 个，语法门通过。
- b2a7b44a：VS Code host/webview；3 个，语法门通过。
- 1ad4fbd3：Desktop main/preload/renderer；6 个。
- 1660a279：设计、验收记录、上游合并和发布门。
- 938433cb：共享 usage-limit 持久暂停、并发落盘、跨客户端恢复；独立归档 core 87 个。
- 5f583bd8：未决事务阻止改写、native 函数配对、延后 prune；独立归档 core 93 个。
- 最后文档提交：更新交付证据、范围与验收状态。

每个代码提交从 git archive 的独立目录执行对应测试，避免后续未提交文件掩盖依赖缺口。

## 4. 已执行验证

环境：Linux，Node v24.19.0。所有登录/token/model HTTP 响应均为 mock；callback/子进程测试真实使用本机原语。

| 命令/范围 | 结果 |
|---|---|
| core npm test | 93/93 通过，含 auth28 / protocol19 / gateway14 / auxiliary15 / session11 / agent-loop4 / prune2 |
| CLI npm test | 11/11 通过 |
| VS Code npm test | 3/3 通过 |
| Desktop npm test | 6/6 通过 |
| CLI npm run lint | 通过，129 个源文件 |
| VS Code npm run lint | 通过，144 个源文件 |
| Desktop main/renderer node --check | 通过 |
| server npm run prepublishOnly | 通过，仅现有语法检查，不是服务器集成验收 |
| auxiliary + advisor/Responses/accounting 历史批次 | 61/61 通过 |
| provider/config/Responses 选定历史批次 | 38/38 通过 |
| 更宽 175 项历史批次对比 | 163 通过 / 12 失败，与干净基线同样的 12 项；无新增失败 |
| core + CLI npm pack --ignore-scripts | 通过；临时解包、临时 HOME 的 auth add/status 通过，默认 disabled |
| git diff --check | 通过 |

现有 doc-check 不是全绿：候选和干净基线均有 25 个悬空路径锚、3 行超宽；本批文档无新增悬空或超宽。
行数报告仍有既有漂移；新增模块对旧模块行数也有报告差异，不伪称已经清掉仓库文档债。
仓库文档要求的 scripts/doc-impact.mjs 在基线不存在（MODULE_NOT_FOUND），因此按调用图与 git diff 反查影响面。

宽历史集复现：

```sh
node --test docs/batches/*provider*.test.mjs docs/batches/*responses*.test.mjs \
  docs/batches/*session-carryover*.test.mjs docs/batches/*models-config*.test.mjs
```

12 个基线失败来自历史 fixture/迁移断言、现有 UI payload 期望、存储 schema/文档计数与 server 的旧静态断言。
宽集执行前手动补齐 server 的本地 core/render-core symlink（现有 dev-link 仅覆盖三个本地客户端）。
此批不扩大为修复所有退休批次测试。已更新受本功能直接影响的预设数量、env consumer、format 文案与异步 providerList 断言。

## 5. 未执行与发布门

真实 ChatGPT 资格/scope/推理/刷新、三端真实 GUI、Windows ACL 实机、VSIX、Electron 平台安装包、core Node22 最低版本均未验收。
打包 smoke 只覆盖 core/CLI tarball，不能宣称 VSIX/Electron 已验证。没有 bump 或发布版本；发布前必须 core 先发、三端依赖再跟进。
严格保留实验性和默认关闭。逐项操作步骤及需要账户持有人授权的测试在维护者指南。

## 6. 受影响文件

以下由实际 diff 生成，按提交映射可还原每个 PR 的范围。
- `docs/README.md`
- `docs/RELEASE.md`
- `docs/TODO.md`
- `docs/batches/2026-09-29-provider-config-family.test.mjs`
- `docs/batches/2026-10-07-provider-config-parity-desktop.test.mjs`
- `docs/batches/2026-10-09-provider-default-model-purge-core.test.mjs`
- `docs/batches/2026-10-15-openai-chatgpt-acceptance.md`
- `docs/batches/2026-10-15-openai-chatgpt.md`
- `docs/cli/design/TUI-COMMANDS.md`
- `docs/core/design/CONFIG.md`
- `docs/core/design/CONTEXT-COMPACTION.md`
- `docs/core/design/OPENAI-CHATGPT.md`
- `docs/core/design/PROVIDER.md`
- `docs/core/design/SESSION.md`
- `docs/core/requirements/CONFIG.md`
- `docs/core/requirements/OPENAI-CHATGPT.md`
- `docs/core/requirements/PROVIDER.md`
- `docs/core/requirements/SESSION.md`
- `docs/desktop/design/SETTINGS.md`
- `docs/vsc/design/SETTINGS.md`
- `thincoder-cli/bin/thincoder.mjs`
- `thincoder-cli/src/cli/auth-command.mjs`
- `thincoder-cli/src/cli/distill-command.mjs`
- `thincoder-cli/src/cli/setup-wizard.mjs`
- `thincoder-cli/src/command-table.mjs`
- `thincoder-cli/src/completions.mjs`
- `thincoder-cli/src/distill.mjs`
- `thincoder-cli/src/tui/cmd-advisor.mjs`
- `thincoder-cli/src/tui/cmd-auth.mjs`
- `thincoder-cli/src/tui/cmd-config.mjs`
- `thincoder-cli/src/tui/cmd-mcp.mjs`
- `thincoder-cli/src/tui/model-catalog.mjs`
- `thincoder-cli/src/tui/model-picker.mjs`
- `thincoder-cli/src/tui/provider-admin.mjs`
- `thincoder-cli/src/tui/slash-commands.mjs`
- `thincoder-cli/src/tui/startup.mjs`
- `thincoder-cli/src/tui/wizard.mjs`
- `thincoder-cli/test/integration/chatgpt-auth.test.mjs`
- `thincoder-cli/test/integration/responses-auxiliary.test.mjs`
- `thincoder-core/advisor/loop.mjs`
- `thincoder-core/advisor/responses-context.mjs`
- `thincoder-core/agent-tools/context.mjs`
- `thincoder-core/agent-tools/goal.mjs`
- `thincoder-core/agent/chat-call.mjs`
- `thincoder-core/agent/run-stages.mjs`
- `thincoder-core/agent/turn-loop.mjs`
- `thincoder-core/auth/client.mjs`
- `thincoder-core/auth/credential-store.mjs`
- `thincoder-core/auth/errors.mjs`
- `thincoder-core/auth/login.mjs`
- `thincoder-core/auth/oidc.mjs`
- `thincoder-core/auth/service.mjs`
- `thincoder-core/auth/tokens.mjs`
- `thincoder-core/auto-think.mjs`
- `thincoder-core/config-io.mjs`
- `thincoder-core/config-presets.mjs`
- `thincoder-core/config.mjs`
- `thincoder-core/context-degrade.mjs`
- `thincoder-core/context-prune.mjs`
- `thincoder-core/context-push.mjs`
- `thincoder-core/context.mjs`
- `thincoder-core/explore-distill.mjs`
- `thincoder-core/generate-title.mjs`
- `thincoder-core/log.mjs`
- `thincoder-core/model-ref.mjs`
- `thincoder-core/package.json`
- `thincoder-core/provider-flows.mjs`
- `thincoder-core/provider/auth-config.mjs`
- `thincoder-core/provider/auth-context.mjs`
- `thincoder-core/provider/capabilities.mjs`
- `thincoder-core/provider/core.mjs`
- `thincoder-core/provider/errors.mjs`
- `thincoder-core/provider/index.mjs`
- `thincoder-core/provider/list-models.mjs`
- `thincoder-core/provider/rate.mjs`
- `thincoder-core/provider/responses-http.mjs`
- `thincoder-core/provider/responses-items.mjs`
- `thincoder-core/provider/responses-request.mjs`
- `thincoder-core/provider/responses-stream.mjs`
- `thincoder-core/provider/responses-tools.mjs`
- `thincoder-core/provider/responses.mjs`
- `thincoder-core/responses-history-guard.mjs`
- `thincoder-core/responses-session.mjs`
- `thincoder-core/session-guard.mjs`
- `thincoder-core/session-lifecycle.mjs`
- `thincoder-core/session-slot-write.mjs`
- `thincoder-core/session-slots.mjs`
- `thincoder-core/session.mjs`
- `thincoder-core/test/chatgpt-auth-limits.test.mjs`
- `thincoder-core/test/chatgpt-auth.test.mjs`
- `thincoder-core/test/chatgpt-gateway.test.mjs`
- `thincoder-core/test/fixtures/chatgpt-auth.mjs`
- `thincoder-core/test/responses-agent-loop.test.mjs`
- `thincoder-core/test/responses-auxiliary.test.mjs`
- `thincoder-core/test/responses-context-prune.test.mjs`
- `thincoder-core/test/responses-contract.test.mjs`
- `thincoder-core/test/responses-session-regressions.test.mjs`
- `thincoder-core/tool-docs/context.md`
- `thincoder-desktop/renderer/composer-sync.mjs`
- `thincoder-desktop/renderer/i18n-auth.mjs`
- `thincoder-desktop/renderer/i18n.mjs`
- `thincoder-desktop/renderer/mount-onboarding.mjs`
- `thincoder-desktop/renderer/mount-settings-segments-providers.mjs`
- `thincoder-desktop/renderer/mount-settings.mjs`
- `thincoder-desktop/renderer/settings.css`
- `thincoder-desktop/renderer/views/onboarding.mjs`
- `thincoder-desktop/renderer/views/settings-agent.mjs`
- `thincoder-desktop/renderer/views/settings-auth.mjs`
- `thincoder-desktop/renderer/views/settings-controls.mjs`
- `thincoder-desktop/renderer/views/settings-sections-models.mjs`
- `thincoder-desktop/renderer/views/settings-sections-providers.mjs`
- `thincoder-desktop/renderer/views/settings-sections.mjs`
- `thincoder-desktop/renderer/views/settings.mjs`
- `thincoder-desktop/src/main/auth.mjs`
- `thincoder-desktop/src/main/ipc-registry.mjs`
- `thincoder-desktop/src/main/providers.mjs`
- `thincoder-desktop/src/main/settings.mjs`
- `thincoder-desktop/src/preload/preload.cjs`
- `thincoder-desktop/test/files.mjs`
- `thincoder-desktop/test/integration/chatgpt-auth.test.mjs`
- `thincoder-vscode/locales/en.json`
- `thincoder-vscode/locales/zh.json`
- `thincoder-vscode/src/agent/setup.mjs`
- `thincoder-vscode/src/extension/panel-auth.mjs`
- `thincoder-vscode/src/extension/panel-messages-settings.mjs`
- `thincoder-vscode/src/extension/panel-messages.mjs`
- `thincoder-vscode/src/extension/presets.mjs`
- `thincoder-vscode/src/extension/provider-probe-window.mjs`
- `thincoder-vscode/src/extension/settings.mjs`
- `thincoder-vscode/test/integration/chatgpt-auth.test.mjs`
- `thincoder-vscode/test/integration/files.mjs`
- `thincoder-vscode/webview/chat-messages.js`
- `thincoder-vscode/webview/onboarding.js`
- `thincoder-vscode/webview/settings-auth.js`
- `thincoder-vscode/webview/settings-provider-dialog.js`
- `thincoder-vscode/webview/settings-providers.js`
