# 2026-10-14 · 提示词/记忆注入开关
> 六段 append-only，一段一作者：§1 讨论（主 agent）· §2 批次任务与设计（eng-designer）· §3 设计评审（评审子代理）· §4 用户批准（主 agent）· §5 实施记录（eng-coder）· §6 验证与收口（父代理）。
> 编制：主 agent · 2026-10-14 · 来源 = 用户 2026-10-14 09:56 提出（提示词/记忆注入开关——迁移项目行为干扰应急阀）+ 12:15「办」点火 + 两裁定（12:15 原话：「文档和记忆分开开关，做成全局控制就行」）。
> 台账 = #1420（core · 归批）。前情 = 无（独立批）。
## §1 讨论（主 agent）
**状态行**：已收口 2026-10-14
<§1 模板占位：本批条目 / 关键判据 / 授权口径>

**来源**：用户 2026-10-14 09:56 提出（原话要点：从零用 ThinCoder 的项目执行舒服；他处 coder 做的旧项目迁移过来后常「推诿不干活」——疑因文档注入（为旧 agent 写的约束随文档进提示词）干扰行为；提议给「提示词注入」「记忆注入」各加配置开关，配置界面 ∥ 会话可关）；12:15「办」点火；两裁用户 12:15 已定（原话：「文档和记忆分开开关，做成全局控制就行」）。

**需求形（本批口径）**：

- **两枚开关，按来源分**：**文档注入开关**（文档类自动注入整侧）∥ **记忆注入开关**（记忆类自动注入）。
- **粒度 = 全局**（用户裁；父侧原呈报含项目级倾向——用户定全局）。
- **关 = 阻断自动推送，不删数据**；按需工具（read ∥ doc_search ∥ memory search）零影响——随时可查（沿用户 09:56 原意）。
- **工程模式不吃这两面**（纪律走提示词本体）——关不破工程流程（不变式，设计须保）。
- **落点 = 既有配置面**：config.json 键 + 设置界面 + 会话 `/config`/settings 工具。

**现盘坐标（父侧实读）**：

- 文档注入 ①（项目指令文件块）= `thincoder-core/agent/helpers.mjs:397-421` `loadProjectInstructions`（`~/.thincoder/AGENTS.md` 低优 + 项目根 `AGENTS.md`/`project_rules.md`，合拼上限 3.2 万字符，随提示词注入）。
- 自动检索块 ② = `thincoder-core/agent/setup.mjs:111-127`（depth-0 自动注入「相关文档 + 相关记忆」两组，`MEMORY_SEARCH_LIMIT=3` / `DOC_SEARCH_LIMIT`）。

**父侧映射（来源 = 设计侧推论，非用户原话——与用户原意有别请指出）**：「文档和记忆分开开关」→ 按**来源**两枚：① 项目指令文件块 与 ② 的「相关文档」组 ⇒ **文档开关**；② 的「相关记忆」组 ⇒ **记忆开关**。（原问「记忆开关范围 = 仅记忆 vs 记忆+自动文档同块」，用户答「分开」⇒ 自动文档检索归文档侧。）

**在场冲突（阻塞在报）**：本批两主落点档 = `docs/core/requirements/PROMPT-SYSTEM.md` ∥ `docs/core/design/PROMPT-SYSTEM.md` **正被另一会话在改（未提交——本仓共享树纪律：在场件勿碰）**。实读：`git status` 两档均 M ∥ mtime 2026-10-14 09:38 ∥ 另一会话（cli pid 7824 · slot 42）在活。⇒ 需求回笔与设计轮**均待其腾出**。解锁 = 它会话提交/收口，或用户令其先行收尾。

**计划**：① 需求回笔（待档腾出——需求档面 = 主 agent 笔）② 设计轮（eng-designer ∥ 同阻塞）③ 实施（含配置界面 + 会话开关 + 两开关语义）④ 收尾链。

**追加裁定（用户 2026-10-14 12:14 原话）**：「几个客户端都要能在配置界面上配置，同时也开放工具给agent让agent也能自己控制开关」⇒

- **配置界面 = 各客户端都要有**（非单一入口）：CLI ∥ VSC ∥ 桌面 三端配置界面各落两开关——口径单源 = 核 `config.json` 两键；端 = 读写/展示形。
- **agent 工具面 = 开放**：`settings` 工具可读写两键（热应用语义 = 写入后当前会话下一次提示词组装即生效）。
- **来源标注**：本追加 = **用户原话直令**（非设计侧提议）。
- **面数登记**：本批 = 核机制面（开关语义 ∥ 注入阻断点）+ 三客户端配置界面面 + settings 工具面——多实现面批；各面独立实现、语义单源（核），收尾链按多实现面纪律查四轴一致。

- **修正轮后父侧直接执行（2026-10-14 · 可 revert）**：评审 #187 修正轮（#189）上抛·待裁项裁定 = **补列**——`docs/core/design/CONFIG.md` §6.2 派生消费面登记行键列补 `agent.injectDocs` ∥ `agent.injectMemories`（timer-wake 先例同形；零新语义）+ 该档变更记录一行——父侧机械面直笔。

- **授权（用户 2026-10-14 14:44「点火！自动跑」）**：本批**全链自动**（评审代点火 ∥ §4 代签 ∥ 修正/实施派发 ∥ 收口核销提交双推 token 终消费）+ 父侧自缚三条（代签仅三条件齐备——评审 pass ∧ 修正轮落地并逐条核验 ∧ token 已签发 ∥ 新范围/口径裁决 ⇒ 停下只摆一条 ∥ 破坏性 ⇒ 先停）。

## §2 批次任务与设计（eng-designer）
**状态行**：设计完成（§3 轮次 1 修正轮已落（发现 1–8 逐号——本段「修正轮 1」块；设计档 `PROMPT-SYSTEM.md` 7 处同步修毕 · 机检本批域 0 悬空 ∥ 0 行宽红））
<§2 模板占位：本批条目（覆盖） / 设计档落点 / 机制设计 / 受影响文件与测试覆盖 / 验收对照 / 关键决策 / 上抛项>

**本批条目（覆盖——需求档 `docs/core/requirements/PROMPT-SYSTEM.md` §2.6 · 台账 #1420）**：

