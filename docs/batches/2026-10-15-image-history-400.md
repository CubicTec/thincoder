# 2026-10-15 · 图片入历史 400 自愈
> 六段 append-only，一段一作者：§1 讨论（主 agent）· §2 批次任务与设计（eng-designer）· §3 设计评审（评审子代理）· §4 用户批准（主 agent）· §5 实施记录（eng-coder）· §6 验证与收口（父代理）。
> 编制：主 agent · 2026-10-15 · 来源 = 用户 2026-10-14 报障（图片烧死会话）+ 2026-10-15 00:08「都自动跑到交付吧」全链自动授权。
> 台账 = #1450（core · 归批）。前情 = 无（独立批）。
## §1 讨论（主 agent）
**状态行**：已收口 2026-10-15
<§1 模板占位：本批条目 / 关键判据 / 授权口径>

### 开批（2026-10-15 · 主 agent）

**来源 = 用户 2026-10-14 报障（图片烧死会话）+ 2026-10-15 00:08「都自动跑到交付吧」（全链自动授权：设计 → 评审 → 实施 → 交付/收口）**。台账 = #1450（在途 · task_book = 本档）。前情 = 无（独立批）。

**症状**：发图后会话烧死——此后每回合 400、零自愈（用户可见：会话报废）。

**诊断（父侧钉死 · 四环实读坐标）**：

1. 图以 data URL **全量**进 user 消息——`thincoder-core/agent/record-results.mjs:54-62`；
2. 发送前净化**只改副本**——多模态放行 `thincoder-core/provider/normalize.mjs:79` ∥ 驱逐 = **32MB 总量阈**（`:49`——4MB 单图恒早退、不触）；
3. 400 非重试**立抛**——`thincoder-core/provider/errors.mjs:36`；零图像语义、零历史处置；
4. 压缩/降级两兜底**都不碰图** ⇒ **零自愈，会话烧死**。

相关面：`thincoder-core/tools/file.mjs:127-182`（`readImageTool`；`MAX_IMAGE_BYTES = 15_000_000`——两闸 `:148`/`:173`）∥ `thincoder-core/attachments.mjs:51-54`（非多模态判据——规格表 `multimodal` 位）∥ 需求在册 = `docs/core/requirements/PROVIDER.md:81` R11。

**链计划（全链——本批为完整四段链，非轻通道轮）**：① 设计（eng-designer #33——设计档落点 + §2；勘面对照纪律在册）② 独立评审（advisor · design——设计落盘后点火）③ 批准（派实施）④ 实施（eng-coder——设计 token 门）⑤ 验证与收口（本段 §6）。**注意**：设计评审通过后签发设计令牌；实施轮按设计档受影响文件清单落。

**边界**：`thincoder-core` 为主；跨端面（VSC/桌面/服务端对图像历史的各自处置）如涉，设计轮勘察后登记、裁在父侧；零第三方依赖；**禁加戏**（自加防护/安全项单列提议，不与修复平级混入）。

## §2 批次任务与设计（eng-designer）
**状态行**：设计完成（2026-10-15 · 四环修复设计在盘（PROVIDER.md §6.26）；上抛 3 条均为知会、零阻断）
<§2 模板占位：本批条目（覆盖） / 设计档落点 / 机制设计 / 受影响文件与测试覆盖 / 验收对照 / 关键决策 / 上抛项>

### §2 批次任务与设计（eng-designer · 2026-10-15）

**设计档落点**（机制单源 = 设计档，本段不重述全文）：`docs/core/design/PROVIDER.md` §6.26「图片拒绝自愈」（`:614`）+ §6.3 指路行（`:114`）+ §6.7 指路行（`:155`）+ §7 D-PR39/D-PR40（`:741-742`）+ 变更记录（`:858`）。行号 = as-of 2026-10-15 设计轮实读。

**本批条目（覆盖——四环逐环）**：

