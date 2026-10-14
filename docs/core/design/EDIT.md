# edit 工具权威语义（EDIT）· 编辑工具板块

> 板块 = **编辑工具**；本档 = **edit 语义的权威源**（逐工具权威档之一 · 主编辑工具）。
> 地图与契约要点 = `docs/core/design/TOOLS.md` §6.6 · §8.2——本档不复制其内容（D2）。
> 共享底层（EOL 写回 / 失败候选 / U+FFFD）= `docs/core/design/EDIT-HELPERS.md`（**不在此重复**）。
> 双端：CLI `thincoder-core/tools/edit-diff.mjs` + `thincoder-core/tools/edit-batch.mjs` + `thincoder-core/tools/file.mjs`（`editTool` 壳 / schema）· VSC `thincoder-vscode/src/tools/file-edit.mjs`（同机制，各自实现）（VSC 自持镜像已删——W14 已迁核，现体同指核三档）。 （迁移期引文）
> 模型可见描述 = `thincoder-core/tool-docs/edit.md`（提示词面 / 产品代码——与语义须同改，见 §2 末）。
> 需求侧 = `docs/core/requirements/TOOLS.md`（工具系统板块；CLI 树无逐工具需求档）。
> 建档：2026-09-15（**B 式迁移轮 · 第 1 批**——`thincoder-cli/docs/design/EDIT.md` 内容重建入基准层；旧档原地一字不改、留作参照历史）。

## 1. 定位

edit = **按精确区域替换 / 删除文件内容**——主编辑工具。定位两形态（互斥）+ 三级匹配 + 判定序 4 分支（§4）+ **删行形态**（行号 + 省略 `new_string`——§5 矩阵）。适用面：知道要改 / 删哪一行或哪一段、或能给出当前内容。

**不是**：插入新行（→ insert_after）、按内容哈希行定位（→ hashline_edit）、整块 diff 多文件（→ apply_patch）、整文件重写（→ write）。（路由在模型可见描述的 Routing 段。）

## 2. 参数与 schema

- `path`（必须）——目标文件。
- **形态二选一**：
  - **行号形态（D1）**：`line: N`（单行，1-based）／ `startLine: N, endLine: M`（行范围，1-based 闭区间）——替换该行 / 范围为 `new_string`，**不需 `old_string`**；
  - **内容形态**：`old_string`（必须）——变化区当前内容；`new_string`——该区期望结果。
- `new_string`——内容形态必须；行号形态**可省略（= 删行 / 删范围）**；**显式空串 `""` 两形态皆拒**（§5 矩阵）。
- `replace_all`——字面替换每处（内容形态 only；行号形态不适用）。
- `edits`（数组批量）——`[{path?, old_string?, new_string?, line?, startLine?, endLine?, replace_all?}]`（条目同顶层形态语义——行号条目省略 `new_string` = 删）；互斥：`edits` 与顶层 `old_string`/`new_string`/`line`/`startLine`/`endLine`。

**两处维护点**：`thincoder-core/tool-docs/edit.md` 是模型可见文本（运行时经 `DESC()` 加载为 description）——与本文档语义一致，改语义须同改。

## 3. 匹配档位（D2——内容形态）

`old_string` 匹配三级档序（宽容——模型差异容忍）：

1. **逐字**——精确字符串匹配。
2. **唯一空白差异窗口**——逐字 occurrences=0 时按行 `trim()` 等价的唯一窗口自动应用（附 note）；多窗口歧义仍 not-found（不猜）。
3. **模糊匹配**——唯一窗口：行级 normalize（统一基准 = 去首尾空白 + 去行尾空格／tab→2 空格／`'`·`‘’`·`“”`·反引号单遍映射到 `"`（无顺序依赖）／无行内折叠）后逐行相等比例 **≥90%** 即匹配（附 `fuzzy matched` note 明示）；多窗口歧义 / 不足阈值仍 not-found 报错（不猜）。

## 4. 判定序（内容形态）

