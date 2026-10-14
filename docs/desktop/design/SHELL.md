# 桌面端（DESKTOP）· 宿主适配层

> 板块 = **桌面端宿主适配层**——三层进程与目录形态 · 宿主面职责（窗口 / 菜单 / 系统主题 · `app://` 供给 · 预载窄桥 · 启动自检）· 与核的接口面**七面** · 壳装配第三份。
> 需求侧 = 需求分卷（本域卷 = `docs/desktop/requirements/SHELL.md`——**D27 ∥ D31**；查卷口 = `docs/desktop/requirements/PROJECT.md` §4 **D 表索引**；功能点 ∥ 验收 ∥ 依赖面——**范围数随需求卷现文**）。
> 同部分相关档：总览 / 决策 / 受影响文件 / 验收 = `docs/desktop/design/PROJECT.md` · 发行 = `docs/desktop/design/PACKAGING.md` · 主 ↔ 渲染通道契约 = `docs/desktop/design/IPC.md` · 界面形态与交互 = `docs/desktop/design/UI.md` · 渲染面实现工艺 = `docs/desktop/design/RENDERER.md`。
> 域档（文档体系重组批 · 2026-10-02 增）：会话域 = `docs/desktop/design/SESSIONS.md` · 设置域 = `docs/desktop/design/SETTINGS.md` · 菜单体系 = `docs/desktop/design/MENU.md` · 对话流 = `docs/desktop/design/CHAT.md` · 输入区 = `docs/desktop/design/COMPOSER.md`；
> 续：活动池与消化面 = `docs/desktop/design/ACTIVITY.md` · 端到端测试基建 = `docs/desktop/design/E2E-TESTING.md` · web 快筛 = `docs/desktop/design/WEB-QUICKCHECK.md`。
> 核机制面（agent 主循环 / 工具 / 记忆 / 配置 / 会话）**只住核**——本档只做**接入面**设计，不重述核语义（单一权威源）。
> 文档体系落点（第四部分）判别与命名 = `docs/core/design/DOC-SYSTEM.md`；全仓模块地图与硬约束 = `docs/core/design/ARCHITECTURE.md`。
> 建档：2026-09-25（桌面端设计批 1 · 分档轮）；本档坐标 = as-of 2026-09-25 实核（仓根 = `thincoder/`）。

## 1. 进程与目录形态

