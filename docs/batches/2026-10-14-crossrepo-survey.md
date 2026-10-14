# 2026-10-14 · 跨仓勘察义务（三句文本——#1441 最小修第一批）
> 六段 append-only，一段一作者：§1 讨论（主 agent）· §2 批次任务与设计（eng-designer）· §3 设计评审（评审子代理）· §4 用户批准（主 agent）· §5 实施记录（eng-coder）· §6 验证与收口（父代理）。
> 编制：主 agent · 2026-10-14 · 来源 = 用户 2026-10-14 21:02「行」授权（#1441 设计期跨仓文档勘察·最小修第一批——设计→评审→落地→下一设计轮取证）。
> 台账 = #1441（core · 归批）。前情 = 无（独立批）。
## §1 讨论（主 agent）
**状态行**：已收口 2026-10-14
<§1 模板占位：本批条目 / 关键判据 / 授权口径>

**来源与授权**

- 议题 = #1441（设计期跨仓文档勘察）最小修第一批。用户原话链：2026-10-14 19:36「thincoder 在做设计时经常无视跨仓的设计文档」∥ 19:44「实际用户很难完全理解 thincoder 这么复杂的机制，你想靠用户去管好这些是不可能的」∥ 20:43「文档仓当然是在工作目录内，这个是无疑的，代码仓和文档仓都应该在同一个cwd下的不同的子目录里」∥ 20:53「听上去有点道理了」∥ 21:01「你理解的对」∥ **21:02「行」**（= 开跑授权：本小批「设计 → 评审 → 落地 → 下一设计轮取证」，照「自动跑完」直推）。
- 父侧诊断（实读在案）：读通道本通（树内默认可查——本工作区实证：`thincoder.com/*` 在索引面）；病 = ① 设计席**不被推**（相关文档注入 = depth-0 门，`thincoder-core/agent/setup.mjs:114-116`——子代理不注入；TUI 假死批修法 B）② 无义务/无证据（提示词仅「动手前先查声明源」一句泛纪律，**从未触发**）③ 复核无牙（评审无对应检查项）。
- 写侧 = 零工程（用户 21:01 确认：各仓的档住各仓；「独立文档仓」= 公共参考文档仓——读它 = 读侧行为）。

**本批范围（三句文本 · 逐项「实现什么」+ 来源）**——来源 = **设计侧提议**（父侧提出、用户 21:02「行」批准；非用户自提）：

| # | 实现什么（对用户意味着什么） | 落点（设计轮裁） |
|---|---|---|
| ① | **设计席义务句**：设计席开工前先查工作目录树内的公共源文档（尤其独立文档仓），查完把「查过什么、有没有相关」一行写进设计档——**设计不再瞎着眼做** | 设计席人格 ∥ 工程纪律层（CN 正本 + EN runtime 两副本） |
| ② | **派单规范句**：父侧派设计轮的任务书带上相关公共源文档坐标（没有就明写「已查无」）——**设计席知道旁边有什么可查** | 主 agent 侧人格/纪律（两副本） |
| ③ | **评审检查句**：设计评审加一项——设计档是否携勘察证据行——**「没查」在复核链上可见** | 设计评审检查清单（`advisor-design.md` 族——两副本） |

**明确不做（本批）**：注入（给设计子代理推文档——`setup.mjs` depth-0 门开法）——depth-0 门有假死教训（TUI 假死批），列为**下一块石头**，等本批验证窗读数再定。

**本批要回答的问题**：三句文本（义务 + 派单 + 复核）**够不够让设计席真读跨仓文档**——取证 = 下一个真实设计轮（验证窗）。

**边界**：三句文本 + CN/EN 两副本对齐 + 验证窗记法（一行）；他域零动。

## §2 批次任务与设计（eng-designer）
**状态行**：设计完成（initial 轮——三句四落点 ∥ CN 正本本设计轮直落（4 档）∥ EN 运行面 = 实施轮 ∥ 设计档登记已落（§6.26 · D-PS37）∥ 机检本批域零新增红）
<§2 模板占位：本批条目（覆盖） / 设计档落点 / 机制设计 / 受影响文件与测试覆盖 / 验收对照 / 关键决策 / 上抛项>

**设计轮交付（eng-designer · 2026-10-14 · initial 轮）**

