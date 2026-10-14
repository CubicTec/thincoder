# 2026-10-14 · design-token-recovery
> 六段 append-only，一段一作者：§1 讨论（主 agent）· §2 批次任务与设计（eng-designer）· §3 设计评审（评审子代理）· §4 用户批准（主 agent）· §5 实施记录（eng-coder）· §6 验证与收口（父代理）。
> 编制：主 agent · 2026-10-14 · 来源 = 用户 2026-10-14 00:13 原话「令牌那个我觉得值得做」（承父侧 00:11 建议④：在飞令牌回收指引 + `design-slots` 只读回收读口）；痛点实证 = 2026-10-13 深夜令牌因上下文压缩丢失、考古 ≈10 分钟取回；关联纪律 = 「设计令牌不许放到过期」（用户 2026-10-13 01:26）。。
> 台账 = #1384（core · 归批）。前情 = DESIGN-TOKEN-SETTLEMENT（机制单源 = docs/core/design/DESIGN-TOKEN-SETTLEMENT.md——本批 = 其回收面增补）。
## §1 讨论（主 agent）
**状态行**：🔄 进行中（…）
<§1 模板占位：本批条目 / 关键判据 / 授权口径>

**2026-10-14 · 设计令牌可恢复性（用户 00:13「值得做」）**

- **来源（逐字）**：用户 2026-10-14 00:13「令牌那个我觉得值得做。」——承父侧 00:11 建议④（两条：① 在飞令牌回收指引〔惯例/提示词文本——放「怎么取回」路径，不放令牌值〕② `design-slots` 只读回收读口）。台账 **#1384**。
- **痛点实证**：2026-10-13 深夜本会话——重做批令牌因上下文压缩丢失（评审回执照原文在会话记录里，但运行态未在手）；翻 192MB 会话档案考古 ≈10 分钟取回（程序可复现：按设计号搜「Pass this exact token」）。往期会话亦有同类考古记录（仅 2026-09-29 一处即多段）。
- **关键事实（父侧实读 2026-10-14 00:1x）**：**令牌一直落在盘上**——`thincoder-core/token-ttl.mjs:149`「会话槽权威台账 I/O（D1/D2/D3——槽文件 = 权威结算台账）」；`design-token.mjs:159` settle 当场写 `agent._engDesignTokens.set(designId, token)` + 落盘；`design-slots`（F-SL1，`agent-tools/design-slots.mjs`）**只报 designId/live/有效期/batch——不吐令牌**；eng-coder spawn 门要求显式令牌（`subagent-spawn.mjs:123/:247`——与 issued 严格相等校验）。⇒ 缺口 = **读口**（令牌在盘，无人吐给你）——比预想还小。
- **纪律不动**：恢复面 ≠ 囤积许可——「设计令牌不许放到过期」（用户 2026-10-13 01:26）继续有效；批档写入面继续机械剥离凭据（`batch.mjs:44-48` 在册）；日志字段黑名单不动（`log.mjs:16`）。
- **排法**：设计先行（本批首轮 = 机制设计 + 文本草稿 + 落地方案）；实施排重做批/终端批收口后（池面避让）。

## §2 批次任务与设计（eng-designer）
**状态行**：✅ 设计完成（回收读口规格 + 指引草稿（EN/CN 逐字）+ 落地方案（D1 四面）；doc-check 本批域零新增红）
<§2 模板占位：本批条目（覆盖） / 设计档落点 / 机制设计 / 受影响文件与测试覆盖 / 验收对照 / 关键决策 / 上抛项>

**2026-10-14 · 设计轮 · eng-designer（承 §1 · 台账 #1384）**

**本批条目（覆盖——五条）**
1. **回收读口**（机制）：`subagent` `action:'design-slots'` 只读扩展——`designId`（可选过滤）+ `reveal`（仅 `true` 揭值，必携 `designId`）；单槽取回全串 `designToken`；过期 / 畸形掩蔽；未知 id 拒 + 列在场 id；缺省两态逐字零变。
2. **回收指引文本草稿**（提示词面——逐字见下；EN 运行面 = eng-coder 落 ∥ CN 镜像面 = eng-designer 笔）：一段「在飞令牌回收」指引，接在「链终消费」纪律旁。
3. **单源档更新**：`docs/core/design/DESIGN-TOKEN-SETTLEMENT.md` §10——F-SL1 回收读口扩展 + 回收程序 + 自动解析取舍句（**本设计轮已落**）。
4. **日志互作处置**（读口设计必核面）：`log.mjs` `SECRET_FORM` 增 token 值形（`uuid:epoch`）——读口结果不经日志面二次泄露（实施轮落）。
5. **落地方案（D1 面分割）**：机制单源档 = eng-designer（本轮已落）∥ 提示词 EN 面 = eng-coder（实施轮）∥ 提示词 CN 面 = eng-designer（实施轮同拍）∥ 代码面 = eng-coder（实施轮）。

