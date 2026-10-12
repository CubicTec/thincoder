# 2026-10-12 · admin-chat-creds-merge
> 六段 append-only，一段一作者：§1 讨论（主 agent）· §2 批次任务与设计（eng-designer）· §3 设计评审（评审子代理）· §4 用户批准（主 agent）· §5 实施记录（eng-coder）· §6 验证与收口（父代理）。
> 编制：主 agent · 2026-10-12 · 来源 = 用户 2026-10-12 16:06 原话「运维任务是什么？那个功能我觉得是不是应该去掉，并入chat？」+ 16:10「当然应该进，管理面的chat就是管理用的，这不给那不给还搞个鸡毛？！托管接入那部分将来都要合并进chat，那个是你自己没规划好，在chat还没就位的时候就抢跑了。」。
> 台账 = #1326（server · 归批）。前情 = 无（独立批）。
## §1 讨论（主 agent）
**状态行**：🔄 进行中（…）
<§1 模板占位：本批条目 / 关键判据 / 授权口径>

### 1.1 来源与裁定（2026-10-12）

**用户三句**：16:06「运维任务是什么？那个功能我觉得是不是应该去掉，并入chat？」∥ 16:10「当然应该进，管理面的chat就是管理用的，这不给那不给还搞个鸡毛？！托管接入那部分将来都要合并进chat，那个是你自己没规划好，在chat还没就位的时候就抢跑了。」
**裁定（三条）**：① **SSH 凭据「当然应该进」管理面 chat**——前置口径放开（原 `KD-SV-84`「chat 内收 SSH 凭据 = 凭据纪律面，另裁才可」的另外裁已下）；② **托管接入（任务式 run）将来都要合并进 chat**——方向定；③ 规划批评（先立任务式、chat 后立 ⇒ 两驱动并存）= 父侧认账。
**父侧初判（设计轮落形）**：① **凭据/exec 进 chat（本步）**——设计须定：凭据入口形（对话页凭据面 ∥ 会话级存取）∥ `exec`（SSH）等 run 五件的并入程度（chat 面新增动词 ∥ 复用）∥ 凭据的落库面与掩蔽纪律（沿既有秘密面口径）∥ 与 run 过渡期的共存（run 停新用 ∥ 两形并存）。② **合并路线（定形 · 实施随用户节奏）**——run 的退场路径（沙盒页托管接入弹窗 ∥ run 端点族 ∥ run 存储/文档/测试）。③ **还债**：`KD-SV-84` 被否栏与 §10 边界句按本裁定收正；R71⑥（run 出口改道提请）**撤回**（按合并方向不再对 run 改道——避免白做）。④ **风险面**（在册口径）：管理面 admin 不止一人 ⇒ 任一 admin 可经对话页在服务器/主机上跑命令与持凭据操作（沿功能点 43 既有风险披露加注）。
**台账** #1326。

### 1.2 追加方向（用户 2026-10-12 16:14）

**用户原话**：「我觉得应该设一个主机表，用来管理ssh凭证之类的信息。」
**含义（人话）**：SSH 凭据不要散着放——**建一张主机表**（一台主机一行：地址、端口、凭据等），凭据的增删改查集中在这张表上；chat/exec 用哪台主机就引用哪一行。
**与现盘关系（设计判据）**：现有 `sandbox_runners`（注册节点：名/地址——`docker` 工具「绑定 = 注册节点；名∥地址经 `sandbox_runners` 查行」）与 `sandbox_onboarding`（托管接入任务行——**凭据密文随任务行**）两处并存 ⇒ 设计须裁：**扩展 `sandbox_runners` 为带凭据的主机表** ∥ **新建专表**（凭据与节点注册分离）——判据 = 单一权威 ∥ 不回显/掩蔽纪律 ∥ 既有消费面（docker/exec 绑定读点）∥ 迁移面。**派活已按此重派**（#288 撤销后加宽重发）。

**【2026-10-12 用户裁 · 门禁链撤除（批内件不入发布门）】**`thincoder-server` `prepublishOnly` 链已撤（回 3×`node --check`；CI 注释随动；`ops/OPS.md` §5.1 ∥ `design/PROJECT.md` §6 板级行同拍收正）。**本批 §2 随正件/落点中一切「`prepublishOnly` 入链 ∥ 链件数 N ⇒ N+1 ∥ 门禁件数断言件随正」相关项一律作废**——实施时：不增链、不碰旧断言件（批内件零维护——随批留存、不入任何门）。

## §2 批次任务与设计（eng-designer）
**状态行**：✅ 设计完成 · 2026-10-12（admin-chat-creds-merge 批（台账 #1326）——设计轮 + fix 轮 1（§3 轮次 1 之 1–14 逐条落，另同类连带收正 5 处——逐条列报）；闸面：行宽 OK ∥ 悬空 28（+2 非本笔面）；待父侧项见 §2 披露段）
<§2 模板占位：本批条目（覆盖） / 设计档落点 / 机制设计 / 受影响文件与测试面 / 验收对照 / 关键决策 / 上抛项>

### admin-chat-creds-merge 批（台账 #1326）——批任务与设计（eng-designer · 设计轮）

**用户裁定（本批由来，2026-10-12）**：① SSH 凭据进管理面 chat；② 托管接入（run）将来并入 chat；③ 设主机表管 SSH 凭据。禁：触产品码 ∥ 动 #285 冻结域（B2 期）∥ 重开 chat 既有机制 ∥ 未授权新增减。

