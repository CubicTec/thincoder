# 2026-10-14 · design-token-recovery
> 六段 append-only，一段一作者：§1 讨论（主 agent）· §2 批次任务与设计（eng-designer）· §3 设计评审（评审子代理）· §4 用户批准（主 agent）· §5 实施记录（eng-coder）· §6 验证与收口（父代理）。
> 编制：主 agent · 2026-10-14 · 来源 = 用户 2026-10-14 00:13 原话「令牌那个我觉得值得做」（承父侧 00:11 建议④：在飞令牌回收指引 + `design-slots` 只读回收读口）；痛点实证 = 2026-10-13 深夜令牌因上下文压缩丢失、考古 ≈10 分钟取回；关联纪律 = 「设计令牌不许放到过期」（用户 2026-10-13 01:26）。。
> 台账 = #1384（core · 归批）。前情 = DESIGN-TOKEN-SETTLEMENT（机制单源 = docs/core/design/DESIGN-TOKEN-SETTLEMENT.md——本批 = 其回收面增补）。
## §1 讨论（主 agent）
**状态行**：已收口 2026-10-14
<§1 模板占位：本批条目 / 关键判据 / 授权口径>

**2026-10-14 · 设计令牌可恢复性（用户 00:13「值得做」）**

- **来源（逐字）**：用户 2026-10-14 00:13「令牌那个我觉得值得做。」——承父侧 00:11 建议④（两条：① 在飞令牌回收指引〔惯例/提示词文本——放「怎么取回」路径，不放令牌值〕② `design-slots` 只读回收读口）。台账 **#1384**。
- **痛点实证**：2026-10-13 深夜本会话——重做批令牌因上下文压缩丢失（评审回执照原文在会话记录里，但运行态未在手）；翻 192MB 会话档案考古 ≈10 分钟取回（程序可复现：按设计号搜「Pass this exact token」）。往期会话亦有同类考古记录（仅 2026-09-29 一处即多段）。
- **关键事实（父侧实读 2026-10-14 00:1x）**：**令牌一直落在盘上**——`thincoder-core/token-ttl.mjs:149`「会话槽权威台账 I/O（D1/D2/D3——槽文件 = 权威结算台账）」；`design-token.mjs:159` settle 当场写 `agent._engDesignTokens.set(designId, token)` + 落盘；`design-slots`（F-SL1，`agent-tools/design-slots.mjs`）**只报 designId/live/有效期/batch——不吐令牌**；eng-coder spawn 门要求显式令牌（`subagent-spawn.mjs:123/:247`——与 issued 严格相等校验）。⇒ 缺口 = **读口**（令牌在盘，无人吐给你）——比预想还小。
- **纪律不动**：恢复面 ≠ 囤积许可——「设计令牌不许放到过期」（用户 2026-10-13 01:26）继续有效；批档写入面继续机械剥离凭据（`batch.mjs:44-48` 在册）；日志字段黑名单不动（`log.mjs:16`）。
- **排法**：设计先行（本批首轮 = 机制设计 + 文本草稿 + 落地方案）；实施排重做批/终端批收口后（池面避让）。

**〔父侧笔补记 · 2026-10-14〕**
- 修正轮 1 核读通过：发现 1–9 全落（设计档 `DESIGN-TOKEN-SETTLEMENT.md:183/:184/:186/:190/:229/:241-243/:252` ∥ 本档 §2 `:49/:52/:62-65/:68` ∥ `:95–:112`），机制语义零变；机检本批域零新增红。
- **U 项闭合**：需求档 `docs/core/requirements/DESIGN-TOKEN-SETTLEMENT.md` 增 **F-SL3** 行（F-SL2 后）+ 变更记录行——承设计档 `:243`「待补行（主 agent 笔）」；父级直接执行（requirements 笔权）· 可 revert。
- 轮次 2 评审 = 待用户点火（点火权 = 用户）。

**〔父侧笔补记 II · 轮次 2 裁定落地 · 2026-10-14〕**

- **发现裁定**：轮次 2（#181）= pass（0🔴/0🟡/2🔵）。① 发现 1（文档地图口径限制）= **Not an issue**（评审自身声明「非缺陷」；机制级归属实核无相抵）；② 发现 2（需求档 F-SL3 判据句）= **Fixed**——需求档 `docs/core/requirements/DESIGN-TOKEN-SETTLEMENT.md:29` 拆句（「三态零揭值」∥「无参 / 空串 ⇒ 现行清点面逐字零变」）；③ 范围外注记（自指坐标 +5）= **Fixed**——本档 §1 补记自指（`:44/:47/:57-60/:63/:90-107` ⇒ `:49/:52/:62-65/:68` ∥ `:95–:112`）与 §2 补记五处自指按现盘收正（纯坐标笔，零语义）。
- **口径**：上述三笔 = 父侧直接执行（requirements 笔权 ∥ 机械坐标笔）· 可 revert；轮次 2 §3 注记（`:159`）引述的原文 = 修正前状态（历史留档，不改）。

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