| # | 条目 | 判据（→ 验收对照/用例） |
|---|---|---|
| ① | 核 `config.json` 两键（口径单源——`agent.injectDocs` ∥ `agent.injectMemories`） | U1–U5 |
| ② | 三客户端配置界面各落两开关（CLI ∥ VSC ∥ 桌面——用户 12:14 直令） | U7 ∥ U8 ∥ U9 + 收尾走查 |
| ③ | `settings` 工具可读写两键（热应用 = 写入后当前会话下一次提示词组装即生效——用户 12:14 直令） | U5 + U9 守卫格 |
| 不变式 | 工程模式不吃这两面——关不破工程流程 | U6 |

**需求合规检查（五要素）**：目标 ✓ ∥ 功能点 ✓（三条——可机检）∥ 边界 ✓ ∥ 依赖 ✓（无）∥ 验收 ⚠ 无独立验收段——判定行由本设计给出（见验收对照），建议需求档补一行机检判据指针（回笔 = 主 agent 笔——上抛项）。

**数据源**：需求登记块 `docs/core/requirements/PROMPT-SYSTEM.md:209-215`（#1420）；批档 §1 用户原话与父侧映射（「分开开关」映射 = 父侧推论已载）。

**设计档落点**：`docs/core/design/PROMPT-SYSTEM.md` §6.24（新节——机制语义单源）+ 变更记录一行——**本设计轮已落**（935 ⇒ 964 行）。

其余核档零改（判据）：`AGENT-PARAMS.md` = 主循环/评审参数面（本批 = 注入控制，非循环参数）∥ `CONFIG.md` = 通道纪律面（无全量键目录；派生面 §6.2 已载）∥ `SETTINGS-TOOL.md` = 加键流程 = DEFAULTS 一处、护栏自动跟随（档内已载，零改）。

面档（`docs/vsc/design/SETTINGS.md` ∥ `docs/desktop/design/SETTINGS.md`）登记 = 实施落盘后随批（计数以实读为准——见受影响表末两行）。

**机制设计（详情 = §6.24）**：

- 键：`agent.injectDocs` ∥ `agent.injectMemories`——布尔、默认 `true`（DEFAULTS.agent 声明）；判据 `!== false`；缺省 = 现行为零变。
- 阻断点三处（核 `thincoder-core/agent/setup.mjs`）：① 项目指令文件块 `:265-268`（`loadProjectInstructions` 调用与拼接包条件——helper 签名零改）∥ ② 相关文档块 `:113-148` ∥ ③ 相关记忆块 `:149-159`；关 = 检索调用不执行（零无谓开销）。
- 热应用：判点逐 run 现读 `agent.config`（`prepareRun`）⇒ `settings` 工具写入后本会话下一次组装即生效；CLI `/config` 经 `reloadConfig` 即热；VSC 面板腿 = 下一条消息（`hydrateRun` 每轮重读）；桌面 UI 腿 = 下次装配。
- 子代理 config 继承父（`thincoder-core/agent-tools/subagent-spawn.mjs:300-302`）⇒ 子代理装配同受开关。

**三端界面落点（逐文件）**：

- **CLI `/config`（`thincoder-cli/src/tui/cmd-config.mjs`，现 487 行）**：菜单两行（布尔带 `:355-358` 尾附——`agent.injectDocs = on|off（文档注入——项目指令文件 + 相关文档——默认开）` 形；显示判定 `!== false`）；处理支两键共用一支（`saveProxy` 写 `raw.agent.<key>` → `reloadConfig` 即热；`continue` 必带——漏则掉进数值兜底支）；View 详情两行（`:379-382` 区）；生效文案无「重启」注（即热）。
- **VSC Agent 卡（`thincoder-vscode`）**：`webview/settings-agent.js` 两控件行（autoThink `:27` 后；`!== false` 判勾）+ 载荷两键（`:122-123` 区）+ EDIT_FIELDS 两键（`:146`——漏登记 = 静默全量保存）；写行 `src/extension/settings-panel-write.mjs`（`:81-82` 区——`!!` 双值都落盘）；读链 `src/extension/settings.mjs` `loadAgentSettings`（`:43-44` 区）+ 快照（`:161-162` 区）；**agent 装配 `src/agent/setup.mjs` 三处（`:127-128` 默认种 ∥ `:154-155` raw 读 ∥ `:168-175` agentFields）——缺则 config.json 对该键关不掉（timer-wake 阶段 2 实证先例）**；i18n `locales/en.json` ∥ `locales/zh.json` 各 +4（标签 ×2 + 悬浮说明 ×2）。
- **桌面 Agent 段（`thincoder-desktop`）**：`renderer/views/settings-agent.mjs` `NAMED_FIELDS` +2（`:40-61` 表——`{ path, word, kind: "boolean" }`）；i18n `renderer/i18n-views.mjs` en/zh 各两键（值 = VSC 同键逐字）；写/读链零改（`settings:agent` 通用——`src/main/settings.mjs:255-297`；读面 `loadConfig` 合并 ⇒ 默认装态 = 勾选）。
- **文案稿（两语）**：标签 "Document injection (project instructions + relevant docs)" ∥「文档注入（项目指令文件 + 相关文档）」；"Memory injection (recall from previous sessions)" ∥「记忆注入（往期相关记忆召回）」；说明（VSC `…Help`）"When off, the project instruction file block (AGENTS.md / project_rules.md) and automatic relevant-document recall are not injected into prompts. On-demand tools (read, doc_search) are unaffected." ∥「关 = 阻断项目指令文件块与自动相关文档检索的注入；按需工具（read、doc_search）不受影响。」（记忆键同形——memory search）；**文案零指向不存在入口**（开关各行即入口）。
- **`settings` 工具面**：DEFAULTS 派生——两键 `list/get/set` 可见可写 + 布尔类型护栏（非布尔拒）+ `null` = 显式清除；描述文本零改（`thincoder-core/tool-docs/settings.md` 不枚举键集、示例不失真）。

**受影响文件表（行数 = 本设计轮实读）**：

