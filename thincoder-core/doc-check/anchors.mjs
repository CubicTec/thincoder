/**
 * doc-check/anchors.mjs — 文档纪律机检 · 起步判据 ①（锚）：指针抽取 + 解析序 + 节在盘判定。
 *
 * 判据句单源 = `docs/core/design/DOC-DISCIPLINE.md` §3.20 判据 ①（本节只实现，不重述口径）：
 * · 文档指针 = 档 token（含 `.md`，可带目录段）± 节指示（紧随 `§` + 编号 N / N.M / N.M.K）；
 *   **行号坐标（`:N`）不作节指示**——行号不作引用；
 * · 档不在盘 ⇒ `档缺`；带节指示 ∧ 节不在盘 ⇒ `节缺`。
 *
 * 抽取面：逐行扫；fenced 块整块跳过；可执行行（`isExecutableLine`）整行跳过（命令保字面）。
 * 解析序：① 仓根相对 → ② 域根相对（`scanDirs` 逐根）→ ③ 引用方档所在目录相对 →
 *   ④ 域内唯一 basename 索引（同名 ≥2 ⇒ **不判**，列报告面 = 终结）→ ⑤ 声明解析根相对（`anchors.roots` 逐根，按声明序）。
 * 节在盘：目标档内存在标题行，其标题编号（标题文本去 `^#{1,6}\s` 后的首个 `\d+(?:\.\d+)*`）= 指针节号。
 * 残余登记（fail-open 方向——归评审核验面）：裸档名在域内多义 ⇒ 不判；未闭合围栏 ⇒ 至档尾免；
 *   指针行的坐标尾不入判、同行的档 token 照判。
 */
import { readFileSync, statSync } from "node:fs"
import { basename, dirname, resolve } from "node:path"
import { anchorRootError } from "../manifest-schema.mjs"
import { fenceMark, isExecutableLine } from "./width.mjs"

/** 文档指针 token：`(目录段/)*名.md` + 可选行号坐标尾 + 可选节指示（`§` + 编号）。
 *  左界守卫排除更长 token 的尾段；右界排除后续字母数字（`.md` 之后紧邻 `[\w]` ⇒ 非完整 token）。 */
const ANCHOR_RE = /(?<![A-Za-z0-9_.\-\\/@<>])((?:[A-Za-z0-9_.\-]+\/)*[A-Za-z0-9_.\-]+\.md)(?::\d+(?:-\d+)?)?(?:\s*§\s*(\d+(?:\.\d+)*))?(?![\w])/g

/** 约定文件名（**类名**——文档在描述「会读哪些文件」、黑名单名字、`files` 字段值、测试数据）：不抽。
 *  依据 = 这些名字在仓根 / 兄弟目录不一定存在，它们指的不是「某个仓内档」。 */
const FILENAME_CLASSES = new Set([
  "agents.md", "claude.md", "skill.md", "project_rules.md",
  "changelog.md", "agent.md", "advisor.md", "todo.md", "todo-archive.md",
])

/** 占位符词干（示例写法 / 反例样本——`X.md` / `file.md` / `docs/batches/x.md` 类）：不抽。 */
const PLACEHOLDER_STEMS = new Set([
  "x", "a", "b", "file", "out", "foo", "bar", "example", "sample", "name", "path",
])

/** 文件存在性（目录 / 读错 ⇒ false）。 */
function isFile(p) { try { return statSync(p).isFile() } catch { return false } }

/** 目录存在性（文件 / 读错 ⇒ false）。 */
function isDir(p) { try { return statSync(p).isDirectory() } catch { return false } }

/** 标题编号（标题文本去 `^#{1,6}\s` 后的首个 `\d+(?:\.\d+)*`）；非标题行 ⇒ null。 */
function headingNumber(line) {
  const m = /^#{1,6}\s+/.exec(line)
  if (!m) return null
  const n = /\d+(?:\.\d+)*/.exec(line.slice(m[0].length))
  return n ? n[0] : null
}

/** 节在盘：目标档内任一标题行的编号 = 指针节号（字符串逐字等值——两处同归一形）。 */
function sectionOnDisk(path, num) {
  let text = ""
  try { text = readFileSync(path, "utf8") } catch { return false }
  for (const l of text.split("\n")) if (headingNumber(l) === num) return true
  return false
}

/** 档解析（判据 ① 的解析序 ①–⑤）：命中 ⇒ `{ ok, path }`；同名 ≥2 ⇒ `{ ambiguous, candidates }`；零命中 ⇒ `{ ok:false }`。
 *  行号坐标尾（`:N`）不参与档解析——token 只取 `.md` 段（抽取面已剥离坐标尾与节指示）。
 *  `roots` = 声明解析根（已按值形 ∧ 根在盘过滤）——第 ⑤ 步，口径单源 = `DOC-DISCIPLINE.md` §3.20 判据 ①。 */
