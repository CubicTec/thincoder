# 2026-10-22 · manifest-read-subagent
> 六段 append-only，一段一作者：§1 讨论（主 agent）· §2 批次任务与设计（eng-designer）· §3 设计评审（评审子代理）· §4 用户批准（主 agent）· §5 实施记录（eng-coder）· §6 验证与收口（父代理）。
> 编制：主 agent · 2026-10-22 · 来源 = 用户 2026-10-22 13:52「我觉得子代理也要给 manifest 的权限，不能只有主代理」。
> 台账 = #1738（MANIFEST · 归批）。前情 = docs/batches/2026-10-22-prompt-rewrite.md（FR46 提示词改写 · 进行中）。
## §1 讨论（主 agent）
**状态行**：🔄 进行中（…）
<§1 模板占位：本批条目 / 关键判据 / 授权口径>
## §2 批次任务与设计（eng-designer）
**状态行**：设计完成
<§2 模板占位：本批条目（覆盖） / 设计档落点 / 机制设计 / 受影响文件与测试覆盖 / 验收对照 / 关键决策 / 上抛项>

**本批条目（覆盖 · 台账 #1738）**

| # | 条目 | 源（指针） |
|---|---|---|
| 1 | 用户令：子代理也要有 manifest 权限——读面开给子代理，写面仍归主 agent | 批次档 §1 · 设计 `docs/core/design/MANIFEST.md` §2.10.1 |
| 2 | 需求功能点 ⑦ 权限面：写面只挂主 agent；读面 = 只读变体（同名工具、`action` 枚举只剩 `read`） | `docs/core/requirements/ENGINEERING-MODE-V2-SPEC-MANIFEST.md:34` |
| 3 | AC-M1-12：子代理写面不可达；读面 = 只读变体；主 agent 写放行 | `docs/core/requirements/ENGINEERING-MODE-V2-SPEC-MANIFEST.md:57` |

**不在本批（明确排除）**：提示词档改用 `manifest read`（设计 §2.10.1 边界——另批另裁）；写面（`init` / `write`）放开给子代理；改 `readAction` 校验 / 写门 / 白名单 / spawn `files` 二道防线 / `docRoot` 解析（同边界）。

**设计档落点**：`docs/core/design/MANIFEST.md` §2.10.1（`:707` 起）。机制设计、工具定义逐字块、描述档全文、挂载行、四条写面判据、受影响文件表、用例 T84–T86、边界与关键决策 KD-M1-51–54 全部落在该节——本节只引不抄。

**机制摘要（指针形；逐字块与判据见设计 §2.10.1）**

- 新增只读变体 `manifestReadTool`：同名 `manifest`，`action` 枚举 `["read"]`，参数只剩 `target`，`readonly: true`。
- 挂载 = 全部 depth>0 五段（eng-coder / eng-designer / coder / consult / 兜底），与 `ledgerReadTool` / `teamLedgerReadTool` 同律。
- `readAction` 增 `canInit` 参数：缺省 `true` ⇒ depth-0 输出逐字零变；`false` 时缺档提示行不指 `init`。
- 描述单源 = 新描述档 `manifest-read`；主 agent 描述档首句随正；登记册双导出，VSC 端侧零改。

**受影响文件**：见设计 §2.10.1「受影响文件」表 8 行（产品 5 · 工程工具面 1 · 设计档 1 · 本批一次性单测 1）；行数与增量预算以该表为准。本批设计轮触及面 = 设计档该节 + 本节；**零改代码**。

**验收对照（回指设计 §2.10.1「验收对照」表）**：AC-R1 schema 窄化 · AC-R2 写面机械不可达 · AC-R3 读面等价 · AC-R4 描述单源 · AC-R5 写面零改 · AC-R6 上下文与包面——每条核法见设计同表；用例 T84（正常）/ T85（越权错误）/ T86（缺档边界）见设计「用例」表。

**需求回读（父侧收正后）**：`docs/core/requirements/ENGINEERING-MODE-V2-SPEC-MANIFEST.md:34` 与 `:57` 与设计 §2.10.1 **同口径、零差异**——写面只挂主 agent（沿写门）+ 子代理写面两道防线不动；读面 = 只读变体（`action` 枚举 `["read"]`）；主 agent 写放行。未改需求档。

**上抛项**：P1（需求两行权限面口径）已由父侧办结。P3（会话内 `doc_check` gate 因引擎档 mtime 晚于进程启动报 ERROR）由父侧重启后复跑；本节格式读数另以独立进程核过。

## §3 设计评审（评审子代理）
## §4 用户批准（主 agent）
## §5 实施记录（eng-coder）
## §6 验证与收口（父代理）
