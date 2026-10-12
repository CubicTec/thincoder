# 2026-10-12 · admin-agent-awareness
> 六段 append-only，一段一作者：§1 讨论（主 agent）· §2 批次任务与设计（eng-designer）· §3 设计评审（评审子代理）· §4 用户批准（主 agent）· §5 实施记录（eng-coder）· §6 验证与收口（父代理）。
> 编制：主 agent · 2026-10-12 · 来源 = 用户 2026-10-12 12:29「管理面的agent现在没有环境感知能力，我希望这一块要对齐cli/vsc和桌面。」+ 12:39 工具面 + 12:41 读写文件与 bash + 12:47 审计要求；需求 = `docs/server/requirements/PROJECT.md` §2 功能点 43 + AC-43 六条；台账 #1310；授权 = 用户 12:48「环境这个你也自动跑吧」（全链自动 + 自缚三条）。
> 台账 = #1310（server · 归批）。前情 = 无（独立批）。
## §1 讨论（主 agent）
**状态行**：🔄 进行中（…）
<§1 模板占位：本批条目 / 关键判据 / 授权口径>

**§1 讨论（主 agent）**

### 1.1 来源与需求（用户原话逐字）
- 12:29「管理面的agent现在没有环境感知能力，我希望这一块要对齐cli/vsc和桌面。」⇒ 射程裁「甲」= **四块**（时空 ∥ 所在/身份 ∥ 所管现况一行 ∥ 能力与边界）。
- 12:39「还需要相应的工具，cli/vsc桌面端都有获取当前时间等工具。」⇒ **工具面**；12:4x 裁「B」= 时间 + 进程 + 提醒三件。
- 12:41「其实读文件和bash也是需要的，否则它能做的就太少了。」⇒ **文件读取族**（`ls`/`read`/`grep`）+ **`bash`** 收回在册（原「C/D 不做」判被用户推翻）；**风险披露 = 在册**（管理面 admin 不止一人 ⇒ 任一 admin 角色成员可经对话页在服务器上跑命令/读文件）；实施须携**限幅**（超时 ∥ 输出上限 ∥ 工作目录）。
- 12:47「如何管理admin权限是我的事儿，你只要保证日志齐全审计到位就ok。」⇒ ⑥ **工具动作审计**（每次调用一审计行 + `bash` 落命令原文、读文件落路径、结果落成败与截断态 + 审计页可读——非裸 JSON）；**权限模型改造 = 不做**（归用户）。

需求单源 = `docs/server/requirements/PROJECT.md` §2 功能点 43 + AC-43（六条在册；该档 2026-10-12 五条变更记录逐条对应上文）。

### 1.2 范围与边界（本批 = 一块石头）
- **在本批**：功能点 43 ①–⑥ 六条全件（四块装配 ∥ 值随实况 + 读失败降级不阻断 ∥ 零新端点 ∥ 三端语义对位有据 ∥ 工具面五族 + `bash` 限幅 ∥ 工具动作审计留痕）。
- **不做**：三端无对应物项（cwd ∥ git 上下文 ∥ 项目档注入 ∥ 同目录实例）∥ 逐项细节现读 ∥ persona/纪律全栈注入 ∥ 权限模型改造（用户 12:47 裁）。

### 1.3 授权（自动跑）
用户 12:48「环境这个你也自动跑吧」= 本批**全链自动**（建批 ∥ 设计派发 ∥ 设计评审点火 ∥ §4 代签 ∥ 修正/实施派发 ∥ 收口核销提交）+ **自缚三条**（代签仅三条件齐备 ∥ 新范围/口径裁决停下只摆一条 ∥ 破坏性先停）。

### 1.4 已知事实（设计输入——父侧实读）
- **现状**：`thincoder-server/src/agent/chat.mjs:43-44`（`CHAT_SYSTEM_BRIEF` 静态常量）+ `:292-294`（回合装配 = 简报 + 历史 + 本轮，**零动态注入**）。
- **三端对照件**（核）：`thincoder-core/agent/setup-reminders.mjs:41`（env 行）∥ `:152`（项目相位）∥ `:210`（同目录实例）∥ time reminder（每回合）∥ `agent/helpers.mjs` collectGitContext。
- **工具面现状**：管理面**七件**（`docs/server/design/agent/ADMIN-AGENT.md` §12——members ∥ providers ∥ models ∥ usage ∥ audit ∥ runners ∥ docker）；实现 = `chat-tools.mjs`（进程内直取域件 + 审计包装）。
- **核内工具实现**（可复用参考）：`thincoder-core/agent-tools/*`（`get_current_time` ∥ `process` ∥ `timer` ∥ `ls`/`read`/`grep` ∥ `bash`——含各自参数校验与结果形）；**核在镜像内的可达性 = 设计轮核实项**（`Dockerfile` 装机 = server + render-core 两包 ⇒ 待核——**unverified**）。
- **审计现状**：chat 三 kind（`chat_start` ∥ `chat_call` 逐调用 ∥ `chat_stop` 异常收尾）；审计页 = 控制台 `#/admin/audit`。