| # | 环 | 现状（实读坐标） | 终形处置 |
|---|---|---|---|
| B1 | ① 注入 | 图以 data URL 全量进 user 消息（`thincoder-core/agent/record-results.mjs:54-62`）；`:185` 注入面 32MB 同预算驱逐 | **维持**（图进上下文 = 本功能本体；两体量闸既有） |
| B2 | ② 发送面 | 多模态放行 raster data URL（`thincoder-core/provider/normalize.mjs:79`）∥ 驱逐阈 = 32MB 累计（`:49`——单图 4MB 恒早退）∥ 只改副本 | **维持 + 增设拒绝剥除原语**（`stripRejectedImages`；不设无错因预判） |
| B3 | ③ 400 处置 | 400 级非 429 立抛（`thincoder-core/provider/errors.mjs:36`；`thincoder-core/provider/core.mjs:437/:453`）——零图像语义、零历史处置 | **修复**：图像语义（T1）∥ 同态重复（T2）⇒ 全剥历史图 + 机读注记 + 单次重发 + 落账（`llm:image-heal`） |
| B4 | ④ 兜底面 | 压缩只跟 token 阈值走 ∥ 降级只触 tool 消息 / string 内容（`thincoder-core/context-degrade.mjs:19/:60`）——两兜底都不碰图 | **不纳入**（零改——判由 = D-PR40） |

**不在本批（边界）**：用户侧主动知会（端侧回调 / live 提示）；压缩摘要调用携带中段图的场景（既有 3 连败降级承接）；图持久化体积 / 请求体总量；引擎级自动降尺寸。全文 = 设计档 §6.26「边界」。

**受影响文件清单与测试覆盖**：

| # | 文件 | 现量（wc -l） | Δ | 动作 |
|---|---|---|---|---|
| 1 | `thincoder-core/agent/image-heal.mjs` | 0 | +≈90 | 新档：判定 ∥ 剥除 ∥ 注记 ∥ streak 记账 |
| 2 | `thincoder-core/agent/chat-call.mjs` | 68 | +≈30 | catch 接线：判定 → 剥除 → 单次重发；成功清 streak |
| 3 | `thincoder-core/provider/normalize.mjs` | 138 | +≈14 | `IMAGE_REJECTED_PLACEHOLDER` + `stripRejectedImages`；`capHistoryImages` 增占位参（缺省零变） |
| 4 | `thincoder-core/provider/errors.mjs` | 126 | +≈10 | `IMAGE_REJECTION_RE` + `looksLikeImageRejection` |
| 5 | `docs/batches/2026-10-15-image-history-400.test.mjs` | 0 | +≈170 | 批内单元档（T-1..T-8 ∥ W-1） |

测试 = 批内件 `docs/batches/2026-10-15-image-history-400.test.mjs`（跑法：仓根 `node --test docs/batches/2026-10-15-image-history-400.test.mjs`；W-1 = 本地假服务端直驱 `callModelTurn`——零网络）。零改面 = `record-results.mjs` ∥ `context.mjs` ∥ `context-degrade.mjs` ∥ `provider/core.mjs` ∥ 规格表 / 预设 / 三端 UI。

**验收对照（逐条回指）**：AC-1 图像语义 400 ⇒ 全剥 + 单次重发（回指本单环③ ∥ R11）· AC-2 只动机读线、人读线图零损（环①）· AC-3 非图像错误零误伤（环③）· AC-4 无重试风暴（环③）· AC-5 R11 零回归（多模态放行 ∥ 32MB 阈 ∥ 15MB 闸逐字不变）· AC-6 兜底面零改（环④）。逐条机检形 = 设计档 §6.26「验收标准」表。

**关键决策**：D-PR39（自愈 = agent 层全剥 + 单次重发——被否：只剥最新 ∥ 循环重发 ∥ 请求前预剥）· D-PR40（兜底面零改 + 知会形 = 机读注记 + 落账——被否：并入压缩 ∥ 新增端侧回调）。

**上抛项 / 知会**（不阻断）：

