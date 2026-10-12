# Thincoder Server · 团队项目与权限（project/PROJECTS）

> 板块 = server ∥ 本档 = project 域（团队项目与权限——git 源接入 ∥ 仓表/项目 ∥ 权限三档 ∥ 成员同步；2026-10-12 B2 批新立）；板总览 = `PROJECT.md`（文档地图 = §3）。
> 需求单源 = `docs/server/requirements/PROJECT.md`（功能点 44 ∥ AC-44；13 条裁定逐条 = 台账 #1216）；本域回指 = `PROJECT.md` §7（AC-44 判据 = 本档 §9）。
> 界面承载 = `webui/PROJECTS.md`（面档——页族/导航/入口单源）；端点表 = `gateway/API.md` §2.9（单源）；存储段 = `store/STORE.md` §2 v17（单源）；审计 = `accounts/ACCOUNTS.md` §2.1（`project_event` 行）。
> 建档：2026-10-12（批 `docs/batches/2026-10-12-team-projects-permissions.md` 设计轮——B2 批；台账 #1216）。

## 1. 定位与形态

- **一句话**：把「团队项目」与 git 平台接起来——项目/仓从 git 源来、成员跟着平台单向同步、本地只管「谁能看/谁能写」（三档：只读 ∥ 读写 ∥ 管理；未授权即不可见）。
- **落点**：代码 = `thincoder-server/src/project/`（新域——本档 §8）；文档 = 本档 + `webui/PROJECTS.md`（面档）。
- **场景边界（需求 44 边界）**：企业项目才有本机制；个人单仓不挂同步；不做反向写回平台（平台 = 身份源，单向跟随）。
- 域词表（全文一体一名）：**项目** = 一行 = 一个 git 仓（项目 ↔ 仓一对一，需求裁）；**源** = git 平台接入（一行一源）；**成员行** = 项目成员表一行（用户名 × 档位 × 来源）；**来源** = manual（本地维护）∥ sync（平台同步）；**档位** = 只读（read）∥ 读写（readwrite）∥ 管理（manage）。

## 2. 关键决策（本域）

