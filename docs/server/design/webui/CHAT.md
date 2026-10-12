# Thincoder Server · 管理面对话（webui/CHAT.md）

> 本档迁自 `webui/WEBUI.md` §2.10 及三表归位行（2026-10-11 域内拆分；as-of）。域总览与壳面 = `webui/WEBUI.md`。

## 1. 关键决策（本面）

| # | 决策 | 理由 | 被否候选与何故否 |
|---|---|---|---|
| KD-SV-101 | **管理面 chat 呈现面 = 复用 `thincoder-render-core`**（同源第二根 `/rc/*` 取件 ∥ `file:` 声明 ∥ 镜像显式双装打包径）+ **「新会话面/新呈现面先查可复用资产（先查再造）」纪律句**（console-chat-align 批——台账 #1282；用户 18:23 指出「第四套、且最薄的一套 chat」+ 18:30「改」）：渲染单源 = 核 `md`/`highlight`/`tool-card`/`stream+live-md`/`scroll`；**做/不做 = 本档 §2.1 对齐集**（按运维用途裁——不照搬开发壳全量）；转义 = 核内单源（`webui/WEBUI.md` §3 收窄）；核 = 只读消费（不 fork ∥ 不改名 ∥ 端侧不覆写核件语义） | 用户 18:23 原话（「会话这件事做过无数遍……为什么每次再做都会别出心裁做一套新的」）；资产就绪（`@thincoder/render-core` host-agnostic ∥ VSC+桌面两宿主在用）；「先查再造」= 第五套 chat 的防复发句（仓级「复用优先」同向） | 第四套自持渲染（被用户否——本批修正对象）；拷贝核件入 `public/`（双源漂移——`docs/render-core/design/RENDER-CORE.md` §1.3 被否 1）；打包器/构建（违零构建）；框架/CDN（违零框架 ∥ 零外部资源）；核件发布 registry（`private: true`——永不发布不破）；**维持「不拼 HTML 串」自加句**（与两先例相抵——本批收窄） |
| KD-SV-106 | **对话页壳面 = VSC 式四轴对齐**（chat-shell-align 批——台账 #1292；用户 2026-10-11 21:55 裁「全套 ∥ 补后端一件不藏 ∥ VSC 式」）：① 布局（顶会话条 ∥ 文档流平铺消息流 ∥ 状态行 ∥ 输入区——sticky 段定位；原三卡去卡片化）∥ ② 消息形态（核 `thincoder-render-core/flow/block.mjs` 装配——标签行体系；工具卡嵌助手块内）∥ ③ 输入区 = 核 `thincoder-render-core/composer/panel.mjs` **全件消费**（适配层四面 + 四件控件后端：换模型 ∥ 附件 ∥ 中止 ∥ 斜杠——KD-SV-107/108/109）∥ ④ 状态行（输入区上方——读数项 ⊆ 有源；帧面加性扩展：`turn` ∥ `usage` ∥ `end` 补 `durationMs`/`calls`）；**基准 = VSC**（同形处取两壳公共形）；**端差异逐条实证**（差异表 = 本档 §2.1 ①③）；核件单源（composer ∥ block ∥ attach ∥ slash 全件消费——不自持第二套） | 用户 21:55 原话三句（全套 ∥ 补后端一件不藏 ∥ VSC 式）；复用优先 = KD-SV-101 纪律句的续（「先查再造」落在消息装配与输入区两处）；「不藏」= 四件控件不做空壳——后端逐件补齐 | 控制台自由发挥（用户 21:47 判）· 只抄样式自持逻辑（核件可搬不搬——2026-09-28 桌面输入区批先例）· 四件控件摆空壳（用户「不藏」原话否）· VSC 宿主变量名直搬（别名桥取代——`webui/STYLE.md` §2.1①） |
| KD-SV-111 | **控制台思考档位选择器 = 三段补齐（源 ∥ 线 ∥ 界面）——核件单源 ∥ 会话级归属**（console-reasoning-levels 批——台账 #1303；功能点 42 ∥ AC-42；口径四条经用户 2026-10-12 11:46「行」核准）：① **源** = 服务端模型面随行下发（`GET /api/admin/providers` 每 provider 行增 `modelReasoning`——键 = 上游真名 ∥ 值 = 核 `specForModel(上游).reasoningEffortEnum`；稀疏：空档不登键）⇒ `deriveModels` 行携 `reasoning` ⇒ 核模型菜单行；② **线** = 会话设置面 `PATCH …/chats/:id { reasoning }`（值域 = 核同一枚举，表外 400）+ 回合装配携 `reasoningEffort`（未设 ∥ 表外 ⇒ 零字段）；③ **界面** = `#reasoning-btn` 解隐藏（收窄五钮）+ 核菜单 `selectReasoning` ⇒ PATCH + 切会话推送回读；钮字/选中态/下拉全归核件（控制台零二次改写）；④ 无档模型 = 核无档面中性（「中性」= 载荷中性：零字段发出） | 用户 2026-10-12 11:45 走查（原话「界面上没有思考档位选择器」）+ 11:46 口径核准；核件（菜单 ∥ 词面 ∥ 载荷门 ∥ off 语义）早已造好——缺的只是控制台三段；单源 = 核 `model-specs.mjs` 运行期直读 ⇒ 零第二清单、零漂移 | 控制台自持档位清单（第二清单——漂移源，否）；统一兜底枚举（CLI `["high","max"]` 式回落——口径①驳回：无档必须中性）；逐条覆写（VSC per-message `reasoning` 参——口径③会话级，否）；档位存浏览器（切设备/重开即失——违会话级，否）；状态行 `✦reasoning` 段（口径④——不做） |

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
    ⑤ **滚动行为**＝核 `scroll.mjs`（近底 24px 判据单源；**用户上滚不夺阅读位**——`applyPin`/`createPinWatch`；`end` ⇒ 重读径照旧）；
      本批作用元素 ⇒ `document.scrollingElement`（文档流——判据不变）；
    ⑨ **输入区全件**＝核 `thincoder-render-core/composer/panel.mjs`（**本批翻做**；适配层四面 + 四件控件后端 = 本档 §2.1 ③）。
  - **不做（逐项理由）**：⑥ **思考块**——服务端帧面/落库面无 reasoning 文本通道（帧四形 ∥ 消息 role 四值）⇒ 无源；加字段 = 后端面（本批零推翻）⇒ 余项；⑦ **diff 块**——管理面工具七件无文件编辑族 ⇒ 无 diff 源；⑧ **会话内搜索**——宿主 = 浏览器（原生 Ctrl+F 恒在）⇒ 核 `createSearch`（为无查找面的两壳而建）零增益；
   ⑩ **审批/问询/计划/subagent 卡**——管理面 agent 无人值守裁剪（`agent/ADMIN-AGENT.md` §5）⇒ 面无源；
   ⑪ **代码块复制钮**——核钮经 `navigator.clipboard`（安全上下文）——http 内网面即装即哑（假控件）⇒ 余项（TLS/公网化批后可接）。
  - **壳面归属（chat-shell-align 批收正）**：**消息块 = 核 `thincoder-render-core/flow/block.mjs`** ∥ **输入区 = 核 `thincoder-render-core/composer/panel.mjs`**（核文档口径「shell = 宿主面」——`docs/render-core/design/RENDER-CORE.md` §5 样式契约——本批把两处宿主面从自持翻为核件消费）；
    **控制台仍自持** = 会话条 ∥ notice 行 ∥ 状态行（核无状态行族）；核件发射类名族样式 = 控制台补（`webui/STYLE.md` §2.1 新面登记 + §3；类名闭合域随正 = 本档 §4 本批行）。