**本批覆盖（条目 → 设计落点 → 判据）**
| # | 条目 | 设计落点 | 判据 |
|---|---|---|---|
| 1 | 主机表 = `sandbox_runners` 扩展（不新建第二张机器表；v19 七列） | `sandbox/SANDBOX.md` §2 行 ∥ §3 主机凭据块 ∥ §14 KD-SV-133 | §11 本批行 ∥ §12 N79/N81 ∥ B76 ∥ E59 ∥ §13 行账 |
| 2 | 凭据入口 = 结构化弹窗两挂载（沙盒页节点行动作 ∥ 对话页钮；聊天文本非通道） | SANDBOX §3 ∥ KD-SV-134 ∥ `webui/SANDBOX.md` §2.1① ∥ `webui/CHAT.md` §2.1 | N79 ∥ CHAT §4 本批行 ∥ SANDBOX §4 沙盒页行 |
| 3 | `exec`（SSH）进 chat（八件；绑定主机行；三单源；掩蔽含行凭据值） | `agent/ADMIN-AGENT.md` §12 表（exec 行） ∥ §9 KD-SV-136 ∥ §7 判据行 | §8 N83 ∥ B79 ∥ E61 ∥ SANDBOX §12 N80/N82 ∥ B77/B78 |
| 4 | 托管接入凭据移交（keep 成功 ⇒ 写主机行 + run 行零化 + `'moved'`；v19 回填移交） | SANDBOX §3 主机凭据块 ∥ §2（v19） | N81 ∥ B76 |
| 5 | 合并路线 = run 退场三步（定形分步，实施随用户）；R71⑥ 撤回 | SANDBOX §3 ∥ KD-SV-135 ∥ ADMIN-AGENT §5/§10/§13/§16.2 | 设计在档（逐步成批——不中途砍） |
| 6 | 收正面（exec 入 chat 句 ∥ 凭据入口句 ∥ 与 sk 面分工 ∥ 主机表常驻射程注） | ADMIN-AGENT §9 KD-SV-90 行 ∥ §10 ∥ §12 ∥ SANDBOX KD-SV-84 行射程注 ∥ CHAT §2.1 | 设计在档（逐处 = 变更记录） |

**明确不在本批（边界）**
- 装机三件（`register`/`verify`/`report`）不进 chat——装机 = 本批仍任务式（沙盒页托管接入弹窗）；run **不停用**（步 0 = 两形并存）。
- 产品码零触（设计轮）：`src/**`、prompts、测试件均未动。
- 冻结域（`store/STORE.md` ∥ `gateway/API.md` ∥ `accounts/ACCOUNTS.md` ∥ `requirements/PROJECT.md`）——B2 评审 #285 期禁写；清单 = SANDBOX §16 R72②③（待父侧/解冻后）。
- `exec` 余项（PTY ∥ 文件传输 ∥ 异步 ∥ 脚本 DSL ∥ 一主机多凭据 ∥ TTL）= SANDBOX §15。

**受影响文件（设计估——全清单 = `sandbox/SANDBOX.md` §13 ∥ `agent/ADMIN-AGENT.md` §6 ∥ `webui/SANDBOX.md` §3 ∥ `webui/CHAT.md` §3）**
- 新增：`thincoder-server/src/sandbox/hosts.mjs` ≈140 ∥ `thincoder-server/public/host-credential.mjs` ≈110 ∥ `docs/batches/2026-10-12-admin-chat-creds-merge.test.mjs` ≈420。
- 改：`src/sandbox/registry.mjs` **536** ⇒ ≈561（拆档预案：队列死件外拆 `registry-queue.mjs`） ∥ `src/sandbox/onboarding.mjs` **373** ⇒ ≈400 ∥ `src/sandbox/routes.mjs` ⇒ ≈459 ∥ `src/store/db.mjs` **488** ⇒ ≈560（v19；拆档预案：`store/schema.mjs`） ∥ `src/agent/chat-tools.mjs` **477** ⇒ ≈540 ∥ `src/agent/chat.mjs` **588** ⇒ ≈600 ∥ `src/agent/chat-env.mjs` 94 ⇒ ≈97 ∥ `public/views-sandbox.mjs` **376** ⇒ ≈415 ∥ `public/views-chat.mjs` ≈431 ⇒ ≈441 ∥ `i18n-{zh,en}-sandbox.mjs` +≈12 键/表 ∥ `i18n-{zh,en}-admin.mjs` +3 键/表。
- 文档（本批已改——doc face only）：`sandbox/SANDBOX.md` ∥ `agent/ADMIN-AGENT.md` ∥ `webui/SANDBOX.md` ∥ `webui/CHAT.md` ∥ `design/PROJECT.md`。

**验收判据（机检面）**：SANDBOX §11 本批行 + §12（N79–N82 ∥ B76–B78 ∥ E59/E60） ∥ ADMIN-AGENT §7 本批行 + §8（N83 ∥ B79 ∥ E61） ∥ `webui/SANDBOX.md` §4 沙盒页行（续扩） ∥ `webui/CHAT.md` §4 本批行；批内件 = `docs/batches/2026-10-12-admin-chat-creds-merge.test.mjs`（拟新增——入 server 链）。收口轮 = 浏览器实走（两处录入 ⇒ chat `exec` 一条 ⇒ 撤销 ⇒ 再 exec 拒）+ 真机（ECS `.6`：录真凭据 ⇒ `exec` 读数 ⇒ 撤销）；门禁 = doc-check 零新增红（基线 = 26 条悬空——跑后复核）。

