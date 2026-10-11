# 2026-10-11 · console-chat-align
> 六段 append-only，一段一作者：§1 讨论（主 agent）· §2 批次任务与设计（eng-designer）· §3 设计评审（评审子代理）· §4 用户批准（主 agent）· §5 实施记录（eng-coder）· §6 验证与收口（父代理）。
> 编制：主 agent · 2026-10-11 · 来源 = 用户 2026-10-11 18:23（「我们已经把会话这件事做过无数遍……为什么每次再做的时候你都会别出心裁给我做出一个完全不一样的东西来？」）+ 18:30「改」（本批授权；并令「在 ecs 上边改边测，改到按照人类使用的标准感觉舒适为止」）——管理面 chat 对齐既有会话面批（台账 #1282）。
> 台账 = #1282（server · 归批）。前情 = docs/batches/2026-10-11-admin-agent-chat.md §6（已收口 2026-10-11）。
## §1 讨论（主 agent）
**状态行**：🔄 进行中（…）
<§1 模板占位：本批条目 / 关键判据 / 授权口径>

### 2026-10-11 18:3x · 立项（父侧）

- **授权**：用户 18:23 指出（「管理面 chat 做偏了」——原话见台账 #1282）+ 18:30「改」（本批放行）+ 同刻令：「按照前一个任务一样原则，在 ECS 上边改边测，改到按照人类使用的标准感觉舒适为止。」
- **交付目标**：管理面 chat（`#/admin/chat`）**对齐既有会话面**——基准 = `thincoder-render-core/`（package.json 自述 host-agnostic，VSC webview + 桌面 renderer 在用：md ∥ highlight ∥ diff ∥ tool-summary ∥ flow（live-md/reasoning/tool-card/stream 拼接）∥ cards ∥ composer ∥ scroll ∥ search）；+「新面先查可复用资产」纪律句入档（防第五套 chat）。
- **来历（如实）**：现态 = `thincoder-server/public/views-chat.mjs`（**399 行**、纯节点 + textContent——零 markdown ∥ 零代码高亮 ∥ 零 diff ∥ 零工具卡 ∥ 零思考块 ∥ 零会话内搜索）∥ 控制台 `public/**` 对 render-core **零引用**（grep 零命中）。**父侧流程漏项**：设计轮（WEBUI §2.10 ∥ ADMIN-AGENT §11）只写「页形」，未问「既有会话面如何、要不要复用」；评审/验收只查「设计写的做到没」——无「对齐/复用」判据；父侧验收只走「能建会话/能发/流式/落库」。
- **关键考古（父侧已核）**：控制台「**不拼 HTML 串**」纪律（`webui/WEBUI.md:595`）**非用户原话**——源自 2026-10-06 首批设计补轮自加（`docs/batches/2026-10-06-server-gateway.md:365`），与用户当日原话「vanilla 静态文件（零框架 ∥ 零构建 ∥ 零外链）」不同；且**与其引的先例相抵**——被引为「vanilla 先例」的 webview 正是「vanilla + `innerHTML = md(...)` + `escHtml` 转义」（`thincoder-vscode/webview/streaming.js:143` ∥ `ui.js:18`）⇒ 「vanilla」不排斥渲 HTML。**本条随本批收窄**（保住用户原话半句；渲染面重裁）。
- **边界（禁止范围）**：后端（会话/回合/流式/审计/落库）**零推翻**；产品码面 = 仅控制台前端（`thincoder-server/public/**` + 必要静态服务面）；不改 CLI/VSC/桌面三端；不引入框架 ∥ 构建 ∥ 外部资源（用户 08:09 原话半句保住）；render-core 复用形（含打包/serving、CSP/转义处置）= 设计轮定，**不得以「不拼 HTML 串」自加句拒复用**（该句随本批收窄）。
- **设计第一问（设计轮必答）**：① 复用形（render-core 如何被控制台消费——serving ∥ 打包 ∥ 转义/CSP 摆法；webview 先例逐处对照）∥ ② 对齐集（按运维用途裁：md/代码块/diff ∥ 工具卡 ∥ 思考块 ∥ 流式手感 ∥ 会话内搜索 ∥ 滚动行为——逐项给「做/不做＋理由」）∥ ③ 纪律句落点与措辞（「新会话面/新呈现面先查可复用资产」）∥ ④ **ECS 迭代验收口径**（每落一轮部署到 `.5`，用户在浏览器直接看；「人类使用标准感觉舒适」= 收口判据）。
- **验收环境**：`.5` 控制台 `http://10.0.0.5:8787`（部署 = push ⇒ 箱上 pull ⇒ 重建镜像，逐轮）；用面 = 管理面 chat（会话创建/发送/流式/工具行/长对话）。

