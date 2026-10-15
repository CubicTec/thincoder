# ChatGPT plan 接入：维护者验收与拆分指南

> 对应 [实施批次](2026-10-15-openai-chatgpt.md) 与 [核心设计](../core/design/OPENAI-CHATGPT.md)。
> 本文包含待执行步骤；没有把真实账户或 GUI 验收标记为通过。

## PR 依赖顺序

合并分支是 `feat/openai-chatgpt-plan`，基线 `dbd07a5bd6e5a59e60f97bdd82345904f434f285`。
提交保留粒度，后续可用每个提交建 stacked PR；每个代码提交均从其归档树单独跑包测试。

1. 契约文档：需求、官方来源、安全边界、默认实验性策略。
2. Auth core：本机 OAuth、OIDC、token lifecycle、文件后端及独立测试；只依赖基线。
3. Responses transport：请求校验、SSE、namespace、错误、request-scoped auth；依赖 2。
4. Shared integration：预设、config/catalog、标题、主循环、native sidecar、辅助调用守卫；依赖 3。
5. CLI + shared client adapter：命令、向导、模型标签、配置只存引用；依赖 4。
6. VS Code：host bridge、webview 状态、local-only 登录、模型与会话接线；依赖 5 的 adapter。
7. Desktop：main/preload/renderer 账户与首次配置；依赖 5 的 adapter，可与 6 并行评审。
8. 验收与发布文档：实际检查结果、已知基线失败、待验、回滚说明。

若想把三端 PR 完全并行，先将第 5 提交的 core/auth/client.mjs 和 adapter 测试另拆基础提交；
当前顺序避免在历史中出现 import 未落地的半成品。

## 离线复现

使用 Node 24.19.0（本批执行环境）；core 声明的最低 Node 22.13 尚未单独验证。

```sh
node scripts/dev-link.mjs
npm test --prefix thincoder-core
npm run lint --prefix thincoder-cli
npm test --prefix thincoder-cli
npm run lint --prefix thincoder-vscode
npm test --prefix thincoder-vscode
npm test --prefix thincoder-desktop
npm run prepublishOnly --prefix thincoder-server
```

这些是 mock/local integration，不会请求真实 OAuth 或推理。auth 测试生成临时 RSA/EC 密钥、临时 HOME/store，
使用本地 HTTP callback；多进程刷新真的启动两个子进程，服务响应仍为合成 fixture。

打包检查（不安装远端包、不发布）：

```sh
npm pack --ignore-scripts --pack-destination /tmp/thincoder-packs ./thincoder-core
npm pack --ignore-scripts --pack-destination /tmp/thincoder-packs ./thincoder-cli
```

在临时 node_modules 解包二者并以临时 HOME 运行 packed CLI 的 `auth add` / `auth status`，应显示 disabled，
无登录和推理。本批已完成该检查，auth/service、auth/client、Responses helper 与 sidecar 均在 core tarball 内。
这不能替代 VSIX/Electron 安装包验收。

## 待授权的真实账户验收

使用有资格且愿意授权应用的测试账户。先记录测试目的和可能消耗的 ChatGPT app usage，
由账户持有人完成 OAuth grant；不要把 token、回调 URL、auth 目录或 auth.json 上传为测试证据。

- [ ] `thincoder auth add`，`thincoder auth enable`，`thincoder auth login`；观察系统浏览器，取消/超时都能重新尝试。
- [ ] `auth status` 区分 disabled / signed_out / signed_in_without_plan_scope / authorized / reauth_required / usage_limited。
- [ ] 首次注册使用 dynamic seed；后续登录使用 issued client；`login --new` 明确另加账户。
- [ ] 目录真实返回 models[]，顺序/显示名正确；选模型后只发 /v1/responses，没有 Chat Completions fallback。
- [ ] 一次简短文本 + 一次只读本地工具 + 一次图片（模型支持时）；确认 store:false、stream:true、无禁用字段。
- [ ] 两轮工具调用后重启，reasoning/phase/function output 保留且没有重复执行。
- [ ] 停止/断网/usage limit/无资格/缺 scope 均不转 API Key，不重复执行工具，不把 partial 当成功。
- [ ] 两客户端同时刷新，只发生一个旋转事务；执行中关闭功能/切账户/退出，旧消费者被取消。
- [ ] 确认远端撤销报告；撤销不明时 UI 只宣称本地退出。
- [ ] CLI、local VS Code、Desktop 同机共享账户；webview/renderer IPC 与日志不含敏感字段。
- [ ] Remote SSH/Dev Containers 登录被明确拒绝，没有建议复制凭据的路径。

## 平台与发布门

- [ ] Windows 实机验证新建及已有凭据文件 ACL、两进程并发、浏览器 callback、退出撤销。
- [ ] Linux/macOS GUI 系统浏览器及取消路径；本批只验证 Linux 下 Node 逻辑。
- [ ] VSIX 打包后检查核心 auth 模块、CLI 入口与所有相对 import；安装运行账户 UI。
- [ ] Desktop per-platform 打包，检查 materialized core 包及 sandbox/preload bridge；安装运行账户 UI。
- [ ] 注册表中的新 core 版本先发布；三端依赖随后升级，再发布消费者。当前版本号未为实验分支提前 bump。
- [ ] 真实 acceptance 通过前，保持 auth.enabled 默认 false，文案保持 experimental。

不应直接发布本分支原版本号包：本地 pack 使用现有版本号只验证内容，不能证明 npm 上同版本包含这些变更。
CLI release:check 的 registry 预检未用于宣称本分支可发布；本批分别执行了本地 lint/test。

## 回滚与恢复

`auth disable` 阻止请求并持久暂停账户；status/logout 不受功能开关阻挡。禁用不等于撤销，退出仍需单独执行。
回滚代码不需要修改旧 openai 预设。旧客户端忽略 sibling native sidecar；新版回来时核验 schema、会话身份与历史摘要。
不要删除或手工改写损坏/未知 journal 来绕过执行门：先核对文件/工具副作用，再由用户明确开始新会话。
本版本对崩溃缺失结果采用阻断与现场保留，不提供自动结果恢复，也不承诺 exactly-once。
