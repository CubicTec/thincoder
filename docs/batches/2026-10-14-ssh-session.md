# 2026-10-14 · ssh-session
> 六段 append-only，一段一作者：§1 讨论（主 agent）· §2 批次任务与设计（eng-designer）· §3 设计评审（评审子代理）· §4 用户批准（主 agent）· §5 实施记录（eng-coder）· §6 验证与收口（父代理）。
> 编制：主 agent · 2026-10-14 · 来源 = 用户 2026-10-14 16:03–16:08「用 thincoder 做网络管理」讨论定形（原话链：「我想用thincoder来做一些网络管理方面的工作…可以多次往返的ssh连接工具」→「你连接时弹个用户名密码输入窗口？」→「可以建立连接以后多次对话循环配置的吧？」→「可以，跑吧！」→「派」）；需求登记 = `docs/core/requirements/TOOLS.md` §4.8。
> 台账 = #1436（core · 归批）。前情 = 无（独立批）。
## §1 讨论（主 agent）
**状态行**：已收口 2026-10-14
<§1 模板占位：本批条目 / 关键判据 / 授权口径>

**缘起（本批讨论）**：用户 2026-10-14 16:03 起提出「想用 thincoder 做网络管理方面的工作——提供可以多次往返的 SSH 连接工具」。讨论定形五面：

- **形态**：一条会话多次往返（长命连接——状态保持：cwd / 环境变量 / 设备模式）；密钥 / ssh-agent 优先，需要密码时走**结构化输入窗**（用户原话方向「你连接时弹个用户名密码输入窗口？」）。
- **纪律**：凭据**零入上下文**——密码从弹窗直接喂 ssh 进程：不进消息行 ∥ 不进模型上下文 ∥ 不进会话记录（同源先例 = 服务端主机凭据弹窗 / git 凭据卡零回显）。
- **循环**：连接后多轮「发 → 读回 → 再发」——agent 连着跑 ∥ 用户看着跑插话改方向（两种皆可）。
- **边界（不做）**：全屏终端仿真（vim 类 TUI 不伺候）∥ 凭据托管（不落盘密码）∥ 文件传输（scp/sftp）与隧道管理（`-L`/`-R`）= **后一刀在册候选**。
- **登记落点**：`docs/core/requirements/TOOLS.md` §4.8（SSH-SESSION——S1–S5 ∥ NS1–NS5 ∥ 边界 ∥ 相容性核对 5 条 ∥ 待定项 3 条）；台账 **#1436**。

**待定项 3 条（禁代拍——设计轮给并列选项+代价，用户拍）**：① PTY 依赖政策（同 §4.7 待定项 1 同题）② 「记住密码」（父侧建议第一刀不做——会话内复用即够；**用户尚未裁，保持待定**）③ 跨平台口径。

**父侧备注（方向候选，非结论）**：`ssh -tt`（本地无终端也强制远端分配 PTY）+ 流式管道 + `SSH_ASKPASS`（`SSH_ASKPASS_REQUIRE=force`）——**可能零原生件达成 S1–S3**；存在与否 / 够不够用 = 设计轮实评定（父侧此前「spawn + PTY」表述系说快——Node 侧进程真 PTY 纯标准库做不到，此处收正）。

**本批推进方式**：一块石头 = 本设计轮（机制写细 + 待定项变可拍选项）；实施 = 下一块石头（设计批准后另起——用户拍）。

**裁决轮（用户 2026-10-14 16:49–16:52）**：① PTY 依赖 = **⓪ 零原生件**（原话「我支持方案1」——父侧读回「列表首项 ⓪」经默认）∥ ② 记住密码 = **③ 只记非密字段**（原话「密码那个我倾向3」）∥ ③ 跨平台 = **三平台实现面全覆盖 + 验证口径收窄**（原话「三个平台要都能用，但是不用都验证，windows验证过就行了，其他平台按资料实现，等用户反馈就是了」）。

**网查确认（父侧 · 2026-10-14 · 文档面）**：`SSH_ASKPASS_REQUIRE` = OpenSSH **8.4**（2020-09）引入（官方 release notes 实读）；macOS 自带 ssh = 9.0p1+（Ventura 多源实测读数）∥ Linux 主流 = Ubuntu 22.04 / 8.9 ∥ 24.04 / 9.2 ∥ Debian 12 / 9.2 ∥ RHEL 9 / 8.7 ∥ Amazon Linux 2023 / 8.7——**全部 ≥8.4**；例外 = RHEL 8 / CentOS 8 代（8.0p1，低于门槛）——缓解建议 = 占位 `DISPLAY` 兼容旧语义（新旧两代都通）。POSIX 包装档形已由 MSYS POSIX ssh 10.3p1 本机实测通过。**实机腿（mac / Linux）仍缺**——按用户口径 = 按资料实现 + 用户反馈迭代。以上材料随评审后修正轮入设计 §6.22。

**审批门口径（用户 16:47 确认）**：`ssh` 写动作走既有审批门（与 `bash` 同门）——**AUTO 场景零打扰**（自动过），手动场景逐条问；只读 `list`/`read` 免审批。

**下一步**：设计评审待用户点火（评审对象 = 设计稿 §6.22 + 本批档；评审后一个修正轮合入：评审发现 + 三条裁决 + 网查材料）。

## §2 批次任务与设计（eng-designer）
**状态行**：设计完成（收口面修正轮已落（漂移申报 ①–⑦ 逐号；零产品码；机检 = 零新增红））
<§2 模板占位：本批条目（覆盖） / 设计档落点 / 机制设计 / 受影响文件与测试覆盖 / 验收对照 / 关键决策 / 上抛项>

### 本批条目（覆盖 = 需求档 §4.8 全条 · 逐条有设计答复）

**三方一致清单**（需求档条目 = 本段 = 设计档判据回指）：

| # | 需求档条目 | 设计答复落点（`docs/core/design/TOOLS.md` §6.22） | 判据句 |
|---|---|---|---|
| 1 | S1 建会话（密钥优先 · 密码窗） | ⑤ 连接建立 ∥ ② 密码喂入链 ∥ ⑧ 三端弹窗载荷 | `:1256`（AC-S1） |
| 2 | S2 多往返 · 状态保持 | ④ 生命周期（池/保活）+ 动作表 `send`/`read` | `:1257`（AC-S2） |
| 3 | S3 交互流程（提示符 / 确认 / 分页） | ① 远端 PTY（`-tt`）∥ ③ 提示符/静默判定 | `:1258`（AC-S3） |
| 4 | S4 读回驱动 · 保活（帽） | ③/⑥ 超时与输出帽 ∥ ④ 闲置与自动关闭 | `:1259`（AC-S4） |
| 5 | S5 用户可插话 · 实时可见 | 动作表 + 既有 `onToolOutput`（零新面） | `:1260`（AC-S5） |
| 6 | NS1 零第三方运行时依赖 | 已裁 ⓪ 单支验收（`package.json` 运行时依赖零新增 + 全链实走；版本面注在判据句） | `:1261`（AC-NS1） |
| 7 | NS2 不卡死（超时/帽） | ③/⑥（硬超时 + 可读失败句 + 帽） | `:1262`（AC-NS2） |
| 8 | NS3 破坏性动作先确认 | 接口契约（`readonly:false` + `isReadonlyAction` + `formatPermission` `ssh` 行 + 携密径掩码占位） | `:1263`（AC-NS3） |
| 9 | NS4 凭据零入上下文 | ⑦ 零入上下文 + 回显遮蔽 ∥ ⑧ 载荷（值只走返回路） | `:1264`（AC-NS4） |
| 10 | NS5 宿主层 = 核 | 接口契约（核内两档单源；端侧零实现副本） | `:1265`（AC-NS5） |
| 11 | 边界四条（全屏仿真 / 凭据托管 / 文件传输与隧道 / 工具不与用户问答） | §6.22 边界节 + 「先例调查结论」F5 行 | `:1332`–`:1341` 区（边界节） |
| 12 | 相容性核对 5 条 | 「先例调查结论」表（§4.7 / F5 / 服务端异面 三行）+ 邻面（N3·N6 → 边界节 ∥ ④/⑥；F1 → 接口契约表） | `:1295-1304` 区 |
| 13 | 裁决三条（用户 2026-10-14 三裁——选定 + 备选在册） | 「裁决记录」三表 | `:1306-1330` 区 |

**明确出批（不做——登记）**：实施（含 `tool-docs/ssh.md` 英文正文落笔——内容权 = 主 agent、落笔 = eng-coder）；真机腿 / macOS·Linux askpass 腿 / 远端 PTY 尺寸实测 = **实施轮**（设计内已列为「未核项」，未假装已核）；评审后续轮 / 批准 = 主 agent 发起。

### 设计档落点（file:line）

- `docs/core/design/TOOLS.md` **§6.22 SSH 会话工具**——`:1133` 起（≈223 行；含机制九层 / 接口契约 / 落点文件清单 / S1–S5·NS1–NS5 判据句 / 用例表 / 关键决策 / 先例调查结论 / 裁决记录三表 / 边界 / 实测证据）。
- 同档 **§7**：`D-TO17`（`:1377`）· `D-TO18`（`:1378`）。
- 同档 **变更记录**：`:1430`–`:1433`（本批两行）。
- **落点判定**（写明）：§4.7 TTY-DRIVE 的**设计面从未落地**（旧档 `docs/core/design/E2E-HARNESS.md` 已删除；「设计面待重做」随后随台账 #8 废弃）⇒ 无「独立档」先例可随；本条 = 工具面机制（§6.12–§6.21 同类同冠形）⇒ 邻位新节，档数零增、`docs/README.md` 地图零动。

### 机制设计（要旨——权威面 = §6.22；本段不重述）

- **选定 = 零原生件路**（D-TO17）：系统 openssh + `ssh -tt`（强制**远端** PTY，本地无终端也成立）+ `SSH_ASKPASS`（`SSH_ASKPASS_REQUIRE=force`）+ 流式管道；本地侧**不需要** PTY。
- **口令链**（D-TO18）：包装档（Win `.cmd` ∥ POSIX `.sh`）→ `tools/ssh-askpass.mjs` 助手（读环境变量秘密 → stdout）→ ssh 读回；覆盖 password ∥ keyboard-interactive 两径（源码两读）；`NumberOfPasswordPrompts=1`；不带 `BatchMode`。
- **判定 / 帽 / 生命周期**：静默窗（800 ms）或提示符命中 ⇒ 就绪；硬超时（10 s）+ 可读失败句；单次返回帽 8 000 字符（保尾）+ 全量 log；池 `_sshSessions`、取号 `ssh#N`、闲置 600 s 自动关闭、上限 4、回合中断存活 / 会话中止杀树、depth>0 排除。
- **凭据零入上下文**：值只走弹窗返回路 ∥ ssh 子进程环境；零入参 ∥ 零入结果 ∥ 零落盘 ∥ 端面零状态留存 + **回显遮蔽**（远端回显时按值过滤捕获面与日志面）。
- **三端弹窗载荷**：新增注入缝 `ctx.onSecretInput({kind, sessionId, host, user, port, fields[…], keys{…}})` → `{值}` ∥ `null`；三端各一落点（CLI TUI 模态面 ∥ VSC 面板卡 ∥ 桌面转口），无 UI ⇒ 可读错误句。