**① 来源与授权**
- 台账 #1441（core · 归批）；授权链：用户 2026-10-14 19:36 实报「thincoder 在做设计时经常无视跨仓的设计文档」→ 21:02「行」（= 开跑授权：设计 → 评审 → 落地 → 下一设计轮取证——证立后再谈注入）；三句 = **设计侧提议**（父侧提出、用户批准——非用户自提；逐字文本 = 本席设计产物）；全文 = §1。
- 本批 = #1441 最小修第一批（读侧三句文本）；本批边界（§1）：提示词族 + 评审检查清单族 + 设计档登记 ∥ 需求档零触 ∥ 实现入口零触（`setup.mjs` 零改，注入 = 下一块石头）。

**② 三句清单（逐字 · 中文审核面已落）**

句① **设计席义务句**（两面：行为 + 形态）——行为面落 `docs/core/design/prompts/discipline-engineering.md`（「基本流程 · 2. 设计」步、同类先例勘察条后——现盘 `:38`，+1 行）：
```text
   - **公共源文档勘察（设计前置）**：设计开工前先查**工作目录树内的公共源文档**（尤其独立文档仓）——查过什么 / 有没有相关 ⇒ **勘察证据行**落进设计档（无相关也照记）——设计席不被推文档，泛纪律从未触发；写成义务，设计才不瞎着眼做。
```
形态面 = 设计席人格 8 项 item 1 **就地扩条**（`docs/core/design/prompts/persona-eng-designer.md:62`，±0 行；**8 项计数不变**）：
```text
1. **方案与理由**——设计层直陈「决定 + 理由」；**同类先例**一行（先例坐标 + 对齐 ∥ 偏离理由）；**勘察证据行**（查过什么公共源文档 ∥ 有没有相关）——复核要有东西可核；无相关也照记，静默 ≠ 查过；不再要求候选枚举（该纪律已废）
```

句② **派单规范句**——落 `docs/core/design/prompts/persona-engineering.md`「派发与收尾纪律（父侧轮次）」节、轮次字段条后（现盘 `:73`，+1 行）：
```text
- **设计轮派单带公共源坐标**：派设计轮的任务书带上**相关公共源文档坐标**（尤其独立文档仓）；**没有就明写「已查无」**——设计席据此知道旁边有什么可查——设计席不被推文档，看不到旁边有什么；坐标随任务书递手，勘察才有方向。
```

句③ **评审检查句**——落 `docs/core/design/prompts/advisor-design.md` 评审标准**新增第 10 条**（现盘 `:23`，+1 行；条目数 9 ⇒ 10）：
```text
10. **勘察证据行核查** — 查设计档是否携**勘察证据行**：查过哪些公共源文档（尤其独立文档仓）∥ 有没有相关。**缺行 ⇒ 未查或未记**；**无相关 ⇒ 也须照记**（不得静默省行）——复核链本无此项；「没查」得有地方现形。
```

**③ EN 逐句稿（实施轮落运行面——同语义 M9 翻译回写、复用存量 EN 词句，非 cp）**

（a′）`thincoder-core/prompts/discipline-engineering.md`（同节同位——预计 `:38`）：
```text
   - **Public-source survey (design precondition)**: before starting design, survey the **public source docs inside the working directory tree** (independent doc repos above all) — what was checked / whether anything was relevant ⇒ a **survey-evidence line** in the design doc (a "none relevant" outcome is recorded too) — the design seat is not pushed the docs and a generic discipline never fired; with the obligation written down, design is no longer blind.
```
（b′）`thincoder-core/prompts/persona-eng-designer.md` item 1 就地替换（`:62`）：
```text
1. **Approach & rationale** — the design layer states「decision + rationale」directly; a **closest-precedent** line (precedent coordinates + alignment ∥ deviation rationale); a **survey-evidence** line (which public source docs were checked ∥ whether anything was relevant) — the review needs something it can check; a "none relevant" answer is recorded too, so silence is never read as "surveyed"; candidate enumeration is no longer required (that discipline is retired)
```
（c′）`thincoder-core/prompts/persona-engineering.md`（EN「Round field」条后——该条现盘 `:102`；与 CN `:72` 的偏位 = 既存结构差，§10.2 行 12 在册）：
```text
- **Design-round dispatches carry public-source coordinates**: the task book carries **relevant public source doc coordinates** (independent doc repos above all); **if there are none, state「已查无」(checked — none found) explicitly** — the design seat then knows what is around to check — the design seat is not pushed the docs and cannot see what is around; coordinates handed over with the task book are what give the survey its direction.
```
（d′）`thincoder-core/prompts/advisor-design.md`（第 10 条——现盘 `:11` 第 9 条后、`## Output Format` 前）：
```text
10. **Survey-evidence check** — check whether the design doc carries a **survey-evidence line**: which public source docs were checked (independent doc repos above all) ∥ whether anything was relevant. **A missing line ⇒ not surveyed, or not recorded**; **a "none relevant" answer must be recorded too** (never silently skip the line) — the review chain had no such item; "not surveyed" needs a place to surface.
```

