# 2026-10-14 · server-mcp-admin-tools
> 六段 append-only，一段一作者：§1 讨论（主 agent）· §2 批次任务与设计（eng-designer）· §3 设计评审（评审子代理）· §4 用户批准（主 agent）· §5 实施记录（eng-coder）· §6 验证与收口（父代理）。
> 编制：主 agent · 2026-10-14 · 来源 = 用户 2026-10-14 13:14 原话「另外，mcp配置工具也开始落地。」（承 12:40「MCP服务有了，但是配置没有开放工具给管理面会话，这个不太好」+ 管理会话 #6「你现在能管理mcp服务吗？如果可以你把智谱的web搜索mcp配上」——agent 答「不支持」，其中「系统不支持 MCP」为错报）；台账 #1425（server · 归批，2026-10-14 12:4x 登记）。。
> 台账 = #1425（server · 归批）。前情 = docs/batches/2026-10-13-server-mcp.md §6（已收口 2026-10-14）。
## §1 讨论（主 agent）
**状态行**：已收口 2026-10-14
<§1 模板占位：本批条目 / 关键判据 / 授权口径>

**2026-10-14 · 管理面会话的 MCP 管理工具（用户 13:14「mcp配置工具也开始落地」）**

- **来源（逐字）**：用户 2026-10-14 13:14「另外，mcp配置工具也开始落地。」——承 12:40「MCP服务有了，但是配置没有开放工具给管理面会话，这个不太好。」+ 管理会话 #6 12:32「你现在能管理mcp服务吗？如果可以你把智谱的web搜索mcp配上」——agent 答「不支持 MCP」（**「无管理工具」属实 ∥ 「系统不支持」为错报**——`src/mcp/` 三档 + 会话挂载俱在，父侧实读）。台账 **#1425**（server · 归批）。
- **现状（实读）**：MCP 配置面 = 控制台页 + 五端点（`GET/POST/PATCH/DELETE /api/admin/mcp` + `POST /probe`——全 `requireAdmin`）；管理面 agent 工具面 = 管理族（providers/members/models/usage/audit/runners/docker/exec）+ 环境族，**MCP 面只给「已配服务器的工具」（用），不给「管」**；挂载点 `src/agent/chat.mjs`（部署件实读 6 处引用）。
- **诉求（= 本批射程）**：把 MCP 管理开成 agent 工具（列 ∥ 增 ∥ 改 ∥ 删 ∥ 探活——与 provider/member 管理同族形态），使管理会话可自主完成「把智谱的 web 搜索接上」类操作。
- **父侧建议（非用户原话——自加项标明）**：连带一治——agent 能力叙述认 MCP（实证错报；现能力面零提 MCP）。
- **边界（初判——设计轮定形）**：工具面零第二实现（复用 `src/mcp/store.mjs` ∥ 与管理面五端点同源）；凭据口径照既有（token 进密文列；工具结果不进日志面——承 `SECRET_FORM` 纪律）；成员侧会话 MCP（#1379 后半）= 不在本批。
- **先例**：`server-mcp` 批（配置面——本档前情已收口）+ 管理族工具面（`chat-tools.mjs`）。

**入册对位（2026-10-14 · 父侧直接执行 · 可 revert）**：需求 = `docs/server/requirements/PROJECT.md` **功能点 56 ∥ AC-56**（§2 验表 AC-55 后插入；注行射程 AC-31–56；§5 立案行；变更记录 2026-10-14 行）。先例批实读 = `docs/batches/2026-10-14-model-test-tool.md`（管理面 agent 加工具——同形态；设计落点 `docs/server/design/agent/ADMIN-AGENT.md` §12.1）。

- **修正轮后父侧直接执行（2026-10-14 · 可 revert）**：评审 #186 修正轮（#188）交卷后——`docs/server/design/mcp/MCP.md` §10 三新档读数**落地收正**（store/face/routes：拟新增 ≈130/≈150/≈150 ⇒ 实读 **339/196/137**；`:174` 句同拍）——涉他批（server-mcp 已收口）账，父侧机械面直笔（零新语义）。KD-SV-90 标题「管理面八件」= **父裁：不改**（KD 行 = 决策记录面，其字数 = 当刻射程；现计数以 §1/:11 等处为准）。

- **授权（用户 2026-10-14 14:44「点火！自动跑」）**：本批**全链自动**（评审代点火 ∥ §4 代签 ∥ 修正/实施派发 ∥ 收口核销提交双推 token 终消费）+ 父侧自缚三条（代签仅三条件齐备——评审 pass ∧ 修正轮落地并逐条核验 ∧ token 已签发 ∥ 新范围/口径裁决 ⇒ 停下只摆一条 ∥ 破坏性 ⇒ 先停）。