### 1.5 批内件与落点
设计轮交卷时补（父侧估 ≈1 件；落点表逐行 file:line = 设计轮交付面）。

### 1.9 评审与修复轮（父侧 2026-10-12 13:45）

- **设计评审 #269 = VERDICT pass**（0🔴 ∥ 2🟡 ∥ 4🔵；发现表 + VERDICT 逐字在 §3）——无阻塞项，token 已发。
- **父侧裁定（逐条，详表在回复流）**：#1 需求侧半笔**已落**（`requirements/PROJECT.md:250` 边界句收正——cwd 在册、三项不做，与 43⑤ 工作目录并存）+ 设计侧 R62 登记半随修复轮；#2/#3/#4/#6 = **修复轮**（eng-designer，在途；写入域仅 `agent/ADMIN-AGENT.md`）；#5 需求侧坐标**已落**（`:241` `chat.mjs:43-44` ⇒ `:47-56`）+ 行数 ±1 口径 = 实施轮「以当刻盘面实读为准」复读（不设设计面改动）。
- **修复轮边界**（派发时明写）：机制零改 ∥ 不扩面 ∥ 需求档与批档零触 ∥ 只动四条点位。
- **纪律**：修复轮落定并经父侧核验前**不请 §4 批准**（在途状态只报不请）。

## §2 批次任务与设计（eng-designer）
**状态行**：设计完成 2026-10-12（文档面 5 档随正 + 本段落笔；门禁自查 = 本批零新增悬空坐标 ∥ 零新增超宽行（存量为既有：悬空 25 ∥ 超宽 4）；待父侧点火）
<§2 模板占位：本批条目（覆盖） / 设计档落点 / 机制设计 / 受影响文件与测试面 / 验收对照 / 关键决策 / 上抛项>

**§2 批次任务与设计（eng-designer · 2026-10-12）**

### 2.1 覆盖条目（逐条回指需求；单源 = `docs/server/requirements/PROJECT.md` §2 功能点 43 ∥ AC-43 ①–⑥）

| # | 任务条目 | 本批落地形 | 机检载体 |
|---|---|---|---|
| 1 | ① 四块在回合装配在场（时空 ∥ 所在/身份 ∥ 所管现况一行 ∥ 能力与边界） | 三活体行（每回合**尾位瞬态、不落库**）+ 简报能力边界段（`CHAT_LIMITS_BLOCK`）+ 活体面（`tools.schemas`） | 批内件（装配断言——时间/host/cwd/会话模型/现况计数逐值 + 简报含能力段 + 对位断言 = 每件注册工具名 ∈ 能力段字面） |
| 2 | ② 值随实况（读源变更 ⇒ 下回合行变）∥ 读失败 ⇒ 该块降级略去、回合不阻断 | 每回合现读三源（域件进程内直取）；**块级降级**（整行略去——无半真值） | 批内件（N73 加节点 ⇒ 计数 +1 ∥ B70① 源抛错 ⇒ 行缺席 + `end(succeeded)`） |
| 3 | ③ 零新端点 | 零 `routes.add(`（两新档）；`chat-routes.mjs` ∥ `bin` 零触 | 批内件（源面结构扫描 + `chat-routes.mjs` 计数不变） |
| 4 | ④ 三端语义对位有据（逐块引三端同源坐标） | `agent/ADMIN-AGENT.md` §14.1 四块坐标表（逐块列核件坐标）+ 行形 = `[System reminder: ` 族前缀（三端同形标记） | 批内件（族前缀逐行断言）+ 设计评审（坐标逐块） |
| 5 | ⑤ 工具面在场（环境三件 + 文件读取族 + `bash`；限幅在册：超时 ∥ 输出上限 ∥ 工作目录） | **核件原文复用**五族七件 = `get_current_time` ∥ `process` ∥ `timer` ∥ `ls` ∥ `read` ∥ `grep` ∥ `bash`；限幅三件（§14.3） | 批内件（names/schemas 在场 + `get_current_time` 一次调用读数 + 限幅三形）+ 收口轮（真机调一次） |
| 6 | ⑥ 工具动作留痕（每次调用一审计行 + 详情人话可读；`bash` 命令原文/读文件路径；成败 + 截断态） | `chat_call` detail 扩 `subject`/`truncated`；审计页 **agent 行模板** + 三文案键（两表同步） | 批内件（一次 bash/读文件调用后审计行逐字段）+ 收口轮（审计页看一行） |

