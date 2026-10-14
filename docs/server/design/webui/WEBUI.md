# Thincoder Server · 控制台前端（webui/WEBUI）

> 板块 = server ∥ 本档 = webui 域（页面路由 ∥ HTML ∥ 静态资源）；板总览 = `PROJECT.md`（文档地图 = §3）。
> 本域回指 = `PROJECT.md` §7（非功能·前端自洽 = 本档 §6）。
> 面档（2026-10-11 域内拆分——§2 各节正文随面）：沙盒面 = `webui/SANDBOX.md` ∥ 管理面对话 = `webui/CHAT.md` ∥ 系统页 = `webui/SYSTEM.md` ∥ 读数面 = `webui/READINGS.md` ∥ 我的面 = `webui/ME.md` ∥ 管理数据面 = `webui/ADMIN.md` ∥ 样式与版式 = `webui/STYLE.md` ∥ 多语言 = `webui/I18N.md`（§2 各节原位保位 stub——正文随面）。
> 建档：2026-10-06（设计轮；同日补轮——B 案织入 + 三层结构）。

## 1. 静态面

- 落点 = `thincoder-server/public/`（已落盘；本批 IA 重排——§2）：`index.html`（壳——侧栏容器 + 挂载点 + 模块入口）∥ `app.mjs`（入口：路由分派 ∥ fetch 封装 ∥ 会话态 ∥ 启动装配）∥ `dom.mjs`（渲染助手 + 提示条——结构轮拆）∥ `health.mjs`（健康轮询——结构轮拆）∥ `nav.mjs`（IA 单源——组/项数据 + 路由解析纯函数）∥ `style.css`。
- 视图档（按页分档——§2）：`views-auth.mjs`（登录）∥ `views-me.mjs`（我的三页）∥ `views-admin.mjs`（成员管理）∥ `views-usage.mjs`（已落盘——全队用量 + 看板——`webui/READINGS.md` §2.1②）∥ `views-overview.mjs`（已落盘——管理总览——`webui/READINGS.md` §2.1③）∥
  `views-audit.mjs`（已落盘——审计——`webui/READINGS.md` §2.1④）∥ `views-providers.mjs`（Provider——列表 + 双弹窗编排；`webui/ADMIN.md` §2.1④）∥ `views-providers-modals.mjs`（Provider 弹窗件——添加流 ∥ 详情流；`webui/ADMIN.md` §2.1④）∥
  `views-system.mjs`（系统——版本/更新 ∥ 接入卡 ∥ 向量服务 ∥ 服务健康；`webui/SYSTEM.md` §2.1）∥ `views-system-config.mjs`（系统配置卡——含代理设置 ∥ 连通测试块；`webui/SYSTEM.md` §2.1 ∥ §2.2）∥
  `views-models.mjs`（已落盘——服务模型：列表 + 详情/配置弹窗——`webui/ADMIN.md` §2.1③）∥ `model-specs-snapshot.mjs`（已落盘——展示元数据快照——`webui/ADMIN.md` §2.1③）∥
  `views-sandbox.mjs`（已落盘——运行面批；沙盒页：运行面卡 + 容器区/镜像区（本批续扩；余五面随沙盒余面批）——`webui/SANDBOX.md` §2.1①）∥ `views-sandbox-containers.mjs` ∥ `views-sandbox-images.mjs`（sandbox-docker-admin 批新建——容器面/镜像族件——`webui/SANDBOX.md` §2.1①）
   ∥ `views-sandbox-volumes.mjs`（已落——卷族件——sandbox-volumes 批——`webui/SANDBOX.md` §2.1①） ∥ `views-sandbox-connection.mjs`（拟新增——**本增补 #2**（连接面 TLS 档）——`webui/SANDBOX.md` §2.1①）
   ∥ `views-me-sandbox.mjs`（拟新增——**本批新建**（sandbox-outbound-member-face 批）——我的·工作区——`webui/SANDBOX.md` §2.2）
  ∥ `views-chat.mjs`（admin-agent-chat 批新建——管理面对话页——`webui/CHAT.md` §2.1）∥ `views-chat-composer.mjs`（chat-shell-align 批新建——对话页输入区适配层 ∥ 状态行 ∥ 斜杠表——`webui/CHAT.md` §3）∥ `views-chat-messages.mjs`（已落——对话页消息面（帧面纯函数 ∥ 回读装配）——console-chat-live-step 批——`webui/CHAT.md` §3）
  ∥ `views-me-chat.mjs` ∥ `views-me-chat-messages.mjs` ∥ `views-me-chat-composer.mjs`（member-face-chat 批新建——成员面对话页三件——`webui/CHAT.md` §2.2）
  ∥ `views-projects.mjs`（已落——我的·项目 + 共用构建器（项目详情弹窗 ∥ 添加仓对话框）——team-projects-permissions 批——`webui/PROJECTS.md` §2.1）
  ∥ `views-admin-projects.mjs`（已落——管理·项目**两标签壳**（项目 ∥ Git 源）——2026-10-13 project-sources-merge 批——`webui/PROJECTS.md` §2.2/§2.3）∥ `views-git-sources.mjs`（已落——**Git 源面板**（标签②——页题 h2 撤）——`webui/PROJECTS.md` §2.4）；
  `terminal-core.mjs` ∥ `terminal-render.mjs` ∥ `terminal-link.mjs` ∥ `views-sandbox-terminal.mjs`（拟新增——**本批新建**（sandbox-container-terminal 批）——终端核三件（解析/网格 ∥ DOM 渲染 ∥ WS 传输）+ 控制台消费件——`webui/TERMINAL.md` §2/§3 ∥ `webui/SANDBOX.md` §2.1①）；
   `views-mcp.mjs`（已落——server-mcp 批——MCP 页（清单 ∥ 探活读数 ∥ 增/改/删弹窗）——`webui/MCP.md` §2）；
  公共组件 = `modal.mjs`（已落盘——弹窗 + 窗体助手四件（sandbox-docker-admin 批迁入）——`webui/ADMIN.md` §2.1①）∥ `tabs.mjs`（已落——公共标签页组件——`webui/TABS.md` §2.1）。
- 原 `views.mjs`（三视图单档）**退役拆档**——缘由 = 新页（provider ∥ IA 重排）叠加后单档将破 300 软线；拆分 = 按页归档（每档 ≤300）。
- 直发 = `thincoder-server/src/webui/static.mjs`（已落盘）：`node:http` 读发 `public/`——mime 表（`.mjs` ⇒ text/javascript） ∥ 防路径穿越 ∥ `Cache-Control: no-cache`（内部工具——改版即见）。
- 路由：`GET /` ⇒ `index.html`；其余静态档按名直发（同源）；`/v1/*` 与 `/api/*` 优先于静态面（分派 = `gateway/API.md` §1）。
- 形态钉死（用户 2026-10-06 08:09）：**零框架 ∥ 零构建 ∥ 零外部资源**（无 CDN ∥ 无外链字体——内网自洽）；先例 = 本仓 webview（`thincoder-vscode/webview/`）的 vanilla 口径。
- JS = **二十八 ⇒ 三十二档**（历批叠加：沙盒运行面批 +1 ∥ admin-agent-chat 批 +1 ∥ sandbox-docker-admin 批 +2）**⇒ 三十四档**（i18n 拆分（#1270）+2）**⇒ 三十五档**（sandbox-image-sources 批 +1）**⇒ 三十七档**（console-chat-align 批 +2——i18n core 两部件——现盘面）**⇒ 三十八档**（本批（console-tabs-component）+1——`tabs.mjs`（已落））
  **⇒ 三十九档**（sandbox-volumes 批 +1——`views-sandbox-volumes.mjs`（已落））
  **⇒ 四十档**（chat-shell-align 批 +1——`views-chat-composer.mjs`）**⇒ 四十一档**（console-chat-live-step 批 +1——`views-chat-messages.mjs`（已落））**⇒ 四十六档**（team-projects-permissions 批 +5——`views-projects.mjs` ∥ `views-admin-projects.mjs` ∥ `views-git-sources.mjs` + i18n project 两部件）
  **⇒ 四十七档**（sandbox-outbound-member-face 批 +1——`views-me-sandbox.mjs`（本批））；**⇒ 五十档**（team-ledger 批 +3——`views-ledger.mjs` + i18n ledger 两部件）
  **⇒ 五十三档**（member-face-chat 批 +3——成员对话页三件（`views-me-chat.mjs` ∥ `views-me-chat-messages.mjs` ∥ `views-me-chat-composer.mjs`）；i18n 部件零新档——`me.chat.*` 入 me 两表）
   **⇒ 五十九档**（本批（sandbox-container-terminal）+6——`terminal-core.mjs` ∥ `terminal-vt.mjs`（拆案） ∥ `terminal-codec.mjs`（拆案） ∥ `terminal-render.mjs` ∥ `terminal-link.mjs` ∥ `views-sandbox-terminal.mjs`）
   **⇒ 六十档**（本增补（sandbox-exec-rebuild 批 · 修订轮——底座可换）+1——`views-sandbox-base.mjs`（拟新增——`webui/SANDBOX.md` §2.1①））
   **⇒ 六十一档**（本增补 #2（连接面 TLS 档）+1——`views-sandbox-connection.mjs`（拟新增——`webui/SANDBOX.md` §2.1①））
  **⇒ 六十五档**（本批（server-mcp）实施落定——+3：`views-mcp.mjs` + i18n mcp 两部件（`i18n-{zh,en}-mcp.mjs`）；盘面实读收正——链上前值 61 与盘面差 1（陈链在途口径差，在案））
  `modal.mjs` ∥ `i18n.mjs` ∥ `i18n-zh.mjs` ∥ `i18n-en.mjs` ∥ i18n 部件**十八档**（`i18n-{zh,en}-{shell,me,admin,sandbox,system,core,project,ledger,mcp}.mjs`——`webui/I18N.md` §2.1 拆表） ∥ `model-specs-snapshot.mjs`）+ `style.css`；行标 = ≤500 软线；逐档实读与叠加链 = §5。