**④ 落点表（as-of 2026-10-14 实读——CN 已落 ∥ EN 待实施轮）**

| # | 句 | 面 | 档 | 落点（现盘） | 形态 | 本批状态 |
|---|---|---|---|---|---|---|
| 1 | ① 行为 | 工程纪律层 | `docs/core/design/prompts/discipline-engineering.md` | `:38`（同类先例勘察条后） | 节内新增子条，+1 行 | **已落** |
| 2 | ① 形态 | 设计席人格 | `docs/core/design/prompts/persona-eng-designer.md` | `:62`（8 项 item 1） | 就地扩条，±0 | **已落** |
| 3 | ② 派单 | 主 agent 人格 / 纪律层 | `docs/core/design/prompts/persona-engineering.md` | `:73`（轮次字段条后） | 节内新增 bullet，+1 | **已落** |
| 4 | ③ 核查 | 设计评审 | `docs/core/design/prompts/advisor-design.md` | `:23`（第 9 条后） | 新增第 10 条，+1 | **已落** |
| 5 | ① 行为 | 工程纪律层（EN） | `thincoder-core/prompts/discipline-engineering.md` | 同节同位 | +1 行 | 实施轮 |
| 6 | ① 形态 | 设计席人格（EN） | `thincoder-core/prompts/persona-eng-designer.md` | item 1 | ±0 | 实施轮 |
| 7 | ② 派单 | 主 agent（EN） | `thincoder-core/prompts/persona-engineering.md` | EN「Round field」条 | +1 | 实施轮 |
| 8 | ③ 核查 | 设计评审（EN） | `thincoder-core/prompts/advisor-design.md` | 第 9 条后、`## Output Format` 前 | +1 | 实施轮 |
| 9 | 设计档登记 | 设计档 | `docs/core/design/PROMPT-SYSTEM.md` | §6.26（`:666` 起）+ §6.1 应用实例 + §7 D-PS37 + §5 指针 + 变更记录 | +32 行（1023 → 1055） | **已落** |

**⑤ 两副本对齐（D1 面分述）**
- **中文审核面 = 本设计轮直落**（本席笔——§6.1 面分述 + 最近先例 ledger-governance-2）；**英文运行面 = 实施轮**（eng-coder 笔——按 M9 翻译回写，非 cp）。落笔纪律 = 逐字照本段围栏块、零字改（含全角标点 ∥ ⇒「」）；落笔后 grep 回读 + `doc-check` + `prompt-refs-check`。
- 逐处对位 = 同节同位同形（各 +1 行 ∥ item 1 就地 ±0）；EN 面零节级结构变（标题节点零变——§10.2 行 1 ∥ 7 ∥ 11 ∥ 12 零变）；EN 插入锚按 EN 面自身行（见 ③c′ 注）。

**⑥ 验证窗（一行）**
= **下一个真实设计轮取证**：该轮设计档是否携**勘察证据行**（评审标准第 10 条可核——「没查」应在复核链上现形）；读数喂给下一块石头（注入面开法）的取舍；本批不发明新机制。

**⑦ 判据（验收对照）**

| # | 口径（派单验收 + §1） | 兑现 |
|---|---|---|
| 1 | ① 义务句逐字落盘（行为面） | ✅ `discipline-engineering.md:38`（CN 已落）+ ⑨ 机检 |
| 2 | ① 形态 = 8 项 item 1（计数不变） | ✅ `persona-eng-designer.md:62` 就地扩（8 项计数实读 = 8） |
| 3 | ② 逐字落盘（设计轮派单） | ✅ `persona-engineering.md:73`（不落六字段表——避机械面，见 ⑧ KD-2） |
| 4 | ③ 逐字落盘（评审加项） | ✅ `advisor-design.md:23`（第 10 条） |
| 5 | 全文本 CN/EN 两副本 | ✅ ② 围栏块 ×4 句（CN 已落 ∥ EN 逐句稿 + ④ 落点表） |
| 6 | 机制相符性自检（不夸大） | ✅ 读通道**本通**（本工作区实证——`code_search` 直返兄弟仓 `thincoder.com/*`）；「不被推」（注入 = depth-0 门）现状如实陈述、三句不涉注入不承诺注入；**零新增读权限**（树内默认可查 = 既有）；词汇 = §1 已批用词（公共源文档 / 独立文档仓 / 勘察证据行 / 已查无——零新谓词） |
| 7 | §2 落盘（来源与授权 ∥ 三句清单 ∥ 落点 ∥ 两副本对齐 ∥ 验证窗 ∥ 判据） | ✅ 本段 ①–⑦ + 状态行 |
| 8 | 机检 | ✅ 见 ⑨（prompt-refs = 0 命中；doc-check = 本批域零新增红） |

