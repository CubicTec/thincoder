# Thincoder Server · 管理面 agent（agent/ADMIN-AGENT）

> 板块 = server ∥ 本域 = agent（server 端 agent——管理面唯一 agent）；本档 = 域档。
> 口径单源 = `docs/server/requirements/PROJECT.md` §5 沙盒块「接入两径」行 + AC-36 ⑨⑩：执行者 = server 端 agent——探明主机实况 → 决定并执行必要操作 → 验证 → 报告（用户 15:00 裁）；能力面由设计轮从实际装机场景反推（15:02 裁——「先知道要干什么，再谈能力」）。
> 用户 2026-10-10 22:19–22:29 口径（逐字在批档 `docs/batches/2026-10-10-runner-admin-console.md` §1 口径补记 5/6）：工具面要有通用执行能力（bash/ssh 级——「不给bash/ssh会很麻烦」）∥ Docker 操作工具要给（「一些docker的操作工具不给他吗？」）∥ **唯一一个 agent**（「就是同一个agent，就是管里面的那个agent」——能力面 = 整个 server 管理面，逐步长）。
> 首个活 = 托管加机（机制全文 = `sandbox/SANDBOX.md` §3 托管接入块）；控制台归属 = `webui/SANDBOX.md` §2.1①；核复用口径 = `PROJECT.md` §5 KD-SV-78。
> 建档：2026-10-10（批 `docs/batches/2026-10-10-runner-admin-console.md` §2 · 台账 #1237 + #1236）。

## 1. 形态与定位

- **一句话**：管理面 agent = **server 进程内的 LLM agent**——以「任务」为单位接收管理动作（首批 = 托管接入），经工具面（主机执行 ∥ Docker API ∥ 控制面动作）探明目标、决定并执行、验证、报告。
- **唯一一个**（用户 22:29）：不为管理面另立第二个 agent；其余管理面能力（成员 ∥ provider ∥ 模型选择 ∥ 用量/配额 ∥ 审计 ∥ 沙盒各面）陆续入其工具面——「通过 agent 完成 thincoder server 的完整管理」（需求 §5 后续议题行 · 台账 #1254）。
- **载体**：server 进程内模块 `thincoder-server/src/agent/`（不做独立进程/通道）；执行面（runner）机器上零驻留——延续用户 19:52 口径。
- **核 = `@thincoder/core`**（KD-SV-78：依赖声明形照 CLI——钉版本；**无人值守档面裁剪 = 本档 §5**——该 KD 明文归 #1237 设计轮）。
- **驱动器 = 两形（本批起）**：① **任务式**——管理动作创建任务（run），agent 在任务内跑工具（§2）；② **聊天式**——管理面 chat 会话（§11——本批落；需求 §5「两个 chat 界面」④）。两形**同 agent 同源**：同一工具面框架（任务五件 §3 + 管理面七件 §12 + 环境五族七件 §14——admin-agent-awareness 批）、同一审计面、同一模型出口。
- **与成员面 agent 的关系**：成员面 chat = 开发壳（#1215 起步块；16:04 裁「成员资源管理 = 同一个 chat 界面 + 开放工具」）——其 server 域工具与本体同源、面不同；归属/裁剪随 **#1215（成员面 chat 轮）** 定，**本档不改其口径**。

## 2. 任务模型（run）

- **任务（run）** = 管理动作的执行单元：目标（自然语言简报 + 参数）∥ 目标主机/对象 ∥ 验收（成功判据——从场景反推）∥ 预算 ∥ 审计窗。
- **状态与读时面**：run 落在库行（首表 = `sandbox_onboarding`——sandbox 域 v13，`store/STORE.md` §2 v13 段）；进度 = **读时轮询**（无后台常驻定时器——KD-SV-86）；server 重启 ⇒ 在途任务 `interrupted`（如实收尾——KD-SV-86）。
- **并发**：同一主机在途任务 ≤ 1（重复提交 ⇒ 400 拒——人话）。
- **无人值守**：不弹审批 ∥ 不依赖 TTY ∥ 工具不自锁 stdin；不可逆/越界情形 ⇒ **停下报告**（不是问询——§4）。
- **预算**（父侧提议——防跑飞）：单任务时长上限（缺省 20 分钟）∥ 工具调用步数上限（缺省 60 次）；超限 ⇒ 停 + 报告。不做中途中止按钮（预算封顶兜底；重试 = 重交任务——§4）。
- **审计**：每工具调用一条（命令/调用 ∥ 退出码/结果码 ∥ 摘要——秘密掩蔽后）＋任务级起/终两行；型面 = `sandbox_event`（`accounts/ACCOUNTS.md` §2.1——零 CHECK 改）。

## 3. 工具面（首版五件——用户 22:19–22:25 口径落细）

| 工具 | 形 | 实现面 | 审计行 |
|---|---|---|---|
| `exec(host, command, timeoutS?)` | 目标机执行**一条**命令（非交互 ∥ 逐条 ∥ 退出码 + stdout/stderr 截断回读） | `thincoder-server/src/sandbox/ssh.mjs`（拟新增——系统 openssh，KD-SV-85） | 命令 ∥ 退出码 ∥ 摘要 |
| `docker(host, op, args?)` | Docker API 动词（version ∥ info ∥ ps ∥ images ∥ pull ∥ create ∥ start ∥ stop ∥ rm ∥ logs ⋯） | `thincoder-server/src/sandbox/docker.mjs`（拟新增——**与控制台同一客户端**：「控制台与 agent 走同一套 Docker 调用」） | op ∥ 结果码 ∥ 摘要 |
| `register(host, endpoint)` | 登记进控制面（连通自检 + 落行——与控制台「添加节点」同函数） | `sandbox/registry.mjs` | 自检读数 ∥ 行 id |
| `verify(host)` | 自检（Docker API 连通 + 版本协商 + 读数复述） | 同上 | 读数逐值 |
| `report(summary)` | 终态报告（成功/失败 + 停在哪步 + 读数） | 任务记录 + 审计 | 终态行 |

- **无白名单围栏**（用户 15:02「你先别还没干活先开始受控，他妈的我还不知道需要什么能力呢」——撤能力围栏在案）；护栏 = 任务简报（目标/边界句——随任务给）∥ 每动作审计 ∥ §4 停下报告边界。**不发明新围栏**（能力面从实际场景反推——15:02 口径；本批工具入参按主机寻址——凭据 = 该主机任务所授）。
- **任务面不含** server 本机 shell/文件工具（作用域 = 目标主机）——admin-agent-awareness 批收正：环境五族七件（含 `bash` ∥ 读文件族）入 **chat 面**（§14）。

## 4. 自主边界与失败处置（硬点② 的答案）

- **可自主决定**（目标不变前提下）：技术路线选择——包管理器（apt ∥ dnf ∥ yum ∥ zypper ∥ apk）∥ 安装方式（发行版包优先；convenience script 仅在发行版包不可用时）∥ 服务管理形态（systemd drop-in 等）∥ 监听配置形 ∥ 瞬态网络失败重试（≤1 次）∥ 步骤次序与探明深度。
- **必须停下报告**（不得自行处置）：① OS/内核前提不满足（非 Linux ∥ 无 cgroup v2 ∥ 磁盘不足 ∥ 无 systemd）；② 登录/sudo 权不足；③ 同一动作有界重试后仍败；④ 需破坏性/越界动作（升级系统 ∥ 卸载包 ∥ 动他人服务/防火墙 ∥ 重启宿主机 ∥ 动数据盘）；⑤ 目标机既有形态冲突（Docker 形态异常 ∥ 监听被占）；⑥ 预算超限。
- **失败处置**（「失败回滚还是停下报告」）：**仅撤 agent 自身写入的可逆配置**（例：daemon drop-in ⇒ 撤文件 + 复位尝试）；**装包不回滚**（卸载比留下更危险——以机器现状为准报告）；**登记失败 = 零宿主回滚**（重交重试——幂等）；回滚也失败 ⇒ 报警级报告（逐条现状）。
- **重试** = 重新提交（新任务行——对已装/已监听幂等）；**不做**任务中途取消（预算封顶——父侧提议）。

## 5. 无人值守档面裁剪（KD-SV-78 落实——「server agent 的无人值守档面裁剪随 #1237 设计轮」）

- **保留**：核 agent 环（多轮工具循环 ∥ 上下文压缩）∥ 工具调用协议 ∥ provider 客户端（模型出口）∥ 审计挂钩。
- **裁剪**：交互审批/问询面（无人值守——工具不弹问、不自锁）∥ TTY 假面 ∥ 与运维任务无关族（记忆 ∥ 台账 ∥ 子代理 ∥ 浏览器——按任务需要再逐族接）。
- **模型出口** = provider 注册表现有渠道（server 自持 key——与网关同信任域）；**记账不进成员用量**（服务器运维成本——如实披露）；出口代理旗随 provider 条目（复核点——`sandbox/SANDBOX.md` §16 R53③——as-of 2026-10-11）。
- **模型选择** = 任务提交时选择（下拉源 = 注册表现有模型；缺省 = 最近一次成功所用——机械读法 = `GET /api/admin/agent/chats` 倒序首行 `model`；该模型不在下拉源 ⇒ 空选；「成功」位 = 数据面无（题设近似——如实登记，不引入新位））；无可用模型 ⇒ 提交面明示不可提交（KD-SV-87——父侧提议）。

## 6. 本域文件与行数预算（本域族行）

| 档 | 行数（设计估） | 职责 |
|---|---|---|
| `thincoder-server/src/agent/run.mjs`（已落盘） | 实读 **137** | 任务执行的 agent 环装配：核装载（`@thincoder/core`——KD-SV-78）∥ provider 注入 ∥ 工具注册 ∥ 预算 ∥ 审计 sink ∥ 无人值守裁剪（§5） |
| `thincoder-server/src/agent/tools.mjs`（已落盘） | 实读 **288 ⇒ ≈200**（docker 十动词执行器迁出 ⇒ `docker-ops.mjs`——两驱动单源） | 任务面五工具（§3）——参数校验 ∥ 结果结构化 ∥ 审计包装（exec/docker 经 sandbox 域件；register/verify 经 registry） |
| `thincoder-server/src/agent/chat.mjs`（已落盘——admin-agent-chat 批） | ≈300 ⇒ 实读 **498**（2026-10-11 本设计轮现读）⇒ ≈**600**（chat-shell-align 批：中止登记表 + 双通道检查点 ∥ `turn`/`usage` 帧 ∥ `end` 两可字段 ∥ notice 五值 ∥ images 落库/回放 + 详情 `imageCount`——净 ≈+100；实读 **575**——2026-10-12 本设计轮复读）⇒ ≈**585**（console-reasoning-levels 批：起跑读行携档位 ∥ `buildChatExit` 扩参（枚举内才携 `reasoningEffort`——未设/表外零字段）——净 ≈+10；越 500 软线：预案 = 档位小段随拆档审查；硬限 800 未越）⇒ 实读 **599**（2026-10-12 本批落地后）⇒ ≈**640**（admin-agent-awareness 批：环境块行装配 ∥ 工具面合并 ∥ `invoke` 携 ctx ∥ 审计详情扩字段——净 ≈+40；越 500 软线：拆档预案 = 库面段（现读 ≈93 行）抽 `chat-store.mjs`——触发 = 本档越 650 ∥ 下批再增 ≥40 行） | 聊天式驱动（§11）：会话装配（系统简报 + 历史重放）∥ 回合环（预算 ∥ 工具循环 ∥ 中止检查点）∥ 帧流编解码（五形 + `end` 两可字段）∥ 逐条落库 ∥ 终态收尾（五形） |
| `thincoder-server/src/agent/chat-routes.mjs`（已落盘——admin-agent-chat 批） | ≈120 ⇒ 实读 **105**（2026-10-11 本设计轮现读）⇒ ≈**150**（chat-shell-align 批：`PATCH …/:id` ∥ `POST …/:id/abort` 两端点 ∥ `images` 门（核 `parseDataUrl` + `isNonVisionModel`）——净 ≈+45；实读 **158**——2026-10-12 本设计轮复读）⇒ ≈**178**（console-reasoning-levels 批：PATCH 扩会话设置面（`{ model }` ∥ `{ reasoning }` 一次一件）+ 两校验支——净 ≈+20）⇒ 实读 **190**（2026-10-12 本批落地后） | 会话面**六**端点（§11——契约 = `gateway/API.md` §2.8）∥ 判权 ∥ 在途门 ∥ 重启恢复钩（running ⇒ idle + notice） |
| `thincoder-server/src/agent/chat-tools.mjs`（拟新增——admin-agent-chat 批） | ≈400 | 管理面七件（§12）：members ∥ providers ∥ models ∥ usage ∥ audit ∥ runners ∥ docker——参数校验 ∥ 结果结构化 ∥ 审计包装（进程内直取域件） |
| `thincoder-server/src/agent/docker-ops.mjs`（拟新增——admin-agent-chat 批） | ≈140 | Docker 十动词执行器（自 `tools.mjs` 提取——任务面/聊天面两驱动单源；客户端 = `sandbox/docker.mjs`） |
| `thincoder-server/src/agent/chat-env.mjs`（拟新增——admin-agent-awareness 批） | ≈150 | 环境块装配（§14.1）：时空 ∥ 所在/身份 ∥ 所管现况一行（三活体——块级降级）∥ 能力与边界段（`CHAT_LIMITS_BLOCK`——系统简报第四块） |
| `thincoder-server/src/agent/chat-env-tools.mjs`（拟新增——admin-agent-awareness 批） | ≈230 | 环境工具面五族七件（§14.2/§14.3）：核件动载 ∥ ctx 适配 ∥ 结果归一 `{ ok, subject, summary, output }` ∥ `bash` 限幅（超时 ∥ 输出 ∥ 工作目录）∥ timer 挂表与回合边界投递 |

