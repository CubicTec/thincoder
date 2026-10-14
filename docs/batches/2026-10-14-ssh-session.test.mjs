/**
 * 2026-10-14-ssh-session.test.mjs — 批 ssh-session 核腿单测（随批档存放；不进项目 `test/` 树，永不入门）。
 * 跑法：`node --test docs/batches/2026-10-14-ssh-session.test.mjs`（cwd 不限——路径全按 import.meta.url 解析）
 * 覆盖（核腿判据）：池 ∥ askpass 链（替身 ssh 夹具——真包装档 + 真助手档）∥ 预探升格（密钥机恰 1 次连接）
 * ∥ 密码机一次凭据窗 + 单次带密会话 ∥ 无 UI 错 ∥ 沉降/超时 ∥ 输出帽 ∥ 遮蔽（含跨 chunk）∥ 非密预填
 * ∥ 只读豁免 ∥ depth 排除 ∥ 审批文案 ∥ 会话中止清池 ∥ 闲置自动关 ∥ 池帽 ≤4 ∥ close/list。
 * 夹具 = 独立进程 `fake-ssh.mjs`（沙箱内生成；由 `_setSshBinaryForTest` 注入）——它照上游语义
 * 调 askpass 包装档（`execlp(askpass, askpass, prompt)`），故 askpass 链两档皆真。
 */
import test from "node:test"
import assert from "node:assert/strict"
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const core = (rel) => fileURLToPath(new URL(`../../thincoder-core/${rel}`, import.meta.url))
const sandbox = join(tmpdir(), `thincoder-ssh-test-${process.pid}`)
const fakeSsh = join(sandbox, "fake-ssh.mjs")
const spawnLog = join(sandbox, "spawns.log")

const { SSH_SESSION_MAX, _setSshIdleMsForTest, connectSsh, sendSsh, readSsh, secretInputSsh, closeSsh, listSsh, killSshTree } =
  await import(`file://${core("agent-tools/ssh-session.mjs")}`)
const { _setSshBinaryForTest, _setSshConfigDirForTest } = await import(`file://${core("agent-tools/ssh-transport.mjs")}`)
const { discardAbortedSshSessions } = await import(`file://${core("agent-tools/async-discard.mjs")}`)
const { SUBAGENT_TOOL_EXCLUSIONS, excludeSubagentTools } = await import(`file://${core("agent/helpers.mjs")}`)
const { formatPermission } = await import(`file://${core("permission.mjs")}`)
const { sshTool, validateArgs, SSH_ACTIONS } = await import(`file://${core("tools/ssh.mjs")}`)
const { tombstoneOf } = await import(`file://${core("agent-tools/async-settle.mjs")}`)

// ─── 夹具（fake-ssh：真 askpass 链 + 脚本化设备行为）────────────────────────

