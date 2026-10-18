/**
 * doc-check/index.mjs — 文档纪律机检 · 引擎入口（域扫描 + 声明面读取 + 报面行）。
 *
 * 判据两条（起步 · 闭集——口径单源 = `docs/core/design/DOC-DISCIPLINE.md` §3.20 条目 S）：
 *   ① 锚（档缺 / 节缺）——实现 = `./anchors.mjs`；② 行宽——口径 = §3.18 条目 Q，实现 = `./width.mjs`。
 * 判据参数由**被开发项目**的 `PROJECT-MANIFEST.json` `checkConfig` 声明（不硬编码任何本仓路径）。
 * 两种问法（§3.20「工具形」——同一条判据）：
 *   `report`（缺省）= 全域报告态——**零门禁 / 零退出码 / 零阻断**，输出不得被读作拒执行的理由（用户令 > 机检）；
 *   `gate` = 交付时点的**范围化裁定**——只判本轮改过的档（整档入判），首行给机器可判 verdict；
 *   强制面住交付协议 + 批次档 §6 前置，工具本体仍不阻断任何动作。
 */
import { statSync } from "node:fs"
import { relative, resolve } from "node:path"
import { MANIFEST_REL, readManifest } from "../manifest.mjs"
import { scanDomain, checkDocWidths } from "./width.mjs"
import { checkAnchors } from "./anchors.mjs"

/** 相对路径显示形（正斜杠——跨平台同形）。 */
const rel = (root, p) => relative(root, p).replace(/\\/g, "/")

/** 平台路径键（Windows 大小写不敏感——只用于域集比对，非判据面）。 */
const pathKey = (p) => (process.platform === "win32" ? p.toLowerCase() : p)

/** 文件存在性（目录 / 读错 ⇒ false）。 */
function isFile(p) { try { return statSync(p).isFile() } catch { return false } }

/** gate 取参失败（manifest 不可读 ∥ checkConfig 不合法）——**不产 PASS**（消费面 fail-closed）。 */
function gateParamError(base, read) {
  const reason = read.reason === "missing"
    ? `${MANIFEST_REL} 不在 ${base}`
    : (read.errors?.length ? read.errors.join("；") : String(read.reason ?? "未知原因"))
  return {
    report: [
      `DOC-CHECK GATE: ERROR（manifest 不可读 —— ${reason}）`,
      "原因：取参失败——判据参数来自 `PROJECT-MANIFEST.json` `checkConfig`，无声明面即无判据",
      "处置：修声明面（`checkConfig`）后复跑",
    ].join("\n"),
    hits: { total: 0, anchors: 0, width: 0 }, anchorHits: [], widthHits: [], anchorReports: [],
    files: [], checkFiles: [], scanDirs: [], lineWidth: null, zones: [], exclude: [],
    skipped: { outside: [], gone: [] }, error: "manifest",
  }
}

/** 声明面形态判据（gate 专用——报告态行为逐字不变）：取参不合法 ⇒ 判据失效却出 PASS = fail-open，故 gate 先判后跑。
 *  分工：**整键缺** = 上方 `read.missingKeys` 判据（`fillDefaults` 会补内置默认值）；**子键形态** = 本函数
 *  （`validateManifest` 只拒 `docRoot` 值与三族键形态，`checkConfig` 子键不拒 ⇒ 不在这里判就没人判）。 */
function configError(cfg) {
  if (cfg === null || typeof cfg !== "object" || Array.isArray(cfg)) return "`checkConfig` 须为对象"
  if (!Array.isArray(cfg.scanDirs) || cfg.scanDirs.length === 0 || !cfg.scanDirs.every((d) => typeof d === "string" && d.trim() !== "")) {
    return "`checkConfig.scanDirs` 须为非空字符串数组（空域不得出 PASS——空域假绿比红更坏）"
  }
  if (typeof cfg.lineWidth !== "number" || !Number.isFinite(cfg.lineWidth) || cfg.lineWidth <= 0) return "`checkConfig.lineWidth` 须为正有限数值"
  if (cfg.widthExemptZones !== undefined && !Array.isArray(cfg.widthExemptZones)) return "`checkConfig.widthExemptZones` 须为数组"
  if (cfg.anchors !== undefined) {
    if (cfg.anchors === null || typeof cfg.anchors !== "object" || Array.isArray(cfg.anchors)) return "`checkConfig.anchors` 须为对象"
    if (cfg.anchors.exclude !== undefined && !Array.isArray(cfg.anchors.exclude)) return "`checkConfig.anchors.exclude` 须为数组"
  }
  return null
}

