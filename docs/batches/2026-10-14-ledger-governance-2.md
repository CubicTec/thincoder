# 2026-10-14 · ledger-governance-2
> 六段 append-only，一段一作者：§1 讨论（主 agent）· §2 批次任务与设计（eng-designer）· §3 设计评审（评审子代理）· §4 用户批准（主 agent）· §5 实施记录（eng-coder）· §6 验证与收口（父代理）。
> 编制：主 agent · 2026-10-14 · 来源 = 用户 2026-10-14 00:16 原话「那清帐轮那些你也落地吧」（承父侧 00:11 建议①②③ + 00:15 落地方案）；三条 = 清账轮增补：锚点复核 ∥ 族行 ∥ evidence 指针化上限；台账 #1386。。
> 台账 = #1386（core · 归批）。前情 = docs/batches/2026-10-07-ledger-governance.md（§6.20 五条——本批 = 其增补 v2）。
## §1 讨论（主 agent）
**状态行**：🔄 进行中（…）
<§1 模板占位：本批条目 / 关键判据 / 授权口径>

**2026-10-14 · 台账治理增补 v2（清账轮三条——用户 00:16「落地」）**

- **来源（逐字）**：用户 2026-10-14 00:16「那清帐轮那些你也落地吧。」——承父侧 00:11 建议①②③（**来源 = 设计侧提议**，用户 00:16 批准落地）+ 00:15 落地方案（落点 = `PROMPT-SYSTEM.md` §6.21 + 双面提示词；工具面零改）。台账 **#1386**。
- **三条（逐条 = 要求 + why + 实证）**：
  ① **锚点复核**——清账轮对「归批」行逐行核锚：锚的批已收口而活未落 ⇒ 当场重锚（转下一触点 ∥ 升小批候选 ∥ 降「认账不排期」）。why = 池面未决数须代表真实工作量，不掺悬空。实证 = #1235（锚「沙盒批修正轮」——该批已收口仍挂）∥ #1193/#1194（锚「VSC 面下批」）。
  ② **族行**——同主题散行归一为「族行」（一行 = 一个工作对象，标题携成员清单；成员同批同轮收口）。why = 101 条未决里独立工作对象少得多；批点火扫描一眼看全。实证 = 越线拆案族 #1269 ∥ #1297 ∥ #1309 ∥ #1313 ∥ #1352（五行 = 一个「结构拆分收口」）。
  ③ **evidence 指针化上限**——行内只留「一行症状 + file:line + 指针」，细节入所指档；软上限随设计定形。why = 台账 = 一眼能扫的账，不是档案馆；开局自查须扫得动。实证 = #1250 ∥ #1208 ∥ #1354（千字长行）。
- **先例形状**（沿 2026-10-07 ledger-governance 批 ∥ #997）：设计轮 = `PROMPT-SYSTEM.md` 新节 §6.21 + 决策行（设计席笔）；实施轮 = 双面提示词落笔（CN 正本 `docs/core/design/prompts/persona-engineering.md` → EN `thincoder-core/prompts/persona-engineering.md` 按 M9 翻译回写）；清账轮记录面 = 批档（规则不进批档）。
- **边界**：工具面零改（query/close/evidence 能力已足）∥ 不动 §6.20 五条正文（增补）∥ 零新机制（纯纪律）。

- **2026-10-14 00:3x · 节号收正（#114 上抛）**：上文「`PROMPT-SYSTEM.md` 新节 §6.21」的节号假设不成立——§6.21（普通模式工作管理统一 · 2026-10-09 批 · #1111）∥ §6.22（产品常识 · 2026-10-09 批 · #1139/#1140）均已在盘（`PROMPT-SYSTEM.md:529`/`:554`）⇒ 本批新节顺延 **§6.23**（设计席收正并具名披露——§2 记节号登记注）。父侧失误（派单未先扫节号——记取）。

## §2 批次任务与设计（eng-designer）
**状态行**：设计完成（initial 轮——三条落位 ∥ CN 正本直落 ∥ EN 实施轮）
<§2 模板占位：本批条目（覆盖） / 设计档落点 / 机制设计 / 受影响文件与测试覆盖 / 验收对照 / 关键决策 / 上抛项>

**设计轮交付（eng-designer · 2026-10-14 · initial）**

**① 本批条目（覆盖）**