**披露 / 上抛**
- [上抛·待裁] R72①：需求档回笔建议（功能点 47 + AC-47 + §5 合并方向）——写法/编号 = 主 agent 定。
- [上抛·待裁] R72②：冻结域随正三件（`store/STORE.md` v19 ∥ `gateway/API.md` 两端点+行形 ∥ `accounts/ACCOUNTS.md` 两 kind）——解冻后父侧落。
- [上抛·知会] 段号 **v19** = as-of（v17/v18 在途——实施当刻以链尾实读为准）；用例编号 = 现盘最大 +1（SANDBOX 域 N79+ ∥ B76+ ∥ E59+；agent 域 N83+ ∥ B79+ ∥ E61+）。
- [上抛·知会] 越线拆档预案两条（`registry.mjs` ∥ `db.mjs`——见上）；`onboarding.mjs` 加解密三件 as-of = B2 批 `credential-crypto.mjs`（实施轮以盘面实读为准，绝不并存两份）。

**设计档指针**：`sandbox/SANDBOX.md` §3 主机凭据块（裁定全文） ∥ §14 KD-SV-133/134/135；`agent/ADMIN-AGENT.md` §12（exec 行） ∥ §9 KD-SV-136；`webui/SANDBOX.md` §2.1①；`webui/CHAT.md` §2.1。

### admin-chat-creds-merge 批 · fix 轮（冻结域随正三档——R72② 解冻后落）

**轮次与授权**：fix 轮（父侧派单——B2 评审 #285 已终 ∥ #287 冻结域不含此三档 ⇒ 三档解冻）。内容 = §16 R72② 清单逐项（**零新语义**——转录 §3 主机凭据块 ∥ §14 KD-SV-133–135 既有规格）。

**落点（逐处 file:line）**

| # | 档 | 落点 |
|---|---|---|
| 1 | `store/STORE.md` | §1 版本链 17 ⇒ **19**（v19 条 + 段号 as-of）∥ §2 标题随正（v2–v19）+ **v19 增段**（`:492`）∥ §3 迁移链 v19 行（`:543`）∥ §4 db.mjs 预算 +≈72（`:549`） |
| 2 | `gateway/API.md` | §1 沙盒族行方法面补 `PUT`（`:17`——一致性项）∥ §2.5 主机表行形增 `ssh` 元数据（`:130`/`:131`）∥ **增两端点行**（`:133`/`:134`）∥ 托管接入列表行 `credential.state` 四值（`:163`） |
| 3 | `accounts/ACCOUNTS.md` | §2.1 `sandbox_event` 两 kind（`host_credential_set`/`host_credential_revoke`）+ 写入点补 `sandbox/hosts.mjs`（拟新增）（`:71`） |
| 4 | 三档变更记录各一笔 | `store/STORE.md:596` ∥ `gateway/API.md:454` ∥ `accounts/ACCOUNTS.md:255` |

**doc-check 归因（上轮 26 ⇒ 32 之 +6——逐行核过）**：+6 **全属本批面**（上轮三档新引用未带「拟新增」标记 ∥ 简写路径不可解析），本笔已收 ⇒ 悬空回基线 **26**：

- `design/PROJECT.md:696`（`src/sandbox/hosts.mjs`）∥ `:698`（`public/host-credential.mjs`）——补「拟新增」标记。
- `agent/ADMIN-AGENT.md:262`（`sandbox/hosts.mjs` 补标记 ∥ `agent/tools.mjs` ⇒ 全路径 `thincoder-server/src/agent/tools.mjs`）。
- `sandbox/SANDBOX.md:245`（`sandbox/onboarding.mjs` ⇒ 全路径 ∥ `store/credential-crypto.mjs` ⇒ 全路径 + 标记）。
- 余 26 = 基线存量（**非本批面**——桌面端 `views/chat.mjs` 一族 ∥ core 代档残引 ∥ `docs/server/requirements/PROJECT.md:644`：如实报，不入本批）。

**披露 / 上抛**

- [上抛·知会] §1 头部「当前」值链：实现读数 = **16**（`db.mjs` `MIGRATIONS` 止 v16）⇒ B2 批置 17 ⇒ 本笔按 R72② 落 **19**（as-of 句随 v19 条）。
- [上抛·知会] 越界说明：本笔触 `design/PROJECT.md` ∥ `agent/ADMIN-AGENT.md` ∥ `sandbox/SANDBOX.md` 三档（派单禁止清单列「已定稿」）——处置依据 = 派单 ⑤「本批面 ⇒ 收」；笔法 = 「拟新增」标记 / 全路径收正（零新语义、可 revert）。
- [上抛·知会] 拆档预案名跨档不一：`store/STORE.md` §4 作 `src/store/migrations.mjs` ∥ `sandbox/SANDBOX.md` §13 作 `store/schema.mjs`（同一预案两名——建议收一声明面，父侧裁）。

**行号补正（上表为收笔前读数；超宽换行收尾后终值）**：`store/STORE.md` v19 增段 `:493` ∥ §3 v19 行 `:544`（判据续行 `:545`）∥ §4 db.mjs 行 `:551` ∥ 本档变更记录 `:598`。其余各档行号不变（`gateway/API.md` `:17`/`:130`/`:131`/`:133`/`:134`/`:163`/`:454` ∥ `accounts/ACCOUNTS.md` `:71`/`:255` ∥ `design/PROJECT.md` `:696`/`:698` ∥ `agent/ADMIN-AGENT.md` `:262` ∥ `sandbox/SANDBOX.md` `:245`）。

