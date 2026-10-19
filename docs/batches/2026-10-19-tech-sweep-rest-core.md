# 2026-10-19 · tech-sweep-rest-core
> 六段 append-only，一段一作者：§1 讨论（主 agent）· §2 批次任务与设计（eng-designer）· §3 设计评审（评审子代理）· §4 用户批准（主 agent）· §5 实施记录（eng-coder）· §6 验证与收口（父代理）。
> 编制：主 agent · 2026-10-19 · 来源 = 用户令 2026-10-19 08:28/08:31/08:33/08:34/08:35「技术待办现在就开始处理」「继续不要等」「全部都开」「接着派，别等」「都派出了吗？」——批 K = core 面剩余 15 项。。
> 台账 = #1220 ∥ #1372 ∥ #1498 ∥ #1500 ∥ #1501 ∥ #1507 ∥ #1508 ∥ #1514 ∥ #1552 ∥ #1583 ∥ #1587 ∥ #1590 ∥ #1598 ∥ #1620 ∥ #1635（归批）。前情 = docs/batches/2026-10-19-tech-todo-sweep.md（在途）。
## §1 讨论（主 agent）
**状态行**：🔄 进行中（…）
<§1 模板占位：本批条目 / 关键判据 / 授权口径>
## §2 批次任务与设计（eng-designer）
**状态行**：设计完成 2026-10-19（15 条全覆盖：零动作 5（#1220 #1552 #1590 #1635 条件态 #1500 前提不成立）· 文档面 7（#1498 余 4 处改指 / #1501 ~57 行 / #1508 主 agent 笔 / #1514 59 行三类 / #1583③ / #1587 / #1598 2 行）· 产品码面 3（#1372 抽件 / #1507 四键 / #1620 引用形））
<§2 模板占位：本批条目（覆盖） / 设计档落点 / 机制设计 / 受影响文件与测试覆盖 / 验收对照 / 关键决策 / 上抛项>

### 逐条设计（台账号 → 实读现状 → 目标形 → 判类）

**本批条目（覆盖）**：`#1220` `#1372` `#1498` `#1500` `#1501` `#1507` `#1508` `#1514` `#1552` `#1583` `#1587` `#1590` `#1598` `#1620` `#1635` —— **15 条全覆盖**（用户 2026-10-19「全部都开」）。**设计档落点 = 本 §2 + 就地收正的承载档**（无新建设计档：15 条全是既有机制的残留收正，零新机制）。

**共同判据（本批单源）**：批档可整批清理 ⇒ 指向批档 / 批内单测档的指针一律按「一次性产物」处理：删指针、保事实。单元测试档寿命 = 用毕即删（零留存）。

#### 已消失 / 已落 —— 零动作四条（每条给证据）