### 2.2 明确不在本批（边界——不做面；§10 逐条在册）
- 权限模型/围栏改造（12:47 归用户）∥ 路径围栏 ∥ 命令白名单（不设——如实披露）。
- 三端无对应物项：cwd 之外的 git 上下文 ∥ 项目档注入 ∥ 同目录实例。
- timer **自动开轮/定时任务**（无空闲唤醒面——提醒只在下一回合开场投递）；**后台任务面**（`bash async`——无驻留池，显式拒）。
- 文件编辑族工具（write/edit/apply_patch）∥ 浏览器族 ∥ 记忆族 ∥ 子代理族。
- 逐项细节现读（节点在线性 ∥ 容器数等细节 = 走工具面）；persona/纪律全栈注入（简报自持）。

### 2.3 设计档落点（本批交付面）
- `docs/server/design/agent/ADMIN-AGENT.md`（主载体）：**增 §14**（14.1 四块装配与坐标表 ∥ 14.2 工具面五族七件 ∥ 14.3 限幅三件 ∥ 14.4 审计与 timer 投递 ∥ 14.5 核可达性结论）+ §1/§3/§6/§7/§8/§9/§10/§11 随正（含 §9 增 **KD-SV-112/113/114**、§13 增 **R62**）。
- 同源随动：`accounts/ACCOUNTS.md` §2.1（`chat_call` detail 扩字段——零新型/零新 kind）∥ `webui/READINGS.md` §2.1④/§3（agent 行模板 + 行数）∥ `webui/SYSTEM.md` §3/§4（i18n 两表 +3 键/表 + AC-28 机检口径）∥ `design/PROJECT.md` §2/§3/§4/§6/§7/§9。

### 2.4 受影响文件与预算（实读 ⇒ 预期；行数口径 = 内容行）

| 文件 | 现读 | 预期 | 说明 |
|---|---|---|---|
| `thincoder-server/src/agent/chat-env.mjs`（拟新增） | —— | ≈150 | 四块装配（三活体 + 能力边界段 + 块级降级） |
| `thincoder-server/src/agent/chat-env-tools.mjs`（拟新增） | —— | ≈230 | 环境工具面（核件动载 ∥ ctx 适配 ∥ 结果归一 ∥ 限幅 ∥ timer 挂表/出列） |
| `thincoder-server/src/agent/chat.mjs` | 599 | ≈640 | 环境行装配 ∥ 工具面合并 ∥ `invoke` 携 ctx ∥ 审计详情扩字段（**越 500 软线——拆档预案在册**） |
| `thincoder-server/public/views-audit.mjs` | 150 | ≈166 | agent 行详情模板（+≈16） |
| `thincoder-server/public/i18n-zh-system.mjs` | 201 | ≈204 | +3 键（`audit.agentOk`/`agentFail`/`agentTruncated`） |
| `thincoder-server/public/i18n-en-system.mjs` | 201 | ≈204 | 同上（两表同步） |
| `thincoder-server/package.json` | 链 57 | 链 58 | 批内件入 `prepublishOnly`（±0 行） |
| `docs/batches/2026-10-12-admin-agent-awareness.test.mjs`（拟新增） | —— | ≈450 | 批内件（入 server 链） |

零触：`chat-routes.mjs`（190）∥ `chat-tools.mjs`（476——管理面七件面零改）∥ `bin/thincoder-server.mjs` ∥ `store/db.mjs`（零迁移——结构版本 v16 不变）∥ `gateway/**`（零新端点）∥ `views-chat*.mjs`（环境行为瞬态，界面零新面）。