**闸面终读（本笔收尾后 rerun——一次）**：悬空 **26**（= 基线；本批零新增红）∥ 行宽 **OK**（源域全 .md 无 >300 字符单行；本笔引入的三行超宽已换行收正）∥ 拟新增 84（基线 78 + 本批六处标记）。

### admin-chat-creds-merge 批 · fix 轮 1（设计评审 §3 轮次 1 之 1–14 逐条落）

**轮次与授权**：fix 轮 1（父侧派单——§3 轮次 1 发现表 14 条：🔴 2 ∥ 🟡 7 ∥ 🔵 5；含父侧裁定一处——发现 2 取 ①「凭据类域行保留 + KD-SV-91 明写例外 + 用例腿」）。**零新语义**（逐条 = 评审发现直接导出项 + 同类连带收正，见下）；全笔 = 设计档面（五档），产品码/测试件零触。

**落点（逐条——号 → 改动 file:line；行号 = 落笔前读数）**

| 号 | 落点 |
|---|---|
| 1 | `agent/ADMIN-AGENT.md:157` KD-SV-90 行按 KD-SV-136 收正（管理面**八件** ∥ `runners` 动词 + `revoke_credential` ∥ `exec`（SSH）**入 chat**（主机表行绑定——文本非通道）∥ 被否栏旧项「chat 内收 SSH 凭据」删 + 新项「`exec` 不入 chat（用户 2026-10-12 裁撤）」入）；`PROJECT.md:391` §4 索引 KD-SV-90 行同拍 |
| 2 | `agent/ADMIN-AGENT.md:158` KD-SV-91 增**凭据类例外**句（`runners.revoke_credential` chat 径 ⇒ 域行 + `chat_call` **两行**）；`agent/ADMIN-AGENT.md:260` runners 行动词句补「两行」注 ∥ `:100` §7 ⑥ 补审计两行腿；`sandbox/SANDBOX.md:464` N82 扩两径腿（chat 径两行） |
| 3 | `sandbox/SANDBOX.md:240`/`:380` ∥ `webui/SANDBOX.md:37` 三处「待父侧落」⇒「已落」；`sandbox/SANDBOX.md:585` R72①② 状态收正（① 已闭合〔功能点 47 ∥ AC-47 在册——`docs/server/requirements/PROJECT.md`〕∥ ② 已办〔三档 fix 轮落定〕） |
| 4 | `sandbox/SANDBOX.md:247`（移交句列全写入七列 + 接收行/未接收行两类）∥ `:248`（回填句两类同拍）∥ `:465` B76 拆两腿（接收行逐列值 ∥ 未接收行 NULL/`'none'`） |
| 5 | `webui/SANDBOX.md:50` `kind` 族 26 ⇒ **28**（+2——`host_credential_set` ∥ `host_credential_revoke`；系统部件两表）；`sandbox/SANDBOX.md:38` 后增「主机凭据增补（本批）：+2 kind」句；`webui/SANDBOX.md` §3 键族登记本条含 kind 两键 |
| 6 | `agent/ADMIN-AGENT.md:100` §7 结果形 ⇒「含四字段 + 指针（形全文 = §12 表）」；`sandbox/SANDBOX.md:462` N80 同拍 |
| 7 | `sandbox/SANDBOX.md:585` R72③ 重写：档目名单定为 **+1 名（`host-credential.mjs`）**（`views-sandbox-onboarding.mjs` 删）；逐随正件补「现读 ⇒ 净变 ≤±N」（读数见下）；`webui/CHAT.md:146` 同拍补 i18n admin 两表现读 |
| 8 | `sandbox/SANDBOX.md:247` 补「`'moved'` 读数口径」句（一次性终态——真伪以主机行 `credential_state` 为准） |
| 9 | `agent/ADMIN-AGENT.md:15`/`:249` ∥ `PROJECT.md:95` 三处「管理面七件」⇒「八件」 |
| 10 | `sandbox/SANDBOX.md:494` 小计 ≈+250 ⇒ **≈+278**（分项和）；`PROJECT.md:696`/`:828` 两块：服务端 ⇒ ≈+278 ∥ webui ≈+132 ⇒ **≈+193**（分项和）∥ `db.mjs` 行按段链给终值 ≈**646**（`sandbox/SANDBOX.md:490` 同拍；as-of 句在） |
| 11 | `webui/SANDBOX.md:75`/`:76` 表体量链收正（实读 **214 ∥ 214** ⇒ ≈**226 ∥ 226**）+ 跨批件键数链取当刻实读（**实读 854 ∥ 859 ⇒ ≈871 ∥ 876**）；`:98` 键数链同拍（同基线同链）；§3 补本批键族登记一条（+≈12 键 ∥ 两表同步 ∥ kind 两键 ∥ `admin.chat.*` +3） |
| 12 | `sandbox/SANDBOX.md:249` 后补「sudo 口令口径」句（命令含 `sudo -S` ⇒ 口令经 stdin 喂入；与任务面同单源——`thincoder-server/src/sandbox/ssh.mjs`） |
| 13 | `webui/SANDBOX.md:35` 「第三入口」⇒「运行面动作——与『添加节点』/『托管接入』并列；两挂载点口径 = `sandbox/SANDBOX.md` §3 KD-SV-134」 |
| 14 | `PROJECT.md`：`:828` 重复块删（合入 `:696` 块——保留用户裁句）；`:696`–`:700` 本批块数据收正（见 10）；增本批变更记录两条（设计轮回填 + fix 轮本条）；§9 增 **R72 保位 stub**（⇒ `sandbox/SANDBOX.md` §16） |

