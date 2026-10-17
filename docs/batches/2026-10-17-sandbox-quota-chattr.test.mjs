/**
 * 2026-10-17-sandbox-quota-chattr.test.mjs — 批内单测件（批档 = `docs/batches/2026-10-17-sandbox-quota-chattr.md`）；
 * 被测面 = `quota.mjs` 项目标记步的目录/文件分治（设计档 `sandbox/EXECUTION.md` §4 ②——精确命令逐字 + 单一步标签）
 * ∥ 恢复（N74 ∥ B77/B78 ∥ B81/B83/B84）/ 降级（B80 ∥ E59 ∥ E60）/ 读回三腿不破。假执行器逐条记命令串与步标签（未登记命令 ⇒ 抛——零静默通过）。
 * 用毕即删（零留存）：本档随批档存、不进 `test/` 收集面；§5 留一行读数。
 */
import { test } from "node:test"
import assert from "node:assert/strict"

const ROOT = new URL("../../", import.meta.url)
const quota = await import(new URL("thincoder-server/src/sandbox/quota.mjs", ROOT))
const box = await import(new URL("thincoder-server/src/sandbox/box.mjs", ROOT))
const { openDatabase } = await import(new URL("thincoder-server/src/store/db.mjs", ROOT))

const PATH = "/ws/12"
const IMAGE = `${PATH}.loop.img`
const PROJECT = 100012
/** 设计 §4 ② 精确命令（逐字——`<path>`/`<id>` 插值后；目录半句含 `+P`，文件半句不含）。 */
const CHATTR = `find ${PATH} -type d -exec chattr -p ${PROJECT} +P {} + && find ${PATH} -type f -exec chattr -p ${PROJECT} {} +`
const STEP = "ext4 项目标记"
const CHATTR_RE = /^find .* -exec chattr/

// ── 假主机命令面（逐条回放 + 记命令串/步标签）────────────────────────────────

/** 规则表 ⇒ `exec`（首条命中；缺省 = exit 0 空输出）。 */
function fakeExec(rules = []) {
  const calls = []
  const spent = new Set()
  const exec = async (command, opts = {}) => {
    calls.push({ command, label: opts?.label ?? null })
    for (const rule of rules) {
      if (spent.has(rule)) continue
      const hit = typeof rule.match === "string" ? command.includes(rule.match) : rule.match.test(command)
      if (!hit) continue
      if (rule.once === true) spent.add(rule)
      return { exitCode: rule.exitCode ?? 0, stdout: rule.stdout ?? "", stderr: rule.stderr ?? "" }
    }
    // 未登记命令 ⇒ 抛（假绿放大器：静默通过会让多发/漂移的命令隐形）
    throw new Error(`未预期命令（规则面未登记）：${command}`)
  }
  return { exec, calls }
}

/** 项目标记步调用（命令串 + 步标签）。 */
const chattrCalls = (calls) => calls.filter((item) => CHATTR_RE.test(item.command))
/** 变更性命令六族（设计 §4 健康径口径：`umount` ∥ `losetup -d` ∥ `truncate` ∥ `mkfs` ∥ `mount` ∥ `chown`）——降级越界的判据面。 */
const MUTATING = /^(umount |losetup -d |truncate -s |mkfs\.ext4 |mount -o |chown )/
const mutating = (calls) => calls.map((item) => item.command).filter((command) => MUTATING.test(command))

const findmnt = (target, source, fstype, options) => ({ match: /^findmnt /, stdout: `${target} ${source} ${fstype}   ${options}\n` })
const mounted = { match: /^mountpoint -q /, stdout: "mounted\n" }
const bare = { match: /^mountpoint -q /, stdout: "bare\n" }
const imagePresent = { match: /^test -f /, stdout: "yes\n" }
const imageAbsent = { match: /^test -f /, stdout: "no\n" }
const dump = (target, uuid, features) => ({
  match: new RegExp(`^dumpe2fs -h ${target.replace(/[/.]/g, (c) => `\\${c}`)} `),
  stdout: `Filesystem UUID:          ${uuid}\nFilesystem features:      ${features}\n`,
})
const loopList = (rows) => ({ match: /^losetup -a /, stdout: rows.map(([name, back]) => `${name} ${back}\n`).join("") })
const ok = (match) => ({ match })
/** 项目标记步失败（红腿：`+P` 落非目录；机检面 = 步标签 + 非零——错误文本仅参考）。 */
const chattrFails = { match: CHATTR_RE, exitCode: 1, stderr: "chattr: Operation not supported while setting flags on /ws/12\n" }
/** 读回核读数（`repquota` 行 = `#<id> <used> <soft> <hard> …`——`step` 的 [3] = hard 块）。 */
const repquota = { match: /^repquota -P -n /, stdout: `#${PROJECT}   0   0   4194304   0   0\n` }

