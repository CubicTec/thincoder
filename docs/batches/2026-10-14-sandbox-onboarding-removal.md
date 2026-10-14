# 2026-10-14 · sandbox-onboarding-removal
> 六段 append-only，一段一作者：§1 讨论（主 agent）· §2 批次任务与设计（eng-designer）· §3 设计评审（评审子代理）· §4 用户批准（主 agent）· §5 实施记录（eng-coder）· §6 验证与收口（父代理）。
> 编制：主 agent · 2026-10-14 · 来源 = 用户 2026-10-14 00:06 原话「撤」（承父侧呈报：托管接入〔任务式装机〕撤除——五件清面；方向在册 = 2026-10-12 16:10「托管接入那部分将来都要合并进chat」∥ KD-SV-135 合并路线步 3）；台账 #1383。。
> 台账 = #1383（server · 归批）。前情 = docs/batches/2026-10-10-runner-admin-console.md（托管接入设计/实施来源批——本批 = 其退场）。
## §1 讨论（主 agent）
**状态行**：进行中（设计轮 + 评审 #141（pass）+ fix 轮全落；删码实施轮已派（2026-10-14 09:2x——§4 批准在案））
<§1 模板占位：本批条目 / 关键判据 / 授权口径>

**2026-10-14 · 托管接入（任务式装机）撤除——用户 00:06 裁「撤」**

- **来源（逐字）**：用户 2026-10-14 00:04「对了，托管接入那部分应该没意义了吧？是不是应该去掉了。」→ 父侧呈报（托管接入已全套实现且方向在册「将来都要合并进chat」；chat 侧 SSH 凭据 + `exec`/`docker`/`runners` 工具面已齐 ⇒ 专用装机任务 = 重复的第二条路；建议撤 + 代价三件 + 排法）→ 用户 00:06「**撤**」。台账 **#1383**。
- **裁定范围（五件）**：① 沙盒页「托管接入」钮 + 弹窗 + 装机任务区（≈190 行——顺解 `views-sandbox.mjs` 越 500 软线；「拆案」句随退场收正）∥ ② `src/sandbox/onboarding.mjs`（≈400 行）∥ ③ `src/sandbox/onboarding-routes.mjs`（四端点）∥ ④ `sandbox_onboarding` 表（**停机留史**——不删历史数据；审计 `onboarding_*` 五 kind 的登记/闭集面随设计清面）∥ ⑤ 装机面单测档（`2026-10-10-runner-admin-console-agent.test.mjs` 等）。
- **留守（不撤）**：SSH 传输（`ssh.mjs`）∥ 主机凭据面（`hosts.mjs`/`host-credential.mjs`/主机表）∥ chat 工具面（`exec`/`docker`/`runners`——装机能力由此承接）。
- **代价（呈报在案，用户知悉）**：① 结构化步骤进度界面（→ 聊天记录形态）② 预算保险丝（20 分钟/60 步自动刹停——chat 路无此自动停）③ 「保留凭据」流程（→ 直接录凭据到主机表）。
- **排法**：设计先行（本批首轮 = 设计清面清单）；删码排重做批（`2026-10-13-sandbox-exec-rebuild`）落地后——避共享文件（`views-sandbox.mjs` ∥ `routes.mjs` ∥ `migrations.mjs`）。

- **2026-10-14 00:3x · 需求档回笔落地（主 agent 笔——承 §2 拟稿）**：六处落笔（`docs/server/requirements/PROJECT.md`）：① :489-492 接入块改终态（边界同步收正——OS 前提由管理员满足；执行者/三态/凭据纪律句删）∥ ② AC-36 :416 ⑨ 收正 ∥ ⑩ 删 ∥ ③ :513 管理面用途行去「托管接入（装机）」∥ ④ :302 功能点 47④「已达成」∥ ⑤ :429 AC-47 ⑤ 同拍终态化（**拟稿外补足**——与设计 KD-SV-135「终局已达成」取齐）∥ ⑥ :760 变更记录一行。**待裁项（「重新信任」入口）**：默认不给新入口（chat `exec` 径指纹变更 = 停 + 如实报）——已呈用户（要则另立）。**评审/实施排法**：在飞延迟三档（`webui/SANDBOX.md` ∥ `gateway/API.md` ∥ `sandbox/EXECUTION.md`）待重做批收口闭后落 ⇒ **本批评审点火 = 三档落地后**。

**代价② 精确化（2026-10-14 02:5x · 主 agent · 承评审 #141 发现 8）**：原句「预算保险丝（20 分钟/60 步自动刹停——chat 路无此自动停）」表述失准——chat 回合**实有**同常量预算自动停（`agent/ADMIN-AGENT.md` §11 终止五形②「预算超限（20 分钟 ∥ 60 调用——每回合独立计）」/KD-SV-88④）。准确差异 = **任务级（跨回合整体）随退场消失；回合级预算照旧在场**。用户据此知悉的代价表以本注为准。

**2026-10-14 09:4x · 事故与处置（主 agent · 共享树 git stash）**：实施轮中途出现 `git stash`（message「sandbox-onboarding-removal baseline probe」）——**整棵工作树被收起**（含父侧本轮六处：`quota.mjs`∥`ssh.mjs`∥`egress.mjs`∥`EXECUTION.md`∥两测试档 ＋ 另一会话十处在途）。父侧检测 → 立即取证（reflog/stash list/盘面）并向实施轮发急令（禁 drop ∥ 立即 pop ∥ 共享树此后禁 stash/checkout/restore/reset；基线对比改用 `git show HEAD:<path>` 或 `.thincoder/tmp/` 临时 worktree）。**复读结果**：实施轮自行 pop——`stash list` 空 ∥ 37 项改动全回（父侧六处逐字在位 ∥ 他会话十处全回 ∥ 实施轮自身进展在树）。**教训入册**：多会话共享树＝任何工作树级 git 操作（stash/checkout/restore/reset）都跨会话共命——实施轮任务书此后明载禁用。

## §2 批次任务与设计（eng-designer）
**状态行**：设计完成 2026-10-14（fix 轮（评审 #141 发现 1–7）已落——§2 补录在册；doc-check 终读悬空 42（域内零新增）∥ 行宽 0）
<§2 模板占位：本批条目（覆盖） / 设计档落点 / 机制设计 / 受影响文件与测试覆盖 / 验收对照 / 关键决策 / 上抛项>