EN（目标 = `thincoder-core/prompts/persona-engineering.md`——「Chain-terminal consumption」条（现 :132）之后插入一条）：
> - **In-flight token recovery**: a token (or its designId) dropped from your context — compaction, restart — is not lost: the slot ledger keeps every issued token. Read it back via `subagent` `action:'design-slots'` — inventory first (designId, live/expired, batch), then `designId=<id>` + `reveal:true` for the exact `designToken` (one slot at a time; expired or malformed slots are never revealed). Pass both values verbatim on the eng-coder spawn (the gate checks exact equality) — recovery changes no discipline: tokens stay short-lived runtime state, consumed at chain terminal.

CN（目标 = `docs/core/design/prompts/persona-engineering.md`——「链终消费」条（现 :130）之后插入一条）：
> - **在飞令牌回收**：掉出上下文的 token（或其 designId）——压缩、重启——没丢：会话槽台账保留每一枚已签发令牌。经 `subagent` `action:'design-slots'` 只读取回——先清点（designId ∥ live/expired ∥ 批），再携 `designId=<id>` + `reveal:true` 取全串 `designToken`（一次一槽；过期 / 畸形槽不揭值）。两值原样入 eng-coder spawn（门禁严格相等校验）——回收不改任何纪律：令牌仍是短命运行态，链终照常消费。

**受影响文件与测试覆盖（实施轮；现读 = as-of 2026-10-14 实读）**
| 文件 | 现读 | 预期 | 动作 |
|---|---|---|---|
| `thincoder-core/agent-tools/design-slots.mjs` | 232 | ≈275 | `executeDesignSlotsAction` 增 designId 过滤 / reveal / 掩蔽 / 回收行 |
| `thincoder-core/agent-tools/subagent.mjs` | 414 | ≈416 | 参数面：`reveal` 新描述 + `designId` 描述补 design-slots 用法 |
| `thincoder-core/tool-docs/subagent.md` | 42 | ≈44 | `design-slots` 条目补 reveal 句 |
| `thincoder-core/log.mjs` | 200 | ≈202 | `SECRET_FORM` 增 token 值形 + 注 |
| `thincoder-core/prompts/persona-engineering.md` | 207 | ≈208 | EN 指引（eng-coder 落——文本见上） |
| `docs/core/design/prompts/persona-engineering.md` | 207 | ≈208 | CN 镜像（eng-designer 笔——文本见上） |
| `docs/core/design/AGENT-LOOP-SUBAGENT.md` | 1041 | ≈1042 | §6.7.2 `design-slots` 行随本批收正（参数列 = `designId?` ∥ `reveal?`（必携 designId）；返回列随 reveal / 回收行；+ 变更记录 1 行）——**落笔 = 实施轮同拍** |
| `docs/core/design/PROMPT-SYSTEM.md` | 934 | ≈935 | 收口面 = §6.11 预算表复测刷新（`subagent` 档随 `tool-docs/subagent.md` +reveal 句；先例 = 该档变更记录「批 ledger-tool · 收口面读数随动」条）+ 两档 persona-engineering 行数连带；§6.x 登记块 / D-PS 行 = 不落（判例 = 单条指引、零新机制——承 authoring-why 批「登记限于上限形」） |
| `docs/batches/2026-10-14-design-token-recovery.test.mjs` | 新档 | ≈180 | U-SL10–U-SL15；验证 = `node --test docs/batches/2026-10-14-design-token-recovery.test.mjs`（workdir `thincoder/`） |

> 表下注：`docs/core/design/API-CONTRACT.md`（生成区 :614/:615 · :1161–1173 随 `design-slots.mjs` ∥ `log.mjs` 两改件位移）——处置 = 实施轮 / 收口重跑 `node scripts/api-contract.mjs --write`（生成区零手工笔；先例 = `docs/batches/2026-10-07-ledger-tool.md` §2「生成区重跑 = 实施轮」）。

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

**§2 补记（设计评审 #174 修正轮 1 · 发现 1–9 逐号落地 · 2026-10-14 · eng-designer）**

