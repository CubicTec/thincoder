/**
 * doc-check-3b.test.mjs — 单元用例：解析序 ③b（节缺的同板块回退）。
 * 判据句单源 = `docs/core/design/DOC-DISCIPLINE.md` §3.20「节缺的同板块回退（解析序 ③b）」——本档只跑用例，不复述口径。
 * 夹具全落系统临时域 `mkdtempSync`（零落仓 + 并发免疫）；本档为批内单元测试档（随批归档）。
 * 用例：DD-114 唯一候选含该节 ⇒ 解析成功零报告 · DD-115 零候选 ⇒ `节缺`（target = ③ 命中档）·
 *   DD-116 ≥2 候选 ⇒ 多义报告面 · DD-117 跨板块 ⇒ 候选集空（同板块收窄的反证）·
 *   DD-118 抽取面两免（类名 ∥ 占位）＋ 错名照报（不放宽）· DD-119 三档同名仅一档含该节 ⇒ 先过滤再计数的次序 ·
 *   DD-120 该节只在声明解析根内的同名档里 ⇒ 候选集不看 `roots`，仍 `节缺`。
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { checkAnchors } from "../doc-check/anchors.mjs"
import { scanDomain } from "../doc-check/width.mjs"

/** 临时域夹具：`files` = {相对路径: 内容}；扫描域 = `docs`；`roots` = 声明解析根（可选）；
 *  回调拿到 `{ hits, reports }` 与域根，退出时整域删除。 */
function withDomain(files, fn, roots) {
  const root = mkdtempSync(join(tmpdir(), "doc-check-3b-"))
  try {
    for (const [rel, text] of Object.entries(files)) {
      const p = join(root, ...rel.split("/"))
      mkdirSync(dirname(p), { recursive: true })
      writeFileSync(p, text)
    }
    const scanDirs = ["docs"]
    const out = checkAnchors(root, { scanDirs, files: scanDomain(root, { scanDirs }), roots })
    return fn(out, root)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

const REF = "# TUI 需求\n\n## 7 概述\n\n真目标见 `TUI.md §7.5`。\n"

test("DD-114 ③b：唯一同板块候选含该节 ⇒ 解析成功、零命中零报告", () => {
  withDomain({
    "docs/core/requirements/TUI.md": REF, // ③ 命中档（无 §7.5）
    "docs/core/design/TUI.md": "# TUI 设计\n\n## 7.5 详情\n", // 同 core 板块、含该节
  }, ({ hits, reports }) => {
    assert.deepEqual(hits, [])
    assert.deepEqual(reports, [])
  })
})

test("DD-115 ③b：零候选 ⇒ `节缺`，目标 = ③ 命中档", () => {
  withDomain({
    "docs/core/requirements/TUI.md": REF,
    "docs/core/design/TUI.md": "# TUI 设计\n\n## 8 其他\n", // 同板块同 basename，但无该节
  }, ({ hits, reports }, root) => {
    assert.equal(hits.length, 1)
    assert.equal(hits[0].clazz, "节缺")
    assert.equal(hits[0].section, "7.5")
    assert.equal(hits[0].target, join(root, "docs", "core", "requirements", "TUI.md"))
    assert.deepEqual(reports, [])
  })
})

test("DD-116 ③b：≥2 候选含该节 ⇒ 多义报告面（不作判）", () => {
  withDomain({
    "docs/core/requirements/TUI.md": REF,
    "docs/core/design/TUI.md": "# TUI 设计\n\n## 7.5 详情\n",
    "docs/core/notes/TUI.md": "# TUI 笔记\n\n## 7.5 摘要\n",
  }, ({ hits, reports }, root) => {
    assert.deepEqual(hits, [])
    assert.equal(reports.length, 1)
    assert.deepEqual(reports[0].candidates, [
      join(root, "docs", "core", "design", "TUI.md"),
      join(root, "docs", "core", "notes", "TUI.md"),
    ])
  })
})

test("DD-117 ③b：跨板块（requirements ∥ design 两块板）⇒ 候选集空 ⇒ `节缺`", () => {
  withDomain({
    "docs/requirements/TUI.md": REF, // 无板块 `core` ⇒ 与下方候选不同板块
    "docs/design/TUI.md": "# TUI 设计\n\n## 7.5 详情\n",
  }, ({ hits, reports }, root) => {
    assert.equal(hits.length, 1)
    assert.equal(hits[0].clazz, "节缺")
    assert.equal(hits[0].target, join(root, "docs", "requirements", "TUI.md"))
    assert.deepEqual(reports, [])
  })
})

test("DD-118 抽取面两免（类名 ∥ 占位）＋ 错名照报", () => {
  withDomain({
    "docs/core/requirements/TUI.md": "# 需求\n\n参考 `AGENTS.md`、`file.md` 与错名 `commn.md`。\n",
  }, ({ hits }) => {
    assert.deepEqual(hits.map((h) => h.token), ["commn.md"])
    assert.equal(hits[0].clazz, "档缺")
  })
})

test("DD-119 ③b：三档同名、仅一档含该节 ⇒ 先过滤再计数（解析到它、零命中零报告）", () => {
  withDomain({
    "docs/core/requirements/TUI.md": REF, // ③ 命中档（无 §7.5）
    "docs/core/design/TUI.md": "# TUI 设计\n\n## 7.5 详情\n", // 唯一含该节
    "docs/core/notes/TUI.md": "# TUI 笔记\n\n## 8 其他\n",
  }, ({ hits, reports }) => {
    assert.deepEqual(hits, [])
    assert.deepEqual(reports, [])
  })
})

test("DD-120 ③b：该节只在声明解析根内的同名档里 ⇒ 候选集不看 `roots`，仍 `节缺`", () => {
  withDomain({
    "docs/core/requirements/TUI.md": REF,
    "docs/core/design/TUI.md": "# TUI 设计\n\n## 8 其他\n",
    "ext/TUI.md": "# 根内 TUI\n\n## 7.5 详情\n", // 域外、只在声明解析根内
  }, ({ hits, reports }, root) => {
    assert.equal(hits.length, 1)
    assert.equal(hits[0].clazz, "节缺")
    assert.equal(hits[0].target, join(root, "docs", "core", "requirements", "TUI.md"))
    assert.deepEqual(reports, [])
  }, ["ext"])
})