- 小计 **≈+872**（本批：新增四档 ≈960 ∥ `tools.mjs` −≈88）；`bin/thincoder-server.mjs` 实读 **187 ⇒ ≈189**（import + 注册两行——本域首经 bin 注册点）；**chat-shell-align 批另计 ≈+145**（`chat.mjs` 498 ⇒ ≈600 ∥ `chat-routes.mjs` 105 ⇒ ≈150；零新档）
  ⇒ **console-reasoning-levels 批另计 ≈+30**（`chat.mjs` 实读 575 ⇒ ≈585 ∥ `chat-routes.mjs` 实读 158 ⇒ ≈178；零新档——值域桥件行账 = `gateway/API.md` §4）。
  ⇒ **admin-agent-awareness 批另计 ≈+420**（`chat-env.mjs` 拟新增 ≈150 ∥ `chat-env-tools.mjs` 拟新增 ≈230 ∥ `chat.mjs` 实读 599 ⇒ ≈640；零新端点 ∥ 零迁移 ∥ `bin` ±0）；批内件 ≈1 档（`docs/batches/2026-10-12-admin-agent-awareness.test.mjs`——行数随实施；**入 server 链**，`prepublishOnly` 57 ⇒ 58）。
- `thincoder-server/package.json`（`@thincoder/core` 钉版本依赖 ∥ `prepublishOnly` 件数）与**构建/发布形**（带核）复核 = `sandbox/SANDBOX.md` §16 R53③（as-of 2026-10-11）。
- sandbox 域件（`ssh.mjs` ∥ `onboarding.mjs` ∥ `onboarding-routes.mjs`）= `sandbox/SANDBOX.md` §13（本档不重复）；`bin/thincoder-server.mjs` **±0**（四端点经 `thincoder-server/src/sandbox/routes.mjs` 转注册——装配行计入 sandbox 域预算）。

## 7. 验收判据（机检面）

| 判据 | 载体 |
|---|---|
| 五工具装配在场（工具名/参数形断言）；每工具调用落一条审计行（逐调用断言——含 exec 命令 ∥ 退出码 ∥ 摘要）；秘密零入审计（掩蔽断言） | 批内件（`…-runner-admin-console-agent.test.mjs`） |
| 无人值守档面：无交互/审批件挂载 ∥ 工具在无 TTY 环境可跑（假件下） | 批内件 |
| 预算：步数/时长告警 ⇒ 停 + 终态 `failed`（原因含「预算超限」） | 批内件 |
| 聊天式驱动（本批）：四端点判权三态（`user` ⇒ 403 ∥ 无会话 ⇒ 401 ∥ admin 200）∥ 流帧逐帧序（`delta`/`call`/`result`/`end`——假模型出口 ∥ 假工具）∥ 会话落库与重放（逐行在场 ∥ notice 回放滤除 ∥ 工具结果截断口径一致）∥ 在途门（`running` ⇒ 400 人话）∥ 重启收尾（`running` ⇒ `idle` + notice + `chat_stop` 行）∥ 管理面七件逐件（§12——假件下断言动词面与参数校验）∥ 每工具调用一条 `agent_event` 行（逐调用 ∥ 掩蔽）∥ chat 重置 ⇒ 既有域型零增（`password_reset` 零行——只 `chat_call` 行；§12 重置链助手边界）∥ 异常终态落库（模型错误 ∥ 预算超限）：已生成文本 ⇒ `assistant` 行如实落库（部分文本——回放逐字一致）；notice 行独立落行（回放滤除）；零文本 ⇒ 零 `assistant` 行 | 批内件（`…-admin-agent-chat.test.mjs` ∥ `…-admin-agent-chat-tools.test.mjs`） |
| 托管接入全链判据 = `sandbox/SANDBOX.md` §11 托管接入行（本档机制被其覆盖——用例 = 其 §12 N49–N52） | 批内件 + 收口轮（真机） |
| 输入区四件后端 + 帧面（chat-shell-align 批）：PATCH 换模型（idle/running 两态——下回合生效 ∥ 在途零触；非法/不存在 ⇒ 400/404 库零变）∥ `images` 三门（非数组 ∥ 非栅格 ∥ 超单图阈 ⇒ 400；非视觉模型 ⇒ 400——库零变）∥ user 行 `imageParts` 逐值 + 回放 content 数组（模型出口入参断言）+ 详情仅 `imageCount` ∥ abort（在途 ⇒ 200 + 收尾三件（notice `"aborted"` ∥ `chat_stop` ∥ `end` failed）；idle ⇒ 400；两中止窗（调用间 ∥ 在途 signal）∥ 登记表清零）∥ 帧序 = `turn(n)` 前 ∥ `usage` 后（缺 usage ⇒ 零帧）∥ `end` 携 `durationMs`/`calls`（可字段——旧消费零破） | 批内件（`…-admin-agent-chat.test.mjs` 续——现读 715 行（2026-10-11）；本批续增用例段 ≈+250——本设计轮复读 **716** 行；越 500 软线：预案 = 用例段随拆档审查；硬限 800 未越） |
| 会话级思考档位（console-reasoning-levels 批——2026-10-12）：`GET /api/admin/providers` 行携 `modelReasoning`（稀疏 ∥ 键 = 上游真名 ∥ 值 = 核枚举；假 specLookup 注入）∥ `PATCH …/:id { reasoning }`（枚举内 ⇒ 200 落库 + 回执携值；表外/非串/同携 model ⇒ 400 库零变；判权三态）∥ 换模型 ⇒ `reasoning` 清 NULL（口径②）∥ 装配（行值 ∈ 当刻模型枚举 ⇒ 出口 `reasoningEffort`；未设 ∥ 表外 ⇒ 零键——假出口入参断言）∥ 结构（v16 零迁移：空库直落 16 ∥ 列面在场 ∥ 存量行 NULL） | 批内件（`…-console-reasoning-levels.test.mjs`） |

| 环境感知与环境工具面（admin-agent-awareness 批——2026-10-12；功能点 43 ∥ AC-43 ①–⑥） | ① 四块装配在场（三实况行逐值——注入 now ∥ 假 db ∥ 注入 cwd；简报含能力边界段——**对位断言** = 每件注册工具名 ∈ 能力段字面）∥ ② 值随实况（读源变更 ⇒ 下回合行变）＋ 块级降级（读败 ⇒ 该行缺席、回合 `succeeded`）∥ ③ 零新端点（两新档源零 `routes.add(` ∥ `chat-routes.mjs` 计数不变）∥ ④ 行形 = `[System reminder: ` 族前缀（三端同形——坐标逐块 = §14.1 表）∥ ⑤ 工具面五族七件在场（names/schemas——核真件〔仓内核直引〕）＋ `get_current_time` 一次调用读数 ＋ `bash` 限幅三件（逾限拒 ∥ `async` 拒 ∥ cwd 生效）∥ ⑥ 每调用一审计行（逐调用——既有）＋ 详情扩字段（`subject` = 命令原文/路径 ∥ 成败 ∥ `truncated`）＋ 审计页按型渲染（agent 行模板——三文案键两表同步） | 批内件（`…-admin-agent-awareness.test.mjs`）＋ 收口轮（浏览器实走——问「现在几点/你管着几个节点」各一 ＋ 时间工具一次调用 ＋ 审计页一行） |

## 8. 用例（本域）

| # | 类 | 输入 | 预期输出 |
|---|---|---|---|
| N53 | 正常 | 假模型 + 假 ssh + 假 Docker：任务环跑到 `report` | run 终态 succeeded；审计行 = 起 ∥ 每调用 ∥ 终（数目逐值）；工具面五件在场 |
| B47 | 边界 | 步数上限触发（假模型恒调工具） | 停 + `failed`（「预算超限」）+ 审计终行 |
| E39 | 错误 | 无可用模型（注册表空） | 提交面拒（400 人话）；零落库 |
| N54 | 正常 | 假模型（一轮文本 + 一轮工具调用）+ 假工具：建会话 ⇒ 发消息（读 NDJSON 流） | 帧序 = `delta`… ∥ `call` ∥ `result` ∥ `end(succeeded)`；`agent_chat_messages` 逐行在场（`user` ∥ `assistant`（含 `toolCalls`）∥ `tool`）；审计 = `chat_start` + 每调用一条 `chat_call` |
| N55 | 正常 | 同一会话连发两轮（轮间重读详情） | 历史重放逐行（角色/序在场——notice 滤除）；模型上下文 = 前轮全量；会话 `status` 终态回 `idle` |
| B48 | 边界 | 流断/客户端断开（回合在途） | 回合照跑到终态（落库不依赖连接）；重读详情 = 全量在场；审计零缺行 |
| B49 | 边界 | 预算超限（假模型恒调工具）∥ 空回合（模型无文本无调用） | `end` 帧 `failed` + notice 行（「预算超限」人话）+ `chat_stop` 行 ∥ 同左（空回合人话） |
| E40 | 错误 | 无会话 ∥ `user` 角色 ∥ 会话不存在 ∥ 在途再发 ∥ 模型不可用（建会话） | 401 ∥ 403 ∥ 404 ∥ 400（「本会话正在执行」）∥ 400（「模型不可用」人话）——各自零副作用（在途门除外） |
| E41 | 错误 | 模型出口抛错（假模型）∥ 工具入参非法（如 `members.create` 缺 `username`） | `end` 帧 `failed` + notice（原因人话）+ `chat_stop` 行 ∥ 工具级错误回灌（`result` 帧 `ok:false`——回合不停，模型可自纠）；会话落库如实 |
| N64 | 正常 | 假模型（两轮：文本 + 工具调用）+ 假工具：发一条（读 NDJSON 流） | 帧序 = `turn(1)` ∥ `delta`… ∥ `usage{prompt,completion,cacheHit,cacheMiss}` ∥ `call`/`result` ∥ `turn(2)` ∥ `delta` ∥ `usage` ∥ `end(succeeded, durationMs, calls)`；usage 逐值 = 假模型 usage；零落库（帧面） |
| N65 | 正常 | PATCH 换模型两态（idle ∥ 回合在途）⇒ 下一回合 | 200 落库新 model；在途回合出口模型零变（当前回合跑完）；下回合出口 = 新 model（假出口入参断言）；历史零动 |
| N66 | 正常 | 图片随 POST（视觉模型位——假模型 + 假图 dataURL）⇒ 详情重读 | 200 流照常；user 行 `data_json.imageParts` 逐值；回放 ⇒ content = parts 数组（模型出口入参断言：text part + image_url part）；详情响应 user 行 `data` 仅 `imageCount`（dataURL 零下发） |
| N67 | 正常 | 在途 `POST …/abort`（假模型长回合） | `end(failed, aborted)` + notice 行（reason `"aborted"`）+ `chat_stop` 审计（reason `"aborted"`）+ 已生成文本 ⇒ assistant 行如实落库；会话回 idle；登记表清零 |
| B65 | 边界 | abort：idle 态 ∥ 不存在会话 ∥ `user` 角色 ∥ 两中止窗（模型调用间 ∥ 调用在途） | 400 人话（「本会话不在执行中」）∥ 404 ∥ 403——零副作用；两窗皆命中（① 下一检查点即停 ② 在途调用当即中断——核 `signal` 通道）；终态同 N67 |
| B66 | 边界 | `images` 拒形三（非数组 ∥ 非栅格 dataURL（svg）∥ 超单图阈） | 逐形 400 人话；库零变；流未起（信封形） |
| E50 | 错误 | 非多模态模型 + images（发送） | 400 人话（「当前模型不支持图片输入」——核 `isNonVisionModel` 判）；库零变；流未起 |
| E51 | 错误 | PATCH：模型不在注册表 ∥ 缺 model ∥ 不存在会话 | 400 ∥ 400 ∥ 404——库零变 |
| N71 | 正常 | PATCH `{ reasoning: "high" }`（模型枚举含 high）⇒ 发一条（假模型出口） | 200 回执 `chat.reasoning = "high"`；库列落值；回合出口 provider 入参携 `reasoningEffort: "high"`；`chatView`/列表/详情三面携 `reasoning` |
| B69 | 边界 | 未设档（NULL）∥ 表外存量值 ∥ 换模型（携/不携档）∥ v15 存量库 | 未设 ⇒ 出口零 `reasoningEffort` 键；表外 ⇒ 零字段（读侧容忍——装配不炸）；换模型 ⇒ `reasoning` 清 NULL；v15 库升 v16 ⇒ 存量行 NULL 零变 |
| E54 | 错误 | PATCH `{ reasoning }`：表外值 ∥ 非串 ∥ `{ model, reasoning }` 同携 ∥ 缺核规格源 | 逐形 400 人话；库零变 |

