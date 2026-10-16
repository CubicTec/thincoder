# 设计评审凭证结算（DESIGN-TOKEN-SETTLEMENT）· 工程模式凭证链板块

> 板块 = **工程模式凭证链（结算面）**——评审通过后 token 的**结算 / 持久化 / 回读 / 消费**。
> 相邻权威 = `docs/core/design/ENG-TOKEN-BINDING.md`（token 生命周期语义：TTL / 格式 / 跨模式存活——本档**不重述**，D2）· `docs/core/design/CONSULTATION.md`（评审引擎）· `docs/core/design/SESSION.md`（会话槽文件与序列化）。
> 需求侧 = `docs/core/requirements/DESIGN-TOKEN-SETTLEMENT.md`（源 = VSC 树需求档）；CLI 树需求档 `thincoder-cli/docs/requirements/DESIGN-TOKEN-SETTLEMENT.md` **未迁**（后续批）。

## 1. 定位

**结构性基线**：CLI 的 agent 对象是**进程常驻单对象**（跨回合 / 挂起复用）——因此 **无** VSC 端的死对象 bug、无挂起入场快照、无 onComplete 清零类似物。

**现行设计（D1–D3）**：槽文件 = **权威结算台账**；settle 当场落盘；门禁 miss 回读槽；单值镜像退役。

## 2. D1 —— settle 当场同步落盘

- settle 是唯一结算点 ⇒ **settle 当场把 token 字段持久化到槽文件**（不等下个回合尾 `saveSession`）。
  - 落点：`thincoder-core/agent-tools/advisor-settle.mjs:152`（结算）→ `:163`（`persistEngTokens(agent)` 当场落盘）。
  - 落盘函数：`thincoder-core/token-ttl.mjs:233`（`persistEngTokens`）——复用 `engTokenSlotFields` 序列化 + session 安全写 / 轮转（`guardForeignSlotFile`，`thincoder-core/session-guard.mjs:35`——与 `saveSession` 同一份守卫，**勿裸写文件**）。
  - 内存 Map 仍为当前进程缓存（常驻、与槽一致）。
- **写失败语义**：settle 的槽写须同步 await——**失败即 settle 失败**（token 不注册、无 Approved 回显、可重评）：不静默吞错、不产生「内存有盘上无」态。回滚点：`advisor-settle.mjs:171`–`:172`（失败恢复 settle 前的 Map）。

## 3. D2 —— spawn 门禁读权威（miss 回读槽）

- 门禁先读内存 Map；**miss 时回读槽文件权威台账**（reconcile + 判定）——覆盖「进程重启后槽有但 Map 未及回填 / 缓存与槽不一致」。TTL 过滤保留。
- 落点：`thincoder-core/agent-tools/subagent-spawn.mjs:100`（`resolveDesignSlot`）· 回读函数 `thincoder-core/token-ttl.mjs:187`（`reconcileEngTokensFromSlot`）· 只读原语 `:164`（`readEngTokensFromSlot`）。

## 4. D3 —— 单值镜像退役 + dispatch 写门问活槽

- `_engDesignToken` 单值镜像**退役**：settle / restore / consume / TTL / `new` 一律不再维护它（**零写**）。
  - 序列化面只产多槽表：`thincoder-core/token-ttl.mjs:112`（`engTokenSlotFields`）。
  - agent 对象**无该字段初始化**：`thincoder-core/agent.mjs:69`–`:71`。
  - 会话复位不再清镜像：`thincoder-core/session.mjs:437`–`:438`。