**读数（本笔全取当刻盘面实读——2026-10-12；口径 = 内容行数）**：结构断言件 **167** 行 ∥ `2026-10-10-runner-admin-console-ui.test.mjs` **529** ∥ `2026-10-11-admin-agent-chat{,-tools,-ui}.test.mjs` **719 ∥ 395 ∥ 395** ∥ i18n 沙盒两表 **214 ∥ 214** ∥ i18n admin 两表 **171 ∥ 175** ∥ i18n system 两表 **205 ∥ 205** ∥ 门面键数 **854 ∥ 859**（含在途批）∥ `audit.sandboxKind.*` 族 **26**（⇒ 28）∥ `admin.sandbox.*` 192 ∥ `admin.chat.*` 28。

**同类连带收正（非 §3 发现——一致性面；逐条列报）**：① `sandbox/SANDBOX.md:38` 「（本批）」陈指改批名（消两「本批」混指）；② `PROJECT.md:95`/`:36` 环境件数「五族七件」⇒「六族八件」（与 §14/KD-SV-113 现口径同拍）+ `PROJECT.md:95` agent 行 KD 枚举补 **129/130/131/136**；③ `PROJECT.md:163`/`:165` AC-47 状态句「建议入册」⇒「已入册」（2026-10-12 父侧落笔在册）；④ `PROJECT.md:94`/`:95` §3 地图行补本批批记；⑤ `webui/SANDBOX.md:67` `views-sandbox.mjs` 行补**实读 499**（⇒ ≈511——越 500 软线；档链 ≈415 = 陈估——列报）。

**上抛 / 披露（fix 轮）**
- [上抛·知会] i18n admin 两表「键数」口径存疑：`admin.chat.*` 实测 **28**，而 `webui/CHAT.md:145`/`:146` 分链载「27 ⇒ 36」/「36 ⇒ 39」——计数基准不可复算；本笔未动（非 §3 发现面），收敛处置请父侧裁。
- [上抛·知会] `views-sandbox.mjs` 实读 **499** 行（≈+84 于档链 ≈415；疑 tabs/volumes 落地越估）——本批 +≈12 ⇒ ≈**511** 越 500 软线，该件无拆档预案在册；非本批面，报备待裁。
- [上抛·知会] 冻结域 `store/STORE.md:513` 回填句与 `sandbox/SANDBOX.md:465` B76 同形——按「冻结域勿重写」令未动；如需同拍另笔落。

**闸面终读（fix 轮收尾——单跑一次；工具 = `node scripts/doc-check.mjs`，仓根 = `d:\teamcode\thincoder`）**：悬空 **28**（vs 本批前载基线 26——**+2 均非本笔面**：`docs/server/design/project/PROJECTS.md:33`「`src/project/projects.mjs`」（B2 批面——文件实存、路径前缀形未解析）∥ `docs/server/requirements/PROJECT.md:655`「`chat.mjs:367-390`」（主 agent 面——as-of 坐标）——两条处置权归各自笔主，列报）；**行宽 OK**（首跑 5 行超宽 = 本笔新引入 ⇒ 就地换行收正后复跑归零：`PROJECT.md` ∥ `sandbox/SANDBOX.md` ∥ `webui/CHAT.md` ∥ `webui/SANDBOX.md`×2）；拟新增 52 ∥ 迁移期引文 339 ∥ 声明源缺位 0 ∥ 用例号悬空 0 ∥ 符号·窄悬空 0。本笔面（五档 + 批档）在闸 = 零新增悬空、零宽超。

**交付面**：五档（`sandbox/SANDBOX.md` ∥ `agent/ADMIN-AGENT.md` ∥ `webui/SANDBOX.md` ∥ `webui/CHAT.md` ∥ `PROJECT.md`）+ 本批档 §2；产品码/测试件零触（设计档面笔）。

## §3 设计评审（评审子代理）

### 轮次 1（评审子代理）

本轮发现表（admin-chat-creds-merge 设计评审 · 轮 1 · 全设计面 8 档）：

