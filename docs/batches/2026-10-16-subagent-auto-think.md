# 子代理自动推理强度

## 目标与范围

让本地 ThinCoder 的 `gpt-6.1-sol` 子代理根据任务自动选档；主代理设置保持独立。仅扩展既有 Auto 分类与 spawn 配置，不实现 Ultra、不发布 npm 包。

需求与设计权威：`docs/core/requirements/AGENT-LOOP.md` §4.19、`docs/core/design/AGENT-LOOP.md` §6.19、`docs/core/design/CONFIG.md` §6.6。

## 受影响文件

开工前执行 `thincoder-cli/scripts/doc-impact.mjs --base HEAD --files ...`。有效影响面为上述配置与循环文档；历史批次和其他引用档不批量修改。

| 文件 | 作用 |
|---|---|
| `thincoder-core/auto-think.mjs` | reasoning-only 分类、取消与回写保护 |
| `thincoder-core/agent/chat-call.mjs` | 传递任务取消信号与 depth |
| `thincoder-core/config.mjs` | 子代理 Auto 可空布尔配置 |
| `thincoder-core/agent-tools/settings.mjs` | 配置形状校验 |
| `thincoder-core/agent-tools/subagent-spawn.mjs` | 子配置覆盖与父状态隔离 |
| `thincoder-core/test/auto-think-reasoning.test.mjs` | 实际 Responses 请求链、分类失败与取消 |
| `thincoder-core/test/subagent-auto-think.test.mjs` | 配置载入与写入、五种 spawn 角色及父状态隔离 |

## 验证记录

- 修复前新增分类测试 5 项失败；spawn 到模型请求的集成验证失败（只有一次任务请求，缺少分类）。
- 配置与 spawn 的 8 项新增测试也先确认在旧实现上失败。修复后新增分类 12 项、配置 8 项全部通过。
- 核心 237、CLI 39、VS Code 14、桌面端 23，共 313 项通过；CLI 136 文件语法检查及 `git diff --check` 通过。首次核心全量运行因沙箱禁止 `127.0.0.1` 回调监听失败；确认 `listen EPERM` 后，在允许本地回环端口的环境重跑通过。
- 真实 ChatGPT 账号、`gpt-6.1-sol`：单函数改名任务自动选 `low`（2869 ms）；分布式并发故障诊断任务自动选 `max`（2962 ms）。两次分类本身均为 `low` 请求，HTTP 200、完整完成，无工具、无输出上限；用户配置哈希未变。
- 独立只读复查未发现必须修复问题；相关分类、子代理及既有辅助调用回归 41 项通过。

本地安装包和安装验收清单由工作区 `packages/` 保留；不修改源码包的正式版本号，不向 npm 发布。

## 边界

Auto 每个新任务增加一次简短分类请求；不是无额外用量的服务端 `auto` 参数。复杂任务可选到 `max`，分类失败仍使用现有档位或模型默认。主代理 Auto 保持原值。