替换后做行级 diff 判定（在 normalize(LF) 域做行级 LCS）：

1. **分支 0（就地替换）**：old 恰单行 ∧ new 恰单行 ∧ 全文唯一匹配 ∧ new 非空 → 就地整行替换（行数不变）。
2. **零重叠**（old 每行都不在 new）：**替换即删**（D3——breaking：old 行整体删除、new 取而代之；原「插入保留旧行」语义废止；新增行改用 insert_after）。
3. **一般 LCS diff**：公共行保留（LCS 序）、old 独有删、new 独有插。
4. **平凡**：new 与 old 行级全等 → 原样替换（no-op 成功）。

**行号形态**（不经判定序）：定位行 / 范围 → 直接替换为 `new_string`（行数 = 范围行数 → new 行数）；**省略 `new_string` = 删行**（行数 → 0），返回 `Deleted line N of <path>` ／ `Deleted lines N-M of <path>` + diff。越界 / 互斥见 §5。

## 5. 约束

- **空串 vs 省略矩阵（D-8.1 裁定）**：
  - 内容形态空 `new_string` = **显式错误**（提示须带保留上下文行；单行替换永不成删除——防删除保护先于分支 0；含 `replace_all` 空串——守卫先于 replace_all 分支）；
  - 行号形态**省略 `new_string`** = 删行 / 删范围（有界意图——删哪行是显式声明）；
  - 行号形态**显式空串 `""`** = 显式错误（防误删——提示「省略 new_string 以删行」）；
  - **批量 `edits` 条目**同顶层（条目含行号 + 省略 `new_string` = 删行；内容条目空串拒）。
- **互斥**：行号形态与 `old_string`；`line` 与 `startLine`/`endLine`；`edits` 与顶层形态——均显式报错。
- **行号校验**：`line`/`startLine`/`endLine` 正整数；`startLine ≤ endLine`；`endLine ≤ 文件行数`（越界报错）；删行形态同校验。
- **`replace_all`**：每处 old→new **字面替换**（不做插入 / 分支 0）；多匹配无 `replace_all` → occurrences 错误。
- **`edits` 数组**：同文件多条**串行累积**、跨 path 并行、**全判后原子写**（任一失败全不写）；条目内同样二选一（`old_string` 或行号）；顶层 `path` = 无自带 path 条目的默认，条目自带 path 优先。
- **入参容器守卫（#325）**：`edits` 真值非数组（字符串 / 对象 / 数字等）或空数组 ⇒ 成形错误「edits must be a non-empty array of {path, old_string | line/startLine+endLine, new_string}」——空数组与真值非数组 = 同一错误面；假值 `edits`（`""` / `0` / `false` / `null`）视同缺席 ⇒ 单形态面（不触本守卫）。
- **条目守卫（#325）**：条目非对象（`null` / 字符串 / 数字 / 数组）⇒ 条目级成形错误「edits[i] must be an object of {path, old_string | line/startLine+endLine, new_string}」（i = 数组下标）。
- **守卫与文案单源（#325）**：两守卫（`assertEditsContainer` / `assertEditEntries`）+ 五文案（`EDITS_CONTAINER_ERROR` / `editsEntryError(i)` / `EDIT_ENTRY_NO_PATH` / `EDIT_ABORT_PREFIX` / `editEntryLabel(p)`）单源 = `thincoder-core/tools/edit-diff.mjs`。
- **调用点（#325）**：核 `edit-batch.mjs` 与 ACP 桥 `bridge.mjs` 一律引用调用——桥零字面副本（§6 入参守卫行 / §8 D-7）。
- **零裸抛（#325 · #327 扩）**：`touchedPaths` 钩子（`execute` 前被多处消费）不抛——真值非数组容器 ⇒ 零触达（返 `[]`；假值视同缺席 ⇒ 顶层 `path` 分支）、非对象条目 ⇒ 按「缺 path」尽力提取（§8 D-6）；**`args` 自身为 null 或非对象 ⇒ 一律按 `{}` 处理**（消费边界规范化——单源谓词 `toolTouchPaths`，见 `docs/core/design/TOOLS.md` §6.17）。
- **桥面同口径（#325）**：ACP 桥 `editBatch` 与核同调用两守卫（同单源、同句）——`[null]` / 非对象条目 ⇒ 同文案含下标成形错误（经 `toolRouter` catch 渲染 `Error: <msg>` 工具结果——零裸 TypeError、零反向 RPC）。
- **非数组容器归宿（#327 归一）**：`edits` **真值**非数组 ⇒ 两通道同判——桥 `edit` 路由与核 `execute` 同为真值判 ⇒ 走容器守卫同一错误面（携合法单形态参数的窄形态同样落此面——**不存在「桥径单形态应用」分支**）；`edits` 假值（缺席）⇒ 单形态面（见 §8 D-8）。
- **行数上限**：old/new 各 ≤1000（超限报 edit region too large）。
- **not-found 引导**：错误含 `searched:` + grep 建议 + `similar lines (top 3, score)` 段（LCS 连续子串 / 阈值 0.5 / top3，单行亦覆盖；零候选省略——算法权威见 `docs/core/design/EDIT-HELPERS.md` §2 `findCandidates`）。
- **数据新鲜度**：`old_string` / 行号只来自最新 `read`——改前 re-read。
- **批量回执汇总行（#796）**：`edits` 批量回执**末行恒为一行汇总**——逐字 `edit batch: N/N entries — <路径清单>`（**N = 条目数 ∥ 清单 = 去重路径**；路径 = 条目**原样形**、去重保序首现序、分隔符 = `, `；全判后原子写 ⇒ 成功恒 N/N）。位置 = **末行**——大回执（>64K）落盘后双端 preview 保尾（`docs/core/design/TOOL-OUTPUT-LIMITS.md` §2）⇒ 汇总结论恒可见；恒定追加（不设「仅大回执」分支——判据单点、不引阈值耦合）。
  （射程 = 核面 `editBatch` 汇总组装；**ACP 桥批量回执不适用本条**——桥面自持逐条行，`thincoder-cli/src/acp/bridge.mjs` editBatch 逐条 join 收尾、无汇总行组装。）