const FAKE = [
  "import { appendFileSync } from 'node:fs'",
  "import { spawnSync } from 'node:child_process'",
  "const args = process.argv.slice(2)",
  "const env = process.env",
  "if (env.TC_TEST_SSH_LOG) appendFileSync(env.TC_TEST_SSH_LOG, JSON.stringify({ args, secret: env.TC_SSH_SECRET === undefined ? null : env.TC_SSH_SECRET }) + '\\n')",
  "const pp0 = args.includes('NumberOfPasswordPrompts=0')",
  "const mode = env.TC_TEST_SSH_MODE || 'key'; let cwd = '/root'",
  "const out = (s) => process.stdout.write(s); const die = (s) => { process.stderr.write(s + '\\n'); process.exit(255) }",
  "function ask(msg) {",
  "  const r = spawnSync(env.SSH_ASKPASS, [msg], { encoding: 'utf8', env: { ...env }, shell: process.platform === 'win32' })",
  "  return String(r.stdout || '').split(/\\r?\\n/)[0]",
  "}",
  "function shellAlive() {",
  "  out('R1# '); process.stdin.setEncoding('utf8')",
  "  let buf = ''; let m",
  "  process.stdin.on('data', (d) => {",
  "    buf += d",
  "    while ((m = buf.match(/^([^\\r\\n]*)[\\r\\n]+/))) {",
  "      const line = m[1]; buf = buf.slice(m[0].length)",
  "      if (line === 'exit') process.exit(0)",
  "      if (line === 'flood') { out('Z'.repeat(12000)); out('\\r\\nR1# '); continue }",
  "      if (line === 'hang') continue",
  "      if (line === 'pwd') { out(cwd + '\\r\\nR1# '); continue }",
  "      if (line.startsWith('cd ')) { cwd = line.slice(3).trim(); out('R1# '); continue }",
  "      if (line === 'pages') { out('page-1\\r\\n--More--'); continue }",
  "      if (line === ' ') { out('page-2\\r\\nR1# '); continue }",
  "      const half = Math.ceil(line.length / 2); out(line.slice(0, half))",
  "      setTimeout(() => { out(line.slice(half) + '\\r\\nR1# ') }, 25)",
  "    }",
  "  })",
  "  process.stdin.on('end', () => process.exit(0)) }",
  "if (mode === 'unreachable') die('ssh: connect to host example port 22: Connection timed out')",
  "if (mode === 'hostkey') die('@@@@@@@@@@@@@@@@@@@@@@\\n@ WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED! @\\nHost key verification failed.')",
  "if (mode === 'confirm') {",
  "  const answer = ask(env.TC_TEST_SSH_CONFIRM_PROMPT || \"The authenticity of host example cannot be established. Are you sure you want to continue connecting? \")",
  "  if (answer !== 'yes') die('Host key verification failed.')",
  "  out('confirmed\\r\\n'); shellAlive()",
  "} else if (mode === 'password-hang') {",
  "  if (pp0) die('Permission denied (publickey,password).')",
  "  process.stdin.on('data', () => {})",
  "} else if (mode === 'password') {",
  "  if (pp0) die('Permission denied (publickey,password).')",
  "  const answer = ask(\"root@example's password: \")",
  "  if (answer !== env.TC_TEST_SSH_PASSWORD) die('Permission denied, please try again.\\nPermission denied (publickey,password).')",
  "  out('Welcome\\r\\n'); shellAlive()",
  "} else {",
  "  out('Banner line\\r\\n'); shellAlive()",
  "}",
].join("\n")

mkdirSync(sandbox, { recursive: true })
writeFileSync(fakeSsh, FAKE, "utf8")
process.env.TC_TEST_SSH_LOG = spawnLog // 夹具每次起跑追加一行（连接计数 ∥ argv ∥ 是否携密）
_setSshBinaryForTest(process.execPath, [fakeSsh])
_setSshConfigDirForTest(sandbox)

/** 新会话载体 + ctx（每用例独立池）。 */
function harness() {
  const parent = { history: [], config: {} }
  const ctx = { agent: parent, cwd: sandbox, signal: null, onOutput: null }
  return { parent, ctx }
}

