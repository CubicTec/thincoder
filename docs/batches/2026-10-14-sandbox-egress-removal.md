# 2026-10-14 · 沙盒出站闸整套摘除
> 六段 append-only，一段一作者：§1 讨论（主 agent）· §2 批次任务与设计（eng-designer）· §3 设计评审（评审子代理）· §4 用户批准（主 agent）· §5 实施记录（eng-coder）· §6 验证与收口（父代理）。
> 编制：主 agent · 2026-10-14 · 来源 = 用户 2026-10-14 20:32 裁定「整套摘除，待批那个是根本原因，那真是个无比愚蠢的设计。」（承台账 #1433 ② 路；20:35「ok」= 建批开跑）。
> 台账 = #1433（server · 归批）。前情 = 无（独立批）。
## §1 讨论（主 agent）
**状态行**：已收口 2026-10-14
<§1 模板占位：本批条目 / 关键判据 / 授权口径>

**讨论与授权（2026-10-14）**

- **来源**：用户 20:32 裁定（原话：「整套摘除，待批那个是根本原因，那真是个无比愚蠢的设计。」）——承台账 #1433（沙盒出站闸「关」态不回收节点规则——残留表掐死盒出站，2026-10-14 拆除实录）；处置路 **② 整套摘除**。20:35 用户「ok」= 建批开跑。
- **事故链（本日实录）**：runner（.6）残留 `table ip tc_sandbox`（除死代理 `172.18.0.1:3128` 外全 DROP）⇒ 盒出站 100% 黑洞（拉仓全败）；`egressEnforce=false` 时服务端只「不下发」不「回收」节点规则。手工拆除后复通（盒→gitee 200/251ms）；备份锚 `/root/nft-backup-20261014.txt`（.6，可原样回滚）。用户同日两次表态：原型期不搞安全阻挡（「不要再原型还没跑通的时候搞什么安全！」）∥ 出网管控面押后。

**摘除面（父侧实读圈定——设计轮成逐处清单）**

| 面 | 坐标 |
|---|---|
| 闸本体 | `thincoder-server/src/sandbox/egress.mjs`（≈330 行——`NFT_TABLE`/`ensureEgressApplied`/`pushEgressRuleset`/`dispatchEgressAll` 族） |
| 域名闸 | `src/sandbox/dns-gate.mjs`（与 egress/rules 双向耦合——离闸无主，同族） |
| 规则引擎 | `src/sandbox/rules.mjs`（`evaluateEgress` 单源；499 行贴线） |
| 盒链 | `box.mjs` ③「闸就位复核」（建盒 `:310-316` ∥ 启动 `:347` ∥ 轮换 `:420`）＋ DNS 注入 `:146` ＋ 临时集到点下发 `:604` |
| 路由 | `routes.mjs` 规则增删改三处下发（`:284/:303/:315`）＋ `egressState` 回包/警告（`:61-66`） |
| 成员面 | `views-me-sandbox.mjs` 待批列+10s 轮询（`:45/:51/:72/:98`）∥ `views-me-chat.mjs` 待批提示（`:68/:427/:441`）∥ 待批 i18n 键（`me.sandbox.colPending` 族）∥ `style.css:333/:380` |
| 审计/键 | `egress_apply_failed` kind（`views-audit.mjs:222` ∥ `i18n-*-system.mjs:212` ∥ `ACCOUNTS` 写入点） |
| 配置 | `sandbox.egressEnforce`（缺省 false） |
| 节点 | .6 已手工拆除（备份锚保留——处置待设计轮给建议） |
| 待勘察 | 管理侧出站规则 UI 落点（`views-sandbox*` 8 档扫零命中——连接面异名 ∥ API-only ∥ 未建）∥ `deploy/` 面（3128 代理安装件）∥ 测试族 ∥ 文档族逐处 |

**留守（本批变更范围之外——围栏带实读读数，非免审区）**

| 面 | 读数 |
|---|---|
| 资源上限（quota） | 已核：盒链步序独立（①卷 ②配额 ③闸——`box.mjs` 步各独立）；`quota.mjs` 持 `chattr/setquota` 族，零 egress 交——本批零触 |
| 工作区/盒链其余 | 已核：`stepEgress` 独立成步（`box.mjs:310-316`）；本批只摘 ③ 步 + 注入行 + 下发点——卷/容器/启动/轮换/回收/快照零触 |
| 拉仓/登记 | 已核：egress 引用集 = box ∥ dns-gate ∥ rules ∥ routes 三触发；成员凭据/项目源登记面不在其列——零触（「登记即放行」的放行句随闸亡 = 摘除面） |
| 主机凭据/SSH ∥ 镜像/终端/卷各面 | 已核：同引用集 grep 零 egress 交——零触 |

**连带处置（摘除落地时一并销账）**：#1249（P12 待批腿 ∥ P11 规则热生效——前提消亡 ⇒ 撤回；P10/P14 保留）∥ #1398（F 链前置判点随闸 ⇒ 撤回）∥ #1352（`rules.mjs` 拆案——对象消亡 ⇒ 撤回）∥ #1397（建盒链失败审计四 kind 面收窄）。

**授权口径**：本批 = 设计轮先行（摘除全清单 + 留守复核 + 迁移处置 + 测试/文档随正）→ 评审（用户点火）→ 批准 → 实施。需求档 = 父侧笔（设计席零触，发现相抵处列报）。

**迁移七行裁定（2026-10-14 20:46——用户）**：用户原话「可以。全照建议」⇒ §2「迁移方案表」七行**全照设计席建议**：① 表 `sandbox_rules` ② 表 `sandbox_pending` = **停机留史**；③ 键 `sandbox.egressEnforce` ④ 键 `pendingTimeoutSeconds` = **撤**；⑤ 审计 kind `egress_apply_failed` = **撤**（历史行原值兜底）；⑥ 备份锚 `/root/nft-backup-20261014.txt` = **销**；⑦ 节点残留复核 = **收口轮真机**。执行序 = **先核（7）后销（6）**。§2 表内「[待裁]」标记随之解除（定案以本行为准）。

**连带追加（2026-10-14 21:05 父侧复核——评审发现 1 求真）**

- 登记即放行（`ensureProjectAllow` 面）**从未落成**：成员面批记录 `docs/batches/2026-10-13-member-face-chat.md:441`「本舱不落、另批承接」+ `:445` R1「零实现」；父侧代码实读 = `thincoder-server/src` 全域零 `ensureProjectAllow` 命中（两式 grep 在案）。⇒ 该 carry-over **对象随闸亡**，摘除落地时一并**撤回**（`sandbox/SANDBOX.md:303`/`:620` 未落成解说句随设计档清面处置）；连带销账表加此行。
- 台账（工具面）：本条已挂新行（tech_todo · trigger=归批——落地时撤回）。

**修正轮上抛处置（2026-10-14 21:12——父侧裁）**

- **① §14 同族三档补列**（修正轮上抛——编号外）：`KD-SV-68`（出站两类同表两闸——机制亡）∥ `KD-SV-76`（网络层闸 nft/iptables——机制亡）⇒ **删**（段号空档——沿 KD-SV-83/86 先例）；`KD-SV-138`（成员面读面——行含「待批」字段）⇒ **收窄**（去「待批」列——沿 KD-SV-137 先例）。落点 = 清面轮并入 §2 文档随正清单第 2 行同拍。
- **② `mcp/MCP.md:111` 补列**（修正轮扩展词面清单外命中——「受沙盒出站约束——机制随该批另议」）⇒ 清面轮并入文档随正清单（处置同拍）。
- **③ 需求档余项**：扩展词面 23 行 vs 相抵处 16 组——余项（记录面/边界句/未列）由父侧**回笔时逐行核**（在册）。
- **④ 面外随正件**（`docs/TEST-ENV-ECS.md` 等）：**实施轮核**（含闸/待批/`--target` 句与否——在册）。

**父侧补记（2026-10-14 21:4x——轮次 2/3 结果 + 实施开跑）**：轮次 2 = 实质全过（十点全 Fixed + 🔵×1）但**机检引用面未过**（省略号×4 + 归属×2 ⇒ 令牌未发）→ 按链序重跑轮次 3（引用纪律 = 连续原文 ∥ 零省略号 ∥ 两处先实读）⇒ **VERDICT pass**（§3 轮次 3 在册；剩余 🔴 = 0）。🔵 余项（`rules` 半句——`§14 件表` 行实档不存在）= 并入清面轮清单同拍（删半句 ∥ 或改指 `docs/server/design/sandbox/SANDBOX.md:595`）。§4 = 代签在册 → 实施段开跑（4 派：码面 ×2 ∥ 清面 ×1 ∥ 单测档 ×1；需求档回笔 ∥ 跨批指纹族 = 父侧笔）。

**父侧裁（2026-10-14 22:0x——#24 上抛一件）**：`approval` 审计 kind（`views-audit.mjs:213` + 两 i18n `:199`）= **撤**。依据 = 发射器随闸退场（`thincoder-server/src` 全域「approval」仅余 `migrations.mjs:228` 史枚举 ∥ `run.mjs:17` TRIMMED_FACES——均判无对象）；先例 = I2 `egress_apply_failed` 同族处置；历史行回落原值显示（`views-audit.mjs:228` 兜底在位、零改）。落 = fix 轮 1（三档；三表闭合 −1/表）。

**父侧代执行（2026-10-14 22:1x——#26 跨批写闸上抛的裁定落办）**：测试清单五档 = 两删 + 三改，父侧直落（跨批权限——沿「父侧直接执行 · 可 revert」标注）：① `2026-10-13-sandbox-exec-rebuild-egress.test.mjs` 删 ∥ ② `2026-10-14-egress-probe-fix.test.mjs` 删 ∥ ③ `2026-10-13-sandbox-outbound-member-face.test.mjs` 闸面九腿删 + 成员行腿随正（`pending` 键退场）——实跑 **pass 1/1** ∥ ④ `2026-10-13-sandbox-outbound-member-face-ui.test.mjs` 待批列/提示行/10s 轮询腿删 + 键面 16⇒14 + IA 随正（我的 7——chat 批连带）——实跑 **pass 6/6** ∥ ⑤ `2026-10-13-sandbox-exec-rebuild.test.mjs` ③ 步/桥名锚/`Dns`/B77（设计 D2 判死）/E52（带入面亡）/`sandbox_pending` 断言随正——实跑 **pass 25/25**。附带随正：④ 档 IA 腿发现兄弟批残（`/me/chat` 导航——跨批闸同挡其手）已一并收正。

## §2 批次任务与设计（eng-designer）
**状态行**：设计完成（清面轮落笔（14 档 · 评审后一轮 · 披露在册））
<§2 模板占位：本批条目（覆盖） / 设计档落点 / 机制设计 / 受影响文件与测试覆盖 / 验收对照 / 关键决策 / 上抛项>

### 2. 批次任务与设计（eng-designer · 2026-10-14 · round = initial）

**来源与授权**：用户 2026-10-14 20:32 裁定「整套摘除，待批那个是根本原因，那真是个无比愚蠢的设计。」（承批档 §1；台账 #1433）。设计轮口径：零产品码 ∥ 零真机动作 ∥ 需求档零触（相抵处列报——见上抛 2）。

**最近先例（三坐标——实现坐标 ∥ 设计节 ∥ 先例批）**：sandbox-onboarding-removal（同日 · 托管接入〔任务式装机〕整退）——
- **实现坐标** = `src/sandbox/onboarding.mjs`（**354** 整档删）∥ `src/sandbox/onboarding-routes.mjs`（**103** 整档删）∥ `public/views-sandbox.mjs` ≈190 块删；
- **设计节** = `sandbox/SANDBOX.md` §3 托管接入块（删 + 承接句）∥ §2 表行「停机留史」注 ∥ §14 KD-SV-83/86 删（段号空档）+ KD-SV-135 收正；
- **先例批** = `docs/batches/2026-10-14-sandbox-onboarding-removal.md`。
- **对齐**（本批同形）= 整退（零钩子零 flag）∥ 表停机留史（零迁移）∥ KD 死对象删 / 存续面收正 ∥ 清面逐处 + 承接句出口 ∥ 需求档回笔（父侧笔）。
- **偏离** = 面更宽（闸三档 + 控制面 + 成员 UI + 探针腿 + 节点真机残留——先例 = 单功能面；其中**探针腿退场 ∥ 节点真机复核先例无对应物**）∥ 两表处置（先例 = 单表）∥ 拆案对象消亡联动（#1352——先例无对应物）。

**条目（本批覆盖——六条）**

| # | 条目 | 判据（可机检） | 回指 |
|---|---|---|---|
| ① | 闸本体三档整删（`egress.mjs` ∥ `dns-gate.mjs` ∥ `rules.mjs`） | 三档删净；`src/bin/public/deploy` 零 `egress/dns-gate` 引用 | §1 摘除面表行 1–3；#1433 |
| ② | 盒链收窄（③ 步 ∥ DNS 注入 ∥ 网段登记 ∥ 临时集重算 ∥ 链前置 ∥ 桥名锚） | 建盒链步 7 ⇒ **6**（无 ③）；载荷零 `Dns`；零 `sandbox_pending` 写 | §1 盒链行；事故链 |
| ③ | 路由/成员面收窄（规则四端点 ∥ 待批两端点 ∥ `pending` 字段 ∥ UI 列/提示/轮询） | 六端点注销；成员行无 `pending`；me 表 −2 键/表 | §1 路由/成员面行 |
| ④ | 配置与审计收窄（`sandbox.egressEnforce` ∥ `pendingTimeoutSeconds` ∥ `egress_apply_failed`） | 两键零引用；kind 零写入点 | §1 审计/键行 |
| ⑤ | 数据面与节点处置（两表 ∥ 备份锚 ∥ 残留复核） | 按裁定落；节点零残留读数 | §1 迁移处置 |
| ⑥ | 随正（测试族 ∥ 文档族 ∥ 探针五腿） | 删净判据（§7）全绿 | §1 待勘察四面 |

**明确不在本批**：需求档（= 父侧笔——相抵处列报）∥ 产品码（= 实施轮——本批零写）∥ 真机动作与镜像重建（= 收口轮）∥ 留守面（§4 围栏）∥ `src/gateway/proxy.mjs`（上游出口代理——与沙盒闸零交）∥ 段号/编号体系零重排 ∥ `data/gateway.db` 本机库零触。

