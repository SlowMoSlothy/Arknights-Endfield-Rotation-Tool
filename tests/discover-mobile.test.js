import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = fs.readFileSync("endfield/community/community-page.js", "utf8").replace(/\ninit\(\);\s*$/, "");
const tick = () => new Promise(resolve => setImmediate(resolve));
const share = { short_code: "ABC123", title: "Mi Fu / Argent Flow / Rossi / Kay rotation", share_type: "rotation",
  author_name: "Slothy", created_at: "2026-11-26T12:00:00Z", operator_ids: [1, 2, 3, 4] };

function element(tag = "div") {
  const node = { tag, children: [], attributes: {}, dataset: {}, listeners: {}, className: "", textContent: "",
    setAttribute(key, value) { this.attributes[key] = value; },
    append(...children) { for (const child of children) this.appendChild(child); },
    appendChild(child) { child.parent = this; this.children.push(child); return child; },
    replaceChildren(...children) { this.children = []; this.append(...children); },
    addEventListener(name, callback) { this.listeners[name] = callback; },
    closest(selector) { return selector.split(", ").includes(this.tag) ? this : this.parent?.closest(selector); }
  };
  node.classList = {
    contains: name => node.className.split(" ").includes(name),
    add: name => { node.className += ` ${name}`; },
    remove: name => { node.className = node.className.split(" ").filter(item => item !== name).join(" "); }
  };
  return node;
}
function descendants(node) { return node.children.flatMap(child => [child, ...descendants(child)]); }
function find(node, cls) { return descendants(node).filter(child => child.classList.contains(cls)); }

function mount({ mobile = true, preciseHover = false, observer = true, actions = 14, failure = false } = {}) {
  const observers = [], calls = [], copies = [], engagements = [];
  const elements = new Map(["rotationGrid", "emptyState", "rotationCount", "rotationStatus"].map(id => [id, element()]));
  const media = { matches: mobile };
  const c = { URL, URLSearchParams, console: { warn() {} },
    location: { href: "https://rotationforge.gg/endfield/community/" },
    matchMedia: query => query.includes("max-width") ? media : { matches: preciseHover },
    document: { createElement: element, getElementById: id => elements.get(id), querySelectorAll: () => [] },
    navigator: { clipboard: { writeText: async value => copies.push(value) } },
    setTimeout() {}, clearTimeout() {},
    RotationShareEngagement: { create(code) { engagements.push(code); return element(); } },
    supabaseClient: { rpc: async (name, args) => {
      calls.push({ name, args });
      if (failure) throw new Error("offline");
      // Version 9, four operators, then skill actions in their original order.
      const varint = value => value < 128 ? [value] : [(value & 127) | 128, value >> 7];
      const bytes = [9, 1, 2, 3, 4, ...varint(actions), ...Array.from({ length: actions }, (_, index) => [1, ...varint(index + 1)]).flat()];
      return { data: { share_payload: Buffer.from(bytes).toString("base64url") } };
    } }, atob: value => Buffer.from(value, "base64").toString("binary")
  };
  if (observer) c.IntersectionObserver = class {
    targets = new Set();
    constructor(callback, options) { this.callback = callback; this.options = options; observers.push(this); }
    observe(node) { this.targets.add(node); }
    unobserve(node) { this.targets.delete(node); }
    disconnect() { this.targets.clear(); this.disconnected = true; }
    intersect(node, visible = true) { this.callback([{ target: node, isIntersecting: visible }], this); }
  };
  c.window = c;
  vm.createContext(c);
  vm.runInContext(source, c);
  c.getSkill = id => ({ name: `Skill ${id}`, type: "battle_skill", elementType: "physical", shortType: "BS" });
  return { c, observers, calls, copies, engagements, elements, media };
}

