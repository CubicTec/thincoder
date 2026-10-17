/**
 * 2026-10-17-box-shell-update.test.mjs — 批内单测件（批档 = `docs/batches/2026-10-17-box-shell-update.md`，
 * §2 用例 ↔ 设计档 `sandbox/EXECUTION.md` §13：N89 ∥ B85–B88 ∥ E65）。
 *
 * 被测面 = 真件（`deploy/sandbox/member-shell/bootstrap.mjs` ∥ `deploy/pack-box-shell.mjs`）+ 假件
 * （假 fetch / 假 spawn / 假 fs 根——桩在内存节点表上）。跑法：
 * `cd thincoder-server && node --test "../docs/batches/2026-10-17-box-shell-update.test.mjs"`。
 * **用毕即删（零留存）**：本档随批档存、不进 `test/` 收集面；§5 留一行读数。
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import { EventEmitter } from "node:events"
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT_URL = new URL("../../", import.meta.url)
const SHELL_SOURCE = fileURLToPath(new URL("thincoder-server/deploy/sandbox/member-shell/", ROOT_URL))
const boot = await import(new URL("thincoder-server/deploy/sandbox/member-shell/bootstrap.mjs", ROOT_URL))
const pack = await import(new URL("thincoder-server/deploy/pack-box-shell.mjs", ROOT_URL))

const { hashEntries, listTree, packTar, treeHash, versionLine, runBootstrap, BUILTIN_ENV, CORE_ENV, SKIP_ENV, SOURCE_ENV } = boot
const SERVER = "http://srv:8080"
const MANIFEST_URL = `${SERVER}/box-shell/manifest.json`
const HOME = "/home/box"
const ROOT = join(HOME, ".tc-shell")
const BUILTIN = "/opt/thincoder/app/shell"
const CORE = "/opt/thincoder/app/node_modules/@thincoder/core"
const ENV = { HOME, TC_SERVER_URL: SERVER, OPENAI_API_KEY: "sk-ws", OPENAI_BASE_URL: `${SERVER}/v1` }
const quiet = { warn() {}, info() {} }
const SHELL_V1 = { "index.mjs": "// v1 index\n", "core-run.mjs": "// v1 core-run\n", "git-cred.mjs": "#!/usr/bin/env node\n" }
const SHELL_V2 = { "index.mjs": "// v2 index\n", "core-run.mjs": "// v2 core-run\n", "git-cred.mjs": "#!/usr/bin/env node\n" }
const entriesOf = (files) => Object.entries(files).map(([path, data]) => ({ path, data: Buffer.from(data) }))
const H1 = hashEntries(entriesOf(SHELL_V1))
const H2 = hashEntries(entriesOf(SHELL_V2))

// ── 假 fs 根（内存节点表——同步面逐件同签）──────────────────────────────────

function makeFs() {
  const nodes = new Map()
  let clock = 0
  const norm = (p) => String(p).replace(/\\/g, "/").replace(/\/+$/, "") || "/"
  const parentOf = (p) => p.slice(0, p.lastIndexOf("/")) || "/"
  const baseOf = (p) => p.slice(p.lastIndexOf("/") + 1)
  const ensureDir = (path) => {
    const target = norm(path)
    if (target === "/" || nodes.has(target)) return
    ensureDir(parentOf(target))
    nodes.set(target, { type: "dir", at: ++clock })
  }
  return {
    putFile(path, data) {
      ensureDir(parentOf(norm(path)))
      nodes.set(norm(path), { type: "file", data: Buffer.from(data), at: ++clock })
    },
    putTree(root, files) {
      for (const [rel, data] of Object.entries(files)) this.putFile(`${root}/${rel}`, data)
    },
    putLink(path, target) {
      nodes.set(norm(path), { type: "link", target, at: ++clock })
    },
    readdirSync(path) {
      const dir = norm(path)
      if (!nodes.has(dir)) throw Object.assign(new Error(`ENOENT ${dir}`), { code: "ENOENT" })
      return [...nodes.keys()].filter((key) => key !== dir && parentOf(key) === dir).map(baseOf)
    },
    lstatSync(path) {
      const node = nodes.get(norm(path))
      if (!node) throw Object.assign(new Error(`ENOENT ${path}`), { code: "ENOENT" })
      return { isDirectory: () => node.type === "dir", isFile: () => node.type === "file", isSymbolicLink: () => node.type === "link", target: node.target, mtimeMs: node.at }
    },
    readFileSync(path) {
      const node = nodes.get(norm(path))
      if (!node || node.type !== "file") throw Object.assign(new Error(`ENOENT ${path}`), { code: "ENOENT" })
      return Buffer.from(node.data)
    },
    writeFileSync(path, data) {
      ensureDir(parentOf(norm(path)))
      nodes.set(norm(path), { type: "file", data: Buffer.from(data), at: ++clock })
    },
    mkdirSync(path) {
      ensureDir(path)
    },
    rmSync(path) {
      const target = norm(path)
      for (const key of [...nodes.keys()]) if (key === target || key.startsWith(`${target}/`)) nodes.delete(key)
    },
    renameSync(from, to) {
      const src = norm(from)
      const dst = norm(to)
      const moves = [...nodes.entries()].filter(([key]) => key === src || key.startsWith(`${src}/`))
      for (const [key] of moves) nodes.delete(key)
      for (const [key, node] of moves) nodes.set(dst + key.slice(src.length), node)
    },
    symlinkSync(target, path) {
      nodes.set(norm(path), { type: "link", target, at: ++clock })
    },
    chmodSync(path, mode) {
      const node = nodes.get(norm(path))
      if (node) node.mode = mode
    },
    existsSync(path) {
      return nodes.has(norm(path))
    },
  }
}

/** 槽夹具：落件 + 材料化三步（登记链接 ∥ 核链 ∥ 状态件）——版本 = 覆盖集树哈希。 */
function plantSlot(fs, files) {
  const version = hashEntries(entriesOf(files))
  const dir = join(ROOT, version)
  fs.putTree(dir, files)
  fs.putLink(join(dir, "git-credential-thincoder"), "git-cred.mjs")
  fs.mkdirSync(join(dir, "node_modules", "@thincoder"))
  fs.putLink(join(dir, "node_modules", "@thincoder", "core"), CORE)
  fs.putFile(join(dir, "state.json"), `${JSON.stringify({ version, materialized: true })}\n`)
  return version
}

