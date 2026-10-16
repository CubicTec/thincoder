# 2026-10-15 · desktop 走查修复（raw 键 ∥ 模型选择归位）
> 六段 append-only，一段一作者：§1 讨论（主 agent）· §2 批次任务与设计（eng-designer）· §3 设计评审（评审子代理）· §4 用户批准（主 agent）· §5 实施记录（eng-coder）· §6 验证与收口（父代理）。
> 编制：主 agent · 2026-10-15 · 来源 = 用户 2026-10-15 23:34 desktop 走查：① attach/stop 按钮显示原始键（`toolbar.attachShort`/`toolbar.stop`）② 设置页模型选择应归会话界面；其他端同类排查。。
> 台账 = #1513（desktop · 归批）。前情 = 无（独立批）。
## §1 讨论（主 agent）
**状态行**：进行中（①raw 键修复落盘+三绿（探针 3/3 ∥ car2 回归 30/30 ∥ appdom 冒烟 OK）；② 候口径确认）
<§1 模板占位：本批条目 / 关键判据 / 授权口径>

### 笔 1 · raw 键修复（轻通道 · 缺陷修复 · 主 agent 直接执行 · 2026-10-15 23:5x）

**披露**（笔前两发：初披露「desktop refresh ∥ VSC textContent」→ 读透后**重披露**扩大为核件级单源）：修法 = 核件 `applyWords` 词面重派生单源——创建期取词的五件（panel ∥ attach ∥ controls ∥ model-menu ∥ atmenu）全在词表之前跑，端侧点补只会继续漏下一处。射程 = core 5 ∥ desktop 2 ∥ VSC 1 ∥ 测试档 1；回滚 = revertable（逐文件可拆）。

**改动（9 档）**：
- 核件 `render-core/composer/panel.mjs`：创建期词面内联赋值抽为 `applyWords()`（input placeholder ∥ aria；send/abort title ∥ aria ∥ abort text）+ 组装四子件 applyWords；构造尾调用一次；句柄出新面 `applyWords`。
- 核件 `render-core/composer/attach.mjs`：`applyWords`（attach title ∥ aria ∥ text；paste-badge aria）。
- 核件 `render-core/composer/controls.mjs`：七钮 title ∥ aria 两层入 `WORDS` 表 + `applyWords`（末端 `applyModeButtons` 收口 plan 标题）；`planDefaultTitle` 快照退场 ⇒ 动态 `t("toolbar.planMode")`。
- 核件 `render-core/composer/model-menu.mjs`：两浮层 aria 入 `applyWords`。
- 核件 `render-core/composer/atmenu.mjs`：`#at-dropdown` aria 入 `applyWords`。
- desktop `renderer/mount-composer.mjs`：`refresh()` += `panel.applyWords()`（boot `initDict` 后既有调用点）。
- desktop `renderer/app.mjs`：帧分派 `locale` 支 += `composer.refresh()`（沿拖柄两处先例——语言切换词面随动）。
- VSC `webview/chat-messages.js`：i18n 到达点 += `composer.applyWords()`（+ import）。
- 单元测试档 `docs/batches/2026-10-15-desktop-walkthrough-fixes.test.mjs`（红/绿/幂等三测——用后即删）。

**走查（读数）**：
- ① 红面（根因复现）：空词表下创建 ⇒ `attach-btn.textContent = "toolbar.attachShort"` ∥ `abort-btn.textContent = "toolbar.stop"` ∥ placeholder = 键名（探针在案——挂载先于词表 + 重派生漏面，两因缺一不现）。
- ② 绿面（修后）：置词 + `applyWords()` ⇒ **24 项词面全量 = zh 值**（title ∥ aria ∥ textContent 三层）——探针通过。
- ③ 跑法 + 结果：`node --test docs/batches/2026-10-15-desktop-walkthrough-fixes.test.mjs` ⇒ **3/3 pass**；回归 `car2-aria-zh-probe`（置词先行径）⇒ **30/30**；冒烟 `b10-probe-appdom`（desktop boot 装载）⇒ **OK**。
- 真机目视 = 用户侧（重载桌面端：attach/stop 文本 ∥ 悬停题注 ∥ 语言切换；VSC 重载同——其停止钮原缺 textContent 重派生，同修）。

**冻结**：本笔冻结（改动 = 上述 9 档；后续补笔另起）。② 模型选择归位 = 独立条（非轻通道，候口径确认后另办）。

## §2 批次任务与设计（eng-designer）
**状态行**：（eng-designer 写入时更新）
<§2 模板占位：本批条目（覆盖） / 设计档落点 / 机制设计 / 受影响文件与测试覆盖 / 验收对照 / 关键决策 / 上抛项>
## §3 设计评审（评审子代理）
## §4 用户批准（主 agent）
## §5 实施记录（eng-coder）
## §6 验证与收口（父代理）