**设计档落点**：`docs/core/design/DESIGN-TOKEN-SETTLEMENT.md` §10（本批修订面——回收读口节 + KD-SL5 + U-SL10–15 + 变更记录 2026-10-14 条）。

**机制设计（读口形状——规格级；全文 = 设计档 §10「F-SL1 回收读口扩展」）**
- **参数**：`designId` string 可选（trim 后精确匹配；未知 ⇒ 拒 + 列在场 designId 清单；空串视同缺省）∥ `reveal` boolean 可选（仅字面 `true` 揭值；非 boolean ⇒ 拒——fail-closed，不猜）。**`reveal:true` 必携 `designId`**（无 ⇒ 拒——单槽取回，不吐全量 dump）。
- **数据源**：`unionSlots`（内存 Map ∪ 槽文件权威表——D-S3 同源）；**零写**（不 reconcile 回写、不落盘）。
- **输出（契约）**：过滤调用 ⇒ 单槽行（现行字段）+ 计数尾行 + `(filtered by designId)` 注；`reveal:true` 且槽活 ⇒ 槽行尾追加 `designToken=<全串>` + 回收行（「原样入 eng-coder spawn——门禁严格相等校验」）；过期 / 畸形 ⇒ `designToken=—`（如实注因）；缺省调用 = 现行面逐字零变。
- **掩蔽**：只揭活槽（格式合法 ∧ 未过期）；过期 / 畸形不揭值（门禁两态均过不了——揭值零收益）。
- **日志互作**：工具结果前 200 字符经 `agent/dispatch-run.mjs` 的 `tool:done` `head` 落盘；`SECRET_FORM` 现三形不匹配 `uuid:epoch`（实证缺口）⇒ 处置 = `log.mjs` `SECRET_FORM` 增 token 值形（内容级「截断到形态前」）；字段名黑名单与 `batch.mjs` 写入剥离面零改。
- **边界**：不改 spawn 门显式令牌语义（默认保持——「自动解析取舍」见设计档 §10）；不动 TTL / 消费机制；端面（VSC / 桌面）零改；跨重启可用。

**回收程序**：① 清点（`design-slots`）→ ② 取回（+ `designId` + `reveal:true`）→ ③ 原样派发（`designId` + `designToken`）→ ④ 纪律照旧（及时使用 / 链终 consume——恢复面 ≠ 囤积许可）。

**回收指引文本草稿（逐字——落地时除转义外零改）**

EN（目标 = `thincoder-core/prompts/persona-engineering.md`——「Chain-terminal consumption」条（现 :131）之后插入一条）：
> - **In-flight token recovery**: a token (or its designId) dropped from your context — compaction, restart — is not lost: the slot ledger keeps every issued token. Read it back via `subagent` `action:'design-slots'` — inventory first (designId, live/expired, batch), then `designId=<id>` + `reveal:true` for the exact `designToken` (one slot at a time; expired or malformed slots are never revealed). Pass both values verbatim on the eng-coder spawn (the gate checks exact equality) — recovery changes no discipline: tokens stay short-lived runtime state, consumed at chain terminal.

CN（目标 = `docs/core/design/prompts/persona-engineering.md`——「链终消费」条（现 :129）之后插入一条）：
> - **在飞令牌回收**：掉出上下文的 token（或其 designId）——压缩、重启——没丢：会话槽台账保留每一枚已签发令牌。经 `subagent` `action:'design-slots'` 只读取回——先清点（designId ∥ live/expired ∥ 批），再携 `designId=<id>` + `reveal:true` 取全串 `designToken`（一次一槽；过期 / 畸形槽不揭值）。两值原样入 eng-coder spawn（门禁严格相等校验）——回收不改任何纪律：令牌仍是短命运行态，链终照常消费。