| 台账号 | 任务书前提 | 盘上事实（实读） | 判定 |
|---|---|---|---|
| `#1220` | 登录后模型候选面刷新时点待补（补一次全状态推送 + 三端同判） | 批 `docs/batches/2026-10-16-login-model-refresh.md:6` 状态行 = 「已收口 2026-10-16」；落地面实读在位：VSC `thincoder-vscode/src/extension/panel-messages-settings.mjs:268`（`panel._pushSettings()`）∥ `team-surface.mjs:135`（`loginFlow()` 成支 `_chatPanel?._pushSettings?.()`）∥ 桌面 `mount-team.mjs:49/:149` + `mount-settings.mjs:155-156` ∥ CLI 零改（既有 `cmd-team.mjs` `syncProvidersFromDisk` 覆盖） | **零动作**——本批前提已消。批内单测档 `2026-10-16-login-model-refresh.test.mjs` 不在盘（收口随批删，符合零留存）。台账核销归主 agent |
| `#1552` | `BATCH-RECORD.md` §4.13 取行面为「原值等值」，应改解析同址 | `docs/core/design/BATCH-RECORD.md:285`（§4.13 收口重锚块）实读 = 「取本批行集（`ledgerBatchRows`——选行单源 = `design/LEDGER.md` §7.1 解析同址，零二写）」 | **零动作**——口径已是解析同址，与 `LEDGER.md` §7.1 同源。（同档正由批 I 改，本批不触，避免冲突） |
| `#1590` | `PROMPT-SYSTEM.md` §6.11 预算表读数待按当刻实测收正 | 当刻实跑 `node scripts/tool-schema-size.mjs`（exit 0）= **档数 52 · 总量 143,572 · 比值 1.387**；tool-docs **53 档 · 92,396 字符**；top = subagent 17,191 ∥ browser 11,924 ∥ git 7,894 ∥ ssh 7,472 ∥ batch 6,553。表内（`PROMPT-SYSTEM.md:284-292`）「当前 143,572 = 1.387 ×」「单档帽 subagent 17,191 ∥ browser 11,924」「top5 逐字」「53 档（枚举 52 ∥ 目录 53）」**逐项与实测全等** | **零动作**——已由 `#1658` 收正，读数未漂 |
| `#1635` | `dev-link --json` 跳过面与零链不可区分，契约修订时补 `skipped` | 契约冻结期（K6「不加字段、不改契约」）内无契约修订窗口 | **本批不办**——记录「待契约修订时补 `skipped` 标记 + 同步 `READ-DATA-INTERFACE.md` 契约面」；台账保持未核销（条件型：契约修订轮） |

#### 文档面（设计席笔 —— 实施轮落，D8/C 类）