### 2.5 机制设计要点（全形 = 域档 §9/§14）
- **KD-SV-112 四块装配**：三活体行尾插于历史与本轮之后（前缀缓存理由——核 `setup.mjs:176-185` 同款）；瞬态不落库（回放零含）；块级降级；第四块 = 静态段 + 活体面。
- **KD-SV-113 工具面**：核工具对象**原文复用**（实现/schema/描述三面同源——零第二份）；ctx = `{ cwd, signal, agent: timer 垫片, depth: 0 }`；结果归一 `{ ok, subject, summary, output }`（`ok` = 调用完成——命令退出码不解析）；端池参数（`bash.async` 拒 ∥ `process.kill id` 自然错）。
- **KD-SV-114 审计**：`chat_call` detail 增 `subject`（≤2000 字——命令原文/路径）+ `truncated`（结果可见形截断位）；页面 agent 行模板（非裸 JSON）。
- 限幅三件：超时（缺省 120s ∥ 上限 600000 ms——逾限拒）∥ 输出（200K 字/2MB 流 ⇒ 落库 ≤4000 字 ⇒ 摘要 ≤300 字）∥ 工作目录（`deps.cwd ?? process.cwd()`——无围栏）。
- **核可达性（父侧 §1.4 存疑项——已核实）**：`@thincoder/core` 在 npm 上（`npm view` ⇒ **0.10.4**，与仓内核一致）；依赖声明在 `thincoder-server/package.json:16`；镜像**两装径**（构建 `thincoder-server/Dockerfile:25` ∥ 运行期 `thincoder-server/deploy/converge.mjs:79-90`）同经 npm 解析该依赖（核依赖经 registry 解析——本地 tgz 两条 = server ∥ render-core；`thincoder-server/Dockerfile:20` 注释「零 registry 依赖」= 后者口径，本句按实读收正——见发现项 3）；包白名单含 `tools/`/`agent-tools/`/`tool-docs/`（`files`）+ `exports { "./*": "./*" }` ⇒ 子路径直引可达。**结论 = 生产可达**（前提 = 装机时 registry 可达；不可达 ⇒ 装机失败 ⇒ 拒启 fail-loud）。

### 2.6 批内件（一件——`docs/batches/2026-10-12-admin-agent-awareness.test.mjs`；入 server 链）
腿（≥5）：① 四块装配在场（值逐值 + 对位断言 + 族前缀）；② 值随实况 + 块级降级；③ 零新端点扫描；④ 工具面五族七件出场 + `get_current_time` 真读数（**仓内核直引**：`thincoder-core/tools/*.mjs`——`DESC()` 按模块自身位置解析，仓内 `tool-docs/` 在场）+ 限幅三形；⑤ 审计行逐字段（`subject`/`resultCode`/`truncated`）+ 页面模板三键在场。载体 = `node --test`（假模型 ∥ 假 db ∥ 真环境工具面）。

### 2.7 已获父侧裁决（两条——2026-10-12；上抛记录）
- ③ 现况行「在线数」：现盘无心跳面（v12 已撤；在线性 = 读时逐节点探活 `sandbox/routes.mjs:128-145`——不便宜）⇒ **裁：注册节点 N（active A ∥ disabled D）∥ 服务模型 K ∥ 成员 M；在线性走工具按需探**（需求档括注由父侧收正）。
- ⑤ `process` 全件（含 kill）：**裁：核件原文复用（不收窄）**；披露照写（含杀 server 自身进程 = 操作者自伤面）。

### 2.8 发现项（报父侧——逐条）
1. 核 `thincoder-core/tool-docs/bash.md:13` 称 "max ~300000" 与核实现不符（核 `bashTool` 无上限钳制；120000 缺省 = `thincoder-core/tools/shared.mjs:26`）——**本面处置** = 取核内既有时预算惯例上限 600000 ms + 逾限拒（不静默钳制）；核文案面（提示词）另议。
2. 核 `thincoder-core/tool-docs/bash.md:8 ∥ :39` 指向本面不存在工具的指引（`write`/`edit`/`hashline-edit`/`apply-patch` 族）——场景落空；本批不改核文案（提示词单源），登记 = R62③。
3. `thincoder-server/Dockerfile:3 ∥ :20` 注释「零 registry 依赖」与实际（核依赖经 registry 解析）口径不符（松口径——沿旧，未动）。
4. 读文件/命令输出可含凭据（如配置档内 `apiKey`）——掩蔽面只盖本轮入参敏感值，**文件内容不在掩蔽面内**（披露面，R62③）。
5. 一致性面自修（本批）：`webui/READINGS.md` §2.1④「三型模板」计数陈旧（`agent_event` 行随 admin-agent-chat 批漏登）——已收正为「按型模板（四类）」（§2.8④ 记录）。
6. 文档结构观察（未动）：`design/PROJECT.md`「历史段（迁移前冻结——≤ 2026-10-11）」内挂有 2026-10-11/12 的批预算块（沿近批惯例追加）——不本批重排，报父侧。
7. 门禁实跑（`node scripts/doc-check.mjs`——仓根 `thincoder/`，本设计轮）：本批自身首跑带出 4 条悬空坐标 ∥ 6 条超宽行——**均已当场收正**（裸文件名补全路径 ∥ 超宽行按档例折行），收正后本批 = 零新增悬空 ∥ 零新增超宽。
8. **存量门禁红（非本批——未动）**：悬空 **25** 条（`docs/desktop/**` ∥ `docs/render-core/**` ∥ `docs/core/design/API-CONTRACT.md:2011` ∥ `docs/core/design/TEAM.md:130`）+ 超宽 **4** 行（`docs/server/design/PROJECT.md:670` 386 字符 ∥ `:672` 318 = console-reasoning-levels 批预算块，非区带豁免；`docs/server/requirements/PROJECT.md:247` 392 ∥ `:249` 365 = 需求档功能点 43 行——**笔归父侧**）。门禁阈值 = 0 ⇒ 收口轮会红，待父侧处置（归批 ∥ 认账）。