**⑧ 关键决策（KD）**

| # | 决定 | 被否（备选 + 理由） |
|---|---|---|
| KD-1 | ① 拆两面：行为 → 工程纪律层设计步（先例 = 同类先例勘察**同节**）；形态 → 设计席人格 8 项 item 1 就地扩 | 单落设计席人格（主 agent 全装配不可见——流程面失锚，同 10-09 批判据）；新设设计档第 9 项（8→9 计数连带） |
| KD-2 | ② 落「派发与收尾纪律」轮次字段条后——**独立 bullet**、不落六字段列表 | 并入六字段（机械门判据集牵动：`validateTaskBookFields` 六字段 ∥ tool-docs 骨架 ∥ 测试 T6——本批他域零动）；落纪律层（子代理非受众——派单写权独属主 agent） |
| KD-3 | ③ = 评审标准**新增第 10 条**（独立断言面、独立可核问） | 并入第 9 条同类先例（两物混判——查「先例」≠ 查「勘察证据」）；落「补充检查项」块（genre 不符——该块 = 修订式表达族） |
| KD-4 | CN 正本 = 本设计轮直落；EN = 实施轮 M9 | 双稿同轮（safety 批形——本批无「双稿先审后落」因由） |

**⑨ 受影响文件与机检读数**

| 档 | 行数（本席测量 · split 行，as-of 实测——口径 = 内容行，文末空行不计） | Δ | 状态 |
|---|---|---|---|
| `docs/core/design/prompts/discipline-engineering.md` | 188 → **189** | +1 | 已落 |
| `docs/core/design/prompts/persona-eng-designer.md` | 79 → **79** | ±0 | 已落 |
| `docs/core/design/prompts/persona-engineering.md` | 208 → **209** | +1 | 已落 |
| `docs/core/design/prompts/advisor-design.md` | 75 → **76** | +1 | 已落 |
| `docs/core/design/PROMPT-SYSTEM.md` | 1023 → **1055** | +32 | 已落 |
| `thincoder-core/prompts/discipline-engineering.md` | 196 | +1（预计） | 实施轮 |
| `thincoder-core/prompts/persona-eng-designer.md` | 79 | ±0（预计） | 实施轮 |
| `thincoder-core/prompts/persona-engineering.md` | 208 | +1（预计） | 实施轮 |
| `thincoder-core/prompts/advisor-design.md` | 46 | +1（预计） | 实施轮 |

- **机检读数（本轮实跑）**：`prompt-refs-check.mjs` = **0 命中**（「提示词面 84 档 · 代码面 449 档 · 命中 0」——J1/J2/J3 三式零命中）；`doc-check.mjs` = **本批域零新增红**——悬空 24（本批改动档零入列；PROMPT-SYSTEM.md 锚列报仅既有 4 行 `:149 ×2 ∥ :1010 ×2`［迁移期引文·不入闸——行号顺延、行数零增］；其余 = 既有基线行）∥ 行宽 3 行（`PROMPT-SYSTEM.md:657`〔304〕∥ `TOOLS.md:1382`〔315〕∥ `PROJECT.md:567`〔353〕——**本批新行零入列**，CN 四档新行实测 ≤300）。
- （观察 · 转报）`PROMPT-SYSTEM.md:657`（304 字符）= **safety 批 §6.25「落笔安排」行**（非本批笔、本批前已在盘）——超宽 4 字符；如判本席可修（机械折行、零语义）请一行派笔。
- 零触面（Δ=0）：需求档 ∥ `setup.mjs` ∥ tool-docs ∥ `common.md` ∥ subagent-base ∥ `ADVISOR-CONVERGENCE.md`。