| 台账号 | 实读现状（坐标） | 目标形 | 判类 |
|---|---|---|---|
| `#1498` | `docs/core/design/LEDGER.md` 标题层 §1–§9，**无 §13.4**（原节随 2026-10-15 历史清除删除，内容已入 §3 / §5）。存活死指针 4 处：`thincoder-core/ledger-cmd.mjs:17` ∥ `:30` ∥ `thincoder-core/ledger-db.mjs:139` ∥ `docs/core/requirements/ENGINEERING-MODE-V2-SPEC-LEDGER.md:84`（AC-M2-24 回指「设计档 §13.4」）。docs 面另 2 处（`docs/server/design/ledger/LEDGER.md:6/:22`）已改指 §3/§5（前批已落） | **不补节**（补节将与 §3/§5 双重陈述 = D2 违反）⇒ 余 4 处改指 `§3 / §5`：3 处产品码行注 = 机械改（eng-coder）；需求档 1 处 = **主 agent 笔**（上抛） | 补节 ∥ 改指：**裁 = 改指**；剩余面 = 机械改 3 + 需求档 1 |
| `#1501` | 「随批留存 / 随档留存」陈句族在 **live 文档 ~57 行**（`docs/batches/**` 不计——过程档可整批清理）：core design 6（`AGENT-LOOP-UPSTREAM.md:1087` · `DOC-DISCIPLINE.md:1588` · `PROVIDER.md:493` · `PROXY.md:146` · `TEAM.md:178` `:181`）· desktop design 38（`ACTIVITY` 2 · `CHAT` 3 · `COMPOSER` 8 · `E2E-TESTING` 4 · `MENU` 4 · `PROJECT` 3 · `RENDERER` 1 · `SESSIONS` 4 · `SETTINGS` 4 · `SHELL` 1 · `UI` 4）· render-core 8（`RENDER-CORE.md`）· server design 3（`client/CLIENT.md:46` · `PROJECT.md:157` `:232`）· requirements 2（`ENGINEERING-MODE-V2-SPEC-TEST-DISCIPLINE.md:7` `:14`） | 统一到现行口径 **「用毕即删（零留存）——批档 §5 留一行读数」**；「复跑 = 单档直跑」改「运行口径 = 批内单档直跑，无『再跑旧档』面」。逐档就地替换，不跨档复制副本 | **一致性面 ⇒ 可改**（口径统一，非新语义）。实施按档分段，逐处报读数 |
| `#1508` | `docs/core/requirements/TESTING.md:169`（N11 行，原报 :167 已漂）写「`doc-check.mjs` ∥ `doc-check-width.mjs` ∥ V1–V3 判据**零改**」——`scripts/doc-check.mjs` 现为 V5 专用面、已退出 gate 判据链（`#1666`），gate 判据源 = `thincoder-core/doc-check/index.mjs` | 该句射程收为「**本次清理不得弱化结构机检**」，判据源指名现行 gate 引擎 | **需裁 + 主 agent 笔**（需求档）——上抛，设计席不越笔 |
| `#1514` | `docs/core/design/TOOLS.md` 含测试档引用 **59 行**（`Select-String "test/|\.test\.mjs|单元测试档"`）；`:547` 一带为用例表，命中 `test/turn-domain-mode.test.mjs`（`thincoder-core/test/` 树已清退 ⇒ 死引用）。`T-F9` 在 `docs/core/design/MANIFEST.md` = **0 命中**（已消失） | 逐行三分类：① `thincoder-core/test/**` 类 = 死引用 ⇒ 删引用、保用例本体事实；② `thincoder-vscode|cli/test/**` = 树在盘 ⇒ 逐条判（在盘留作现行读数，不在盘按 ① 办）；③ 批内 `.test.mjs` = 零留存 ⇒ 点「批内定向单测（收口随批删）」形。`:547` 行内 `test/turn-domain-mode.test.mjs` 按 ① 办 | **机械改**（分类判据已给）。`T-F9` 子项 = 零动作 |
| `#1583` | ③ 取材纪律（归档面不得作出处 / 当现行；派单与写档只认 live 面）已生效但**只住批档与台账证据**；`_archive/**` 4 处「三条硬约束②」为当时正确记载 ⇒ 不改（改 = 篡改历史） | ③ 成文入承载档：`docs/core/design/DOC-DISCIPLINE.md`（文档写作纪律节）加一句「归档面（`_archive/**`）为历史记载：不得作出处、不得当现行；派单与写档取材只认 live 面」 | ③ = **文档面机械改**；④（归档标记 / 检索识别）= **用户未点名立项 ⇒ 不做**，只记录 |
| `#1587` | 用户 2026-10-16 17:46 令「这种计数根本就不应该出现在文档里」。判据 = **声明数须有下游消费者**（机器读取面 / 清单自身闭合 / 真实门）；无下游的装饰数字不写进文档。实证样例（今日亲历）：同一表内「四档均 ≤500 行」与「781 行」并存；「现盘实读 49 档」实 52 | 全库（`docs/**` live 面，`_archive` ∥ `batches/**` 除外）逐处判：无下游的声明数**删数保事实**（读者数清单即可）；有下游（manifest `checkConfig`、gate 判据、同表自闭合）**留** | **一致性面 ⇒ 可改**；判据机械（有 / 无下游消费者二值） |
| `#1598` | `docs/RELEASE.md`（238 行）逐行长度实测：**>300 字符 26 行**（含表行）。台账原报 `:35` 413 ∥ `:99` 574 为旧号，现实号 = `:37` **636** ∥ `:106` **1,048** | 表行不能折行 ⇒ **改结构**：长单元格拆为「主行 + 续行（列表条目）」，事实逐字保留、零删减 | **需结构改**（文档面）。本批办台账点名 2 处；其余 24 行存量族登记（不硬折） |

#### 产品码面（eng-coder 落 —— 本席只出设计）