```text
thincoder-desktop/                  ← 本端产品包
├── package.json                    ← 包定性：`main` 入口 + script 五条（`start` / `test` / `package` / `postpackage` / `quickcheck`（渲染面 web 快筛——非集成测试树）——单源 `docs/desktop/design/PROJECT.md` §5）+ devDeps（electron · electron-builder · `playwright-core`——E2E 驱动 · 测试 + web 快筛驱动）
├── electron-builder.yml            ← 三平台产物声明（拟新增）
├── .gitignore                      ← 忽略 `thincoder-desktop/test/artifacts/`（运行期产物不进 git——单源 = `docs/desktop/design/E2E-TESTING.md` KD-10）
├── src/main/                       ← 主进程（Node / ESM——唯一持 Node 能力者）
│   ├── main.mjs                    ← 入口：单实例锁 → 协议注册 → 窗口前恢复（重启自动重开——`docs/desktop/design/SESSIONS.md` §1 KD-56）→ 窗口 · 启动自检（同档 §2 KD-7）；ready 前初始化一律 await
│   ├── host-floor.mjs              ← 宿主下限谓词 + `node:sqlite` 探针（`main.mjs` 同面拆分 · 零 `electron` 导入的叶子——预算 = 本档 §5.1）
│   ├── window.mjs                  ← BrowserWindow 生命周期 / 菜单 / 系统主题 / 窗口态（**复制面对齐批**：右键编辑菜单落子——`context-menu` 事件 ⇒ `Menu.popup`；**窗口重启最大化批（2026-09-30）**：启动即最大化——隐建 ⇒ `maximize` ⇒ `show`）
│   ├── context-menu.mjs            ← 右键编辑菜单（**复制面对齐批**新档）：`contextMenuLabels(locale)` + `contextMenuTemplate(params, labels)` 两纯函数（零 `electron` ⇒ 平 node 直测；条目集 / 文案面单源 = `docs/desktop/design/UI.md` §1「本批注（复制面对齐 VSC · 2026-09-29）」）
│   ├── menu-words.mjs              ← 应用菜单词表（#533 建；**菜单体系批扩至全菜单键集**——D36）：组名五 + 条目 + role 标签 + 主题/最近/关于词——zh/en 双值 + en 回落；零 `electron` ⇒ 平 node 直测
│   ├── app-menu.mjs                ← 应用菜单模板（**菜单体系批**新档 · D36）：`menuTemplate({ words, edit, recent, theme, onAction, onNative })` 纯函数——五组 ∥ 子菜单 ∥ 加速键 ∥ 主题勾选态（`checked`；`THEME_VALUES` 导出） ∥ 动作接缝（零 `electron` ⇒ 平 node 直测；单源 = `docs/desktop/design/MENU.md` §1 **KD-65**）
│   │                                  （`onNative(action)` = 宿主自办三项 `gc` ∥ `index` ∥ `about`——不经 `ev:menu`）
│   ├── protocol.mjs                ← app:// 供给 + 路径逃逸防护
│   ├── ipc.mjs                     ← IPC 通道注册与分发（`docs/desktop/design/IPC.md` §1 / §2）
│   ├── ipc-registry.mjs            ← 通道注册表族（`HANDLERS` 表 + 注册序——自 `ipc.mjs` 拆出 · 2026-09-29）
│   ├── ipc-relays.mjs              ← 转口族（24 转口 + `liveAgents` 单向取用——自 `ipc.mjs` 拆出 · 2026-09-30）
│   ├── agent-host.mjs              ← 壳装配第三份 + 回合驱动；回调桥 / 待决门 / 槽 I-O 三出档（下三行）（本档 §4）
│   ├── agent-bridge.mjs            ← 回调桥（自 `agent-host.mjs` 拆出）：活动名闭集八名 + 协议行解析 + **二十回调** ⇒ `ev:*` 映射（SSH 会话批增 `onSecretInput` ⇒ `ev:secret`）
│   │                                  + 注入 `post` / `askSingle` / `askBatch` / `askQuestion`（批 A 增第 4 键——自挂起门出 `ev:question`，桥零文案）/ `askSecret`（SSH 会话批增——凭据门）（映射单源 = `docs/desktop/design/IPC.md` §1）（本档 §4 项 2）
│   ├── suspensions.mjs             ← 待决门（自 `agent-host.mjs` 拆出）：两门 verdict 闭集 + 挂起表
│   │                                  （**唯一持有点**：`promptId → { kind, shape?, key, resolve }`——`shape` = verdict 闭集选择 discriminator）+ **六操作**
│   │                                  （`askSingle` / `askBatch` / `askQuestion` / `askSecret` / `denyGates` / `respond`——批 A 增 `askQuestion` ∥ SSH 会话批增 `askSecret`）+ `kind` **三值**（`approval` / `question` / `secret`）（本档 §4 项 5）
│   ├── session-io.mjs              ← 会话槽装载 / 回合尾落盘（自 `agent-host.mjs` 拆出——`loadAgentSlot` / `saveAgentSlot`；本档 §4 项 1 / 项 4）
│   ├── session-slots.mjs           ← 端壳：端名声明 END = "desktop" + `setSessionEnd(END)` + **转口八项**（marker 三项〔端参绑定〕+ 会话族五项：端参绑定 3〔`resumeSlot` / `switchToSlot` / `deleteSlot`〕· 同形转口 1〔`newSession`〕· 纯 re-export 1〔`renameSlot`〕）（零算法副本——`docs/desktop/design/SESSIONS.md` §1 KD-5）
│   ├── session-actions.mjs         ← 会话族动作层：五通道（create / switch / rename / delete / resume）+ 回执信封 `{ ok, reason: null|string, cwd, slot }`（`docs/desktop/design/IPC.md` §2 会话族注）
│   ├── sessions.mjs                ← 会话族读面：`sessions:list` 载荷投影（核 `listSlots` 条目 → 会话控制条目）——零新增算法（`docs/desktop/design/IPC.md` §2 会话族注）
│   ├── projects.mjs                ← 当前项目（内存态）与最近目录面 + 重启自动重开（本端记录面回读——`docs/desktop/design/SESSIONS.md` §1 KD-56）——读面 = 核会话槽面回读、零新存储（`docs/desktop/design/IPC.md` §2 项目面注 · `docs/desktop/design/SESSIONS.md` §1 KD-9）
│   ├── settings.mjs                ← 设置族多面（`config:write`——键白名单仅 `locale` · `model:list` / `model:catalog` · `settings:agent`（**B10 W3**：slot 权威键拒 `slot-authority` ∕ patch `null` 清除面 ∕ advisor 档 helper 单源）· `index:status` 读数装配）——共用核 `loadConfig` / `writeConfigAtomic`
│   ├── providers.mjs               ← 渠道族八通道（`provider:list` / `save` / `remove` / `verify` + **B10 W2 四增**：`setKey` ∕ `delKey` ∕ `models` ∕ `setProxy`——值面住核、端侧零形状构造；S3 写后探单点）
│   ├── mcp-servers.mjs             ← MCP 族六通道（`mcp:list` / `save` / `remove` / `tools` + **B10 W3 两增**：`update`（仅落盘） ∕ `reconnect`（先断后连）——探活失败 ⇒ 零写盘）
│   ├── project-info.mjs            ← 项目级信息族（`ledger:read` / `batch:status`——台账经核动态 import；相位 = `readManifest(cwd)` 回执 `manifest.phase`）
│   └── attachments.mjs             ← 附件落盘（渲染面 `dataURL` → 主进程落文件 + 核 `appendImagePointer` 锚点——渲染面零 fs；批 B（实读 **75**——预算 = `docs/desktop/design/PROJECT.md` §4.1））
│   ├── at-complete.mjs             ← `at:complete` 文件枚举过滤（R1 输入面板移植——@ 前缀剥离 → 树枚举 → 封顶 20）
│   ├── exec-run.mjs                ← exec-run 端面缝供值（R3——`configureExecRun` ∕ `configureProcessTreeKill` 核件单源转口）
│   ├── prompt-injections.mjs       ← 提示锚取值表（R4——两枚核锚供值 · 进程入口一次注册）
│   ├── settings-values.mjs         ← 设置族值面 ∕ 遮罩族（R7——`MASK` ∕ 叶展平 ∕ 点分路径写）
│   ├── settings-env.mjs            ← 主侧 env 族处理体（R7——`settings:env` 读 ∕ 写 ∕ TestProxy；**B10 S17**：shell 候选 = 核单源 `thincoder-core/shell-candidates.mjs` 薄壳 re-export——零自持候选表）
│   ├── settings-tools.mjs          ← 主侧 tools 族处理体（R7——`settings:tools` 读 ∕ 写；密钥值零下发）
│   ├── config-watch.mjs            ← config.json 外部写盘感知落子壳（R8——去抖 ∕ 自写抑制在核件）
│   ├── index-status.mjs            ← 语义索引面处理体（R2——`index:build` ∕ `index:status`）
│   ├── session-flags.mjs           ← 模式位四写面（R1——`session:flags` + `flagsOf` 回执）
│   ├── turn-driver.mjs             ← 回合驱动族出档（R3——在飞表 ∕ 中止墓碑 ∕ 单回合执行面装配；同名转口）
│   ├── turn-face.mjs               ← 单回合执行面提取（三径结算——落盘 → 读数 → 终局事件）
│   ├── turn-chain.mjs              ← 续发链提取（「回合中插入」批）
│   ├── agent-assemble.mjs          ← 装配面出档（壳装配第三份 + 回合驱动；`installExecRunSeams`）
│   ├── queued-input.mjs            ← 宿主队列单源（队列 + 计划取批——KD-40）
│   ├── suspension-drive.mjs        ← 挂起驱动胶水（消费核件 `startSuspension`——非第四份实现）
│   ├── timer-watch.mjs             ← 空闲 deadline 闩（timer-wake 阶段 2）
│   ├── notify.mjs                  ← 提示面策略 re-export（政策体上提核 `notify-policy.mjs`）
│   ├── subagent-face.mjs           ← 子 agent 停止出口 + 存活投影（R3b）
│   └── session-maintenance.mjs     ← 会话生命周期维护处理体（R1——GC ∕ 索引 ∕ 启动拍；零 `electron`）
├── src/preload/preload.cjs         ← 沙箱 CJS 窄桥：contextBridge 暴露 window.thincoder（`docs/desktop/design/PROJECT.md` §2 KD-3）
├── renderer/                       ← 前端（Chromium——无 Node，零框架零构建）
│   ├── index.html · theme.css · chrome.css · skin.css · chat.css · chat-cards.css · chat-composer.css · chat-fixes.css · core.css · core-markdown.css · pool.css · settings.css · settings-modal.css（样式链序 = `renderer/index.html`）
│   ├── app.mjs                     ← 引导：接线装配（会话族 / 对话流 / 池面）→ 驱动 store（池面接线拆出 `mount-pool.mjs`；设置面 / 向导接线拆出 `mount-settings.mjs`；批 A 输入区接线拆出 `mount-composer.mjs` + **会话族接线拆出 `mount-sessions.mjs`（关闭尾 / 行控件两件出口）** + 批 A 修正轮卡族出站拆出 `mount-cards.mjs`；事件订阅住 `events-subscribe.mjs`）；核件取词注册单点（「对齐第二批」修复轮）
│   ├── events.mjs                  ← 事件归约面：`ev:*` **二十五条**通道 → 切片写者（`reduce` 纯函数 + `applyPage` / `blockOfMessage`——零 DOM；批 A：`ev:question` / `ev:task` 由直返改写切片 `questions` / `tasks`）
│   ├── events-blocks.mjs           ← 块面归约径 + 块面原语（#510 留守拆档）
│   ├── events-slices.mjs           ← 读数与切片归约径（读数槽族 + goal ∕ queue ∕ ledger）
│   ├── events-status.mjs           ← 状态面切片归约（`ev:statusText` ∕ `ev:compress`）
│   ├── events-wake.mjs             ← 宿主唤醒面三切片归约（`ev:susp` ∕ `ev:digest` ∕ `ev:timer`）
│   ├── events-flags.mjs            ← 模式位切片归约（`applyFlags` 三径同点）
│   ├── questions.mjs               ← 提问 ∕ 计划切片面（`onQuestion` ∕ `onTask` ∕ `clearQuestion`）
│   ├── composer-wire.mjs           ← 输入区写面出档（通道往返归一 + 逐类型出站 handler）
│   ├── i18n-composer.mjs           ← 输入面板词族第三档（两语 VSC 逐字）
│   ├── mount-settings-reads.mjs    ← 设置面七段读数供给族（R8 拆档）
│   ├── mount-settings-exits.mjs    ← 设置面出口族 + 写路辅助（R8 拆档）
│   ├── mount-settings-segments.mjs ← 设置面段出口族（env ∕ 工具与服务——R7 拆档；MCP 族续拆 `mount-settings-segments-mcp.mjs`）
│   ├── mount-settings-segments-models.mjs ← 设置面 models 段出口族（consult ∕ advisor——R7 拆档）
│   ├── mount-settings-segments-providers.mjs ← 设置面渠道段出口族（B10 W2——S1 ∕ S2 ∕ S5 六出口，自 `mount-settings-exits.mjs` 按族续拆出档）
│   ├── mount-settings-segments-agent.mjs ← 设置面 agent 段出口族（B10 W3——S10 ∕ S11 ∕ S14b 出口与单键 patch 写路）
│   ├── mount-settings-segments-mcp.mjs ← 设置面 MCP 段出口族（MCP 键值行式输入批（#1036）拆档产出——自 `mount-settings-segments.mjs` 出档；MCP 族出口 + kv 行令牌两出口）
│   ├── settings-confirm.mjs       ← 删除确认弹层件（B10 W2 · S6——`.auto-confirm` 族复用，零新 CSS；四门前置确认）
│   ├── settings-modal.mjs        ← 设置组弹窗宿主件（**设置菜单升级批**新档 · D39——`settingsModalTree` 纯树 + 单例挂载 ∕ 刷新 ∕ 关闭 ∥ Esc ∥ 焦点；沿 `settings-confirm.mjs` 先例；单源 = `docs/desktop/design/SETTINGS.md` §1 **KD-68**）
│   ├── events-subscribe.mjs        ← 订阅接线（自 `events.mjs` 拆出——`attachEvents({ on, store, invoke, onTurnTail })`（实读 **103**——2026-10-14 · SSH 会话批实施后；前读 101（菜单体系批）∥ 前读 93（实读 2026-09-29））：**二十五条**通道订阅（SSH 会话批增 `ev:secret`——实读 25）+ 回合尾标题刷新存续（`onTurnTail`——flush 携行已退役）；单向依赖归约档）
│   ├── mount-pool.mjs              ← 活动池面接线（自 `app.mjs` 拆出——在册预案落形，`docs/desktop/design/PROJECT.md` §4.1）
│   ├── mount-settings.mjs          ← 设置面 / 向导接线出档（自 `app.mjs` 拆出——批 9 拆分落形（批 B 拆出向导接线族 `mount-onboarding.mjs`；R7 ∕ R8 拆出读数 ∕ 出口 ∕ 段出口三族——实读 **151**；预算 = `docs/desktop/design/PROJECT.md` §4.1）；通道接线与表单装配，视图构树住 `views/settings.mjs`）
│   ├── mount-composer.mjs          ← 输入区挂载出档（自 `app.mjs` 拆出——批 A（实读 **238**——`docs/desktop/design/PROJECT.md` §4.1 · 实读 2026-09-29〔写面已拆 `composer-wire.mjs`〕））：两态落形 · Enter / Shift+Enter 键位 · 忙态入队（受理交宿主任判）+ 满队提示 · 消费两时刻 = 步边界注入 ∕ 回合尾续发（「回合中插入」批收正）·
  批 B：附件条挂载（根锚 `data-attachments`——构树 / 采集住 `attach.mjs`）（形态单源 = `docs/desktop/design/UI.md` §1 输入区行）
│   ├── attach.mjs                  ← 附件采集与构树纯函数（批 B（实读 **57**——`docs/desktop/design/PROJECT.md` §4.1）：输入区 `paste` → `FileReader` → `dataURL` 条目集 + 移除控件；**零 fs** ⇒ 平 node 直测）
│   ├── mount-sessions.mjs          ← 会话族接线出档（自 `app.mjs` 拆出——批 A 拆分落形（实读 **400**——`docs/desktop/design/PROJECT.md` §4.1；**≤500 ⇒ 免拆——500/800 口径更换批**））：开页三路（`openPage` / `activateSession` / `createSession`）· 关闭尾 `closeTail`（三调用点）· 行控件两件出口（改名 / 删除接线）· 刷新面（通道面 = `docs/desktop/design/IPC.md` §2 会话族注）
│   ├── mount-cards.mjs             ← 卡族挂载与出站（批 A 修正轮（实读 **156**——`docs/desktop/design/PROJECT.md` §4.1））：`question:respond` 出站（作答 / 取消两向）
                                      + 回执 `ok` 真 ⇒ 清本键 `questions` 切片（`clearQuestion` 增导出 = `thincoder-desktop/renderer/events.mjs`）+ 清位标 + 卡挂载（计划卡零出口——纯呈现）（形态单源 = `docs/desktop/design/UI.md` §1 提问呈现行）
│   ├── menu-actions.mjs            ← 菜单动作落面（**菜单体系批**新档 · D36）：`ev:menu` **六动作** → 各既有单一实现分派（+`openSettings`——设置页 ∥ 组弹窗；**设置菜单升级批** 五 ⇒ 六；注入缝 ⇒ 平 node 直测；单源 = `docs/desktop/design/MENU.md` §1 **KD-65 ∥ KD-67**）
│   ├── dom.mjs                     ← 手写 DOM 工具（元素构造 / 事件委托 / 增量渲染）
│   ├── i18n.mjs                    ← 词表面：核域键取 `config:read` 语言面下发投影 + 宿主 UI 专有键（两语）+ `t()`（供给面 = `docs/desktop/design/IPC.md` §2）；**sink 槽 + `setStringsSink` 注册面导出**（「对齐第二批」修复轮——node-safe 档：零 `/rc/` 静态导入）
│   ├── i18n-views.mjs              ← 词族第二档（按视图面分组；合并点 = `initDict` 装配——自 `thincoder-desktop/renderer/i18n.mjs`；实读 **410**——`docs/desktop/design/PROJECT.md` §4.1 · 实读 2026-10-10）
│   ├── i18n-settings.mjs           ← 设置面词族第四档（i18n 拆分批产出——`SETTINGS_DICT` 两语各 **62** 键；自 `thincoder-desktop/renderer/i18n.mjs` 整族出档；合并点 = `HOST_DICT` 两语展开；实读 **156**——`docs/desktop/design/PROJECT.md` §4.1 · 实读 2026-10-02〔轮六收口侧数滞收正——原 55 键 ∕ 137 为 D33 前存量〕）
│   ├── store.mjs                   ← 单状态树 + 订阅（会话 / 标签页 / 活动池 / 待审批 / 设置 / 项目级信息——批 9 增两切片；批 A 增 `questions` / `tasks` 两切片 + 队列面（「回合中插入」批收正：`pending` 切片 = `ev:queue` 镜面——原三纯动作退场）；批 A 修正轮增换形态态 `railForm{ key, mode }` + 两纯动作 `openRailForm` / `closeRailForm`）
│   └── views/                      ← session-control.mjs · chat.mjs · chat-stream.mjs · chat-scroll.mjs · chat-tool.mjs · chat-cards.mjs · chat-chrome.mjs · chat-text.mjs · chat-pending.mjs · chat-subagent.mjs · chat-guide.mjs · compress-status.mjs · approval.mjs · question.mjs · plan.mjs
 · goal.mjs · chrome.mjs · statusline.mjs · statusline-segments.mjs · statusline-banner.mjs · activity.mjs · pool-subagents.mjs · activity-new.mjs · settings.mjs · settings-sections.mjs · settings-sections-{env,mcp,models,tools}.mjs · settings-agent.mjs · settings-controls.mjs · onboarding.mjs
├── scripts/check-dist.mjs          ← 产物校验（照扩展端 check-vsix 先例）
├── tools/web-quickcheck/           ← web 快筛（serve.mjs ∥ host-shim.mjs ∥ run.mjs——渲染面脱 Electron 快筛；单源 = `docs/desktop/design/WEB-QUICKCHECK.md`）
└── test/                           ← run.mjs（单入口 · 实读 **49**）+ files.mjs（显式清单——**2026-09-28 全清重置后 = 空清单** · 实读 **3**）+ rc-resolve.mjs（现盘三档——单源 = `docs/desktop/design/PROJECT.md` §4.1）
                                      （单元 = 单元测试档（名随批次档 · 住 `docs/batches/` · 不登记 · 随批留存）——单源 = 2026-09-28 测试层口径批 §1.15–§1.23；集成件 = 落盘时登记 +1）
```