// ── 假 fetch ／ 假 spawn ──────────────────────────────────────────────────

function makeFetch({ manifest = null, artifact = null } = {}) {
  const calls = []
  const fetchImpl = async (url) => {
    calls.push(url)
    if (url === MANIFEST_URL) {
      if (manifest === null) throw new Error("ENETUNREACH")
      return { ok: true, status: 200, json: async () => ({ version: manifest }) }
    }
    if (url === `${SERVER}/box-shell/${manifest}.tar`) {
      if (artifact === null) return { ok: false, status: 404 }
      return { ok: true, status: 200, arrayBuffer: async () => artifact }
    }
    return { ok: false, status: 404 }
  }
  return { fetchImpl, calls }
}

function makeSpawn(steps = []) {
  const calls = []
  const spawnImpl = (bin, args, options) => {
    calls.push({ bin, args, options })
    const step = steps.shift() ?? { code: 0 }
    const child = new EventEmitter()
    child.kill = () => {}
    setImmediate(() => child.emit("close", Object.hasOwn(step, "code") ? step.code : 0, step.signal ?? null))
    return child
  }
  return { spawnImpl, calls }
}

const bootOnce = (fs, fetch, spawn, opts = {}) =>
  runBootstrap({
    env: opts.env ?? ENV,
    shellDir: opts.shellDir ?? BUILTIN,
    rootDir: ROOT,
    fs,
    fetchImpl: fetch.fetchImpl,
    spawnImpl: spawn.spawnImpl,
    log: quiet,
    corePath: "corePath" in opts ? opts.corePath : CORE,
    nodeBin: "node",
  })