- **#1386**（core · 归批）：清账轮三条入提示词面——① 锚点复核 ∥ ② 族行 ∥ ③ evidence 指针化上限（软上限 + 例外形 = 设计定形）。载体 = 本批；唯一标尺 = §1（用户 00:16「那清帐轮那些你也落地吧。」+ 父侧 00:11 建议①②③——设计侧提议经用户批准）；授权链 = §1 全链在案。
- **零触面（明确不在本批）**：工具面零改（query/close/evidence 能力已足——三条 = 纯纪律）∥ §6.20 五条正文逐字不动（本批 = 增补 v2）∥ 其余纪律零触 ∥ 清账轮记录面不进本档（先例 = `docs/batches/2026-10-13-ledger-cleanup.md`）∥ 零产品码 / 零测试码。
- **节号收正（机械）**：§1 记「新节 §6.21」——该号已被 2026-10-09 两批占用（§6.21 普通模式工作管理 ∥ §6.22 产品常识——`docs/core/design/PROMPT-SYSTEM.md:529` ∥ `:554` 实读）⇒ 新节顺延落 **§6.23**（设计档笔内机械收正；已随 `notify_parent` note 披露）。**三链同源照立**（§2 条目 ↔ §6.23 / D-PS ↔ 需求 = U1）。

**② 条款稿 CN（逐字——本轮已落，`docs/core/design/prompts/persona-engineering.md`）**

（a）「派发与收尾纪律」节——「能当场做的当场做」(`:84`) 后新 bullet（锚点复核；落成 `:85`）：

```text
- **清账轮核锚**：清账轮（池面清理轮）对「归批」行**逐行核锚**——锚的批已收口而活未落 ⇒ **当场重锚**（转下一触点 ∥ 升小批候选 ∥ 降「认账不排期」）——池面未决数要代表真实工作量，不掺悬空。
```

（b）「台账」节——「单行 = 单结算单元」(`:178`) 后新 bullet ×2（落成 `:180`–`:181`）：

```text
**族行**：同一工作对象的散行 ⇒ **归一为族行**（一行 = 一个工作对象，标题携成员清单；成员**同批同轮收口**）——批点火扫描一眼看全。「入库查重」管登记时点，族行管存量行的归并形；与「单行 = 单结算单元」同轴：**拆** = 不相干项不绑，**并** = 同一工作对象不分家。
**evidence 指针化上限**：登记时即按此写形——行内只留「一行症状 + file:line + 指针」，细节入所指档；软上限 **≈ 300 字**（超限先想「哪段该进所指档」——清账轮把超限行当收窄小件收）。**例外**：细节尚无落点（未建档 ∥ 待裁 ∥ 所指档不可达）⇒ 允许内嵌摘要；落点一出现即收窄。
```

**③ EN 逐句稿（实施轮落运行面——同语义；M9 翻译回写，非 cp）**

（a′）`thincoder-core/prompts/persona-engineering.md:84`（*Fix in place first* 行后新 bullet）：

```text
- **Anchor re-check at cleanup rounds**: at a ledger cleanup round, re-check every「归批」(batched) row's anchor, line by line — the anchor batch has closed while the work has not landed ⇒ **re-anchor on the spot** (move it to the next touchpoint ∥ promote it as a small-batch candidate ∥ downgrade to「认账不排期」(acknowledged, unscheduled)) — the unsettled pool count must represent real work, not dangling pointers.
```

（b′）`thincoder-core/prompts/persona-engineering.md:181`（*One row = one settlement unit* 行后新 bullet ×2）：

```text
**Family rows**: scattered rows on the same work object ⇒ **collapse into one family row** (one row = one work object; the title carries the member list; members **close within the same batch / round**) — the pre-ignition scan reads the whole picture at a glance. 「入库查重」(dedupe on booking) governs the registration moment; family rows govern the merging form of existing rows; same axis as *One row = one settlement unit*: **split** = unrelated items are not tied together, **merge** = one work object is not split apart.
**Evidence pointer-ization cap**: write rows this way from registration on — the row holds only a one-line symptom + file:line + a pointer; details go into the referenced doc; soft cap **≈ 300 characters** (over the cap, first ask "which part belongs in the referenced doc" — cleanup rounds take over-cap rows as narrowing items). **Exception**: the details have no home yet (no doc ∥ pending ruling ∥ pointer target unreachable) ⇒ an inline digest is allowed; narrow it as soon as a home appears.
```