| 台账号 | 实读现状（坐标） | 目标形 | 判类 |
|---|---|---|---|
| `#1372` | 准入包装两份同构：`thincoder-core/memory/docs.mjs:123-132`（`declCache` / `scopeCache` / `rowHidden`）∥ `thincoder-core/memory/code-search.mjs:41-50`——函数体逐字相同（排除谓词 ∪ 声明范围门） | 抽 `thincoder-core/memory/read-gate.mjs`：导出 `createReadGate()`（返回 `{ rowHidden }`，内部持两缓存）；两档改为 import 并调用 | **机械改**（行为零变：同判据、同缓存粒度） |
| `#1500` | `thincoder-desktop/src/main/session-flags.mjs:36-44` 四键闭集 + `FLAG_WRITERS` 四口；`:74` 工程位 = `setSlotEngineering`（核单点 `session-slot-write.mjs`），与其余三键同表；「四路判据面」在 `:11` 头注只落「判据两档（`bad-key` / `invalid-patch`）」（待补实读：四路判据面本体坐标） | 补齐「档非法面」处置登记：`setSlotEngineering` 的失败径（`slot-missing`）已在 `:75/:82` 归口；剩下的是**档内容非法**（槽档损坏 / 键值非布尔）是否需独立 reason——补一句登记或补判据 | **待补实读 + 需裁**：先定「四路判据面」所指，再判「补登记 ∥ 补判据」（上抛） |
| `#1507` | 核字典缺四键 `sub.async` / `sub.sync` / `sub.waiting` / `sub.awaitingApproval`（宿主字典各有定义：desktop `renderer/i18n.mjs:196-199` ∥ VSC `locales/en.json:206-213`）；CLI 运行面板 `subagent-panel.mjs:73-106` 词面自铸（含 zh 混排）；`render-segments.mjs:26-27` tool 状态词值形差（en `running…` ≠ `running`）；`:162/:165` advisor 标签无核键 | 核 `i18n.mjs` 四键在册 ⇒ 与宿主同形补四键；CLI 面板改走 `t()` 键（去自铸）；值形统一（`running…` ⇒ 键值形） | **多实现面差默认消除**；实施前须实读现号（台账坐标为 2026-10-15 读数）。面较大 ⇒ 本批只落「核字典四键 + 值形统一」；CLI 面板词面重写**另批**（上抛） |
| `#1620` | `docs/server/design/agent/ADMIN-AGENT.md` R54/R60/R61/R71 行 + `docs/server/design/webui/CHAT.md` 随正件段逐条点名 `test/2026-10-11-*.test.mjs` 并携行号；server 零留存 ⇒ 引用对象已删 | 改为「批内定向单测（收口随批删）」形；**不写具体档名 / 行号**。R 行是否整体迁出设计档（历史轨迹性质）**另裁** | **一致性面 ⇒ 可改**（引用对象已不存在）；R 行迁移 = 上抛 |

**关键裁决（记入本批）**

1. `#1498` 选「改指」不选「补节」——补节会与 §3/§5 形成两处同义陈述（D2 违反），且原节内容已在 §3/§5 完整承住。
2. `#1552` / `#1590` / `#1220` 判零动作而非「重做一遍」——盘上证据显示前提已消，重做 = 推翻已评审命名 / 重写同值读数。
3. 批内单测档（`docs/batches/*.test.mjs`）在本批一律不进受影响文件表——它们是过程产物（零留存），引用它们的设计句按「批内定向单测（收口随批删）」形写。

**受影响文件表（现行行数 · 待实施轮实读回填增量）**