### 受影响文件（预计——file 级；端侧三行现况 = 2026-10-14 实读 ∥ 逐档 Δ = 实施轮首读钉 · 实施轮以实读为准）

| # | 档 | 现况 | 预计 | 动作 |
|---|---|---|---|---|
| 1 | `thincoder-core/tools/ssh.mjs` | — | 新 ≈180–260 | 工具本体（薄接线） |
| 2 | `thincoder-core/agent-tools/ssh-session.mjs` | — | 新 ≈320–420 | 会话池 / askpass 链 / 沉降 / 遮蔽 / 生命周期 |
| 3 | `thincoder-core/tools/ssh-askpass.mjs` | — | 新 ≈30–50 | 口令助手（独立进程） |
| 4 | `thincoder-core/tool-docs/ssh.md` | — | 新 | 描述档（英文面——主 agent 内容权 / eng-coder 落笔） |
| 5 | `thincoder-core/tools/index.mjs` | 80 行 | +2 | 注册 + 导出 |
| 6 | `thincoder-core/agent/helpers.mjs` | 491 行 | +1 | `SUBAGENT_TOOL_EXCLUSIONS` |
| 7 | `thincoder-core/permission.mjs` | 113 行 | +6–10 | `formatPermission` `ssh` 行 |
| 8 | `thincoder-core/agent/dispatch-run.mjs` | 185 行 | +1 | `onSecretInput` 透传 |
| 9 | `thincoder-core/agent-tools/async-discard.mjs` | 221 行 | +3–5 | 会话中止收尾 |
| 10 | `thincoder-core/i18n.mjs` | 116 行 | +3–6 键 | 弹窗 / 状态 / 失败句 |
| 11 | `thincoder-vscode/src/tools/index.mjs` | 189 行 | +2 | 端装配清单（零实现副本） |
| 12 | CLI 端（12 档 + 新档） | `tui/tool-events.mjs` 455 ∥ `tui-state.mjs` 69 ∥ `key-handler*` 7 档 135/48/119/120/131/111/122 ∥ `render-frame.mjs` 488 ∥ `layout.mjs` 243 ∥ `acp.mjs` 153 | ≈+60–110（含新档） | 回调 + 掩码模态面 + 随动；近线：`render-frame` 488（余 12——先拆） |
| 13 | VSC 端（3 档 + webview 面） | `extension/panel-callbacks.mjs` 326 ∥ `panel-chat.mjs` 261 ∥ `webview/question.js` 26 | ≈+50–90（含 webview 面） | 卡片面（`:259` 注入点）+ 消化面回落 + webview 卡面 |
| 14 | 桌面端（2 档） | `src/main/agent-bridge.mjs` 326 ∥ `renderer/questions.mjs` 48 | ≈+40–80（含渲染面） | 转口 + 渲染面弹窗 |
| 15 | 单测 | — | 新 1 档 | `docs/batches/2026-10-14-ssh-session.test.mjs`（夹具替身 ssh——随批档存放，不进 `test/` 树） |

### 验收对照（逐条回指 · 判据句全文 = §6.22 表）

- S1 `:1256` · S2 `:1257` · S3 `:1258` · S4 `:1259` · S5 `:1260` · NS1 `:1261` · NS2 `:1262` · NS3 `:1263` · NS4 `:1264` · NS5 `:1265`——每条均为机检形（回调计数 / 扫描 0 命中 / 超时读数 / 返回长度 / 探针枚举）。
- 用例表（正常 4 / 边界 5 / 错误 6）在 §6.22（`:1267-1285` 区）；单测腿 = 夹具替身 ssh（照服务端 `execImpl` 注入先例）。

### 关键决策（含否决备选 · 全文 = §6.22 关键决策节 + §7 D-TO17/D-TO18）

零原生件路（否决 node-pty / sshpass / `script`·`winpty` / argv·stdin 传密）· 凭据通路面 = `onSecretInput` + 子进程环境变量（否决入参 / 文件 / 未验的 fd 路 / 重弹）· 主机指纹 = 继承本机策略（否决强制 `accept-new` 覆盖——会放宽本机严格配置）· 审批 = 既有门 + `isReadonlyAction` 只读豁免 · depth>0 排除 · 闲置 600 s 不设配置项 · `--More--` 不自动翻页。

### 设计轮实测（可复跑 · 残留仅 `%TEMP%\ssh-session-design-probe\`——仓库零污染）

1. Windows OpenSSH 9.5p1 + `-tt` + 管道 + `.cmd` askpass + `force` ⇒ **askpass 被调用**、达认证阶段（口令故意错 ⇒ `Permission denied`）。
2. 生产形（`.cmd` → node 助手 → 环境变量取密）**无 `DISPLAY`** ⇒ 同形通过（助手留痕 `envSecret=present`）。
3. Git/MSYS OpenSSH 10.3p1 + `.sh` askpass ⇒ 同形通过。
4. 上游源码两读：`force` ⇒ 与 `DISPLAY` 无关；password ∥ keyboard-interactive 两径同走 `read_passphrase`；askpass `argv[1]` = 提示语、stdout 读回。
5. **副作用披露**：探针含 **1 次对 `10.0.0.6:22` 的故意失败认证**（用户名 `tcdesignprobe`——仅触发口令提示、不留会话）；两机 22 口均 OPEN（9/5 ms）。

### 上抛项（发现即报告——本段不自行处置）

1. **派单前提纠正（[上抛·知会]）**：派单称「§4.7 设计落点先例亦在彼」——实况 = §4.7 **设计面从未落地**（旧档已删、待重做面随后废弃）；本设计按实况定落点并写明理由，**未引用 §4.7 任何设计坐标**（零悬空指针）。
2. **依赖政策「能否一并答」（[上抛·待裁]）**：形式同题，但**可行选项集不同**——本条零原生路已实测成立；§4.7 的零原生路不覆盖其 U1 判据（被驱动进程自判真终端）。**是否与 §4.7 合并裁定 = 用户裁量**（设计只给事实，未合并、未代拍）。
3. **需求档选项集补「⓪ 零原生件」（[上抛·知会]——已闭合）**：设计据实测新增 ⓪ 为并列选项；父侧 2026-10-14 收正需求档（⓪ 已入裁决选定项）。
4. **存量红（非本批）**：`node scripts/doc-check.mjs` exit 1 为**基线态**（临时 stash 本批改动复跑同红——报告主体 = server 各档「行数面」；本批档零新增红：四个子闸 `doc-check-width` ∥ `doc-check-linecounts` ∥ `doc-check-anchors` ∥ `doc-check-targets` 全 exit 0；本档新路径两处 = 列报 · 不入闸）。
5. **未核项（如实登记 · 实施轮实测）**：本地无终端时 ssh 请求的远端 PTY **行列尺寸**；真实网络设备端到端（提示符 / `--More--` / enable）；macOS / Linux 的 askpass 助手形。
6. **并列改动面（[上抛·知会]）**：`git status` 另见 `docs/core/requirements/TOOLS.md` ∥ `docs/core/requirements/DESIGN-TOKEN-SETTLEMENT.md` 处于 M 态、`docs/batches/2026-10-14-console-walkthrough-light.md` 未跟踪——**非本批写入**（本批写域 = 设计档一档 + 本批档 §2）。

**写域自证**：本批写入 = `docs/core/design/TOOLS.md`（§6.22 + §7 两行 + 变更记录一行）+ 本批档 §2（经 `batch` 工具）。**零产品码 / 零测试 / 零需求档触碰 / 零台账触碰 / 不 commit / 不发起评审**。

### 设计评审修正轮 1（批档 §3 轮次 1 发现 ②–⑧——落地记录 · 2026-10-14）

**处置口径**：逐号点修（承父侧裁定：发现 ① 已由父侧收正需求档；②–⑧ 全收）；**就地修正**（本段指针复锚 + 回指行随正）+ 本记录块；未触需求档 ∥ 产品码；未发起评审。行宽复读：§6.22 面 0 行超 300（max 297）∥ 本段复锚行 0 行超 300。

**逐号落地表（post-edit 实读 · 设计档 = `docs/core/design/TOOLS.md`）**：

| # | 处置 | 落点（file:line） |
|---|---|---|
| ② | 三裁决 + 网查版本面合入：NS1 收 ⓪ 单支 + 版本面注；选项节转裁决记录形；非密预填面 = 机制 ⑨（落点 ∥ 键形 ∥ 复用范围）；跨平台验证口径写实；D-TO17 否决①「交用户」句收正 | `:1261` ∥ `:1306-1330` ∥ `:1202` ∥ `:1290` ∥ `:1335-1336` |
| ③ | 端侧逐档基线（2026-10-14 实读——CLI 12 档 ∥ VSC 3 档 ∥ 桌面 2 档）+ 近线注 + Δ 钉基线判据；本段同表三行随正 | `:1231` ∥ `:1246-1248` ∥ `:1250` |
| ④ | 携密径审批文案 = 掩码占位（值不回显）并入 NS3 判据 + 接口契约审批面行 | `:1263` ∥ `:1213` |
| ⑤ | 「先例调查结论」补同族池机制三坐标（实现 ∥ 设计节 ∥ 先例批） | `:1301` |
| ⑥ | 本段三处复锚（`:51` ∥ `:52` ∥ `:59`）+ 随修正轮位移的其余指针一并复锚（回指行 1–13 ∥ `:59-61` ∥ `:72` ∥ `:87-89` ∥ `:94-95` ∥ `:113`） | 本段（已就地修正） |
| ⑦ | 首见主机确认补效果说明（等效 accept-new 知情句） | `:1181` |
| ⑧ | D-TO17 择据收正（「机制可行性成立；端到端 = 实施轮真机腿」）——§6.22 ∥ §7 同拍 | `:1289` ∥ `:1377` |

**机检读数（本修正轮末跑）**：`grep '待定项|未裁'` 于 `docs/core/design/TOOLS.md` ⇒ **0 命中**；§6.22（`:1133-1355`，223 行）行宽 max = 297（0 行超 300）。

**披露（零静默）**：① 需求档 §4.8 边界句残留「见待定项 2」（`docs/core/requirements/TOOLS.md:208` 区——所引表已转裁决表）——父侧笔，报而不改；② 修正轮零新增机制语义（除 ②/④ 的成文补全 = 裁决落位 ∥ 携密径文案形）；③ `:1144` ∥ `:1377` 两处同句择据与 ⑧ 同拍收正（防同一发现的同一句式两处并存落差）。