修正面 = 设计档 `docs/core/design/DESIGN-TOKEN-SETTLEMENT.md` §10 ∥ 本 §2；其余零触（代码 / 提示词实体 / 需求档——归实施轮 ∥ 主 agent 笔；`PROMPT-SYSTEM.md` 收口面随动 = 受影表行内在册）。**机制语义零变**；发现 10 = 评审口径声明（不动）。

逐号落地（号 → 改动 `file:line`——行号 = 修正后实读）：
1. 受影表补 `docs/core/design/AGENT-LOOP-SUBAGENT.md` 行——本档 :64（§6.7.2 `design-slots` 行随本批收正：参数列 = `designId?` ∥ `reveal?`（必携 designId）；返回列随 reveal / 回收行；落笔 = 实施轮同拍）。
2. 设计档 §10 回收读口块补「最相近先例」行——设计档 :183（先例坐标 / 先例批 / 对齐 / 偏差逐条）。
3. 设计档 §10 编号注记按批分述重写——设计档 :241–:243（两批各自对应面 + 需求侧处置；本批需求侧 = 待补行——U 项，主 agent 笔）。
4. 受影表补 `docs/core/design/PROMPT-SYSTEM.md` 行——本档 :65（收口面 = §6.11 复测刷新 + 两档行数连带；§6.x 登记块 / D-PS 行 = 不落——判例在行内）。
5. 表下注补 API-CONTRACT.md 生成区随动判定——本档 :68（重跑 `node scripts/api-contract.mjs --write` = 实施轮 / 收口）。
6. 提示词两档读数 / 锚按现盘收正——本档 :49（EN :132）∥ :52（CN :130）∥ :62 / :63（现读 207）；评审记 EN 205 / :131 为评审时点值（其后他批落地 +3 行——EN 现含 `Anchor re-check at cleanup rounds` 条，`PROMPT-SYSTEM.md` §6.23 在册）。
7. 设计档 §10 参数面补「trim 后精确匹配；空串视同缺省」——设计档 :184；用例面 U-SL14 增空串腿——设计档 :229（裁向 = 增）。
8. 设计档 §10 掩蔽口径补半句（口面「活」判据界定）——设计档 :186。
9. 设计档 §10 补边界注（揭示源 ↔ spawn 门分叉；登记备查、非阻断）——设计档 :190。

**读数基线**：修正后实读；口径 = wc-l（`read` 计数恒 +1——评审记 CN 208 / 本记 207 = 同值异口径）。设计档现读 = 285 行；两档提示词现读 = 207 ∥ 207（本批落笔后 ≈208 ∥ ≈208）。**本补记为准，上文行文不改**。

**机检复跑（修正后）**：`doc-check` — 悬空 19（清单一核：全落 `MEMORY.md` 两档存量——本批两档零命中）∥ 行宽 OK（0 条——输出注「区带豁免在效——变更记录 ∥ 历史沿革」）∥ `prompt-refs-check` — 0 命中（提示词面 83 档 ∥ 代码面 444 档）。

**§2 补记（实施后收口面 2 笔落地 · 2026-10-14 · eng-designer）**

1. ① `docs/core/design/DESIGN-TOKEN-SETTLEMENT.md`——参数面 `:184` 补 `reveal:null` 视同缺省半句（沿 `consume-design` 选择器先例——零揭值，不 fail-open）+ 用例面 `:228` 同句随正；该档变更记录 `:252`。承 §5 决策表 #1（父裁：保留现形）。
2. ② `docs/core/design/PROMPT-SYSTEM.md` §6.11——预算表复测刷新（读数对 = 101,813 → **124,207** / **1.20**；`subagent` 14,239 → **15,808**；超限 + `browser` **11,959**）+ 机制行档数随正（`:323`——50 ⇒ **51**）+ 复测注记（`:343–345`——含两档 persona-engineering 行数连带 207 ⇒ **208**）+ 该档变更记录 `:776`。

**机检（本笔后 · workdir = `thincoder/`）**：`node scripts/doc-check.mjs --root D:\teamcode\thincoder` ⇒ 悬空 **19**（＝基线；本批两档零命中——✗ 行仅存量「迁移期引文」类·不入闸）∥ 行宽 **OK**（源域无 >300 字符单行）∥ 行数面 83 条 = 报告态（他批在写域）；`node scripts/tool-schema-size.mjs` ⇒ 档数 50 · 总量 **124,207** 字符（**1.20 × 基线**）· top5 = `subagent` ∥ `browser` ∥ `git` ∥ `batch` ∥ `edit`。**零新语义**（实现裁口的字面对齐 ∥ 读数刷新 ∥ 计数收正）。