| N72 | 正常 | 假模型（一轮调 `get_current_time` ＋ 一轮纯文本）＋ 环境工具面核真件（仓内直引）＋ 假 db（一节点 ∥ 一成员 ∥ 一 provider） | 四块行在场（时间 ∥ 环境身份 ∥ 现况计数逐值）＋ 简报含能力段；`end(succeeded)`；`chat_call` 行 `tool="get_current_time"`、`resultCode=0`；工具结果含 `Date:` 读数；回放零含实况行（瞬态不落库） |
| N73 | 正常 | 同一会话连发两条；两条之间新增一个节点（库写） | 第二条现况行计数 +1（读源变更 ⇒ 下回合行变——值随实况） |
| B70 | 边界 | ① 现况读源抛错（替身抛）∥ ② timer 到期（设 1s 项后隔一回合发一条）∥ ③ timer 未到期 | ① 该行缺席、回合照跑 `succeeded`（块级降级——其余行在场）∥ ② 该回合含 `[System reminder: ⏰ timer — …]` 行（出列幂等——只投一次）∥ ③ 零 timer 行（在途保留） |
| B71 | 边界 | `bash`：`timeout` 逾 600000 ∥ `async:true` ∥ 输出超 4000 字 | 前两形 ⇒ 工具级错误人话（`ok:false`，回合不停）；超长 ⇒ 落库形截断（≤4000 字含注记）＋ 审计行 `truncated:true` |
| E55 | 错误 | `read` 路径不存在 ∥ `grep` 非法正则 ∥ `bash` 非零退出（`node -e "process.exit(3)"`） | 前两形 ⇒ `ok:false` 人话回灌（回合不停）；非零退出 ⇒ 调用完成（`ok:true`——退出码在输出文本内 `(exit code 3)`）；三形各落 `chat_call` 行（`subject` = 路径/正则/命令原文） |

## 9. 关键决策（本域）

| # | 决策 | 理由 | 被否候选与何故否 |
|---|---|---|---|
| KD-SV-82 | **管理面 agent = server 进程内（核 `@thincoder/core` + 最小壳）+ 无人值守裁剪（§5）+ 工具面五件（无白名单围栏）；唯一一个 agent（用户 22:29）；驱动器两形 = 任务式 ∥ 聊天式（§11 ∥ KD-SV-88）** | 用户 22:19–22:29 口径 + KD-SV-78（从核引）；进程内 = 直取 server 域件（库/registry/docker 客户端）零 HTTP 回环；执行面机器零驻留延续 19:52 口径 | 独立进程/守护（另一套生命周期 + 通道——否）；自写第四份 agent（KD-SV-78 已否）；白名单围栏（15:02 用户已撤——否） |
| KD-SV-87 | **模型选择 = 任务提交时选择**（下拉源 = provider 注册表；缺省 = 最近一次成功所用——机械读法 = `GET /api/admin/agent/chats` 倒序首行 `model`；该模型不在下拉源 ⇒ 空选；「成功」位 = 数据面无（题设近似——如实登记，不引入新位）；无模型 ⇒ 不可提交）；**收正（chat-shell-align 批——2026-10-11）**：**会话内可换**（明选即换 ∥ 下回合生效——KD-SV-108） | 显式可见（零隐藏缺省）∥ 零新配置项（免「每配置项有 UI 写入口」新面）∥ 每次运行留痕；会话内可换 = 用户 21:55「补后端一件不藏」直推（模型钮面原子已在——后端补齐） | 配置项 `agent.model`（新配置面 + UI 落点无自然位——否）；固定取首家 provider 首模型（静默任意——否）；会话内不换（被 21:55 裁定推翻） |
| KD-SV-88 | **聊天式驱动 = 管理面 chat 会话（§11——本批）**：① 会话（chat）= 模型选定（建会话时——KD-SV-87 同口径）× 消息序（库两表——KD-SV-89）；② 回合（turn）= 用户发一条 ⇒ agent 环跑到自然结束/预算封顶——**执行不依赖浏览器连接**（流 = 视图；断连照跑）；③ 流式通路 = `POST …/messages` 单请求 + `application/x-ndjson` 帧流（`delta` ∥ `call` ∥ `result` ∥ `end`；**chat-shell-align 批扩**：`turn` ∥ `usage` + `end` 两可字段——§11.3：浏览器 fetch + `ReadableStream` 逐行读）；④ 预算 = 每回合独立（20 分钟 ∥ 60 调用——与任务式同常量）；⑤ 判权 = `requireAdmin` 全族 | 需求 §5「两个 chat 界面」④（形态落点 = 本设计轮）+ 用户「浏览器流式会话通路」点名；单请求 POST = 写入与执行同跳（零孤儿流 ∥ 判权一次）；NDJSON = 每行一帧零壳（较 SSE `data:` + 空行双层无增益）；执行不依赖连接 = 与「读时单源」先例同拍（刷新/换设备不丢回合）；预算常量复用 = 同一环保险丝（KD-SV-83 同源） | `EventSource`（GET-only——不能 POST 报文体 ∥ 自动重连语义无用途）；SSE-over-fetch（可用——`data:` 帧 + 空行分隔 = 无增益壳）；WebSocket（双向机制超需求 ∥ 服务端需自持升级/hub——面外）；轮询（部分 token 不可达——违「流式」点名）；双请求（POST 起跑 + GET 挂流——孤儿流/二次判权面）；任务式复用（run 语义 = 单目标 + `report` 终态——chat 无 report，回合自然结束）；会话内存态（刷新即失——否） |
| KD-SV-89 | **会话持久化 = v14 两表 + OpenAI 消息形 + notice 行 + `status` 在途标记（重启如实收尾）**：`agent_chats`（`status` = `idle`/`running`——在途标记） + `agent_chat_messages`（`role` = `user`/`assistant`/`tool`/`notice` ∥ `content`（工具结果 = 模型可见形——按任务面口径截断 ≤4000 字：回放逐字一致）∥ `data_json`（`toolCalls` ∥ `toolCallId`/名/摘要）∥ 序）；消息**逐条增量落库**；回放 = 库行装配为模型消息数组（notice 滤除）；**重启** ⇒ `running` ⇒ `idle` + notice 行 + `chat_stop` 审计（KD-SV-86 口径） | 聊天上下文 = 长消息序（单列 JSON 每回合全量重写——写放大）；行式 = 逐条增量 + 读面直取；`role` 枚举落 CHECK（形单源）；在途标记落库 = 刷新/多标签页一致（进程内存态不作判据——KD-SV-80/86） | 单档 JSON 列（写放大 ∥ 并发回合难对齐）；纯内存会话（刷新即失/重启悬挂——否）；复用核会话档（KD-SV-78 引核面 = provider/环——server 专有存储自持；核 = 本地文件面）；复用 `sandbox_onboarding`（域错——沙盒任务 ≠ 管理面 chat）；消息删除/重命名/归档面（未裁——不做） |
| KD-SV-90 | **工具面扩展（管理面七件——§12）**：`members`（六动词）∥ `providers`（五）∥ `models`（五）∥ `usage`（`summary` ∥ `rows`）∥ `audit`（`query`）∥ `runners`（`list` ∥ `add` ∥ `remove`）∥ `docker`（十动词——**绑定 = 注册节点**：名∥地址经 `sandbox_runners` 查行；未在册 ⇒ 工具级错误回灌）；逐面回指控制台功能点（§12 表）；**进程内直取域件**（KD-SV-82 口径延续——零 HTTP 回环）；写链与路由**同函数**（provider/成员路由内联体提取共享助手——两调用点单源）；`exec`（SSH）**不入 chat**（凭据 = 任务表单专有——KD-SV-84 面不破）；节点排空/禁用随控制台同批长（未落——不发明） | 需求 §5「工具面 = 覆盖控制台既有全部管理面……能力逐步长」+ 用户 22:28「server 的管理能力也应该托管给 agent，比如成员管理，provider 管理，模型选择，用量等等」；「控制台与 agent 走同一套调用」口径镜像（docker 面）；进程内直取 = 判权/校验/审计单源（HTTP 回环 = 双判权 + 凭据面重造） | 任务五件直接复用（凭据/单主机绑定语义不合——否）；经 HTTP 打自家 admin 端点（双判权/回环——否，KD-SV-82 先例）；每动作一工具（工具数爆炸——面内动词沿 docker 先例）；docker 不接（机队/排障面缺口——否）；docker 任意地址（机队语义 + 误打面——否）；chat 内收 SSH 凭据（凭据纪律面——另裁才可） |
| KD-SV-91 | **审计型面 = 新 `agent_event`（v14 CHECK 扩型——十三型）**：kind = `chat_start`（会话创建）∥ `chat_call`（每工具调用——逐调用：工具名 ∥ 调用摘要 ∥ 结果码 ∥ 摘要；**读动作同落行**）∥ `chat_stop`（异常收尾：预算超限 ∥ 模型错误 ∥ 空回合 ∥ 重启中断 ∥ 手动中止）；正常回合终 = 无附加行（调用行 + 会话档已足）；**不双记**既有域型（agent 建成员 ⇒ 只 `chat_call` 行）；detail 掩蔽口径 = 沿任务面（秘密掩蔽 + 摘要截断） | 跨域动作面（members/providers/models/usage/audit/runners 六域）——单一型 + kind 区分（既有型面逐域枚举扩不动）；「每次动作落审计行」= 用户口径（含读动作——沿任务面沙盒先例）；不双记 = 一动作一行（审计页可读性 + 计数诚实） | 复用 `sandbox_event`（名不符实——非沙盒动作）；逐域既有型（读动作/模型设置等无型可落——枚举爆炸）；不落审计（违用户口径——否）；turn 级行（每回合一行 = 噪声——调用行已足） |
| KD-SV-107 | **回合中止 = 协作式双通道**（chat-shell-align 批——用户 21:55「补后端一件不藏」）：进程内登记表 + ① AbortSignal 透传模型出口（核 `chat(..., { signal })`——`thincoder-core/provider/core.mjs:118`）∥ ② 环内检查点（每模型调用前 ∥ 每工具调用前）；终态 = 第五形 `"aborted"`（notice + `chat_stop` 审计 + `end` failed；部分文本如实落库）；`finally` 清登记（零泄漏）；重启天然空（零持久化）；idle 态 abort ⇒ 400 人话（零副作用） | 在途调用可当即中断（signal 通道 —— 核已在册——不自造）；工具循环内（检查点）；「执行不依赖连接」口径不破（登记表 = 进程内）；单条审计行（不双记） | 仅轮询检查点（长回复不可中断——手感差——否）；子进程/Worker 抢占式（超机制——否）；落库式中止位（重启后残留——否）；新建端点携带中止语义（职责混——否） |
| KD-SV-108 | **会话内换模型 = 明选即换（下回合生效）**——KD-SV-87 收正（chat-shell-align 批）：端点 = `PATCH /api/admin/agent/chats/:id { model }`（`requireAdmin` ∥ `assertChatModelAvailable` 同判 ⇒ 400）；库 = `agent_chats.model` 既有列（零迁移）；在途回合零触（`runChatTurn` 起跑读行——`thincoder-server/src/agent/chat.mjs:352`/`:414`）；零审计行（KD-SV-91 三 kind 不扩） | 用户 21:55「补后端一件不藏」——核模型钮面原子已在（控制台补齐后端）；明选即换 = 零新配置面；下回合生效 = 零历史改写；零迁移 = 最小面 | 「换 = 新建会话」（逐次新建碎片化——否）；在途回合改模（半回合换模型——不可解释——否）；新增审计 kind（三 kind 面已定——零行处置） |
| KD-SV-109 | **附件面 = 文本档零后端 + 图片随消息行存（视觉门在服务端）**（chat-shell-align 批）：文本档 = 纯客户端（核 `thincoder-render-core/composer/attach.mjs` 三限 + `withAttachedFiles` 内联——服务端零新面）；图片 = POST `images`（dataURL 列）⇒ 服务端核 `parseDataUrl`（栅格四型 ∥ ≤`IMAGE_MAX_BYTES` 15MB）+ 核 `isNonVisionModel` 视觉门（⇒ 400 人话）；库 = user 行 `data_json.imageParts`；回放 = content 数组（非视觉历史由核 `stripImagesForTextModel` 兜底——`thincoder-core/provider/core.mjs:133`；历史图预算 = 核 `capHistoryImages`——`:135`——服务端零重复）；详情仅 `imageCount`（dataURL 零下发） | 核件阀单源（15MB/30MB、四型——不自造）；服务端复校 = 不信任客户端（直 POST 同验）；零文件面 = 最小落法；详情零下发 = 体量面；两壳同形（VSC 同机制） | 新建上传端点/文件存储（新面——否）；客户端缩放/压缩（核件无——否）；存磁盘路径（新生命周期——否）；详情回传 dataURL（体量——否） |
| KD-SV-110 | **会话级思考档位 = 库列 + 设置路由 + 装配携值（三件一套）**（console-reasoning-levels 批——2026-10-12；功能点 42 ∥ AC-42；口径四条经用户 11:46 核准）：① **存储** = `agent_chats.reasoning TEXT`（v16 增段——列级 `ALTER`，表不重建；NULL = 未设）+ 换模型随写清；② **设置** = `PATCH /api/admin/agent/chats/:id` 扩为会话设置面——体一次一件（`{ model }` ∥ `{ reasoning }`；同携 ⇒ 400）——`reasoning` 值域 = 核同一枚举（`specForModel(上游).reasoningEffortEnum`——会话 `model` = 对外标识 ⇒ **先经别名反查解上游真名**（`providers.mjs` 别名索引——KD-SV-59）；表外 400 ∥ `null` = 清）；③ **装配** = 回合起跑读行（与 `model` 同点）⇒ 值 ∈ 枚举（解析径同 ②）⇒ provider 配置携 `reasoningEffort`（核载荷门单源消费）；未设 ∥ 表外 ⇒ 零字段（读侧容忍——沿核会话槽「表外串不动」先例，防规格表变更砖死存量会话） | 口径③（会话级——与模型同层存；切会话各自记住）+ 口径②（默认不设 + 换模型回中性）；**零迁移**（存量行 NULL = 今日行为逐字同）；核单源（值域/载荷门/off 语义全在核——服务端零第二份档位语义） | 新表/新会话档（两表语义重叠——否）；浏览器本地存（切设备/重开即失——违会话级）；逐条覆写（VSC per-message 参——口径③会话级，否）；复用 `model` 列拼值（解析歧义——否）；内存态（重启即失——违 KD-SV-89 落库口径，否）；统一兜底枚举（口径①驳回——无档必须中性）；别名模型档位面退中性（口径①——别名所指上游有档即给，驳回） |