| # | 决策 | 理由 | 被否候选与何故否 |
|---|---|---|---|
| KD-SV-115 | **新立 `project` 域**（代码 `src/project/` ∥ 档 = 本档；否并 `accounts` 域） | 职责独立（git 平台接入 + 项目实体 + 项目级权限层 + 同步引擎——与「账号/会话/凭据自身」不同层）；文档热面隔离（`accounts/ACCOUNTS.md` 多批共触——新域 = 新并发隔离单元）；体量（≈6 档 ≈1150 行——超 accounts 单域相称体量） | 并 `accounts` 域（职责混杂：源接入/同步引擎与账号体系无关；`ACCOUNTS.md` 续胀）；并 `sandbox`/`webui` 等（题不符）；拆两域（源 ∥ 项目——强耦合：加仓/同步共用源与映射，拆则跨域往返） |
| KD-SV-116 | **成员身份 = 统一用户名键**：成员行以用户名为键（本地成员 = `members.username`；平台侧 = 平台账号名）；**同名即对接**（大小写不敏感——`COLLATE NOCASE` 唯一）；平台行（origin=`sync`）遇同名手工行（origin=`manual`）⇒ **手工行优先，同步不触**；成员行**不要求本地账号存在** | 一个命名空间免第二张「身份绑定」表与绑定界面（体量最小）；同名对接 = 企业内账号惯例；手工优先 = 本地决定不被同步覆盖；不要求账号存在 = 平台名册可如实落库（「那边添加了用户这边也添加」字面可达） | 双表 + 绑定界面（平台身份 ↔ 本地账号——机制翻倍，需求未提）；仅本地成员（平台名册须先建账号才可见——违背「跟着平台走」）；大小写敏感（两写形分裂为人） |
| KD-SV-117 | **同步作用域 = 源级成员表**（组织/企业/组——三平台端点据调研在册）：拉源的名册 ⇒ 应用到**该源下全部项目**（底线档按映射表；手工行升档）；**仓级协作者角色本批不拉**（映射表附注对照——证据边界见 §4） | 端点证据仅覆盖组织/企业/组级成员表（台账 #1216 调研实读）；逐仓拉取 = N×M 调用且 gitee 仓协作者端点未逐条实核；用户模型 = 「源（组织）加人 ⇒ 这边跟」；底线 + 手工升档 = 档位可控且不被同步回退（手工行优先——KD-SV-116） | 逐仓协作者（档位更准，但证据未齐 + 调用面大——如需要另批扩展）；纯手工成员（违「能同步的同步」） |
| KD-SV-118 | **事件进路 = github 成员事件接收端**（承 R63 乙裁——用户 2026-10-12 授权）：源行持 `sync_mode`（`poll` ∥ `event`；缺省 `poll`）+ 平台能力矩阵注明可事件平台（github）；接收端 = §13（`POST /api/hooks/git-sources/:id`——公开面，门 = 每源独立密钥 `hook_secret_cipher` 的 HMAC-SHA256 验签；github 侧 webhook = **手动登记**——保零反向出站（AC-44⑥））；**`event` 语义 = 事件触发（近实时）+ 定时对账兜底 + 手动恒在**（消「置 event ⇒ 零自动同步」死区——调度判据不设模式门）；触发 = 跑该源一次成员同步（载荷不解析——名册全量对账幂等） | 事件近实时性（需求 44③⑦「能同步的同步」）+ 乙裁授权；手动登记 = 零反向写回纪律下的唯一登记形；定时对账把「投递不达/公网未达」兜在可用线以上（功能可用性不依赖事件）；全量对账 = 重复/乱序投递天然幂等 | 甲案（接收端不落、字段在册——原 v1 裁）：用户 2026-10-12 裁弃（近实时性为上）；webhook 由 server 代登记（破「零反向写回」——AC-44⑥ 逐字）；按载荷做增量应用（重复/乱序面复杂化——全量对账已幂等）；不设验签（公网可伪造触发） |
| KD-SV-119 | **PAT 加密 = 共享凭据件** `src/store/credential-crypto.mjs`（拟新增）（`loadOrCreateCredentialKey` ∥ `encryptSecret` ∥ `decryptSecret` 三件自 `thincoder-server/src/sandbox/onboarding.mjs` 逐字抽出 ∥ **键路径派生 `credentialKeyPath(config)` 同件收口**——单一出处（= `join(<`db` 档所在目录 ∥ 缺省 `data`>, "credentials.key")`——与 onboarding 现 `dataDir(config)`+`join` 逐字同值；sandbox ∥ project 两域消费同址——防第二份路径规则）；键文件 `data/credentials.key`（0600 ∥ 首用生成 ∥ 不落库）；包形 = `iv|tag|ct` base64 三段）；`onboarding.mjs` 同名再导出（零改调用方）；界面/接口永不回显原文（掩码 = `…`+末 4） | 双消费方出现（sandbox 托管接入 + 本域 PAT）⇒ 凭据机制单源；沿用既有加密先例（KD-SV-84）——零新算法 | 复制一份进本域（包形/键管理两处漂移）；本域反向依赖 sandbox 域（方向错——sandbox 会引 agent 重件）；明存 PAT（违需求 44⑤「加密存」） |
| KD-SV-120 | **未授权即不可见 = 两径口径**：列表径 = 非成员零出现（SQL 层过滤）；按 id 直取径 = **404 `not_found`**（消息「项目不存在或不可见」——存在性与不可见不辨，防枚举口径沿登录面先例） | 需求 44②「未授权即不可见（默认关着）」+ AC-44④「接口明示拒绝 + 页面不显示」；404 不辨 = 不泄露存在性；列表零出现 = 页面不显示 | 403（明示「无权限」——泄露存在性；与「不可见」相抵）；200 空壳（非明示拒绝） |
| KD-SV-121 | **能力矩阵与分权边界**（判据句 = §3）：负责人（`owner_username`）= 加/减成员 + 改显示名；档位「管理」= 加/减成员（含改档位）；**改仓地址仅 admin**（仓地址 = 记账键——改了账对不上）；负责人指派/更换 = admin；负责人**不可被非 admin 移除/降档**（保护） | 需求 44② 逐条（负责人边界 + 改仓地址仅 admin）；AC-44④「管理能加人」；负责人指派无既有角色可承（新增位）——归 admin（保守；加仓本就 admin 专属——同一层） | 负责人可自转让（需求未提——机制外扩）；管理档可改仓地址（违需求明条）；负责人即「管理档 + 名分」（名分与档位混一——同人多项目档位不一，分拆更清） |
| KD-SV-122 | **同步结果与体检 = 自含状态形 + 独立 PAT 状态**：同步/体检/拉列表三读动作走自含形（成 ⇒ `{ok:true,…}`；败 ⇒ `{ok:false,error:{kind,message},ms}`——沿代理测试/镜像源先例）；源行持 `last_sync_at` + `last_sync_result_json` + `token_state`（`unknown`∥`ok`∥`invalid`——失效标红）+ `token_checked_at`；**单源并发锁**（进行中重触发 ⇒ 400 人话）；**删源防护**（还挂项目 ⇒ 400「尚有 N 个项目挂此源」——零新码）；成员拉取截断 ⇒ **跳过删除段**（只增改不删——防误删） | 「记录不缺、是显示缺」教训的反面正例（结果如实入库 + 界面人话）；体检与同步分列 = 失效可独立呈现；截断误删 = 数据正确性问题（宁不删）；锁 = 同一源并发写成员表单事务面的最小防 | 失败抛 5xx（诊断面差）；token_state 并入 sync 结果（体检独立动作无处落）；删源级联删项目（数据破坏）；截断照删（误删） |
| KD-SV-127 | **事件接收端 v1（github）= 公开端点 + 每源密钥验签 + 触发式全量对账**（承 R63 乙裁——用户 2026-10-12 授权；机制全文 = §13）：① 端点 `POST /api/hooks/git-sources/:id`（无会话；公网暴露面如实注——内网部署期事件不达，定时对账兜底）；② 门 = `X-Hub-Signature-256` HMAC-SHA256（raw body ∥ 该源密钥；`timingSafeEqual` 定长比较）；③ 密钥 = `POST /api/admin/git-sources/:id/hook-secret` 显式生成/轮换（明文一次性回显；读面恒掩码——沿 PAT 口径）；④ 触发 = `member` 事件 ⇒ 异步跑一次成员同步（快速 200；`trigger='event'` ∥ actor=`webhook`；撞锁 ⇒ 待跑旗合并）；⑤ 忽略面 = 非成员事件/源停用/`poll` 模式 ⇒ 200 忽略；验签败 ⇒ 401 + `log.warn`（不入审计——公网噪声） | 乙裁授权（事件近实时性为上）；验签 = github 生态标准形（零自造）；「触发即全量对账」= 幂等 + 零载荷解析——重复/乱序/重放皆收敛；快速 200 = github 投递预算（10s）与同步链长（多分页）不匹配（异步受理） | 同步等待式响应（投递超时 + 重投风暴——否）；投递防重放机制（签名无时间戳；重放至多触发一次幂等同步——如实注，不建面）；载荷解析增量应用（复杂化——否）；全局共享密钥（每源隔离开销——轮换/失效面粗） |
| KD-SV-128 | **项目删除 = admin 专属 + 二次确认 + 同事务级联 + 审计行**（承 R64 乙裁——用户 2026-10-12 授权；机制全文 = §14）：`DELETE /api/admin/projects/:id`（载荷 `{ confirm: true }`——缺 ⇒ 400 人话；非 admin ⇒ 403；不存在 ⇒ 404）；`project_members` 同事务随删（库零外键——应用层）；审计 `project_event`/`project_delete`（detail = projectId/displayName/address/memberCount）；删除后同地址（规范形）可再挂（新行——不设墓碑）；不做回收站/恢复（审计行在册）；本批零挂载面（实核）——后续批新引用面出现 ⇒ 同批补「先拒 + 处置」防护（接口位记于 §11） | 误加仓无撤销 + 源在挂项目后恒不可删（须有删除/脱挂出路——R64 代价面）；「仅 admin」= 沿改仓地址同层（记账键级破坏动作）；二次确认 = 误删防护（沿删源先例）；同事务级联 = 零部分写（删项目不留孤儿成员行） | 甲案（维持不做——R64 原裁）：用户 2026-10-12 裁弃（出路缺失）；负责人可删（破坏性与分权面失衡——否）；软删/回收站（机制翻倍——需求外）；级联删源（方向反——源是上游） |
| KD-SV-123 | **页面承载 = 三页**：`#/me/projects`（我的·项目——全体；可见项目列表 + 详情弹窗）∥ `#/admin/projects`（管理·项目——admin；全量 + 添加仓 + 地址/负责人变更）∥ `#/admin/git-sources`（管理·Git 源——admin；源表全操作）；管理组两项分列（否 tab 合页） | 「一页一职责」（KD-SV-20 精神）；源表 = 需求 44⑤ 点名的独立承载（凭据/同步面），与项目实体面不同管理对象；源面未来会长（事件/钩子接入）——分列免再拆 | tab 合页于 `#/admin/projects`（两管理对象共页；源面纵深后仍须拆）；源表并入系统页（凭据面与系统配置混装） |