/**
 * gate 范围求交：候选（`docs`）= 显式清单 ∥ 本会话触达记账 ⇒ **声明域内 ∧ 盘上存在的 `.md`**。
 * 域外 / 已删**不是命中**但必须可见（跳过行）——静默丢掉会把「没跑」装成「跑了且清」。
 * 解析基线不缩：域内全集仍交锚判据建索引（只收窄被判档）。
 */
function resolveRange(base, files, docs) {
  const inDomain = new Map(files.map((f) => [pathKey(f), f]))
  const check = new Set()
  const outside = []
  const gone = []
  for (const d of Array.isArray(docs) ? docs : []) {
    if (typeof d !== "string" || d.trim() === "") continue
    const abs = resolve(base, d)
    const hit = inDomain.get(pathKey(abs))
    if (hit) check.add(hit)
    else if (isFile(abs)) outside.push(abs)
    else gone.push(abs)
  }
  return { check: [...check].sort(), outside, gone }
}

/** gate 报面（固定句形——§3.20「报面（固定句形 · 交付门 gate）」）：首行 verdict = 唯一机判串。 */
function gateReport({ base, docsSource, checkFiles, domainCount, skipped, anchors, widths, lineWidth, exclude }) {
  const total = anchors.hits.length + widths.length
  const src = docsSource === "session" ? "本会话写过的文档" : "显式 docs"
  const out = [
    total ? `DOC-CHECK GATE: REFUSED（命中 ${total} 条）` : (checkFiles.length ? "DOC-CHECK GATE: PASS" : "DOC-CHECK GATE: PASS（0 档）"),
    "文档纪律机检（交付门 · gate）",
    `范围：${src} ${checkFiles.length} 档（声明域 ${domainCount} 档）· 阈值 ${lineWidth} 字符（运行时取 checkConfig.lineWidth）· 排除：${exclude.length ? exclude.join(" ∥ ") : "（无）"}`,
    "判据：与报告态同源（`PROJECT-MANIFEST.json` `checkConfig`）——范围只收窄被判档，不收窄解析",
  ]
  if (skipped.outside.length) out.push(`跳过 ${skipped.outside.length} 档（不在声明域内，未检）：${skipped.outside.map((p) => rel(base, p)).join(" ∥ ")}`)
  if (skipped.gone.length) out.push(`跳过 ${skipped.gone.length} 档（已不在盘，未检）：${skipped.gone.map((p) => rel(base, p)).join(" ∥ ")}`)
  if (checkFiles.length === 0) {
    // 空范围不静默当通过（K6）——照实说明 + 给出补充通道
    out.push(docsSource === "session"
      ? "范围为空：本会话没有写过声明域内的文档——若确认改过 ⇒ 显式传 docs"
      : "范围为空：显式 docs 无一落在声明域内——见上方跳过行")
  } else if (total === 0) {
    out.push(`结论：0 条命中（${checkFiles.length} 档全清）`)
  } else {
    for (const h of anchors.hits) {
      out.push(h.clazz === "档缺"
        ? `✗ 锚·档缺 ${rel(base, h.file)}:${h.line} \`${h.token}\``
        : `✗ 锚·节缺 ${rel(base, h.file)}:${h.line} \`${h.token}\`（目标 ${rel(base, h.target)} 无 §${h.section}）`)
    }
    for (const w of widths) out.push(`✗ 行宽 ${rel(base, w.file)}:${w.line}（${w.len} 字符）`)
    out.push("处置：同轮修正后复跑（改文档 ∥ 修引擎）；不转台账；拿不准 ⇒ 上抛主 agent 裁决（主 agent 拿不准 ⇒ 转呈用户）")
  }
  return out.join("\n")
}