- **存量兼容**：旧会话槽文件可能残留镜像字段值——恢复时**一次性**读取迁入 Map（**唯一迁移读点**，此后不写不读）：`thincoder-core/token-ttl.mjs:131`（`restoreEngTokens`）；落盘时该 legacy 字段被一并删除（`token-ttl.mjs:271`）。
- **dispatch 写门**：资格判定改问**「任一活槽存在」**——`thincoder-core/token-ttl.mjs:211`（`anyLiveDesignSlot`），调用点 `thincoder-core/agent/dispatch.mjs:99`。
- **轻通道轮在盘放行**：无活槽时，**轻通道轮在盘**（轮次行 `在途` 携「收尾链待跑」+ 指针指向「进行中」轮档）亦放行——判据 = `docs/core/design/LIGHT-CHANNEL.md` §2.8（本档不重述）；调用点 = 同条件式**末位合取项**（`thincoder-core/agent/dispatch.mjs:98-101` 条件式——末位合取 `:101`）。

## 5. consume 落盘对称（交付 🔴 复活洞修复）与用例

- **复活洞**：D1 + D2 叠加后，consume-design 删内存槽 → 回合尾 save 窗口内 spawn 门禁 miss 回读 → 会从**盘上复活**已消费 token。
- **修法**：consume-design 删内存槽后**当场同步落盘删除**（写空槽）——`thincoder-core/agent-tools/design-slots.mjs:150`（`removeDesignTokenSlot`）→ `:152`（`persistEngTokens`）。落盘失败 ⇒ 回滚内存槽 + 抛错可重试（不留半消费态）。
- **消耗语义**：消费后同 designId 再 spawn = `resolveDesignSlot` not found 机械拒（消费核 `thincoder-core/agent-tools/design-slots.mjs:110`–`:135` 即此契约）。**批量清点 / 选择器面 = §9**。

**用例**（`thincoder-cli/test/design-token-settlement.test.mjs` · 9 例）：

| 类 | 场景 | 期望 |
|---|---|---|
| 正常 | settle 当场落盘 → 进程 kill（不等回合尾）→ resume → spawn | 门禁从槽读到 token，通过 |
| 正常 | 缓存 miss 回读 | 内存 miss → 回读槽文件 → 命中 |
| 正常 | consume 后 kill → restart → 同 designId 再 spawn | **不复活**（旧台账已删） |
| 正常 | dispatch 写门资格判定 | 有活槽放行 / 无活槽拦（轻通道轮在盘除外——§4 D3） |
| 边界 | 过期 token 槽 | 恢复 / 门禁 TTL 过滤——过期拒 |
| 边界 | 残留镜像一次性迁移 | 迁入 Map，随后不再写镜像 |
| 错误 | settle 落盘失败 | settle 失败可重评，不留半结算态 |
| 错误 | consume 落盘失败 | 回滚内存槽 + 抛错可重试 |

## 6. 机制面（B 式迁移并入——现状路径）

### 6.1 实现坐标

| 面 | 落点 | 实核 |
|---|---|---|
| settle 当场落盘 | `thincoder-core/agent-tools/advisor-settle.mjs:152` · `:163` | 在位 |
| settle 失败回滚 | `thincoder-core/agent-tools/advisor-settle.mjs:171`–`:172` | 在位 |
| 落盘函数 + 槽台账 I/O | `thincoder-core/token-ttl.mjs:233` · `:164` · `:187` · `:211` | 在位 |
| 槽序列化 / 恢复 | `thincoder-core/token-ttl.mjs:112` · `:131` | 在位 |
| spawn 门禁解析 | `thincoder-core/agent-tools/subagent-spawn.mjs:100` | 在位 |
| consume 落盘对称 | `thincoder-core/agent-tools/design-slots.mjs:150` · `:152` | 在位 |
| dispatch 写门 | `thincoder-core/agent/dispatch.mjs:95` | 在读任一活槽 ∨ 轻通道轮在盘（§4 D3——判据 = `docs/core/design/LIGHT-CHANNEL.md` §2.8） |
| 镜像零写 | `thincoder-core/agent.mjs:69`–`:71` · `thincoder-core/session.mjs:437`–`:438` | 无字段初始化 |
| 轮转守卫（拆分产物） | `thincoder-core/session-guard.mjs:35` | 与 `saveSession` 共用 |
| 凭证工具组（拆分产物） | `thincoder-core/agent-tools/design-token.mjs` | 签发 / 校验 / 结算纯函数 |
| 测试 | `thincoder-cli/test/design-token-settlement.test.mjs` | 9 例 |