## §2 批次任务与设计（eng-designer）
**状态行**：（eng-designer 写入时更新）
<§2 模板占位：本批条目（覆盖） / 设计档落点 / 机制设计 / 受影响文件与测试面 / 验收对照 / 关键决策 / 上抛项>

**批次任务与设计（eng-designer · 设计轮 · 2026-10-11）**

**批**：console-chat-align（台账 #1282）；**来源** = 用户 18:23（管理面 chat 是最薄的第四套——「会话这件事做过无数遍……为什么每次再做都会别出心裁做一套新的」）→ 18:30「改」+「ECS 上边改边测，改到人类使用标准感觉舒适为止」。

**2.1 覆盖条目（逐条 → 落点）**

| # | 条目 | 落点（设计档） |
|---|---|---|
| 1 | **复用形**（serving ∥ 打包 ∥ 复制 ∥ CSP ∥ 转义——逐处对照 webview/桌面） | `webui/WEBUI.md` §2.10「复用形」块：取件 = 同源第二根 `/rc/*`（→ 核包目录；桌面 `app://` 双根逐式同形）∥ 包声明 = `file:` link（VSC/桌面同式）∥ 打包 = 镜像**显式双装**（设计轮实测：tarball 安装径下 `file:` 依赖被静默跳过 ⇒ 必须双装）∥ 转义/CSP 三列对照表（VSC ∥ 桌面 ∥ 控制台） |
| 2 | **对齐集逐项「做/不做 ＋ 理由」** | §2.10 对齐集：① md ② 代码块高亮 ③ 工具卡（核三件）④ 流式（`createStreamRenderer` + `paintLiveMd` 增量）⑤ 滚动（核 `scroll.*`——上滚不夺位）= **做**；⑥ 思考块（帧/落库面无 reasoning 通道——无源）⑦ diff（工具面无文件编辑族）⑧ 会话内搜索（浏览器原生 Ctrl+F 已覆盖）⑨ composer 全件（无语面）⑩ 审批/问询/计划/subagent 卡（无人值守裁剪——面无源）⑪ 代码块复制钮（安全上下文依赖——http 内网即装即哑）= **不做** |
| 3 | **纪律句**「新会话面/新呈现面先查可复用资产（先查再造）」落点与措辞 | §7 **KD-SV-101**（含四栏：决策 ∥ 理由（用户原话）∥ 被否候选）+ §2.10 首句；**需求档入册 = 上抛**（`design/PROJECT.md` §9 R58①——主 agent 笔） |
| 4 | **ECS 走查清单（可核）** | 下节 2.4（收口判据 = 人类使用标准「舒适」） |
| 5 | **§3 转义句收窄**（「不拼 HTML 串」与被引先例相抵） | §3 渲染与转义行：自有节点 = `h`/`textContent`（零**手拼**串）∥ 模型/用户/工具文本面 = 核 `md()` 单源（注入点唯一）；自加句退场；**用户 08:09 原话半句（零框架 ∥ 零构建 ∥ 零外部资源）不动** |

**2.2 设计要点（机制一句话）**