**⑩ 上抛项与观察**
1. 〔观察 · 报父侧〕**维度权威档未登记本维度**：`ADVISOR-CONVERGENCE.md` 未按 10-09 先例补 §15 + A-AC16——**不在本批射程**（§1 ③ 落点 = `advisor-design.md` 族）；如需按维度档口径入册，另裁 / 另笔。
2. 〔观察 · 报父侧〕**需求侧登记（U 项）**：`docs/core/requirements/PROMPT-SYSTEM.md`（或 METHODOLOGY 家族）未登记本批三句——父侧笔，本批零触。
3. 〔观察〕**EN 面插入锚的偏位**：EN「Round field」条在 `:102`（CN「轮次字段」条在 `:72`）——既有结构差（§10.2 行 12 在册）；实施轮照 EN 面自身位置落。
4. 〔FYI〕**注入面（下一块石头）**：本批零触 `setup.mjs` 注入门——「不被推」现状如实留在 §6.26 病根行；注入开法的取舍待验证窗读数。

**⑪ 自检**
- 预检四问：① 需求（§1 三句 + 范围 + 边界）具体到可设计 ✅；② 受影响文件全清单 + 行数 ✅（⑨）；③ 验收标准逐条回指 ✅（⑦）；④ UI/交互决策——本批无 UI 面（不适用）✅。
- 三方条目一致：本段条目 = ②/④/⑦ = §1 三句（同源）；需求档登记 = U 项（父侧，⑩.2）。
- D6 回读：五处落笔逐处回读 ✅（含上下文比对）；机检复跑 ✅（⑨）。
- 强制约束逐条：① 设计席义务句 = 首句动作（行为面「设计开工前先查」）✅；② 词汇 = §1 已批用词（真实动词）✅；③ 载体 = 既有节内增列 / 就地扩条、零新机制 ✅。

**修正轮记录（eng-designer · 2026-10-14 · fix 轮——评审轮次 1 发现 2 ∥ 3 落修）**

**依据** = 本档 §3 轮次 1（pass · 🔴0 ∥ 🟡1 ∥ 🔵4）＋父侧 fix 轮派单（改动 1 = 发现 #3 ⇒ 四句尾补 why 半句；改动 2 = 发现 #2 ⇒ 行数口径注记；#1 = 父侧已落台账行；#4/#5 = Deferred ∥ Not an issue——零文档动作）。

**逐号处置（号 → 改动 `file:line`）**

| 号 | 处置（落点） |
|---|---|
| 3 | 四句尾各补 why 半句（从简平铺；why 源 = 用户 19:36 实报 + §1 诊断三点；不注批名数字）——CN 四落点：`docs/core/design/prompts/discipline-engineering.md:38` ∥ `…/persona-eng-designer.md:62` ∥ `…/persona-engineering.md:73` ∥ `…/advisor-design.md:23`；本段 ② 围栏块 ×4 同步（本档 `:43` ∥ `:47` ∥ `:52` ∥ `:57`）∥ 本段 ③ EN 逐句稿 ×4 同源补 why（本档 `:64` ∥ `:68` ∥ `:72` ∥ `:76`——实施轮镜像源）∥ `PROMPT-SYSTEM.md` §6.26 三条随正（`:673`–`:675`——实读判定「载句文」（② 近逐字 ∥ ①③ 高覆盖）⇒ 同拍收正；逐字权威仍 = 本段 §2（D2 不变））∥ `PROMPT-SYSTEM.md` 变更记录补修正轮行（`:1055`） |
| 2 | 本段 ⑨ 表头补口径注记（本档 `:124`——「口径 = 内容行，文末空行不计」）；PROMPT-SYSTEM 计数随收正（本段 ⑨ 行 5 `:130` ∥ ④ 行 9 `:91`：1054 → **1055** ∥ +31 → **+32**） |
| 1 | 零动作（父侧已落台账行——非本轮派单面） |
| 4 ∥ 5 | 零动作（父侧裁 Deferred ∥ Not an issue） |

**四句读回（why 半句在场 ∥ 与句意相符 · 实读）**

- ① `discipline-engineering.md:38`（127 字符）—— why 尾：「——设计席不被推文档，泛纪律从未触发；写成义务，设计才不瞎着眼做。」对「义务句」（诊断 ① 不被推 + ② 无义务 / 泛纪律从未触发）。
- ② `persona-engineering.md:73`（117）—— why 尾：「——设计席不被推文档，看不到旁边有什么；坐标随任务书递手，勘察才有方向。」对「派单句」（诊断 ①）。
- ③ `advisor-design.md:23`（119）—— why 尾：「——复核链本无此项；「没查」得有地方现形。」对「核查句」（诊断 ③ 复核无牙）。
- ④ `persona-eng-designer.md:62`（127）—— why 尾：「——复核要有东西可核；无相关也照记，静默 ≠ 查过。」对「形态句」（诊断 ② 无证据 ⇒ 证据可核面）。