## §2 批次任务与设计（eng-designer）
**状态行**：设计完成（设计轮落档 = ADMIN-AGENT.md §12.2（机制单源）＋ MCP.md/板档随正；产品码零触；评审由主 agent/用户触发）
<§2 模板占位：本批条目（覆盖） / 设计档落点 / 机制设计 / 受影响文件与测试覆盖 / 验收对照 / 关键决策 / 上抛项>

**批任务与设计（eng-designer · 设计轮——2026-10-14）**

**承接**：§1（用户 2026-10-14 12:40 ＋ 13:14「另外，mcp配置工具也开始落地。」）；需求 = `docs/server/requirements/PROJECT.md` **功能点 56 ∥ AC-56**（`:447`）＋ §5 立案行（`:556`）；台账 #1425。设计档落点 = `docs/server/design/agent/ADMIN-AGENT.md` **§12.2**（机制单源）＋ `docs/server/design/mcp/MCP.md`（§4/§5/§6/§7/§10/§11 随正）＋ 板档 `docs/server/design/PROJECT.md`（§3/§4/§7/§9 随正）。

**设计定案（一句话）**：MCP 服务器清单的**列/增/改/删/探活** = 管理面**第九件工具 `mcp`**（动词 `list ∥ add ∥ update ∥ remove ∥ probe`）——执行器新档 `thincoder-server/src/mcp/admin-tools.mjs`（拟新增 ≈180 行）＋ 并面点 = `chat.mjs` `buildChatToolFace`（第四面）；**复用 `mcp/store.mjs` ＋ `mcp/face.mjs`——零第二实现**；凭据只写零回显；写动作 = `mcp_event` 三 kind ＋ 驱动层 `chat_call` **两行**。

**① 覆盖的需求条目（AC-56 逐腿对位——判据在 `ADMIN-AGENT.md` §7 本批行 ＋ §12.2）**

| AC-56 腿 | 设计落点（判据） |
|---|---|
| ① 工具面在册（五动作——与 provider/member 族同形；命名/动词对齐设计定） | §12 表 `mcp` 行 ＋ §12.2①：名 = `mcp` ∥ 动词五（`probe` 与端点/核件同词）∥ 寻址 = `update` 以 `id`（`name` = 改名——providers 先例）∥ `remove`/`probe` = `id`∥`name` 两形 |
| ② 零第二实现（复用 `src/mcp/store.mjs` 层——引件表 + 假件用例） | §12.2② 引件表：`store.mjs` 六导出 ＋ `face.mjs` 三导出——零自造 SQL/加密/探活；假件用例 = U2–U5 |
| ③ 凭据纪律（token 零回显——结果 ∥ 审计 ∥ 日志三面零秘密；沿 `SECRET_FORM`） | §12.2③：入参只写（`token`/`headers`/`env`）∥ 结果 = 视图（`hasSecrets` 布尔）∥ 审计 = `keys` 只键名 ∥ 日志 = 零携值点；三面扫描 = U8；掩蔽面边界 = R88③ 披露 |
| ④ 错报治理（能力叙述认 MCP——落点设计定） | §12.2④：`chat-env.mjs` `CHAT_LIMITS_BLOCK` 管理族行 += `mcp(…)` ＋ 已配服务器工具可用句 ＋ schema 描述两义同叙；对位断言 = U9 |
| ⑤ 审计在册（`mcp_event` 三 kind 复用——可归因、零新 kind） | §12.2⑤ ＋ KD-SV-207①：add/update/remove ⇒ `mcp_event` 三 kind（detail 形同 routes）＋ `chat_call` 逐调用；list/probe ⇒ 仅 `chat_call` |
| ⑥ 结构（零新端点 ∥ 零迁移 ∥ 成员侧零涉） | §12.2⑥ ＋ 文件表（`mcp/routes.mjs`/`store.mjs`/`face.mjs`/`chat-tools.mjs` 逐件零改；成员面复用面仍 = `face.mjs`）；源扫 = U9 |

**② 受影响文件表（现读数 = split 计行口径——内容行 +1；as-of 2026-10-14）**

| 件 | 现读 | 预期 | 触面 |
|---|---|---|---|
| `thincoder-server/src/mcp/admin-tools.mjs`（拟新增） | —— | ≈180 | 九件执行器：五动词 ∥ 寻址 ∥ `mcp_event` 三写入点 ∥ 探活 ∥ 关会话（删/停用） |
| `thincoder-server/src/agent/chat.mjs` | 733 | ≈743（净 ≈+10——**微触**） | 并面四处（import ∥ 建面块 ∥ 合并表 ∥ 预留名）；拆档评估 = KD-SV-208 |
| `thincoder-server/src/agent/chat-env.mjs` | 97 | ±0（行数零变） | 能力段一行文本改（④） |
| `thincoder-server/src/mcp/store.mjs` ∥ `face.mjs` ∥ `routes.mjs` | 339 ∥ 196 ∥ 136 | ±0 | 纯消费面（零第二实现） |
| `thincoder-server/src/agent/chat-tools.mjs` ∥ `bin/thincoder-server.mjs` ∥ `thincoder-server/package.json` | 563 ∥ 250 ∥ —— | ±0 | 零触 |
| 批内件 `docs/batches/2026-10-14-server-mcp-admin-tools.test.mjs`（拟新增） | —— | ≈300 | 腿 U1–U9；**不入任何门** |

