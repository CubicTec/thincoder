# 2026-10-15 · inject-project-rules-switch
> 六段 append-only，一段一作者：§1 讨论（主 agent）· §2 批次任务与设计（eng-designer）· §3 设计评审（评审子代理）· §4 用户批准（主 agent）· §5 实施记录（eng-coder）· §6 验证与收口（父代理）。
> 编制：主 agent · 2026-10-15 · 来源 = 用户 2026-10-15 04:57 提出（「是否向提示词注入agent.md我也想加个开关，因为有时候有些项目里的agent.md是适用于别的coding agent的，用到thincoder会造成混乱」）+ 05:01 收窄（「我需要一个单独关掉agent.md和project_rules.md注入的开关」）+ 05:02「按全局」+ 05:04「办」。
> 台账 = #1465（core · 归批）。前情 = 无（独立批）。
## §1 讨论（主 agent）
**状态行**：🔄 进行中（…）
<§1 模板占位：本批条目 / 关键判据 / 授权口径>

**批件（用户 2026-10-15）**

- **04:57 提出**（逐字）：「是否向提示词注入agent.md我也想加个开关，因为有时候有些项目里的agent.md是适用于别的coding agent的，用到thincoder会造成混乱。」
- **05:01 收窄**（逐字）：「我需要一个单独关掉agent.md和project_rules.md注入的开关。」
- **05:02 定作用域**（逐字）：「按全局。」
- **05:04 点火**（逐字）：「办」+ 追认配置面（逐字）：「要能配置。说好了的事情你咋拉抽屉？」——指 2026-10-14 既有口径（见下），**配置面属本功能，不是后续可选项**。

**来源链（`PROMPT-SYSTEM.md` §6.24 · 2026-10-14 批 · 台账 #1420 逐字）**

用户 2026-10-14 12:14 原话：「**几个客户端都要能在配置界面上配置**，同时也开放工具给agent让agent也能自己控制开关」——**本批沿用该口径**（既有键 `agent.injectDocs` / `agent.injectMemories` 已按此落地三端）。

**现状（as-of 2026-10-15 实读）**

- 既有键：`agent.injectDocs` ∥ `agent.injectMemories`（`thincoder-core/config.mjs:69` / `:70`，默认 `true`）。
- **`agent.injectDocs` 一键管两样**：① 项目指令文件块（`~/.thincoder/AGENTS.md` 低优 + 项目根 `AGENTS.md` / `project_rules.md`）② 相关文档块（自动检索注入）——**用户要的是把 ① 单独摘出来可控，② 不受影响**。

**本批条目（三项 = 一个功能的三个面）**

| # | 实现什么（对用户意味着什么） | 来源 |
|---|---|---|
| **A** | **新键 `agent.injectProjectRules`** —— 关掉它 ⇒ **`AGENTS.md` / `project_rules.md` 不再注入**；**文档自动检索注入与记忆注入不受影响** | 用户 2026-10-15 04:57 + 05:01 |
| **B** | **三端设置界面都能配**（CLI `/config` · VSC 设置面板 · 桌面设置界面）—— 与既有 `injectDocs` 并列 | 用户 2026-10-14 12:14 原话（§6.24 在册）—— 用户 2026-10-15 05:04 重申「要能配置」 |
| **C** | **`settings` 工具面可自控** —— agent 能自己开关 | 用户 2026-10-14 12:14 原话（同上） |

**关键判据（设计须满足）**

1. **拆键不破既有语义**：`agent.injectDocs` 现管 ①②；新增独立键后，**② 相关文档块的开关仍归 `agent.injectDocs`**（不迁移、零行为变），① 的开关归新键。
2. **默认零行为变**：新键默认 `true`（判据 `!== false`，同族先例 = `agent.injectDocs` / `agent.timerWake`）；**未设置时现行为完全不变**。
3. **阻断点 = 检索/注入调用不执行**（同 §6.24 口径：关 = 调用不执行 + 注入不发生，非仅吞输出）。
4. **热应用**：判点逐 run 现读 `agent.config`；写入落活 config 即**本会话下一次组装生效**（三端各自既有刷新语义，零新机制）。
5. **作用域 = 全局**（用户 2026-10-15 05:02 定）。
6. **收窄判据**：新键只影响 ①；关掉后 ② ③（文档检索 / 记忆）**逐项实测仍工作**。

**边界（本批不做）**