| 档 | 现行行数 | 增量 | 判类 |
|---|---|---|---|
| `docs/core/design/TOOLS.md` | 待回填 | −（删死引用） | #1514 文档改 |
| `docs/core/design/DOC-DISCIPLINE.md` | 待回填 | +1 句 | #1583③ |
| `docs/core/design/PROMPT-SYSTEM.md` | 待回填 | 0 | #1590 零动作 |
| `docs/core/design/BATCH-RECORD.md` | 待回填 | 0 | #1552 零动作（批 I 在改，本批不触） |
| `docs/RELEASE.md` | 238 | ±（拆行，事实零删） | #1598 |
| desktop design 11 档 / render-core 1 档 / server design 2 档 | 待回填 | 0（句内替换） | #1501 |
| `docs/core/requirements/ENGINEERING-MODE-V2-SPEC-LEDGER.md` | 待回填 | 0（1 处改指） | #1498 需求档（主 agent） |
| `docs/core/requirements/TESTING.md` | 待回填 | 0（1 句射程） | #1508（主 agent） |
| `docs/core/requirements/ENGINEERING-MODE-V2-SPEC-TEST-DISCIPLINE.md` | 待回填 | 0（2 处替换） | #1501 |
| `docs/server/design/agent/ADMIN-AGENT.md` · `docs/server/design/webui/CHAT.md` | 待回填 | 0（引用形替换） | #1620 |
| `thincoder-core/memory/read-gate.mjs` | 新档 ≈20 | +20 | #1372 新产品档 |
| `thincoder-core/memory/docs.mjs` · `code-search.mjs` | 待回填 | −9 / −8 各 | #1372 |
| `thincoder-core/ledger-cmd.mjs` · `ledger-db.mjs` | 待回填 | 0（注释改指） | #1498 |
| `thincoder-core/i18n.mjs` · `memory/render-segments.mjs` | 待回填 | 待实施读 | #1507 |
| `thincoder-desktop/src/main/session-flags.mjs` | 97 | 0～+2（登记句） | #1500 |

**贴线判**：唯一新增档 `read-gate.mjs` ≈20 行；其余全为既有档句内改，**零档越 500 顾问线新增**（`RELEASE.md` 238 拆行后仍 ≈238+）。

**验收对照（每条可机判）**

- AC-1 零动作四条：`#1220` `#1552` `#1590` 各自证据行在本 §2 在册且可复读；`#1635` 保持条件态。
- AC-2 `grep -c "§13.4" thincoder-core/ledger-cmd.mjs thincoder-core/ledger-db.mjs` = 0（改指后）。
- AC-3 `grep -rn "随批留存\|随档留存\|留存归档\|可按需复跑" docs/core docs/desktop docs/render-core docs/server docs/vsc --include=*.md` 在 live 面命中 = 0（`_archive/**` 与 `batches/**` 除外）。
- AC-4 `node bench/check/run.mjs` = 0 failed（产品码面改动后）。
- AC-5 `node scripts/tool-schema-size.mjs` 复跑，`PROMPT-SYSTEM.md` §6.11 表逐项与读数全等（#1590 断言）。
- AC-6 `doc_check(mode:"gate")` = PASS（本轮改过的档）。
- AC-7 `#1372`：`grep -c "const rowHidden = " thincoder-core/memory/docs.mjs thincoder-core/memory/code-search.mjs` = 0 / 0；`read-gate.mjs` 命中 = 1。

**上抛项**

- `[上抛·待裁]` `#1508` 需求档 N11 射程句——需求档笔在主 agent，目标形已给（射程 = 「本次清理不弱化结构机检」，判据源指名 gate 引擎），请主 agent 落笔。
- `[上抛·待裁]` `#1620` R 行（R54/R60/R61/R71）本身是历史轨迹性质，是否整体迁出设计档 = D10 面另裁；本批只做引用形替换。
- `[上抛·待裁]` `#1507` 面较大：本批只落核字典四键 + 值形统一；CLI `subagent-panel.mjs` 词面重写（含 zh 混排）另批。
- `[上抛·待裁]` `#1583` ④（归档标记 / 检索识别）用户未点名立项 ⇒ 不做，只记录。
- `[上抛·待裁]` `#1500` 「四路判据面」本体坐标需先定；定后再判补登记 ∥ 补判据。
- `[上抛·知会]` `#1498` 需求档 `SPEC-LEDGER.md:84` 的「设计档 §13.4」回指同为死指针（第 4 处），随上抛一并处置。