- 渲染单源 = `thincoder-render-core`（只读消费：不 fork ∥ 不改名 ∥ 端侧不覆写）；控制台自持 = 壳 ∥ 文案 ∥ 取数 ∥ 布局（核档口径「shell = 宿主面」）。
- 核件词面 = 新部件 `i18n-{zh,en}-core.mjs`（键 = 核件原名；值逐字同 VSC locales；本批实填 5 键 `tool.*`）；注册 = 装配期 `setStrings` 一次。
- 档目链：**37 ∥ 38 ⇒ 39 ∥ 40**（本批 +2；余面批 ⇒ 41 ∥ 42）；JS 链 34 ⇒ 36。`style.css` 类名闭合域随正（⊆ 档面字面类 ∪ 核件发射类清单）。

**2.3 受影响文件（实施面——预算）**

| 文件 | 现值 ⇒ 预期 | 变更 |
|---|---|---|
| `thincoder-server/src/webui/static.mjs` | 78 ⇒ ≈110 | 第二根 `/rc/*`（根表 ∥ 前缀序 ∥ 各根逃逸门） |
| `thincoder-server/public/views-chat.mjs` | 399 ⇒ ≈430 | 核件消费接线（替自持渲染/工具行/追加/滚动） |
| `thincoder-server/public/style.css` | 267 ⇒ ≈310 | 核类名族样式（码面/`pre.code-block`/`.tk-*`/工具卡）——零新变量 ∥ 零新悬停规则 |
| `thincoder-server/public/i18n-zh-core.mjs` / `-en-core.mjs` | 拟新增 ≈24/档 | 核件词面 5 键 |
| `thincoder-server/package.json` | +1 行 | `"@thincoder/render-core": "file:../thincoder-render-core"` |
| `thincoder-server/Dockerfile` + `docs/TEST-ENV-ECS.md` §3 | 行级 ±1 | 构建上下文 ⇒ 仓根 + 双包装（**父侧笔面**——R58②） |
| `docs/batches/2026-10-11-console-chat-align.test.mjs` | 实施轮写 | 批内件（不入仓套件） |

设计档面（本轮已落）：`webui/WEBUI.md` §1 ∥ §2.2 ∥ §2.10 ∥ §3 ∥ §5 ∥ §6 ∥ §7 ∥ §8 ∥ 变更记录；`agent/ADMIN-AGENT.md` §11.1 ∥ 变更记录；`design/PROJECT.md` §2.1 ∥ §4 ∥ §6 ∥ §9 R58 ∥ 变更记录。**产品码零触。**

**2.4 验收（机检 + ECS 走查）**

机检 = `webui/WEBUI.md` §6 本批行（10 项：第二根在册 ∥ 档面零相对径/零拷贝 ∥ 对齐集 ①–⑤ ∥ 不做项零引用 ∥ 转义单源 ∥ i18n 部件 + `setStrings` ∥ 类名闭合域 ∥ 零新变量/悬停 ∥ 镜像内双装冒烟）。

ECS 走查清单（每轮部署 = push ⇒ 箱上 `pull --ff-only` ⇒ 重建镜像 ⇒ `compose up -d --force-recreate`；用户在 `http://10.0.0.5:8787` 实看）：

1. 进 `#/admin/chat` 非白屏（F12 零 404 ∥ 零 CSP 报错——`/rc/*` 可取件）。
2. 新建会话 ⇒ 发一条（带列表/表格/代码的内容）：文字流式逐字出现（不跳 ∥ 不闪）；markdown 成渲染（不再是纯文本）。
3. 代码块 = 高亮在场 + 可选中复制（复制钮不做——如实）。
4. 工具卡：调用中（名 + 参数摘要）⇒ 完成后结果摘要；失败 ⇒ 红标 + 人话。
5. 流式期上滚阅读 ⇒ 不被夺位；回底 ⇒ 恢复跟随。
6. 刷新重开会话 ⇒ 历史重读渲染形与流式同形。
7. 切 en ⇒ 工具卡/按钮文案随语言（核件词面）；零 CJK 漏字。
8. 断连/停服 ⇒ 就地人话（不白屏 ∥ 不静默）；恢复后重读照常。
9. 窄屏（~900px）⇒ 阅读不挤压（气泡/表格横滚）。
10. 同一段 markdown 与 VSC/桌面互看 ⇒ 渲染一致（同核）。

判据：逐项「通过 / 不通过 + 一句人话」写回批档 §6（收口轮）；不通过 ⇒ 当轮修掉再走同清单。