## 3. 权限模型（判据句——能力矩阵）

**判定函数**（`src/project/projects.mjs`：`capabilitiesOf(db, member, project)`）：`{ level（三档之一 ∥ null）, owner（布尔）, admin（布尔）, can: { view, write, manageMembers, rename, editAddress, delete } }`。

| 主体 | view | write | manageMembers | rename（显示名） | editAddress（仓地址） | delete（删项目） |
|---|---|---|---|---|---|---|
| admin（全局角色） | ✓（全部项目） | ✓ | ✓ | ✓ | ✓ | ✓ |
| 负责人（`owner_username` 命中本会话成员） | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| 档位 = manage | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| 档位 = readwrite | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| 档位 = read | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| 其余（非成员） | ✗（列表零出现 ∥ 直取 404） | ✗ | ✗ | ✗ | ✗ | ✗ |

判据句（逐条——AC-44 ④⑤ 落点）：

1. **可见性**：项目仅对其成员、负责人与 admin 可见——非成员在 `GET /api/projects` 零出现；按 id 直取 ⇒ 404「项目不存在或不可见」（KD-SV-120）。
2. **只读不能写**：档位 read ⇒ `can.write=false`；一切项目域写动作（成员增删/改档、显示名、地址）⇒ 403（消息人话）。
3. **读写能写**：档位 readwrite ⇒ `can.write=true`——项目域写面的准入门（本批无独立写对象；消费者 = 后续批 B3–B6 项目域写面——团队台账/记忆等）；本批机检 = 能力读数（本档 §10 N6）——**本批判定级、端到端写动作随 B3+**（R67）。
4. **管理能加人**：档位 manage ⇒ `can.manageMembers=true`（加/减成员、改档位——`POST/PATCH/DELETE /api/projects/:id/members*`）。
5. **负责人边界**：负责人 ⇒ `manageMembers` + `rename`；负责人**不可被非 admin 移除/降档**（对该两径 ⇒ 403）；负责人指派/更换 = admin（`PATCH /api/projects/:id { owner }`）。
6. **改仓地址仅 admin**：非 admin（含负责人/管理档）改 `address` ⇒ 403（消息「改仓地址仅管理员」）——仓地址 = 记账键（需求 44② 原话理由）。
7. **档位来源**：成员行 `level`；平台行档位 = 映射表（§4）；手工行档位 = 添加/改档时选定；同名手工行优先于平台行（KD-SV-116）。
8. **admin 恒见全部**：管理面两页（管理·项目 ∥ 管理·Git 源）恒 admin 门（`requireAdmin`——会话判权沿 `accounts/ACCOUNTS.md` §3）。
9. **项目删除仅 admin**：`can.delete` 仅 admin 为真（负责人/管理档/其余 ✗）——`DELETE /api/admin/projects/:id` 恒 `requireAdmin`；二次确认 + 级联 + 审计全文 = §14。

## 4. 平台接入（能力矩阵 ∥ 角色映射表 ∥ 客户端口径）

**四平台能力矩阵**（需求 44④——父侧官方文档实读，台账 #1216 同录）：

| 平台 | 仓列表 | 成员表 | 成员事件 | 备注 |
|---|---|---|---|---|
| gitee | ✓（账号可见仓——个人 + 组织） | ✓（组织成员；企业成员接口在册） | ✗（企业 webhook 仅四族：issue ∥ push/标签 ∥ PR ∥ 评论） | 本批成员表走**组织**端点；企业成员端点 = 未接（本档 §12 R69——实施轮先实证企业场景；企业为常态 ⇒ R69 升提请裁定） |
| github | ✓ | ✓（组织成员） | ✓（组织成员事件 member_added/member_removed） | 事件接收端 = §13（KD-SV-118/127——`event` 可选项仅本平台） |
| gitlab | ✓ | ✓（组员——含继承成员） | 付费档限定（Premium/Ultimate——免费版无） | 按无事件平台处置（定时拉取） |
| 自建平台 | 有接口就拉（v1 = GitLab 兼容协议） | 同左 | ✗ | 无兼容接口 ⇒ 手输保底（加仓手输/成员手加） |

**角色映射表（每平台一张——三档 ⇔ 平台角色）**：

| 平台 | 平台角色（本批消费——成员表级） | 三档 |
|---|---|---|
| gitee | 组织成员 | 只读（底线） |
| gitee | 组织/企业管理员标记（响应在场时——实施轮逐字段实核；缺 ⇒ 只读底线） | 管理 |
| github | 组织 owner/admin（`GET /orgs/{org}/members?role=admin`） | 管理 |
| github | 组织 member | 只读（底线） |
| gitlab ∥ 自建（GitLab 兼容） | Guest(10) ∥ Reporter(20) | 只读 |
| gitlab ∥ 自建（GitLab 兼容） | Developer(30) | 读写 |
| gitlab ∥ 自建（GitLab 兼容） | Maintainer(40) ∥ Owner(50) | 管理 |

**附注对照（仓级角色——本批不拉，KD-SV-117；供后续批/人工参考）**：gitee 仓「观察者/报告者 ⇒ 只读 ∥ 开发者 ⇒ 读写 ∥ 管理员 ⇒ 管理」；github 仓「read/triage ⇒ 只读 ∥ write/maintain ⇒ 读写 ∥ admin ⇒ 管理」；gitlab 仓级同组级 access_level 表。

**客户端口径**（`thincoder-server/src/project/platform-client.mjs`（拟新增）——原生 fetch，零第三方）：