**勘察结论（§1 待勘察四面——逐面实读）**

- **① 管理侧出站规则 UI 落点**：**未建（API-only）**。实读 `public/views-sandbox*.mjs` 八档 + 全域 grep `sandbox/rules`、`sandbox/pending`、`admin.sandbox.rule*`、`admin.sandbox.pending*` ⇒ 零命中；规则/待批仅 API（`routes.mjs:268-344`）+ 设计档「拟新增」行（`views-sandbox-egress.mjs`——从未建）。⇒ 本批 UI 摘除件 = **零**（仅两档设计档拟新增行删）。
- **② `deploy/` 面**：零代理安装件（`deploy/sandbox/` = `Dockerfile` + `member-shell/` 四件）。仅两处摘除：探针五腿（K 表）∥ `member-shell/pull.mjs` 待批文案（L 表）。
- **③ 3128 代理面**：**仓内零沙盒侧件**。全仓 `3128|172.18.0.1` 实读 = `src/gateway/proxy.mjs`（上游出口代理——模型网关用；config `proxy.uri`；管理面系统页有 UI）∥ `config.example.json:9` ∥ `README.md:30`——三处皆**非沙盒面**（与出站闸零交）。
  事故链死代理 `172.18.0.1:3128` = 节点残留表目标；残留表名/链名（`table ip tc_sandbox` ∥ `ws1_fwd`/`ws1_in`）**全仓零来源**（grep 实读）⇒ 判为工作区外/更早世代残留，非本仓现行产物；处置 = 节点复核 + 拆净（迁移表行 7）。
- **④ 测试族/文档族**：清单见 §6（测试 6 行 ∥ 文档 14 行）。

**摘除全清单（逐处 ∈ {删 ∥ 收窄}——file:line × 处置 × 依据；行号 = 2026-10-14 实读）**

**A · 闸本体（两档整删 + 规则档整删）**

| # | 坐标 | 处置 | 依据 |
|---|---|---|---|
| A1 | `src/sandbox/egress.mjs`（现读 **380** 行） | **删**（整档） | 闸本体（求值→文本→下发→就位态→临时集）；消费面三档（box ∥ dns-gate ∥ routes）同批摘 ⇒ 零存活消费 |
| A2 | `src/sandbox/dns-gate.mjs`（现读 **359**） | **删**（整档） | 域名闸 + 待批持答/裁定回填 + 网段归属判；消费面（bin ∥ routes ∥ workspace-routes ∥ box）同批摘 |
| A3 | `src/sandbox/rules.mjs`（现读 **498**） | **删**（整档） | 出站规则单源 + 待批队列 + 网段带入 + `evaluateEgress`；全导出面 = 闸（实读：消费面仅 A1/A2 + routes——零非闸消费；`ensureProjectAllow`〔登记即放行〕面复核 = **零实现**——成员面批档 `docs/batches/2026-10-13-member-face-chat.md:441`「本舱不落、另批承接」∥ `:445`；父侧全域 grep 零命中 ⇒ 无第三消费面）；carry-over 对象随闸亡 ⇒ 落地一并撤回（§1 连带追加在册；台账新行 tech_todo · 归批）；台账 #1352（拆案）对象随之消亡 |

**B · 盒链 `src/sandbox/box.mjs`（现读 686——收窄：净删 ≤100 ∥ 结构不变）**

| # | 坐标 | 处置 | 依据 |
|---|---|---|---|
| B1 | `:23`（import 五件） | 删 | 随 A1 |
| B2 | `:31`（`BOX_CHAIN_STEPS` ③ 项） | 删 | 步名表 7 ⇒ 6 |
| B3 | `:146`（`dns = egressEnforced(config) ? dnsServerOf(config) : null`）∥ `:157`（`hostConfig.Dns`） | 删 | 盒走 docker 缺省解析 |
| B4 | `:75-79`（`dnsServerOf`） | 删 | 唯一消费 = B3 |
| B5 | `:309-319`（`stepEgress`——含 `egress_apply_failed` 审计） | 删 | ③ 步本体 |
| B6 | `:347` ∥ `:375` ∥ `:420`（建盒/启动/轮换 ③ 步调用） | 删 | 三链步序 7/6/5 ⇒ 6/5/4 |
| B7 | `:325-329`（`assertServerAddress`）+ `:336`/`:359`/`:407` 三调用 | **删** | 其理由句逐字绑定闸面（「内置允许与盒 DNS 注入同源，双缺 ⇒ 盒静默断网」）；闸亡 ⇒ 死栅栏（保留会误停建盒）。决策 D2 |
| B8 | `:53-56`（`bridgeNameOf`）∥ `:193-199`（`assertBridge`）∥ `:206-224`（`stepNetwork` 内两处——Options 携桥名 + 读回复核） | **删** | 桥名 `tcws<id>` 唯一用途 = 闸锚（`iifname "tcws*"`；`:197` 逐字「锚不落 ⇒ 出站闸不生效」）。决策 D3；唯一网络载荷触点（列报） |
| B9 | `:201-203`（`subnetOf`）∥ `:212`/`:223`（`deps.dnsGate?.registerNetwork`） | 删 | 网段登记 = DNS 闸归属判输入 |
| B10 | `:577`（销毁链 `DELETE FROM sandbox_pending`） | 删 | 表停机留史 ⇒ 零写面 |
| B11 | `:601-605`（tick ④ 临时集到点重算 ∥ `out.egress`） | 删 | 临时集面亡 |
| B12 | `:1-14`（头注三腿/DNS 注入/注入口径）∥ `:88` 注释 ∥ `:312` 缝参 `resolveImpl` | 收窄 | 死指清理（`resolveImpl` 唯一消费 = 闸） |

**C · 路由 `src/sandbox/routes.mjs`（现读 407——收窄：净删 ≤110 ∥ 结构不变）**

| # | 坐标 | 处置 | 依据 |
|---|---|---|---|
| C1 | `:33-34`（两 import 行） | 删 | 随 A |
| C2 | `:57-59`（`publicBase` ∥ `hostExec`/`execOf`——唯一消费 = 闸）∥ `:61-66`（`pushEgress`）∥ `:72`（`injected` 两缝） | 删 | 下发触发面亡 |
| C3 | `:145-147`（登记 handler 网段带入 + `runner_add` detail `segments`） | 删 | §4 强制面 ⑤ 亡 |
| C4 | `:268-322`（规则四端点 + `egressState`/`warning` 回包） | 删 | 端点族退场 |
| C5 | `:324-344`（待批两端点 + `notifyDecision` 回填） | 删 | 待批 = 用户点名根本原因 |
| C6 | `:364`（`bumpRulesRev()`）∥ `:367`（响应 `rulesRev`） | 收窄 | 修订号面亡（设置面本体留守） |
| C7 | `:391`（成员行 `pending`） | 删 | 契约收窄（API §2.7 同拍） |
| C8 | `:398`（`dnsGate` 透传）∥ `:169`（`resolveImpl` 透传） | 删 | 缝面收窄 |
| C9 | `:1-16` 头注 ∥ `:53` 注入口径 ∥ `:14`「规则/待批裁定 = 不设门」句 | 收窄 | 死指清理 |

**D · 工作区面 `src/sandbox/workspace-routes.mjs`（现读 312——收窄：净删 ≤10 ∥ 结构不变）**

| D1 | `:60-64`（读 `sandbox_pending` + `pending` 组装） | 删 | 表停读 |
| D2 | `:76`（返回行 `pending` 键） | 删 | 管理面契约收窄（API §2.5 同拍） |
| D3 | `:90`（`boxDeps.dnsGate`） | 删 | —— |

**E · 进程装配 `bin/thincoder-server.mjs`（现读 249——收窄：净删 ≤15 ∥ 结构不变）**

| E1 | `:30` import ∥ `:100` 声明 ∥ `:118` stop ∥ `:185-187`（注释 + 建闸 + 注入）∥ `:221` start ∥ `:234` 失败路径 stop | 删 | DNS 闸进程面全摘（`hostExec` 留守——tick 面注入用） |
| E2 | `:184`/`:218`/`:220` 注释三处 | 收窄 | 死指清理 |

**F · 成员面装配 `src/agent/member-routes.mjs`（现读 485——收窄：净删 ≤3 ∥ 结构不变）**

| F1 | `:141`（`boxDeps.dnsGate`） | 删 | —— |

**G · 设置面 `src/sandbox/registry.mjs`（现读 420——收窄：净删 ≤3 ∥ 结构不变）**

| G1 | `:38`（`pendingTimeoutSeconds: 60`） | 删（键面 **14 ⇒ 13**——`DEFAULT_SETTINGS` 码面实读；与 `SANDBOX.md:379-382` 逐键 14 枚取平——原载「13 ⇒ 12」系笔误） | 设置键收窄（残留表行惰性——`getSettings` 白名单读）；`sandboxPublicBase`/`LIMIT_KEYS` 余键留守 |

**H · 数据面 `src/store/migrations.mjs`（现读 795——停史：零行变 ∥ 结构不变）**

| H1 | `:219-231` ∥ `:232-242`（两表 DDL）∥ `:288-298`（种子八行）∥ `:263` 注释 | **停机留史**（定案——§1 迁移七行裁定；四段全留 ∥ 零读零写零迁移） | 迁移表行 1/2 |

**I · 审计面**

| I1 | `box.mjs:316` ∥ `egress.mjs:330`（kind 写入点） | 删 | 随 B5/A1 |
| I2 | `public/views-audit.mjs:222`（kind 映射；现读 **247** 行） | **撤**（映射行删——定案 §1 迁移七行裁定；历史行原值兜底） | 迁移表行 5 |
| I3 | `public/i18n-{zh,en}-system.mjs:212`（`audit.sandboxKind.egress_apply_failed` 键；现读 **217**/**217** 行） | **撤**（两键删——定案 §1，同 I2） | —— |

**J · 成员面 UI**

| J1 | `public/views-me-sandbox.mjs`（现读 **123** 行）：`:15-16` ∥ `:45-54` ∥ `:72-77` ∥ `:84` ∥ `:86`/`:93` ∥ `:98-102` ∥ `:112` ∥ `:1-11` 头注 | 删 | 表 5 列 ⇒ 4 ∥ 零轮询 ∥ 零 pending |
| J2 | `public/views-me-chat.mjs`（现读 **502** 行）：`:18` ∥ `:68-70` ∥ `:114` ∥ `:139-141` ∥ `:390` ∥ `:427`/`:441` ∥ `:481` | 删/收窄 | 待批提示面亡（`:390`「出站被拒分类」注收窄） |
| J3 | `public/i18n-{zh,en}-me.mjs`（现读 **160**/**161** 行）：`me.sandbox.colPending`（:75/:76）∥ `me.sandbox.pending`（:81/:82） | 删（−2 键/表） | 零消费 |
| J4 | `public/style.css`（现读 **383** 行）：`:333-335`（`.pending-line`）∥ `:380` 注释 | 删 | 零存活消费（纯删——四轴 canon 不破） |

**K · 探针 `deploy/sandbox-probe.mjs`（现读 679）**

| K1 | `:52-67`（SCRIPT_P2/P3/P4）∥ `:173-237`（SCRIPT_P11/P12）∥ `:498-499`/`:511-513`/`:547-620`（执行块）∥ `:7`/`:10-11` 头注句 ∥ 仅 P11 服务的 `--target` 前置 | **删**（建议——决策 D4） | 期望值随闸反转（「拒/闸生效/待批」判据亡；留 = 假红） |

**L · 拉仓壳文案 `deploy/sandbox/member-shell/pull.mjs`（现读 114——收窄：净删 ≤5 ∥ 结构不变）**

| L1 | `:11-12` 头注（「含 60s 待批窗超时后的连接失败」）∥ `:42-44`（`network` 类人话「如是新目标域，请联系管理员放行」） | 收窄 | 出站被拒判据退场 ⇒ 文案归「网络不可达」；分类 key `network` 留守 |

**行数面注（越 500 建议线三档——各一句处置）**：`src/sandbox/box.mjs` 686 ⇒ 收窄后 ≈586（净删 ≤100——仍越建议线（存量）；硬线 800 内）∥ `src/store/migrations.mjs` 795 ⇒ 停史零动（越建议线存量——零行变；硬线 800 内）∥ `deploy/sandbox-probe.mjs` 679 ⇒ 收窄后 ≈530（净删 ≈150——仍越建议线（存量）；硬线 800 内）。三者皆存量——本批不扩、拆案另议。

**M · 表内残留/历史面（零动——如实）**：`data/gateway.db`（本机开发库，含两表行——零触）∥ 审计历史行（`egress_apply_failed` 等——在库原值）∥ 设计档字符（随 §6 清面）∥ 段号体系。

**留守复核表（逐面实读读数——2026-10-14；围栏面零改，发现即列报）**

| 面 | 实读读数 | 结论 |
|---|---|---|
| 资源上限（quota） | `quota.mjs` 现读 **120** 行（修正轮码面实读；设计档 `EXECUTION.md:281` 收口实读 118——±2 口径/时点差注；收口轮盘面实读取平）；grep 零 egress 交；建盒链 ② 步独立（`box.mjs:346`） | 零触 |
| 盒链其余（卷/网络/容器/启动/轮换/回收/快照/定时器/放置） | `box.mjs` **686** 行；五链步序逐条在册；快照/恢复/销毁/放置面零闸引用 | 只摘 B 表逐处；余零触 |
| 拉仓/登记 | `pull.mjs` **114** ∥ `member-routes.mjs` **485** ∥ 项目源登记面 grep 零 egress 交 | 零触（L1 文案收窄除外） |
| 主机凭据/SSH | `ssh.mjs` **226** ∥ `hosts.mjs` **134** ∥ `host-credential.mjs` 零 egress 交 | 零触 |
| 镜像/终端/卷 | `docker.mjs` **422**（网络族客户端留守——Options 直通，B8 载荷变更由其透传）∥ `terminal-*` ∥ `volume-routes.mjs` 零交 | 零触（B8 = 唯一网络载荷触点——列报） |
| 探针余腿 | P1 ∥ P5–P10 ∥ P13 ∥ P14 留守（删五腿后 `sandbox-probe.mjs` ≈ −150 行） | 零触 |
| 工作区/设置/成员面余项 | 设置键 **14 ⇒ 13**（G1——修正轮取平）；工作区六端点留守；成员面 5 列 ⇒ 4 列 | 收窄面已入清单 |

