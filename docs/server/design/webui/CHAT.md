# Thincoder Server · 管理面对话（webui/CHAT.md）

> 本档迁自 `webui/WEBUI.md` §2.10 及三表归位行（2026-10-11 域内拆分；as-of）。域总览与壳面 = `webui/WEBUI.md`。

## 1. 关键决策（本面）

| # | 决策 | 理由 | 被否候选与何故否 |
|---|---|---|---|
| KD-SV-101 | **管理面 chat 呈现面 = 复用 `thincoder-render-core`**（同源第二根 `/rc/*` 取件 ∥ `file:` 声明 ∥ 镜像显式双装打包径）+ **「新会话面/新呈现面先查可复用资产（先查再造）」纪律句**（console-chat-align 批——台账 #1282；用户 18:23 指出「第四套、且最薄的一套 chat」+ 18:30「改」）：渲染单源 = 核 `md`/`highlight`/`tool-card`/`stream+live-md`/`scroll`；**做/不做 = 本档 §2.1 对齐集**（按运维用途裁——不照搬开发壳全量）；转义 = 核内单源（`webui/WEBUI.md` §3 收窄）；核 = 只读消费（不 fork ∥ 不改名 ∥ 端侧不覆写核件语义） | 用户 18:23 原话（「会话这件事做过无数遍……为什么每次再做都会别出心裁做一套新的」）；资产就绪（`@thincoder/render-core` host-agnostic ∥ VSC+桌面两宿主在用）；「先查再造」= 第五套 chat 的防复发句（仓级「复用优先」同向） | 第四套自持渲染（被用户否——本批修正对象）；拷贝核件入 `public/`（双源漂移——`docs/render-core/design/RENDER-CORE.md` §1.3 被否 1）；打包器/构建（违零构建）；框架/CDN（违零框架 ∥ 零外部资源）；核件发布 registry（`private: true`——永不发布不破）；**维持「不拼 HTML 串」自加句**（与两先例相抵——本批收窄） |

## 2. 机制

### 2.1 管理面对话（`#/admin/chat`——admin-agent-chat 批建档 ∥ console-chat-align 批对齐渲染面；机制全文 = `agent/ADMIN-AGENT.md` §11）

- **定位**：管理面 agent 的对话入口（运维/管理——托管接入 ∥ 机队 ∥ 成员与 provider ∥ 审查排障；**非开发用途**）；控制台第 13 页（管理组第 9 项——置于「总览」之后）；**非壳页**（对话流无上界——`SHELL_PAGES` 五路径不动）。
- **呈现面 = 复用既有会话渲染核**（console-chat-align 批——「先查再造」；台账 #1282）：基准 = `thincoder-render-core/`（`@thincoder/render-core`——自述 host-agnostic，VSC webview ∥ 桌面 renderer 两在用宿主）；**本页不自持第四套渲染实现**——渲染单源 = 核件；控制台自持面 = 壳 ∥ 文案 ∥ 取数 ∥ 布局。
  **核件词面注册 = 装配期 + 每次语言切换重注册**（`setStrings(当前语言核件词面)`——核 `_strings` 为模块级态（`thincoder-render-core/i18n.mjs:12-20`）：不重注册 ⇒ 切换后核件发射仍取旧表）。