- [知会] 需求锚读法：父侧给 = `docs/core/requirements/PROVIDER.md:81` R11；本席读法 = 「read_image 门放行」的放行语义须含「图进上下文后不被反噬」。如主 agent 判断需在需求档加一行（如「图片拒绝自愈」），笔在主 agent。
- [知会] 环③ 触发 T2 覆盖「OpenAI 形态错误文本」面（`LLM API error 4xx:` 构造位 = `thincoder-core/provider/core.mjs:416`）；anthropic / google 原生 transport 错误文案若不含图像词，兜底不触（保守——可随文案实测扩词表 = 常量一处改）。
- [知会] 端侧主动知会（live 提示 / 回调面）= 本批边界外；如需，另立小节。

**行号补正（同轮自检 · 2026-10-15）**：上块设计档落点按最终盘面实读 = §6.26 `:614` ∥ §6.3 `:114` ∥ §6.7 `:155` ∥ §7 D-PR39/D-PR40 `:743-744` ∥ 变更记录 `:860`；落笔过程中 §6.26 内插入「四环终形」块（`:627`）致尾部两坐标 +2（原记 741-742 ∥ 858 为插入前读数）。机检：`doc-check` 四件（width ∥ anchors ∥ linecounts ∥ targets）对本档面零发现（伞式 `doc-check.mjs` 的 exit=1 = `docs/server/**` 他批在飞面行数漂移，与本批无关）。

**落点终校（2026-10-15 · 取代上条补正）**：设计档落点按最终盘面实读 = §6.26 `:614` ∥ §6.3 `:114` ∥ §6.7 `:155` ∥ 四环终形 `:627` ∥ 先例对照 `:646` ∥ §7 D-PR39/D-PR40 `:749-750` ∥ 变更记录 `:866`（档全长 867 行）。受影响文件现量按 `wc -l` 口径复读（node 复算 + 读档双证同值）＝ chat-call.mjs **68** ∥ normalize.mjs **138** ∥ errors.mjs **126**（行号 741-742 ∥ 858 系 §6.26 内两处插入前的读数，随终校废）。机检收官：行宽闸本档面零命中（全树余 3 条 = 台账 #1446 在册既有项，非本批）∥ 锚闸本档命中全属「报告面·不入闸」类（新增档 `image-heal.mjs` ∥ 测试档经「拟新增」类登记）∥ 行数档 ∥ 域闸 exit=0。

### 修订轮（eng-designer · 2026-10-15 · 承 §3 轮次 1 发现 1∥2∥3∥4∥6）

**范围**：设计档侧 5 条逐号受理（发现 5 = 需求档变更记录 = 主 agent 笔——按父侧裁定本轮不做；需求档已另行在档）。**零新语义**（评审发现直接导出项；streak 时序 ∥ 429 归类 = 点名未钉定项的直接钉定）。

**逐号处置（号 → 落点 · 设计档终读行号）**：

| # | 处置 | 落点（`docs/core/design/PROVIDER.md`） |
|---|---|---|
| 1 | T1 补 **HTTP 400 合取**（`error.message` 取码届定 400——与 R23 字面一致）；触发块新 bullet「413 等非 400 图像词错误：首撞不触 T1（照抛——D-PR32 指引径原样）；复撞走 T2」；四环终形 ③ ⇒「图像语义 400」；机读注记 `(HTTP 400)` ⇒ `(HTTP 4xx)`（非 400 复撞时原文案失准）；§6.3 摘要行同拍补合取 | §6.26 `:632` ∥ `:635`（新 bullet）∥ `:627` ∥ `:646` ∥ §6.3 `:114` |
| 2 | AC-5 机检改可执行形（**T-9 用例锚** + `git diff -U0` 判据行零触及检读 + `file.mjs` 零 diff）；用例表补 **T-9**（`capHistoryImages` 缺省参输出逐字 = 批前占位） | §6.26 `:699` ∥ 用例表 `:688` |
| 3 | T-2 期望列基线收正（剥除前后条数不变、注记另计 +1；原文本 part 逐字保留、image part 归零） | §6.26 `:680` |
| 4 | 需求锚改指 §4.7（`:164`）/ R23（`:172`）；R11 转支撑锚；AC 回指列六行同拍（AC-1..AC-6 → R23 ①/本体/②/③/④/⑤） | §6.26 `:616` ∥ `:695`–`:700` |
| 6 | streak 语义收口（自增 ∥ 清零 ∥ Abort 豁免 ∥ 判定先后——记账单源 = `image-heal.mjs`；清零调用点 = chat-call 明书）；契约表措辞对齐（「记账一处」⇒「记账单源」） | §6.26 `:634`（新 bullet）∥ `:660`/`:661` |