- **页形（chat-shell-align 批——四轴重写；用户 21:55 裁「全套 ∥ 补后端一件不藏 ∥ VSC 式」；基准 = VSC `index.html` 三段 + 内核两件）**：

  **① 布局（三段纵列——sticky 段定位）**：顶**会话条**（sticky 顶；会话选择器（当刻会话 + ▼；展开 = 会话列表下拉——行 = 模型 ∥ `excerpt` ∥ 时间，当刻项高亮）∥「新会话」钮 ∥「重读」钮（既有取数动作））；
  中**消息流**（文档流平铺——无卡无框；原三卡（会话卡/对话卡/输入卡）去卡片化——AC-19 ⑦ 卡片族在本页不落）∥ 底**输入区**（sticky 底）＝ `#toolbar` 容器：**状态行** + 输入行 + 附件/粘贴条 + 控件行（核 `thincoder-render-core/composer/panel.mjs` 全件——见 ③）。
  滚动 = **文档流**（核 `scroll.mjs` 作用元素随正 ⇒ `document.scrollingElement`；近底 24px 判据 ∥ 上滚不夺阅读位两判据不变）；`SHELL_PAGES` 五路径不动（非壳页）；**宿主差异实证**：VSC = `#messages` 固定视口内滚；控制台 = 文档流 + sticky 段（宿主页形差异——滚动判据同源，零口径改）。

  **② 消息形态（核 `thincoder-render-core/flow/block.mjs` 装配——平铺标签行体系）**：用户块 = `buildUserMessage(text, ts, idx)`（`.message.user` + 标签行 `❯ {msg.user}:` + 时间 + `.bubble`）∥ 助手块 = `renderBlock({ idx, withLabel })`（活流）∥ `buildAssistantRestore(msg)`（回读——`{ text, tools, turnStart }`）；
  工具卡 = 核 `renderToolCard`/`finishToolCard`（活）∥ `buildFinishedToolCard`（回读——**嵌助手块内**，不挂顶层）。
  **一回合一个助手标签**（`withLabel`/`turnStart` 恰一次——`thincoder-render-core/flow/block.mjs:124` 口径）；**无气泡底**（VSC 平铺形——`.message`/`.msg-label`/`.msg-time` 类名单源；样式 = `webui/STYLE.md` §2.1 新面登记）。
  回读装配（库行 ⇒ 块模型）：`user` 行 ⇒ 用户块 ∥ `assistant` 行 + 其 `data.toolCalls` 对应 `tool` 行 ⇒ 助手块（`turnStart` = 本回合首个 assistant 行）+ 嵌套工具卡 ∥ `notice` 行 ⇒ 控制台 notice 行（自持面——VSC 无对应；灰条形态沿用）。词表 +2 键：`msg.user` ∥ `msg.assistant`（核件原名——值逐字同 VSC locales：你 ∥ ThinCoder）。

  **③ 输入区 = 核 `thincoder-render-core/composer/panel.mjs` 全件消费（适配层四面）**：
  - ① **容器自建**：控制台建 `#toolbar`（核 css 锚名——沿桌面 `thincoder-desktop/renderer/mount-composer.mjs:250`「槽赋 `id=toolbar`」先例）；**装配期注 `<link>` 两静态档**（`/rc/composer/composer.css` ∥ `/rc/composer/model-menu.css`——桌面 `:216-234` 同式；幂等 `data-rc-css`）。
  - ② **变量别名桥**：核壳族变量名 ⇒ 控制台既有变量（`:root` 别名块——零新值；逐键映射 = `webui/STYLE.md` §2.1①）。
  - ③ **注入口桥**：`post(type, payload)` ⇒ 控制台动作映射表（`userMessage` ⇒ 发一条 ∥ `queuedUserMessage` ⇒ 入队 ∥ `interrupt` ⇒ 折法（见下）∥ `abort` ⇒ `POST …/abort` ∥ `selectModel` ⇒ `PATCH …/:id` ∥ `selectReasoning` ⇒ `PATCH …/:id { reasoning }`（KD-SV-111——档位面））；
    `state` 读面（`turnState` ⇒ 在途 ∥ `queue` ⇒ 队列计数 ∥ `models` ⇒ `deriveModels` 行 ∥ `flags` ⇒ 全假 ∥ `workspaceRequired` ⇒ `false`（浏览器面恒有工作区语义——不入会话） ∥ `subscribe` ⇒ 推送口）∥ `hooks`（`onUserEcho` ∥ `onTurnStart` ∥ `onStatusRefresh` ⇒ 状态行重绘 ∥ `confirmRemoveProvider`/`openSettings` ⇒ 无源（钮隐藏——不达））。
  - ④ **无源钮收窄**（CSS 隐藏——无源实证逐条）：`#auto-btn`/`#advisor-btn`/`#eng-btn`/`#plan-btn`（无人值守裁剪——审批/计划/工程模式面无源）∥ `#settings-btn`（设置面板面 = 开发壳面）——**五枚**（`#reasoning-btn` 经 KD-SV-111 出列：档位通道三段补齐，钮面启用；钮字/选中态/下拉全归核件——`style.css` 零钮面逻辑）。
    **「不藏」射程读法**（用户 21:55 裁「输入区无后端支撑的控件 = 补后端，一件不藏」）：闭合集 = 会话内换模型 ∥ 附件 ∥ 回合中止 ∥ 斜杠命令表 ∥ **思考档位**（KD-SV-111——后端三段补齐）；核面板其余无源钮（**五枚**）= 收窄（CSS 隐藏）+ 逐条无源实证——非「不藏」对象。
  - **四件控件后端**（逐件形——机制全文 = `agent/ADMIN-AGENT.md` §11.2）：**① 换模型** = 核模型菜单 ⇒ `PATCH …/chats/:id { model }`（会话内可换——**KD-SV-87 收正** = KD-SV-108；下回合生效 ∥ 在途回合零触；斜径 `/model` 同钮同门）；
    **② 附件** = 文本档（核 `attach.mjs` 三限 + `withAttachedFiles` 内联进文本——**零后端**）∥ 图片（核件随 POST 携 `images` 列 ⇒ 服务端核 `parseDataUrl` 校验 + `isNonVisionModel` 视觉门 ⇒ 400 人话；库 = user 行 `data_json.imageParts`；详情响应仅 `imageCount`——KD-SV-109）；
    **③ 中止** = Stop 钮/Ctrl+C ⇒ `POST …/chats/:id/abort`（AbortSignal 透传核 + 环内检查点；notice 第五值 `"aborted"`——KD-SV-107）∥ **④ 斜杠** = 控制台命令表（`/model` ⇒ 开模型菜单 ∥ `/new` ⇒ 新会话弹窗 ∥ `/help` ⇒ 行集就地打印；别名 `/m` `/n` `/h`；表纪律 = 名 ⊆ CLI 名集 ∥ 不得自创；未知 ⇒ 核 `slash.unknown` toast + 文本保留）。
  - **⑤ 思考档位（console-reasoning-levels 批——2026-10-12；KD-SV-111；口径四条经用户 11:46 核准）**：**源** = 服务端模型面 `modelReasoning` ⇒ `deriveModels` 行携 `reasoning` ⇒ 核模型菜单行；**线** = 核菜单 `selectReasoning` ⇒ `PATCH …/chats/:id { reasoning }`（值域 = 核同一枚举——别名模型解上游真名后同判；表外 400）
    + 回合起跑读行 ⇒ provider 配置携 `reasoningEffort`（未设 ∥ 表外 ⇒ **零字段**——与今日同形）；**界面** = 钮解隐藏 + 点选即改 + 切会话推送回读（`prefs.reasoning` = 当刻会话档位）；
    **口径四条** = ① 值域按模型各自枚举（不做统一清单 ∥ 无兜底枚举）∥ ② 默认不设（零字段）+ 换模型 ⇒ 回中性（服务端随写清）∥ ③ 会话级归属（与 `model` 同层存）∥ ④ 状态行 `✦reasoning` 段不做。
    **无档模型（枚举缺省）** = 核无档面逐字：钮可见、文案 = `reasoning.off`（「关闭」——核哨兵档，词面已在册）、菜单「不支持推理／关闭（不支持）」、零可选 ⇒ 零写出；控制台不造第三态（核件零改）。机制全文 = `agent/ADMIN-AGENT.md` §11.4。
  - **排队面**（核面板忙态行为——控制台承接）：在途提交 ⇒ 待发泡（核 `markPending`——`queued.pending` 标）+ 队列（容量 = 核 `QUEUED_MAX_ITEMS` 8；满 ⇒ 核 `input.slotFull` toast）；`end` ⇒ 重读 ⇒ 队首发起（新回合）；**`interrupt`（Ctrl+I）= 折法**：无「在途注入」通道（`runChatTurn` 环无中途中止/注入点）⇒ 中止当前回合 + 该文本入队首（端差异实证条）。

  **④ 状态行（输入区上方——`#toolbar` 首子；VSC 同构）**：控制台自持渲染（核无状态行族）+ 读数项 ⊆ 有源：

  | 段 | 源 | 缺省 |
  |---|---|---|
  | 运行中… | 客户端回合态（本页发起） | 非在途 ⇒ 零段 |
  | 工具: <名> | `call`/`result` 帧对（最近未结算 call） | 零段 |
  | ↑N ↓N | `usage` 帧累加（核 `fmtK`——`/rc/lib.mjs`） | 零 usage ⇒ 零段 |
  | hit N% | `cacheHit/(cacheHit+cacheMiss)`（usage 帧累加） | 分母零 ⇒ 零段 |
  | context N% | 末次 `usage.prompt` ÷ `specForDisplay(model).context`（快照件——`model-specs-snapshot.mjs`） | 未收录 ⇒ 零段；≥80% 警示色 |
  | 轮次 n | `turn` 帧（n = 本回合第 n 次模型调用） | 零段 |
  | 耗时 Ns | 客户端时钟 ⇒ `end.durationMs` 冻结 | 终态后保留至下一回合/重读 |
  | 已静默 Ns | 客户端时钟（最近可见输出 ≥10s——VSC 同阈） | 零段 |
  | ✦reasoning 计数 | —— | **不做**（核 `usage` 聚合面无 reasoning 计数——无源） |
  | 模型名段 | —— | 不做（VSC 无——钮面已示） |

  - **帧面加性扩展**（`gateway/API.md` §2.8 ∥ `agent/ADMIN-AGENT.md` §11.3）：`{ type: "turn", n }`（每次模型调用前）∥ `{ type: "usage", prompt, completion, cacheHit, cacheMiss }`（每次模型调用后、有源才发）∥ `end` 帧增 `durationMs`/`calls`（可字段——既有消费零破）。**零落库**（帧面 = 视图面——刷新后状态行清空重算）。

  - **端差异表（逐条实证——宿主差异保留；无实证即改）**：① 文档流页（VSC = 固定视口）⇒ sticky 段定位（宿主页形）∥ ② 核件样式自带过渡/动画（核 `composer.css`——单源零触；控制台自有档零动画不变）∥ ③ `interrupt` 折法（无注入通道——上述）∥ ④ 无源钮隐藏五枚（钮面无源——档位面经 KD-SV-111 出列）∥ ⑤ 控制台零 CSP 头（沿现盘——核件内联状态色同 console-chat-align 在案）∥ ⑥ notice 行 = 控制台自持灰条（VSC 无对应件）。