### 6.2 双端与依赖方向

- **双端**：CLI 与 VSC 各自实现、**语义同源**（同一批「结算即落盘 / 门禁读权威 / 镜像退役」三条）。CLI 无 VSC 的快照 / 清零修复面（不存在对应 bug），**不引入**。
- **已知有意差异**：两项——① **同 id 冲突裁决**（本仓 = **槽为准**〔「槽 = 权威」〕；VSC = 内存优先——`thincoder-vscode/src/agent/agent-state.mjs:58-76` `reconcileEngDesignTokens`：`!map.has(id)` 才合入）——**A9 核查 = ① 不成立**（两面同具备 Map 与槽两载体，无单侧对象）⇒ 按「端差默认 = 消」转**消解路径 + 到期条件**：
  两面对齐同一裁决规则（方向 = token 结算 / 合并面设计轮裁定——候选 = 槽为准〔核现径〕∥ 内存优先〔端现径，防丢新铸〕）；**到期 = token 结算 / 合并面下次触碰**。
  **处置面**：新清点 / 批量消费面（F-SL1 / F-SL2）按「**槽为准**」（核现径）落地——裁决主项与核侧一致；**两面对齐余项**（VSC 内存优先面收正）**缓办**（零触端 reconcile 面）——待决项维持未裁，到期条件照旧（该面下次触碰）。
  ② **过期清理回写时序**（VSC = 当场权威台账回写；本形态 = 惰性〔随下次 `persistEngTokens` / `saveSession` 携带〕）——**形态（写回时序）· 语义零差**（清理对象 = 过期项——任何门禁均不授权，早清晚清不改变授权结果）⇒ 非登记项。源码注释逐字登记（`thincoder-core/token-ttl.mjs:181`–`:186`）。
- **依赖环（有意、安全）**：`token-ttl.mjs` 只 import 底层槽 I/O（`session-slots.mjs` + `session-guard.mjs`）；`session.mjs` 同时 import `token-ttl.mjs` → 静态环，与既有 session ↔ session-slots 环同构（函数声明实例化期已初始化，环安全）。

### 6.3 VSC 端结算接线

> 来源 = `thincoder-vscode/docs/design/DESIGN-TOKEN-SETTLEMENT.md`（VSC 产品档——旧档一字未改、留参照历史）。VSC 结构性基线不同：agent 对象**每 run 重建**（`thincoder-vscode/src/agent/setup.mjs`——非 CLI 常驻单对象）⇒ 结算面多出
> 「死对象 / 快照 / 清零」三类 VSC 独有断点——D1–D6 全部落地后与 CLI **同机制语义**（settle 即落盘权威台账 / 门禁读权威 / 镜像退役）。生命周期语义 / TTL / 格式 = 核面单一权威（`docs/core/design/ENG-TOKEN-BINDING.md` §6.3——本档不重述）；原 VSC 镜像 `advisor.mjs` 等随 W12/W13 已删）。