**范围裁定**：用户 2026-10-14 裁「撤」——任务式装机（托管接入）退场（台账 #1383）。设计轮零产品码/零测试码（产品码面 = 实施轮，排法见下）。

**条目（本批覆盖）**
① 任务式面清面（设计档面）：UI 面（运行面「托管接入」钮 ∥ 装机任务区三态 ∥ 两弹窗）∥ 端点族四条（起/列表/详情/撤销凭据）∥ 服务件两档（`onboarding.mjs`（373 行）∥ `onboarding-routes.mjs`（102 行）——删）∥ 任务面五工具（`register`/`verify`/`report` + 环装配/步进 id）∥ 单元测试档（`…-runner-admin-console-agent.test.mjs` 整档删）。
② 表 `sandbox_onboarding` = **停机留史**：不删数据 ∥ 零迁移 ∥ 零写入零读面；`running` 残留行永久静止（已披露）。
③ 审计面收正：删 kind 清单五件 + ACCOUNTS §2.1 五 kind 行；DB CHECK 零动（kind 非枚举）；历史行原值兜底可读。
④ 承接缝落文：接入 = 手工登记（添加节点直填）+ 装机/主机运维 = 管理面 chat 内动作（`exec`/`docker`/`runners` + 主机表凭据——KD-SV-135 终局；零新机制/零新端点）。
⑤ 需求档回笔文本拟稿（见下——主 agent 笔）。

**不在本批（承接/延迟——规格在案）**
- `webui/SANDBOX.md`（`:15`/`:42-44`/`:50`/`:65`/`:84`/`:107-109`）∥ `gateway/API.md`（`:129`/`:174-177`/`:381`）∥ `sandbox/EXECUTION.md` `:306` 半句——**待重做批（sandbox-exec-rebuild）收口闭后落**（共享文件 `views-sandbox.mjs` ∥ `routes.mjs` 在飞——避免返工）。
- views-audit 五映射 ∥ i18n-system 十键（label 面随正）——实施轮/兄弟舱。
- 产品码 ∥ 测试码 ∥ 部署收尾（镜像重建等）——实施轮。

**清面表（设计档面——本批已落，逐档）**
| 档 | 改动点 |
|---|---|
| `sandbox/SANDBOX.md` | §2 审计五 kind 行删 + `sandbox_onboarding` 行注「停机留史」；§3 托管接入块（旧 94–119）删净 + 增「接入面」承接句 + 迁移块改「历史遗留」+ 合并路线收正 + 自加项 ⑦–⑬ 删；§8① 钮句删；§9 四端点句删；§11 判据行删；§12 N49–N52 ∥ B44–B46 ∥ E37/E38 ∥ N81 删；§13 两档行删 + `routes.mjs` 行 + 小计 + 测试档行注；§14 KD-SV-83/86 删（段号留空档）、KD-SV-84/85/135 收正；§15 余项行删；§16 增 R87；变更记录一行 |
| `agent/ADMIN-AGENT.md` | 头部口径单源 ∥ §1 形态两句 ∥ §2/§3/§4 删（段号空档）∥ §5 题 + MCP/出口/模型选择 ∥ §6 `run.mjs`·`tools.mjs` 行 + 小计 ∥ §7 四条判据删 ∥ §8 N53/B47/E39 删 ∥ §9 KD-SV-82/87/88/89/136 五处 ∥ §10 两处 ∥ §11 两处 ∥ §12 句 ∥ 变更记录 |
| `ops/OPS.md` | §5.10 接入句 + 主机 SSH 前提行 ∥ 变更记录 |
| `accounts/ACCOUNTS.md` | §2.1 五 kind 行删 + 写入件面两处 + 型面现状句 ∥ 变更记录 |
| `store/STORE.md` | §1 v13 条注 + §2 v13 段注（停机留史）+ 两指针收正 ∥ 变更记录 |
| `webui/WEBUI.md` | 站点表对话页行 + §2.8 清单 + §5 小计增量 ∥ 变更记录 |

**验收（机检——本批域）**
① 六档 grep「onboarding|托管接入」= 仅记录面/停机留史注/承接句（无活面残留）。
② `doc-check.mjs` 读数：本批域**零新增红**——悬空 27（全在域外/已注记；本批曾引入 1 条（ACCOUNTS 变更记录行）已随正）∥ 行宽 2 行（`docs/core/design/MEMORY.md:854` ∥ `docs/server/design/webui/SANDBOX.md:104`——均域外/在飞档）。
③ 三链一致：本表条目 = SANDBOX §16 R87 = 需求档回笔项（下）。
④ 实施轮判据（随正件）= R87② 清单（机检面 = 键集/档目/门禁件数指纹复读）。

**关键决策**
- 删净（非钩子化/非 flag 化）：任务式面全删；表留史（零迁移）。
- 段号留空档（ADMIN §2–§4 ∥ KD-SV-83/86）：沿先例；不重编号（避免全档指涉翻修）。
- 承接缝零新机制（chat 内动作 = 终局）。
- 在飞三档不盲改（排法注记见下）。

**上抛**
- [待裁] 需求档回笔文本（拟稿见下——主 agent 笔；写法/计数由主 agent 定）。
- [待裁] KD-SV-85 行内「重新信任」重试入口随退场消失——chat `exec` 径指纹变更 = 停 + 如实报（无重试入口；如需入口另立批）。
- [知会] 在飞延迟项三档（`webui/SANDBOX.md` ∥ `gateway/API.md` ∥ `sandbox/EXECUTION.md`）——重做批收口闭后落。
- [知会] SANDBOX §13「清账轮六行」历史单内 `onboarding-routes` 名残留（历史记录，不改）。

**需求档回笔文本（拟稿——`docs/server/requirements/PROJECT.md`；主 agent 笔）**
① §5「接入两径」块改写：接入两径 = ① 手工登记（控制台「添加节点」直填 Docker API 地址——连通自检）∥ ② 硬化环境 = 同上 + 人工前置；**装机/主机运维 = 管理面 chat 内动作**（agent 用 `exec`/`docker`/`runners` + 主机表凭据——零新机制）；删原「执行者 = server 端 agent」句与三态句（任务式退场——2026-10-14）。
② AC-36 ⑨ 收正 ∥ ⑩ 删：⑨ = 「接入两径手工登记可完成（添加节点 ⇒ 自检读数可复读）；装机/主机运维在管理面 chat 内可执行（工具面在场）」。
③ §5 管理面用途行去「托管接入（装机）」。
④ 功能点 47④ 合并方向句收正「已达成（2026-10-14——任务式面退场）」。

