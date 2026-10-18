/**
 * doc-check/width.mjs — 文档纪律机检的产品档位（行宽谓词族 + 域扫描 + 行宽判据——实现单源）。
 *
 * 口径单源 = `docs/core/design/DOC-DISCIPLINE.md` §3.18 条目 Q（度量 / 域 / 豁免类 / 阈值）；
 * 产品内建裁定 = 同档 §3.20 条目 S——谓词单源随迁：本仓 `scripts/doc-check-width.mjs` 改述为
 * **再出口缝**（薄档 · 零逻辑 · 逐名再出口），盘上不留第二份谓词实现。
 * 度量 = `[...line].length`（CJK 计 1——不引显示宽度 / 字体）；阈值 / 域 / 排除全部读
 * `PROJECT-MANIFEST.json` 的 `checkConfig`——零硬编码本仓路径，换项目开箱可用。
 * 豁免五类 = 表格行 ∥ fenced 块 ∥ 可执行行 ∥ 连续引文 ∥ 区带：**只认结构谓词**，
 * 无行级白名单（按行号 / 注释声明的豁免不入判）。
 * 边界：本档零门禁 / 零退出码 / 零阻断——报告态由 `agent-tools/doc-check.mjs` 呈现。
 */
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, resolve } from "node:path"
import { MANIFEST_REL } from "../manifest.mjs"

/** 域发现跳过目录（不视作候选产品域；递归亦不进入）。 */
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", "coverage", ".turbo", ".thincoder"])

/** 域发现（声明面）：cwd 根（持 manifest）+ 各持自身 manifest 的一级子目录——判据 = manifest 在场，无路径硬编码。 */
export function discoverDomains(root) {
  const rootAbs = resolve(root)
  const hasManifest = (p) => { try { return statSync(join(p, MANIFEST_REL)).isFile() } catch { return false } }
  const out = []
  if (hasManifest(rootAbs)) out.push(rootAbs)
  let names = []
  try { names = readdirSync(rootAbs) } catch { /* 不可读：仅根域 */ }
  for (const n of names) {
    if (SKIP_DIRS.has(n) || n.startsWith("dist-")) continue
    const p = join(rootAbs, n)
    try { if (statSync(p).isDirectory() && hasManifest(p)) out.push(p) } catch { /* 跳过 */ }
  }
  return out
}

/** 递归列 .md（跳过 SKIP_DIRS ∧ 声明面 exclude 段——exclude 逐层生效）。 */
function walkMd(dir, exclude, out) {
  let names = []
  try { names = readdirSync(dir) } catch { return out }
  for (const n of names) {
    if (SKIP_DIRS.has(n) || n.startsWith("dist-") || exclude.includes(n)) continue
    const p = join(dir, n)
    let st
    try { st = statSync(p) } catch { continue }
    if (st.isDirectory()) walkMd(p, exclude, out)
    else if (n.endsWith(".md")) out.push(p)
  }
  return out
}

/** 源域（单源）：`scanDirs` × `exclude` 声明面下的全部 .md——锚检查与行宽检查同一文件集。 */
export function scanDomain(base, { scanDirs = [], exclude = [] } = {}) {
  const ex = Array.isArray(exclude) ? exclude : []
  const out = []
  for (const d of Array.isArray(scanDirs) ? scanDirs : []) walkMd(resolve(base, d), ex, out)
  return [...new Set(out)].sort()
}

/** 表格行谓词（markdown 表格行结构性不可折行——行宽豁免，与锚检查同源）。 */
export const isTableRow = (l) => /^\s*\|.*\|\s*$/.test(String(l))

/** 围栏标记（行首可选空白 + 三反引号 ∥ 三波浪号 ⇒ 标记字符；非围栏行 ⇒ null）——**单源**：
 *  `isFenceLine` 与两处块扫描（本节行宽 ∥ `./anchors.mjs` 锚抽取）同取此式，使「同形围栏行止」只此一解
 *  （同一模块内同符两义 = 单源可漂的结构口子）。 */
