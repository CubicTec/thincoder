/**
 * agent-tools/doc-check.mjs — `doc_check` 工具：文档纪律机检（产品内建 · 报告态 · 非门禁）。
 *
 * 设计 = `docs/core/design/DOC-DISCIPLINE.md` §3.20 条目 S（起步两条判据 = 锚 ∥ 行宽 · 声明面驱动）。
 * 工具形：**单动作**（无 action 枚举——不预建空枚举）· **只读**（零副作用 · 免审批 · 可并行）·
 * 参数 `target` 可选（缺省 = 会话锚）；`target` 指向多项目工作区 ⇒ 报明候选并要求指名（同 `manifest` 工具面）。
 * 判据参数读目标项目的 `PROJECT-MANIFEST.json` `checkConfig`——不硬编码任何本仓路径（换项目开箱可用）。
 * 非门禁（硬）：输出不得被读作拒执行的理由（用户令 > 机检——§2 总则族）。
 * 描述外置：模型可见文本单点 = `tool-docs/doc_check.md`（`DESC` 单一解析面）。
 * 装配段 = `agent/family-tools.mjs` 三处（depth-0 / eng-coder / eng-designer）——写文档 / 设计档的角色面。
 */
import { resolve } from "node:path"
import { projectRootView } from "../manifest.mjs"
import { runDocCheck } from "../doc-check/index.mjs"
import { DESC } from "../tools/shared.mjs"

export const docCheckTool = {
  name: "doc_check",
  description: DESC("doc_check"),
  parameters: {
    type: "object",
    properties: {
      target: { type: "string", description: "Explicit project root to check — defaults to the session anchor; relative paths resolve against it. A workspace target (several projects below it) is reported with the full candidate list — pass the project root you mean." },
    },
  },
  readonly: true,
  execute(args, ctx) {
    const anchor = ctx?.agent?.cwd ?? ctx?.cwd ?? process.cwd()
    const target = args?.target ? resolve(anchor, String(args.target)) : resolve(anchor)
    const view = projectRootView(target)
    if (view.state === "workspace") {
      return `doc_check: ${target} is a workspace holding ${view.candidates.length} projects — pass the project root explicitly via target:\n` +
        view.candidates.map((c) => `- ${c}`).join("\n")
    }
    return runDocCheck(view.state === "ok" ? view.root : target).report
  },
}