// ── 假 Docker 客户端 + 内存库（`box.mjs` 链面）────────────────────────────────

function fakeClient() {
  const state = { network: false, container: null }
  return {
    async containers() {
      return { json: state.container === null ? [] : [{ Names: ["/tc-ws-12"], Id: state.container, State: "running" }] }
    },
    async containerState() {
      return { state: { running: true, startedAt: new Date(0).toISOString() } }
    },
    async inspectNetwork() {
      if (!state.network) {
        const error = new Error("network not found")
        error.status = 404
        throw error
      }
      return { Id: "net-1" }
    },
    async createNetwork() {
      state.network = true
      return { json: {} }
    },
    async createContainer() {
      state.container = "c1"
      return { json: { Id: "c1" } }
    },
    async startContainer() {
      return { json: {} }
    },
  }
}

function memoryDb() {
  const db = openDatabase(":memory:")
  db.prepare("INSERT INTO sandbox_settings (k, v) VALUES (?, ?)").run("workspaceRoot", JSON.stringify("/ws"))
  return db
}

const WORKSPACE = { id: 12, name: "sandbox:12", key_plain: "sk-ws-12", limits_json: null }
const RUNNER = { id: 3, name: "sh-mgr" }
const auditKinds = (db) =>
  db.prepare("SELECT json_extract(detail, '$.kind') AS kind, json_extract(detail, '$.recovery') AS recovery FROM audit_events ORDER BY id").all()
const boxDeps = (rules) => {
  const host = fakeExec(rules)
  const client = fakeClient()
  return { host: { run: (runner, command) => host.exec(command), call: (runner, command) => host.exec(command), execOf: () => host.exec }, clientForRunner: () => client, calls: host.calls, now: () => 1 }
}

// ── 用例 1：目录/文件分治命令串（逐字）+ 单一步标签（ext4-project 健康径）────────

test("用例 1：ext4 径项目标记 = 目录半句（含 +P）+ 文件半句（不含）——单一步标签、赋号不丢", async () => {
  const host = fakeExec([findmnt(PATH, "/dev/vda3", "ext4", "rw,relatime,prjquota"), ok(CHATTR_RE), ok(/^setquota /), repquota])
  const applied = await quota.applyDiskQuota({ exec: host.exec, workspaceId: 12, path: PATH, diskMb: 4096 })
  const marked = chattrCalls(host.calls)
  assert.equal(marked.length, 1) // 复合一句 ⇒ 一次调用（步标签不裂）
  assert.equal(marked[0].command, CHATTR) // 逐字：`-type d … +P` + `&&` + `-type f …`
  assert.equal(marked[0].label, STEP) // 单一步标签（降级腿判据面）
  assert.equal(host.calls.filter((item) => item.label === STEP).length, 1)
  assert.equal((marked[0].command.match(/\+P/g) ?? []).length, 1) // `+P` 仅目录半句
  assert.ok(marked[0].command.indexOf("+P") < marked[0].command.indexOf("-type f")) // 目录句在前、文件句不含
  assert.equal((marked[0].command.match(/-p 100012/g) ?? []).length, 2) // 两半皆赋号（`-p` 不得丢）
  assert.ok(!marked[0].command.includes("-R")) // 递归形退场
  assert.equal(applied.mechanism, "ext4-project")
  assert.equal(applied.recovery, null)
  assert.deepEqual(applied.readback, { hardBlocks: 4194304, blockSize: 1024, expectedBlocks: 4194304 })
})

// ── 用例 2/3：恢复两腿（reconnect ∥ rebuild）不破 ─────────────────────────────

