# OpenAI ChatGPT 认证与 Responses 设计

> 归属：core / 供应商与模型。需求：[OPENAI-CHATGPT](../requirements/OPENAI-CHATGPT.md)。
> 上游设计：[PROVIDER](PROVIDER.md)、[CONFIG](CONFIG.md)、[SESSION](SESSION.md)。
> 批次：[2026-10-15-openai-chatgpt](../../batches/2026-10-15-openai-chatgpt.md)。

## 契约基线

源码基线 dbd07a5bd6e5a59e60f97bdd82345904f434f285。2026-10-15 独立核验以下官方材料；
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

- auth/service.mjs 负责状态与请求期凭据；login.mjs 负责临时 127.0.0.1 listener、PKCE S256、state/nonce、取消和超时。
- oidc.mjs 固定 issuer/discovery/authorization/token/resource，限制可信 endpoint，验证 RS256/ES256 签名、issuer、aud/azp、时间与 nonce；未知 kid 重新取 JWKS。
- credential-store.mjs 负责 owner-only 存储、拒绝符号链接、原子替换/fsync、跨进程租约锁。唯一恢复标记阻止两个 stale reaper 删除新锁。
- tokens.mjs 保留完整 token set、scope 与刷新时间。refreshPending 在 token POST 前持久化；响应丢失/进程崩溃时不得重放可能已轮换的旧 refresh token。
- 明确 invalid_grant 清无效 token set 并要求重新登录；明确临时拒绝保留凭据。未知刷新结果保留现场但锁定为 reauth_required。
- 首次 code exchange 的 invalid_grant 可在下一次显式登录复用 memory-only issued client ID，10 分钟后过期；尚未验证的注册不会成为 profile。显式新账户清除此候选。
- 同机 host ID 是 urn:uuid UUIDv4；身份绑定 issuer/subject/issued client/host/session，邮箱只展示。退出区分本地删除与远端撤销是否确认。
- thincoder-core/auth/client.mjs 是三端唯一 intent/status adapter，白名单投影元数据。renderer/webview 不拿 token、授权 URL、PKCE 或回调参数。

普通 config 只存 auth.type、enabled、credentialRef。provider/auth-context.mjs 在调用时取得短期凭据，
只允许官方 GET /v1/models、POST /v1/responses，禁重定向、端点及 headers 覆写。认证方式不靠 hostname 猜测。
显式订阅选择失效时拒绝，不自动改用 API Key 计费。关闭功能会持久化账户暂停并取消在途消费者。
文件权限不能隔离以同一 OS 身份运行的恶意代码；Windows ACL 逻辑已实现但必须再做真实 Windows 验收。

## Responses 与会话

capabilities.mjs 按认证方式校验 SIWC 禁用字段；必须 input 数组、store:false、stream:true。
responses-tools.mjs 为本地工具构造显式 namespace 映射；别名碰撞失败，未声明 strict 默认 false；
显式 strict 的 schema 不满足约束则拒绝，不擅自改变业务 optional 字段。现有执行权限门保留。
responses-stream.mjs 处理 SSE 多行、CRLF、UTF-8 分片、末帧、超时、参数聚合和去重。
官方流只有 response.completed 才释放工具；failed/incomplete/EOF/断流保留部分展示但不成功、不执行工具。
不明网络结果不自动重发；API Key 的链恢复只认明确 previous_response_id 丢失错误。

responses-session.mjs 把原生可回放 items 放在 `{slot}.responses.json`，独立于旧版可能重建的 `{slot}.d`。
记录 schema、会话身份、账户、endpoint、model、历史前缀摘要；encrypted_content、namespace、phase 保留。
旧版仍可使用显示历史；未知 schema 或损坏 journal 保留原字节并阻止 Responses 推理。
槽复用时旧身份 sidecar 改名保留；新客户端删槽/轮转联动 native sidecar。子代理使用独立持久化 journal。

工具执行前落 executing；执行后先落 results_ready，再经现有 recordToolResults 提交。
完成事务记录结果以去重，并验证重启后的 history checkpoint。缺失工具结果、未知结果或损坏记录时明确阻断，
要求核对副作用后开始新会话，不声称 exactly-once，也不自动重跑。此版本不提供跨崩溃自动补写结果。
所有压缩、蒸馏、裁剪和缩短只在完整工具事务边界执行；未知结果或未知 schema 时，在请求摘要和修改历史前阻断。
请求发送前校验完整 native/visible replay 的函数调用与输出配对；不得留下孤立、重复或缺少输出的交换。
成功压缩/蒸馏建立明确 checkpoint；模型、账户、endpoint 或历史变化时从可见历史重建，并警告 opaque reasoning 未迁移。

## 辅助调用与客户端

标题对订阅采用本地首句，API Key Responses 标题经共享流式入口。压缩、蒸馏、auto-think、goal、advisor
使用 completed 守卫，失败的部分摘要不得替换历史或提交状态。advisor 的独立工具循环也保留原生 replay，压缩时显式重建。
CLI、VS Code、Desktop 的账户入口复用 adapter；本地系统浏览器处理登录。Remote SSH/Dev Containers 登录不支持。
models[] 保持服务端顺序与显示名，listModels 兼容 ID 返回；账户目录无跨账户缓存。
usage limit 在共享 profile 元数据持久暂停账户，并取消同机消费者；刷新、目录和推理均受门控。
仅显式恢复、重新选择或经过验证的登录清除暂停；另一个客户端恢复后原客户端也可继续。
并发 quota 报告共用在途落盘操作；若共享暂停无法保存，报告客户端保持本地阻断并显示不含存储细节的错误。
UI 分开显示配置、身份授权和最近 completed 推理；未获知金额不代表免费或 $0。

## 合并与发布

依赖顺序、实际验证、包检查、回滚及待验清单见批次档。默认关闭；真实合资格账户、三端 GUI、Windows ACL、
VSIX 与 Desktop 安装包未验收前均保持实验性。没有新增第三方运行时依赖。