**直衍补项（可撤）**：① **T-10 用例**——413 首撞/复撞覆盖（发现 1 点名「该形态无 AC/T 覆盖」的直接补钉）；② **429 归类钉定**——不计入 streak、不作 T2 当前匹配（评审点名「429 计入否」）。

**一致性面自修（发现外 · 设计档闸内悬空 4 处 → 0）**：`:633`/`:673` 路径前缀收全（`core.mjs` ⇒ `thincoder-core/provider/core.mjs`）∥ `:660`/`:667` image-heal 前向引用补「（拟新增）」标记——零语义（格式面；修前 4 处为批前存量红）。

**机检收官**：doc-check——设计档面闸内悬空 **0** ∥ 行宽闸本档零命中（全树余 4 条：`PROMPT-SYSTEM.md:657` ∥ `TOOLS.md:1382` ∥ 需求档 `PROVIDER.md:168` ∥ `server/requirements/PROJECT.md:568`——均非本席面，其中需求档 `:168`（336 字符）为本批新增红、主 agent 笔，如实上报）∥ 拟新增计数 30 ⇒ 32（两处新标记，列报不入闸）。**伞式全树读数受他批在飞面波动**（并行走查间 悬空 25→28 ∥ 候选 65665→65710——`docs/server/**` 并行改动所致，非本席引入；本席面 = 设计档闸内零行）。

**知会**：① 需求档 `docs/core/requirements/PROVIDER.md:168` 行宽 336（>300 闸）——主 agent 笔，本轮不做、上报。② T-9 断言取「全缺省参 + 合成 > 32MB 样本」形（忠实「缺省行为」逐字断言）；如嫌重，实施轮可换「预算参收紧 + 占位参缺省」（同占位面断言）。③ 受影响文件清单估（+≈170）未随动——用例 +2（T-9/T-10）或微升，实施轮按实读（清单面按父侧范围零动）。

## §3 设计评审（评审子代理）

### 轮次 1（评审子代理）

**设计评审 · 发现表（对象 = `docs/core/design/PROVIDER.md` §6.26 ＋ §6.3/:114 ∥ §6.7/:155 指路 ∥ §7 D-PR39/40；`docs/core/requirements/PROVIDER.md` §4.7/R23；批档 §2）。抽查全中：受影响文件现量实读 ＝ chat-call.mjs 68 ∥ normalize.mjs 138 ∥ errors.mjs 126（新档 image-heal.mjs ∥ 测试档未在盘 ✓）；设计坐标复核命中 ＝ core.mjs:416/:437/:453 ∥ errors.mjs:36 ∥ normalize.mjs:49/:79 ∥ record-results.mjs:54-62/:185 ∥ log.mjs:114（logEvent）∥ pushReal 双线共享消息对象（context-push.mjs:27-37）。**

