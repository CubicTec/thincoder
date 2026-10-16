/**
 * doc-check/index.mjs — 文档纪律机检 · 引擎入口（域扫描 + 声明面读取 + 报面行）。
 *
 * 判据两条（起步 · 闭集——口径单源 = `docs/core/design/DOC-DISCIPLINE.md` §3.20 条目 S）：
 *   ① 锚（档缺 / 节缺）——实现 = `./anchors.mjs`；② 行宽——口径 = §3.18 条目 Q，实现 = `./width.mjs`。
 * 判据参数由**被开发项目**的 `PROJECT-MANIFEST.json` `checkConfig` 声明（不硬编码任何本仓路径）。
 * 纯函数：**零门禁 / 零退出码 / 零阻断**——报告态由工具面 `agent-tools/doc-check.mjs` 呈现；
 * 输出不得被读作拒执行的理由（用户令 > 机检）。
 */
import { relative, resolve } from "node:path"
import { MANIFEST_REL, readManifest } from "../manifest.mjs"
import { scanDomain, checkDocWidths } from "./width.mjs"
import { checkAnchors } from "./anchors.mjs"

/** 相对路径显示形（正斜杠——跨平台同形）。 */
const rel = (root, p) => relative(root, p).replace(/\\/g, "/")

/**
 * 跑一次文档纪律机检（报告态）。
 * @param {string} root 项目根（判据参数取该根的 `PROJECT-MANIFEST.json` `checkConfig`）
 * @returns {{report:string, hits:{total:number, anchors:number, width:number}, anchorHits:Array,
 *   widthHits:Array, anchorReports:Array, files:string[], scanDirs:string[], lineWidth:number,
 *   zones:string[], exclude:string[]}}
 */
export function runDocCheck(root) {
  const base = resolve(root)
  const read = readManifest(base)
  if (!read.ok) {
    throw new Error(`doc_check: cannot read ${MANIFEST_REL} at ${base} — the check parameters come from that project's checkConfig (${read.reason ?? read.errors.join("；")})`)
  }
  const cfg = read.manifest.checkConfig ?? {}
  const scanDirs = (Array.isArray(cfg.scanDirs) ? cfg.scanDirs : []).filter((d) => typeof d === "string" && d !== "")
  const exclude = Array.isArray(cfg.anchors?.exclude) ? cfg.anchors.exclude : []
  const lineWidth = cfg.lineWidth
  const zones = (Array.isArray(cfg.widthExemptZones) ? cfg.widthExemptZones : []).filter((z) => typeof z === "string" && z !== "")

  const files = scanDomain(base, { scanDirs, exclude })
  const anchors = checkAnchors(base, { scanDirs, files })
  const widths = checkDocWidths(base, { lineWidth, scanDirs, exclude, exemptZones: zones, files })

  const total = anchors.hits.length + widths.length
  const out = [
    "文档纪律机检（报告态 · 非门禁）",
    `射程：${base} · ${scanDirs.join(" + ") || "（无）"}（${files.length} 档）· 阈值 ${lineWidth} 字符 · 区带豁免：${zones.length ? zones.join(" ∥ ") : "无"} · 排除：${exclude.length ? exclude.join(" ∥ ") : "（无）"}`,
    "声明：判据参数依据 `PROJECT-MANIFEST.json` `checkConfig`",
    `命中 ${total} 条（锚 ${anchors.hits.length} · 行宽 ${widths.length}）`,
  ]
  // 报告面（不作判）：域内同名 ≥2 ⇒ 多义不判（残余登记——fail-open 方向，归评审核验面）
  for (const r of anchors.reports) {
    out.push(`报告 锚·多义 ${rel(base, r.file)}:${r.line} \`${r.token}\`（同名 ${r.candidates.length}：${r.candidates.map((c) => rel(base, c)).join(" ∥ ")}——报告面，不作判）`)
  }
  for (const h of anchors.hits) {
    out.push(h.clazz === "档缺"
      ? `✗ 锚·档缺 ${rel(base, h.file)}:${h.line} \`${h.token}\``
      : `✗ 锚·节缺 ${rel(base, h.file)}:${h.line} \`${h.token}\`（目标 ${rel(base, h.target)} 无 §${h.section}）`)
  }
  for (const w of widths) out.push(`✗ 行宽 ${rel(base, w.file)}:${w.line}（${w.len} 字符）`)
  out.push(total ? `结论：${total} 条命中——报告态，不作拒执行的理由` : "结论：0 条命中（锚 ∥ 行宽 均清）")

  return { report: out.join("\n"), hits: { total, anchors: anchors.hits.length, width: widths.length }, anchorHits: anchors.hits, widthHits: widths, anchorReports: anchors.reports, files, scanDirs, lineWidth, zones, exclude }
}