**作用域注**：本树只落**模块形态与一行职责**；逐文件**行数预算**按域住各域档「文件账」节（宿主族 = 本档 §5.1）——本树不复制预算列。

**分层铁律**：渲染面代码**不得** import 任何 `node:` 内置或 `@thincoder/core`（照扩展端守卫先例——渲染面静态闭包不得到达 `node:sqlite`：W8 契约②判据——现载体 = 单元测试档（测余轮二批产），单元测试树重建时回迁端侧单元测试档）；跨面一律走 `window.thincoder`（通道面 = `docs/desktop/design/IPC.md` §1 / §2）。

**node-safe 子集（装载面分层）**：渲染面文件按**装载面**分两档——**① node-safe 档 = 被 node 侧装载的子集**（现 = `thincoder-desktop/renderer/i18n.mjs`——主进程链 `thincoder-desktop/src/main/attachments.mjs` 静态导入）：
须保持**平 node 可解析**——**禁 `/rc/` 协议别名静态导入**（`/rc/` 仅 `app://` 上下文可解析；平 node 视作盘符绝对路径 ⇒ 装载即 `ERR_MODULE_NOT_FOUND`）。
**② 浏览器专属档** = 其余渲染档：**核件取词接线只许居此档**——注册单点 = `thincoder-desktop/renderer/app.mjs`（`setStringsSink(setStrings)` 一次注册；`setStringsSink` = `thincoder-desktop/renderer/i18n.mjs` 导出注册面）；`initDict` 合并式原样、经注册端出。
判据：node-safe 档清单 = `thincoder-desktop/src/main/**` 静态导入闭包触及的渲染档；各档源面零 `/rc/` 静态导入 ∧ 平 node 直载不抛（`/rc/` 前缀白名单不豁免本判据）；违例即主进程装载崩 · 窗口永不出。

## 2. 宿主面职责（形态索引）

本表 = **职责索引**（形态一行 + 落点）：决策理由按域住各域档 §1（`docs/desktop/design/SESSIONS.md` §1 ∥ `docs/desktop/design/SETTINGS.md` §1 ∥ `docs/desktop/design/MENU.md` §1 等；未迁行仍住 `docs/desktop/design/PROJECT.md` §2），逐文件预算按域住各域档「文件账」节（宿主族 = 本档 §5.1）——本表不重复其内容。