| 面 | VSC 落点（实核 · W16 接线面收正） |
|---|---|
| settle 当场同步落盘（D1——去 fire-and-forget） | **W12 已迁核**——现体 = 核 `thincoder-core/agent-tools/advisor-settle.mjs`（settle 当场落盘 `:152` · `:163` · 失败回滚 `:171-172`）+ 核 `thincoder-core/token-ttl.mjs:233`（`persistEngTokens`）；原端侧 `src/agent-tools/advisor-async.mjs:364-392` 已删 |
| token 入槽 + Approved 后缀（echo 即裁决） | **W12 已迁核**——现体 = 核 `thincoder-core/agent-tools/design-token.mjs:22`（`buildApprovedSuffix`）· `:82`（`settleDesignReview`）；原 `advisor-async.mjs:389` / `:392` 已删 |
| 门禁读权威（miss 回读槽——D4） | 现体 = 核 `thincoder-core/agent-tools/subagent-spawn.mjs:100`（`resolveDesignSlot`——内存 miss 回读槽 reconcile + TTL 过滤保留；仅过期拒才删槽） |
| 写侧保留槽 + union 合并（D2 + D6——忙时不清 settle 落盘项） | **W11 转口核**——端壳 `thincoder-vscode/src/extension/session-slot-write.mjs:23`（`engTokensMergeForSave` = 核 `mergeEngTokensForSave` re-export）→ 核 `thincoder-core/session-slot-write.mjs:156`（并集 + 同 key 新铸者胜） |
| 会话内回合从槽新读（D3——快照已删） | 端壳 hydrate 面：`thincoder-vscode/src/agent/setup.mjs`（`hydrateRun` 每轮 `loadSlot` → `applySlotSessionState`）+ `thincoder-vscode/src/agent/agent-state.mjs:56`（`reconcileEngDesignTokens` 槽源合入——同 id 冲突**内存优先**〔状态词 = §6.2 ①〕；内存项永不清空——「槽 = 权威」仅指门禁读源 = D-S3） |
| 单值镜像退役（D5） | `_engDesignToken` 单值镜像**零运行时读写**（dispatch 写门资格问「任一活槽存在」——核 `resolveDesignSlot`（`thincoder-core/agent-tools/subagent-spawn.mjs:115`））；仅 `thincoder-vscode/src/agent/agent-state.mjs:70-71` 一次性迁移读（legacy 残留——`ENG-TOKEN-BINDING.md` §6.3 已列） |
| 消费落盘对称（consume 后不复活） | **W12/W13 已迁核**——现体 = 核 `thincoder-core/agent-tools/design-slots.mjs:110`（`executeConsumeDesignAction`——删内存槽 + `persistEngTokens` 当场同步落盘 + 失败回滚 `:153-156`） |
| 测试覆盖 | `thincoder-vscode/test/eng-settlement.test.mjs`（14 用例——settle 落盘 / union 忙时 / restore / consume 不复活） |

**VSC 侧差异**：① `engTokensMergeForSave` 同 key 冲突「**expiresAt 大者胜**（新 mint）」——**已消解**（W11 转口后同一实现：端壳 = 核 `mergeEngTokensForSave` re-export；
  「新铸者胜」与「expiresAt 大者胜」= 同一规则——核档 `thincoder-core/session-slot-write.mjs:172-173`）；② `reconcileEngTokensFromSlot` 同 id 冲突以槽为准（VSC 版内存优先）——**消解路径 + 到期条件在册**（A9 核查与处置 = §6.2 ①）。

## 7. 并入的关键决策记录

| # | 决策 | 理由 |
|---|---|---|
| D-S1 | **settle 即落盘**（不等回合尾） | settle 是唯一结算点——窗口内被杀即丢凭证 |
| D-S2 | 落盘失败 = **settle 失败** | 宁可结算失败可重评，也不留「内存有盘上无」半结算态 |
| D-S3 | 门禁 **miss 回读槽**（槽 = 权威） | 重启后 Map 未回填时不能凭缓存 miss 就拒 |
| D-S4 | 单值镜像**退役**（零写 + 仅一次性迁移读） | 两套真相必然分叉 |
| D-S5 | dispatch 写门改问**任一活槽** | 与 spawn 门同源（同一 reconcile） |
| D-S6 | consume 删槽**当场落盘** | 不落盘则 D1+D2 叠加出复活洞 |

## 8. 评审凭证（v2——M6 增量）

**定位**：评审通过 ≠ 授权落地——通过只发「凭证」（designId + token），实现方拿凭证解锁写码；链收口后**同 designId 再 spawn = 机械拒**（链终消费）。v1 已完整实现凭证生命周期（签发 → TTL → 消费 → 移除），**v2 继承零改**，唯一变更 = **评审对象来源改读 manifest `docRoot`**（去硬编码 `docs/`）。

**五功能点**：