**2.5 上抛与随拍（父侧/需求面）**

- **R58②（部署链一行）** = 父侧笔面：`docs/TEST-ENV-ECS.md` §3 + `Dockerfile`——未落则 `.5` 镜像内核包不可解析（页面白屏）⇒ 实施轮前置。
- **R58①** 需求档回笔建议：纪律句 + AC 行 + 档目链 39 ∥ 40（主 agent 笔）。
- **R58③** 随拍件：档目断言件（37 ∥ 38 ⇒ 39 ∥ 40）+ 类名闭合域随正（AC-19 canon）。
- **R58④** 披露四条：核件内联状态色（不破 AC-19 canon——扫描面 = `style.css`）∥ 现零 CSP 头（不改）∥ 搜索/复制钮不做 ∥ §1 JS 计数链自陈 34 而 `.mjs` 实读 35（待核——非本批面）。
- **findings（列报）**：① §1 JS 计数链陈值 34 vs 实读 35（同上）；② `WEBUI.md` 成员面行档目链原陈「余面批后 38 ∥ 39」与各行 39 ∥ 40 两说 ⇒ 本笔按 41 ∥ 42 收齐（列报）；③ `PROJECT.md` §9 R58 排在 R57 之前（行序不便——本笔已列报）；④ §2.1 webui 行档目链缺 sandbox-image-sources 一步（本笔补齐——列报）。

### 2.6 设计评审轮 1 修正（fix 轮）——逐号落点（承 §3 轮次 1 之 1–12；父侧裁：逐号全部采纳、点修不扩面；**零新语义**）

**改动 file:line（以落笔当刻实读为准）**：