test("用例 2（B77）：陈旧挂载 ⇒ 重接；序列尾 = 分治标记步 → setquota → repquota（recovery = reconnect）", async () => {
  const host = fakeExec([
    findmnt(PATH, "/dev/loop32", "ext4", "rw,relatime"),
    mounted,
    imagePresent,
    dump(IMAGE, "u-new", "has_journal extent quota project"),
    dump("/dev/loop32", "u-old", "has_journal extent quota"),
    loopList([["/dev/loop32", IMAGE]]),
    ok(/^umount /),
    ok(/^losetup -d /),
    ok(/^mount -o loop,prjquota /),
    ok(/^chown /),
    ok(CHATTR_RE),
    ok(/^setquota /),
    repquota,
  ])
  const applied = await quota.applyDiskQuota({ exec: host.exec, workspaceId: 12, path: PATH, diskMb: 4096 })
  assert.equal(applied.recovery, "reconnect")
  assert.equal(applied.mechanism, "loopback")
  const cmds = host.calls.map((item) => item.command)
  const at = cmds.indexOf(CHATTR)
  assert.equal(at, cmds.indexOf(`chown 1000:1000 ${PATH}`) + 1) // 标记步紧随属主步（§13 B77 序列尾）
  assert.deepEqual(cmds.slice(at, at + 2), [CHATTR, `setquota -P ${PROJECT} 4194304 4194304 0 0 ${PATH} 2>/dev/null || setquota -P ${PROJECT} 4194304 4194304 0 0 ${PATH}`])
  assert.equal(cmds.at(-1), `repquota -P -n ${PATH}`)
  assert.deepEqual(chattrCalls(host.calls).map((item) => item.label), [STEP])
})

test("用例 3（B78）：镜像缺 project ⇒ 重建（mkfs 在场）+ 分治标记步续走（recovery = rebuild）", async () => {
  const host = fakeExec([
    findmnt(PATH, "/dev/loop32", "ext4", "rw,relatime"),
    mounted,
    imagePresent,
    dump(IMAGE, "u-old", "has_journal extent quota"),
    dump("/dev/loop32", "u-old", "has_journal extent quota"),
    loopList([["/dev/loop32", IMAGE]]),
    ok(/^umount /),
    ok(/^losetup -d /),
    ok(/^truncate -s /),
    ok(/^mkfs\.ext4 /),
    ok(/^mount -o loop,prjquota /),
    ok(/^chown /),
    ok(CHATTR_RE),
    ok(/^setquota /),
    repquota,
  ])
  const applied = await quota.applyDiskQuota({ exec: host.exec, workspaceId: 12, path: PATH, diskMb: 4096 })
  assert.equal(applied.recovery, "rebuild")
  assert.ok(host.calls.some((item) => item.command === `mkfs.ext4 -q -O project,quota -F ${IMAGE}`))
  assert.deepEqual(chattrCalls(host.calls).map((item) => item.label), [STEP])
})

// ── 用例 4/5：降级腿（demote）与再失败 ⇒ 停（判据 = 步标签，零随动）──────────────

test("用例 4（B80）：ext4 径标记步失败 ⇒ 降 loopback 径；两径皆执行同一分治命令（recovery = demote）", async () => {
  const host = fakeExec([
    findmnt("/ws", "/dev/sdb1", "ext4", "rw,relatime,prjquota"),
    bare,
    imageAbsent,
    { ...chattrFails, once: true }, // 首径失败 ⇒ 触发降级（判据 = 步标签）
    ok(/^truncate -s /),
    ok(/^mkfs\.ext4 /),
    ok(/^mount -o loop,prjquota /),
    ok(/^chown /),
    ok(CHATTR_RE),
    ok(/^setquota /),
    repquota,
  ])
  const applied = await quota.applyDiskQuota({ exec: host.exec, workspaceId: 12, path: PATH, diskMb: 4096 })
  assert.equal(applied.recovery, "demote")
  assert.equal(applied.mechanism, "loopback")
  const marked = chattrCalls(host.calls)
  assert.equal(marked.length, 2) // ext4-project 径一次 + loopback 径一次
  assert.deepEqual(marked.map((item) => item.command), [CHATTR, CHATTR])
  assert.deepEqual(marked.map((item) => item.label), [STEP, STEP]) // 两径复用同一步标签（守卫判据零随动）
})

test("用例 5（E60）：降级后标记步再失败 ⇒ 停（恰两次尝试、零第二次降级；留痕两行）", async () => {
  const db = memoryDb()
  const deps = boxDeps([
    ok(/^mkdir -p /),
    findmnt("/ws", "/dev/sdb1", "ext4", "rw,relatime,prjquota"),
    bare,
    imageAbsent,
    chattrFails,
    ok(/^truncate -s /),
    ok(/^mkfs\.ext4 /),
    ok(/^mount -o loop,prjquota /),
    ok(/^chown /),
  ])
  await assert.rejects(() => box.createWorkspaceBox(db, WORKSPACE, RUNNER, deps), /② 配额就位失败/)
  assert.equal(chattrCalls(deps.calls).length, 2) // 零第三次
  assert.equal(deps.calls.filter((item) => item.command.startsWith("mkfs.ext4")).length, 1)
  const kinds = auditKinds(db)
  assert.deepEqual(kinds.map((row) => row.kind), ["quota_recovered", "quota_apply_failed"]) // 留痕语义零随动
  assert.equal(kinds[0].recovery, "demote")
  db.close()
})