**③ 用例清单（U 号 → 设计档 §8 用例 N85 ∥ B81 ∥ E63）**——批内件 = `docs/batches/2026-10-14-server-mcp-admin-tools.test.mjs`（拟新增；测试形态沿先例 = 假件替身注入口，实施轮定）：

- U1（N85 首段）：list 视图逐值（假 db 两行：一 stdio ∥ 一 http 携秘密）——`hasSecrets` 布尔、零秘密、零 `mcp_event`；
- U2（N85）：add（真 `store` ＋ 假 config）⇒ 行在场、结果 `{id,name,transport,hasSecrets}`、`mcp_event` `server_add` 逐值；
- U3（N85）：update ⇒ 字段级三态（缺席 = 不变 ∥ 显式 `null` = 清 ∥ 敏感空串 = 不变）、`keys` 逐值、`server_update` 无值；
- U4（N85）：remove ＋ 停用（`enabled:false`）⇒ 行消失 ＋ 关会话靶断（假 `face` 件）＋ `server_remove`；
- U5（N85）：probe 成（假件）⇒ `{probe:{ok:true,toolCount,latencyMs}}` 逐值 ＋ 冷却清（假件状态）＋ 零副作用（库逐值不变）；
- U6（B81）：probe 败 ∥ 缺核 ⇒ 工具面 `ok:true` ＋ `probe.ok:false` ＋ error 人话（自含读数——沿 routes 口径）；
- U7（B81）：寻址两形（`id` ∥ `name` 命中同行）＋ `update` 缺 `id` ⇒ 拒；
- U8（N85/B81 凭据面）：`token`/`headers`/`env` 入参 ⇒ 结果/摘要/审计 detail/日志 四扫描零值；
- U9（E63 ＋ 结构面）：形错六形（名空 ∥ 传输表外 ∥ 必填缺（stdio 无 `command`）∥ 重名 ∥ 未命中 ∥ 未知动词/缺 op）逐形 ⇒ 工具级错误人话、库零变、零外呼、零 `mcp_event`；结构扫 = 名集九件（含 `mcp`）∥ 能力段含 `mcp` ∥ `chat-tools.mjs`/`store.mjs`/`face.mjs`/`routes.mjs` 零改 ∥ routes 五端点计数不变 ∥ 零迁移。

**④ KD（全形 = `ADMIN-AGENT.md` §9；板档 §4 索引 1–205 ⇒ 1–208）**：KD-SV-**206**（工具形/复用面/寻址——九件工具 `mcp`）∥ **207**（审计两行 ∥ 凭据只写 ∥ 能力叙述落点）∥ **208**（`chat.mjs` 733 越 720 拆档线——本批微触 ≈+10 不拆；触发 = 实施净增 >15 行 ∥ 后续触碰批 ∥ 专项批）。

**⑤ 机检读数（设计轮实跑——`node scripts/doc-check.mjs --root D:\teamcode\thincoder`）**：悬空 **21**（**本批新增 0**——本批新档坐标 8 处全走「（拟新增）」标记；余 = 存量 19（`docs/core/design/MEMORY.md` 语法示意）＋ 需求档 2（`:447` ∥ `:557`——见 ⑥①，主 agent 笔））∥ 行宽 **1**（`docs/core/requirements/PROMPT-SYSTEM.md:211`（318）——存量、非本批）∥ 用例号悬空 0 ∥ 拟新增 34 ⇒ 37。**首跑自伤随本轮修净**：4 处超宽行（`ADMIN-AGENT.md:198`/`:313` ∥ `MCP.md:97`/`:171`）＋ 3 处未标「拟新增」坐标（`ADMIN-AGENT.md:35`/`:641` ∥ `MCP.md:108`）——复跑读数如上。

**⑥ 上抛/未决（全形 = `ADMIN-AGENT.md` §13 R88；板档 §9 R88 stub）**

① **需求档回笔建议（主 agent 笔）**：**功能点 56 缺 §2 条目块**（现 = AC-56 行（`:447`）＋ §5 立案行（`:556`）——五要素未成块；先例 = 功能点 55（`:372–379`））——建议补齐（三链同源：设计档 §12.2 ∥ §7 本批行 ∥ §8）；另：需求档 `:447`/`:557` 两处写 `src/mcp/store.mjs`/`src/mcp/routes.mjs`（未解析为 `thincoder-server/src/mcp/…`）——doc-check 悬空 2 条，随回笔一并收正；§5 行「八件」计数随本批落地 ⇒ 九件（主 agent 择）。
② 披露/待办（不阻塞）：token 明文经聊天文本往来（沿 providers `apiKey` 既态）∥ 掩蔽面边界（`headers`/`env` 袋内非 `SECRET_FORM` 形态值）∥ 探活 = 库内行、零审计（草稿试连 = 控制台面）∥ `chat.mjs` 733 越线微触（评估 = KD-SV-208）∥ 部署收尾（父侧：会话实走——列/探/增一条真实服务器）。