| 面 | 形态 | 落点 |
|---|---|---|
| 入口与单实例 | `main.mjs` = 单实例锁 → 协议注册 → **窗口前恢复**（重启自动重开——`docs/desktop/design/SESSIONS.md` §1 **KD-56**）→ 窗口；ready 前初始化一律 await；**第二实例提示（2026-10-03 轻通道轮）**：非主实例 ⇒ **明示原因框**（zh/en 随 `loadConfig().locale`；`--smoke` 零弹框纯 JSON）∥ 主实例收 `second-instance` ⇒ **唤醒既有窗口**（`restore+show+focus`） | 本档 §5.1 |
| 窗口 · 菜单 · 系统主题 | `window.mjs` = BrowserWindow 生命周期 / 菜单 / 系统主题；**菜单（D36 · 2026-10-02）= 五组双语原生菜单**（文件 ∥ 编辑 ∥ 视图 ∥ **设置** ∥ 帮助——组名与条目双语：词表 = `menu-words.mjs` ∥ 模板纯函数 = `app-menu.mjs`；**设置菜单升级批（D38 ∥ D39 · 2026-10-02）**：顶级「维护」改名「设置」+「设置…」⇒ 现有设置页 + **六组项** ⇒ 组弹窗（`settings-modal.mjs`——单源 = `docs/desktop/design/SETTINGS.md` §1 **KD-68**；收窄批 #820：组项集 七 ⇒ 六）+ 维护 ∥ 关于与快捷键两子组；**菜单 ↔ 渲染面 = 两条窄通道**（① 命令下行 `ev:menu`——主→渲染单向，动作闭集**六**（+`openSettings`——设置菜单升级批 #817）；② **勾选态回读 `theme:state`**——渲染→主单向，菜单主题▸带勾（限度 = 报告缓存）；通道面单源 = `docs/desktop/design/IPC.md` §1 ∥ §2）；**关于面** = 原生 `app.showAboutPanel()`；最近项目 = `recentDirs()` 构建时读 + 重建点**六处**（启动 ∥ `project:open` ∥ 语言写径 ∥ 主题态报告 ∥ `focus` ∥ 更新面状态迁移——桌面发布·阶段二批）——旧「只挂主进程动作 ∥ 零 IPC 依赖项」口径随 D36 退场）；**启动即最大化**（D31——隐建 ⇒ `maximize` ⇒ `show`，「永远」语义；单源 = `docs/desktop/design/PROJECT.md` §2 **KD-59**）；**主题切换（D33 · 2026-09-30）** = 渲染面 `data-theme` 状态面（本档只持系统事实——画布色 `resolveTheme()`；菜单勾选态 = `theme:state` 报告缓存（显示面，不改系统事实面）；单源 = `docs/desktop/design/UI.md` §1「本批注（主题切换 · D33 · 2026-09-30）」） | 本档 §5.1 |
| 右键编辑菜单 | `window.mjs`（落子）+ `context-menu.mjs`（新档——模板两纯函数）：`webContents.on("context-menu")` ⇒ 按 `params`（`isEditable` / `selectionText` / `editFlags`）构模板 ⇒ `Menu.popup`（条目集 = 可编辑四件 ∕ 选中两件 ∕ 空选零菜单）；文案面 = `menu.edit.*` 四键两语（主进程 `loadConfig().locale` 现读） | `docs/desktop/design/PROJECT.md` §2 **KD-43** |
| `app://` 供给 | 自定义标准协议（standard + secure + supportFetchAPI）+ 路径逃逸防护；不直载 `file://` | `docs/desktop/design/PROJECT.md` §2 KD-2 |
| 预载窄桥 | 沙箱 CJS 预载 + `contextBridge` 暴露白名单通道为 `window.thincoder`；渲染面零 Node | `docs/desktop/design/PROJECT.md` §2 KD-3 · `docs/desktop/design/IPC.md` §1 / §2 |
| 启动自检 | 断言 `process.versions.node` 与 `node:sqlite` 可加载；不满足 ⇒ 显式报错退出（自检本身 = 判据）；**冒烟读数契约（parity-b10 · P3）**：`--smoke` 单行 JSON——字段闭集 ∕ `ok` 条件 ∕ 出口码 `0 ∕ 3 ∕ 4 ∕ 5` ∕ 20s 超时 ∕ `MIN_NODE` 三 scope 对准（桌面 `"24.0.0"` ∕ CLI `engines >=24` ∕ 核库面 `≥22.13`）——契约单源 = `thincoder-desktop/src/main/main.mjs` 头注 | `docs/desktop/design/PROJECT.md` §2 KD-7 · §7 用例 T-DSK15 |
| 配置写面 | 一切配置写入经核唯一执行体 `writeConfigAtomic`（`stat → read → mutate → 原子写`四步住核；mtime 冲突 ⇒ 非 ok + `.bak-{ts}` 留现场——`thincoder-core/config-io.mjs:78`）；端侧零自写盘、零 provider 形状构造 | `docs/desktop/design/SETTINGS.md` §1 KD-10 · `docs/desktop/design/IPC.md` §2 设置族与项目级信息族注 |

## 3. 与核的接口面逐项点名（七面）

| 面 | 本端消费的核入口 | 本端**不做**的事 |
|---|---|---|
| 配置 | 读 = 核 `loadConfig`；写 = 核**唯一执行体** `writeConfigAtomic`（共享 `~/.thincoder/config.json`——含凭据明文落档契约） | 不另立配置格式 / 不做第二份 key 存储（SecretStorage 类本端无）· **端侧零自写盘**（`docs/desktop/design/SETTINGS.md` §1 KD-10） |
| 会话 | 槽位模型与 manifest 面（核 `@thincoder/core/session-slots.mjs` 族纯转口）+ 端名声明 `END = "desktop"`（`setSessionEnd(END)` 一次）+ **转口八项**（marker 三项〔端参绑定〕：`endMarkerPath` / `readEndMarker` / `writeEndMarker` + 会话族五项：端参绑定 3〔`resumeSlot` / `switchToSlot` / `deleteSlot`〕· 同形转口 1〔`newSession`——无端参〕· 纯 re-export 1〔`renameSlot`〕）——零算法副本（`docs/desktop/design/SESSIONS.md` §1 KD-5） | 不另立会话目录 / 不另写 marker 读写实现（算法归核单源） |
| 记忆 | 核记忆工具族 + 检索（`memory` / `code_search` / `doc_search` 走 agent 工具面） | 不自持记忆实现、不做降级路径（`docs/desktop/design/PROJECT.md` §2 KD-7） |
| 工具 | 内置工具静态表 + 家族段（核 `agent-tools/` 与 `agent/family-tools.mjs` 经壳装配注入） | 不复制工具实现、不另写文件 / 进程工具（进程终止**复用** `thincoder-core/tools/process-tree.mjs`） |
| 审批 | 两条门（批审批 ∥ 逐项，实读 `thincoder-core/agent/dispatch.mjs:179-201`）→ IPC `ev:approval` | 不在渲染面实现权限判定（判定与串行化留核） |
| 活动事件 | `onToken`（含 `⟦ev⟧` 内联事件族）· `onAgentTurn` · `onToolCall` · `onToolOutput` · `onToolResult` · `onQuestion` · `onSecretInput`（凭据门——SSH 会话批；⇒ `ev:secret`） | 不另起事件总线、不落第二份轨迹（轨迹落核 `traces/`） |
| 项目级信息 | 核 `buildScan`（`thincoder-core/ledger.mjs:117`——**经动态 import**）给台账计数 / 超阈 · 核 `readManifest(cwd)` 给批次相位（**回执 `manifest.phase`**——`thincoder-core/manifest.mjs:377`；非 ENOENT 读错上抛直传） | 不携会话 `key`（项目一份）· 不直读核内表 / 不落第二份台账读数（`docs/desktop/design/IPC.md` §2 设置族与项目级信息族注） |

**不改核**：本端设计面**无一处**要求核新增 / 修改能力——**不改核机制语义**；marker 家族端参数化与创建端字段已由核侧批落地（`thincoder-core/session-slots.mjs:99` / `:107` / `:109`），本端只声明端名并转口（`docs/desktop/design/SESSIONS.md` §1 KD-5）。
**批 B 例外（授权在案）** = 核面**纯加法**三处（槽字段 `effort` + `setSlotPrefs` 写出口 + `saveSession` 携带——授权 = 批次档 §1.2 A；同项录入 = `docs/desktop/design/PROJECT.md` §4.2）。

## 4. 壳装配第三份

形态对齐另两端先例（CLI 侧 `assembleAgent` ∥ 扩展端 `buildTopLevelAgent`）：**装配序 = 核单源（`thincoder-core/agent/assemble.mjs`）+ 端壳 adapter（cwd ∕ `_slot` ∕ 校验调用；端差在册）**——本端 `thincoder-desktop/src/main/agent-host.mjs` 主责，回调桥 / 待决门 / 槽 I-O 三面已成出档（`agent-bridge.mjs` / `suspensions.mjs` / `session-io.mjs`——§1 树同源）：