| 号 | 落点 | 一句话 |
|---|---|---|
| 🔴1 | `webui/WEBUI.md` §2.10 取件条新子条「node 侧同缝」（:591）+ §6 本批行（:721）∥ `design/PROJECT.md` §9 R58③（:609） | 定形 node 侧 `/rc/` 取件缝：新档 `thincoder-server/test/rc-resolve.mjs`（`/rc/<子路径>` ⇒ 核包根——沿桌面 `thincoder-desktop/test/rc-resolve.mjs` 先例：`createRequire` 包名解析 + `registerHooks`）+ `prepublishOnly` 链行加 `--import ./thincoder-server/test/rc-resolve.mjs` 预载（单行内改、件数不变）；**既有件随正 = `docs/batches/2026-10-11-admin-agent-chat-ui.test.mjs`**（链内——`load()` 页面档：缝承零改 + 静态面腿上量随正 `[38, 37]` ⇒ `[40, 39]`）；批内件可执行口径 = 自仓根 `node --import ./thincoder-server/test/rc-resolve.mjs --test docs/batches/2026-10-11-console-chat-align.test.mjs` |
| 🟡2 | `webui/WEBUI.md` §2.10 转义/CSP 表 CSP 格（:605）∥ `design/PROJECT.md` §9 R58④（:609） | 「零内联」收窄为「**控制台自有档**零内联样式/脚本」（盘面实核：`public/**` 零 `.style.`／`style=` 命中）+ 核件内联状态色真发（CSSOM `flow/tool-card.mjs:111`/`:114`；回读径 `:162` ∥ `flow/tool-card-restore.mjs:44`）⇒ 后加 CSP 而无 `style` 内联豁免则回读卡状态色落空（桌面 `style-src 'self'` 同态——`thincoder-desktop/renderer/index.html:7`） |
| 🟡3 | `design/PROJECT.md` §6 本批块（:493–494）+ 板级行（:353）+ R58③；`webui/WEBUI.md` §6 本批行（:721） | 本批批内件**入链**：`prepublishOnly` **51 ⇒ 52**（盘面实读 51——sandbox-pull-by-source 件已入链；「±0／零门禁件」陈句删）+ 链行 `--import` 预载；板级行链 **+1 ⇒ 52**；门禁件数断言件七件（51 ⇒ 52）与文档链两处（`ops/OPS.md` §5.1 ∥ 本档 §6 板级行）同拍登记 |
| 🟡4 | `webui/WEBUI.md` §2.2 核件词面外拆条（:151） | 域界改述「首段 ∈ 核件 `t()` 发射段集——**本批消费面 ∪ 预留**（现读 ≈21 段，枚举在案）」+ 机检 = 批内件扫核件 `t("…")` 字面量取首段集、断言本部件键首段 ⊆ 该集（集随实读，不硬编码——免硬编码漂移） |
| 🟡5 | `webui/WEBUI.md` §5 两 i18n 门面行（:667/:674）+ §2.10 Dockerfile 行（:595） | 两门面补「实读 14（2026-10-11 现读）⇒ ≈15（+1 import——展开合体结构不变）」；Dockerfile 补「**实读 39 ⇒ 增量以实施实读回填**；受影响档在册」 |
| 🟡6 | `webui/WEBUI.md` §2.10 部署随正句（:596–597）∥ `design/PROJECT.md` §6 本批块（:494）+ R58②（:609） | 随正清单补 `thincoder-server/README.md`（`:16`/`:93` 两处构建上下文行）∥ 仓根 `.dockerignore`（新建——上下文迁仓根后 server 侧件不复读取）∥ `ops/OPS.md` §5.1；**npm 装机径**显式声明 = 核包投递随发布面轮（核包 `private` 不入 registry）+ 装机判据 = 缺包 fail-loud |
| 🟡7 | `webui/WEBUI.md` §3 渲染转义行（:627） | 删两退场式分句（「原…自加句退场…」「用户 08:09 原话半句…不动」——历史 = 变更记录；规范面留当前口径句） |
| 🔵8 | `webui/WEBUI.md` §2.2 键族登记条（:144）+ §6 本批行（:721） | 「值逐字同 VSC locales」⇒ **批内件断言：与 `thincoder-vscode/locales/{zh,en}.json` 逐键相等**（5 键；漂移即红——对齐可机检） |
| 🔵9 | `webui/WEBUI.md` §2.10 呈现面条（:587）+ §6 本批行（:721） | `setStrings` 注册改述「**装配期 + 每次语言切换重注册**」（核 `_strings` 模块级态——`thincoder-render-core/i18n.mjs:12-20`；不重注册 ⇒ 切换后核件发射仍取旧表）；「注册一次」删 |
| 🔵10 | `webui/WEBUI.md` §6 十七行（:687–719）+ 变更记录（:874）+ §2.2 两处（:156/:691）∥ `design/PROJECT.md` §2.1（:31）+ 变更记录（:703） | 「（现盘面）」挂位收正 ⇒ **37 ∥ 38（现盘面）⇒ 39 ∥ 40（本批落定后）**（与需求档两行同拍）；i18n 部件十 ⇒ **十二**（两处） |
| 🔵11 | `design/PROJECT.md` §2.3 逐面句（:73） | 补两核包/两声明形之别：自持句注 `@thincoder/core`；控制台渲染面 = 引 `@thincoder/render-core`（`file:` 声明形 ∥ `private` 永不发布——与钉版本形之别；「核」两指全文以包名别之） |
| 🔵12 | `webui/WEBUI.md` §2.10 缺包处置句（:598）∥ `design/PROJECT.md` R58②（:609） | 缺 `@thincoder/render-core` ⇒ **启动 fail-loud**（沿桌面 `thincoder-desktop/src/main/protocol.mjs:20` 先例；不静默白屏）+ 运行期 `/rc/*` 无档 ⇒ 404（不吞） |

**受影响文件标注随正（承 🟡5——§2.3 表收正）**：`thincoder-server/public/i18n-zh.mjs` ∥ `i18n-en.mjs` = 实读 **14**（2026-10-11 现读）**⇒ ≈15**（+1 import——展开合体结构不变）；`thincoder-server/Dockerfile` = 实读 **39** ⇒ 增量以实施实读回填（双包 COPY/pack 段）；新增缝件 `thincoder-server/test/rc-resolve.mjs`（非用例档——不入链 ∥ 不入 `files` 白名单）。