**④ 落点表（锚点钉死——as-of 2026-10-14 实读）**

| # | 面 | 档 | 锚 | 形态 | 状态 |
|---|---|---|---|---|---|
| a | CN 正本 | `docs/core/design/prompts/persona-engineering.md` | 「能当场做的当场做」`:84` 后 | 新 bullet ×1 | **本轮已落**（落成 `:85`） |
| b | CN 正本 | 同上 | 「单行 = 单结算单元」`:178` 后 | 新 bullet ×2 | **本轮已落**（落成 `:180`–`:181`） |
| a′ | EN 运行面 | `thincoder-core/prompts/persona-engineering.md` | 「Fix in place first」`:84` 后 | 新 bullet ×1 | 实施轮 |
| b′ | EN 运行面 | 同上 | 「One row = one settlement unit」`:181` 后 | 新 bullet ×2 | 实施轮 |
| c | 设计档 | `docs/core/design/PROMPT-SYSTEM.md` | 新节 §6.23（`:574`–`:594`）∥ §6.1 应用实例（`:178`）∥ §7 D-PS31 ∥ D-PS32 ∥ D-PS33（`:630`–`:632`）∥ §10.2 行 12（`:708`）∥ 变更记录（`:933`） | 登记 | **本轮已落** |

**⑤ 关键决策（KD-B）**

| # | 决定 | 判据 / 否决 |
|---|---|---|
| KD-B1 | ①「清账轮核锚」= 落「派发与收尾纪律」节（「能当场做的当场做」邻位）——非「台账」节、非生命周期表 | 锚失效扫描族（暂缓批先复核 ∥ 冻结档残留扫描 ∥ 陈年 triage）同居该节 = 判断链不断；生命周期表受 FR30 五行锁定 ⇒ 不入表（清账轮非其五事件之一）。否决「台账节」（登记 / 形态族——清账轮 = 轮次动作面）·「生命周期表增行」（破 FR30 五行验收） |
| KD-B2 | ②③ = 落「台账」节「单行 = 单结算单元」后（新 bullet ×2） | 行组织 ∥ 行形态 = 两池通用行规段（同 §6.20 的 ③④ 判例）；③ 紧邻铁律段（指针化）与查重条（登记时点同拍）。否决「并入铁律段原位改写」（铁律段 = 总句形态；#997 已定「铁律段后新 bullet」先例） |
| KD-B3 | ③ 软上限 = **≈ 300 字** + 例外形（细节尚无落点 ⇒ 内嵌；落点出现即收窄） | 见 §7 D-PS32（判由三条）。值 + 例外形 = 派单授权面（「值 + 例外形……由你定，给判由」——原话在 §1 落地方案） |
| KD-B4 | ②「族行」与「入库查重」「单行 = 单结算单元」的关系 = 同轴句显式化（写进条文——防误读） | 三条并列易读成互斥（查重 = 并入不另立行 ∥ 族行 = 一行携成员清单 ∥ 单行单结 = 拆行）⇒ 不写关系 = 未来误读源；同轴句一语消歧（登记时点 ∥ 存量归并；拆 / 并各管一段）。**同轴 / 关系句 = 本批自加的设计澄清**（§1 三条文本未含——登记备查，评审判超授权则一行回退，零机制影响） |

**⑥ 受影响文件（行数标注——as-of 2026-10-14 实读）**

| 档 | 现状 | 本批 Δ | 说明 |
|---|---|---|---|
| `docs/core/design/prompts/persona-engineering.md` | 205 行（`##` 16 · max 247 ≤300） | **205 ⇒ 208（+3）——已落** | 新 bullet ×3；CN 新行宽实测 max 247 ✓ |
| `thincoder-core/prompts/persona-engineering.md` | 205 行（`##` 17 · max 981） | **205 ⇒ 208（预计 +3）——实施轮** | 同语义；EN 档不在行宽机检域——披露不行使（同档既存 >300 行惯例） |
| `docs/core/design/PROMPT-SYSTEM.md` | 906 行 | **906 ⇒ 936（+30）——已落** | 新节 §6.23（+22）＋ §6.1 一行（+1）＋ §7 三行（+3）＋ 变更记录（+4，含空行）＋ §10.2 行 12 就地（±0） |
| 需求档 | — | 0（U1） | 父侧笔 |
| 台账工具 / 产品码 / 测试码 | — | 0 | 零触面 |