test("mobile previews load near the viewport, retain every action in order, and fetch each share once", async () => {
  const m = mount();
  const item = m.c.card(share);
  assert.equal(m.calls.length, 0);
  assert.equal(m.observers[0].options.rootMargin, "200px");
  m.observers[0].intersect(item, false);
  assert.equal(m.calls.length, 0);
  m.observers[0].intersect(item);
  await tick();
  assert.equal(m.calls.length, 1);
  assert.equal(m.calls[0].name, "resolve_rotation_share");
  assert.equal(m.observers[0].targets.size, 0);
  assert.equal(find(item, "rotation-preview-step").length, 14);
  assert.deepEqual(find(item, "ef-skill-icon").map(node => node.title), Array.from({ length: 14 }, (_, i) => `Skill ${i + 1}`));
  assert.equal(find(item, "rotation-preview")[0].attributes["aria-label"], "14 actions in rotation order");
  await item.listeners.pointerenter();
  await item.listeners.focusin();
  const second = m.c.card(share);
  m.observers[0].intersect(second);
  await tick();
  assert.equal(m.calls.length, 1, "hover, focus and a rerender reuse the cached payload");
  assert.equal(find(second, "rotation-preview-step").length, 14);
});

test("compact cards open on the first tap and retain owner editing, copying and engagement controls", async () => {
  const m = mount();
  const item = m.c.card({ ...share, can_edit: true });
  const open = find(item, "planner-link")[0];
  assert.equal(open.textContent, "Edit ↗");
  assert.equal(open.href, "../#share=ABC123");
  assert.match(open.attributes["aria-label"], /^Edit Mi Fu/);
  const copy = find(item, "copy-button")[0];
  copy.listeners.click();
  await tick();
  assert.deepEqual(m.copies, ["https://rotationforge.gg/endfield/#share=ABC123"]);
  assert.equal(copy.textContent, "Copied");
  assert.deepEqual(m.engagements, ["ABC123"]);
  const event = target => ({ target, preventDefault() { throw new Error("Mobile cards must open directly"); } });
  item.listeners.click(event(copy));
  item.listeners.click(event(open));
  assert.equal(m.c.location.href, "https://rotationforge.gg/endfield/community/");
  item.listeners.click(event(find(item, "card-title")[0]));
  assert.equal(m.c.location.href, "../#share=ABC123");
});

test("even the longest supported rotation retains its final action on mobile", async () => {
  const m = mount({ actions: 240, observer: false });
  const item = m.c.card(share);
  await tick();
  assert.equal(find(item, "rotation-preview-step").length, 240);
  assert.equal(find(item, "ef-skill-icon").at(-1).title, "Skill 240");
});

test("desktop retains lazy hover previews, the six-skill summary and keyboard navigation", async () => {
  const m = mount({ mobile: false, preciseHover: true });
  const item = m.c.card(share);
  assert.equal(m.observers.length, 0);
  assert.equal(m.calls.length, 0);
  await item.listeners.pointerenter();
  const steps = find(item, "rotation-preview-step");
  assert.equal(steps.filter(node => !node.classList.contains("is-preview-extra")).length, 6);
  assert.equal(find(item, "preview-overflow-count")[0].textContent, "+8");
  assert.equal(find(item, "planner-link")[0].textContent, "Open ↗");
  let prevented = false;
  item.listeners.keydown({ target: item, key: "Enter", preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(m.c.location.href, "../#share=ABC123");
});

test("wide touch screens retain tap-to-preview behavior", async () => {
  const m = mount({ mobile: false });
  const item = m.c.card(share);
  item.listeners.click({ target: item, preventDefault() {} });
  await tick();
  assert.equal(item.classList.contains("is-preview-open"), true);
  assert.equal(m.c.location.href, "https://rotationforge.gg/endfield/community/");
  item.listeners.click({ target: item });
  assert.equal(m.c.location.href, "../#share=ABC123");
});

test("empty or failed previews preserve a readable status and functioning Open link", async () => {
  for (const options of [{ actions: 0 }, { failure: true }]) {
    const m = mount({ ...options, observer: false });
    const item = m.c.card(share);
    await tick();
    const status = find(item, "preview-more")[0];
    assert.equal(status.textContent, options.failure ? "Preview unavailable" : "No actions in this share");
    assert.equal(status.classList.contains("preview-overflow-count"), false);
    assert.equal(find(item, "planner-link")[0].href, "../#share=ABC123");
  }
});

test("rerendering disconnects old observers and ignores queued intersections for discarded cards", () => {
  const m = mount();
  const item = m.c.card(share);
  const old = m.observers[0];
  m.c.renderTabs = () => {};
  m.c.render();
  assert.equal(old.disconnected, true);
  old.intersect(item);
  assert.equal(m.calls.length, 0);
  const current = m.c.card(share);
  m.observers[1].intersect(current);
  assert.equal(m.calls.length, 1);
});