**未解清单（本版未实读到底，第二轮补）**：`#1500` 四路判据面坐标 · `#1507` 现号实测 · `#1620` 测试档在盘状态 · `#1587` 逐处实例清单 · `#1598` 其余 24 行存量族分布 · 受影响文件表「待回填」行数。

### 第二轮实读 —— 订正与补全（以本块为准）

**订正 A（上一块 `#1598` 行作废）**：上一块据 PowerShell `Get-Content` 读出「26 行 >300、现 :37/:106」——**该读数是错的**：PowerShell 以本地代码页读 UTF-8 档，行数被并成 238（真值 387）。**UTF-8 实读复测（`node` 逐行 `.length`）**：`docs/RELEASE.md` = **387 行**，超 300 字符 = **2 行**，坐标与台账逐字一致——`:35`（**413**，表行）∥ `:99`（**574**，表行）。⇒ `#1598` 前提成立且坐标未漂：目标形 = 两处表行改结构（长格拆「主行 + 续行条目」，事实逐字保留）；**存量族 = 2 行，不是 26 行**。

**订正 B（`#1500` 改判零动作）**：实读 `thincoder-core/session-slot-write.mjs`——`setSlotEngineering`（`:156-158`）= `writeFlag`（`:137-143`）→ `loadSlotForWrite`（`:127-134`），与其余三键**同一条写径**；该径的判据四项（`version > 2` / 异 cwd / 槽档损坏 / 未知槽）在 `:122-126` 注释与 `:132`（文件在但不可读 ⇒ 不覆盖）逐条在册，失败径统一由 `writeFlag` 返回 `false` ⇒ `session-flags.mjs:75` 归 `slot-missing`。**全仓 grep「四路」**：`docs/desktop/design/UI.md:118/:184/:379`（输入提示判据四路——与写槽无关）+ `thincoder-core/config.mjs:55`（并发表 4/4/4）⇒ **任务书所称「四路判据面」在盘上无对应物**。判定 = **零动作（前提不成立）**；若用户另有所指，需点名该面（上抛）。

**订正 C（`#1635` 落点）**：实文件 = `scripts/dev-link.mjs`（12 KB · 非 `thincoder-cli/scripts/`）。实读 `:155-160`：`--win32-only` 在非 win32 ⇒ stderr 出跳过行 + **stdout 出 `{"links":[],"ok":true}`**（`:160`）；而正常零链径（`:168`）同形 ⇒ **确认不可区分**。契约面 = `READ-DATA-INTERFACE.md`（`--json` 契约 `{ links, ok }`，`:26`）。判定 = **本批不办**，记录「契约修订轮补 `skipped` 标记 + 契约面同步」。

**补全 D（`#1514` 分类读数）**：`docs/core/design/TOOLS.md`（**1,119 行**）命中测试档引用 **59 行**，按类分：① `thincoder-core/test/**` = **12 行**（树已清退 ⇒ 死引用）；② `thincoder-vscode|cli/test/**` = **11 行**（树在盘 ⇒ 逐条判：在盘留现行读数，不在盘按 ① 办）；③ `docs/batches/*.test.mjs` = **3 行**（零留存 ⇒ 点「批内定向单测（收口随批删）」形）；④ 其余 33 行 = 「单元测试档」散文（口径句，按 `#1501` 一并收正）。`.test.mjs` 判据 = 文件 `Test-Path` 逐条核（实施轮逐行给读数）。

**补全 E（`#1620` 在盘核）**：`thincoder-server/test/` 实读 = **1 档**（`rc-resolve.mjs`，非单元测试档）⇒ `ADMIN-AGENT.md` R54/R60/R61/R71 与 `webui/CHAT.md` 点名的 `2026-10-11-*.test.mjs` **全部不在盘**（零留存已生效）。⇒ 引用形替换为本批实施面；R 行整体迁移仍上抛。

