# 2026-10-21 · nested-sub-label
> 六段 append-only，一段一作者：§1 讨论（主 agent）· §2 批次任务与设计（eng-designer）· §3 设计评审（评审子代理）· §4 用户批准（主 agent）· §5 实施记录（eng-coder）· §6 验证与收口（父代理）。
> 编制：主 agent · 2026-10-21 · 来源 = 用户令（2026-10-21 17:43「子代理调用子代理时的那个显示问题，你好像还没搞定」）：落 2026-09-07 已批准的「块内子标」——嵌套子代理的每条活动行行首 dim 标 `explore#1 · `。
> 台账 = #1727（VSC · 归批）。前情 = docs/batches/2026-10-21-think-align-cli.md（已收口 2026-10-21）。
## §1 讨论（主 agent）
**状态行**：🔄 进行中（…）
<§1 模板占位：本批条目 / 关键判据 / 授权口径>

## 讨论记录 · 轻通道轮

**用户令（2026-10-21 17:43）**：「操，我看了一下，子代理调用子代理时的那个显示问题，你好像还没搞定啊！」

**用户是对的**：今天 `#1723` 只做了「think 不改写状态词」（标题不再被顶掉），**2026-09-07 用户批准的「块内子标」形从未实现**——`flow/block.mjs:62` 把 `sub` 只写进 `dataset.sub`（供合并判据读），**行面零渲染**，所以嵌套子代理的每条活动行没有任何身份标记。

**披露（轻通道 · 缺陷修）**：change = `appendAdvisorChunk` 在为嵌套行（`sub` 在场）渲染行首 dim 子标 `<sub> · `；reach = 共用核件（桌面 + VSC 同源）+ 两处 CSS + 五例测试；rollback = 可回退（单档三处 + 两 CSS）。

**批准形的来源（2026-09-07 用户「可以」）**

```
[▶ eng-coder#2 · glm-5.3 · running 2:15 · turn 18/100]     ← 块头不变
  模型思考/文本 …                                          ← eng-coder 自身行
  explore#1 · read — docs/design/AGENT-LOOP.md              ← 子标行（dim 色）
  explore#1 · grep — "D-E2"
  advisor · Review round 1 …
```

**改动**

| 档 | 改了什么 |
|---|---|
| `thincoder-render-core/flow/block.mjs` | 新增 `appendLineText(el, str, subLabel)`：`sub` 在场 ⇒ 行首 `span.advisor-sub`（`<sub> · ` + 正文文本节点）；无 `sub` ⇒ 维持纯文本（零变）；tool 行与 text/think 行两处接入；合并续写仍走末文本节点（子标只一份） |
| `thincoder-vscode/webview/chat.css` ∥ `thincoder-desktop/renderer/core.css` | `.advisor-sub { opacity: 0.55; margin-right: 2px; }`（dim） |
| `thincoder-vscode/test/2026-10-21-vsc-nested-sub-label.test.mjs`（新） | N1 嵌套工具行 · N2 文本/思考行 · N3 无 sub 零变 · N4 toolOutput 合并续写子标一份 · N5 两端 CSS 在场 |
| `thincoder-vscode/test/files.mjs` | 登记第 4 档 |

**走查读数（父侧实跑）**：`node test/run.mjs` ⇒ **24 pass / 0 fail**（既有 19 + 本批 5）· `check-syntax` ⇒ 143 JS files OK。

**待办（收尾链）**：设计形式化（`RENDER-CORE.md` 子块内容面 + `WEBVIEW.md` §5.5/§5.2 相关句）→ 独立评审 → 批准 → 收口。

### 1.1 第二笔（用户 17:44 澄清：指的是 think 顶标题）

**用户原话**：「我说的就是think顶标题这事儿啊！」——`#1723` 只做了「think 不改写**已有**状态词」，但**还没有状态词时**（子代理刚出生、先思考、还没调工具）走 `stateWord()` 缺省支 ⇒ 标题只剩裸 `思考中…`，嵌套子代理名照样被吃掉。这是 `#1723` 留下的缺口。