- **不**做按项目开关（用户定全局）。
- **不**改 ② 的既有键语义（迁移 = 越界）。
- **不**新增检索面 / 不改注入内容形态。

**主 agent 报备记录**

- 2026-10-15 05:04 报备（A/B/C 三面 + 来源）→ 用户「办」。
- **父侧自查**：首轮报备曾把 B/C 拆为"后续"，被用户纠正（05:04「说好了的事情你咋拉抽屉？」）——**已收回，B/C 并入本功能**。

**用户裁定续（2026-10-15 05:05–05:07）**

- **05:05「乙」**：职责关系取**完全正交** —— `agent.injectDocs` 收窄只管 ② 相关文档自动检索块；`agent.injectProjectRules` 只管 ① 项目指令块；两键互不影响。（需求档 §2.6 `:243` 已定行 / `:245` 不变式同载。）
- **05:07「还没正式用呢，不用注。」** ⇒ **不做变更告知**（不加运行期提示 / 不加检测代码 / 不加文档告示）。**依据**：`agent.injectDocs` 系 **2026-10-14 落地（昨日）· 尚未正式使用** ⇒ 无依赖旧语义的用户 ⇒ 告知无对象。
  - **⇒ 设计处置**：designer 交付里「老用户行为变更影响面 + 迁移注」一项，**降为设计档内一句事实登记**（"`injectDocs` 语义收窄为只管 ②——该键 2026-10-14 落地、未正式使用，故不设迁移提示"），**不加任何代码/文案**。
  - **本条为评审判据**：评审席若见设计档仍列"迁移提示/告知"为交付项 ⇒ 按本条判为超范围。

**设计交付登记（#43 · 2026-10-15）**

- 落点：`docs/core/design/PROMPT-SYSTEM.md` **§6.27（`:683-744` 新增）** + §6.24 同步改（键面 / 阻断点表 ① 行 / 正交注 / 不变式行）+ §7 决策记录（D-PS34 / D-PS35 续注 + **D-PS38** 新增）。
- 三项：**A** 新键 `agent.injectProjectRules`（默认 `true` · 判据 `!== false` · 判点 `thincoder-core/agent/setup.mjs:276`）· **B** 三端配置面逐端落点（file:line）· **C** `settings` 工具面（DEFAULTS 自动派生）。
- 受影响文件 12 档（含逐档现行行数）。
- **上抛（父侧路由）**：三端**设计档**的 #1420 两键端面登记行须随动 —— VSC `docs/vsc/design/SETTINGS.md:46-48` ∥ 桌面 `docs/desktop/design/SETTINGS.md:69` ∥ `docs/desktop/design/UI.md:522`（键数 / 词面）。**⇒ 属本功能文档面，随本批实施轮一并办**（或另派）——**父侧待办**。

## §2 批次任务与设计（eng-designer）
**状态行**：（eng-designer 写入时更新）
<§2 模板占位：本批条目（覆盖） / 设计档落点 / 机制设计 / 受影响文件与测试面 / 验收对照 / 关键决策 / 上抛项>

**状态行**：✅ 设计完成（2026-10-15）

**本批条目（三项 = 一个功能的三个面 · 全部覆盖）**

| # | 条目（对用户意味着什么） | 设计落点 | 状态 |
|---|---|---|---|
| **A** | **新键 `agent.injectProjectRules`** —— 关掉它 ⇒ `AGENTS.md` / `project_rules.md` 不再注入；文档自动检索与记忆注入不受影响 | 设计档 §6.27「职责切分」表 +「阻断点」表（① 行）+「默认零行为变」 | 已设计 |
| **B** | **三端设置界面都能配**（CLI `/config` · VSC 设置面板 · 桌面设置界面） | 设计档 §6.27「三端配置面落点」表（逐端 file:line）+「VSC 三处穿透补齐」 | 已设计 |
| **C** | **`settings` 工具面可自控** | 设计档 §6.27「`settings` 工具面」段（DEFAULTS 派生） | 已设计 |

**职责切分（用户 2026-10-15 05:05 拍板「(乙) 完全正交」）**

| 键 | 管 | 默认 / 判据 |
|---|---|---|
| `agent.injectProjectRules`（新） | ① 项目指令文件块（`~/.thincoder/AGENTS.md` 低优 + 项目根 `AGENTS.md` / `project_rules.md`） | `true` / `!== false` |
| `agent.injectDocs`（**职责收窄**——只管 ②） | ② 相关文档块（自动检索 + 注入） | `true` / `!== false` |
| `agent.injectMemories`（零动） | ③ 相关记忆块 | `true` / `!== false` |

