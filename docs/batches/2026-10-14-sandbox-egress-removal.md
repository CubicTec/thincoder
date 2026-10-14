# 2026-10-14 · 沙盒出站闸整套摘除
> 六段 append-only，一段一作者：§1 讨论（主 agent）· §2 批次任务与设计（eng-designer）· §3 设计评审（评审子代理）· §4 用户批准（主 agent）· §5 实施记录（eng-coder）· §6 验证与收口（父代理）。
> 编制：主 agent · 2026-10-14 · 来源 = 用户 2026-10-14 20:32 裁定「整套摘除，待批那个是根本原因，那真是个无比愚蠢的设计。」（承台账 #1433 ② 路；20:35「ok」= 建批开跑）。
> 台账 = #1433（server · 归批）。前情 = 无（独立批）。
## §1 讨论（主 agent）
**状态行**：🔄 进行中（…）
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

## §2 批次任务与设计（eng-designer）
**状态行**：设计完成（摘除全清单 + 留守复核 + 迁移待裁 + 测试/文档随正清单 + 删净判据齐；设计档清面 = 评审后一轮落笔（披露在册））
<§2 模板占位：本批条目（覆盖） / 设计档落点 / 机制设计 / 受影响文件与测试覆盖 / 验收对照 / 关键决策 / 上抛项>

### 2. 批次任务与设计（eng-designer · 2026-10-14 · round = initial）

**来源与授权**：用户 2026-10-14 20:32 裁定「整套摘除，待批那个是根本原因，那真是个无比愚蠢的设计。」（承批档 §1；台账 #1433）。设计轮口径：零产品码 ∥ 零真机动作 ∥ 需求档零触（相抵处列报——见上抛 2）。

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
| A3 | `src/sandbox/rules.mjs`（现读 **498**） | **删**（整档） | 出站规则单源 + 待批队列 + 网段带入 + `evaluateEgress`；全导出面 = 闸（实读：消费面仅 A1/A2 + routes——零非闸消费）；台账 #1352（拆案）对象随之消亡 |

**B · 盒链 `src/sandbox/box.mjs`（现读 686——收窄）**

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

**C · 路由 `src/sandbox/routes.mjs`（现读 407——收窄）**

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

**D · 工作区面 `src/sandbox/workspace-routes.mjs`（现读 312）**

| D1 | `:60-64`（读 `sandbox_pending` + `pending` 组装） | 删 | 表停读 |
| D2 | `:76`（返回行 `pending` 键） | 删 | 管理面契约收窄（API §2.5 同拍） |
| D3 | `:90`（`boxDeps.dnsGate`） | 删 | —— |

**E · 进程装配 `bin/thincoder-server.mjs`（现读 249）**

| E1 | `:30` import ∥ `:100` 声明 ∥ `:118` stop ∥ `:185-187`（注释 + 建闸 + 注入）∥ `:221` start ∥ `:234` 失败路径 stop | 删 | DNS 闸进程面全摘（`hostExec` 留守——tick 面注入用） |
| E2 | `:184`/`:218`/`:220` 注释三处 | 收窄 | 死指清理 |

**F · 成员面装配 `src/agent/member-routes.mjs`（现读 485）**

| F1 | `:141`（`boxDeps.dnsGate`） | 删 | —— |

**G · 设置面 `src/sandbox/registry.mjs`（现读 420）**

| G1 | `:38`（`pendingTimeoutSeconds: 60`） | 删（键面 13 ⇒ 12） | 设置键收窄（残留表行惰性——`getSettings` 白名单读）；`sandboxPublicBase`/`LIMIT_KEYS` 余键留守 |

**H · 数据面 `src/store/migrations.mjs`（现读 795）**

| H1 | `:219-231` ∥ `:232-242`（两表 DDL）∥ `:288-298`（种子八行）∥ `:263` 注释 | **待裁**（停机留史 ∥ 删表迁移） | 迁移表行 1/2 |

**I · 审计面**

| I1 | `box.mjs:316` ∥ `egress.mjs:330`（kind 写入点） | 删 | 随 B5/A1 |
| I2 | `public/views-audit.mjs:222`（kind 映射） | **待裁**（撤 ∥ 留枚举供史） | 迁移表行 5 |
| I3 | `public/i18n-{zh,en}-system.mjs:212`（`audit.sandboxKind.egress_apply_failed` 键） | **待裁**（同 I2） | —— |

**J · 成员面 UI**