**随正件汇总（父侧落——以实施当刻盘面为准；R58②③ 在册）**：`thincoder-server/package.json`（`file:` 声明 ∥ `prepublishOnly` **51 ⇒ 52** ∥ 链行 `--import`）∥ 缝件新建 ∥ 档目断言件（37 ∥ 38 ⇒ **39 ∥ 40**——盘面实核 **16 档**，含 `-admin-agent-chat-ui.test.mjs`）∥ 门禁件数断言件七件（51 ⇒ 52）∥ 文档链 `ops/OPS.md` §5.1（链 **42 ⇒ 52**——沿批漂移）∥ 部署链四件套（`docs/TEST-ENV-ECS.md` §3 ∥ `Dockerfile` ∥ `README.md` 两行 ∥ 仓根 `.dockerignore`）。

**域外发现（报告——非本笔面）**：① `ops/OPS.md` §5.1 门禁链现读止于 **42**（自陈「2026-10-11 收口实读」而盘面实读 **51**）——沿批漂移（先批只随 `design/PROJECT.md` §6 板级行，OPS.md 未同拍）；已登记 R58②③（42 ⇒ 52 同拍收正）。② 「档目断言件」逐件名单在案为「九件」（`design/PROJECT.md` §6 注⑲/注⑳ 系），盘面实核 = **16 档**（先批自建「ui 件」未回填名单）——本批 R58③ 已记「盘面实核 16 档——以实施当刻为准」。

**设计侧三组数字（收正后——三链同拍）**：JS 链 35（现盘面）⇒ 37（本批 +2——i18n core 两部件）；档目 37 ∥ 38（现盘面）⇒ 39 ∥ 40（本批 +2）⇒ 41 ∥ 42（余面批）；`prepublishOnly` 链 51（盘面实读）⇒ 52（本批件入链）。

**同源随动**：`webui/WEBUI.md` §1/§2.2/§2.10/§3/§5/§6/变更记录 ∥ `design/PROJECT.md` §2.1/§2.3/§6/§9/变更记录。**产品码零触（fix 轮——仅设计档 + 本节）。**

## §3 设计评审（评审子代理）

### 轮次 1（评审子代理）