**补记（面外补项——锚检形式一致性收正 · 修正轮末 · 自检发现并随报告披露）**：`node scripts/doc-check.mjs --root .` 全跑显示 §6.22 九处前向引用计为悬空（闸态）——八处缺「（拟新增」标记（`:1156` ∥ `:1169` ∥ `:1202` ∥ `:1209` ∥ `:1210` ∥ `:1236` ∥ `:1237` ∥ `:1238`）+ 一处短形不解析（`:1177` `agent/helpers.mjs` ⇒ 全形 `thincoder-core/agent/helpers.mjs`）；已逐处收正（另两处同族行 `:1208` ∥ `:1235` 一并补标记，求同形）。

**复跑读数（修正轮末）**：§6.22 悬空 **0**（全档 30 ⇒ **21**——余 21 处均非本批档：`MEMORY.md` 18 ∥ 需求档 `MEMORY.md` 1 ∥ server 档 2）；拟新增 27 ⇒ 35（列报 · 不入闸）。**行宽**：§6.22 max **297**（0 行超 300；`:1202` 补标记后曾 303，已收至 294）；全档三处超宽（`TOOLS.md:1376` = D-TO16 行（delete 批 2026-10-05 遗留 · 415 字符）∥ `PROMPT-SYSTEM.md:655` ∥ server `PROJECT.md:567`）均非本修正轮写入——报而不改（跨批笔域）。

### 收口面修正轮（2026-10-14 · fix 轮 · eng-designer——承 §5 四腿漂移申报 ∥ 父侧裁定 A · 台账 #1436）

**范围**：设计档收口面与现盘实施齐平（零产品码 ∥ 需求档零触）。漂移申报 ①–⑦ 逐号落点（`file:line` as-of 本轮）：

| 号 | 落点 |
|---|---|
| ① 预探升格（探连 = 全会话形）∥ 掩码守卫（单源 `ask-steps.mjs` `askMaskActive`） | `docs/core/design/TOOLS.md:1159-1161` ∥ `:1202-1203` |
| ② 会话档 439（内容行）∥ 拆档 `ssh-transport.mjs` 311 ∥ `subagent-scheduler.mjs` 451 | `TOOLS.md:1239` ∥ `:1253` ∥ `:1254` |
| ③ i18n 8 键 ∥ 端侧三行实读 ∥ 单测四档 ∥ 近线注 | `TOOLS.md:1247` ∥ `:1249-1251` ∥ `:1252` ∥ `:1255-1256` |
| ④ NS5 两 ⇒ 四档 ∥ E4 收细（取消 ⇒ 零后续尝试） | `TOOLS.md:1271` ∥ `:1289` |
| ⑤ CLI 面体行 ∥ state ∥ §4 凭据窗行 ∥ 问句载体第四支 | `docs/cli/design/TUI.md:35-36` ∥ `:98` ∥ `:132-133` ∥ `docs/cli/design/TUI-COMMANDS.md:196` |
| ⑥ VSC 协议：§3.2 行 32–34 ∥ 计数三处 31 ⇒ 34 ∥ §12/§13 各笔 | `docs/vsc/design/WEBVIEW-PROTOCOL.md:86` ∥ `:127-131` ∥ `:358` ∥ `:455-456` ∥ `:535` |
| ⑦ 桌面：IPC `ev:secret` 行（载荷平铺）∥ 映射 十九 ⇒ 二十 / 十三 ⇒ 十四 ∥ 计数六处 二十四 ⇒ 二十五 ∥ 白名单 52 ⇒ 53 ∥ `secret:respond` 行 | `docs/desktop/design/IPC.md:25` ∥ `:42` ∥ `:56` ∥ `:94` ∥ `:97` ∥ `:234` ∥ `:247` ∥ `:156-157` ∥ `:127` ∥ `:363-367` |
| ⑦ SHELL：树四条随正 ∥ §3 活动事件行 ∥ §4 项 5 ∥ §5.1 两行读数 | `docs/desktop/design/SHELL.md:32-33` ∥ `:34-35` ∥ `:69` ∥ `:87` ∥ `:142` ∥ `:190-191` |
| ⑦ RENDERER：计数三处 二十三 ⇒ 二十五 ∥ 清码全族 ∥ §5.1 四行读数 + 新档行 | `docs/desktop/design/RENDERER.md:39` ∥ `:42` ∥ `:137` ∥ `:178` ∥ `:329-337` |
| ⑦ PROJECT：O 行清码全族 ∥ BE 行随动补段（事件 24 ⇒ 25 ∥ 请求面 47 ⇒ 53） | `docs/desktop/design/PROJECT.md:1204` ∥ `:1243` |
| ⑦ 清码全族（三族 = 审批 ∥ 提问 ∥ 凭据；三清径同引） | `docs/desktop/design/ACTIVITY.md:61` ∥ `docs/desktop/design/UI.md:31` ∥ `docs/desktop/design/CHAT.md:152` ∥ `:222` |

**机检读数（`scripts/doc-check.mjs` 现跑）**：FAIL(锚) **24**（= 基线）∥ FAIL(行宽) **3**（= 基线——三行皆本批外存量）∥ 本批五档 Δ 报告 = **零新增**（三次收线：新悬空 6 ⇒ 0 ∥ 超宽新增 3 ⇒ 0 ∥ 行数 Δ±1 三处 ⇒ 0）。

**收线三笔（均本轮自纠、零新增红）**：
1. 悬空锚 6 处（简称路径 ⇒ 全仓相对路径；拟新增档用裸名「`status-line.mjs`（拟新增）」）。
2. 行宽 3 处超 300 字符（IPC `:42` ∥ `:156` 拆段重组 ∥ SHELL `:32` 树行按既有续行式折行）。
3. 行数口径三处按机检实读收正（`events.mjs` **287** ∥ `secret-prompt.mjs` **323** ∥ `agent-bridge.mjs` **331**——与 §5 读数 288 ∥ 324 ∥ 332 差一，**以机检实读为准**；同拍 = 三档变更记录）。

**披露（报告在前，处置在册）**：
- **端侧 Δ 合计 +147 不可复现**（git numstat 实读 +163）⇒ 设计档**不写合计**，逐档明细只回指 §5 落点表。
- 订阅面 = **25 通道**（非派单 24）；白名单 = **53 项**；回调 = 二十；映射 = 十四通道。
- 判记录面零触（照裁定）：`PROJECT.md:856` ∥ `:996` ∥ `:1107`（dated 验收注）∥ 五档变更记录内旧句（历史沿革）；`SETTINGS.md:335` 白名单计数 = 跨批笔域，**只报不改**。
- 「已开搜索支路 = 另批小修项」：照裁 A **自认残口**（本批零触）。

**零产品码 ∥ 需求档零触**（设计收口面齐平一轮）。

## §3 设计评审（评审子代理）

### 轮次 1（评审子代理）

| # | Category | Severity | Issue | Suggestion |
| 1 | Document ownership | 🔴 | 同一机制（本地 PTY 需求）两档相反表述：需求档 `docs/core/requirements/TOOLS.md:191`「本地侧给 ssh 真 TTY（PTY）」∥ `:181`「本条的本地侧同样需要给 ssh 进程真 TTY」∥ `:199`「PTY 需要原生件」 vs 设计档 `docs/core/design/TOOLS.md:1142`「本地侧无 PTY 也成立（本能力的设计支点）」· `:1143`「本地侧无需真 PTY（无需原生件）」· `:1297`「本条只需**远端** PTY（本机 ssh 客户端代配）」——且与需求档自持裁决 `:226`「已裁 = ⓪ 零原生件」相抵（⓪ 的可行性正以「本地无 PTY」为前提）。 | 按设计机制收正需求档三处（本地侧无 PTY；远端 PTY 由 `ssh -tt` 分配；零原生件），或把该偏离显式登记为需求面修正并列入本批上抛项——两档对同一机制只保留一种表述。 |
| 2 | Requirements coverage / doc-state | 🟡 | 三条待定项裁决已落需求档（`:222`「三裁在表」· `:226`–`:228`「已裁」），设计 §6.22 仍以开放待定形呈现：`:1259`「待定项 ① 未裁 ⇒ 双支验收」· `:1303` 节题仍标「**禁代拍**」· `:1288` 仍写「待定项 ① 交用户」；② 的预填面细化义务（需求档 `:227`「预填面的落点与形态 = 设计轮细化」）与 ③ 的混合口径（需求档 `:228`「三平台实现面全覆盖 + 验证口径收窄」）未落进设计；网查版本面材料（本批档 `:25`「以上材料随评审后修正轮入设计 §6.22」）亦未入。 | 修正轮把三裁决 + 网查材料一次性合入 §6.22：NS1 判据收为 ⓪ 单支、待定项节转裁决记录形、补 ② 非密预填面落点与 ③ 实机腿口径、D-TO17 否决①「交用户」句收正。 |
| 3 | Affected-file annotations | 🟡 | 端侧三行（设计档 `:1245`「≈+60–110（含新面档）」· `:1246` · `:1247` ∥ 本批档 `:87`–`:89` 同表）为包级合计，未按 file 给出「现况行数 + Δ」；被点名的端档（`tui-state.mjs` · `render-frame.mjs` · `panel-chat.mjs` · `agent-bridge.mjs` 等）无逐档基线 ⇒ 结构档（500 顾问线）风险不可判。行 5–11 抽查 6 处与现盘一致（`tools/index.mjs`=80 · `agent/helpers.mjs`=491 · `permission.mjs`=113 · `agent/dispatch-run.mjs`=185 · `i18n.mjs`=116 · VSC `tools/index.mjs`=189）。 | 补端侧逐档「现况 + Δ」，或明写「实施轮首读钉基线」的落点与判据（对齐设计档 §6.12–§6.15 逐档表先例）。 |
| 4 | Acceptance criteria | 🟡 | 设计档 `:1261` NS3 判据「审批文案含**将发送原文**」与 `secret_input`（`:1224`「掩码写入 + `\r`」·「（**值永不出现**）」· NS4 遮蔽纪律）相抵：该动作若同走审批门，「将发送原文」= 秘密字面；设计未给该动作的审批文案形（掩码占位 ∥ 豁免）。 | 明写携密动作的审批文案形（如掩码占位）或豁免口径，并把该口径并入 NS3 判据句。 |
| 5 | Closest-precedent | 🔵 | 「先例调查结论」（设计档 `:1293`–`:1301`）给足实现坐标 + §4.7 偏离理由，但缺同族池机制的设计节 ∥ 先例批坐标（`bash-async` / browser 后台动作 ⇒ `AGENT-LOOP-ASYNC-POOL.md` 节 · `docs/batches/2026-09-29-tools-carryover.md` §2.1 · `docs/batches/2026-10-07-browser-async-fix.md`）。 | 在该表补一行/一组三坐标（实现 ∥ 设计节 ∥ 先例批）。 |
| 6 | Doc hygiene | 🔵 | 本批档 §2 指针/数值漂移：`:51`「`:1351` 前边界节（`:1330-1350` 区）」实况 = 设计档 :1329–1337（其后 :1339–1349 为实测证据）；`:52` 相容性核对判据「`:1327-1332` 区」实况表位 = :1293–1301；`:59`「≈248 行」实况 ≈219 行（:1133–:1351）。 | 按现盘复锚三处。 |
| 7 | Security disclosure | 🔵 | 设计档 `:1181`「首见经确认路（askpass `confirm` 提示 ⇒ 助手答 `yes`，照交互式首见语义记入本机 `known_hosts`）」在默认 `ask` 策略下等效 accept-new（指纹不经人核即入 known_hosts）；已如实陈述，但未写成决策注——与 `:1291` 否决强制 accept-new 的「放宽本机严格配置」顾虑并读易生歧义。 | 补一句效果说明（安全面知情）即可，机制不必改。 |
| 8 | Clarity | 🔵 | 设计档 `:1287` D-TO17 择据「择据 = S1–S3 全达成（两条实测腿 + 源码两读）」与实测证据表（`:1341`–`:1349`；两腿止于认证阶段）及未核项（`:1349`「密码/交互在**真实网络设备**上的端到端（实施轮真机腿）」）存在措辞落差。 | 改述为「机制可行性成立（口令链两腿实测 + `-tt` 语义文档面 + 源码两读）；S1–S3 端到端 = 实施轮真机腿」。 |