| 文件 | 现 | Δ | 后（预） | 说明 |
|---|---|---|---|---|
| `thincoder-core/config.mjs` | 510 | +2 | 512 | DEFAULTS.agent 两键（`true`）——已越 500 advisory（存量），800 硬线内 |
| `thincoder-core/agent/setup.mjs` | 284 | +6 | ≈290 | 三判点（①②③） |
| `thincoder-cli/src/tui/cmd-config.mjs` | 487 | ≈+15 | ≈502 | 菜单 2 + 共用处理支 ≈11 + View 2——跨 500 advisory ≈2 行（不 blocking；处置 = 接受 ∥ 另批拆——上抛项） |
| `thincoder-vscode/webview/settings-agent.js` | 196 | +4 | 200 | 控件 2 + 载荷 2 + EDIT_FIELDS 2（合并计） |
| `thincoder-vscode/src/extension/settings-panel-write.mjs` | 219 | +2 | 221 | 两布尔写行 |
| `thincoder-vscode/src/extension/settings.mjs` | 421 | +4 | 425 | 读链 2 + 快照 2 |
| `thincoder-vscode/src/agent/setup.mjs` | 310 | +5 | 315 | 默认种 2 + raw 读 2 + agentFields 1（合并计） |
| `thincoder-vscode/locales/en.json` | 320 | +4 | 324 | 标签 2 + 说明 2 |
| `thincoder-vscode/locales/zh.json` | 320 | +4 | 324 | 同上（两语同批） |
| `thincoder-desktop/renderer/views/settings-agent.mjs` | 189 | +2 | 191 | NAMED_FIELDS 两条 |
| `thincoder-desktop/renderer/i18n-views.mjs` | 417 | +4 | 421 | en/zh 各 2 |
| `docs/batches/2026-10-14-injection-switches.test.mjs` | — | 新建（拟新增） | 估算 ≤400 | 批内件单测（U1–U9） |
| `docs/core/design/PROMPT-SYSTEM.md` | 935 | +29 | 964 | §6.24 + 变更记录——**本设计轮已落** |
| `docs/vsc/design/SETTINGS.md` | 899 | 待定 | — | §2.3 两链登记（实施落盘后随批——计数以实读为准） |
| `docs/desktop/design/SETTINGS.md` | 753 | 待定 | — | §2.3 NAMED_FIELDS 计数（十八 ⇒ 二十）+ §3.1 行数账（实施落盘后随批） |

**用例清单（批内件 `docs/batches/2026-10-14-injection-switches.test.mjs`：拟新增）**：