| KD-SV-112 | **环境块装配 = 四块（三活体尾位瞬态行 ＋ 简报第四块）＋ 块级降级**（admin-agent-awareness 批——2026-10-12）：① 每回合（请求）造三活体行——时空 ∥ 所在/身份 ∥ 所管现况一行（域件进程内直取）；② **尾位**（历史与本轮消息之后——沿核 `thincoder-core/agent/setup.mjs:176-185` 前缀缓存理由）＋**瞬态**（不落库、不进回放——值随实况的直接后果）；③ 降级 = **块级略去**（该块任一读失败 ⇒ 整行缺席、回合不阻断；无半真值上屏）；④ 第四块「能力与边界」= 简报静态段 ＋ 活体面（`tools.schemas`）；⑤ timer 到期行随组同落 | 需求 43①②（值随实况 ＋ 读失败降级不阻断）；三端对位 = 核回合尾位注入/瞬态不落人读线（`pushEnvStateReminder` 先例）；瞬态 = 零迁移 ＋ 回放口径零破（KD-SV-89）；块级 = 「该块降级略去」字面读法 | 落库式（旧值冻结 ＋ 回放污染——否）；系统简报内逐回合拼动态串（简报 = 静态常量面——否）；逐字段降级（字面不符 ＋ 半真值——否）；注入 system 槽（核同判：瞬态行走 user 行——否） |
| KD-SV-113 | **环境工具面 = 核件复用（五族七件）＋ 结果归一 ＋ 服务面限幅**（admin-agent-awareness 批——2026-10-12）：① 件 = `get_current_time` ∥ `process` ∥ `timer` ∥ `ls` ∥ `read` ∥ `grep` ∥ `bash`——**核工具对象原文复用**（实现 ∥ schema ∥ 描述三面同源；动载 `@thincoder/core/tools/*` ＋ `agent-tools/timer.mjs`——沿 `loadCoreChat` 先例）；② ctx 适配 = `{ cwd, signal, agent: timer 垫片, depth: 0 }`（`cwd` = `deps.cwd ?? process.cwd()`；`signal` = 回合中止信号透传 ⇒ bash 树杀）；③ 结果归一 = `{ ok, subject, summary, output }`（`ok` = 调用完成〔未抛错〕——命令退出码在输出文本内，不解析；`subject` = 主语原文——审计数据源）；④ 限幅三件（§14.3）：超时（缺省 120s = 核常量 ∥ 上限 600000 ms——逾限 ⇒ 工具级错误）∥ 输出（工具层 200K 字/2MB 流 ⇒ 落库形 ≤4000 字〔KD-SV-89 单源〕⇒ 帧/审计摘要 ≤300 字）∥ 工作目录（无路径围栏——如实披露）；⑤ 端池参数处置 = `bash.async` 显式拒 ∥ `process.kill` 的 `id` 靶自然报错；`kill pid` 在册（与 bash 等价） | 「对齐三端」= 同件同语义（自写一套 = 第二份漂移面——KD-SV-78 同判）；限幅 = 需求 43⑤ 明文，值取核内既有常量/惯例（零新口径）；结果归一 = chat 面既有 `{ ok, … }` 形；`subject` = 审计「命令原文/路径」的钱货（需求 43⑥） | 自写服务端工具（三端漂移——否）；核件 schema 收窄（第二份面——否，端池参数运行期处置）；`bash` 无上限（无人值守跑飞面——否）；JSON 形回文本（模型可见形失真 ＋ 耗预算——否）；解析退出码映射 `ok`（第二份输出格式语义——否） |
| KD-SV-114 | **工具动作审计 = 详情扩字段（`subject` ∥ `truncated`）＋ 审计页按型模板**（admin-agent-awareness 批——2026-10-12）：① 落面 = 既有 `chat_call` 行（KD-SV-91 面不扩——零新型/零新 kind）；`detail` 增 `subject`（主语原文 ≤2000 字——命令/路径；逾限截断并注记）∥ `truncated`（**结果可见形**被截断〔`capToolContent` 触发〕）；成败 = 既有 `resultCode`；② 页面 = `views-audit.mjs` 增 **agent 行详情模板**（`tool · subject · 成败 · 〔截断〕 · summary`——非裸 JSON）＋ 三文案键（`audit.agentOk` ∥ `agentFail` ∥ `agentTruncated`——两表同步） | 需求 43⑥（每次调用一行 ＋ 命令原文/路径 ＋ 成败 ＋ 截断态 ＋ 页面可读）；`detail` = JSON 面 ⇒ 零迁移零 CHECK 改；页面模板 = 沿沙盒 `kind` 族先例（按型渲染） | 裸 JSON 直显（需求明文禁——否）；新审计型/新 kind（枚举面不动——否）；command/path 塞进 `call` 串（页面要解 JSON——「非裸 JSON」的实义就是结构化字段——否）；`subject` 无上限（审计表体量失控——否） |

## 10. 本域边界（不做的面）

- **权限模型/围栏改造**（admin 权限管理归用户——12:47 裁；本面只保证留痕：每次工具调用一审计行）。
- **路径围栏 ∥ 命令白名单**（不设——沿核口径：`resolveInCwd` 无边界断言 ∥ bash 无命令过滤；如实披露 = 任一 admin 成员可经对话页在服务器跑命令/读文件〔含密钥与库文件面〕——需求 43 风险在册）。
- **三端无对应物项**（cwd ∥ git 上下文 ∥ 项目档注入 ∥ 同目录实例——需求 43 边界句；服务端无该物）。
- **timer 自动开轮 ∥ 定时/事件触发任务**（无空闲唤醒面——提醒只在下一回合开场投递；不自动开轮、不常驻——§14.4）。
- **后台任务面**（`bash async` ∥ 后台任务池——无人值守面无驻留池；显式拒）。
- **文件编辑族工具（write/edit/apply_patch）**（不入册——写入仍可经 `bash` 抵达，工具面如实；核 `bash` 描述指向 edit 族的指引在本面落空 = 核文案面发现项，§13 R62③）。
- **成员面 agent 的 server 域工具面**（归属随 **#1215（成员面 chat 轮）**——本档不改 16:04 口径）。
- **chat 面不做（§11/§12）**：SSH 凭据经 chat 文本输入（装机凭据 = 任务表单专有——KD-SV-84）∥ 会话删除/重命名/归档 ∥ 会话自动清理（保留口径未裁——不设清零）∥ 工具面机制确认门（破坏性动作先说明 = 提示词级纪律——如要机制门另裁）∥ 沙盒工作区/规则/待批/设置各面工具（随沙盒余面批同批长）∥ 节点排空/禁用工具（控制台侧未落——不发明）∥ **思考档位的逐条覆写/状态行段**（console-reasoning-levels 批——口径③④恒会话级；`✦reasoning` 零引用）。
- **多任务编排/队列**（并发上限 = 1 个/主机在途；跨主机并行未定形）∥ **任务中途取消** ∥ **定时/事件触发任务**（触发源现 = 管理动作）。

## 11. 聊天式驱动（管理面 chat——本批）

- **形态**：管理面 chat = 管理面 agent 的第二驱动形态（任务式之外的常设对话面）——浏览器侧 = 控制台页 `#/admin/chat`（`webui/CHAT.md` §2.1）；用途 = 运维/管理（托管接入 ∥ 机队 ∥ 成员与 provider ∥ 审查排障——**非开发用途**；需求 §5「两个 chat 界面」②）。与任务式同 agent 同源：同一工具面框架（§3 + §12 + 环境五族七件 §14）、同一审计面、同一模型出口（§5）。
- **会话（chat）**：`model`（建会话时选定——KD-SV-87 同口径；**会话内可换**——明选即换、下回合生效（chat-shell-align 批收正 = KD-SV-108））+ 消息序（库两表——KD-SV-89）；列表/详情 = 读时读（无后台常驻）。
- **回合（turn）**：用户发一条 ⇒ 装配 = 系统简报（管理面用途句 + 行动纪律句 + 能力边界段——§14.1 第四块）+ 历史重放（含图——KD-SV-109）+ 本轮消息 + **环境块**（三活体行 + timer 到期行——尾位瞬态、不落库；§14.1）⇒ agent 环（多轮工具循环——与任务式同一环）跑到自然结束。
  终止**五形**：① 模型无工具调用（自然结束——`succeeded`）；② 预算超限（20 分钟 ∥ 60 调用——**每回合独立计**）；③ 模型出口抛错；④ 空回合（无文本无调用）；⑤ 手动中止（chat-shell-align 批——`"aborted"`；KD-SV-107）。
  ②③④⑤ ⇒ notice 行（人话；`data.reason` 各点名：② `"budget"` ∥ ③ `"model_error"` ∥ ④ `"empty_turn"` ∥ ⑤ `"aborted"`；人话文本 = `content` 面）+ `chat_stop` 审计 + `end` 帧 `failed`；②③⑤ 下已生成文本 ⇒ `assistant` 行如实落库（部分文本——回放逐字一致；与 notice 行各自一行），零文本 ⇒ 零 `assistant` 行。
- **流式通路**（KD-SV-88）：`POST /api/admin/agent/chats/:id/messages` 单请求；响应 = `application/x-ndjson` 帧流（每行一帧）：`{"type":"delta","text"}`（模型文本增量——核 `onToken`）∥
  `{"type":"call","id","name","args"}`（工具调用开始——`args` = **字符串**（参数摘要——JSON 序列化 ⇒ 掩蔽后截断 ≤500 字；恒为字符串，非对象））∥ `{"type":"result","id","ok","summary"}`（结果摘要 ≤300 字）∥ `{"type":"end","status","reason"?}`（回合终态）∥ **本批扩**：`turn` ∥ `usage` ∥ `end` 两可字段——**帧形全文 = §11.3**。
  **执行不依赖连接**（断连照跑——落库单源；页刷新/重开重读会话详情形即全量）。流前错误（判权/形/在途/不存在）= 统一信封；流中失败 = `end` 帧（headers 已发——不再走信封）。