**受影响文件与测试覆盖（实施轮；现读 = as-of 2026-10-14 实读）**
| 文件 | 现读 | 预期 | 动作 |
|---|---|---|---|
| `thincoder-core/agent-tools/design-slots.mjs` | 232 | ≈275 | `executeDesignSlotsAction` 增 designId 过滤 / reveal / 掩蔽 / 回收行 |
| `thincoder-core/agent-tools/subagent.mjs` | 414 | ≈416 | 参数面：`reveal` 新描述 + `designId` 描述补 design-slots 用法 |
| `thincoder-core/tool-docs/subagent.md` | 42 | ≈44 | `design-slots` 条目补 reveal 句 |
| `thincoder-core/log.mjs` | 200 | ≈202 | `SECRET_FORM` 增 token 值形 + 注 |
| `thincoder-core/prompts/persona-engineering.md` | 204 | ≈205 | EN 指引（eng-coder 落——文本见上） |
| `docs/core/design/prompts/persona-engineering.md` | 204 | ≈205 | CN 镜像（eng-designer 笔——文本见上） |
| `docs/batches/2026-10-14-design-token-recovery.test.mjs` | 新档 | ≈180 | U-SL10–U-SL15；验证 = `node --test docs/batches/2026-10-14-design-token-recovery.test.mjs`（workdir `thincoder/`） |

零触面：spawn 门 / `token-ttl.mjs` / `design-token.mjs` / `dispatch-gates.mjs`（动作级只读分类已覆盖）/ 端面 `tool-table.mjs`。

**验收对照（§1 五条 → 判据）**
| # | 判据 | 状态 |
|---|---|---|
| ① | §10 更新（F-SL1 扩展 + 回收程序 + 自动解析取舍句） | ✅ 已落（§10 :180–198 ∥ KD-SL5 :235） |
| ② | 读口形状到规格级（参数 / 输出 / 掩蔽 / 边界 / 日志互作） | ✅ 本 §2 + 设计档 §10（日志互作含处置） |
| ③ | 回收指引文本草稿在报告 | ✅（本 §2 逐字；报告同载） |
| ④ | 落地方案按 D1 面分割 | ✅ 条目 5（四笔分工 + 轮次） |
| ⑤ | doc-check 本批域零新增红 | ✅ 复跑：悬空 27 ⇒ 27 ∥ 行宽 3 ⇒ 3（本批域零新增 ✗；曾出自域行宽 1 条，重排两行后归零） |

**关键决策**
| KD | 决策 | 否决 |
|---|---|---|
| KD-SL5 | 回收读口 = F-SL1 扩展（`designId` 过滤 + `reveal` 单槽揭值；掩蔽 = 只揭活槽） | 新 action / 新工具（计数纪律）∥ 全量 dump（凭据批量外扩）∥ spawn 门自动解析（凭证语义退化） |
| KD-SL6 | 日志面处置 = `SECRET_FORM` 增 token 值形（内容级单点） | 输出排布避 head（脆弱——依赖字数凑界）∥ 工具名特判免记 head（面级硬编码） |
| KD-SL7 | 指引文本只述「怎么取回」；既有纪律（消费 / 不落文档）不重述（仅指向性收束） | 全文复述既有纪律（D2 单源相抵） |

**上抛项（知会——不阻塞本批）**
1. **[上抛·知会]「不许放到过期」纪律未落规范面**：用户 2026-10-13 01:26 纪律（承 §1「继续有效」）现仅本批档与本次设计文本载有——提示词面 / 机制档无逐字落点（本轮实查：全仓「放到过期」仅命中本批档）。若要落 = 提示词内容权主 agent（另条 ∥ 实施轮同拍皆可）。
2. **[上抛·知会] hooks 面收原始结果**：`dispatch-run.mjs` `runHooks("PostToolUse", …, result: raw)`——揭值结果同态流入 hooks（全工具既有形态、非日志面；`SECRET_FORM` 扩展不覆盖此面）。本批零处置（越射程），登记备查。
3. **[上抛·知会] 观察（非本批所产）**：复跑间 `docs/server/design/sandbox/SANDBOX.md` 行宽条行号 :300 ⇒ :268 漂移（他批在写档同拍所致；条数 3 恒定，非本批笔）。

**坐标更正（同轮读回）**：上表「验收对照 ①」KD-SL5 现读 **:237**（草拟时 :235——用例行重排 +2 所致）；§10 回收读口块 :180–198 ∥ 用例面 :225–227 ∥ 设计档现读 **280 行**（251 ⇒ +29）。其余坐标不变。

## §3 设计评审（评审子代理）
## §4 用户批准（主 agent）
## §5 实施记录（eng-coder）
## §6 验证与收口（父代理）