（四句全文 = 本段 ② 围栏块同文——逐字回读核 ✓。）

**PROMPT-SYSTEM 引文对拍（「若载」实读结论）**：§6.26 `:673`–`:675` 三条 = 句文概括承载（② 近逐字 ∥ ①③ 高覆盖）⇒ **载** ⇒ 三条 why 尾已随正（与落地四句同文）；§6.26 其余块（来源 ∥ 病根 ∥ 分层归属 ∥ 形态 ∥ 落点 ∥ 计数连带 ∥ 机检 ∥ 边界）机制未变、零改。

**机检（实跑 · 收正后）**

- `prompt-refs-check.mjs` = **0 命中**（提示词面 84 档 ∥ 代码面 449 档——落修前后同值）。
- `doc-check.mjs` = **本批五档零新增**（落修前后行集比对：新增行集全落他批在飞档——`API-CONTRACT.md:3536` 起 ∥ `EXECUTION.md` ∥ `SANDBOX.md` 等；本批五档报告行集前后一致；仓级（路径/坐标）悬空 24 ⇒ 68 = 他批在飞）；行宽 = 同基线三行（`:657`〔404〕∥ `TOOLS.md:1382`〔415〕∥ `PROJECT.md:567`〔353〕——非本批笔）；四 CN 新行行宽实测 = **127 ∥ 127 ∥ 117 ∥ 119**（≤300 ✓）。
- 〔观察 · 读数收正〕本段 `:136` 初轮两读数与现盘不符：`PROMPT-SYSTEM.md:657` 初记〔304〕现盘〔404〕（「超宽 4 字符」实为 104）∥ `TOOLS.md:1382` 初记〔315〕现盘〔415〕——以现盘为准；非本批笔 ⇒ 零动作（父侧对 `:657` 的「机械折行」派笔请按现盘 404 判）。
- 〔读数〕行数口径 = 内容行（⑨ 表头已注）：CN 四档复读 **189 ∥ 79 ∥ 209 ∥ 76**（why 为行内尾补，±0 行）∥ `PROMPT-SYSTEM.md` = **1055**。

**零新语义**（逐号落修 = 评审发现 + 父裁直导；§6.26 随正 = 「同拍收正」判定直导）· **零修订式表达 ∥ 零维护者注 ∥ 零文档引用**（why 半句无批名 / 数字 / 日期）· **本轮零触**：EN 运行面 ∥ 需求档 ∥ `ADVISOR-CONVERGENCE.md` ∥ 其余文档（派单「本轮不做」）。

## §3 设计评审（评审子代理）

### 轮次 1（评审子代理）

**评审轮范围**：CN 四档落盘（`discipline-engineering.md:38` ∥ `persona-eng-designer.md:62` ∥ `persona-engineering.md:73` ∥ `advisor-design.md:23`——与 §2 围栏块逐字一致，抽查 ✓）· §2 落盘 · PROMPT-SYSTEM 登记四件（§6.26 `:666` 起 ∥ §6.1 应用实例 `:183` ∥ §7 D-PS37 `:730` ∥ §5 指针 `:160` ∥ 变更记录 `:1052`–`:1054`）——抽查齐 ✓。EN 运行面 / 需求档 / `ADVISOR-CONVERGENCE.md` 按对象声明排除或范围外（相关引用均标 unverified）。

