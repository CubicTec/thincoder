# 2026-10-14 · console-walkthrough-light
> 六段 append-only，一段一作者：§1 讨论（主 agent）· §2 批次任务与设计（eng-designer）· §3 设计评审（评审子代理）· §4 用户批准（主 agent）· §5 实施记录（eng-coder）· §6 验证与收口（父代理）。
> 编制：主 agent · 2026-10-14 · 来源 = 用户 2026-10-14 13:2x 走查管理面（MCP 页探活读数仅计数、无工具名——原话「mcp服务我点了probe以后，只显示了一个工具，没有工具名称，这个也不太好。」）；轻通道走查轮——逐笔记入 §1（披露 ∥ 变更 ∥ 实走 ∥ 冻结）。。
> 台账 = #1431（server · 归批）。前情 = docs/batches/2026-10-13-console-walkthrough-light.md §6（已收口 2026-10-13）。
## §1 讨论（主 agent）
**状态行**：已收口 2026-10-14
<§1 模板占位：本批条目 / 关键判据 / 授权口径>

**笔 1 · MCP 探活读数补工具名（用户 2026-10-14 13:2x 原话「mcp服务我点了probe以后，只显示了一个工具，没有工具名称，这个也不太好。」）**

- **披露（轻通道 · 走查命中项 · 详情类）**：显示面补信息（非新机制）；**reach** = 核 + 路由 + 页面 + i18n 五档小笔；**rollback = revertable**（逐点小改）。
- **变更**：
  - `thincoder-core/mcp.mjs:103`——`probeMcpServer` 返回补 `tools`（工具名数组；原先全量 `mcpTools` 到手即弃）+ 档头回执句（`:96`）。
  - `thincoder-server/src/mcp/routes.mjs:129`——探活响应透传 `tools`（防御过滤：仅非空字符串）。
  - `thincoder-server/public/views-mcp.mjs`——新助手 `probeReadoutText`（`:58`）+ 两处调用点（行内探活 `:81` ∥ 弹窗探活 `:210`）：具名形「✓ N 个工具：<名,…>，Xms」；缺名（零工具 ∥ 旧响应）回落计数形——零回归。
  - `i18n-zh-mcp.mjs:24-25` ∥ `i18n-en-mcp.mjs:24-25`——新键 `admin.mcp.probeOkNamed`；zh `probeOk` 词面顺收正（「tools」⇒「个工具」——原值英文，同面一行）。
- **承（设计面——收尾链正式化随正）**：设计 `mcp/MCP.md:72` 读数形现载 `{ ok, toolCount, latencyMs }`（计数形）、`:74` 读数呈现 = 对齐 CLI 形——本笔为**增补**（设计档 + `gateway/API.md` §2.13 契约行 + `webui/MCP.md` 如涉 ⇒ 收尾链设计正式化步落）。
- **实走计划**：`.5` 重部署后，行内/弹窗探活实读含 `web_search_prime` 名（红前绿后在档）。

- **实走（2026-10-14 13:4x——`.5` 部署链）**：红前读数 = 「✓ 1 tools, 184ms」（无具名）。动作链：笔落五档 ∥ 提交 `93fda5ae` ∥ 双推 ∥ 箱上 ff 拉取 ✓（拦路 = 箱本地两处未提交改动（`sandbox/box.mjs` ∥ `egress.mjs`——与当日已提交版内容等价）⇒ **stash 保留可恢复**（`stash@{0}` 在箱））∥ 镜像重建 ✓（`eb0c44431597`）∥ compose force-recreate ✓ ∥ healthz 200 ✓。**实读 = 半绿**：`{"ok":true,"toolCount":1,"tools":[],"latencyMs":191}`——路由已带 `tools` 字段（服务器侧新码生效）但名为空。**根因（实读）**：镜像内 `@thincoder/core` = **npm 注册表依赖**（`^0.10.4`——非仓内副本；服务器代码走仓内拷贝故路由生效）⇒ 核侧一笔须**核件补丁发行**（KD-SV-138③「核先于/同拍发行」链）方可入镜。**待**：核 `0.10.8` 发行（用户点头——不可逆动作）⇒ 重建 ⇒ 具名读数复读（绿）；不发 = 挂下个常规发行波（本笔不绿不动）。