**产品码零触（设计轮）**——本段全部为文档面交付；实施面交代 = §5（eng-coder）。

### 2.9 上报指示（父侧）
1. 3.3 设计评审点火（评审面：需求覆盖 ∥ 三端坐标 ∥ 限幅取值 ∥ 审计面 ∥ 零新端点）。
2. 实施派发时提醒：① 批内件写面若受阻 ⇒ 落 `.thincoder/tmp/` 父侧 copy（沿先例）；② `prepublishOnly` 链 57 ⇒ 58（本批件入链）+ 门禁件数断言件七件同拍；③ i18n 两表 +3 键/表（两表同步 ∥ en 零 CJK）。

## §3 设计评审（评审子代理）

### 轮次 1（评审子代理）

| # | Category | Severity | Issue | Suggestion |
|---|----------|----------|-------|------------|
| 1 | Requirements / 边界口径 | 🟡 | 需求边界清单含 `cwd`，设计把它落成行内字段并写进机检判据，且把需求清单字面改写后仍引其为源——同一项两处判相反：需求 =「不做 = 三端中**服务端无对应物**的项（cwd ∥ git 上下文 ∥ 项目档注入 ∥ 同目录实例）」（`docs/server/requirements/PROJECT.md:250`）；设计 = 行形携 `cwd: {工作目录}`（`docs/server/design/agent/ADMIN-AGENT.md:247`）、不做对位改写成「cwd 之外的 git 上下文 ∥ 项目档注入 ∥ 同目录实例（三端有、服务端无对应物——需求 43 边界句）」（`:258`）、§7 判据列「注入 now ∥ 假 db ∥ 注入 cwd」（`:85`）；§13 R62 只登记另外两条括注上抛（`:233`），本条未登记 | 二选一对齐：① 需求边界句收正为「cwd 锚定的项目/git 上下文等项不做」（与 43⑤「工作目录」限幅并存），并把 cwd 字段一并纳入 R62 登记；或 ② 撤下环境行 `cwd` 字段与对应判据断言，只保留工具 `ctx.cwd` 基（43⑤ 面）并把该取值列入 R62 披露。两种改法均以「需求与设计字面一致」为验收 |
| 2 | Clarity / 一致性 | 🟡 | 同行两种降级粒度：`ADMIN-AGENT.md:256`「块级——该块任一读失败 ⇒ **整行略去**（无半真值上屏）」vs `:252`「判据明列，探测失败 ⇒ 该字段略去（不猜）」（② 行部署身份探针）——字段级略去会留下「半真值行」，与块级口径及 §7 判据（`:85`「块级降级」）相抵 | 收成一种粒度：探针异常 ⇒ 该行整体略去（沿块级），或明写例外并给同效兜底（如探针异常按「独立进程」落值），使 §14.1 取值源/降级两句与 §7 判据同口径 |
| 3 | Clarity / 秘密面 | 🔵 | `subject` 未写掩蔽链：KD-SV-114（`:135`）「`detail` 增 `subject`（主语原文 ≤2000 字——命令/路径；逾限截断并注记）」与 §14.4（`:289`）「`detail` 增 `subject`（命令原文/路径——≤2000 字，逾限截断并注记）」只有长度截断；`:292` 掩蔽句「掩蔽口径沿会话面（入参敏感键 ∥ 本轮已见敏感值）」未点 `subject`，R62③（`:233`）披露只含「读文件内容不在掩蔽面内」 | 在 KD-SV-114 或 §14.4 补一句：`subject` 落库前与 `call` 同链过会话面掩蔽（「原文」= 未经摘要重写的完整命令，非免掩蔽）；如确为免掩蔽径 ⇒ 并入 R62③ 披露（命令行含凭据面） |
| 4 | Doc hygiene / 行账 | 🔵 | §6 陈旧读数与「拟新增」标记（前批已落盘未回填；本批未改这三档）：`:59`「实读 **288 ⇒ ≈200**（docker 十动词执行器迁出 ⇒ `docker-ops.mjs`——两驱动单源）」↔ 盘面 **242**；`:62`「`thincoder-server/src/agent/chat-tools.mjs`（拟新增——admin-agent-chat 批）」+「≈400」↔ 盘面 **477**；`:63`「`thincoder-server/src/agent/docker-ops.mjs`（拟新增——admin-agent-chat 批）」+「≈140」↔ 盘面 **91** | 三处就地翻正（拟新增 ⇒ 已落盘 ∥ ≈ 值 ⇒ 实读值），与两档已在盘的实态同拍 |
| 5 | Affected-file annotations / Spot-check | 🔵 | Spot-check 记录（判据 8）+ 可行性证据：正向——受改件 `chat.mjs`「实读 **599**」相符；核件契约/坐标逐一相符（`agent-tools/timer.mjs` 写 `_pendingTimers` + 帽 `TIMER_MAX_PENDING`、`agent/timers.mjs` 注入走 `agent.history` ⇒ 设计垫片「（`{ _pendingTimers, history }`——核 `timer` 工具直写；帽 = 核 `TIMER_MAX_PENDING` 8）」成立；`agent/setup.mjs:181-185` ∥ `:176-185`、`agent/setup-reminders.mjs:40-42` ∥ `:152`、`tools/shared.mjs:26` `BASH_TIMEOUT_MS = 120_000`、`tools/bash.mjs:15` `MAX_STREAM_BUF`、`tools/ops.mjs:51` ∥ `:140`、`thincoder-server/package.json:16` `@thincoder/core: ^0.10.4`、`prepublishOnly` 现 57 件、核包 `files` 含 `tools/`/`agent-tools/`/`tool-docs/` + `exports` `./*` 均在盘相符）；偏差项——受影响件行数注与直接读盘差 ≤1 行（`views-audit.mjs` 150 ↔ 151；`i18n-{zh,en}-system` 201 ↔ 202 ∥ 202；`chat-routes.mjs` 190 ↔ 191——全部远离 500/800 档位线），`docs/server/requirements/PROJECT.md:241` 引简报坐标 `chat.mjs:43-44` ↔ 现盘 `:47-56` | 实施轮按「以当刻盘面实读为准」复读一次受影响件行数；如需消除 ±1 口径差，在注行写明计数口径（含/不含尾空行）。核件坐标与垫片契约已核，无需动作 |
| 6 | Doc hygiene / 自名 | 🔵 | §6 「本批」自名残（读者位 = admin-agent-awareness 轮，指代前批）：`:67`「小计 **≈+872**（本批：新增四档 ≈960 ∥ `tools.mjs` −≈88）」、`:60`「实读 **599**（2026-10-12 本批落地后）」、`:61`「实读 **190**（2026-10-12 本批落地后）」 | 自名改批名（沿同表「chat-shell-align 批另计」「console-reasoning-levels 批另计」形）：如「admin-agent-chat 批：…」「（console-reasoning-levels 批落地后）」 |

VERDICT: pass

计数：🔴 0 ∥ 🟡 2 ∥ 🔵 4（共 6 条）。结论：无 Critical；两条 🟡 为需求边界口径与降级粒度收正项，四条 🔵 为行账/自名/掩蔽措辞与 spot-check 记录。评审范围 = 六档（`agent/ADMIN-AGENT.md` ∥ `accounts/ACCOUNTS.md` ∥ `webui/READINGS.md` ∥ `webui/SYSTEM.md` ∥ `design/PROJECT.md` ∥ `requirements/PROJECT.md`）；无项目标准档、无文档地图声明（口径降级已述）。

## §4 用户批准（主 agent）
## §5 实施记录（eng-coder）
## §6 验证与收口（父代理）
