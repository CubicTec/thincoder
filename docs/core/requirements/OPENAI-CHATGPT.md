# OpenAI ChatGPT 计划接入需求

> 归属：core / 供应商与模型。设计：[OPENAI-CHATGPT](../design/OPENAI-CHATGPT.md)。
> 上游判据：用户 2026-10-15 提供的 ThinGPTplan 实施方案；保留现有 ThinCoder agent 与计费选择。
> 历史实施与验收记录：[2026-10-15-openai-chatgpt](../../batches/2026-10-15-openai-chatgpt.md)。

## 范围

本地 CLI、VS Code、本地 Desktop 复用核心 OAuth 与 Responses。新增显式选择的
openai-chatgpt、openai-responses 预设；旧 openai 和其他供应商保持既有协议与行为。
公共/商业托管、团队 token 池、个人 VM 凭据迁移、server 原生 Responses、WebSocket 不在本批。

## 验收要求

1. 认证与协议独立。config 仅持 auth.type、enabled、credentialRef；令牌仅在受保护认证存储及请求期使用。
2. 固定官方发行方、PKCE S256、随机 state/nonce、签名与 claims 验证、issued client ID、获授 scope 必须通过。
3. 稳定同机 host ID、原子 token set、进程内与跨进程刷新协调；临时故障保留凭据，退出报告远端撤销是否确认。
4. OAuth 仅可到达允许的官方端点，不跟随重定向，不接受自定义 Authorization，不自动转 API Key 计费。
5. SIWC HTTP 使用完整上下文、store:false、stream:true、namespace 工具；拒绝官方不支持字段与工具。
6. 只有 completed 是成功；failed/incomplete/EOF 保留可见部分内容但不执行工具。
7. 原生可回放 items 独立于展示消息持久化，绑定账户与模型；工具事务去重，崩溃不明副作用必须核对。
8. models[] 保持顺序与显示名；旧 listModels 返回 ID。登录、scope、目录成功、推理成功分开展示。
9. 标题不走订阅 Chat Completions；辅助推理共用认证/用量路径。无确定金额时不得展示为免费或 $0。
10. 新功能显式启用，可停用并保留退出入口；真实 OAuth、付费推理、发布均需独立授权及验收。

## 证据边界

合成凭据与模拟网络只能验证对应机制，不能代替真实合资格账户登录、推理和刷新。
三端 GUI、Windows ACL 与安装包按实际平台分别验收；未执行的检查保留为未验证。
代码检查、真实客户端验收和发布是独立结果，不得由任一项推断其余通过；执行读数记录在对应批次。