**上抛（知会——不阻塞）**：① `browser` 11,959 超单档 8,000 且无在册由（读数已如实载入；由待补 = 父侧裁）；② `PROMPT-SYSTEM.md` `:21` ∥ `:166` ∥ `:214` 三处 tool-docs 档数「50 档」同式陈旧（现盘 51；同 10-08 计数收正先例——父侧机械笔裁量，本笔未触）；③ 批内件 `docs/batches/2026-10-14-design-token-recovery.test.mjs` `:8` 注释同词形未限定 ∥ `reveal:null` 无测试腿（面外——登记备查）。

## §3 设计评审（评审子代理）

### 轮次 1（评审子代理）

**评审对象（设计评审 · 初评）**：批档 §2 + 设计档 `docs/core/design/DESIGN-TOKEN-SETTLEMENT.md` §10（F-SL1 回收读口扩展 ∥ 用例面 :225–227 ∥ KD-SL5 :237 ∥ 编号注记 :239）（全文读过）。审读范围外补充实核（仅用于核证设计断言 / 标注数，不作为审读对象）：`thincoder-core/agent-tools/design-slots.mjs`（232 行）· `subagent.mjs`（414 行）· `log.mjs`（200 行）· `tool-docs/subagent.md`（42 行）· `token-ttl.mjs` · `agent-tools/batch.mjs` · `agent/dispatch-run.mjs` · `agent/dispatch-gates.mjs` · `subagent-spawn.mjs` · `agent-tools/design-token.mjs` · `docs/core/design/{AGENT-LOOP-SUBAGENT,PROMPT-SYSTEM,API-CONTRACT}.md` · 提示词两档 · 需求档。

