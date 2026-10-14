# 2026-10-14 · files 门 scripts 段层级收正
> 六段 append-only，一段一作者：§1 讨论（主 agent）· §2 批次任务与设计（eng-designer）· §3 设计评审（评审子代理）· §4 用户批准（主 agent）· §5 实施记录（eng-coder）· §6 验证与收口（父代理）。
> 编制：主 agent · 2026-10-14 · 来源 = dgx-spark 会话转报 + 用户裁定「这是个 bug」（2026-10-14）——轻通道轮（缺陷修）。
> 台账 = #1449（core · 归批）。前情 = 无（独立批）。
## §1 讨论（主 agent）
**状态行**：已收口 2026-10-15
<§1 模板占位：本批条目 / 关键判据 / 授权口径>

### 轮账（轻通道轮——2026-10-14 · 父侧直笔）

**开轮**：来源 = dgx-spark 会话转报（转报件 = 只读取证 + 实跑复现，未动本仓）+ 用户裁定「这是个 bug」（2026-10-14，经转报达本会话）⇒ 路由 = **轻通道轮**（三目之②「缺陷修」：用户当场裁定的缺陷——把实现拉回源头；零新机制）。台账行 = #1449（在途 · task_book = 本档）。

**披露（逐笔——disclose-then-go）**：

1. **本笔 = 轻通道**（缺陷修）｜改动：`thincoder-core/agent-tools/spawn-gates.mjs` —— F6 `files` 拦截谓词 `scripts` 段**层级锚定**（任意深度 ⇒ 仓根 + 直接子层；病灶 = `:100` 全区段扫描）+ 头注/错误句同步｜触及：全部 spawn 的 `files` 声明拒/放判定（唯一行为差 = depth ≥3 的 `scripts` 段不再拒——假阳性面收窄）｜回滚 = revertable。
2. **本笔 = 轻通道**（缺陷修——用例）｜新增 `docs/batches/2026-10-14-files-gate-scripts-depth.test.mjs`（换型三例 + 两族零回归 + 对照；behavior 断言，零散句锚）。

**收尾链待跑（欠步清单）**：① §2 设计形式化（eng-designer：`docs/core/design/AGENT-LOOP-SUBAGENT.md` F6 `:287` ∥ AC-M5-5 `:297` 措辞层级化 + 本档 §2）② §3 独立评审 ③ §4 批准 ④ §6 收口结算（判据/读数/台账迁转/冻档）。**运行面物流**：本修落源码树；全局副本 ∥ 桌面 asar 生效随本仓发布链（转报件 §7——发布轮/另轮盖到，另记）。

### 落笔与实走（2026-10-14 · 父侧直笔完成）

**笔 1 — `thincoder-core/agent-tools/spawn-gates.mjs`**（3 处，全落）：

- `:102` 谓词：`segs.some((s) => s.toLowerCase() === "scripts")` ⇒ `segs.slice(0, 2).some((s) => s.toLowerCase() === "scripts")`——scripts 段仅出现在前两段（仓根 ∥ 直接子层）才拒；depth ≥3 放行。
- `:89-94` 头注：层级锚定口径 + 依据（#1449 ∥ 深层目录名不携带 face 信息）+ 实测形态注。
- `:103` 错误句：`scripts/** is…` ⇒ `scripts/* at the repo root or a direct child package is…`（英文词面随判据同步）。
- 读数：`node --check` 绿（edit 回执 3/3）；错误句/头注逐字读回 ✓。

**笔 2 — `docs/batches/2026-10-14-files-gate-scripts-depth.test.mjs`**（新件，2677 字符）：

- 六腿：① 换型核（转报实锤八件全过）∥ ② 浅层仍拒（仓根 ∥ 直接子层 ∥ 大小写不敏感）∥ ③ 边界对（第三段放行 ∥ 第二段拒）∥ ④ 两族零回归（changelog 任意层 ∥ manifest 任意层）∥ ⑤ 收集式 fail-closed 保持（混单齐列、放行项不入列）∥ ⑥ 对照（非 scripts 深层放行）。
- 断言全行为式（拒 ∥ 放），零散句锚。

**实走读数（现场跑）**：

- `node --test docs/batches/2026-10-14-files-gate-scripts-depth.test.mjs`（cwd=`thincoder/`）⇒ **6/6 绿**。
- 转报复现命令（直调谓词四例，逐字复跑）：