- **在途门**：同会话 `status = running` 期间再发 ⇒ 400 人话（「本会话正在执行——等它结束」）；跨会话并发不设限（未裁——不发明）。
- **重启恢复**（沿 KD-SV-86 如实收尾）：启动装配期 `running` ⇒ `idle` + notice 行（「server 重启——本轮中断」；`data.reason` = "restart"）+ `chat_stop` 审计行；已落库消息零动。
- **判权与审计**：四端点全 `requireAdmin`（界面显隐非判据）；审计 = `agent_event`（KD-SV-91——`chat_start` ∥ `chat_call` 逐调用 ∥ `chat_stop` 异常收尾）。
- **行动纪律句（系统简报内——提示词级，非机制门）**：先查后动（读数先于动作）∥ 结果用逐句人话 ∥ 破坏性动作（删节点 ∥ 吊销凭据 ∥ 重置密码 ∥ 删 provider ∥ 停模型）先说明将做什么、再执行 ∥ 不确定 ⇒ 问用户。如需机制级确认门 ⇒ 另裁（本批不做——§10）。
- **测试注入缝**（§7 批内件判据依托）：模型出口 ∥ 工具面 = 模块级注入（setter ∥ 参数覆盖——默认 `null` ⇒ `??` 回落真件，生产行为不变；沿 `sandbox/SANDBOX.md` §13 `fetchImpl`/`execImpl` 注入面先例）；控制台面假流桩 = `webui/WEBUI.md` §6 本批行。

### 11.1 呈现面（console-chat-align 批——2026-10-11）

- **渲染面 = 复用渲染核**（本域零新增机制；用户 18:23 指出「第四套 chat」+ 18:30「改」）：管理面 chat 的呈现面（markdown ∥ 代码块高亮 ∥ 工具卡 ∥ 流式增量 ∥ 滚动行为）由 `thincoder-render-core` 承载（取件形 = 控制台静态面第二根 `/rc/*`）；对齐集与做/不做逐项 = `webui/CHAT.md` §2.1 ∥ 决策 = 该档 KD-SV-101。
- **本域零变化**：会话 ∥ 回合 ∥ 帧流四形 ∥ 消息 role 四值 ∥ 工具面 ∥ 审计面均不动（呈现面 = 控制台侧消费面）；**帧面/落库面无 reasoning 文本通道**（思考块 = 模型思考文本——与思考档位 `reasoningEffort`（请求参）无关，后者 = KD-SV-110） = 呈现面不做思考块的根因（加文本字段 = 本域面——余项，不在本批）。
- 工具卡呈现 = 核件 `renderToolCard` ∥ `finishToolCard`（失败判定 = 核 `isToolFailure`）；工具行语义面（§12 表）不变。
- **输入区全件翻做**（chat-shell-align 批）：面板 ∥ 控件行 ∥ 附件 ∥ 斜杠 ∥ 模型菜单五件均入呈现面；适配层与无源钮收窄 = `webui/CHAT.md` §2.1③；四件控件后端 = 本档 §11.2。

### 11.2 输入区四件后端（chat-shell-align 批——2026-10-11）

- **① 会话内换模型**（KD-SV-108——KD-SV-87 收正）：端点 = `PATCH /api/admin/agent/chats/:id`（体 `{ model }`——`requireAdmin`；模型校 = `assertChatModelAvailable` 同判 ⇒ 400 人话）；响应 = 200 `{ chat: { id, model, status, createdAt, updatedAt } }`（同建会话行形）。
  - 库 = `agent_chats.model` 既有列（零迁移）；语义 = **明选即换、下回合生效**（在途回合零触——`runChatTurn` 起跑读行（`thincoder-server/src/agent/chat.mjs:352`）∥ 出口于回合内装配（`:414`））；零审计行（KD-SV-91 三 kind 不扩——换模型 = 会话设置面；如要留痕另裁）。
- **② 附件**（KD-SV-109）：**文本档** = 纯客户端（核 `thincoder-render-core/composer/attach.mjs` 三限（单档 256KB ∥ 每回合 4 个 ∥ 合计 512KB——**值以核件为单源**）+ `withAttachedFiles` 内联进 `content` 文本）——**服务端零新面**；**图片** = 随 POST 体 `images`（dataURL 列）：
  - 服务端校验 = 核 `attachments.mjs` 单源：`parseDataUrl`（栅格四型 png/jpg/gif/webp ∥ 单图 ≤ `IMAGE_MAX_BYTES` 15,000,000）——不合 ⇒ 400 人话；视觉门 = 核 `isNonVisionModel(model)`（规格表单源）⇒ 非多模态 ⇒ 400 人话（「当前模型不支持图片输入」）；流未起（信封形）。
  - 落库 = user 行 `data_json.imageParts`（parts 形：`[{ type: "image_url", image_url: { url: dataURL } }]`——回放直取）；**详情响应仅 `imageCount`**（dataURL 零下发——体量面；`messageView` 收口）。
  - 回放 = `replayMessages` 重建 content 数组（`[{ type: "text", text }]` + parts——非多模态历史由核 `stripImagesForTextModel` 兜底（`thincoder-core/provider/core.mjs:133`）∥ 历史图预算由核 `capHistoryImages`（`:135`）——**服务端零重复实现**。
  - 边界：图片零文件面（无缩略图/下载/文件存储——dataURL 随行存；体量口径 = 披露）。
- **③ 回合中止**（KD-SV-107）：端点 = `POST /api/admin/agent/chats/:id/abort`（`requireAdmin`；`chatRowOr404`；会话非 `running` ⇒ 400 人话（「本会话不在执行中」）——零副作用）；响应 = 200 `{ ok: true }`（终态经流/详情呈——本响应只言「已请求」）。
  - 机制 = **进程内中止登记表**（`Set<chatId>`——`requestChatAbort` ∥ `isChatAbortRequested` ∥ `clearChatAbort`；`chat.mjs` 模块级——零持久化，重启天然空）+ **双通道生效**：① `AbortSignal` 透传模型出口（核 `chat(..., { signal })`——`thincoder-core/provider/core.mjs:118`；在途调用当即中断）② 环内检查点（每模型调用前 ∥ 每工具调用前——协作式，非抢占）。
  - 收尾 = 沿异常收尾径（notice `"aborted"` + `chat_stop` 审计 + `end` 帧 `failed`）+ `finally` 清登记（零泄漏）；审计行 = 一条（`chat_stop` reason `"aborted"`——中止请求本身零审计行，不双记）。
- **④ 斜杠命令表**（控制台装配——核 `composer/slash.mjs` 机制单源）：`/model`（⇒ 开模型菜单——同钮同函数）∥ `/new`（⇒ 新会话弹窗）∥ `/help`（⇒ `formatHelp` 行集就地打印）；别名 `/m` ∥ `/n` ∥ `/h`（CLI `SLASH_ALIASES` 键集内）；**表纪律** = 不得自创命令名（名 ⊆ CLI `SLASH_COMMANDS` 名集）；未知 ⇒ 核 `slash.unknown` toast（文本保留不发送）∥ 带参 ⇒ 核 `slash.args` toast。

### 11.3 帧面扩展与状态行读数源（chat-shell-align 批——2026-10-11）

- **加性扩展**（既有消费零破——`end` 增可字段；新帧 = 新 type）：
  - `{ "type": "turn", "n": 1 }`——每模型调用前发（n = 本回合第 n 次调用）；
  - `{ "type": "usage", "prompt": N, "completion": N, "cacheHit": N, "cacheMiss": N }`——每次模型调用返回且 `turn.usage` 在场（缺 ⇒ 零帧——**有源才发**）；
    值 = 核 `usage.{prompt_tokens, completion_tokens, prompt_cache_hit_tokens, prompt_cache_miss_tokens}`（`thincoder-core/provider/core.mjs:306-312` 聚合形；核 usage 无 reasoning 计数 ⇒ 状态行 ✦ 段不做）；
  - `end` 帧 + `durationMs`（回合耗时）∥ `calls`（工具调用数）——可字段。
- **零落库**：帧面 = 视图面（读时单源 = 消息行不变——刷新后状态行清空重算）；状态行读数项表 = `webui/CHAT.md` §2.1④（消费面单源）。

### 11.4 会话级思考档位（console-reasoning-levels 批——2026-10-12）

- **归属与形**（口径③——用户 11:46「行」）：档位归**会话**（与 `model` 同层）——库列 `agent_chats.reasoning`（v16 增段；NULL = 未设）；`chatView` 行形携 `reasoning`（建会话回执 ∥ 列表 ∥ 详情 ∥ PATCH 回执四面同源）。
- **值域源 = 核单源**：`thincoder-core/model-specs.mjs` `specForModel(上游真名).reasoningEffortEnum`（前缀匹配 + 命名空间剥离同核）——服务端桥件 `thincoder-server/src/gateway/reasoning-levels.mjs`（拟新增——懒载 `@thincoder/core/model-specs.mjs` + 缓存；`levelsOf` ∥ `modelReasoningMap` 稀疏图）；
  **标识解析径**（会话 `model` = 对外标识——别名 ∥ `provider/model`；KD-SV-59）：**先解上游真名再取枚举**——反查 = `thincoder-server/src/gateway/providers.mjs` 别名索引（`createAliasIndex().lookup(外标)` ⇒ `{ provider, model: 上游真名 }`——「读面回映射」同源件，保存换表随动）；**源面行 ∥ PATCH 校验 ∥ 回合装配三处同经此解析**（别名模型 = 别名所指上游的枚举——不另退中性）；
  **零第二清单**（不落库档位词表）；**模型列表下发** = `GET /api/admin/providers` 每行 `modelReasoning`（键 = 上游真名——与 `settings`/`modelMeta` 同键空间；无档模型零键）；**缺核**（本开发机未装包——`thincoder-server/node_modules` 无 `@thincoder/core`）⇒ 空图 + 一条警告（档位面退中性；生产 = 核为声明依赖）。
- **设置路由**（口径②）：`PATCH /api/admin/agent/chats/:id` 扩为**会话设置面**——体一次一件（`{ model }` ∥ `{ reasoning }`；同携 ⇒ 400 人话）：`model` 在场 ⇒ 换模型 + **档位清 NULL**（换模型回中性——同一写）；`reasoning` 在场 ⇒ `null`（清）∥ 字面 ∈ 当刻模型枚举 ⇒ 落库，否则 400 人话；判权 = `requireAdmin` 沿用；**零审计行**（KD-SV-91 三 kind 不扩——沿 KD-SV-108）。
- **回合装配**：`runChatTurn` 起跑读行（与 `chat.model` 同点——在途回合零触；沿 KD-SV-108 口径）⇒ 行值 ∈ 当刻模型枚举 ⇒ `buildChatExit` 出口 provider 配置携 `reasoningEffort`（核 `thincoder-core/provider/core.mjs` 载荷门/枚举门/路由形守门单源消费）；**未设 ∥ 表外 ⇒ 零字段**（与今日行为逐字同）；表外 = 读侧容忍（不炸、不改行——沿核会话槽「表外串不动」先例）。
- **控制台面**（源下发消费 ∥ 钮面启用 ∥ 无档模型中性）= `webui/CHAT.md` §2.1③⑤（KD-SV-111）；**不做** = 本档 §10（逐条覆写 ∥ 状态行段）。

## 12. 工具面扩展（管理面七件——本批）

**口径**（KD-SV-90）：逐面回指控制台功能点 ∥ 进程内直取域件（零 HTTP 回环——KD-SV-82 延续）∥ 写链与路由同函数（单源）∥ 每次动作落审计行（读动作同落）∥ 无白名单围栏（KD-SV-82 口径不破）。

