# 2026-10-13 · projects-act-fix
> 六段 append-only，一段一作者：§1 讨论（主 agent）· §2 批次任务与设计（eng-designer）· §3 设计评审（评审子代理）· §4 用户批准（主 agent）· §5 实施记录（eng-coder）· §6 验证与收口（父代理）。
> 编制：主 agent · 2026-10-13 · 来源 = 用户 2026-10-13 22:59 报障（原话：「git项目更换负责人时点击保存不会切换回只读状态，关闭项目弹窗后，列表没有刷新，新的负责人不会出现在列表上。」）——父侧诊断根因 = `views-projects.mjs` act 调用约定缺陷（thunk/Promise 走样——五径：改名/改地址 ∥ 更换负责人 ∥ 改档 ∥ 移除 ∥ 加成员）；轻通道轮（defect fix）。
> 台账 = #1378（server · 归批）。前情 = 无（独立批）。
## §1 讨论（主 agent）
**状态行**：🔄 进行中（…）
<§1 模板占位：本批条目 / 关键判据 / 授权口径>

**笔 · projects-act-fix（2026-10-13 23:0x——轻通道 · defect fix）**

- **披露**：This pen = light channel（defect fix——命中②：实现与既有源相抵〔house 约定 = `modal.mjs` submitThen 的 thunk 形〕）| change = `views-projects.mjs` 五调用点 thunk 化 + act 注释收正 | reach = 1 档（`thincoder-server/public/views-projects.mjs`——6 行级）| rollback = revertable。
- **源**：用户 2026-10-13 22:59 报障（原话：「git项目更换负责人时点击保存不会切换回只读状态，关闭项目弹窗后，列表没有刷新，新的负责人不会出现在列表上。」）；根因（父侧实读坐实）= `act` 以 `await call()` 调 thunk，而五调用点传「已启动 Promise」⇒ `promise()` TypeError 被 catch 吞 ⇒ flash ∥ 弹窗重渲 ∥ `onChanged`（列表刷新）全不执行；请求因实参求值已先行发出 ⇒ **服务端改动成功、界面无收口**。
- **改动**：`views-projects.mjs:146`（act 注释——thunk 约定明写）∥ `:164`（editInPlace——改名/改地址径）∥ `:193`（更换负责人径）∥ `:242`（改档径）∥ `:246`（移除成员径）∥ `:261`（加成员径）。
- **红-绿对**（批内件 `docs/batches/2026-10-13-projects-act-fix.test.mjs`）：**红** = 修前跑——失败于「flash「负责人已更新」在册」∥「改名 flash 在册」（载荷已出网——症状与根因签字）；**绿** = 修后跑 **2/2 pass**（两测例全项：载荷逐值 ∥ flash 达 ∥ 弹窗收起回只读 ∥ onChanged 达）。
- **同族回归**：`2026-10-12-team-projects-permissions-ui.test.mjs` 本笔复跑——读数见 §6。
- **walkthrough**：待部署后于用户实例实走（改负责人 ⇒ 收起 + 列表刷新）；**冻结**：树内未提交——收尾链随轮（§2 设计形式化 ∥ §3 独立评审 ∥ §4 批准 ∥ §6 收口核销）。

**同族回归补记（2026-10-13 23:1x）**：`2026-10-12-team-projects-permissions-ui.test.mjs` 本笔复跑 = **5/7**——两红（`:root` 76≠58 ∥ zh system 键 187≠185）**归因 = #1374（终端批）在途落地**：实读 `--term-*` **18** 变量（58+18=76 ✓）∥ `audit.sandboxKind.terminal_open/terminal_close` **2** 键（185+2=187 ✓）——与本笔（`views-projects.mjs` 六行 thunk 化）零关，属该批收口轮父侧随正件（在册）。本笔面 = 无回归。

## §2 批次任务与设计（eng-designer）
**状态行**：（eng-designer 写入时更新）
<§2 模板占位：本批条目（覆盖） / 设计档落点 / 机制设计 / 受影响文件与测试覆盖 / 验收对照 / 关键决策 / 上抛项>
## §3 设计评审（评审子代理）
## §4 用户批准（主 agent）
## §5 实施记录（eng-coder）
## §6 验证与收口（父代理）