| # | 功能点 | 方案 |
|---|---|---|
| F1 | 评审通过 → 签发 designToken | **继承 v1**（`generateDesignToken` + `settleDesignReview` → designId+token） |
| F2 | 链终消费制 | **继承 v1**（`consume-design` → `resolveDesignSlot` + `removeDesignTokenSlot`——消费后同 designId 再 spawn = `designId not found` 机械拒；重复消费幂等 no-op） |
| F3 | 评审对象来源读 `docRoot` | `advisor.mjs` design-review 分支（文档分类）改读 `resolveReviewTargetPaths`（`agent/write-gate.mjs`，M4 产物——**同源单一权威，不重复实现**；不 import `dispatch.mjs`——簇间回边环风险）；**按用点解析增量**：同单点新导出 `resolveReviewRootsFor(dir)`（`write-gate.mjs:59`）——逐文档所属项目根集（`thincoder-core/agent-tools/advisor.mjs:125` → `:129` 第二步；无主档回退会话根集判定）；**路径归一增量**：documents 解析单源新导出 `resolveReviewDocPaths`（宿主 = `review-facts.mjs`），逐文档四候选试探（会话根集 → 所属项目根集 → 候选项目根 → 歧义可读唯一化）——裸仓相对形按候选项目归一受理，多候选可读命中 ≥2 ⇒ fail-closed 拒（`scope-doc-ambiguous`）；冻结窗 `docAbs`（advisor-async）同源取 resolved（保护洞堵合）。实施 = eng-coder 轮；**锚祖先链增量**：候选③底座并入 **cwd 祖先链全量目录**（现行集在前 ∥ 祖先链随尾、去重保序）——容器相对形在子仓锚下受理；受理判据（目标解析位最近 manifest 声明面）∥ 围栏 ∥ 可读唯一化 ∥ fail-closed 歧义（文档名撞车——非工作区态）零改 |
| F4 | 凭证值不落文档 | token / designId **值**永不落档（只记 `review passed`）——`sanitizeText`/`CRED_RE` 机械剥除已实证（继承） |
| F5 | 六 kind 不签发 | 非全绿（含 🔴）→ 不签发 token（fail-closed，继承） |

**验收（回指 AC-M6）**：

| # | 判据 |
|---|---|
| AC-M6-1 | 评审通过（全绿）→ 签发 token + 槽登记 |
| AC-M6-2 | 链终消费后同 designId 再 spawn → 拒 |
| AC-M6-3 | 评审对象 / 被审文件路径读 `docRoot`（grep 硬编码 `docs/` → 零命中） |
| AC-M6-4 | token / designId 值不落文档（只记 `review passed`） |
| AC-M6-5 | 六 kind 非全绿（含 🔴）→ 不签发 token |

**边界（本增量不做）**：不做评审判据本身（advisor 内部——继承）；不做凭证格式改造（`uuid:expiresAt` 继承 v1，不重设 HMAC/签名层）。

## 9. 槽位清点、批量消费与回收读口

**背景（本设计因何而立）**：链终消费（§5 / §8 F2）只有逐枚通道、无清点面——已批准未消费槽只能从门禁拒文（`designId not found … held design ids`）反查。已闭链批的活 token 滞留 = 复用漏洞 ⇒ 本设计补**清点面**与**批量消费**；**签发链行为零改**（mint / settle / TTL / persist 语义与存储形零动——#868 可靠性面另论）。

**F-SL1 清点面（`subagent` action:`design-slots`——只读）**：