**排法注记**
- 实施轮删码**须在重做批落地后**（共享文件 `views-sandbox.mjs` ∥ `routes.mjs` 在飞）；删码清单 = R87② 随正件列。
- 本批设计轮已把**设计档面**（六档）落定——实施轮只需码面 + 随正件。

**清面补充（同源随动二轮——本批已落，各档变更记录在册）**
- `webui/CHAT.md`（§2.1 定位句去「托管接入」用途项）∥ `webui/TABS.md`（KD-SV-103 行 + §2.2 归位逐件/读时口径去托管接入件）∥ `docs/server/design/PROJECT.md`（板档：§4 索引 KD-SV-83/86 行删（编号留空档）∥ KD-SV-82/84/87 行收正）。
- `agent/ADMIN-AGENT.md` 三处悬空 KD 引收正（KD-SV-88 理由句 ∥ §11 重启恢复句 ∥ KD-SV-89 截断口径句——改指 `CHAT_TOOL_CONTENT_MAX`）。

**上抛补充**（[知会]）：`mcp/MCP.md:26/29/136` 活面句仍以「任务面（run）」为参照（run 已退场）——MCP 批域文档；本批未触（避跨批冲突），建议随 MCP 档主/主 agent 随正。

**机检读数（终轮）**：`doc-check.mjs`——悬空 27（本批域全为注记豁免（拟新增/迁移期引文）；计数项全在域外）∥ 行宽 2 行（`docs/core/design/MEMORY.md:854` ∥ `docs/server/design/webui/SANDBOX.md:104`——均域外/在飞档）∥ 本批域零新增红。

**fix 轮补录（2026-10-14 · 延迟三档落地——重做批收口闭 ⇒ 延迟条件消解；评审点火前置达成）**

三档已落（与已落六档同口径 = 残留删净 + 承接句 + 变更记录一行；逐处落点 = 本轮交付报告）：

- `webui/SANDBOX.md`：§2.1① 托管接入块（钮 ∥ 弹窗 ∥ 装机任务区）删净 + 原位增「接入面」承接句（手工登记 + 管理面 chat 内动作——KD-SV-135）∥ 主机凭据并列句 / 分标签归位句 / 文案句三处去托管接入件 ∥ §3 件行 + 面小计链补 **−≈190** ∥ §3 拆案句随退场收正（越 500 软线随解）∥ §4 沙盒页 AC 行去托管接入段。
- `gateway/API.md`：§2.5 前括注「托管接入面」条 ⇒ 「接入面」承接句（四端点退场 ∥ 表 `sandbox_onboarding` 停机留史）∥ **四端点行删**（起 ∥ 列表 ∥ 详情 ∥ 撤销凭据）∥ §5 托管接入判据行删。
- `sandbox/EXECUTION.md`：§16 连接面 TLS 余项行去「托管接入面 TLS」子项 ⇒ 承接注（单源 = `sandbox/SANDBOX.md` §3 接入面）。
- 顺带一笔（闸面清尾——零语义，可 revert）：`webui/SANDBOX.md` §3 面小计链 329 字行折行 ⇒ **本批域行宽红归零**。
- 三档复扫（`onboarding|托管接入|装机`）= 余项仅记录面（链条目/键族登记/变更记录）/ 承接句 / 停机留史注——无活面残留（与验收① 同判）。`:113`/`:115`（键族登记/表体量链）判为记录面保留（沿 `ops/OPS.md:278` 先例）。

机检读数（`node scripts/doc-check.mjs --root D:\teamcode\thincoder`）：

- **改前**：悬空 28 ∥ 行宽 3（域内 1 = `webui/SANDBOX.md:104`）。
- **改后**：悬空 **33** ∥ 行宽 **2** ∥ **本批域零新增红**（三档零新增悬空）。
- Δ 域外：悬空 +5 全在域外 = `docs/desktop/design/WEB-QUICKCHECK.md` ×3 ∥ `docs/render-core/design/RENDER-CORE.md` ×2（`protocol.mjs` 引用——他批在飞）；行宽存红 = `docs/core/design/MEMORY.md:854` ∥ `docs/server/design/agent/ADMIN-AGENT.md:531`（D5 冻结窗内——本轮零写）。

-[待裁] `views-sandbox.mjs` 删量两说：`webui/WEBUI.md` §5 链载 **−≈95** ∥ 本档 §3 拆案块实测 **≈190**——本轮取 **≈190**（承 §1「≈190 行」；WEBUI 已落件零回改）。差值收口请裁（实施轮实读可自然闭合）。

-[知会] 三档之外零触（产品码/测试码 ∥ 已落六档 ∥ `agent/ADMIN-AGENT.md` D5 冻结档 ∥ 需求档 ∥ 他批在飞档）；零新语义（全部 = 批档已定删除/承接项落地）。

**fix 轮补录 · 评审 #141 发现 1–7 逐项落地（发现 8 = §1 已由父侧自收）**