- **档目链（UI 代码档 ∥ 含 favicon 全目录——AC 行口径）单源 = 本节**：i18n 批后 12 ∥ 13 ⇒ 二轮批后 15 ∥ 16 ⇒ 弹窗批后 17 ∥ 18 ⇒ provider 重做批后 18 ∥ 19 ⇒ 配置面批后 19 ∥ 20 ⇒ 结构轮后 29 ∥ 30 ⇒ 配置控制台批后 30 ∥ 31 ⇒ 代理页批后 31 ∥ 32 ⇒ 代理回迁批后 30 ∥ 31 ⇒
  沙盒运行面批后 31 ∥ 32 ⇒ admin-agent-chat 批后 32 ∥ 33 ⇒ sandbox-docker-admin 批后 34 ∥ 35 ⇒ i18n 拆分（#1270）后 36 ∥ 37 ⇒ sandbox-image-sources 批后 37 ∥ 38 ⇒ console-chat-align 批后 39 ∥ 40（现盘面）
  ⇒ console-tabs-component 批落定后 40 ∥ 41 ⇒ sandbox-volumes 批后 **41 ∥ 42** ⇒ **chat-shell-align 批后 42 ∥ 43** ⇒ **console-chat-live-step 批后 43 ∥ 44**（现盘面）⇒ **team-projects-permissions 批后 48 ∥ 49**
  ⇒ **沙盒成员面（`#/me/sandbox`——sandbox-outbound-member-face 批）落定后 49 ∥ 50**（本批 +1——`views-me-sandbox.mjs`）⇒ 沙盒余面批后 **51 ∥ 52**（§6 各 AC 行链 2026-10-11 域内拆分时收口至此——链不复述）。
  ⇒ **team-ledger 批 +3**（`views-ledger.mjs` + i18n ledger 两部件）——as-of 盘面实读基线 **50 ∥ 49** ⇒ **53 ∥ 52**（链上「沙盒余面批后 51 ∥ 52」与盘面差 1–2 档 = 在途批未落齐；**实施当刻以盘面实读收正**——登记 = `ledger/LEDGER.md` §13 R74）。
  ⇒ **member-face-chat 批 +3**——链上 **53 ∥ 52 ⇒ 56 ∥ 55**（三新档：`views-me-chat.mjs` ∥ `views-me-chat-messages.mjs` ∥ `views-me-chat-composer.mjs`；2026-10-13；实施当刻以盘面实读收正）。
   ⇒ **本批（sandbox-container-terminal）+6**——链上 56 ∥ 55 ⇒ **62 ∥ 61**（六档——含拆案两档：`terminal-core.mjs` 越线实拆 `terminal-vt.mjs` ∥ `terminal-codec.mjs`；2026-10-13 实施回填收正）。
   ⇒ **本增补（sandbox-exec-rebuild 批 · 修订轮——底座可换）+1**——链上 62 ∥ 61 ⇒ **63 ∥ 62**（`views-sandbox-base.mjs`——拟新增；**实施当刻以盘面实读收正**）⇒ **本增补 #2（连接面 TLS 档）+1**——链上 63 ∥ 62 ⇒ **64 ∥ 63**（`views-sandbox-connection.mjs`——拟新增；**实施当刻以盘面实读收正**）。
  ⇒ **server-mcp 批 +3**（`views-mcp.mjs` ∥ `i18n-{zh,en}-mcp.mjs`）——**盘面实读收正：UI 代码档 67 ∥ 含 favicon 全目录 68**（链上前值 64 ∥ 63 = 设计轮链推值；差 1–3 档 = 历批在途口径差，在案）。
- **静态面双根（console-chat-align 批）**：`public/`（本根）+ **`/rc/*` → `@thincoder/render-core` 包目录**（渲染核供给根——`static.mjs` 前缀表；两先例同形 = 桌面 `app://` 双根 ∥ VSC 相对径）。
- 此后实读（2026-10-08 结构轮后）：`views-admin.mjs`（实读 331） ∥ `views-providers-modals.mjs`（实读 367）；`app.mjs` 与 i18n 双表两越线条目已由本结构轮拆解（读 = §5）。

## 2. 控制台 IA 与视图（哈希路由——KD-SV-20）

- **形态（本批定稿——用户 16:13 令）**：**左侧栏**分组导航 + 内容区；hash 路由扩展为 `#/<组>/<页>`；一页一职责（原「管理」单页堆叠拆开——成员/用量分页）。

| 组 | 页（hash） | 职责 | 角色 |
|---|---|---|---|
| 我的 | `#/me/chat` | 对话（成员面 agent——开发：工作区绑定会话 + 流式对话区 + 工具调用行 + 输入区全件；工作区选择/盒态动作（启动/拉仓）；**会话源 = 盒内**（离线 ⇒ 就启动引导）——`webui/CHAT.md` §2.2；非壳页） | 全体 |
| 我的 | `#/me/keys` | API Key 表（名称 ∥ API Key ∥ 签发时间 ∥ 最后使用 ∥ 近 30 天 ∥ 操作——多把并存；`webui/ME.md` §2.1） ∥ 签发新 API Key（弹窗 ∥ 新明文一次性区带复制钮） ∥ 逐把吊销（弹窗） | 全体 |
| 我的 | `#/me/usage` | 本人用量看板（`webui/ME.md` §2.2——概览卡行 ∥ 筛选行 ∥ KPI 行 ∥ 按日主图（维度切换 端点/模型）∥ 分模型区 ∥ 明细表）+ 向量服务提示条（模型名 ∥ snippet——`webui/READINGS.md` §2.1①；缺 `embedding` 段 ⇒ 不渲染——2026-10-09 embed 解耦批） | 全体 |
| 我的 | `#/me/account` | 基本信息（展示名/用户名/角色）+ 自助改密 | 全体 |
| 我的 | `#/me/projects` | 我的·项目：可见项目表（显示名 ∥ 仓地址 ∥ 源 ∥ 我的权限 ∥ 负责人——搜索 ∥ 行点击 ⇒ 项目详情弹窗（权限感知：成员表 ∥ 加成员 ∥ 改显示名/地址/负责人——按能力显隐）；team-projects-permissions 批——`webui/PROJECTS.md` §2.1） | 全体 |
| 我的 | `#/me/sandbox` | 我的工作区：本人工作区状态（盒状态（含回收原因） ∥ 快照 ∥ 所属 runner——`webui/SANDBOX.md` §2.2；只读；待批提示随退场删——2026-10-14） | 全体 |
| 我的 | `#/me/ledger` | 团队台账：列表（编号 ∥ 仓 ∥ 标题 ∥ 状态（+老化标） ∥ 负责人 ∥ 更新 ∥ 操作）∥ 三筛（仓/状态/负责人）∥ 新建/编辑/收口/撤回——team-ledger 批——`webui/LEDGER.md` §2.1 | 全体 |
| 管理 | `#/admin/overview` | 总览（落地页）：今日请求/token ∥ 成员数 ∥ 健康 ∥ 更新提示 ∥ 快捷入口（`webui/READINGS.md` §2.1③） | admin |
| 管理 | `#/admin/chat` | 对话（管理面 agent——运维/管理：机队 ∥ 成员与 provider ∥ 审查排障；会话列表 + 流式对话区 + 工具调用行——`webui/CHAT.md` §2.1；非壳页） | admin |
| 管理 | `#/admin/members` | 成员表（行点击 ⇒ 详情弹窗——模型表直显（逐行已用 ∥ 禁用勾选） ∥ 设额度（分模型） ∥ 重置密码 ∥ 逐 key 吊销；新建成员弹窗——`webui/ADMIN.md` §2.1②） | admin |
| 管理 | `#/admin/projects` | 项目（**两标签：项目 ∥ Git 源**——一页两标签；旧址 `#/admin/git-sources` ⇒ 本页 Git 源标签）：面板① 全量项目表（显示名 ∥ 仓地址 ∥ 源 ∥ 负责人 ∥ 成员数——搜索 ∥「添加仓」（源选单 + 拉列表勾选批量 + 手输保底）∥ 行点击 ⇒ 详情弹窗（admin 能力面全显））∥ 面板② 源表（名字 ∥ 平台 ∥ PAT 掩码 ∥ 状态 ∥ 同步方式 ∥ 上次同步 ∥ 操作（立即同步 ∥ 拉列表 ∥ 体检 ∥ 编辑 ∥ 删除））+ 添/编/删弹窗——team-projects-permissions 批 ∥ 合并 = 2026-10-13 project-sources-merge 批——`webui/PROJECTS.md` §2.2/§2.3/§2.4） | admin |
| 管理 | `#/admin/projects/<tab>` | 子段形（`projects` ∥ `git-sources`）——刷新/分享/直打落对应标签；切换 = 页内 `replaceState`（零重渲）——`webui/TABS.md` §2.2 四岔口（第二消费面） | admin |
| 管理 | `#/admin/providers` | Provider 列表（行点击 ⇒ 详情弹窗：基本信息 ∥ 服务模型勾选）∥ 页首「添加」⇒ 添加弹窗（预设/自定义两径；数据源 = providers ∥ presets 端点——契约 = `gateway/API.md` §2.2；`webui/ADMIN.md` §2.1④） | admin |
| 管理 | `#/admin/models` | 服务模型：开放清单（`/v1/models` 同源——provider 派生）∥ 列表配额列 ∥ 详情/配置弹窗（A/C/D/E + 配额 F——`webui/ADMIN.md` §2.1③） | admin |
| 管理 | `#/admin/mcp` | MCP 服务器清单（表：名 ∥ 传输 ∥ 目标 ∥ 启用 ∥ 操作（探活/改/删））∥「添加」弹窗（三传输字段 ∥ 秘密零回填）∥ 行内探活读数行——`webui/MCP.md` §2；server-mcp 批 | admin |
| 管理 | `#/admin/usage` | 全队用量：过滤 + 趋势/聚合/排行 + 导出（`webui/READINGS.md` §2.1②） | admin |
| 管理 | `#/admin/audit` | 审计事件列表（过滤：类型/成员/时段——`webui/READINGS.md` §2.1④） | admin |
| 管理 | `#/admin/system` | 版本与更新 ∥ 成员接入 ∥ 向量服务 ∥ 服务配置（含代理设置 ∥ 连通测试块——`webui/SYSTEM.md` §2.2） ∥ 服务健康（数据 = `/api/system` ∥ `webui/SYSTEM.md` §2.1） | admin |
| 管理 | `#/admin/sandbox` | 沙盒：运行面 ∥ 工作区 ∥ 资源与 TTL ∥ 审计可查（四面——③ 出站规则 ∥ ④ 待批队列两卡随 sandbox-egress-removal 批退场，2026-10-14；`webui/SANDBOX.md` §2.1；非壳页；**console-tabs-component 批分标签**：运行面 ∥ 镜像与镜像源 两标签（子段形——`webui/TABS.md` §2.2）） | admin |