- **复用形（取件 ∥ 声明 ∥ 打包，逐处对照两先例）**：
  - **取件 = 同源第二根**：静态面增 **`/rc/*` 供给根**（→ 核包目录；前缀序 `/rc/` 先于 `/` 兜底根；**各根各留逃逸门**——沿现单根判据逐式施加）；
   页面以同源绝对路径 import（`import { md } from "/rc/md.mjs"`）——与桌面 `app://` 双根逐式同形（先例 = `thincoder-desktop/src/main/protocol.mjs:21` 包名解析 + 双根登记）；VSC 相对路径形（`webview/streaming.js:19` `../node_modules/...`）不可用——控制台单 HTTP 根，越根不可达。
  - **node 侧同缝（批内件/门禁取件——平 node 无该 origin）**：**`thincoder-server/test/rc-resolve.mjs` 解析钩子**（`/rc/<子路径>` ⇒ `@thincoder/render-core` 包根——包名解析单源 = `package.json`；沿桌面 `thincoder-desktop/test/rc-resolve.mjs` 先例：`createRequire` 包名解析 + `registerHooks`）；
    **预载入口 = `thincoder-server/package.json` `prepublishOnly` 链行**（`node --import ./thincoder-server/test/rc-resolve.mjs --test docs/batches/…`——单行内改，件数不变）；批内件与既有件运行同式（自仓根 `thincoder/`）：`node --import ./thincoder-server/test/rc-resolve.mjs --test docs/batches/<件>`。
   缝件非用例档（不入链 ∥ 不入 `files` 白名单——不打包）；**既有件随正 = `docs/batches/2026-10-11-admin-agent-chat-ui.test.mjs`**（链内——`load()` 页面档 ⇒ 缝承零改；其静态面腿上量随正 = 档目 `[38, 37]` ⇒ **[40, 39]** ∥ 类名/键闭两腿按核件消费实读收正——实施轮同拍）。
  - **包声明 = `file:` link**：`thincoder-server/package.json` 增 `"@thincoder/render-core": "file:../thincoder-render-core"`（与 VSC/桌面两处声明同式）；仓内开发面 = `npm install` 落 node_modules 链接（两先例现盘同形）。
  - **打包/部署径（镜像 = ECS 部署形）**：核包不入 registry（`private: true`——永不发布），且 **file: 声明在 tarball 安装径下不落地**（设计轮实测：tarball 装的 `file:` 依赖被静默跳过；目录装 = 只链本体不装依赖）
    ⇒ 镜像侧**显式双装**——构建上下文改仓根 + 一次装两包（`npm i -g ./thincoder-server-*.tgz ./thincoder-render-core-*.tgz`——同前缀扁平装 ⇒ 包名解析可达）；`thincoder-server/Dockerfile` 随正（双包 COPY/pack——**实读 39 ⇒ 实读 41**（2026-10-11——实施落盘；+2）；受影响档在册）；
   部署随正（父侧笔面——批档 §2 上抛在册）= `docs/TEST-ENV-ECS.md` §3 一行（build 上下文 ⇒ 仓根） ∥ `thincoder-server/README.md` 两处构建上下文行（`:16`/`:93`——上下文迁仓根后失真） ∥ **仓根 `.dockerignore`（新建——上下文迁仓根后 `thincoder-server/.dockerignore` 不再生效；清单按仓根重定）** ∥ `ops/OPS.md` §5.1（构建上下文句 ⇒ 仓根 ∥ 门禁链 42 ⇒ 52——沿批漂移同拍）。
   **npm 装机径**（`npm i -g @thincoder/server`——README §1/§3 两路之一）：核包投递 = **随发布面轮**（核包 `private` 不入 registry——npm 径落法发布面轮定）；**装机判据 = 缺包 fail-loud**（下条——装机后 `/rc/*` 无根不再静默白屏）。
   **缺包处置**（沿桌面 `thincoder-desktop/src/main/protocol.mjs:20` fail-loud 先例）：静态面根解析（`static.mjs` 装载期——包名解析与桌面 `CORE_ROOT` 同法）缺 `@thincoder/render-core` ⇒ **启动 fail-loud**（显式报错拒起）；运行期 `/rc/*` 无档 ⇒ 404（不吞）。与 `design/PROJECT.md` §9 R58② 同拍。
  - **转义/CSP 逐处对照**（VSC ∥ 桌面 ∥ 控制台本批）：

    | 面 | VSC webview | 桌面 renderer | 控制台（本批） |
    |---|---|---|---|
    | HTML 注入形 | `innerHTML = md(raw)`（`webview/streaming.js:143`） | 描述符树 `props.html` 单点（`thincoder-desktop/renderer/dom.mjs:12-14`） | `innerHTML` = 核 `md()` 输出（页面唯一注入点 = 助手/用户/工具文本面） |
    | 转义责任 | 核 `md()`（输入先全量转义——`md.mjs` 档头 SECURITY 口径） | 同核 | 同核（控制台**零手拼 HTML 串**；非文本面续走 `h`/`textContent`） |
    | CSP | 占位符由扩展填（含 `'unsafe-inline'`） | `default-src 'self'`（零 `unsafe-inline`） | 现零 CSP 头（不改）；如后加 ⇒ `default-src 'self'` 即足（**控制台自有档**零内联样式/脚本；核件含内联状态色——CSSOM（`thincoder-render-core/flow/tool-card.mjs:111`/`:114`）∥ 回读径 `style=` 属性（`:162` ∥ `thincoder-render-core/flow/tool-card-restore.mjs:44`）⇒ 后加 CSP 而无 `style` 内联豁免则回读卡状态色落空——桌面 `style-src 'self'` 同态：`thincoder-desktop/renderer/index.html:7`） |