**自检**：三链同源（需求档 AC-56 ↔ 设计档 §7/§8/§12.2 ↔ 本 §2）✓；设计档 8 项齐（方法＋先例／接口＝工具形与数据流／文件表／KD／验收回指／用例／边界／交互 = 零 UI 面）✓；**产品码零触（设计轮）** ✓。**不发起评审（评审由主 agent/用户触发）。**

### 修正轮（设计评审轮 1 · 评审 #186——9 条逐号落地；2026-10-14 · eng-designer）

号 → 改动 file:line（行号 = 本笔落定后现盘）：

1. R88①（需求档回笔 = 已办 ＋ 坐标实位）→ `docs/server/design/agent/ADMIN-AGENT.md:380`（条目块 `docs/server/requirements/PROJECT.md:381` ∥ AC-56 `:457` ∥ §5 立案行 `:566`；余项 = §5 计数「落地时随正」）；板档 stub `docs/server/design/PROJECT.md:329` 同拍。
2. 计数随动（八件 ⇒ **九件**）→ `ADMIN-AGENT.md:4` ∥ `:78`（§7 聊天式驱动行——同族一致性面扫净，评审未点）；板档 `PROJECT.md:37` ∥ `:40`（mcp 行补管面指针）。
3. KD-SV-91 例外栏改「两例」（+ MCP 配置写径）→ `ADMIN-AGENT.md:155`。
4. 掩蔽引述收正（`SECRET_FORM` ⇒ 键名表 `SENSITIVE_KEYS` 单源实证口径）→ `ADMIN-AGENT.md:92`（§7③ 腿）∥ `:176`（KD-SV-207②）∥ `:344–345`（§12.2③）∥ `:380`（R88③）。
5. §12.2① 按名解析步单一落法（列表视图按 `name` 取 `id`）→ `ADMIN-AGENT.md:320–321`。
6. §12.2② 注入缝（`deps.mcpProbeImpl`/`deps.mcpRemoveImpl` 复用；新增键 `?? null`）→ `ADMIN-AGENT.md:334`。
7. 同形重复（不可共享）如实登记 ＋ 源扫腿限引件面 → `ADMIN-AGENT.md:335` ∥ `:175`（KD-SV-206③）。
8. `chat_call.subject` = null 钉死 → `ADMIN-AGENT.md:356` ∥ `:142`（§8 N85）。
9. 读数收正 → `ADMIN-AGENT.md:35`（`chat-tools.mjs` 562 ⇒ **563** split）∥ `docs/server/design/mcp/MCP.md:25`（`run.mjs` 坐标 `:22` ⇒ `:17` ＋「`"mcp"` 已删」收正）∥ `:28` ∥ `:174`（`chat.mjs` 733 越线口径）。

同族随正（逐字目检扫出——坐标类一致性面，逐条报告）：`MCP.md:185`（AC-56 验收表 `:447` ⇒ `:457`）∥ `MCP.md:4`（需求锚 `:540` ⇒ `:561`；「待讨论行」⇒「已立案行」）∥ `ADMIN-AGENT.md:378` ∥ `PROJECT.md:327`（R87 两坐标 `:446` ⇒ `:456` ∥ `:550–552` ⇒ `:563–565`——需求档移位连带）。

变更记录：`ADMIN-AGENT.md:648` ∥ `MCP.md:195` ∥ `PROJECT.md:776`（各档新条目置顶）。

机检（复跑读数——`node scripts/doc-check.mjs --root D:\teamcode\thincoder`）：**悬空 19**（= `docs/core/design/MEMORY.md` 18 ＋ `docs/core/requirements/MEMORY.md` 1——core 域语法示意存量；**本批域 0 新增**；较设计轮基线 21 降 2 = 需求档两处经回笔消解）∥ 符号·窄悬空 **0** ∥ 用例号悬空 **0** ∥ 行宽 **0 超宽** ∥ 拟新增 38（列报）。**首跑自伤随复跑修净**（3 超宽行 ＋ 2 短形坐标 ＋ 1 符号触发）。**零新语义（评审发现直接导出项）；产品码零触（设计轮）。**

未改（仅报告）：① `MCP.md` §10 `store/face/routes` 三行仍为设计估（≈130/≈150/≈150 ＋「（拟新增）」）——实读 339/196/137（server-mcp 批交付后未收正；涉他批账与在册数字，不代改）＋ `:174`「三新服务端档皆 ≈150 内」句同滞后；② `ADMIN-AGENT.md:154` KD-SV-90 标题「管理面八件」= 决策射程读法（第九件 = KD-SV-206）——如按现计数读法需 ⇒ 九件，涉决策面措辞，待复核；③ 需求档存量（主 agent 笔）：`:562`（`run.mjs:22` 坐标 ⇒ 现 `:17`；「裁掉 mcp 面」句滞后）∥ `:564`/`:567`「八件」计数（R88① 已挂「落地时随正」）。