- **新建会话**：弹窗（沿用 `modal.mjs`）——模型下拉（源 = `/api/admin/providers` 展平——`deriveModels` 同源；缺省 = 最近一次成功所用（KD-SV-87 同口径——机械读法 = `GET /api/admin/agent/chats` 倒序首行 `model`；该模型不在下拉源 ⇒ 空选；「成功」位 = 数据面无（题设近似——如实登记，不引入新位））∥ 无 ⇒ 空选（提交门））；提交 ⇒ `POST /api/admin/agent/chats` ⇒ 选中新会话。
- **取数**：列表/详情 = `GET /api/admin/agent/chats` ∥ `.../:id`（读时读——进页取列表 + 选中会话取详情）；发送 = `POST .../:id/messages`（体 = `{ content, images? }`）——**流式读取不走 `ctx.api`**（页面自持 `fetch` + `ReadableStream` 逐行读）；
  NDJSON 帧 = `agent/ADMIN-AGENT.md` §11.3：`turn` ⇒ 状态行轮次 ∥ `delta` ⇒ 核 `createStreamRenderer` 增量 ∥ `usage` ⇒ 状态行读数 ∥ `call`/`result` ⇒ 核工具卡（嵌当前助手块）∥ `end` ⇒ 状态行耗时冻结 + 重读详情（读时单源）；
  中止 = `POST .../:id/abort`；换模型 = `PATCH .../:id`；
  **断连/离页**：读流中止（回合照跑——落库单源；回来重读即全量）；发送失败/流前错误 ⇒ 就地人话（`mapError`）。
- **notice 行文案映射**：`data.reason` 五值各一键——`"restart"` ⇒ `admin.chat.noticeInterrupted` ∥ `"budget"` ⇒ `admin.chat.noticeBudget` ∥ `"model_error"` ⇒ `admin.chat.noticeModelError` ∥ `"empty_turn"` ⇒ `admin.chat.noticeEmpty` ∥ `"aborted"` ⇒ `admin.chat.noticeAborted`（本批 +1）；
  枚举外/缺位 ⇒ 服务端原文兜底（`content`——零信息丢）。en 面零 CJK 判据 = 枚举命中前提（收口端到端核）。
