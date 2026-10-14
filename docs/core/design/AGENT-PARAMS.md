# Agent 运行参数（AGENT-PARAMS）· 主循环与评审板块

> 板块 = **agent 运行参数**——评审墙钟超时 · 主 agent 轮次上限 · 子代理轮次。
> 本档 = 这三个参数族的**唯一权威**（默认值 / 读取链 / 坐标）。
> 相邻权威 = `docs/core/design/AGENT-LOOP.md`（主循环机制）· `docs/core/design/CONFIG.md`（配置面总体）· `docs/core/design/TOOL-OUTPUT-LIMITS.md`（另一族上限）——本档不复制其内容（D2）。
> 需求侧 = `docs/core/requirements/AGENT-PARAMS.md`（批 4 建档——源 = VSC 树需求档）；CLI 树需求档 `thincoder-cli/docs/requirements/AGENT-PARAMS.md` **未迁**（后续批）。
> 建档：2026-09-15（**B 式迁移轮 · 第 3 批**——`thincoder-cli/docs/design/AGENT-PARAMS.md` 内容重建入基准层；旧档原地一字不改、留作参照历史）。
> 本档坐标 = **as-of 2026-09-15 实核**（仓根 = `thincoder/`）。

## 1. 定位与问题

三项原为硬编码 / 过紧默认的参数，在真实使用中造成「误杀」与「过早中断」：

| # | 原现状 | 后果 |
|---|---|---|
| P1 | 评审整体墙钟 `REVIEW_TIMEOUT_MS` 硬编码 5 分钟，用户不可调 | 大评审（多文件 / 多轮工具探索 / 慢模型）5 分钟即被截断，返回 partial results |
| P2 | 主 agent 轮次上限默认 100 | 多文件重构 / 修复-验证循环频繁撞墙，需人工 Continue |
| P3 | 「默认 100」的文档与 UI 描述散落、未同步 | 改默认值后文档 / 显示与真实行为漂移 |

## 2. 评审墙钟超时（配置化 + 默认 600s）

- 默认常量：`REVIEW_TIMEOUT_MS = 600_000`（10 分钟）——`thincoder-core/advisor/compaction.mjs:42`。
- 循环内检查点读**配置**，缺省回退常量（`thincoder-core/advisor/loop.mjs:104`）：

```js
const timeoutMs = (Number.isFinite(cfg) && cfg > 0) ? cfg : REVIEW_TIMEOUT_MS
```

- **运行期校验**：手写 `config.json` 的非法值（0 / 负数 / 字符串）不得静默禁用或立即触发超时——**非法一律回退默认**。
- 读取链：`thincoder-core/config.mjs:335` 把 `merged.agent.advisor` promote 为 `merged.advisor`（decoupled copy）⇒ `agent.config.advisor.timeoutMs` 天然可见；`runAdvisorToolLoop` 已接收 `agent` 参数，**无需改签名**。
- **默认值单一来源**：**不**在 `DEFAULTS.agent.advisor` 写死 `timeoutMs`——默认值只住 `REVIEW_TIMEOUT_MS` 常量（`thincoder-core/advisor/compaction.mjs:42`），避免两处漂移（`thincoder-core/config.mjs:49` 的 advisor 默认块注释即登记 `timeoutMs` 为可覆盖项）。
- **TUI 不新增编辑项**：`/config` 不提供 `timeoutMs` 菜单——手写 `config.json` 即可。

## 3. 主 agent 轮次上限（默认 200）

- `thincoder-core/config.mjs:36`：`maxTurns: 200`（DEFAULTS）。
- `thincoder-core/agent/helpers.mjs:24`：`DEFAULT_MAX_TURNS = 200`（prepareRun 的兜底常量）。
- 读取链为**三级回退**（`thincoder-core/agent/setup.mjs:44`）：

```js
const maxTurns = overrideTurns ?? agent.config?.agent?.maxTurns ?? DEFAULT_MAX_TURNS
```