## §3 设计评审（评审子代理）

### 轮次 1（评审子代理）

**评审对象**：MCP 管理工具设计——`design/agent/ADMIN-AGENT.md` §12.2 机制单源 ∥ `design/mcp/MCP.md` ∥ `design/PROJECT.md` 索引随动 ∥ 批档 §2（台账 #1425；功能点 56 ∥ AC-56）。机检面：设计档叙述 ↔ 现盘实读（`src/mcp/{store,face,routes}.mjs` ∥ `src/agent/{chat,chat-env}.mjs` 等）抽查。

**评审面限制（如实登记）**：无项目标准档、仓根无文档地图——文档归属面按板档 `design/PROJECT.md` §3 文档地图与各域档头注判；行数标注按「split/内容行」双口径在案值抽查（实读 `chat.mjs` 733 ∥ `chat-tools.mjs` 563 ∥ `store.mjs` 339 ∥ `face.mjs` 196 ∥ `routes.mjs` 137）。

| # | Category | Severity | Issue | Suggestion |
|---|----------|----------|-------|------------|
| 1 | 需求覆盖/文档状态 | 🟡 | R88①（`agent/ADMIN-AGENT.md:375`；同文批档 `2026-10-14-server-mcp-admin-tools.md:70`）仍断言「功能点 56 的 §2 条目块缺」并引旧坐标（`:447`/`:556`）；现盘 = 条目块已在册（`requirements/PROJECT.md:381`）、AC-56 在 `:457`、立案行在 `:566`（回笔 = 需求档变更记录 `:793`）。余项（§5「八件」⇒ 九件）仍在（`:567`）。 | 将 R88①/批档 §2⑥① 的「块缺」项改记「已办」、坐标刷新为现盘值；仍活的 §5 计数项保留（口径 = 终态随正）。 |
| 2 | 文档一致性（计数随动） | 🟡 | 头注 `agent/ADMIN-AGENT.md:4`「工具面 = 管理面八件 + 环境六族八件」与同档 `:11`「管理面九件」相抵；板档 `design/PROJECT.md:37`（§2.1 agent 行）仍「管理面八件」，与同档 `:101`「工具面扩展九件」相抵；§2.1 mcp 行（`:40`）未含管面句。 | 头注行与板档 §2.1 两行随本批收正（计数 = 九件；mcp 行补管面指针），或就地注明「八件 = 上批快照」。 |
| 3 | 文档一致性（审计单源） | 🟡 | KD-SV-91（`agent/ADMIN-AGENT.md:155`）仍写「**不双记**既有域型……**凭据类例外**：`runners.revoke_credential`」单例；本批 §12.2⑤（`:350`）／KD-SV-207①（`:176`）与 `mcp/MCP.md:98` 另定「写动作两行」——单源行未随正（先例 = admin-chat-creds-merge fix 轮把该行增例外）。 | KD-SV-91 例外栏同拍补 MCP 配置写径一例（或加指向 §12.2⑤ 的指针），使审计双记政策仍为单源。 |
| 4 | 凭据纪律（引述不实） | 🟡 | §12.2③／KD-SV-207②（`agent/ADMIN-AGENT.md:341`／`:176`）称 `headers`/`env` 袋值「经 `SECRET_FORM` 形态扫描」；实证 = `thincoder-server/` 全树零 `SECRET_FORM`（唯一在 `thincoder-core/log.mjs:43`），`ops/log.mjs:12-26` 零脱敏，chat 参数掩蔽 = 键名表 `SENSITIVE_KEYS`（`src/agent/chat.mjs:228`）⇒ 袋内非列名键（如 `X-Api-Key`/`ZHIPU_API_KEY`）之值会进 `call` 摘要/审计 `call`/落库 `args`。 | 披露口径改按「键名面」重述（点名 `SENSITIVE_KEYS` 单源与残余暴露类），或把袋形参数（`headers`/`env`）纳入掩蔽面（整袋掩蔽）；择一并同步 §7③ 腿与 U8 扫描面。 |
| 5 | 清晰度（寻址落法） | 🟡 | §12.2①（`:320`）定 `remove`/`probe` = `id ∥ name` 两形，但 `store.mjs` 导出面零按名查行（`:161` list 视图 ∥ `:171` 仅 id），`resolveProbeConfig` 仅 `id` 径（`store.mjs:299-302`）⇒ 按名 ⇒ id 的解析步在设计与引件表（`:329`）中缺；该步若自写 SQL 与「零自造 SQL」／`store.mjs` ±0 声明相抵。 | 明写解析步单一落法（如经 `listMcpServers` 视图按 `name` 取 `id` 后走既有导出），或补 `store.mjs` 按名导出并同拍收正「零改/±0」声明。 |
| 6 | 可测性（注入缝） | 🟡 | §12.2 未点名新执行器的替身缝；§7②／U2–U5 的「假 `face` 件」用例（`ADMIN-AGENT.md:92`；批档 `:52`「测试形态沿先例 = 假件替身注入口，实施轮定」）无可依键（既有可复用 = `deps.mcpProbeImpl`/`deps.mcpRemoveImpl`）。 | §12.2①/② 补一行注入缝清单（复用既有 `deps.*` 键；新增键须 `??` 缺省 null ⇒ 生产零变），使 U2–U9 可机检落地（先例 = server-mcp 批评审 #112 同项要求）。 |
| 7 | 零第二实现（面窄） | 🟡 | KD-SV-206③（`:175`）「新档零自造 SQL／零第二加密／零第二探活」与 §7② 源扫腿未覆盖两处同形再造：探活调用+读数归一（`src/mcp/routes.mjs:104-134` 内联）与 `mcp_event` detail 三写入点（`routes.mjs:43-49/64-70/84-90` 内联、无导出）。 | 择一：抽共享件（探活调用+归一与 detail 构造各一导出，routes 与新档同治）；或把「同形重复（不可共享）」明写进 §12.2②/KD-SV-206③ 并把源扫腿限定为引件面。 |
| 8 | 清晰度（审计字段） | 🔵 | `mcp` 工具的 `chat_call.subject` 取值未定义（§12.2⑤；驱动层口径 = 结果携 `subject` ⇒ 用之、管理族零携 ⇒ null——`src/agent/chat.mjs:670-674`），§8 N85 未断言该列。 | 点名 subject 取值（如服务器名/id）或明写本件零携（null）为既定形，二者之一入 §12.2⑤/§8。 |
| 9 | 读数口径残差 | 🔵 | ① `chat-tools.mjs` 562（`agent/ADMIN-AGENT.md:35`）↔ 563（批档 `:49`）；② `mcp/MCP.md:174`「`chat.mjs` 692 ⇒ ≈704（拆档线 720 未越）」↔ 同档 `:155`（733 已越）；③ `mcp/MCP.md:25` 引 `run.mjs:22` 含 `"mcp"`（现盘 = `run.mjs:17`，`mcp` 已删）。 | 三处就地刷新读数/坐标（或注明口径差与 as-of）。 |