- **动作面**：`subagent` 工具新只读 action `design-slots`（第九动作——动作表 = `AGENT-LOOP-SUBAGENT.md` §6.7.2）；工程模式父侧（depth-0）限定（与 consume-design 同门）；分类 = 只读（planMode 放行 / 免审批 / digest 放行——同 `status` / `observe`）。
- **数据源**：槽文件权威表（`readEngTokensFromSlot`——无 TTL 过滤原样）∪ 内存 Map（并集去重，冲突以槽为准——D-S3 同源）；**零写**（不 reconcile 回写、不落盘）。
- **列表面（逐槽一行；龄升序——最老在前）**：`designId`（全串）∥ 状态（`live` / `expired`——`tokenExpired` 单源）∥ 时龄 `ageDays`（= now − (expiresAt − `effectiveTokenTtlMs`) 派生；TTL 配置曾改时为近似——如实注）∥ `expiresAt`（精确）∥ 批（下条）。尾行 = 计数行（总数 ∥ live ∥ expired）。
- **「批」列来源**：会话内评审实例注册表（`_advisorRuns`——`advisor-async.mjs` `advisorRuns`）按 designId 命中 run ⇒ `docSetKey`（= 被审文档绝对路径集 JSON）中 `batches/` 段档取 basename；不可得（跨重启 / 模式重进 / 注册表回收）⇒ `—`。**零新存储**（不向槽表加元数据）。
- **输出形**：行文本（紧凑——同 consume 面风格）；字段 / 序 / 降级标记 = 契约，行内措辞 = 实现面。

**F-SL1 回收读口扩展（reveal）**：

- **背景**：令牌一直落盘（D1——槽文件 = 权威台账），缺的只是读口——令牌随上下文压缩 / 重启从父侧窗口丢失后，此前只能考古会话档案（实证 ≈10 分钟）。本扩展 = **只读取回面**：按槽取回令牌，零授权语义变更。
- **最相近先例**：F-SL1 清点面（:172–178）+ `consume-design` 选择器严格判定（`thincoder-core/agent-tools/design-slots.mjs:185`——`expired !== true` 即拒）；对齐 = 同读源（`unionSlots` 并集）∥ 同 fail-closed 形；偏差 = ① 新揭值概念（清点面零凭据外吐）② 掩蔽规则（只揭活槽——清点面仅列状态）③ 单槽限（必携 `designId`——不吐批量凭据）。
- **参数面**：`designId`（可选——过滤到单槽；trim 后精确匹配；空串视同缺省；未知 ⇒ 拒 + 列在场 id）∥ `reveal`（可选 boolean；仅 `true` 揭值）。**`reveal:true` 必须携 `designId`**（一次一槽——不吐批量凭据、不做全量 dump）；两参皆缺 = 现行清点面**逐字零变**；`reveal:null` 视同缺省（沿 `consume-design` 选择器先例——零揭值）；其余非 boolean ⇒ 拒（fail-closed——同 `consume-design` 对 `expired` 的严格判定先例）。
- **输出形**：`designId` 过滤 ⇒ 单槽行 + 计数尾行（注 `(filtered by designId)`）；`reveal:true` 且槽活 ⇒ 槽行尾追加 `designToken=<全串>` + 回收行（「`designId` + `designToken` 原样入 eng-coder spawn——门禁严格相等校验」）。
- **掩蔽口径**：只揭**活槽**（格式合法 ∧ 未过期）——过期 / 畸形槽 ⇒ `designToken=—`（如实注因，不揭值：两态在任何门禁都过不了，揭值零收益）；**口面「活」判据 = 格式合法 ∧ 未过期——与列表 `status` 判据（`tokenExpired` 单源）不同：畸形槽列表记 `live`、口面照掩蔽（同一调用可现 `status=live` + `designToken=—`）**；`designId` 非凭据（门禁拒文即照列 designId 清单），**token 值才是凭据**。
- **日志互作（核清在案——读口结果不得经日志面二次泄露）**：工具结果前 200 字符经 `agent/dispatch-run.mjs` 的 `tool:done` 事件 `head` 字段落盘；`log.mjs` `SECRET_FORM` 现有三形均不匹配 `uuid:epoch` 值形（**实证缺口**）。
  处置 = **`thincoder-core/log.mjs` `SECRET_FORM` 增 token 值形**（`[0-9a-f]{8}-…-[0-9a-f]{12}:\d{10,16}`——与 `batch.mjs` 凭据第三形同判据），内容级「截断到形态前」（宁可丢信息不漏密钥）；字段名黑名单（`designToken` / `token`）与 `batch.mjs` 写入剥离面**零改**。实施 = 实施轮。