**迁移方案表（七行定案——2026-10-14 20:46 用户裁定「全照建议」（§1 迁移七行裁定行）；执行序 = 先核（7）后销（6））**

| # | 项 | 定案 | 代价 | 替代（代价） |
|---|---|---|---|---|
| 1 | 表 `sandbox_rules` | **停机留史**（沿 onboarding 先例：DDL/种子留档 ∥ 零读零写 ∥ 零迁移） | 库内长驻一张死表（≈零运行成本） | 删表迁移（一次迁移 + 清史 + 迁移段号 +1） |
| 2 | 表 `sandbox_pending` | **停机留史**（同上） | 同上（`open` 残留行永久静止——收口轮列报读数） | 同上 |
| 3 | 配置键 `sandbox.egressEnforce` | **撤**（键随闸亡） | 旧 `config.json` 携键者成未知键（无验证器 ⇒ 无害） | 留键（= 「以后再说」的壳——违零壳纪律） |
| 4 | 设置键 `pendingTimeoutSeconds` | **撤**（`DEFAULT_SETTINGS` −1 ∥ UI 对照表行删） | `sandbox_settings` 残留行惰性（白名单读——零迁移） | 留（= 壳） |
| 5 | 审计 kind `egress_apply_failed` | **撤**（映射 + i18n 键删；历史行原值兜底） | 历史行显示英文原值（沿 onboarding 先例） | 留枚举供史（映射 + 键各 1 行——零写点 ⇒ 纯展示件） |
| 6 | 节点备份锚 `/root/nft-backup-20261014.txt`（.6） | **销**（收口轮真机动作） | 失去「还原事故盘面」取证能力（批档 §1 + 台账 #1433 已留读数） | 留（误导：回滚目标已判死——残留表 = 黑洞根因） |
| 7 | 节点残留复核 | **收口轮真机**：`nft list tables` ∥ `iptables -S` ⇒ 零 `tc_sandbox`/`thincoder_egress`/`TC-EGRESS` | 一次 SSH 读数 | 不复核（事故根因 = 「只不推不回收」——同类复发风险） |

**测试随正清单（批内件 = `docs/batches/`——逐档处置）**

| 档 | 现读 | 处置 |
|---|---|---|
| `2026-10-13-sandbox-exec-rebuild-egress.test.mjs` | 442 | **整档删**（对象 = 闸本体/DNS 闸——随 A 亡） |
| `2026-10-14-egress-probe-fix.test.mjs` | 34 | **整档删**（对象 = egress 探针修复） |
| `2026-10-13-sandbox-outbound-member-face.test.mjs` | 514 | 腿删（十腿 = 闸面九 + 成员行一——闸面腿全删；成员行腿随成员面核存） |
| `2026-10-13-sandbox-outbound-member-face-ui.test.mjs` | 374 | 腿删（待批列 ∥ 提示行 ∥ 10s 轮询 ∥ 键数 19+1 ⇒ 17+1） |
| `2026-10-13-sandbox-exec-rebuild.test.mjs` | 856 | 腿随正（N65 载荷桥名/Dns 断言 ∥ ③ 步 ∥ `egressStdout` 假件 ∥ `sandbox_rules` fixture ∥ 步名表 7 ⇒ 6） |
| 跨批键数/档目指纹族（`2026-10-08-server-public-structure.test.mjs` 等） | 实读 | 父侧随正（me 表 −2/表；`views-sandbox-egress.mjs` 拟新增行删）——沿先例 |
| **本批新单测档**（新——`docs/batches/2026-10-14-sandbox-egress-removal.test.mjs`） | 新 ≈250 | 七腿：① 两档删净 + 仓内零引用 ② 建盒链步 6 + 无 `Dns` + 无桥名 Options ③ 端点面 −6（逐 `routes.add` 计数）④ 成员行无 `pending` + me 键 −2 ⑤ 两表仅 migrations 建表史 ⑥ 审计映射 −1 + 两表闭合 ⑦ 扫描闸（判据 1–5 逐条） |

**文档随正清单（逐档落点 = 清面；本批设计轮未落笔——见下注）**

1. `docs/server/design/sandbox/EXECUTION.md`：`:18`/`:19`（三腿句——③ 出站闸下发 ∥ DNS 闸）∥ `:41`（③ 出站闸下发步）∥ `:46-47`（「三条 = 内置允许面……」句）∥ **§5 全节**（`:108-123`）∥ **§6 全节**（`:125-142`）∥ `:51-52`（桥名 = 闸锚）收窄 ∥ `:190-193`（§10 执行器前置「闸已下发」∥ P2/P3 复证 ∥ P9/P10/P11/P14 解锁句）∥ **§12 验收判据**（`:205`/`:206`/`:207`/`:210`——出站/强制面/待批/探针四行）∥ **§13 用例**（N66 待批行 ∥ N67 ∥ B73 ∥ P 腿）∥ **§14 件表**（`egress`/`dns-gate` 两行删；`box`/`routes`/`rules` 行随正）∥ **§15 KD**-SV-164/165 删 ∥ **§16/§17 余项** ∥ 变更记录 +1。
2. `docs/server/design/sandbox/SANDBOX.md`：§2 表两行注「停机留史」∥ §3 射程引块 `:52`（史句——`出站闸`/`待批` 词加退场标 ⇒ 入判据 8「退场句」类）∥ §4 出站规则全节 ⇒ 承接句（含 `:303` 预授权条目块——`ensureProjectAllow` 未落成投影 ⇒ 撤记句）∥ §6 待批队列全节删 ∥ §8（六面收窄 ∥ `pendingTimeoutSeconds` 行删 ∥ 成员面 pending 句删）∥ §9 端点句 ∥ §11 判据行 ∥ §12 用例 ∥ §13 件表/预算（含 `:620` 加笔行——接线未落成 + 投影陈值（≈518 vs 实读 498—499）⇒ 撤记句）∥ §14 KD-SV-69/136/139 删 ∥ **KD-SV-137 收窄**（去 P11 半句（`:686`）、保留 P1/P8 判据收窄句（`:470`/`:477`）——沿 KD-SV-84 先例）∥ §15/§16 ∥ 变更记录 +1。
3. `docs/server/design/webui/SANDBOX.md`：`:58`（§2.1③ 出站规则卡句）∥ §2.1④（待批卡）∥ §2.2（待批列/提示/轮询）∥ §3（`views-sandbox-egress.mjs` 拟新增行删）∥ §4 判据行 ∥ 键族登记（me −2）∥ 变更记录 +1。
4. `docs/server/design/webui/WEBUI.md`：§1（拟新增行）∥ §2.8/路由表（六面句）∥ §5 小计 ∥ §6 沙盒 AC 行 ∥ 变更记录 +1。
5. `docs/server/design/webui/CHAT.md`：`:129`（待批提示句）∥ 变更记录 +1。
6. `docs/server/design/gateway/API.md`：§2.5（规则四行 ∥ 待批两行 ∥ `segments` ∥ settings 行）∥ §2.7（`pending` 字段）∥ §5 判据行 ∥ 变更记录 +1。
7. `docs/server/design/accounts/ACCOUNTS.md`：§2.1（`egress_apply_failed` 行 + 写入点两处）∥ 变更记录 +1。
8. `docs/server/design/store/STORE.md`：§1/§2 v11 段注（两表停机留史）∥ 变更记录 +1。
9. `docs/server/design/ops/OPS.md`：`:246`/`:254`（出站闸/DNS 闸句）∥ 变更记录 +1。
10. `docs/server/design/PROJECT.md`（板档）：§2.1 sandbox 行 ∥ §3 档行 ∥ §4 索引（KD 行）∥ §7 AC-36 行 ∥ 变更记录 +1。
11. `docs/server/design/agent/MEMBER-AGENT.md`：KD-SV-155（登记即放行）∥ §3.7/AC-50② 待批联动句 ∥ 变更记录 +1。
12. `docs/server/design/agent/ADMIN-AGENT.md`：`:193`/`:269`（规则/待批工具面句）∥ 变更记录 +1。
13. `docs/server/design/webui/ME.md`：`:74-75`（i18n me 预算行 −2 键）∥ 变更记录 +1。
14. 需求档（= 父侧笔——**相抵处列报**；**16 组坐标** = 原列 11 + 修正轮补列 5（父侧实读坐实））：`:322`（「受沙盒出站规则约束」）∥ `:435`（AC-36 ③④⑧）∥ `:451`（「出站规则内」）∥ `:506` ∥ `:519` ∥ `:525` ∥ `:527` ∥ `:531` ∥ `:540`（「下方机制条目在册（启用时生效）」句）∥ `:541`（评审注：配置线 ∥ 开关翻转 Dns 残留）∥ `:542–:548`（CIDR/域名规则 ∥ 两道闸次序 ∥ 控制台安全组式呈现 ∥ 通配符）∥ `:549` ∥ `:552`（「非白名单出站拒」——探针验收句内）∥ `:668` ∥ `:693` ∥ `:791`——把出站闸/待批/成员提示写为在册功能 ⇒ 须回笔或撤回（写法/计数 = 父侧定）。

**文档清面落笔时点（披露——本批未落）**：本设计轮 = 清单落档（逐档落点已具名）；**逐档清面落笔 = 评审后一轮**——理由：清面量大（14 档）且逐处须实读，赶工落笔必留半改残面（违「不留残面」纪律）；判据保持可机检（判据 8）。

**删净判据（grep 式——实施/收口轮机检；cwd = `thincoder/`）**

1. `rg -n -i "egress|dns[-_]?gate" thincoder-server/src thincoder-server/bin thincoder-server/deploy thincoder-server/public` ⇒ **零命中**。
2. 名称面三行扫描（同一目录面——`thincoder-server/src`）：
   `rg -n "evaluateEgress|ensureEgressApplied|dispatchEgressAll|pushEgressRuleset" thincoder-server/src`
   `rg -n "HARD_DENY_CIDRS|markPending|sweepPendingTimeouts|resolvePending|listPending" thincoder-server/src`
   `rg -n "openPendingOf|importSegmentDenies" thincoder-server/src`
   ⇒ **零命中**（白名单：`public/views-chat-composer.mjs` ∥ `views-me-chat-composer.mjs` ∥ `style.css:281` 的 `markPending` = 聊天待发泡核件（`/rc/flow/queued-mark.mjs`——异义同名，留守））。
3. `rg -n "sandbox_pending|sandbox_rules" thincoder-server/src` ⇒ 仅 `src/store/migrations.mjs`（建表史——停机留史白名单）。
4. `rg -n "egressEnforce|pendingTimeoutSeconds" thincoder-server` ⇒ **零命中**。
5. `rg -n "egress_apply_failed" thincoder-server` ⇒ **零命中**（历史行在库原值兜底）。
6. 结构件：`BOX_CHAIN_STEPS` 长 **6** 无 ③；`buildBoxPayload` 零 `Dns`；网络创建零 `bridge.name` Options；`/api/admin/sandbox/*` 端点 −6；成员行无 `pending`；me 表 −2/表；`sandboxKind` 映射 −1（按裁定）。
7. 建盒链绿：批内新件 + 父侧收口跑（假件面——无 ③ 步链仍全绿）。
8. 文档面：`rg -n "出站闸|域名闸|出站规则|非白名单出站|沙盒出站|待批" docs/server/design docs/server/requirements` ⇒ 仅记录面（变更记录 ∥ 停机留史注 ∥ 退场句/史句退场标）；**并**按相抵处清单（文档随正清单第 14 行）逐组坐标核语句已随正——命中面与清单一次取齐（清单外命中 ⇒ 白名单或补列；清单内未扫中 ⇒ 逐行核兜底）。取齐口径（评审发现 3——二择取「纳清单」）= `:52` 加退场标 ∥ `:18`/`:19` 随正（见文档随正清单 1/2 行）；白名单类目不另扩。
9. 收口轮：服务起服（实跑）零加载期报错 ∥ 管理侧/成员侧页面实走零 404（整删面最大风险 = 加载期悬空/页面 404——评审表 #1 即其形）。

**关键决策**

- D1 三档整删（零骨架 ∥ 零 flag）：留 flag（`egressEnforce` 缺省关）= 现行关态，而**关态残留规则正是本日事故根因** ⇒ 否。
- D2 `assertServerAddress` 同删（理由句逐字绑定闸面 ⇒ 死栅栏；保留会误停建盒）。
- D3 桥名锚（Options + 读回复核）同删（唯一用途 = 闸锚；保留 = 壳）。**唯一非纯删触点**（网络载荷变更）——列报。
- D4 探针五腿同删（期望随闸反转；留 = 假红）。
- D5 规则/待批六端点同删；管理侧出站规则 UI 从未建（勘察① ⇒ API-only ⇒ 零 UI 摘除件）。
- D6 成员面契约收窄（`pending` 字段 + 列 + 提示 + 轮询全删）。
- D7 两表停机留史（沿 onboarding 先例；定案——§1 迁移七行裁定）。
- 被否候选：① 只删下发留规则面（= 留壳，且 498 行零消费）② 留待批只删闸（用户点名待批为根本原因）③ 节点侧只拆不回改仓（残留复发——事故根因即「只不推不回收」）。

**上抛**

- **[已定案] 迁移表七行**（表 ×2 ∥ 键 ×2 ∥ kind ∥ 备份锚 ∥ 节点复核）——2026-10-14 20:46 用户裁定「全照建议」（§1 迁移七行裁定行）；执行序 = 先核（7）后销（6）。
- **[上抛·知会] 需求档相抵处**（父侧笔——写法/计数 = 父侧定）：16 组坐标见文档随正清单第 14 行（本修正轮补列 5 组——评审发现 2）。
- **[上抛·知会] B8 网络载荷变更**（唯一非纯删触点：`networks/create` 去 Options；功能零差；N65 断言随正）。
- **[上抛·知会] 文档清面时点**（评审后一轮落笔——见上注）。
- **[上抛·知会] 探针五腿删除**（建议删；若判留 ⇒ 假红在册）。