- 登录 = `#/login`（无侧栏——登录卡）；`#/` ∥ 未知 ⇒ 角色默认页（admin ⇒ `#/admin/overview` ∥ user ⇒ `#/me/keys`）。
- **旧链迁移**：`#/me` ⇒ `#/me/keys` ∥ `#/admin` ⇒ `#/admin/overview` ∥ `#/admin/proxy` ⇒ `#/admin/system` ∥ **`#/admin/git-sources` ⇒ `#/admin/projects/git-sources`**（2026-10-13 project-sources-merge 批——Git 源并入项目页标签②；重定向带子段——`app.mjs` 拼回 ⇒ 落点/刷新/直打均达；旧书签可达；`#/admin/members` 等页路径仍直达）。
- **路由解析 = `nav.mjs` 纯函数**（`resolveRoute(path, role)`——无 DOM、单元测试档直测）：**解析序 = 别名先行、子段裁分在其后**（别名目标再走裁分 ⇒ `sub` 回传——`#/admin/git-sources` ⇒ `/admin/projects` + `sub: "git-sources"`；2026-10-13 project-sources-merge 批）；别名重定向 ∥ 角色默认 ∥ admin 面 `denied`（页面级「无权限」块——判据仍在服务端，§3）。
  **子段容许（console-tabs-component 批——2026-10-11 裁定「进」）**：`#/<组>/<页>/<子段>`——裁末段试前缀（在册 ⇒ 记 `sub` 供页面消费 ∥ 未在册 ⇒ 照旧默认页回落）；既有 hash 形行为逐字不变（`webui/TABS.md` §2.2）。
- **导航渲染**：侧栏 = 品牌 ∥ 组标题 + 项（活动态高亮）∥ 底部（meta 槽（健康状态灯（`webui/READINGS.md` §2.1⑤） ∥ 版本——`/api/system`，全角色） + 语言切换器 + 退出登录）；admin 组仅 admin 渲染。
- **窄屏**：`≤760px` 侧栏降级为顶条（单条媒体查询——非移动端适配承诺）。
- **文案面（多语言——`requirements/PROJECT.md` §2:13）**：全量文案单源 = 文案表（`i18n-zh.mjs` ∥ `i18n-en.mjs`）；`nav.mjs` 数据持 `labelKey`（键——非字面量）；页档/助手经 `t()` 取值——机制全文 = `webui/I18N.md` §2.1。
- 数据全经 `/api/*`（契约 = `accounts/ACCOUNTS.md` §3 ∥ `metering/METERING.md` §3 ∥ `gateway/API.md` §2.2）；`GET /` 公开（页面壳零数据）。

- **数据表页视口高壳（功能点 20——`webui/STYLE.md` §2.2）**：数据表五页（成员 ∥ Provider ∥ 服务模型 ∥ 审计 ∥ 用量明细 `#/me/usage`）= 壳面；`#/admin/usage` 看板页不入壳；机制全文 = `webui/STYLE.md` §2.2。

### 2.1 系统页与 meta 槽（版本/更新 ∥ 成员接入 ∥ 向量服务 ∥ 服务配置 ∥ 服务健康）

⇒ 见 `webui/SYSTEM.md` §2.1（as-of 2026-10-11）。

### 2.2 多语言（中文 ∥ English——需求 §2:13）

⇒ 机制 = `webui/I18N.md` §2.1 ∥ 键族登记 = 各面档「文件账·键族登记」节（`webui/SANDBOX.md` §3 ∥ `webui/CHAT.md` §3 ∥ `webui/ME.md` §3 ∥ `webui/SYSTEM.md` §3 ∥ `webui/ADMIN.md` §3）（as-of 2026-10-11）。

### 2.3 可见面二轮（六面机制——功能点 15；另含后批可见面：⑥ 功能点 25 ∥ ⑦ 功能点 26）

**① 向量服务可见面** ⇒ `webui/READINGS.md` §2.1①（as-of 2026-10-11）。
**② 用量看板升级** ⇒ `webui/READINGS.md` §2.1②（as-of 2026-10-11）。
**③ 管理总览** ⇒ `webui/READINGS.md` §2.1③（as-of 2026-10-11）。
**④ 审计/安全面** ⇒ `webui/READINGS.md` §2.1④（as-of 2026-10-11）。
**⑤ 健康可见** ⇒ `webui/READINGS.md` §2.1⑤（as-of 2026-10-11）。
**⑥ 「我的·key 与签发」页重做** ⇒ `webui/ME.md` §2.1（as-of 2026-10-11）。
**⑦ 「我的·用量」页图表化** ⇒ `webui/ME.md` §2.2（as-of 2026-10-11）。

### 2.4 弹窗机制与成员/服务模型/Provider 面（功能点 16 ∥ 17 ∥ 18）

**① 公共弹窗组件** ⇒ `webui/ADMIN.md` §2.1①（as-of 2026-10-11）。
**② 成员弹窗（三态：查看 ∥ 编辑 ∥ 新建）** ⇒ `webui/ADMIN.md` §2.1②（as-of 2026-10-11）。
**③ 服务模型页与配置面** ⇒ `webui/ADMIN.md` §2.1③（as-of 2026-10-11）。
**④ Provider 管理面（列表 + 双弹窗）** ⇒ `webui/ADMIN.md` §2.1④（as-of 2026-10-11）。

### 2.5 样式族规范（功能点 19——全控制台样式收束 · 2026-10-06）

⇒ 见 `webui/STYLE.md` §2.1（as-of 2026-10-11）。

### 2.6 数据表页视口高壳与布局收正（功能点 20——2026-10-07）

⇒ 见 `webui/STYLE.md` §2.2（as-of 2026-10-11）。

### 2.7 代理设置与连通测试（系统页「服务配置」卡内——功能点 30 · 2026-10-10）

⇒ 见 `webui/SYSTEM.md` §2.2（as-of 2026-10-11）。

### 2.8 沙盒页（管理——`#/admin/sandbox`；server-exec-sandbox 批——**分五轮落：① 运行面 + 容器区（runner-admin-console 批）∥ ① 续：容器面补齐 + 镜像族（sandbox-docker-admin 批）∥ ① 续二：镜像源族 + 一键拉取（sandbox-image-sources 批 ∥ sandbox-image-quick-pull 批）∥ ① 续三：拉取认源（sandbox-pull-by-source 批）∥ ① 续四：卷族（sandbox-volumes 批）∥ ②–⑥ 余面（余面批——③ 出站规则 ∥ ④ 待批队列两轮随 sandbox-egress-removal 批退场，2026-10-14）**）

**① 运行面** ⇒ `webui/SANDBOX.md` §2.1①（as-of 2026-10-11）。

⇒ 全节（形态 ∥ ②–⑥ 余面 ∥ 镜像源族 ∥ 一键拉取 ∥ 拉取认源 ∥ 卷族）见 `webui/SANDBOX.md` §2.1（as-of 2026-10-11）。

### 2.9 我的·工作区（`#/me/sandbox`——成员面；14:56 裁）

⇒ 见 `webui/SANDBOX.md` §2.2（as-of 2026-10-11）。

### 2.10 管理面对话（`#/admin/chat`——admin-agent-chat 批建档 ∥ console-chat-align 批对齐渲染面；机制全文 = `agent/ADMIN-AGENT.md` §11）

⇒ 见 `webui/CHAT.md` §2.1（as-of 2026-10-11）。

### 2.11 控制台公共标签页组件（功能点 39——console-tabs-component 批；机制全文 = `webui/TABS.md` §2.1）

⇒ 见 `webui/TABS.md` §2.1（as-of 2026-10-11）。

### 2.12 团队项目与权限面（`#/me/projects` ∥ `#/admin/projects`（两标签：项目 ∥ Git 源）——team-projects-permissions 批（B2）∥ 合并 = 2026-10-13 project-sources-merge 批；机制全文 = `project/PROJECTS.md`）

⇒ 见 `webui/PROJECTS.md` §2（as-of 2026-10-12）。

## 3. 判权与安全

- **判权全在后端**（会话 + 角色——`accounts/ACCOUNTS.md` §3）：前端仅显隐与表单；`user` 直打管理端点 ⇒ 403——页面不是判据；管理组导航仅 admin 渲染 ∥ admin hash 由 `nav.mjs` 判 `denied` 落「无权限」块（含 provider 管理面——服务端为准）。本批新增 admin 端点（总览 ∥ 向量服务 ∥ 审计 ∥ 用量报表）同门；`/healthz` = 公开（轮询零凭据——在案）。
  项目面（`/api/projects*`）= 会话 + 能力矩阵（`project/PROJECTS.md` §3——`user` 可达可见面，控件按 `can` 显隐；管理面与 Git 源面仍 admin 门）。
- 会话在 HttpOnly cookie（前端零令牌存储）；`401` ⇒ 回 `#/login`（会话过期即回登录）；`403` ⇒ 提示无权限。
- 渲染与转义（**console-chat-align 批收窄**）：控制台自有节点 = `h`/`textContent`（零**手拼** HTML 串）；**含模型/用户/工具内容的文本面 = 核 `md()` 单源渲 HTML 入 `innerHTML`**（注入点 = 页面唯一；核内输入先全量转义——对照表 = `webui/CHAT.md` §2.1）。

