/**
 * 2026-10-15-model-selection-pivot-vsc.test.mjs — 批内单测件（批档 = `docs/batches/2026-10-15-model-selection-pivot.md`
 * §2.24 项 7 ∥ §4 本块 · VSC 半）：设置面 Providers 卡「默认模型」行撤场 + banner 动作钮重指会话级模型菜单
 * （设计单源 = `docs/vsc/design/SETTINGS.md` §2.2 ∥ `docs/vsc/design/WEBVIEW.md` §4.8；
 *  钮重指决策单源 = `docs/desktop/design/SETTINGS.md` §1 **KD-80** ⑤）。
 *
 * 三用例：
 *   用例 1 · 卡树零 `#prov-defaultmodel-row`（真 `providersCardHtml()` 产出串扫——行族仍在）
 *   用例 2 · `_defaultModelMenu` 零在场（真 `installProviderHandlers()` 后的 `window` 面）
 *   用例 3 · banner 钮指向会话模型菜单（`showBanner` 点钮 ⇒ 调 `onChoose` + 注入行源面锁）
 *
 * **用毕即删（零留存）**：本档随批档归档、不进 `test/` 收集面；§5 留一行读数。
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, "..", "..")
const url = (rel) => pathToFileURL(join(ROOT, rel)).href
const text = (rel) => readFileSync(join(ROOT, rel), "utf8")

const PROVIDERS = "thincoder-vscode/webview/settings-providers.js"
const CHAT_MESSAGES = "thincoder-vscode/webview/chat-messages.js"

/** 最小 DOM 桩（`showBanner` 建节点面：`createElement` / `getElementById` / `addEventListener` 捕获）。 */
function stubDom() {
  const made = []
  const make = (tag) => {
    const el = {
      tag, children: [], dataset: {}, style: {}, listeners: [], className: "", textContent: "", type: "",
      appendChild(child) { this.children.push(child); return child },
      insertBefore(child) { this.children.unshift(child); return child },
      addEventListener(type, fn) { this.listeners.push({ type, fn }) },
    }
    made.push(el)
    return el
  }
  const byId = new Map()
  globalThis.document = { createElement: make, getElementById: (id) => byId.get(id) ?? null }
  return { made, byId }
}

test("用例 1 · 卡树零 `#prov-defaultmodel-row` ∧ 词键三退后两语键集相等", async () => {
  globalThis.window = { _vscode: { postMessage() {} } }
  const { providersCardHtml } = await import(url(PROVIDERS))
  const { SS } = await import(url("thincoder-vscode/webview/settings-state.js"))
  SS.providerStatus = {
    providers: { deepseek: { configured: true, masked: "sk-…", baseURL: "http://127.0.0.1:9/v1", proxy: false, isActive: false } },
    labels: {}, presets: [],
  }
  SS.agentSettings = { defaultModel: "deepseek:chat" } // 存量载荷键也不得复现该行
  const html = providersCardHtml()
  assert.ok(!html.includes("prov-defaultmodel-row"), "「默认模型」行仍在场")
  assert.ok(!html.includes("defaultmodel-btn") && !html.includes("defaultmodel-value") && !html.includes("defaultmodel-hint"), "行内锚残留")
  assert.ok(html.includes('id="prov-list"'), "provider 行族容器缺失")
  assert.ok(html.includes('id="prov-deepseek"'), "provider 行族应仍在场")
  const en = JSON.parse(text("thincoder-vscode/locales/en.json"))
  const zh = JSON.parse(text("thincoder-vscode/locales/zh.json"))
  assert.deepEqual(Object.keys(en), Object.keys(zh), "两语键集应相等")
  for (const key of ["settings.defaultModel", "settings.defaultModelTitle", "settings.pickModelEmpty"]) {
    assert.ok(!(key in en) && !(key in zh), `${key} 残留`)
  }
  assert.ok("settings.pickModel" in en && "settings.pickModel" in zh, "`settings.pickModel` 应在场（保留面消费者在册）")
})

test("用例 2 · `_defaultModelMenu` ∥ `saveAgentSettings{defaultModel}` 零在场", async () => {
  globalThis.window = { _vscode: { postMessage() {} } }
  const { installProviderHandlers } = await import(url(PROVIDERS))
  installProviderHandlers()
  assert.ok(!Object.hasOwn(globalThis.window, "_defaultModelMenu"), "`_defaultModelMenu` 残留")
  assert.ok(!Object.hasOwn(globalThis.window, "_setDefaultModel"), "`_setDefaultModel` 残留")
  assert.ok(Object.hasOwn(globalThis.window, "_removeProvider"), "对照出口 `_removeProvider` 应仍在场")
  assert.ok(Object.hasOwn(globalThis.window, "_editKey"), "对照出口 `_editKey` 应仍在场")
  // 载荷支零在场（消费面唯一生产者已撤）：写面源扫 —— `defaultModel` 键在 `saveAgentSettingsFromPanel` 面零命中
  const write = text("thincoder-vscode/src/extension/settings-panel-write.mjs")
  const save = write.slice(write.indexOf("export function saveAgentSettingsFromPanel"), write.indexOf("export function saveShellSettingsFromPanel"))
  assert.ok(save.length > 0, "未定位 `saveAgentSettingsFromPanel` 体")
  assert.ok(!/defaultModel/.test(save), "载荷 `defaultModel` 支残留")
  assert.ok(/export function probeDefaultModelChannel|function probeDefaultModelChannel/.test(write), "`probeDefaultModelChannel` 本体应在场（`carryoverDefaultModel` 仍用）")
})

test("用例 3 · banner 钮开径 = 会话模型菜单（点钮 ⇒ 调 `onChoose` + 注入行源面锁）", async () => {
  const { showBanner } = await import(url("thincoder-vscode/webview/ui.js"))
  const { made } = stubDom()
  const calls = []
  showBanner({ messagesEl: { querySelector: () => null, insertBefore: () => {}, appendChild: () => {} } }, { state: "fallback", model: "" }, () => calls.push("choose"))
  const btn = made.find((el) => el.tag === "button")
  assert.ok(btn !== undefined, "fallback 态应渲染动作钮")
  for (const listener of btn.listeners) if (listener.type === "click") listener.fn()
  assert.deepEqual(calls, ["choose"], "动作钮点击应走 `onChoose` 出口")
  // 注入行（源面锁）：`chat-messages.js` 的 `showBanner` 调用第三参 = 会话模型钮开径，且不再指设置面
  const call = text(CHAT_MESSAGES).split(/\r?\n/).find((row) => row.includes("showBanner(ctx"))
  assert.ok(call !== undefined, "未找到 `showBanner` 注入行")
  assert.ok(call.includes("model-btn"), `注入行未指向会话模型钮：${call.trim()}`)
  assert.ok(!/\bopenSettings\b/.test(call), `注入行仍指设置面：${call.trim()}`)
  assert.ok(!/\bopenSettings\b/.test(text(CHAT_MESSAGES).split(/\r?\n/).find((row) => row.includes("} = deps")) ?? ""), "`openSettings` 仍自 `deps` 解构")
  assert.ok(text("thincoder-vscode/webview/index.html").includes('id="model-btn"'), "会话模型钮锚不在册")
})