1. 载核与实例化 agent（cwd = 当前项目目录——**主进程内存态**、项目面 = `docs/desktop/design/IPC.md` §2 项目面注；provider / 模型 / 档位 / 工程模式**槽值优先**——`effort` 未设（`null`）⇒ 回落**渠道级 `reasoningEffort`**（槽字段已落 · 配置回落支批 B 删——KD-17）；槽装载 = `session-io.mjs` 的 `loadAgentSlot`——槽缺 ⇒ 新建形）；
2. 注入核回调集 → 转成 IPC 事件（`docs/desktop/design/IPC.md` §1）——回调**逐条映射**，不改核签名；
3. 工具族装配（静态表 + 家族段 + 本端注入面）；
4. 回合驱动与中断（`msg:send` / `msg:interrupt` → 核 run / abort 面）——**主侧本体已落**（单驱动器：在飞再发 ⇒ `busy`；中断 = `signal.abort()`；回执形 = `docs/desktop/design/IPC.md` §2）；**回合尾落盘已落**（三路终局 done / stopped / error 同序 `saveAgentSlot`——**先落盘再出终局事件**，
`thincoder-desktop/src/main/session-io.mjs`）；**#517 结算序 = 标题 → 落盘 → 读数 → 终局事件**（`settleTurn(key, agent)` 单实现——`thincoder-desktop/src/main/turn-face.mjs`；单源 = `docs/desktop/design/SESSIONS.md` §1 **KD-41**）；
  UI 输入区与中断键**批 A 已落**（挂载 = `thincoder-desktop/renderer/mount-composer.mjs`——形态单源 = `docs/desktop/design/UI.md` §1 输入区行）；
5. 待审批项登记（供活动池计数与标签位——**同一事实只存一处**：挂起表在主进程，渲染面只呈现）；**响应通道** = 渲染面出口 `approval:respond`（`docs/desktop/design/IPC.md` §2——白名单 + 处理体，未装配 ⇒ fail-loud）；
  **挂起表供给已落**——表住 `thincoder-desktop/src/main/suspensions.mjs`（**唯一持有点**：`promptId → { kind, shape?, key, resolve }`——`kind` **三值** = `approval` / `question` / `secret`（SSH 会话批增） · `shape` 两值 = `single` / `batch`（verdict 闭集选择 discriminator；批 A 修正轮））·
  **六操作** `askSingle` / `askBatch` / `askQuestion` / `askSecret` / `denyGates` / `respond`（批 A 增 `askQuestion`——提问门：登记后自 post `ev:question`，渲染面作答经 `question:respond` 回执解除；SSH 会话批增 `askSecret`——凭据门：登记后自 post `ev:secret`，渲染面作答经 `secret:respond` 回执解除）·
  verdict 闭集两套（逐项 `once` / `always` / `reject` ∥ 批门 `approveAll` / `deny` / `oneByOne`）· `promptId` 主侧生成 · 表清两时点 = 出站 respond ∨ 门 resolve。

**两项端差——已裁消（2026-09-29）**：MCP 连接（通道与探活 = `thincoder-desktop/src/main/mcp-servers.mjs`）· `attachManifest` 工程模式 M1 钩子——两项 = **欠做**（非宿主能力面）⇒ 补做（装配面接入 MCP 连接 + M1 钩子附着；实施 = 该批）；判据 = 真机（配置 MCP ⇒ 会话内工具可达 ∕ 工程模式 manifest 可达）。

**序 + 团队层取值已上提核件**（`thincoder-core/agent/assemble.mjs`）：余端差（MCP ∕ `attachManifest`）= 已裁消（2026-09-29 · 批 #673——补做在册）。

**装配 MCP 缝体 = 双源（2026-09-30 · 台账 #691）**：`config.mcp.servers` + 项目根 `.mcp.json`（单层 · config 同名优先 · 装配期零确认——合并语义单源 = `docs/core/design/MCP.md` §6.4；落点 = `thincoder-desktop/src/main/agent-assemble.mjs` `finalizeTools` 缝）。

**装配表维护两件（首跑渠道提示修复批 · #840 · 2026-10-03）**：① **无效装配不入表**（`ensure`：装配完成时 `_providerInvalid === true` ⇒ 不入装配表——修正后再发按盘上新态重装配）；
② **槽装载后复验**（`assembleAndLoad`：`loadAgentSlot` 后 `if (agent._providerInvalid) validateProvider(agent, agent.config)`——槽有效 ⇒ 清标 ⇒ 本次发送放行）。机制单源 = 首跑渠道提示修复批 §2（C ∥ KD-8）。

## 5. 文件账（迁自 `PROJECT.md` §4.1 ∥ §4.2——宿主族 · as-of 2026-10-02）

### 5.1 本端文件清单与行数预算（宿主族行）

