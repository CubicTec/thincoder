# OpenAI ChatGPT 认证与 Responses 设计

> 归属：core / 供应商与模型。需求：[OPENAI-CHATGPT](../requirements/OPENAI-CHATGPT.md)。
> 上游设计：[PROVIDER](PROVIDER.md)、[CONFIG](CONFIG.md)、[SESSION](SESSION.md)。
> 批次：[2026-10-15-openai-chatgpt](../../batches/2026-10-15-openai-chatgpt.md)。

## 契约基线

源码基线 dbd07a5bd6e5a59e60f97bdd82345904f434f285，与 fork HEAD 相同。
2026-10-15 独立核验以下官方材料；预览策略是本地快照，不是官方 API 版本或请求头。

- [Registration and sign-in](https://developers.openai.com/siwc/token-sharing-open-source/sign-in)
- [Models and inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference)
- [Preview limitations](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations)
- [Token reference](https://developers.openai.com/siwc/token-sharing-open-source/token-reference)
- [Accounts and sessions](https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions)
- [Errors and recovery](https://developers.openai.com/siwc/token-sharing-open-source/errors-and-recovery)

## 分层与安全边界

AuthService 负责浏览器授权、验证、存储、刷新、取消、退出；客户端只调用统一 adapter。
Provider gateway 在请求时取得短期凭据，OAuth 不存入普通 provider 或 renderer。认证方式由 auth.type
选择，能力不靠 baseURL 猜测；无 auth 保持旧 API Key 行为。auth.enabled 必须显式为 true。
初始 host ID 使用官方支持的 urn:uuid UUIDv4；身份以 issuer/subject/issued client/host 绑定，邮箱仅展示。
文件后端保证原子替换和最小 OS 权限；不能抵御同一 OS 身份下任意执行的恶意代码。

## Responses 与会话

SIWC 只用公开 /v1/models 和 /v1/responses，禁止重定向及任意端点覆写。
请求工具经显式映射包装 namespace；原工具权限/执行器不变。能力校验拒绝不支持字段，
从有效终态输出取得完整调用。部分文字可展示，未完成工具不可执行，未知网络结果不自动重复付费请求。
原生 output items 与展示消息分离，版本、账户、模型、历史前缀共同绑定。工具事务执行前持久化，
已完成结果可去重；进程崩溃后的不明副作用要求人工核对，不声称 exactly-once。
压缩与账户/模型切换从可见上下文建立新检查点，不盲传 opaque reasoning。

## 辅助调用与客户端

标题对订阅采用本地首句降级，避免隐式额外用量；API Key Responses 标题使用共享流式请求入口。
所有已有 chat 调用（压缩、advisor、subagent 等）复用请求期认证，显式另选 API Key 的功能保持用户选择。
三端共享凭据存储与账户操作。UI 分开显示配置、身份授权与已验证推理，金额未知不等于零。

## 合并与发布

按契约、协议、认证、共享接线、CLI、多端、发布验收拆分绿色提交；不向 upstream 自动提 PR。
业务集成测试采用各包现存 runner：core 为 test/*.test.mjs 单层收集，产品使用集成清单。
不引入第三方运行时依赖。默认不启用订阅；真实账户/GUI/安装包验收未完成前保持实验性。