- **不做**：会话删除/重命名 ∥ SSH 凭据输入（装机走沙盒页弹窗）——全文 = `agent/ADMIN-AGENT.md` §10。
- **文案**：键族 `admin.chat.*`（本批 +9 = 状态行七（`status{Running,Tool,Context,Cache,Turn,Elapsed,Quiet}`——`↑N ↓N` 段零键：纯符号 + 核 `fmtK`）+ `selectChat` + `noticeAborted`）+ `nav.page.admin.chat`（**既有键**——admin-agent-chat 批在册，非本批新增）；两表逐键同步——en 零 CJK（`webui/I18N.md` §2.1）；
  **核件词面部件扩登**（消费面翻入 composer/attach/slash——本档 §3 键族登记）；审计型键 `audit.type.agent_event`（`views-audit.mjs` 详情模板补 `summary` 支——`webui/READINGS.md` §2.1④）。

## 3. 文件账（本面文件行 ∥ 键族登记）

| 档 | 行数（实读——设计估） | 职责 |
|---|---|---|
| `thincoder-server/public/views-chat.mjs`（已落盘——admin-agent-chat 批；实读 **488**（2026-10-12 本设计轮复读——chat-shell-align 批重写后）） | ≈430 ⇒ 实读 **488** ⇒ ≈**498**（本批：档位写面接线 +≈10——就近 500 软线：预案 = 档位小段随拆档审查；硬限 800 未越）⇒ 实读 **500**（2026-10-12 本批落地后——恰贴软线） | 管理面对话页（本档 §2.1）：页四段装配 ∥ 会话条（选择器/新会话/重读）∥ 消息装配（核 `thincoder-render-core/flow/block.mjs`——回读/活流）∥ NDJSON 帧分发（`delta`/`call`/`result`/`turn`/`usage`/`end`）∥ 队列（待发泡/队首发起）∥ 新会话弹窗 ∥ 取数。**chat-shell-align 批**：去自持消息/工具件渲染与输入区（迁 `views-chat-composer.mjs`）∥ 增会话条下拉 ∥ 队列 ∥ `turn`/`usage` 帧分发 ∥ 中止/换模型接线——净 **≈−90 ⇒ ≈330** |
| `thincoder-server/public/views-chat-composer.mjs`（已落盘——chat-shell-align 批；实读 **308**（2026-10-12 本设计轮复读）） | ≈**300** ⇒ 实读 **308** ⇒ ≈**318**（本批：档位行造面接核 + `selectReasoning` 映射 + prefs 携档——输入区适配层：核 `thincoder-render-core/composer/panel.mjs` 装配 ∥ 两样式档 `<link>` 注入（幂等） ∥ `post` 动作映射表 ∥ `state`/`hooks` 注入（注入口桥）∥ 无源钮收窄（CSS 隐藏）∥ 状态行渲染（段表 = §2.1④）∥ 斜杠命令表） | 输入区与状态行（本档 §2.1③④——核件全件消费适配层；拆档缘由 = `views-chat.mjs` 并入后 ≈630——越 500 软线（拆档审查；800 硬限未越）） |
| `thincoder-server/public/i18n-zh-core.mjs`（已落盘——console-chat-align 批） | **≈24**（设计估）⇒ 实读 **14** ⇒ ≈**62**（chat-shell-align 批：消费面翻入 `composer/{panel,controls,model-menu,attach,slash}.mjs` ∥ `flow/{block,queued-mark,tool-card,tool-card-restore,stream}.mjs`——核件 `t()` 字面量全集补登（+≈41 键） ∥ 段注释 +≈7；键族清册 = 本档 §3 键族登记） | 文案表·zh·核件词面（键 = 核件原名；值逐字同 VSC locales——slash 族源 = 桌面 `thincoder-desktop/renderer/i18n-views.mjs` 同键） |
| `thincoder-server/public/i18n-en-core.mjs`（已落盘——console-chat-align 批） | 实读 **14** ⇒ ≈**62**（同步——同上；en 零 CJK；占位符一致） | 文案表·en·核件词面 |

**面小计**：≈**754** ⇒ 实读和 ≈**933**（2026-10-12 本设计轮复读：`views-chat.mjs` **488** + `views-chat-composer.mjs` **308** + 两 i18n core **70**/**67**——估值行本就粗，以实读为准）⇒ ≈**953**（本批：+≈20 = `views-chat.mjs` +≈10（档位写面接线） ∥ `views-chat-composer.mjs` +≈10（档位行造面） ∥ 两 i18n core 零增——分项和）；域合计 = 各面之和——不单列）。

**随正件（面外行账——本批另计）**：`i18n-{zh,en}-admin.mjs`（`admin.chat.*` +9 键/表——文件行账 = `webui/ADMIN.md` §3）∥ `style.css`（本面新面登记——行账 = `webui/STYLE.md` §3）∥ `views-chat.mjs` 拆档另见上行。
**随正件（console-reasoning-levels 批——2026-10-12）**：服务端五档（`thincoder-server/src/gateway/reasoning-levels.mjs`（拟新增） ∥ `thincoder-server/src/gateway/provider-admin.mjs` ∥ `thincoder-server/src/agent/chat-routes.mjs`；
  `thincoder-server/src/agent/chat.mjs` ∥ `thincoder-server/src/store/db.mjs`——行账 = `agent/ADMIN-AGENT.md` §6 ∥ `store/STORE.md` §4）∥ `style.css`（收窄五钮——行账 = `webui/STYLE.md` §3）∥ 测试链随正（结构版本断言 11 件 + 隐藏腿 1 件 + 列面腿 1 件——见本档 §6⑤）。

**键族登记**（自 `webui/WEBUI.md` §2.2 归位——逐字）：

- **键族登记（admin-agent-chat 批——两表逐键同步；本批；2026-10-11）**：新增 **≈33 键**——`nav.page.admin.chat`（shell 部件——侧栏项）∥ `admin.chat.*` ≈32（admin 部件：页题/新会话/模型选择/会话列表（空态/加载/失败）/对话区（空态/运行中/重读）/工具行（调用/结果/失败）/输入区（占位/发送/必填）/notice 行四形（中断/预算超限/模型错误/空回合））∥ `audit.type.agent_event`（+1/表——与 `audit.type.sandbox_*` 同部件）；
- **键族登记（console-chat-align 批——两表逐键同步；本批；2026-10-11）**：新建 **2 档**——`i18n-{zh,en}-core.mjs`（**核件词面部件**——键 = 核件原名（域界 = 键首段 ∈ 核件发射面），值逐字同 VSC locales——批内件断言：与 `thincoder-vscode/locales/{zh,en}.json` 逐键相等）；
  本批实填 **5 键**：`tool.running` ∥ `tool.initial` ∥ `tool.truncated` ∥ `tool.error` ∥ `tool.done`（工具卡词面）；**四键退役**（`admin.chat.tool{Call,Result,Calling,Failed}`——§2.7-1 裁决，2026-10-11 收正删净）；`admin.chat.*` **27 键**留 admin 部件（不迁）。
- **键族登记（chat-shell-align 批——两表逐键同步；本批；2026-10-11）**：**核件词面部件扩登**（消费面翻入：`composer/{panel,controls,model-menu,attach,slash}.mjs` ∥ `flow/{block,queued-mark,tool-card,tool-card-restore,stream}.mjs`）——键 = **核件 `t()` 字面量全集**（机检 = 扫消费件取集 ⊆ 注册表——超集安全）；本批实填 **≈41 键**；
  - 族目（一）：`msg.{user,assistant}` ∥ `input.{placeholder,busyPlaceholder,interruptPlaceholder,slotFull}` ∥ `queued.pending` ∥ `paste.unsupportedFormat` ∥ `composer.attach.{unsupported,tooMany,tooLarge,totalLimit,readFailed,binary}`；
  - 族目（二）：`slash.{unknown,args,help.label}` ∥ `slash.desc.{model,new,help}` ∥ `model.{loading,filterPlaceholder,noMatch,addProvider,removeProvider,setKey,noReasoning,noReasoningDesc,reasoning}` ∥ `reasoning.*`；
  - 族目（三）：`msg.{copy,copied}` ∥ `toolbar.{autoApprove,planDisabled}` ∥ `auto.{confirmText,enable,cancel}` ∥ `status.thinking` ∥ `error.retry` ∥ `workspace.{required,requiredPlaceholder}`；
  - **值源逐族**：VSC locales（`thincoder-vscode/locales/{zh,en}.json` 逐键相等断言）——**slash 族**（`slash.unknown`/`args`/`help.label`/`desc.*`）+ `model.*`/`reasoning.*`/`toolbar.*`/`auto.*` 随桌面表（`thincoder-desktop/renderer/i18n-views.mjs` 同键逐字——VSC 无该族；两壳同词）；
  - **唯一新撰键 = `slash.desc.new`**（en `start a new chat` ∥ zh `新建会话`——CLI 同名 desc 含「旧档入槽」语义（控制台无槽面）⇒ 不逐字）。
- **键族登记（chat-shell-align 批——admin 部件）**：`admin.chat.*` **+9 键**/表——状态行七（`status{Running,Tool,Context,Cache,Turn,Elapsed,Quiet}`）∥ `selectChat` ∥ `noticeAborted`（notice 第五值人话）；`admin.chat.*` 27 ⇒ **36 键**（文件行账 = `webui/ADMIN.md` §3）。