- **裁定（用户 2026-10-14 13:47 原话「核跟下一次更新再发。」）**：核件补丁版**不发**——笔 1 随**下个常规核发行波**入镜（发行钩子已埋 = 核 `CHANGELOG.md` `[Unreleased]` 行，发行流程自然带上）；**实走绿腿 = 挂该波**（届时重建部署 ⇒ 具名读数复读即绿）。本笔实现已全落（服务器侧路由已生效）；余 = display 面待核行（判据与红读数在案）。本笔不绿不动（#1431 在途保持——结算挂该波）。

**笔 2 · 成员面对话：模型菜单一级空白（用户 13:50 走查原话「模型选择那里一级菜单看不见内容…二级菜单点了以后模型还是显示不出来」）**

- **披露（轻通道 · 走查命中项 · 缺陷类）**：实现与源相抵——成员面 `coreRowOf` 把 `provider/group` 写死空串（`views-me-chat-composer.mjs:138`），菜单分组行标题 = `shortName("")` ⇒ **空白行**；管理面同件取真名（`views-chat-composer.mjs:135`）对照在案。**rollback = revertable**。
- **变更**：`providerOf(id)`（id 首段——首斜杠口径；无斜杠 ⇒ 全串，免再空题）统一供给 `coreRowOf` 与 `pushModels` 的 `prefs.provider`（选中 ✓ 跟随）。

**笔 3 · 成员面对话：无会话发送 = 静默丢弃（用户 13:50 走查原话「会话发出去没反应」；实读：`sessions: []` ∥ 日志零发送请求）**

- **披露（轻通道 · 缺陷类）**：`views-me-chat.mjs:234` 无会话 ⇒ `return {accepted:false}` 零提示（违「不得静默」）；且引导块 `guideNode` 对「有工作区有卷但零会话」态落到「卷空」引导（文案误导——下一步不是拉仓而是建会话）。**rollback = revertable**。
- **变更**：① `guideNode` 增零会话支（`me.chat.noSessionGuide`——「新会话」为主钮）；② `onSend` 零会话 ⇒ 就地追加 `me.chat.needSession` 提示行（非静默；草稿还原既有链不变）；③ i18n 两键（zh ∥ en 同拍）。
- **实走计划**：`.5` 重部署（服务器侧四档——零核件依赖，即日可绿）⇒ 用户刷新重试：菜单见分组名 + 零会话发送见提示。

**笔 4 · 「Failed to fetch」裸错提示（用户 13:58 走查原话「拉取项目显示 Failed to fetch」）**

- **披露（轻通道 · 走查命中项 · 明细类）**：实况 = 服务器重启后旧 keep-alive 连接上首个 **POST** 必失败（浏览器不自动重试 POST；GET 会静默换连接 ⇒ 同页 GET 全绿）——报错文案裸透 TypeError（`public/i18n.mjs:100` 兜底 `error.message`）。**非功能缺陷**（服务器侧路由实探通：无效项目 id ⇒ 404「项目不存在或不可见」业务错；自开机日志零条 `/pulls` = 请求未到服务器，坐实客户端侧）。**rollback = revertable**。
- **变更**：`mapError` 增网络级分支（`TypeError` ∧ message 含 `fetch` ⇒ `app.networkFailed` 人话）；`i18n-{zh,en}-shell.mjs` 各 +1 键。
- **实走**：重部署 ⇒ 用户刷新重试「拉取」。

**笔 5 · 服务端 keep-alive 5s 默认值 ⇒ 浏览器 POST 必败（笔 4 的根因层——用户 14:01 复现原话「还是一样」）**