| # | 类别 | 严重度 | 问题 | 建议 |
|---|------|--------|------|------|
| 1 | 一致性（机制相抵） | 🔴 | `agent/ADMIN-AGENT.md:157` KD-SV-90 行仍载「`exec`（SSH）**不入 chat**（凭据 = 任务表单专有——KD-SV-84 面不破）」（动词列亦无 `revoke_credential`），与本批新行 `agent/ADMIN-AGENT.md:174`（KD-SV-136「**chat 工具面扩 = `exec`（主机表行绑定）＋ `runners.revoke_credential`（七 ⇒ 八）**」）直接相抵；同档变更记录 `agent/ADMIN-AGENT.md:458` 却自称「§9 KD-SV-90 行：`exec` 入 chat + 被否栏旧项删/新项入」（实际未收）；板档索引 `PROJECT.md:391` 亦仍载「exec 不入 chat」 | 按 KD-SV-136 收正 KD-SV-90 行（决策句 + 动词列 + 被否栏旧项）与板档 §4 索引该行，使 KD 面与 §12/§7 同拍；变更记录自述与实际不一致处随收正落一句实测口径 |
| 2 | 一致性（审计口径相抵） | 🔴 | chat 侧 `runners.revoke_credential` 声明落域审计行（`agent/ADMIN-AGENT.md:260`「`revoke_credential` ⟮id——主机表凭据零化 + 审计 `host_credential_revoke`⟯」；`agent/ADMIN-AGENT.md:174` 同义），与同档「不双记」口径相抵——`agent/ADMIN-AGENT.md:158`（KD-SV-91「**不双记**既有域型（agent 建成员 ⇒ 只 `chat_call` 行）」）∥ 同表成员行 `agent/ADMIN-AGENT.md:255`（「chat 侧 = 只 `chat_call` 行——KD-SV-91」）；§7 判据行与用例（N80/N82/E60）对该动作审计行数无腿，实施无判据 | 二择一并两处同拍：① 若凭据撤销须留域行 ⇒ 在 KD-SV-91 明写凭据类例外 + 补一条用例腿（chat 径 ⇒ 两行）；② 若沿不双记 ⇒ 删 chat 动词句中的域行（chat 径只 `chat_call`，域行走端点径） |
| 3 | 文档状态（R7a） | 🟡 | R72② 三档实际已随正落盘（`store/STORE.md:598` ∥ `gateway/API.md:454` ∥ `accounts/ACCOUNTS.md:255` 三处变更记录均记「**冻结域随正（fix 轮）**」），设计面仍留未办标记：`sandbox/SANDBOX.md:240`（「行文 = `gateway/API.md` §2.5 待父侧落」）∥ `sandbox/SANDBOX.md:380`（「`gateway/API.md` §2.5（待父侧落）」）∥ `webui/SANDBOX.md:37`（「端点 = `gateway/API.md` §2.5（待父侧落）」）∥ `sandbox/SANDBOX.md:585`（「冻结域随正清单（B2 评审 #285 期间禁写——解冻后父侧落/另轮）」） | 三处改指「已落（端点行 = `gateway/API.md` §2.5）」；R72② 清单改「已办」，只留未办项（需求档回笔） |
| 4 | 清晰度/判据 | 🟡 | `keep` 移交与 v19 回填写入字段集未定形——`sandbox/SANDBOX.md:247` 只写「**移交**：密文写入该 runner 行（`sealed`）」，未写 `ssh_user`/`ssh_port`/`auth_kind`/`sudo_cipher`/`credential_updated_at` 是否随迁（缺则主机行凭据对 `exec` 不可用）；判据 `sandbox/SANDBOX.md:465`（B76「既有 runners 行新列 = NULL/`none`（零伪造回填）」）与同腿「成功行 ⇒ 移交」在同一 fixture 上相抵（`store/STORE.md:513` 同形） | 移交句列全写入字段（含 `state='sealed'` ∥ 时间列）并标明「接收行 ∥ 未接收行」两类；B76 拆两腿（接收行逐列值 ∥ 未接收行 NULL/`none`） |
| 5 | 一致性（消费面随正） | 🟡 | 两新 kind 消费面未随正：① 审计页 `kind` 族文案键未登（`webui/SANDBOX.md:50` 记「`kind` 族 26 键」，本批 +2 ⇒ 28）；② 本域审计 kind 枚举句止于镜像源批（`sandbox/SANDBOX.md:38`「**镜像源增补（本批）**：`sandbox_event` 增三 kind」），本批两 kind 未列；kind 单源已含（`accounts/ACCOUNTS.md:71`「`host_credential_set`（detail 键集 = `kind`+`runnerId`+`sshUser`+`authKind`——零秘密）」） | `webui/SANDBOX.md` §3 键族登记补 kind 两键并随正计数（26 ⇒ 28）；`sandbox/SANDBOX.md` §2 审计句补「主机凭据增补（本批）：+2 kind」 |
| 6 | 清晰度 | 🟡 | `exec` 结果形两处不一：`agent/ADMIN-AGENT.md:262`（「结果 = `{ ok, exitCode, stdout, stderr, summary, subject }`」）∥ `agent/ADMIN-AGENT.md:100`（「结果 `{ ok, exitCode, stdout, stderr }`」）∥ `sandbox/SANDBOX.md:462`（N80「结果 `{ ok, exitCode, stdout, stderr }` 逐值」）——子集关系，用例断言集不定 | 统一一处形（工具面表 = 全字段；判据/用例改「含四字段」+ 指针） |
| 7 | 受影响件清单/行数注 | 🟡 | R72③ 随正件两处不实/不全：① `sandbox/SANDBOX.md:585`（「档目断言件（`2026-10-08-server-public-structure.test.mjs`：+2 名——`host-credential.mjs` ∥ `views-sandbox-onboarding.mjs`）」）——`views-sandbox-onboarding.mjs` 全设计面无出场，同批档目记 +1（`PROJECT.md:828`「档目现行 **43 ∥ 44** ⇒ **44 ∥ 45**（+1 档）」）；② 三件测试件与两 i18n admin 表无现读/Δ 注（`webui/CHAT.md:146` 只给「+3 键」并外指「文件行账 = `webui/ADMIN.md` §3」） | 名单按实定为一档（`host-credential.mjs`）；逐随正件补「现读 ⇒ ≤±N」注（含两 i18n admin 表） |
| 8 | 语义悬空（R7d） | 🟡 | run 行 `'moved'` 语义只对移交当刻成立——`gateway/API.md:163`（「`state` ∈ `sealed` ∥ `burned` ∥ `revoked` ∥ `moved`——移交（凭据已入主机表行）」）与 `sandbox/SANDBOX.md:247`（「如实：凭据未销毁，在主机表」）；主机行随后 `DELETE …/credential`（`sandbox/SANDBOX.md:464` N82）后该句不再为真，未写回落/呈现口径 | 补读数口径一句（如「`'moved'` = 一次性终态，真伪以主机行 `credential_state` 为准」）或 run 列表派生显示 |
| 9 | 计数漂移（R7c） | 🔵 | 「管理面七件」残留三处与本批八件不合：`agent/ADMIN-AGENT.md:15`（「任务五件 §3 + 管理面七件 §12」）∥ `agent/ADMIN-AGENT.md:249`（「## 12. 工具面扩展（管理面七件——本批）」——表内已八行）∥ `PROJECT.md:95`（「**工具面扩展七件（§12）**」） | 三处随正为八件（§6/§7 已八件） |
| 10 | 读数/合计链 | 🔵 | ① `sandbox/SANDBOX.md:494`（「**本批（admin-chat-creds-merge）：≈+250**」）与分项和（140+25+27+14+72 ≈ 278）不合；`PROJECT.md:828` 同数，其「webui ≈**+132**」与分项和（110+39+10+12×2+3×2 ≈ 189）不合；② `db.mjs` 终值 ≈560 与在途段链不合——`store/STORE.md:551`（「实读 **488**（2026-10-12——team-projects-permissions 批设计轮现读）⇒ ≈**560**（本批：v17 段」）后再 +≈14（v18）再 +≈72（v19），而 `sandbox/SANDBOX.md:490` ∥ `PROJECT.md:696` 把 ≈560 记为 v19 单独结果 | 两处小计按分项和收平；`db.mjs` 行按段链给终值或显式标 as-of（含 v17/v18 在途增量） |
| 11 | 键数链 | 🔵 | 两套基线并置：`webui/SANDBOX.md:75`/`:76`（「跨批件指纹/键数随正 **608 ∥ 613 ⇒ ≈620 ∥ 625**」）∥ 同档 `webui/SANDBOX.md:98`（「键数 **691 ∥ 696 ⇒ 693 ∥ 698**」，2026-10-12 笔 10）；本批亦未在 §3「键族登记」段立条 | 键数基线取当刻盘面实读并两处同链；§3 键族登记补本批一条（+≈12 键 ∥ 两表同步） |
| 12 | 口径缺（澄清） | 🔵 | `exec` sudo 径未定形——凭据面含 sudo 口令（`sandbox/SANDBOX.md:240`「体 `{ sshPort?, sshUser, auth: { kind, secret }, sudoSecret? }`」），用例含 sudo 腿（`agent/ADMIN-AGENT.md:142`「一轮 `exec`（含 sudo 径 + 输出含行凭据值的构造腿）」），但 `execOnHost`/工具形未写口令如何入命令 | 在 §12 或 §3 补一句 sudo 口径（命令形 ∥ 口令入 stdin 判定），与任务面 `ssh.mjs` 口径同拍 |
| 13 | 措辞（易误读） | 🔵 | `webui/SANDBOX.md:35`（「节点行「SSH 凭据」动作（第三入口——添/托管接入之外）」）易读作三处入场，与 KD-SV-134「两挂载点、**同一弹窗件、同一端点**」（`sandbox/SANDBOX.md:242`）并置生歧义 | 改为「运行面新动作（与添节点/托管接入并列）」或直引两挂载点口径 |
| 14 | 记录面（板档） | 🟡 | `PROJECT.md` 未载本批「变更记录」条目（记录段最末同类条目 = `PROJECT.md:826` console-chat-live-step 行），而 §2.1/§3/§4/§6/§7 均已因本批随正；且本批 §6 块两处重复（`PROJECT.md:696`「**admin-chat-creds-merge 批（台账 #1326；KD-SV-133–136）**：服务端 ≈**+250**」 ∥ `PROJECT.md:828` 同数据块，仅裁句/括注略异） | 补一条本批变更记录（列逐面随正点）；§6 只留一处本批块 |