**改动（号 → 落点；各档变更记录一行在册；产品码/测试码零触）**
- 发现 1 → 五族枚举四处：`webui/SANDBOX.md` §2.1①/§4 ∥ `webui/TABS.md` §2.2/§4（六族 ⇒ 五族——去「任务」族；装机任务区随退场）。
- 发现 2 → 板档三处：`design/PROJECT.md` §2.1 sandbox 行去「托管接入（§3——agent 代做）」∥ §3 档行去托管接入项 + KD 区间去 83/86（⇒ `KD-SV-79/80/81/84/85/92–100`）+ 批记补 ∥ §7 agent 行「AC-36（接入与运维）」；**同族收正（编号外——报告在案）**：§7 AC-36 判据行「托管接入（runner-admin-console 批增补）」子块（目标块已删 ⇒ 死指五处）⇒ 承接指（`sandbox/SANDBOX.md` §3 接入面块）∥ §2.1 agent 行去任务面四项（任务式 §2 ∥ 任务模型 ∥ 任务五件 §3 ∥ 自主边界与失败处置）∥ §3 档行去任务面三项（ADMIN-AGENT §2–§4 已删空档——两行仍列其名）。
- 发现 3 → `agent/ADMIN-AGENT.md` §16.2「任务式（run）出口 = 直连」行删 ∥ §17.3 A1「任务面（run）规格取数 = `exit.spec`」行删 ∥ §17.3 缺核警告面句去 run 静默半句。
- 发现 4 → `sandbox/SANDBOX.md` §16 R53① 标「已闭合（2026-10-14）」∥ R53② 销项（任务式退场 ⇒ 无「托管接入」跑法可补）∥ `agent/ADMIN-AGENT.md` §13 R54③ 补收正注（承接 = 管理面 chat 内动作）。
- 发现 5 → `webui/WEBUI.md` §5 小计「≈−131」⇒「**≈−161**」（分项和 = −95 −30×2 −6）+ 两说未取齐注 ∥ `webui/SANDBOX.md` §3 拆案块同注（以实施轮实读一次记平；本轮不预设值）；**顺带折行**（父侧并入验收面）：本档 `:107` 加注后 347 字 ⇒ 折行（续行 `:108`）——该档行宽红归零。
- 发现 7 → `sandbox/SANDBOX.md` §16 R87②：删码清单归并一处（`onboarding.mjs` **354** ∥ `onboarding-routes.mjs` **103**（整档删）∥ `routes.mjs` **413** 段 −≈4）+ 随正件逐件补现读/净变；顺带 §13 测试档行「估 ≈420」⇒「实读 **637**」。**复扫修正一项**：`…-runner-admin-console.test.mjs` 原载「托管接入端点用例段删」——实读档内零 onboarding/任务面引用 ⇒ 净变 **±0**（全链用例在 `…-agent.test.mjs`——整档删）。

**§2 验收/注记文本收正（承发现 6——以本块为准）**
- ①（收正 `:50`）：**九档** grep「onboarding|托管接入」（六档 + 延迟三档）；fix 轮复扫（十一档——九档 + 板档 + `webui/TABS.md`）：余项 = 记录面/承接句/停机留史注 ＋ 口径引用二处（见上抛——低危未触）；「任务」族枚举四处已收正（六族 ⇒ 五族）。
- ②（收正 `:51`）：`doc-check.mjs` fix 轮终读（as-of 本轮）= 悬空 **42**（本批六档 12 枚 = 11 枚注记豁免·列报 + 1 枚存量红 `agent/ADMIN-AGENT.md:579`（他批变更记录行——`chat.mjs:596` 坐标，未触）；余 30 枚在域外）∥ 行宽 **OK（0 行）**——**本批域零新增红**；fix 轮曾瞬现一行宽红（本档笔迹）已折行收正。
- ④（收正 `:53`）：实施轮判据（随正件）= R87② 清单（机检面 = 键集/档目指纹复读；**门禁件数项去**——门禁链 2026-10-12 已撤除，`sandbox/SANDBOX.md` §16 R73②）。
- 排法注记（收正 `:74`）：删码清单已归并入 R87②（两服务件 + `routes.mjs` 行）；重做批已收口 ⇒ 实施轮删码条件消解。

**零扩面声明**：产品码/测试码零触 ∥ 需求档零触 ∥ `accounts/ACCOUNTS.md` ∥ `gateway/API.md` ∥ `webui/CHAT.md` 零触 ∥ 发现 8 零触 ∥ 段号零动 ∥ 他批在飞档零触。**零新语义**（全部 = 评审发现 1–7 直接导出 + 同族悬空指针/跨档滞后收正——报告在案）。

**上抛（fix 轮 · 知会）**：同族残留低危二处（口径引用——未触，建议另笔或复审定）：`agent/ADMIN-AGENT.md:36`（docker-ops 行「任务面/聊天面两驱动单源」）∥ `sandbox/SANDBOX.md:284`（KD-SV-85 单元格「沿任务面口径」）；另 `sandbox/SANDBOX.md` §13 `:582` `routes.mjs` 现读仍载 477（重建批前陈读——实读 413；行数面报告态在案，实施轮回填）。

## §3 设计评审（评审子代理）

### 轮次 1（评审子代理）

评审轮（设计评审——托管接入撤除批·设计〔九档清面 + 需求档回笔〕）：对象 = 本档 §2（审核口径 = 九档清面 + 需求档回笔；产品码零触）。
计数：🔴 0 ∥ 🟡 7 ∥ 🔵 1 ⇒ VERDICT: pass（无 🔴）。

