/**
 * 2026-10-15-member-pull-detail-render.test.mjs — thincoder-server 批内件（`member-pull-detail-render` 轻通道轮 · 台账 #1452；名随批档 · 住 `docs/batches/`）：
 * 成员面拉取失败详情渲染修复（`views-me-chat.mjs` `pullDetailText` 纯函数 + 轮询解析点绑定）：对象 detail ⇒ 取 `message` 原文 ∥ 串 ⇒ 原值 ∥ 缺省/空 ⇒ `""`（页面回落通用文案）。
 * 运行（自 `thincoder/` 仓根——`--import` 缝行不可省：页/核同源取件面 = `/rc/**`）：
 *   `node --import ./thincoder-server/test/rc-resolve.mjs --test docs/batches/2026-10-15-member-pull-detail-render.test.mjs`
 *
 * 判据源 = 批档 §1 笔 1/2 ∥ 现场读数（E2E 实跑：detail = `{kind:"auth", message:"凭据缺失或无效——…", dir}`）。
 */
import test from "node:test"
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"

const ROOT = process.cwd()
if (!existsSync(join(ROOT, "thincoder-server"))) throw new Error(`须从仓库根（thincoder/）运行——cwd = ${ROOT}`)
const PAGE_SRC = readFileSync(join(ROOT, "thincoder-server", "public", "views-me-chat.mjs"), "utf8")
const PAGE = await import(pathToFileURL(join(ROOT, "thincoder-server", "public", "views-me-chat.mjs")).href)

test("对象 detail ⇒ 取 message 原文（auth 例——E2E 现场原样）", () => {
  assert.equal(
    PAGE.pullDetailText({ kind: "auth", message: "凭据缺失或无效——请在我的·账户页绑定 Git 凭据后重试", dir: "/workspace/v2-accounting" }),
    "凭据缺失或无效——请在我的·账户页绑定 Git 凭据后重试",
  )
})
test("串 detail ⇒ 原值直回（服务端 detail 奇形直值支）", () => {
  assert.equal(PAGE.pullDetailText("目录冲突：目标目录已存在"), "目录冲突：目标目录已存在")
})
test("缺省/空对象 ⇒ 空串（页面回落通用文案）", () => {
  assert.equal(PAGE.pullDetailText(undefined), "")
  assert.equal(PAGE.pullDetailText(null), "")
  assert.equal(PAGE.pullDetailText({}), "")
})
test("解析点绑定：轮询用合成函数、零 `String(detail)` 残留（源面断言）", () => {
  assert.match(PAGE_SRC, /const detailText = pullDetailText\(data\?\.detail\)/)
  assert.doesNotMatch(PAGE_SRC, /String\(data\?\.detail/)
})