| 文件 | 预估行数 | 说明 |
|---|---|---|
| `thincoder-desktop/src/main/main.mjs` | **268**（实读 2026-10-08——索引自维护批实施落盘（265 ⇒ 268：维护拍接线 + 惰性转口注入）；前读 **265**（实读 2026-10-03——桌面 Linux 产物批·实施落盘（263 ⇒ 265——武装门合项注入 `updaterMediumOk`（§2.11.4））；第二实例提示轮·轻通道（242 ⇒ 263：非主实例 ⇒ 明示原因框 ∥ 主实例收 `second-instance` ⇒ 唤醒既有窗口）；前读 **242**（实读 2026-10-03——桌面发布·阶段二批实施落盘（203 ⇒ 242：`createRequire` 取 `autoUpdater` ∥ 注入五缝 + 词表注入 ∥ 延时自检点火 ∥ 通知落子）；前读 **203**（实读 2026-09-30——对盘重钉：重启自动重开批（`docs/desktop/design/PROJECT.md` §4.2 #734 块）；采集收网批（#740——`syncHeapSnapshot` 两源接线）相继落盘后读；内容行数口径））） | 入口：单实例锁 · 协议注册 · 窗口 · 启动自检（KD-7）——ready 前初始化一律 await；**R1**：窗口 ready 后启动拍点火（两枚维护拍——`thincoder-desktop/src/main/session-maintenance.mjs`）；**堆取证批**：堆看门狗装配（三注入 + 两键消费 + 冻结钩族 + 恢复动作序——KD-53 ∕ 本档 §5.2 堆取证块行 2）；**重启自动重开批（2026-09-30）**：窗口创建前一次恢复调用（`restoreLastProject`——KD-56）；**采集收网批（2026-09-30 · #740）**：快照分支运行期开关接线（`syncHeapSnapshot` 两源——外部写盘 ∥ 同进程自写）；**第二实例提示（2026-10-03 轻通道轮）**：非主实例 ⇒ 明示原因框（zh/en 随 `loadConfig().locale`；`--smoke` 零弹框纯 JSON）∥ 主实例收 `second-instance` ⇒ 唤醒既有窗口（`restore+show+focus`） |
| `thincoder-desktop/src/main/host-floor.mjs` | **42**（实读 2026-10-02） | `main.mjs` 同面拆分 · 零 `electron` 导入的叶子（宿主下限谓词 + `node:sqlite` 探针——实施批 1 已落） |
| `thincoder-desktop/src/main/window.mjs` | **336**（实读 2026-10-03——桌面发布·阶段二批实施落盘（288 ⇒ 336：`onNative` +`update` 转口 ∥ 更新对话框族（确认 ∥ 结果两态）∥ `setUpdateFace` 注入）；**（≤500 ⇒ 免拆——500/800 口径更换批）**；前读 **288**（实读 2026-10-02——设置体系升级批（#817）实施落盘（283 ⇒ 288：`buildMenu` 读 `settingsSectionLabels` + `sections` 注入 + 设置组）；前读 **283**（实读 2026-10-02——菜单体系批实施落盘（229 ⇒ 283；内容行数口径）；前读 **229**〔菜单体系批设计轮届盘复读〕· **227**〔实读 2026-09-30——窗口重启最大化批落盘后〕）） | BrowserWindow · 菜单（**R1 增「Maintenance」两项** + `confirmRecycle` 原生模态）· 系统主题 · 窗口态（**复制面对齐批**：右键编辑菜单落子——`context-menu` 事件 ⇒ `Menu.popup`）；**窗口重启最大化批（2026-09-30）**：启动即最大化（隐建 ⇒ `maximize` ⇒ `show`——判由单源 = **KD-59**〔`docs/desktop/design/PROJECT.md` §2——未迁行〕） |
| `thincoder-desktop/src/main/context-menu.mjs`（复制面对齐批 · 已落） | **60**（实读 2026-10-02） | 右键编辑菜单两纯函数（`contextMenuLabels(locale)` + `contextMenuTemplate(params, labels)`——零 `electron` ⇒ 平 node 直测）；机制 / 条目集 / 文案面单源 = `docs/desktop/design/UI.md` §1「本批注（复制面对齐 VSC · 2026-09-29）」项 1 |
| `thincoder-desktop/src/main/protocol.mjs` | **123**（实读 2026-09-29） | `app://` 供给 + 路径逃逸防护（照官方示例判据） |
| `thincoder-desktop/src/main/agent-host.mjs` | **337**（实读 2026-10-10——回填轮按现盘收正；前读 **333**（实读 2026-10-08——届盘实读收正（表载 327 ⇒ 333；文档卫生批行数面回填）；前读 **327**（实读 2026-10-04——修正轮按盘收正（306 ⇒ 327——会话选定写回批（#880）∥ 子代理面板批落盘后）；前读 **306**（实读 2026-10-03——首跑渠道提示修复批（#840）实施落盘（298 ⇒ 306——C 无效装配不入表 ∥ KD-8 槽装载后复验；**（≤500 ⇒ 免拆——500/800 口径更换批）**））；前读 **298**（实读 2026-10-02——桌面 UX 收尾批（#702）实施落盘（291 ⇒ 298——KD-70 装配尾入队；**贴 300 层未越**——距线 2 行（同轮拆分已落：词面构造移 `agent-assemble.mjs`，未拆则触 300 零余量）））；前读 **291**（实读 2026-09-30——留档批（#719）`recordAppend` 处理体（`:248-259` ⇒ 现盘 **`:255-266`**——+7 随动）+ 返回面一枚）；更前 262（实读 2026-09-29——R3 拆点后）） | 宿主装配 + 回合驱动族同名转口面（驱动族实住 `thincoder-desktop/src/main/turn-driver.mjs`）；**R1**：`syncTitle`；**R3**：蒸馏注入 `persistDistilled`（#520）；**留档批**：`record:append` 处理体（坏键门 ∥ 装配表命中门——reason 闭集 `bad-key` ∕ `unknown-key`）；**本批（#702 · 2026-10-02）**：`assembleAndLoad` 装配尾入队（KD-70——MCP 警告提醒；词面构造住 `agent-assemble.mjs`） |
| `thincoder-desktop/src/main/turn-driver.mjs`（R3 拆点落形 · 新档） | **236**（实读 2026-10-01——复核扫面收正批实施后（252 ⇒ 236——M6 删面：分支 ∥ 载体 ∥ 清点）；更前实读 2026-09-29——structure-split-2 拆后：347 ⇒ **252**——msg 双通道族出档 `thincoder-desktop/src/main/turn-input.mjs`（**120**）；≤300 回线内——越层除名 2026-09-29；步边界缝组合（窗优先）+ 窗支回执三态 + 注入缝 `injectUserText` + 撞帽询问缝 `onCapCancelled`） | 回合驱动族出档（自 `thincoder-desktop/src/main/agent-host.mjs`——§10 **BL** 拆点落形）：在飞表 ∕ 中止墓碑（`turnGate` 两查位同源）∕ 单回合执行面装配（步边界取批缝 + 撞帽询问缝）∕ `takeOver` ∕ `drive` ∕ `dispose` ∕ `abortSuspensions` ∕ `busyOf` ∕ `queueSnapshot` + `send` ∥ `interrupt`（出档 `turn-input.mjs`——转口保名）+ 私有装配四枚（排队面 ∕ 续发链 ∕ 挂起驱动 ∕ 提示面）；同名转口 ⇒ `thincoder-desktop/src/main/ipc.mjs` 调用面零改 |
| `thincoder-desktop/src/main/turn-input.mjs`（structure-split-2 拆档产出 · 本回填轮补登） | **146**（实读 2026-10-03——无效渠道态逻辑归一批（#841）实施落盘（141 ⇒ 146——`providerKindOf` ③ 判据换源（「渠表非空」⇒「有持 key 渠道」）∥ 成功回执携 `providerState`）；前读 **141**（实读 2026-10-03——首跑渠道提示修复批（#840）实施落盘（119 ⇒ 141——A 真因分类 `providerKindOf`（闭集二值 · 结构判定）∥ `send` 回执携 `providerKind`）；前读 **119**（#840 设计轮实读）；更前 **120**（structure-split-2 拆档落值 · 2026-09-29——`turn-driver.mjs` 同批拆出））） | 输入受理族出档（自 `thincoder-desktop/src/main/turn-driver.mjs`——`send` ∥ `interrupt`（转口保名）；拆档落形 = 本档 §5.2 structure-split-2 块行 2） |
| `thincoder-desktop/src/main/turn-face.mjs`（在册预案落形档） | **206**（实读 2026-10-08——届盘实读收正（表载 196 ⇒ 206；文档卫生批行数面回填）；前读 **196**（实读 2026-10-01——桌面二择批实施后（194 ⇒ 196——cap 分支墓碑门）；更前 = 194（复核扫面收正批：197 ⇒ 194——M6 注入面删 ∥ M10 墓碑查位）；更前实读 2026-09-30——**修复轮 3 后**：`end` 记录写点前移（`emitDigestEnd` `:169-176`——两径结算前调用 `:179` ∥ `:184`）；留档批（#719）`cap` 记录与 cap 帧同点（`:142-143`）+ import 面随动；前读 2026-09-30 = **176**（回填轮值——中间值）∥ 2026-09-29 = 173（桌面收尾批（#656 注入面 ∕ 注面）后；D3 补遗轮（#543 `onCapCancelled` 缝）∥ R3 撞帽三径 + 会话标题接线（#517））） | 单回合执行面提取（`send` ∕ 驱动同源——在飞表占位 + `suspDriven: true`〔撤回合尾直注入兜底〕+ 三径结算（落盘 → 读数 → 终局事件）+ 释放在飞）；出档理由 = `agent-host.mjs` 触 300 顾问线（在册预案「回合执行面再出档」落形）；**R3**：撞帽三径（#505——`askContinue` 薄形询问 ∕ 换代 controller + `resume:true` 重入 ∕ `autoTurn` cap 即收口）；**#517**：回合尾结算 `settleTurn` 单实现（标题先于落盘）；**留档批**：cap 记录（`autoTurn ∧ ¬timerTurn` 门——timer 轮不冒充消化边界）；**修复轮 3**：`end` 记录写点前移（边界轮终帧 ∥ 记录同点——先于槽落盘） |
| `thincoder-desktop/src/main/turn-chain.mjs`（在册预案落形） | **99**（实读 2026-09-29——队列取项边缘收正批后；帧构造单点保位 + 步边界 slash 即消费 + 尾径核件取项） | 续发链提取（自 `thincoder-desktop/src/main/agent-host.mjs`——越 300 预案落形；单源 = `docs/desktop/design/PROJECT.md` §4.2 本批行 · §10 **BL**） |
| `thincoder-desktop/src/main/agent-assemble.mjs`（状态栏对齐批新档） | **142**（实读 2026-10-02——桌面 UX 收尾批（#702）实施落盘（130 ⇒ 142——`mcpWarningReminder` 词面构造入档（KD-70——自 `agent-host.mjs` 同轮拆分移入；装配尾入队语义不变））；前读 **130**（实读 2026-09-30——#691（MCP `.mcp.json` 第二源）后）；更前 102（口子清零二轮后）） | 装配面 adapter（**消费核单源**：`assembleFor` = 核 `thincoder-core/agent/assemble.mjs` 调用 + `_slot` ∕ 校验调用；四名同名转口 `DEFAULT_DEPS` / `teamConfig` / `gitAuthor` / `validateProvider`；原路径同名 re-export 保名面——本档 §4）——**在册拆档落形**：回调桥 / 待决门 / 槽 I-O 三面已成出档（下三行）；**批 B 增**：会话级偏好施加径 `setPrefs`（写盘 → `loadAgentSlot` 重施单点 · 在飞 `flights.has(key)` ⇒ 写盘受理 ∥ 施加顺延——KD-19（2026-10-04 解锁批收正））；**本批增**：`flagsOf(key)` 活值投影四布尔 + `respond` 成功径回执叠加 `{ key, flags }`（桌内翻转即时刷新面）；**R3 增**：装配期两缝注册 `installExecRunSeams()`（`configureExecRun` + `configureProcessTreeKill`——VSC 同形）；**本批（#691 · 2026-09-30）**：MCP 合入缝补第二源——项目根 `.mcp.json` 并入（单层读取 · `config.mcp.servers` 同名优先 · 装配期零确认；合并语义单源 = `docs/core/design/MCP.md` §6.4；落点 = `finalizeTools`）；**本批（#702 · 2026-10-02）**：`mcpWarningReminder(warnings)` 词面构造导出（首两段逐字同 CLI；末行 = 桌面可达出口；零警告 ⇒ `null`——装配尾入队住 `agent-host.mjs`） |
| `thincoder-desktop/src/main/agent-bridge.mjs` | **331**（实读 2026-10-14——SSH 会话批实施后（325 ⇒ 331）；前读 325（实读 2026-09-29——desktop-residuals-round3 波 B（#599）后）；**（≤500 ⇒ 免拆——500/800 口径更换批）**） | 回调桥出档（自 `agent-host.mjs` 拆出——批 8 §1.14 ③）：活动名闭集八名 + 协议行解析（`⟦ev⟧`）+ **二十回调** ⇒ `ev:*` 映射（SSH 会话批增 `onSecretInput` ⇒ `ev:secret`）+ 工具参数摘要（与待决门共用口径）——注入 `post` / `askSingle` / `askBatch` / `askQuestion`（批 A 增第 4 键——自挂起门出 `ev:question`，桥零文案）/ `askSecret`（SSH 会话批增——凭据门），零宿主依赖 ⇒ 平 node 直测（映射单源 = `docs/desktop/design/IPC.md` §1）；批 A 增量 = 第 4 键 + `ev:question` 映射（~6 行，结构不变）；**R3 增**：`onDistilled` 回调（注入面 `persistDistilled(key)`——缺注入零动作） |
| `thincoder-desktop/src/main/suspensions.mjs` | **167**（实读 2026-10-14——SSH 会话批实施后（128 ⇒ 167）；前读 128（实读 2026-09-28——align-3 增键后）） | 待决门出档（自 `agent-host.mjs` 拆出——批 8 §1.14 ③）：两门 verdict 闭集（逐项 3 值 / 批门 3 值——核 `dispatch.mjs:281-289`）+ 待决表（挂起表 · **唯一持有点**：`promptId → { kind, shape?, key, resolve }`——`kind` = `approval` / `question` / `secret`（SSH 会话批增） · `shape` = `single` / `batch`（verdict 闭集选择 discriminator；批 A 修正轮收正，码面随动 = `thincoder-desktop/src/main/suspensions.mjs:51` / `:60` / `:63` 由 `kind` 改 `shape`，零行增减）+ **六操作**（`askSingle` / `askBatch` / `askQuestion` / `askSecret` / `denyGates` / `respond`——批 A 增 `askQuestion`：登记后自 post `ev:question`；SSH 会话批增 `askSecret`：登记后自 post `ev:secret`）——表清两时点 = 出站 respond ∨ 门 resolve（本档 §4 项 5）；批 A 补：`kind` 两值（`approval` / `question`）+ 回执**五 reason** 不 resolve（`unknown-prompt` / `bad-kind` / `bad-verdict` / `bad-answer` / `bad-values`——SSH 会话批增末位；单源 = `thincoder-desktop/src/main/suspensions.mjs:135-149`；`docs/desktop/design/IPC.md` §2） |
| `thincoder-desktop/src/main/exec-run.mjs`（R3 新档） | **22**（实读 2026-09-29） | exec-run 端面缝供值（`configureExecRun` ∕ `configureProcessTreeKill`——核件单源转口；装配期一次） |
| `thincoder-desktop/src/main/prompt-injections.mjs`（R4 新档） | **37**（实读 2026-10-05——bash 执行器语义面批（#922）后（22 ⇒ 37——执行器声明行 import 期求值 + try/catch 护栏）；前读 **22**（实读 2026-09-29——R4 新档）） | 提示锚取值表（两枚核锚供值——进程入口一次、装配之前注册；bash 锚 = 执行器声明行） |
| `thincoder-desktop/src/main/loop-sampler.mjs`（口子清零二轮新档） | **77**（实读 2026-09-30——已落；port 源 = `thincoder-vscode/src/extension/loop-sampler.mjs:67-76`；VSC 现读 **82**） | 宿主忙采样器（S3 `failure` 分档三件之一——供行标分档；零宿主依赖面 ⇒ 平 node 直测；单源 = `docs/desktop/design/PROJECT.md` §4.2 本批行） |
| `thincoder-desktop/src/main/heap-watch.mjs`（桌面堆取证修复批 · 新档） | **315**（实读 2026-09-30——快照开关批（#740）后（299 ⇒ 315）；内容行数口径；四缝合件——采样 ∕ 快照 ∕ 现场 ∕ 冻结门与恢复动作；port 源 = CLI `thincoder-cli/src/heap-watch.mjs:41-79`（采样 ∕ 双档 ∕ warn 行）+ `thincoder-cli/src/crash-reports.mjs:79-92`（快照武装 ∕ 现场记录）+ Electron 冻结原语〔经注入〕） | 桌面堆遥测与冻结取证（60s 采样 · 双档 70 ∕ 85 · 进程标签 warn 行 · 快照 ∕ 现场动作编排 · **隔离形 = 策略面零 `electron`（顶层 import 面禁令）**——注入键点名 = `sample` ∕ `snapshot` ∕ `log`（+ 冻结 ∕ 恢复动作原语）⇒ 平 node 直测；装配 = `src/main/main.mjs`；单源 = **KD-53**〔`docs/desktop/design/PROJECT.md` §2——未迁行〕 ∕ 桌面堆取证修复批 §2） |