## 6. 实现单一权威（现状路径 · as-of 2026-09-15 实核）

| 面 | 落点 | 实核 |
|---|---|---|
| 工具对象 / schema | `thincoder-core/tools/file.mjs:224`（`editTool`） | 导出在位 |
| diff 内核 / 判定序 | `thincoder-core/tools/edit-diff.mjs:88`（`applyPatchLines`）· `:280`（`computeEditEntry`） | 导出在位 |
| 校验 / 互斥 / 删行 | `thincoder-core/tools/edit-diff.mjs:141`（`assertEditArgsExclusive`）· `:170`（`validateEditEntry`）· `:67`（`deleteTarget`）· `:61`（`hasLineParams`）· `:75`（`splitLines`） | 导出在位 |
| 入参守卫（#325） | 单源 `thincoder-core/tools/edit-diff.mjs`（`assertEditsContainer` / `assertEditEntries` + 五文案——两通道共用）· 调用点 `thincoder-core/tools/edit-batch.mjs` / `thincoder-cli/src/acp/bridge.mjs` · `thincoder-core/tools/file.mjs:257`（`touchedPaths`——零抛、尽力提取） | 本批落（#325） |
| D1/D2 纯函数 | `thincoder-core/tools/edit-batch.mjs:128`（`normalizeEditLine`）· `:149`（`findFuzzyWindow`）· `:183`（`applyLineEdit`）· `:140`（`FUZZY_MATCH_NOTE`） | 导出在位（edit-diff 调用期导入——ESM 循环安全） |
| 三通道共用 | 本地单形态 / `edits` 批量 / ACP 桥 | 同内核 |
| 批量回执汇总行（#796） | `thincoder-core/tools/edit-batch.mjs:112-113`（`summary` 组装 `:112` ∥ `return [...results, summary].join("\n")` `:113`——as-built 2026-10-04） | 本批落（#796）；**ACP 桥批量回执不适用**（桥面自持逐条行——`bridge.mjs` editBatch 逐条 join 收尾） |
| 注册面 | `thincoder-core/tools/index.mjs:4` · `:21` | file 组 |
| 描述面（模型可见） | `thincoder-core/tool-docs/edit.md` | 在位（`DESC()` 加载） |
| VSC 对位实现 | `thincoder-vscode/src/tools/file-edit.mjs:78`（`edit`）· `edit-diff.mjs` · `edit-batch` 等价档（`edit-line-params.mjs` / `edit-fuzzy-match.mjs`）（W14 已迁核——上述自持档已删，现体 = 核 `thincoder-core/tools/{file.mjs, edit-diff.mjs, edit-batch.mjs}`） | 同机制 · 独立实现 （迁移期引文） |