## 4. 验收（本面 AC 行）

| 需求 | 设计级判据 | 载体 |
|---|---|---|
| 管理面 agent 会话页（admin-agent-chat 批——台账 #1254；需求 §5「两个 chat 界面」②④） | 页在册（`#/admin/chat`——单页直测）：会话列表（空态/加载/失败三态）∥ 新会话弹窗（模型下拉 = `deriveModels` 同源 ∥ 空模型 ⇒ 提交门）∥ 对话区（用户/助手/工具行/notice 四形渲染）∥ 输入区（空值不提交 ∥ 在途禁用）∥ 流读取（`fetch` + `ReadableStream`——假流桩：`delta` 追加 ∥ `call`/`result` 工具行 ∥ `end` ⇒ 重读详情——取数序列逐条）∥ 断连（读流中止——零未押异常）∥ i18n 键族（≈33 键两表同步——en 零 CJK）∥ 审计型键 `audit.type.agent_event` 入册（`views-audit` 详情 `summary` 支）∥ `nav.mjs` 管理 9（直测）∥ 非壳页（`SHELL_PAGES` 五路径不动）∥ AC-19 canon 不破（零新变量/零新悬停规则）∥ 档目随正——单源 = `webui/WEBUI.md` §1 | 批内件 + 收口轮（浏览器实走） |
| 管理面 chat 对齐（console-chat-align 批——台账 #1282；用户 18:23 ①④ + 18:30「改」；KD-SV-101） | 呈现面 = 复用 `thincoder-render-core`：静态面第二根 `/rc/*` 在册（`static.mjs` 根表——前缀序/逃逸门逐根 ∥ 桌面双根同形）+ 页面以同源绝对路径取核（`/rc/md.mjs` 等——档面零 `../node_modules` 相对径 ∥ 零拷贝副本 ∥ `package.json` `file:` 声明在册）∥ 对齐集机检：① `md()` 渲助手/用户文本（注入点唯一）② 代码块高亮（`pre.code-block`/`.tk-*`）③ 工具卡三件（`renderToolCard`/`finishToolCard`/`renderToolHistory`——失败判定 `isToolFailure`）④ 流式 = `createStreamRenderer` + `paintLiveMd`（增量——禁每帧全量 `md`/整面 `innerHTML`）⑤ 滚动 = `scroll.*`（24px 判据单源；上滚不夺位）∥ **不做项机检**：档面零 diff/search/卡族引用（本档 §2.1 ⑥⑦⑧⑩⑪）∥ 转义：核 `md()` 单源（页面零手拼 HTML 串——`webui/WEBUI.md` §3 收窄；非文本面 `h`/`textContent`）∥ i18n：`i18n-{zh,en}-core.mjs` 在盘（键 = 核件原名；键首段 ⊆ 核件 `t()` 发射段集——批内件扫核件字面量取集（机器可判）；值逐字同 VSC locales——批内件断言与 `thincoder-vscode/locales/{zh,en}.json` 逐键相等）+ `setStrings` 注册（装配期 + 每次语言切换重注册——核 `_strings` 模块级态） ∥ 类名闭合域随正（`style.css` 选择器 ⊆ 档面字面类 ∪ **核件发射类清单**——AC-19 canon 随正）∥ 零新 `:root` 变量 ∥ 零新悬停规则 ∥ 批内件腿可执行口径 = 自仓根 `node --import ./thincoder-server/test/rc-resolve.mjs --test docs/batches/2026-10-11-console-chat-align.test.mjs`（`--import` 缝——缺则 `/rc/*` 不可解析） ∥ 镜像内双包装（`docker build` 上下文 = 仓根——核包解析可达：容器内 `node -e "import('@thincoder/render-core/md.mjs')"` 冒烟） | 批内件 + 收口轮（**ECS 浏览器实走**——走查清单 = 批档 §2） |
| 对话页壳面对齐（chat-shell-align 批——台账 #1292；**功能点 41 ∥ AC-41**；用户 2026-10-11 21:55 裁「全套 ∥ 补后端一件不藏 ∥ VSC 式」；KD-SV-106/107/108/109） | 四轴逐项在册（本档 §2.1）：**① 布局** = 页四段（会话条 sticky 顶 ∥ 消息流文档流 ∥ 状态行 ∥ 输入区 sticky 底——`#toolbar`）∥ 三卡去卡片化 ∥ `SHELL_PAGES` 五路径不动 ∥ 滚动 = `document.scrollingElement`（核 `scroll.mjs` 两判据不变）∥ **② 消息形态** = 核 `thincoder-render-core/flow/block.mjs` 装配（`buildUserMessage`/`renderBlock`/`buildAssistantRestore`/`buildFinishedToolCard`——工具卡嵌助手块内 ∥ 一回合一个助手标签（`turnStart` 恰一次）∥ 无气泡底（`.message`/`.msg-label`/`.msg-time`）∥ 回读块模型：user ⇒ 块 ∥ assistant+tool ⇒ 助手块+嵌套卡 ∥ notice ⇒ 自持灰条）∥ **③ 输入区** = 核 `thincoder-render-core/composer/panel.mjs` 全件（适配层四面：容器自建 + 两 css `<link>`（幂等）∥ 变量别名桥 ∥ 注入口桥（post 映射表/state/hooks）∥ 无源钮收窄——五钮 CSS 隐藏）+ **四件控件后端**（换模型 = `PATCH …/:id`（KD-SV-108）∥ 附件 = 文本档零后端 + 图片随行存（KD-SV-109）∥ 中止 = `POST …/abort`（KD-SV-107）∥ 斜杠 = 三命令表（`/model`/`/new`/`/help`——名 ⊆ CLI 名集））+ 排队面（核容量 8/待发泡/`end` ⇒ 队首）∥ **④ 状态行** = 输入区上方 + 段表 ⊆ 有源（本档 §2.1④；`✦reasoning` 不做 = 无源实证）+ 帧面加性扩展（`turn`/`usage`/`end` 补两字段——`gateway/API.md` §2.8）∥ **端差异表六条**（逐条实证——本档 §2.1）∥ 用例 = 本档 §4 壳面行（N68–N70 ∥ B67/B68 ∥ E52/E53）+ 机制面 = `agent/ADMIN-AGENT.md` §8（N64–N67 ∥ B65/B66 ∥ E50/E51）∥ 收口轮 = 浏览器实走（四轴清单——批档 §2） | 批内件 + 收口轮（浏览器实走；ECS 走查） |
| 对话页壳面对齐（续·机检口径） | 批内件腿（自仓根 `node --import ./thincoder-server/test/rc-resolve.mjs --test docs/batches/2026-10-11-chat-shell-align.test.mjs`）：① 档面零自持渲染（核件调用面在册——零手写 markdown/工具行拼装）② 核件调用面逐件（`block.mjs` 四件 ∥ `thincoder-render-core/composer/panel.mjs` ∥ `scroll.*` ∥ `createStreamRenderer`）③ 状态行段表机检（段 ⊆ §2.1④ 表；`✦` 零引用）④ 无源钮隐藏规则在盘（`style.css` 五 id）∥ 核件词面扫描腿（消费件 `t()` 字面量全集 ⊆ `i18n-{zh,en}-core.mjs` 注册表；与 VSC locales 逐键相等——slash/桌面族按值源表断言）∥ 页面档结构腿：会话条/状态行/输入区在册（`#toolbar`/`#status-line` 各恰一——幂等：两次装配零重注）∥ AC-19 canon 不破（`:root` 别名块 = 零新值（逐键 `var(--既有)`） ∥ 零新悬停规则 ∥ 类名闭合域随正）∥ 档目随正——单源 = `webui/WEBUI.md` §1（本批 +1 档）∥ 服务端腿 = `agent/ADMIN-AGENT.md` §7 本批行（前后端同拍） | 批内件 + 收口轮（浏览器实走） |
| 对话页思考档位选择器（console-reasoning-levels 批——台账 #1303；**功能点 42 ∥ AC-42**；四条口径经用户 2026-10-12 11:46 核准；KD-SV-111） | **① 档位源** = `GET /api/admin/providers` 每 provider 行 `modelReasoning`（键 = 上游真名 ∥ 值 = 核 `reasoningEffortEnum`；稀疏——空档零键）⇒ `deriveModels` 行携 `reasoning` ⇒ 核行 `reasoning` 非恒空 ∥ **② 选择生效** = `PATCH …/:id { reasoning }`（值域 = 核同一枚举——表外 ⇒ 400 库零变）⇒ 回合出口 provider 携 `reasoningEffort`（假出口入参断言；未设 ⇒ **零字段**）∥ **③ 界面可用** = `#reasoning-btn` 解隐藏（收窄五钮）+ 点选 ⇒ PATCH 恰一条 + 切会话推送回读（`prefs.reasoning`——各自记住）∥ **④ 默认静默** = 未动 ⇒ 零字段 ∥ 存量行 NULL 零变（v16 零迁移）∥ **⑤ 状态行不做** = `statusSegments` 零改（`✦` 零引用——既有腿续）∥ 机制面 = `agent/ADMIN-AGENT.md` §7 本批行（前后端同拍） | 批内件 + 收口轮（浏览器实走——切模型/切会话/选档各一） |
| 思考档位（续·机检口径） | 批内件腿（自仓根 `node --import ./thincoder-server/test/rc-resolve.mjs --test docs/batches/2026-10-12-console-reasoning-levels.test.mjs`）：① `modelReasoning` 稀疏 map（假 specLookup 注入——有档登键 ∥ 无档零键 ∥ 键 = 上游真名）② 档位行造面（`deriveModels` 行携 `reasoning` ∥ 核行非恒空）③ `selectReasoning` ⇒ PATCH 恰一条（假 api 桩；表外值 ⇒ 400 就地人话）④ 装配（假模型出口入参：值 ∈ 枚举 ⇒ 携 `reasoningEffort`；未设/表外 ⇒ 零键）⑤ 存储（空库直落 16 ∥ `agent_chats.reasoning` 列在场 ∥ 存量行 NULL）⑥ 界面腿（`style.css` 五钮收窄 ∥ `#reasoning-btn` 不在收窄行）∥ 结构腿 = 核件取件面零新增（`/rc/composer/panel.mjs` 已在册）∥ 键面零新键（核件词面 `reasoning.*`/`model.{noReasoning,noReasoningDesc,reasoning}` 已在册） | 批内件 + 收口轮（浏览器实走） |

