# OpenAI ChatGPT 认证与 SIWC 限制设计

> 归属：core / 供应商与模型。需求：[OPENAI-CHATGPT](../requirements/OPENAI-CHATGPT.md)。
> 通用传输：[PROVIDER](PROVIDER.md) §6.13；会话状态：[SESSION](SESSION.md) §6.27；配置：[CONFIG](CONFIG.md)。
> 历史批次：[2026-10-15-openai-chatgpt](../../batches/2026-10-15-openai-chatgpt.md)。

## 契约基线

历史核验基线为 dbd07a5bd6e5a59e60f97bdd82345904f434f285。2026-10-15 独立核验以下官方材料；
siwc-2026-10-15 是本地能力快照，不是官方 API 版本或请求头。

- [Registration and sign-in](https://developers.openai.com/siwc/token-sharing-open-source/sign-in)
- [Models and inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference)
- [Preview limitations](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations)
- [Token reference](https://developers.openai.com/siwc/token-sharing-open-source/token-reference)
- [Accounts and sessions](https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions)
- [Errors and recovery](https://developers.openai.com/siwc/token-sharing-open-source/errors-and-recovery)

`earliest_refresh_at` 文档未定义数字单位。官方 devkit 的固定版本明确将数字乘 1000 后与 Date.now 比较，
字符串用 Date.parse：因此数字按 Unix 秒，日期字符串按可解析日期；不按数值大小猜测毫秒，不把数字字符串当秒。
无法解释的值阻止提前刷新并提示重新登录。
[固定源码证据](https://github.com/openai/sign-in-with-chatgpt-devkit/blob/0a36fefeb913055c8c7a1a29b63d82b96b2e841a/packages/local/src/index.ts#L99-L102)。

## 分层与安全边界

- `auth/service.mjs` 的 `AuthService` 是账户生命周期、请求期凭据及临时推理/额度状态的唯一来源；`login.mjs` 负责临时 127.0.0.1 listener、PKCE S256、state/nonce、取消和超时。
- oidc.mjs 固定 issuer/discovery/authorization/token/resource，限制可信 endpoint，验证 RS256/ES256 签名、issuer、aud/azp、时间与 nonce；未知 kid 重新取 JWKS。
- credential-store.mjs 负责 owner-only 存储、拒绝符号链接、原子替换/fsync、跨进程租约锁。唯一恢复标记阻止两个 stale reaper 删除新锁。
- tokens.mjs 保留完整 token set、scope 与刷新时间。refreshPending 在 token POST 前持久化；响应丢失/进程崩溃时不得重放可能已轮换的旧 refresh token。
- 明确 invalid_grant 清无效 token set 并要求重新登录；明确临时拒绝保留凭据。未知刷新结果保留现场但锁定为 reauth_required。
- 首次 code exchange 的 invalid_grant 可在下一次显式登录复用 memory-only issued client ID，10 分钟后过期；尚未验证的注册不会成为 profile。显式新账户清除此候选。
- 同机 host ID 是 urn:uuid UUIDv4；身份绑定 issuer/subject/issued client/host/session，邮箱只展示。退出区分本地删除与远端撤销是否确认。
- `thincoder-core/auth/client.mjs` 是三端唯一 intent/status adapter，只依赖认证服务与配置读写，白名单投影元数据，不依赖 provider 模块。renderer/webview 不拿 token、授权 URL、PKCE 或回调参数。

普通 config 只存 auth.type、enabled、credentialRef。provider/auth-context.mjs 在调用时取得短期凭据，
只允许官方 GET /v1/models、POST /v1/responses，禁重定向、端点及 headers 覆写。认证方式不靠 hostname 猜测。
显式订阅选择失效时拒绝，不自动改用 API Key 计费。关闭功能会持久化账户暂停并取消在途消费者。
文件权限不能隔离以同一 OS 身份运行的恶意代码；Windows ACL 逻辑已实现但必须再做真实 Windows 验收。

## SIWC 请求限制

认证方式统一由 `provider/auth-config.mjs` 的 `isChatGptProvider` 判断，不从 hostname 推断。
`provider/capabilities.mjs` 只维护 SIWC 字段政策，在取凭据与发送前校验；必须 `input` 数组、
`store:false`、`stream:true`，发送完整上下文，不使用 `previous_response_id`。
拒绝 `max_output_tokens`、`temperature` 等快照未支持字段，不将 API Key 的链与留存策略套入订阅请求。
本地函数分 namespace 声明，当前不启用服务端 hosted tools。官方成功终帧只认 `response.completed`。

通用工具映射、完整性、SSE 与重试规则以 [PROVIDER §6.13](PROVIDER.md#613-responses-api-transport) 为准；
native journal、工具事务、历史改写与恢复规则以 [SESSION §6.27](SESSION.md#627-responses-原生回放与工具事务) 为准。

## 辅助调用与客户端

标题对订阅采用本地首句，API Key Responses 标题经共享流式入口。辅助调用的完成与提交检查归 PROVIDER；
advisor 的独立工具循环也保留原生 replay，压缩时显式重建。
CLI、VS Code、Desktop 的账户入口复用 adapter；本地系统浏览器处理登录。Remote SSH/Dev Containers 登录不支持。
models[] 保持服务端顺序与显示名，listModels 兼容 ID 返回；账户目录无跨账户缓存。
usage limit 在共享 profile 元数据持久暂停账户，并取消同机消费者；刷新、目录和推理均受门控。
仅显式恢复、重新选择或经过验证的登录清除暂停；另一个客户端恢复后原客户端也可继续。
`AuthService.recordInference` 接收安全的结果元数据，`getInferenceStatus` / `clearInferenceStatus` 与
`getStatus.lastInference` 共用同一份状态；provider 只负责投影并委托。并发 quota 报告共用在途落盘操作；
若共享暂停无法保存，该服务继续阻断请求和刷新，迟到的成功不能解除暂停，客户端显示脱敏错误。
UI 分开显示配置、身份授权和最近 completed 推理；未获知金额不代表免费或 $0。

## 请求所有权与异步边界（2026-10-16 修正）

认证初始化、浏览器打开和落盘均可取消；已提交账户的完成结果不被后到取消伪装为未完成。
过期登录不得复活已退出/替换的 session。畸形本地存储、发现文档和 token 响应 fail closed，
未知刷新轮换结果保留阻断；外部错误先经 safeAuthError 白名单投影再进入三端。

显式保存的 openai-chatgpt 选择若已删除、禁用或缺少账户绑定，拒绝执行，不沿用有效 API Key 默认项。
UI 的账户/目录异步结果按 generation 或 requestId 丢弃陈旧快照；帮助链接不改变登录状态序列。
菜单关闭旧浮层，点选前复核当前目录，reasoning 选项按 provider + model 匹配。

## 合并与发布

当前发布顺序与证据要求见 [RELEASE](../../RELEASE.md#chatgpt-plan-实验接入发布门)。历史批次保留当时的验证、回滚和待验记录，不能代替当前版本验收。
功能默认关闭；真实合资格账户、三端 GUI、Windows ACL、VSIX 与 Desktop 安装包分别取得验收证据前保持实验性。认证与传输使用 Node.js 标准库，没有第三方运行时依赖。