// ── N89 ∥ B85–B88 ∥ E65 ─────────────────────────────────────────────────

test("N89 取件 ⇒ 校验 ⇒ 就位 ⇒ 换执行恰一次；承接进程回 ③ 腿（零自旋）", async () => {
  const fs = makeFs()
  fs.putTree(BUILTIN, SHELL_V1)
  const fetch = makeFetch({ manifest: H2, artifact: packTar(entriesOf(SHELL_V2)) })
  const spawn = makeSpawn([{ code: 0 }])
  const out = await bootOnce(fs, fetch, spawn)

  assert.equal(out.mode, "parent")
  assert.equal(out.exitCode, 0)
  assert.deepEqual(fetch.calls, [MANIFEST_URL, `${SERVER}/box-shell/${H2}.tar`]) // 序 = manifest ⇒ 工件（镜像面/控制面零调用）
  assert.equal(spawn.calls.length, 1) // 换执行恰一次
  assert.equal(spawn.calls[0].bin, "node")
  assert.equal(spawn.calls[0].args[0], join(ROOT, H2, "index.mjs"))
  assert.equal(spawn.calls[0].options.env[SOURCE_ENV], "fetch")
  assert.equal(spawn.calls[0].options.env[CORE_ENV], CORE) // 核件位透传（槽内壳再取件仍链回镜像件位）
  assert.ok(spawn.calls[0].options.env.PATH.startsWith(join(ROOT, H2))) // 目录前置于 PATH（git 助手解析到取件件）

  // 槽 = 落件 + 材料化三步（登记链接 ∥ 核链回镜像件位 ∥ state.json）
  assert.deepEqual(JSON.parse(String(fs.readFileSync(join(ROOT, H2, "state.json")))), { version: H2, materialized: true })
  assert.equal(fs.lstatSync(join(ROOT, H2, "git-credential-thincoder")).isSymbolicLink(), true)
  assert.equal(fs.lstatSync(join(ROOT, H2, "node_modules", "@thincoder", "core")).target, CORE)
  assert.equal(treeHash(join(ROOT, H2), { fs }), H2) // 不变式：材料化后重算树哈希 == 槽名版本

  // 承接进程（槽内壳——落点经 env 传递）⇒ ③ 腿就地跑：零 spawn ∥ 版本行恰一行 源=取件
  const childSpawn = makeSpawn([])
  const child = await bootOnce(fs, fetch, childSpawn, { env: { ...ENV, [SOURCE_ENV]: "fetch" }, shellDir: join(ROOT, H2) })
  assert.equal(child.mode, "run")
  assert.equal(childSpawn.calls.length, 0) // 零自旋（启动链长 ≤1）
  assert.equal(fetch.calls.filter((url) => url.endsWith(".tar")).length, 1) // 子进程零取件
  assert.equal(versionLine(child), `[shell] 壳版本 ${H2.slice(0, 12)}（源=取件）`)
})

test("B85 ①manifest 不可达 + 缓存副本 ⇒ 换执行缓存（零重试 ∥ 零工件取件）", async () => {
  const fs = makeFs()
  fs.putTree(BUILTIN, SHELL_V1)
  const cached = plantSlot(fs, { ...SHELL_V1, "index.mjs": "// v0 index\n" })
  const fetch = makeFetch({ manifest: null })
  const spawn = makeSpawn([{ code: 0 }])
  const out = await bootOnce(fs, fetch, spawn)

  assert.equal(out.mode, "parent")
  assert.deepEqual(fetch.calls, [MANIFEST_URL]) // 本启动零重试、零取件
  assert.equal(spawn.calls.length, 1)
  assert.equal(spawn.calls[0].args[0], join(ROOT, cached, "index.mjs"))
  assert.equal(spawn.calls[0].options.env[SOURCE_ENV], "cache")
})