/**
 * 跑一次文档纪律机检。
 * @param {string} root 项目根（判据参数取该根的 `PROJECT-MANIFEST.json` `checkConfig`）
 * @param {{docs?:string[], mode?:'report'|'gate', docsSource?:'session'|'explicit'}} [o]
 *   `mode` 缺省 = `report`（全域报告态）；`docs` = **仅 gate** 的范围候选（相对 `root` 或绝对）；
 *   `docsSource` = 范围来源标签（`session` = 本会话触达记账 ∥ `explicit` = 显式 `docs`）——缺省按 `docs` 是否给定推定；只影响报面措辞。
 * @returns {{report:string, hits:{total:number, anchors:number, width:number}, anchorHits:Array,
 *   widthHits:Array, anchorReports:Array, files:string[], checkFiles:string[], scanDirs:string[],
 *   lineWidth:number|null, zones:string[], exclude:string[], skipped:{outside:string[], gone:string[]},
 *   error?:"manifest"}}
 *   `error` 在场 ⇒ 取参失败形（首行 = `DOC-CHECK GATE: ERROR（…）`、`lineWidth` = null、`hits` 恒 0）——
 *   消费面判「清」须读 `report` 首行，不得只看 `hits.total`（0 与「未跑成」不同义）。
 */
export function runDocCheck(root, { docs, mode = "report", docsSource } = {}) {
  const base = resolve(root)
  const gate = mode === "gate"
  // `docs` = gate 专属（report + docs ⇒ 拒，不静默忽略——与工具面同一判据）
  if (!gate && docs !== undefined) throw new Error("doc_check: `docs` is gate-only — report mode always checks the whole declared domain")
  const source = docsSource ?? (docs === undefined ? "session" : "explicit")
  let read
  try {
    read = readManifest(base)
  } catch (e) {
    if (!gate) throw e // 报告态既有行为逐字不变（读错 fail-closed 上抛）
    return gateParamError(base, { reason: "unreadable", errors: [e?.message ?? String(e)] })
  }
  if (!read.ok) {
    if (gate) return gateParamError(base, read)
    throw new Error(`doc_check: cannot read ${MANIFEST_REL} at ${base} — the check parameters come from that project's checkConfig (${read.reason ?? read.errors.join("；")})`)
  }
  // `checkConfig` 整键缺失：`readManifest` 会经 `fillDefaults` 灌入默认值（`missingKeys` 是唯一痕迹）——
  // gate 不得拿内置默认值当声明面（设计「取参失败 ⇒ ERROR」的第一支）。
  if (gate && (read.missingKeys ?? []).includes("checkConfig")) {
    return gateParamError(base, { reason: "invalid-config", errors: ["`checkConfig` 缺——声明面未声明判据参数"] })
  }
  const cfg = read.manifest.checkConfig ?? {}
  if (gate) {
    const bad = configError(cfg)
    if (bad) return gateParamError(base, { reason: "invalid-config", errors: [bad] })
  }
  const scanDirs = (Array.isArray(cfg.scanDirs) ? cfg.scanDirs : []).filter((d) => typeof d === "string" && d !== "")
  const exclude = Array.isArray(cfg.anchors?.exclude) ? cfg.anchors.exclude : []
  const lineWidth = cfg.lineWidth
  const zones = (Array.isArray(cfg.widthExemptZones) ? cfg.widthExemptZones : []).filter((z) => typeof z === "string" && z !== "")

  const files = scanDomain(base, { scanDirs, exclude })
  const range = gate ? resolveRange(base, files, docs) : { check: files, outside: [], gone: [] }
  const checkFiles = range.check
  const anchors = checkAnchors(base, { scanDirs, files, checkFiles })
  const widths = checkDocWidths(base, { lineWidth, scanDirs, exclude, exemptZones: zones, files, checkFiles })

  const hits = { total: anchors.hits.length + widths.length, anchors: anchors.hits.length, width: widths.length }
  const shared = {
    hits, anchorHits: anchors.hits, widthHits: widths, anchorReports: anchors.reports,
    files, checkFiles, scanDirs, lineWidth, zones, exclude, skipped: { outside: range.outside, gone: range.gone },
  }
  if (gate) {
    return {
      ...shared,
      report: gateReport({ base, docsSource: source, checkFiles, domainCount: files.length, skipped: shared.skipped, anchors, widths, lineWidth, exclude }),
    }
  }

  const total = hits.total
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

  return { ...shared, report: out.join("\n") }
}