export function fenceMark(l) {
  const m = /^\s*(`{3,}|~{3,})/.exec(String(l))
  return m ? m[1][0] : null
}

/** 围栏行谓词（单源 = `fenceMark`）——围栏行自身与块内整行均豁免。 */
export const isFenceLine = (l) => fenceMark(l) !== null

/** 引文块行谓词（行首可选空白 + `>`）——连续 `>` 行整块豁免（引证须逐字连续、不可折，同表行理据）。 */
export const isQuoteLine = (l) => /^\s*>/.test(String(l))

/** 区带头谓词（§3.15 谓词面）：标题文本去首部编号（`^\d+(?:\.\d+)*[.、]?\s*`）后——等于区带名 ∨ 以
 *  「区带名 + （∕(」起（容括注后缀，如 `变更记录（续）`）；闭集外一律不纳（fail-closed）。 */
export function isZoneHead(headingText, zones = []) {
  const text = String(headingText).replace(/^\d+(?:\.\d+)*[.、]?\s*/, "")
  return zones.some((z) => typeof z === "string" && z !== "" && (text === z || text.startsWith(z + "（") || text.startsWith(z + "(")))
}

/** 行内可执行坐标（命令 / 搜索模式串码段）——整行豁免（证据与命令保字面，与锚判据同源）。 */
export function isExecutableLine(line) {
  const l = String(line)
  if (/`[^`\n]*&&[^`\n]*`/.test(l)) return true // 命令链（cd … && …）
  if (/`[^`\n]*\b(?:cd|node|npm|npx|grep|rg|git)\s[^`\n]*`/.test(l)) return true // 码段内命令词
  if (/`[^`\n]*(?:\[\^|\\\.|\(\?<|\(\?:|\{\d)/.test(l)) return true // 码段内搜索模式串片段
  return false
}

/** 行内位置是否在反引号码段内（引述面不判）。 */
export function inCodeSpan(line, idx) {
  return (String(line).slice(0, idx).match(/`/g) ?? []).length % 2 === 1
}

/** 行宽判据（单判据 = `checkConfig.lineWidth`）：`[...line].length` > 阈值 ∧ 非表格行 ∧ 非 fenced 块内
 *  ∧ 非可执行行 ∧ 非连续引文 ∧ 非区带内 ⇔ 命中（口径逐字 = §3.18 条目 Q）。
 *  单遍扫描携标题栈（`^(#{1,6})\s` 行入栈——同级 ∥ 更高级出栈）：行所属标题链任一为区带头 ⇒ 豁免。
 *  围栏未闭合 ⇒ 至档尾整块免（fail-open 方向——§3.18 残余登记 ①）；`exemptZones` 缺省 ∥ 空集 ⇒ 零豁免。
 *  `checkFiles`（可选）= **被判集**（gate 的范围收窄面）；缺省 ⇒ `files`（全域，报告态遍历面零变）。 */
export function checkDocWidths(base, { lineWidth, scanDirs, exclude, exemptZones = [], files, checkFiles } = {}) {
  const zones = (Array.isArray(exemptZones) ? exemptZones : []).filter((z) => typeof z === "string" && z !== "")
  const hits = []
  // 被判集优先（范围只收窄被判档）；`files` 给定时直接用（调用方已扫同一域 ⇒ 域只走一遍）；缺省自扫。
  for (const f of checkFiles ?? files ?? scanDomain(base, { scanDirs, exclude })) {
    let text = ""
    try { text = readFileSync(f, "utf8") } catch { continue }
    const stack = [] // 标题栈 —— { level, exempt }；exempt = 自身 ∥ 祖先命中区带
    let fence = null // 围栏标记（` ∥ ~）；null = 不在块内
    text.split("\n").forEach((l, i) => {
      const mark = fenceMark(l)
      if (mark !== null) {
        if (fence === null) fence = mark
        else if (mark === fence) fence = null
        return // 围栏行自身免
      }
      if (fence !== null) return // 块内整块免（未闭合 ⇒ 至档尾免）
      const hm = /^(#{1,6})\s+(.*)$/.exec(l)
      if (hm) {
        while (stack.length && stack[stack.length - 1].level >= hm[1].length) stack.pop()
        const self = isZoneHead(hm[2].trim(), zones)
        stack.push({ level: hm[1].length, exempt: self || (stack[stack.length - 1]?.exempt ?? false) })
        return
      }
      const inZone = stack[stack.length - 1]?.exempt === true
      const len = [...l].length
      if (len > lineWidth && !isTableRow(l) && !isExecutableLine(l) && !isQuoteLine(l) && !inZone) hits.push({ file: f, line: i + 1, len })
    })
  }
  return hits
}