| 工具 | 形（动词） | 实现面（域件） | 回指（控制台面） |
|---|---|---|---|
| `members(op, …)` | `list` ∥ `create` ⟮username/name/role⟯ ∥ `reset_password` ⟮member⟯ ∥ `revoke_key` ⟮member/keyId⟯ ∥ `set_quota` ⟮member/quotas 键级合并⟯ ∥ `set_disables` ⟮member/disables 键级合并⟯ | `accounts/members.mjs`（`createMember` ∥ `setMemberPassword` ∥ `mergeMemberModelQuotas` ∥ `mergeMemberModelDisables`）∥ `accounts/keys.mjs`（`revokeKey`）∥ 重置链 = 改密 + 清计（`guard.clearUsername`——装配面注入 ∥ 与路由同效：共享助手边界 = **改密 + 清计**两件；审计写不随迁——`recordAudit` 各留调用侧既有面（路由侧 = `password_reset`（`accounts/ACCOUNTS.md` §2.1）∥ chat 侧 = 只 `chat_call` 行——KD-SV-91）） | 成员页/弹窗（功能点 15④ ∥ 23②）；端点 = `gateway/API.md` §3 |
| `providers(op, …)` | `list` ∥ `add` ⟮全字段⟯ ∥ `update` ⟮字段级（`settings` 键级合并）⟯ ∥ `remove` ⟮id⟯ ∥ `discover` ⟮baseURL/apiKey/providerId/proxy⟯ | `thincoder-server/src/gateway/provider-admin.mjs`（校验单源 `validateProviderEntry` ∥ 候选注册表 ∥ `runtime` 换表）——路由内联写链提取共享写函数（两调用点单源）；发现 = 同探针件 | Provider 页（功能点 18/AC-11；端点 = §2.2） |
| `models(op, …)` | `list` ∥ `enable` ⟮provider/model——加开放⟯ ∥ `disable` ⟮减项（退役可停）⟯ ∥ `settings` ⟮rpm/tpm/costIn/costOut/note/quotaTokens 键级合并⟯ ∥ `alias` ⟮设置/清除（含唯一性校验）⟯ | 同上写链 + `settings` 合并件（`mergeProviderSettings`） | 服务模型页（功能点 17/29——A/C/D/E/F/G 面） |
| `usage(op, …)` | `summary` ⟮member/model/endpoint/from/to⟯ ∥ `rows` ⟮同上 + limit ≤100⟯ | `thincoder-server/src/metering/report.mjs`（`usageSummary`）∥ `metering/usage.mjs`（`queryUsage`——与端点同过滤构建器） | 管理·用量页（功能点 15②；端点 = §3） |
| `audit(op, …)` | `query` ⟮type/member/from/to/limit⟯ | `accounts/audit.mjs`（`queryAudit`——与审计页同过滤件） | 审计页（功能点 15④——`accounts/ACCOUNTS.md` §2.1） |
| `runners(op, …)` | `list` ∥ `add` ⟮name/address——连通自检 + 落行⟯ ∥ `remove` ⟮id/containers（keep∥remove）/confirm⟯ | `sandbox/registry.mjs`（`insertRunner` ∥ 读行）+ 删除链（容器处置 ∥ 承载确认 ∥ 工作区解绑 + 续放置——与控制台同函数同效） | 沙盒页·运行面（`webui/SANDBOX.md` §2.1①——最小切片；端点 = §2.5） |
| `docker(host, op, args?)` | 同任务面十动词（version ∥ info ∥ ps ∥ images ∥ pull ∥ create ∥ start ∥ stop ∥ rm ∥ logs）——**绑定 = 注册节点**（名 ∥ 地址经 `sandbox_runners` 查行；未在册 ⇒ 工具级错误回灌） | `sandbox/docker.mjs`（`createDockerClient`——与控制台容器面同一客户端）+ `thincoder-server/src/agent/docker-ops.mjs`（拟新增——admin-agent-chat 批；十动词执行器——两驱动单源） | 沙盒页·容器区（`webui/SANDBOX.md` §2.1①） |

- **不入 chat 面**：`exec`（SSH——凭据 = 任务表单专有，KD-SV-84 面不破）；装机（新主机）= 任务式（沙盒页托管接入弹窗）——chat 侧可读机队/装机成果（`runners.list` ∥ `docker` 读数），不收凭据。
- **随控制台同批长**（控制台侧未落——不发明）：节点排空/禁用 ∥ 沙盒工作区/规则/待批/设置各面工具（随沙盒余面批）。
- 工具结果形 = `{ ok, … }`（结构化；错误 ⇒ `ok:false` + 人话 message——回灌模型自纠，回合不停）。

## 13. 上抛/余项（本域——自板档 §9 迁入；R54 逐字；as-of 2026-10-11）

> 板档 `design/PROJECT.md` §9 同类行 = 保位 stub（指向本节）。

| # | 项 | 类型 | 处置建议 |
|---|---|---|---|
| R54 | **admin-agent-chat 批（本批）——需求档回笔 + 随正件 + 披露**：① 需求档回笔（主 agent 笔——§5「两个 chat 界面」②④ 的落点与 AC）：§2 增**功能点 37（管理面 chat——草案：会话/回合模型 ∥ 流式通路 ∥ 工具面七件 ∥ 审计型 ∥ 不做单）** + **AC-37 行**（判据 = §7 本批行——机制/端点/控制台/存储/审计五面指针）+ 标题计数随正 + 变更记录 ∥ AC-28 审计型数随正（十二 ⇒ **十三型**——`agent_event`）∥ AC-12/AC-14 管理项数 8 ⇒ **9** + 静态档目 31∥32 ⇒ **32∥33**（余面批 ⇒ 34∥35）∥ §5 成员面 chat 归属句随正（**#1215**——2026-10-10 16:04 裁）∥ ② 随正件（父侧落——实施轮同拍）：`views-audit` 型面数断言件 ∥ nav 计数件（管理 8 ⇒ **9**）∥ 档目断言件（`views-chat.mjs` 入列表——31∥32 ⇒ **32∥33**）∥ 门禁件数断言件（42 ⇒ **45**——本批三件入链；以实施当刻盘面实读为准）+ `thincoder-server/package.json`（同基数；逐件登记 = §6 注⑲）∥ ③ 披露（不阻塞）：chat 不收 SSH 凭据（装机 = 任务式弹窗——KD-SV-84 不破）∥ 会话无删除/重命名/清理（保留口径未裁——不设清零）∥ 回合无中途中止钮（预算封顶）∥ 破坏性动作「先说明后执行」= 提示词级纪律（机制级确认门未做——如要另裁）∥ 节点排空/禁用工具 = 随控制台同批长（未落——不发明）∥ 跨会话并发未设限（未裁）∥ ④ 部署收尾（父侧执行）：镜像重建 + 重收敛 + 浏览器实走（建会话 ⇒ 发一条 ⇒ 帧流 ⇒ 工具调用行 ⇒ 刷新重读） | 披露（上抛——如无异议按设计实施；部署收口 = 父侧） | 评审/用户复核 |
| R60 | **chat-shell-align 批（本批）——需求档回笔 + 随正件 + 披露 + 部署**：① 需求档回笔（主 agent 笔）——**已闭合**（2026-10-11：功能点 41 ∥ AC-41 入册——`docs/server/requirements/PROJECT.md` :225/:230；该档变更记录 :565「R60① 闭合」） ∥ ② 随正件（父侧/实施轮——以当刻盘面实读为准）：`2026-10-11-admin-agent-chat-ui.test.mjs` 静态面腿上量（档目链单源 = `webui/WEBUI.md` §1；现读 669 行——净变 ≤±50）+ 类名闭合腿 ∥ `2026-10-11-console-chat-align.test.mjs` 两腿收正——取件面白名单腿（本批新取件增列 `thincoder-render-core/flow/block.mjs` ∥ `thincoder-render-core/composer/panel.mjs`）∥ 「零 composer/reasoning 引用」口径（现读 450 行；净变 ≤±20；**本体零触**——腿面收正随实施轮）∥ `style.css`（五钮隐藏 + 别名块——`webui/STYLE.md`）∥ `views-chat.mjs` 拆档（新档入链）∥ 门禁件数断言（本批批内件）∥ `i18n-{zh,en}-admin` 行账（`webui/ADMIN.md` §3）∥ ③ 披露（不阻塞）：**R54 ③ 两项交付失效**（回合中止钮 ⇒ 已交付 = KD-SV-107 ∥ 会话内换模型 ⇒ 已交付 = KD-SV-108）∥ 图片随行存 dataURL（≤15MB/图 ∥ 30MB/回合——核阀单源；详情仅 `imageCount`）∥ 无源钮隐藏五枚（模式位/设置——无源实证；推理钮 ⇒ 已交付 = KD-SV-111）∥ `interrupt` 折法（中止 + 入队首——无注入通道）∥ 换模型零审计行（三 kind 不扩）∥ ④ 部署收尾（父侧）：镜像重建 + ECS 浏览器实走（四轴走查清单 = 批档 §2） | 披露（上抛——如无异议按设计实施；部署收口 = 父侧） | 评审/用户复核 |
| R61 | **console-reasoning-levels 批——披露 + 随正件 + 部署**：① 随正件（父侧/实施轮——以当刻盘面实读为准）：结构版本断言 **11 件**（设计轮枚举——**实盘收正 20 件**：+ `-console-modals` ∥ `-embedding-decouple` ∥ `-console-list-style` ∥ `-server-auto-update` ∥ `-console-layout` ∥ `-me-usage-charts` ∥ `-model-alias` ∥ `-runner-admin-console` ∥ `-runner-admin-console-agent` 九件——逐行坐标见批档 §5 ④；各一行 `SCHEMA_VERSION === 15` ⇒ `16`——数字就地收正 ⇒ 逐件行数 ±0；逐件现读：`…-server-gateway.test.mjs`（**495 行**——`:167`） ∥ `…-console-completeness-2`（**504 行**——`:152`） ∥ `…-me-keys-redo`（**370 行**——`:120`） ∥ `…-provider-model-metadata`（**494 行**——`:151`） ∥ `…-quota-per-model`（**447 行**——`:150`） ∥ `…-quota-v2-member-models`（**740 行**——`:167`） ∥ `…-server-console-config`（**795 行**——`:383`） ∥ `…-server-gemini-openai-preset`（**735 行**——`:263`） ∥ `…-team-login-client-access`（**305 行**——`:284`） ∥ `…-admin-agent-chat`（**716 行**——`:638`） ∥ `…-sandbox-image-sources`（**685 行**——`:599`））∥ `…-chat-shell-align.test.mjs:791`（隐藏腿六 id ⇒ 五 id）+ `:807`（零悬停扫描名单）∥ `…-admin-agent-chat.test.mjs:640`（`agent_chats` 列面五列 ⇒ 六列——`ORDER BY cid` 尾插）∥ 门禁件数（**56 ⇒ 57**——本批批内件入链）∥ ② 披露（不阻塞）：**开发机无 `@thincoder/core`** ⇒ 档位面退中性（`modelReasoning = {}` + 警告一条；生产镜像内核为声明依赖——若真缺核 ⇒ admin chat 回合本就不可用，同源失败、非本批引入）∥ **路由形模型名**（含 `/`）：核载荷门静默不发 `reasoning_effort`（VSC/桌面同态）——服务端/控制台不另立过滤（只读消费核单源）∥ 档位面零审计行（三 kind 不扩——沿 KD-SV-108）∥ `views-chat.mjs` 本批后 ≈498 ⇒ **实 500**（恰贴 500 软线；硬限 800 未越——拆档预案在案）∥ ③ 部署收尾（父侧）：镜像重建 + 浏览器实走（选档/换模型/切会话三径——批档 §2） | 披露（上抛——如无异议按设计实施；部署收口 = 父侧） | 评审/用户复核 |

| R62 | **admin-agent-awareness 批（本批）——需求档回笔 + 随正件 + 披露 + 部署收尾**：① 需求档回笔（主 agent 笔——**父侧已受理**：功能点 43③「（在线数）」与 43⑤ `process`「（看服务器进程——只读）」两括注收正——本设计轮上抛两条经父侧 2026-10-12 裁「均按设计倾向」）∥ ② 随正件（父侧落——实施轮同拍，以当刻盘面实读为准）：门禁件数断言件七件（**57 ⇒ 58**——本批件入链；注释/断言消息同拍）+ `thincoder-server/package.json`（`prepublishOnly` **57 ⇒ 58**——本批件入链；单行清单行数零变）；i18n 键集断言（system 两表 **+3 键/表**——等量 ⇒ 「键集相等」断言不破；如有计数断言 ⇒ 随正；以实施当刻盘面为准）；档目断言件 **±0**（零新档）；审计型面断言 **±0**（零新型/零新 kind）；旧断言件核（预计零——`chat-tools` 面零改：环境族 = 新档 `chat-env-tools.mjs`；待实施实读为界）∥ ③ 披露（不阻塞）：**核可达性结论 = §14.5**（依赖声明 ∥ registry 实核 0.10.4 ∥ 镜像两装径同经 npm 解析——前提 = 装机时 registry 可达，不可达 ⇒ 拒启 fail-loud）∥ **无路径围栏 ∥ 无命令白名单**（任一 admin 成员可经对话页在服务器跑命令/读文件——含密钥与库文件面；需求 43 风险在册）∥ **读文件内容不在掩蔽面内**（掩蔽只盖本轮入参敏感值；配置档内 apiKey 等可被读出——权限模型归用户）∥ `process.kill` 在册（含**杀 server 自身进程 = 操作者自伤面**——与 bash 等价）∥ `timer` 无空闲唤醒（提醒只在下一回合开场投递）∥ `bash` 非零退出不映射 `ok:false`（退出码在输出文本内——不解析）∥ 模型可见输出 ≤4000 字（`CHAT_TOOL_CONTENT_MAX`——读大文件用 offset/limit ∥ grep ∥ bash `filter` 收窄）∥ 核 `tool-docs/*.md` 指向本面不存在工具的指引（write/edit/git/repo_outline 族）落空——本批不改核文案（提示词单源；要改 = 主 agent 面另裁）∥ `chat.mjs` 越 500 软线续存（拆档预案 = §6）∥ ④ 部署收尾（父侧执行）：镜像重建 + 重收敛 + 浏览器实走（问「现在几点」「你管着几个节点」各一 + 时间工具一次调用 + 审计页看一行 `chat_call`——命令原文/路径可见） | 披露（上抛——如无异议按设计实施；部署收口 = 父侧） | 评审/用户复核 |