/** 凭据窗替身（记录 payload + 依次答）。 */
function windowStub(answers) {
  const calls = []; const queue = [...answers]
  const fn = async (payload) => { calls.push(payload); return queue.length ? queue.shift() : null }
  return { fn, calls }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const spawns = () => (existsSync(spawnLog) ? readFileSync(spawnLog, "utf8").trim().split("\n").map((l) => JSON.parse(l)) : [])
const resetSpawns = () => { try { rmSync(spawnLog, { force: true }) } catch { /* 首次 */ } }

/** 用例收尾：关掉本载体全部存活会话（零进程残留）。 */
async function cleanup(parent) {
  for (const entry of [...(parent._sshSessions?.values() ?? [])]) {
    try { killSshTree(entry) } catch { /* 已死 */ }
  }
  await sleep(80)
}

test("池 + 预探升格：密钥机恰 1 次连接、零凭据窗、状态行就绪", async () => {
  resetSpawns()
  const { parent, ctx } = harness()
  const win = windowStub([])
  ctx.onSecretInput = win.fn
  process.env.TC_TEST_SSH_MODE = "key"
  try {
    const res = await connectSsh(parent, ctx, { host: "example", promptPattern: "R1#" })
    assert.equal(res.error, undefined, res.error)
    assert.match(res.text, /^\[ssh \(ssh#1\) example — ready · idle 0s\]/, "状态行冠形（§6.22 动作表末行）")
    assert.match(res.text, /R1#/, "首屏提示符输出在场")
    assert.match(res.text, /— connected \(settled \(prompt matched\)\)/)
    assert.equal(win.calls.length, 0, "密钥机：凭据窗零调用")
    const log = spawns()
    assert.equal(log.length, 1, "密钥机：全程恰 1 次连接（预探升格，不二次连）")
    assert.equal(log[0].secret, null, "预探不带秘密（环境零秘密）")
    assert.ok(log[0].args.includes("NumberOfPasswordPrompts=0"), "预探 = NumberOfPasswordPrompts=0")
    assert.ok(log[0].args.includes("-tt"), "全会话形（-tt）")
    assert.ok(log[0].args.includes("-o") && log[0].args.includes("ServerAliveInterval=30"), "保活三件在场")
    assert.ok(!log[0].args.some((a) => a.startsWith("StrictHostKeyChecking")), "不下发 StrictHostKeyChecking（继承本机策略）")
    assert.ok(!log[0].args.includes("-l") && !log[0].args.includes("-p"), "不给 user/port ⇒ 零下发（本机 ssh 配置生效——S1 配置复用）")
    assert.equal(parent._sshSessions.size, 1)
    const listed = listSsh(parent)
    assert.match(listed.text, /\[ssh \(ssh#1\) example — ready · idle \d+s\]/)
  } finally {
    await cleanup(parent)
    delete process.env.TC_TEST_SSH_MODE
  }
})

test("密码机：探连失败 → 恰一次凭据窗 → 单次带密会话（秘密经环境 + askpass 链真调用）", async () => {
  resetSpawns()
  const { parent, ctx } = harness()
  const win = windowStub([{ user: "root", password: "right-pw" }])
  ctx.onSecretInput = win.fn
  process.env.TC_TEST_SSH_MODE = "password"
  process.env.TC_TEST_SSH_PASSWORD = "right-pw"
  try {
    const res = await connectSsh(parent, ctx, { host: "example", promptPattern: "R1#" })
    assert.equal(res.error, undefined, res.error)
    assert.match(res.text, /— connected \(settled \(prompt matched\)\)/)
    assert.equal(win.calls.length, 1, "密码机：恰触发一次凭据窗（N2）")
    assert.equal(win.calls[0].kind, "ssh-credential")
    assert.equal(win.calls[0].keys.title, "ssh.credentialTitle", "词面 = i18n 键（非字面）")
    assert.equal(win.calls[0].fields.find((f) => f.name === "password").masked, true, "密码字段 masked")
    const log = spawns()
    assert.equal(log.length, 2, "密码机：探连 + 单次带密会话（两次连接，可接受）"); assert.equal(log[0].secret, null)
    assert.equal(log[1].secret, "right-pw", "秘密只经子进程环境（TC_SSH_SECRET）")
    assert.ok(!log[1].args.some((a) => a.includes("right-pw")), "秘密不入 argv")
    assert.ok(!log[1].args.includes("-l") || log[1].args.includes("root"), "带密会话用户取自窗值（root）")
    assert.ok(log[1].args.includes("NumberOfPasswordPrompts=1"), "带密会话 = 单提示")
    assert.ok(!res.text.includes("right-pw"), "返回值零秘密")
  } finally {
    await cleanup(parent)
    delete process.env.TC_TEST_SSH_MODE
    delete process.env.TC_TEST_SSH_PASSWORD
  }
})

test("无 UI 场合：可读失败句 + 指引，零后续连接（E6）", async () => {
  resetSpawns()
  const { parent, ctx } = harness()
  process.env.TC_TEST_SSH_MODE = "password"
  try {
    const res = await connectSsh(parent, ctx, { host: "example" })
    assert.match(res.error, /requires an interactive UI/)
    assert.match(res.error, /use key-based auth or ssh-agent/, "指引（改密钥 / agent）——核字典 ssh.no_ui 单源")
    assert.equal(spawns().length, 1, "无 UI：只留探连，零后续连接"); assert.equal(parent._sshSessions.size, 0, "失败连接不入池（E1 口径）")
    // 端侧回调在场但拒绝（CLI `refuseSecretInput()` 形）⇒ 可读句直出（不吞、不挂起）。
    resetSpawns()
    ctx.onSecretInput = () => { throw new Error("ssh credential input requires an interactive UI (none in this context) - use key-based auth or ssh-agent") }
    const res2 = await connectSsh(parent, ctx, { host: "example" })
    assert.match(res2.error, /^Error: ssh credential input requires an interactive UI/); assert.equal(parent._sshSessions.size, 0)
  } finally {
    await cleanup(parent)
    delete process.env.TC_TEST_SSH_MODE
  }
})

test("凭据窗取消 / 空口令：可读句、零带密尝试（E4）", async () => {
  resetSpawns()
  const { parent, ctx } = harness()
  const win = windowStub([null])
  ctx.onSecretInput = win.fn
  process.env.TC_TEST_SSH_MODE = "password"
  try {
    const cancelled = await connectSsh(parent, ctx, { host: "example" })
    assert.match(cancelled.error, /cancelled — no credential was provided/); assert.equal(spawns().length, 1, "取消 ⇒ 零后续尝试（零带密会话）")
    resetSpawns()
    const win2 = windowStub([{ user: "root", password: "" }])
    ctx.onSecretInput = win2.fn
    const empty = await connectSsh(parent, ctx, { host: "example" })
    assert.match(empty.error, /empty password is never submitted/); assert.equal(spawns().length, 1, "空口令 ⇒ 不提交（零带密会话）")
    assert.equal(parent._sshSessions.size, 0)
  } finally {
    await cleanup(parent)
    delete process.env.TC_TEST_SSH_MODE
  }
})

test("口令错（一次）：认证被拒句、会话不入池、窗口不重弹（E1）", async () => {
  resetSpawns()
  const { parent, ctx } = harness()
  const win = windowStub([{ user: "root", password: "wrong-pw" }])
  ctx.onSecretInput = win.fn
  process.env.TC_TEST_SSH_MODE = "password"
  process.env.TC_TEST_SSH_PASSWORD = "right-pw"
  try {
    const res = await connectSsh(parent, ctx, { host: "example" })
    assert.match(res.error, /authentication rejected/); assert.equal(win.calls.length, 1, "窗口不重弹")
    assert.equal(spawns().length, 2, "探连 + 一次带密尝试（不再重试）"); assert.equal(parent._sshSessions.size, 0, "会话不入池")
  } finally {
    await cleanup(parent)
    delete process.env.TC_TEST_SSH_MODE
    delete process.env.TC_TEST_SSH_PASSWORD
  }
})

test("指纹变更 / 不可达：弹窗之前硬停（E2/E3）+ 本机策略严格拒", async () => {
  const { parent, ctx } = harness()
  const win = windowStub([{ user: "root", password: "x" }])
  ctx.onSecretInput = win.fn
  process.env.TC_TEST_SSH_MODE = "hostkey"
  try {
    const res = await connectSsh(parent, ctx, { host: "example" })
    assert.match(res.error, /host key verification failed/); assert.match(res.error, /known_hosts is never rewritten/)
    assert.equal(win.calls.length, 0, "指纹变更：弹窗之前硬停")
    process.env.TC_TEST_SSH_MODE = "unreachable"
    const res2 = await connectSsh(parent, ctx, { host: "example" })
    assert.match(res2.error, /host unreachable or timed out/); assert.equal(win.calls.length, 0, "不可达：弹窗之前硬停")
  } finally {
    await cleanup(parent)
    delete process.env.TC_TEST_SSH_MODE
  }
})

test("沉降：静默窗 ∥ 提示符命中；超时 ⇒ 部分输出 + 可读句（B2/③⑥）", async () => {
  const { parent, ctx } = harness()
  process.env.TC_TEST_SSH_MODE = "key"
  try {
    const res = await connectSsh(parent, ctx, { host: "example", promptPattern: "R1#" }) // 提示符命中路：settle 立即成立
    assert.equal(res.error, undefined, res.error)
    // 静默窗路（无 promptPattern 的会话）：send 后 800 ms 到点判就绪。
    const res2 = await connectSsh(parent, ctx, { host: "example2" })
    assert.equal(res2.error, undefined, res2.error)
    const t0 = Date.now(); const sent = await sendSsh(parent, ctx, { id: "ssh#2", data: "hello" })
    const dt = Date.now() - t0
    assert.match(sent.text, /hello/, "该轮输出在场"); assert.match(sent.text, /settled \(silence window\)/, "静默窗判据")
    assert.ok(dt >= 800 && dt < 4000, `静默窗 ≤ settle 上限内返回（实测 ${dt}ms）`)
    // 超时路：命令挂住 ⇒ 硬超时返回部分 + 可读句（含 id / host / 已等时长）。
    const t1 = Date.now()
    const timed = await sendSsh(parent, ctx, { id: "ssh#1", data: "hang", timeoutMs: 400, settle: true })
    assert.match(timed.text, /not settled after 0\.4s \(ssh#1 @ example\)/, "超时句含 id/host/已等时长"); assert.ok(Date.now() - t1 < 3000, "硬超时不静默挂起")
  } finally {
    await cleanup(parent)
    delete process.env.TC_TEST_SSH_MODE
  }
})

test("输出帽：保尾 + 截断注记 + maxChars 覆盖；全量落 log（S4/⑥）", async () => {
  const { parent, ctx } = harness()
  process.env.TC_TEST_SSH_MODE = "key"
  try {
    await connectSsh(parent, ctx, { host: "example", promptPattern: "R1#" })
    const sent = await sendSsh(parent, ctx, { id: 1, data: "flood" })
    assert.match(sent.text, /\[\.\.\. first \d+ chars omitted \(return cap 8000\)/, "截断注记（保尾）"); assert.ok(sent.text.length < 8600, "返回帽生效")
    assert.match(sent.text, /ZZZ/)
    const small = await readSsh(parent, ctx, { id: 1, maxChars: 40 })
    const logFile = [...readSshLogFiles()].pop()
    assert.match(small.text, /— buffered output since the last read|— settled/, "read 判据注记"); assert.ok(logFile && existsSync(logFile), "全量 log 落盘")
    assert.ok(readFileSync(logFile, "utf8").length > 12000, "log 持全量（超返回帽）")
    const logTail = readFileSync(logFile, "utf8").trimEnd().slice(-40) // 保尾同源（S4）
    assert.ok(sent.text.includes(logTail), "log 尾部与返回尾部一致")
  } finally {
    await cleanup(parent)
    delete process.env.TC_TEST_SSH_MODE
  }
})

test("遮蔽：写入值对返回面与日志面零残留（含跨 chunk 切分）（⑦/NS4）", async () => {
  const { parent, ctx } = harness()
  const win = windowStub([{ secret: "S3CRET-VALUE" }])
  ctx.onSecretInput = win.fn
  process.env.TC_TEST_SSH_MODE = "key"
  try {
    await connectSsh(parent, ctx, { host: "example", promptPattern: "R1#" })
    const res = await secretInputSsh(parent, ctx, { id: 1, label: "enable" })
    assert.match(res.text, /secret written \(enable\) — value never echoed/); assert.ok(!res.text.includes("S3CRET-VALUE"), "返回值零秘密（跨 chunk 切分亦遮蔽）")
    assert.equal(win.calls[0].kind, "ssh-secret"); assert.equal(win.calls[0].fields[0].name, "secret")
    const logFile = [...readSshLogFiles()].pop()
    assert.ok(!readFileSync(logFile, "utf8").includes("S3CRET-VALUE"), "日志面零秘密")
    const follow = await readSsh(parent, ctx, { id: 1 }); assert.ok(!follow.text.includes("S3CRET-VALUE"))
  } finally {
    await cleanup(parent)
    delete process.env.TC_TEST_SSH_MODE
  }
})

test("askpass 链两档：包装档生成（0700 形）+ 主机确认答 yes + SSH_ASKPASS_REQUIRE=force", async () => {
  resetSpawns()
  const { parent, ctx } = harness()
  process.env.TC_TEST_SSH_MODE = "confirm"
  try {
    const res = await connectSsh(parent, ctx, { host: "example", promptPattern: "R1#" })
    assert.equal(res.error, undefined, res.error)
    assert.match(res.text, /confirmed/, "首见主机经 askpass confirm 路放行（助手答 yes）")
    const log = spawns(); assert.equal(log.length, 1)
    assert.equal(process.env.SSH_ASKPASS_REQUIRE, undefined, "环境不泄漏（REQUIRE 只进子进程环境）")
    const wrapperDir = join(sandbox, "ssh-askpass"); assert.ok(existsSync(wrapperDir), "包装档目录在场")
    const wrappers = readdirSync(wrapperDir); assert.equal(wrappers.length, 1, "一条会话一个包装档")
    const body = readFileSync(join(wrapperDir, wrappers[0]), "utf8")
    assert.match(body, /ssh-askpass\.mjs/, "包装档指向助手档（内容零秘密）"); assert.ok(!body.includes("S3CRET"), "包装档零秘密")
  } finally {
    await cleanup(parent)
    delete process.env.TC_TEST_SSH_MODE
  }
})

test("非密预填档：认证成功后写白名单字段；未给 user 时取记录值（⑨）", async () => {
  resetSpawns()
  const { parent, ctx } = harness()
  process.env.TC_TEST_SSH_MODE = "key"
  try {
    const res = await connectSsh(parent, ctx, { host: "prefill.example", user: "admin", promptPattern: "R1#" })
    assert.equal(res.error, undefined, res.error)
    const rec = JSON.parse(readFileSync(join(sandbox, "ssh-hosts.json"), "utf8")); const entry = rec["prefill.example"]
    assert.equal(entry.user, "admin"); assert.equal(entry.port, 22); assert.ok(entry.lastUsedAt)
    assert.deepEqual(Object.keys(entry).sort(), ["host", "lastUsedAt", "port", "user"], "白名单 = 非密字段（密码零字段）")
    await closeSsh(parent, ctx, { id: 1 })
    // 第二次：不给 user ⇒ 取记录值（状态行注明来源）。
    const res2 = await connectSsh(parent, ctx, { host: "prefill.example", promptPattern: "R1#" })
    assert.equal(res2.error, undefined, res2.error)
    assert.match(res2.text, /user "admin" came from the local ssh-hosts record/)
    assert.ok(spawns().some((s) => s.args.includes("admin@prefill.example")), "记录值下发为 [user@]host"); assert.ok(!JSON.stringify(JSON.parse(readFileSync(join(sandbox, "ssh-hosts.json"), "utf8"))).includes("password"))
  } finally {
    await cleanup(parent)
    delete process.env.TC_TEST_SSH_MODE
  }
})

test("只读豁免 ∥ depth 排除 ∥ 注册面 ∥ 参数校验（NS3/NS5）", async () => {
  assert.equal(sshTool.readonly, false, "工具级非只读（动作级钩子接管）")
  assert.ok(sshTool.isReadonlyAction({ action: "list" }) && sshTool.isReadonlyAction({ action: "read" }), "list / read 免审")
  for (const action of ["connect", "send", "secret_input", "close"]) assert.equal(sshTool.isReadonlyAction({ action }), false, `${action} 过门（携密动作仍属写动作）`)
  assert.ok(SUBAGENT_TOOL_EXCLUSIONS.has("ssh"), "depth>0 排除（单源排除集）")
  assert.equal(excludeSubagentTools([sshTool, { name: "read" }]).some((t) => t.name === "ssh"), false, "子代表零 ssh")
  const { builtinTools } = await import(`file://${core("tools/index.mjs")}`)
  assert.ok(builtinTools.some((t) => t.name === "ssh"), "F1 注册面可枚举（NS5）")
  assert.deepEqual(SSH_ACTIONS, ["connect", "send", "read", "secret_input", "close", "list"])
  assert.match(validateArgs({ action: "nope" }), /unknown ssh action/)
  assert.match(validateArgs({ action: "connect" }), /requires host/)
  assert.match(validateArgs({ action: "send", id: "ssh#1" }), /requires data/)
  assert.match(validateArgs({ action: "read" }), /requires id/)
  assert.equal(validateArgs({ action: "list" }), null)
})

test("审批文案：一般含将发送原文；携密径掩码占位（值不回显）（NS3）", () => {
  const sent = formatPermission("ssh", { action: "send", id: "ssh#3", data: "show running-config" })
  assert.match(sent, /将发送/); assert.match(sent, /show running-config/)
  const secret = formatPermission("ssh", { action: "secret_input", id: "ssh#3", label: "enable" })
  assert.match(secret, /••••••/, "掩码占位"); assert.match(secret, /携密——值不回显/)
  assert.match(formatPermission("ssh", { action: "connect", host: "10.0.0.5", user: "admin" }), /admin@10\.0\.0\.5/)
})

test("词面单源：ssh.* 键族齐备（弹窗 / 字段 / 失败句——三端投影面）", async () => {
  const { CORE_MESSAGES, t } = await import(`file://${core("i18n.mjs")}`)
  for (const key of ["ssh.credentialTitle", "ssh.credentialPrompt", "ssh.secretTitle", "ssh.secretPrompt",
    "ssh.field.user", "ssh.field.password", "ssh.field.secret", "ssh.no_ui"]) {
    assert.ok(CORE_MESSAGES[key]?.en && CORE_MESSAGES[key]?.zh, `核字典缺键 / 双语缺：${key}`)
    assert.notEqual(t(key, { host: "h" }), key, `${key} 端投影解析失败`)
  }
  assert.match(CORE_MESSAGES["ssh.no_ui"].en, /use key-based auth or ssh-agent/, "无 UI 失败句含指引（E6）")
  assert.match(CORE_MESSAGES["ssh.credentialPrompt"].en, /\$\{host\}/, "载荷三值插值位（host）")
})

test("会话中止：逐条杀树 + 出池 + 墓碑 + 一次提醒（④）", async () => {
  resetSpawns()
  const { parent, ctx } = harness()
  parent._sessionSignal = AbortSignal.abort({ abortTrigger: "stop" })
  process.env.TC_TEST_SSH_MODE = "key"
  try {
    const res = await connectSsh(parent, ctx, { host: "abort.example", user: "ops", promptPattern: "R1#" })
    assert.equal(res.error, undefined, res.error)
    assert.equal(parent._sshSessions.size, 1)
    const out = discardAbortedSshSessions(parent)
    assert.equal(out.discarded.length, 1)
    assert.deepEqual(out.discarded[0], { id: 1, role: "ssh", host: "abort.example", user: "ops" })
    assert.equal(parent._sshSessions.size, 0, "清池")
    assert.match(parent.history.at(-1).content, /1 ssh session\(s\) were closed by the user's Stop/)
    assert.equal(tombstoneOf(parent, 1).status, "discarded", "墓碑（报告不可达面）")
    const after = await sendSsh(parent, ctx, { id: 1, data: "x" })
    assert.match(after.error, /closed when the run was stopped/)
  } finally {
    await cleanup(parent)
    delete process.env.TC_TEST_SSH_MODE
  }
})

test("闲置 600 s 口径：到点自动关 + digest 注记；此后 send 回「会话已结束」（B3/E5）", async () => {
  const { parent, ctx } = harness()
  _setSshIdleMsForTest(150)
  process.env.TC_TEST_SSH_MODE = "key"
  try {
    await connectSsh(parent, ctx, { host: "idle.example", promptPattern: "R1#" })
    await sleep(400)
    assert.equal(parent._sshSessions.size, 0, "闲置到点自动关（出池）")
    assert.match(parent.history.at(-1).content, /was closed after \d+s idle/, "digest 注记")
    const after = await sendSsh(parent, ctx, { id: 1, data: "x" })
    assert.match(after.error, /is closed — open a new session/)
  } finally {
    _setSshIdleMsForTest(null)
    await cleanup(parent)
    delete process.env.TC_TEST_SSH_MODE
  }
})

test("池帽 ≤4：超限显式拒（零静默关旧）（B4）+ close 清出 + list 空面", async () => {
  const { parent, ctx } = harness()
  const creds = windowStub([])
  ctx.onSecretInput = creds.fn
  process.env.TC_TEST_SSH_MODE = "key"
  try {
    for (let i = 1; i <= SSH_SESSION_MAX; i++) {
      const r = await connectSsh(parent, ctx, { host: `h${i}`, promptPattern: "R1#" })
      assert.equal(r.error, undefined, r.error)
    }
    const fifth = await connectSsh(parent, ctx, { host: "h5", promptPattern: "R1#" })
    assert.match(fifth.error, new RegExp(`ssh session cap reached \\(${SSH_SESSION_MAX}/${SSH_SESSION_MAX} live`))
    assert.equal(parent._sshSessions.size, SSH_SESSION_MAX, "零静默关旧（池原样）")
    const live = listSsh(parent)
    assert.equal(live.text.trim().split("\n").length, SSH_SESSION_MAX)
    const closed = await closeSsh(parent, ctx, { id: 2 })
    assert.match(closed.text, /— closed/)
    assert.equal(parent._sshSessions.size, SSH_SESSION_MAX - 1, "close 清出池")
    const reopened = await connectSsh(parent, ctx, { host: "h5", promptPattern: "R1#" })
    assert.equal(reopened.error, undefined, reopened.error)
    await closeSsh(parent, ctx, { id: 1 })
    await closeSsh(parent, ctx, { id: 3 })
    await closeSsh(parent, ctx, { id: 4 })
    await closeSsh(parent, ctx, { id: 5 })
    assert.match(listSsh(parent).text, /\(no live ssh sessions\)/)
  } finally {
    await cleanup(parent)
    delete process.env.TC_TEST_SSH_MODE
  }
})

test("远端断开 / close 后：后续调用回「已结束」，池转终态（E5）", async () => {
  const { parent, ctx } = harness()
  process.env.TC_TEST_SSH_MODE = "key"
  try {
    await connectSsh(parent, ctx, { host: "bye.example", promptPattern: "R1#" })
    await sendSsh(parent, ctx, { id: 1, data: "exit" }) // 夹具收到 exit ⇒ 进程退出（远端主动断）
    await sleep(120)
    assert.equal(parent._sshSessions.size, 0, "远端断 ⇒ 池条目转终态（出池）")
    const after = await sendSsh(parent, ctx, { id: 1, data: "x" })
    assert.match(after.error, /ended \(the remote closed the connection\)/)
    const unknown = await readSsh(parent, ctx, { id: "ssh#99" })
    assert.match(unknown.error, /unknown ssh session id/)
  } finally {
    await cleanup(parent)
    delete process.env.TC_TEST_SSH_MODE
  }
})

test("无 ssh 二进制：可读失败句 + 指引（E6 第一半——spawn 失败面）", async () => {
  const { parent, ctx } = harness()
  _setSshBinaryForTest(join(sandbox, "no-such-ssh-binary"), [])
  try {
    const res = await connectSsh(parent, ctx, { host: "example" })
    assert.match(res.error, /ssh client not available/); assert.match(res.error, /install system OpenSSH or check PATH/, "指引句")
    assert.equal(parent._sshSessions.size, 0, "不入池")
  } finally { _setSshBinaryForTest(process.execPath, [fakeSsh]); await cleanup(parent) }
})

test("带密会话未就绪（回合中止）：杀树收尾，零悬挂进程（评审 #1 修验证）", async () => {
  resetSpawns()
  const { parent, ctx } = harness()
  const ctrl = new AbortController()
  ctx.signal = ctrl.signal
  const win = windowStub([{ user: "root", password: "right-pw" }])
  ctx.onSecretInput = win.fn
  process.env.TC_TEST_SSH_MODE = "password-hang"
  process.env.TC_TEST_SSH_PASSWORD = "right-pw"
  try {
    const p = connectSsh(parent, ctx, { host: "hang.example", user: "ops", promptPattern: "R1#" })
    for (let i = 0; i < 80 && !spawns().some((s) => s.secret !== null); i++) await sleep(25) // 等带密会话在飞
    const entry = parent._sshSessions.get("1")
    ctrl.abort() // 回合中止（Stop）：带密 settle 未就绪
    const res = await p
    assert.match(res.error, /the session was not established/, "带密未就绪 ⇒ 可读失败句")
    for (let i = 0; i < 40 && !entry.exitInfo; i++) await sleep(25)
    assert.ok(entry.exitInfo, "子进程已收尾（exit 已至——零悬挂，评审 #1）")
    assert.equal(parent._sshSessions.size, 0, "出池")
  } finally { await cleanup(parent); delete process.env.TC_TEST_SSH_MODE; delete process.env.TC_TEST_SSH_PASSWORD }
})

test("状态保持 ∥ 分页：跨调用同进程（cd/pwd）+ `--More--` 空格继续（S2/S3/B5/N3）", async () => {
  resetSpawns()
  const { parent, ctx } = harness()
  process.env.TC_TEST_SSH_MODE = "key"
  try {
    const conn = await connectSsh(parent, ctx, { host: "state.example", user: "ops", promptPattern: "R1#" })
    assert.equal(conn.error, undefined, conn.error)
    await sendSsh(parent, ctx, { id: "ssh#1", data: "cd /tmp" })
    await sleep(2200) // 跨调用间隔（60 s 关节 = 同径；真机腿另计——S2）
    const pwd = await sendSsh(parent, ctx, { id: "ssh#1", data: "pwd" })
    assert.match(pwd.text, /\/tmp/, "跨调用后会话内状态仍在（同一进程——N3/S2）")
    assert.equal(spawns().length, 1, "零重连（同一 ssh#1 跨两次调用）")
    const paged = await sendSsh(parent, ctx, { id: "ssh#1", data: "pages" })
    assert.match(paged.text, /--More--/, "分页提示出现在返回文本（B5）")
    const next = await sendSsh(parent, ctx, { id: "ssh#1", data: " " })
    assert.match(next.text, /page-2/, "空格继续（第一刀不自动翻页）")
  } finally { await cleanup(parent); delete process.env.TC_TEST_SSH_MODE }
})

/** 本批会话 log 文件（沙箱 tool-results 下，按写入时间序 = 名字里的 ts 前缀）。 */
function readSshLogFiles() {
  const dir = join(sandbox, "tool-results")
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter((f) => f.endsWith(".log")).sort().map((f) => join(dir, f))
}