| # | Category | Severity | Issue | Suggestion |
|---|----------|----------|-------|------------|
| 1 | Document ownership（动作契约面） | 🔴 | 参数面扩展与动作表相抵且该档未入受影响文件表：设计档 §10:174 自指「（第九动作——动作表 = `AGENT-LOOP-SUBAGENT.md` §6.7.2）」，而该表 :53 的 design-slots 行现写「无（父侧 · 工程模式 · 只读）」+ 返回「槽位清单…+ 计数尾行」——本批新增 `designId` / `reveal` 参与 reveal 输出后，同一机制的参数/返回契约两处描述不同；批档 §2 受影表（:51–59）与零触面（:61）均未列该档。前批先例 = 同表随动（设计档 §10:219「动作表 … 七 ⇒ 九」；且 `docs/batches/2026-10-07-ledger-tool.md:147` 评审对象显含该表） | 受影响文件表补 `docs/core/design/AGENT-LOOP-SUBAGENT.md` 一行：`§6.7.2` design-slots 行参数列 = `designId?` ∥ `reveal?`（必携 designId）、返回列随动 reveal 行；或就该表零动给出自洽理由（现参数面已变——零动理由须另行成立） |
| 2 | Closest-precedent | 🟡 | 两档均无独立「最相近先例」行（先例坐标 ∥ 对应设计档节 ∥ 先例批 + 对齐 ∥ 偏差理由）；实质散见 §10:183（「同 `consume-design` 对 `expired` 的严格判定先例」）/ :187（「与 `batch.mjs` 凭据第三形同判据」）/ :188（"`unionSlots` 同源"），无集中行、无对齐/偏差句 | 补一行：先例 = F-SL1 清点面（§10:172–178）+ consume-design 选择器严格判定（`design-slots.mjs:185`）∥ 先例批 = 2026-10-07-ledger-tool；对齐（同读源 / 同 fail-closed 形）与偏差理由（新揭值概念 / 掩蔽规则 / 单槽限）逐条 |
| 3 | Doc-state（编号注记 / 需求侧） | 🟡 | 设计档 §10:239 编号注记未随本批重锚：① 「对应批档 §2 条目⑤」指 2026-10-07 批验收表行（本批 §2 的 ⑤ = doc-check；U-SL10–15 在本批 §2 受影表测试行 :59）；② 「需求侧候补 = …F-D6 邻位补 F-SL 行」在需求档已落（`docs/core/requirements/DESIGN-TOKEN-SETTLEMENT.md:27-28` F-SL1/F-SL2 + :93 变更行）——本批 reveal 面的需求侧落点两档皆未注 | 编号注记按批分述重锚（点名两批各自对应面）；补本批需求侧处置行（reveal 面 / 或「需求档零笔」判定）；已闭候补删或标已落 |
| 4 | 随动登记面（提示词 bookkeeping） | 🟡 | 提示词面改动未登记 PROMPT-SYSTEM.md 面：本批改 EN `thincoder-core/prompts/persona-engineering.md`（+1 条）∥ `tool-docs/subagent.md`（+reveal 句）⇒ §6.11 预算表（`PROMPT-SYSTEM.md:323-332`：当前 101,813 / `subagent` 14,239）与行数计数连带（:590 口径）将漂移；前批同面先例 = 收口复测刷新（:743）。受影表 / 零触面均无该档 | 受影表补一行（收口面 = §6.11 复测 + persona-engineering 行数连带；是否落 §6.x 登记块 / D-PS 行按既有判例裁）或加「本批不落 PROMPT-SYSTEM.md」显式判定句 |
| 5 | Affected-face（生成区） | 🔵 | `docs/core/design/API-CONTRACT.md` 生成区坐标将随本批两改件漂移而未登记：:614/:615（`design-slots.mjs:88`/`:110`）∥ :1161–1173（`log.mjs` 导出行）——插入行即位移；设计无该面行 / 判定句（前批先例 = `2026-10-07-ledger-tool.md:79`「API-CONTRACT 生成区重跑 = 实施轮」+ 收口 `--write`） | 补「生成区随动」二择一判定：重跑（`node scripts/api-contract.mjs --write`，实施轮 / 父侧）或零动理由，入受影表或表下注 |
| 6 | 数值漂移（.md——免档位判定） | 🔵 | 批档 §2:57–58 提示词两档现读与现盘不符：CN 记 204 vs 现盘 208 行（本仓自记读数亦 208——`PROMPT-SYSTEM.md:590`）；锚「链终消费」条（批档 :47 记「现 :129」）现读 `docs/core/design/prompts/persona-engineering.md:130`；EN 记 204 vs 现盘 205 行（:131 锚正确） | 落笔按条名锚（「链终消费」条后）即可；两档读数与锚随落笔轮按现盘收正 |
| 7 | Clarity（规格单源） | 🔵 | 读口规格两处承载且详略不一：批档 §2:33 有「trim 后精确匹配；空串视同缺省」二判定句，设计档 §10:183 仅「精确匹配」——只读单源档的实现者会把空串按「未知 ⇒ 拒」落；用例面（§10:227 U-SL14）未列空串腿 | §10 补该二句（或指向本批 §2）；U-SL14 可选增空串断言 |
| 8 | Clarity（词面） | 🔵 | 「活槽」两用：列表 status `live` 判据 = `tokenExpired` 单源（§10:176；实现 `design-slots.mjs:73`）⇒ 畸形串在列表记 live；回收口掩蔽判据 = 格式合法 ∧ 未过期（§10:185）⇒ 畸形串掩蔽——同一调用可现 `status=live` 且 `designToken=—`，§10:185 括注「两态在任何门禁都过不了」与列表词面易混 | §10:185 加半句界定「口面『活』= 格式合法 ∧ 未过期，与列表 status 判据不同（畸形槽列表记 live、口面掩蔽）」；或列表增畸形态（触现形——需裁） |
| 9 | 边界（残余风险） | 🔵 | 揭示源按「槽为准」（§10:188 `unionSlots` 同源；实现 `design-slots.mjs:34` 槽覆盖内存），而 spawn 门内存优先、仅 miss 回读（`subagent-spawn.mjs:104`）——同 id 两载体分叉时（低可达：常态同步）揭示值可能被门「严格相等」校验拒 | §10 加一句边界注（或揭示侧按门同序解析）——非阻断、登记备查 |
| 10 | 评审声明（口径限制） | 🔵 | Document ownership 判据缺文档地图（本次评审上下文未提供、仓根未声明）——放置/归属按 Project Guide + 目标档自述实践核（设计档 §10 单源 + 批档 §2 一次性材料，指针自述在 §10:246 在册）；本项 = 口径限制声明（非缺陷） | 若父侧有文档地图，下轮评审提供以升格该轴核验 |

**计数**：🔴 1 · 🟡 3 · 🔵 6（共 10 条）。
VERDICT: changes-required

### 轮次 2（评审子代理）

**轮次 2 · 修正轮 1 九条落地面复核**（评审对象 = 设计档 `DESIGN-TOKEN-SETTLEMENT.md` §10 回收读口扩展 + 需求档 `DESIGN-TOKEN-SETTLEMENT.md` 全文；复核 = 修正轮 1 发现 1–9 逐号坐标实核 + 目标块判据 / 坐标抽查，含批档 §2 受影表随落行）