计数：🔴 1 · 🟡 3 · 🔵 4（合计 8）。

VERDICT: changes-required

### 轮次 2（评审子代理）

**复核（轮次 2）：上轮 8 项逐条对现盘 read 复读——全 Fixed；本轮新发现 0**

| # | Orig# | File | Severity | Status | Notes |
|---|-------|------|----------|--------|-------|
| 1 | 1 | docs/core/requirements/TOOLS.md | 🔴 | Fixed | `:181`「本条同样需要真 TTY（PTY），但落点在**远端**——由本机 ssh 客户端 `-tt` 分配，本地侧无需真 PTY」∥ `:191`「**远端**真 TTY（PTY——由本机 ssh 客户端 `-tt` 分配，本地侧无需）」∥ `:199`「零原生件：远端 PTY 经 `ssh -tt` 分配、本地侧无需原生件；裁决表见下」——与设计档 `:1142-1143` 支点归一；收正记录 = 需求档变更记录 `:269` |
| 2 | 2 | docs/core/design/TOOLS.md | 🟡 | Fixed | `:1261`「已裁 = **⓪ 零原生件**（需求档 §4.8 裁决 1）」+ 版本面注（`SSH_ASKPASS_REQUIRE` ≥8.4 ∥ RHEL 8 例外）；`:1306`「#### 裁决记录（三条 · 选定 + 备选在册 · 用户 2026-10-14 16:49–16:52 三裁在表）」；`:1202`「**⑨ 非密字段预填档（裁决 ② 落地面）**」；`:1290`「已裁 ⓪ 零原生件——本条只需**远端** PTY，原生件代价换不来收益」 |
| 3 | 3 | docs/core/design/TOOLS.md ∥ docs/batches/2026-10-14-ssh-session.md | 🟡 | Fixed | `:1246-1248` 端侧三行逐档现况实读（CLI 12 档 ∥ VSC 3 档 ∥ 桌面 2 档）；`:1231`「端侧逐档 Δ = 实施轮首读钉基线」；`:1250` 近线注；批档 `:87-89` 同表随正（端侧现况数值本轮未跨档复核——超本评审声明面） |
| 4 | 4 | docs/core/design/TOOLS.md | 🟡 | Fixed | `:1263`「**携密径（`secret_input` 及一切携带秘密值的调用）= 掩码占位**」；`:1213`「**携密径改掩码占位**（值不回显——见 NS3 判据）」 |
| 5 | 5 | docs/core/design/TOOLS.md | 🔵 | Fixed | `:1301`「先例批 = `2026-09-29-tools-carryover.md` §2.1 · `2026-10-07-browser-async-fix.md`（均 `docs/batches/`）」+ 实现 ∥ 设计节坐标同表行 |
| 6 | 6 | docs/batches/2026-10-14-ssh-session.md | 🔵 | Fixed | `:51`「`:1332`–`:1341` 区（边界节）」∥ `:52`「`:1295-1304` 区」∥ `:59`「`:1133` 起（≈223 行」——对上设计档 :1133–:1355（223 行）现盘；回指行 1–13 复锚 |
| 7 | 7 | docs/core/design/TOOLS.md | 🔵 | Fixed | `:1181`「**效果说明（知情）**：本机策略为默认 `ask` 时该路**等效 accept-new**——首见指纹不经人核入档」 |
| 8 | 8 | docs/core/design/TOOLS.md | 🔵 | Fixed | `:1289`「择据 = 机制可行性成立（口令链两腿实测 + `-tt` 语义文档面 + 源码两读）」+「S1–S3 端到端 = 实施轮真机腿」；§7 `:1377` 同拍收正 |

计数：🔴 0 · 🟡 0 · 🔵 0（上轮 8/8 全 Fixed；本轮新发现 0）。

VERDICT: pass

## §4 用户批准（主 agent）

**父侧代签（用户 2026-10-14 16:53「审，审完自动跑吧」授权）**——依据三条件齐备：① 评审两轮收口：轮次 1 changes-required（8 条：🔴1/🟡3/🔵4）→ 修正轮 #3 全落（②–⑧）+ 父侧收正发现①（🔴——需求档三处机制表述归一）；② 复核（轮次 2）**VERDICT: pass**（8/8 Fixed、新发现 0——批档 §3 在盘）；③ 设计令牌已签发在槽。批准 = 本批设计进入实施——**切四舱按面并行**：核（机制主体）∥ CLI ∥ VSC ∥ 桌面（三端接线，文件域零重叠）；单测按面分档（一舱一档——批档位）。

## §5 实施记录（eng-coder）
**状态行**：✅ 实施完成 2026-10-14（四腿全落（桌面 / CLI / VSC / 核）——核腿终态 clean（评审 R2 pass；余项 = 文档层））



### 实施记录（eng-coder · 桌面腿 · 2026-10-14）

**交付摘要** —— 判据源 = 设计 `docs/core/design/TOOLS.md` §6.22（⑧ 三端弹窗载荷 `:1191-1201`；桌面落点 `:1248`）+ 本档 §2 桌面舱行。
落地链路：核工具挂起 ⇒ 桥 `onSecretInput` ⇒ 门表 `askSecret` ⇒ 出站 `ev:secret` ⇒ 渲染面归约 `onSecretRequest`（切片 `secretPrompt[key]`）⇒ 弹窗（掩码输入 + 提交 / 取消）⇒ 出站 `secret:respond` ⇒ 门表 `respond` 结算 ⇒ 桥返回悬起 Promise ⇒ 核。
**值面纪律**：字段值只走 DOM ⇒ 出站载荷 ⇒ 待决门结算一条返回路——不入切片（切片只载 `fields` / `keys` 描述面）∥ 不入 store ∥ 不入任何 `console.*`（错误面只记 reason 串 / `error.message`）；批内件 C3 以 canary 机检（store / 日志 0 命中 ∥ 出站荷载恰携一次）。

**落点表（13 档 —— 全在 `thincoder-desktop/**` 与 `docs/batches/**`，零侵入核 / CLI / VSC 舱）**

| 档 | 落点 |
|---|---|
| `src/main/suspensions.mjs` | `GATE_CHANNELS` 增 `secret: "ev:secret"`（三值闭集）；`askSecret`（七键逐项白名单 + 缺省归一）；`answerSecret`（假形 ⇒ `bad-values` 不 resolve）；`respond` 分派凭据门 + 跨 kind 两向 `bad-kind`；`denyGates` 凭据门 ⇒ `null` |
| `src/main/agent-host.mjs` | `createGates` 解构 `askSecret` ⇒ `createBridge({ …, askSecret, … })` |
| `src/main/agent-bridge.mjs` | 注入面 `askSecret` + 回调 `onSecretInput: (req) => askSecret(key, req)` |
| `src/main/ipc.mjs` | 出口别名 `questionRespond as secretRespond`（同体同转口——按 `promptId` 判门，零第二实现）；头注计数 53 |
| `src/main/ipc-registry.mjs` | `secret:respond` 表行（表尾——与白名单定序同位）+ 计数 53 |
| `src/preload/preload.cjs` | `CHANNELS` 53（末位 `secret:respond`）· `EVENT_CHANNELS` 25（`ev:secret` 随 `ev:question` 后）· 头注计数 / 定序链同步 |
| `renderer/secret-prompt.mjs`（**新档**） | 六节：归约体（`onSecretRequest` / `clearSecret`）· 弹窗树（纯描述符）· 值面读取（`readSecretValues` 节点注入）· 宿主（单例 ∥ 同 `promptId` 零写）· 出站（`respondSecret` / `submitSecret`）· 装配（`attachSecretPrompt`） |
| `renderer/events.mjs` | import + `case "ev:secret"` 分派 + 回合尾 `stopped` 同清（`clearSecret(clearQuestion(...))`）+ 头注 |
| `renderer/events-subscribe.mjs` | 订阅表 `ev:secret` + 计数 25 + 计数链注 |
| `renderer/badges.mjs` | `hasPendingFor` 增第三族 `secretPrompt`（清码判据「全族皆清」） |
| `renderer/i18n-views.mjs` | ⑭ 组三键两语（`secret.label` / `secret.submit` / `secret.cancel`，值逐字同 VSC `locales/{en,zh}.json`）+ 组面头注 |
| `renderer/app.mjs` | `attachSecretPrompt(host)` 装配一行 |
| `docs/batches/2026-10-14-ssh-session-desktop.test.mjs`（**新档**） | 批内件 22 例（A 转口 7 ∥ B 弹窗载荷 4 ∥ C 出站 / 值面 3 ∥ D 装配 + 端到端 6 ∥ E 两语对等 + 通道三件套 2） |

**自定决策（透明表）**：切片名 `secretPrompt`（按会话键；只存描述面）· 门 kind = `secret` · 拒码新增 `bad-values`（非载体且非 `null` 值包）· `secret:respond` 出口 = `questionRespond` 同体别名（`ipc.mjs` 300 内容行回线零破 —— 该档 `#685` 拆点纪律）· 字典三键取 VSC 逐字（同批三端词面对齐）· 卡面可及名 = `secret.label`（对齐 VSC 端 `secret-input.js`）· 字段标签 `ssh.field.<name>` 缺键回退原名（**不空标** —— 同 VSC 端 `fieldWord`）· 提交 / 取消**非乐观摘除**（回执 `ok` 真才摘切片 —— 本端提问族 `submitAnswer` 同律；VSC 端为提交即摘卡，端差见设计档漂移报）· 背板零点击面（值面误击不退框）∥ 框内 Escape（含 IME 组字门）= 取消 · 同 `promptId` 零 DOM 写优先于词面重取（草稿保全；语言切换须先退框）。

**读数（验证）**：批内件 `node --test docs/batches/2026-10-14-ssh-session-desktop.test.mjs` = **22 / 22 绿**（fail 0）；改动 13 档 `node --check` 全 OK；`thincoder-desktop` 既有套件 `npm test` = 空绿（`test/files.mjs` 清单为空 —— 无回归面）。旧批单测红名单（预期 —— 计数面随动，旧单测不刷绿）：11 档计数断言红（`CHANNELS` 52⇒53 ∥ `EVENT_CHANNELS` 24⇒25 期望值） + 2 档预先存在红（`desktop-residuals` 期望 51 ≠ 基线 52；`subagent-panel-live-face` 期望 51 ≠ 基线 52）—— 同一文件内另有他批预先存在的红断言（词面 / CSS 行数）。