**机检读数（本轮——写前基线；本批未触设计档 ⇒ 读数 = 基线，零新增）**：`node scripts/doc-check.mjs --root .`（cwd = `thincoder/`）——
悬空 **24**（FAIL(锚) 阈值 0；域外 19 = `docs/core/design/MEMORY.md` 18 + `docs/core/requirements/MEMORY.md` 1 ∥ 域内 5 = `ADMIN-AGENT.md:171`/`:265`/`:650` ∥ `mcp/MCP.md:175` ∥ `sandbox/SANDBOX.md:266`——皆先存）。
行宽 FAIL **3**（`docs/core/design/PROMPT-SYSTEM.md:655` ∥ `docs/core/design/TOOLS.md:1382` ∥ `docs/server/requirements/PROJECT.md:567`）∥ 行数面差异 86 条（报告态）。**写后复读（同轮）**：悬空 24 ∥ 行宽 3 ∥ 行数面 86——与本批写前同值（零新增红；`docs/batches` 不入扫描面）。

### 2.2 清面轮（2026-10-14 · round = fix——承 §1 修正轮上抛 ①② ∥ 评审轮次 3 之 🔵 余项）

**依据**：§1「修正轮上抛处置」（21:12）① ② ∥ §1「父侧补记」（21:4x——🔵 余项「`rules` 半句」并入清面轮同拍）；用户 2026-10-14 20:32 裁「整套摘除」。

**轮序披露**：本轮落笔于评审轮次 3（VERDICT pass）之后 = 评审后修订（各档变更记录已注「评审后一轮落笔——披露在册」）；不重开评审轮（链序 = 主 agent 裁）。

**范围**：设计档清面 **14 档**（域档 12 + 总归档 2）+ 行宽收正 3 处；产品码 ∥ 批档 ∥ 需求档零触。

**一轮落点（逐档——明细见该档变更记录）**

| 档（`docs/server/design/`） | 清面内容 |
|---|---|
| `sandbox/SANDBOX.md` | §4/§6 两节删净（段号留空档；§4 ⇒ 退场承接句）∥ §2 两表注「已退场·表在库留史」+ `rulesRev` 行删 ∥ §3/§7/§8 随正（六面 ⇒ 四面） ∥ §11 探针五腿删（P2–P4 ∥ P11/P12——编号留空档）∥ §12 七用例删 ∥ §13 `rules`/`egress`/`dns-gate` 三行删 + 小计 ≈−1475 ∥ §14 KD-SV-68/69/76/136/139 删（段号留空档）、137/138 收窄 |
| `sandbox/EXECUTION.md` | §5/§6 删净 ∥ 建盒链条 7/6/5 ⇒ **6/5/4** ∥ §9 #1351 句随正 ∥ §10 余腿（P1 ∥ P5–P10 ∥ P13 ∥ P14） ∥ §12 四行随正 ∥ §13 用例随正 ∥ §14 两档行删 + 小计 ≈−1117 ∥ §15 KD-SV-163/174 随正、164/165 删 |
| `webui/SANDBOX.md` | §2.1 ③/④ 两卡行删（编号留空档）∥ §2.2 成员页去待批列/提示行/轮询 + 件行去 `views-sandbox-egress.mjs` ∥ §3 键族 19 ⇒ 17 ∥ §4 两 AC 行随正（六面 ⇒ 四面） |
| `webui/WEBUI.md` | §1 件行删 ∥ §2 路由表六面 ⇒ 四面 + 成员行随正 ∥ §2.8 两轮退场注 ∥ §5 小计链补 −≈240 |
| `webui/ME.md` | §2.3 待批列/提示行删（随正件） |
| `webui/CHAT.md` | 待批提示句删（随正件） |
| `gateway/API.md` | §1 沙盒控制面行去两件 ∥ §2.5 两端点行 + settings 三处（`pendingTimeoutSeconds` ∥ `rulesRev` ∥ 默认单）删 ∥ §2.7 成员面 `pending` 字段与提示句删 |
| `accounts/ACCOUNTS.md` | §2.1 `sandbox_rule` 行注「写入面随出站闸退场删」+ `egress_apply_failed` 随退场删 |
| `store/STORE.md` | v11 两表「已退场·表在库留史」注 + 表归属行随正 |
| `ops/OPS.md` | §5.10 主机侧两件 ⇒ 一件、三前提 ⇒ 两件 ∥ 网络面句去闸 |
| `PROJECT.md` | §2/§3 档目两行随正 ∥ §9 KD-SV-68/69/76 三行删（段号留空档） |
| `agent/MEMBER-AGENT.md` | §1 对齐句 ∥ §2 KD-SV-155 ∥ §3.6 出站块（退场承接） ∥ §5 件行 ∥ §7 AC-50 ②⑥ 随正 |
| `agent/ADMIN-AGENT.md` | 出站/待批残留句随正 |
| `mcp/MCP.md` | :111 半句删（§1 上抛 ② 并入件——「受沙盒出站约束」句删净） |

**评审 🔵 余项处置回执（#11）**：处置 = **删半句**（`rules` 件表行实档不存在——随 `sandbox/SANDBOX.md` §13 三行删净落定；「改指 `SANDBOX.md:595`」选项未取）。

**验收对照（本席自检读数——2026-10-14）**

| # | 判据 | 读数 |
|---|---|---|
| ① | egress 词面复扫（`出站闸\|待批队列\|rulesRev\|登记即放行\|egress_apply\|dns-gate\|egress\.mjs`——全域 `docs/server/design`） | 命中全落**记录面**（变更记录/历史沿革）或**退场标**（「（已退场——2026-10-14）」/随退场注）；活面零裸词 ✓ |
| ② | `node scripts/doc-check.mjs --root .`（cwd = `thincoder/`） | 行宽 = **3**（= 未触档既有三人组，与改动前同：`core/design/PROMPT-SYSTEM.md:657` ∥ `core/design/TOOLS.md:1382` ∥ `server/requirements/PROJECT.md:567`）∥ 悬空 66（与改动前同读数——本席零新增坐标 token；新增引用两处实档均在）∥ 行数 84（报告态·非闸） |
| ③ | 逐档读回 | 14 档全读回 ✓；行宽收正 3 处复读（`store/STORE.md:332` 345⇒288 ∥ `webui/SANDBOX.md:112` 345⇒297 ∥ `webui/SANDBOX.md:148` 309⇒292——均 ≤300） |

**上抛（请父侧核——台账面）**

- `[上抛·待裁]` **#1248 未列 §1 连带处置**：§1 连带处置表在列 = #1249 ∥ #1398 ∥ #1352 ∥ #1397；本轮按退场事实在 `sandbox/SANDBOX.md` §11/§12/§15 记「#1248（P2/P3）随出站闸退场关闭——腿已删，复证面随消」。请核 #1248 台账行收口口径（撤回 ∥ 关闭）——该项未在 §1 连带处置列报，属簿记面。

**非阻断观察（报告面——未自改）**

- `PROJECT.md:513` 预算块仍带 `views-sandbox-egress.mjs` ≈240 估算（记录/预算态——未加退场标；`webui/WEBUI.md` §2.2 链已标「件行删·从未落盘」）。
- #24（`approval` kind 撤——§1 父侧裁 22:0x）落点 = fix 轮 1（产品码三档）——非本席面，本轮零触。

**边界（本清面轮不做）**：产品码 ∥ 批档 §1 ∥ 需求档回笔（父侧笔）∥ `approval` kind 三档（fix 轮 1）∥ 真机残留复核（收口轮）。

## §3 设计评审（评审子代理）

### 轮次 1（评审子代理）

评审对象 = #1433 沙盒出站闸整套摘除——设计轮验收（§2 七段）。评审面 = 批档 ∥ `sandbox/EXECUTION.md` ∥ `sandbox/SANDBOX.md` ∥ `webui/SANDBOX.md` ∥ `server/requirements/PROJECT.md`。面限制：无文档地图（ownership 按 Project Guide/域档指针核）∥ 无独立标准档（methodology 按 AGENTS.md 核）∥ 源码不在面内（行号/行数仅做面内交叉核对）。

| # | Category | Severity | Issue | Suggestion |
|---|----------|----------|-------|------------|
| 1 | 覆盖完备性（机制相抵） | 🔴 | A3 断言「全导出面 = 闸（实读：消费面仅 A1/A2 + routes——零非闸消费）」（`docs/batches/2026-10-14-sandbox-egress-removal.md:81`）与在册「源登记 handler 接线 = project 域 `admin-routes.mjs` 一行」（`docs/server/design/sandbox/SANDBOX.md:620`；配套机制句 `SANDBOX.md:303` 登记仓/源 ⇒ 其域名自动入出站 allow）相抵；A–M 摘除清单无该调用点（`docs/batches/2026-10-14-sandbox-egress-removal.md:35` 仅以「「登记即放行」的放行句随闸亡 = 摘除面」一句带过），判据 1/2 名称面（`evaluateEgress`/`markPending` 族）均不含 `ensureProjectAllow` ⇒ 整删 `rules.mjs` 后该 seam 悬空（导入径 = 起服即崩；端点径 = 登记流程静默失效），且 8 条判据无一可拦。 | 补列该消费点（`rules.mjs` 全导出面按 `ensureProjectAllow` 复核，或据实读收正 A3/留守句——两说不能并存）；判据 2 名称面加 `ensureProjectAllow`。 |
| 2 | 需求覆盖（相抵处枚举 ∥ 判据 8 词面） | 🟡 | 需求档相抵处仅列 11 坐标（`docs/batches/2026-10-14-sandbox-egress-removal.md:211`），漏 `docs/server/requirements/PROJECT.md:322`（「从既有 git 源拉取——受沙盒出站规则约束」）∥ `PROJECT.md:451`（「从 git 源拉仓 ⇒ 工作区内成仓（出站规则内）」）∥ `PROJECT.md:541`（评审注：配置线 ∥ 开关翻转 Dns 残留）∥ `PROJECT.md:542`–`:548`（CIDR/域名规则 ∥ 两道闸次序 ∥ 控制台安全组式呈现 ∥ 通配符——居 `PROJECT.md:540`「下方机制条目在册（启用时生效）」句下）∥ `PROJECT.md:552`（「非白名单出站拒」在探针验收句内）；判据 8 词面 = 「出站闸\|域名闸\|待批」（`docs/batches/2026-10-14-sandbox-egress-removal.md:228`）——上述行多写「出站规则/两闸/非白名单出站」不含字面 ⇒ 清面后判据 8 仍绿（假绿）。 | 相抵处清单补列上述 5 组坐标；判据 8 词面并入「出站规则\|非白名单出站\|沙盒出站」或改按相抵处清单逐行核（不靠字面 grep）。 |
| 3 | 判据自洽（判据 8 vs 白名单） | 🟡 | 判据 8 对设计档的自动命中含清单外两处：`docs/server/design/sandbox/SANDBOX.md:52`（历史射程引块「一行带过：出站闸 ∥ 磁盘限额 ∥ 探针 ∥ 心跳/放置 ∥ Swarm ∥ 快照 ∥ 待批」）∥ `docs/server/design/sandbox/EXECUTION.md:18`（「③ 出站闸下发（§5）」——同句在 `EXECUTION.md:41` 已列、`:18` 未列）；二者不在白名单（非变更记录/非停机留史注/非退场句）⇒ 按判据 8 自身口径必红。 | 白名单补「历史射程引块/史句」类目，或把两处纳入随正清单（史句加退场标/删）；判据 8 命中面与随正清单一次取齐。 |
| 4 | 文档落点（结构） | 🟡 | `EXECUTION.md` 随正落点缺：`:18`/`:19`（三腿句 出站闸下发 ∥ DNS 闸）∥ `:46-47`（「三条 = 内置允许面（生命线——强制面总序已裁，见 SANDBOX §4）」）∥ `:190-193`（§10 执行器前置「闸已下发」∥ P2/P3 复证 ∥ P9/P10/P11/P14 解锁句）∥ §12 判据 `:205`/`:206`/`:207`/`:210`（出站/强制面/待批/探针四行）；`docs/server/design/webui/SANDBOX.md:58`（§2.1③ 出站规则卡句）缺；且条内节号与实档差 1——「§12 用例 ∥ §13 件表 ∥ §14 KD ∥ §15」实为 §13 用例（`EXECUTION.md:217`）∥ §14 件表（`:250`）∥ §15 KD（`:284`）∥ §16 边界（`:316`）。 | 补列缺失落点；节号改指实档（§13/§14/§15/§16）。 |
| 5 | 受影响档标注 | 🟡 | J1–J4/I2/I3 六处无现读行数（`public/views-me-sandbox.mjs` ∥ `views-me-chat.mjs` ∥ `i18n-{zh,en}-me.mjs` ∥ `style.css` ∥ `views-audit.mjs` ∥ `i18n-{zh,en}-system.mjs`；`docs/batches/2026-10-14-sandbox-egress-removal.md:139-148`）；B–H/L 行有现读无预期差值「≤±N」（只写「收窄/删」）；越 500 三档 `box.mjs` 686 ∥ `migrations.mjs` 795 ∥ `sandbox-probe.mjs` 679 无一句处置（方向 = 收窄/停史/收窄）。 | 补现读行数 + 预期差值（≤±N 或「结构不变」）；越线三档各加一句处置（收窄后余量/停史不变）。 |
| 6 | 状态相抵（Doc state） | 🟡 | §2 内 8 处 [待裁]/待拍 残余——状态行 `:45`（「迁移待裁」）∥ `:135`（H1 待裁）∥ `:140`/`:141`（I2/I3 待裁）∥ `:172`（「每行 [待裁]，待用户拍」）∥ `:238`（D7 待裁）∥ `:243`/`:244`（上抛 [待裁]）——与 `:42` 裁定行「「[待裁]」标记随之解除（定案以本行为准）」相抵。 | 残余标记按定案落定删净（两表 = 停机留史 ∥ 两键/kind = 撤 ∥ 备份锚 = 销 ∥ 节点复核 = 收口轮真机）；状态行/上抛/迁移表题同拍。 |
| 7 | 最近先例 | 🟡 | 设计面无最近先例三坐标行（先例批名仅散引——迁移表 1/2/5 行「沿 onboarding 先例」）；设计面惯例 = `docs/server/design/sandbox/EXECUTION.md:7-12`「最近先例（三坐标——实现坐标 ∥ 设计节 ∥ 先例批）」+ 对齐/偏离句。 | 补一行三坐标（先例 = sandbox-onboarding-removal 退场批 ∥ 其设计节 ∥ 实现坐标）+ 对齐/偏离逐句；无先例面显式声明。 |
| 8 | 结构判断（KD 处置） | 🔵 | `docs/batches/2026-10-14-sandbox-egress-removal.md:199` 拟删 KD-SV-137，但其 P1/P8「判据收窄」口径仍活（`docs/server/design/sandbox/SANDBOX.md:470`/`:477` 两行留守），仅 P11 半句随亡（`SANDBOX.md:686`「SKIP 四项前置登记（P9 第二盒 ∥ P10 `--repo` ∥ P11 `--target` ∥ P14 执行面读数面）」）——沿 KD-SV-84「收正（加密面存续范围）」先例（`SANDBOX.md:751`）宜收窄而非整删。 | 改收窄：去 P11 半句、保留「结构判据优先」句；或明注整删理由。 |
| 9 | 数值取齐 | 🔵 | 三处数未取齐：「14 处」vs 实列 11 枚（`docs/batches/2026-10-14-sandbox-egress-removal.md:243` vs `:211`）；设置键「13 ⇒ 12」（`:131`）vs `docs/server/design/sandbox/SANDBOX.md:379-382` 逐键 14 枚；`quota.mjs`「120 行」（`:164`）vs `docs/server/design/sandbox/EXECUTION.md:281` 收口实读 118。 | 逐数注口径或取平（沿「±1 口径差」注法）。 |
| 10 | 验收面补腿 | 🔵 | 删净判据 8 条无「服务起服/页面实读」腿（`docs/batches/2026-10-14-sandbox-egress-removal.md:215-228`）——整删面最大风险 = 加载期悬空/页面 404（本表 #1 即其一形），现有腿仅建盒链绿。 | 补一条收口轮机检腿（起服 + 管理/成员页实走零 404）。 |