- **披露（轻通道 · 缺陷类——笔 4 追根）**：实测复现（本地 raw socket：GET 后空闲 7s ⇒ 连接已被服务器关闭；响应头 `Keep-Alive: timeout=5` = Node 默认）。链 = 弹窗填表/选项目 >5s ⇒ 浏览器在死连接上发 `POST …/pulls` ⇒ 浏览器**不重试 POST**（GET 会静默换连接）⇒ `TypeError: Failed to fetch` + 请求零抵服务器（全日志零条 `/pulls`——与实况吻合）。**非偶发（每次必现）**——笔 4 的「重启后首 POST」系部分真因；根因 = `keepAliveTimeout` 默认值。**rollback = revertable**。
- **变更**：`src/gateway/server.mjs` 建服尾部（`return server` 前）设 `keepAliveTimeout = 300000` ∥ `headersTimeout = 306000`（5 分钟——LAN 内部工具口径，不套公网防护）。
- **实走**：重部署 ⇒ 用户强刷 + 重试「拉取」；复测点 = 空闲 10s 后连接仍活。

**笔 6 · 盒出站黑洞（成员面拉仓失败的真凶——用户 14:0x 震怒现场）**

- **披露（轻通道 · 缺陷类 · 环境面）**：节点（.6）残留 `table ip tc_sandbox`（ws1_fwd/ws1_in 链——除 172.18.0.1:3128 外全 DROP，而 3128 **无监听**）⇒ 盒出站 100% 黑洞（宿主通、容器不通、masquerade 计数不动——逐项实测定性）。用户裁定 = 原型期不搞安全阻挡（原话入记忆）。**处置 = 手工拆表 + 备份锚 `/root/nft-backup-20261014.txt`（可回滚）**——盒→gitee 复通（200/251ms 实读）。
- **误诊纠正（如实）**：先判「DNS 污染」**不成立**——`baiduads` CNAME = gitee 自有托管（百度云），各解析器（阿里/腾讯/本机）同值且本机/.6 宿主机同 IP 均通。
- **余腿**：拉仓 = `auth` 类失败（`member_git_credentials` 表 0 行——用户未绑 gitee 凭据）；处置 = 用户在「我的·账户」页绑定后重拉。台账 = 新账（闸关闭态不回收节点规则 + 整套闸处置待用户挑，trigger=归批）。

**复读状态（父侧补记——应评审 #12 发现 3 · 2026-10-14 20:5x）**

- **笔 2 ∥ 笔 3 ∥ 笔 4 ∥ 笔 5 = 服务器侧已生效（`.5` 实读在案）**：部署资产复核（HTTP 200 实读）：`/views-me-chat-composer.mjs` 含 `providerOf` ✓ ∥ `/views-me-chat.mjs` 含 `noSessionGuide` ∥ `needSession` ✓ ∥ `/i18n.mjs` ∥ `/i18n-zh-shell.mjs` 含 `networkFailed` ✓。
- **笔 5 连接层实测**：raw socket `10.0.0.5:8787`——GET 后空闲 **11s 连接存活**（零 END/CLOSE 事件）∧ 同连接第二请求 7ms 得答 ⇒ `keepAliveTimeout` 新值在役（旧缺省 5s 不复现）。
- **余 = 用户视觉复走**（菜单分组名 ∥ 零会话提示 ∥ 拉取成事）：随用户侧随时复走；成事读数回填于此行。
- **口径补记**：笔 1 = 挂核发行波（不绿不动——上行裁定在册）；笔 6 = 复通读数在档（200/251ms）；余腿 = 用户绑 gitee 凭据后重拉。

## §2 批次任务与设计（eng-designer）
**状态行**：设计完成（修正轮（评审 #12 发现 1/2/4/5 + 范围外注记①成实）落盘——2026-10-14）
<§2 模板占位：本批条目（覆盖） / 设计档落点 / 机制设计 / 受影响文件与测试覆盖 / 验收对照 / 关键决策 / 上抛项>

**§2 批次任务与设计（控制台走查·轻通道轮——收尾链·设计正式化步）· eng-designer · 2026-10-14**

**① 覆盖（六笔——来源 = §1 逐笔实走记录；台账 #1431）**