**两键互不影响**：关 `injectDocs` ⇒ ① 照常注入；关 `injectProjectRules` ⇒ ② 照常检索。

**设计档落点**：`docs/core/design/PROMPT-SYSTEM.md`——**新增 §6.27「项目指令注入独立开关（`agent.injectProjectRules` · 拆 ① 出/职责正交）」**（`:683-744`）；同步更新 §6.24 键面 / 阻断点表（① 行改指新键 + 三键正交注）、§6.24 不变式行、§7 决策记录（D-PS34 / D-PS35 各加 2026-10-15 续注 + 新增 **D-PS38**）。**同族单源**：§6.24 仍是注入开关族机制档（#1420 本体），§6.27 = 本批拆键设计（两节互指，无重复详述——D2）。

**受影响文件全清单（逐档行数 · as-of 2026-10-15 实读）**

| 文件 | 现行数 | 本批预计 Δ | 落点 |
|---|---|---|---|
| `thincoder-core/config.mjs` | 514 | +2（`injectProjectRules: true` + 注释） | `:69-70` 邻位 |
| `thincoder-core/agent/setup.mjs` | 295 | +1（`:57` 归一变量）+ 改 1 行（`:276` 换判变量） | `:57` / `:276` |
| `thincoder-cli/src/tui/cmd-config.mjs` | 510 | +1 行（主菜单项）+ 1 行（view）+ 改 3 行（`:362`/`:388` 词面 + `:462` action 集合） | `:362`/`:388`/`:462` |
| `thincoder-vscode/src/agent/setup.mjs` | 318 | +4（默认种 + raw 读 + `agentFields` 白名单 + 注释） | `:131-132`/`:160-161`/`:180` |
| `thincoder-vscode/src/extension/settings.mjs` | 425 | +2 | `:45-46`/`:165-166` |
| `thincoder-vscode/src/extension/settings-panel-write.mjs` | 223 | +1 | `:84-85` 邻位 |
| `thincoder-vscode/webview/settings-agent.js` | 204 | +3（控件 + 载荷 + `EDIT_FIELDS`） | `:29-30`/`:128-129`/`:153` |
| `thincoder-vscode/locales/en.json` | 348 | +1 键 + 改 1 值 | `:144-145` + Help `:237-238` |
| `thincoder-vscode/locales/zh.json` | 348 | +1 键 + 改 1 值 | `:144-145` + Help `:237-238` |
| `thincoder-desktop/renderer/views/settings-agent.mjs` | 193 | +1（`NAMED_FIELDS` 行）+ 表注改 | `:63-64` |
| `thincoder-desktop/renderer/i18n-views.mjs` | 435 | +1 键 × 2 语 + 改 1 值 × 2 语 | `:208-209`/`:398-399` |
| `docs/core/design/PROMPT-SYSTEM.md` | 871（本设计轮已落） | +63（§6.27）+ §6.24/§7 续注 | `:599`/`:601-610`/`:621`/`:782-785` |

**`settings` 工具面**：`thincoder-core/config.mjs:69-70` 邻位声明 ⇒ 装载期经 `_deriveTypes(DEFAULTS)`（`thincoder-core/agent-tools/settings.mjs:55-69`）自动进 `TYPE_MAP`（`boolean`）⇒ list/set 面可见可写 + 类型护栏自动跟随，**实现面零改码**。

**验收对照（逐条可机判 · 回指需求 §2.6 验收四行）**

| # | 判据（可机判） | 回指 |
|---|---|---|
| 1 | `settings` 工具 list 面含 `agent.injectProjectRules`（布尔）；写 `false` ⇒ 下一回合 `systemPrompt` **无** `Project instructions (follow these as project conventions):` 块，**且** `[Relevant documentation` / `[Relevant memories` 两 reminder 照常 | 需求验收① |
| 2 | 三端界面各显该开关：CLI `/config` 行在（`cmd-config.mjs` `action === "agent.injectProjectRules"` 分支可达）；VSC `#ag-injectprojectrules` switch 在（`webview/settings-agent.js`）；桌面 `NAMED_FIELDS` 含 `agent.injectProjectRules` | 需求验收② |
| 3 | **默认零行为变**：不设三键跑装配，`systemPrompt` 与 #1420 落地态逐项同（① ② ③ 块全在）；②③ 判点零改 ⇒ 逐字零变 | 需求验收③ |
| 4 | **正交实测（关后 ②③ 仍工作）**：写 `agent.injectProjectRules=false` ⇒ ① 块消失 + ② ③ reminder 仍在；写 `agent.injectDocs=false` ⇒ ② 消失 + **① ③ 仍在**（本批新语义——甲乙之别实证） | 需求验收① + 判据 6 |
| 5 | VSC 三处穿透齐（默认种 / raw 读 / `agentFields` 白名单）——缺一则该键在 `config.json` 关不掉 | §5.15 先例 |
| 6 | 工程模式装配零变：关三键后 `discipline-engineering` / `persona-engineering` 槽位装配（`assemblePrompt`）逐字节同 | 需求不变式② |

