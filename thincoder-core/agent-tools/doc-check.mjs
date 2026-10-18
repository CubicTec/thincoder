/**
 * agent-tools/doc-check.mjs — `doc_check` 工具：文档纪律机检（产品内建 · 两种问法）。
 *
 * 设计 = `docs/core/design/DOC-DISCIPLINE.md` §3.20 条目 S（判据 = 锚 ∥ 行宽 · 声明面驱动）。
 * 工具形：**无动作枚举**——`mode` = 同一条判据的两种问法（`report` = 全域报告态 ∥ `gate` = 交付时点
 * 的范围化裁定）；**只读**（零副作用 · 免审批 · 可并行）；参数 `target` / `mode` / `docs`
 * （`target` 指向多项目工作区 ⇒ 报明候选并要求指名，同 `manifest` 工具面）。
 * 判据参数读目标项目的 `PROJECT-MANIFEST.json` `checkConfig`——不硬编码任何本仓路径（换项目开箱可用）。
 * `report` 非门禁（硬）：输出不得被读作拒执行的理由（用户令 > 机检——§2 总则族）；
 * `gate` 的强制面住交付协议 + 批次档 §6 前置，工具本体同样不阻断任何动作。
 * gate 前置（fail-closed）= 引擎版本一致：本会话进程持启动时加载的 ESM 引擎，引擎档晚于启动 ⇒ ERROR
 * （判据单源 = `doc-check/version.mjs`——与 `batch-gate.mjs` 共用一份清单，不各持一份）。
 * 描述外置：模型可见文本单点 = `tool-docs/doc_check.md`（`DESC` 单一解析面）。
 * 装配段 = `agent/family-tools.mjs` 三处（depth-0 / eng-coder / eng-designer）——写文档 / 设计档的角色面。
 */
import { resolve } from "node:path"
import { projectRootView } from "../manifest.mjs"
import { runDocCheck } from "../doc-check/index.mjs"
import { staleEngineFiles, gateEngineError } from "../doc-check/version.mjs"
import { DESC } from "../tools/shared.mjs"

// 版本函数单源 = `doc-check/version.mjs`（两消费面：本档 gate 分支 ∥ `batch-gate.mjs` 两机械点）——
// 本档只转口，导出面不变（原五档清单已随之六档：`version.mjs` 自身入清单）。
export { staleEngineFiles, gateEngineError }

export const docCheckTool = {
  name: "doc_check",
  description: DESC("doc_check"),
  parameters: {
    type: "object",
    properties: {
      target: { type: "string", description: "Explicit project root to check — defaults to the session anchor; relative paths resolve against it. A workspace target (several projects below it) is reported with the full candidate list — pass the project root you mean." },
      mode: { type: "string", enum: ["report", "gate"], description: "How to ask the same two-criteria check. \"report\" (default): the whole declared domain, non-gating report. \"gate\": the delivery gate — only the documents this round touched, whole-file judged, first line a machine-readable verdict (DOC-CHECK GATE: PASS / REFUSED / ERROR)." },
      docs: { type: "array", items: { type: "string" }, description: "Gate only: the documents this round touched (paths relative to the project root, or absolute). Omitted in gate mode ⇒ the documents this session wrote. Passing docs with mode \"report\" is refused, not silently ignored." },
    },
  },
  readonly: true,
  execute(args, ctx) {
    const anchor = ctx?.agent?.cwd ?? ctx?.cwd ?? process.cwd()
    const target = args?.target ? resolve(anchor, String(args.target)) : resolve(anchor)
    const mode = args?.mode === undefined ? "report" : String(args.mode)
    if (mode !== "report" && mode !== "gate") return `doc_check: unknown mode "${mode}" — use "report" (default: the whole declared domain) or "gate" (this round's documents).`
    const explicit = Array.isArray(args?.docs) ? args.docs.map(String) : null
    if (args?.docs !== undefined && !Array.isArray(args.docs)) {
      return `doc_check: \`docs\` must be an array of paths (got ${typeof args.docs}) — a bare string is refused rather than read as a whole-domain request; pass ["<path>"].`
    }
    if (mode === "report" && explicit) {
      return "doc_check: `docs` is only valid with mode:\"gate\" — report mode always checks the whole declared domain; pass mode:\"gate\" to scope the check to the documents this round touched."
    }
    const view = projectRootView(target)
    if (view.state === "workspace") {
      if (mode === "gate") {
        return [
          "DOC-CHECK GATE: ERROR（多项目工作区：请指名 target）",
          `候选：${view.candidates.join(" ∥ ")}`,
          "处置：指名项目根（`target`）后复跑",
        ].join("\n")
      }
      return `doc_check: ${target} is a workspace holding ${view.candidates.length} projects — pass the project root explicitly via target:\n` +
        view.candidates.map((c) => `- ${c}`).join("\n")
    }
    const root = view.state === "ok" ? view.root : target
    if (mode === "gate") {
      // 引擎版本校验先于引擎（A-DD30 ①）：stale 非空 ⇒ 直接 ERROR 串，不进引擎
      const version = staleEngineFiles()
      if (version.stale.length) return gateEngineError(version)
      // 会话候选先取 `.md`（触达记账含代码档——代码档不是文档，不该进范围行）；域求交归引擎单源
      const docs = explicit ?? (Array.isArray(ctx?.agent?._touchedFiles) ? ctx.agent._touchedFiles : [])
        .filter((p) => typeof p === "string" && p.toLowerCase().endsWith(".md"))
      return runDocCheck(root, { mode: "gate", docs, docsSource: explicit ? "explicit" : "session" }).report
    }
    return runDocCheck(root).report
  },
}