| # | Category | Severity | Issue | Suggestion |
|---|----------|----------|-------|------------|
| 1 | Doc-state（活面残留） | 🟡 | 「六族动作面（节点/容器/任务/镜像/镜像源/卷）」四处仍把已退场的「任务」族列为活动作族（`webui/SANDBOX.md:56` ∥ `webui/SANDBOX.md:161` ∥ `webui/TABS.md:46` ∥ `webui/TABS.md:71`）——本批清面清单与验收① 的 grep（onboarding|托管接入）都覆盖不到「任务」词面 | 四处随退场收正（去「任务」项/改五族）；验收① 的 grep 词表补「任务」或明写豁免 |
| 2 | Doc-state（跨档滞后） | 🟡 | 板档 `design/PROJECT.md` 三处仍以活面口径载托管接入：§2.1 域行「托管接入（§3——agent 代做）」（`:36`）∥ §3 档行「托管接入（§3——步骤表/凭据定形/网络路径）」＋决策族区间「KD-SV-79/80/81/83–86/92–100」（`:99`——83/86 已删）∥ §7 AC 行「AC-36（托管接入）」（`:181`）；本批板档改动 = §4 索引（变更记录 `:779`） | 三处同拍收正（去项或注「已退场」；KD 区间去 83/86；AC-36 标签随需求档回笔） |
| 3 | Doc-state（活面残留） | 🟡 | `agent/ADMIN-AGENT.md` §16.2（`:465`「任务式（run）出口 = 直连」）∥ §17.3（`:539` `exit.spec` plumbing——`run.mjs` 出口装配 ∥ `:555` run 面警告静默）仍以现在时描述本批已删净的 run 任务面；`:539` 引「§10「run 出口不改道」口径」= 已随 §10 收正删除的句 | 三处随退场收正（删或移记录面） |
| 4 | Doc-state（待办失效） | 🟡 | 旧批上抛行仍含已失效可执行子项且未标：`sandbox/SANDBOX.md` §16 R53②（`:724`——「补『托管接入』跑法」于 `TEST-ENV-ECS.md` §7）∥ R53① 判据指针（§3/§11）= 已删块 ∥ `agent/ADMIN-AGENT.md` §13 R54③（`:297`「装机 = 任务式弹窗」） | 逐行加状态注（销项/改指承接句）——防父侧按失效待办动手 |
| 5 | Doc-state/计数 | 🟡 | `views-sandbox.mjs` 删量两说未取齐：`webui/WEBUI.md` §5 链载 −≈95（`:223`）∥ `webui/SANDBOX.md` §3 实测 −≈190（`:83`/`:106`/`:107`）；且 WEBUI §5 本批增量 −≈131 与自身分项和（−95 −30×2 −6 = −161）不符 | 收口时以实施轮实读一次记平（两档同值）；−131 分项和复算收正 |
| 6 | Doc-state（验收/闸面读数） | 🔵 | 验收② 载「悬空 27 ∥ 行宽 2（`MEMORY.md:854` ∥ `webui/SANDBOX.md:104`）」（`:49`），终轮/fix 轮读数为「悬空 33 ∥ 行宽 2（`MEMORY.md:854` ∥ `ADMIN-AGENT.md:531`）」（`:97`）；验收① 仍写「六档」（`:48`）而射程已九档；验收④ 仍列「门禁件数指纹」（`:51`）——门禁链已按用户 2026-10-12 裁撤除（`sandbox/SANDBOX.md` §16 R73②） | 验收文本按终值改写；门禁项去 |
| 7 | 实施轮清单（档线注） | 🟡 | R87②（`sandbox/SANDBOX.md:738`）测试随正件缺现读行数/净变注（仅 `…-agent.test.mjs` 有设计估 ≈420）；批档排法注记「删码清单 = R87② 随正件列」名实不符——R87② 只列测试档，未含 `onboarding.mjs` ∥ `onboarding-routes.mjs` 与 `routes.mjs` −≈4（散见条①–③ ∥ §13 小计） | 随正件逐件补现读 + ≤±N；删码清单归并一处（含两服务件 + routes 行） |
| 8 | Clarity/Doc-state | 🟡 | 批档 §1 代价②「预算保险丝（20 分钟/60 步自动刹停——chat 路无此自动停）」（`:14`）与 `agent/ADMIN-AGENT.md` §11/KD-SV-88④ 相抵——chat 回合实有 20 分钟/60 调用预算（每回合独立）；差异 = 「任务级 vs 回合级」 | 该句收正（任务级随退场消失；回合级照旧） |

域外注记（无严重度）：需求档回笔六处（`docs/server/requirements/PROJECT.md`）不在本次评审清单内——未核；`docs/TEST-ENV-ECS.md` §7 ∥ `docs/README.md` ∥ `mcp/MCP.md` 的撤除残面未在本批评审清单/披露内（MCP 已有 [知会]）；两服务件行数（373 ∥ 102）未核（源档不在清单）。
VERDICT: pass

## §4 用户批准（主 agent）

**用户批准（2026-10-14 09:23）**：父侧呈报「撤除批（删码实施轮）——设计+评审+fix 轮全在案，回「批」即派」→ 用户回 **「批」** = 授权派实施轮（设计评审 #141 pass（🔴 0）+ fix 轮（发现 1–8）落地在案；排法 = 发布轮 0.10.7 收口后开工 ✓——发布轮已于本日 09:0x–09:2x 全链收口）。

## §5 实施记录（eng-coder）

**状态行**：实施完成（删码 15 档落盘（两档整档删）；单测 8/8 绿；内部发散审计 + advisor 代码评审 pass，响应表全处置）

**交付摘要（任务式装机〔托管接入〕码面删净——设计单源 = 本档 §2 ∥ `sandbox/SANDBOX.md` §16 R87②）**

整档删：

- `thincoder-server/src/sandbox/onboarding.mjs`（现读 354 ⇒ 0）∥ `thincoder-server/src/sandbox/onboarding-routes.mjs`（现读 103 ⇒ 0）。
- `thincoder-server/public/views-sandbox.mjs`：删「托管接入」钮 ∥ 两弹窗 ∥ 装机任务区三态 + 辅助件（`TASK_POLL_MS`/`runStateLabel`/`readingLines`/`stepItem`/`pollGeneration` 等）∥ imports 两件（`confirmModal`/`deriveModels`）⇒ **实测删 232 / 增 8（净 −224；519 ⇒ 295 内容行）**。**两说取齐**（§2 [待裁]）：取实测净 −224 为真值（`webui/SANDBOX.md` §3 实测 ≈190 为准，差入 = 同批注释收正 8 行）。
- `thincoder-server/src/agent/tools.mjs`：整档收为掩蔽单源（删任务面五工具 + `STEP_IDS` + 环装配）⇒ 净 −223（229 删 / 6 增；⇒ 18 行）；留守 = `maskSecrets`（消费 = `chat.mjs` ∥ `member-relay.mjs` ∥ `hosts.mjs`）。
- `thincoder-server/src/agent/run.mjs`：删任务面两件（`runAgentTask`/`buildModelExit`）+ 环装配 + 出口装配 ⇒ 净 −117（125 删 / 8 增；⇒ 34 行）；留守共享五件（`DEFAULT_MAX_CALLS = 60` ∥ `DEFAULT_MAX_DURATION_MS = 1200000` ∥ `TRIMMED_FACES` ∥ `loadCoreChat` ∥ `providerModelRefs`）。

逐点删/收正：