- **对齐集（逐项「做/不做 ＋ 理由」——按运维用途裁，不照搬开发壳全量）**：
  - **做**：① **markdown**＝核 `md.mjs`（助手 ∥ 用户气泡同径——KD-RC-4 口径）；② **代码块高亮**＝随 `md()`（核 `highlight.mjs`）；③ **工具卡**＝核 `flow/tool-card.mjs`（流式 = `renderToolCard` + `finishToolCard`；回读 = `renderToolHistory`；失败判定 = 核 `isToolFailure`）；
   ④ **流式拼接手感**＝核 `flow/stream.mjs` `createStreamRenderer` + `flow/live-md.mjs`（增量重绘——禁每帧全量重渲；节拍 = 核帧纪律 KD-RC-9/10）；
    ⑤ **滚动行为**＝核 `scroll.mjs`（近底 24px 判据单源；**用户上滚不夺阅读位**——`applyPin`/`createPinWatch`；`end` ⇒ 重读径照旧）。
  - **不做（逐项理由）**：⑥ **思考块**——服务端帧面/落库面无 reasoning 通道（帧四形 ∥ 消息 role 四值）⇒ 无源；加字段 = 后端面（本批零推翻）⇒ 余项；⑦ **diff 块**——管理面工具七件无文件编辑族 ⇒ 无 diff 源；⑧ **会话内搜索**——宿主 = 浏览器（原生 Ctrl+F 恒在）⇒ 核 `createSearch`（为无查找面的两壳而建）零增益；
   ⑨ **composer 全件（附件 ∥ 斜杠 ∥ 模型菜单）**——无对应语面（模型 = 建会话时选定——KD-SV-87）；⑩ **审批/问询/计划/subagent 卡**——管理面 agent 无人值守裁剪（`agent/ADMIN-AGENT.md` §5）⇒ 面无源；
   ⑪ **代码块复制钮**——核钮经 `navigator.clipboard`（安全上下文）——http 内网面即装即哑（假控件）⇒ 余项（TLS/公网化批后可接）。
  - **壳面归属**：气泡/notice/会话条/输入区 = 控制台自持（核文档口径「shell = 宿主面」——`docs/render-core/design/RENDER-CORE.md` §5 样式契约）⇒ 本页既有样式族与文案键沿用；核件发出的类名族（码面/token/工具卡）样式 = 控制台补（`webui/STYLE.md` §3 `style.css` 行；类名闭合域随正 = 本档 §4 本批行）。