| 笔 | 笔题（缺陷/增补） | 设计正式化落点（改动后 file:line） |
|---|---|---|
| 1 | MCP 探活读数补工具名（核件返 `tools` ⇒ 页面具名形） | `docs/server/design/mcp/MCP.md:66` ∥ `:72` ∥ `:74-76`（+`:78` 发行链条） ∥ `:130`（用例 N3）︱`docs/server/design/gateway/API.md:320`（§2.13 契约行）︱`docs/server/design/webui/MCP.md:26` ∥ `:63` ∥ `:68` |
| 2 | 成员面模型菜单一级空白（`providerOf` 补位 ⇒ 分组行有名、选中 ✓ 跟随） | `docs/server/design/webui/CHAT.md:134-136`（§2.2 增 ⑧） |
| 3 | 零会话发送静默丢弃（零会话引导支 + 非静默提示行） | `docs/server/design/webui/CHAT.md:137-138`（§2.2 四相句 + 非静默句）︱`docs/server/design/agent/MEMBER-AGENT.md:148`（§3.6 四相表 ③ 行） |
| 4 | 网络级裸错 `Failed to fetch` ⇒ 人话（`mapError` 网络支） | `docs/server/design/webui/I18N.md:27`（§2.1 映射细则） ∥ `:70`（§4 AC-14 行） |
| 5 | keep-alive 根因（`keepAliveTimeout = 300000` ∥ `headersTimeout = 306000`） | `docs/server/design/gateway/API.md:33`（§1 新增连接层条） |
| 6 | 盒出站黑洞·环境面（节点 `.6` 残留 nft 表拆除 + 备份锚） | **不入设计（明判）**——理由见 ⑤-3；事实 = §1 ∥ 缺口与处置 = 台账 #1433 |

六档各带变更记录一行（同日——批名 + 笔号 + 同源随动指针）；**产品码零触**（设计正式化——代码已在先落，见 §1 逐笔）。

**② 机制（逐笔·按现实现正式化——零新语义）**

- **笔 1**：`tools` 源 = 核 `probeMcpServer`（`thincoder-core/mcp.mjs:103`）返工具名数组（非空字符串——名非法剔除）；路由透传（防过滤）；页面 `probeReadoutText`（`thincoder-server/public/views-mcp.mjs:58-63`）两形——**具名形** `✓ {toolCount} 个工具：{tools}，{latencyMs}ms` ∥ **计数形**回落（`tools` 缺失/空 ⇒ 零回归）；行内 ∥ 弹窗两入口同件同形。**发行链如实注**：服务器镜像内核 = npm 声明依赖（非仓内副本）⇒ 核侧补丁挂下个常规核发行波（发行钩子 = 核 `CHANGELOG.md` `[Unreleased]` 行——已在）；发行前生产读数 `tools` = 空 ⇒ 计数形回落。
- **笔 2**：`providerOf(id)` = id 首段（首斜杠口径；无斜杠 ⇒ 全串）——供给核菜单行 `provider`/`group` 与 `prefs.provider`；分组行标题 = `shortName(provider, group)`、选中 ✓ = `{model, provider}` 复合匹配 ⇒ 组行有名、✓ 跟随（一级空白消除）。
- **笔 3**：四相 ③ 判据 = **盒运行 + 零会话**（非「卷空」）；所见 = 建会话引导（「新会话」主钮 +「拉取」次钮）；零会话发送 ⇒ 就地提示行（`me.chat.needSession`）；草稿还原链不变。
- **笔 4**：`mapError` 增网络级分支（`TypeError` ∧ message 含 `fetch`——无 HTTP 响应）⇒ `app.networkFailed`（人话 + 重试指引）；先于「原文兜底」；可达码映射零变。
- **笔 5**：建服尾部设 `keepAliveTimeout = 300000` ∥ `headersTimeout = 306000`（`thincoder-server/src/gateway/server.mjs:114-117`）——Node 缺省空闲 5s ⇒ 浏览器在死连接上首个 POST 必败（弹窗填表 >5s ⇒ 拉取报错即此）；口径 = LAN 内部工具（不套公网防护）；复测点 = 空闲 ≥10s 连接仍活。
- **笔 6**：环境处置（节点手工拆表 + 备份锚 `/root/nft-backup-20261014.txt`）——非机制；设计面机制句零变（`docs/server/design/sandbox/EXECUTION.md` §5 关态「零下发、不动节点既有表」= 既有设计语句）。