**计数**：🔴 0 ∥ 🟡 7 ∥ 🔵 2（共 9）。**未过条目（门槛面）**：无——§7 机检腿逐条可验（源扫/假件）、文件表逐件带现读与预期（新增档 ≈180 ∥ `chat.mjs` 733 ⇒ ≈743 微触评估 = KD-SV-208）、最近先例行（策略 §12.2 开头）逐项含对齐∥偏离与理由、文档归属（机制单源 = §12.2；`mcp/MCP.md` §4 只留指针不重复）。
VERDICT: pass

## §4 用户批准（主 agent）

**父侧代签（用户 2026-10-14 14:44「点火！自动跑」授权）**——依据三条件齐备：① 评审 #186 VERDICT **pass**（0🔴/7🟡/2🔵）；② 发现 9 条逐条裁定并修正轮 #188 全落 + 父侧核验（含两处父侧机械随正）；③ 设计 token 已签发在槽。批准 = 本批设计进入实施（实施派发 = eng-coder，即刻）。

## §5 实施记录（eng-coder）
**状态行**：实施完成（四面落盘 ＋ 批内件 10/10 绿 ＋ 审计 1 轮/评审 1 轮 pass（终态 clean））



**实施摘要**：管理面第九件工具 `mcp`（五动词 `list ∥ add ∥ update ∥ remove ∥ probe`）落地，改动面四面——
新档 `thincoder-server/src/mcp/admin-tools.mjs`（split 223 / 内容行 222）∥ `thincoder-server/src/agent/chat.mjs` 微触并面（733 ⇒ **737** split，净 +4；KD-SV-208 的 >15 线触发线未触）∥ `thincoder-server/src/agent/chat-env.mjs` 能力段管理族行一行（97 ±0）∥ 批内件 `docs/batches/2026-10-14-server-mcp-admin-tools.test.mjs`（split 423，U1–U9 拆 U9a/U9b = 十用例）。
零改声明六件实核未改：`src/mcp/store.mjs`(339) ∥ `src/mcp/face.mjs`(196) ∥ `src/mcp/routes.mjs`(137) ∥ `src/agent/chat-tools.mjs`(563) ∥ `bin/thincoder-server.mjs` ∥ `package.json`（`git status --porcelain` + `git diff HEAD` 实测：本批只触及上述四面）。