- **页形**：会话条（会话列表 + 「新会话」钮）∥ 对话区（消息流：用户气泡（核 `mdInline`）∥ 助手文本（核 `md`——流式增量）∥ 工具卡（核件：名 + 参数摘要 → 结果摘要；失败红标）∥ notice 行（中断/预算/模型错误/空回合——灰条））∥ 输入区（多行输入 + 发送钮；在途 ⇒ 发送钮禁用 + 运行中指示）。
- **新建会话**：弹窗（沿用 `modal.mjs`）——模型下拉（源 = `/api/admin/providers` 展平——`deriveModels` 同源；缺省 = 最近一次成功所用（KD-SV-87 同口径——机械读法 = `GET /api/admin/agent/chats` 倒序首行 `model`；该模型不在下拉源 ⇒ 空选；「成功」位 = 数据面无（题设近似——如实登记，不引入新位））∥ 无 ⇒ 空选（提交门））；提交 ⇒ `POST /api/admin/agent/chats` ⇒ 选中新会话。
- **取数**：列表/详情 = `GET /api/admin/agent/chats` ∥ `.../:id`（读时读——进页取列表 + 选中会话取详情）；发送 = `POST .../:id/messages`——**流式读取不走 `ctx.api`**（页面自持 `fetch` + `ReadableStream` 逐行读——NDJSON 帧 = `agent/ADMIN-AGENT.md` §11：`delta` 追加当前气泡 ∥ `call`/`result` 追加工具行 ∥ `end` ⇒ 重读会话详情（读时单源——与流式视图收口））；
  **断连/离页**：读流中止（回合照跑——落库单源；回来重读即全量）；发送失败/流前错误 ⇒ 就地人话（`mapError`）。
- **notice 行文案映射**：`data.reason` 四值各一键——`"restart"` ⇒ `admin.chat.noticeInterrupted` ∥ `"budget"` ⇒ `admin.chat.noticeBudget` ∥ `"model_error"` ⇒ `admin.chat.noticeModelError` ∥ `"empty_turn"` ⇒ `admin.chat.noticeEmpty`；枚举外/缺位 ⇒ 服务端原文兜底（`content`——零信息丢）。en 面零 CJK 判据 = 枚举命中前提（收口端到端核）。
- **不做**：会话删除/重命名 ∥ 回合中止钮 ∥ 会话内换模型（换 = 新会话） ∥ SSH 凭据输入（装机走沙盒页弹窗）——全文 = `agent/ADMIN-AGENT.md` §10。
- **文案**：键族 `admin.chat.*`（≈32 键）+ `nav.page.admin.chat`（两表逐键同步——en 零 CJK；`webui/I18N.md` §2.1）；审计型键 `audit.type.agent_event`（`views-audit.mjs` 详情模板补 `summary` 支——`webui/READINGS.md` §2.1④）。

## 3. 文件账（本面文件行 ∥ 键族登记）

| 档 | 行数（实读——设计估） | 职责 |
|---|---|---|
| `thincoder-server/public/views-chat.mjs`（已落盘——admin-agent-chat 批；**实读 399**（2026-10-11 设计轮现读）） | ≈300 ⇒ **实读 399** ⇒ ≈**430**（console-chat-align 批：核件消费接线（`/rc/*` import ∥ `setStrings` 注册 ∥ `createStreamRenderer`/`paintLiveMd` 替手写追加 ∥ `renderToolCard`/`finishToolCard` 替自持工具行）− 自持渲染去除 ∥ + 滚动策略接核；净 ≈+31）⇒ 实读 421（2026-10-11——实施落盘；估 ≈430——差 −9） | 管理面对话（本档 §2.1）：会话列表 ∥ 消息流渲染（气泡/工具卡（核件）/notice）∥ NDJSON 流读取（`fetch` + `ReadableStream`）∥ 新会话弹窗（模型下拉——`deriveModels` 同源）∥ 发送/在途态 ∥ **核件消费（console-chat-align 批——渲染单源 = `/rc/*`）** |
| `thincoder-server/public/i18n-zh-core.mjs`（拟新增——console-chat-align 批） | **≈24**（设计估——键 5 + 段注释 + 档头/包裹；**核件词面**：`tool.running` ∥ `tool.initial` ∥ `tool.truncated` ∥ `tool.error` ∥ `tool.done`——键 = 核件原名，值逐字同 VSC locales）⇒ 实读 14（2026-10-11——实施落盘；估 ≈24——差 −10） | 文案表·zh·核件词面 |
| `thincoder-server/public/i18n-en-core.mjs`（拟新增——console-chat-align 批） | **≈24**（同步——键 5；en 零 CJK；占位符一致）⇒ 实读 14（2026-10-11——实施落盘；估 ≈24——差 −10） | 文案表·en·核件词面 |