面外注（不给级）：源码行号/行数不在评审面内，无法逐处复核；面内交叉核对 = `dns-gate` 359 与 `EXECUTION.md` §14 收口实读同值；`egress` 380 vs 372、`box` 686 vs 667 之差可由 2026-10-14 egress-off 轻通道轮（改 `{egress,box}.mjs` 在册）解释；`routes`/`workspace-routes`/`migrations` 与面内读数之差未在面内解释，以实施轮盘面实读为准。`docs/TEST-ENV-ECS.md` 等面外随正件是否含闸/待批/`--target` 句 = unverified。D2/D3 两指摘前置在案，本轮不复发。

计数：发现 10 条 = 🔴×1 ∥ 🟡×6 ∥ 🔵×3。

VERDICT: changes-required

### 轮次 2（评审子代理）

**轮次 2 复评（修正轮十点收正验证）**——口径 = 五档全文实读（批档 ∥ `sandbox/EXECUTION.md` ∥ `sandbox/SANDBOX.md` ∥ `webui/SANDBOX.md` ∥ `server/requirements/PROJECT.md`）；逐点核 = 声明 12 锚（`:57` 状态行 ∥ `:64-69` 先例行 ∥ `:100` A3 ∥ B–L 标注 ∥ `:150` 键面 ∥ `:154`/`:159`/`:160` 定案 ∥ `:193` 迁移表 ∥ `:219-221` 落点 ∥ `:232` 16 组 ∥ `:249-250` 判据 8/9 ∥ `:254-261` 决策 ∥ `:265-269` 上抛）。源码不在面内（行数/坐标仅做面内交叉核）。§1「修正轮上抛处置」四件 = 父侧已裁——未复评。

| # | Orig# | File | Severity | Status | Notes |
|---|-------|------|----------|--------|-------|
| 1 | 1 | docs/batches/2026-10-14-sandbox-egress-removal.md | 🔴 | Fixed | A3 按「据实读收正」支落定——`:100` 现载「`ensureProjectAllow`〔登记即放行〕面复核 = **零实现**」+ 证据链（成员面批档 `:441`/`:445` + 父侧全域 grep——面外）；`§1:44-47` 连带追加在册（含台账新行）；文档随正清单 `:220` 对 `SANDBOX.md:303`/`:620` 落「撤记句」。面内佐证 = `SANDBOX.md:620`「现读 **498–499** ⇒ ≈**518**」vs `:621`「实读 **439** ⇒ **498–499**」——带入缝 +≈20 未落盘，两说已归一。残留注（不计级）：判据 2 名称面未补 `ensureProjectAllow`——按「零实现」前提判为无对象（良性；如要兜底可加，零命中即过）。 |
| 2 | 2 | docs/batches/2026-10-14-sandbox-egress-removal.md | 🟡 | Fixed | 16 组坐标补齐——`:232` 现载「**16 组坐标** = 原列 11 + 修正轮补列 5（父侧实读坐实）」；面内逐核五组补列全命中：`PROJECT.md:322`（「受沙盒出站规则约束」）∥ `:451`（「工作区内成仓（出站规则内）」）∥ `:541`（评审注）∥ `:542–:548`（CIDR/域名/两道闸/控制台/通配）∥ `:552`（「非白名单出站拒」）；`:266` 上抛同拍。 |
| 3 | 3 | docs/batches/2026-10-14-sandbox-egress-removal.md | 🟡 | Fixed | 判据 8 取齐二择已落——`:249`「取齐口径（评审发现 3——二择取「纳清单」）= `:52` 加退场标 ∥ `:18`/`:19` 随正（见文档随正清单 1/2 行）；白名单类目不另扩」；`:220` 为 `:52` 加退场标落点。 |
| 4 | 4 | docs/batches/2026-10-14-sandbox-egress-removal.md | 🟡 | Fixed | `:219` 落点补齐——`:18`/`:19` ∥ `:46-47` ∥ `:190-193` ∥ §12 判据 `:205`/`:206`/`:207`/`:210` ∥ §13 用例 ∥ §14 件表 ∥ §15 KD ∥ §16/§17；节号与实档逐一对上（`EXECUTION.md:200` §12 验收判据 ∥ `:217` §13 用例 ∥ `:250` §14 件表 ∥ `:284` §15 KD）——原差 1 已消；webui `:58` 于 `:221` 补列。残留子项迁 #11（`rules` 行）。 |
| 5 | 5 | docs/batches/2026-10-14-sandbox-egress-removal.md | 🟡 | Fixed | B–H/L 头注全带「净删 ≤N ∥ 结构不变」（如 `:102` box「现读 686——收窄：净删 ≤100 ∥ 结构不变」）；J1–J4/I2/I3 六处补现读（`:159` 247 ∥ `:160` 217/217 ∥ `:164` J1 123 ∥ `:165` 502 ∥ `:166` 160/161 ∥ `:167` 383）；越线三档处置句 `:177`。 |
| 6 | 6 | docs/batches/2026-10-14-sandbox-egress-removal.md | 🟡 | Fixed | [待裁]/待拍 已清——面内 grep「待裁\|待拍\|待定\|待用户」仅存 `:42`（裁定行）与 `:288`（评审记录行）；`H1:154`「**停机留史**（定案——§1 迁移七行裁定；四段全留 ∥ 零读零写零迁移）」∥ `I2:159`/`I3:160`「**撤**（…定案 §1…）」∥ 迁移表题 `:193`「（七行定案——2026-10-14 20:46 用户裁定「全照建议」…）」∥ `D7:260` ∥ 上抛 `:265`「[已定案]」∥ 状态行 `:57`。 |
| 7 | 7 | docs/batches/2026-10-14-sandbox-egress-removal.md | 🟡 | Fixed | 先例行在册——`:64-69`「**最近先例（三坐标——实现坐标 ∥ 设计节 ∥ 先例批）**」；实现坐标 354/103 与 `SANDBOX.md:740`「整档删（354 ⇒ 0 ∥ 103 ⇒ 0）」同值；设计节/对齐/偏离句齐。 |
| 8 | 8 | docs/batches/2026-10-14-sandbox-egress-removal.md | 🔵 | Fixed | KD-SV-137 改收窄——`:220`「**KD-SV-137 收窄**（去 P11 半句（`:686`）、保留 P1/P8 判据收窄句（`:470`/`:477`）——沿 KD-SV-84 先例）」；面内三坐标命中（`SANDBOX.md:686` 含「P11 `--target`」半句；`:470`/`:477`「**判据收窄**——收窄后重跑」在）。 |
| 9 | 9 | docs/batches/2026-10-14-sandbox-egress-removal.md | 🔵 | Fixed | 三数取齐——`:150`「删（键面 **14 ⇒ 13**——`DEFAULT_SETTINGS` 码面实读…原载「13 ⇒ 12」系笔误）」；`SANDBOX.md:379-382` 逐键 14 枚核对（379 十枚 + `pendingTimeoutSeconds` + `memberWorkspaceLimit` + 382 两键 = 14）；「16 组」替「14 处」（`:232`/`:266`）；quota `:185`「现读 **120** 行（…收口实读 118——±2 口径/时点差注…）」。 |
| 10 | 10 | docs/batches/2026-10-14-sandbox-egress-removal.md | 🔵 | Fixed | 判据 9 收口腿在册——`:250`「9. 收口轮：服务起服（实跑）零加载期报错 ∥ 管理侧/成员侧页面实走零 404」。 |
| 11 | (new) | docs/batches/2026-10-14-sandbox-egress-removal.md:219 | 🔵 | New | 半句坐标不落地——「**§14 件表**（`egress`/`dns-gate` 两行删；`box`/`routes`/`rules` 行随正）」中 `rules` 行实档不存在：`EXECUTION.md` grep「rules」仅 `:113`（§5 求值单源）∥ `:122`（`rulesRev`）∥ `:184`（`rulesRev`）；§14 行 `:254`–`:277` 无 `rules.mjs` 档。rules.mjs 件表行在 `SANDBOX.md:595`（「`thincoder-server/src/sandbox/rules.mjs`（已落） | **实读 498**…」）——已由清单第 2 行「§13 件表/预算」覆盖（零残留风险）。建议：删半句或改指 `SANDBOX.md:595`。 |

计数：复审 10 条全 Fixed（🔴×1 ∥ 🟡×6 ∥ 🔵×3 原级）+ 新发现 1 条（🔵 New）；剩余 🔴 = 0。

VERDICT: pass

### 轮次 3（评审子代理）

**轮次 3 复评重跑（引用面收正——只核前表、零新问题猎捕）**——口径 = 五档全文实读（批档 ∥ `docs/server/design/sandbox/EXECUTION.md` ∥ `docs/server/design/sandbox/SANDBOX.md` ∥ `docs/server/design/webui/SANDBOX.md` ∥ `docs/server/requirements/PROJECT.md`）；逐条连续原文引用（零省略号）；两处归属核先实读原行再引（`docs/server/design/webui/SANDBOX.md:182` ∥ `docs/server/design/sandbox/SANDBOX.md:303`）。逐点核 = 前表 11 条。源码不在面内（行数/坐标仅做面内交叉核）。§1「修正轮上抛处置」四件 = 父侧已裁——未复评。