**内审（探索子代理 · 轮 1）**：产品码 **零修**（验收面 1–6 全一致；四类偏差中 PARTIAL / SILENT-SIMPLIFICATION / OUT-OF-LIST 均未发现）；文件域外 7 档逐档判「必需」（越界项 0）。待修 = 文档面漂移（见下「漂移申报」——审计实测面 > 实施者申报面）。

**漂移申报（只报不改 —— 设计档笔域 = eng-designer）**：① `docs/desktop/design/IPC.md` —— §1 事件表 / §2 请求表**缺 `ev:secret` / `secret:respond` 两行**，五处「二十四通道」计数、`:362` 白名单「52 项」；② `SHELL.md` —— §4 回调表缺 `onSecretInput`，§1 树两条「二十四条」、`agent-bridge` 行「十九回调」+ 注入四键、`suspensions` 行「五操作」「`kind` 两值」；③ `RENDERER.md` —— §1.1 三处「二十三通道」、§5.1 文件账行数与**新档 `renderer/secret-prompt.mjs` 未入册**；④ `PROJECT.md` §10 BE 计数登记点（23⇒24 ∥ 46⇒47 已落 ⇐ 现 25 ∥ 53）；⑤ 清码判据「两族皆清」live 残句五处（`ACTIVITY.md:61`（单源）∥ `UI.md:31` ∥ `RENDERER.md:137` ∥ `CHAT.md:152` ∥ `CHAT.md:222`）⇒ 应「三族皆清」；⑥ `SETTINGS.md:335` 白名单计数（跨批笔域）；⑦ 本档 §2 桌面行「预计档 = `renderer/questions.mjs`」与实落点（新档 `secret-prompt.mjs`）文面口径待对齐 —— 依据 = §2 表头「实施轮以实读为准」授权新档，非违规。

**修正轮 + 顾问评审（同会话收口）**

- **内审（探索子代理 · 轮 1）**：产品码零修（验收面 1–6 全一致 · 越界项 0）；文档面漂移面大于实施者初报（已并入上「漂移申报」）。
- **顾问代码评审 · 轮 1**：`pass` —— 8 项（1 🟡 可选加固 + 7 🔵 注释面 · 零 🔴）：①掩码字段预填防线；②`markMissing` 注释 vs 实现（「成功清标」无实现）；③`events.mjs` 「两族皆清」两处残句；④`events.mjs` 通道计数两处（二十三 / 二十二）；⑤`badges.mjs` 消费档计数（两 ⇒ 四）；⑥`agent-host.mjs` 职责注待决表「三门形」；⑦`suspensions.mjs` `keys` 数组校验不对称；⑧批档 §2 行 14 账面对不齐（已披露、报而不判）。
- **修正轮（照轮 1 · 7 修 1 认）**：①`renderer/secret-prompt.mjs:89` 掩码门 `masked || … ? null : String(prefill)`（+头注 +测试 B1 掩码预填零落断言）；②`:194/:202` 注释收正 + 每次提交就地重评（清旧标）+ 头注 `:19` 随正；③`renderer/events.mjs:33/:284`（+`:185`）「全族皆清」；④`:4` 二十五 / `:102` 二十三；⑤`renderer/badges.mjs:4` 四消费档（逐引者核）；⑥`src/main/agent-host.mjs:5` 四形；⑦`src/main/suspensions.mjs:97` `!Array.isArray(keys)`（+测试 A2 数组拒收断言）。⑧`docs/batches/2026-10-14-ssh-session.md:89` 账面对齐 = **Accepted**（笔域 = eng-designer/父侧；本档 §5 ⑦ 已显式登记在案 ⇒ 记协调项，父侧排期复锚 §2 行 14 与设计 §6.22 行 14）。
- **顾问代码评审 · 轮 2（fix-claim 核验）**：`pass` —— 7 项 `Fixed`（逐项对现盘实读命中）∥ 1 项 `Accepted`（理由成立）∥ 新增 0 项；无 must-fix 标记、无未闭合 🔴。轮 2 附注（非阻塞）：本轮新写的「切片 ∥ DOM 两面零值」口径强于实况 —— 归约面 `:45` 仍整键转存 `fields`；若后续要封切片侧，加归约面单点剥离即可。
- **读数复跑（修正轮后）**：批内件 `node --test docs/batches/2026-10-14-ssh-session-desktop.test.mjs` = **22 / 22 绿**（fail 0）；改动档 `node --check` 全 OK；`thincoder-desktop` `npm test` = 空绿。
- **终态**：**clean**（产品码零待修 —— 内审 + 两轮顾问评审均无 🔴 / 无 must-fix；余项 = 文档层漂移 + 批档 §2 账面复锚，均为父侧 / 设计侧排期项，已逐条登记）。

### 实施记录（eng-coder · CLI 腿 · 2026-10-14）

> 段状态行未改（既有腿注在档）——本腿终态见本块末行。

**交付摘要** —— 判据源 = 设计 `docs/core/design/TOOLS.md` §6.22（⑧ 三端弹窗载荷 `:1191-1201`；CLI 落点 `:1200`）∥ 本档 §2 CLI 舱行（`:87`）。
落地链路：核工具挂起 ⇒ `tool-events.mjs` `onSecretInput` ⇒ TUI 凭据窗（`state.secretPrompt`——模态族第四支）⇒ 提交 / 取消 ⇒ `interaction.mjs` `askSecretInput` 的 Promise ⇒ 回调返回值（**值只在返回路**）。
面：步进（一屏一字段；Enter 推进 / 末步提交 ∥ Esc 整窗取消 ⇒ `null`）；掩码回显 = `ask-steps.mjs` `maskEcho` 同变换（显示层，提交值取 `state.input` 原数组）；**值零留面体态**（掩码值只走字段决议闭包——不入 `state` ∥ 不入对话行 ∥ 不入日志）；预填仅非密字段（掩码零预填——设计 ⑨）。
词面：`keys.title` / `keys.prompt` = i18n 键端投影（`t(key, vars)` 插值 `host` / `user` / `port`）；字段标签 `ssh.field.<name>` 缺键回退原名（同批三端同式）。

**落点表（16 档 —— 全在 `thincoder-cli/**` 与 `docs/batches/**`，零侵入核 / VSC / 桌面舱；读数 = 内容行，同设计现况口径）**

| 档 | 落点（Δ） |
|---|---|
| `src/tui/secret-prompt.mjs`（**新档** 201） | 面体单源：载荷归一 · 步进 · 掩码判据 · 目标 / prompt / 标签行 · `secretPromptSubmit` · `secretPromptCancel` · `runSecretPrompt`（字段决议闭包）· 无 UI 拒件 `refuseSecretInput` + `SECRET_NO_UI_TEXT` |
| `src/tui/interaction.mjs` 144⇒156 | `askSecretInput(payload)`（重入守卫 = 后到者 reject）+ 导出面 |
| `src/tui/turn-face.mjs` 67⇒69 | `createInteraction` 解构 + `turnCtx` + 返回面 |
| `src/tui/agent-turn.mjs` 420⇒422 | ctx 解构 + `buildToolCallbacks` 实参 |
| `src/tui/tool-events.mjs` 455⇒460 | `onSecretInput` 键（注入 ⇒ 直递 ∥ 未注入 ⇒ `refuseSecretInput` 可读句——不挂起） |
| `src/tui/tui-state.mjs` 68⇒69 | `secretPrompt: null` 切片 + 行注 |
| `src/tui/key-handler.mjs` 135⇒143 | 序 2c 守卫（Esc / Enter（含 `enter` ∥ 裸 `\r` 变体）/ ↑↓ / PgUp·PgDn 归面并吞） |
| `src/tui/key-handler-modals.mjs` 131⇒145 | `handleSecretPromptKeys` |
| `src/tui/key-handler-search.mjs` ⇒ +4 | **裁 A 补**：Ctrl+F 入场排除集 += 凭据窗 ∥ 团队问句面 ∥ 密码步（`askMaskActive` 单源）——掩码面明文旁路封口 |
| `src/tui/layout.mjs` 243⇒246 | overlay 第四支（契约 `{ lines, scroll }`）+ 掩码 buf 判据并一支 |
| `src/tui/render-frame.mjs` 488⇒495 | 标题末支（`keys.title` 端投影）· 输入框第四支 · 状态行一句 · `attentionKind` 计入（blocked） |
| `src/tui/suspension-drive.mjs` 262⇒261 | 手动 digestCtx `askSecretInput: null`（与 askQuestion 同拍） |
| `src/acp.mjs` 153⇒157 | ACP 无 UI 拒件装配 + 头注（ssh 不入剔除——密钥 / agent 径照常） |
| `src/acp/session.mjs` 54⇒55 ∥ `src/acp/bridge.mjs` 440⇒448 | 转口透传 + 回调键（缺省零注入 ⇒ 核工具自身抛句） |
| `docs/batches/2026-10-14-ssh-session-cli.test.mjs`（**新档** 331） | 批内件 7 腿：回调解 / 模态进出 + 掩码零留存 / 取消 / 无 UI 双面 / 负控 + Enter 变体 / 词面投影 / 裁 A 搜索守卫 |

**自定决策（透明表）**：① 模态形态 = 步进 + overlay + 共享输入框（照 `teamAsk` 先例，非单屏多字段）② 掩码值跨步暂存 = 字段决议闭包（不入 `state`——NS4）③ 必填空 = 面内驻留（零新文案）④ 取值口径同 `/team login`（掩码原样 ∥ 非掩码 trim）⑤ 预填仅非掩码（设计 ⑨）⑥ 无 UI 句 = 端面单源常量（`SECRET_NO_UI_TEXT`；ACP 经 `acp.mjs` 取用——跨面 import 先例 = `acp/login.mjs`）⑦ `render-frame.mjs` **未拆**（488⇒495，设计近线注「先拆」未执行——见漂移申报）⑧ 缺省 `onSecretInput` = 端面显式拒（与 `onQuestion` 的「缺 ⇒ 键缺席」**有意不同**——「无 UI ⇒ 可读错误句」不挂起）⑨ `attentionKind` 计入 `secretPrompt`（与审批 / 提问同族）；`timer-watch.modalOpen` **不计入**（在飞回合族——`state.processing` 门承担）⑩ 裁 A 修正（父侧 2026-10-14 裁 = A 本批顺手修）：Ctrl+F 入场守卫排除集扩三处（CLI 代码面；设计档 `TUI.md` 优先级链 = 设计席收口面，本腿零改设计档）。