- 基址与鉴权（三平台逐条；路径据台账 #1216 调研 + 官方 API 惯例——**实施轮逐条实核**）：
  - gitee：`https://gitee.com/api/v5`；`Authorization: token <PAT>`；仓列表 `GET /user/repos?per_page=100&page=N`（scope 在场 ⇒ 并 `GET /orgs/{scope}/repos` 去重）；成员表 `GET /orgs/{scope}/members?per_page=100&page=N`；体检 `GET /user`。
  - github：`https://api.github.com`；`Authorization: Bearer <PAT>` + `User-Agent: thincoder-server`；仓列表 `GET /user/repos?per_page=100&page=N&affiliation=owner,collaborator,organization_member`（scope 在场 ⇒ 并 `GET /orgs/{scope}/repos` 去重）；
    成员表 `GET /orgs/{scope}/members?per_page=100&page=N` + `?role=admin`（两级取管理员集）；体检 `GET /user`。
  - gitlab ∥ 自建（GitLab 兼容）：基址 = `https://gitlab.com` ∥ 源 `base_url`；`PRIVATE-TOKEN: <PAT>`；仓列表 `GET /api/v4/projects?membership=true&per_page=100&page=N`；成员表 `GET /api/v4/groups/{scope}/members/all?per_page=100&page=N`（行携 `access_level`）；体检 `GET /api/v4/user`。
- **scope（组织/组标识）**：源行可选字段；成员同步须有 scope（缺 ⇒ 人行话「未配置组织/组——填后才能同步成员」）；拉列表不须 scope。
- 超时 10s/调用（沿镜像源读类跨公网预算）；分页上限：仓列表 ≤300 行（`truncated` 旗如实）；成员表 ≤2000 行（截断 ⇒ 同步跳过删除段——KD-SV-122）。
- 错误分类（`error.kind` 六值）：`auth`（401/403——凭据失效）∥ `scope_missing` ∥ `unreachable` ∥ `timeout` ∥ `http_error`（非 2xx 其余）∥ `bad_response`（形不合）。
- **零反向出站**：全客户端**只发 GET**（零 POST/PUT/PATCH/DELETE 出站——AC-44⑥ 机检 = 假 fetch 记录逐调用核，本档 §10 N17）。

## 5. 同步机制（成员同步——单向）

- **单向**：git 平台为源（那边加/减人 ⇒ 这边跟）；本地任何动作不出站（零反向写回）。
- **触发三径**：① 手动「立即同步」（源行常驻钮——三模式下恒在，AC-44⑦）；② 定时拉取（`enabled=1` ∧ 到期；间隔源行可设——缺省 60 分钟，范围 5–1440）；③ 事件进路（`sync_mode='event'`——**仅 github**（平台能力门）；事件触发（近实时）+ 定时对账（间隔同 ②——投递不达/重启窗口兜底）+ 手动照常；机制全文 = §13）。
- **调度器**（`thincoder-server/src/project/sync.mjs`（拟新增）内 `createSyncScheduler`——入口接线）：检查周期 60s；到期判据 = `enabled=1 ∧ now - COALESCE(last_sync_at, created_at) ≥ interval_minutes`（**`sync_mode` 不参与调度判据**——`event` 源照跑 = 对账兜底）；逐源串行执行；`last_sync_at` = **尝试时刻**（成敗同记——「上次同步时间 + 结果」逐字）。
- **同步算法**（单源、单事务应用段）：
  1. 取该源全部项目（`source_id = ?`）；无项目也执行名册拉取（验凭据 + 记录结果）。
  2. 拉名册（§4 客户端；scope 缺 ⇒ `scope_missing` 失败）。
  3. 逐项目应用（单事务——失败回滚零部分写）：名册逐人（按映射表取档）⇒ 同名行在场：`origin='sync'` ⇒ 更新 `level`/`synced_role`；`origin='manual'` ⇒ **不触**（KD-SV-116）；不在场 ⇒ 插入（origin=`sync`）。名册外且 `origin='sync'` 的行 ⇒ 删除（「平台侧减人 ⇒ 本地落掉」）。截断 ⇒ 跳过删除段（KD-SV-122）。
  4. 记录结果：`last_sync_at` + `last_sync_result_json`（`{ ok, at, ms, trigger, kind?, message?, counts: { projects, roster, added, updated, removed }, truncated? }`）；`auth` 失败 ⇒ `token_state='invalid'`；成功 ⇒ `token_state='ok'`；
    审计 `project_event`/`source_sync` 一行（actor = 操作 admin ∥ `scheduler` ∥ `webhook`（事件触发；三者 detail 同形）；detail = trigger（`manual` ∥ `schedule` ∥ `event`）+ counts + kind）。
- **并发锁**：单源在飞 ⇒ 手动重触发 400「该源正在同步中，稍后再试」；调度撞锁跳过；**事件撞锁 ⇒ 待跑旗合并**（在飞 + 多次投递 ⇒ 结束后续跑一次——§13）。
- **PAT 体检**（独立动作）：`POST /api/admin/git-sources/:id/check` ⇒ 体检调用（§4 `GET /user`）⇒ 成 ⇒ `token_state='ok'` + 200 `{ ok:true, ms }`；败 ⇒ `auth` ⇒ `token_state='invalid'`（界面标红 + 人话）+ 自含失败形；审计 `project_event`/`source_check`。
- **源生命周期**：停用（`enabled=0`）⇒ 定时停、已挂项目保留（需求 44⑤ 逐字）；删源防护（还挂项目 ⇒ 400——KD-SV-122）；改源（含 PAT 重填——掩码三态：未编辑不携 ∥ 编辑 ⇒ 明传替换）。
- **加仓两径**（需求 44①）：① 从源拉列表勾选批量添加（`GET …/:id/repos` + 提交 `{ sourceId, repos: [...] }`）；② 手输保底（载荷逐字 = `gateway/API.md` §2.9 单源——`{ address, displayName?, owner? }`；裸 git 仓/自建无接口）。批量提交全成或全拒（一条撞重复 ⇒ 400 列重复项、零落库）；
  **仓地址归一 = 跨形单键**：trim ∥ 去 scheme（`scheme://`）与用户段 ∥ scp 形 `:` ⇒ `/`（`git@host:path`）∥ 去尾斜杠 + `.git` 尾 ⇒ 规范形 `host[:port]/path`（http/https/ssh/scp 各形同代码 ⇒ 同键 ⇒ 跨形重复同拒）；`projects.address` 唯一（重复挂仓拒——AC-44①）。