| # | Category | Severity | Issue | Suggestion |
|---|----------|----------|-------|------------|
| 1 | Coordination | 🟡 | 两处跨档登记未同步，仅存活于批档观察清单：① 评审标准新第 10 条未入维度权威档（批档 `2026-10-14-crossrepo-survey.md:141`「维度权威档未登记本维度」——`ADVISOR-CONVERGENCE.md` 未核验，不在本评审范围）；② 三句未入需求侧登记（批档 `:142`「需求侧登记（U 项）」——需求档不在本评审范围）。设计已自报、未承诺处置。 | 按协调项跟踪——落台账行（携复核 / 到期条件）；维度档与需求档下次入册时同拍第 10 条维度与三句登记（含条目计数），避免只活在本批观察清单里。 |
| 2 | Doc hygiene | 🔵 | 行数抽查口径差：批档 `:130` 记 `PROMPT-SYSTEM.md`「1023 → **1054**」；现盘读侧合计 1055（末内容行 = 1054、其后一空行）——内容行口径与标注一致，属口径差非漂移；其余四处 CN 档抽查全中（`discipline-engineering.md` 189 ∥ `persona-eng-designer.md` 79 ∥ `persona-engineering.md` 209 ∥ `advisor-design.md` 76，与批档 `:126`–`:129` 标注一致）。 | 表头「split 行」口径注记一位（含 / 不含末尾空行），便下批复算对拍。 |
| 3 | Methodology | 🔵 | 新四落点句均为「要求 + 形态 / 判据」式、未携 why 半句（`discipline-engineering.md:38` ∥ `persona-eng-designer.md:62` ∥ `persona-engineering.md:73` ∥ `advisor-design.md:23`）——D9「内容携 why」（`discipline-engineering.md:180`）要求新增规范文本携因果；同族先例携（`persona-engineering.md:86` 句尾「——池面未决数要代表真实工作量，不掺悬空」），同节先例不携（`discipline-engineering.md:37`）——两可。 | 或按 D9 各句尾补一句因果半句（从简平铺）、或明记本批「从简不携 why」的取舍。 |
| 4 | Closest precedent | 🔵 | 「同类先例」材料为分散引用，未成设计档 item 1 所要求的单行规范形（先例坐标 + 对齐 ∥ 偏离理由）：KD-1 `:117`「先例 = 同类先例勘察**同节**」· KD-3 `:119` · §2 ⑤ `:94`（最近先例 ledger-governance-2）· `PROMPT-SYSTEM.md:677` 四问 · `PROMPT-SYSTEM.md:730` D-PS37；对齐 / 偏离理由齐备（KD-4 `:120` 明写 safety 批形不适用之因由、KD-2 `:118` 明写避让机械面之由）。 | 可归并为一行的规范形（本批自身即该形态首个适用轮——追溯适用性可议；非必改）。 |
| 5 | Methodology | 🔵 | 本批设计档材料未携本批新立的「勘察证据行」（§2 无「查过哪些公共源文档 ∥ 有无相关」行）——新规首个适用轮未自证；设计已显式把取证窗定在下一真实设计轮（批档 `:25`「取证 = 下一个真实设计轮（验证窗）」∥ `:98`「下一个真实设计轮取证」）。 | 可不处置（规则起步轮）；若要首实例自证，在 §2 补一行勘察证据（坐标 + 有无相关）。 |

**计数**：🔴 0 ∥ 🟡 1 ∥ 🔵 4

**VERDICT: pass**

## §4 用户批准（主 agent）

**代签（主 agent）· 2026-10-14 21:5x**——依据 = 用户 2026-10-14 21:02「行」（「设计 → 评审 → 落地 → 下一设计轮取证」，照「自动跑完」直推）。

准予依据：§3 评审（轮次 1）= **VERDICT pass**（🔴0 ∥ 🟡1 ∥ 🔵4）；裁决逐条——🟡1 = Fixed（跨档登记两行落台账：维度档第 10 条 ∥ 需求侧 U 项）∥ 🔵2/🔵3 = Fixed（fix 轮落定：CN 四句 why 半句 + §2 ⑨ 口径注记；机检复跑零新增；父侧逐句读回核过）∥ 🔵4 = Deferred（非必改——评审自认）∥ 🔵5 = Not an issue（设计已显式定取证窗 = 下一真实设计轮）。

**准予进入实施轮**：EN 运行面四档镜像落笔（eng-coder——逐句照 §2 ③ EN 逐句稿，M9 翻译回写）；EN 落定 ⇒ 链尾 = 下一真实设计轮取证（验证窗在册）。凭据 = 运行态（designId/令牌值不入档）。

## §5 实施记录（eng-coder）
**状态行**：实施完成（EN 运行面四档镜像落笔（逐句照 §2 ③，逐字符等值）；审计 1 轮 clean ∥ 评审 1 轮 pass；fix 0 轮）



**实施轮（eng-coder · 2026-10-14 · initial 轮）**——EN 运行面镜像落笔四档：逐句照 §2 ③ EN 逐句稿（`:64` ∥ `:68` ∥ `:72` ∥ `:76`，fix 轮后最终版），M9 翻译回写、非 cp；零字改 ∥ 零骨架 ∥ 零新节 ∥ 零文档路径引用。

**落点表（档 → `file:line` · 形态 · 行数 Δ）**