## 4. 视觉与自托管

- 系统字体 ∥ 表格 + 表单 ∥ 桌面优先（宽表横滚）；全自托管（无外部资源引用）；侧栏分组导航（§2）∥ 窄屏降级 = §2 末条。

## 5. 本域文件与行数预算（本域族行）

| 档 | 行数（实读——设计估） | 职责 |
|---|---|---|
| `thincoder-server/src/webui/static.mjs`（已落盘） | **78**（实读 2026-10-06——设计估 ≈70）**⇒ ≈110（console-chat-align 批：第二根 `/rc/*`——根表/前缀序/各根逃逸门）⇒ 实读 114（2026-10-11——实施落盘；估 ≈110——差 +4）** | `public/` 直发 ∥ mime ∥ 防穿越 ∥ no-cache ∥ **`/rc/*` → 核包目录（第二根——`@thincoder/render-core`）** |
| `thincoder-server/public/index.html`（已落盘） | **20**（实读 2026-10-06——设计估 ≈26；#962 壳重排实读零增） | 前端壳（挂载点 + 模块入口） |
| `thincoder-server/public/app.mjs`（已落盘） | **219**（实读 2026-10-06——设计估 ≈190；#962 IA 路由表接线 ∥ 视图装配；#963 +10 = `/api/system` 取用 ∥ meta 填充）**⇒ 240 ⇒ 299**（i18n 叠加 +21 = `initLang` 接线 ∥ 错误映射 ∥ 格式化本地化 ∥ `Retry-After` 捕捉 ∥ `rerender` 口 ∥ title 随动；二轮 +59 = 健康轮询（30s ∥ 三态 ∥ 视图监听） ∥ 两新页接线）**⇒ ≈301**（弹窗批 +≈2 = `views-models` 接线；provider 重做批 ±0——接线面不变）**；实读 300（2026-10-07）⇒ ≈316（本批 +≈16 = `dataShell` ∥ `SHELL_PAGES` ∥ 路由 `data-shell` 切换 ∥ `viewCtx` 接线——本批增量 = 接线面）⇒ 实读 317 ⇒ ≈320（配额批：`fmtModelQuotas` 新增 ∥ `fmtQuota` 退役——±3）**；实读 **321**（2026-10-07——配额批/配额 v2 批落地后）**⇒ ≈346（me-keys 批：`showSecret` 复制钮 + 三路回退 +≈25）⇒ 实读 350（2026-10-08——结构轮设计轮复读）⇒ 拆分后 ≈192（本结构轮：渲染助手 + `flash` 迁 `dom.mjs` ∥ 健康轮询迁 `health.mjs`）⇒ ≈193（2026-10-09 代理页批：import ∥ `PAGES` 行 +≈2）⇒ 实读 192（2026-10-09 代理页批落地后：190 ⇒ 192——import ∥ `PAGES` 行 +2）**⇒ 实读 194（2026-10-10——行为残渣批 #979：`closeActiveModal` import ＋ `route()` 起点调用 = +2）⇒ 实读 **192**（2026-10-10 代理回迁批：去 `views-proxy` import ∥ `PAGES` 行 −2）⇒ ≈195（沙盒运行面批：import ∥ `PAGES` 行 +≈3——`webui/SANDBOX.md` §2.1①）⇒ ≈197（admin-agent-chat 批：import ∥ `PAGES` 行 +≈2——`webui/CHAT.md` §2.1）⇒ ≈199（沙盒余面批：成员页 +≈2——`webui/SANDBOX.md` §2.2）⇒ **实读 197**（2026-10-11——设计轮现读）⇒ ≈**199**（本批（console-tabs-component）：三参透传 +≈2——`webui/TABS.md` §2.2）⇒ ≈**206**（team-projects-permissions 批：三 import + 三 `PAGES` 行 +≈7）⇒ **≈208**（team-ledger 批：+1 import +1 `PAGES` 行）**⇒ ≈212**（sandbox-outbound-member-face 批：import ∥ 路由行 +≈4；两在途批序以实施当刻盘面实读为准）⇒ **实读 206**（2026-10-13 设计轮实核——在途批落地后盘面）⇒ ≈**204**（2026-10-13 project-sources-merge 批：删 `renderGitSources` import + `PAGES` 行 −2 ∥ 重定向带子段（同行改））⇒ ≈**210**（member-face-chat 批：import ∥ `PAGES` 行 ∥ 路由带子段（同行改）+≈4——以实施实读为准）⇒ **实读 209**（server-mcp 批：+1 import +1 `PAGES` 行；实施收正） | 入口：路由分派 ∥ fetch 封装 ∥ 会话态 ∥ 启动装配 |
| `thincoder-server/public/dom.mjs`（已落盘） | **≈120**（设计估——渲染助手自 `app.mjs` 逐字外拆：`h` ∥ `table` ∥ `fmtTs`/`fmtValue`/`fmtModelQuotas` ∥ `showSecret`/`copyText` ∥ `usageTable` ∥ `dataShell` ∥ `flash`（携 `flashEl`/计时器））**⇒ 实读 118**（2026-10-09——结构轮落地后首读） | 渲染助手 ∥ 格式化 ∥ 提示条 |
| `thincoder-server/public/health.mjs`（已落盘） | **≈62**（设计估——健康轮询自 `app.mjs` 外拆：`HEALTH_POLL_MS` ∥ 三态文案键 ∥ `healthSnapshot` ∥ `onHealth` ∥ 灯直更 ∥ `pollHealth` ∥ 启停 ∥ 订阅清零口）**⇒ 实读 62**（2026-10-09——结构轮落地后首读） | 健康轮询（`webui/READINGS.md` §2.1⑤ 三落点共源） |
| `thincoder-server/public/nav.mjs`（已落盘） | **无 ⇒ 82 ⇒ 87**（实读 2026-10-06——#962 设计估 ≈70；组/项数据 ∥ `resolveRoute` 纯函数 ∥ 侧栏渲染；#963 +1 = meta 槽版本行；i18n 叠加 ±0 = `label` ⇒ `labelKey` 收编 ∥ 切换器挂 meta 槽；二轮 +5 = 总览/审计两项 ∥ `/admin` 重定向收正 ∥ 默认页收正 ∥ 灯位）**⇒ ≈90**（弹窗批 +≈3 = 服务模型项；`webui/ADMIN.md` §2.1③）；provider 重做批 ±0（labelKey 不变——值改 = 文案表）；实读 88（2026-10-07——本批零动）⇒ ≈89（2026-10-09 代理页批：+1 管理项）⇒ 实读 89（2026-10-09 代理页批落地后：88 ⇒ 89）⇒ 实读 **88**（2026-10-10 代理回迁批：−1 管理项 ∥ 别名 +1 行——净 −1）⇒ ≈89（沙盒运行面批：+1 项（管理「沙盒」）——`webui/SANDBOX.md` §2.1①）⇒ ≈90（admin-agent-chat 批：+1 项（管理「对话」——置于总览后）——`webui/CHAT.md` §2.1）⇒ ≈91（沙盒余面批：我的 +1——`webui/SANDBOX.md` §2.2）⇒ **实读 91**（2026-10-11——设计轮现读）⇒ ≈**99**（本批（console-tabs-component）：子段容许（裁末段 + `sub` 回传）+≈8——`webui/TABS.md` §2.2）⇒ ≈**103**（team-projects-permissions 批：+3 项——`#/me/projects` ∥ `#/admin/projects` ∥ `#/admin/git-sources`——+≈4 行）**⇒ ≈105**（team-ledger 批：+1 项——`#/me/ledger`——末位）**⇒ ≈106**（sandbox-outbound-member-face 批：+1 项——`#/me/sandbox`；两在途批序以实施当刻盘面实读为准）**⇒ 实读 104**（2026-10-13 设计轮实核——在途批落地后盘面）**⇒ 净 ±0**（2026-10-13 project-sources-merge 批：−1 项（管理 11 ⇒ **10**——`#/admin/git-sources` 并入项目页两标签）∥ +1 别名行——别名目标再走子段裁分（`sub` 回传）系现成解析序，零额外改；以实施实读为准）⇒ ≈**106**（member-face-chat 批：+1 项——`#/me/chat`（我的组首位））⇒ **实读 107**（server-mcp 批：+1 项——`#/admin/mcp`；实施收正） | IA 单源（§2 ∥ §2.1） |
| `thincoder-server/public/views-auth.mjs` | ⇒ `webui/ME.md` §3（as-of 2026-10-11） | —— |
| `thincoder-server/public/views-me.mjs` | ⇒ `webui/ME.md` §3（as-of 2026-10-13——+≈60：账户页「Git 凭据」卡——member-face-chat 批裁定修订轮） | —— |
| `thincoder-server/public/views-admin.mjs` | ⇒ `webui/ADMIN.md` §3（as-of 2026-10-11） | —— |
| `thincoder-server/public/views-providers.mjs` | ⇒ `webui/ADMIN.md` §3（as-of 2026-10-11） | —— |
| `thincoder-server/public/views-providers-modals.mjs` | ⇒ `webui/ADMIN.md` §3（as-of 2026-10-11） | —— |
| `thincoder-server/public/views-system.mjs` | ⇒ `webui/SYSTEM.md` §3（as-of 2026-10-11） | —— |
| `thincoder-server/public/views-system-config.mjs` | ⇒ `webui/SYSTEM.md` §3（as-of 2026-10-11） | —— |
| `thincoder-server/public/views-proxy.mjs`（迁移期引文——已退役删档） | ⇒ `webui/SYSTEM.md` §3（as-of 2026-10-11） | —— |
| `thincoder-server/public/views-usage.mjs` | ⇒ `webui/READINGS.md` §3（as-of 2026-10-11） | —— |
| `thincoder-server/public/views-overview.mjs` | ⇒ `webui/READINGS.md` §3（as-of 2026-10-11） | —— |
| `thincoder-server/public/views-chat.mjs` | ⇒ `webui/CHAT.md` §3（as-of 2026-10-11） | —— |
| `thincoder-server/public/views-chat-composer.mjs`（chat-shell-align 批新建） | ⇒ `webui/CHAT.md` §3（as-of 2026-10-11） | —— |
| `thincoder-server/public/views-chat-messages.mjs`（已落——console-chat-live-step 批） | ⇒ `webui/CHAT.md` §3（面小计本批行） | —— |
| `thincoder-server/public/views-audit.mjs` | ⇒ `webui/READINGS.md` §3（as-of 2026-10-11） | —— |
| `thincoder-server/public/views-models.mjs` | ⇒ `webui/ADMIN.md` §3（as-of 2026-10-11） | —— |
| `thincoder-server/public/model-specs-snapshot.mjs` | ⇒ `webui/ADMIN.md` §3（as-of 2026-10-11） | —— |
| `thincoder-server/public/views-sandbox.mjs` | ⇒ `webui/SANDBOX.md` §3（as-of 2026-10-11） | —— |
| `thincoder-server/public/views-sandbox-containers.mjs` | ⇒ `webui/SANDBOX.md` §3（as-of 2026-10-11） | —— |
| `thincoder-server/public/views-sandbox-images.mjs` | ⇒ `webui/SANDBOX.md` §3（as-of 2026-10-11） | —— |
| `thincoder-server/public/views-sandbox-image-sources.mjs` | ⇒ `webui/SANDBOX.md` §3（as-of 2026-10-11） | —— |
| `thincoder-server/public/views-sandbox-volumes.mjs`（已落——sandbox-volumes 批） | ⇒ `webui/SANDBOX.md` §3（as-of 2026-10-11） | —— |
| `thincoder-server/public/views-sandbox-base.mjs`（拟新增——本增补（sandbox-exec-rebuild 批 · 修订轮——底座可换）） | ⇒ `webui/SANDBOX.md` §3（as-of 2026-10-13） | —— |
| `thincoder-server/public/views-sandbox-connection.mjs`（拟新增——本增补 #2（sandbox-exec-rebuild 批 · 连接面 TLS 档）） | ⇒ `webui/SANDBOX.md` §3（as-of 2026-10-13） | —— |
| `thincoder-server/public/views-me-sandbox.mjs`（拟新增——**本批新建**（sandbox-outbound-member-face 批）） | ⇒ `webui/SANDBOX.md` §3（as-of 2026-10-11） | —— |
| `thincoder-server/public/modal.mjs` | ⇒ `webui/ADMIN.md` §3（as-of 2026-10-11） | —— |
| `thincoder-server/public/tabs.mjs`（已落——console-tabs-component 批） | ⇒ `webui/TABS.md` §3（as-of 2026-10-11） | —— |
| `thincoder-server/public/terminal-core.mjs`（拟新增——本批（sandbox-container-terminal）） | ⇒ `webui/TERMINAL.md` §3（as-of 2026-10-13） | —— |
| `thincoder-server/public/terminal-render.mjs`（拟新增——本批（sandbox-container-terminal）） | ⇒ `webui/TERMINAL.md` §3（as-of 2026-10-13） | —— |
| `thincoder-server/public/terminal-link.mjs`（拟新增——本批（sandbox-container-terminal）） | ⇒ `webui/TERMINAL.md` §3（as-of 2026-10-13） | —— |
| `thincoder-server/public/views-sandbox-terminal.mjs`（拟新增——本批（sandbox-container-terminal）） | ⇒ `webui/SANDBOX.md` §3（as-of 2026-10-13） | —— |
| `thincoder-server/public/views.mjs`（迁移期引文——已退役拆档（2026-10-06）——档不在盘（原读数 244 · as-of）） | —— | —— |
| `thincoder-server/public/style.css` | ⇒ `webui/STYLE.md` §3（as-of 2026-10-11） | —— |
| `thincoder-server/public/i18n.mjs` | ⇒ `webui/I18N.md` §3（as-of 2026-10-11） | —— |
| `thincoder-server/public/i18n-zh.mjs` | ⇒ `webui/I18N.md` §3（as-of 2026-10-11） | —— |
| `thincoder-server/public/i18n-zh-shell.mjs`（已落盘） | **≈69**（设计估——键 54 + 段注释 6 + 档头/包裹 ≈9；壳族：`app.*`/`common.*`/`col.*`/`denied.*`/`nav.*`/`lang.*`/`login.*`/`err.*`）**⇒ 实读 73**（2026-10-09——结构轮落地后首读）**⇒ ≈74（2026-10-09 代理页批：+`nav.page.admin.proxy`）⇒ 实读 74（2026-10-09 代理页批落地后：73 ⇒ 74）⇒ 实读 **73**（2026-10-10 代理回迁批：`nav.page.admin.proxy` 退役 −1）⇒ ≈74（沙盒运行面批：+`nav.page.admin.sandbox`；`err.upstream_error` 逐值改——±0）**⇒ ≈**75**（sandbox-outbound-member-face 批：+`nav.page.me.sandbox`；陈链后历批增键未入本行——实施当刻以实读收正）⇒ ≈**76**（member-face-chat 批：+1——`nav.page.me.chat`）⇒ **实读 82**（server-mcp 批 +1——`nav.page.admin.mcp`；陈链后历批增键未入本行——实施当刻实读收正） | 文案表·zh·壳族 |
| `thincoder-server/public/i18n-zh-me.mjs` | ⇒ `webui/ME.md` §3（as-of 2026-10-11） | —— |
| `thincoder-server/public/i18n-zh-admin.mjs` | ⇒ `webui/ADMIN.md` §3（as-of 2026-10-11） | —— |
| `thincoder-server/public/i18n-zh-sandbox.mjs` | ⇒ `webui/SANDBOX.md` §3（as-of 2026-10-11） | —— |
| `thincoder-server/public/i18n-zh-system.mjs` | ⇒ `webui/SYSTEM.md` §3（as-of 2026-10-11） | —— |
| `thincoder-server/public/i18n-zh-core.mjs` | ⇒ `webui/CHAT.md` §3（as-of 2026-10-11） | —— |
| `thincoder-server/public/i18n-en.mjs` | ⇒ `webui/I18N.md` §3（as-of 2026-10-11） | —— |
| `thincoder-server/public/i18n-en-shell.mjs`（已落盘） | **≈68**（键 54 + 注释 5 + ≈9）**⇒ 实读 71**（2026-10-09——结构轮落地后首读）**⇒ ≈72（2026-10-09 代理页批：+`nav.page.admin.proxy`）⇒ 实读 72（2026-10-09 代理页批落地后：71 ⇒ 72）⇒ 实读 **71**（2026-10-10 代理回迁批：−1）⇒ ≈72（沙盒运行面批：+`nav.page.admin.sandbox`；`err.upstream_error` 逐值改——±0）**⇒ ≈**73**（sandbox-outbound-member-face 批：+`nav.page.me.sandbox`；陈链后历批增键未入本行——实施当刻以实读收正）⇒ ≈**74**（member-face-chat 批：+1——`nav.page.me.chat`）⇒ **实读 80**（server-mcp 批 +1——同键；实施收正） | 文案表·en·壳族 |
| `thincoder-server/public/i18n-en-me.mjs` | ⇒ `webui/ME.md` §3（as-of 2026-10-11） | —— |
| `thincoder-server/public/i18n-en-admin.mjs` | ⇒ `webui/ADMIN.md` §3（as-of 2026-10-11） | —— |
| `thincoder-server/public/i18n-en-sandbox.mjs` | ⇒ `webui/SANDBOX.md` §3（as-of 2026-10-11） | —— |
| `thincoder-server/public/i18n-en-system.mjs` | ⇒ `webui/SYSTEM.md` §3（as-of 2026-10-11） | —— |
| `thincoder-server/public/i18n-en-core.mjs` | ⇒ `webui/CHAT.md` §3（as-of 2026-10-11） | —— |
| `thincoder-server/public/views-projects.mjs`（已落——team-projects-permissions 批） | ⇒ `webui/PROJECTS.md` §3（as-of 2026-10-12） | —— |
| `thincoder-server/public/views-admin-projects.mjs`（已落——team-projects-permissions 批） | ⇒ `webui/PROJECTS.md` §3（as-of 2026-10-12） | —— |
| `thincoder-server/public/views-git-sources.mjs`（已落——team-projects-permissions 批） | ⇒ `webui/PROJECTS.md` §3（as-of 2026-10-12）；2026-10-13 project-sources-merge 批：**转面板件**（页题 h2 撤 ∥ 导出名不变）——`webui/PROJECTS.md` §2.4 | —— |
| `thincoder-server/public/i18n-zh-project.mjs`（已落——team-projects-permissions 批） | ⇒ `webui/PROJECTS.md` §3（as-of 2026-10-12） | —— |
| `thincoder-server/public/i18n-en-project.mjs`（已落——team-projects-permissions 批） | ⇒ `webui/PROJECTS.md` §3（as-of 2026-10-12） | —— |
| `thincoder-server/public/views-mcp.mjs`（已落——server-mcp 批；实读 **248**） | ⇒ `webui/MCP.md` §3（as-of 2026-10-13） | —— |
| `thincoder-server/public/i18n-zh-mcp.mjs`（已落——server-mcp 批；实读 **55**） | ⇒ `webui/MCP.md` §3（as-of 2026-10-13） | —— |
| `thincoder-server/public/i18n-en-mcp.mjs`（已落——server-mcp 批；实读 **55**） | ⇒ `webui/MCP.md` §3（as-of 2026-10-13） | —— |
| **小计** | **≈680 ⇒ 558 ⇒ 943**（#962 实读）**⇒ 1006**（#963 实读：+63 = views-system +44 ∥ app +10 ∥ nav +1 ∥ style +8）**⇒ 1545**（i18n 实读：+539 = i18n 三档 +505 = 113 + 198 + 194 ∥ app +21 ∥ views-auth +2 ∥ views-me +1 ∥ views-admin +2 ∥ views-providers +1 ∥ views-system +1 ∥ style +6；nav ±0）**⇒ ≈2247**（二轮估：+≈702 = 新三档 ≈370 ∥ app +35 ∥ nav +12 ∥ views-me +35 ∥ views-admin −49 ∥ views-system +90 ∥ style +35 ∥ i18n 两表 +174）**⇒ ≈2646**（弹窗批估：+≈399 = modal 新 ≈110 ∥ views-models 新 ≈110 ∥ views-admin +≈110 ∥ style +≈30 ∥ i18n 两表 +≈34 ∥ nav +≈3 ∥ app +≈2）**⇒ ≈2840**（provider 重做批估：+≈195 = 弹窗体新 ≈260 ∥ 页面 214 ⇒ ≈110 ∥ style +≈25 ∥ i18n 两表 ≈−2（净 ≈−1/表）；app/nav ±0）**⇒ ≈3154**（服务模型配置面批估：+≈314 = views-models **77 ⇒ ≈235** ∥ model-specs-snapshot 新 ≈80 ∥ style +≈26 ∥ i18n 两表 +≈50；modal/app/nav ±0）**⇒ ≈3180**（样式族批估：style +≈26 ∥ 余档 ±0——类串微改行数零变；单元测试档另计）**⇒ 3000（实读 2026-10-07——全表实读和 = public 19 档 2922 + `static.mjs` 78）⇒ ≈3112（布局批估 +≈112）⇒ ≈3233（配额分模型批估 +≈121 = views-admin +≈70 ∥ views-models +≈19 ∥ views-me +≈4 ∥ app +≈3 ∥ i18n 两表 +≈20 ∥ style +≈5；modal/nav/快照等零动）⇒ 实读 3170（本设计轮——public 19 档 3092 + `static.mjs` 78；配额批落地后）⇒ ≈3245（配额 v2 批 +≈75 = views-admin +≈50 ∥ views-models +≈9 ∥ views-audit −1 ∥ i18n-zh ±0 ∥ i18n-en +7 ∥ i18n.mjs +≈10；app/modal/style 零动）⇒ **实读 3269（2026-10-07——配额 v2 批落地后；public 19 档 3191 + `static.mjs` 78；+99——越估 ≈24）**⇒ ≈3290**（模型元数据批 +≈45 = 视图件 +≈35 ∥ i18n 两表 +5/+5；以 v2 落定实读为基）**⇒ 实读 3345（2026-10-07——模型元数据批落地后；Δ+76 = views-providers-modals +65 ∥ i18n 两表 +5/+6）⇒ 实读 3350（2026-10-07——列式收正批落地后；public 19 档 3272 + `static.mjs` 78；上链 3345 复算 = 3344——差 1 在案）**⇒ ≈3505（me-keys 批 +≈155 = views-me +85 ∥ app +25 ∥ views-system +6 ∥ i18n 两表 +44 ∥ style −5；零新档——档目 19 ∥ 20 不变）⇒ ≈3626（me 用量图表化批 +≈121 = views-me +≈85 ∥ style +≈22 ∥ i18n 两表 +≈14 ∥ views-overview ±0；零新档——档目 19 ∥ 20 不变）⇒ 实读 3619（2026-10-07——本批落地后；public 19 档 3541 + `static.mjs` 78；对链上 ≈3626 差 7——me-keys ∥ 本批实读累计估差收口）**⇒ ≈3696（2026-10-08 结构轮：i18n 表族拆表 +≈53（zh +26 ∥ en +27——八部件档头物化） ∥ `app.mjs` 三拆 +≈24（350 ⇒ ≈192 + ≈120 + ≈62）——实读回填）**⇒ ≈3705（2026-10-09 控制台测试 key 修复批：`views-providers-modals.mjs` +9；余档 ±0）⇒ ≈3728（2026-10-09 代理批：`views-providers-modals` +≈19 ∥ i18n 两表 +≈2/表；余档 ±0）⇒ ≈3978（2026-10-09 配置控制台批：+≈250 = `views-system-config.mjs` 新 ≈130 ∥ `views-system.mjs` +≈55 ∥ i18n 两表 +≈58 ∥ `views-audit.mjs` +≈3 ∥ `style.css` +≈4；零退役——档目 29 ∥ 30 ⇒ **30 ∥ 31**）⇒ ≈3987（2026-10-09 embed 解耦批：+≈9 = `views-system` +≈15 ∥ `views-models` −≈8 ∥ i18n system 部件 +2/表 ∥ admin 部件 −1/表；零新档——档目 30 ∥ 31 不变）⇒ 实读增量 **+217**（2026-10-09 配置控制台批落地后——逐档实读见上表）⇒ ≈4036（2026-10-09 alias 批：+≈49 = `views-models` +≈31 ∥ `views-providers-modals` +≈10 ∥ i18n 两表 +4/表；零新档——档目 30 ∥ 31 不变）⇒ ≈4171（2026-10-09 代理页批：+≈135 = `views-proxy.mjs` 新 ≈110 ∥ `views-system-config.mjs` −≈10 ∥ `nav.mjs` +1 ∥ `app.mjs` +2 ∥ i18n system 两部件 +15/表 ∥ shell 两部件 +1/表；`style.css` ±0——档目 30 ∥ 31 ⇒ **31 ∥ 32**）⇒ 实读增量 **+4**（2026-10-09 走查收正笔：`style.css` 229 ⇒ 233——逐档实读见上表）⇒ 实读增量 **+155**（2026-10-09 代理页批落地后：`views-proxy.mjs` **119** 新 ∥ `views-system-config.mjs` **−3** ∥ `nav.mjs` **+1** ∥ `app.mjs` **+2** ∥ i18n system 两部件 **+17/表** ∥ shell 两部件 **+1/表**；`style.css` ±0——逐档实读见上表）⇒ 实读增量 **−65**（2026-10-10 代理回迁批落地后：`views-proxy.mjs` **−119**（删档） ∥ `views-system-config.mjs` **+63** ∥ `nav.mjs` **−1** ∥ `app.mjs` **−2** ∥ i18n system 两部件 **−2/表** ∥ shell 两部件 **−1/表**；`i18n-{zh,en}-admin` ±0（`useProxy` 逐值改）——逐档实读见上表）⇒ ≈+275（沙盒运行面批（runner-admin-console）：`views-sandbox.mjs` 新 ≈210 ∥ `nav.mjs` +1 ∥ `app.mjs` +3 ∥ i18n admin 两部件 +≈26/表 ∥ shell 两部件 +1/表 ∥ `style.css` +≈7；档目 30 ∥ 31 ⇒ **31 ∥ 32**）⇒ ≈+141（托管接入增补：`views-sandbox.mjs` +≈75 ∥ i18n admin 两部件 +≈30/表 ∥ `style.css` +≈6；档目 31 ∥ 32 不变）⇒ ≈+558（沙盒余面批：`views-sandbox-egress.mjs` 新 ≈240 ∥ `views-me-sandbox.mjs` 新 ≈120 ∥ `nav.mjs` +1 ∥ `app.mjs` +2 ∥ i18n admin 两部件 +≈34/表 ∥ i18n me 两部件 +≈14/表 ∥ i18n system 两部件 +≈4/表 ∥ `views-audit` +≈8 ∥ `style.css` +≈5；档目 ⇒ **36 ∥ 37**——承 sandbox-docker-admin 批后 **34 ∥ 35**（admin-agent-chat 批后 **32 ∥ 33**））⇒ ≈+449（sandbox-docker-admin 批：`views-sandbox-containers.mjs` 新 ≈300 ∥ `views-sandbox-images.mjs` 新 ≈140 ∥ `views-sandbox.mjs` −≈139（外拆）∥ `modal.mjs` +≈38 ∥ i18n admin 两部件 +≈50/表 ∥ `style.css` +≈10；档目 **34 ∥ 35**——承 admin-agent-chat 批后 **32 ∥ 33**）⇒（i18n 拆分定义（#1270）：`i18n-{zh,en}-sandbox.mjs` 拟新增 +2 档——沙盒族 135 键外拆；admin 两部件实读 **316 ∥ 320** ⇒ 拆后 ≈**175 ∥ ≈179** ∥ 新两档 ≈**148 ∥ 148**；执行 = 实施轮）⇒ 沙盒拆分已执行（2026-10-11 现读：admin **174 ∥ 178** ∥ sandbox **147 ∥ 147**）⇒ ≈+322（sandbox-image-sources 批：`views-sandbox-image-sources.mjs` 新 ≈230 ∥ `views-sandbox-images.mjs` +≈20 ∥ `views-sandbox.mjs` +≈8 ∥ i18n sandbox 两部件 +≈30/表 ∥ `style.css` +≈4；档目 **36 ∥ 37** ⇒ **37 ∥ 38**（+ 件一档——承 i18n 拆分（#1270）后））⇒ **实读增量 +369**（sandbox-image-sources 落地后——逐档实读见上表；对链上 ≈+322 越 47）⇒ ≈+86（本批（sandbox-image-quick-pull）：`views-sandbox-image-sources.mjs` +≈70 ∥ `views-sandbox-images.mjs` +≈6 ∥ `views-sandbox.mjs` +≈2 ∥ i18n sandbox 两部件 +3/表 ∥ `style.css` +≈2；零新档——档目 **37 ∥ 38** 不变）⇒ **实读增量 +101**（sandbox-image-quick-pull 落地后——同口径净增和；对链上 ≈+86 越 15；逐档实读见上表）⇒ ≈+53（本批（sandbox-pull-by-source）：`views-sandbox-images.mjs` +≈45 ∥ `views-sandbox-image-sources.mjs` +≈2 ∥ i18n sandbox 两部件 +3/表；`style.css` ±0；零新档——档目 **37 ∥ 38** 不变；复算——分项和 45 + 2 + 3×2）⇒ ≈+154（console-chat-align 批：`views-chat.mjs` **399 ⇒ ≈430** ∥ `static.mjs` **78 ⇒ ≈110**（第二根） ∥ `style.css` **267 ⇒ ≈310**（核类名族样式：码面/`pre.code-block`/`.tk-*`/工具卡族——零新变量 ∥ 零新悬停规则） ∥ i18n core 两新档 ≈24/档 ∥ `package.json` 增 `file:` 声明 ±1；档目 **37 ∥ 38** ⇒ **39 ∥ 40**）⇒ **实读增量 +116**（console-chat-align 落地后——同口径净增和；对链上 ≈+154 差 −38；逐档实读见上表）⇒ ≈**+447**（chat-shell-align 批（本批）：`views-chat.mjs` **421 ⇒ ≈330** ∥ `views-chat-composer.mjs` 新 ≈300 ∥ 两 i18n core **14 ⇒ ≈62**/档 ∥ `style.css` **296 ⇒ ≈420**（别名块 + 消息族 + 状态行族 + 会话条/输入区 sticky + 六钮隐藏） ∥ i18n admin 两部件 +9/表；档目 **41 ∥ 42** ⇒ **42 ∥ 43**）⇒ ≈+965（team-projects-permissions 批：`views-projects.mjs` 新 ≈220 ∥ `views-admin-projects.mjs` 新 ≈120 ∥ `views-git-sources.mjs` 新 ≈300 ∥ i18n project 两新档 ≈140/档 ∥ `nav.mjs` +≈4 ∥ `app.mjs` +≈7 ∥ `views-audit.mjs` +≈12 ∥ `i18n.mjs` +≈4 ∥ `style.css` +≈18；档目 **42 ∥ 43** ⇒ **47 ∥ 48**——修订轮按行和收正、R63/R64 增量在含）⇒ **≈−161**（sandbox-onboarding-removal 批：`views-sandbox.mjs` −≈95（托管接入块（⑤ 弹窗 ∥ ⑥ 任务区）删） ∥ i18n admin 两部件 −≈30/表 ∥ `style.css` −≈6——**分项和复算**；**删量两说未取齐（本行 ≈95 ∥ `webui/SANDBOX.md` §3 拆案块 ≈190）——以实施轮实读一次记平（两档同值）；本轮不预设值**；零新档——档目 **47 ∥ 48** 不变）⇒ **−≈240**（sandbox-egress-removal 批：`views-sandbox-egress.mjs` 件行删——该件从未落盘（沙盒余面批预估 ≈240 入链）；以实施轮实读为准；2026-10-14） | —— |
（2026-10-11 域内拆分：本行 = 域合计——**冻结为历史**；此后各面档自持「面小计」——本域合计 = 各面之和，不单列。）

