# 2026-10-14 · console-walkthrough-light
> 六段 append-only，一段一作者：§1 讨论（主 agent）· §2 批次任务与设计（eng-designer）· §3 设计评审（评审子代理）· §4 用户批准（主 agent）· §5 实施记录（eng-coder）· §6 验证与收口（父代理）。
> 编制：主 agent · 2026-10-14 · 来源 = 用户 2026-10-14 13:2x 走查管理面（MCP 页探活读数仅计数、无工具名——原话「mcp服务我点了probe以后，只显示了一个工具，没有工具名称，这个也不太好。」）；轻通道走查轮——逐笔记入 §1（披露 ∥ 变更 ∥ 实走 ∥ 冻结）。。
> 台账 = #1431（server · 归批）。前情 = docs/batches/2026-10-13-console-walkthrough-light.md §6（已收口 2026-10-13）。
## §1 讨论（主 agent）
**状态行**：🔄 进行中（…）
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

## §2 批次任务与设计（eng-designer）
**状态行**：（eng-designer 写入时更新）
<§2 模板占位：本批条目（覆盖） / 设计档落点 / 机制设计 / 受影响文件与测试覆盖 / 验收对照 / 关键决策 / 上抛项>
## §3 设计评审（评审子代理）
## §4 用户批准（主 agent）
## §5 实施记录（eng-coder）
## §6 验证与收口（父代理）
