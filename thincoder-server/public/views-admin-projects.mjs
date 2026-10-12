/**
 * views-admin-projects.mjs — 管理·项目（webui/PROJECTS.md §2.2——KD-SV-124；team-projects-permissions 批（B2）；台账 #1216）：
 * `#/admin/projects`（admin 门）——全量项目表（显示名 ∥ 仓地址 ∥ 源 ∥ 负责人 ∥ 成员数——搜索 ∥ 页首「添加仓」钮）
 * + 行点击 ⇒ 项目详情弹窗（共用构建器单源住 `views-projects.mjs`——admin 能力面全显）。
 *
 * 判权全在后端（管理面 = `requireAdmin`——页面不是判据）；文案经 `t()` 取值；渲染一律节点 + textContent（零拼串）。
 * 端点 = gateway/API.md §2.9（列表径与我的页同源——admin 读数 ⇒ 全量集）。
 */
import { t } from "./i18n.mjs"
import { openAddRepoDialog, openProjectDetail, projectsTable } from "./views-projects.mjs"

export async function renderAdminProjects(ctx, mount) {
  const { h } = ctx
  const search = h("input", { placeholder: t("me.projects.searchPh") })
  const box = h("div", { class: "table-slot" }, h("p", { class: "hint", text: t("common.loading") }))
  /** 取数 + 渲染（全量集——admin 读数；`?q=` 搜索与我的页同径）。 */
  const load = async () => {
    box.replaceChildren(h("p", { class: "hint", text: t("common.loading") }))
    try {
      const keyword = search.value.trim()
      const data = await ctx.api(keyword === "" ? "/api/projects" : `/api/projects?q=${encodeURIComponent(keyword)}`)
      const projects = data.projects ?? []
      box.replaceChildren(projects.length === 0
        ? h("p", { class: "hint", text: t("admin.projects.empty") })
        : projectsTable(ctx, {
            projects,
            open: (project) => openProjectDetail(ctx, { projectId: project.id, onChanged: load }),
            extraHeaders: [t("me.projects.col.owner"), t("admin.projects.col.memberCount")],
            extraCells: (project) => [h("td", { text: project.owner ?? "—" }), h("td", { text: String(project.memberCount ?? 0) })],
          }))
    } catch (error) {
      ctx.fail(error)
      box.replaceChildren(h("p", { class: "hint error", text: t("admin.projects.loadFailed") }))
    }
  }
  const form = h("form", { class: "row-form" }, search, h("button", { type: "submit", text: t("me.projects.search") }))
  form.addEventListener("submit", (event) => { event.preventDefault(); load() })
  const addBtn = h("button", { type: "button", text: t("admin.projects.addBtn"), onclick: () => openAddRepoDialog(ctx, { onAdded: load }) }) // 入口①：页首钮（入口② = Git 源页「拉列表」）
  mount.append(h("h2", { text: t("admin.projects.title") }), h("div", { class: "row-form" }, addBtn), h("section", { class: "card" }, form, box))
  await load()
}