**本笔修法**（补缺，不是回退 CLI 对齐）：think 仅在 `meta.stateWord == null` 且 `m.sub` 在场时写入 `${m.sub}/${W.thinking()}`；**已有状态词时仍零改写**（CLI：工具行不被 think 顶掉）。

| 场 | 修改前 | 修改后 |
|---|---|---|
| explore 刚起、还没调工具 | `[▶ eng-coder#3 …] 思考中…`（名字丢失） | `[▶ eng-coder#3 …] explore#1/思考中…` |
| explore 已调过 read、再思考 | `explore#1/read`（`#1723` 已修） | `explore#1/read` 不变 |
| 顶层子代理思考、无工具 | `思考中…` | `思考中…`（零变） |

**落点**：`thincoder-render-core/subblocks/activity-view.mjs` `noteChunk` think 支；`2026-10-20-vsc-subagent-think-label.test.mjs` 的 T-A33 ∥ T-A38 期望同步。

**读数**：`node test/run.mjs` ⇒ **24 pass / 0 fail**。

### 1.2 第三笔（用户 18:01 截图 + 现象：闪回 ∥ advisor 不显）

**用户描述（逐字）**：「explore的时候能显示成explore#1/Thinking...，但是不知道为什么中间会穿插一下 Thinking...,但是能恢复，跑advisor的时候就完全没起作用了，还是Thinking...,没显示advisor」+ 截图（块头 `[▶ eng-coder#2 …] Thinking…`，状态条 `1 background subagent(s) running`）。

**根因（日志实读 · 非推断）**

| 现象 | 根因 | 证据 |
|---|---|---|
| 每 ~2s 闪回 `Thinking…` | 挂起期心跳**重发** `status:"started"`，而 `state.mjs` started 支**无条件**清 `stateWord` | 日志 `10:01:45/47/49/51` 连续四条 `"status":"started"`（`ev:subdeliver`）· `state.mjs:174` |
| 跑 advisor 全程只显 `Thinking…` | 子代理内顾问评审的产出以 **toolOutput** 回传（`advisor.mjs:237` `onOutput: ctx.onOutput` ⇒ `onToolOutput`），而**输出面按设计从不写状态词** ⇒ 顾问整段无状态词可显 | `advisor.mjs:237` · `noteChunk` 的 `face !== "toolOutput"` 闸 |
| 面板里完全没有 `advisor#` 频道 | 顾问内容挂在 `sub:eng-coder#2` 频道内（不是独立块），日志 60k 行内 `advisor#` = **0**（内容面未带该前缀） | 日志 grep |

**修法**

1. `state.mjs` started 支：**仅在 `block.queued` 时清**状态词（queued→running 那一次），重发心跳不清 ⇒ 闪回消失。
2. `activity-view.mjs` `noteChunk`：`face === "toolOutput" && tool === "advisor"` ⇒ 状态词写 `<sub>/advisor`（只写**名字**，不写输出文本）⇒ 顾问跑着时标题显示 `advisor#1/advisor` ∥ 顶层 `advisor`；其它 toolOutput 仍零改写。

**读数**：新测试 `2026-10-21-vsc-stateword-flicker.test.mjs`（S1 重发 started 不清 ∥ queued 迁移清 · S2 顾问 toolOutput 显名 ∥ 顶层 · S3 普通输出零改写）；`node test/run.mjs` ⇒ **27 pass / 0 fail** · `check-syntax` ⇒ 144 JS files OK。

## §2 批次任务与设计（eng-designer）
**状态行**：（eng-designer 写入时更新）
<§2 模板占位：本批条目（覆盖） / 设计档落点 / 机制设计 / 受影响文件与测试覆盖 / 验收对照 / 关键决策 / 上抛项>
## §3 设计评审（评审子代理）
## §4 用户批准（主 agent）
## §5 实施记录（eng-coder）
## §6 验证与收口（父代理）