**关键决策**

- **D-PS38**（新增）：职责关系取 **(乙) 完全正交**——用户 05:05 拍板；已知代价（改 `injectDocs` 已落语义）已录 + 迁移注（三端词面改述 + 新键说明，**不设**弹窗 / 迁移脚本）。否决 (甲) 总闸 + 分闸。
- **D-PS34 / D-PS35 续注**：键面扩为三键；① 判点改读新键（判点位置 `setup.mjs:276` 零变、只换判变量）。

**上抛项（报父侧）**

1. **观察项（非阻断）**：`docs/*/design/` 三端各档（VSC `SETTINGS.md:46-48` ∥ 桌面 `SETTINGS.md:69` ∥ `UI.md:522`）已载 #1420 两键的端面登记行——本批实施后**那些行的键数 / 词面须随动**（§6.27「三端配置面落点」已给逐行坐标，但归属 = 那些档的写权面：VSC/桌面设计档的键数登记行在本批射程外，**请父侧路由**）。
2. **需求档合规核对**：需求 `docs/core/requirements/PROMPT-SYSTEM.md` §2.6（`#1465` 块）五要素齐（目标 / 功能点 / 边界 / 验收 / 依赖）+ 已定行 `:243` 已载 (乙) ⇒ **合规、无需父侧补笔**。
3. **prompt-refs-check 基线红**：`docs/core/design/prompts/persona-eng-designer.md:41` ∥ `thincoder-core/prompts/persona-eng-designer.md:41` 各 2 条命中——**存量基线**（非本批引入，本文件不在本批写域）。

**自洽检查三项读数（完稿实测）**

1. **引用集 ↔ 标题集**：§6.27 内引用的档内节号 = `§6.24` / `§6.2` / `§5.15`；档内实存节 = 6.1–6.27 全部在册 ⇒ **引用集 ⊆ 标题集 ✓**（0 悬空）。
2. **表行 ↔ 小结数**：§6.27 三张表——职责切分 3 行（三键）∥ 阻断点 3 行（① ② ③）∥ 三端落点 3 行（CLI / VSC / 桌面）；小结声明的数目逐一对上 ⇒ **表行 ↔ 小结数 ✓**。
3. **声称 ↔ 实测**：受影响文件全清单 12 档行数 = 本轮 `readFileSync` 实测（514 / 295 / 510 / 318 / 425 / 223 / 204 / 348 / 348 / 193 / 435 / 298——`agent-tools/settings.mjs` 实测 298，档内坐标用 `:55-69` 段）；`PROMPT-SYSTEM.md` 871 行 = 写后实测；`setup.mjs:276` / `:57` / `:118` / `:157` / `helper:399` / `cmd-config.mjs:362/388/462` / `settings-agent.js:29-30/128-129/153` / `settings.mjs:45-46/165-166` 等坐标 = 本轮逐行实读 ⇒ **声称 ↔ 实测 ✓**（零「约 / 大概」）。

**机检**：`doc-check-width.mjs` 本批域 = **0 命中**（`PROMPT-SYSTEM` 零行宽违规——实测）；`prompt-refs-check.mjs` 本批新增文本 = 0 命中（上述 4 条 = 存量基线）；`doc-check.mjs` 本批域（`docs/core/**`）零新增红（该脚本全仓基线含 server-* 等他域存量红——非本批引入）。

**边界（本批不做）**：零实施（仅设计档 + 批档 §2）· 不做按项目开关 · 不改检索机制本体 · 不删数据 · 工程模式装配链零触 · `_archive/**` / 台账 / `prompts/**` 零触 · 需求档零笔。

## §3 设计评审（评审子代理）

### 轮次 1（评审子代理）

