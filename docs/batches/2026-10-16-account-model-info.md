# ChatGPT 账户模型规格自动配置（2026-10-16）

## 1. 目标与范围

用户要求三款模型使用实际上下文窗口，并自动适配模型能力；参考 OpenAI 官方资料和
Codex CLI 的字段语义，保持 ThinCoder 现有模块边界、配置优先级与文档方式。
对象为 `gpt-6-astra`、`gpt-6.1-sol`、`gpt-6-luna`，交付面为本地 CLI 与共享核。
不新增依赖，不发布版本，不改用户配置文件。

本批接续 [首轮兼容测试](2026-10-16-model-compatibility.md)。首轮 128000 / 32000
保守预算策略在本批退场；首轮真实推理及小图识别失败记录仍作为历史证据保留。

## 2. 来源与设计判断

| 来源 | 本批采用的事实 |
|---|---|
| [Astra 模型页](https://developers.openai.com/api/docs/models/gpt-6-astra) | API 窗口 1050000、最大输出 128000；图片输入、五档 effort、默认 medium |
| [6.1 Sol 模型页](https://developers.openai.com/api/docs/models/gpt-6.1-sol) | 同上；工具调用走 Responses |
| [Luna 模型页](https://developers.openai.com/api/docs/models/gpt-6-luna) | 同上，API 还支持 none |
| [SIWC 模型与推理](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference) | 用所选账号令牌取模型目录；遵守服务端顺序、slug 和可见性；推理使用流式 Responses |
| [SIWC 预览限制](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations) | 账号推理不发送 max_output_tokens 等不支持字段 |

扩展目录字段尚无完整的公开 SIWC 稳定 schema。本批参考官方 Codex 固定提交
`a45b8ccb016fb74f63a6bc29e701568e387cbe38` 的
[ModelInfo](https://github.com/openai/codex/blob/a45b8ccb016fb74f63a6bc29e701568e387cbe38/codex-rs/protocol/src/openai_models.rs)
与 [reasoning effort](https://github.com/openai/codex/blob/a45b8ccb016fb74f63a6bc29e701568e387cbe38/codex-rs/protocol/src/openai_models/reasoning_effort.rs)
处理语义，仅提取当前客户端可执行的字段。`context_window` 是所用窗口，
`max_context_window` 只在前者缺失时补位；`ultra` 涉及多 agent 模式，不作为普通 effort 透传。

沿用 `providerSpec` 作为消费面，不另建持久配置或全局账号规格表。
合并规则、刷新周期、异常语义和字段归一单源见
[MODEL-SPECS §19](../core/design/MODEL-SPECS.md#191-规格合并与生命周期)。
目录提示词、服务端工具定义和指令不进入本地运行规则。

## 3. 受影响面

| 面 | 改动与原因 |
|---|---|
| 目录 / 规格 | `parseModelInfo`、`recordModelCatalog`、`providerSpec`：按账号隔离、字段白名单、真实窗口覆盖、用户覆盖优先 |
| 运行准备 | `refreshAgentModelInfo`、`prepareRun`：运行前装载，局部重算自动压缩阈值，避免共享父配置被子代理改写 |
| 图片工具 | 保留经宿主过滤的 read_image 候选；注册、执行、结果入历史与子代理继承按同一 provider 规格判断 |
| 子代理凭据 | 复用认证配置的就绪判据；有效 OAuth 子代理不再因没有 API key 被拒绝 |
| 会话恢复 | 目录到位后恢复当前槽的有效 effort；旧异步请求不能覆盖新模型、会话或用户设置 |
| Responses | 目录默认 effort、显式档位校验、none 编码；继续禁发账号不支持的参数 |
| 内部摘要 | 无 off 路径的 effort 模型延续回合设置；其他模型保持既有摘要行为 |
| CLI | 启动、切模、切槽、/think 装载目录；显示准确 token 数与来源；错误留在 TUI 可见区域 |

文档反查使用仓库实际脚本 `thincoder-cli/scripts/doc-impact.mjs`，基准 `87416ec2`。
主要影响档为 MODEL-SPECS、PROVIDER、CONFIG、SESSION、TUI、TUI-COMMANDS。
规格机制正文集中在 MODEL-SPECS；相关契约只补回指，避免多份公式与能力清单漂移。

## 4. 验证

真实 CLI 使用独立 HOME、项目与会话，认证仍由同机 ThinCoder AuthService 提供；
未复制令牌，未启用自动批准，用户原配置的 SHA-256 在验收前后相同。

| 模型 | 账号窗口（tokens） | 自动压缩阈值 | 目录默认 / 实际请求 effort | 重启与图片工具 |
|---|---:|---:|---|---|
| `gpt-6-astra` | 272000 | 86400 | medium / medium | 通过 |
| `gpt-6.1-sol` | 500000 | 223200 | low / low | 通过 |
| `gpt-6-luna` | 272000 | 86400 | medium / medium | 通过 |

三个模型的输出预留均为 128000。启动后直接从 `/config` 读阈值，重启后先读阈值、再选模型，
避免第二次选模掩盖启动漏算。`/model` 回执均标记 `account catalog`；
`/think` 均列出 low / medium / high / xhigh / max 五档，默认档未写入配置。

每个模型完成一次 `read_image`、一个匹配工具结果，并正确回答 768×384 红蓝图的左右颜色。
每个模型两次推理请求，共六次，均 HTTP 200、`response.completed`，全部进程退出码 0；
请求中的 effort 与上表相符，均无 `max_output_tokens`。
驱动首轮仅截到菜单可视首项，后通过方向键补读全部档位；没有重复已完成的推理。

离线回归覆盖字段畸形、账号隔离、TTL 与失败重试、手动覆盖、共享父配置、冷会话恢复、
切换时的旧请求、工具候选和宿主排除、默认 effort / none 编码，以及真实摘要流程。
新增 Qwen 摘要回归保证旧渠道继续发送 `reasoning_effort: "none"` 和 `enable_thinking: false`。
最终仓库检查：core 217 / CLI 39 / VS Code 14 / desktop 23，共 293 项全部通过；
CLI 136 个文件语法检查通过，`git diff --check` 通过。目录声明不等于最大窗口边界压力测试。

## 5. 边界

API 的静态最大输出只用于既有输出预留算法，不作为 ChatGPT 账号输出上限的声明。
当前账号不提供 none 时，CLI 不提供关闭思考动作；未实现 Codex 的 ultra 多 agent 模式。
未做百万 token 输入压力测试，也未使用 API key 对三款模型另行计费验收。
GUI 专属菜单与发布制品不在本批交付范围内。