**VSC 端差异（并入 · 批 8）**：① 描述机制——VSC 无 `DESC()` md 描述（`file-edit.mjs` editTool 对象内嵌 description——与 CLI `tool-docs/edit.md` 语义一致）；
② 编辑器路径——doc 已打开 → WorkspaceEdit range 替换（定位偏移与 `doc.positionAt` 同坐标系——`lfOffsetToRaw` 把 LF 域偏移映射回 CRLF 原文，见 `docs/core/design/EDIT-HELPERS.md` §6）；③ 测试——VSC 侧 30 用例
（`thincoder-vscode/test/edit-tool-improvement.test.mjs`：删行形态 / 空串拒 / normalize 逐字同算法 / 批量混用行号+内容条目）。（已随 2026-09-28 测试树全清退场）（迁移期引文）

**同类扫描（#325 · as-of 2026-09-25）**：「真值判断后点链」缺陷类——`thincoder-core/tools/**` 全扫仅 `file.mjs` 的 `touchedPaths` 一处（本批已卫）；其余工具触摸面（`read` / `insert_after` / `hashline_edit` 单参形态；`apply_patch` 有 try/catch 包裹）无一命中。**桥面**（`thincoder-cli/src/acp/bridge.mjs`）：`[null]` / 非对象条目同守卫同文案、跨档文案零副本（同批收——§5 / §8 D-7）。
**消费面续扫（#327 · as-of 2026-09-25）**：钩子消费点十处（核 6 · VSC 4——逐点坐标见 `docs/core/design/TOOLS.md` §6.17 表）已归单源谓词 `toolTouchPaths`；本档 `touchedPaths` 本体零改。

## 7. 测试

`thincoder-cli/test/edit-tool-improvement.test.mjs`（**已随 2026-09-28 测试树全清退场——档不在盘**；原 **45 用例——41 快 + 4 slow**：删行形态全路径 / 显式空串拒含 `replace_all` / normalize 弯引号命中 + 单遍映射单元 / 防误匹配 / 批量删行 + 模糊端到端 / **#325 入参守卫 9 例** / **#327 三例**）。（迁移期引文）
**#325 守卫 9 例** = 核 5（真值非数组三态 `"[]"` / `{…}` / `42` + `[null]` / 非对象条目 ⇒ 成形错误、零裸抛）+ 桥 4（空数组 / `[null]` / 非对象条目经 `toolRouter` ⇒ `Error: <msg>`、零反向 RPC + 合法批量正向对照）。
**#327 三例**（`docs/core/design/TOOLS.md` §6.17 裁定 3 / 4）= 窄形态两通道同拒（`edits` 真值非数组 + 合法单形态参数：桥路由与核 `execute` 同错误面、零写入）+ `args = null` 下 `write` / `edit` **必败**（形态据实施轮先跑读数定——`Error:` 串 ∥ 抛错）、目标零变更（「该调用必败」前提机检）。
**#796 汇总行 4 例**（批次本地单元测试档——随批档留存 · 不进集成测试树）：逐字汇总行 ∥ 路径去重序 ∥ 恒定（N=1 与 N=n 同附）∥ >64K 经 `offloadToolResult`（临时目录）preview 仍含末行。
VSC 侧同名档 `thincoder-vscode/test/edit-tool-improvement.test.mjs`（**已随 2026-09-28 测试树全清退场——档不在盘**；同引核面——守卫随核生效、端档零改）。（迁移期引文）