**③ 受影响文件与测试覆盖**

- **设计档（本批写面——六档）**：`docs/server/design/mcp/MCP.md` ∥ `docs/server/design/gateway/API.md` ∥ `docs/server/design/webui/MCP.md` ∥ `docs/server/design/webui/CHAT.md` ∥ `docs/server/design/webui/I18N.md` ∥ `docs/server/design/agent/MEMBER-AGENT.md`（各 + 变更记录一行）。
- **产品码（本批零触——已在先落）**：`thincoder-core/mcp.mjs` ∥ `thincoder-server/src/mcp/routes.mjs` ∥ `thincoder-server/public/views-mcp.mjs` ∥ `thincoder-server/public/i18n-zh-mcp.mjs` ∥ `thincoder-server/public/i18n-en-mcp.mjs` ∥ `thincoder-server/public/views-me-chat-composer.mjs` ∥ `thincoder-server/public/views-me-chat.mjs` ∥ `thincoder-server/public/i18n-zh-me.mjs` ∥ `thincoder-server/public/i18n-en-me.mjs` ∥ `thincoder-server/public/i18n.mjs` ∥ `thincoder-server/public/i18n-zh-shell.mjs` ∥ `thincoder-server/public/i18n-en-shell.mjs` ∥ `thincoder-server/src/gateway/server.mjs`。
- **测试覆盖**：批内单元测试档 = 无（轻通道轮口径——逐笔实走读数在 §1）；集成场景影响 = 无新增（release gate = 父侧）；笔 1 绿腿挂核发行波复读（发行后重建 ⇒ 探活复读具名形）。

**④ 验收对照（逐笔——设计级判据 + 复读点）**

| 笔 | 判据（设计档落点） | 复读点 |
|---|---|---|
| 1 | `mcp/MCP.md` §3.2/§3.3 两形句 ∥ `gateway/API.md` §2.13 响应形 | 发行波后重建 ⇒ 探活示具名形（`✓ N 个工具：<名…>，Xms`） |
| 2 | `webui/CHAT.md` §2.2⑧ | 菜单分组行有名 + 选中 ✓ 跟随（实走） |
| 3 | `webui/CHAT.md` §2.2 四相/非静默句 ∥ `agent/MEMBER-AGENT.md` §3.6 ③ | 零会话发送见提示行；刷新后引导 =「新会话」主钮 |
| 4 | `webui/I18N.md` §2.1 网络支 ∥ §4 AC-14 | 网络失败示 `app.networkFailed`（非裸 `Failed to fetch`） |
| 5 | `gateway/API.md` §1 连接层条 | 空闲 ≥10s ⇒ 连接仍活（重部署后复测） |
| 6 | ——（不入设计） | 环境复通读数在 §1（盒 → gitee 200/251ms） |

**⑤ 关键决策（本批）**

1. **按现实现正式化**：六笔行为/契约/判据句逐条对位代码坐标——零新语义（不发明方向、不改判据）。
2. **笔 5 承载档 = `gateway/API.md` §1**：理由 = 该档域含「http 服务」（与 §1 分派行同节）；单源（D2）——`ops/OPS.md` 不复述。
3. **笔 6 判不入设计**：理由 = 环境处置非机制；「闸关态不回收节点规则」= 已入账缺口（#1433 归批·处置待用户挑）——设计与台账两账不混。
4. **笔 4 页面档零涉**：错误映射单点 = `thincoder-server/public/i18n.mjs`；页面句已持「就地人话（`mapError`）」形——不逐页复述。
5. **笔 1 发行态如实注**（`mcp/MCP.md` §3.3 发行链条）——不假装已生效。
6. **笔 3 同源随动 = `agent/MEMBER-AGENT.md` §3.6**：CHAT.md §2.2 之机制单源即 §3.6——两档不一致 = 缺陷，随拍收正（四相表 ③ 行）。

**⑥ 上抛**