- TUI 显示兜底 `?? 200`（`thincoder-cli/src/tui/cmd-config.mjs:340` 状态头 · `:341` 菜单项 · `:366` 详情行 · `:438` 编辑初始值——四处）。
- **不动**的相邻参数：`goalTurns: 200`（goal 模式上限，独立语义——`thincoder-core/config.mjs:40` · `thincoder-core/agent/helpers.mjs:26`）· `DEFAULT_SUBAGENT_TURNS = 100`。

## 4. 子代理轮次（CLI 端无专属代码）

- 子代理轮次统一走 `agent.subagentTurns`，缺省回退 `DEFAULT_SUBAGENT_TURNS = 100`（`thincoder-core/agent/helpers.mjs:25`）。
- 读取点（三处同形）：`thincoder-core/agent-tools/subagent-async.mjs:387` · `thincoder-core/agent-tools/subagent-actions.mjs:418` · `thincoder-core/agent-tools/escalate-async.mjs:218`。
- 「30 硬帽」是 **VSC 端特有问题**，CLI 无（旧档语义说明，实体在 CLI 端无对应代码）。**VSC 端已移除**（见 §6.3 行 5）。

## 5. 参数总表（现行默认）

| 参数 | 键 / 常量 | 默认 | 落点 |
|---|---|---|---|
| 评审墙钟 | `agent.config.advisor.timeoutMs` → `REVIEW_TIMEOUT_MS` | 600 000 ms | `thincoder-core/advisor/compaction.mjs:42` · 读取 `thincoder-core/advisor/loop.mjs:104` |
| 主 agent 轮次 | `agent.maxTurns` → `DEFAULT_MAX_TURNS` | 200 | `thincoder-core/config.mjs:36` · `thincoder-core/agent/helpers.mjs:24` |
| goal 模式轮次 | `agent.goalTurns` → `DEFAULT_GOAL_TURNS` | 200 | `thincoder-core/config.mjs:40` · `thincoder-core/agent/helpers.mjs:26` |
| 子代理轮次 | `agent.subagentTurns` → `DEFAULT_SUBAGENT_TURNS` | 100 | `thincoder-core/agent/helpers.mjs:25` |
| 设计 token TTL | `agent.engTokenTtlMs` | 7 天 | 见 `docs/core/design/ENG-TOKEN-BINDING.md` §3（本表只列名，不重述） |

## 6. 机制面（B 式迁移并入——现状路径）

### 6.1 实现坐标（as-of 2026-09-15 实核）

| 面 | 落点 | 实核 |
|---|---|---|
| 评审默认常量 | `thincoder-core/advisor/compaction.mjs:42`（`REVIEW_TIMEOUT_MS` = 600 000） | 在位 |
| 评审读取 + 运行期校验 | `thincoder-core/advisor/loop.mjs:104` | `Number.isFinite(cfg) && cfg > 0` 回退 |
| advisor 配置 promote | `thincoder-core/config.mjs:335` | `merged.advisor = { ...merged.agent.advisor }` |
| advisor 默认块（含 timeoutMs 说明） | `thincoder-core/config.mjs:49` | 注释在位 |
| `maxTurns` 默认 | `thincoder-core/config.mjs:36` · `thincoder-core/agent/helpers.mjs:24` | 均 200 |
| `maxTurns` 三级回退 | `thincoder-core/agent/setup.mjs:50` | 在位 |
| TUI 显示兜底 | `thincoder-cli/src/tui/cmd-config.mjs:340` · `:341` · `:366` · `:438` | 四处 `?? 200` |
| 子代理轮次读取 | `thincoder-core/agent-tools/subagent-async.mjs:387` · `thincoder-core/agent-tools/subagent-actions.mjs:418` · `thincoder-core/agent-tools/escalate-async.mjs:218` | 三处同形回退 |

### 6.2 测试覆盖

- 评审超时：配置覆盖 / 回退 / 非法值回退三态（`thincoder-cli/test/` 的 advisor 族用例）。
- `maxTurns`：`thincoder-core/test/config.test.mjs:37` 断言 DEFAULTS 合并后 `maxTurns === 200`。（已随 2026-09-28 测试树全清退场——档不在盘）（迁移期引文）