| J1 | `public/views-me-sandbox.mjs`：`:15-16` ∥ `:45-54` ∥ `:72-77` ∥ `:84` ∥ `:86`/`:93` ∥ `:98-102` ∥ `:112` ∥ `:1-11` 头注 | 删 | 表 5 列 ⇒ 4 ∥ 零轮询 ∥ 零 pending |
| J2 | `public/views-me-chat.mjs`：`:18` ∥ `:68-70` ∥ `:114` ∥ `:139-141` ∥ `:390` ∥ `:427`/`:441` ∥ `:481` | 删/收窄 | 待批提示面亡（`:390`「出站被拒分类」注收窄） |
| J3 | `public/i18n-{zh,en}-me.mjs`：`me.sandbox.colPending`（:75/:76）∥ `me.sandbox.pending`（:81/:82） | 删（−2 键/表） | 零消费 |
| J4 | `public/style.css:333-335`（`.pending-line`）∥ `:380` 注释 | 删 | 零存活消费（纯删——四轴 canon 不破） |

**K · 探针 `deploy/sandbox-probe.mjs`（现读 679）**

| K1 | `:52-67`（SCRIPT_P2/P3/P4）∥ `:173-237`（SCRIPT_P11/P12）∥ `:498-499`/`:511-513`/`:547-620`（执行块）∥ `:7`/`:10-11` 头注句 ∥ 仅 P11 服务的 `--target` 前置 | **删**（建议——决策 D4） | 期望值随闸反转（「拒/闸生效/待批」判据亡；留 = 假红） |

**L · 拉仓壳文案 `deploy/sandbox/member-shell/pull.mjs`（现读 114）**

| L1 | `:11-12` 头注（「含 60s 待批窗超时后的连接失败」）∥ `:42-44`（`network` 类人话「如是新目标域，请联系管理员放行」） | 收窄 | 出站被拒判据退场 ⇒ 文案归「网络不可达」；分类 key `network` 留守 |

**M · 表内残留/历史面（零动——如实）**：`data/gateway.db`（本机开发库，含两表行——零触）∥ 审计历史行（`egress_apply_failed` 等——在库原值）∥ 设计档字符（随 §6 清面）∥ 段号体系。

**留守复核表（逐面实读读数——2026-10-14；围栏面零改，发现即列报）**

| 面 | 实读读数 | 结论 |
|---|---|---|
| 资源上限（quota） | `quota.mjs` **120** 行；grep 零 egress 交；建盒链 ② 步独立（`box.mjs:346`） | 零触 |
| 盒链其余（卷/网络/容器/启动/轮换/回收/快照/定时器/放置） | `box.mjs` **686** 行；五链步序逐条在册；快照/恢复/销毁/放置面零闸引用 | 只摘 B 表逐处；余零触 |
| 拉仓/登记 | `pull.mjs` **114** ∥ `member-routes.mjs` **485** ∥ 项目源登记面 grep 零 egress 交 | 零触（L1 文案收窄除外） |
| 主机凭据/SSH | `ssh.mjs` **226** ∥ `hosts.mjs` **134** ∥ `host-credential.mjs` 零 egress 交 | 零触 |
| 镜像/终端/卷 | `docker.mjs` **422**（网络族客户端留守——Options 直通，B8 载荷变更由其透传）∥ `terminal-*` ∥ `volume-routes.mjs` 零交 | 零触（B8 = 唯一网络载荷触点——列报） |
| 探针余腿 | P1 ∥ P5–P10 ∥ P13 ∥ P14 留守（删五腿后 `sandbox-probe.mjs` ≈ −150 行） | 零触 |
| 工作区/设置/成员面余项 | 设置键 13 ⇒ 12（G1）；工作区六端点留守；成员面 5 列 ⇒ 4 列 | 收窄面已入清单 |

**迁移方案表（建议 + 代价——每行 [待裁]，待用户拍）**

| # | 项 | 建议 | 代价 | 替代（代价） |
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