function resolveDoc(token, refFile, base, scanDirs, index, roots) {
  const p1 = resolve(base, token)
  if (isFile(p1)) return { ok: true, path: p1 } // ① 仓根相对
  for (const d of scanDirs) { const p = resolve(base, d, token); if (isFile(p)) return { ok: true, path: p } } // ② 域根相对
  const p3 = resolve(dirname(refFile), token)
  if (isFile(p3)) return { ok: true, path: p3 } // ③ 引用方档所在目录相对
  const cands = index.get(basename(token)) ?? [] // ④ 域内唯一 basename 索引
  if (cands.length === 1) return { ok: true, path: cands[0] }
  if (cands.length > 1) return { ambiguous: true, candidates: cands } // ④ 多义 ⇒ 终结，不进 ⑤
  for (const r of roots) { const p = resolve(base, r, token); if (isFile(p)) return { ok: true, path: p } } // ⑤ 声明解析根相对
  return { ok: false }
}

/** 声明解析根逐元素归类（口径单源 = `DOC-DISCIPLINE.md` §3.20 判据 ① 解析序 ⑤）：
 *  `usable` = 参与解析的根（声明序）；`gaps` = 报告面（不作判）。缺键 ⇒ 本步零效（不产报告行）。 */
function classifyRoots(base, roots) {
  const out = { usable: [], gaps: [] }
  if (roots === undefined) return out
  if (!Array.isArray(roots)) { out.gaps.push({ kind: "invalid", root: roots, reason: "非字符串数组" }); return out }
  for (const r of roots) {
    const why = anchorRootError(r)
    if (why) { out.gaps.push({ kind: "invalid", root: r, reason: why }); continue }
    if (!isDir(resolve(base, r))) { out.gaps.push({ kind: "missing", root: r }); continue }
    out.usable.push(r)
  }
  return out
}

/**
 * 锚判据主行程：域内逐档逐行抽取 + 解析 + 节在盘判定。
 * @param {string} root 项目根（判据参数已由调用方自 `checkConfig` 读出）
 * @param {{scanDirs?:string[], files?:string[], checkFiles?:string[], roots?:string[]}} o `files` = 域内 `.md` 全集（单源 = `scanDomain`）；
 *   `checkFiles` = **被判集**（gate 的范围收窄面——缺省 ⇒ `files`）：索引仍按 `files` 建（解析基线不缩），
 *   只把「抽哪几档的行」收窄——否则改过的档引用未改档会假报 `档缺`（假阳即机制失效）；
 *   `roots` = 声明解析根原值（值形 ∥ 根在盘的门归本函数——报告面逐元素弃用 / 列缺位）。
 * @returns {{hits:Array, reports:Array, rootGaps:Array}} hits = 命中（`档缺` / `节缺`）；reports = 报告面（多义——不作判）；
 *   rootGaps = 报告面（解析根弃用 ∥ 缺位——不作判）
 */
export function checkAnchors(root, { scanDirs = [], files = [], checkFiles, roots } = {}) {
  const base = resolve(root)
  const dirs = Array.isArray(scanDirs) ? scanDirs : []
  const { usable, gaps } = classifyRoots(base, roots)
  const index = new Map()
  for (const f of files) {
    const k = basename(f)
    if (!index.has(k)) index.set(k, [])
    index.get(k).push(f)
  }
  const hits = []
  const reports = []
  for (const f of checkFiles ?? files) {
    let text = ""
    try { text = readFileSync(f, "utf8") } catch { continue }
    const re = new RegExp(ANCHOR_RE.source, "g") // 每档一份实例（零共享 lastIndex 状态）
    let fence = null // 围栏标记（` ∥ ~）；null = 不在块内
    text.split("\n").forEach((l, i) => {
      const mark = fenceMark(l)
      if (mark !== null) { // 围栏块整块跳过：起于围栏行、止于同形围栏行（未闭合 ⇒ 至档尾免）
        if (fence === null) fence = mark
        else if (mark === fence) fence = null
        return
      }
      if (fence !== null) return
      if (isExecutableLine(l)) return // 可执行行整行跳过
      let m
      while ((m = re.exec(l)) !== null) {
        const token = m[1]
        const num = m[2] ?? null
        const bn = basename(token).toLowerCase()
        const stem = bn.replace(/\.md$/, "")
        // 类名 ∥ 占位符两免：抽取面不把它们当指针（判据 = DOC-DISCIPLINE §3.20 ① 的「档 token」定义面）
        if (FILENAME_CLASSES.has(bn) || stem.length <= 1 || PLACEHOLDER_STEMS.has(stem)) continue
        const r = resolveDoc(token, f, base, dirs, index, usable)
        if (r.ambiguous) { reports.push({ file: f, line: i + 1, token, candidates: r.candidates }); continue }
        if (!r.ok) { hits.push({ file: f, line: i + 1, token, clazz: "档缺" }); continue }
        if (num !== null && !sectionOnDisk(r.path, num)) hits.push({ file: f, line: i + 1, token, clazz: "节缺", section: num, target: r.path })
      }
    })
  }
  return { hits, reports, rootGaps: gaps }
}