**用例（本批——壳面；机制面 = `agent/ADMIN-AGENT.md` §8）**：

| # | 类 | 输入 | 预期输出 |
|---|---|---|---|
| N68 | 正常 | 装配 `#/admin/chat`（两语言径） | 页四段在册（会话条/消息流/状态行/输入区）；零卡片包裹（本页无 `.card` 面）；`#toolbar`/`#status-line` 各恰一；两 css `<link>` 幂等（重复装配零重注） |
| N69 | 正常 | 回读装配（假详情：user 行 ∥ assistant 行 + toolCalls ∥ tool 行 ∥ notice 行） | 用户块 `buildUserMessage` 形（label + 时间）；助手块 + 嵌套工具卡（`.tool-call` 在 `.message.assistant` 内）；`❯ ThinCoder:` 恰一次/回合；notice = 灰条自持行 |
| N70 | 正常 | 活流含 `turn`/`usage` 帧（假流桩） | 状态行逐项落位（轮次 ∥ `↑N ↓N` ∥ `hit N%` ∥ `context N%`——快照件源；未收录 ⇒ 零段 ∥ 工具名（call→result 对）∥ 静默段（阈值））；`end` ⇒ `durationMs` 冻结 + 重读 |
| B67 | 边界 | 在途提交（队列）∥ 队满（8）∥ `end` 收口 ∥ Ctrl+I | 待发泡 + `queued.pending` 标；队满 ⇒ `input.slotFull` toast；`end` ⇒ 重读 + 队首发出（新回合）；Ctrl+I ⇒ 中止 + 入队首 |
| B68 | 边界 | 斜径三形（`/model` ∥ `/new` ∥ `/help`）∥ 未知 `/x` ∥ 带参 `/model x` | 前三条 = 零 POST（菜单/弹窗/行集）；未知 ⇒ `slash.unknown` toast + 文本保留；带参 ⇒ `slash.args` toast |
| E52 | 错误 | 附件拒形逐键（核件 toast）∥ 图片 + 非视觉模型（服务端 400） | 核件 toast 逐键（`composer.attach.*`/`paste.unsupportedFormat`——词表在场）；400 就地人话 + 草稿/附件保留 |
| E53 | 错误 | 发送失败（流前错误）∥ 换模型 400（模型不在册） | 就地人话（服务端报文直呈——不吞）；草稿零清；会话模型零变 |
| N72 | 正常 | 装配 `#/admin/chat`（模型行含档位——假 providers 载荷）∥ 点 `#reasoning-btn` ∥ 点档 `high` | 钮解隐藏（`display` 非 none）；下拉 = 该模型枚举逐档 + 当刻档 ✓（核件面）；点选 ⇒ `PATCH …/:id { reasoning: "high" }` 恰一条 + 钮字 = 核词面 `reasoning.high`；推送携 `prefs.reasoning` |
| B70 | 边界 | 切会话（两会话各持档位）∥ 换模型 ∥ 无档模型（枚举空） | 切会话 ⇒ 推送回读 ⇒ 钮字随会话档位（各自记住）；换模型 ⇒ PATCH 回执 `reasoning: null` + 钮回 `—`（中性）；无档模型 ⇒ 钮显 `reasoning.off` + 菜单「不支持推理／关闭（不支持）」+ 零 `selectReasoning` |
| E55 | 错误 | 档位写失败（400——表外值 ∥ 服务端拒） | 就地人话（`ctx.fail`——服务端报文直呈）；钮面显示面重派生（`pushModels` 回当刻会话档位——零假选中）；会话档位零变 |