## 14. 环境感知与环境工具面（admin-agent-awareness 批——2026-10-12；功能点 43 ∥ AC-43 ①–⑥）

> 口径 = 用户 2026-10-12 12:29「管理面的agent现在没有环境感知能力，我希望这一块要对齐cli/vsc和桌面。」+ 12:39（工具面）∥ 12:41（读文件族 + `bash`）∥ 12:47（审计 + 权限归用户）三句；单源 = 需求 `docs/server/requirements/PROJECT.md` §2 功能点 43。

### 14.1 四块装配（时空 ∥ 所在/身份 ∥ 所管现况一行 ∥ 能力与边界）

- **装配形**：每回合（= 每请求）在 `runChatTurn` 起跑段造**三活体行**（+ timer 到期行），**尾插**于历史与本轮消息之后（沿核 `thincoder-core/agent/setup.mjs:176-185` 理由：秒级新值不进前缀——缓存保持命中）；**瞬态不落库**（不进 `agent_chat_messages`、不进回放——值随实况的直接后果；校验 = 回放逐字零含实况行）。
- 三四块逐字形（`chat-env.mjs` 造；`[System reminder: ` 族前缀 = 三端同形标记）：

| 块 | 行形（本面——`{}` = 取值点） | 三端同源坐标（功能点 43 ④——逐块） |
|---|---|---|
| ① 时空 | `[System reminder: current time is {本地时间 sv-SE} (local; timezone {IANA 时区})].` | `thincoder-core/agent/setup.mjs:181-185`（每回合 time reminder——三端同调同核件） |
| ② 所在/身份 | `[System reminder: env: thincoder-server {版本}（{部署身份}）∥ host: {主机名} ∥ platform: {平台} {架构} ∥ node: {版本} ∥ pid: {pid} ∥ cwd: {工作目录} ∥ model: {会话模型} ∥ reasoning: {档位 ∥ 未设}].` | `thincoder-core/agent/setup-reminders.mjs:40-42`（env 行——端名/模型/槽；同族 = `pushEnvStateReminder`） |
| ③ 所管现况一行 | `[System reminder: 管理面现况：注册节点 {N}（active {A} ∥ disabled {D}）∥ 服务模型 {K} ∥ 成员 {M}].` | `thincoder-core/agent/setup-reminders.mjs:152`（`pushManifestStateReminder`——会话所操作对象的现况**单活体行**：值随实况 ∥ 读败保守） |
| ④ 能力与边界 | 系统简报静态段 `CHAT_LIMITS_BLOCK`（工具族清单 ∥ 限额 ∥ 边界——四块之一）+ 活体面 = 当回合 `tools.schemas`（能力清单的真体现） | `thincoder-core/prompts/`（人格/纪律槽——三端能力与边界 = 系统提示词面；本面 = 系统简报） |

- **取值源**：① `now()`（注入面）；② `process`/`os` 直读 + 版本 = `readPackageVersion()`（`thincoder-server/src/ops/update.mjs:46`——版本单源）；
  **部署身份** = 容器（`/.dockerenv` ∨ `/run/.containerenv` 在场）∥ systemd 服务（`INVOCATION_ID` 非空）∥ 独立进程（其余）——判据明列，探测失败 ⇒ 该字段略去（不猜）；
  ③ 域件进程内直取（`listRunners` ∥ `modelEntriesOf(listProviderEntries(db))` ∥ `listMembers`——每回合三读，读数级）。
- **③ 在线性读面**（父侧 2026-10-12 裁）：v12 已撤心跳（`sandbox_runners.status` = active/disabled；「在线」只能读时逐节点探活——`thincoder-server/src/sandbox/routes.mjs:128-145` 每节点现打 `/info` 3s）
  ⇒ 不便宜且慢节点会误读离线 ⇒ 本行取**注册态分布**；**在线性/容器数走工具按需探**（`runners.list` / `docker version`——需求同句「明细仍走工具」）。
- **降级（需求 43② 字面）**：块级——该块任一读失败 ⇒ **整行略去**（无半真值上屏），其余行照常、回合不阻断（不抛、不 notice）。
- **timer 到期行**：随三行同落（行文 = 核件单源 `[System reminder: ⏰ timer — {消息}]`）——见 §14.4。
- **不做对位**：cwd 之外的 git 上下文 ∥ 项目档注入 ∥ 同目录实例（三端有、服务端无对应物——需求 43 边界句）。

### 14.2 环境工具面（五族七件——核件复用）

| 族 | 件 | 核件（单源） |
|---|---|---|
| 时间 | `get_current_time` | `@thincoder/core/tools/ops.mjs`（`getCurrentTimeTool`——`:140`） |
| 进程 | `process`（list ∥ kill） | 同件（`processTool`——`:51`） |
| 提醒 | `timer` | `@thincoder/core/agent-tools/timer.mjs`（`timerTool`） |
| 文件读取族 | `ls` ∥ `read` ∥ `grep` | `@thincoder/core/tools/search.mjs`（`lsTool` ∥ `grepTool`） ∥ `tools/file.mjs`（`readTool`） |
| 命令 | `bash`（限幅 = §14.3） | `@thincoder/core/tools/bash.mjs`（`bashTool`） |

- **复用口径**（KD-SV-113）：实现 ∥ schema ∥ 描述三面同源——核工具对象**原文直用**（`execute(args, ctx)`），本面只做 `ctx` 适配与结果归一；**不收窄 schema**（端池参数运行期处置）。
- **载入**：动载（`loadCoreEnvTools()`——沿 `loadCoreChat` 先例）；批内件经 `coreTools` 注入口（真件亦可——**仓内核直引**：`thincoder-core/tools/*.mjs`——`DESC()` 经 `prompt-files.mjs` 按模块自身位置解析，仓内 `tool-docs/` 在场 ⇒ 开发机可用真件）。
- **ctx 适配**：`cwd` = `deps.cwd ?? process.cwd()`（相对路径基准——无围栏）；`signal` = 当回合中止信号（透传 ⇒ bash 树杀、模型调用中断同源）；`agent` = timer 垫片（§14.4）；`depth: 0`。
- **结果归一**：`{ ok, subject, summary, output }`——`ok` = 调用完成（未抛错；命令非零退出 ⇒ `ok:true`，退出码在输出文本内 `(exit code N)`——不解析，KD-SV-113 被否栏）；
  `output` = 核件文本原文（模型可见形经会话面 ≤4000 字截断——KD-SV-89 单源）；`subject` = 主语原文（审计数据源——§14.4）；
  `summary` = 人话单行（bash ⇒ 核件结果末行状态行；`get_current_time` ⇒ 首行 `Date:`；`timer` ⇒ 核件返回句；余 = 「工具名 + 主语」）。
- **端池参数处置**（服务面无驻留池）：`bash.async:true` ⇒ 显式拒（人话）；`process.kill` 的 `id` 靶 ⇒ 核件自然报「未知后台任务 id」；`process.kill` 的 `pid` 靶**在册**（与 bash 等价——含杀 server 自身进程的操作者自伤面；R62②披露）。
- **描述面**：核 `tool-docs/*.md` 原文（三端同文）；其中指向本面不存在工具的指引（write/edit/git/repo_outline 族）落空 = 核文案面发现项（R62③——本批不改）。

### 14.3 限幅在册（`bash` 三件——需求 43⑤）

| 限 | 值 | 依据 |
|---|---|---|
| 超时 | 缺省 120_000 ms ∥ 上限 600_000 ms（逾限 ⇒ 工具级错误——零静默） | 缺省 = 核 `BASH_TIMEOUT_MS`（`thincoder-core/tools/shared.mjs:26`）；上限 = 核内既有时预算惯例值（`execute` ∥ `wait_for` 同值 600000） |
| 输出上限 | 三层：工具层 200_000 字（核 `truncate`）+ 每流 2_000_000 字节缓冲（核 `MAX_STREAM_BUF`——`thincoder-core/tools/bash.mjs:15`）⇒ 落库/模型可见 ≤4_000 字（`CHAT_TOOL_CONTENT_MAX`——KD-SV-89 单源）⇒ 帧与审计摘要 ≤300 字 | 全为核件/会话面既有常量——零新口径 |
| 工作目录 | `deps.cwd ?? process.cwd()`（相对路径解析基准；**无路径围栏**——沿核「无边界断言」口径） | 需求 43⑤ 三限之一；围栏 = 权限模型面（12:47 归用户——§10 边界） |

### 14.4 审计与 timer 投递

- **审计（需求 43⑥——KD-SV-114）**：每次调用一 `agent_event`/`chat_call` 行（面不扩——KD-SV-91）；`detail` 增 `subject`（命令原文/路径——≤2000 字，逾限截断并注记）∥ `truncated`（结果可见形截断位）；成败 = 既有 `resultCode`。
  审计页 `views-audit.mjs` 增 **agent 行详情模板**（tool · subject · 成败 ·〔截断〕· summary——非裸 JSON）+ 三文案键（`audit.agentOk`/`agentFail`/`agentTruncated`——两表同步）。
- **timer 投递面**（差异登记——核三端有**空闲唤醒**〔闩/火/开轮〕，服务面无）：进程内按会话挂垫片（`{ _pendingTimers, history }`——核 `timer` 工具直写；帽 = 核 `TIMER_MAX_PENDING` 8）；**回合边界投递** = 每回合起跑 `takeExpiredTimers` 出列（幂等）⇒ 行文经 `injectTimerReminders` 落实况行组；**不自动开轮**（无空闲面——如实登记）；重启 ⇒ 表天然空（零持久化——沿中止登记表先例）。
- **秘密面**：掩蔽口径沿会话面（入参敏感键 ∥ 本轮已见敏感值）；**文件内容不在掩蔽面内**（读文件/命令输出可含凭据——如实披露，R62②）。

### 14.5 核可达性（生产镜像——核实结论）

- 依赖声明在案（`thincoder-server/package.json:16` `@thincoder/core: ^0.10.4`）；registry 实核 = 该包在 npm 上（本设计轮 `npm view @thincoder/core version` ⇒ **0.10.4**，与仓内核版本一致）；包白名单含 `tools/` ∥ `agent-tools/` ∥ `tool-docs/`（`files` 面）+ `exports: { "./*": "./*" }` ⇒ 子路径直引可达。
- 镜像两装径同经 npm 解析该依赖：构建期（`thincoder-server/Dockerfile:25` `npm i -g ./thincoder-server/*.tgz …`）∥ 运行期（`thincoder-server/deploy/converge.mjs:79-90` `installVersion`——`npm i -g @thincoder/server@<target>`）——registry 不可达 ⇒ 装机失败 ⇒ 拒启（fail-loud，非静默）。**结论：核在镜像内可达**（前提 = 装机时 registry 可达）。
- 开发机（本仓 checkout）未装核 ⇒ 本面全族走动载 + 注入口（生产走真件；批内件走注入——真件亦可经仓内直引）。

## 变更记录

- 2026-10-12（**admin-agent-awareness 批 · 设计轮 · eng-designer**——承批档 `docs/batches/2026-10-12-admin-agent-awareness.md` §1 · 台账 #1310；用户 12:29/12:39/12:41/12:47 四句；功能点 43 ∥ AC-43 ①–⑥）：§1 驱动器行 + §3 尾句 + §11 两行随正（工具面 = 任务五件 + 管理面七件 + **环境五族七件 §14**；回合装配 + 环境块）∥ §6 增两新档行（`chat-env.mjs` ≈150 ∥ `chat-env-tools.mjs` ≈230）+ `chat.mjs` 预算行（599 ⇒ ≈640 + 拆档预案）+ 本批另计行 ∥ §7 增环境面判据行 ∥ §8 增用例（N72/N73 ∥ B70/B71 ∥ E55）∥ §9 增 **KD-SV-112/113/114**（四块装配 ∥ 工具面核件复用与限幅 ∥ 审计详情与页面模板）∥ §10 边界重写（server 本机族收正 + 五条不做面）∥ **增 §14（环境感知与环境工具面——四块装配/坐标表 ∥ 工具面五族七件 ∥ 限幅三件 ∥ 审计与 timer 投递 ∥ 核可达性结论）** ∥ §13 增 R62（含父侧两条裁决回笔 + 披露 + 部署收尾）。同源随动 = `accounts/ACCOUNTS.md` §2.1（`chat_call` detail 扩字段） ∥ `webui/READINGS.md` §2.1④/§3（审计页 agent 行模板 + 行数） ∥ `webui/SYSTEM.md` §3（i18n 两表 +3 键） ∥ `design/PROJECT.md` §2/§3/§4/§6/§7/§9。**产品码零触（设计轮）。**

