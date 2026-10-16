# 台账机制（LEDGER）· 设计

> 板块：工程模式 / 台账——**待办总账单一权威源（SQLite）** + **台账提醒与可见面（FR24 载体面）**。
> **v2**：存储 = **SQLite 单表**（M2 模块设计语义并入本档——就地更新纪律）。
> **F-LX1 执行者归属**：多实例并存下在途条目记「谁在做」+ 可见面判活展示——schema `executor` 列（§2）· 迁移写语义（§3.1）· 判活展示（§7.3.1）；需求层指针 = `requirements/ENGINEERING-MODE-V2-SPEC-LEDGER.md` §2.8 · AC-M2-7/8。
> 需求层指针 = `requirements/ENGINEERING-MODE-V2.md` §3（M2 台账 SQLite）· §9。
> 兄弟档：`design/LEDGER-SELF-CONTAINED.md`（L4「本仓可解析」判据）· `design/DOC-DISCIPLINE.md`（机检引擎）· `design/BATCH-RECORD.md`（核销同步清单槽位枚举 = `design/DOC-DISCIPLINE.md` D7 行）。
> 落点：用户数据目录键控库 `~/.thincoder/ledger/<sha1(项目根)>[:16].db`（SQLite，工作树外——天然不进 git；用户裁定：不在项目目录）· `thincoder-core/ledger-db.mjs`（DDL / 开库 / 幂等迁移）· `ledger-cmd.mjs`（命令族 + 工具定义）· `ledger.mjs`（族发现 / scan 组装 / 判活解析 / 格式 helper + re-export 单源）· `ledger-surface.mjs` ×3（核机制 + CLI / VSC 端胶水——显示面）。

## 1. 机制目标与范围

需求池的诉求：**一眼看出“哪条需求落地了没有”**，无需遍历文档；条目与任务书**指针咬合**——点开即见任务书 §2 与验收结论。

**范围**：schema / 状态机 / 命令面（查询全角色 + 写仅主 agent）/ 归档软删除 / 计数单源 / 展示面（CLI TUI + VSC 状态栏）+ 收口行。

## 2. 存储与 schema（v2——SQLite 单表）

**表 schema（`ledger-db.mjs` `DDL` 常量——`openLedger` 幂等执行 + 老库列迁移）**：

```sql
CREATE TABLE IF NOT EXISTS items (
  id         INTEGER PRIMARY KEY,
  kind       TEXT NOT NULL CHECK(kind IN ('requirement','tech_todo')),
  status     TEXT NOT NULL CHECK(status IN ('待讨论','待设计','在途','待核销','已核销','已废弃')),
  title      TEXT NOT NULL,
  board      TEXT,
  req_doc    TEXT,
  task_book  TEXT,
  evidence   TEXT,
  trigger    TEXT CHECK(trigger IN ('归批','条件','认账不排期') OR trigger IS NULL),
  executor   TEXT,
  created_at TEXT,
  updated_at TEXT,
  closed_at  TEXT,
  CHECK (status NOT IN ('在途','待核销') OR (task_book IS NOT NULL AND task_book <> ''))
)
```

- **三 CHECK 枚举**（`kind` / `status` / `trigger`）= 机械锁死——非法值 INSERT 由 SQLite 引擎拒（AC-M2-1/2），不靠应用层校验；`status` NOT NULL 兜底（CHECK 不拦 NULL）。
- **咬合 CHECK**：`在途 / 待核销` 必带 `task_book`（任务书指针——与 M3 批次档互指）——DDL 只承载**非空**半幅；**「指向档存在」半幅 = 写门**（§6.1 · AC-M2-10）——工具路径下缺指针（`null`）亦由写门先拒；DDL CHECK = 库级防线。
- **时间戳三列**：`created_at` / `updated_at` / `closed_at`——行龄源 + 软删除落点。
- **落点**：用户数据目录键控库 `~/.thincoder/ledger/<sha1(规范化项目根绝对路径)>[:16].db`（**键契约 = §2.1**）——项目根仅作关联键，**项目内不留任何文件**（无 .gitignore 负担；用户裁定）；惰性创建（首次写面 `openLedger`；读面库不在 = 空账）。
- **executor 列**（F-LX1 · TEXT 可空）：`sessionId` 文本——**schema 锚定零 CHECK**（会话进程 transient，无值域可锁；语义由 §3.1 写语义保证、活性由 §7.3.1 判活消化）；`ledgerAdd` INSERT 不涉（恒入待讨论、executor NULL）。
- **老库兼容与幂等迁移**（§2 逐字 DDL 为**新库**形态；旧 DDL 建的库无 `executor` 列）——`openLedger` 建表后迁移：
  - 预判：`PRAGMA table_info(items)` 判缺列才 `ALTER TABLE items ADD COLUMN executor TEXT`（幂等——二次打开列已在、零动作零副作用）。
  - 并发窗：两实例同时 ALTER，后到者收 SQLite「duplicate column」错——catch 后 `table_info` **复核**：列在 ⇒ 吞（对手实例已迁），列不在 ⇒ 抛真错。
  - 迁移零行损：ADD COLUMN 纯增量，既有行新列取 NULL。

### 2.1 库键契约与归一

**键式（单源 = `ledger-db.mjs` `ledgerKey(root)`）**：

```
key = sha1(normalizeCwd(resolveProjectRoot(cwd) ?? resolve(cwd ?? "."))).slice(0, 16)
```