## 6. 验收判据（机检）

| 需求 | 设计级判据 | 载体 |
|---|---|---|
| 非功能 · 前端自洽 | `public/**` 零外部引用（无 `http(s)://` 外链 ∥ 无 CDN ∥ 无外链字体——扫描断言，扫描面 = 全量新档）；静态直发 mime 正确 ∥ 路径穿越拒；档目断言随正（口径 = UI 代码档 ∥ 含 favicon 全目录——单源 = `webui/WEBUI.md` §1；链不复述；`-webui-deploy` 件） | 单元测试档 |
| AC-11（控制台 provider 面——判据全文 = `gateway/API.md` §5 AC-11 行） | ⇒ `webui/ADMIN.md` §4（as-of 2026-10-11） | —— |
| AC-12（功能点 14——控制台 IA；已落需求档——`docs/server/requirements/PROJECT.md` 验收表） | `nav.mjs` 直测：组/项结构（我的 3 ⇒ **4**（team-projects-permissions 批——`webui/PROJECTS.md` §2.1）⇒ **5**（sandbox-outbound-member-face 批——`webui/SANDBOX.md` §2.2；2026-10-13）⇒ **6**（team-ledger 批——`webui/LEDGER.md` §2.1；2026-10-13——实读）⇒ **7**（member-face-chat 批——`webui/CHAT.md` §2.2；2026-10-13） ∥ 管理 6（二轮批后）⇒ **7**（弹窗批后——§2）⇒ **8**（代理页批——`webui/SYSTEM.md` §2.2）⇒ **7**（代理回迁批——`webui/SYSTEM.md` §2.2 回迁）⇒ **8**（沙盒运行面批——`webui/SANDBOX.md` §2.1①）⇒ **9**（admin-agent-chat 批——`webui/CHAT.md` §2.1）⇒ **11**（2026-10-12 team-projects-permissions 批——项目 ∥ Git 源两页；`webui/PROJECTS.md` §2.2）⇒ **10**（2026-10-13 project-sources-merge 批——Git 源并入项目页两标签；KD-SV-149）⇒ **11**（server-mcp 批——`webui/MCP.md` §2；2026-10-13） ∥ admin 组仅 admin） ∥ 重定向（`#/me` ⇒ `#/me/keys` ∥ `#/admin` ⇒ `#/admin/overview` ∥ `#/admin/proxy` ⇒ `#/admin/system` ∥ `#/admin/git-sources` ⇒ `#/admin/projects/git-sources`（2026-10-13——重定向带子段）） ∥ 角色默认 ∥ admin 面 `denied` ∥ 子段容许（console-tabs-component 批：`#/<组>/<页>/<子段>` 裁末段 + `sub` 回传——`webui/TABS.md` §2.2）；静态档目随正（单源 = `webui/WEBUI.md` §1——链不复述）∥ 管理页拆分（成员/用量/总览/审计/服务模型各一页——单页堆叠消失） | 单元测试档 |
| AC-13③④（功能点 12——版本/更新可见 ∥ 成员接入卡） | ⇒ `webui/SYSTEM.md` §4（as-of 2026-10-11） | —— |
| AC-14（功能点 13——控制台多语言） | ⇒ `webui/I18N.md` §4（as-of 2026-10-11） | —— |
| AC-15（功能点 15——控制台可见面六面；三拆） | ⇒ ① = `webui/SYSTEM.md` §4（as-of 2026-10-11） ∥ ②–⑤ = `webui/READINGS.md` §4（同刻） ∥ ⑥ = `webui/ME.md` §4（同刻） | —— |
| AC-16（功能点 16——控制台弹窗交互） | ⇒ `webui/ADMIN.md` §4（as-of 2026-10-11） | —— |
| AC-17（功能点 17——服务模型页 ∥ 配置面） | ⇒ `webui/ADMIN.md` §4（as-of 2026-10-11） | —— |
| AC-17（续·机检口径） | ⇒ `webui/ADMIN.md` §4（as-of 2026-10-11） | —— |
| AC-18（功能点 18——Provider 管理面重做） | ⇒ `webui/ADMIN.md` §4（as-of 2026-10-11） | —— |
| AC-19（功能点 19——样式族总体统一） | ⇒ `webui/STYLE.md` §4（as-of 2026-10-11） | —— |
| AC-19（续·机检口径） | ⇒ `webui/STYLE.md` §4（as-of 2026-10-11） | —— |
| AC-20（功能点 20——控制台布局收正） | ⇒ `webui/STYLE.md` §4（as-of 2026-10-11） | —— |
| AC-20（续·机检口径） | ⇒ `webui/STYLE.md` §4（as-of 2026-10-11） | —— |
| AC-21（功能点 21——配额配置面） | ⇒ `webui/ADMIN.md` §4（as-of 2026-10-11） | —— |
| AC-23（功能点 23——成员模型面 v2） | ⇒ `webui/ADMIN.md` §4（as-of 2026-10-11） | —— |
| AC-23（续·机检口径） | ⇒ `webui/ADMIN.md` §4（as-of 2026-10-11） | —— |
| AC-24（功能点 24——上游模型元数据留存与展示） | ⇒ `webui/ADMIN.md` §4（as-of 2026-10-11） | —— |
| AC-24（续·机检口径） | ⇒ `webui/ADMIN.md` §4（as-of 2026-10-11） | —— |
| AC-25（功能点 25——「我的·key 与签发」页重做） | ⇒ `webui/ME.md` §4（as-of 2026-10-11） | —— |
| AC-25（续·机检口径） | ⇒ `webui/ME.md` §4（as-of 2026-10-11） | —— |
| AC-26（功能点 26——「我的·用量」页图表化） | ⇒ `webui/ME.md` §4（as-of 2026-10-11） | —— |
| AC-26（续·机检口径） | ⇒ `webui/ME.md` §4（as-of 2026-10-11） | —— |
| AC-28（功能点 28——server 配置控制台） | ⇒ `webui/SYSTEM.md` §4（as-of 2026-10-11） | —— |
| AC-28（续·机检口径） | ⇒ `webui/SYSTEM.md` §4（as-of 2026-10-11） | —— |
| AC-29①（功能点 29——配置形：控制台编辑面） | ⇒ `webui/ADMIN.md` §4（as-of 2026-10-11） | —— |
| AC-30（功能点 30——代理设置与连通测试） | ⇒ `webui/SYSTEM.md` §4（as-of 2026-10-11） | —— |
| AC-30（续·机检口径） | ⇒ `webui/SYSTEM.md` §4（as-of 2026-10-11） | —— |
| 镜像源族（sandbox-image-sources 批——AC-38） | ⇒ `webui/SANDBOX.md` §4（as-of 2026-10-11） | —— |
| 一键拉取（sandbox-image-quick-pull 批——AC-38 ④） | ⇒ `webui/SANDBOX.md` §4（as-of 2026-10-11） | —— |
| 拉取认源（sandbox-pull-by-source 批——AC-38 ⑤） | ⇒ `webui/SANDBOX.md` §4（as-of 2026-10-11） | —— |
| 沙盒页（server-exec-sandbox 批——AC-36） | ⇒ `webui/SANDBOX.md` §4（as-of 2026-10-11） | —— |
| 管理面 agent 会话页（admin-agent-chat 批） | ⇒ `webui/CHAT.md` §4（as-of 2026-10-11） | —— |
| 成员面（我的·工作区——AC-36 ⑧） | ⇒ `webui/SANDBOX.md` §4（as-of 2026-10-11） | —— |
| 管理面 chat 对齐（console-chat-align 批——KD-SV-101） | ⇒ `webui/CHAT.md` §4（as-of 2026-10-11） | —— |
| 对话页壳面对齐（chat-shell-align 批——功能点 41 ∥ AC-41 ∥ KD-SV-106/107/108/109） | ⇒ `webui/CHAT.md` §4（as-of 2026-10-11） | —— |
| 控制台公共标签页组件（console-tabs-component 批——功能点 39 ∥ AC-39） | ⇒ `webui/TABS.md` §4（as-of 2026-10-11） | —— |
| 卷族（sandbox-volumes 批——AC-40） | ⇒ `webui/SANDBOX.md` §4（as-of 2026-10-11） | —— |
| AC-44（功能点 44——团队项目与权限；控制台面） | ⇒ `webui/PROJECTS.md` §4（as-of 2026-10-12） | —— |
| AC-48（功能点 48——项目面单入口 + 基址门；控制台面） | ⇒ `webui/PROJECTS.md` §4 ∥ `webui/STYLE.md` §4（as-of 2026-10-13） | —— |
| 成员面对话页（member-face-chat 批——功能点 50 ∥ AC-50①；2026-10-13） | ⇒ `webui/CHAT.md` §4（as-of 2026-10-13） | —— |

