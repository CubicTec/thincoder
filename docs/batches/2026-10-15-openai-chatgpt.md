# 2026-10-15 OpenAI ChatGPT 计划接入

> 归属：core / provider + CLI / VS Code / Desktop。作者：本批实施者。
> 需求：[OPENAI-CHATGPT](../core/requirements/OPENAI-CHATGPT.md)。
> 设计：[OPENAI-CHATGPT](../core/design/OPENAI-CHATGPT.md)。

## 1. 用户范围与基线

用户要求在 CubicTec/thincoder fork 实施 ThinGPTplan，并按方便 upstream PR 的粒度拆分。
基线 dbd07a5；分支 feat/openai-chatgpt-plan。未获准真实登录、导入凭据、付费推理或发布。

## 2. 受影响文件

实施结束后按真实 git diff 逐文件登记。核心认证、provider、会话与辅助请求；三端账户入口；本文及配对文档。
仓库要求的 scripts/doc-impact.mjs 在基线不存在（MODULE_NOT_FOUND），已按源码调用图人工反查影响面。

## 3. 契约与决策

官方 SIWC 页面核验成立；认证/协议分离、默认关闭、精确端点约束、无隐式计费回退。
标题采用本地降级。earliest_refresh_at 仅在官方语义可核验时解释；未知格式不得猜测单位。

## 4. 实施记录

正在实施，不能视为已完成或已发布。每一代码提交包含对应自动化场景，无故意红测提交。

## 5. 验证

最终收口填写实际命令、通过数、失败与未执行项。禁止真实凭据进入测试 fixture。

## 6. 发布与回滚

本批不发布 npm/VSIX/Desktop、不发 upstream PR。关闭 auth.enabled 阻止新 SIWC 请求，
status/logout 仍可用。旧 openai 入口不变。真实账户推理、GUI 与平台安装包验收均待用户授权与环境。
