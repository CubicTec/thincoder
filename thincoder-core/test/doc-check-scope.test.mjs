// thincoder-core/test/doc-check-scope.test.mjs — 本批批内用例（DD-106–DD-113 · 收口删）
import test from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs"
import { dirname, join } from "node:path"
import { tmpdir } from "node:os"
import { runDocCheck } from "../doc-check/index.mjs"
import { docCheckTool } from "../agent-tools/doc-check.mjs"

/** 夹具：声明域 = docs（2 档）
 *  docs/deep/common.md   含一条指向不存在档的指针（全域命中源；token 用 absent-doc.md）
 *  docs/DOC-DISCIPLINE.md 干净，以裸名引用 common.md（域内唯一 basename ⇒ 只有 ④ 索引能解）
 *  域外 / 第三因样本：AGENTS.md、outside/example.md（在盘域外）· docs/notes.txt（非 .md）· docs/deep（目录） */
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "doc-check-scope-"))
  const w = (rel, text = "") => {
    const p = join(root, rel)
    mkdirSync(dirname(p), { recursive: true })
    writeFileSync(p, text)
  }
  w("PROJECT-MANIFEST.json", JSON.stringify({
    checkConfig: { scanDirs: ["docs"], lineWidth: 300, widthExemptZones: [], anchors: { exclude: [] } },
  }))
  w("docs/deep/common.md", "# 手册\n\n见 absent-doc.md 一节。\n")
  w("docs/DOC-DISCIPLINE.md", "# 笔记\n\n见 common.md 的说明。\n")
  w("AGENTS.md", "# 域外\n")
  w("outside/example.md", "# 域外二\n")
  w("docs/notes.txt", "非 markdown\n")
  return root
}
const withFixture = (fn) => { const root = fixture(); try { fn(root) } finally { rmSync(root, { recursive: true, force: true }) } }

test("DD-106 · report + docs 只判清单内档（N=1 · M=2）", () => withFixture((root) => {
  assert.match(runDocCheck(root).report, /✗ 锚·档缺 docs\/deep\/common\.md:3 `absent-doc\.md`/)
  const scoped = runDocCheck(root, { docs: ["docs/DOC-DISCIPLINE.md"] }).report
  assert.match(scoped, /^范围：显式档集 1 档（整档入判 · 解析基线 = 声明域 2 档，不收窄）$/m)
  assert.match(scoped, /^命中 0 条（锚 0 · 行宽 0）$/m)
  assert.doesNotMatch(scoped, /✗/)
}))

test("DD-107 · report + docs 给有问题的档 ⇒ 命中同全域那条", () => withFixture((root) => {
  const scoped = runDocCheck(root, { docs: ["docs/deep/common.md"] }).report
  assert.match(scoped, /^命中 1 条（锚 1 · 行宽 0）$/m)
  assert.match(scoped, /✗ 锚·档缺 docs\/deep\/common\.md:3 `absent-doc\.md`/)
}))

test("DD-108 · 越域 ∥ 缺档 ⇒ 报错点名，零判定", () => withFixture((root) => {
  assert.throws(() => runDocCheck(root, { docs: ["outside/example.md"] }), /outside\/example\.md（outside the declared domain）/)
  assert.throws(() => runDocCheck(root, { docs: ["docs/missing-file.md"] }), /docs\/missing-file\.md（not on disk）/)
}))

test("DD-109 · [] ⇒ 报错；省略 ⇒ 全域读数无范围行", () => withFixture((root) => {
  assert.throws(() => runDocCheck(root, { docs: [] }), /docs is empty/)
  assert.doesNotMatch(runDocCheck(root).report, /^范围：/m)
}))

test("DD-110 · gate 面零变：域内档 + 越域档 ⇒ 跳过行在场、首行逐字", () => withFixture((root) => {
  const out = runDocCheck(root, { mode: "gate", docs: ["docs/DOC-DISCIPLINE.md", "AGENTS.md"], docsSource: "explicit" }).report
  assert.equal(out.split("\n")[0], "DOC-CHECK GATE: PASS")
  assert.match(out, /^范围：显式 docs 1 档（声明域 2 档）/m)
  assert.ok(out.includes("跳过 1 档（不在声明域内，未检）：AGENTS.md"))
  assert.ok(out.includes("结论：0 条命中（1 档全清）"))
}))

test("DD-111 · 解析面不缩：清单档以裸名引用未入清单的档 ⇒ 零 档缺", () => withFixture((root) => {
  const r = runDocCheck(root, { docs: ["docs/DOC-DISCIPLINE.md"] })
  assert.equal(r.hits.total, 0)          // 把 files 一并收窄 ⇒ common.md 假报 档缺
  assert.doesNotMatch(r.report, /档缺/)
  assert.match(r.report, /解析基线 = 声明域 2 档/)
}))

test("DD-112 · docs 非数组 ⇒ 明确拒（工具面 ∥ 引擎面），不落全域", () => withFixture((root) => {
  const viaTool = docCheckTool.execute({ docs: "docs/DOC-DISCIPLINE.md" }, { agent: { cwd: root } })
  assert.match(viaTool, /^doc_check: `docs` must be an array of paths \(got string\)/)
  assert.doesNotMatch(viaTool, /文档纪律机检/)
  assert.throws(() => runDocCheck(root, { docs: "docs/DOC-DISCIPLINE.md" }), /`docs` must be an array of paths/)
}))

test("DD-113 · 第三因：在盘 ∧ 非 .md ∥ 目录 ⇒ not a markdown document", () => withFixture((root) => {
  assert.throws(() => runDocCheck(root, { docs: ["docs/notes.txt"] }), /docs\/notes\.txt（not a markdown document）/)
  assert.throws(() => runDocCheck(root, { docs: ["docs/notes.txt"] }), (e) => !/notes\.txt（not on disk）/.test(String(e)))
  assert.throws(() => runDocCheck(root, { docs: ["docs/deep"] }), /docs\/deep（not a markdown document）/)
}))