| 输入 | 结果 | 判 |
|---|---|---|
| `deployment/spark8/scripts/prepare-host.sh` | PASS | **误伤已消**（前态 = REFUSE） |
| `scripts/build.mjs`（仓根） | REFUSE | 设计意图保持 |
| `thincoder-desktop/scripts/build.mjs`（包级） | REFUSE | 本仓形态保持 |
| `deployment/spark8/README.md` | PASS | 对照不变 |

**冻结等待**：本笔 = 已落 + 已走查；**未冻结**——随收尾链（§2→§3→§4→§6）跑完入冻结。台账 #1449 行 = 在途（标题携「收尾链待跑」）。

### 收尾链补笔（2026-10-15 · 父侧直接执行 · 机械 · 可 revert）

**披露（逐笔）**：

1. **本笔 = 轻通道**（缺陷修——评审发现）｜改动：`thincoder-core/agent-tools/subagent-scheduler.mjs` 注释两处口径随正（`:46` 族句「ledger.db / CHANGELOG + scripts/**」⇒「过程档（CHANGELOG）+ 工程工具面（`scripts/*`——层级锚定：仅仓根与直接子层；目录名在深层不携带 face 信息）」；`:60`「scripts/**」⇒「`scripts/*`（仅仓根/直接子层）」）——来源 = §3 评审 #37 问题表 #1（§2.5 枚举补录项；父侧裁 = 就地修）｜reach = 注释面（零行为）｜回滚 = revertable。
2. **说明（其餘上抛维持）**：§2.5#1（需求档 :20）之处置已落（主 agent 笔——上抛①已办，本笔未触）；§2.5#2–#4（提示词双面 ∥ `PORTABILITY.md`）维持上抛（其轮次随正）；§2.5 经扫②（变更面路由表 `scripts/**`）＝ 另一机制（设计原判「不判其改」维持）；评审所列同族行（`persona-engineering.md:88/:89` ∥ `ENGINEERING-MODE-V2.md:657`）随此判——不动作。

## §2 批次任务与设计（eng-designer）
**状态行**：设计完成（轻通道收尾链设计形式化——F6/AC-M5-5 措辞层级化 + 变更记录一条；域外残留五条上抛（§2.5））
<§2 模板占位：本批条目（覆盖） / 设计档落点 / 机制设计 / 受影响文件与测试覆盖 / 验收对照 / 关键决策 / 上抛项>

### §2.0 本批条目（覆盖 · 三件——皆已于 §1 父侧直笔落盘）

轻通道轮（缺陷修）收尾链第①段 = **设计形式化**（本席 = eng-designer）。三件实读坐标如列：

| # | 条目 | 坐标（实读） | 状态 |
|---|---|---|---|
| 1 | F6 `files` 拦截谓词**层级锚定**——`scripts` 段仅仓根 ∥ 直接子层拒（depth ≥3 放行） | `thincoder-core/agent-tools/spawn-gates.mjs:102`（`segs.slice(0, 2)`） | 已落（§1 笔 1） |
| 2 | 头注 ∥ 错误句随判据同步（英文词面） | `spawn-gates.mjs:89-94`（头注）· `:103`（错误句 `scripts/* at the repo root or a direct child package …`） | 已落（§1 笔 1） |
| 3 | 批内用例六腿（全行为式断言——拒 ∥ 放） | `docs/batches/2026-10-14-files-gate-scripts-depth.test.mjs` | 已落（§1 笔 2）· `node --test` **6/6 绿** |

### §2.1 设计档落点（本轮——设计形式化）

| # | 落点 | 改动 |
|---|---|---|
| 1 | `docs/core/design/AGENT-LOOP-SUBAGENT.md` §6.22 **F6 行**（`:287`） | 措辞**层级化**：`不列工程工具面（`scripts/**`）` ⇒ `不列工程工具面（`scripts/*`——层级锚定：仅仓根与直接子层——目录名在深层不携带 face 信息）` |
| 2 | 同档 §6.22 **AC-M5-5 行**（`:297`） | 措辞**层级化**：`scripts/**` ⇒ `scripts/*`（层级锚定：仅仓根与直接子层） |
| 3 | 同档**变更记录**（档尾追加一条——`:1045`） | 日期 + 批名 + 一句——口径 = 与 `spawn-gates.mjs:89-94` 头注同 |

**受影响文件**：设计档 1 档（上表三处——行内替换 2 + 追加 1）；**码面 / 用例 = 零触**（已落——§1）；**禁触面**（产品码 ∥ `scripts/**` ∥ 其它设计档 ∥ 需求档 ∥ 提示词面 ∥ 台账）= 零触。

### §2.2 机制设计（判据口径——收正后）

- **判据（层级锚定）**：归一化（`\` ⇒ `/`、滤空段）后，`scripts` 段**仅出现在前两段**（仓根 ∥ 直接子层）才拒；**depth ≥3 放行**——目录名在深层不携带 face 信息。
- **保持面**：大小写不敏感 ∥ 收集式 fail-closed（一条违规 ⇒ 整单拒 + 混单齐列、放行项不入列）∥ 错误序不变（目录声明在 `normalizeFileList` 循环内先行拒）；与非 `scripts` 两族（过程档 basename 任意层 ∥ `PROJECT-MANIFEST.json` 任意层）零交互——两族判据零改。
- **换型形态**：`deployment/spark8/scripts` 类交付物（转报实锤 8 件）⇒ 放行；仓根 `scripts/build.mjs` ∥ 包级 `scripts/build.mjs` ⇒ 仍拒。

### §2.3 验收对照（§1 实走读数 + 本段复跑）

| # | 判据 | 读数 | 来源 |
|---|---|---|---|
| 1 | 批内用例六腿全绿 | **6/6 绿**（`node --test docs/batches/2026-10-14-files-gate-scripts-depth.test.mjs` · cwd=`thincoder/`） | §1 |
| 2 | 转报复现四例 | 深层 `scripts` PASS（误伤已消）∥ 仓根 REFUSE ∥ 包级 REFUSE ∥ 非 `scripts` 深层 PASS | §1 表 |
| 3 | 设计档措辞 ∥ 码面现口径**逐字对读** | 读回核 ✓（`:287` 164 字符 ∥ `:297` 65 字符——均 ≤300；口径句与 `spawn-gates.mjs:89-94` ∥ `:102-103` 逐字对读） | 本段 |
| 4 | `node scripts/doc-check.mjs --root .`（cwd=`thincoder/`）**新红零新增** | 改前：候选 65502 · 悬空 24 · 注记豁免 303 · 拟新增 26 · 迁移期引文 341 · 声明源缺位 0（exit 1——存量锚闸 `FAIL(锚): 24 条悬空`）；改后复跑（设计档落笔后）：候选 65503（Δ+1）· 悬空 24（**零新增**）· 其余全同；**红面逐数零变**（悬空 24 ∥ ✗ 394 ∥ 报告 1107 ∥ 行数面差异 84 条） | 本段 |

### §2.4 关键决策

- **KD-1 · 层级锚定（②案——台账 #1449 evidence 口径）**：判据 = `scripts` 段仅**仓根 ∥ 直接子层**拒、depth ≥3 放行。**为什么**：
  - ① **假阳性代价**：旧判据（任意深度即拒）误拦 `deployment/spark8/scripts/*` 类**部署交付物**（转报实锤八件；用户裁「这是个 bug」）——误拦直接挡正常派单；规避径 = 剔除申报 ⇒ 判据被绕过（比无判据更坏）。
  - ② **目录名信息量**：「`scripts` = 工程工具面」约定**仅在仓根与直接子层成立**（直接子层 = 包级 `scripts/`——本仓产品包皆直接子层；`:103` 词面 `a direct child package`）；depth ≥3 的目录名**不携带 face 信息**（`deployment/<x>/scripts/` 是交付物脚本）——据其判 face = 凭空赋予含义。
- **否决面**：旧「任意深度全拒」形态（病灶来源——§1 已载）；判据本体本段零动（已落）。

### §2.5 上抛项（域外同口径残留五条——处置权归父侧）

本段射程（设计档两处 + 变更记录）已落。下列**本批写域外**面仍载收正前 `scripts/**` 措辞（或受连带漂移），逐条坐标如列——处置权归父侧（各按写权矩阵）：

| # | 面 | 坐标 | 现文本（要点） | 备注 |
|---|---|---|---|---|
| 1 | 需求档 | `docs/core/requirements/ENGINEERING-MODE-V2-SPEC-DELEGATION.md:20` | 「**不列工程工具面（`scripts/**`）**」 | 需求档笔 = 主 agent |
| 2 | 提示词面（CN） | `docs/core/design/prompts/persona-engineering.md:160` | 「工程工具 / 脚本（`scripts/**`）不入域」 | 提示词内容权 = 主 agent |
| 3 | 提示词面（EN） | `thincoder-core/prompts/persona-engineering.md:163` | 「engineering tools / scripts (`scripts/**`) stay out」 | 同上（落地面） |
| 4 | 其它设计档 | `docs/core/design/PORTABILITY.md:175` | 「`scripts/**` 拒入域」+ 坐标 `:95-109`（函数现盘 `:97-111`——收正连带漂 2 行） | 本批禁触——父侧裁归批 |
| 5 | 存档面 | `_archive/modules/ENGINEERING-MODE-V2-MODULE-DELEGATION.md` · `_archive/ENGINEERING-MODE-MECHANISM.md:419` | 旧措辞（`scripts/**`） | 存档 = 冻结历史——不动（登记备查） |

**经扫判无随改必要（登记备查，非上抛）**：① `docs/core/requirements/ENGINEERING-MODE-V2.md:677`「工程工具不入域」句——无 `scripts/**` 字面，与收正后口径不冲突；② 变更面路由表（`docs/core/design/prompts/discipline-engineering.md:19` ∥ `thincoder-core/prompts/discipline-engineering.md:19`）的 `scripts/**` = **另一机制**（变更面分流 ≠ F6 声明面拦截）——本段不判其改。

**§2.1 行 1 排版注（本段追加）**：该行「旧 ⇒ 新」引号嵌套有误——对读以本行为准：旧 =「不列工程工具面（`scripts/**`）」；新 =「不列工程工具面（`scripts/*`——层级锚定：仅仓根与直接子层——目录名在深层不携带 face 信息）」（新句 = 设计档 `:287` 现值逐字）。

## §3 设计评审（评审子代理）
## §4 用户批准（主 agent）

**批准（父侧代签——2026-10-15）**：授权在册 = 用户 2026-10-15 00:08「都自动跑到交付吧」。代签依据三条齐备：① §3 独立评审判果 **pass**（advisor #37——声明面全绿：谓词 `slice(0,2)` ∥ 头注 ∥ 错误句 ∥ F6 `:287` ∥ AC-M5-5 `:297` ∥ 需求档 `:20` 逐字对位 ∥ 零语义改动 ∥ 记录面对账；零 🔴）；② 评审 🔵 两件处置：枚举补录 = **本笔就地修讫**（`subagent-scheduler.mjs:46/:60/:63` 注释口径随正——§1 补笔条在册）∥ §2.5#1 旧态 = §6 记明（处置以主 agent 笔在册为准）；③ 修正轮无须（评审 pass、零 🔴、零 must-fix）。**代签范围** = 本批收口（§6 结算 ∥ 台账迁转 ∥ 冻档）——不扩面、不夹带。

## §5 实施记录（eng-coder）
## §6 验证与收口（父代理）

**6.1 判据核对（声明面——逐条实读）**

| 面 | 读数 | 判 |
|---|---|---|
| 谓词 | `spawn-gates.mjs:102`「`if (segs.slice(0, 2).some((s) => s.toLowerCase() === "scripts")) {`」——仅前两段（仓根 ∥ 直接子层）拒、depth ≥3 放行。 | ✓ |
| 头注 | 同档 `:90`「层级锚定：仅仓根与直接子层」。 | ✓ |
| 错误句 | 同档 `:103`「scripts/* at the repo root or a direct child package is the engineering-tools face」。 | ✓ |
| F6 | `AGENT-LOOP-SUBAGENT.md:287` 层级化句在档。 | ✓ |
| AC-M5-5 | 同档 `:297` 层级化句在档。 | ✓ |
| 需求档 | `ENGINEERING-MODE-V2-SPEC-DELEGATION.md:20` 收正已落（2026-10-15 标记；口径句四处逐字一致）。 | ✓ |
| 零语义改动 ∥ 记录面 | 变更记录 `:1045` 在档、口径与头注同；批档 §1→§2 逐笔对读相符。 | ✓ |

**6.2 §3 归口（结论代录归 §6——沿先例）**：advisor #37 · **pass**。评审两件 🔵 全处置：① §2.5 枚举补录（调用点注释 `:46/:60/:63` 仍载旧措辞）→ **当场修讫**（§1 补笔条在册；零行为面）；② §2.5#1 行旧态（需求档 :20 之处置已落）→ **本节记明**（表为设计轮快照，处置以主 agent 笔在册为准）。

**6.3 余项（维持上抛——非欠项）**：§2.5#2–#4（提示词双面 ∥ `PORTABILITY.md:175`）= 其轮次随正（台账在册）；§2.5 经扫②（变更面路由行 `persona-engineering.md:88/:89` ∥ `ENGINEERING-MODE-V2.md:657`）= 另一机制，不动作（设计原判维持）。

**6.4 结算**：台账 #1449 在途 → 待核销 → 已核销（本 §6 为凭）；批档 §1 收口 + 全档冻结。

**本批 = 收口（2026-10-15）。**