**行数面机检**：`checkConfig.lineCounts`（`PROJECT-MANIFEST.json`，运行根单读）**逐条声明节域——本表为其一**（本域值行单源）；后续本域新档由落盘批在本表补值行，`docs/desktop/design/PROJECT.md` §4.1 同拍补指针行（沿 §4.1 纪律）。

### 5.2 现有文件改动 · 批块（宿主族 · 迁自 `PROJECT.md` §4.2——逐字；块内「本档」类回指已按新落点改指）

**本批（桌面堆取证修复批 · 已实施 · 2026-09-30 · 台账 #694 ＋ 接续 E4-JS 支）行「现行 ⇒ 实读」**（实读 as-of 2026-09-30——内容行数口径；机制 ∕ 判据单源 = 批档 §2 ∕ §2.15；**本批已实施——行值按现盘实读回填（取证先行 → 钉点分支全落）**）：

| # | 档 | 现行 ⇒ 预期 | 面 |
|---|---|---|---|
| 1 | `thincoder-desktop/src/main/heap-watch.mjs` | **299（实读 2026-09-30）**（四缝合件——采样 ∕ 快照 ∕ 现场 ∕ 冻结门与恢复动作；port 源 = CLI 两档 + Electron 冻结原语〔经注入——策略面零 `electron`〕） | KD-53 ①–③ ∕ §2.11 D7–D9 |
| 2 | `thincoder-desktop/src/main/main.mjs` | **136 ⇒ 183（实读 2026-09-30）**（装配三注入 + `diagnostics.*` 两键消费 + 冻结钩族〔`unresponsive` ∕ `responsive` ∕ `render-process-gone`〕+ ping 兜底 + 恢复动作序；键读抛 ⇒ 默认开——CLI 同口径） | KD-53 ④ ∕ §2.11 D7–D9 |
| 3 | `thincoder-desktop/src/main/window.mjs` | **223 ⇒ 223（零改）**（`unresponsive` ∕ `responsive` ∕ `render-process-gone` 三钩接线 + 恢复动作调用面实施判并入 `main.mjs`——届盘定形） | KD-53 ③ ∕ §2.11 D9 |
| 4 | 渲染 ∕ 主进程面（**钉点命中才动**——届盘定形）：`thincoder-desktop/renderer/store.mjs`（302——**≤500 ⇒ 免拆（500/800 口径更换批）**）· `renderer/views/chat-scroll.mjs`（**115**——E4-JS 支，见行 5b）· `renderer/subagent-reduce.mjs`（191）· `renderer/events-wake.mjs`（≈100）· `renderer/events-blocks.mjs`（135）· `renderer/views/activity.mjs`（194）∥ `src/main/agent-host.mjs`（262）· `src/main/turn-driver.mjs`（252） | 各行「现行 ⇒ 预期」届盘定形（钉点后逐行补——未命中 = 零改零行；值口径 = 本档 §5.1 单源） | KD-54 ② |
| 5 | 巨块夹层（命中才动）：`thincoder-desktop/renderer/chat.css`（≈330——**≤500 ⇒ 免拆**）∥ `renderer/core.css`（332——**≤500 ⇒ 免拆**）（500/800 口径更换批）∥ `renderer/views/chat-text.mjs`（JS 支落点收正——**零改**：分段窗住新档 + 挂载 ∥ 帧尾两层） | **CSS 支已落**（2026-09-30 · §5.7——三处 `contain: layout style paint`；行级小增 ∕ 零语义；弃档 = `content-visibility`）＋ **JS 支接续**（新行 5b） | KD-54 ③ |
| 5b | 巨块 **JS 支（分段挂载——实施径 · 已实施）**：新档 `renderer/views/chat-text-segments.mjs`（**497**——实读 2026-09-30；**距 500 线余 3 行 ⇒ 贴层在册——同 `docs/desktop/design/PROJECT.md` §4.1 贴层段**）∥ `thincoder-desktop/renderer/views/chat.mjs`（**299 ⇒ 305**——实读 2026-09-30；**≤500 ⇒ 免拆（500/800 口径更换批）**）∥ `renderer/views/chat-scroll.mjs`（**112 ⇒ 115**）∥ `thincoder-desktop/renderer/app.mjs`（**289 ⇒ 292**）∥ `renderer/frame-dispatch.mjs`（**52 ⇒ 53**）；`renderer/views/chat-text.mjs` **126 零改**（实读 2026-09-30 复核）；测试 ∕ 探针 = 单元测试档增用例（单元——**520 行 · 12 用例**；探针——**899 行**；单元测试档不计线（KD-4）） | 现行 ⇒ 实读落值（2026-09-30——机制 ∕ 参数单源 = 批档 §2.15） | KD-54 ③ ∕ §2.15 |
| 6 | 测试 ∕ 探针 | 单元测试档 = 桌面堆取证修复族（单元——采样 ∕ 双档 ∕ 阈值取 ∕ 键两态 ∕ 门序〔含 ping 径〕· once ∕ 5min 守卫 ＋ E4-JS 增用例三（段界 ∥ 补偿 ∥ 回滚）；**实读 520 行 · 12 用例**（E4-JS 波后；复跑 12/12 ✓）——单元测试档不计线（KD-4））+ `-probe.mjs`（真机——装配 ∕ 快照落盘 ∕ 冻结门 ＋ E4-JS 用例；**实读 899 行**（E4-JS 波后）——单元测试档不计线（KD-4））+ 迭代探针 `…-e4js-live.mjs`（**252 行**——单元测试档不计线（KD-4））+ 读数档两枚 `…-readings.json` ∥ `…-e4js-live-readings.json`（数据件——无行数预期）；集成测试不写 ∕ 不改 ∕ 不跑（全清令） | 全批 |
| 7 | 文档面 | `docs/desktop/design/PROJECT.md`（§2 **KD-53** ∕ **KD-54**〔未迁行〕· §10 **CP** ∕ **CQ**）· 本档 §5.2（本块）；分支命中后随动 = `docs/desktop/design/RENDERER.md` **面点名到条（届盘）**：§2 两条（`MAX_RENDER_BLOCKS` ∕ 窗限增量——常量单源；`:125-131`）+ §1.1 挂起窗行（`:24`）∥ 1s 拍面（`:89`）∥ 块回收面（`:46`）；**本次命中分支已落** = `docs/render-core/design/RENDER-CORE.md`（核面 owning 档——**KD-RC-11** + §6 随动段） | 全批 |
| 8 | 核 `thincoder-render-core/flow/block.mjs` | **145 ⇒ 153**（实读 2026-09-30——两处续写支改**并入末文本节点**——`:63-66` 文本 ∕ 推理支 ∥ `:47-49` toolOutput 支；语义等价（RAW 拼接逐字同 ∥ 零视觉差）；文本节点 O(chunks) ⇒ **O(1) ∕ 行**） | E2 命中分支（§2.13 ∕ 核档 §2 KD-RC-11） |