## 6. 端点与判权（摘要 + 指针）

- 端点逐行（路径 ∥ 语义 ∥ 形/码）= `gateway/API.md` §2.9（单源——十七端点：成员面六 ∥ 管理面十 ∥ 接收面一（公开——验签门；§13））。
- 判权摘要：成员面 = 会话 + 能力矩阵（§3——`user` 可达「我的·项目」面）；管理面十端点 = `requireAdmin`（含项目删除——§14；`accounts/ACCOUNTS.md` §3 口径；错误形零新码——400/403/404 族 + 自含状态形）；接收面 = 无会话（验签门——§13）。
- 错误码：零新码（400 ∥ 403 ∥ 404 ∥ 401 沿用；自含失败形不走统一信封——沿代理测试/镜像源先例）。

## 7. 界面承载

⇒ 见 `webui/PROJECTS.md`（页族/导航位/入口/键族/判据——单源；KD-SV-123 的页面落点）。

## 8. 本域文件与行数预算

| 档 | 行数（设计估——实施实读为准） | 职责 |
|---|---|---|
| `thincoder-server/src/project/git-sources.mjs`（拟新增） | ≈200 | 源存储与校验（形/重名/掩码视图/CRUD/状态列）+ webhook 密钥面（生成/轮换/掩码——§13） |
| `thincoder-server/src/project/platform-client.mjs`（拟新增） | ≈300 | 三平台客户端（仓列表/名册/体检——原生 fetch ∥ 超时 ∥ 分页 ∥ 六分类） |
| `thincoder-server/src/project/projects.mjs`（拟新增） | ≈190 | 项目存储 + 成员行 + 能力矩阵判定（§3）+ 删除事务（级联/审计——§14） |
| `thincoder-server/src/project/sync.mjs`（拟新增） | ≈240 | 成员同步引擎（算法/单事务/锁/结果）+ 调度器 + 事件触发入口/待跑旗（§13） |
| `thincoder-server/src/project/routes.mjs`（拟新增） | ≈200 | 成员面六端点（列表/详情/成员增删改/项目改） |
| `thincoder-server/src/project/admin-routes.mjs`（拟新增） | ≈255 | 管理面十端点（源 CRUD/同步/体检/拉列表/加仓 + webhook 密钥 + 项目删除） |
| `thincoder-server/src/project/webhooks.mjs`（拟新增） | ≈90 | 事件接收端（路由/验签/触发/忽略面——载荷不解析；§13） |
| `thincoder-server/src/store/credential-crypto.mjs`（拟新增——KD-SV-119） | ≈65 | 凭据三件 + 键路径派生 `credentialKeyPath`（自 onboarding 逐字抽出——双消费方共享单源） |
| `thincoder-server/src/store/db.mjs`（已落盘 · 实读 488） | ≈+70（v17 段——三表（含 `hook_secret_cipher` 列）+ 审计重建）；**>500 软线复核 = `store/STORE.md` §4——维持 + 上限 700（触发外拆）** | 迁移段 v17 |
| `thincoder-server/src/sandbox/onboarding.mjs`（已落盘 · 实读 373） | −≈50（三件外迁）+ ≈2（再导出）；`keyPath` 取件改指 `credentialKeyPath(config)`（同行同值） | 零语义（KD-SV-119） |
| `thincoder-server/src/accounts/audit.mjs`（已落盘 · 实读 116） | +1 型（`project_event` 入 `AUDIT_TYPES`——≈+2 行含注释） | 型面 十三 ⇒ 十四 |
| `thincoder-server/bin/thincoder-server.mjs`（已落盘 · 实读 192） | +≈8（三注册行（含接收面）+ 调度器接线） | 装配 |
| `thincoder-server/package.json`（已落盘 · 实读 30） | 机械（2026-10-12 已落：`prepublishOnly` = 3×`node --check`——链撤；单元测试档不入任何门，本批零剩余改动） | 发布钩 |

（webui 面文件与 i18n 键族 = `webui/PROJECTS.md` §3 单源；域小计 = 服务端七档行和 **≈1475**（≈1310 ⇒ ≈1475——R63/R64 增量 ≈+165；原「≈1150」系粗估——本轮按行和收正）+ 共享件改动 ≈+95 净。）

## 9. 验收判据（AC-44 ①–⑨ 对位）

| 需求判据 | 设计级判据（机检） | 载体 |
|---|---|---|
| AC-44① 仓表（一对一——重复挂仓拒；只 admin 能加） | `projects.address` 唯一 + 跨形归一（§5）；加仓端点 admin 门（`requireAdmin`——`user` ⇒ 403）∥ 用例 N4/N5/B1（跨形四形） | 单元测试档 |
| AC-44② 拉列表勾选批量 + 手输保底 + 可搜索 | `GET …/:id/repos` 自含形 + 批量提交全成或全拒（§5）；UI 对话框勾选 + 过滤（`webui/PROJECTS.md` §2）；项目列表 `?q=` 搜索（显示名/地址子串——命中集恒 ⊆ 可见集）∥ 用例 N19 | 单元测试档 + 收口轮（浏览器实走） |
| AC-44③ 多源并存（四类平台各 PAT 各源） | `git_sources.platform` 四值枚举 + 逐源 PAT 独立（掩码面逐值）∥ 用例 N3（四平台假件） | 单元测试档 |
| AC-44④ 三档权限生效 | 能力矩阵（§3）+ 判定读数（`can.write` 读数 ∥ 动作面 403/404）——**本批判定级、端到端写动作随 B3+**（R67）∥ 用例 N6/N7/N8 | 单元测试档 + 收口轮（浏览器实走） |
| AC-44⑤ 负责人边界（加/减成员 + 改显示名；改仓地址 ⇒ 拒） | §3 判据句 5/6 ∥ 用例 N9（owner 改地址 403 ∥ admin 200） | 单元测试档 |
| AC-44⑥ 单向同步（减人 ⇒ 本地落掉；零反向出站写） | §5 算法 3（名册外 sync 行删除）∥ 用例 N11/N17（出站零非 GET——逐调用核） | 单元测试档 |
| AC-44⑦ 能同步的同步 + 手动钮永在 | 定时（调度器 §5——两模式同跑）+ 手动（源行常驻钮）+ 事件（§13——github 接收端：事件触发 + 对账兜底）∥ 用例 N14/N20/N21 + UI 行（钮恒在；`event` 选单仅 github） | 单元测试档 + 收口轮（浏览器实走） |
| AC-44⑧ 每平台角色映射表在册 | §4 四表在册（逐平台三档 ⇔ 平台角色）——文档面机检（对位表逐行可查） | 文档（本档 §4） |
| AC-44⑨ 源表（一行一源七字段 + 删源防护 + 立即拉取） | `git_sources` 列面（STORE §2 v17——含 `hook_secret_cipher`）+ 掩码（不回显）+ 删源防护 400 + 立即同步端点 + 事件子面（§13——密钥/登记说明）∥ 用例 N3/N10/N16 + UI 源表行 | 单元测试档 + 收口轮（浏览器实走） |
| R63 事件接收端（用户 2026-10-12 授权——补章；承 AC-44⑦ 事件用例） | §13 全节（验签 ∥ 触发/忽略面 ∥ 撞锁合并 ∥ 公网前提如实注）∥ 用例 N20/N21/B3/E3 | 单元测试档 |
| R64 项目删除（用户 2026-10-12 授权——批外补面） | §14 全节（admin 门 + `confirm` ∥ 级联随删 ∥ 审计 `project_delete`）∥ 用例 N22/E4 | 单元测试档 + 收口轮（浏览器实走） |