**读数（验证）**：批内件 `node --test docs/batches/2026-10-14-ssh-session-cli.test.mjs` = **7 / 7 绿**（fail 0）；改动 16 档 `node --check` 全 OK（`scripts/check-syntax.mjs` = 125 档 OK）；`thincoder-cli` 套件 `node test/run.mjs` = 空绿（零回归）。行数：`render-frame.mjs` **495**（余 5）∥ `tool-events.mjs` 460 ∥ 余档 ≤ 262 ∥ 新档 201 / 批内件 331；全 ≤ 500。
旧批件红名单（先存 · 复跑读数与改前同 —— 非本腿引入）：`2026-09-29-stall-indicator-cli.test.mjs` T-SI3 / T-SI4（期望串缺 `(empty)` 标题回退——2026-09-30 crossline 批增行所致）∥ `2026-10-10-login-entry-completion-cli.test.mjs` 腿1c2（期望「网络不可达」vs 现词「网络不可达——请检查地址与端口」——2026-10-13 ledger-cleanup 批 #1247 改词所致）。

**内审（探索子代理 · 轮 1）**：终判 `divergent`——**实现面四类零命中**（六 AC 全成立；三处有意选择判成立）；唯一 divergent = 记录面对账（受影响文件行未复钉——本块即复钉）；🔵3（搜索旁路 → 裁 A 已修 ∥ Ctrl+C 中止径残留 ∥ 词面归属）。
**代码评审（advisor · 轮 1）**：`changes-required`——🟡2（i18n 端投影不完整：`${host}` 未插值 + 字段标签未投影；`render-frame` 近线未拆）+ 🔵4（键面序 / Enter 判据 / 无 UI 句归属 / 批内件自造键）。
**修正轮（轮 1 后 · 裁 A 并入）**：① i18n 端投影补齐（`t(key, vars)` + `fieldWord`）② Enter 判据含 `enter` ∥ 裸 `\r` 变体（封死落编辑族面）③ 批内件腿 6 补真载荷断言（真键 + `${host}` 插值 + 标签）+ 件头计数随正 ④ **裁 A**：Ctrl+F 入场守卫 + 批内件腿 7。
**代码评审（advisor · 轮 2 · 仅核 fix 声明）**：verdict = `pass`（无新 🔴；#1 / #5 / #7 判 Fixed；余 🟡2 = 报告类（页档 × 设计席 / 结构债）+ 🔵3 未修（键面序 ∥ 中止径 ∥ 无 UI 句归属）+ 新 🔵2（件头计数 → 本轮已修 ∥ 「已开搜索」残口 = 裁 A 注释自认、非回归）。
**终态 = `clean`（收敛）**；报父侧未修项 = `render-frame.mjs` 495 未拆（结构债，判据线内）+ `TUI.md` 页账随正（设计席）+ 无 UI 句归属（核字典 or 端常量）+ teamAsk（序 2b）Enter 判据未同改（先存面）+ 设计预算行实测复钉（CLI 腿实测 ≈ +271 行 vs 设计「≈+60–110（含新档）」——本块落点表即首读基线）。

### 实施记录（eng-coder · VSC 腿 · 2026-10-14）

**腿** = VSC 端面（`ctx.onSecretInput` 回调接线 + 凭据卡面 + 消息通道 + 字典 + 批内件）；设计单源 = `docs/core/design/TOOLS.md` §6.22（⑧ 载荷 `:1194` ∥ 落点 VSC 行 `:1247`）。核 / CLI / 桌面三腿另舱——本席零触碰（写入面全落 `thincoder-vscode/**` + `docs/batches/**`）。

**交付摘要（逐档 Δ = `git diff --numstat` 实读）**

| 面 | 档（`thincoder-vscode/`） | Δ 行 | 落点 |
|---|---|---|---|
| 回调接线 | `src/extension/panel-callbacks.mjs` | +34（326 → 360） | `makeAskSecretInPanel`（`:80-99`）+ `cbs.onSecretInput`（`:293`） |
| 应答径 | `src/extension/panel-messages-turn.mjs` | +18 → 233 | `handleSecretInputResponse`（`:175-188`，`questionResponse` 同构） |
| 分发表 | `src/extension/panel-messages.mjs` | +2 → 392 | `case "secretInputResponse"`（`:297`） |
| 队列表 | `src/extension/chat-panel.mjs` | +1 → 457 | `_secretQueue`（`:65`）+ waiting 四队列判据（`:286`） |
| 消化面回落 | `src/extension/panel-chat.mjs` | +3 → 264 | 无人值守 digest 显式取消桩（`:243`） |
| 卡面端壳 | `webview/secret-input.js`（新） | 112 | `question.js` 同族（词键 + `${host}` 插值 ∥ 掩码 / 非密预填 / 必填门 ∥ 摘卡 + 回焦） |
| webview 分发 | `webview/chat-messages.js` | +16 → 296 | `secretInput` / `secretInputCancelled`（`:207-218`） |
| 卡面样式 | `webview/base.css` | +62 → 550 | `.secret-card` 块（`:379-438`，紧邻 question 卡族） |
| 字典 | `locales/en.json` ∥ `locales/zh.json` | +10 / +10 → 334 | `secret.*` 三键（端特有）∥ `ssh.*` 七键（键形 / 值逐字同核字典） |
| 协议登记 | `AGENTS.md` | +3 → 138 | 三消息型三行（`:100-102`） |
| 端装配清单 | `src/tools/index.mjs` | +4 → 193 | `sshTool` → import / re-export / `builtinTools`（`:26` / `:169` / `:182`） |
| 批内件 | `docs/batches/2026-10-14-ssh-session-vsc.test.mjs`（新） | 409 | V1–V10 |

**协议形（本腿定形——`question` 家族同形）**

- ext → wv：`{ type:"secretInput", payload, promptId }` ∥ `{ type:"secretInputCancelled", promptId }`（abort 摘卡）
- wv → ext：`{ type:"secretInputResponse", values:{…}|null, promptId }`（null = 取消 ⇒ 工具侧可读句）
- 载荷 = 核原样透传（零改写）；`promptId` = 面板单调计数、按 id 精确配对；值只走返回路（卡面零日志 ∥ 零留存；掩码字段 `type=password` 渲染）。

**批内件（复跑 = `node --test docs/batches/2026-10-14-ssh-session-vsc.test.mjs`）**

V1 回调接线 ∥ V2 取消径 ∥ V3 abort 径 ∥ V4 配对纪律（错序 / 未知 id no-op）∥ V5 消化面桩（结构）∥ V6 卡面渲染（fake DOM——词键 + 插值 + 掩码 / 预填 / 零预填硬化）∥ V7 提交 / 取消出站 + 回车 / IME 门 ∥ V8 必填门 ∥ V9 两语对等 + 双源同值 + 协议三型（结构）∥ V10 词面合同（跨仓：核发射字面在端词典可解）。读数 = **10/10 绿**（本席实跑）；仓套件 `npm test` = 空绿（零回归，test 树 2026-09-28 全清后自持）。

**决策透明表**

| # | 决定 | 依据 / 理由 |
|---|---|---|
| 1 | title / prompt 键形从核发射字面（`ssh.credentialTitle` 等）；字段标签键 `ssh.field.<name>`（缺键回退字段原名） | 核把键入 `CORE_MESSAGES` 并以同字面发射（`thincoder-core/i18n.mjs:80-86` ∥ `agent-tools/ssh-session.mjs:308/372`）；本地键恒胜 ⇒ 值不同即端差（本地副本逐字同核字典） |
| 2 | 消息三型 = `secretInput` / `secretInputResponse` / `secretInputCancelled` | `question` 家族同形（端协议表 `:97-99` 先例） |
| 3 | 必填门 = 聚焦首个空必填字段 + 零出站（零新文案） | 载荷 `required` 语义；零新文案 = 沿 CLI 同判 |
| 4 | 掩码字段恒零预填（载荷误填 `prefill` 亦忽略） | 设计 ⑨「密码零预填 ∥ 零记忆」+ CLI / 桌面同判 |
| 5 | 端装配清单本席补 `src/tools/index.mjs` +4 行 | 设计 §6.22 落点清单 #11 ∥ 批档 §2 行 11「端装配清单（零实现副本）」；不补则本卡在 VSC 不可达 |
| 6 | base.css 550 行留在 base.css（不拆档） | 行数档明写只辖 `.mjs`/`.js`；拆档破坏卡族与 question 卡同址 |

**清单外新增（设计表逐名未列——理由）**

`panel-messages-turn.mjs` / `panel-messages.mjs` / `chat-panel.mjs` / `webview/chat-messages.js` / `webview/base.css` / `webview/secret-input.js` / `locales/*.json` / `AGENTS.md` / `src/tools/index.mjs`：前五档 = 消息通道 / 队列表 / 分发面（载荷与应答跨 webview 边界必需——落设计表动作列「卡片面 ∥ 消化面回落 ∥ webview 卡面」覆盖）；`AGENTS.md` = 新消息型端协议表登记；`src/tools/index.mjs` = 设计 #11 端装配清单行。全部落本席写域。

**审计与代码评审轮次与终态**

| 轮 | 面 | 结论 |
|---|---|---|
| 内部 explore 发散审计（1 轮） | 实现 vs 设计 §6.22 ⑦/⑧/⑨ + NS3/NS4 | CLEAN——四类偏差零命中；两条「设计未写面」（字段标签键形 ∥ digest 回落桩）判为同族先例 / 加性填充，非设计外机制 |
| advisor 代码评审 R1（全量） | 13 档 + 设计 + 批档 | changes-required：🔴1（端字典键字面与核载荷键字面不一致 ⇒ 词面在真实载荷下出键名）∥ 🟡1（用例夹具自造键形，词面合同无人看住）∥ 🔵2（掩码 prefill ∥ base.css 行数） |
| fix round（R1 → R2） | — | ①🔴 七键改记核字面 + 逐字同值；②🟡 夹具改核字面 + V9 加「本地副本逐字同核投影」硬断言 + 新增 V10 跨仓字面扫描；③🔵 掩码恒零预填；④🔵 base.css 不处置（理由见决策表 #6）；⑤ 工具装配清单补入（`:26/:169/:182`） |
| advisor 代码评审 R2（修边复验） | 修边档 | **pass**（🔴 / 🟡 闭；残余 🔵 一项 = V4 夹具第二载荷旧键形（零功能影响）⇒ 本席顺手收正后复跑仍 10/10 绿） |
| 终态 | — | **converged / clean** |

**未决上抛（[上抛·知会]）**

- `docs/vsc/design/WEBVIEW-PROTOCOL.md`（§3.2 登记表 / §12 · §13 对表）未登记三新消息型（本席 grep 零命中）——端 `AGENTS.md` 侧已登记；设计档补记属设计笔，本席不改。
- 设计 §6.22 `:1247` 坐标已漂移（`panel-callbacks.mjs:259` → 现 `:293`；档面数 3 → 实测 13 档）——仅报告，复锚由设计方裁定。

### 实施记录（eng-coder · 核腿 · 2026-10-14）