- `src/sandbox/routes.mjs`：删 onboarding import ∥ 四端点注册段 ∥ 遗孤 `resumeInterrupted` ⇒ 净 −4（413 ⇒ 409）；导出面 = `registerSandboxRoutes` 独件。
- `src/agent/chat.mjs`：系统提示用途句去「托管接入」（与 ADMIN-AGENT §11 三面口径取齐）——1 行。
- `public/i18n-{zh,en}-sandbox.mjs`：删任务面 23 键/表 ⇒ 沙盒部 269 ⇒ 246；**两键改名**（`onboardingPort ⇒ hostCredPort` ∥ `onboardingUser ⇒ hostCredUser`——消费方 = `host-credential.mjs`，值/界面零变）；`noNodes` 值改承接种（zh/en 同拍）。
- `public/i18n-{zh,en}-system.mjs`：删 `audit.sandboxKind.onboarding_*` 5 键/表 ⇒ 系统部 −5/表。
- `public/views-audit.mjs`：删 5 条 onboarding kind 映射（**fix 轮回位连带误删的留守键 `host_credential_revoke`**——见 fix round）。
- `public/host-credential.mjs`：两键改名 6 处 + 注释（清单外新触——改名连带）。
- `public/style.css`：删死 CSS `.step-list` + 注释收正。
- `src/sandbox/ssh.mjs`：指涉收正（头注 §3「托管接入」⇒ 主机凭据块 ∥ TOFU 句「重交任务」⇒「重发命令即重新信任」∥ `hasSshpass` 注释 ∥ 回退密钥名 `onboarding-<pid>` ⇒ `ssh-<pid>`）；**该档改动已随父侧 25d1f848 一并提交**（同档含父侧 1 处修复；无独立未提交残留）。
- `src/store/credential-crypto.mjs`：注释改史注（消费方清单按实读重列 ∥ 抽取来源档已删 ⇒ 改史注）。
- 零动声明：`src/store/migrations.mjs`（表史/停机留史）∥ 主机凭据面本体（`hosts.mjs` 等）∥ 段号零重编号 ∥ 零新机制/端点/工具。

**验证（命令 + 读数）**

- 本批单测档（新增）：`node --import ./thincoder-server/test/rc-resolve.mjs --test docs/batches/2026-10-14-sandbox-onboarding-removal.test.mjs` ⇒ **8/8 pass**（① 两档删净 + 仓内零引用 ② `registerSandboxRoutes` 36 端点 ∥ 零 onboarding ∥ 导出面独件 ③ `maskSecrets` 独件 + 行为逐值 ④ `run.mjs` 五件值逐值 + 两件已删 ⑤ `views-sandbox.mjs` 源零命中 + `admin.sandbox.*` 全域引用键闭合 ⑥ 表 `sandbox_onboarding` 在表 18 列 + 零读写面 ⑦ 扫描闸 ⑧ 审计 kind 映射 ↔ 两表双向闭合）。
- 语法：改动 15 档 `node --check` 全 OK；全树相对 import 解析扫（src+public+bin 158 档）= **0 断链**。
- 扫描：`src` + `public` 全域 `onboarding|onboard|托管接入` ⇒ 余项**仅** `src/store/migrations.mjs` 12 处（建表史/停机留史注——合法面）。
- 键面：`admin.sandbox.*` 全域字面引用（全部 `public/*.mjs` 消费面）⇒ 两表**零欠账**；`audit.sandboxKind.*` 映射 ↔ 两表键集**双向闭合**（36 = 36）。
- 跨批测试档实读与因果分类见下条（含改前基线对照——只读法）。

**跨批随正件（父侧笔）——逐件实读与因果分类**

运行法：`node --import ./thincoder-server/test/rc-resolve.mjs --test <档>`（自 `thincoder/` 仓根）；「因」列区分**本批因果**（因本批改动而红/必红）与**存量**（改前基线即红——同档同腿已核）。

| 档（随正件族） | 本刻实读 | 因 | 需随正点（父侧判） |
|---|---|---|---|
| `2026-10-10-runner-admin-console-agent.test.mjs` | `ERR_MODULE_NOT_FOUND`（导已删档；现读 637） | 本批 | 设计已定：整档删 |
| `2026-10-10-runner-admin-console-ui.test.mjs` | pass 3 ∥ fail 5（①⑤⑥⑦⑧） | 本批（⑤⑥⑦）+ 存量（①⑧） | ⑤/⑥ 任务面用例删；① 首读断言改；⑦ 键数；⑧ 档目 |
| `2026-10-11-console-tabs-component.test.mjs` | pass 4 ∥ fail 5（③⑤⑥×3） | 本批 + 存量 | 任务区/两钮/首读断言；键数 854∥859 ⇒ 当刻实读 |
| `2026-10-12-admin-chat-creds-merge.test.mjs` | pass 5 ∥ fail 4（含 N81） | 本批 + 存量 | N81 用例删（移交机制随件退场）；i18n/档目腿随正 |
| `2026-10-12-team-projects-permissions.test.mjs` | 未跑（顶部导入已删档 ⇒ 必红） | 本批 | `onboarding.mjs` 导入 + 用途删 |
| `2026-10-08-server-public-structure.test.mjs` | 未跑（指纹/键数必红） | 本批（−28/表）+ 存量 | ANCHOR 指纹两枚 + 键数 1041∥1046 ⇒ 当刻实读。**本批净 −28/表**（沙盒部 −23 ∥ 系统部 −5）；**本刻实读 = 1102 ∥ 1107**（含他批同窗增键）；本刻指纹参考 zh `63cdbd6948997ebee797f8d2f691eb8e55e0fdea6bf6350857e890c2c6236e94` ∥ en `9382d74146d7b797e77fd4a01e7dfc85516818910a748611d8ac0e461f025abf`——**含他批同窗键，收口须复读** |
| `2026-10-06-server-gateway.test.mjs` | pass 11 ∥ fail 2（迁移 `user_version` 24≠22 ∥ 临时目录 EPERM） | **存量**（改前基线同红） | 表在场断言留（表存续）✓ 净变 ±0 |
| **`2026-10-13-server-core-unification.test.mjs`（R87② 清单外——本批发现）** | pass 8 ∥ fail 2（腿① `run.mjs 接新档` ∥ 腿② A1 任务面） | 本批 | 腿① `SOURCE(run.mjs).includes("./chat-compact.mjs")`（`chat-compact` 仅任务面消费 ⇒ 随退场不再接）∥ 腿② `runAgentTask`/`buildModelExit` 两面断言删 |
| 键数指纹族（设计「等」字覆盖面）：`2026-10-13-sandbox-container-terminal-ui`（269）∥ `…-exec-rebuild-base-ui`（269）∥ `…-exec-rebuild-tls-ui`（269） | 三条 ⑨/⑥ 腿红 | 本批（沙盒部 −23） | 269 ⇒ **246**/表 |
| 存量红（非本批因果——逐条读过断言原文）：`2026-10-11-admin-agent-chat-ui`（键数 970∥975 + 档目 54∥53）∥ `2026-10-06-server-i18n`（前端档集快照）∥ `2026-10-11-admin-agent-chat-tools`（七件 vs 八件——`exec` 他批）∥ `2026-10-13-project-sources-merge`（nav `/me/chat` ∥ CSS 核对表 ∥ shell 键）∥ `2026-10-12-team-projects-permissions-ui`（nav `/me/chat` ∥ shell 键数 61≠63）∥ `2026-10-11-sandbox-{docker-admin,image-sources,image-quick-pull,pull-by-source,volumes}-ui`（public 档集快照 43/42 陈旧）∥ `2026-10-10-server-small-fixes` ∥ `2026-10-13-team-ledger`（键数 970∥975 存量）∥ `2026-10-10-runner-admin-console.test.mjs`（迁移版本 22≠24） | 存量 | 与退场批无关（各档期望值早落后于他批增量）；父侧按存量处置，不并入本批 |