逐号实核（发现 → 落地面 → 结论）：
1. 动作契约面 → 批档 §2 受影表 `:64` 行在位（参数列 = `designId?` ∥ `reveal?`（必携 designId）；返回列随 reveal / 回收行；「落笔 = 实施轮同拍」）——与设计档 §10 无相抵残留。
2. 最相近先例 → 设计档 `:183` 在位；先例坐标实读命中（`design-slots.mjs:185` = `if (args.expired !== true)` 即拒）。
3. 编号注记按批分述 → 设计档 `:241–:243` 在位；需求侧 `docs/core/requirements/DESIGN-TOKEN-SETTLEMENT.md:29`（F-SL3）/`:95` 与 10-07 批 §2 验收对照 ⑤（`docs/batches/2026-10-07-ledger-tool.md:89` = U-SL1–9）实读命中。
4. 提示词随动 → 批档 §2 受影表 `:65`（PROMPT-SYSTEM.md 行）在位。
5. 生成区随动判定 → 批档 §2 表下注 `:68` 在位。
6. 提示词读数 / 锚 → 批档 `:49`/`:52`（EN 「Chain-terminal consumption」:132 ∥ CN「链终消费」:130，两者实读命中）∥ `:62`/`:63`（两档 207）。
7. 规格单源 → 设计档 `:184`（trim / 空串视同缺省）+ `:229`（U-SL14 空串腿）在位。
8. 词面 → 设计档 `:186`（口面「活」判据半句；与 `anyLiveDesignSlot`（`token-ttl.mjs:214`）格式合法 ∧ 未过期同判据）在位。
9. 边界注 → 设计档 `:190` 在位；坐标实读命中（`subagent-spawn.mjs:104` 内存优先 ∥ `:246–247` 严格相等）。

本轮发现：

| # | Category | Severity | Issue | Suggestion |
| 1 | Document ownership（口径限制） | 🔵 | 本轮评审上下文仍无文档地图（承修正轮 1 发现 10 同项）——归属 / 放置轴按 Project Guide + 目标档自述指针核验（机制单源 = 设计档 §10，指针自述 `:247`–`:250`；一次性落点表 = 批档 §2）；机制级归属本轮实核未发现双写 / 相抵 | 提供文档地图后该轴可升格机械核验；本轮按口径限制声明（非缺陷） |
| 2 | Clarity（需求档判据句） | 🔵 | 需求档 F-SL3（`docs/core/requirements/DESIGN-TOKEN-SETTLEMENT.md:29`）「缺省三态（无参 ∥ `designId` 过滤 ∥ 空串）零揭值——现行清点面逐字零变」将「逐字零变」并挂三态之后；过滤态按设计档 `:185`「`designId` 过滤 ⇒ 单槽行 + 计数尾行（注 `(filtered by designId)`）」输出形已变，设计档 `:184` 仅把逐字零变限定于「两参皆缺 = 现行清点面**逐字零变**」——判据句字面可被读成过滤态亦须逐字同一（宽容读法可通；设计档 = 上位精确源） | 拆句：「三态零揭值」∥「无参 / 空串 ⇒ 现行清点面逐字零变」（或句尾改指设计档 §10:184–185） |

**计数**：🔴 0 · 🟡 0 · 🔵 2（共 2 条）。

范围外注记（无严重度）：批档 §1 补记 `:18` 与 §2 补记 `:100`–`:108` 对 §2 内坐标的自指整体偏移 +5（`:18` 记「本档 §2 `:44/:47/:57-60/:63/:90-107`」，现盘对应 = `:49/:52/:62-65/:68` ∥ `:95–:112`）——成因 = §1 补记块（5 行）插入后位移；引述内容可辨，报告备查。

VERDICT: pass

## §4 用户批准（主 agent）

**2026-10-14 §4 代签（父侧——承用户 13:14 原话「其他都点火，自动跑起来。」= 全链跑授权；轮次 2 评审点火亦由用户当日 13:14 完成）**

**条件核验（三条）**：① 设计评审两轮走完——轮 1 = changes-required（1🔴/3🟡/6🔵）⇒ 修正轮 1（九条全落）⇒ **轮 2 = pass**（0🔴/0🟡/2🔵）；② 裁定逐条落地（承 §1 补记 II）——发现 1 = Not an issue（口径限制声明）∥ 发现 2 = Fixed（需求档 F-SL3 :29 拆句）∥ 范围外注记 = Fixed（坐标机械笔）；③ 零新语义（修正轮 = 口径收正与补行；本批射程 = F-SL3 读口扩展 ∥ 指引 ∥ 日志互作）。
**签**：设计定稿准予实施——实施 = 两笔（D1 面分割）：eng-coder（核码四档 ∥ EN 指引 ∥ 批内件 ∥ API-CONTRACT 生成区重跑）＋ eng-designer（CN 镜像面 ∥ 动作契约行随正）。