test("B85 ②manifest 不可达 + 无缓存副本 ⇒ 内建顶上（零 spawn ∥ 引导不抛）", async () => {
  const fs = makeFs()
  fs.putTree(BUILTIN, SHELL_V1)
  const fetch = makeFetch({ manifest: null })
  const spawn = makeSpawn([])
  const out = await bootOnce(fs, fetch, spawn)

  assert.equal(out.mode, "run")
  assert.equal(out.sourceLabel, "内建")
  assert.equal(spawn.calls.length, 0)
  assert.equal(versionLine(out), `[shell] 壳版本 ${H1.slice(0, 12)}（源=内建）`)
})

test("B85 ③工件 404 + 缓存副本 ⇒ 缓存顶上 ∥ 无缓存副本 ⇒ 内建顶上", async () => {
  const withCache = makeFs()
  withCache.putTree(BUILTIN, SHELL_V1)
  const cached = plantSlot(withCache, { ...SHELL_V1, "index.mjs": "// v0 index\n" })
  const fetchA = makeFetch({ manifest: H2, artifact: null })
  const spawnA = makeSpawn([{ code: 0 }])
  const a = await bootOnce(withCache, fetchA, spawnA)
  assert.equal(a.mode, "parent")
  assert.deepEqual(fetchA.calls, [MANIFEST_URL, `${SERVER}/box-shell/${H2}.tar`])
  assert.equal(spawnA.calls[0].args[0], join(ROOT, cached, "index.mjs"))
  assert.equal(spawnA.calls[0].options.env[SOURCE_ENV], "cache")

  const bare = makeFs()
  bare.putTree(BUILTIN, SHELL_V1)
  const fetchB = makeFetch({ manifest: H2, artifact: null })
  const spawnB = makeSpawn([])
  const b = await bootOnce(bare, fetchB, spawnB)
  assert.equal(b.mode, "run")
  assert.equal(b.sourceLabel, "内建")
  assert.equal(spawnB.calls.length, 0)
  assert.equal(bare.existsSync(join(ROOT, "staging")), false) // 暂存已丢弃
})

test("B86 工件字节被改（树哈希 ≠ manifest）⇒ 丢弃暂存、缓存零变、零换入", async () => {
  const fs = makeFs()
  fs.putTree(BUILTIN, SHELL_V1)
  const cached = plantSlot(fs, { ...SHELL_V1, "index.mjs": "// v0 index\n" })
  const stateBefore = String(fs.readFileSync(join(ROOT, cached, "state.json")))
  const fetch = makeFetch({ manifest: H2, artifact: packTar(entriesOf(SHELL_V1)) }) // 真 tar——但树哈希 H1 ≠ H2
  const spawn = makeSpawn([{ code: 0 }])
  const out = await bootOnce(fs, fetch, spawn)

  assert.equal(fs.existsSync(join(ROOT, H2)), false) // 零换入
  assert.equal(fs.existsSync(join(ROOT, "staging")), false) // 暂存丢弃
  assert.equal(String(fs.readFileSync(join(ROOT, cached, "state.json"))), stateBefore) // 缓存零变
  assert.equal(spawn.calls.length, 1)
  assert.equal(spawn.calls[0].args[0], join(ROOT, cached, "index.mjs")) // 回退 = 缓存
  assert.equal(out.mode, "parent")
})

test("B87 零行为变化腿：内建 == manifest ⇒ 零工件取件 ∥ 零 spawn ∥ 单行 源=内建", async () => {
  const fs = makeFs()
  fs.putTree(BUILTIN, SHELL_V1)
  const fetch = makeFetch({ manifest: H1 })
  const spawn = makeSpawn([])
  const out = await bootOnce(fs, fetch, spawn)

  assert.equal(out.mode, "run")
  assert.equal(out.sourceLabel, "内建")
  assert.deepEqual(fetch.calls, [MANIFEST_URL]) // 零工件取件调用
  assert.equal(spawn.calls.length, 0) // 本进程就地跑
  assert.equal(versionLine(out), `[shell] 壳版本 ${H1.slice(0, 12)}（源=内建）`)
})