## 8. 并入的关键决策记录（含否决备选）

| # | 决策 | 理由 / 否决备选 |
|---|---|---|
| D-1 | **行号形态**（`line:` / `startLine–endLine`）与内容形态并存 | 行号形态免除「编造上下文」；否决「仅内容形态」（多轮编辑后必然要重读全文） |
| D-2 | 三级匹配**宽容档序**（逐字 → 空白窗口 → 模糊 ≥90%） | 模型生成的 `old_string` 常带空白 / 缩进 / 引号差异；一律 not-found 会逼模型重头重写 |
| D-3 | **零重叠 ⇒ 替换即删**（breaking） | 「插入保留旧行」使简单替换产生双份内容（实害）；否决保留旧语义（新增行有 insert_after 正路） |
| D-4 | 显式空串 = **错误**、省略 = 删行 | 空串是手滑最可能形态（防误删）；省略是有界显式意图 |
| D-5 | `edits` 数组**全判后原子写** | 半应用批量 = 不自洽工作树 |
| D-6 | 入参守卫落 **`touchedPaths` 零抛 + 执行阶段单源成形错误**（#325） | 钩子内抛错（即便成形文案）会从首个未守卫点逸出（实测 = VSC L3 前置查询 `thincoder-vscode/src/agent/execute-tools.mjs:188`→`Promise.all` 批级拒绝、裸 TypeError 直达用户）；零抛 ⇒ 拒绝统一落 `applyEditBatch`（与空数组同点同文）。**消费侧兜底（#327）**：十处消费点归单源谓词 `toolTouchPaths`（`docs/core/design/TOOLS.md` §6.17）——零抛契约两侧同护。否决：钩子内抛同文案（第二抛点、逸出不可控） （迁移期引文——档已迁核） |
| D-7 | 跨档单源 = **`thincoder-core/tools/edit-diff.mjs`**（#325 · 桥面同批收）：两守卫 + 五文案，核 `edit-batch.mjs` 与 ACP 桥 `bridge.mjs` 同调用、桥零副本 | 两侧已共同导入 `edit-diff` 校验词汇（`assertEditArgsExclusive` / `validateEditEntry` 等先例）——单源住共用导入面，条件与文案同时锁死；否决：常量导自 `edit-batch.mjs`（桥依赖本地实现模块、条件可分叉）；否决：桥自持副本（D2 双源） |
| D-8 | 非数组容器的通道归宿 = **归一（#327）**：桥 `edit` 路由判据改与核同（`Boolean(args?.edits)` 真值判）——`edits` 真值 ⇒ 两通道同入批量分支、同容器错误面；假值 ⇒ 单形态面。窄形态（真值非数组 + 合法单形态参数）不再有「桥径单形态应用」分支 | 分歧的代价 = 窄形态下写落地而门禁 / 变更记账 / L3 看到零路径（fail-open 面——`touchedPaths` 真值非数组返 `[]` 的前提「该调用必败」被打破）；归一恢复该前提 ⇒ `[]` 语义重新为真，#325 判据零改（否决：维持登记〔承载 fail-open 面〕；否决：核侧改 `Array.isArray`〔弱化容器守卫、违 E1/E2〕；否决：改 `[]` 为保守形〔掩盖真因〕） |
| D-9 | 汇总行 = **恒定末行**（不设「仅大回执」分支） | tail 恒保留 ⇒ 末行恒可见；恒定 = 判据单点（无阈值分支、无临界尺寸二义）；小回执多一行 = 零害。否决：「仅 >64K 追加」（工具须知 offload 阈值 = 跨面耦合 + 第二判据） |