- **[上抛·知会]** 笔 1 绿腿挂核发行波——#1431 结算挂该波（发行前生产读数 `tools` 空 ⇒ 计数形回落如实）。
- **[上抛·知会]** 笔 6 判不入设计 + #1433 两候选（①关态补回收 ②整套闸摘除——待用户挑）。
- **[上抛·知会]** 键面增量（供各收口轮计数）：`admin.mcp.probeOkNamed` +1/表；`me.chat.noSessionGuide` ∥ `me.chat.needSession` +2/表（member 收口轮在册 46 ⇒ 48）；`app.networkFailed` +1/表（shell 两表）。
- **[上抛·知会]** 观测（非本批、未动）：存量漂移仍在册——#1415（`webui/MCP.md` §3/§4 与估值）∥ #1413（member 行账/键数）∥ #1389（`mcp/MCP.md` 任务面坐标随撤除批收正）——归属各收口轮。

**修正轮（fix 轮——评审 #12（§3 轮次 1）发现 1/2/4/5 + 范围外注记①成实；父侧逐条裁决；2026-10-14）**

- **批级「最近先例（对齐 ∥ 偏离）」行（评审发现 5 补）**：六笔 = **对齐（按现实现正式化）**——先例载体逐笔：笔 1 → `docs/server/design/mcp/MCP.md:76`（CLI `/mcp test` 计数形 = 读数形来源） ∥ `docs/server/design/mcp/MCP.md:66`（`proxy/test` 自含状态——`ok:false` 仍 200） ∥ `docs/server/design/webui/MCP.md:38`（资源清单页形 + 探活两入口先例段）；笔 2 ∥ 笔 3 → 管理面同件与成员面引导块既有形（`webui/CHAT.md` §2.1 ∥ §2.2）；笔 4 → 错误映射既有形（`webui/I18N.md` §2.1）；笔 5 → Node 建服连接层参数（无直接先例——LAN 内部工具口径）；笔 6 → 环境处置不入设计（`sandbox/EXECUTION.md` §5 关态句）。**偏离 = 零**（笔 1 具名形 = 相对 CLI 计数形的增补——非偏离）。

- **修正项落盘（五点；各档变更记录一行在档——当晚批名 ∥ 轮次 ∥ 理由）**：① `docs/server/design/agent/MEMBER-AGENT.md:33` KD-SV-155 行 ③ 判据收正（盒运行、零会话——与 §3.6 四相表同拍）；② `docs/server/design/webui/I18N.md:27` 网络级失败场景句按根因口径改写（`gateway/API.md` §1 同拍）；③ `docs/server/design/webui/MCP.md:74` 变更记录补 §1 行；④ 本行（批级先例）；⑤ `docs/core/design/MCP.md:128` ∥ `:177` 返回形补 `tools`（连带该档变更记录一行）。产品码零触（设计轮）。

## §3 设计评审（评审子代理）

### 轮次 1（评审子代理）

**评审面** = 批档 `docs/batches/2026-10-14-console-walkthrough-light.md` §1/§2 ∥ 设计档六档（`docs/server/design/mcp/MCP.md` ∥ `gateway/API.md` ∥ `webui/MCP.md` ∥ `webui/CHAT.md` ∥ `webui/I18N.md` ∥ `agent/MEMBER-AGENT.md`）；口径 = 声明评审面（代码坐标未核——按指令禁扩面读码；无文档地图/项目标准档——判据 7 降级，置放按 AGENTS.md 惯例核）。**判据 8**：本步写面纯 .md（豁免），见发现 6；**判据 9**：见发现 5。