| # | Orig# | File | Severity | Status | Notes |
|---|-------|------|----------|--------|-------|
| 1 | 1 | docs/batches/2026-10-14-sandbox-egress-removal.md | 🔴 | Fixed | A3 按「据实读收正」支落定——`docs/batches/2026-10-14-sandbox-egress-removal.md:100`: "`ensureProjectAllow`〔登记即放行〕面复核 = **零实现**"；证据链 `docs/batches/2026-10-14-sandbox-egress-removal.md:46`: "全域零 `ensureProjectAllow` 命中（两式 grep 在案）"；清面落点 `docs/batches/2026-10-14-sandbox-egress-removal.md:220`: "§4 出站规则全节 ⇒ 承接句（含 `:303` 预授权条目块——`ensureProjectAllow` 未落成投影 ⇒ 撤记句）"。两处归属核（先实读原行再引）——`docs/server/design/sandbox/SANDBOX.md:303`: "登记仓/源 ⇒ 其域名**自动入出站 allow**"；面内佐证 `docs/server/design/sandbox/SANDBOX.md:621`: "实读 **439** ⇒ **498–499**"。残留注（不计级）：判据 2 名称面未补 `ensureProjectAllow`——按「零实现」前提判为无对象（良性）。 |
| 2 | 2 | docs/batches/2026-10-14-sandbox-egress-removal.md | 🟡 | Fixed | 16 组坐标补齐——`docs/batches/2026-10-14-sandbox-egress-removal.md:232`: "**16 组坐标** = 原列 11 + 修正轮补列 5（父侧实读坐实）"；五组补列面内逐核命中（示例）`docs/server/requirements/PROJECT.md:322`: "受沙盒出站规则约束" ∥ `docs/server/requirements/PROJECT.md:451`: "从 git 源拉仓 ⇒ 工作区内成仓（出站规则内）" ∥ `docs/server/requirements/PROJECT.md:552`: "非白名单出站拒"；上抛同拍 `docs/batches/2026-10-14-sandbox-egress-removal.md:266`: "16 组坐标见文档随正清单第 14 行（本修正轮补列 5 组——评审发现 2）"。 |
| 3 | 3 | docs/batches/2026-10-14-sandbox-egress-removal.md | 🟡 | Fixed | 判据 8 取齐二择已落——`docs/batches/2026-10-14-sandbox-egress-removal.md:249`: "取齐口径（评审发现 3——二择取「纳清单」）= `:52` 加退场标 ∥ `:18`/`:19` 随正（见文档随正清单 1/2 行）；白名单类目不另扩"；`:52` 落点 `docs/batches/2026-10-14-sandbox-egress-removal.md:220`: "§3 射程引块 `:52`（史句——`出站闸`/`待批` 词加退场标 ⇒ 入判据 8「退场句」类）"。 |
| 4 | 4 | docs/batches/2026-10-14-sandbox-egress-removal.md | 🟡 | Fixed | EXECUTION.md 落点补齐——`docs/batches/2026-10-14-sandbox-egress-removal.md:219`: "**§12 验收判据**（`:205`/`:206`/`:207`/`:210`——出站/强制面/待批/探针四行）"；节号与实档逐一对上 `docs/server/design/sandbox/EXECUTION.md:200`: "## 12. 验收判据（需求 → 设计判据）"——原差 1 已消；webui `:58` 补列 `docs/server/design/webui/SANDBOX.md:58`: "**③ 出站规则**（安全组式表：方向（恒出站）∥ 协议 ∥ 端口 ∥ 目标 ∥ 动作 ∥ 优先级 ∥ 备注——行内增删；域名通配条目醒目标记）"。残留子项迁 #11（`rules` 行）。 |
| 5 | 5 | docs/batches/2026-10-14-sandbox-egress-removal.md | 🟡 | Fixed | B–H/L 头注全带「净删 ≤N ∥ 结构不变」——`docs/batches/2026-10-14-sandbox-egress-removal.md:102`: "（现读 686——收窄：净删 ≤100 ∥ 结构不变）"；J1–J4/I2/I3 六处补现读（示例 `docs/batches/2026-10-14-sandbox-egress-removal.md:164`: "（现读 **123** 行）"——同族五处同形在册）；越线三档一句处置 `docs/batches/2026-10-14-sandbox-egress-removal.md:177`: "**行数面注（越 500 建议线三档——各一句处置）**"。 |
| 6 | 6 | docs/batches/2026-10-14-sandbox-egress-removal.md | 🟡 | Fixed | [待裁]/待拍 已清（规范面零残余——grep 3 命中 = 裁定行 1 + 评审记录 2）——`docs/batches/2026-10-14-sandbox-egress-removal.md:42`: "§2 表内「[待裁]」标记随之解除（定案以本行为准）"；定案化 `docs/batches/2026-10-14-sandbox-egress-removal.md:154`: "**停机留史**（定案——§1 迁移七行裁定；四段全留 ∥ 零读零写零迁移）" ∥ `docs/batches/2026-10-14-sandbox-egress-removal.md:160`: "**撤**（两键删——定案 §1，同 I2）"；状态行同拍 `docs/batches/2026-10-14-sandbox-egress-removal.md:57`: "设计完成（修正轮——评审 #15 十点收正）"。 |
| 7 | 7 | docs/batches/2026-10-14-sandbox-egress-removal.md | 🟡 | Fixed | 先例行在册——`docs/batches/2026-10-14-sandbox-egress-removal.md:64`: "最近先例（三坐标——实现坐标 ∥ 设计节 ∥ 先例批）"；实现坐标 354/103 同值 `docs/server/design/sandbox/SANDBOX.md:740`: "整档删（354 ⇒ 0 ∥ 103 ⇒ 0）"；webui 侧在册（先实读原行再引）`docs/server/design/webui/SANDBOX.md:182`: "本档 ≈190 ∥ `webui/WEBUI.md` §5 链载旧说 ≈95"。 |
| 8 | 8 | docs/batches/2026-10-14-sandbox-egress-removal.md | 🔵 | Fixed | KD-SV-137 改收窄——`docs/batches/2026-10-14-sandbox-egress-removal.md:220`: "**KD-SV-137 收窄**（去 P11 半句（`:686`）、保留 P1/P8 判据收窄句（`:470`/`:477`）——沿 KD-SV-84 先例）"；面内命中 `docs/server/design/sandbox/SANDBOX.md:686`: "SKIP 四项前置登记（P9 第二盒 ∥ P10 `--repo` ∥ P11 `--target` ∥ P14 执行面读数面）" ∥ `docs/server/design/sandbox/SANDBOX.md:470`: "**判据收窄**——收窄后重跑"。 |
| 9 | 9 | docs/batches/2026-10-14-sandbox-egress-removal.md | 🔵 | Fixed | 三数取齐——`docs/batches/2026-10-14-sandbox-egress-removal.md:150`: "键面 **14 ⇒ 13**"；键面实源 `docs/server/design/sandbox/SANDBOX.md:379`: "`pendingTimeoutSeconds` ⇒ 待批队列"；quota `docs/batches/2026-10-14-sandbox-egress-removal.md:185`: "现读 **120** 行（修正轮码面实读；设计档 `EXECUTION.md:281` 收口实读 118——±2 口径/时点差注）"；「16 组」替「14 处」（坐标见 #2）。 |
| 10 | 10 | docs/batches/2026-10-14-sandbox-egress-removal.md | 🔵 | Fixed | 判据 9 收口腿在册——`docs/batches/2026-10-14-sandbox-egress-removal.md:250`: "9. 收口轮：服务起服（实跑）零加载期报错 ∥ 管理侧/成员侧页面实走零 404"。 |
| 11 | (new) | docs/batches/2026-10-14-sandbox-egress-removal.md | 🔵 | Unfixed | 前轮新增（New）——零处置记录 ⇒ 仍悬（🔵 非阻断）：`docs/batches/2026-10-14-sandbox-egress-removal.md:219`: "**§14 件表**（`egress`/`dns-gate` 两行删；`box`/`routes`/`rules` 行随正）" 中 `rules` 行实档不存在——`docs/server/design/sandbox/EXECUTION.md` 全域 grep `rules` 仅 3 命中（`docs/server/design/sandbox/EXECUTION.md:113`: "`rules.mjs`（`listRules` ∥ `evaluateEgress` ∥ `HARD_DENY_CIDRS`"；另两处 = `rulesRev` 词面）；§14 件表无 `rules.mjs` 档；rules.mjs 件表行实档 = `docs/server/design/sandbox/SANDBOX.md:595`: "**实读 498**（2026-10-13 现读"（已由清面清单第 2 行「§13 件表/预算」覆盖——零残留风险）。建议：删半句或改指 `docs/server/design/sandbox/SANDBOX.md:595`。 |

计数：复审 11 条 = 10 Fixed（🔴×1 ∥ 🟡×6 ∥ 🔵×3 原级）+ 1 Unfixed（🔵 前轮新增——非阻断）；剩余 🔴 = 0；引用面 = 连续原文 ∥ 零省略号 ∥ 两处归属核实读（`docs/server/design/webui/SANDBOX.md:182` ∥ `docs/server/design/sandbox/SANDBOX.md:303`）。

VERDICT: pass

## §4 用户批准（主 agent）

**代签（主 agent）· 2026-10-14 21:4x**——依据 = 本批链授权口径（§1 :40「设计轮先行 → 评审（用户点火）→ 批准 → 实施」∥ 自动跑完链——轮次 2 机检引用面未过后按链序重跑）。

准予依据：§3 轮次 3 评审 = **VERDICT pass**（剩余 🔴 = 0；复审 11 条 = 10 Fixed + 1 🔵 非阻断——`rules` 半句项已并入清面轮清单同拍）。

**准予进入实施轮**：实施分派 = 码面 A 派（闸本体/盒链/路由装配 9 档）∥ 码面 B 派（成员面 UI/审计/文案/探针 10 档）∥ 清面派（设计档 14 档）∥ 单测档派（批内件 6 档——挂 A/B 派依赖）；需求档回笔 ∥ 跨批指纹族 = 父侧笔。

凭据 = 运行态（designId/令牌值不入档）。

## §5 实施记录（eng-coder）

**状态行**：实施完成 2026-10-14（码面 A/B 两派 + 单测档派（新建七腿 7/7 绿；两删三改 = 父侧代执行）；审计 ×1 + 代码评审 ×2（终态 clean））

### 实施记录 · 码面 B 派（eng-coder · 2026-10-14 · round = initial）

**派单与范围**：§2 摘除表 J/I2/I3/K/L 五行 = 10 档（成员面 UI ×4 ∥ 审计映射 ×3 ∥ 探针 ×1 ∥ 拉仓壳文案 ×1）。派外零写：`thincoder-server/src/**`（A 派）∥ 设计档（清面派）∥ 批内件测试（单测派）∥ 跨批指纹族/需求档（父侧笔）∥ `data/**`。

**逐档落定（处置 → 落定读数）**

| 档（§2 行） | 处置 | 落定 |
|---|---|---|
| `public/views-me-sandbox.mjs`（J1） | 收窄：表 5 列 ⇒ 4 ∥ 零轮询 ∥ 零 pending | 123 ⇒ **75** 行；`pendingHostOf`/`pendingHosts`/`PENDING_POLL_MS`/轮询代际/`alertBox` 删净；余导出三件仍被 `views-me-chat.mjs:18` 消费 |
| `public/views-me-chat.mjs`（J2） | 删/收窄：待批提示面亡 | 502 ⇒ **494** 行；`pendingLine` ∥ `pendingHostOf` 引用 ∥ 「出站被拒」注 ∥ 两处待批随动 `loadWorkspaces()` 全去净 |
| `public/i18n-{zh,en}-me.mjs`（J3） | −2 键/表（撤） | 160/161 ⇒ **158/159** 行；`me.sandbox.colPending`/`me.sandbox.pending` 删；余 14 键全有消费（无死键） |
| `public/style.css`（J4） | 纯删两处 | 383 ⇒ **379** 行；`.pending-line` 两规则 + 注行 ∥ `:380` 注行删；`.message.pending`（`markPending` 白名单）留守；`--warn-{fill,line,ink}` 仍由 `.flash` 消费（无孤儿变量） |
| `public/views-audit.mjs`（I2） | 映射 −1（撤） | `egress_apply_failed` 行删；同族死指注（「闸/配额下发」）收窄 |
| `public/i18n-{zh,en}-system.mjs`（I3） | 两键撤 | `audit.sandboxKind.egress_apply_failed` 删；映射 35 ≡ zh 35 ≡ en 35 闭合 |
| `deploy/sandbox-probe.mjs`（K1） | 五腿删 + `--target` 退场 | 679 ⇒ **538** 行；P2/P3/P4/P11/P12 脚本 ∥ 执行块 ∥ 报告行 ∥ 跳过表项 ∥ `--target` 全净；`PROBE_SCRIPTS` = P1 ∥ P5–P10 ∥ P13；P9/P10/P13/P14 留守块无悬空引用 |
| `deploy/sandbox/member-shell/pull.mjs`（L1） | 文案收窄 | `network` 人话 = 「网络不可达——请检查目标地址与网络连接后重试」；分类 key `network` 留守；头注 60s 待批窗句去 |

**判据读数（机检 · 2026-10-14 21:5x）**

- 判据 5：`rg -n "egress_apply_failed" thincoder-server` ⇒ **零命中** ✅
- 判据 1（更宽式）：`rg -n -i "egress|dns[-_]?gate" thincoder-server` ⇒ **零命中** ✅
- 判据 4：`rg -n "egressEnforce|pendingTimeoutSeconds" thincoder-server` ⇒ 零命中 ✅
- 判据 3：`rg -n "sandbox_pending|sandbox_rules" thincoder-server/src` ⇒ 仅 `src/store/migrations.mjs`（建表史白名单）✅
- 判据 6（本派面）：me 表 −2/表（14/14 同构）∥ `views-audit` 映射 −1 ∥ 探针腿集 = 留守腿 ✅
- 派单验收③：9 档 `.mjs` `node --check` 全 OK ✅（`style.css` = CSS，非 node --check 面——实读 379 行闭合完好）
- 探针真机跑 = 收口轮面（派单口径「本派只保语法与处置齐」）

**决策透明（表外同因触点——全披露）**

1. J1 连带删：`pollGeneration`/`alive`/`pollTimer`/`alertBox`/渲染代际（唯一用途 = 待批轮询环——随「零轮询」同拍）；
2. J2 连带：`:427`/`:441` 两处 `loadWorkspaces()` 调用删（原注释理由 = 待批提示随动——随面亡同删）∥ 头注第 4 行「待批不得静默」半句收窄（同 J2 行依据）；
3. K 连带收窄：注释「建盒链即闸就位『下发步』」句 ∥ 「配额/闸/镜像」⇒「配额/镜像」∥ 头注腿集 = 「留守腿 P1 ∥ P5–P10 ∥ P13 ∥ P14」（评审建议项采纳）∥ 头注 nft 例 ⇒「内核/进程态读数」（审计项）；
4. K 保留（判为非触）：`probeBody` 的 `host.Dns` 克隆透传（盒克隆保真件）∥ `:397`「盒内面（P1–P13）」面封套句（面分组名，非身份句）。

**审计与评审轮次（终态声明）**

- 内部分歧审计（explore · 1 轮）：`DEVIATIONS` = 2 条 LOW（`views-audit` 同族死指注 ∥ 探针头注 nft 例）⇒ 当场自修（自修轮 1/5）→ 复读净。
- 内部 advisor 代码评审（1 轮）：**pass**（零 🔴；🟡×3 + 🔵×1——皆非阻断）。处置：🔵（探针头注腿集）采纳落地 ∥ 🟡①（`approval` kind 同族残件——`views-audit.mjs:213` + 两表 `:199`；撤/留口径 = 设计级二择）⇒ 报父侧裁定（本派表外）∥ 🟡②（批档 §5/§6 空白）= 本段即 §5 落笔 ∥ 🟡③（探针 538 行 > 500 建议线）= 设计已预裁存量（`:179` 行数面注——拆案另议）。
- **终态 = clean**（零 🔴 ∥ 零未披露偏离 ∥ 派单判据全绿）。

**未落/偏离（逐条）**：无未落项 ∥ 实触 10 档 = 派单 10 档（零表外文件）∥ 上抛 = `approval` kind 同族残件（待父侧裁——撤/留二择）。

**读数订正（2026-10-14 21:5x——行号制取齐；回读实测）**：上表两处行数按「行号制」（= 本档 §2「现读」同口径；实测法 = 文末换行前最后一个行号）订正——`deploy/sandbox-probe.mjs` 679 ⇒ **537** 行（前书 538 系 read 工具表头口径（= 行号 + 文末换行——同一落定物，净删 **142**））∥ `public/style.css` 383 ⇒ **378** 行（前书 379——同口径差 1，实删 = 注行 1 + 规则 2 + `:380` 注 1 + 清双空行 1 = 5）。其余逐档行数（75 ∥ 494 ∥ 158/159 ∥ 246 ∥ 114）与全部判据读数不变。

### 实施记录（eng-coder · 2026-10-14 · round = initial · 码面 A 派 9 档）

**交付表（逐档——处置 ∥ 读数 ∥ 落点）**