test("B88 ①缓存槽复用（复验过）⇒ 换执行恰一次 ∥ 零取件；承接进程零自旋", async () => {
  const fs = makeFs()
  fs.putTree(BUILTIN, SHELL_V1)
  const cached = plantSlot(fs, SHELL_V2)
  assert.equal(cached, H2)
  assert.equal(treeHash(join(ROOT, H2), { fs }), H2)
  const fetch = makeFetch({ manifest: H2 })
  const spawn = makeSpawn([{ code: 0 }])
  const out = await bootOnce(fs, fetch, spawn)

  assert.equal(out.mode, "parent")
  assert.deepEqual(fetch.calls, [MANIFEST_URL]) // 零取件
  assert.equal(spawn.calls.length, 1) // ④ 腿命中恰一次
  assert.equal(spawn.calls[0].options.env[SOURCE_ENV], "cache")

  const childSpawn = makeSpawn([])
  const child = await bootOnce(fs, fetch, childSpawn, { env: { ...ENV, [SOURCE_ENV]: "cache" }, shellDir: join(ROOT, H2) })
  assert.equal(child.mode, "run")
  assert.equal(childSpawn.calls.length, 0) // 承接进程就地跑、零自旋
  assert.equal(versionLine(child), `[shell] 壳版本 ${H2.slice(0, 12)}（源=缓存）`)
})

test("B88 ②槽内源件被改 ⇒ 复验不过 ⇒ 槽失效（清）、不得复用", async () => {
  const fs = makeFs()
  fs.putTree(BUILTIN, SHELL_V1)
  plantSlot(fs, SHELL_V2)
  fs.putFile(join(ROOT, H2, "index.mjs"), "// tampered\n") // 覆盖集内件被改
  const fetch = makeFetch({ manifest: H2, artifact: null })
  const spawn = makeSpawn([])
  const out = await bootOnce(fs, fetch, spawn)

  assert.equal(fs.existsSync(join(ROOT, H2)), false) // 槽失效（清）
  assert.equal(spawn.calls.length, 0) // 不得复用（工件 404 ⇒ 内建顶上）
  assert.equal(out.mode, "run")
  assert.equal(out.sourceLabel, "内建")
})

test("B88 ③槽内材料化产物被改（覆盖集外）⇒ 复验照过、④ 腿不受影响", async () => {
  const fs = makeFs()
  fs.putTree(BUILTIN, SHELL_V1)
  plantSlot(fs, SHELL_V2)
  fs.putLink(join(ROOT, H2, "git-credential-thincoder"), "somewhere-else.mjs") // 登记链接换向
  fs.putFile(join(ROOT, H2, "node_modules", "@thincoder", "core", "extra.mjs"), "x") // 核链下多件
  assert.equal(treeHash(join(ROOT, H2), { fs }), H2) // 判据稳定
  const fetch = makeFetch({ manifest: H2 })
  const spawn = makeSpawn([{ code: 0 }])
  const out = await bootOnce(fs, fetch, spawn)

  assert.equal(out.mode, "parent")
  assert.equal(spawn.calls.length, 1)
  assert.equal(spawn.calls[0].args[0], join(ROOT, H2, "index.mjs"))
  assert.equal(spawn.calls[0].options.env[SOURCE_ENV], "cache")
})
test("槽内壳再取件 ⇒ 核链仍回镜像件位（不走槽旁路）", async () => {
  const fs = makeFs()
  fs.putTree(BUILTIN, SHELL_V1)
  const cached = plantSlot(fs, SHELL_V2)
  const NEXT = { ...SHELL_V2, "index.mjs": "// v3 index\n" }
  const H3 = hashEntries(entriesOf(NEXT))
  const fetch = makeFetch({ manifest: H3, artifact: packTar(entriesOf(NEXT)) })
  const spawn = makeSpawn([{ code: 0 }])
  const out = await bootOnce(fs, fetch, spawn, {
    env: { ...ENV, [SOURCE_ENV]: "cache", [CORE_ENV]: CORE, [BUILTIN_ENV]: BUILTIN },
    shellDir: join(ROOT, cached),
    corePath: undefined, // 走 env 透传/缺省解析（非注入件）
  })
  assert.equal(out.mode, "parent")
  assert.equal(spawn.calls[0].args[0], join(ROOT, H3, "index.mjs"))
  assert.equal(fs.lstatSync(join(ROOT, H3, "node_modules", "@thincoder", "core")).target, CORE) // 镜像件位
  assert.equal(fs.existsSync(join(ROOT, "node_modules")), false) // 槽旁路零产物
})