| # | 档 | 落点 | 形态 | 行数（内容行） |
|---|---|---|---|---|
| 1 | `thincoder-core/prompts/discipline-engineering.md` | `:38`（同类先例勘察条 `:37` 后） | 节内新增子条 | 196 → **197**（+1） |
| 2 | `thincoder-core/prompts/persona-eng-designer.md` | `:62`（8 项 item 1 就地替换） | 就地扩条 | 79 → **79**（±0） |
| 3 | `thincoder-core/prompts/persona-engineering.md` | `:103`（EN「Round field」条 `:102` 后） | 节内新增 bullet | 208 → **209**（+1） |
| 4 | `thincoder-core/prompts/advisor-design.md` | `:12`（第 9 条 `:11` 后、`## Output Format` `:13` 前） | 新增第 10 条 | 46 → **47**（+1） |

**逐句读回**（node 逐行 `===` 比对：四落点行 ↔ 本档 §2 ③ 围栏块，**逐字符等值**——460 ∥ 469 ∥ 437 ∥ 412 字符；EN why 尾四处齐；审计方以行哈希独立复核等值）。

**机检（实跑）**

- `node scripts/prompt-refs-check.mjs`（仓根零参）：落笔前 =「提示词面 84 档 · 代码面 449 档 · 命中 0」（OK）∥ 落笔后 = 同值（OK，exit 0）。
- `doc-check.mjs`：其域 = `docs` 单域（manifest checkConfig.scanDirs）——四档 EN 运行面不在射程，本批零触。

**零触面**（mtime/diff 对照）：CN 审核面 `docs/core/design/prompts/*`（13:43 ∥ 本轮四档 13:50）∥ `PROMPT-SYSTEM.md` ∥ 需求档 ∥ `ADVISOR-CONVERGENCE.md` ∥ 其余 prompts 档 ∥ 计数连带面（§10.2 复算 = 父侧收口）。出表变更 = 0。

**审计与评审轮次（终态 = clean）**

| 环节 | 轮次 | 终态 | 读数 |
|---|---|---|---|
| 内部偏差审计（explore · 只读 · 阻断式） | 1 | clean | 五项验收全过：逐字一致（行哈希等值 ×4）∥ 单句落、锚点未动（`:61`–`:69` 八项计数实读 = 8）∥ 新行引用零命中（J1/J2/J3 静态）∥ 四档外零触（mtime 对照）∥ 行数 +1 ∥ ±0 ∥ +1 ∥ +1 |
| 内部代码评审（advisor · `type=code`） | 1 | **pass** | 🔴 0 ∥ 🟡 1（协调项：§5 未落——本段落定即消）∥ 🔵 2（§2 设计期快照滞后 ∥ 四新行 ≥301 字符〔非本批必改——域外：EN 面既存长行形〕） |

**fix round**：0 轮（审计 clean ∥ 评审 pass，无必改项）。评审 🔵 两条 = 记录面上抛父侧（处置见交付报告）。

**证据**：`git diff` 逐档实读 = 每档唯一 hunk（+1 行 ∥ 就地替换 ±0 ∥ +1 行 ∥ +1 行），无他改。

## §6 验证与收口（父代理）

**验证（实施核 · 父侧）**：EN 四档落点逐句实读核（`thincoder-core/prompts/discipline-engineering.md:38` ∥ `persona-eng-designer.md:62` ∥ `persona-engineering.md:103` ∥ `advisor-design.md:12`——与 §2 ③ 逐字同文 ✓ ∥ 落位 ✓ ∥ why 尾齐）∥ §5 在册（落点表 + 跑读）∥ `prompt-refs-check` 0 命中——交付核过。

**上抛处置**：① §2 快照（④ 行 5–8 状态列 ∥ 状态行「实施轮」）＝ 设计期 as-of 记录——不复改（记录面原则）；本 §6 即收口凭据。② EN 行宽（四新行 412–469 字符）＝ 面级惯例（与该面既存长行一致、不在 doc-check 射程）——零动作（如后续该面入折行轮，随族办）。③ doc-check 射程说明（docs 单域）收存——本批机检主锁 = `prompt-refs-check`。

**收口核对（D7）**：角色表 §1–§6 ✓ ∥ 状态行 ✓ ∥ 计数（§2 ⑨ 口径注在册）✓ ∥ 指针 ✓ ∥ 台账 #1441 → 待核销 → 已核销（同拍）∥ 遗留 = 取证窗（下一真实设计轮——台账行另立）∥ **暂缓批复核：无** ∥ 结算线（ledger 查询面随收口消息）。

**验证窗**：下一真实设计轮核「该轮设计档是否携勘察证据行」（评审标准第 10 条——CN `docs/core/design/prompts/advisor-design.md:23` ∥ EN `thincoder-core/prompts/advisor-design.md:12`）——在册。