- **归一步** = `session-slots.mjs` `normalizeCwd`（Windows 盘符统一大写——**盘符步 = `normalizeCwd` 直调**；分隔符折叠自持）——跨端契约「两端同 cwd 同一 hash」；同契约消费面 = session / checkpoint / traces / peers。
- **`resolve()` 既有规范化**覆盖分隔符（`/`→`\`）· 点段折叠 · 去尾斜杠——归一函数只补**盘符大小写**一维；残差即该断口（VSC `uri.fsPath` 小写盘符 vs CLI `process.cwd()` 大写）。
- **键不变性**：盘符本已大写（CLI 侧）⇒ 归一恒等 ⇒ **CLI 现状键零变**；小写盘符（VSC 侧）并入同键 ⇒ 两端同库。判据 = AC-M2-11。
- **级联面**：`findProject` / `discoverFamily` / `buildScan` 全链随键收敛——**不新增归一函数、不改各调用点**（键只在 `ledgerKey` 一处生成）。
- **单源判据射程**（AC-M2-11 第三分句）：grep 域限**台账键生成面**（`ledgerKey` 所在链）——他面哈希（会话 / checkpoint / 迁移报告等合法同形哈希）**不属本判据**。
- **根解析面（工作区报明；2026-10-15 收正）**：根式兜底（`resolve(cwd ?? ".")`）**只属「无项目」（none）**——建档流语义；**锚 = 工作区（`projectRootView` `workspace`——下辖 ≥2 项目）⇒ 不产键**：`openLedger`（存取入口单点）**报明事实 + 点名项目根**（下辖项目全列按名排序 + `cwd=<项目根>` 的下一步；零写）；**措辞族**：「项目不可解析」收窄为**仅「档非法」**（工作区格改事实行——2026-10-15 收正）。消「静默回退到锚」双面症（缺省空读 / 错写落锚）。键式函数本体（`ledgerKey`）零改。

**不做（边界）**：`realpath` / 符号链接解析；**非盘符段大小写折叠**（POSIX 大小写敏感 + origin 语义——同 `MEMORY.md` §6.11「不做」）；别名路径（subst / junction / 8.3 短名 = 已知限制）。

**路径串等值比较边界（登记 · VSC 侧 `===`）**：台账链路现存字符串等值比较**三处**——`ledger.mjs` `scopeMarkerOf` 范围滤取 `scan.root === family.current.root`（现盘 `:166`——实现式 = 解构后 `s?.root === currentRoot`，本写法为近似形）；`ledger.mjs` `discoverFamily` 的 `p.root !== current.root`，
`ledger-surface.mjs`（核与 VSC 两份）的 `s.root === family.current.root`。
三处均出自**同一 anchor 的单进程同源谱系**，不跨端比较裸路径串；跨端一致性只经**库键**承载。
判定 = 零缺陷、零代码改；守卫 = 新增比较点不得跨端直比裸路径串（须经 `normalizeCwd`）。**验证**：零代码改 ⇒ **无独立守卫用例**——验证 = 静态审计在册（本段）；T22 = **间接守卫**（级联面同契约下游回归：`findProject` 同键——非各 `===` 点的直测）。

**指针**：导出契约 = §7.1；验收 = §8 AC-M2-11 ∥ AC-M2-17（根解析面）；存量收正 = §2.2。

### 2.2 存量迁移（同项目变体键合并 · 命令面）

**命令面**（核内实现 `ledger-migrate.mjs` + CLI 子命令——先例 = `session gc` 的 `--dry-run` / `--confirm` 双档）：

| 命令 | 语义 |
|---|---|
| `thincoder ledger migrate --dry-run` | 只读报告：目标库（键 / 路径 / 行数——**缺档 ⇒ 标「拟建（0 行）」**；**不可读 ⇒ 标「不可读」且 confirm 面将拒跑（fail-closed）、迁移后计数以 `?` 占位**）· 变体源候选（逐源行数 + 状态分布 + mtime；**源不就绪（不可读 / 无 `items` 表 / 缺列）⇒ 行内标「⚠ <拒因>（confirm 面将拒跑）」**）· 计划动作（备份路径 / 拟迁行数 / 迁移后计数）· **写门风险旗**（迁入行属 `在途/待核销` 且 `task_book` 不可解析 / 指向档不存在 ⇒ 该行后续更新将拒于 §6.1 写门）。零写。 |
| `thincoder ledger migrate --confirm` | 执行六步（下）。执行主体 = **父侧 ops**（用户在场；先例 = memory origin 数据面「父侧 ops · 子代理零触碰」）；实施轮自动化面 = `_setLedgerDirForTest` 临时目录夹具。 |
| `thincoder ledger audit` | 只读全目录分类报告（存量残档审计载体——逐键定性 + 处置建议）。 |

**变体键枚举法（单源 = `legacyKeyVariants(root)`）**：候选 = 项目根**盘符大小写翻转拼写**的**原样 `sha1[:16]`**（先例 = `session-migrate.mjs`「盘符两形都试」）。非盘符段不生成变体（§2.1 不做）。
显式 `--from <key>` = **补充源**（用户已知键并入枚举候选、去重）——**取值必须为 16 位小写十六进制键形**（`/^[0-9a-f]{16}$/`，判在目录拼接之前 ⇒ 路径形 / 越目录形取值不落台账目录外档）；**非法键形 / 指名键无对应库 / 不可开 ⇒ 拒跑**（fail-closed，零写；显式指名不静默跳过）。目标键 = `ledgerKey(root)`（归一形）。

**执行六步（`--confirm`）**：

1. **备份（不可省）**：目标库 + 全部源库**文件拷贝**进 `~/.thincoder/ledger-backup/<YYYYMMDD-HHmmss>/`——**备份 / 回收目录 = `ledgerDirPath()` 的兄弟位**（同派生于可覆盖基；`_setLedgerDirForTest` 覆盖后二者同随 ⇒ 夹具根外零写）；**目标库缺档态**：目标键库不存在 ⇒ 视为空目标（0 行、无可备档——报告标「拟建」），迁入步建库建表；读回判据 = 逐档可开 ∧ `COUNT(*)` 同源；失败 ⇒ 拒跑（零写）。
2. **源就绪与列集判**：源可开 ∧ 含 `items` 表 ∧ **13 数据列核对**（`PRAGMA table_info(items)`）——**缺 `executor` ∥ `resume_when` 任一**（旧列态；**容忍集 = `{executor, resume_when}`**）⇒ 该列按 **NULL 映射**照迁；**缺其余任一数据列** ⇒ 拒（列集不可归因，fail-closed）；带 `-wal` / `-shm` 伴生档的源 ⇒ **拒**（fail-closed——单档回收会丢未 checkpoint 数据）。
3. **单事务迁入**：`BEGIN` → 逐行 INSERT（**重发新 id**——目标 `INTEGER PRIMARY KEY` 自增；映射 `源id → 新id` 由 `lastInsertRowid` 采集）→ **事务内读回核验**（逐行 **13 数据列**与源等值——**不含 id**（id 重发）∧ 目标既有行不动）→ `COMMIT`；任一步失败 ⇒ `ROLLBACK`（措辞二分支：既有目标「目标零变、源零动」/ 新建目标「目标零行变、源零动（目标档为本次新建——ROLLBACK 后 0 行空库档残留在原路径）」）。
连接设 `PRAGMA busy_timeout = 3000`（先例 = `memory/schema.mjs` 同值）；忙 ⇒ 明示「另一实例占用」拒跑。
4. **回收源**：源库 rename 进 `~/.thincoder/ledger-trash/<批次>/`（**同可覆盖基**——见步 1；**不 unlink**——先例 = session-gc `sessions-trash`）。
5. **报告**：`ledger-backup/<批次>/migrate-report.json`——迁前 / 迁后计数、逐源逐行 id 映射、跳过行、旗标。
6. **汇总输出**：迁入行数 / 跳过数 / 迁移后目标计数 / 备份与回收路径。

**幂等护栏**：INSERT 前按**全字段等值**跳过目标已有行（崩溃窗重跑不重复）；重跑时源已回收 ⇒ 报「无待迁源」（exit 0）。

**语义保全**：**13 数据列逐字复制**（kind / status / title / board / req_doc / task_book / evidence / trigger / executor / resume_when / created_at / updated_at / closed_at——**不含 id**）；**id 重发**（两库 id 空间重叠——保留原 id 必撞；外部可回查面 = 报告映射 + 源库留档）；零字段改写、零状态改写。**等值比对列集** = 该 13 列（不含 id）。

**审计面（`thincoder ledger audit`）**：逐 `*.db` 出 `{键, 文件, 大小, mtime, 行数, 状态分布, 定性}`；定性枚举 = `目标库` / `变体源` / `空库` / `不可归因（有行）` / `不可归因（读取失败）` / `不可读（坏档）`。
**读取失败态**（并发删除 / 不可 `stat`）该档大小 / mtime / 行数记空（输出 `—` / `?` 占位）、**按档报告不抛**（整命令不中断）。归因法 = **候选根集合**（当前锚项目 + `--root` 追加）的变体键匹配（sha1 不可逆——只做候选生成，不做启发式）。**处置建议**（**只报告零动作**）：非目标 / 非源者保持原位；空库与夹具残库建议**回收目录**而非删。

**边界**：不做跨项目全量一条命令迁移（逐项目锚定）；不自动执行（需 `--confirm`）；不删除存量残档（只报告 + 建议）；不动其他用户态面（sessions / checkpoints / memory / `ledger-notify.json` 历史存量档——零读写）；不做自动回滚（回退 = 从备份拷回 + 重开校验，手工步）。

**指针**：验收 = §8 AC-M2-12 / AC-M2-13 · 用例 T24–T32；CLI 接线 = `thincoder-cli/bin/thincoder.mjs` `case "ledger"`；首跑检测提示（F-LX3）。

## 3. 状态机（六态 + 迁移表）

六态：待讨论 → 待设计 → 在途 → 待核销 → 已核销；任意态 → 已废弃。状态迁移**只在写命令内收敛**（`ledgerAdd` 入待讨论 / `ledgerUpdate` 迁移 / `ledgerClose` 核销→已核销、撤回→已废弃），查询面只读 status。

**收口两源**：已核销的来源 = 待核销（勾销）· **待讨论 / 待设计（追认核销——行 `evidence` 非空，缺 / 全空白则拒）**；**在途 → 已核销 不可跳**（仍经 待核销）。撤回与 `ledger`（update）迁移表零改。
失败文案（逐字——机检断言）：源态不许核销 ⇒ `ledgerClose：核销仅限 待讨论 / 待设计 / 待核销（现态 <X>）`；追认缺 `evidence` ⇒ `ledgerClose：追认核销须带 evidence（现态 <X>）`。

**允许迁移表**（`ledgerUpdate` 迁移前判；表外 → 拒，行不变）：

| 现态 | 允许目标态 |
|---|---|
| 待讨论 | 待设计 · 已废弃 |
| 待设计 | 在途 · 已废弃 |
| 在途 | 待核销 · 已废弃 |
| 待核销 | 已核销 · 已废弃 |
| 已核销 | 已废弃 |
| 已废弃 | （终态，无出边） |

### 3.1 executor 迁移写语义（F-LX1）

**判位与判序**（挂 `thincoder-core/ledger-cmd.mjs` `ledgerUpdate` 函数体内：迁移表判**之后**、写门 `assertTaskBookGate` 与 `UPDATE` **之前**——同函数同层，判序 = 迁移表判 → 本语义（算 executor 目标值）→ 写门 → UPDATE）：计算结果行状态 `to` 的 executor 目标值，随同一 `UPDATE` 落列。

优先级两分句：**进边 = patch 显式值 > sessionId > 行现值兜底 > NULL**；**出边 = 无条件 NULL**（patch 显式值不复活）。

**`null` 口径**：`executor` 的显式 `null` ≡ **略去**——工具层与缺省同分支（取本会话 sessionId 供值），核内取值链对 `null` / 缺键同判（`??` 形，零改）；「可空字段 `null` ≡ 略去」（§3.2）在本字段上无破例。

1. **进入活跃态**（两枚入边：`待讨论 → 待设计`——**批点火边**；`待设计 → 在途`——实施入边）：`executor = patch.executor ?? sessionId ?? 行现值 ?? NULL`。
   - **点火即落归属**：实操点火 = 推「待设计」（批全程行在「待设计」上过——「在途」步常至收口走账才落）⇒ 只保 `待设计 → 在途` 单边时在飞行 executor 恒 `null`；扩至点火边后在飞行行即携本会话归属。
   - `sessionId` = 调用会话，**函数参数注入**——`ledgerUpdate({ …, executorSessionId })`；工具层由 `ledger`（update）execute **动态 import** `getSessionId()`（`session-slots.mjs`——形如 `{pid}-{ts}-{rand}`）供值（决策 K-LX1：纯函数可测 + 零新静态边）。
   - `patch.executor` = `ledger`（update）参数面新增可选字段（接手改写归属入口——见 5）。
   - **行现值兜底**：`已废弃 → 在途` 重启保留原属主（无新实施迹象时归属不漂——非空即留）。
2. **离开「在途」**（`在途 → 待核销` / `在途 → 已废弃`——迁移表仅此两出边；六态**无回退边**，AC-M2-7「回退清除」子句无表内路径承载 ⇒ 语义由出边清除覆盖）：**无条件置 NULL**——patch 显式传 `executor` 也不复活（出边自动语义压 patch）。
3. **其余情形**（无状态迁移的纯字段更新 / 活跃态出入门之外的迁移——如 `待核销 → 已核销`）：executor 按普通补丁字段语义 `patch.executor ?? 行现值`——既有调用（不带 executor）行为零变。
4. **`ledgerClose` 撤回路径**（任意态 → 已废弃——含在途直撤）：UPDATE 同步 `executor = NULL`；核销路径**两源同式零触碰**——勾销（待核销 → 已核销：executor 已在离场迁移清空）与**追认（待讨论 / 待设计 → 已核销：非在途出边，不属 §3.1 ② 自动清空射程）**；`ledgerAdd` 零变。
5. **接手 = 软语义**（executor 信息性非锁——D-MI6 精神）：任何实例经既有 `ledger`（update）改写归属（`executor` 字段或整段状态循环重走）；不设迁移门、不设机械锁。**禁**（父侧必答②裁定）：自动接手 / 自动清 executor / 每回合心跳写共享 SQLite（多进程写竞争 + 绕用户 gate）。

### 3.2 工具层参数守卫

**判据句**：工具层**统一入口 `ledger`**（五 action：写三 = add / update / close ∥ 读二 = query / count）的**运行时入参**在进入核函数**之前**，按**对应 action 声明**（逐字承自前身工具 `parameters`：`required` / `properties[*].type` / `properties[*].enum` / `oneOfRequired`——伪工具对象形）机械校验——非法 ⇒ **拒**（throw；零写、零库动作），文案 = 中文 · 点名字段 + 取值域；
**零 SQLite 原文外泄**（守卫 + 写门判于绑定 / 库动作之前 ⇒ 工具路径下绑定类 / 咬合类原文不可达——缺指针（`null`）/ 空串 `task_book` 经写门拒，其余非法形经 P1–P6 拒；咬合 CHECK = 库级最后防线）。

**统一入口**：适用面 = 统一入口五 action；判据本体（P1–P6 ∥ 字段判据表 ∥ 声明派生）**零改**；**文案前缀渲染规则**（动作级 `ledger(<action>)：` ∥ 入口级 `ledger：`）——本表按该渲染；**入参形态 = 已消费 `action` 的余键**（统一入口判序② 消费——`action` 不入 P2 域）。

**落点**：`thincoder-core/ledger-tools.mjs`（已落——工具定义 + 守卫 helper 的拆分落点）统一入口 `execute` 顶端（守卫 = 工具档单点 helper——`assertToolArgs(tool, args)` **返回**入参对象；消费形 = action 分派后逐 action 以伪工具对象调用 `assertToolArgs(<伪工具>, <余键>)`（已消费 `action`）——helper 机制沿用；「零改」面破例——增布尔分支）；
  判序 = **参数守卫 →（核内）迁移表判 → 写门 → UPDATE**（§3.1 / §6.1 各自判序零变，守卫先于其全部）。

- 理由：① 原始 args（含未知键）只在工具层存在——未知键闭合无法在核函数表达（`row` 已拆解）；② 拒因文案面向**模型**（修向指引），核函数既有文案面向直调面；③ 核函数（`ledgerAdd` / `ledgerUpdate` / `ledgerClose`）函数体零改（「零改」面破例——值计算落核内，与守卫面无关）。

**机制（声明派生——单源）**：守卫消费工具对象自身的 `parameters`——枚举 / 必填 / 类型**不在守卫内复写**（D2：声明即校验，声明改动自动随守卫走）。派生所需两处声明：`ledger(update)` 的声明条目 `status` 属性**补 `enum`**（六态——description 已言明「六态之一」）；**五 action 声明条目** `parameters` 补 `additionalProperties: false`（闭合声明——与「未知键拒」同源宣告；读命令二具同拍）。
**二选一组（`id` ∥ `batch`）**：两字段均**不列裸 `required`**（条件必填无裸必填表达面）——声明面新增组键 `oneOfRequired: [["id","batch"]]`（每子数组内恰携其一），守卫按该键派生组判据 **P7**。

**判序与判据**：① 入参缺省 / `null` ⇒ 视作 `{}`；非对象（数组 / 标量）⇒ 拒（P1）。② 未知键 ⇒ 拒（P2——列未知键 + 可用参数集；统一入口面域 = 余键——`action` 已消费）。③ 逐字段（**声明序**）：缺失 ⇒ 拒（P3）→ 类型（非枚举字段）/ 枚举（枚举字段，含错型值）⇒ 拒（P4 / P5）→ `title` 空串 / 全空白 ⇒ 拒（P6）。④ **组判据（声明派生 `oneOfRequired`）**：组内恰携其一 ⇒ 过；同携 / 双缺 ⇒ 拒（P7）。
**字段级 `null` 归属**：必填字段显式 `null` ⇒ 按「缺失」判（P3）；可空字段 `null` ⇒ 放行（`null` ≡ 略去——与 `patch.x ?? 行值` 既有语义同源）。守卫只判不改：零缺省填充、零类型转换、零文本改写（`title` 判空用 trim，落盘取原值）——返回值 = 入参对象（唯一归一 = 判序① 的缺省 / `null` ⇒ `{}`）。读命令二 action 无必填字段（P3 不触）；其拒面 = P1 / P2 / P4 / P5（过滤参数枚举外值——含数组 / 错型值 · `board` / `cwd` 非串 · 未知键 · 入参非对象）。

**文案模板（逐字；前缀 = 工具名`：`——统一入口渲染（动作级 `ledger(<action>)：` ∥ 入口级 `ledger：`）；`<预览>` = `JSON.stringify(值)`，超 80 字符截断加 `…`）**：

| # | 条件 | 文案 |
|---|---|---|
| P1 | 入参非对象 | `<工具>：参数须为对象（收到 <预览>）` |
| P2 | 未知键 | `<工具>：未知参数：<键1> / <键2>（可用参数 = <可用1> / <可用2> / …）` |
| P3 | 必填缺失 | `<工具>：<字段> 缺失（必填<；取值 ∈ {…}>）`——枚举字段带取值域，非枚举必填串带「；非空字符串」，非枚举数字字段仅「必填」 |
| P4 | 类型不符（非枚举字段） | `<工具>：<字段> 非法：<预览>（应为字符串）` / `（应为数字）` / `（应为布尔）` |
| P5 | 枚举不符（含错型值） | `<工具>：<字段> 非法：<预览>（取值 ∈ {…}）` |
| P6 | `title` 空串 / 全空白（两 action 同拒——add 必填面 / update 字段级） | `<工具>：<字段> 为空（必填；非空字符串）`；`ledger(update)` 形 = `<工具>：title 为空（非空字符串）`（字段可空、值不可空） |
| P7 | `id` ∥ `batch` 不恰携其一（同携 / 双缺） | `<工具>：id ∥ batch 须恰携其一（收到 <预览>）` |

**字段判据表**（域 = 各 action 声明面取值；`<v>` = 实际值预览；写三 action 的 `cwd` 均为「可空 · 串」⇒ `<工具>：cwd 非法：<v>（应为字符串）`；文案列 = 统一入口渲染形）：

| 工具 | 字段 | 判据 | 失败文案（逐字） |
|---|---|---|---|
| `ledger(add)` | `kind` | 必填 · ∈ {requirement, tech_todo} | `ledger(add)：kind 缺失（必填；取值 ∈ {requirement, tech_todo}）` · `ledger(add)：kind 非法：<v>（取值 ∈ {requirement, tech_todo}）` |
| `ledger(add)` | `title` | 必填 · 非空串 | `ledger(add)：title 缺失（必填；非空字符串）` · `ledger(add)：title 为空（必填；非空字符串）` · `ledger(add)：title 非法：<v>（应为字符串）` |
| `ledger(add)` | `board` / `req_doc` / `task_book` / `evidence` | 可空 · 串 | `ledger(add)：<字段> 非法：<v>（应为字符串）` |
| `ledger(add)` | `trigger` | 可空 · ∈ {归批, 条件, 认账不排期} | `ledger(add)：trigger 非法：<v>（取值 ∈ {归批, 条件, 认账不排期}）` |
| `ledger(update)` | `id` | **与 `batch` 恰携其一**（组判据 P7——同携 / 双缺 ⇒ 拒）· 数字 | `ledger(update)：id ∥ batch 须恰携其一（收到 <v>）` · `ledger(update)：id 非法：<v>（应为数字）` |
| `ledger(update)` | `status` | 可空 · ∈ 六态 | `ledger(update)：status 非法：<v>（取值 ∈ {待讨论, 待设计, 在途, 待核销, 已核销, 已废弃}）` |
| `ledger(update)` | `title` | 可空 · 串（**值非空串**——空串 / 全空白 ⇒ 拒） | `ledger(update)：title 非法：<v>（应为字符串）` · `ledger(update)：title 为空（非空字符串）` |
| `ledger(update)` | `board` / `req_doc` / `task_book` / `evidence` / `executor` | 可空 · 串 | `ledger(update)：<字段> 非法：<v>（应为字符串）` |
| `ledger(update)` | `evidenceReplace` | 可空 · 布尔（`true` 须与 `evidence` 同传——旗独传 / 新值空白 ⇒ 核面拒；缺省 / `false` = 追加） | `ledger(update)：evidenceReplace 非法：<v>（应为布尔）` |
| `ledger(update)` | `trigger` | 可空 · ∈ {归批, 条件, 认账不排期} | `ledger(update)：trigger 非法：<v>（取值 ∈ {归批, 条件, 认账不排期}）` |
| `ledger(close)` | `id` | **与 `batch` 恰携其一**（组判据 P7——同携 / 双缺 ⇒ 拒）· 数字 | `ledger(close)：id ∥ batch 须恰携其一（收到 <v>）` · `ledger(close)：id 非法：<v>（应为数字）` |
| `ledger(close)` | `status` | **单行形（携 `id`）必填** · ∈ {已核销, 已废弃}；**批量形（携 `batch`）可空 · 值恒 ∈ {已核销}**（勾销单值——§3.3 KD-BO3） | `ledger(close)：status 缺失（必填；取值 ∈ {已核销, 已废弃}）` · `ledger(close)：status 非法：<v>（取值 ∈ {已核销, 已废弃}）` |
| `ledger(close)` | `evidence` | 可空 · 串（**值可空**——追认核销面由 `evidence` 门判**结果值**：缺 / 全空白 ⇒ 拒，文案逐字不变；传入 = 追加缺省） | `ledger(close)：evidence 非法：<v>（应为字符串）` |
| `ledger(close)` | `evidenceReplace` | 同 `ledger(update)`（前缀换 `ledger(close)`） | `ledger(close)：evidenceReplace 非法：<v>（应为布尔）` |
| `ledger(query)` | `status` | 可空 · ∈ 六态 | `ledger(query)：status 非法：<v>（取值 ∈ {待讨论, 待设计, 在途, 待核销, 已核销, 已废弃}）` |
| `ledger(query)` | `kind` | 可空 · ∈ {requirement, tech_todo} | `ledger(query)：kind 非法：<v>（取值 ∈ {requirement, tech_todo}）` |
| `ledger(query)` | `board` / `cwd` / `task_book` | 可空 · 串 | `ledger(query)：<字段> 非法：<v>（应为字符串）` |
| `ledger(query)` | `trigger` | 可空 · ∈ {归批, 条件, 认账不排期} | `ledger(query)：trigger 非法：<v>（取值 ∈ {归批, 条件, 认账不排期}）` |
| `ledger(count)` | `cwd` / `task_book` | 可空 · 串 | `ledger(count)：<字段> 非法：<v>（应为字符串）` |
| `ledger(update)` | `batch` | 可空 · 串（**与 `id` 恰携其一**——同携 / 双缺的判据 / 文案 = `id` 行 P7 组判据） | `ledger(update)：batch 非法：<v>（应为字符串）` |
| `ledger(close)` | `batch` | 同上（前缀换 `ledger(close)`） | `ledger(close)：batch 非法：<v>（应为字符串）` |
| `ledger(add)` / `ledger(update)` | `resume_when` | 可空 · 串（**值非空串**——空串 / 全空白 ⇒ 拒） | `ledger(add)：resume_when 为空（非空字符串）`（update 形前缀换） |

**可空串空串口径**：可空串字段的空串保留既有语义（`patch.x ?? 行值` 下 `""` 为唯一「清值」形——`null` 等同略去）；**例外 = `title` / `task_book` / `evidence`**：`title` 空串 / 全空白两 action 同拒（P6 字段级——无标题即无意义）；`task_book` 空串 / 全空白由 §6.1 写门承接（在途 / 待核销 ⇒ 拒）；`evidence` 传入 = 追加缺省、空白 ⇒ 拒——清值形退役。

**受影响面（行数 = 现行）**：

- ① 实现：`thincoder-core/ledger-tools.mjs`（已落 · 187 行——五工具定义 + 守卫 helper 三件 + tool 层 `getSessionId` 动态 import）+ `thincoder-core/ledger-cmd.mjs`（核心函数档 ≈140 行）+ `thincoder-core/ledger.mjs`（re-export 面两源 ±2 行）。
- ② 用例 = 档 `thincoder-core/test/ledger-args-guard.test.mjs`（T37–T44）。
- ③ 文档 = 本档。
- ④ 零改面 = `thincoder-core/ledger-db.mjs`（DDL）· `thincoder-core/agent/family-tools.mjs`（装配）· 需求档（`docs/core/requirements/ENGINEERING-MODE-V2-SPEC-LEDGER.md`：补行**已落**——AC-M2-15；设计面零碰）。

**射程**：工具层统一入口 `ledger`（五 action：add / update / close / query / count）。

### 3.3 批级批量迁移与结算

**判据句**：一个批（批次档）动辄十几行台账行（本仓实测一批 14 行）——**批收口必须一次走完，不随行数相乘**。

**形态**：单行面（`ledger` update / close 携 `id`）**逐字零改**；两**工具 action**（`ledger(update)` / `ledger(close)`）**增可选 `batch` 参**（值形 = 批档指针，与 `task_book` 同形）——**核内函数面单源** = 新导出 `ledgerUpdateBatch` / `ledgerCloseBatch`（§7.1），工具层 `batch` 入参经分发调它们：

| 形 | 语义 |
|---|---|
| `update` + `batch` + `status` | 选出「批 → 行」集（判据见下），**逐行按既有迁移表重判**；表外行 / 门拒行 ⇒ 跳过 |
| `close` + `batch` | **只销已到 `待核销` 的行**（勾销）；`待讨论` / `待设计` / `在途` ⇒ 跳过。**批量形不携 `status`**（缺省 ⇒ 语义恒 勾销 = `已核销`；携则须 = `已核销`——§3.2 守卫 `status` 行按形条件化） |

**选行判据（单源 = `resolveBatchRows(db, base, batch)`）**：`batch` 值取文件部分（首个 `§` 前子串，trim——§6.1 口径 1 同源），经 `resolveDeclaredRef(base, part)` 解析出基准绝对路径；选**全部** `task_book` 文件部分解析为**同一绝对路径**的行（任意状态、含归档态）。

**`batch` 入参自身门（fail-closed——非结果行门）**：`batch` 值自身须**可解析**（含非空文件部分）∧ 解析后批档**在盘** ⇒ 否则拒（零写）；无匹配行（指针在盘但无行指它）⇒ **不拒**（`applied = []`）。**与 §6.2 归批门分属两面**——§6.2 判**结果行** `(status, trigger, task_book)`，本门判 **`batch` 入参自身**。

**符号面单源**：批量两函数 = 核内新导出 `ledgerUpdateBatch` / `ledgerCloseBatch`（§7.1）——工具层 `ledger(update)` / `ledger(close)` 的 `batch` 入参经分发调它们；`ledgerUpdate` / `ledgerClose` **签名不含 `batch`**（单行形逐字零改）。

**逐行语义单源**：单行形与批量形**共用同一落笔函数**（`ledgerUpdate` / `ledgerClose` 体内逐行段抽为内部函数 `applyRowUpdate` / `applyRowClose`）——批量只加「选行 + 汇总 + 跳过点名」，**迁移表判 / 写门 / evidence 门逐行照判**（批量不破任一既有门）。

**安全阀（不可省 · 禁静默销账）**：**每一枚被跳过的行在回执里逐行点名**（`{ id, from, why }`）——部分落地的批绝不平账。

**回执形**：`{ batch, status, applied: [id…], skipped: [{ id, from, why }] }`；事务包裹（一个 `BEGIN`/`COMMIT`——中途失败整批 ROLLBACK）。

**evidence**：批量形同携可选 `evidence`（`evidenceValue` 同源——逐行追加同一文本；判非空同单行面）。`close --batch` 走**勾销径**（勾销零证据要求）；**追认核销不入批量面**（追认须逐行结账依据，统一文本会造假账）——追认行落 `skipped` 点名，转单行面处理。

**成本（可核）**：N 行批的收口调用数 **改前 2N ⇒ 改后 2**（`update --batch --status 待核销` 1 次 + `close --batch` 1 次）；N=14 实测为据（14 行 = 28 次 ⇒ 2 次）。

### 3.4 条件字段 `resume_when`（`trigger=条件`）

**判据句**：`trigger=条件` 的行须能**一句话写清复启条件**（+ 可选锚）——条件不再埋在 `evidence` 散文里。

**形态**：items 增**可空列** `resume_when TEXT`（自由文本 = 一句话；可选锚随句内嵌）。**可空 ⇒ 存量零破**（老行新列取 NULL）。

**写面**：`ledger` add / update 增可选 `resume_when`（可空 · 串）；空串 / 全空白 ⇒ 拒（值非空口径同 `title`——§3.2 P6 字段级形）。**不强制** `trigger=条件` 行携它（可选——本字段不设闸门）。

**读面**：`query` 行集自然携带（`SELECT *` 纯增量——签名不破）；导出面入 `DATA_COLUMNS`（12 → 13 列）。

**对齐（最近先例）**：批档侧暂缓纪律「暂缓 · 复核条件见批档 §1 状态行」（`design/BATCH-RECORD.md` §5.1 L8）——`resume_when` = 同一条件的**账内结构化形**；两处条件文本**各自单源**（账内句不复制批档条件句）。

**schema 版本**：`LEDGER_SCHEMA_VERSION` 1 → 2（新列 = 结构变更 ⇒ 升号——`ledger-db.mjs` 常量注）；老库幂等迁移 `ALTER TABLE items ADD COLUMN resume_when TEXT`（与 `executor` 列同一迁移机制——列迁移抽共件，两列共用一份「复判列在否」逻辑）。

### 3.5 批级操作增量（P1 ∥ P2 指针面 ∥ P4 ∥ P5 ∥ P6）：先例 ∥ 勘察证据 ∥ 受影响面

**先例行（逐项——对齐 ∥ 偏离）**：

- **P1 批级批量（§3.3）**：先例 = 本档单行写命令的「迁移表判 → 写门 → evidence 门」逐行判序（§3.1）；**无同形先例**（「选行 + 汇总 + 跳过点名」在台账面无前例）——对齐 = 既有「逐行照判、门不破」；偏离 = 新增 `batch` 选行与回执汇总（理由 = 批收口调用数 2N ⇒ 2）。
- **P2(a) 归批指针门（§6.2）**：先例 = 本档 §6.1 写门（同 helper `assertTaskBookGate`、同「写入时点门」体例）——射程扩一枚（`trigger=归批`），零新机制。
- **P4 evidence 超限读数（§5）**：先例 = `query` 逐行计算字段 `aged`（本档 §5 老化报告——同形「逐行携、不入库、不入 `DATA_COLUMNS`」）。
- **P5 `resume_when`（§3.4）**：先例 = `executor` 可空列（本档 §2——`ALTER` 幂等列迁移，同一机制）——已见本节「对齐（最近先例）」行。
- **P6 `task_book` 过滤（§7.1）**：先例 = `ledgerQuery` 既有四枚等值过滤（`status` / `kind` / `board` / `trigger`）——本批增第 5 枚，同径（原值等值）。

**勘察证据行**：查过 = 本仓公共源档——`docs/core/design/DOC-DISCIPLINE.md` §4.2.2（声明源解析序）∥ `LEDGER-SELF-CONTAINED.md` §3 / §4.1（L4 声明源例外）∥ `MEMORY.md` §6.15（声明载体单源）∥ `MANIFEST.md` §2.2（`docRoot.batches`）——**相关**（本批 §6.1 口径 4/5 的声明源解析面）。
声明源 = `PROJECT-MANIFEST.json` `index.publicRepos` = **`[]`**（实读 `:189`）⇒ **无仓外声明源可查**（照记）；参考系 = 已移出工作区（`D:\ref\`，树外、不入索引）。**结论 = 无仓外声明源相关**。

**受影响面（行数 = 现行 · 落笔当刻实读）**：

- **实现**（7 档）：
  - `thincoder-core/ledger-cmd.mjs`（179 行——批量选行 / 两 batch 函数 / 门扩枚 / evidence 读数）
  - `thincoder-core/ledger-db.mjs`（175 行——`resume_when` 列 + `LEDGER_SCHEMA_VERSION` + `EVIDENCE_SOFT_LIMIT`）
  - `thincoder-core/ledger-tools.mjs`（260 行——`batch` / `task_book` / `resume_when` 声明 + 二选一判据 + count 回报）
  - `thincoder-core/ledger.mjs`（187 行——新导出 re-export）
  - `thincoder-core/ledger-migrate.mjs`（301 行——`DATA_COLUMNS` 13 列 + 容忍集）
  - `thincoder-core/ledger-read.mjs`（95 行——直引 `DATA_COLUMNS`，随列零改）
  - `thincoder-core/declaration.mjs`（379 行——`resolveDeclaredRef` 新导出）
- **用例**：档 `thincoder-core/test/ledger-batch-ops.test.mjs`（**新建** ~150–200 行——T92–T101）。
- **文档 / 描述面（模型可见文案——换写）**：本档 §3.3 / §3.4 / §5 / §6.2 / §7.1 / §8 · `thincoder-core/tool-docs/ledger.md`（6 行——`batch` / `task_book` / `resume_when` / `evidenceOversize` / count 对象形换写）。
- **零改面**：`docs/core/design/LEDGER-SELF-CONTAINED.md` · 团队台账档（`docs/server/design/ledger/LEDGER.md` ∥ `team-ledger.mjs`）。

**贴线判（500 顾问线 / 800 硬线——`AGENTS.md`）**：有增量档全列**最高 `thincoder-core/declaration.mjs` 379 行**（余者 ≤301）⇒ **零拆分义务**。

## 4. 两池分组与计数

- **两池 = kind 枚举**：`requirement`（需求池）/ `tech_todo`（技术待办）——SQLite 行天然分组。
- **计数单源 = `ledgerCount`**（回报 `{ count, evidenceOversize }`——计数面读 `.count`，§7.1）：`SELECT COUNT(*) WHERE status IN ('待讨论','待设计','在途','待核销')`——未决四态 = 「活条目」口径（`--summary` 收口行同口径）。计数面 = AC-M2-3（grep `scanGroups`/`summarizeLedger` 零命中）。
- **条目正文一行一条**（语义保留）：SQLite `title` 单行承载，多行细节进需求档 / 批次档（不展开任务细节铁律不变）。

## 5. 归档 / 触发 / 老化

| 面 | 契约（v2） |
|---|---|
| **归档** | **软删除**——`ledgerClose` 只 UPDATE `status`（已核销/已废弃）+ `closed_at`（撤回路径另置 `executor = NULL`——§3.1 ④），**不 DELETE 行**（物理行保留作外部记忆）；「已核销/已废弃」= 状态值（`docs/TODO-archive.md` 为历史档不再追加） |
| **触发字段** | `trigger` 三枚举 CHECK：`归批` / `条件` / `认账不排期`（合法选项，区别于遗忘）；`NULL` → 审计面「待处置」（不判红）；取值非三枚举 → INSERT 即拒（CHECK） |
| **老化报告（审计模式）** | 行龄源 = SQLite 时间戳（`created_at`/`updated_at` 距今 > `AGING_DAYS`=30 天；SQLite 路径无 md 行、时间戳可靠）。**查询面逐行标记 `aged`**（未决四态 ∧ >30 天） |
| **归属与落笔** | 写命令仅**主 agent** 装配（`family-tools.mjs` depthOnly 分支——子代理装配面不挂写命令，fail-closed）；台账档不入任何子代理 `files` |
| **触发字段·归批**（§6.2） | `trigger=归批` ⇒ `task_book` 必填且指向在盘批档（写入时点门）；批名不再只活在 `evidence` 散文里 |
| **条件字段 `resume_when`**（§3.4） | 可空列——`trigger=条件` 行的复启条件（一句话 + 可选锚）；不设闸门 |
| **evidence 超限读数**（P4） | **软上限** `EVIDENCE_SOFT_LIMIT` = 300 字（`ledger-db.mjs` 常量单源——与 `AGING_DAYS` 同居）；**读数非闸门**：`query` 逐行携 `evidenceOversize`、`count` 回报 `evidenceOversize`（超限行数）——写入不拒 |

**暂缓批的行状态**：批档**暂缓**（口径 = `docs/core/design/BATCH-RECORD.md` §5.1 L8——批档侧机读位在 §1 状态行）**不改本库行状态**——挂靠行保持 `在途`（六态零扩 · 迁移表零改 · 写门零触）；暂缓动作的纪律面 = 行 `evidence` 补一行指针「暂缓 · 复核条件见批档 §1 状态行」（条件文本单源 = 批档 §1——本库不复制条件句）；复启 ∕ 核销照既有通道。

## 6. 机检（v2 收编）

- **check-ledger 作废**——台账一致性由 **SQLite CHECK（枚举+咬合）+ `ledgerCount`（计数单源）** 承担；旧脚本 `scripts/check-ledger*.mjs` 归 **M8 机检引擎**删除（架构 §2.2 M8「check-ledger 作废」，无悬空窗口）。
- **L4（本仓可解析）与形态合规 V4** = `design/LEDGER-SELF-CONTAINED.md`（跨仓登记面——正交保留）。

### 6.1 写门·指针存在性（`task_book` → 批次档）

**判据句**（架构 E1「咬合判据（两账）」后半幅 · `design/ENGINEERING-MODE-V2.md` §2.3）：`task_book` 指向的**批次档必须存在**。

**形态 = 写入时门（非扫描面）**：`thincoder-core/ledger-cmd.mjs` 两条写命令（`ledgerAdd` / `ledgerUpdate`）落盘前判**结果行**——`status ∈ {在途, 待核销}` ⇒ 判 `task_book`：`null`（缺指针）⇒ 拒（「必填」文案）；非 `null` ⇒ 解析其文件部分，**缺文件部分（`§2` / 空串 / 全空白）/ 非文件 ⇒ throw**（行不变；判位与迁移表拒同层）。

**落点裁定**：门所在模块 = `thincoder-core/ledger-cmd.mjs`——**`ledgerAdd` / `ledgerUpdate` 两函数体内**，与迁移表判**同函数同层**（判序 = 迁移表判 → 本门 → `UPDATE`）。
覆盖的写入口 = 工具 `ledger`（add / update 两 action——统一入口）；消费侧一律**动态 import 单源档 `thincoder-core/ledger.mjs`**（KD-M2-3——§7.1 的三写命令导出面 = 该档对 `ledger-cmd.mjs` 的 re-export，无第二实现）⇒ 门**不可绕过**。
（`ledgerAdd` 的结果行恒为 `待讨论`——INSERT 硬编码 ⇒ **`status` 半幅（本节）**在该入口当下恒不触发；**`trigger=归批` 半幅（§6.2）照判**——add 携 `trigger=归批` 即入门；两入口形态统一，为将来「add 带状态」留位。）

**口径（三条）**：

1. **文件部分 = 首个 `§` 之前的子串**（trim 后）。`§` 之后 = 节号 / 注记，**不参与存在性判定**（现盘 13 个取值含三形态——无后缀 · `…md§2` · `…md§1.5（括注）`——全按此口径通过）。
2. **解析基准 = `resolveProjectRoot(cwd) ?? resolve(cwd ?? ".")`**（**= 库键式的同一子表达式**——键式另加 `normalizeCwd` 一步，见 §2.1 键式单源；解析基准本身不归一）：`resolve(base, 文件部分)`；绝对路径按 Node `path.resolve` 语义原样取用。
    **补注**：工作区锚（`workspace`）⇒ 上游 `openLedger` 先报明（本门该态不可达——2026-10-15 收正）；其余态两式同值——「同源」关系不变。
3. **缺指针 / 缺文件部分**：`task_book == null`（缺指针）⇒ 拒（「必填」文案）；`§2` / 空串 / 全空白（缺文件部分）⇒ 不可解析 ⇒ **拒**（fail-closed，同状态行解析先例）。
4. **声明源候选**：文件部分**首段 = 项目声明的公共仓目录名**（`index.publicRepos`）⇒ 于该声明根解析余段（值形 ∥ 解析单一定义 = `declaredPublicRoots`）——可核 ⇒ 通过；**未声明**的仓外形态照旧拒（fail-closed 零松）；声明根缺位 ⇒ 照旧拒（存在性要求——严）。判据 / 机制 = `DOC-DISCIPLINE.md` §4.2.2 ⑥ ∥ `LEDGER-SELF-CONTAINED.md` §3 L4③（声明源前缀形 = 记录面有界例外的机械面）。
5. **迁移旗同源**：`ledger migrate` 的**写门风险旗**（`thincoder-core/ledger-migrate.mjs` `writeGateFlag`）与本节判据**同源**——共享解析单点 = `resolveDeclaredRef(base, 文件部分)`（`thincoder-core/declaration.mjs` 新导出：① 仓根解析 → ② 声明源前缀解析序）；
   **消费关系**：声明源段 **≤ 消费既有解析单一定义 `declaredPublicRoots`（口径 4）**——**不二写**（同源句 = `MEMORY.md` §6.15「三消费面共用（解析层），不得二写」）；**解析序**（同名多仓取声明序首者）单源 = `DOC-DISCIPLINE.md` §4.2.2（`MANIFEST.md` §2.2 同指）。
   同一 `task_book` 在写门与迁移旗**同判**——声明源前缀形（可核）⇒ 写门放行 ∧ 迁移旗零旗；未声明 ∥ 声明根缺位 ∥ 目标档缺 ⇒ 两处同拒 / 同旗。**既有拒绝面零改**（判据本体 = 口径 1–4 逐字）；实现 = 实施轮（待写域收口后派发）。

**射程** = **结果行状态**属 `{在途, 待核销}` 的写入；`待讨论 / 待设计` 行带任意 `task_book` 不判（判据句只管在途 / 待核销——逐字）。

**失败文案**（逐字；前缀 = **调用函数名**——工具 `ledger`（update）→ 函数 `ledgerUpdate`、`ledger`（add）→ `ledgerAdd`；与同函数既有两条文案（`ledgerUpdate：行 <id> 不存在` / `…不在允许迁移表`）同前缀）：
`ledgerUpdate：task_book 指向的档不存在：<原值>（解析 = <绝对路径>）` · `ledgerUpdate：task_book 不可解析（缺文件部分）：<原值>` · `ledgerUpdate：task_book 必填（在途 / 待核销 须携任务书指针）`（缺指针形——`null` 无原值）。

**边界**：① 不做**事后审计**（条目写入后档改名 / 归档不在射程——本判据是写入时点门）；② 不做**仓界判**（指针是否落在仓内 = L4 判据 · `design/LEDGER-SELF-CONTAINED.md`——本条目不并）；③ 不改 DDL（存在性无 SQLite 表达面——CHECK 读不到 fs）。

**射程连带效果与出路**：门按**结果行**判 ⇒ 带不存在 / 不可解析指针的 `在途 / 待核销` 行，其上**任何**更新（含与指针无关的字段）都被同一门拒——**出路 = 先修 `task_book` 或把行迁出射程**（已核销 / 已废弃）。实现轮**不得**为此加「按字段放行」的特例豁免（放行 = 门破）。

### 6.2 归批指针门（`trigger=归批` 咬合 `task_book`）

**判据句**：`trigger=归批` 的行**必须携指向在盘批档的 `task_book`**——「批 → 行」反查（§3.3）与「行 → 批」回指（批档头台账行）双向可解。

**形态 = 写入时门（同 §6.1 体例）**：`assertTaskBookGate` **射程扩一枚**——判**结果行**的 `(status, trigger, task_book)` 组合：

1. `status ∈ {在途, 待核销}` ⇒ `task_book` 必填 ∧ 在盘（**既有，零改**）；
2. `trigger = 归批` ⇒ **同判**（必填 ∧ 在盘）——两条件**或**成立即入门。

**落点**：`thincoder-core/ledger-cmd.mjs` `assertTaskBookGate`（`ledgerAdd` / `ledgerUpdate` 同门——含批量形 `applyRowUpdate`）；解析单点 = `resolveDeclaredRef`（§6.1 口径 4/5 同源，零二写）。

**失败文案**（逐字；前缀 = 调用函数名）：`<函数>：trigger=归批 须携任务书指针（批档）`（缺指针形）；「指向的档不存在」/「不可解析（缺文件部分）」两句复用 §6.1 逐字文案。

**射程连带效果与出路**（同 §6.1 体例）：带 `trigger=归批` 而无在盘 `task_book` 的行，其**任何**更新都被本门拒——**出路 = 先补 `task_book` 或改 `trigger`**。门 = **写入时点门**（不扫存量、不改存量行——存量 `归批` 行仅在下次被写时受判）。

**收口报警（批档侧 · 非闸门）**：批档收口（`batch` close）回执末尾附**本批未落行**列表——`task_book` 指向本档 ∧ `status ∉ {已核销, 已废弃}` 的行逐行点名。零写、不阻断冻结（报警是读数，不是门——落点 = `thincoder-core/agent-tools/batch-lifecycle.mjs` close 径；台账只读开库）。

## 7. 可见面：接口契约（v2 数据源）

### 7.1 单源模块与导出面

- **CLI**：`thincoder-core/ledger.mjs`（SQLite + 纯逻辑，无 TUI 依赖）+ 显示面胶水档。
- **对端**：对端显示面**独立实现、语义同源**（照两轴纪律）+ 各自胶水档。

**导出契约（v2——SQLite 化）**：

| 导出 | 语义 |
|---|---|
| `ledgerDbPath(cwd)` | 项目根 → 键控库路径（sha1(规范化绝对路径) 前 16 位；键式单源 = §2.1） |
| `ledgerKey(root)` | 项目根 → 库键（`sha1(normalizeCwd(root))[:16]`——键式单源，§2.1） |
| `ledgerDirPath()` | 台账库目录（`_setLedgerDirForTest` 覆盖的同一变量——迁移 / 审计面默认根） |
| `runLedgerMigrate(args, …)` / `runLedgerAudit(args, …)` | 存量迁移 / 目录审计命令面（§2.2；CLI 子命令入口） |
| `ledgerVariantNotice({ cwd, dir, locale, exists })`（**新增**） | 变体键库首跑检测提示（命中 ⇒ 单行文案；无 ⇒ `null`；**进程内一次为限**）；导出档 = `thincoder-core/ledger-variant-notice.mjs`（在盘） |
| `openLedger(cwd)` | → `DatabaseSync` 句柄 + `ensureSchema`（幂等建表） |
| `ledgerQuery({ cwd, status, kind, board, trigger, task_book, now })` | SELECT 行集（只读，全角色）——**五枚等值过滤**（`status` / `kind` / `board` / `trigger` / `task_book`——**`task_book` 为原值等值**（列串直比）；与 §3.3 选行的「文件部分解析同址」**两径口径不同、各自单源**）· 行集逐行携计算字段 `aged` ∥ `evidenceOversize` · `now` 注入缝（确定性用例） |
| `ledgerCount({ cwd, task_book })` | 回报 **`{ count, evidenceOversize }`**（本批改形——原裸数）：`count` = `COUNT(*)` WHERE 未决四态（单源计数）；`evidenceOversize` = 未决四态中超限行数（§5）；`task_book` 等值过滤（本批增——count 唯一过滤参）。**消费面** = 收口行 ∥ 显示面读 `.count`（零重算） |
| `ledgerEvidenceOversize({ cwd, task_book })`（**新增**） | `evidence` 超限行数（未决四态 ∧ `String(evidence).length > EVIDENCE_SOFT_LIMIT`）——count 回报读数单源（§5） |
| `ledgerAdd({ cwd, row })` | INSERT（写命令，主 agent）；`row.resume_when` 可空 |
| `ledgerUpdate({ cwd, id, patch })` | UPDATE（写命令，主 agent——迁移表校验）；`patch.evidence` 传值 = 追加缺省、`patch.evidenceReplace` = 布尔覆盖旗。**单行形**（`id`）——批级批量迁移 = `ledgerUpdateBatch`（本表下行） |
| `ledgerClose({ cwd, id, status, evidence, evidenceReplace })` | UPDATE status + `closed_at`，事务包裹（写命令，主 agent）——核销两源 = 待核销（勾销）· 待讨论 / 待设计（追认核销 · `evidence` 必填 · 缺则拒）；在途不可跳；（一跳核销——追认门判结果值）；`evidence` 传值 = 追加缺省、增 `evidenceReplace` 旗。**单行形**（`id`）——批级批量结算 = `ledgerCloseBatch`（本表下行） |
| `ledgerUpdateBatch({ cwd, batch, patch, executorSessionId })` / `ledgerCloseBatch({ cwd, batch, evidence, evidenceReplace })`（**新增**） | 批级批量两单源（§3.3）——`resolveBatchRows` 选行 + `applyRowUpdate` / `applyRowClose` 逐行落笔（与单行形共函数）+ 跳过点名；回 `{ batch, status, applied, skipped }`（工具层 `batch` 入参分发至此） |
| `findProject(anchor)` | 向上（含自身）最近的**已注册台账**目录（用户目录键控库存在）→ `{root, ledger}` / `null` |
| `ledgerChildren(dir)`（**新增**） | 目录下**已注册台账**的直接子目录（目录名升序；惰性枚举 + `MAX_SIBLING_SCAN` 上限——不可读 ∥ 超限 ⇒ 空集）——消费面 = 族发现 ∥ 轻通道闸候选枚举（同级判据单源） |
| `discoverFamily(anchor)` | `{current, projects}`——current = `findProject`（**工作区命中 ⇒ `null`**——按容器形落子目录族；§7.2 工作区根子例）；projects = current + 其同级含台账目录；current 缺 ⇒ **锚本地**枚举（锚自身含台账库的直接子目录——不沿祖先链上找） |
| `formatMarker(scan)` | §7.3 逐字（**签名与键语义不变**——L1 标记零扩，§7.3.1；**范围限定**：单 scan 逐字模板——范围求和不在本函数，经 `scopeMarkerOf` 委托出文（§7.2）） |
| `scopeMarkerOf(scans, family)`（**新增**） | 标记范围归约（§7.2「标记范围」——L1 取值单源）：`{ marker, warn }` ∕ 空范围 `{ marker: null, warn: false }` |
| `formatDetailLine(scan)` | §7.3 逐字 + **判活尾段**（§7.3.1 三态文案；签名不变——`scan` 携新键） |
| `resolveExecutorStates(scans)`（**新增**） | 在途 executor 判活批量解析（§7.3.1）——`executors` / `deadExecutors` 键组装单源 |

### 7.2 口径契约

- **计数 / 老化 / 阈值 / 可动作**：见 `requirements/ENGINEERING-MODE-V2.md` §9（D2 本节不重述）。
- **明细行集** = `{current} ∪ {可动作项目}`（发现序：current 在前，其余按目录名升序）；同项去重。
- **标记范围（L1）**：`current` 在场 ⇒ 仅当前项目（命中但不可读 ⇒ 空范围——不掺兄弟）；否则 ⇒ 族内**已读**项目（不可读跳过——既有语义）；空范围 ⇒ `marker` = `null`（不落 `0·0`）；范围非空 ⇒ 两池**分列求和**（F1——不合并为一数）。三端消费：核拍面写 `state.ledger` · VSC item 直调 `scopeMarkerOf`（端零自算；在场判据 = `marker` 非空）· 桌面 `ev:ledger` `marker` 转发（端零重算）。
   - **范围推导**：`current` 在场 ⇒ 范围 = `scans` 中 `root` = `family.current.root` 的 scan（**容器根自身带台账** ⇒ `findProject` 含自身命中 ⇒ 归属 = 具体项目锚——只显其自身数，不合计其下项目）；`current` 缺席（容器根锚）⇒ 族 = `discoverFamily` 枚举面 `projects`（**锚本地**：取锚自身含台账库的直接子目录——不沿祖先链上找）。
   - **工作区根子例**：命中锚若 `projectRootView` `workspace`（如锚位存量键控库先于写门）⇒ **不充当台账项目**（键控库存在 ≠ 可作项目）——按容器根形落子目录族（**锚本地**——消静默缺席）；T51 面（**可解析**项目命中但不可读 ⇒ `null`）不受触。
   - **两参对账**：`family` 判归属 ∥ `scans` 载体——范围 = 归属 ∩ 已读（「已读」= 在 `scans` 中：构建期不可读项目已跳过）；`current` 缺席 ⇒ 范围 = `scans` 全体。
   - **文本产出**：`marker` 文本 = 委托 `formatMarker` 逐字模板（求和值入参；`formatMarker` 仍居调用链——§7.1）。
- **标记范围受影响面**：源/测试全清单（现行行数 × 增量——含单元测试档）已登记；贴线判 = 有增量档全列 ≤500 顾问线（最高 241——`ledger.mjs`）⇒ 零拆分义务。
- **行龄**：SQLite 时间戳距今（非 git / 无时间戳 → 标「年龄未知」照列、不判老化）。
- **性能**：SQLite `COUNT` / 索引查询。

### 7.3 行文本逐字契约（三面同文——CLI / 对端 / 收口行同一 formatter）

| # | 形态 | 逐字模板 | 色 / 态 |
|---|---|---|---|
| L1 状态标记 | 单行 | `台账 <pool>·<tech>`（例 `台账 4·32`）——*pool* ∕ *tech* = **范围求和**（§7.2） | 范围内 `aged>0 ∨ deadExecutors>0` → 警示色；否则默认 |
| L2 明细行 | 每项目一行 | `台账 <名>：需求池 <pool> · 技术待办 <tech>（老化 <aged>）` +（阈值时）` — 可开批` +（判活尾段——§7.3.1） | 该项目 `actionable` → 警示色；否则 dim |

- `<名>` = 项目根目录 basename；数字 = 十进制整数；`<aged>` **恒显**（含 0——自证已检查）。
- **收口行输出** = L2 行序列（行集 = 族行）；族空时输出 `台账：未发现台账。`（**仅命令面**——运行时面静默）。
- **状态行位置**：状态段簇**尾**（键位组前）——与既有状态段同簇、同右截优先级。

### 7.3.1 判活展示（executor 三态——F-LX1）

**判据单源**：`thincoder-core/process-probe.mjs` `ownerState(pid, { aliveSet, cmds })` **三态**（`alive` / `dead` / `unknown`）——调用面不得复刻判据；D-MI10 不对称沿用：`unknown` ⇒ **不显示死亡**。

**executor → pid 解析** = sessionId 首段整数（`peer-instances.mjs` `groupSlotSessions` 同款解析——`Number.parseInt(sessionId.split("-")[0], 10)`）；pid 不可解析 ⇒ `unknown`。

**批量与缓存口径（父侧必答①——性能红线）**：

1. **一次批量**：核内新增 `resolveExecutorStates(scans)`（`ledger.mjs` 导出——组装单源）：
   - 收集各 scan 的 `inflightExecutors`（在途且 executor 非空集）→ pid 去重 → **一次 `probeOwnersAsync` 束**（≤1 批量判活 + ≤1 批量 cmdline——D-MI3 / N-MI3：**禁止逐行 exec**）。
   - 逐 executor `ownerState` → 每 scan 挂 `executors: [{executor, pid, end, state, staleDays}]` + `deadExecutors: n`；`end` = cmdline 可得时的 `classifyEnd` 值。
   - `staleDays` = 该 executor 所在行 `updated_at ?? created_at` 距今天数（向下取整；时间戳缺 → null——「N 天未动」标注源，零新状态）。
2. **TTL 缓存**：解析结果按 pid 缓存（模块级 Map——**5s TTL，与 `peer-instances.mjs` `PEER_PROBE_TTL_MS` 同源口径**；peer 惰性缓存先例）；TTL 内重复解析零 exec。**无在途 executor ⇒ 零 exec 快返**（不探、不缓存）。
3. **零写径探测**：判活只落显示面——`ledgerUpdate` / `ledgerClose` 写路径零探测（父侧必答①）。
4. **异步形态**：`runLedgerScan` 变 **async**（await 判活解析）——读面不得同步 exec 占住事件循环（D-MI14）；端胶水调用点补 await（**CLI 单端**——VSC 径改直落 `scanFamily`，零核 surface 调用点）。

**三态文案（L2 尾段——`formatDetailLine` 追加，三面同文单源）**：

| 态 | 尾段 |
|---|---|
| `deadExecutors > 0` | `（属主已死 <n>，可接手）`——**dead 优先**（行动项压信息项） |
| 死 0 · inflight > 0 · 最长 staleDays ≥ 1 | `（执行中 <n> · 最长 <d> 天未动）`——陈旧在途标注（父侧必答②；行龄源 = 既有 `updated_at`，零新状态） |
| 死 0 · inflight > 0 · staleDays < 1 | `（执行中 <n>）` |
| inflight = 0 | 无段——**既有逐字断言零破** |

逐条目「属主 X · N 天未动」明细 = `executors[]` 元素（端 tooltip / 后续展示面按需渲染）；查询行 = `ledger`（query）行集自然携带 `executor` + `updated_at` 原始字段（SELECT * 纯增量——签名不破）。**工具行不做判活**（K-LX4：判活时点性强——工具行保数据保真，判活展示归格式化径）。

**L1 标记文本零扩**：`台账 <pool>·<tech>` 文本不变（§7.3 逐字契约锁定——范围口径 = §7.2）；执行中 / 死亡信息落 L2 尾段。**状态位**：`state.ledger.warn` = **范围内**任一项 `aged>0 ∨ deadExecutors>0`（死亡 = 行动级警示——端警示色同源取本值，端零重算；取值单源 = `scopeMarkerOf`，§7.1）。

**core scan 形状新增键**：`inflightExecutors`（`buildScan` 挂——**sync 零变**，K-LX2：三端既有 sync 直调面零破，判活独立 async 单源）/ `executors` · `deadExecutors`（`resolveExecutorStates` 挂载）——端胶水零成本透传。

**端接线**（双端零新探测——判活解析全在核）：

- CLI 胶水（`thincoder-cli/src/tui/ledger-surface.mjs`）**机制归核**——自实现 `runLedgerScan` 删除，动态 import 扩载 `@thincoder/core/ledger-surface.mjs`（CORE-UNIFICATION 机制单源方向；端壳静态链仍不达 node:sqlite——W8 契约②机检守）。
- VSC 端（`thincoder-vscode/src/extension/ledger-surface.mjs`）`scanFamily`（tooltip 径）同挂判活——tooltip 明细行与核 L2 同文。

### 7.4 挂载 / 7.5 对端挂载 / 7.6 收口行 / 7.7 关键决策 / 7.8 不变量

- CLI 挂载（状态槽 / 首扫不抢首帧 / 周期 `unref()`（**兜底**）/ **库变更去抖即扫（写后即时——用户裁定「写了以后就要立即更新」）** / 回合处理期间跳过**仅限定时轮**（变更轮不受挡）/ 空标记零注入 / headless 零改动）· 对端挂载（状态栏 item 无 command / tooltip）· 收口行（`--summary` 命令面 + 核销同步清单「台账可见面（收口行）」槽位）——逐字契约与决策记录（K1–K7 / U1–U6）不在此重述。
- **不变量**：① 无台账 → 零输出零标记 ② 台账档只读（唯一写面 = 主 agent 写命令）③ 数字单源 ④ 不新增工具/命令/快捷键面；headless 零新增输出。

## 8. 验收标准（v2——回指 M2 规格 AC）

| # | 验收标准（可机判） | 回指 |
|---|---|---|
| AC-M2-1 | 表含六态 status CHECK + kind CHECK + trigger CHECK（读 `sqlite_master` / INSERT 非法值拒） | ②.1 |
| AC-M2-2 | 非法 `status` 写入 → 拒（CHECK）；`status=NULL` → 拒（NOT NULL 兜底） | ②.2 |
| AC-M2-3 | 计数 = `COUNT` 单源（grep `scanGroups`/`summarizeLedger` 零命中；`ledgerCount` = 未决四态） | ②.6 |
| AC-M2-4 | 写命令非主 agent 装配 → 拒（depth>0 装配面不挂写命令） | ②.4 |
| AC-M2-5 | `在途/待核销` 缺 `task_book` → 拒（咬合 CHECK = 库级防线；工具路径下写门先拒） | ②.2 |
| AC-M2-6 | `node:sqlite` Node 24 可用（无需 `--experimental-sqlite`——实测通过） | ②.1 |
| AC-M2-7 | 进入「在途」的迁移带 `executor` = 会话 `sessionId`（函数注入，patch 显式值优先——§3.1）；点火边（`待讨论 → 待设计`）同式自动写；离开「在途」的迁移 `executor` = NULL（`ledgerUpdate` 两出边 + `ledgerClose` 撤回路径） | ②.8（F-LX1）∥ 点火边 |
| AC-M2-8 | `executor` 非空且属主进程已死 → 可见面显示「属主已死，可接手」；探测失败（unknown）→ 不显示死亡（保守——活 / 死 / unknown 三态对照，§7.3.1） | ②.8（F-LX1） |
| AC-M2-9 | 迁移表外状态迁移 → 拒（`ledgerUpdate` 待讨论→已核销拒；`ledgerClose` 目标/源态校验） | ②.2 |
| AC-M2-10 | `在途 / 待核销` 行缺 `task_book`（`null`）或文件部分**不可解析 / 不存在** → 拒（throw，行不变）；存在 ⇒ 通过（含 `§N` / `§N（括注）` 形态；**声明源前缀形**同判——可核 ⇒ 通过） | §6.1（架构 E1 后半幅） |
| AC-M2-11 | 库键归一：同项目盘符两拼写（`D:\x` / `d:\x`）⇒ `ledgerDbPath` 同库路径；盘符本大写输入键不变（CLI 现状键回归）；键式单源（`ledgerKey` 一处生成——**射程 = 台账键生成面**，该面 grep 无第二份 `sha1` 键式；他面哈希合法、不属本判据） | §2.1 |
| AC-M2-12 | 存量迁移三件套：`--dry-run` 零写报告（源 / 目标 / 行数 / 备份路径）；`--confirm` 先备份（拷贝 + 读回同计数）后单事务迁入（**13 数据列逐条保全**（等值比对列集不含 id——重发）· 事务内读回核验）；重跑幂等（0 新增 / 无待迁源）；源回收进 `ledger-trash`（不删） | §2.2 |
| AC-M2-13 | 审计面只读：逐库定性（目标 / 变体源 / 空库 / 不可归因（有行）/ 不可归因（读取失败）/ 不可读（坏档））+ 候选根集合归因；全目录文件集合 / 大小 / mtime 三不变 | §2.2 |
| AC-M2-14 | 收口两源：待讨论 / 待设计 → 已核销 **直通**（`evidence` 非空）；缺 `evidence` ⇒ 拒（行不变）；在途 → 已核销 ⇒ 拒（不可跳 待核销）；已核销 / 已废弃 现态 ⇒ 拒；撤回路径零改 | ②.2（用例 T33–T36） |
| AC-M2-15 | 工具层参数守卫：写命令三 action（add / update / close——统一入口 `ledger`）非法入参（非对象 / 未知键 / 缺必填（含显式 `null`）/ 错型 / 非枚举 / `title` 空串 / 全空白）⇒ 拒（throw，零写、零库动作）+ 文案逐字（§3.2 P1–P6）；合法形（含复杂文本 / 可空 `null` 字段 / `cwd` 缺省）零回归 | §3.2（需求档补行已落——AC-M2-15） |
| AC-M2-16 | 读命令守卫 + `executor` 空值口径：读命令二 action（query / count——统一入口 `ledger`）非法过滤参数（非对象 / 未知键 / 枚举外值（含数组 / 错型值）/ 错型）⇒ 拒（throw，零库动作）+ 文案逐字（§3.2 P1–P6）；合法形（缺省 / 可空 `null` / 过滤命中）零回归；`ledger(update)` 显式 `executor: null` 与略去同判（进「在途」自动写会话 sessionId——§3.1 优先级链） | §3.1 / §3.2（需求侧补行**已落**——AC-M2-15 射程注 + AC-M2-16） |
| AC-M2-17 | **根解析面工作区报明**（2026-10-15 收正）：锚 = 工作区（下辖 ≥2 项目——`projectRootView` `workspace` 态）⇒ `openLedger` **报明事实 + 点名项目根**（下辖项目全列按名排序 + `cwd=<项目根>` 的下一步）；**零写**（库档不建 / 不落行）；**禁字样** = `ambiguous`（`node` 行扫）；`ok` / `none` 两态零回归（none ⇒ `resolve(cwd ?? ".")` 兜底照旧）。断言 = 按事实行锚（不逐字形） | §2.1（根解析面） |
| AC-M2-18 | **标记 = 当前打开范围合计**（需求 §13.3 第 1 条）：容器根锚（族 ≥1 已读项目）⇒ 标记 = 族内已读项目两池分列求和（`台账 <Σpool>·<Σtech>`）；具体项目锚 ⇒ 仅该项目自己（兄弟零掺——负向锁）；命中但不可读 ∥ 空范围 ⇒ `marker = null`（命中 = **可解析项目**）；`warn` 同范围聚合（范围内 `aged>0 ∨ deadExecutors>0`） | FR24（需求 §13.3 第 1 条「状态行极简标记」） |
| AC-M2-19 | **工作区锚不充当项目**（AC-M2-18 范围面子例）：命中锚 `projectRootView` `workspace`（如锚位存量键控库先于写门）⇒ 按容器根形落子目录族求和——键控库存在 ≠ 可作项目（消静默缺席）；T51 面（**可解析**项目命中但不可读 ⇒ `null`）不受触 | FR24（需求 §13.3 第 1 条「状态行极简标记」· 工作区根子例）——用例 = 登记态（K12 红绿对为载体；号码待定——T56 已占；下次触碰该面时补） |
| AC-M2-26 | **批级批量迁移**（§3.3）：`ledger(update)` 携 `batch`（批档指针）+ `status` ⇒ 选出「批 → 行」集（`task_book` 文件部分经 `resolveDeclaredRef` 解析同址——任意状态），逐行按迁移表重判；表外行 / 门拒行 ⇒ 跳过并逐行点名（`{id, from, why}`）；一个事务包裹；`applied` 计数对；`id` / `batch` 同携 ∥ 双缺 ⇒ 拒（组判据 P7）；`batch` 入参自身可解析 ∧ 批档在盘 ⇒ 否则拒（fail-closed） | §3.3 |
| AC-M2-27 | **批级批量结算**（§3.3）：`ledger(close)` 携 `batch` ⇒ **只销已到 `待核销`** 的行（勾销）；`待讨论` / `待设计` / `在途` ⇒ 跳过 + 逐行点名（禁静默销账）；**追认核销不入批量面**；混批（部分落）与纯批两态各一拍（`applied` / `skipped` 计数对） | §3.3 |
| AC-M2-28 | **`task_book` 等值过滤**（§7.1）：`ledger(query)` 增 `task_book` 过滤（与 status / kind / board / trigger 并列为第 5 枚）；`ledger(count)` 同增（现状零过滤 ⇒ 本批只增 `task_book` 一枚）；同值多批互不串（造 3 批各回各集）；非串值 ⇒ 拒（守卫 P4） | §7.1 |
| AC-M2-29 | **归批指针门**（§6.2）：`trigger=归批` 的结果行 ⇒ `task_book` 必填 ∧ 指向在盘批档（缺指针 / 不可解析 / 档不存在 ⇒ 拒，文案逐字，行不变，零写）；`在途 / 待核销` 面逐字零回归；批量形同判（`applyRowUpdate`） | §6.2 |
| AC-M2-30 | **收口报警**（§6.2）：批档收口（`batch` close）回执附本批未落行列表（`task_book` 指本档 ∧ `status ∉ {已核销, 已废弃}`）逐行点名；零写、不阻断冻结（报警非闸门）；无未落行 ⇒ 无该段 | §6.2 ∥ `design/BATCH-RECORD.md` §4.13 |
| AC-M2-31 | **evidence 超限读数**（§5）：`query` 行集逐行携计算字段 `evidenceOversize`（`String(evidence).length > EVIDENCE_SOFT_LIMIT`（300）；缺 / 空 ⇒ false；不入库、不入 `DATA_COLUMNS`）；`count` 回报 `{ count, evidenceOversize }`（未决四态中超限行数）；**写入不拒**（读数非闸门） | §5 |
| AC-M2-32 | **`resume_when` 可空字段**（§3.4）：items 增可空列（`LEDGER_SCHEMA_VERSION` 1 ⇒ 2；老库 `ALTER` 幂等补列、行不损、二次打开零副作用）；`ledger(add / update)` 可携（可空 · 串；空串 / 全空白 ⇒ 拒）；`query` 行集携带；导出面入 `DATA_COLUMNS`（12 ⇒ 13）；不带参零回归（存量行 NULL）；`migrate` 列集容忍集扩为 `{executor, resume_when}` | §3.4 |

**用例表（摘）**：T1 入条目 → 新行 id 自增 · T2 状态迁移 → status 更新 + `updated_at` 刷新 · T3 勾销 → status 已核销 + `closed_at` 写入、行保留（软删除）· T4 未决四态计数（混入归档行）· T5 `trigger=NULL` 通过 · T6 非法 status 拒 · T7 在途缺 task_book 拒 · T8 非主 agent 写 → 命令不存在 · T9 status NULL 拒 · T10 迁移表外迁移拒（行不变）。

**用例表（续——写门·指针存在性）**：T11 `task_book` 三形态（无后缀 / `§2` / `§1.5（括注）`）指向在档 → 通过 · T12 指向不在册档 → 拒（文案 + 行不变）· T13 `task_book` 缺文件部分 → 拒 · T14 待讨论行带任意 `task_book` → 不判（射程 = 结果行状态）。

**用例表（续——执行者归属与判活展示，F-LX1；档 `thincoder-core/test/ledger-executor.test.mjs`；L2 文案断言双端 = `thincoder-cli/test/ledger-surface.test.mjs` / `thincoder-vscode/test/ledger.test.mjs`）**：

- T15 `待设计 → 在途` ⇒ 行 `executor` = 注入 sessionId（兜底链三态各一拍：缺省 / patch 显式 / 行现值兜底）。
- T16 `在途 → 待核销` / `在途 → 已废弃` ⇒ executor NULL（patch 显式传也不复活）。
- T17 `ledgerClose` 在途直撤 ⇒ executor NULL；勾销路径零触碰；纯字段更新不带 executor ⇒ 行值零变。
- T18 旧 DDL 建库 → 打开列补齐、行不损；二次打开幂等零副作用；并发 ALTER 撞「duplicate column」→ 复核列在吞。
- T19 三态对照（注入 `_setProcessProbeTestImpl`）：dead ⇒ L2 带「属主已死，可接手」/ alive + staleDays ≥ 1 ⇒「执行中 <n> · 最长 <d> 天未动」/ unknown（aliveSet null · cmdline 缺行）⇒ 不显死亡。
- T20 inflight 空 ⇒ `resolveExecutorStates` 零 exec 快返；同 pid 二次解析 TTL 内零 exec。

**用例表（续——库键归一与存量迁移；档 `thincoder-core/test/ledger-key-normalize.test.mjs` / `thincoder-core/test/ledger-migrate.test.mjs`）**：

- T21 键归一：同项目两盘符拼写（含 `\` / `/` 混写、尾斜杠）⇒ `ledgerDbPath` 同路径；盘符本大写 ⇒ 键 = 原样 `sha1[:16]`（回归）。
- T22 级联守卫（§2.1 比较边界登记）：`findProject` 以两拼写 anchor ⇒ 命中同一库文件。
- T23 边界：**null / undefined / 空串** cwd 不炸（`resolve(cwd ?? ".")` 只兜此三态；数值 / 对象入参不在本用例射程——由 `path.resolve` 语义照常抛）。
- T24 迁移 dry-run：夹具两库（目标 + 变体源）⇒ 报告含目标键 / 源键 / 逐源行数 / 计划迁入数 / 备份路径；**零写**（目录文件集合与 mtime 不变）+ **夹具根外零写**（备份 / 回收目录同随覆盖基——真实用户目录零触碰）+ **目标不可读子例**（非 sqlite 档）⇒ 显式标「不可读」、迁移后计数 `?` 占位、全输出零 `undefined`。
- T25 迁移执行：源 N 行迁入（新 id 连续）；**13 数据列逐条保全 + id 重发**（等值比对列集不含 id；id 映射入报告）；目标既有行不动；源库进 `ledger-trash/<批次>/`；`ledger-backup/<批次>/` 两档同计数；**夹具根外零写**。
- T26 幂等：同夹具连跑两次 ⇒ 第二次 0 新增（源已回收 ⇒ 「无待迁源」）；总行数 = 首跑后计数（无重复行）。
- T27 fail-closed：源带 `-wal` 伴生档 ⇒ 拒（目标零变、源零动）；备份失败 ⇒ 拒跑；忙（第二连接持写锁）⇒ 明示拒跑（既有目标 ⇒ 措辞「目标零变、源零动」零变）；**新建目标 + 迁入失败**（源行撞目标 CHECK）⇒ ROLLBACK + 残留措辞（「目标档为本次新建——0 行空库档残留在原路径」；不再称「目标零变」）。
- T28 审计：夹具含 目标 / 变体源 / 空库 / 不可归因（有行）/ 不可归因（读取失败）/ 不可读（坏档） 六类 ⇒ 定性正确 + `--root` 归因命中；全目录零删改（文件集合 / 大小 / mtime 三不变）。
- T29 列集就绪判：源库由旧 DDL 建（缺 `executor` ∥ `resume_when` 列）⇒ 该列按 NULL 映射照迁、其余列逐字；源库缺其余任一数据列 ⇒ 拒（目标零变、源零动）。
- T30 目标缺档态：目标键库不存在 ⇒ dry-run 标「拟建（0 行）」；`--confirm` 迁入建库建表、迁后计数 = 源行数；备份面标注目标无可备档。
- T31 `--from <key>`：**取值必须为 16 位小写十六进制键形**（`/^[0-9a-f]{16}$/`——路径形 / 非键形 ⇒ 拒）；显式键补充源 ⇒ 并入候选（与枚举去重）后照六步迁入；指名键无对应库 / 不可开 ⇒ 拒跑（fail-closed，零写）。
- T32 dry-run 写门风险旗：源含 `在途 / 待核销` 且 `task_book` 不可解析 / 指向档不存在的行 ⇒ 报告含风险旗（**不拦截**、照迁）；dry-run 零写照旧。

**用例表（续——收口两源；档 `thincoder-core/test/ledger-close.test.mjs`）**：

- T33 正常：追认核销直通——待讨论 / 待设计（先行回写 `evidence`）⇒ 已核销 + `closed_at` 写入 + 行保留（软删除）。
- T34 错误：追认核销缺 `evidence`（空 / 全空白两拍）⇒ 拒（文案逐字 + 行不变）。
- T35 错误：在途 → 已核销 ⇒ 拒（文案逐字 + 行不变）；反证 = 在途 → 待核销 → 已核销 两步照旧成功（勾销链零破）。
- T36 边界：已核销 / 已废弃 现态 ⇒ 拒（明确报错）；未知 id ⇒ 拒（既有文案）；追认核销 `executor` 零触碰（哨兵）；待讨论 → 已废弃 照常（撤回零改回归）。

**用例表（续——工具层参数守卫；档 `thincoder-core/test/ledger-args-guard.test.mjs`）**：

- T37 正常：三 action 合法形全链（`ledger(add)` → 复杂文本（`file:line` / 引号 / 反引号）逐字落盘 → `ledger(update)`（含迁「在途」带在档指针过写门）→ `ledger(close)`）；可空字段 `null` 通过；`cwd` 缺省径（ctx 供值）通过。
- T38 错误：`ledger(add)` 非法形逐条 ⇒ 文案逐字（P1–P6 全模板）：`{}` / 缺 `kind` / `kind: null`（显式 `null` ⇒ 按缺失判——P3）/ `kind` 非枚举（含数组形）/ `title` 缺 / 空 / 全空白 / 非串 / 可空字段非串 / `trigger` 非枚举 / 未知键（含判序用例——typo `knd` ⇒ 未知键文案先于缺参）/ 入参 `null`（视作 `{}` ⇒ 缺参文案）/ 入参数组（P1）+ 行集不变。
- T39 错误：`ledger(update)` 非法形逐条（`id` 缺 / `id: null`（同判）/ `id` 非数字（含 `"1"`）/ `status` 非六态 / patch 字段非串 / `title` 空串 / 全空白（P6 字段级）/ 未知键）⇒ 文案逐字 + 行不变。
- T40 错误：`ledger(close)` 非法形逐条（`id` 缺 / 非数字 / `status` 缺 / `status` 非 {已核销, 已废弃}）⇒ 文案逐字 + 行不变。
- T41 边界：拒 ⇒ 零库动作（台账目录 / 库档不建）；空串 `task_book` 迁「在途」⇒ 写门拒（既有「不可解析（缺文件部分）」文案）+ 行不变。
- T42 错误：缺指针形——`待设计` 行（`task_book` = `null` 常态）迁「在途」⇒ 写门拒（「必填」文案逐字）+ 行不变（仍 待设计）+ 零 SQLite 原文（中文文案断言）。
- T43 错误：读命令守卫——`ledger(query)` 非法形逐条（`status: 123` / `status: []` / `kind: "bogus"` / `board: 9` / `cwd: 3` / 未知键 / 入参非对象）⇒ 拒（文案逐字 · 零库动作）；`ledger(count)` 同判；合法形（缺省 / 显式 `null` / 合法过滤命中 = 直调核函数等值）零回归。
- T44 边界：`ledger(update)` 显式 `executor: null` ≡ 略去——`待设计 → 在途`（带在档 `task_book`）⇒ 行 `executor` = 本会话 sessionId（`getSessionId()`）；显式串仍优先；非迁移纯字段更新读数零变。

**用例表（续——根解析面（工作区报明）；实现面 = `thincoder-core/ledger-db.mjs` `openLedger`）**：
- T45 错误：工作区锚（tmp 夹具——双带档子目录）⇒ 缺省径**报明 + 点名项目根**（读 / 写五工具同门）——**零写**（台账目录 / 库档不建 / 不落行）+ 文案含下辖项目全列（绝对路径——按名排序）+ **不含 `ambiguous` 字样**；none 态夹具 ⇒ 兜底键零改（既有空读行为回归）。
- T46 边界：声明源前缀 `task_book`（实现 = 实施轮）：项目声明 `docs-repo` ⇒ 其内 `x.md`（存在）⇒ 通过；未声明前缀 ⇒ 照旧拒；声明根缺位 ⇒ 拒。
- T55 迁移旗同源（实现 = 实施轮）：声明源前缀 `task_book`（目标档在）⇒ 写门通过 ∧ `writeGateFlag` 零旗；未声明前缀 ∥ 声明根缺位 ∥ 目标档缺 ⇒ 两处同判（拒 ∥ 旗）；仓根形全谱 = 既有断言逐字零变（回归用例）。

**用例表（续——标记范围合计；单元测试档（在位 · 239 行）；夹具 = 临时台账目录注入（`_setLedgerDirForTest`）+ 双项目临时树）**：

- T47 正常：容器根锚（双项目夹具）⇒ `marker` = 两池分列求和（例 `台账 3·4`——两目数值可区分 ⇒ 求和可判）。
- T48 负向锁：具体项目锚（A 目录内）⇒ `marker` = A 自身数（B 的数零掺入）。
- T49 边界：容器根锚下恰一个项目 ⇒ `marker` = 该项目数（同径——零特判）。
- T50 降级：族内不可读项目跳过（余者照常求和）；全不可读 ⇒ `marker = null`（不落 `0·0`）。
- T51 边界：具体项目锚命中但不可读 ⇒ `marker = null`（兄弟零掺入——范围 = current 语义）。
- T52 现状零变：空族（无台账目录）⇒ `marker = null` + `warn = false`。
- T53 正常：`warn` 范围聚合——族内任一项 `aged>0` ⇒ 根锚 `warn = true`；族内项目 `deadExecutors>0`（判活桩注入——同 T19）⇒ 根锚 `warn = true`；无老化 ∥ 无死执行者的具体项目锚 ⇒ `warn = false`（负向锁）。
- T54 端面：桌面 `ledgerMarkerOf` 透传两形（`{ text, warn }` ∕ `null`）；VSC item 源面锁（`scopeMarkerOf` 消费 ∥ 端侧 `formatMarker(current)` 自算零残余）。

**用例表（续——台账工具统一入口；单元测试档（已落））**：

- T77–T91：统一入口五 action 等价 ∥ 弃用壳 ∥ 守卫逐 action 文案（P3 / P5 + P2 / P4 / P6 补）∥ 未知 action ∥ action 缺失 ∥ 装配名集（号段 T77 起）。
**用例表（续——批级批量与反查；单元测试档（新建 `thincoder-core/test/ledger-batch-ops.test.mjs`——靶向单跑 `node --test test/ledger-batch-ops.test.mjs`））**：

- T92 正常：纯批收口——同批 N 行（全在 `待核销`）⇒ `close --batch` 一次全销（`applied.length === N` · `skipped.length === 0`）；**直读库**该批行数 = N（按 `task_book` 直查——**非** `ledger(count)`：后者只数未决四态、该批收口后回报 0，两读数口径不同、非矛盾）；**调用数 = 2**（`update --batch` + `close --batch`）。
- T93 安全阀：混批（部分落）——同批三行（`待核销` / `在途` / `待讨论` 各一）⇒ `close --batch` 只销 `待核销` 者（`applied = [该行]`），另两行**逐行点名**（`skipped` = `[{id, from:"在途", why:…}, {id, from:"待讨论", why:…}]`）；库内另两行状态零变。
- T94 边界：`update --batch --status` 逐行判迁移表——同批 `待讨论` ×1（入表）+ `已核销` ×1（出表）⇒ `applied` = 前者、`skipped` 点名后者；批量不破既迁表。
- T95 边界：`batch` 无匹配行（指针在盘但无行指它）⇒ `applied = []` · `skipped = []`（零行不报错）；`batch` 指针不可解析 / 档不存在 ⇒ 拒（**`batch` 入参自身门 §3.3**——零写）。
- T96 错误：`id` / `batch` 同携 ∥ 双缺 ⇒ 拒（文案逐字）；`batch` 非串 ⇒ 拒（守卫 P4）。
- T97 正常：`task_book` 过滤逐档隔离——造 3 批（各 `task_book` 指向不同批档）⇒ `query({ task_book: <批A> })` 回 A 集、B / C 零掺；`count({ task_book })` 数目对；`evidenceOversize` 逐行读数与 `count` 读数一致。
- T98 正常：归批门——`add({ trigger:"归批", task_book:"<在盘批档>" })` 通过；`task_book` 缺 ∥ 档不在盘 ⇒ 拒（文案逐字）；`在途 / 待核销` 面文案零变（回归）。
- T99 边界：收口报警——批档收口时本批尚存未落行 ⇒ 回执含未落行列表（逐行点名）；全部已落 ⇒ 无该段（零写、不阻断冻结）。
- T100 正常：`resume_when` —— `add` / `update` 携值落行；空串 / 全空白 ⇒ 拒；不带参零回归；旧库（无列）打开 ⇒ ALTER 补列、行不损、二次打开零副作用；`query` 行集携带。
- T101 边界：`evidence` 超限读数——写一行 301 字 `evidence` ⇒ `query` 该行 `evidenceOversize === true`、`count.evidenceOversize === 1`；**写入不拒**（行已落）。

## 9. 边界（本档不做）

- 不做 manifest（M1，只互指咬合）；不做批次档（M3）；不做 checklist（M7 废除，语义由本模块六态承接）。
- 不做 `docs/TODO-archive.md` 项目归档档搬迁；不承载细节展开（条目一行一条）。
- 不新增台账展示面形态（`ledger-surface.mjs` ×3 保留——仅 CLI 胶水**机制归核**切 core `runLedgerScan`，渲染面零新增形态）；不造 SQLite 计数状态条。
- 不做 `check-ledger` 脚本迁移（归 M8 删除）。
- 不新增工具/命令/快捷键面；不监听文件系统；不做跨进程缓存 / 全工作区深扫 / 网络面。
- 不写实现代码（ledger.mjs = eng-coder 写域）；不写提示词实体。
- **同级枚举上限**（成本有界）：`MAX_SIBLING_SCAN`——目录项数超限 → 该层候选判空集，退化 current-only；current 缺 → 锚本地枚举（锚自身含台账库的直接子目录——不沿祖先链上找）。
- **判活四不做**（F-LX1）：不做写径探测（`ledgerUpdate` / `ledgerClose` 零判活——判活只落显示面）；不做逐行 exec（一次批量 + 5s TTL 缓存——§7.3.1 性能红线）；不做心跳写共享 SQLite / 自动接手 / 自动清 executor（多进程写竞争 + 绕用户 gate——父侧必答②裁定）；L1 标记文本零扩。
- **库键与迁移**（§2.1 / §2.2）：不做 `realpath` / 符号链接解析；不做**非盘符段大小写折叠**（POSIX 大小写敏感——同 `MEMORY.md` §6.11 口径）；不做别名路径（subst / junction / 8.3）；不做跨项目全量迁移（逐项目锚定）；迁移不自动执行（需 `--confirm`）；存量残档不删除（只报告 + 回收建议）；不动其他用户态面（sessions / checkpoints / memory / `ledger-notify.json` 历史存量档——零读写）。
- **工具层参数守卫**（§3.2）：参数校验射程 = 工具层五入口（写命令三 + 读命令二）；守卫判于核函数之前 ⇒ 核函数体零新增校验（核面改动 = §6.1 写门缺指针 / 空串形——落 `assertTaskBookGate` helper）。
- **标记范围不做**：不改明细行集口径（`当前 ∪ 可动作`——§7.2）；不改族发现 ∕ 同级枚举上限（枚举算法 ∥ 同级上限零改；**工作区命中排除**——§7.2；**族发现锚本地**——§7.2）；不合并两池为单数（F1）；不改空值语义（`null` = 无标记——不落 `0·0`）。
- **批级批量不做**（§3.3）：不改六态 / 迁移表本体（批量逐行照判同一表）；不改子代理只读约束（写三 action 仍仅主 agent 装配）；不做「批量追认核销」（追认须逐行结账依据——统一文本会造假账）；不做跨批一次销多批（一批一指针）。
- **归批门不做**（§6.2）：不扫存量 / 不回改存量行（写入时点门）；不设「按字段放行」豁免（放行 = 门破——同 §6.1）；报警不阻断冻结（读数非闸门）。
- **`resume_when` 不做**（§3.4）：不强制 `trigger=条件` 行携带（可选字段）；不机械校验句内容 / 锚存在性（自由文本）；不复制批档 §1 条件句（两处各自单源）。
- **evidence 超限不做**（§5）：只出读数、不拒写（软上限非闸门——用户裁定「无限机检反感」）。