- **边界**：零写（不 reconcile 回写、不落盘——`unionSlots` 同源）；不改 spawn 门显式令牌语义（见下「自动解析取舍」）；不动 TTL / 消费机制；端面（VSC / 桌面）零改（只读动作级分类已覆盖）；跨重启可用（并集视图含槽文件）。
- **边界注（揭示源 ↔ spawn 门分叉——登记备查、非阻断）**：揭示源 = 槽为准（`unionSlots`），spawn 门 = 内存优先、miss 回读槽（§3 D2——`thincoder-core/agent-tools/subagent-spawn.mjs:104`）——同 id 两载体分叉时（低可达——常态同步）揭示值可能被门「严格相等」校验拒；不改两侧判序。

**回收程序（用法——运行态；值不落文档、不贴用户面）**：

1. 清点：`subagent` `action:'design-slots'`——按「批」列 / designId 认出目标槽；
2. 取回：同 action + `designId` + `reveal:true` ⇒ 全串 `designToken`；
3. 派发：`designId` + `designToken` **原样**入 eng-coder spawn（门禁严格相等）；
4. 纪律照旧：及时使用 / 链终 `consume-design`（§5 ∥ §8 F2——本扩展零改；**恢复面 ≠ 囤积许可**）；**「设计令牌不许放到过期」**（用户 2026-10-13 裁）——令牌 = 短命运行态：签发即尽快派单落地、链收口即消费；放任过期 ⇒ 该枚授权作废（门禁照拒、须重走评审），未消费活槽滞留 = 复用漏洞。

**自动解析取舍（designId-only spawn 为何不做）**：**不做**（现状显式门 = 默认保持）。理由：token 值 = 凭据；**designId 非凭据**（清点面 / 拒文均照列）——门内按 designId 自动取槽 = 把授权退化为「知道 id 即可写码」，「评审通过 → 签发凭证 → 显式持凭证」链条在门面断掉。
回收读口补的是**「取不回」**，不是「不用取」——恢复成本由读口消解（≈10 分钟考古 ⇒ 一次只读调用），门的显式性保留；如有反证（自动解析仍能保住凭证语义）⇒ 出案另裁（动门 = 凭证语义变更，须全链设计 + 用户裁）。

**F-SL2 批量消费（`consume-design` 选择器扩展）**：

- **选择器（恰一）**：`designId`（现行——单枚）∥ `designIds: string[]`（显式清单——非空）∥ `expired: true`（全部过期项）∥ `olderThanDays: number`（`ageDays > N`）。多选择器同给 / 选择器缺失且多槽 ⇒ 拒（fail-closed——不猜）。
- **语义**：按选择器解析目标集 → 逐枚移出（内存 + 权威表口径，`removeDesignTokenSlot` 同款 token 值守护）→ **单次 `persistEngTokens` 落盘**（§5 D-S6 单点）；落盘失败 ⇒ 内存快照整体回滚 + 抛（不留半消费态）。未知 / 已消费 id = 逐枚 no-op 提示（幂等——§5 语义不变）。
- **落盘携带（如实）**：persist 写内存 Map（现行序列化形）⇒ 过期项随本次落盘一并出清（D2 惰性清理既有语义——非本次引入）。
- **回执**：逐枚行 + 计数行（`consumed N`）；单枚形态回执 = 现行逐字不变。
- **同 id 再 spawn 机械拒**（§8 F2）与多槽隔离（消费 A 不动 B）**不变**。
- **边界（不做）**：不做 `all` 无选择器形态；不做按批名选择（批名非索引键——清点面读出后逐枚 / 按龄定夺）；**签发链（mint / settle / TTL / persist 形）零改**。

**落点**：