| # | Category | Severity | Issue | Suggestion |
|---|----------|----------|-------|------------|
| 1 | 可行性 ∥ 验收可执行性 | 🔴 | 取件形取「同源绝对径」——WEBUI.md:590「`import { md } from "/rc/md.mjs"`」，但四档未给 **node 侧解析缝**：控制台批内件/门禁以 `node --test docs/batches/*.test.mjs` 真 `import()` 页面档（`docs/batches/2026-10-11-admin-agent-chat-ui.test.mjs:30` `const load = (name) => import(pathToFileURL(join(PUBLIC_DIR, name)).href)` ＋ `:33` 顶层 await 载 `views-chat.mjs`，无兜），平 node 下 `/rc/*` 不可解析（先例自陈 = `thincoder-desktop/test/rc-resolve.mjs:6`「平 node 无该 origin ⇒ 本钩子把」——桌面侧靠 `--import` 预载钩子解）；该件在链内（`thincoder-server/package.json:13`）⇒ 本批一落地既有门禁件即红，WEBUI.md:717 所列批内件腿（①–⑤ 机检）亦不可跑；既有件随正清单与链条目两处均缺 | 定形 node 侧 `/rc/` 取件缝（沿桌面 `rc-resolve.mjs` 先例：解析钩子 ＋ `--import` 预载入口，或使页面档核件导入在 node 可解析），并把 `2026-10-11-admin-agent-chat-ui.test.mjs`（及任何 `import()` 页面档的件）列入随正件/受影响清单；验收行「批内件」的可执行口径同拍 |
| 2 | Document ownership ∥ 一致性 | 🟡 | §2.10 CSP 列自陈「核件 = 同源 `/rc/`，零内联样式/脚本」（WEBUI.md:601），与 §9 R58④ 披露「核件工具卡内含内联状态色（`#f14c4c`/`#4ec9b0`）」（design/PROJECT.md:609）相抵；实读核件在**本批消费径**内即发内联样式——`thincoder-render-core/flow/tool-card.mjs:162`（`renderToolHistory`——回读径，§2.10 ③ 明列消费）携 `style="color:#4ec9b0"`，`:111`/`:114` 走 CSSOM 写色，`flow/tool-card-restore.mjs:44` 同形；控制台自有件确为零内联（`thincoder-server/public/index.html`：仅 `<link>`/`<script src>`） | CSP 列括注收窄为「控制台自有档零内联样式/脚本」，并补核件内联色的后果句（后加 `default-src 'self'` 而不含 style 内联豁免 ⇒ 回读卡状态色落空——桌面先例同态：`thincoder-desktop/renderer/index.html:7` `style-src 'self'`） |
| 3 | 方法论 ∥ 计数 | 🟡 | 同段两说相抵：design/PROJECT.md:493「`prepublishOnly` 链 **±0**（本批零门禁件）」vs :494「批内件 ≈1 档（`docs/batches/2026-10-11-console-chat-align.test.mjs`——行数随实施）」；近批先例 = 批内件「均入 server 链」（design/PROJECT.md:471/:475/:486/:491 逐批 +1），且 :491 自载链值「**50 ⇒ 51**」（盘面实读链 = 50 件——`thincoder-server/package.json:13`） | 明写本批批内件入链与否并配平计数（50 ⇒ 51，或写明不入链理由），「零门禁件」措辞收齐 |
| 4 | 清晰度 ∥ 证据准确 | 🟡 | i18n core 部件域界自陈与实况不符——WEBUI.md:151「首段 ∈ {`tool`,`msg`,`status`,`search`,`error`,`sub`}——**与核件 `setStrings` 发射面同名单源**（机器可判）」；核件另发 `queued.pending`（`thincoder-render-core/flow/queued-mark.mjs:42`）∥ `perm.*`（`cards/permission.mjs:44`）∥ `model.*`（`composer/model-menu.mjs:96`）∥ `input.*`（`composer/panel.mjs:423`）∥ `task.*`/`panel.*`/`goal.*`（`cards/panel.mjs:34/:39/:47`）∥ `question.*`（`cards/question.mjs:54`）∥ `paste.*`/`composer.*`（`composer/attach.mjs:118/:131`）∥ `toolbar.*`/`auto.*`（`composer/controls.mjs:152-156`）∥ `reasoning.*`（`composer/model-menu.mjs:413`）∥ `workspace.*`/`slash.*`（`composer/panel.mjs:306/:375`）——「同名单源」按字面判将红 | 域界改述为「本批消费面 ∪ 预留」或补全集合（与 `setStrings` 发射面真集对齐），保留「机器可判」判据 |
| 5 | 受影响文件标注（判据 8） | 🟡 | 两 i18n 门面将改（WEBUI.md:151「门面 `i18n-{zh,en}.mjs` 各 +1 import」）但 §5 两行末值止于结构轮（WEBUI.md:663/:670「门面 ≈16」——`i18n-zh.mjs` 实读 14 行），无现值/增量；`thincoder-server/Dockerfile`（实读 39 行）随正（双包 COPY/pack——WEBUI.md:593）在 §5/§6 无行数/增量标注 | 两门面行补「实读 N ⇒ +1（import——结构不变）」；Dockerfile 补现值 + 增量（或明写「以实施实读回填」并登记为受影响档） |
| 6 | 需求覆盖 ∥ 部署面 | 🟡 | 需求 §2:8 分发两路中 npm 装机径（`npm i -g @thincoder/server`——`thincoder-server/README.md:13`/:83/:151）在本批新增的 `private` ＋ `file:` 依赖形下不可解析（核包不入 registry——WEBUI.md:592），设计只覆盖镜像径双装（WEBUI.md:593 ∥ design/PROJECT.md:494）；README 未入随正面（其两处「构建上下文」将失真：README.md:16「（构建上下文 = 本目录）」∥ :93「（构建上下文 = `thincoder-server/`…」）；上下文改仓根后 `thincoder-server/.dockerignore` 失效亦未列 | 把 npm 径核包投递与 README ∥ Dockerfile ∥ `.dockerignore` 三落点写入随正清单，或显式声明「npm 径随发布面轮」并给装机判据（避装机后 `/rc/*` 404 白屏面无声） |
| 7 | Doc hygiene | 🟡 | 纪律行残留退役式表述——WEBUI.md:623「原「不拼 HTML 串」自加句退场（非用户原话——2026-10-06 补轮自加，且与被引先例相抵：webview ∥ 桌面皆 `md()` 渲 HTML 径）；用户 08:09 原话半句（零框架 ∥ 零构建 ∥ 零外部资源）不动」；按在案纪律（修订式表述留规范面 ⇒ 删；历史归记录面）应删 | 删该两分句（历史已在变更记录 WEBUI.md:870「§3 渲染转义句收窄（「不拼 HTML 串」自加句退场——用户 08:09 原话半句不动）」），留下当前口径句 |
| 8 | 设计质量 ∥ 双源面 | 🔵 | 核件词面 5 键值「逐字同 VSC locales」（WEBUI.md:144）＝第二份载体（`thincoder-vscode/locales/zh.json:51-55` ∥ `en.json:51-55`）——VSC 侧改词即漂移，无判据 | 加一条批内件断言（与 VSC locales 逐键相等），或改述「词面口径对齐（差异允许）」并登记漂移面 |
| 9 | 清晰度 ∥ 交互面 | 🔵 | 验收行写「`setStrings` 注册一次」（WEBUI.md:717），核件 `_strings` 为模块级态（`thincoder-render-core/i18n.mjs:12-20`）；语言切换走 `rerender()`（§2.2）后核件发射文本仍取旧表 | 明写注册随语言切换随动（重注册点），或声明核件发射面文案不随切换 |
| 10 | Doc hygiene ∥ 数字 | 🔵 | 三处数字互抵：§1 JS 链「⇒ 三十五档（sandbox-image-sources 批 +1——现盘面）⇒ 三十七档」（WEBUI.md:20；盘面实读 35 个 `.mjs` ✓）vs 变更记录「JS 链 34 ⇒ **36**」（WEBUI.md:870）vs R58⑥「§1 静态面 JS 计数链自陈「三十四档」而现盘 `.mjs` 实读 35」（design/PROJECT.md:609）；另「（门面 + 十部件）」（WEBUI.md:156 ∥ :687）按本批应为十二部件；「（现盘面）」挂在 39 ∥ 40（WEBUI.md:683 ∥ requirements/PROJECT.md:229/:231）而两核件档自载「拟新增」（WEBUI.md:669/:676） | 三组数字逐处收正（或删已陈披露） |
| 11 | 跨档随动滞后 | 🔵 | design/PROJECT.md §2.3（与 core 的关系）未随动——webui 行仍载「控制台 = 自持（核里无该面）」（PROJECT.md:73），而本批控制台渲染面已从 `@thincoder/render-core` 引（`file:` 声明形——非 §2.3 所述「钉版本」形）；同档「核」一字两指（`@thincoder/core` ∥ 渲染核） | §2.3 补一句两核包与两声明形之别（零机制改） |
| 12 | 完整性 ∥ 运行期 | 🔵 | 第二根运行期解析与缺包处置未定形（桌面先例 = 包名解析 ＋「缺包 ⇒ 装载期 fail-loud」——`thincoder-desktop/src/main/protocol.mjs:20-21`）；设计仅把「不可解析 ⇒ 页面白屏」列为部署上抛（design/PROJECT.md:609 R58②） | 补一句缺包处置（启动 fail-loud ∥ 显式告警 ∥ `/rc/*` 404）沿桌面 fail-loud 先例，与 R58② 同拍 |

VERDICT: changes-required

计数：🔴×1 ∥ 🟡×6 ∥ 🔵×5（共 12）；🔴 = 第 1 行（node 侧 `/rc/` 取件缝缺失）——未解除前不发 token。

## §4 用户批准（主 agent）
## §5 实施记录（eng-coder）
## §6 验证与收口（父代理）
