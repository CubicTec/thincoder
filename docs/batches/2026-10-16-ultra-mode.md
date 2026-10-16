# Astra Ultra 本地接入（2026-10-16）

用户要求 ThinCoder 支持 Astra Ultra，并说明此前为何只到 max。
此前只接入普通 Responses 推理档位，账号目录中的 Ultra 被过滤。本批补齐本地主动委派语义，
保留 ThinCoder 现有子代理工具与调度方式。

## 契约与来源

- [Astra 模型页](https://developers.openai.com/api/docs/models/gpt-6-astra)：普通 effort 为 low / medium / high / xhigh / max。
- [Codex 档位转换源码](https://github.com/openai/codex/blob/6ae8b8aa7c608730d4315d59c5c081897ae02780/codex-rs/protocol/src/openai_models/reasoning_effort.rs)：Ultra 按账号 `multi_agent_reasoning_effort` 归一，缺失或非法时依次回退 max、最后一个普通档、medium。
- [Codex 本地模式选择](https://github.com/openai/codex/blob/6ae8b8aa7c608730d4315d59c5c081897ae02780/codex-rs/core/src/session/multi_agents.rs)：Ultra 选择主动多 Agent 模式。普通模型请求结构不包含托管 `multi_agent`。
- [ChatGPT 登录预览限制](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations)：该渠道不支持托管 `multi_agent` 字段，允许客户端通过工具协调本地子 Agent。本批保持此边界。

当前账号实读：Astra 与 6.1 Sol 提供 Ultra，二者映射为 `xhigh`；Luna 不提供 Ultra。
映射按账号目录动态读取，不静态写成 max，不声称 Ultra 是更高的单模型推理档位。

## 改动与消费面

| 文件 / 符号 | 结果 |
|---|---|
| `provider/model-info.mjs` / `parseModelInfo` | 保留账号明确提供的 Ultra；保存独立的合法 `ultraReasoningEffort` |
| `provider/responses-request.mjs` / `buildBody` | 只在发包时转换 Ultra；所选值、会话和配置保持 Ultra；不发送托管 multi_agent |
| `agent/ultra-mode.mjs` / `syncUltraModeReminder` | 主代理用现有 subagent 主动处理独立任务；真实工具表、深度、模型与档位决定生效 |
| `agent/setup.mjs` / `agent/chat-call.mjs` | 运行准备及 Auto 分类后同步模式；切出模式不保留旧提示 |
| `prompts/ultra-mode.md` 及中文权威面 | 保留用户不委派要求、角色、权限、并发和工程约束；不覆写子模型或 Auto |
| `cmd-think.mjs` / `slash-commands.mjs` | Ultra 选项、快捷命令、账号感知补全；回执显示本地模式和实际模型档位 |
| 模型规格、Agent Loop、TUI 命令文档 | 登记上述单一职责与兼容边界 |

文档影响脚本已执行。其旧扫描配置仅命中历史批次，当前权威文档按实际消费符号核对。

## 验证

自动回归：core 252、CLI 46、VS Code 14、desktop 23，共 **335 项通过**；
CLI 136 个源码文件语法检查通过，`git diff --check` 通过。
新增用例覆盖账号映射及回退、错误渠道与能力撤销、真实运行准备/切档/压缩后的提示生命周期、
Auto 分类与历史所有权、会话重启和账号切换时的菜单竞态。

真实账号 CLI 菜单：`/think ultra` 选择、保存、退出重启后均显示 Ultra 与 `xhigh`；
主 Auto 保持关闭，6.1 Sol 子模型及子 Auto 保持启用。两次目录 GET 均为 200，无推理请求。

真实 PTY one-shot：Astra 自主发起两个独立只读 explore，两个 6.1 Sol 子代理经 Auto 分类后
选用 `high`，各自读文件并给出正确缺陷。共 8 次 POST 均为 200 且 completed；根请求为
`xhigh` 并带 Ultra 提示，子请求不带 Ultra 提示，不发送托管 `multi_agent` 或输出上限。
首轮非交互 stdin 的相同尝试被原权限门拒绝；改用 PTY 明确批准两个只读任务后通过。
权限拒绝记录保留，不计为协作成功。one-shot 未完成自动回报后的主汇总，此项以交互 TUI 单独验收。

真实交互 TUI：Astra 自主委派一个 explore 审查 `alpha.py`，同时审查 `beta.py`；
6.1 Sol 经 `low` 分类后以 `high` 执行。主代理读代码核实并正确报告两处缺陷；
随后自动 digest 消费子报告，明确确认独立审查支持原结论。8 次 POST 全部 200/completed，
最终 digest `ok:true`、待处理与运行中任务均为 0，正常退出 0。真实用户配置与 fixture 均未改动。
首次 TUI 驱动漏识别复用标题的第二个审批，只有 1 次父请求；修正驱动后才完成上述验收，
失败记录单独保留，未修改产品权限模型或反复推理以凑指定子任务数量。

本地安装包 `0.12.74-local.2f5494f6` 已验证并启用。包内 475 个文件齐全，
473 个非 metadata 文件与源码提交逐字节相同；两个 Ultra 文件均包含，安装目录与包一致。
安装后的 `/think ultra` 选择、保存、重启恢复再验通过，无推理请求。
默认主模型 Astra 已设为 Ultra，主 Auto 关闭；子模型 6.1 Sol 及子 Auto 保持启用。

## 边界

Ultra 复用 ThinCoder 的本地编排，普通子代理不递归创建新代理；不引入 Codex 的调度器。
完整异步回报与主汇总依赖交互 TUI 的 suspension/digest。`chatCommand` 单次命令仅执行一轮
`runAgent`；headless 不等待仍在运行的子任务，沿用现有 `AGENT-LOOP-ASYNC-POOL` 的宿主边界。
本批不以 one-shot 的子报告输出冒充主代理闭环，不用 `async:false` 绕过顶层异步约定。
Auto 仍按原难度映射选择普通 effort，不自动选 Ultra。用户的 6.1 Sol 子模型及子 Auto 保留。
账号能力不足或撤销 Ultra 时，显式 Ultra 在请求前报错，不静默回退。
本批不是对模型质量的基准比较，也不声称 Ultra 对所有任务都优于 max。

## Luna Auto 与主模型组合验证（2026-10-16 续批）

用户追加验证 Luna Auto 子代理，以及主模型 6.1 Sol Auto、6.1 Sol Ultra、Astra Auto。
检查发现目标渠道配置中的 Ultra 会在创建 Luna 子代理时被继承；Auto 分类成功时能覆盖它，
但分类失败、超时或无法解析时会留下非法值，导致正式请求被本地校验拒绝。

`buildSpawnChild` 现在标记初始化继承值，`refreshAgentModelInfo` 首次成功加载精确账号目录后
只清除该模型不支持且绑定未变化的继承值，使请求回退到模型默认档位。
主代理、合法继承值、后续显式设置及后续目录能力撤销仍保持原有校验；
不依靠静态表判断冷启动的 Sol Ultra。契约见 `MODEL-SPECS.md` §19.3。

实际 spawn → 目录刷新 → Auto 无法解析 → 正式请求的负例已在修复前复现。
修复后该链路发送 `low` 分类请求和 `medium` 任务请求，父代理 Ultra 保持不变。
新增 10 项回归，定向检查 48/48 通过；最终 core 262、CLI 46、VS Code 14、desktop 23，
合计 **345 项通过**，CLI 136 个源码语法检查和 diff-check 通过。
核心全套首次因沙盒禁止本机回调端口而中断，独立绑定探针确认 `EPERM`；
获得沙盒外执行授权后完整通过，保留两次记录，不将环境失败记作产品通过。

真实交互 TUI 使用最终安装包，四组均固定一个只读 explore 子任务，子模型为 Luna Auto。
这轮验证模型配置、自动选档和异步结果汇总，不以明确要求委派的任务证明主动委派能力。

| 主模型模式 | 实际主任务 effort | Luna 实际任务 effort | 最终有效轮 POST | 结果 |
|---|---|---|---:|---|
| 6.1 Sol Auto | low | low、high | 10 | 通过 |
| 6.1 Sol Ultra | xhigh，带 Ultra 提示 | low | 9 | 通过 |
| Astra Auto | low | high | 9 | 通过 |
| Astra Ultra | xhigh，带 Ultra 提示 | low | 7 | 通过 |

四组最终有效轮共 35 次 POST，全部 200/completed；Auto 分类请求均为 low，
Luna 普通请求均为合法档位且不带 Ultra 提示。四组均正确读取独有 marker、核对 `7 × 6 = 42`，
完成自动 digest、确认回执和自然 idle，退出码为 0。每组仅原生批准一次指定只读任务，
权限 AUTO 始终关闭；未发送托管 `multi_agent` 或输出上限。测试期间真实配置和 fixture 未改动。

保留两个未通过的驱动 attempt：Sol Auto 首次因隔离配置漏复制 `format` 停在模型选择器，
0 次推理；Astra Auto 首次 10 次请求均成功，但第 11 次最终汇总请求在 fetch 前被测试预算拦截。
修正配置字段后完成 Sol Auto；有依据地将 Astra Auto 新 attempt 上限设为 16，
实际 9 次即完成，未重跑已通过组合。含预算受限 attempt，总计实际发送 45 次 POST，均为 200/completed。
原始失败记录和各 attempt 汇总完整保留，不把中断轮记作通过，也不以此作质量或速度排名。

本地包 `0.12.74-local.2b4ca214` 已安装并设为默认入口。473 个非 metadata 文件与源码
提交 `2b4ca2144de95473b333adc236bca7690556e59c` 逐字节相同；包内全部 475 个文件与安装目录一致，
版本和 help 冒烟通过，独立复核无遗漏或额外文件。全部实测完成后，仅将真实子模型改为
`openai-chatgpt:gpt-6-luna`，子 Auto 保持启用；默认主模型仍为 Astra Ultra，主 Auto 保持关闭，
其余配置逐项比对不变。已有 TUI 需退出并重启，才能使用新包和新子模型配置。