**决策透明表**

| # | 决定 | 依据 ∥ 替代与被否理由 |
|---|---|---|
| 1 | `ssh.mjs` 报文句「重交任务即重新信任」⇒「重发命令即重新信任」 | 交任务面已退场（词面死指）；机制零变（`forgetHost` 照旧，行为 = 下次命令即重信任） |
| 2 | 回退密钥名 `onboarding-<pid>-…` ⇒ `ssh-<pid>-…` | 扫描清面（名中已无「任务」义）；替代（留旧名）= 活面留 onboarding 词素 ⇒ 否 |
| 3 | i18n 两键改名 `onboardingPort/User` ⇒ `hostCredPort/User` | 消费方存活（`host-credential.mjs`）；替代（留旧名——省 6 处改动）= 活面留词素 ⇒ 否；值/界面零变 |
| 4 | `noNodes` 值改承接种（zh/en 同拍） | 原值指引已退场功能（「或用『托管接入』自动装机」）= 死指引；新值 = 手工登记 + 对话页内动作（KD-SV-135） |
| 5 | 注释改史注（`tools.mjs`/`run.mjs`/`credential-crypto.mjs`） | 逐字删段会留悬空「任务式环/任务面」指涉；史注按记录面写法（日期 + 退场事由 + 承接） |
| 6 | 改动前基线取法 = 只读（`git show HEAD:<path>` 思路——本轮实作为「stash 一次后核读」） | 见事故披露；共享树上一切工作树级 git 操作已禁（父侧急令） |
| 7 | 清单外新触档（如实列）：`public/host-credential.mjs`（改名连带 6 处）∥ `public/style.css`（死 CSS）∥ `public/i18n-*-system.mjs`（审计 5 键——设计 §2③ 面）∥ `src/store/credential-crypto.mjs`（注释史注） | 全为退场连带（键改名/键删/死码/死指），零新语义；设计 §2 已含审计键删与 UI 面删，`host-credential.mjs` 为改名连带 |

**fix round 记录（自审发现——1 轮 1 处，已修）**

- **fix #1 · `public/views-audit.mjs` 连带误删留守键**：删 6 行——除设计五条 `onboarding_*` 外连带了**主机凭据面留守键 `host_credential_revoke`**（该键 i18n 两表仍在册 ⇒ 审计行会落原值兜底，界面欠账）。已回位（净变 `0 5`）。**同类面机检补强**：本批单测新增 ⑧（映射 ↔ 两表 `audit.sandboxKind.*` 键集**双向闭合**——漏映/悬空同红）∥ ⑤ 扩为 `admin.sandbox.*` **全域**引用键闭合（全部 `public/*.mjs` 消费面 ⇒ 实读零欠账）。此类「删键而消费仍在」的欠账两向均已机检覆盖。

**事故披露（本批出 · 共享工作树）**

- 我为取「改前基线」误用 `git stash`（工具忽略路径参数 ⇒ 整树暂存，含父侧六处 + 他会话十处在途）；pop 首试因并行批四档冲突被拒，随即（并行批落盘后冲突消除）pop 成功：`stash list` 空 ∥ 改动全回 ∥ 逐项核读在位。父侧已入册（本档 §1 事故条）；此后本仓禁 `git stash`/`checkout --`/`restore`/`reset`，基线改只读路。L1 影响面 = 暂存窗内并行批写档（4 档批档 md 走 auto-merge，内容 = 暂存版本）——已逐档核在位。

**记录面收正（承内部发散审计——§5 自纠，D6 复读）**