| # | Category | Severity | Issue | Suggestion |
|---|----------|----------|-------|------------|
| 1 | Requirements | 🟡 | T1 触发缺 R23 的「HTTP 400」合取：设计只写「命中图像语义词表」∧ 历史含 image part（`docs/core/design/PROVIDER.md:632`），需求为「HTTP 400 ∧ 错误文本含图像语义」（`docs/core/requirements/PROVIDER.md:172`）。可构造后果（OpenAI 兼容路 413）：`thincoder-core/provider/core.mjs:419` 自加文案含「or remove historical images」⇒ 413 ＋ 历史含图 必命中 T1 ⇒ 全剥 + 重发，首发即绕过 §6.3 的 D-PR32 可操作化路径（`docs/core/design/PROVIDER.md:113`「从裸 HTTP 码变为可执行指引」）；该形态无 AC/T 覆盖（AC-3 声称「非图像错误零误伤」）。 | 二择一：① T1 加状态合取（复用 T2 同技法——从 message 提取状态码，限定 400/4xx 级）；② 明书 T1 文本面含 413 等非 400 图像词错误并入 §6.26 边界 + 补用例覆盖。 |
| 2 | Acceptance criteria | 🟡 | AC-5 机检锚点悬空：`docs/core/design/PROVIDER.md:695`「批内件对 `capHistoryImages` 缺省行为逐字断言」在用例表（`:673` 起，T-1..T-8 ∥ W-1）无止用例；「三坐标零改」非可执行检查形。 | 补编号用例（capHistoryImages 缺省参输出逐字等于批前占位）并写入 AC-5 锚；「三坐标零改」改写为可执行断言/检查形。 |
| 3 | Clarity | 🟡 | T-2 期望列内部不一致：`:678`「消息条数 / 文本 part 不变」与同行动作「注记在场」不可同时逐字成立——注记按 `:643`（「history 追加」）是机读线追加一条 user 消息 ⇒ 条数 +1；「文本 part 不变」按字面亦与 image part → text 占位互斥。 | 改写期望列：条数断言说明基线（剥除前后条数不变、注记另计 +1）＋「原文本 part 逐字保留、image part 归零」。 |
| 4 | Requirements | 🟡 | 需求锚落后于同批需求档：§6.26 `:616` 与 AC 回指列（AC-1/AC-5）只指 R11（`docs/core/requirements/PROVIDER.md:81`）；本批自有条目 R23/§4.7（`:164`、`:172`——评审声明所称需求锚）在设计档零引用（批档 §2 上抛 [知会] 的需求行已落稿）。 | §6.26 需求锚与 AC 回指列改指 §4.7/R23；R11 降为支撑锚。 |
| 5 | Document ownership | 🔵 | 需求档变更记录缺 §4.7 条目：末条仍为 2026-10-10（`docs/core/requirements/PROVIDER.md:203`「新增 **§4.6**」）；同批设计档已有 2026-10-15 条（`docs/core/design/PROVIDER.md:866`）。 | 需求档变更记录补 2026-10-15 条目（§4.7 R23/N15–N17 · 台账 #1450）。 |
| 6 | Clarity | 🔵 | streak 记账归属两说：`:658`「streak 记账一处」（image-heal.mjs）vs `:659`「成功路径清 `_imageFailStreak`」（chat-call.mjs）；自增条件（错误类、与 T2 判定先后、429 计入否）未钉定。 | 机制段收口 streak 语义一句（自增/清零/Abort 豁免）并统一「一处」措辞。 |

域外注（无严重度）：`thincoder-core/advisor/loop.mjs:11` 经 `chat()` 直调（不经 `callModelTurn`）——§6.26 `:631`（「全 depth 同径」）未列举该直调面；advisor 径可携图像历史否 ＝ unverified（若无 ＝ 零影响）。

**计数**：🔴 0 · 🟡 4 · 🔵 2（＋域外注 1）
**VERDICT: pass**

## §4 用户批准（主 agent）

**批准（父侧代签——2026-10-15）**：授权在册 = 用户 2026-10-15 00:08「都自动跑到交付吧」（报障来源 = 用户 2026-10-14：发图后会话烧死）。代签依据：① §3 设计评审 **pass**（advisor #40——六条发现全处置）；② 修正轮 #43 落讫、父侧复核通过（T1 补 HTTP 400 合取 ∥ streak 语义收口 ∥ 413 首撞/复撞明书 ∥ T-2 期望列收正 ∥ 需求锚改指 §4.7/R23 ∥ 机读注记 (HTTP 4xx) 同拍 ∥ T-9/T-10 补钉 ∥ 变更记录在档）；③ 需求档侧 = §4.7 在档 + 变更记录已补（父侧笔——行宽缺陷当场折行修讫）。**代签范围** = 实施派发（eng-coder）+ 后续收口链——不扩面、不夹带。

## §5 实施记录（eng-coder）
**状态行**：实施完成（五文件落讫（4 码 + 1 测试档）；批内 11/11 绿；红/绿判别在案；内部审计 + 代码评审双 pass、零 fix 轮 = clean）



### §5 实施记录（eng-coder · 2026-10-15）