**面小计**：≈449（本面档行现读和——估值面，实施实读为准；域合计 = 各面之和——不单列）。

**键族登记**（自 `webui/WEBUI.md` §2.2 归位——逐字）：

- **键族登记（admin-agent-chat 批——两表逐键同步；本批；2026-10-11）**：新增 **≈33 键**——`nav.page.admin.chat`（shell 部件——侧栏项）∥ `admin.chat.*` ≈32（admin 部件：页题/新会话/模型选择/会话列表（空态/加载/失败）/对话区（空态/运行中/重读）/工具行（调用/结果/失败）/输入区（占位/发送/必填）/notice 行四形（中断/预算超限/模型错误/空回合））∥ `audit.type.agent_event`（+1/表——与 `audit.type.sandbox_*` 同部件）；
- **键族登记（console-chat-align 批——两表逐键同步；本批；2026-10-11）**：新建 **2 档**——`i18n-{zh,en}-core.mjs`（**核件词面部件**——键 = 核件原名（域界 = 键首段 ∈ 核件发射面），值逐字同 VSC locales——批内件断言：与 `thincoder-vscode/locales/{zh,en}.json` 逐键相等）；
  本批实填 **5 键**：`tool.running` ∥ `tool.initial` ∥ `tool.truncated` ∥ `tool.error` ∥ `tool.done`（工具卡词面）；**四键退役**（`admin.chat.tool{Call,Result,Calling,Failed}`——§2.7-1 裁决，2026-10-11 收正删净）；`admin.chat.*` **27 键**留 admin 部件（不迁）。

## 4. 验收（本面 AC 行）