- U1 默认零变：无键 ⇒ 三块全在场（AGENTS 块 ∥ [Relevant documentation ∥ [Relevant memories）+ DEFAULTS 两键 = true。
- U2 `agent.injectDocs=false` ⇒ ①②缺 ∧ ③在；且文档检索零执行（SQL spy 零 `doc_chunks` 查询）。
- U3 `agent.injectMemories=false` ⇒ ③缺 ∧ ①②在。
- U4 双关 ⇒ 三块全缺。
- U5 热应用：同一 agent 两次 `prepareRun` 间翻转 `agent.config.agent.injectDocs` ⇒ 第二次组装生效（本会话即热）。
- U6 工程不变式：`config.agent.engineering=true` + 双关 ⇒ `systemPrompt` 仍以 `assemblePrompt("engineering")` 基底开头（槽位装配零触）。
- U7 CLI 开关腿：ctx mock 首轮选 `agent.injectDocs` ⇒ `persistRaw` 收 `raw.agent.injectDocs===false`；再选 ⇒ true；菜单行 on/off 随值。
- U8 VSC 腿：`saveAgentSettingsFromPanel` 两键 true/false 均落盘（行为断言优先）；宿主依赖不可绕 ⇒ 退结构断言（控件行 ∥ 写行 ∥ 两语键对等）。
- U9 桌面腿：NAMED_FIELDS 两键（kind=boolean）+ i18n 两语键对等；可驱动则加 `settings:agent` patch 布尔守卫格（非布尔拒）。
- harness 先例：核面 = `docs/batches/2026-10-10-agent-loop-allotment.test.mjs`（embedder 桩 + 临时库 + `drive()` 直驱 `prepareRun`）；CLI 腿 = `docs/batches/2026-09-30-heap-snapshot-switch.test.mjs`（ctx mock）。

**验收对照（需求条目 → 判据）**：

| 需求条目 | 判据（机检形） | 落 |
|---|---|---|
| ① 核两键 | U1–U5 + DEFAULTS 实读（单测内断言两键 = true） | 批内件 |
| ② 三端界面 | U7 ∥ U8 ∥ U9（可驱动面）+ 收尾走查（三端设置面实开两开关——人工） | 批内件 + 收尾 |
| ③ 工具热应用 | U5（组装面）+ U9 守卫格（写入面）；描述零改判据 = 不枚举键集 | 批内件 |
| 不变式 | U6 | 批内件 |
| 边界（按需工具零影响） | 受影响表零工具面文件（结构证据）+ 检索调用被跳过（U2） | 受影响表 ∥ U2 |

**关键决策（KD；含否决备选）**：

| # | 决策 | 理由 / 否决 |
|---|---|---|
| KD-1 | 键名 `agent.injectDocs` ∥ `agent.injectMemories`（平表、动词式） | 平表开关族先例（verifyGuard / timerWake / autoThink）；否决嵌套 `agent.injection.*`（多一层寻址 + UI/工具落点加层）∥ 名词式（docInjection——与族形不一） |
| KD-2 | 默认 `true` 且**显式 DEFAULTS 声明** | 缺省 = 现行为零变；settings 类型护栏 / list 面靠 DEFAULTS 派生——不声明 = 无校验 + 键面缺失 |
| KD-3 | 判据 `!== false`（默认开族口径） | 同 `agent.timerWake`；否决 `=== true`（缺省态被误判为关） |
| KD-4 | 阻断点 = `setup.mjs` 调用侧三判（不动 `loadProjectInstructions` 签名） | helper = 公开导出面；调用侧判点最小爆炸半径；否决「helper 内读 config」 |
| KD-5 | 文档开关覆盖两注入块（项目指令文件 + 自动文档检索） | 用户「分开」两裁 + 需求 §2.6 已载映射；否决单覆盖项目指令文件 |
| KD-6 | 关 = 检索调用不执行（不止吞注入） | 零无谓 embedding / DB 开销 |
| KD-7 | 热应用 = 逐 run 现读既有 `agent.config`（零新机制） | 需求边界「零新机制」；否决「加 config-watch → 活 config 重载」 |
| KD-8 | UI 落点 = 各端 Agent 面既有开关族相邻位；文案两语同批 | 对齐各端既有配置项形态；界面文案不指向不存在入口 |
| KD-9 | 工程不变式 = 结构保证 + U6 断言 | 不变式须保（需求明载） |
| KD-10 | 测试 = 批内件 U1–U9（核面直驱；端面行为断言优先、不可绕退结构断言） | 测试层级纪律（批内件 = 单元面；不入闸） |

**上抛项**：

- [上抛·知会] VSC / 桌面 UI 腿生效时点 ≠ 会话内即热（VSC = 下一条消息；桌面 = 下次装配）——需求③热应用仅绑 `settings` 工具面（已满足）；若要求 UI 腿同热 = 新机制（改 config-watch 链），本批不做。
- [上抛·知会] 其余自动注入块不在开关面：`.cursor/rules` 尾块 ∥ 仓库大纲 ∥ skills 清单——需求口径外；若用户预期覆盖（迁移项目可能携 `.cursor/rules` 约束）= 新语义另裁。
- [上抛·知会] `docs/desktop/design/SETTINGS.md:71` 漂移：词面落点写 `i18n-settings.mjs`，实现先例住 `i18n-views.mjs`——范围外未动，建议另轮收正。
- [上抛·知会] CLI `cmd-config.mjs` 行数跨 500 advisory（≈502）——接受（不 blocking）或另批拆；实施轮随批记账。
- [上抛·待裁] 需求档 §2.6 无独立「验收」段——判定行由本设计给出（见验收对照）；建议需求档补一行机检判据指针（回笔 = 主 agent 笔）。

**自检读数（本设计轮实跑）**：

- `node scripts/doc-check.mjs --root d:\teamcode\thincoder`（全仓）：本批设计档笔**修后 0 条悬空 ∥ 0 行超宽**（修前本批 2 条悬空——§6.24 边界行两处裸文件名锚，已收正仓根形）。全仓读数 = 悬空 20 条（`docs/core/design/MEMORY.md` 18 ∥ `docs/core/requirements/MEMORY.md` 1 ∥ `docs/server/requirements/PROJECT.md:383` 1——他会话在飞面；均非本批）∥ 行宽超限 1 行 = `docs/core/requirements/PROMPT-SYSTEM.md:211`（#1420 登记块段——需求档父笔，建议折行）；exit 1 = 仓基线红非本批引入。
- 行宽本档自扫（execute 实跑）：§6.24 区（`:595-620`）max 260 字符 ∥ 变更记录两行折后 ≤300——本批笔 0 行超 300。
- 批内件用例 = 实施轮产物——本设计轮只定清单（U1–U9）。

### 修正轮 1（设计评审 §3 轮次 1 · 发现 1–8 逐号落地 · eng-designer · 2026-10-14）

**改动面** = `docs/core/design/PROMPT-SYSTEM.md`（唯一文件面）+ 本块（新追加）；机制语义零变；需求档零触；零产品码；既有行零改（本块 = 新追加块）。

| 号 | 落地（号 → 改动 file:line） |
|---|---|
| 1 | 用例两格补（**U10** ∥ **U11**——定义见下）+ 设计档同拍引：`docs/core/design/PROMPT-SYSTEM.md:626` 机检行 U1–U9 ⇒ **U1–U11**；映射随补：③ 判据 + U10（核 `settings` 工具写入面真链）∥ ① 判据 + U11（子代理继承 ⇒ 装配随开关）。 |
| 2 | `PROMPT-SYSTEM.md:189-190`（§6.2 运行期追加面）坐标收正：`:238-246` ⇒ `:265-268`（项目指令块）∥ `:269-278`（skills 尾块）+「as-of 2026-10-14 实读」；`PROMPT-SYSTEM.md:607`（§6.24 ① 行）补关系句——调用 + 拼接同址、helper 本体零改、§6.2「运行期追加面」同读数。 |
| 3 | `PROMPT-SYSTEM.md:667-668`（§7 表尾）补 **D-PS34**（键面 + 判据；否决：嵌套 `agent.injection.*` ∥ 名词式键名 ∥ `=== true` ∥ 不声明 DEFAULTS）∥ **D-PS35**（阻断点 + 热应用；否决：helper 内读 config ∥ 只吞注入不省检索 ∥ config-watch 活重载 ∥ 判据缓存副本）。 |
| 4 | `PROMPT-SYSTEM.md:615-620` 增「先例 ∥ 偏离 ∥ 桌面腿证据」块：先例批坐标 = `docs/batches/2026-09-28-timer-wake-phase2.md` §5.15（VSC `agent.config.agent` 白名单整建漏键 ⇒ `config.json` 关不掉；三处穿透补齐后真链闭合）；偏离 = UI 腿生效时点 ≠ 会话内即热（VSC = 下一条消息 ∥ 桌面 = 下次装配——需求③热应用仅绑 `settings` 工具面）。 |
| 5 | 桌面腿实读（写/读链——对照 VSC 三处穿透先例）：**结论 = 无缺口、无需三处补**——写链 = `settings:agent`（`thincoder-desktop/src/main/settings.mjs:255-297`：`_checkKnownKeyValue` 值校验 + `writeConfigAtomic`）落 `config.json`；读链 = 装配全量直传（`thincoder-core/agent/assemble.mjs:65` `loadConfig()` ⇒ `:106` `createAgent({ config })` ⇒ `agent.config` 全量——键经 `thincoder-core/config.mjs:329` `agent: {...DEFAULTS.agent, ...config.agent}` 合并直通，**无 VSC 式白名单整建**）；生效时点 = 下次装配（装配表同键复用 `thincoder-desktop/src/main/agent-host.mjs:198-199`）。结论行落设计档（号 4 块内「桌面腿对照实读」行）。 |
| 6 | 父侧裁定登记（记录面）：`thincoder-cli/src/tui/cmd-config.mjs` 487 ⇒ ≈502 跨 500 advisory = **接受**（≈2 行之差不拆——不 blocking）；`thincoder-core/config.mjs` 510 ⇒ 512 存量越线随批记账（800 硬线内）。本档 §2 原上抛·知会项（`:138`）据此收口。 |
| 7 | `PROMPT-SYSTEM.md:158`（§5 批次落点指针表）续登本批行（`2026-10-14-injection-switches`——唯一承载面 = 批档 §2）。上抛·待裁项（`:139`——需求档 §2.6 无独立验收段）处置态回填：**已解**（需求档 `docs/core/requirements/PROMPT-SYSTEM.md:216` 验收段在盘——本轮实读）；批档 §6（记录面）回填 = 父代理笔。 |
| 8 | 域外读数抽核（3 处 + 1 附）——见下「抽核读数」。 |

**U10 ∥ U11 定义（补用例两格——批内件 `docs/batches/2026-10-14-injection-switches.test.mjs`）**：

- **U10**（核 `settings` 工具写入面真链）：经 `settingsTool`（`thincoder-core/agent-tools/settings.mjs:246-289`）`set` 写两键（`agent.injectDocs=false` ∥ `agent.injectMemories=false`——JSON 值解析后布尔）⇒ 内存活 config 热应用 ⇒ 同 agent 下一次 `prepareRun` 三块缺；**布尔护栏格**：非布尔值（如 `off`）⇒ `_checkKnownKeyValue` 抛错、磁盘 / 内存零变。
- **U11**（子代理场景装配随开关）：config 继承父（`thincoder-core/agent-tools/subagent-spawn.mjs:300-302`——`childConfig = parent.config` ∥ 工程角色浅拷贝 + `engineering:true`）⇒ `depth>0` + `injectDocs=false` ⇒ ① 缺（②③ 既受 depth-0 门——零变）；缺省 ⇒ ① 在（「项目指令块不分 depth」零变）。可驱动真 spawn 链则加继承断言（行为断言优先）。

**抽核读数（域外——落号 8）**：

- ① 受影响表行数（本档 `:77`–`:93`）：14 行数字读数中 11 行与现盘逐值一致（口径 = 末行含尾元素，同批档实读）；3 处偏差——`thincoder-vscode/webview/settings-agent.js` 196 ⇒ 现读 197 ∥ `thincoder-vscode/src/extension/settings-panel-write.mjs` 219 ⇒ 220（两档工作树无改动 = 前轮读数口径差）∥ `docs/desktop/design/SETTINGS.md` 753 ⇒ 755（该档现为 M——在场改动；表末行已注「计数以实读为准」）。
- ② 核档零改判定（本档 `:56`）：`docs/core/design/AGENT-PARAMS.md` = 三参数族「唯一权威」（主循环 / 评审墙钟 / 子代理轮次——实读成立）∥ `docs/core/design/SETTINGS-TOOL.md` §2.6「加键流程 = DEFAULTS 一处 → 护栏自动跟随」（实读成立）——**零改判定成立**。`docs/core/design/CONFIG.md`：「无全量键目录」成立；惟 §6.2「派生消费面」为**逐键登记**（`CONFIG.md:157` 现列 `diagnostics.heapSnapshot` / `heapWatch` / `agent.timerWake` 三键）——先例（timer-wake 修正轮「键列补 `agent.timerWake`」，`CONFIG.md:237`）指向本批两键随批补列；本轮域外（只动设计档一份）**未动 ⇒ 报父侧处置**（建议：一行补列，零新语义）。
- ③ `thincoder-core/agent/setup.mjs` 三处判点坐标（设计档 §6.24 阻断点表——现址 `:607-609`）：`:265-268` ∥ `:113-148` ∥ `:149-159` 逐处实读**吻合**。

**机检读数（本轮实跑 · `node scripts/doc-check.mjs --root D:\teamcode\thincoder`）**：本批域（`docs/core/design/PROMPT-SYSTEM.md`）**0 悬空 ∥ 0 行宽红**（「迁移期引文」列报 4 行 = 存量不入闸；广形符号报告行照列报、不入闸）。全仓 = 悬空 24（`docs/core/design/MEMORY.md` 18 ∥ `docs/server/design/agent/ADMIN-AGENT.md` 4 ∥ `docs/core/requirements/MEMORY.md` 1 ∥ `docs/server/design/mcp/MCP.md` 1——他会话在飞 / 存量，均非本批域）∥ 行宽 3（`docs/server/design/agent/ADMIN-AGENT.md` 两行 ∥ `docs/server/design/mcp/MCP.md` 一行——非本批域）；exit 1 = 仓基线红，非本批引入。

**修正轮自检**：8 号逐号落；设计档 diff 面 = 7 处（§6.2 坐标行 ∥ §5 行 ∥ §6.24 ① 行 + 先例块 + 机检行 ∥ §7 两行 ∥ 变更记录一行）；机制语义零变。

## §3 设计评审（评审子代理）

### 轮次 1（评审子代理）

**设计评审轮（注入开关 §6.24）**——评审域 = 设计 `PROMPT-SYSTEM.md` §6.24 ∥ 批档 §2（台账 #1420）；未附文档地图/标准档（判据 7 降级判定）；域外读数 = unverified。

| # | Category | Severity | Issue | Suggestion |
|---|---|---|---|---|
| 1 | 验收覆盖 | 🟡 | 需求验收①/③的主体 = 核 `settings` 工具面（`thincoder/docs/core/requirements/PROMPT-SYSTEM.md:216`「两键在核 `settings` 工具 list 面可见可写」），但用例映射无该面专用格：U1–U5 以直改 `agent.config` 对象验证读点（`thincoder/docs/batches/2026-10-14-injection-switches.md:101`「同一 agent 两次 `prepareRun` 间翻转 `agent.config.agent.injectDocs`」），映射给③「写入面」的 U9 实为桌面 IPC `settings:agent`（`:105`）——非同一条链；设计 `thincoder/docs/core/design/PROMPT-SYSTEM.md:613`「子代理装配同受开关」亦零用例。 | 补用例两格：①核 `settings` 工具写入两键（含布尔护栏）后重组装；②子代理场景装配随开关；若不加，至少在验收对照注明该面的核验方式。 |
| 2 | 清晰度（档内坐标） | 🟡 | 同一「项目指令文件块」在本档两处坐标并存、关系未注明：`thincoder/docs/core/design/PROMPT-SYSTEM.md:188` 记「`thincoder-core/agent/setup.mjs:238-246`」；`:605` 记「`:265-268`（`loadProjectInstructions` 调用侧——helper 本体零改）」——若分指追加点与调用点应写明；若为旧读数漂移，实施者以哪组为准无判据。 | 在 §6.24 ① 行补一句两坐标关系（或注明各自 as-of），顺带收正 §6.2 旧读数。 |
| 3 | 方法学（登记一致性） | 🟡 | 新机制节未进 §7 决策表：相邻各节（§6.19–§6.23）均设 D-PS 行（`thincoder/docs/core/design/PROMPT-SYSTEM.md:649`–`:657` 在盘），本批 KD-1–KD-10 的否决项（批档 `:118`–`:131`）只活批档 §2；后续批引用「键面/判据先例」时无 D-PS 坐标可用。 | 在 §7 登记 1–2 行（键面 ∥ 判据 ∥ 阻断点或热应用），或注明不登理由（一次性材料 = 批档 §2 承载）。 |
| 4 | 最近先例线（判据 9） | 🟡 | 先例线不完整：有实现坐标与同族面（`thincoder/docs/core/design/PROMPT-SYSTEM.md:599`「同族先例 = `agent.timerWake`」∥ `:615`「同族面 = `CONFIG.md` §6.2「派生消费面」」），但先例批坐标（timer-wake 阶段 2——VSC 三处穿透教训，批档 `:70`）与偏离说明（「VSC / 桌面 UI 腿生效时点 ≠ 会话内即热」，批档 `:135`）未在设计档落行。 | 在设计档补一行先例/偏离注（先例批 + 偏离理由），或明示其承载面。 |
| 5 | 可行性（证据强度） | 🟡 | 桌面腿「写/读链零改」证据弱于 VSC 腿：VSC 行载三处穿透与实证先例（批档 `:70`「缺则 config.json 对该键关不掉（timer-wake 阶段 2 实证先例）」），桌面行仅以「`settings:agent` 通用」（`:71`）与「读面 `loadConfig` 合并 ⇒ 默认装态 = 勾选」（`:71`）立论——「键到达核 agent config」未见同级核查，U9 亦仅 NAMED_FIELDS/i18n（`:105`）。 | 补一行核查说明或一格用例：桌面端写入 `false` 后核装配三块确缺（判据与 VSC 腿同）。 |
| 6 | 文件档位 | 🔵 | `thincoder-cli/src/tui/cmd-config.mjs` 487 ⇒ ≈502 将跨 500 advisory，处置二选一未定（批档 `:81`「处置 = 接受 ∥ 另批拆——上抛项」）；`thincoder-core/config.mjs` 510 ⇒ 512 属存量越线（批档 `:79`「已越 500 advisory（存量），800 硬线内」）。 | 落定「接受」或「另批拆」其一（约 2 行之差）；存量越线随批记账。 |
| 7 | 档态（挂账回填） | 🔵 | 批档 §2 上抛·待裁项（批档 `:139`「需求档 §2.6 无独立「验收」段」）现况已解——需求档 `:216` 验收行在盘、changelog `:307`「补**验收**行（五要素补齐——设计轮上抛待裁项）」；另 §5 批次落点指针表（设计档 `:152`）自 10-02 起未续登本批，本批指针仅 §6.24 `:615` 内联。 | 把上抛处置态回填至 §6（记录面）；§5 指针表续登本批行，或注明该表停用。 |
| 8 | 域外读数（unverified） | 🔵 | 域外读数本评审未回核（unverified）：受影响表行数（批档 `:75`–`:93`）∥ 核档零改判定（`:56`「`CONFIG.md` = 通道纪律面（无全量键目录；派生面 §6.2 已载）」）∥ `setup.mjs` 三处判点坐标（设计 `:605`–`:607`）。 | 抽核 2–3 处（行数 ∥ 零改判定 ∥ 判点坐标）后再进实施轮。 |

**发现计数：🔴 0 ∥ 🟡 5 ∥ 🔵 3**

VERDICT: pass

## §4 用户批准（主 agent）

**父侧代签（用户 2026-10-14 14:44「点火！自动跑」授权）**——依据三条件齐备：① 评审 #187 VERDICT **pass**（0🔴/5🟡/3🔵）；② 发现 8 条逐条裁定并修正轮 #189 全落 + 父侧核验（含 CONFIG.md 键列补列 = 父裁「补列」）；③ 设计 token 已签发在槽。批准 = 本批设计进入实施（实施派发 = eng-coder，即刻）。

## §5 实施记录（eng-coder）
**状态行**：实施完成（核三阻断点 + 三端界面 + settings 派生面；批内件 16/16；审计 1 轮（4 报 · 1 真修 · 2 口径差 · 1 移交）+ 代码评审 1 轮（pass · 0🔴）；终态 clean）



**实施轮 · eng-coder**（2026-10-14——承 §2 受影响表 ∥ §3 评审 #187 fix 轮 8 条全落 ∥ §4 用户批准）：两键 `agent.injectDocs` ∥ `agent.injectMemories` 全链落盘 = 核三阻断点 + 三端配置界面 + `settings` 工具派生面（零改码）；机制单源 = `docs/core/design/PROMPT-SYSTEM.md` §6.24（本节不复制判据）。

### 一、落点与实读坐标（实施后）

| # | 文件 | 实施后坐标 | 内容 |
|---|---|---|---|
| 1 | `thincoder-core/config.mjs` | `:69-70` | DEFAULTS 两键 = `true`（注释指 §6.24） |
| 2 | `thincoder-core/agent/setup.mjs` | 判据 `:57-58` ∥ ① `:276` ∥ ② `:118-155` ∥ ③ `:157-169` | 判点皆逐 run 现读 `agent.config`；**关 = 检索调用不执行 + 注入不发生** |
| 3 | `thincoder-cli/src/tui/cmd-config.mjs` | 菜单 `:359-360` ∥ View `:385-386` ∥ 共用处理支 `:459-473` | 显式布尔写 + `saveProxy`/`reloadConfig` 即热 + `continue` 在位（不掉入数值兜底支） |
| 4 | `thincoder-vscode/src/agent/setup.mjs` | 默认种 `:131-132` ∥ raw 读 `:160-161` ∥ `agentFields` `:180` | 三处穿透（timer-wake 阶段 2 先例——缺一 ⇒ 该键在 config.json 关不掉） |
| 5 | `thincoder-vscode/src/extension/settings.mjs` | 载键 `:45-46` ∥ 快照 `:165-166` | 读链 |
| 6 | `thincoder-vscode/src/extension/settings-panel-write.mjs` | `:83-85` | 写链（`!!` 显式布尔——`false` 亦写；`undefined` 缺席零动） |
| 7 | `thincoder-vscode/webview/settings-agent.js` | 控件 `:29-30` ∥ 载荷 `:128-129` ∥ `EDIT_FIELDS` `:153` | 界面（autoThink 后位） |
| 8 | `thincoder-vscode/locales/en.json` ∥ `zh.json` | 标签 `:120-121` ∥ 说明 `:213-214`（两语同址） | 词面四键（词值逐字 = 桌面） |
| 9 | `thincoder-desktop/renderer/views/settings-agent.mjs` | `NAMED_FIELDS` `:62-63`（`kind: "boolean"`）+ 档头 ∥ 表注释「二十键」齐正 | 桌面腿（写读链 = 既有通用 `settings:agent`，零改） |
| 10 | `thincoder-desktop/renderer/i18n-views.mjs` | en `:204-205` ∥ zh `:390-391` | 词值逐字同 VSC |

端面登记（设计档笔）：`docs/vsc/design/SETTINGS.md` §2.3（新条 + 变更记录）∥ `docs/desktop/design/SETTINGS.md` §2.3 行 15 计数（十八 ⇒ 二十）+ §3.1 行走读齐平 + 变更记录 ∥ `docs/desktop/design/UI.md` §4.1 `i18n-views.mjs` 行随正 + 变更记录（**出清单，见五**）。

### 二、行数账（实施后实读——口径 = 行数（无尾空行））

| 文件 | §2 表（现 ⇒ 预） | 实读 | Δ 说明 |
|---|---|---|---|
| `thincoder-core/config.mjs` | 510 ⇒ 512 | **513** | 两键 + 注释；**存量越 500**（已裁随批记账，800 内） |
| `thincoder-core/agent/setup.mjs` | 284 ⇒ ≈290 | **294** | 两句判 + 三块包判点 + 注（距 300 拆分线 6 行——提示项） |
| `thincoder-cli/src/tui/cmd-config.mjs` | 487 ⇒ ≈502 | **506** | 菜单 2 + View 2 + 共用支 16；**越 500 ≈6 行**（父裁：接受不拆） |
| `thincoder-vscode/src/agent/setup.mjs` | 310 ⇒ 315 | **317** | 三处穿透 |
| `thincoder-vscode/src/extension/settings.mjs` | 421 ⇒ 425 | **424** | 载键 2（合行）∥ 快照 2 |
| `thincoder-vscode/src/extension/settings-panel-write.mjs` | 219 ⇒ 221 | **222** | 注 1 + 两写行 |
| `thincoder-vscode/webview/settings-agent.js` | 196 ⇒ 200 | **203** | 注 1 + 控件 2 + 注 1 + 载荷 2 + 表 1 |
| `thincoder-vscode/locales/en.json` ∥ `zh.json` | 320 ⇒ 324 | **323 ∥ 323** | 标签 2 + 说明 2（每语） |
| `thincoder-desktop/renderer/views/settings-agent.mjs` | 189 ⇒ 191 | **192** | 两键 + 计数注释齐正（+1） |
| `thincoder-desktop/renderer/i18n-views.mjs` | 417 ⇒ 421 | **422** | 两注 + 四键值 |
| 批内件（新）`docs/batches/2026-10-14-injection-switches.test.mjs` | — ⇒ 新（估 ≤400） | **665** | **超设计估**（≤800 硬线内；批内件住批档位、不进产品树/门） |

### 三、轮次与终态

**轮 1 · 内部 explore 分歧审计**（只读子代理；面 = 设计 §6.24 ↔ 实现 12 档）：结论 = **无 PARTIAL ∥ 无静默简化 ∥ 无出清单 ∥ 无语义相抵**；报 4 条（全记账面）。

| # | 审计发现 | 处置 | 证据 |
|---|---|---|---|
| A1 | 桌面 `views/settings-agent.mjs` 读数「191」疑偏（审计按 split 口径数 192） | **口径差 ⇒ 不改**：项目机检 `scripts/doc-check.mjs` 对 `SETTINGS.md:409` 零命（机检口径 = 行数无尾空行）；注释齐正后机检报「表 191 ⇒ 实读 192」⇒ 已回填 **192**，复跑零命 | 机检两轮读数 ∥ `git diff --numstat`（+3 ⇒ +4） |
| A2 | `i18n-views.mjs` 读数「422」疑偏（审计按 split 口径数 423） | **口径差 ⇒ 不改**：机检对 `UI.md:522` 零命（split 含末空行） | 机检复跑输出 |
| A3 | 件内档头 ∥ 表注释仍写「十八键」（表实 20 条） | **真漂移 ⇒ 已修**：`views/settings-agent.mjs` 四处「十八键 ⇒ 二十键」+ 注入两键构成句（`:3` ∥ `:5` ∥ `:9-10` ∥ `:27` ∥ `:180`） | 修复后 `node --test` 仍 **16/16** |
| A4 | 单源 `PROMPT-SYSTEM.md` §6.24 判点坐标 = 实施前读数（本批自身把三判点下移） | **移交（非本笔）** ⇒ 见五 | 设计 `:613-615` ∥ 现盘 `thincoder-core/agent/setup.mjs:276` ∥ `:118` ∥ `:157` |

**轮 2 · 独立代码评审**（advisor · code · 12 档 + 5 文档）：**verdict = pass**（0 🔴）；6 条 = 3 🟡 + 3 🔵。逐条处置：🟡①（§6.24 坐标滞后）= 移交（设计档 = eng-designer 笔）；🟡②③（`cmd-config.mjs` 506 ∥ `config.mjs` 513 越 500 advisory）= 父裁在前（接受 ∥ 存量记账）⇒ 无动作，账见「二」；🔵④（批内件末件「UI 键位自检」超 §2 用例清单，且属「读产品档断言句子在场」族）= **登记保留**（同面 U7 行为级已覆盖；该件为三端键位/词键对等的机检腿——删则对等只剩人眼；理由登记于此）；🔵⑤（需求 §2.6 `:226` 括注字面歧义）= 移交（需求档 = 主 agent 笔）；🔵⑥（本段此前为空）= 本段即回填。

**终态 = `clean`**（fix 轮 1 次；0 🔴 ∥ 0 must-fix 🟡；🔵 两条移交 + 两条本段处置）。

### 四、决策透明表（AI 自主裁量——父/用户可覆）

| 决策 | 取值 | 依据 |
|---|---|---|
| 判据写形 | 一律 `!== false`（缺省 = 现行为零变） | 设计 §6.24 键面行 + 用户「默认开」口径 |
| 三端词值 | 桌面逐字 = VSC（同键同句） | 三端词键对等（U9-B 断言） |
| 桌面补不补 `…Help` | 不补（只落两键） | 设计 §6.24 端面登记 = 两键 |
| CLI 两键共用一支 | 共用（`slice("agent.".length)` 取键） | 同族先例 = 数值键处理支形；免一份复制 |
| 批内件末件结构自检 | 保留 + 本段登记 | 上诉 🔵④ |
| 三设计档登记笔 | 本笔直落 | 批档 §2 受影响表指定 + D1（实施轮登记笔） |
| A3 注释齐正 | 落 | D3（计数与列同动）——件内计数与表实条数相抵即漂移 |

### 五、出清单披露（逐条含理由）

| # | 出清单动作 | 理由 |
|---|---|---|
| 1 | `docs/desktop/design/UI.md` §4.1 `i18n-views.mjs` 行读数 **416 ⇒ 422** + 变更记录一行 | 本批触该档 ⇒ 行数账须齐（D3 计数与列同动）；其账目住 UI.md（桌面 SETTINGS.md §3.1 无此行）——已在桌面 SETTINGS.md 变更记录写明 |
| 2 | `thincoder-desktop/renderer/views/settings-agent.mjs` 件内「十八键 ⇒ 二十键」四处齐正 | 审计 A3 |
| 3 | 批内件末件「UI 键位自检」用例（超 §2 清单 U1–U11） | 上诉 🔵④ |
| 4 | `docs/desktop/design/SETTINGS.md` §3.1 行 **191 ⇒ 192** | A1 修后机检自洽（D6 回读） |

### 六、交接项（非本笔）

| # | 对象 | 事项 | 证据 |
|---|---|---|---|
| 1 | eng-designer（设计面收口/回填轮） | `PROMPT-SYSTEM.md` §6.24 判点表三行（`:613` 记 `:265-268` ∥ `:614` 记 `:113-148` ∥ `:615` 记 `:149-159`）+ 边界行 `:634`（`.cursor/rules` `:276-277` ∥ 大纲 `:99-108`）+ §6.2 同源坐标 ⇒ 实施后实读 = ① `thincoder-core/agent/setup.mjs:276` ∥ ② `:118-155` ∥ ③ `:157-169` ∥ `.cursor/rules` `:287-288` ∥ 大纲 `:103-112`（附 as-of） | 审计 A4 ∥ 代码评审 🟡① |
| 2 | 主 agent（需求档笔） | `docs/core/requirements/PROMPT-SYSTEM.md` §2.6 `:226` 括注字面歧义（「记忆注入开关（自动检索块 = 相关文档 + 相关记忆两组——自动文档检索归文档侧）」）⇒ 一句归属改写 | 代码评审 🔵⑤ |
| 3 | 全批 | `PROMPT-SYSTEM.md` 本批未加「实施轮」变更记录行（§2 表记「设计轮已落」⇒ 按表无欠账）——收口时与交接项 1 同拍 | 审计说明段 |
| 4 | 全批（出范知会） | 先例批内件 `docs/batches/2026-10-10-agent-loop-allotment.test.mjs` 现失败（doc 夹具 manifest 无 `docRoot` ⇒ 声明域空 ⇒ 文档行全隐；修法 = `{docRoot:{design:"docs"}}` + `clearDeclarationCache()`）——与本次改动无关（已实证） | 本轮副产物 |

### 七、验证读数（实施轮）

- 批内件：`cd thincoder && node --test docs/batches/2026-10-14-injection-switches.test.mjs` ⇒ **16/16 全绿**（U1–U11 + U8/U9 子腿 + 末件自检；U6 含「空串假绿」防腿）。
- 仓内四套件 `node test/run.mjs`（core ∥ cli ∥ vsc ∥ desktop）= **全空绿**（2026-09-28 重置后无测试）；`scripts/check-syntax.mjs` CLI 124 档 ∥ VSC 140 档 = OK。
- `scripts/doc-check.mjs` 全仓复跑：本批域**零命**（§2 表列三处红线——桌面 `SETTINGS.md` §3.1 行 ∥ `UI.md` §4.1 行 ∥ VSC `SETTINGS.md` §2.3 条——末轮全清）。

## §6 验证与收口（父代理）

**实施核验（父侧亲跑 · 2026-10-14）**：批内件 **16/16 pass**（`node --test docs/batches/2026-10-14-injection-switches.test.mjs`——父侧复跑实读：tests 16 ∥ pass 16 ∥ fail 0）；10 个改动码档 `node --check` OK ∥ `en/zh.json` `JSON.parse` OK（实施侧读数）；四套件 = 空绿（2026-09-28 重置后无测试——集成面本批零涉）。界面腿 = 用例 U7–U9 机检覆盖（实机点开各端设置面 = 用户随时可看）。

**上抛裁定**：① §6.24 三判点坐标漂移（实施下移）——**父侧机械随正**（① `:276` ∥ ② `:118-155` ∥ ③ `:157-169` ∥ §6.2 `:191` 两坐标 ⇒ `:276-279`/`:280-289` ∥ 边界行两坐标 ⇒ `:287-288`/`:103-112`；`PROMPT-SYSTEM.md`（设计档）变更记录一行）；② 需求档 §2.6 ② 行括注歧义——**父侧收正**（「自动检索块 = 相关文档 + 相关记忆两组」⇒「自动检索块之记忆组 = 相关记忆」——与实现归属对齐；变更记录一行）；③ 先例批内件 `2026-10-10-agent-loop-allotment.test.mjs` 现失败（doc 夹具 manifest 缺 `docRoot`）＝ **批内件层面、与门禁无关**（旧文件不扫绿纪律）——知悉记录，不改；④ 设计档登记三处（VSC/桌面 `SETTINGS.md` ∥ `UI.md`）＝ 实施侧**越声明写入**，**披露受理**（登记面与实现紧耦合——行数/键位账目住该档；零语义扩）。

**结算**：台账 #1420 已核销（证据 = 本节）；设计令牌随收口消费（值不入档）。

**遗留**：无。