**交付摘要**：机制照抄 `docs/core/design/PROVIDER.md` §6.26（判定 T1/T2 → 全剥历史图 copy-on-write → 机读注记 → 单次重发 → 落账 `llm:image-heal`）；受影响文件清单五件全落，零改面六件零 diff。

**改动表（行数口径 = 文件行数 · as-of 实施轮实读）**：

| # | 文件 | 行数 Δ | 动作 |
|---|---|---|---|
| 1 | `thincoder-core/agent/image-heal.mjs`（新档） | 0 → 65 | 判定 ∥ 剥除 ∥ 注记 ∥ streak 记账单源 ∥ `clearImageFailStreak` |
| 2 | `thincoder-core/agent/chat-call.mjs` | 68 → 81（+13） | catch 接线（未愈 ⇒ 原错照抛 ∥ 已愈 ⇒ 单次重发）+ 成功路径清零；发送选项对象 `sendOpts` 提出（首送 / 重发共用） |
| 3 | `thincoder-core/provider/normalize.mjs` | 138 → 168（+30） | `IMAGE_REJECTED_PLACEHOLDER` ∥ `stripRejectedImages` ∥ 私有共用替换核 `replaceImageParts` ∥ `capHistoryImages` 增 `placeholder` 参（缺省 = 原占位逐字） |
| 4 | `thincoder-core/provider/errors.mjs` | 126 → 134（+8） | `IMAGE_REJECTION_RE` ∥ `looksLikeImageRejection` |
| 5 | `docs/batches/2026-10-15-image-history-400.test.mjs`（新档） | 0 → 288 | 批内单元档：T-1..T-10 ∥ W-1（11 用例） |

**决策透明表（设计静默面内的自决——零语义偏离；均非设计变更）**：

| # | 决定 | 理由 |
|---|---|---|
| 1 | 取码用 `/LLM API error (\d{3}):/`（宽于机制文本字面 `/4\d\d/`），4xx 届定由下游 `code >= 400 && code < 500` 承担 | 行为等价（≥500 既不进 T1 也不进自增）；判据集中一处（评审 🔵 已登记——保留现状） |
| 2 | `logEvent("llm:image-heal", { …, streak })` 的 streak 取**自增后**值 | 设计未钉定取值时刻；取计数器活值 = 与 `agent._imageFailStreak` 现读一致（诊断单值） |
| 3 | 剥除后 `agent.history` 整体重指（非原位 splice） | 沿 `context.mjs` `applyCompression` 的 history 整体替换既有形态（`agent/turn-loop.mjs:131` 注释在案）；消费面皆经属性访问 |
| 4 | 注记直推 `agent.history.push`（不经 `pushReal`） | `[System reminder: …]` 族 = 机读线专属消息（`context-push.mjs` 注释在案）；人读线零损 = AC-2 本体 |

**验证读数（可复跑）**：

| 面 | 命令 / 方式 | 结果 |
|---|---|---|
| 批内用例 | `node --test docs/batches/2026-10-15-image-history-400.test.mjs` | **11/11 绿**（T-1..T-10 ∥ W-1；≈290ms） |
| 红 / 绿判别（临时探针 · 用毕即删 · 零残留） | 假服务端首请求 400 + 图像语义 → 次请求 SSE 200，直驱 `callModelTurn` | **修前**：回合抛 400 ∥ 请求计数 = 1 ∥ 图留史（用户报障面复现）；**修后**：回合成功 ∥ 计数 = 2 ∥ 历史无图 |
| 语法 | `node --check` × 五个 .mjs | 全过（exit 0） |
| 仓内套件 | `thincoder-cli` `npm test` | 空仓绿（2026-09-28 全量退役后零测试恒绿；批内档不入套件） |
| 零改面 | `git diff --stat`（仓根） | 本批码面 = 上表四档 + 测试档；`record-results.mjs` ∥ `context.mjs` ∥ `context-degrade.mjs` ∥ `provider/core.mjs` ∥ `tools/file.mjs` ∥ `package.json` 零 diff |
| AC-5 判据行 | `git diff -U0 thincoder-core/provider/normalize.mjs` + 旧档行实读 | 旧行触及面 = {18 后插入 ∥ 27 后插入 ∥ 33 后插入 ∥ 35 替换 ∥ 57–67 替换}；判据行旧 `:14`（32MB 值）∥ `:49`（驱逐早退）∥ `:79`（多模态放行）**不在触及面**（三行逐字仍在档） |