## 10. 用例表（单元测试档——输入/预期）

**A 件 = `docs/batches/2026-10-12-team-projects-permissions.test.mjs`（服务端核心）**；**B 件 = `…-sync.test.mjs`**（同步/平台假件）；**C 件 = `…-ui.test.mjs`**（控制台）。

| # | 场景 | 输入 | 预期输出 |
|---|---|---|---|
| N1 | 空库直落 v17 | `openDatabase(":memory:")` | 版本 17；三表列面/索引在场；`project_event` 可写 |
| N2 | 旧库升 v17 + 幂等 | v16 库（假旧库） | 升后 17；重开零变；存量审计行逐值保形 |
| N3 | 源 CRUD | 增（四平台各一）∥ 重名 ⇒ 400 ∥ 平台枚举外 ⇒ 400 ∥ 读回掩码（零明文） | 逐值；`token_state` 缺省 `unknown` |
| N4 | 手输加仓 | `{ address, displayName? }` | 项目落库 + `project_add` 审计行 + 归一逐值 |
| N5 | 批量加仓 | 假拉列表 ⇒ 勾选 2 行 | 两项目落库；撞重复 ⇒ 400 列重复项、零落库 |
| N6 | 能力矩阵 | 六主体（admin/负责人/三档/非成员）× 读数（含 `can.delete`——仅 admin 真） | `can` 表逐值（§3）；read 写动作 403；非成员 404 |
| N7 | 可见性 | 非成员列表/直取；成员列表；admin 列表 | 零出现/404；只含可见集；全量 |
| N8 | 成员管理 | manage 加人 ✓；read 加人 403；改档；移除；非 admin 动负责人 ⇒ 403 | 逐值 + `member_add/update/remove` 审计行 |
| N9 | 改项目 | 显示名 owner ✓/manage 403；地址 owner 403/admin ✓/撞 ⇒ 400；负责人 owner 403/admin ✓ | 逐值 + `project_update` 审计行 |
| N10 | 删源防护 | 挂项目 ⇒ 删 | 400「尚有 N 个项目挂此源」；零删 |
| N11 | 成员同步 | 假名册（加一人/减一人/改一档） | sync 行增/删/改逐值；manual 同名行不触；`last_sync_*` + 审计行 |
| N12 | 同步锁 | 在飞重触发 | 400 人话 |
| N13 | 失败分类 | 401 ∥ 超时 ∥ 形不合 ∥ 截断 | 各类 kind；`auth` ⇒ `token_state='invalid'`；截断 ⇒ 删除段跳过；失败零部分写 |
| N14 | 定时调度 | 假时钟 | due 判定（enabled ∧ 到期——`sync_mode` 不参与）；停用不跑；event 源到期照跑（对账）；到期触发一次 |
| N15 | 拉列表 | 假平台两页 + 截断 | 取齐/`truncated` 旗/错误分类自含形 |
| N16 | 体检 | 成/败 | `token_state` 随动；审计 `source_check` |
| N17 | 零反向出站 | 全同步/拉列表/体检流程 | 假 fetch 记录：**出站全 GET**（零 POST/PUT/PATCH/DELETE） |
| N18 | 鉴权门 | 无会话/错会话/user 打管理面 | 401/403 三态（沿既有口径） |
| N19 | 列表搜索 | `GET /api/projects?q=`（显示名子串 ∥ 地址子串 ∥ 零命中 ∥ 非成员视角） | 命中集恒 ⊆ 可见集；零命中 ⇒ 空数组（零错）；`q` 缺省 = 全量（可见集） |
| N20 | 事件接收成链（§13） | 假 github 投递（合法签名 + `member` 事件；源置 `event`） | 200 受理 + 触发一次同步（`trigger='event'` ∥ actor=`webhook`）；名册应用逐值 |
| N21 | 接收忽略面（§13） | 非 `member` 事件 ∥ 源停用 ∥ `poll` 模式源 | 200 `{ ok:true, ignored:true }`；零同步零落库 |
| N22 | 项目删除成链（§14） | admin + `{ confirm: true }` | 200；`projects` 行删 + `project_members` 随删（零孤儿）；审计 `project_delete` 逐值；同地址可再挂 |
| N23 | 凭据键路径单源 | `credentialKeyPath(config)`（缺省 db ∥ 自定义 db 两形） | 与 sandbox 现口径同址（同一 `credentials.key`）；两域共享同键 |
| B1 | 地址归一（跨形） | 尾斜杠/`.git`/空白 + 跨形三组（`https://h/a/b` ⇄ `git@h:a/b` ⇄ `ssh://git@h/a/b`） | 归一后同键 ⇒ 跨形重复拒；异 host/port/路径 ⇒ 不同键 |
| B2 | 用户名归一 | `Alice` ⇄ `alice` | 同一人（成员行唯一）；同步不双插 |
| B3 | 事件撞锁/重放合并（§13） | 在飞同步 + 同源重复投递 ×2 | 200 ×2 受理；在飞结束 ⇒ 合并续跑一次（零并发双跑）；名册零差（幂等） |
| E1 | 形错零变 | 源形/档位枚举/level 非法 | 400；库零变 |
| E2 | 自含形失败 | 源不可达（体检/同步/拉列表） | 200 `{ok:false,error:{kind,message},ms}` |
| E3 | 接收端门（§13） | 签名不符 ∥ 缺签名 ∥ 密钥未生成 ∥ 未知源 id | 401/401/401/404；零同步零落库；`log.warn` 一笔（不落审计） |
| E4 | 删除门（§14） | 缺 `confirm` ∥ 非 admin ∥ 不存在 id | 400 人话/403/404；零删（库零变） |