## 设计评审（#1465 · §6.27 `agent.injectProjectRules`）——发现表

| # | Category | Severity | Issue | Suggestion |
|---|----------|----------|-------|------------|
| 1 | Feasibility | 🔴 | **VSC 三处穿透坐标指错文件**——`PROMPT-SYSTEM.md:731` 明写「逐行坐标 = 上表 VSC 行」，而上表 VSC 行（`:728`）给的坐标落在 `thincoder-vscode/src/extension/settings.mjs:45-46` ∥ `:165-166`（读链归一 / 快照携键）与 `settings-panel-write.mjs:84-85`（写链 patch）。timer-wake 先例的**三处穿透**实测住在 `thincoder-vscode/src/agent/setup.mjs`：默认种 `:131-132`（`DEFAULTS.agent?.injectDocs !== false`）∥ raw 读 `:160-161`（`raw.agent?.injectDocs ?? cfgInjectDocs`）∥ `agentFields` 白名单 `:180`（`injectDocs: cfgInjectDocs`，表体 `:174-183`）。照本设计实施 ⇒ 改错档、真穿透面零补 ⇒ `config.json` 关不掉该键——正是本设计自己警告的「timer-wake 旧疾复现」。 | 把 VSC 行的三处穿透坐标改指 `thincoder-vscode/src/agent/setup.mjs` 的 `:131`（默认种）∥ `:160`（raw 读）∥ `:180`（`agentFields` 白名单），与 timer-wake 键（`:128` ∥ `:159` ∥ `:178`）同址同形；`extension/settings.mjs` / `settings-panel-write.mjs` / `webview/settings-agent.js` 保留为**界面链路**（读链归一 / 写 patch / 控件），两类坐标分列、勿混为一处。 |
| 2 | Requirements | 🟡 | **判点 ① 读变量归一未落在「归一」处**——`PROMPT-SYSTEM.md:701` 称「`:57` 新增 `injectProjectRules` 归一」，但 `setup.mjs:57-58` 是逐 run 现读的**消费点**（`const injectDocs = agent.config?.agent?.injectDocs !== false`），非「归一」层；真归一 = `config.mjs` DEFAULTS + VSC `agent/setup.mjs:160` raw 读。措辞易使实施者只在核侧加一行而漏 VSC 侧。 | 把 `:57` 表述改为「核侧新增消费点变量 `const injectProjectRules = agent.config?.agent?.injectProjectRules !== false`」，并单列 VSC 侧同址归一坐标（见发现 1）。 |
| 3 | Acceptance criteria | 🟡 | **「默认零行为变」的机判法只给正向断言、未给失败面**——`:712` 的断言（含 `Project instructions…` 块 + 两 reminder）无法区分「① 照常注入」与「② ③ 意外被牵连关掉」以外的退化；且未覆盖验收① 的反向面（写 `injectProjectRules=false` ⇒ ① 无块 **而** ②③ 照常）。 | 补反向断言：①关 ⇒ `systemPrompt` 无 `Project instructions…` 块 ∧ 仍含 `[Relevant documentation` / `[Relevant memories`；②关 ⇒ 无 `[Relevant documentation` ∧ 仍含 `Project instructions…`——三键正交可机判。 |
| 4 | Clarity | 🟡 | **CLI toggle 分支行号偏移**——`:727` 给「toggle 分支 `:462`」，实测 `cmd-config.mjs:462` 的分支判别式仅列 `agent.injectDocs \|\| agent.injectMemories`（新增键须并入该判别式），`:465` 才是 `slice("agent.".length)`——设计未点明「判别式须显式加新键」这一非天然兼容点。 | 明写「`:462` 分支判别式并入 `agent.injectProjectRules`（`:465` 取键机制天然兼容）」，避免实施者只加菜单项漏改判别式。 |
| 5 | Acceptance criteria / Doc | 🟡 | **受影响文件 12 档清单无行数标注与预期增量**——评审重点 ⑤（12 档清单是否全）在本设计档内无可核载体：§6.27 只有散文式落点行（`:727`–`:731`），§5（`:145-150`）为指针节、明示「不复制」。档内无「当前行数 + `≤±N`」表，故无法核 12 档是否齐、亦无法判越 300/500 结构线（评审标准第 8 条）。 | 在 §6.27 补「受影响文件（12 档）」小表：档 : 行 ∥ 当前行数 ∥ 预期增量（`≤±N` / 结构不变）——含核 `setup.mjs` ∥ `config.mjs` ∥ `settings.mjs`（工具面零改码，标注「结构不变」）∥ CLI `cmd-config.mjs` ∥ VSC 4 档 ∥ 桌面 3 档 ∥ 测试档。 |
| 6 | Document ownership | 🟡 | **§6.24 与 §6.27 对同一键面「族面现状」两处并存**——`:599`（「族面现状 = 三键——①…已拆至 `agent.injectProjectRules`（2026-10-15 · §6.27）」）与 `:621`（「本族新增第三键…本节两键语义收窄」）为**同机制的前向指针**，非矛盾，但 §6.24 表（`:603-607`）① 行仍以「`agent.injectProjectRules`（2026-10-15 拆出——§6.27）」标注，与 §6.27 表（`:699-703`）并存两份 ① 行——读者需自行对账。 | 在 §6.24 表下补一行「本表 ① 行以 §6.27 为准（本批后态）」单向指针句，使两表的 ① 定义面分出主从。 |
| 7 | Scope / Doc hygiene | 🔵 | **§7 表内 D-PS38 排在 D-PS37 之前**——`:783`（D-PS38）在 `:784`（D-PS37）之前，编号序与行序不符（D-PS37 为 2026-10-14 批、D-PS38 为本批）。 | 保持编号不变、按编号序重排两行（D-PS37 在 D-PS38 前），或注明 D-PS38 为「插入行」。 |
| 8 | Doc hygiene | 🔵 | **`:718` 括注残留半句形**——「（`:362` / `:388` 两处词面去「项目指令文件 + 」)」内含不成对括号（`+ 」`）与未闭合右括号，属表述瑕疵（非规范面失效表达）。 | 改写为「（`:362` / `:388` 两处词面去掉『项目指令文件 + 』括注）」。 |
| 9 | Feasibility | 🔵 | **桌面「装配表同键复用」坐标欠准**——`:721` 引 `agent-host.mjs:198-199`，实测该区为 `ensure()` 函数头（`:199`），装配复用实体现在 `:183-185`（`assembleAndLoad` → `assemble`）。结论（桌面免穿透）成立，仅坐标偏移。 | 坐标改指 `thincoder-desktop/src/main/agent-host.mjs:183-185`（`assembleAndLoad` 调 `assemble`）。 |