**验证读数**（cwd = `thincoder/`，末次实跑 = 收口态）：
- `node --test docs/batches/2026-10-14-server-mcp-admin-tools.test.mjs` ⇒ **tests 10 ∥ pass 10 ∥ fail 0**。
- 四面 `node --check` 全绿；模块装载实测 ok（`chat.mjs`/`admin-tools.mjs`/`chat-env.mjs` 三档 import 无异常；`createMcpAdminTools` 出面 = names/ops/schemas/invoke，工具名 `mcp`，动词五）。
- 零改面静态复核：`routes.mjs` 仍 5 个 `routes.add(`；`chat-tools.mjs` 名集仍八件；`store`/`face` 导出面纯消费。
- 相邻旧批件（非门禁面，登记口径 = 设计 R88②）：`2026-10-14-model-test-tool.test.mjs` 11/11 绿；`2026-10-13-server-mcp.test.mjs` 7/10——T5 红 = 前批 `93fda5ae` 给探活读数加 `tools` 后旧快照未随（与批无关，隔离单跑仍红）；T7 红 = 名集尾 += `mcp`（R88② 登记的旧快照）；T10 红 = T7 早停级联（隔离单跑绿）；`2026-10-12-admin-agent-awareness.test.mjs` 9/10——唯一红 = 名数 17 ≠ 16（同 R88② 登记项）。

**决策透明表（本批实现取舍——超出设计逐字处，全部披露）**：

| # | 决策 | 理由 | 处置 |
|---|---|---|---|
| 1 | 额外 import `MCP_TRANSPORTS`（`store.mjs` 第 7 导出）仅作 schema enum | 免第二份传输清单字面量（与「零第二实现」同旨）；非写读链，设计引件表六导出 = 写读链口径 | 已披露，转父侧（见下 D5） |
| 2 | import `recordAudit`（`accounts/audit.mjs`） | §12.2⑤ 要求写动作 `mcp_event` 落行；`routes.mjs:10` 同引 | 同 routes 形，无需收正 |
| 3 | `CHAT_SYSTEM_BASE` 管理族枚举行 += `mcp`（`chat.mjs:89`，同行改） | 枚举事实已变（八件 ⇒ 九件）；与 `chat-env.mjs` 同拍，防两处叙述相抵 | 已披露（行数 ±0） |
| 4 | 同族注释随正三笔（`chat.mjs:317` 合并小件 ∥ `:513` 工具面分支 ∥ `:461` deps 枚举补 `mcpRemoveImpl`） | 注释面与实现同拍——并面后旧「八件」枚举失真 | 已披露（行数 ±0；第三笔采纳自 advisor 评审 🔵） |
| 5 | 探活调用 ∥ 读数归一 ∥ `mcp_event` detail 三形在本档重复书写（不抽共享件） | 设计已登记为「同形重复（不可共享——如实登记）」 | 与设计一致，零偏差 |
| 6 | `buildChatToolFace` 返回值 += `mcpAdmin`（`chat.mjs:377`） | 与 `envTools`/`mcpFace` 形状对位（面级可见） | 暂无消费方，供后续批收用 |
| 7 | 关会话靶 = 更新后名（`admin-tools.mjs:112`） | 同 `routes.mjs:63` 单源形（设计「同形」要求）；两径分叉反违设计 | 不改；转上抛（见下） |

**内部审计与代码评审轮次 / 终态**：
- ① 内部 explore 背离审计 **1 轮**（交付面 vs 设计六面 ①–⑦）：行为面全判「实现」，零部分实现、零静默简化、零 out-of-list（静态面）；6 条发现全为文档态/枚举级——D1 `ADMIN-AGENT.md` §12.2③ 引 `chat.mjs:228`（现盘 `:230`）、D2 §12.2⑤ 引 `:670-674`（现盘 `:674-678`）、D3 行账估 ≈180/≈743/≈300 vs 实读 223/737/423、D4 `MCP.md:96` 引 `:630-637`（现盘 `:675-682`，前批累计偏移）、D5 引件表 vs 实现导入面、D6 `chat.mjs:513` 注释「八件」未扫净。
- ② 自修 **1 轮**：D6 已修（`:317`/`:513` 注释同拍）；本档自引坐标随正（`chat.mjs:228` ⇒ `:230`）；D1–D4 = 设计档面漂移 ⇒ 不自行改设计档（设计档 = eng-designer 笔），列表转父侧收口收正。
- ③ 内部 advisor 代码评审 **1 轮**（type=code，判据 = §12.2 六面 ∥ §7 ①–⑥ ∥ §8 ∥ §9 KD-SV-206/207/208）：**VERDICT: pass**——零 🔴、零 must-fix。2 条 🟡 非阻塞：`chat.mjs` 736 行 > 500 软线（挂 KD-SV-208 微触裁定；本批净 +3 实测 ≪ 15）；改名 × 停用同调时关会话靶 = 新名 ⇒ 旧会话不关（同 `routes.mjs:63` 形，设计未覆盖该组合）。5 条 🔵：deps 注释缺 `mcpRemoveImpl`（已采纳同拍）、测试 git 腿依瞬时工作树态、纪律句未含 MCP 删/停用（设计 ④ 未要求，不采纳）、凭据袋内非列名键残余（设计已披露）、行账读数差。
- **终态 = clean**（审计 1 轮 + 评审 1 轮；两笔采纳均为注释面 ±0 行，无行为面 fix claim，故无需第二轮复评）。