测试面：零改（提示词内容变更——无代码面 / 无存活计数断言；机检 = `prompt-refs-check` + `doc-check` 一次性复跑，承 §6.1「批次收尾核对」）。

**⑦ 验收对照（回指 §1 / #1386 / 派单验收）**

| # | 口径 | 兑现 |
|---|---|---|
| 1 | ① 锚点复核（逐行核锚 + 三选重锚） | ②(a) 逐字在位（`:85`） |
| 2 | ② 族行（一行 = 一工作对象 + 成员清单 + 同批同轮收口） | ②(b) 逐字在位（`:180`） |
| 3 | ③ evidence 指针化上限（症状 + file:line + 指针；软上限 + 例外） | ②(b) 逐字在位（`:181`）+ KD-B3 / D-PS32（值 + 例外 + 判由） |
| 4 | §6.23 全节（三条 × 要求 / 时机 / 衔接 + why + 实证指针） | 已落（`:574`–`:594`） |
| 5 | 决策行 + §10.2 读数复算（沿先例口径） | D-PS31 ∥ D-PS32 ∥ D-PS33（`:630`–`:632`）∥ 行 12 = **16/17**（2026-10-14 复算——标题节点零变） |
| 6 | CN 正本接条（设计席直落）+ 双面落点段 | ② + ④（a/b 已落；a′/b′ = 实施轮；落点段 = §6.23） |
| 7 | 机检：`prompt-refs-check` 0 命中 | 本轮实跑 exit 0（提示词面 83 档 · 代码面 444 档 · 命中 0） |
| 8 | 机检：`doc-check` 本批域零新增红 | 本轮实跑：**新闸行 = 0**（内容归一化集差——基线 431 ⇒ 430 行，离场项 = `ACCOUNTS.md` 一行「路径/坐标」＝外部漂移非本批）；本域红面 = 基线（PROMPT-SYSTEM.md 迁移期引文 ×4——列报不入闸；符号·宽报告行——非闸）；悬空 28 ⇒ 27 ∥ 行宽 2（MEMORY.md:854 ∥ webui/SANDBOX.md:104——非本域） |
| 9 | 零产品码 / 零测试码 | 零触（全批 = 设计档 + CN 正本） |
| 10 | 三链同源 | §2 条目（①）↔ §6.23 / D-PS（④c）↔ 需求 = U1（缺口在册） |

**⑧ 上抛项与观察**

- **U1（需求侧登记 = 父侧笔）**：候选面 ① `docs/core/requirements/PROMPT-SYSTEM.md` §2.2（人格层增补块——先例 = 2026-09-25 增补块 `:50-57`）② `docs/core/requirements/ENGINEERING-MODE-V2.md` FR30 家族。#1386 = 归批条目（无硬性需求面义务）。
- **观察 ①（只报）**：节号收正在 §6.23（「节号登记注」行）与变更记录具名；本档 §1 无需回改。
- **观察 ②（只报）**：清账轮 = 记录面既有轮次名（批档族用法）；提示词面首次引用（带一句括注）——如后续立清账轮机制档，本三条随之挂接 = 另轮裁。
- **观察 ③（只报）**：本批自加设计澄清 = ②③ 的同轴 / 关系句（KD-B4）——§1 三条文本未含；评审判超授权 ⇒ 一行回退（零机制影响）。

**⑨ 自检**

- 三机检（本轮各跑一次）：`prompt-refs-check` = 0 命中（exit 0）∥ `doc-check` = 本批域零新增红（新闸行 0）∥ 行宽 CN 新行 max 247 ≤300；标题节点 CN 16 ∥ EN 17（零变、复算在 §10.2 行 12）。
- 预检四项：① §1 具体到可设计 ✓（三条 = 要求 + why + 实证齐）② 受影响文件全清单 + 行数标注 ✓（⑥）③ 验收逐条回指 ✓（⑦ 十条）④ UI / 交互 = 不适用（提示词行为纪律，零 UI 面）。
- 三链同源：§2 条目 ↔ 设计档 §6.23 / D-PS ↔ 需求 = U1（父侧）。
- 停：不发起评审（发起权 = 主 agent / 用户）。

## §3 设计评审（评审子代理）
## §4 用户批准（主 agent）
## §5 实施记录（eng-coder）
## §6 验证与收口（父代理）