### 6.3 VSC 端接线（B 式并入 · 实核 as-of 2026-09-15）

> 来源 = `thincoder-vscode/docs/_archive/design/AGENT-PARAMS-TUNING.md`（VSC 产品档——旧档一字未改、留参照历史）。VSC 端四参数与 CLI 语义同源、实现独立（各自文件清单独立）。

| 面 | VSC 落点（实核） |
|---|---|
| 评审超时默认 | `thincoder-core/advisor/compaction.mjs:42`（`REVIEW_TIMEOUT_MS` = 600 000） |
| 评审检查点（配置覆盖 + 非法回退） | `thincoder-vscode/src/advisor/loop.mjs:98`（`Number.isFinite(cfg) && cfg > 0` → 缺省回退常量） |
| advisor 配置读取链 | `thincoder-vscode/src/agent/setup.mjs:210`（初始 `{ guard: false }`）· `:232`（`raw.agent?.advisor ?? { guard: false }`） |
| 面板保存透传 timeoutMs（P4——不静默丢） | `thincoder-vscode/src/extension/settings-panel-write.mjs:64`（`saveAgentSettingsFromPanel`）· `:112`–`:116`（合法 payload 胜，否则保留 current——不合并会丢字段；`thincoder-vscode/src/config-io.mjs:26` re-export） |
| explore 30 硬帽已移除 | `thincoder-vscode/src/agent-tools/subagent.mjs:311`（`parent.config?.agent?.subagentTurns ?? 100`——无 `Math.min(30, …)`；与 async/escalate 路径一致） |
| maxTurns 默认 200 | `thincoder-vscode/src/agent/run-helpers.mjs:15` · `thincoder-vscode/src/config-io.mjs:313`（as-of 2026-09-29）（`AGENT_DEFAULTS`）· `thincoder-vscode/src/agent/setup.mjs:219`（初始）/ `:241`（读取兜底 `?? 200`） |
| 面板显示兜底 | `thincoder-vscode/webview/settings-agent.js:16`（`as.maxTurns ?? 200`） |
| 面板 UI 无 timeoutMs 输入框 | 保持现状（config.json 手写即可——保存路径已透传，见上行） |

**VSC 侧不动项**：`goalTurns` / `consultTurns` / `subagentTurns` 默认值语义独立、本批不并（VSC 源档 §2.3 明载「均 100/40、本次不动」——与本档 §5 总表同构）。**默认值单一来源**纪律两端同构：VSC 评审超时默认只住 `compaction.mjs` 常量、不进 `AGENT_DEFAULTS.advisor`（`thincoder-vscode/src/config-io.mjs:323`（as-of 2026-09-29） 注释即此登记）。

## 7. 并入的关键决策记录（含否决备选）

| # | 决策 | 理由 / 否决备选 |
|---|---|---|
| D-P1 | 评审 `timeoutMs` **配置化**且默认抬到 600s | 5 分钟硬编码在大评审上必截断；否决「保持硬编码、让用户缩范围」 |
| D-P2 | 默认值**单一来源**（不进 `DEFAULTS.agent.advisor`） | 两处写同一默认值必然漂移；否决「DEFAULTS + 常量双写」 |
| D-P3 | 非法配置值**回退默认**（不静默禁用、不立即超时） | 手写 JSON 的 0/负数/字符串不得变成「关掉超时」；否决「非法即视为 0」 |
| D-P4 | `maxTurns` 默认 100 → **200**，且同步四处 TUI 显示兜底 | 撞墙重试是主要痛点；否决「只改 DEFAULTS，显示面留 100」（P3 漂移） |
| D-P5 | **不动** `goalTurns` 与 `DEFAULT_SUBAGENT_TURNS` | 语义独立（goal 模式 / 子代理各有自己的预算面）；否决「一并抬到 200」 |
