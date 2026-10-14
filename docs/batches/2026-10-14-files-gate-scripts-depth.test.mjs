/**
 * 2026-10-14-files-gate-scripts-depth.test.mjs — files 门 `scripts` 段层级收正（#1449）批次本地件。
 *
 * 名随批次档 · 住批次目录 · 不进仓套件（批内件纪律——不入任何门；复跑 = `node --test` 直跑）。
 * 口径（本批收正后）：`rejectEngineeringFilePaths` 的 `scripts` 判据 = **层级锚定**——
 * 仅仓根与直接子层（`scripts/*` ｜ `<pkg>/scripts/*`）拒；depth ≥3 的 `scripts` 段放行
 * （目录名在深层不携带 face 信息；转报实锤 = `deployment/spark8/scripts/*` 八件）。
 * 来源：dgx-spark 转报 + 用户裁「这是个 bug」（2026-10-14）——轻通道轮。
 *
 * 断言全为行为式（拒 ∥ 放 的谓词输出），零散句锚。
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import { rejectEngineeringFilePaths } from "../../thincoder-core/agent-tools/spawn-gates.mjs"

test("① 换型核：depth ≥3 的 scripts 段放行（转报实锤八件全过）", () => {
  const eight = [
    "deployment/spark8/scripts/prepare-host.sh",
    "deployment/spark8/scripts/setup-deploy.sh",
    "deployment/spark8/scripts/start.sh",
    "deployment/spark8/scripts/stop.sh",
    "deployment/spark8/scripts/status.sh",
    "deployment/spark8/scripts/verify.sh",
    "deployment/spark8/scripts/bench.py",
    "deployment/spark8/scripts/probe-1m.py",
  ]
  assert.doesNotThrow(() => rejectEngineeringFilePaths(eight), "depth ≥3 scripts 段 ⇒ 放行")
})

test("② 浅层仍拒：仓根 ｜ 直接子层（大小写不敏感）", () => {
  const cases = [
    "scripts/build.mjs",
    "thincoder-desktop/scripts/build.mjs",
    "Scripts/build.mjs",
    "thincoder-cli/SCRIPTS/x.mjs",
  ]
  for (const f of cases) {
    assert.throws(() => rejectEngineeringFilePaths([f]), /engineering-tools face path/, `拒：${f}`)
  }
})

test("③ 边界对：scripts 段恰在第三段 = 放行 ｜ 第二段 = 拒", () => {
  assert.doesNotThrow(() => rejectEngineeringFilePaths(["a/b/scripts/c.mjs"]), "第三段（depth ≥3）")
  assert.throws(() => rejectEngineeringFilePaths(["a/scripts/b.mjs"]), /engineering-tools face path/, "第二段（直接子层）")
})

test("④ 两族零回归：过程档（basename 任意层）｜ PROJECT-MANIFEST.json（任意层）", () => {
  assert.throws(() => rejectEngineeringFilePaths(["docs/CHANGELOG.md"]), /Parent-side maintained file/, "changelog 任意层")
  assert.throws(() => rejectEngineeringFilePaths(["deep/nested/PROJECT-MANIFEST.json"]), /Manifest file/, "manifest 任意层")
})

test("⑤ 收集式 fail-closed 保持：混单两条违规齐列、放行项不入列", () => {
  let err = null
  try {
    rejectEngineeringFilePaths(["deployment/spark8/scripts/ok.sh", "scripts/bad.mjs", "docs/CHANGELOG.md"])
  } catch (e) {
    err = e
  }
  assert.ok(err, "整单拒（fail-closed）")
  assert.match(err.message, /engineering-tools face path/)
  assert.match(err.message, /Parent-side maintained file/)
  assert.doesNotMatch(err.message, /deployment\/spark8\/scripts\/ok\.sh/, "放行项不入违规列")
})

test("⑥ 对照：非 scripts 深层交付物放行", () => {
  assert.doesNotThrow(() => rejectEngineeringFilePaths(["deployment/spark8/README.md", "deployment/spark8/hosts.ini"]))
})