- **行数读数收正**（口径 = 本机 `split("\n")` 计法；`git show HEAD:<档>` 复核）：`routes.mjs` **412 ⇒ 407（净 −5）**——我首稿写「净 −4（413 ⇒ 409）」为误（413 = 设计口径，−≈4 = 设计估；实测 −5，多出 1 行 = 遗孤 `resumeInterrupted` 调用行随定义删）∥ `views-sandbox.mjs` 519 ⇒ 295（净 **−224**）∥ `tools.mjs` 241 ⇒ 18（净 −223）∥ `run.mjs` 150 ⇒ 33（净 −117）∥ `i18n-{zh,en}-sandbox` 300 ⇒ 277（净 −23/表）∥ `views-audit` 252 ⇒ 247（净 −5）∥ `style.css` 385 ⇒ 383（净 −2）∥ `credential-crypto`/`chat.mjs`/`host-credential` 行数零变（逐字替换）∥ 两删档 HEAD 现读 353/102（设计口径 354/103——尾行计法差 1）。
- **两说取齐（收正）**：`views-sandbox.mjs` 实测 = `git diff --numstat` **删 232 / 增 8 ⇒ 净 −224**；两档既有估（`webui/WEBUI.md` §5 链 −≈95 ∥ `webui/SANDBOX.md` §3 实测 ≈190）均为删段估算，差额来源 = 估算未含注释块/辅助件/空行段与同批 8 行收正 ⇒ **收口值取实测 −224**（本题闭合）。
- **随正件坐标补齐**（承审计 A 项——file:line 级）：键数指纹族三档腿位 = `docs/batches/2026-10-13-sandbox-container-terminal-ui.test.mjs:633`（⑨ 腿）⇒ 断言 `:674-675` ∥ `…-exec-rebuild-base-ui.test.mjs:317`（⑥ 腿）⇒ `:395-396`（另 `:386`）∥ `…-exec-rebuild-tls-ui.test.mjs:313`（⑥ 腿）⇒ `:364-365`；动作 = `269 ⇒ 246`/表。
- **死指清尾（承审计 C 项——🔵 词面，本批域内已清）**：`src/sandbox/ssh.mjs:39/:48/:53`「任务收尾/任务终态」⇒「命令用毕/命令终态」（对齐 `hosts.mjs` 用毕即删口径；行为零变）∥ `src/agent/chat.mjs:3` 去「与任务式同一环语义」死比照 ∥ `:206`/`:274`/`:283` 去「同任务面口径/沿任务面」三处死指（⇒ 核协议口径 / `maskSecrets` 口径）。清零后复跑：本批单测 **8/8 pass** ∥ 两档 `node --check` OK。
- **清尾域外余项（本批未触——交父侧/域主裁）**：`src/agent/chat-tools.mjs:451`（「任务面同函数」）∥ `src/agent/docker-ops.mjs:3`（「任务式/聊天式两驱动单源」）/`:7`（「任务面 = 主机 + `args.endpoint`」）/`:21`（「沿任务面口径」）∥ `src/sandbox/hosts.mjs:22`（「与任务面同量级」——主机凭据面本体，本批禁触）∥ `src/store/migrations.mjs:371`（表史注——零动）。性质 = 「任务」词面死指，**不在验收① 三词射程**（审计判 🔵）；本批按「零扩面」留报告不擅动。

**内部发散审计（轮次 1 · explore 审计子代理）**

- 结论：**DEVIATIONS（产品面零偏差；记录面 🟡2 + 🔵3，零 🔴）**。核过面（逐条给坐标）：残留全扫 ✅（src 12 处全在建表史/停机留史 ∥ public 全域 0；含 bin/test 全域同判）∥ `node --check` 14 档 ✅ ∥ 单测八腿断言实读 + **端点数独立复算 36**（routes 15 + 容器 10 + 镜像 3 + 卷 2 + 工作区 6；镜像源 7 ∥ 私有仓 4 属 `bin` 另行注册）+ 审计映射 36 键全区 ✅ ∥ UI 面 ✅（295 行、零托管接入件、246 键/表实算吻合、`noNodes` 承接种两语同拍）∥ 删过头 ✅（`maskSecrets` 消费链全活、run 五件在位、主机凭据面完好、两档建表史留存）∥ 清单外改动 ✅（16 档全部在 §5 声明，零未声明档）。
- 处置：A/B 已按上条收正（坐标 + 读数）∥ C 域内清尾、域外留报告 ∥ D 取齐闭合 ∥ E 收正。审计自身约束（如实）：只读审计**未独立复跑单测**（以断言实读 + 端点数/键数独立复算代偿）∥ 无 git 上下文 ⇒ 基线读数由其建议 `git show` 复核（本段 D6 行已按此复核）。**fix round 计数 = 1（审计前自审）+ 1（承审计 C：死指清尾）= 2 轮，全部收敛，无第 3 轮。**

**内部代码评审（轮次 1 · advisor · 对象 = 本批 14 档交付面）**

- 判定：**VERDICT: pass**（🔴 0 ∥ 🟡 2（均非必改）∥ 🔵 1 + 域外注记 2）。评审独立复核了核心判据：两档删净（目录列举无 onboarding*，全域仅 migrations 12 行建表史命中）∥ **端点数独立复算 36**（routes 15 ∥ 容器 10 ∥ 镜像 3 ∥ 卷 2 ∥ 工作区 6——逐 `routes.add` 行计数，与单测②同值）∥ 审计映射 36 键 ↔ 两表 36 键双向闭合 ∥ i18n 两族两语逐行同位对齐（zh 277 / en 278，差 = 尾空行）∥ chat 工具面八件在场（承接缝）∥ 表 18 列 DDL 原样 + 仓内零读写面。
- 其核验声明（如实）：只读评审、无执行工具 ⇒ 未独立复跑单测（以断言实读 + 端点数/键数独立复算代偿）。

**评审响应表（逐条处置）**

| # | 严重度 | 发现 | 处置 |
|---|---|---|---|
| 1 | 🟡（非必改） | `src/sandbox/ssh.mjs` `hasSshpass` 现零消费（唯一调用方 = 已删任务面；全域 grep 仅定义行；两处旁批测试只作 `deps` 键传入而 src 内无读取）——本批自审未覆盖「导出面孤儿」类留痕 | **已处置（标注制，不删）**：注释补「当前零消费（任务面退场后保留——传输面 API，待接线方取用）」；**不删** = R87② 删码清单未列该项，删属超设计——是否删由父侧另批裁 |
| 2 | 🔵 | `src/store/credential-crypto.mjs:48` 注释「调用方转任务失败」= 任务面死指（域内未清，且未列 §5 域外余项） | **已修**：改指实际消费面口径（「调用侧转工具级错误人话；消费面 = 主机凭据 ∥ 私有仓凭据 ∥ 连接材料 ∥ 成员/MCP 凭据 ∥ project 域 git 源」） |
| 3 | 🟡（非必改） | `src/agent/chat.mjs` 733 行 › 500 软线（亦越项目 §6 预案触发线 650）——**存量**，本批仅 1 行用途句改动 | **本批不处置**（沿 R3 不升级、不并入退场批）；记录在案，建议父侧另批按既有先例（`chat-store.mjs`）拆档 |
| — | 域外注记 | `thincoder-server/Dockerfile:9`「# 托管接入宿主前提……」词面残留（不在本批评审清单/扫描射程）∥ 跨批随正件红（§5 表已列） | 留报告交父侧/域主裁；本批零触 |

- 修后复跑：本批单测 **8/8 pass** ∥ 两档 `node --check` OK。

**终态**：**clean**（评审 pass + 响应表全处置；修正轮次 = 3（自审 1 + 承审计 1 + 承评审 2 项——同轮内 2 处）——全收敛，无未决项）。

## §6 验证与收口（父代理）