**核验轮（本评审实读）**：核 `setup.mjs:57-58`/`:118`/`:155`/`:157`/`:169`/`:276`/`:287-288`/`:103-112` ∥ `config.mjs:69-70`/`:333` ∥ `helpers.mjs:399` ∥ `assemble.mjs:65`/`:106` ∥ `agent-tools/settings.mjs:55-69`/`:239`-`:254`/`:62` ∥ `subagent-spawn.mjs:300-302` ∥ CLI `cmd-config.mjs:362`/`:388-389`/`:462`/`:465` ∥ VSC `extension/settings.mjs:45-46`/`:165-166` ∥ `settings-panel-write.mjs:84-85` ∥ `webview/settings-agent.js:29-30`/`:128-129`/`:153` ∥ `agent/setup.mjs:128`/`:131-132`/`:159`/`:160-161`/`:174-183`/`:180` ∥ `locales/zh.json:144-145`/`:237-238` ∥ 桌面 `views/settings-agent.mjs:3`/`:63-64` ∥ `i18n-views.mjs:208-209`/`:398-399` ∥ `agent-host.mjs:183-185`/`:199` ∥ 档 `CONFIG.md:157` ∥ `SETTINGS-TOOL.md:59-69`。**未核**：测试档在场性（`test/**` 不在本档射程）。

**计数**：🔴 ×1 ∥ 🟡 ×5 ∥ 🔵 ×3 ∥ 合计 9。

**域外注记（无严重度）**：① 需求档 §2.6 `:243`/`:245` 已定行与本设计一致，未发现需求—设计冲突；② 「受影响文件 12 档」若落在批次档 `docs/batches/2026-10-15-inject-project-rules-switch.md`（该档实存），则发现 5 的行数标注要求可改由批档承载——但本设计档自身仍缺该表（§5 明示不复制），评审标准第 8 条无从核；③ 未发现 §6.24/§6.27 机制面表述矛盾（同机制两处描述不同 = 文档归属 🔴 不成立）。

VERDICT: changes-required

## §4 用户批准（主 agent）
## §5 实施记录（eng-coder）
## §6 验证与收口（父代理）