1. `docs/server/design/sandbox/EXECUTION.md`：`:41`（③ 出站闸下发步）∥ **§5 全节**（`:108-123`）∥ **§6 全节**（`:125-142`）∥ `:51-52`（桥名 = 闸锚）收窄 ∥ §12 用例（N66 待批行 ∥ N67 ∥ B73 ∥ P 腿）∥ §13 件表（`egress`/`dns-gate` 两行删；`box`/`routes`/`rules` 行随正）∥ §14 KD-SV-164/165 删 ∥ §15/§17 余项 ∥ 变更记录 +1。
2. `docs/server/design/sandbox/SANDBOX.md`：§2 表两行注「停机留史」∥ §4 出站规则全节 ⇒ 承接句 ∥ §6 待批队列全节删 ∥ §8（六面收窄 ∥ `pendingTimeoutSeconds` 行删 ∥ 成员面 pending 句删）∥ §9 端点句 ∥ §11 判据行 ∥ §12 用例 ∥ §13 件表/预算 ∥ §14 KD-SV-69/136/137/139 删 ∥ §15/§16 ∥ 变更记录 +1。
3. `docs/server/design/webui/SANDBOX.md`：§2.1④（待批卡）∥ §2.2（待批列/提示/轮询）∥ §3（`views-sandbox-egress.mjs` 拟新增行删）∥ §4 判据行 ∥ 键族登记（me −2）∥ 变更记录 +1。
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
14. 需求档（= 父侧笔——**相抵处列报**）：`:435`（AC-36 ③④⑧）∥ `:506` ∥ `:519` ∥ `:525` ∥ `:527` ∥ `:531` ∥ `:540` ∥ `:549` ∥ `:668` ∥ `:693` ∥ `:791`——把出站闸/待批/成员提示写为在册功能 ⇒ 须回笔或撤回（写法/计数 = 父侧定）。

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
8. 文档面：`rg -n "出站闸|域名闸|待批" docs/server/design docs/server/requirements` ⇒ 仅记录面（变更记录 ∥ 停机留史注 ∥ 退场句）。

**关键决策**

- D1 三档整删（零骨架 ∥ 零 flag）：留 flag（`egressEnforce` 缺省关）= 现行关态，而**关态残留规则正是本日事故根因** ⇒ 否。
- D2 `assertServerAddress` 同删（理由句逐字绑定闸面 ⇒ 死栅栏；保留会误停建盒）。
- D3 桥名锚（Options + 读回复核）同删（唯一用途 = 闸锚；保留 = 壳）。**唯一非纯删触点**（网络载荷变更）——列报。
- D4 探针五腿同删（期望随闸反转；留 = 假红）。
- D5 规则/待批六端点同删；管理侧出站规则 UI 从未建（勘察① ⇒ API-only ⇒ 零 UI 摘除件）。
- D6 成员面契约收窄（`pending` 字段 + 列 + 提示 + 轮询全删）。
- D7 两表停机留史（沿 onboarding 先例）——待裁。
- 被否候选：① 只删下发留规则面（= 留壳，且 498 行零消费）② 留待批只删闸（用户点名待批为根本原因）③ 节点侧只拆不回改仓（残留复发——事故根因即「只不推不回收」）。

**上抛**

- **[待裁] §5 迁移表七行**（表 ×2 ∥ 键 ×2 ∥ kind ∥ 备份锚 ∥ 节点复核）——建议列在案，待用户拍。
- **[上抛·待裁] 需求档相抵处**（父侧笔）：14 处坐标见 §6 第 14 行。
- **[上抛·知会] B8 网络载荷变更**（唯一非纯删触点：`networks/create` 去 Options；功能零差；N65 断言随正）。
- **[上抛·知会] 文档清面时点**（评审后一轮落笔——见上注）。
- **[上抛·知会] 探针五腿删除**（建议删；若判留 ⇒ 假红在册）。

**机检读数（本轮——写前基线；本批未触设计档 ⇒ 读数 = 基线，零新增）**：`node scripts/doc-check.mjs --root .`（cwd = `thincoder/`）——
悬空 **24**（FAIL(锚) 阈值 0；域外 19 = `docs/core/design/MEMORY.md` 18 + `docs/core/requirements/MEMORY.md` 1 ∥ 域内 5 = `ADMIN-AGENT.md:171`/`:265`/`:650` ∥ `mcp/MCP.md:175` ∥ `sandbox/SANDBOX.md:266`——皆先存）。
行宽 FAIL **3**（`docs/core/design/PROMPT-SYSTEM.md:655` ∥ `docs/core/design/TOOLS.md:1382` ∥ `docs/server/requirements/PROJECT.md:567`）∥ 行数面差异 86 条（报告态）。**写后复读（同轮）**：悬空 24 ∥ 行宽 3 ∥ 行数面 86——与本批写前同值（零新增红；`docs/batches` 不入扫描面）。

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

## §4 用户批准（主 agent）
## §5 实施记录（eng-coder）
## §6 验证与收口（父代理）