test("槽内壳发起的换执行崩 ⇒ 回退目标 = 镜像内建（非槽树）", async () => {
  const fs = makeFs()
  fs.putTree(BUILTIN, SHELL_V1)
  const cached = plantSlot(fs, SHELL_V2)
  const NEXT = { ...SHELL_V2, "index.mjs": "// v3 index\n" }
  const H3 = hashEntries(entriesOf(NEXT))
  const fetch = makeFetch({ manifest: H3, artifact: packTar(entriesOf(NEXT)) })
  const spawn = makeSpawn([{ code: 1 }, { code: 0 }])
  const out = await bootOnce(fs, fetch, spawn, {
    env: { ...ENV, [SOURCE_ENV]: "cache", [CORE_ENV]: CORE, [BUILTIN_ENV]: BUILTIN },
    shellDir: join(ROOT, cached),
  })
  assert.equal(out.mode, "parent")
  assert.equal(spawn.calls.length, 2)
  assert.equal(spawn.calls[1].args[0], join(BUILTIN, "index.mjs")) // 回退恒镜像内建（非槽树）
  assert.equal(spawn.calls[1].options.env[SOURCE_ENV], "builtin") // 版本行如实标内建
  assert.equal(fs.existsSync(join(ROOT, H3)), false) // 崩槽失效
})

test("覆盖集三排除逐条（node_modules/** ∥ state.json ∥ git-credential-thincoder）；git-cred.mjs 在集内", () => {
  const fs = makeFs()
  fs.putTree("/t", {
    "index.mjs": "a",
    "git-cred.mjs": "b",
    "state.json": "s",
    "git-credential-thincoder": "h",
    "node_modules/@thincoder/core/index.mjs": "c",
  })
  assert.deepEqual(listTree("/t", { fs }), ["git-cred.mjs", "index.mjs"]) // 集内恰两件
  const base = treeHash("/t", { fs })
  assert.equal(base, hashEntries(entriesOf({ "index.mjs": "a", "git-cred.mjs": "b" })))
  fs.putFile("/t/state.json", "changed")
  fs.putFile("/t/git-credential-thincoder", "changed")
  fs.putFile("/t/node_modules/@thincoder/core/index.mjs", "changed")
  assert.equal(treeHash("/t", { fs }), base) // 三排除件改值 ⇒ 版本不变
  fs.putFile("/t/git-cred.mjs", "changed")
  assert.notEqual(treeHash("/t", { fs }), base) // 集内件改值 ⇒ 版本变
})

test("E65 收 SIGTERM ⇒ 零回退 + 槽留（镜像退出码）", async () => {
  const fs = makeFs()
  fs.putTree(BUILTIN, SHELL_V1)
  const fetch = makeFetch({ manifest: H2, artifact: packTar(entriesOf(SHELL_V2)) })
  const calls = []
  const spawnImpl = (bin, args, options) => {
    calls.push({ bin, args, options })
    const child = new EventEmitter()
    child.kill = (signal) => setImmediate(() => child.emit("close", null, signal)) // 转发即结（模拟子收到终止信号）
    return child
  }
  const pending = bootOnce(fs, fetch, { spawnImpl, calls })
  let waited = 0
  while (process.listenerCount("SIGTERM") === 0 && waited < 200) {
    waited += 1
    await new Promise((done) => setTimeout(done, 1))
  }
  assert.equal(process.listenerCount("SIGTERM"), 1) // 引导件已挂转发监听（未按时挂上 ⇒ 失败，不挂死）
  process.emit("SIGTERM") // 父进程收终止信号（本测试进程内唯一该信号监听者 = 引导件）
  const out = await pending

  assert.equal(calls.length, 1) // 零回退
  assert.equal(out.exitCode, 143) // 128 + SIGTERM(15)——镜像退出码
  assert.equal(fs.existsSync(join(ROOT, H2)), true) // 槽留
  assert.equal(process.listenerCount("SIGTERM"), 0) // 监听器已摘
})