| 面 | 落点 | 说明 |
|---|---|---|
| 新档 | `thincoder-core/agent-tools/design-slots.mjs`（233 行） | 清点 ∥ 批量选择 / 消费核（解拆分：设计时 `subagent-spawn.mjs` 439 行加本面必越 500 硬限） |
| 动作面 | `thincoder-core/agent-tools/subagent.mjs`（402 ⇒ ≈415） | 第九 action 分派 + 参数（designIds / expired / olderThanDays）+ 拒文清单随动 |
| 消费壳 | `thincoder-core/agent-tools/subagent-spawn.mjs`（399 行） | `executeConsumeDesignAction` 改委托本档；单枚拒文等零变 |
| 分类面 | `thincoder-core/agent/dispatch-gates.mjs`（141 ⇒ ≈143） | `design-slots` 入 `isSubagentReadonlyAction` |
| 描述面 | `thincoder-core/tool-docs/subagent.md`（41 ⇒ ≈44） | 九动作头 + design-slots 条目 + consume-design 选择器句 |
| 端面 | `thincoder-vscode/src/agent/tool-table.mjs`（188 ⇒ ≈190） | `vscSubagentFace`：`design-slots` 入 readonly 谓词（panel 滤行机制自动携新行） |
| 动作表 | `docs/core/design/AGENT-LOOP-SUBAGENT.md` §6.7.2 | 七 ⇒ 九（补 consume-design——存量漂移就地收正 ∥ design-slots 行） |

**用例（单元测试档）**：
U-SL1 清点全列（live/expired 双态 + 龄序）∥ U-SL2 批列派生（run 命中 ⇒ basename；缺失 ⇒ `—`）∥ U-SL3 `designIds` 批量（含未知 id no-op 幂等）∥ U-SL4 expired / olderThanDays 选择器。
U-SL5 多选择器 / 空清单 ⇒ 拒 ∥ U-SL6 落盘失败 ⇒ 整体回滚（持久化注入错）∥ U-SL7 消费后同 id spawn 机械拒（不复活——槽文件已删）∥ U-SL8 多槽隔离（消费 A 不动 B）∥ U-SL9 工程模式门外拒。

**回收读口用例（增补——单元测试档）**：
U-SL10 `reveal` 活槽 ⇒ 全串 token ∥ U-SL11 `reveal` 缺 `designId` / 非 boolean（`null` 视同缺省）⇒ 拒 ∥ U-SL12 过期 / 畸形槽 ⇒ 掩蔽（值零出现）∥ U-SL13 未知 `designId` ⇒ 拒 + 在场 id 列。
U-SL14 缺省三态（无参 ∥ `designId` 过滤 ∥ `designId:''` 空串视同缺省）零揭值（默认面回归）∥ U-SL15 日志面（`logEvent` + 测试缝）：含 token 值形串 ⇒ 落盘零 token 值。

**关键决策**：

| KD | 决策 |
|---|---|
| KD-SL1 | 清点 = 新只读 action（`design-slots`） |
| KD-SL2 | 「批」= `_advisorRuns.docSetKey` 反查（零新存储） |
| KD-SL3 | 批量选择器恰一 / fail-closed |
| KD-SL4 | 消费 = 单 persist / 整体回滚 |
| KD-SL5 | 回收读口 = **F-SL1 扩展**（`designId` 过滤 + `reveal` 单槽揭值；掩蔽 = 只揭活槽） |

**编号注记（按批分述）**：
- 2026-10-07 批——U-SL1–U-SL9；对应面 = 该批 §2 验收对照 ⑤；需求侧 = `docs/core/requirements/DESIGN-TOKEN-SETTLEMENT.md:27-28`（F-SL1 / F-SL2）+ `:94` 变更行。
- 2026-10-14 批——U-SL10–U-SL15；对应面 = 该批 §2 受影响文件表测试行（该批 §2 验收对照 ⑤ = doc-check——非编号面）；需求侧 = **F-SL3 已落**（reveal 面——需求档 `docs/core/requirements/DESIGN-TOKEN-SETTLEMENT.md:29` + 变更行 `:95`；主 agent 笔——2026-10-14 父侧直接执行）。