**本批（桌面 MCP 装配补 `.mcp.json` 项目文件源 · #691 · 2026-09-30）行「现行 ⇒ 预期」**（实读 2026-09-30——内容行数口径；机制 ∕ 判据单源 = 批档 §2；**本轮 = 设计轮——产品码零触**）：

| # | 档 | 现行 ⇒ 预期 | 面 |
|---|---|---|---|
| 1 | `thincoder-desktop/src/main/agent-assemble.mjs` | **102 ⇒ ≈130**（`finalizeTools` 双源：`config.mcp.servers` + 项目根 `.mcp.json` 并入——单层读取 · config 同名优先 · 读 ∕ 解析失败非致命；核缝 ctx 携 `cwd`——零核改） | #691 三问裁定 |
| 2 | 核 `docs/core/design/MCP.md` §6.4 | 启动装配句补两裁定（发现面 = 项目根单层 ∕ 信任面 = 零交互确认——CLI ∕ 桌面同判） | 同单源 |
| 3 | `docs/desktop/design/SHELL.md` §4 | 补「装配 MCP 缝体 = 双源」一句（指针——语义单源 = `docs/core/design/MCP.md` §6.4） | 文档面 |
| 4 | 本档（SHELL §5.1 行 ∕ §5.2 本块）+ `docs/desktop/design/PROJECT.md` 变更记录（原址） | `agent-assemble.mjs` 行值按届盘实读收正（32 ⇒ **102**——口子清零二轮后）+ 本块落（本批 = 设计轮） | 文档面 |
| 5 | 测试覆盖 | 单元测试档 = `.mcp.json` 项目文件源族（单元测试档 · 不登记 · 规模预期 ≈140 行 · 9 用例——装配含 ∕ 不含 ∕ 优先级 ∕ 边界）；集成测试零动（全清令） | 全批 |

**本批（窗口重启最大化 · D31 · 2026-09-30 · 台账 #745）行「现行 ⇒ 预期」**（实读 2026-09-30——内容行数口径（文末换行不计）；机制 ∕ 判据单源 = **KD-59**〔`docs/desktop/design/PROJECT.md` §2——未迁行〕；**设计轮——产品码零触**）：

| # | 档 | 现行 ⇒ 预期 | 面 |
|---|---|---|---|
| 1 | `thincoder-desktop/src/main/window.mjs` | **223 ⇒ 227**（实施落盘 2026-09-30——值列实读；`show: true ⇒ false` 隐建 + `win.maximize()` ∥ `win.show()` 两行 + 判由注——启动序 = 隐建 → 最大化 → 显形） | 窗口装配 |
| 2 | 单元测试档 | 窗口重启最大化族（已建成 · 83 行——三用例：① 启动径序列（`show: false` → `maximize` → `show` 有序 ∥ `show: true` 零残留）② 判由在句（`maximize` 邻接注携 `D31` ∥ 「永远」锚）③ 「永远」零记忆负控（**扫描面 = `window.mjs`**：零窗口态族符号 + `maximize` 恰 1 处）；随批留存 · 不进集成测试树） | 全批 |
| 3 | 设计档 | **KD-59**〔`docs/desktop/design/PROJECT.md` §2——未迁行〕∥ `docs/desktop/design/PROJECT.md` §6.1 批块 + 表头 ∥ §7 **T-DSK53** ∥ §8 本批边界行 ∥ §10 **CX** ∥ 变更记录 ∥ 本档 §5.1 `window.mjs` 行说明 ∕ §5.2 本块 ∥ 本档 §1 树 + §2 行 ∥ `docs/desktop/design/{IPC,UI,RENDERER}.md` 档头 D 号随动 | 全批 |

零触面：核（`thincoder-core/**`）∥ `thincoder-render-core/**` ∥ 渲染面（`thincoder-desktop/renderer/**`）∥ 通道表 ∥ preload ∥ `thincoder-desktop/src/main/main.mjs`（窗口创建前序零改——最大化落 `createWindow` 内）∥ 记录面（零窗口态存储）；测试覆盖随修随加——不占设计条目（2026-09-27 裁定）。

**本批（structure-split-2 · 越层两档拆分 · 2026-09-29 · 台账 #651）行「现行 ⇒ 实读落值」**（实读 2026-09-29——内容行数口径；切点 ∕ 缝 ∕ 复跑单源 = 越层两档拆分批 §2.2-D/E ∥ §5；实施避让 = 拆分先落 ∥ RF 面届盘重钉；收口轮回填；**切片 3 判域迁入 = 宿主族——`turn-driver.mjs` ∥ `turn-input.mjs` 两行主导；digest 半边行随块在册**）：

| # | 档 | 现行 ⇒ 实读落值 | 面 |
|---|---|---|---|
| 1 | `thincoder-desktop/renderer/views/chat-chrome.mjs` | **335 ⇒ 213**（digest 全族三段迁出 = 122 行逐字——原 `:30-88` ∥ `:162-217` ∥ `:309-315`；新档 `chat-digest.mjs` **133**；缝 = `digestGroupNode` ∕ `digestPresent` re-export——S3 实读） | #651 |
| 2 | `thincoder-desktop/src/main/turn-driver.mjs` | **310 ⇒ 252**（msg 双通道族迁出 = 101 行逐字——届盘重钉切点 `:202-302`（#656 落笔后）；新档 `src/main/turn-input.mjs` **120**；缝 = `send` ∕ `interrupt` 保名转口——S4 实读） | #651 |
| 3 | 测试 ∥ 单元测试档锁面 | 单元测试档锁改指 **3 处已落**（三锁档：窗队列 ∥ 发送忙态时序 ∥ 桌面收尾-c3——均改读 `turn-input.mjs`）；S4 届盘基线跑 = 10 锁档 **95/95 绿**；单元测试档（越层两档拆分族）未落（§4 排程「S1–S4 后落」——父侧收位） | #651 |