- 2026-10-10（**runner-admin-console 批 · 托管接入（管理面 agent）设计 · eng-designer**——承批档 §2 · 台账 #1237/#1236；用户 22:19–22:29 四句 + 15:00/15:02 裁）：建档——形态（进程内 ∥ 核复用 KD-SV-78 ∥ 唯一一个）∥ 任务模型（run ∥ 预算 ∥ 读时轮询）∥ 工具面五件（exec/docker/register/verify/report——无围栏）∥ 自主边界与失败处置（硬点②）∥ 无人值守裁剪 ∥ KD-SV-82/87 ∥ 用例 N53/B47/E39。**产品码零触（设计轮）**。
- 2026-10-10（**runner-admin-console 批 · 设计评审轮 1 修正（fix 轮）· eng-designer**——承批档 `docs/batches/2026-10-10-runner-admin-console.md` §3 轮次 1 之 5/14）：#5 注册路径定——四端点经 `thincoder-server/src/sandbox/routes.mjs` 转注册（`bin` ±0——与 `sandbox/SANDBOX.md` §13 ∥ `PROJECT.md` §6 同拍）∥ #14 出口代理旗复核点指针写全（⇒ `PROJECT.md` §9 R53③）；同族：§6「构建/发布形」复核指针同拍。**零新语义**（评审发现直接导出项 + 同族指针收正）。
- 2026-10-11（**admin-agent-chat 批 · 设计轮 · eng-designer**——承批档 `docs/batches/2026-10-11-admin-agent-chat.md` §1 · 台账 #1254；需求 §5「两个 chat 界面」②④ + §1 后续议题；用户 2026-10-10 22:28 口径）：§1 驱动器行重写（两形——任务式 + 聊天式；本批落）∥ §1 成员面指针改指 **#1215** ∥ §6 预算表（`run.mjs`/`tools.mjs` 拟新增标记翻正实读 **137 ∥ 288**；+ 本批四新档 ≈960 ∥ `tools.mjs` −≈88）∥ §7 增聊天式判据行 ∥ §8 增用例 N54/N55 ∥ B48/B49 ∥ E40/E41 ∥ §9 增 **KD-SV-88/89/90/91**（聊天式驱动形 ∥ 会话持久化形 ∥ 工具面七件 ∥ 审计型 `agent_event`）∥ §10 边界随正（聊天式会话面条目删——成员面指针改指 #1215；+ chat 面不做条）∥ **增 §11（聊天式驱动——形态/回合/流式通路/在途门/重启恢复/判权审计/行动纪律句）与 §12（工具面扩展七件表——逐面回指）**。同源随动 = `store/STORE.md` §2 v14 段 ∥ `gateway/API.md` §2.8 ∥ `webui/WEBUI.md` §2.10 ∥ `accounts/ACCOUNTS.md` §2.1。**产品码零触（设计轮）**。
- 2026-10-11（**admin-agent-chat 批 · 设计评审轮 1 修正（fix 轮）· eng-designer**——承批档 `docs/batches/2026-10-11-admin-agent-chat.md` §3 轮次 1 之 1/2/9/10/11）：#1 §11 帧形钉死 `call` 帧 `args` = 字符串（参数摘要——JSON 序列化 ⇒ 掩蔽后截断 ≤500 字；非对象；与 `gateway/API.md` §2.8 逐字同拍）∥ #2 §12 成员行明写重置链共享助手边界（= 改密 + 清计；审计写不随迁——`recordAudit` 各留调用侧既有面）+ §7 补「chat 重置 ⇒ 既有域型零增」断言 ∥ #9 §1 指针收正（需求 §1 ⇒ §5 后续议题行）∥ #10 §11 回合行 + §7 补异常终态落库口径（部分文本 ⇒ `assistant` 行如实落库；notice 行独立；零文本 ⇒ 零 `assistant` 行——模型错误 ∥ 预算超限两径）∥ #11 增测试注入缝（§11——模型出口 ∥ 工具面模块级注入；默认 `null` ⇒ 回落真件）。**零新语义**（评审发现直接导出项）。
- 2026-10-11：闸面收净（doc-check 行宽/锚读数——本批面）——§11 回合/流式通路两行折行 ∥ §6 档表四行标记收正（「本批新增」⇒「拟新增——admin-agent-chat 批」）∥ §12 三处坐标收正（`thincoder-server/src/…` 全形——`:130`/`:132` 解析面 ∥ `:135` 补拟新增标记）。**零语义**。
- 2026-10-11（**admin-agent-chat 批 · 实施轮上抛回笔（fix 轮）· eng-designer**——承批档 `docs/batches/2026-10-11-admin-agent-chat.md` §6（实施轮上抛处置 + notice 补裁——④ 空回合单列 · 四值枚举））：§5/§9 KD-SV-87 行补机械读法（四处同词）∥ §11 回合行补 notice `data.reason` 各点名（② "budget" ∥ ③ "model_error" ∥ ④ "empty_turn"）+ 重启行点名 "restart"。**零新语义**（上抛裁决直接导出项）。
- 2026-10-11（**console-chat-align 批 · 设计轮 · eng-designer**——承批档 `docs/batches/2026-10-11-console-chat-align.md` §1 · 台账 #1282；用户 18:23 ①④ + 18:30「改」）：**增 §11.1 呈现面**（渲染面 = 复用 `thincoder-render-core`——取件形 = 控制台第二根 `/rc/*`；本域零变化（会话/回合/帧四形/role 四值/工具面/审计面不动）；帧面无 reasoning 通道 = 不做思考块的根因——余项）+ 工具卡呈现接线句（`renderToolCard`/`finishToolCard`——§12 语义面不变）。同源随动 = `webui/WEBUI.md` §2.10/§7 KD-SV-101 ∥ `design/PROJECT.md` §2.1/§4/§6/§9 R58。**产品码零触（设计轮）**。
- 2026-10-11（**server-doc-split 批 · 波 4（域档接收节 + 活面改指）· eng-designer**——承批档 `docs/batches/2026-10-11-server-doc-split.md` §2）：**增 §13「上抛/余项」**（板档 §9 迁入——R54 逐字；板档同类行 = 保位 stub）∥ §9 KD-SV-82 行并入驱动器两形句（与板档旧 §5 行对等）∥ 活面改指（webui 引用 ⇒ `webui/CHAT.md` §2.1 ∥ `webui/SANDBOX.md` §2.1①；R53③ 两处 ⇒ `sandbox/SANDBOX.md` §16——as-of）。**产品码零触。**
- 2026-10-11（**chat-shell-align 批 · 设计轮 · eng-designer**——承批档 `docs/batches/2026-10-11-chat-shell-align.md` §1 · 台账 #1292；用户 2026-10-11 21:55 裁「全套 ∥ 补后端一件不藏 ∥ VSC 式」；功能点 41 ∥ AC-41）：§6 两档预算随正（`chat.mjs` 498 ⇒ ≈600 ∥ `chat-routes.mjs` 105 ⇒ ≈150——零新档）+ 小计行补本批另计 ≈+145；§7 增四件后端 + 帧面判据行；§8 增用例（N64–N67 ∥ B65/B66 ∥ E50/E51）；§9 **KD-SV-87 收正**（会话内可换）+ 增 KD-SV-107/108/109（中止双通道 ∥ 换模型 ∥ 附件面）；§10 边界两项删（回合中止钮 ∥ 会话内换模型——D8）；§11 会话/回合/流式通路三行随正（第五形 `"aborted"` ∥ 帧面指针）+ **增 §11.2（输入区四件后端）与 §11.3（帧面扩展与状态行读数源）** + §11.1 补输入区翻做句；§13 增 R60（含 R54 ③ 两项交付失效句）；同源随动 = `webui/CHAT.md` §1/§2.1/§3/§4/§5/§6 ∥ `gateway/API.md` §1/§2.8/§4/§5/§7/§8 ∥ `webui/WEBUI.md` §1/§5/§6/§7 ∥ `webui/STYLE.md` §2.1/§3/§5 ∥ `store/STORE.md` §2 v14 段 ∥ `design/PROJECT.md` §4/§7/§9。**产品码零触（设计轮）。**
- 2026-10-11（**chat-shell-align 批 · 设计评审轮 1 修正（fix 轮）· eng-designer**——承批档 `docs/batches/2026-10-11-chat-shell-align.md` §3 轮次 1 之 1/2/3/5/9；父侧受理全单）：§13 R60① 需求档回笔标闭合（D8 删待办形）+ R60② 随正件补行（`…-console-chat-align.test.mjs` 两腿收正 ∥ 两测试件现读行数 + 增量注）∥ §7 批内件行补 `…-admin-agent-chat.test.mjs` 现读 715 行 + 增量注 ∥ §9 KD-SV-91 `chat_stop` 五值统一（+ 空回合 ∥ 手动中止）∥ §9 KD-SV-87 / §11.1 删修订式标记（「句删」两处）。**零新语义**（评审发现直接导出项）。
- 2026-10-11（**评审 #258 轮 2 残差 1 收正（🟡 文档卫生）· 父侧直改 · 可 revert**：KD-SV-87 / KD-SV-108 被否候选栏「原行」指针删去（保留否决事由）——规范面不携文档自身历史指针，历史归变更记录面）。
- 2026-10-12（**console-reasoning-levels 批 · 设计轮 · eng-designer**——承批档 `docs/batches/2026-10-12-console-reasoning-levels.md` §1 · 台账 #1303；用户 2026-10-12 11:45 走查 + 11:46 口径四条「行」核准；功能点 42 ∥ AC-42）：§6 两档预算实读复读（`chat.mjs` **575** ⇒ ≈585 ∥ `chat-routes.mjs` **158** ⇒ ≈178）+ 小计补本批另计 ≈+30；§7 增会话级思考档位判据行；§8 增用例（N71 ∥ B69 ∥ E54）；§9 增 **KD-SV-110**（会话级思考档位 = 库列 + 设置路由 + 装配携值——三件一套）；§10 边界补思考档位不做项（逐条覆写 ∥ 状态行段）；§11.1 本域零变化句收正（无 reasoning **文本**通道——与档位 `reasoningEffort` 两回事）；**增 §11.4（会话级思考档位——归属/值域源/设置路由/回合装配/控制台面）**；§13 增 R61（随正件 13 件坐标 + 披露三条 + 部署收尾）。同源随动 = `webui/CHAT.md` §1/§2.1/§3/§4/§5/§6 ∥ `gateway/API.md` §2.2/§2.8/§4/§8 ∥ `store/STORE.md` §1/§2/§3/§4 ∥ `design/PROJECT.md` §4。**产品码零触（设计轮）。**
- 2026-10-12（**console-reasoning-levels 批 · 设计评审轮 1 修正（fix 轮）· eng-designer**——承批档 `docs/batches/2026-10-12-console-reasoning-levels.md` §3 轮次 1 之 1–7；父侧受理全单）：§6 `chat.mjs` 行补拆分预案（越 500 软线——档位小段随拆档审查；800 硬限未越）∥ §7 批内件行补拆分预案（用例段随拆档审查）∥ §11.4 值域源条增**标识解析径**（对外标识 ⇒ 别名反查解上游真名——`providers.mjs`/KD-SV-59；源面行/PATCH 校验/装配三处同经）+ KD-SV-110 ②③ 同拍 + 被否栏补「别名退中性」驳回 ∥ §13 R60②③ 收正（`style.css` 五钮隐藏；无源钮隐藏五枚 + 推理钮 ⇒ 已交付 = KD-SV-111）∥ §13 R61① 结构版本断言 11 件逐件补现读（行数 ±0——数字就地收正）。**零新语义**（评审发现直接导出项）。
- 2026-10-12（**console-reasoning-levels 批 · 落地后回填 · 主 agent 直接执行 · 可 revert**）：§6 两档实读回填（`chat.mjs` **599** ∥ `chat-routes.mjs` **190**）；§13 R61① 结构版本断言枚举收正（11 件 ⇒ **实盘 20 件**——逐行见批档 §5 ④）+ R61② `views-chat.mjs` 实 500（恰贴软线）。