test("用例 6：非标记步失败（读回核）不触发降级——守卫判据 = 步标签（零随动）", async () => {
  const host = fakeExec([
    findmnt(PATH, "/dev/vda3", "ext4", "rw,relatime,prjquota"),
    ok(CHATTR_RE),
    ok(/^setquota /),
    { match: /^repquota /, exitCode: 1, stderr: "repquota: Cannot stat() mounted device\n" },
  ])
  await assert.rejects(() => quota.applyDiskQuota({ exec: host.exec, workspaceId: 12, path: PATH, diskMb: 4096 }), /ext4 读回核失败/)
  assert.equal(chattrCalls(host.calls).length, 1)
  assert.ok(mutating(host.calls).length === 0) // 零降级动作（六族全扫——非只三族）
})

// ── 用例 7：读回核两腿（不符 ∥ 无行）不破 ─────────────────────────────────────

test("用例 7：读回核不符 ∥ 项目行不在 ⇒ 抛（同停）", async () => {
  const mismatch = fakeExec([
    findmnt(PATH, "/dev/vda3", "ext4", "rw,relatime,prjquota"),
    ok(CHATTR_RE),
    ok(/^setquota /),
    { match: /^repquota /, stdout: `#${PROJECT}   0   0   2048   0   0\n` },
  ])
  await assert.rejects(() => quota.applyDiskQuota({ exec: mismatch.exec, workspaceId: 12, path: PATH, diskMb: 4096 }), /ext4 读回核不符/)
  const missing = fakeExec([findmnt(PATH, "/dev/vda3", "ext4", "rw,relatime,prjquota"), ok(CHATTR_RE), ok(/^setquota /), { match: /^repquota /, stdout: "" }])
  await assert.rejects(() => quota.applyDiskQuota({ exec: missing.exec, workspaceId: 12, path: PATH, diskMb: 4096 }), /不在 repquota 读数面/)
})

// ── 用例 8：盒链健康径（ext4-project）——零 quota_recovered + 标记步一次 ────────

test("用例 8：建盒链 ext4-project 径 ⇒ 零 quota_recovered 行（留痕零随动）+ 标记步恰一次", async () => {
  const db = memoryDb()
  const deps = boxDeps([ok(/^mkdir -p /), ok(/^chown /), findmnt(PATH, "/dev/vda3", "ext4", "rw,relatime,prjquota"), ok(CHATTR_RE), ok(/^setquota /), repquota])
  const created = await box.createWorkspaceBox(db, WORKSPACE, RUNNER, deps)
  assert.equal(created.path, PATH)
  assert.deepEqual(auditKinds(db).map((row) => row.kind), ["workspace_create"])
  assert.equal(chattrCalls(deps.calls).length, 1)
  assert.equal(chattrCalls(deps.calls)[0].command, CHATTR)
  db.close()
})

// ── 用例 9–12：§13 余行（B81 ∥ B83 ∥ B84 ∥ E59）——分治形下序列尾不破 ──────────

test("用例 9（B81）：外来挂载 ⇒ umount + 重接、零 losetup -d；分治标记步续走（recovery = reconnect）", async () => {
  const host = fakeExec([
    findmnt(PATH, "/dev/sdb1", "ext4", "rw,relatime"),
    mounted,
    imagePresent,
    dump(IMAGE, "u-new", "has_journal extent quota project"),
    ok(/^umount /),
    ok(/^mount -o loop,prjquota /),
    ok(/^chown /),
    ok(CHATTR_RE),
    ok(/^setquota /),
    repquota,
  ])
  const applied = await quota.applyDiskQuota({ exec: host.exec, workspaceId: 12, path: PATH, diskMb: 4096 })
  assert.equal(applied.recovery, "reconnect")
  assert.ok(!host.calls.some((item) => item.command.startsWith("losetup"))) // 归属判据外 ⇒ 零 detach
  assert.deepEqual(mutating(host.calls), [`umount ${PATH}`, `mount -o loop,prjquota ${IMAGE} ${PATH}`, `chown 1000:1000 ${PATH}`])
  assert.deepEqual(chattrCalls(host.calls).map((item) => item.command), [CHATTR])
})