## 11. 边界（本域不做面）

- **不做反向写回平台**（本地加人 ⇒ 推平台——需求 44 边界明条；客户端零非 GET 出站）。
- **不做 CI/钩子面**（push/PR/tag 事件与仓变更同步——台账 #1216③ 单列未谈；本批不含）。
- **不做非 github 平台接收端**（平台能力门——gitee/gitlab/自建走定时拉取；§13）∥ **不做 webhook 自动登记**（github 侧登记 = 手动步——零反向出站（AC-44⑥））∥ **不做投递防重放机制**（签名无时间戳——重放至多触发一次幂等同步，如实注（§13））∥ 不做事件载荷解析/增量应用（触发式全量对账）。
- **不做仓级协作者同步**（KD-SV-117 附注对照在册；如需要另批）。
- **不做项目回收站/恢复**（删除 = 最终——审计行在册；§14）∥ **不做项目挂载面删除防护**（本批零挂载（实核）；后续批新引用面出现 ⇒ 同批补「先拒 + 处置」——§14 接口位）∥ 删源防护照需求在。
- **不做三端（CLI/VSC/桌面）端侧面**（需求 44 沉默——提请裁定，本档 §12）。
- **不做台账/记忆/在场/会话的权限消费**（后续批 B3–B6；本批只把模型与判定就位——`can.write` 即准入门）。
- **不做权限模型改造**（admin/成员沿用）；**不做 OAuth**（PAT 已裁）；**个人单仓不挂同步**。
- **不做 admin-agent 工具面纳入**（需求未写——缺项提请，本档 §12）。

## 12. 上抛/余项

| # | 项 | 类型 | 处置建议 |
|---|---|---|---|
| R65 | **三端可见性**：需求 44 沉默（只涉 server + 控制台）；端侧同批纪律（需求 §3）判读 = 端侧面不存在 ⇒ 不触发。本设计 = 仅 server + 控制台。**代价**：成员在 CLI/VSC/桌面看不到项目列表（如需另立批）。 | 提请确认 | 维持不做（缺项如需要另批） |
| R66 | **成员同步作用域**（KD-SV-117）：本批 = 组织/企业/组级名册 → 源下全部项目（底线档 + 手工升档）；仓级协作者未拉。**代价**：读写档主要靠手工升档（gitlab Developer 档可自动得）。如要仓级精确档位 ⇒ 扩展面（gitee 端点待实核 + N×M 调用）。 | 提请确认 | 维持本裁；扩展另批 |
| R67 | **「读写能写」机检口径**：本批无独立写对象 ⇒ 以能力读数（`can.write`）+ 动作面负例机检（§3 判据 2/3）。**代价**：AC-44④ 的「能写」暂为判定级；端到端写动作随 B3+ 或本批补最小写面。 | 提请确认 | 维持本裁 |
| R68 | **admin-agent 工具面缺项**：项目/源管理工具未入管理面 agent 工具面（需求未写）。**代价**：管理面 agent 暂不能代管项目/源（如需另批）。 | 提请（缺项） | 维持不做 |
| R69 | **gitee 企业成员端点未接**：本批成员表走组织端点；企业成员端点（`/v5/enterprises/{ent}/members`——调研在册）未接。**代价**：纯企业（无组织）结构下成员同步不可用（手加保底）。**自建平台协议 v1 = GitLab 兼容**（非兼容自建 ⇒ 拉取报确切人话 + 手输保底——同族口径）。 | 知会（登记在册） | 实施轮先实证 gitee 企业场景并回报；企业为常态 ⇒ 本行升提请裁定 |
| R70 | **需求档计数回笔（主 agent 笔）**：本批落地后 `docs/server/requirements/PROJECT.md` 计数陈值须回笔——§2:13/:14「我的 3 ⇒ **4（本批——我的·项目）** ⇒ 5（沙盒余面批）」链；「管理 九页」⇒ **十一页**（本批 +项目 +Git 源）；「侧栏合计 **十二页（现盘面）** ⇒ **十五页**（本批）⇒ 十六（沙盒余面批）」；AC-12 链同拍（判据单源 = `webui/WEBUI.md` §6）。 | 需求档回笔 | **已办（2026-10-12）**——回笔在盘（`requirements/PROJECT.md`:64-65 现行「管理 十一页 ∥ 侧栏 十五 ⇒ 十六」 ∥ :314 AC-12 两链）；收口轮核销台账 #1216 |

## 13. 事件接收端（github 成员事件——R63 ∥ KD-SV-127）