| 需求 | 设计级判据 | 载体 |
|---|---|---|
| 管理面 agent 会话页（admin-agent-chat 批——台账 #1254；需求 §5「两个 chat 界面」②④） | 页在册（`#/admin/chat`——单页直测）：会话列表（空态/加载/失败三态）∥ 新会话弹窗（模型下拉 = `deriveModels` 同源 ∥ 空模型 ⇒ 提交门）∥ 对话区（用户/助手/工具行/notice 四形渲染）∥ 输入区（空值不提交 ∥ 在途禁用）∥ 流读取（`fetch` + `ReadableStream`——假流桩：`delta` 追加 ∥ `call`/`result` 工具行 ∥ `end` ⇒ 重读详情——取数序列逐条）∥ 断连（读流中止——零未押异常）∥ i18n 键族（≈33 键两表同步——en 零 CJK）∥ 审计型键 `audit.type.agent_event` 入册（`views-audit` 详情 `summary` 支）∥ `nav.mjs` 管理 9（直测）∥ 非壳页（`SHELL_PAGES` 五路径不动）∥ AC-19 canon 不破（零新变量/零新悬停规则）∥ 档目随正——单源 = `webui/WEBUI.md` §1 | 批内件 + 收口轮（浏览器实走） |
| 管理面 chat 对齐（console-chat-align 批——台账 #1282；用户 18:23 ①④ + 18:30「改」；KD-SV-101） | 呈现面 = 复用 `thincoder-render-core`：静态面第二根 `/rc/*` 在册（`static.mjs` 根表——前缀序/逃逸门逐根 ∥ 桌面双根同形）+ 页面以同源绝对路径取核（`/rc/md.mjs` 等——档面零 `../node_modules` 相对径 ∥ 零拷贝副本 ∥ `package.json` `file:` 声明在册）∥ 对齐集机检：① `md()` 渲助手/用户文本（注入点唯一）② 代码块高亮（`pre.code-block`/`.tk-*`）③ 工具卡三件（`renderToolCard`/`finishToolCard`/`renderToolHistory`——失败判定 `isToolFailure`）④ 流式 = `createStreamRenderer` + `paintLiveMd`（增量——禁每帧全量 `md`/整面 `innerHTML`）⑤ 滚动 = `scroll.*`（24px 判据单源；上滚不夺位）∥ **不做项机检**：档面零 reasoning/diff/search/composer/卡族引用（本档 §2.1 ⑥–⑪）∥ 转义：核 `md()` 单源（页面零手拼 HTML 串——`webui/WEBUI.md` §3 收窄；非文本面 `h`/`textContent`）∥ i18n：`i18n-{zh,en}-core.mjs` 在盘（键 = 核件原名；键首段 ⊆ 核件 `t()` 发射段集——批内件扫核件字面量取集（机器可判）；值逐字同 VSC locales——批内件断言与 `thincoder-vscode/locales/{zh,en}.json` 逐键相等）+ `setStrings` 注册（装配期 + 每次语言切换重注册——核 `_strings` 模块级态） ∥ 类名闭合域随正（`style.css` 选择器 ⊆ 档面字面类 ∪ **核件发射类清单**——AC-19 canon 随正）∥ 零新 `:root` 变量 ∥ 零新悬停规则 ∥ 批内件腿可执行口径 = 自仓根 `node --import ./thincoder-server/test/rc-resolve.mjs --test docs/batches/2026-10-11-console-chat-align.test.mjs`（`--import` 缝——缺则 `/rc/*` 不可解析） ∥ 镜像内双包装（`docker build` 上下文 = 仓根——核包解析可达：容器内 `node -e "import('@thincoder/render-core/md.mjs')"` 冒烟） | 批内件 + 收口轮（**ECS 浏览器实走**——走查清单 = 批档 §2） |

## 5. 边界（本面不做面）

- 管理面 chat 渲染面不做项（console-chat-align 批——理由逐项 = 本档 §2.1 对齐集 ⑥–⑪）：思考块（帧/落库面无 reasoning 通道——加字段 = 后端面另轮）∥ diff 块（工具面无文件编辑族）∥ 会话内搜索（浏览器原生 Ctrl+F 已覆盖）∥ composer 全件（附件/斜杠/模型菜单）∥ 审批/问询/计划/subagent 卡（无人值守裁剪——面无源）∥ 代码块复制钮（安全上下文依赖——TLS/公网化后可接）；核件只读消费（不 fork/不改名/不覆写核件语义）；核包不入 registry（`private`——永不发布）。

## 6. 上抛/余项

- 本面无独立上抛/余项。

## 变更记录

- 2026-10-11（**server-doc-split 批 · 域内拆分（迁移）· eng-designer**——承批档 `docs/batches/2026-10-11-server-doc-split.md` §2）：本档自 `webui/WEBUI.md` §2.10 及三表归位行逐字迁入（零语义）；文内 § 引用改指（§2.2→`webui/I18N.md` §2.1 ∥ §2.3④→`webui/READINGS.md` §2.1④ ∥ §6→本档 §4 等）；AC 行内档目链去重 ⇒ 单源句（`webui/WEBUI.md` §1）；全局键数链删（设计口径——机检断言承载）；超宽行仅拆行（:144/:587/:591 母行）；原址保位 stub 在 `webui/WEBUI.md`。**产品码零触。**