## 7. 关键决策（本域）

| # | 决策 | 理由 | 被否候选与何故否 |
|---|---|---|---|
| KD-SV-9 | **控制台前端 = vanilla 静态面**（`public/` 静态档组——`node:http` 直发）；零框架 ∥ 零构建 ∥ 零外部资源；哈希路由（IA = §2 ∥ KD-SV-20）；判权全在后端 | 用户 08:09 钉死（先例 = 本仓 webview vanilla 口径）；静态档零依赖贴合内网自洽；视图交互维护性 | 单文件内嵌 HTML（视图/表单增长后难维护）· 前端框架（违零依赖/零构建）· CDN ∥ 外链字体（内网不达）· 构建步骤（bundler——违零构建） |
| KD-SV-20 | **控制台 IA = 侧栏分组导航 + 一页一职责**：组 = 我的（key/用量/账户设置/**项目**/**工作区**/**团队台账**）∥ 管理（总览/**对话**/成员/**项目**（两标签：项目 ∥ Git 源——KD-SV-149）/**Provider**/服务模型/用量统计/审计/系统/**沙盒**）；hash 路由 `#/<组>/<页>`；旧链重定向；解析 = `nav.mjs` 纯函数；窄屏降级顶条 | 用户 16:13 令（单页堆叠被判不专业）；侧栏 = 分组扩展面（系统/文案/后续协同面挂点）；纯函数解析 = 机检可达；零框架零构建不变（KD-SV-9） | 顶栏分区（横向空间有限——中英文案翻倍更挤 ∥ 分组层级浅）· 不重排（被用户否）· 框架路由（违 KD-SV-9）· 服务端路径路由（静态直发面破——hash 保刷新/书签） |
| KD-SV-26 ∥ KD-SV-44 ∥ KD-SV-51 | ⇒ `webui/I18N.md` §1（as-of 2026-10-11） | —— | —— |
| KD-SV-29 | ⇒ `webui/READINGS.md` §1（as-of 2026-10-11） | —— | —— |
| KD-SV-31 ∥ KD-SV-32 ∥ KD-SV-33 ∥ KD-SV-34 ∥ KD-SV-41 ∥ KD-SV-43 ∥ KD-SV-45 ∥ KD-SV-46 | ⇒ `webui/ADMIN.md` §1（as-of 2026-10-11） | —— | —— |
| KD-SV-36 ∥ KD-SV-37 | ⇒ `webui/STYLE.md` §1（as-of 2026-10-11） | —— | —— |
| KD-SV-47 ∥ KD-SV-49 | ⇒ `webui/ME.md` §1（as-of 2026-10-11） | —— | —— |
| KD-SV-52 | **`app.mjs` 拆三档**（结构轮——#993 断点落地）：渲染助手 + `flash` ⇒ `dom.mjs` ∥ 健康轮询 ⇒ `health.mjs`（+ 订阅清零口）∥ `app.mjs` 收窄为入口 | 实读 350 越 300 软线且随批续增；注册预案（健康块单独拆）按当刻实估不回线内（`350−50+1 ≈ 301`——`50` = 删除行数；新档 `≈62` = 删除 50 + 档头/导入 ≈12——§5 同源）；本批随正面已含全部目录断言（边际改点 ≈ 零）；逐字搬移 + 门禁/走查双验 | 不拆（越线续存——裁点 = 用户批准面；代价 = 续增 + 下次触碰重估）· 仅拆健康块（删除 ≈50 行 ⇒ ≈301——不回线内）· 再拆 api/会话块（更碎——随动面增；余量已足） |
| KD-SV-54 | ⇒ `webui/ADMIN.md` §1（as-of 2026-10-11） | —— | —— |
| KD-SV-60 | ⇒ `webui/SYSTEM.md` §1（as-of 2026-10-11） | —— | —— |
| KD-SV-101 | ⇒ `webui/CHAT.md` §1（as-of 2026-10-11） | —— | —— |
| KD-SV-102 ∥ KD-SV-103 | ⇒ `webui/TABS.md` §1（as-of 2026-10-11） | —— | —— |
| KD-SV-106（页面侧；107/108/109 = agent 域——`agent/ADMIN-AGENT.md` §9） | ⇒ `webui/CHAT.md` §1（as-of 2026-10-11） | —— |
| KD-SV-124 | ⇒ `webui/PROJECTS.md` §1（as-of 2026-10-12） | —— | —— |
| KD-SV-181 ∥ KD-SV-182 ∥ KD-SV-183 | ⇒ `webui/TERMINAL.md` §1（as-of 2026-10-13——终端核三件/可复用边界 ∥ 渲染与调色板 ∥ 能力表 v1；sandbox-container-terminal 批） | —— | —— |

## 8. 本域边界（不做的面）

- 独立客户端管理台（不做——需求 §4；管理面 = 内嵌网页）∥ 前端框架 ∥ 构建步骤 ∥ CDN/外部资源 ∥ 移动端适配（桌面优先——窄屏不做承诺）。（成员面接入卡 ∥ 文档面多语言 ∥ 服务端消息/日志语言 ∥ 第三语言 ⇒ 见 `webui/ME.md` §5 ∥ `webui/I18N.md` §5（as-of 2026-10-11）。）
- 二轮不做面 ⇒ 见 `webui/READINGS.md` §5（as-of 2026-10-11）。
- 弹窗批不做面 ⇒ 见 `webui/ADMIN.md` §5（as-of 2026-10-11）。
- Provider 重做批不做面 ⇒ 见 `webui/ADMIN.md` §5（as-of 2026-10-11）。
- 服务模型配置面批不做面 ⇒ 见 `webui/ADMIN.md` §5（as-of 2026-10-11）。
- embed 解耦批不做面（2026-10-09；台账 #1147 ∥ #1148） ⇒ 见 `webui/SYSTEM.md` §5（as-of 2026-10-11）。
- server-model-alias 批不做面（2026-10-09——KD-SV-59） ⇒ 见 `webui/ADMIN.md` §5（as-of 2026-10-11）。
- 样式族批不做面 ⇒ 见 `webui/STYLE.md` §5（as-of 2026-10-11）。
- 布局收正批不做面 ⇒ 见 `webui/STYLE.md` §5（as-of 2026-10-11）。
- 配额分模型批不做面 ⇒ 见 `webui/ADMIN.md` §5（as-of 2026-10-11）。
- 配额 v2 · 成员模型面批不做面 ⇒ 见 `webui/ADMIN.md` §5（as-of 2026-10-11）。
- Provider 模型元数据批不做面 ⇒ 见 `webui/ADMIN.md` §5（as-of 2026-10-11）。
- me-keys 批不做面 ⇒ 见 `webui/ME.md` §5（as-of 2026-10-11）。
- me 用量图表化批不做面 ⇒ 见 `webui/ME.md` §5（as-of 2026-10-11）。
- 结构轮批不做面（2026-10-08）：`style.css` ∥ `index.html` 零触 ∥ `thincoder-server/src/**` 零触（服务端语义零改）∥ 批外档零触（域外发现只报——如 `docs/core/design/API-CONTRACT.md` 坐标）∥ i18n 语义面（键值 ∥ 回退链 ∥ 复数取形）零改 ∥ 门面外消费面（`i18n.mjs` ∥ 视图件 `t()` 面）零改。
- 视图取件面核实（2026-10-08 grep 实读）：`views-*` 十档零 `app.mjs` import——渲染助手/`t`/`flash` 等全经 `ctx` 注入（`viewCtx()` 单点装配）；i18n 表族 = `i18n.mjs` 单点取件 ⇒ `dom.mjs`/`health.mjs` 拆分与门面保留下视图面零触（零触承载面 = `ctx` 注入）。
- 控制台测试 key 修复批不做面（2026-10-09） ⇒ 见 `webui/ADMIN.md` §5（as-of 2026-10-11）。
- server 代理批不做面（2026-10-09） ⇒ 见 `webui/ADMIN.md` §5（as-of 2026-10-11）。
- 配置控制台批不做面（2026-10-09） ⇒ 见 `webui/SYSTEM.md` §5（as-of 2026-10-11）。
- 代理面不做面（2026-10-10 代理回迁批——KD-SV-60） ⇒ 见 `webui/SYSTEM.md` §5（as-of 2026-10-11）。

- 管理面 chat 渲染面不做项（console-chat-align 批——理由逐项 = `webui/CHAT.md` §2.1 对齐集 ⑥⑦⑧⑩⑪） ⇒ 见 `webui/CHAT.md` §5（as-of 2026-10-11）。
- 公共标签页组件批不做面（console-tabs-component 批） ⇒ 见 `webui/TABS.md` §5（as-of 2026-10-11）。
- 团队项目与权限批（team-projects-permissions——B2）不做面 ⇒ 见 `webui/PROJECTS.md` §5（as-of 2026-10-12）。