**审计与代码评审（轮次与终态）**：

| 轮 | 形式 | 结论 |
|---|---|---|
| 分歧审计（explore · 只读） | §6.26 逐条 vs 四码档 + 测试档 | **pass**——四类偏差零发现；报告项 2（设计档 Δ 估算漂移读数 ∥ §5 当时为空） |
| 代码评审（advisor · code） | 五档面逐行 + 验收对照 | **pass**——🔴 0 · 🟡 0（must-fix 0）· 🔵 5（取码字面差 ∥ streak 跨回合语义 ∥ 续接后自愈痕迹回滚面 ∥ §5 记录滞后 ∥ 外部行宽闸皆为登记项） |
| fix round | — | **零轮**（两轮均无 must-fix）⇒ **终态 = clean（首轮收敛）** |

**披露（登记项零动作——均非缺陷）**：① `_imageFailStreak` 跨用户回合存续（跨回合连续 4xx 失败下 T2 可首撞触发——按 §6.26 `:634` 字面语义）；② 会话续接以人读线重建机读史 ⇒ 注记丢失、图回场（同类拒绝可再触发一次自愈；人读线零损 = AC-2 本体，图持久化体积 = §6.26 `:708` 边界）；③ `advisor/loop.mjs` 经 `chat()` 直调面不自愈（设计评审 §3 域外注同款，本批边界外）。

**零触声明**：设计档 / 需求档 / 批档 §1–§4 与 §6 零笔（非本席面）；规格表 / 预设 / 三端 UI 零触；零新依赖（`package.json` 零 diff）。**部署面注**：本仓生效；CLI 全局副本 / 桌面 asar 随发布链（跨端面不在本批）。

## §6 验证与收口（父代理）

**验证与收口（主 agent）· 2026-10-15 01:2x**

**验收（父侧实测 · 01:17）**

- 批内件复跑：`node --test docs/batches/2026-10-15-image-history-400.test.mjs` ⇒ **11/11 绿**（fail 0 · ≈345ms）。
- 触及面实核（`git status` · workdir = thincoder）：四码（`image-heal.mjs` 新档 ∥ `chat-call.mjs` ∥ `normalize.mjs` ∥ `errors.mjs`）+ 一批内件；**禁改面零 diff 复核 ✓**（`record-results.mjs` ∥ `context.mjs`/`context-degrade.mjs` ∥ `provider/core.mjs` ∥ 规格表/预设/三端 UI ∥ `package.json`/锁）。
- 核读：`image-heal.mjs`（65 行）与设计 §6.26 逐条对读 ✓（T1/T2 判定 ∥ copy-on-write 全剥 ∥ 注记逐字 ∥ 单次重发归 catch 支 ∥ 零抛 ∥ 清零单源）。

**收口**

- 单元档随批档归档（`docs/batches/2026-10-15-image-history-400.test.mjs`——不入任何门）；**集成面 = 本批无新增**（前端参与面为零；真实复现腿 = 用户再发图自证）。
- 设计档 §6.26 受影响文件表 Δ 实读随正（父侧直接执行 · 可 revert——指针/counts 面）。
- 台账：#1450 结算（在途 ⇒ 待核销 ⇒ 已核销）；设计链 = 终态（令牌 slot 随本收口核销）。
- 登记项（批 §5 上抛两条 → 三条，均非缺陷——记录面在案）：① streak 跨用户回合存续（跨回合连败下 T2 可首撞触发，按设计字面）；② 会话续接以人读线重建机读史 ⇒ 注记丢失、图回场（可再自愈一次）；③ `advisor/loop.mjs` 经 `chat()` 直调面不自愈（设计域外注同款）。
- 用户自证腿：再发一张图（400 自愈面已落；若真机再现「发图即烧死」另报）。