**验证责任说明（不掩盖）**：`thincoder-server` 无 test 脚本（`package.json` 无 `scripts.test`；`prepublishOnly` = 三档 `node --check`，本批零涉）⇒ 本批交付物的唯一机检面 = 批内件（手工跑，不入任何门禁）；集成面本批零涉（服务端面无集成件），以父侧收口跑为准。

**转父侧（上抛）**：
- **[上抛·待裁]** D5：设计 §12.2② 引件表（「`store.mjs` 六导出 ＋ `face.mjs` 三导出」）与实现导入面之差（另含 `MCP_TRANSPORTS` 常量 ∥ `recordAudit`）——择一记录：① 收正引件表（列全）或 ② 记案为允许超集。两条均不是第二实现（共用单源）。
- **[上抛·知会]** 设计档面漂移五笔（`ADMIN-AGENT.md` §12.2③ `chat.mjs:228`、§7 KD-SV-207② 同引 `:176`、§12.2⑤ `chat.mjs:670-674`、§6 行账；`MCP.md` §2.2 装配点坐标 `:469-473`/`:316-338` + 「管理面八件」措辞、§5 `chat.mjs:630-637`、§10 行账 ≈180/≈743）——收口轮按现盘收正。
- **[上抛·知会]** 改名 × 停用同调：旧会话不关（旧 stdio 会话留至停机收尾）——同 `routes.mjs:63` 形、设计未覆盖该组合；建议收口轮登记为已知边界（R88③ 类）或另批同治（face 面旧名收口）。

## §6 验证与收口（父代理）

**实施核验（父侧亲跑 · 2026-10-14）**：批内件 **10/10 pass**（`node --test docs/batches/2026-10-14-server-mcp-admin-tools.test.mjs`——父侧复跑实读：tests 10 ∥ pass 10 ∥ fail 0）；改动面 = 新档 `admin-tools.mjs`（**223**）＋ `chat.mjs` 净 **+4**（**737**）＋ `chat-env.mjs` ±0（能力段一行）＋ 批内件（**423**）；零改声明六件实核（git 面）。

**上抛裁定**：① 引件表超集（`MCP_TRANSPORTS` ＋ `recordAudit`）——**父裁 = 允许超集**（引件表口径 = 功能引件最小集；两件为面 plumbing——schema enum 免第二份传输清单 ∥ §12.2⑤ 审计所需（`routes.mjs:10` 同引），非第二实现）；② 改名 × 停用同调旧会话不关 = **记录为已知边界**（同 `routes.mjs:63` 单源形——两径分叉反违设计；face 面旧名收口 = 未来批候选，不立账）；③ 旧批件快照红项（T5/T10）= 设计 R88②「非门禁面不追改」在册——确认。

**坐标随正（父侧直接执行 · 机械面 · 可 revert）**：`ADMIN-AGENT.md`（读数 743⇒**737** ∥ 新档 ≈180⇒**223** ∥ 批内件 ≈300⇒**423** ∥ `chat.mjs:228`⇒`:230` ∥ `:670-674`⇒`:674-678` ∥ R88 余项随正 ＋ 变更记录一行）∥ `MCP.md`（`:316-338`⇒`:346` ∥ `:469-473`⇒`:514-515` ∥ 八件⇒九件 ∥ `:630-637`⇒`:675-682` ∥ 读数随正 ＋ 变更记录一行）∥ 需求档 §5 立案行（状态 ⇒「设计评审 pass ＋ 实施已落」＋ 落地收正注 ＋ 变更记录一行）。

**部署收尾（父侧执行 · 2026-10-14）**：镜像重建 ＋ 重收敛 ✓（healthz 200）。

**会话实走（AC-56 收口腿——父侧执行 · 实读）**：管理会话真调 `mcp` **4 次**——list ⇒ probe（真服务器 `web-search-prime`——http 型，库里既有）⇒ add（`smoke-dummy`）⇒ remove（`smoke-dummy`）；`end` 帧 status=succeeded ∥ calls=4；审计实读 = `mcp_event` 两行（`server_add` ∥ `server_remove`——**写动作两行制**在盘）＋ `chat_call` 四行（`subject` = null ✓；call 摘要含 op/name——**凭据零出现**）；清单走查后 = 原样（增删自清——零污染）✓。

**结算**：台账 #1425 已核销（证据 = 本节）；设计令牌随收口消费（值不入档）。

**遗留**：无。