- **端点**：`POST /api/hooks/git-sources/:id`（**公开面**——无会话；公网暴露面如实注：服务现为内网部署 ⇒ 事件实际可达须待公网化（TLS/公网批）；未达前 = 定时对账兜底——功能可用性不依赖公网）。
- **验签门**（第一道）：`X-Hub-Signature-256: sha256=<hex>` = HMAC-SHA256（**raw body** ∥ 该源 `hook_secret_cipher` 解密值）；`timingSafeEqual` 定长比较（长度不等先拒）。缺签名 ∥ 不符 ∥ 密钥未生成 ⇒ **401**（零细节）+ `log.warn` 一笔（**不入审计**——公网噪声）；未知源 id ⇒ 404（统一信封）。
- **事件分派**：`X-GitHub-Event: member` ⇒ 触发；其余事件名 ⇒ 忽略（200）。**载荷不解析**（触发式全量对账——内容无关，只读头 + raw body 哈希）。
- **触发链**：验签过 ∧ `member` ⇒ 异步跑该源一次成员同步（§5 算法）——`trigger='event'` ∥ actor=`webhook`；**先回 200 受理**（github 投递预算 10s 与同步链长不匹配——异步受理），结果照落源行（`last_sync_*` + 审计 `source_sync`）。
- **合并/幂等**：单源锁在飞 ⇒ 置「待跑旗」（多次投递合并为一次）；在飞结束 ⇒ 旗在 ⇒ 续跑一次；重复投递 ⇒ 幂等收敛（名册全量对账——零差）。
- **存储面与重启**：锁与「待跑旗」= 进程内态（单实例部署——零持久化）；重启 ⇒ 清零——兜底 = 定时对账照跑（软状态——沿限流/登录锁先例）。
- **密钥面**：`POST /api/admin/git-sources/:id/hook-secret`（admin）⇒ 生成/轮换（32 字节随机 ⇒ hex）；响应 `{ hookSecret: { plain } }` **一次性明文**（此后读面恒掩码——源行 `hookSecret: { set, hint }` 沿 PAT 口径）；审计 `source_update`（keys 含 `hookSecret`——值零入）；**轮换 ⇒ 旧密钥即刻失效**（登记处须同步换）。
- **登记步（github 侧——手动；零出站写）**：Settings ⇒ Webhooks ⇒ Add webhook——Payload URL = `<公网前缀>` + `/api/hooks/git-sources/<id>`；Content type = `application/json`；Secret = 一次性明文；Events = Organization member 族；SSL 按部署面。
- **响应形**：受理 ⇒ `{ ok: true, triggered: true }` ∥ 忽略 ⇒ `{ ok: true, ignored: true }`（三忽略面：非 `member` 事件 ∥ 源停用 ∥ `sync_mode='poll'`）；零新码。
- **界面承载** = `webui/PROJECTS.md` §2.3（添/编窗事件块）；机检 = §10 用例 N20/N21/B3/E3。

## 14. 项目删除（R64 ∥ KD-SV-128）

- **端点**：`DELETE /api/admin/projects/:id`（**仅 admin**——§3 判据句 9）；载荷 `{ confirm: true }`（缺/非真 ⇒ **400** 人话「删除将连同成员表一并移除——确认后重试」）；不存在 ⇒ 404；非 admin ⇒ 403。零新码。
- **级联（同事务）**：`project_members`（`project_id` 命中行——**唯一引用面**）随删 + `projects` 行删；库零外键（应用层事务——零部分写）；删除后同地址（规范形）可再挂（新行——不设墓碑）。
- **审计**：`project_event`/`project_delete` 一行（detail = projectId/displayName/address/memberCount；actor = 操作 admin 名快照）。
- **挂载防护（接口位）**：本批零挂载面（实核——工作区/台账/记忆面均无 project 引用）；后续批（B3+）若立 project 引用面 ⇒ **同批扩删除防护**（有挂载 ⇒ 先拒 + 处置句——沿删源防护先例）；记于 §11。
- **界面**：项目详情弹窗「删除项目」钮（`can.delete` 渲——admin 两页同面）+ 二次确认窗（后果句：成员表随删 ∥ 不可恢复；服务端 `confirm` 门同判——页面不是判据）。承载 = `webui/PROJECTS.md` §2.1/§2.2。
- **幂等**：二次删 ⇒ 404（已删——零副作用）。

## 变更记录

- 2026-10-12（**team-projects-permissions 批（B2）· 设计轮 · eng-designer**——承批档 `docs/batches/2026-10-12-team-projects-permissions.md` §1 · 台账 #1216；用户 2026-10-12 13:33 裁定收束 + 13:39 起批令；需求功能点 44 ∥ AC-44）：建档——定位与词表 ∥ KD-SV-115–123（域划分 ∥ 用户名键 ∥ 同步作用域 ∥ 事件进路 ∥ 凭据共享 ∥ 可见性口径 ∥ 分权矩阵 ∥ 结果/体检/防护 ∥ 页面承载）∥ 权限模型判据句八条 ∥ 四平台能力矩阵 + 角色映射表（四张）+ 客户端口径 ∥ 同步机制（三径/调度/算法/锁/体检/源生命周期/加仓两径）∥ 端点摘要（单源 = `gateway/API.md` §2.9）∥ 文件与行数预算 ∥ AC-44 ①–⑨ 对位 ∥ 用例 N1–N18/B1–B2/E1–E2 ∥ 边界 ∥ 上抛 R63–R70。**产品码零触（设计轮）。**
- 2026-10-12（**team-projects-permissions 批（B2）· 设计修订轮（fix）· eng-designer**——承批档 `docs/batches/2026-10-12-team-projects-permissions.md` §3（评审 #277：8🟡+3🔵）∥ 用户 2026-10-12 授权两件（R63 乙案 ∥ R64 补面））：**增 §13（事件接收端——KD-SV-127）∥ §14（项目删除——KD-SV-128）** ∥ KD-SV-118 收正（接收端落 + `event` = 事件 + 定时对账——消死区）∥ KD-SV-119 收正（+ `credentialKeyPath` 单源）∥ §3 能力矩阵 + `delete` 列 + 判据句 9 ∥ §4 github/gitee 行 ∥ §5 三径/调度/锁/审计（trigger=`event` ∥ actor=`webhook`）/加仓载荷单源/跨形归一 ∥ §6 十四 ⇒ **十七端点** ∥ §8 行账随正（+ `webhooks.mjs`；`db.mjs` 维持判定指针；`audit.mjs` 实读 116）∥ §9 补 R63/R64 两行 + ②④⑦⑨ 行随正 ∥ §10 用例 N19–N23 ∥ B1/B3 ∥ E3/E4 ∥ §11 边界随正 ∥ §12 R63/R64 销项 + R70 链头收正。**产品码零触（设计轮）。**
- 2026-10-12（**team-projects-permissions 批（B2）· 设计修订轮 2（fix）· eng-designer**——承批档 `docs/batches/2026-10-12-team-projects-permissions.md` §3 轮次 2（评审 #280 之 5））：§13 增「存储面与重启」句（锁/待跑旗 = 进程内态——单实例部署；重启清零——定时对账兜底）。**零新语义**（评审发现直接导出项）。