| # | 档 | 处置 | 读数 | 落点 |
|---|---|---|---|---|
| 1 | A1–A3 闸本体三档 | **整删** | −380 ∥ −359 ∥ −498（设计现读） | `src/sandbox/egress.mjs` ∥ `dns-gate.mjs` ∥ `rules.mjs`——盘上已无、全树零引用 |
| 2 | B `box.mjs` | 收窄 | 686 ⇒ **619**（净删 67 ≤ 100） | B1–B12 逐处全落（import 五件 ∥ 步名表 ③ 项 ∥ `dns`/`Dns` ∥ `dnsServerOf` ∥ `stepEgress` ∥ 三链 ③ 调用 ∥ `assertServerAddress`+三调用 ∥ `bridgeNameOf`/`assertBridge`/Options ∥ `subnetOf`/`registerNetwork` ∥ 销毁链 pending 行 ∥ tick 临时集块 ∥ 头注/`resolveImpl`） |
| 3 | C `routes.mjs` | 收窄 | 407 ⇒ **304**（净删 103 ≤ 110） | C1–C9 逐处全落（两 import ∥ `publicBase`/`hostExec`/`pushEgress`/`injected` ∥ 登记 handler 段带入+`segments` ∥ 规则四端点+`egressState` ∥ 待批两端点+`notifyDecision` ∥ `bumpRulesRev`/`rulesRev` ∥ 成员行 `pending` ∥ `dnsGate`/`resolveImpl` 透传 ∥ 头注三处） |
| 4 | D `workspace-routes.mjs` | 收窄 | 312 ⇒ **306**（−6 ≤ 10） | D1–D3（pending 读+组装 ∥ 行 `pending` 键 ∥ `boxDeps.dnsGate`） |
| 5 | E `bin/thincoder-server.mjs` | 收窄 | 249 ⇒ **241**（−8 ≤ 15） | E1–E2（import ∥ 声明 ∥ stop ∥ 建闸+注入 ∥ start ∥ 失败路径 stop——全删；`hostExec` 留守） |
| 6 | F `src/agent/member-routes.mjs` | 收窄 | 485（0 ≤ 3） | `boxDeps.dnsGate` 删 |
| 7 | G `src/sandbox/registry.mjs` | 收窄 | 420 ⇒ **419**（−1 ≤ 3） | `pendingTimeoutSeconds` 删（`SETTING_KEYS` 14 ⇒ **13**） |

**判据读表（面内机检——命令 + 读数；cwd = `thincoder/`）**

| 判据 | 命令 | 读数 |
|---|---|---|
| 1 | `rg -i "egress\|dns[-_]?gate" thincoder-server/src thincoder-server/bin` | **零命中**（全 `thincoder-server` 域亦零命中——B 派面已随拍） |
| 2 | 名称面三行扫（`thincoder-server/src`） | **零命中**；白名单 `markPending`（聊天待发泡）在 `public/`，非本面 |
| 3 | `rg "sandbox_pending\|sandbox_rules" thincoder-server/src` | 仅 `src/store/migrations.mjs`（`:219` ∥ `:232` ∥ `:263` ∥ `:290`——停机留史白名单） |
| 4 | `rg "egressEnforce\|pendingTimeoutSeconds" thincoder-server` | **零命中** |
| 5 | `rg "egress_apply_failed" thincoder-server` | **零命中** |
| 6 | 结构件 | `BOX_CHAIN_STEPS` 长 6 无 ③（`box.mjs:29`）∥ 载荷零 `Dns` ∥ `createNetwork({ Name, Driver })` 零 Options（`box.mjs:184`）∥ 六端点（rules×4+pending×2）面全无 ∥ 成员行无 `pending` ∥ 键面 13 |
| 7 | `node --check` × 6 档 | **全绿** |
| — | 面内平跑（临时件、不入册；父侧收口可复跑） | 内存库+假件：建盒链绿（①→②→④→⑤→⑥→⑦ ∥ 0 闸面 host 调用）∥ tick 无 `egress` 键 ∥ `workspaceView` 无 `pending` ∥ 注销后注册表零 rules/pending |

**决策透明表（表外/同族改动——逐条，皆零行为差）**

| # | 改动 | 理由 |
|---|---|---|
| 1 | `box.mjs` 头注 `§5/§6` → `§3/§4/§8` | B12 同族·死指清理（§5/§6 随清面亡） |
| 2 | `box.mjs:4`/`:300`「启动确保链」枚举补 ④ | 评审收正（对齐实跑序 ①→②→⑤→④→⑥→⑦） |
| 3 | `bin:213` 注释收正（注入现无消费点——保留既有口径） | 评审收正（原「停/快照链所需」与实读不符） |
| 4 | `routes.mjs` 死导入 `tryPlacePending` 删 | 评审收正（HEAD 即零消费——diff 全域仅 import 行命中） |
| 5 | `const exec` ∥ `createHostExec`/`sandboxPublicBase` 导入 ∥ `stepNetwork` `deps` 参 ∥ destroy 头注「待批行」 | 随对应删除项的直接后果（零行为差） |

**残留列报（未动——非本面/待他派）**：`docker.mjs:11`/`:309` ∥ `ssh.mjs:191` 中文词面死指（设计标零触档）；`API-CONTRACT.md` 生成区待重跑（`bridgeNameOf`/`dnsServerOf` 仍列——收口前 `node scripts/api-contract.mjs --write`）；设计 §2 B6 步数注「7/6/5 ⇒ 6/5/4」与实读差一步（create 7⇒6 ∥ start 7⇒6 ∥ rotate 6⇒5——差源 = start/rotate 的 ④ 步）。

**审计与代码评审（轮次与终态）**

- **审计（explore·只读偏离审计）轮次 1**：A–H 逐处对上、判据面全绿；命中 2 项注释面偏离（`routes.mjs:49` 头注残「规则/待批」∥ `registry.mjs:350`「网段自动带入」死指）⇒ 自修落定。
- **代码评审（advisor·type=code）轮次 1**：6 档全读 ⇒ **pass**（0 🔴 ∥ 1 🟡 = `box.mjs` 越 500 建议线——存量、接受不修 ∥ 3 🔵 = 死导入/头注漏 ④/注释错称）。
- **fix round**：三 🔵（均零行为改）修正 → `node --check` 三档复绿。
- **代码评审轮次 2**：只核修正声明 ⇒ 三条全 **Fixed**、新增问题零 ⇒ **pass**。
- **终态 = clean**（收敛；无未决 🔴；唯一 🟡 为存量，沿批档口径「本批不扩、拆案另议」）。

**移交**：判据 7 全量回归 ∥ 判据 9 起服实跑 = 父侧收口；批内件 6 档 = 单测派；清面/需求档 = 各派面。本档零未落项（设计 §2 A–G 逐处全落）。

### fix 轮 1 · `approval` 审计 kind 三档清除（eng-coder · 2026-10-14 · round = fix）

**派单与范围**：§1 父侧裁（2026-10-14 22:0x——`:58`）＝ `approval` kind **撤**；三落点 = `public/views-audit.mjs:213` 映射行 ∥ `public/i18n-{zh,en}-system.mjs:199` 两键；依据 = 发射器随闸退场（沿 I2 `egress_apply_failed` 先例）；历史行原值兜底（`:228` 只读核、零改）。派外零写（其它 kind ∥ `migrations.mjs` ∥ `run.mjs` ∥ `:226` 头注 ∥ 其它产品面 ∥ 批内件 ∥ 跨批指纹族——全零触）。

**改动（三档三行——全删；行数 = read 编号口径）**

| 号 | 落点（前态 → 现行） | 改动 | 读数 |
|---|---|---|---|
| 1 | `public/views-audit.mjs:213` → 现 `:213` = `workspace_base` 行 | `-  approval: "audit.sandboxKind.approval",` | 247 ⇒ **246** 行（净删 1） |
| 2 | `public/i18n-zh-system.mjs:199` → 现 `:199` = `host_credential_set` 行 | `-  "audit.sandboxKind.approval": "审批裁定",` | 217 ⇒ **216** 行 |
| 3 | `public/i18n-en-system.mjs:199` → 现 `:199` = `host_credential_set` 行 | `-  "audit.sandboxKind.approval": "Approval decision",` | 217 ⇒ **216** 行 |

**验收读数（①–④——全绿）**

- ① `rg -n "audit\.sandboxKind\.approval" thincoder-server` ⇒ **零命中** ✅
- ② 三表计数 = **35 ⇒ 34/表**；删后**双向闭合**（映射 34 ≡ zh 34 ≡ en 34——正则抽键 + 集合比对，差异空）✅
- ③ `node --check` × **3 档**全绿 ✅（判据书「两 .mjs」——实检三档：views-audit ∥ zh ∥ en）
- ④ 兜底只读核：`views-audit.mjs:227`（原 `:228`——删行在函数上方，纯位移）`return SANDBOX_KIND_KEYS[kind] ? t(SANDBOX_KIND_KEYS[kind]) : String(kind ?? "—")` 在位、**零改** ✅
- 面（git diff 实读）：三行删除、零表外文件 ✅

**审计与代码评审轮次（终态声明）**

- 内部分歧审计（explore · 1 轮）：**CLEAN**——四类偏差（部分实现 ∥ 静默简化 ∥ 文档漂移 ∥ 表外改动）零命中；复证含「邻行连续 ∥ `migrations.mjs:228`、`run.mjs:17` 两史存项未误删」。
- 内部 advisor 代码评审（1 轮）：**VERDICT pass**（面内零 🔴；🟡×1 = 跨批指纹族协调项 ∥ 🔵×1 = 批内新档腿 ⑥ 归因注——皆父侧/单测派笔面，非三档缺陷、不阻断）。
- 自修轮 **0/5**；**终态 = clean**。未落/偏离：无（实触 3 档 = 派单 3 档）。

**父侧笔面读数（本派零写——收口复读用；实跑 + 机检）** [上抛·知会]

- 本批新验收档 `docs/batches/2026-10-14-sandbox-egress-removal.test.mjs`：实跑 **7/7 绿**（腿 ⑥「映射 ≡ zh ≡ en（34 条闭合）」✔）。
- `docs/batches/2026-10-08-server-public-structure.test.mjs`：实跑**红**——① 键集指纹 zh 实测 `7fc52009e43256974298032b99717bdf62cfe3b0f7b28d51b2e94e27b680b9e3`（钉 `63cdbd69…`）∥ 门面键数实测 **1126 ∥ 1131**（钉 1102 ∥ 1107）；**前态模拟**（补回 `approval` 键）= 1127 ∥ 1132，仍 ≠ 钉 ⇒ 漂移**先存**（同窗他批并计未落），本删再 −1/表。
- `docs/batches/2026-10-12-admin-chat-creds-merge.test.mjs`：实跑**红**——`:551` kind 族 **34 ≠ 36**（差 2 = `egress_apply_failed` + `approval` 两退役并计）。
- `docs/batches/2026-10-12-team-projects-permissions-ui.test.mjs`：实跑红于他面腿（`:171` 页表含 `/me/chat` ∥ `:206` shell 64 ≠ 61——前存漂移）；其 `:210` system 键数钉（198）未达断言，当刻实读 **192**。
- 面外残句（advisor 面外注 + 本节实读坐实，不给级）：`src/accounts/audit.mjs:12` 头注枚举仍载「审批三态/超时」（**中文词面**——父侧「approval」ASCII grep 网外；同族死指一类，处置属父侧/清面笔面）；`src/store/migrations.mjs:268` 同句 = 建表史注（判据 3 白名单，零处置）。

### 实施记录 · 单测档派（eng-coder · 2026-10-14 · round = initial）

**派单与范围**：批内件 6 档处置（两删 ∥ 三改 ∥ 新建七腿）。本派**可写面 = 新建本批单测档 1 档**；两删 + 三改五档遭**跨批写闸**三次拒绝（原文 `write refused — cross-batch batch-record write: this child is bound to 2026-10-14-sandbox-egress-removal.md; <档> belongs to a different batch`；探面 = 1 次 edit 探 + 2 次 delete 探）⇒ 未绕闸、即时上抛 `notify_parent`（ask）⇒ **父侧裁「① 父侧代执行五档」并已落定**。本派零写盘外文件。

**交付（本派手笔——1 档）**

| 档 | 处置 | 落定 |
|---|---|---|
| `docs/batches/2026-10-14-sandbox-egress-removal.test.mjs` | **新建**（七腿照 §2 `:217`） | **309** 行；`node --test` **7/7 绿**（本派实跑三读数：父侧删除落地前 6/7（腿① 红 = 预期、如实标注）∥ 删除落地后 7/7 ∥ fix 轮后 7/7） |

**七腿落点（逐条）**：① 两档不存 + 判据 1 四面零 `egress`/`dns-gate`（大小写不敏感）∥ ② `BOX_CHAIN_STEPS` 六步逐字 + 真链跑一遍（零 nft/探针外呼 ∥ `createNetwork` 载荷逐键 `{Name, Driver}` 零 Options ∥ 载荷零 `Dns` ∥ env 四键）∥ ③ 端点面 −6（六退场端点逐名 + `/rules|/pending` 词面空 + 总数 **30**（前值 36）+ 三留守点名）∥ ④ 成员行六键逐键（零 `pending`）+ me 表 **14** 键/表同构 ∥ ⑤ 两表命中面 ⊆ `src/store/migrations.mjs`（DDL/种子在档）∥ ⑥ `sandboxKind` 映射 ≡ zh ≡ en = **34** 条 ∥ ⑦ 判据 1/2/4/5 逐条零命中（判据 3 = 腿 ⑤）。断言全为行为/结构机检式（零新增散句锚）。

**五档（两删 + 三改）——父侧代执行（在案披露）**：闸拒后由父侧落定；父侧读数 = 两档删净 ∥ 三改档实跑 pass 1/1 ∥ 6/6 ∥ 25/25（父侧录；本派未复跑——父侧指令「无需复跑五档」）。本派核验面 = 两档不存（腿① 断言现为真）。

**决策透明表（同族触点——全披露）**：① 腿① 扫描面按评审收正自「`thincoder-server` 全域」**收窄到判据 1 四面**（`src/bin/deploy/public`——避免日后 README/脚本提及 `egress` 造成假红）；② 腿② 夹具期望值改由 `REGISTRY.DEFAULT_SETTINGS` / `QUOTA.PROJECT_ID_BASE` **派生**（不再硬编 `workspaceRoot`/`diskMb`）。

**审计与代码评审轮次与终态**