**交付摘要** —— 判据源 = 设计 `docs/core/design/TOOLS.md` §6.22（判据句表 `:1252`–`:1265` ∥ 用例表 `:1267`–`:1285`）+ 本档 §2 核舱行（行 1–10、15）。
连接流 = **探连 → 升格 ∥ 认证失败 → 单次带密**（父侧 2026-10-14 裁定 A：探连 = 全会话形 `-tt` + 保活 + 管道 + `NumberOfPasswordPrompts=0`；密钥机全程恰 1 次连接；认证类失败 ⇒ 弹凭据窗 ⇒ 单次 `PP=1` 带密会话；指纹 / 不可达 / 超时 ⇒ **弹窗之前硬停**）。
口令链 = 包装档（Win `.cmd` 首行 `@echo off` ∥ POSIX `.sh` 0700）→ `tools/ssh-askpass.mjs`（stdout 首行 = 答复）→ `TC_SSH_SECRET`（经 `nodeChildEnv`；零入参 ∥ 零入结果 ∥ 零落盘 ∥ 零回显；捕获面与日志面同一遮蔽点）。
词面 = 核字典键（三端投影）：`ssh.credentialTitle/credentialPrompt/secretTitle/secretPrompt` ∥ `ssh.field.user/password/secret` ∥ `ssh.no_ui`。

**落点表（核舱 16 件 = 新 5 ∥ 改 10 ∥ 批内件 1；行数 = 内容行实读）**

| # | 档 | 形 | 行 | 落点 |
|---|---|---|---|---|
| 1 | `tools/ssh.mjs` | 新 | 92 | schema ∥ `validateArgs` ∥ `isReadonlyAction`（list/read 免审）∥ 动态 import 机制档 |
| 2 | `tools/ssh-askpass.mjs` | 新 | 35 | 口令助手（独立进程；`argv[1]` = 提示语 ⇒ 三分支：confirm 语 ⇒ `yes` ∥ 有秘密 ⇒ 秘密 ∥ 无秘密 ⇒ `yes`） |
| 3 | `tool-docs/ssh.md` | 新 | 34 | 描述档（动作表 / 凭据零回显 / 边界（不做全屏 ∥ 不做文件传输隧道）/ 会话与闲置口径） |
| 4 | `agent-tools/ssh-session.mjs` | 新 | 439 | 会话面：池 ∥ 连接流 ∥ 动作（send/read/secret_input/close/list）∥ 凭据窗 ∥ 非密预填档 ∥ 生命周期 |
| 5 | `agent-tools/ssh-transport.mjs` | 新 | 311 | 运行面：askpass 链 ∥ 子进程 ∥ 沉降 ∥ 遮蔽 ∥ 帽 ∥ 失败分类（**拆档由 = 设计 `:1236` 授权句**） |
| 6 | `tools/index.mjs` | 改 82 | +2 | 注册 + 导出 |
| 7 | `agent/helpers.mjs` | 改 492 | +1 | 子代排除集 += `ssh` |
| 8 | `permission.mjs` | 改 126 | +13 | `formatPermission` ssh 行（一般 = 将发送原文；携密径 = 掩码占位） |
| 9 | `agent/dispatch-run.mjs` | 改 185 | +1 | `onSecretInput` 透传 |
| 10 | `agent-tools/async-discard.mjs` | 改 255 | +34 | `SSH_SPEC`（roleOf ∥ describe ∥ dispose=杀树）+ `discardAbortedSshSessions` |
| 11 | `i18n.mjs` | 改 125 | +9 | `ssh.*` 8 键双语（设计估 3–6） |
| 12 | `agent-tools/async-settle.mjs` | 改 329 | +8 | `getAsyncPool` role 表 += ssh 池 |
| 13 | `agent-tools/subagent-scheduler.mjs` | 改 451 | +3 | 取号扫描域 += `_sshSessions`（同列既有池） |
| 14 | `agent/run-stages.mjs` | 改 296 | +1 | 会话中止收尾调用点（与 `discardAbortedPool/BgTasks/BrowserTasks` 并列） |
| 15 | `agent/suspension.mjs` | 改 352 | +1 | 同址第二调用点 |
| 16 | `docs/batches/2026-10-14-ssh-session.test.mjs` | 新 | 537 | 批内件 21 例（夹具替身 ssh：真包装档 + 真助手 + 真 cmd 中介，仅 ssh 二进制为替身） |

**清单外披露（4 档 —— 设计落点表逐名未列，逐条理由）**：12 号 = 池角色表同族扩位（`_bgTasks`/`_browserTasks` 同位，不扩则 `findEntry`/`finalize` 读不到池）；13 号 = 取号扫描域（不扩则取号会与存活 ssh 会话 id 撞号）；14/15 号 = 会话中止收尾两调用点（与既有四族逐条并列；不接则「会话中止 ⇒ 逐条杀树 + 清池」判据不可达）。6 号外其余设计行皆按表落。

**自定决策（透明表）**：① 拆档 `ssh-transport.mjs`（机制档触 500 顾问线 ⇒ 设计授权句；单档 439/311 ✓ ≤500）；② `.cmd` 首行 `@echo off`（设计未写；实测缺口 = cmd 中介回显命令行顶掉 ssh 读回首行 ⇒ 口令错位为空串；POSIX 面零此面）；③ `promptPattern` 落 `connect` 参数；④ `send` 带 `settle` 开关（缺省 true）；⑤ `ssh.no_ui` 键 = 父侧 2026-10-14 补键令（en 侧逐字 = CLI 端 `SECRET_NO_UI_TEXT`，端常量收正为核键；核侧无 UI 失败句同源取用）；⑥ 探连期不推流面板（`_notify` ready 后挂）；⑦ 被中断的 connect 杀探连同径扩至带密径（评审 R1 #1）；⑧ 遮蔽冲洗只放行非秘密前缀段（评审 R2 #11 后加固）。

**读数（验证）**：批内件 `node --test docs/batches/2026-10-14-ssh-session.test.mjs` = **21 / 21 绿**（fail 0 · ≈13.9 s）；本腿 5 档 `node --check` 全 OK；运行时依赖零新增（四新档 import 全 `node:` 内建 + 仓内模块，实读）；真机 ssh 读数 = `C:\Windows\System32\OpenSSH\ssh.exe` `OpenSSH_for_Windows_9.5p1`（≥8.4 ⇒ `SSH_ASKPASS_REQUIRE=force` 可用），`ssh -G example.invalid` ⇒ `user` / `port 22` 取自本机配置（S1 配置复用面证据；件内臂 = `-l`/`-p` 零下发断言）。
**遮蔽机检 5 例**（`flush()` 加固后）：整尾前缀 ∥ 移位前缀 ⇒ 零泄漏；良性尾 ⇒ 零丢失（拼接复原）；跨 chunk 完整串 ⇒ 滤净；冲洗后继续 ⇒ 零残留。

**审计与代码评审轮次与终态**

| 轮 | 面 | 结论 |
|---|---|---|
| 内审（探索子代理 · 轮 1） | 实现 vs §6.22 十判据 + 用例表 + 四类偏差 | divergent（0🔴 / 2🟡 / 7🔵）——**静默简化零命中**；四档清单外逐条判必需（越界项 0）；打开项 = 真机腿在盘证据、探连流未入设计档、5 条验证形式/复锚 |
| fix round 1（内审后自修） | — | 判据臂补齐（S1 配置复用 ∥ S2 状态跨调用 ∥ S3/B5 分页 ∥ N3 同进程状态 ∥ NS5 注册面探针 ∥ S4 log 尾一致 ∥ E6 spawn 失败面）；核键 `ssh.no_ui`；批内件 17 → 20 例 |
| advisor 代码评审 R1（全量 · 16 档） | — | **changes-required**（0🔴 / 5🟡 / 5🔵）：#1🟡 must-fix = 带密失败径 `finalize` 不杀树 ⇒ 活子进程出池后无句柄悬挂（对端健康则长存 + 绕过 ≤4 上限记账） |
| fix round 2（R1 → R2） | — | ①#1 三条 connect 失败径全改 `hardClose`；②#2 子进程 stdin `'error'` 监听；③#4 描述档补全屏边界句；④#7 遮蔽冲洗；⑤#8 `droppedNote` 四动作；⑥#9 墓碑新 status `connect-failed` + 新可读句；新臂「带密会话未就绪（回合中止）」= **红→绿复现对**（未修版 `exitInfo=null` ✖ 实测在案；修后 ✔） |
| advisor 代码评审 R2（修声明核验） | — | **pass**（#1/#2/#4/#7/#8/#9 = Fixed ∥ #3/#10 = Accepted（有理由/有披露）∥ #5/#6 = Unfixed（文档/记录层，须随本块补记）∥ 新 🔵2 = 既有残余、非修引入、非阻塞） |
| 评审后加固（本块落盘前 · 3 行） | `ssh-transport.mjs` `flush()` | 尾缓冲只放行**非秘密前缀段**（R2 #11：移位前缀仍出返回面 ⇒ 可跨两次返回拼出完整字面）——机检 5 例全过；套件复跑 21/21 绿。**披露：该 3 行落于评审 pass 之后，R2 未复跑该行**（纯函数面已机检）。 |
| **终态** | — | **clean**（无 🔴 ∥ 无 must-fix 遗留；余项 = 文档层，见下） |

**未决上抛（[上抛·知会] —— 报而不改，设计/父侧笔域）**：① 设计 §6.22 落点表仍 15 行（无 `ssh-transport.mjs` ∥ 无 `subagent-scheduler.mjs` 行）——设计侧复锚；② 探连流（`PP=0` 预探 + 升格）未入设计档（§6.22 `:1159` 仍「PP=1 单支」表述）= 父侧裁定 A 的成文补全；③ 批内件 537 行 > 500 顾问线（硬限 800 未触）——接受并披露，拆档 = 下批候选（评审 R1 #10 / R2 已按 Accepted 记录）；④ 真机腿 = 本机 Windows OpenSSH 读数已落（见上）；mac / Linux askpass 腿 ∥ 真实网络设备端到端 = 未核（按用户 2026-10-14 口径：三平台实现面全覆盖 + 验证以 Windows 为准）。

**写域自证**：本腿写入 = 核内 16 件（见落点表）+ 本档 §5（经 `batch` 工具）。零 CLI / VSC / 桌面 / 设计档 / 需求档 / 台账触碰；不 commit。

### 实施记录（eng-coder · CLI 腿 fix 轮 · 2026-10-14 · 台账 #1436）

**范围** = 父侧派单 fix 轮「两件小修」（点修——不重开全量）：① 反交错明文口（凭据层键路由优先）② 无 UI 拒句归核字典（端取核键 `ssh.no_ui` 投影）。判据源 = 设计 `docs/cli/design/TUI.md` §4 掩码守卫条（`:139`「凭据窗在场（含搜索框已开时弹出）⇒ 键路由归掩码面 …… 键路由每键重判——随本批小复触落代码」= 本条落点）。