test("用例 10（B83）：裸径 + 镜像在场缺 project ⇒ 抹既有镜像 + 分治标记步续走（recovery = rebuild）", async () => {
  const host = fakeExec([
    findmnt("/", "/dev/vda3", "ext4", "rw,relatime"),
    bare,
    imagePresent,
    dump(IMAGE, "u-old", "has_journal extent quota"),
    ok(/^truncate -s /),
    ok(/^mkfs\.ext4 /),
    ok(/^mount -o loop,prjquota /),
    ok(/^chown /),
    ok(CHATTR_RE),
    ok(/^setquota /),
    repquota,
  ])
  const applied = await quota.applyDiskQuota({ exec: host.exec, workspaceId: 12, path: PATH, diskMb: 4096 })
  assert.equal(applied.recovery, "rebuild")
  assert.equal(applied.mechanism, "loopback")
  const cmds = host.calls.map((item) => item.command)
  const at = cmds.indexOf(`truncate -s 4160M ${IMAGE} 2>/dev/null || fallocate -l 4160M ${IMAGE}`)
  assert.deepEqual(cmds.slice(at, at + 3), [
    `truncate -s 4160M ${IMAGE} 2>/dev/null || fallocate -l 4160M ${IMAGE}`,
    `mkfs.ext4 -q -O project,quota -F ${IMAGE}`,
    `mount -o loop,prjquota ${IMAGE} ${PATH}`,
  ])
  assert.ok(cmds.indexOf(CHATTR) > cmds.indexOf(`chown 1000:1000 ${PATH}`)) // 分治标记步在属主步后
  assert.ok(!cmds.some((command) => command.startsWith("umount") || command.startsWith("losetup"))) // 裸路径 ⇒ 零卸除
})

test("用例 11（B84）：陈旧挂载 + 镜像不在 ⇒ 卸 + 重建 + 分治标记步续走（recovery = rebuild）", async () => {
  const host = fakeExec([
    findmnt(PATH, "/dev/loop40", "ext4", "rw,relatime"),
    mounted,
    imageAbsent,
    dump("/dev/loop40", "u-old", "has_journal extent quota project"),
    loopList([["/dev/loop40", IMAGE]]),
    ok(/^umount /),
    ok(/^losetup -d /),
    ok(/^truncate -s /),
    ok(/^mkfs\.ext4 /),
    ok(/^mount -o loop,prjquota /),
    ok(/^chown /),
    ok(CHATTR_RE),
    ok(/^setquota /),
    repquota,
  ])
  const applied = await quota.applyDiskQuota({ exec: host.exec, workspaceId: 12, path: PATH, diskMb: 4096 })
  assert.equal(applied.recovery, "rebuild")
  assert.deepEqual(mutating(host.calls).slice(0, 4), [
    `umount ${PATH}`,
    "losetup -d /dev/loop40",
    `truncate -s 4160M ${IMAGE} 2>/dev/null || fallocate -l 4160M ${IMAGE}`,
    `mkfs.ext4 -q -O project,quota -F ${IMAGE}`,
  ])
  assert.equal(chattrCalls(host.calls).length, 1)
})

test("用例 12（E59）：重建后标记步失败 ⇒ 停（已在 loopback 径——零降级）；留痕 rebuild + failed 双行", async () => {
  const db = memoryDb()
  const deps = boxDeps([
    ok(/^mkdir -p /),
    findmnt(PATH, "/dev/loop40", "ext4", "rw,relatime"),
    mounted,
    imagePresent,
    dump(IMAGE, "u-old", "has_journal extent quota"),
    dump("/dev/loop40", "u-old", "has_journal extent quota"),
    loopList([["/dev/loop40", IMAGE]]),
    ok(/^umount /),
    ok(/^losetup -d /),
    ok(/^truncate -s /),
    ok(/^mkfs\.ext4 /),
    ok(/^mount -o loop,prjquota /),
    ok(/^chown /),
    chattrFails,
  ])
  await assert.rejects(() => box.createWorkspaceBox(db, WORKSPACE, RUNNER, deps), /② 配额就位失败/)
  const kinds = auditKinds(db)
  assert.deepEqual(kinds.map((row) => row.kind), ["quota_recovered", "quota_apply_failed"])
  assert.equal(kinds[0].recovery, "rebuild")
  assert.equal(deps.calls.filter((item) => item.command.startsWith("mkfs.ext4")).length, 1) // 零第二次重建
  assert.equal(chattrCalls(deps.calls).length, 1) // 零降级重试
  db.close()
})