**补全 F（`#1507` 现行读数）**：`thincoder-core/i18n.mjs`（**105 行**）实读 `sub.*` 八键 = `running:55` · `queued:56` · `stopped:57` · `done:58` · `error:59` · `cancelled:60` · `awaitingDigest:61` · `queueSlot:62`——**确缺** `sub.async` / `sub.sync` / `sub.waiting` / `sub.awaitingApproval` 四键。CLI 面板 `thincoder-cli/src/tui/render-segments.mjs`（非核 `memory/` 下）与 `subagent-panel.mjs` 词面待实施轮实读现号。

**补全 G（受影响文件表 · 行数回填，均 UTF-8 实读）**

| 档 | 现行行数 | 增量预期 |
|---|---|---|
| `docs/core/design/TOOLS.md` | 1,119 | −（12 行死引用清理；净减） |
| `docs/core/design/DOC-DISCIPLINE.md` | 1,199 | +1 句（#1583③） |
| `docs/core/design/PROMPT-SYSTEM.md` | 555 | 0（#1590 零动作） |
| `docs/core/design/BATCH-RECORD.md` | 377 | 0（#1552 零动作；批 I 在改，本批不触） |
| `docs/RELEASE.md` | 387 | ±（:35 / :99 两行拆结构，事实零删） |
| `docs/core/requirements/TESTING.md` | 178 | 0（1 句射程 · 主 agent 笔） |
| `docs/core/requirements/ENGINEERING-MODE-V2-SPEC-LEDGER.md` | 64 | 0（1 处改指 · 主 agent 笔） |
| `docs/core/requirements/ENGINEERING-MODE-V2-SPEC-TEST-DISCIPLINE.md` | 26 | 0（2 处替换） |
| `docs/server/design/agent/ADMIN-AGENT.md` | 388 | 0（引用形替换） |
| `docs/server/design/webui/CHAT.md` | 147 | 0（同） |
| `docs/core/design/PROVIDER.md` · `PROXY.md` · `TEAM.md` · `AGENT-LOOP-UPSTREAM.md` | 398 · 97 · 161 · 927 | 0（#1501 句内） |
| `docs/render-core/design/RENDER-CORE.md` | 337 | 0（#1501 句内，8 处） |
| `docs/server/design/client/CLIENT.md` · `docs/server/design/PROJECT.md` | 59 · 252 | 0（#1501 3 处） |
| `thincoder-core/memory/read-gate.mjs` | 新档 ≈20 | +20（#1372） |
| `thincoder-core/memory/docs.mjs` · `code-search.mjs` | 234 · 153 | −9 / −8 各（抽件后） |
| `thincoder-core/ledger-cmd.mjs` · `ledger-db.mjs` | 147 · 213 | 0（3 处行注改指） |
| `thincoder-core/i18n.mjs` | 105 | +4 键 |
| `thincoder-cli/src/tui/render-segments.mjs` | 待实施读 | 值形统一 |
| `thincoder-desktop/src/main/session-flags.mjs` | 74 | 0（#1500 零动作） |

**贴线判**：新增档仅 `read-gate.mjs` ≈20 行；`TOOLS.md` 1,119 / `DOC-DISCIPLINE.md` 1,199 均已越 800 硬限（存量债，非本批引入，本批只减不增）。

**AC 补订**：AC-3 的射程此前写作「`docs/vsc`」——实测 `docs/vsc/**` 零命中该族，射程改为 `docs/core docs/desktop docs/render-core docs/server docs/*.md`，`_archive/**` 与 `batches/**` 除外。AC-5 复跑口径 = `node scripts/tool-schema-size.mjs`（本批已跑：52 档 · 143,572 · 1.387）。

## §3 设计评审（评审子代理）
## §4 用户批准（主 agent）
## §5 实施记录（eng-coder）
## §6 验证与收口（父代理）