## 5. 边界（本面不做面）

- 管理面 chat 渲染面不做项（理由逐项 = 本档 §2.1 对齐集）：思考块（帧/落库面无 reasoning 文本通道——加字段 = 后端面另轮）∥ diff 块（工具面无文件编辑族）∥ 会话内搜索（浏览器原生 Ctrl+F 已覆盖）∥ 审批/问询/计划/subagent 卡（无人值守裁剪——面无源）∥ 代码块复制钮（核件自带钮——安全上下文依赖，http 内网面点击无效＝在册余项，TLS/公网化后可接）；核件只读消费（不 fork/不改名/不覆写核件语义）；核包不入 registry（`private`——永不发布）。
- 本批（chat-shell-align）不做面：会话删除/重命名（全文 = `agent/ADMIN-AGENT.md` §10）∥ **模式位/设置钮的功能补齐**（无源 = 隐藏，不造机制——推理钮经 KD-SV-111 出列）∥ 图片文件面（缩略图/下载/文件存储——dataURL 随行存，零文件面）∥ 跨会话并发/多标签同步（未裁——不发明）。
- 本批（console-reasoning-levels）不做面：状态行 `✦reasoning` 段（口径④——`agent/ADMIN-AGENT.md` §10 同拍）∥ 档位/模型清单的**编辑**（只读消费核件单源）∥ 逐条覆写（VSC per-message `reasoning` 参——控制台恒会话级）∥ 其余无源钮（五枚）∥ 核件档位呈现改写（无档面文案 = 核件哨兵逐字——要改属核面另裁）。

## 6. 上抛/余项

- **① 需求档回笔（主 agent 笔）——已闭合**（2026-10-11：功能点 41 ∥ AC-41 入册——`docs/server/requirements/PROJECT.md` :225/:230；该档变更记录 :565「R60① 闭合」）。
- **② 随正件（父侧/实施轮——以当刻盘面实读为准）**：`views-chat.mjs` 拆档（新档入档目链——单源 = `webui/WEBUI.md` §1）∥ `2026-10-11-admin-agent-chat-ui.test.mjs` 静态面腿上量随正（见 `webui/WEBUI.md` §1 链）+ 类名闭合腿随正（新类名族）——现读 669 行（净变 ≤±50）
  ∥ `2026-10-11-console-chat-align.test.mjs` 两腿收正——取件面白名单腿（本批新取件增列 `thincoder-render-core/flow/block.mjs` ∥ `thincoder-render-core/composer/panel.mjs`）∥ 「零 composer/reasoning 引用」口径（现读 450 行；净变 ≤±20；**本体零触**——腿面收正随实施轮）∥ `style.css` 五钮隐藏规则 + 别名块（AC-19 canon 腿随正——见 `webui/STYLE.md`）；
  门禁件数断言（本批批内件入链——以实施当刻盘面实读为准）∥ `i18n-{zh,en}-admin` 行账（`webui/ADMIN.md` §3）。
- **③ 披露（不阻塞）**：图片随消息行存 dataURL（≤15MB/图 ∥ 30MB/回合——核阀单源；详情响应仅 `imageCount` 零下发）——库体量口径在册；核件样式自带过渡/动画（单源零触——控制台自有档零动画不变）∥ 无源钮隐藏五枚（逐条实证 = 本档 §2.1③④）∥ `interrupt` 折法（中止+入队首——无注入通道）∥ 控制台零 CSP 头（沿现盘）。
- **④ 部署收尾（父侧）**：镜像重建 + 浏览器实走（四轴走查清单——批档 §2）——ECS 断点。
- **⑤ 本批（console-reasoning-levels）交付项与披露**（机制面行账/验收 = `agent/ADMIN-AGENT.md` §13；本档只登控制台面）：
  - **随正件（测试链）**：结构版本断言 **11 件**（各一行 `SCHEMA_VERSION === 15` ⇒ `16`——数字就地收正 ⇒ 行数 ±0；逐件现读 = `agent/ADMIN-AGENT.md` §13 R61①）+ `2026-10-11-chat-shell-align.test.mjs:791`（隐藏腿六 id ⇒ 五 id）∥ `:807`（零悬停规则扫描名单）+ `2026-10-11-admin-agent-chat.test.mjs:640`（`agent_chats` 列面五列 ⇒ 六列）——测试链件数 **56 ⇒ 57**（本批批内件入链）。
  - **披露（不阻塞）**：① `@thincoder/core` 在**本开发机未装**（`thincoder-server/node_modules` 无该包——vscode/desktop/cli 均为仓内 junction）⇒ 开发/测试态档位面退中性（`modelReasoning = {}` + 一条警告）；生产镜像内核为声明依赖（`^0.10.4`——装包径），档位面照常；若镜像真缺核 ⇒ admin chat 回合本就不可用（同源失败，非本批引入）。
    **② 路由形模型名**（含 `/`——router 形）：核载荷门静默不发 `reasoning_effort`（VSC/桌面同态）——控制台不另立过滤（只读消费核单源）。③ `views-chat.mjs` 本批后 ≈**498**（近 500 软线；硬限 800 未越）。