| # | Category | Severity | Issue | Suggestion |
|---|---|---|---|---|
| 1 | Document ownership | 🔴 | 「笔 3 四相判据」同档两处相抵：`agent/MEMBER-AGENT.md:33`（KD-SV-155 行）仍载旧判据「盒运行 + 空卷 ⇒ 拉仓引导」；`agent/MEMBER-AGENT.md:148`（§3.6 四相表 ③ 行）已收正为「③ 盒运行、零会话」+「「新会话」主钮 +「拉取」次钮」；批档 §2 明写收正口径（`docs/batches/2026-10-14-console-walkthrough-light.md:76`：「四相 ③ 判据 = **盒运行 + 零会话**（非「卷空」）」）。同源随动扫面（§2 ⑤-6）只指 §3.6——KD 行漏收，且该行仍为 AC 引用靶（`agent/MEMBER-AGENT.md:236`：「**155** 四相脚本」）。同机制两处异述 = 文档归属级 🔴（不降级）。 | KD-SV-155 行 ③ 判据收正（或整段改指针 = §3.6 四相表）+ 连带扫 155/四相引用面（§6 AC-50⑥ 行等）；同档先例 = KD 行收正（`agent/MEMBER-AGENT.md:276`：「三处（KD-SV-156 行 ∥ 销毁门面句 ∥ 成员动作集句）去 `dirty`（删键——伪读数不留）」）。 |
| 2 | Clarity ∥ doc-state 一致性 | 🟡 | `webui/I18N.md:27` 网络级失败场景句仍载笔 4 被更正的表述：「服务器重启后旧 keep-alive 连接上首个 POST 必败的日常场景」——批档 §1 笔 5 已裁「笔 4 的「重启后首 POST」系部分真因；根因 = `keepAliveTimeout` 默认值」（批档 `:43`）；`gateway/API.md:33` 载收正口径「Node 缺省空闲超时 5s 下，浏览器在死连接上发**首个 POST 必败**」。指针（根因层 = API.md §1）在场，但「日常」归因相抵。 | 场景句按收正根因改写（「空闲 >5s ∥ 重启 ⇒ 死连接上首个 POST 必败」形）或删场景句只留根因指针——与 `gateway/API.md` §1 连接层条同拍。 |
| 3 | Acceptance criteria | 🟡 | §2 ④ 逐笔列复读点，但 §1 缺 笔 2–5 成事读数：笔 2 无实走条目 ∥ 笔 3 = 「实走计划」（批档 `:33`）∥ 笔 4 = 动作句（批档 `:39`）∥ 笔 5 = 动作句 + 复测点（批档 `:45`）；对照 笔 1 红前/半绿读数在档（`:20`）∥ 笔 6 复通读数在档（`:49`）；§2 ③ 声明「逐笔实走读数在 §1」（`:85`）。 | 已复读 ⇒ 补录各笔绿读数（含笔 5 复测点「空闲 ≥10s 连接仍活」）；未跑 ⇒ 按笔 1「不绿不动」口径显式记挂账（结算行落 §6）。 |
| 4 | 变更记录（doc hygiene） | 🔵 | `webui/MCP.md:10`（KD-SV-202 行）已见「（计数形——两形制 = §2.1）」措辞，而本批变更记录（`webui/MCP.md:74`）只列 §2.1/§4/§5——若该措辞本批所改，变更记录漏 §1 一行（无 diff 可判，按核对提示）。 | 核对后补列 §1 行，或确认该措辞非本批所加（变更记录一行即可）。 |
| 5 | Closest-precedent | 🔵 | 批档 §2 无批级「最近先例（对齐 ∥ 偏离）」行（§2 ⑤-1 = 零新语义声明，`:100`）；先例仅散见落点档（`mcp/MCP.md:76`「CLI `/mcp test` 形 = 计数形来源」∥ `mcp/MCP.md:66`「自含状态——`ok:false` 仍 200，沿 `proxy/test` 口径」∥ `webui/MCP.md:38` 最近先例段）。 | 补一行批级先例句（六笔 → 先例载体 + 「对齐（按现实现正式化）」），满足先例检查项。 |
| 6 | Affected-file size annotations | 🔵 | 判据 8 结论 = 本步（设计正式化）写面纯 .md（豁免）——成立；批级口径待明：笔 1–5 走查码改 13 件（§2 ③ 列）无行数/增量注（轻通道轮口径），若收口轮需批级行账则无锚。 | 明写口径（轻通道轮行账从略）或于 §6 收口轮挂一行批级行账项（含 13 件读数/增量）——二者取一。 |

**计数**：🔴×1 ∥ 🟡×2 ∥ 🔵×3；范围外注记 ×5（无严重度——核侧设计档随动 ∥ 管面 N85 结果形 ∥ OPS 单源声明 ∥ 需求档回笔面 ∥ 代码坐标）。

