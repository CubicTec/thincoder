# 2026-10-11 · light-walkthrough-fixes
> 六段 append-only，一段一作者：§1 讨论（主 agent）· §2 批次任务与设计（eng-designer）· §3 设计评审（评审子代理）· §4 用户批准（主 agent）· §5 实施记录（eng-coder）· §6 验证与收口（父代理）。
> 编制：主 agent · 2026-10-11 · 来源 = 用户 2026-10-11 20:14 实走发现（镜像源常用预选表缺实测可用源——原话「我发现你刚才测通的那个镜像源根本不在常用源列表里，太坑了。」）+ 全链自动授权（18:44「也自动跑完」）。
> 台账 = #1284（server · 归批）。前情 = 无（独立批）。
## §1 讨论（主 agent）
**状态行**：🔄 进行中（…）
<§1 模板占位：本批条目 / 关键判据 / 授权口径>

### pen 1（实走缺陷——常用源预选表）
- **披露**（2026-10-11 20:1x · 对话在案）：「本笔 = 轻通道（实走缺陷类）｜改动 = 常用源预选表补第 7 条 `docker.1ms.run` + 设计三处计数随正｜波及 = 代码 1 档 + 设计 3 档 + 批内件 1 档｜回滚 = 逐档可 revert」。
- **改动**（逐档）：① `thincoder-server/src/sandbox/image-sources.mjs`——`SOURCE_PRESETS` 第 7 条 `Object.freeze({ name: "Docker Hub 镜像（1ms.run）", address: "https://docker.1ms.run" })` + 两处头注（`:8` 计数 ∥ `:19-21` 枚举 + why：实拉实证 `.6` 200·10.4s·119MB；用户实走发现缺表）；② `thincoder-server/public/views-sandbox-image-sources.mjs:5`——头注计数（六 ⇒ 七）；③ `docs/batches/2026-10-11-sandbox-image-sources.test.mjs`——三处断言（`:260` 注释 ∥ `:263-272` 列表 + 计数 ∥ `:682` `length === 7`）；④ `docs/server/design/sandbox/SANDBOX.md` §3——预选清单 六 ⇒ 七 + 第 7 条落名（含 why）+ 变更记录行；⑤ `docs/server/design/gateway/API.md` §2.5——端点行计数随正 + 变更记录行；⑥ `docs/server/design/webui/WEBUI.md` §2.10——**待 #237（chat 设计微轮）放行后补一笔**（避并发写）。
- **走查**：批内件复跑 `node --test docs/batches/2026-10-11-sandbox-image-sources.test.mjs` = **13 pass / 0 fail**（含「预选七条逐值」断言）；用户可见面 = 后续 `.5` 部署后「添加源」下拉第七项。
- **冻结**：本笔改动档（①–⑤）冻结于本记录；⑥ 落笔后同冻。

- **追记（pen 1 ⑥ 落 · 2026-10-11 20:2x）**：`docs/server/design/webui/WEBUI.md` §2.10 增/改弹窗句（`:557`）+ §6 镜像源族行（`:715`）预选下拉 六 ⇒ 七条 + 变更记录行（同笔落）——#237（chat 设计微轮）放行后一笔补；本笔六档全数落位。**pen 1 改动面封**：① `src/sandbox/image-sources.mjs` ∥ ② `views-sandbox-image-sources.mjs` ∥ ③ 批内件 ∥ ④ `SANDBOX.md` ∥ ⑤ `API.md` ∥ ⑥ `WEBUI.md`。

### 笔 2——建容器镜像：手输 ⇒ 节点本地镜像选单（2026-10-11 21:0x）
- **来源**：用户 21:00 实走上报（原话「创建容器的时候，镜像好歹给做成下拉选择啊，让我手输哪输得准啊！」）。
- **口径**：选单 = 目标节点本地镜像（既有端点 `GET /api/admin/sandbox/runners/:id/images`——零新端点）；选定 ⇒ 回填下方镜像输入（可再改；提交取输入值）；「自定义（手输）」保底（读败/空表/设置预填不在表 ⇒ 手输照常——零回归）。
- **落点**：① `thincoder-server/public/views-sandbox-containers.mjs`（建容器窗——选单 + 回填 + 预选；`<none>`/空 tags 滤除）∥ ② `i18n-zh-sandbox.mjs` ∥ ③ `i18n-en-sandbox.mjs`（各 +2 键：`imageFromNode` ∥ `imageCustom`）∥ ④ 批内件四档随正（`2026-10-10-runner-admin-console-ui.test.mjs`——选单三断言 + 提交体期望值改「nginx:1.27」∥ `2026-10-08-server-public-structure.test.mjs`——键数 **598 ∥ 603** + 指纹锚两枚重算 ∥ `2026-10-10-server-small-fixes.test.mjs` ∥ `2026-10-11-admin-agent-chat-ui.test.mjs`——键数随正）∥ ⑤ `webui/SANDBOX.md` §2.1① + 变更记录。
- **走查读数**：全链 `npm run prepublishOnly` = **478/478 绿 · 0 红**（EXIT=0；本笔无新 `test()` 块——总计数不变）。受影响四档全绿（指纹锚 = 重算值 `ea028ee2…` ∥ `9ebe47ab…`）。
- **冻结**：待部署 `.5` 后实走复核（用户径）。

## §2 批次任务与设计（eng-designer）
**状态行**：（eng-designer 写入时更新）
<§2 模板占位：本批条目（覆盖） / 设计档落点 / 机制设计 / 受影响文件与测试面 / 验收对照 / 关键决策 / 上抛项>
## §3 设计评审（评审子代理）
## §4 用户批准（主 agent）
## §5 实施记录（eng-coder）
## §6 验证与收口（父代理）