- 内部分歧审计（explore · 只读 · 1 轮）：**CLEAN**——七腿对表 §2 `:217` 逐条对上 ∥ 断言形式合规 ∥ 数值逐条实测复核（30/14/34/6/六键/两表命中面）∥ 五档状态读数在案。
- 内部 advisor 代码评审（轮次 1）：**pass**（零 🔴/🟡；🔵×4——① 腿⑥ 标签「−1」与断言 34（=−2）不合 ∥ ② 档面预算 ≈250 vs 实读 309 行 ∥ ③ 夹具硬编默认值 ∥ ④ 腿① 扫描面宽于判据 1）。
- **fix round 1**：① 三处标签改「本批 −2（`egress_apply_failed` + `approval`）」∥ ③ 两处改派生（常量实读在档：`quota.mjs:14` ∥ `registry.mjs:29/:33/:41`）∥ ④ 收窄判据 1 四面（fresh grep 全域零命中）；② = 档面数字，归父侧收口轮取平（本派零触设计档/批档）。
- **代码评审轮次 2**：只核修正声明 ⇒ **3 Fixed + 1 Accepted**（② 靶行 = 父侧笔面，非修理由成立）∥ 新增问题 **零** ⇒ **pass**。
- **终态 = clean**（零未决 🔴；唯一余项 = 批档 `:221` 两处旧数待父侧收口轮取平，在册）。

**未落/偏离（逐条）**：本派机检面全绿、零偏离；未落项 = 无（五档 = 父侧代执行，非未落）。设计收窄一处（腿① 扫描面）已在决策表披露并被评审确认。

**设计档漂移列报（本派零触——交父侧/设计席）**：① 批档 `:221` 预算「新 ≈250」vs 实读 **309** 行；② 同档同行腿⑥ 标签「−1」vs 落定「−2」（本批实际撤 2 kind：`egress_apply_failed` + `approval`）——两处待取平。

**交叉引用（闭环核销用）**：`fix 轮 1 · approval 审计 kind 三档清除` 记录 `:528` 所列 🔵「批内新档腿 ⑥ 归因注（单测派笔面）」= 本派评审轮次 1 发现 ①（同物：腿⑥ 标签「−1」对断言 34）⇒ 已由本派 **fix round 1** 落定（三处标签改「本批 −2：`egress_apply_failed` + `approval`」，评审轮次 2 复核 Fixed）——该 🔵 现闭环，父侧收口可据本条核销。

### fix 轮 2 · 沙盒闸面注释死指三处收正（eng-coder · 2026-10-14 · round = fix）

**派单与范围**：#23 残留列报 + 父侧实读——三落点注释面死指收正（闸面子句摘除 ∥ 批史注框架保留 ∥ 周边文字零动）。派外零写（代码 ∥ 其它注释/文件 ∥ 文档面 ∥ 批内件——全零触）。

**改动（三处——全注释面，零语义）**

| 号 | 落点 | 改动（前 → 现） | 读数 |
|---|---|---|---|
| 1 | `src/sandbox/docker.mjs:11` | 去「，闸匹配锚」（「本批增补（sandbox-exec-rebuild 批——执行面重做）：…」框架保留） | 现读「…`com.docker.network.bridge.name`）∥」 |
| 2 | `src/sandbox/docker.mjs:309` | 去「；`Options.com.docker.network.bridge.name` = 闸锚 `tcws<id>`」 | 现读「（建/删 = 动作类 15s）。」 |
| 3 | `src/sandbox/ssh.mjs:191` | 去「闸下发 ∥ 」 | 现读「// 恢复 SSH 备径）；命令不含 `sudo -S`…」 |

**验收读数（①–③——全绿）**

- ① 三短语（「闸匹配锚」∥「闸锚」∥「闸下发」）`thincoder-server` 全域 **零命中** ✅；「闸」字全域余 5 处皆非沙盒闸面（网关代理「无全局闸」×4 ∥ `derive.mjs:12`「并发闸」喻体）。
- ② `node --check` 两档全绿 ✅（docker.mjs ∥ ssh.mjs）。
- ③ `git diff`（两档）：**仅 3 行、全注释行**（`*` 块注 ×2 ∥ `//` ×1）✅；两档改动前 = git 干净态、改动后 diff 恰 3 行 ⇒ 表外文件零触。

**审计与代码评审轮次（终态声明）**

- 内部分歧审计（explore · 1 轮）：**CLEAN**——四类偏差零命中；三落点逐字、三短语零余、双档语法绿、框架句在、无表外改动证据。
- 内部 advisor 代码评审（1 轮）：**VERDICT pass**——零 🔴；🟡×1（`docker.mjs:11` 残留「`Options` 携桥名…」半句 = 同族死指后半段——契约外「其它注释零动」⇒ 报父侧裁）；面外注：`nft` 示例注三处（`ssh.mjs:145`/`:190` ∥ `hosts.mjs:124`——契约外存量）。
- 自修轮 **0/5**；**终态 = clean**（零 🔴 ∥ 零未披露偏离）。

**未落/偏离（逐条）**：无未落项 ∥ 实触 2 档 3 行 = 派单 2 档 3 行 ∥ 上抛[待裁] = ① `docker.mjs:11`「携桥名」半句（撤/留，父侧裁）② `nft` 示例注三处（同族残留——待裁）。

**fix 轮 2 追加件（超派单——files 声明 +1 档；父侧 2026-10-14 22:2x 追令）**

- 改动：`src/accounts/audit.mjs:12`——头注 `sandbox_event` 枚举摘「审批三态/超时 ∥ 」（余「盒起停拆 ∥ runner 注册/排空/删除 ∥ join 失败 ∥ 快照」逐字保留——`:13` 零动）。
- 依据：本批 `approval` kind 三档随 fix 轮 1 撤净 ∥ 待批面整套退场 ⇒ 该子句为死词；全域 `approval` 余项皆非沙盒 kind（`migrations.mjs:228` settings 表 source 史枚举 ∥ `run.mjs:17` TRIMMED_FACES ∥ `i18n-en-core.mjs:60` 通用英文）。
- 读数：diff = **1 行**（注释）；`node --check` 绿；档内 `审批|超时|approval` 零命中；改动前该档 git 干净态（零基线）。
- 轮次注：本件落定于审计/评审轮之后（父侧追令）——机械三读数直核 ∥ 未单开审计/评审轮（一件注释子句、派单方逐字口径；且该残句已由 fix 轮 1 §5 advisor 面外注与本轮审计面外注两度列报）。

## §6 验证与收口（父代理）

### 6.1 收口机检读数（判据 1–9 逐条）

| 判据 | 口径 | 读数 | 出处 |
|---|---|---|---|
| 1 | `egress\|dns[-_]?gate` 四面（src/bin/deploy/public） | **零命中** ✅ | 父侧实跑（grep，cwd=`thincoder/`） |
| 2 | 名称面三行扫描（同面） | **零命中** ✅ | 父侧实跑 |
| 3 | `sandbox_pending\|sandbox_rules` 仅建表史 | 命中面 = `src/store/migrations.mjs`（DDL/种子/史注 4 处）——**白名单** ✅ | 父侧实跑 |
| 4 | `egressEnforce\|pendingTimeoutSeconds` | **零命中** ✅ | 父侧实跑 |
| 5 | `egress_apply_failed` | **零命中** ✅ | 父侧实跑 |
| 6 | 结构件（步 6 无 ③ ∥ 零 `Dns` ∥ 零桥名 Options ∥ 端点 −6 ∥ 成员行无 `pending` ∥ me −2 ∥ 映射 −1） | 由批内新档腿 ②③④⑤⑥ 逐条断言——**父侧复跑 7/7 绿** ✅ | `docs/batches/2026-10-14-sandbox-egress-removal.test.mjs` |
| 7 | 建盒链绿（批内新件 + 父侧收口跑） | 新件 **7/7** ✅ ∥ 三改档 **1/1 ∥ 6/6 ∥ 25/25** ✅（两删档已删） | 父侧实跑（五档代执行读数在 §1） |
| 8 | 文档面词扫 + 相抵清单取齐 | 全量 grep 命中面 = 记录面/停机留史注/退场句——**零裸词** ✅（补笔一处：`gateway/API.md` §5 判据行「拉仓四态 ⇒ 三态」——清面轮漏项，父侧补笔在案） | 父侧实跑 + 逐条核 |
| 9 | 服务起服（实跑）零加载期报错 ∥ 管理侧/成员侧页面实走零 404 | 本地真服 `ready`（`routes 135`，零加载期报错）✅ ∥ 实走 **105 请求零 404**（我的工作区/沙盒/审计三页 + 全资产面；截图 2 张在卷）✅ | 父侧实跑（2026-10-14 22:21–22:26） |

### 6.2 测试随正与跨批指纹族（父侧笔）

- 两档删净 ✅（`…-egress.test.mjs` ∥ `…-egress-probe-fix.test.mjs`）；三改档 = 单测派派内 + 父侧代执行（§1 在案）。
- 本批新档 **309 行 · 7/7 绿**（单测派交付 + 父侧复跑一致）。
- 跨批指纹族随正 **5 档**（实更 + 复跑）：`2026-10-08-server-public-structure`（1126∥1131 · **6/6 绿**）∥ `2026-10-10-runner-admin-console-ui`（[1126,1131] · **6/6 绿**）∥ `2026-10-11-console-tabs-component`（1126∥1131 · **9/9 绿**）∥ `2026-10-12-admin-chat-creds-merge`（kind 族 36⇒34 · **8/8 绿**）∥ `2026-10-12-team-projects-permissions-ui`（:210/:214/:215 ⇒ 192/1126/1131；被 :171/:206 两红阻断未达——**他批面**，见下）。
- 他批面残红（非本批射程，台账 **#1448** 在册）：`team-projects-ui` :171（我的 7 ≠ 钉 6——chat 批连带）∥ :206（shell 64 ≠ 61）∥ `2026-09-29` 两档（CLI/desktop 漂移四因）。

### 6.3 文档清面与需求档回笔

- 设计面清面 **14 档**（清面轮 · eng-designer 交付 + §2 写入）✅；补笔 2 处：`gateway/API.md` §5 判据行（四态⇒三态）∥ `design/PROJECT.md` 预算残行（`views-sandbox-egress.mjs` 未落盘退场标）——均「父侧直接执行 · 可 revert」标。
- 需求档 **16 组回笔**（父侧笔 · 变更记录 `docs/server/requirements/PROJECT.md:795`）：14 组落（AC-36 ③④⑥⑦⑧ ∥ §5 出站块退场留档 ∥ 探针句 ∥ 界面块 ∥ 成员面 ∥ 状态面 ∥ 功能点 50②/AC-50②/拉仓句）+ 3 组核后零动（`:531` 权限义 ∥ `:668`/`:791` 记录面）。
- `docs/core/design/API-CONTRACT.md` 生成区重跑：**4189 条 · `--check` 零漂移** ✅；旧闸符号（`bridgeNameOf`/`dnsServerOf`/`NFT_TABLE`）零余 ✅。
- 注释面死指收正（fix 轮 2 + 追加件 + 父侧同族三笔）：`docker.mjs:11`（`Options` 直通）∥ `:309` ∥ `ssh.mjs:145/:190/:191`（`tar xzf -` 收体）∥ `hosts.mjs:124`（去「盒链 ③」）∥ `accounts/audit.mjs:12`（去「审批三态/超时」）——四档 `node --check` 全绿；`migrations.mjs:268` 同类句 = 建表史注（白名单，零处置）。

### 6.4 真机余项（未落——一件，用户侧）

- **迁移表行 6/7**（`docs/batches/2026-10-14-sandbox-egress-removal.md:208-209`）=「收口轮真机动作」，父侧无 .6 直连凭据（SSH 实试拒：`Permission denied (publickey,password)`）；经 **.5 管理面 chat `exec` 设计径**亦受阻——**.5 当前浏览器会话 sk 已吊销**（审计实读：「模型调用失败：管理会话模型凭据缺位（admin-agent sk 未在册或已吊销）——请重新登录控制台」，两模型两试皆 0s 挫）。**续径（择一）**：① .5 重登后父侧续跑；② 用户直跑（先核后销）：

  ```sh
  nft list tables; iptables -S | grep -Ei "tc_sandbox|thincoder_egress|TC-EGRESS"; ls -la /root/nft-backup-20261014.txt   # 核（期望：零残留 + 锚在）
  rm /root/nft-backup-20261014.txt   # 销（核零后）
  ```

- .5 部署面 = 仍是旧码（撤销未部署——部署不在本批射程；设计/需求已终态化，下一部署轮自然带上）。
- 本地 dev 库 `admin` 口令曾重置为配置缺省值（`admin12345`——原口令非配置值致登录 401；本机兜底 CLI 径，`member passwd` 审计一行在库）。

### 6.5 结算清单（D7 同步）

- 角色表六段齐：§1 主 agent ∥ §2 eng-designer ∥ §3 评审子代理（三轮）∥ §4 用户批准 ∥ §5 eng-coder（六笔）∥ §6 主 agent。
- 状态行：§1 ⇒「已收口 2026-10-14」∥ §2「设计完成」∥ §5「实施完成」。
- 计数：批内件 6 档 = 2 删 ∥ 3 改 ∥ 1 新（309 行）；指纹族随正 5 档；设计档清面 14 档；需求档 16 组。
- 指针：§2 清面清单 14 档 + 需求 16 组坐标 = 本收口轮实读全可达 ✅。
- 变更记录：需求档 +1（`:795`）∥ 设计档 14 档各 +1（清面轮）+ 补笔 1（`design/PROJECT.md`）∥ 本档六段在卷。
- 待办勾销：台账 #1433 ⇒ 已核销（evidence = 本 §6）∥ #1248 ⇒ 撤回（对象已删——P2/P3 腿随退场）∥ #1448 = 本批新落（跨批残 · 归批）。
- 前批遗留交叉核：上批（#1441 跨仓勘察）已收口，无遗留；本记录 §6 未决项 = 仅 6.4 真机一件（指针在册）。
- 暂缓批复核：**无**。
- 台账可见面（结算线）：收口回复随附 `ledger` 查询读数。

### 6.6 交付判定

判据 1–9 全绿（1–5 零命中/白名单 ∥ 6–7 机检绿 ∥ 8 退场句/记录面 ∥ 9 起服 + 实走零 404）；唯一未落 = 真机两行（凭据面受阻，6.4 列明用户侧一步 + 命令逐字）。**本批 = 收口**（真机两行 = 文外动作，不阻断收口——在册待办）。