## 变更记录

- 2026-10-11（**server-doc-split 批 · 域内拆分（迁移）· eng-designer**——承批档 `docs/batches/2026-10-11-server-doc-split.md` §2）：本档自 `webui/WEBUI.md` §2.10 及三表归位行逐字迁入（零语义）；文内 § 引用改指（§2.2→`webui/I18N.md` §2.1 ∥ §2.3④→`webui/READINGS.md` §2.1④ ∥ §6→本档 §4 等）；AC 行内档目链去重 ⇒ 单源句（`webui/WEBUI.md` §1）；全局键数链删（设计口径——机检断言承载）；超宽行仅拆行（:144/:587/:591 母行）；原址保位 stub 在 `webui/WEBUI.md`。**产品码零触。**
- 2026-10-11（**chat-shell-align 批 · 设计轮 · eng-designer**——承批档 `docs/batches/2026-10-11-chat-shell-align.md` §1 · 台账 #1292；用户 2026-10-11 21:55 裁「全套 ∥ 补后端一件不藏 ∥ VSC 式」；功能点 41 ∥ AC-41）：§1 增 KD-SV-106（四轴对齐基准）；§2.1 四轴重写（布局/消息形态/输入区全件/状态行——含端差异表六条 + 段表 ⊆ 有源 + 帧面加性扩展指针）+ 对齐集⑨翻做 + 壳面归属收正 + 取数/notice 五值/不做面随正；§3 文件账（`views-chat.mjs` ≈330 ∥ 新档 `views-chat-composer.mjs` ≈300 ∥ 两 i18n core 14 ⇒ ≈62）+ 键族登记三条（核件词面扩登 + admin +9）；§4 增 AC-41 两行 + 壳面用例（N68–N70 ∥ B67/B68 ∥ E52/E53）；§5 不做面随正（composer/中止/换模型条目退场——D8）；§6 四件上抛（需求档回笔 ∥ 随正件 ∥ 披露 ∥ 部署）。同源随动 = `agent/ADMIN-AGENT.md` §6/§7/§8/§9/§10/§11/§13 ∥ `gateway/API.md` §1/§2.8/§4/§5/§7/§8 ∥ `webui/WEBUI.md` §1/§5/§6/§7 ∥ `webui/STYLE.md` §2.1/§3/§5 ∥ `design/PROJECT.md` §4/§7/§9。**产品码零触（设计轮）。**
- 2026-10-11（**chat-shell-align 批 · 设计评审轮 1 修正（fix 轮）· eng-designer**——承批档 `docs/batches/2026-10-11-chat-shell-align.md` §3 轮次 1 之 1/3/4/5/7/8/9；父侧受理全单）：§4 旧 console-chat-align 验收行不做项收紧（⑥⑦⑧⑩⑪——去 composer/reasoning 字样）∥ §6② 随正件补两件（`…-console-chat-align.test.mjs` 两腿收正口径 ∥ 两测试件现读行数 + 增量注）∥ §6① 需求档回笔标闭合（D8 删待办形）∥ §3 拆档缘由收正（≈630——越 500 软线、未越 800 硬限）∥ §2.1 文案行明写 `↑N ↓N` 段零键（纯符号 + `fmtK`）+ `nav.page.admin.chat` 既有键归属 ∥ §2.1③ 增「不藏」射程读法（四件闭合集 ∥ 其余无源钮收窄）∥ §2.1 对齐集⑨删修订式标记。**零新语义**（评审发现直接导出项）。
- 2026-10-12（**console-reasoning-levels 批 · 设计轮 · eng-designer**——承批档 `docs/batches/2026-10-12-console-reasoning-levels.md` §1 · 台账 #1303；用户 2026-10-12 11:45 走查 + 11:46 口径四条「行」核准；功能点 42 ∥ AC-42）：§1 增 KD-SV-111（三段补齐：源 ∥ 线 ∥ 界面——核件单源）；§2.1③ 收窄改五枚（`#reasoning-btn` 出列——D8）∥ 注入口桥 `selectReasoning` 接 PATCH ∥ 「不藏」闭合集 +思考档位 ∥ 端差异表④随正 ∥ 新增 ⑤ 思考档位（源/线/界面/口径四条 + 无档模型中性面）；§3 文件账实读复读（`views-chat.mjs` **488** ⇒ ≈498 ∥ `views-chat-composer.mjs` **308** ⇒ ≈318）+ 面小计复读 + 本批随正件段；§4 增 AC-42 两行 + 壳面用例（N72 ∥ B70 ∥ E55）；§5 不做面随正（模式位/设置钮补白 + 本批不做面行）∥ 渲染面不做项去「推理」词（D8）；§6③ 六枚 ⇒ 五枚 + 新增 ⑤ 本批交付项与披露（测试链随正 11+2 件 ∥ 核缺位退化 ∥ 路由形名字 ∥ 软线）。同源随动 = `agent/ADMIN-AGENT.md` §6/§7/§8/§9/§10/§11.4/§13 ∥ `gateway/API.md` §2.2/§2.8/§4/§8/变更记录 ∥ `store/STORE.md` §1–§4 ∥ `design/PROJECT.md` §4。**产品码零触（设计轮）。**
- 2026-10-12（**console-reasoning-levels 批 · 设计评审轮 1 修正（fix 轮）· eng-designer**——承批档 `docs/batches/2026-10-12-console-reasoning-levels.md` §3 轮次 1 之 1–7；父侧受理全单）：§2.1⑥/§5 思考块句补「文本」限定词（无 reasoning 文本通道——与 `agent/ADMIN-AGENT.md` §11.1 同拍）∥ §2.1⑤ 去旧态括注（恒 `[]` 面退役）+ 值域句补别名解析同判（对外标识解上游真名）∥ §4 AC-41 两行六钮/六 id ⇒ 五钮/五 id（与 §2.1③⑤ 现口径收齐）+ AC-42 行去旧态括注 ∥ §3 面小计复算收平（+≈22 ⇒ +≈20 = 分项和；≈955 ⇒ ≈953）∥ §6② `style.css` 六钮 ⇒ 五钮 ∥ §6⑤ 测试链行补「数字就地收正 ⇒ 行数 ±0」+ 逐件现读回指（`agent/ADMIN-AGENT.md` §13 R61①）。**零新语义**（评审发现直接导出项）。
- 2026-10-12（**console-reasoning-levels 批 · 落地后回填 · 主 agent 直接执行 · 可 revert**）：§4 `views-chat.mjs` 行账实读回填（≈498 ⇒ **实 500**——恰贴软线；拆档预案在案）。