## §5 实施记录（eng-coder）
**状态行**：实施完成



**2026-10-14 · 实施轮 · eng-coder（承 §2 · 台账 #1384）**

**交付摘要（七面全落）**：① `design-slots` 回收读口——`designId` 过滤（trim 精确匹配 / 空串视同缺省 / 未知 ⇒ 拒 + 列在场 id）∥ `reveal:true`（必携 designId）单槽揭值 + 回收行 ∥ 掩蔽 = 只揭活槽（格式合法 ∧ 未过期；过期 / 畸形 ⇒ `designToken=—` 如实注因）∥ 缺省面逐字零变 ∥ 零写（`unionSlots` 纯读，不 reconcile / 不落盘）；② `log.mjs` `SECRET_FORM` 增 token 值形（`uuid:epoch`——与 `batch.mjs` 凭据第三形逐字同判据；字段名黑名单 / `batch.mjs` 剥离面零改）；③ 参数面（`subagent.mjs`：+`reveal` 描述、`designId` 描述补 design-slots 用法）；④ 描述面（`tool-docs/subagent.md` design-slots 条目 + 过滤/回收两行）；⑤ EN 回收指引（逐字稿——落「Chain-terminal consumption」条后）；⑥ 批内件 `docs/batches/2026-10-14-design-token-recovery.test.mjs`（U-SL10–U-SL15）；⑦ 生成区重跑（`api-contract --write`）。零触面照 §2：spawn 门 / `token-ttl.mjs` / `design-token.mjs` / consume 机制 / 新 action / 批量 dump / `batch.mjs` / CN 两档 / 端面——均零笔。

**变更件与行数（read 口径；对比 §2 落点表）**：

| 文件 | 现读 | 落点表预期 |
|---|---|---|
| `thincoder-core/agent-tools/design-slots.mjs` | 232 ⇒ **271** | ≈275 |
| `thincoder-core/agent-tools/subagent.mjs` | 414 ⇒ **416** | ≈416 |
| `thincoder-core/tool-docs/subagent.md` | 42 ⇒ **44** | ≈44 |
| `thincoder-core/log.mjs` | 200 ⇒ **202** | ≈202 |
| `thincoder-core/prompts/persona-engineering.md` | 207 ⇒ **208** | ≈208 |
| `docs/batches/2026-10-14-design-token-recovery.test.mjs` | 新档 **163** | ≈180 |
| `docs/core/design/API-CONTRACT.md` | 生成区整区替换（4201 条 · 840 档） | 重跑（见表下注） |

**决策透明表**：

| # | 决策 | 依据 |
|---|---|---|
| 1 | `reveal:null` 视同缺省（不拒） | 同档 `consume-design` 选择器先例同式（`design-slots.mjs:159`/`:160` 均 `!== null`）；`null` 路径零揭值 = 保守分支（不 fail-open）；内部评审 🔵 非阻塞（评审推荐保留现形）。设计档 §10 若要补「`reveal:null` 视同缺省」半句 = eng-designer 笔——上抛父侧 |
| 2 | `designId` 非字符串经 `String()` 强转后匹配（`design-slots.mjs:118`） | 先例同式（`consume-design` 同名参数 `String(args.designId)`）；reveal 仍必携 designId ⇒ 无外扩 |
| 3 | 掩蔽行措辞 `designToken=— (expired\|malformed — masked; passes no gate)` | 设计档 §10 :186「如实注因」的实现面措辞（字段 / 序 = 契约，行内措辞 = 实现面） |
| 4 | 回收行 / 描述面文面 = 英文 | 同面先例（consume-design 回执全英文）；内容 = 设计档 §10 :185 括注（原样入 spawn——门禁严格相等校验） |