**交付摘要** —— ① `key-handler-search.mjs` 新增**让位守卫**：`maskSurfacePresent`（单源 = 凭据窗整面 ∥ 团队问句面整面 ∥ 密码步 `askMaskActive`——与入场排除集同三面）为真 ⇒ `handleSearchKey` 首行 `return false`（逐键重判，不依赖「进场时」一次判定）——键按无搜索态照常下行（掩码面吞面 ∥ 可打印键落编辑族 = 掩码层收字）；搜索态原地保留（退场即恢复，query 不清、匹配不清）；Ctrl+F 入场守卫的掩码条件归并至该守卫（语义不减）。② `secret-prompt.mjs` `SECRET_NO_UI_TEXT = t("ssh.no_ui")`（核字典投影——端零字面副本；运行时解析 `node_modules/@thincoder/core` realpath = 本仓 `thincoder-core/i18n.mjs`，投影值与本修前 en 字面逐字同）。批内件扩腿 8/9 + 头部计数（七 ⇒ 九腿）。

**落点表（3 档）**

| 档 | 落点（Δ） |
|---|---|
| `thincoder-cli/src/tui/key-handler-search.mjs` 128 ⇒ 137 | `maskSurfacePresent`（`:56-60`）+ `handleSearchKey` 让位守卫（`:66-70`）+ 入场守卫掩码条件归并（`:72-74`） |
| `thincoder-cli/src/tui/secret-prompt.mjs` 201 ⇒ 203 | 头注（`:15-17`）+ `SECRET_NO_UI_TEXT = t("ssh.no_ui")`（`:24-26`） |
| `docs/batches/2026-10-14-ssh-session-cli.test.mjs` 331 ⇒ 407 | 腿 8（反交错：凭据窗主面 + 同族二面 + 非掩码步负控）∥ 腿 9（核字典投影 + 端树字面扫描 + 取键正则）∥ 头部计数 |

**自定决策（透明表）**：① 让位判据 = 单一谓词 `maskSurfacePresent`（入场 / 已开两态一判据；Ctrl+F 支不再单列掩码条件，防两处漂移）② 「掩码面在场 ⇒ 键一律走掩码层」落到**搜索层让位**（`return false`）而非「弹窗时关搜索」——搜索态 / query 零触碰（照派单禁令）③ 腿 8 断言面 = 验收原句三状态面（零落 query ∥ 掩码层收字 ∥ 退场后 query 原样）+ 零明文上屏；未加回显断言（显示面缺口见下「漂移申报」——交错下输入框载面归搜索，回显断言在盘不成立）④ 腿 8 同族二面（团队问句面 ∥ 向导密码步）与负控（非掩码步照旧）随单源谓词一并立断言 ⑤ 腿 9 扫描面 = `thincoder-cli/src` 递归（口径注见评审 🔵-3）。

**记录面复钉（承内审 divergent 项 · 顾问 🟡 报告项——append-only：不复改旧行，本块即复钉）**：旧 CLI 腿块（`:285` / `:291` / `:293⑥` / `:295` / `:302` 区）读数与现盘相抵——① 批内件 **7 腿 ⇒ 9 腿**（`:291`）；② 决策 ⑥「无 UI 句 = 端面单源常量」**已作废**：现制 = 端取核字典投影（`ssh.no_ui`——端零字面副本，`:293⑥`）；③ `:302` 未修项「无 UI 句归属（核字典 or 端常量）」**已闭合**（取核字典支）；④ `key-handler-search.mjs` 落点行（`:285`「⇒ +4」）随本修复钉 = 现档 137 行（含让位守卫）；⑤ 读数行（`:295`）以本块「读数」节为准（批内件 9/9 ∥ 三档 check OK ∥ 套件空绿）。

**读数（验证）**：批内件 `node --test docs/batches/2026-10-14-ssh-session-cli.test.mjs` = **9 / 9 绿**（fail 0）；红证在盘：修前腿 8 红（Enter 被搜索层吞 ⇒ `state.search` 置 null）∥ 腿 9 红（端内字面副本命中 `tui/secret-prompt.mjs`），修后转绿；改动三档 `node --check` 全 OK（`scripts/check-syntax.mjs` = 125 档 OK）；`thincoder-cli` 套件 `node test/run.mjs` = 空绿（零回归）。行数：137 ∥ 203 ∥ 407，全 ≤ 500。

**审计与代码评审轮次与终态**

| 轮 | 面 | 结论 |
|---|---|---|
| 内审（探索子代理 · 轮 1） | 实现 vs 派单两件 + 设计 §4 掩码守卫条 | 实现面 **clean** ∥ 设计面 **clean**；唯一 divergent = 记录面（旧 CLI 腿块读数滞后——本块复钉即闭合） |
| 顾问代码评审 R1（全量 · 3 档 + 批档 + TUI.md） | — | **pass**（0🔴 ∥ 0 must-fix；1 🟡 报告项 = 同一记录面复钉（本块闭合）∥ 3 🔵 非阻塞：TUI.md `:139` 第二分句覆盖面窄于实现（设计席笔域）∥ 腿 9 扫面口径 ∥ 腿 8「零明文上屏」断言在交错下由输入框载面代偿）。引用校验 1 处警示（`secret-prompt.mjs:26`）经复核 = 假阳性（盘面逐字在 + 运行时投影相等机检 true）。 |
| 终态 | — | **converged / clean**（两件全落、验收全绿；余项 = 报告级 🔵 三项 + 域外显示面缺口） |

**漂移申报 / 上抛（报而不改）**

① **交错显示面缺口（新发现 · 域外）**：搜索已开 + 掩码面在场时，键已归掩码层但**输入框显示面**仍归搜索（`layout.mjs:62-63` `state.search ? [...search.query] : …maskEcho…` ∥ `render-frame.mjs:337-338`「 Search 」标题支先于 `:356` 凭据窗支）——本会话探针实测帧 = 框题「 Search (no match)」+ 旧查询词、掩码回显被顶掉 ⇒ 键入不可见（盲打）；**明文零上屏（非泄漏）**。修需碰 `layout.mjs` + `render-frame.mjs`（本批「行数不动」锁 + 台账 #1437 拆分在册），且设计两档（`TUI.md` §4 ∥ `TUI-INPUT-BOX.md`）未定「搜索已开 ∧ 模态面在场」的显示归属 ⇒ 报而不改，建议先由设计席定归属再排实施。
② `docs/cli/design/TUI.md:139` 第二分句只点名凭据窗（实现把三面一并纳入键路由让位——评审 🔵-2，设计席笔域）。
③ 批内件腿 9 扫面（`thincoder-cli/src`）与断言名「端全树」口径差（评审 🔵-3；现盘实测无副本——非实害）。
④ 腿 8「零明文上屏」断言在交错下由输入框载面代偿（评审 🔵-4——后轮勿读作「掩码回显已验」）。

**写域自证**：本修写入 = `thincoder-cli/src/tui/key-handler-search.mjs` ∥ `thincoder-cli/src/tui/secret-prompt.mjs` ∥ `docs/batches/2026-10-14-ssh-session-cli.test.mjs` + 本档 §5（经 `batch` 工具）。零核 / VSC / 桌面 / 设计档 / 需求档 / 台账触碰；零 `render-frame.mjs` 行数改动；不 commit。

**行数复钉（D6 回读自纠 · 机检实读）**：本块前文行数三处 + 「读数」节串按 split 口径记，差一；按批内「内容行」口径（标定实读 = render-frame **495** ∥ tool-events **460** ∥ layout **246** ∥ tui-state **69** 全 ✓）复钉 = `key-handler-search.mjs` **127 ⇒ 136** ∥ `secret-prompt.mjs` **201 ⇒ 202** ∥ 批内件 **331 ⇒ 406**。**以本条为准**（全 ≤ 500 不变）。

## §6 验证与收口（父代理）

**实施核验（父侧亲跑 · 2026-10-14）**：四腿批内件 **全绿**——核 **21/21** ∥ CLI **9/9**（复触后重跑：含腿 8 反交错 ∥ 腿 9 投影）∥ VSC **10/10** ∥ 桌面 **22/22**；全批改动档 `node --check` 通过 ∥ 各包既有套件空绿（零回归——读数在 §5 四腿块）。

**真机 E2E（父侧执行 · 全通）**：沙箱 HOME（`.thincoder/tmp/ssh-e2e/`——本机配置零触；Windows 系统 ssh 忽略 env 之实读 ⇒ 以 MSYS POSIX ssh 10.3p1 PATH 前置达成，`ssh -G` 实读沙箱 config 生效）+ 真连 `10.0.0.5`：**连**（预探升格——密钥机恰 1 次连接、零凭据窗）→ `echo e2e-ok` ⇒ `e2e-ok` → `cd /tmp && pwd` ⇒ `/tmp` → `pwd` ⇒ **`/tmp`（跨往返状态保持）** → `list` → `close`（末段输出 + 树收束）→ 关后调用回可读句；全量日志落沙箱 `tool-results/`。

**裁定在册（本批父裁）**：① 连接判定形 = **预探升格**（#5 上抛——A 裁；含 E4「取消后零后续尝试」收细；设计 `:1159-1161` 已随正）；② 掩码守卫 = **三面 + 反交错**（#6 上抛——A 裁；#10 落「键路由每键重判」）；③ #10 上抛① 交错**显示面**缺口（盲打、非泄漏）= **域外另批**（台账 **#1440**——与 #1437 同域：`render-frame.mjs` 拆分轮一并；设计显示归属先行）。

**收口面（#9 一笔清 + 父侧两小正）**：六档齐平（`TOOLS.md` §6.22 ∥ `TUI.md` ∥ `TUI-COMMANDS.md` ∥ `WEBVIEW-PROTOCOL.md` ∥ 桌面五档）＋批档 §2 复锚；`doc-check` = 基线（零新增）。父侧直接执行（机械 · 可 revert）：`TUI.md:139` 掩码三面点名 ＋「另批」⇒「本批」措辞各 1 行；核 `CHANGELOG.md` `[Unreleased]` 一行（SSH 会话工具）。

**未核事项（如实）**：mac/Linux 实机腿（按用户口径 = 文档实现 + 反馈迭代——版本面已网查确认）∥ 凭据窗**真机**腿（`.5` 仅收密钥——密码链由核腿 21 例 + 设计探腿覆盖）∥ `--More--` 真机腿（单测覆盖）∥ 交错显示面 = **#1440 在册**。**非闸红名单**（旧批单测——计数随动 / 先存，不扫绿）：桌面 11 档（`CHANNELS 52⇒53`/`EVENT_CHANNELS 24⇒25` 期望值 + 2 档改前既红）∥ CLI 2 档（改前既红，复跑读数同改前）。

**结算**：台账 **#1436 已核销**（证据 = 本节）；设计令牌随收口消费（值不入档）；提交在册（本批全集——四腿 + 文档 + 批档）。**遗留**：booked = #1437（`render-frame` 拆分）∥ #1438（`teamAsk` Enter 判据）∥ #1439（`questions.mjs` 残句）∥ #1440（交错显示面）；`SETTINGS.md:335`（跨批计数——只报不改）。

**暂缓批复核：无**（在册暂缓 = #1244——复核条件「thincoder-server 快完成时」未到，保持暂缓）。