test("E65 换执行崩 ⇒ 回退内建一次（跳过引导旗标 ⇒ 零递归）+ 槽失效；两行判末行", async () => {
  const fs = makeFs()
  fs.putTree(BUILTIN, SHELL_V1)
  const fetch = makeFetch({ manifest: H2, artifact: packTar(entriesOf(SHELL_V2)) })
  const spawn = makeSpawn([{ code: 1 }, { code: 0 }]) // ①取件子崩 ②回退内建子正常退出
  const out = await bootOnce(fs, fetch, spawn)

  assert.equal(out.mode, "parent")
  assert.equal(spawn.calls.length, 2) // 换执行一次 + 回退一次（终态）
  assert.equal(spawn.calls[0].args[0], join(ROOT, H2, "index.mjs"))
  assert.equal(spawn.calls[1].args[0], join(BUILTIN, "index.mjs"))
  assert.equal(spawn.calls[1].options.env[SKIP_ENV], "1") // 跳过引导旗标
  assert.equal(fs.existsSync(join(ROOT, H2)), false) // 该槽失效（清）
  assert.equal(out.exitCode, 0) // 父镜像子退出码

  // 回退内建子（跳过引导径）⇒ 就地跑内建、零再执行（零递归）
  const again = makeSpawn([])
  const fallback = await bootOnce(fs, fetch, again, { env: { ...ENV, [SKIP_ENV]: "1", [SOURCE_ENV]: "builtin" } })
  assert.equal(fallback.mode, "run")
  assert.equal(fallback.sourceLabel, "内建")
  assert.equal(again.calls.length, 0)

  // 版本行两行：首 = 取件子 ∥ 末 = 回退内建（判读取末行）
  const lines = [versionLine({ version: H2, source: "fetch" }), versionLine(fallback)]
  assert.equal(lines.length, 2)
  assert.match(lines[0], /源=取件/)
  assert.match(lines.at(-1), /源=内建/)
})

test("E65 子正常退出 ⇒ 零回退 ∥ 槽留（槽不被失效）", async () => {
  const fs = makeFs()
  fs.putTree(BUILTIN, SHELL_V1)
  const fetch = makeFetch({ manifest: H2, artifact: packTar(entriesOf(SHELL_V2)) })
  const spawn = makeSpawn([{ code: 0 }])
  const out = await bootOnce(fs, fetch, spawn)

  assert.equal(spawn.calls.length, 1)
  assert.equal(out.exitCode, 0)
  assert.equal(fs.existsSync(join(ROOT, H2)), true) // 槽留
})

test("打包件：manifest == 树哈希 == 回读复算；留 3 件（回退窗）", async () => {
  const outDir = mkdtempSync(join(tmpdir(), "box-shell-pack-"))
  try {
    for (const index of [1, 2, 3, 4]) {
      writeFileSync(join(outDir, `${String(index).padStart(64, "0")}.tar`), "old")
      await new Promise((done) => setTimeout(done, 5)) // mtime 序（留 3 件按新序）
    }
    const result = pack.packBoxShell({ source: SHELL_SOURCE, out: outDir, log: quiet })
    assert.equal(result.version, treeHash(SHELL_SOURCE)) // 版本 = 源树树哈希（单源）
    const tars = readdirSync(outDir).filter((name) => name.endsWith(".tar"))
    assert.equal(tars.length, 3) // 新件 + 新二旧件
    assert.ok(tars.includes(`${result.version}.tar`))
    const manifest = JSON.parse(readFileSync(join(outDir, "manifest.json"), "utf8"))
    assert.equal(manifest.version, result.version)
  } finally {
    rmSync(outDir, { recursive: true, force: true })
  }
})
