import test from "node:test"
import assert from "node:assert/strict"
import { createModelMenu, closeModelMenu } from "../composer/model-menu.mjs"

function fixture() {
  class Node {
    constructor() { this.children = []; this.style = {}; this.dataset = {}; this.events = {}; this.attrs = {}; this.classList = { toggle() {} } }
    append(...nodes) { for (const node of nodes) this.appendChild(node) }
    appendChild(node) { this.children.push(node); node.parentNode = this; return node }
    remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((node) => node !== this); this.parentNode = null }
    addEventListener(type, fn) { this.events[type] = fn }
    setAttribute(key, value) { this.attrs[key] = value }
    getBoundingClientRect() { return { top: 300, bottom: 330, left: 10 } }
    contains(node) { return node === this || this.children.some((child) => child.contains?.(node)) }
  }
  const before = { document: globalThis.document, window: globalThis.window }
  globalThis.document = { createElement: () => new Node(), addEventListener() {}, removeEventListener() {}, body: new Node() }
  globalThis.window = { addEventListener() {}, removeEventListener() {}, requestAnimationFrame: (fn) => fn(), innerWidth: 1000, innerHeight: 700 }
  const modelBtn = new Node(), reasoningBtn = new Node(), controlsRow = new Node(), posts = []
  const menu = createModelMenu({ modelBtn, reasoningBtn, controlsRow, post: (...args) => posts.push(args) })
  return { menu, modelBtn, reasoningBtn, posts, dispose() { closeModelMenu(); Object.assign(globalThis, before) } }
}

test("account catalog replacement closes stale menus and preserves only explicit session preferences", () => {
  const f = fixture()
  try {
    f.menu.applyModels({ models: [{ id: "old-slug", label: "Friendly model", provider: "chatgpt", reasoning: [] }], prefs: { provider: "chatgpt", model: "old-slug" } })
    assert.equal(f.modelBtn.textContent, "Friendly model")
    f.menu.open()
    assert.equal(document.body.children.length, 1)
    f.menu.applyModels({ models: [], prefs: { provider: "chatgpt", model: "old-slug" } })
    assert.equal(document.body.children.length, 0)
    assert.equal(f.menu.selection().provider, "chatgpt", "keep explicit choice so auth failure cannot switch to API billing")
    f.menu.applyModels({ models: [] })
    assert.equal(f.menu.selection().provider, "")
    assert.equal(f.menu.selection().model, "")
    assert.equal(f.modelBtn.style.display, "none")
  } finally { f.dispose() }
})

test("new unselected catalog does not reuse a previous account's ephemeral choice", () => {
  const f = fixture()
  try {
    f.menu.applyModels({ models: [{ id: "a", provider: "chatgpt" }], prefs: { model: "a", provider: "chatgpt" } })
    const before = f.posts.length
    f.menu.applyModels({ models: [{ id: "b", provider: "chatgpt" }], prefs: {} })
    assert.equal(f.menu.selection().model, "")
    assert.equal(f.posts.length, before, "never silently pick the replacement account's first model")
  } finally { f.dispose() }
})

test("reasoning levels use the selected provider when model IDs are shared", () => {
  const f = fixture()
  try {
    f.menu.applyModels({ models: [
      { id: "shared", provider: "api", reasoning: ["low"] },
      { id: "shared", provider: "chatgpt", reasoning: ["high", "max"] },
    ], prefs: { model: "shared", provider: "chatgpt" } })
    f.reasoningBtn.events.click()
    assert.equal(f.menu.reasoningDropdown.children.length, 3)
    assert.match(f.menu.reasoningDropdown.children[1].innerHTML, /high/)
    assert.match(f.menu.reasoningDropdown.children[2].innerHTML, /max/)
    f.menu.applyModels({ models: [] })
    assert.equal(f.menu.reasoningDropdown.style.display, "none")
    assert.equal(f.reasoningBtn.attrs["aria-expanded"], "false")
  } finally { f.dispose() }
})