**VERDICT: changes-required**

## §4 用户批准（主 agent）

**用户批准（主 agent 代签——授权 = 用户 2026-10-14 20:30「点火，自动跑完吧」）**

- **批准对象** = 本批全链（轻通道轮收尾链）：§2 设计正式化（六笔落盘）+ §3 评审（#12）全部发现逐条收敛：
  - 🔴 1 → **Fixed**（`agent/MEMBER-AGENT.md:33` KD-SV-155 行 ③ 判据收正——与 §3.6 同拍）
  - 🟡 2 → **Fixed**（`webui/I18N.md:27` 场景句按根因口径改写）∥ 🟡 3（复读证据）→ **Fixed**（父侧 §1 复读状态行 + 服务器侧实读落档）
  - 🔵 4 → **Fixed**（`webui/MCP.md:74` 变更记录补 §1）∥ 🔵 5 → **Fixed**（批档 §2 `:123` 批级先例行）∥ 🔵 6 → **Fixed**（13 件行数实读 + `views-me-chat.mjs` 503 并入 #1405）
  - 面外① → **Fixed**（`docs/core/design/MCP.md:128`/`:177` 返回形补 `tools`）∥ 面外②③④ → **Not an issue**（实读证据在案：`admin-tools.mjs:139` 自构形 ∥ `OPS.md` 零提及 ∥ 需求档 AC 指向设计行）∥ 面外⑤ → 代码坐标抽验通过。
- **复核** = 五点逐处 `file:line` 实读在案（父侧）；修正轮 #14 机检 = 基线持平（本批域零新增红）。
- **代签依据** = 上述收敛表 + 修正轮落盘复核 + §1 复读状态行；本批结算挂核发行波（#1431 在途保持——钩子在册）。

## §5 实施记录（eng-coder）
## §6 验证与收口（父代理）

**验证与收口（主 agent · 2026-10-14）**

**收口面（轻通道轮——实施 = 父侧直笔 + 设计席笔，§5 n/a）**

| 面 | 读数 |
|---|---|
| 批内件 | 无（轻通道轮口径——六笔复读读数 = §1 复读状态行） |
| 六笔复读 | 笔 1 = 挂核发行波（钩子 = 核 `CHANGELOG.md` `[Unreleased]` 行；复读 = 重建部署后探活具名形）∥ 笔 2/3/4/5 = `.5` 资产级 PASS（`providerOf` ∥ `noSessionGuide` ∥ `needSession` ∥ `networkFailed` 四项 200 实读）+ 笔 5 连接层实测 PASS（空闲 11s 存活 ∧ 同连接 7ms 得答）∥ 笔 6 = 复通读数在档（200/251ms） |
| 评审 | #12（changes-required → 全条收敛，裁决表在 §4）∥ 修正轮 #14 五点落盘 + 父侧五点复核（file:line 实读） |
| 机检 | doc-check 基线持平（悬空 24 ∥ 行宽 3——皆存量）；本批五档零新增红 |
| 用户文档面同拍 | 无（控制台面显示级变更；站仓页面零涉） |

**遗留（如实——不封装为完成）**

1. 笔 1 绿腿 = 核发行波（不绿不动；复读后于台账 #1431 核销）。
2. 用户侧视觉复走（菜单分组名 ∥ 零会话提示 ∥ 拉取成事）＝随时；读数回填 §1。
3. 笔 6 余腿 = 用户绑 gitee 凭据后重拉。
4. 需求档 `:696`「空卷」半句 = 随 #1433 摘除轮需求回笔同拍（该行另含「受出站规则约束」——一并收正）。

**结算**

- 台账 #1431：**在途保持**（结算挂核发行波——机器可读钩子 = 本档 §1 复读状态行 + 台账 evidence 行）；核销落于该波复读之后。
- 键面增量归 #1413/#1415（在册）∥ `views-me-chat.mjs` 503 → #1405 族行（在册）。
- 台账可见面（收口读数）：未决四态 = 116 ∥ 待核销 = 0。
- 批档冻结（§1 → 已收口 2026-10-14）。