计数：🔴 2 ∥ 🟡 7 ∥ 🔵 5（共 14 条）

VERDICT: changes-required

### 轮次 2（评审子代理）

复核口径：轮 2 复评（核验 fix 轮 1 之 14 件落点）——范围 = 五档现文（`sandbox/SANDBOX.md` ∥ `agent/ADMIN-AGENT.md` ∥ `webui/SANDBOX.md` ∥ `webui/CHAT.md` ∥ `design/PROJECT.md`）；fix 记录 14 件中 13 件落点核实到位（#1 三处「待父侧落 ⇒ 已落」∥ #2 凭据类例外两行 ∥ #3 R72①② ∥ #4 七列/两类/B76 双腿 ∥ #6 四字段 + 指针 ∥ #7 现读 + 档目 +1 名 ∥ #8 `'moved'` 读数口径 ∥ #9 七 ⇒ 八三处 ∥ #10 服务端 ≈+278 与 db 段链 ≈646（488 ⇒ 560 ⇒ 574 ⇒ 646 复算平） ∥ #11 i18n 三组键 ∥ #12 sudo 口令口径 ∥ #13 「运行面动作」 ∥ #14 §6 块合一），#5 只半落（两 kind 句在，批名改写未落）。

| # | Category | Severity | Issue | Suggestion |
|---|----------|----------|-------|------------|
| 1 | 文档卫生（fix 落点核验） | 🟡 | fix 轮自陈「同句陈指「（本批）」改批名」（`sandbox/SANDBOX.md:625`），但该句现文仍为「**主机凭据增补（本批）**：`sandbox_event` 增两 kind」（`sandbox/SANDBOX.md:39`）——同族两句皆作批名（`:37`「（v13 批）」∥ `:38`「（sandbox-image-sources 批）」）。 | 将 `sandbox/SANDBOX.md:39` 括注改为批名（`admin-chat-creds-merge 批`），与同族同形。 |
| 2 | 受影响文件尺寸注解 | 🟡 | `views-sandbox.mjs` 实读 499 ⇒ ≈511（`webui/SANDBOX.md:68`：「越 500 软线，处置另裁」）——跨 500 软线无拆分预案/维持判句；同批姊妹件皆有（`registry.mjs` ⇒ ≈561 预案 `sandbox/SANDBOX.md:482` ∥ `db.mjs` ⇒ ≈646 预案 `:496` ∥ `chat-tools.mjs` ⇒ ≈540「维持 + 上限 700」`agent/ADMIN-AGENT.md:64`）。 | 按姊妹件同形补一句（维持 + 触发线，或拆分预案；口径沿 `store/STORE.md` §4 先例）。 |
| 3 | 文档状态一致（fix 落点核验） | 🟡 | `PROJECT.md:392`（历史段·原 §4 冻结块内）KD-SV-90 行已改写为「管理面八件…`revoke_credential`…KD-SV-136」——含 2026-10-12 事实，与冻结声明「原样（旧坐标至此解析）——历史记录，不逐条改写」（`:302`）相抵；同块姊妹行 `:384` 仍为迁移前原样（「本批扩管理面七件——KD-SV-90」）⇒ 同块混代；该改写 = fix 记录 `:833` #1 所陈「§4 索引 KD-SV-90 行收正」之落点。 | 冻结块回归迁移前原样（现值以域档 KD 节/live 段为准）；若要索引面携 KD-SV-136 指针，落在 live §4 的 sandbox/agent 两行并同步姊妹行口径。 |
| 4 | 清晰度 / 验收可判 | 🟡 | `exec` 的 `timeoutS` 无缺省值与上下界：`agent/ADMIN-AGENT.md:262`（§12 行）与 `:31`（§3 任务件行）皆只列签名；而 `:144` E61 以「`timeoutS` 非法」为判据——该腿无可机检锚点（对照：同档 `bash` 超时有明确定形 `:332`「缺省 120_000 ms ∥ **无上限**…」）。 | 补 `timeoutS` 缺省值与取值范围（越界 ⇒ 工具级错误的判据），使 E61 可机检。 |
| 5 | 数字漂移 | 🔵 | `PROJECT.md:701` webui ≈**+193** 自称「分项和」，按行内分项与他处增幅复算 ≈166（≈110 ＋ ≈12 ＋ 10 ＋ 24 ＋ 6 ＋ 4）差 ≈27；同行 `views-sandbox.mjs` 仍书目标值「⇒ ≈415」（陈估），与拥有档「实读 499 ⇒ ≈511」（`webui/SANDBOX.md:68`）不同值；`webui/SANDBOX.md:79` 面小计仍 ≈2226 未折本批（对照 `webui/CHAT.md:129` 已折 +≈10）。 | 补齐分项（或补列未列件）；`views-sandbox.mjs` 目标值与面小计取当刻实读。 |
| 6 | 数字漂移 | 🔵 | `sandbox/SANDBOX.md:481` routes 行「余量 ≈41（450 ⇒ ≈459）」与本行实读 442（volumes +2 ∥ 本批 +≈14 ⇒ ≈458、余量 ≈42）及 `:502`「≈444——余量 ≈56」两条链不齐；「450」来源未注。 | 统一基数（442 起点）并按同链复算余量。 |
| 7 | 文档卫生 | 🔵 | `sandbox/SANDBOX.md:491`（`ssh.mjs`）与 `:493`（`onboarding-routes.mjs`）两行仍标「拟新增」+设计估，与 `agent/ADMIN-AGENT.md:31`「`thincoder-server/src/sandbox/ssh.mjs`（已落盘——系统 openssh，KD-SV-85）」相抵；`:504` 清账句只点名 `rules.mjs`/`credentials.mjs` 两档。 | 两行标记随实读收正，或纳入同批清账句口径。 |
| 8 | 数字漂移 | 🔵 | 规范面计数陈值两处：`webui/CHAT.md:47`「管理面工具**七件**无文件编辑族」（现口径八件——`agent/ADMIN-AGENT.md:249` §12 题 ∥ `:262` `exec` 行）；`sandbox/SANDBOX.md:488`「预选表**六条**」（现七条——`:153` 清单七条 ∥ `:382`「预选七条在册」）。 | 两处计数随现口径收正（结论句不变）。 |
| 9 | 边界情形覆盖 | 🔵 | 口令径宿主前提在 chat `exec` 面无对应句：任务面有「S2 先检本机 `sshpass`…缺 ⇒ 停 + 报因」（`sandbox/SANDBOX.md:113`），而 §3 主机凭据块/`agent/ADMIN-AGENT.md:262` `exec` 行与用例 E59/B77/B79 皆未提该前提。 | 补该前提的处置句（检查并报因，或明确沿「传输级失败 ⇒ `ok:false` + 人话」兜底）并落对应用例腿。 |

范围外注（无严重度）：本设计对范围外档的断言（`store/STORE.md` §2 v19 段/CHECK 重建/回填移交 ∥ `gateway/API.md` §2.5（已落）两端点 ∥ `accounts/ACCOUNTS.md` §2.1 两 kind ∥ 需求档功能点 47 ∥ AC-47）与 R72③ 内测试件的「现读/净变」数，按本次评审范围（五档）不可核——未视为缺陷，登记为不可核项。项目标准档与文档地图未声明 ⇒ Document-ownership 判据降级（仅对 Project Guide 核对）。

计数：🔴 0 ∥ 🟡 4 ∥ 🔵 5

VERDICT: pass

## §4 用户批准（主 agent）
## §5 实施记录（eng-coder）
## §6 验证与收口（父代理）