**审计与代码评审轮次与终态**：
- 分叉审计（explore · 只读）：1 轮——九项判定 ①–⑨ 全 ok，零分叉（四类偏差均未发现）。其观测 O1（§5 空 = 本笔待写）＝本段落地即闭；O2（`reveal:null`）＝决策表 #1；O3（审计无执行器）＝机检读数以本段验收行为准。
- 代码评审（advisor · sync）：1 轮——**pass**（0🔴 / 0🟡 / 1🔵）。🔵 = `reveal:null` 口径（＝决策表 #1；评审推荐「保留现形 + 设计档补半句」）。评审尾 host 引用核验块标 7 条「(file unreadable)」＝评审侧引用为相对短路径（`log.mjs:43` 等，非仓根相对）无法解析所致的核验面伪影——对应事实本笔自核成立（见下）。
- **fix round：0**（零 🔴/🟡；唯一 🔵 可选、经裁定保留现形）。
- **终态：clean**。

**验收读数（实测——workdir = `thincoder/`）**：
- ① `node --test docs/batches/2026-10-14-design-token-recovery.test.mjs` ⇒ **6/6 pass**（U-SL10–U-SL15 逐号；含 U-SL14 空串腿 ∥ U-SL15 落盘零值）。兄弟批回归 `node --test docs/batches/2026-10-07-ledger-tool.test.mjs` ⇒ **19/19 pass**（缺省面逐字零变 + consume 面零触）。
- ② `node scripts/api-contract.mjs --write` ⇒ WROTE 4201 条 → `docs/core/design/API-CONTRACT.md`；随后 `--check` ⇒ OK 零漂移（4201 条 · 840 档）。
- ③ `node scripts/doc-check.mjs --root D:\teamcode\thincoder` ⇒ 悬空 **19**（＝基线；清单一核 = MEMORY.md 两档存量，本批域零命中）∥ 行宽 **1**（`docs/desktop/design/SETTINGS.md:71` 358 字符——他批在写档；本批起始基线同为 1，本批域零新增）。
- ④ `node scripts/prompt-refs-check.mjs` ⇒ 提示词面 83 档 ∥ 代码面 444 档 · **命中 0**。
- ⑤ 变更件行数 = 上表（逐档对表 §2 ≈ 值）。
- 端到端补证（手工运行、非套件）：reveal 取回值 === spawn 门 `resolveDesignSlot` 值 ∧ `validateDesignToken` 过 ⇒ 回收值可过门禁严格相等校验。

## §6 验证与收口（父代理）

**角色表**：§1 主 agent ∥ §2 eng-designer（含修正/收口轮 #190）∥ §3 设计评审子代理（advisor 轮次 1——VERDICT pass）∥ §4 主 agent 代签（依据用户 2026-10-14 13:14 全链授权）∥ §5 eng-coder（#184 主交付）＋ eng-designer（#185 CN 镜像面）∥ §6 主 agent。

**结算核对（D7 清单）**：
- **交付物齐**：核 `agent-tools/design-slots.mjs`（回收读口）∥ `log.mjs`（`SECRET_FORM` 增 token 值形）∥ `agent-tools/subagent.mjs` ＋ `tool-docs/subagent.md`（参数/契约）∥ EN `prompts/persona-engineering.md` ＋ CN `docs/core/design/prompts/persona-engineering.md` ∥ `docs/core/design/AGENT-LOOP-SUBAGENT.md` §6.7.2 行 ∥ `docs/core/design/API-CONTRACT.md` 生成区 ∥ 批内件测试档 ∥ 文档面（`DESIGN-TOKEN-SETTLEMENT.md` §10 ∥ `PROMPT-SYSTEM.md` §6.11/§6.5/§1/§2.2 计数）∥ 核 `CHANGELOG.md` `[Unreleased]` 行。
- **验证（父侧亲跑 + 实读）**：批内件 **6/6 pass**（父侧复跑；U-SL10–U-SL15）∥ 兄弟回归 19/19（#184 侧）∥ `api-contract --check` 零漂移 ∥ `doc-check` 本批域零新增红 ∥ `prompt-refs-check` 0 命中 ∥ 行数读数复核（design-slots 232⇒271 等）。
- **上抛处置**：① `reveal:null` 视同缺省——父裁「保留现形 + 设计档半句」（#190 已落）；② tool-errors 明文面（spawn 门拒 args 含 token 值）⇒ 台账 **#1432**（归批）；③ `browser` tool-doc 超单档帽无在册由 ⇒ 台账 **#1434**（归批）；④ `PROMPT-SYSTEM.md` 三处「50 档」⇒「51 档」父侧机械随正（本收口同轮）。
- **台账**：#1384 已核销（证据 = 本节）。
- **令牌消费**：本批设计令牌随收口消费（值不入档）。
- **提交**：本批面按规定提交（core ＋ 文档面 ＋ 批档／含本档）。

**遗留**：无（全条目收口）。
