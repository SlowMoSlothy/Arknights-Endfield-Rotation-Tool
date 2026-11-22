import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import { randomUUID } from "node:crypto";
const source = fs.readFileSync("endfield/js/ui/rotationShareEngagement.js", "utf8");
const tick = () => new Promise(resolve => setImmediate(resolve));

function mount(rpc) {
    const calls = [], storage = new Map();
    function element(tag) {
        return { tag, dataset: {}, attributes: {}, children: [], listeners: {}, isConnected: true,
            count: { textContent: "" }, textContent: "", disabled: false,
            append(child) { this.children.push(child); },
            setAttribute(key, value) { this.attributes[key] = value; },
            addEventListener(key, fn) { this.listeners[key] = fn; },
            querySelector(selector) {
                if (selector === "[role=status]") return this.children.find(el => el.attributes.role === "status");
                const kind = selector.match(/data-count="(.*?)"/)?.[1];
                return this.children.find(el => el.innerHTML?.includes(`data-count="${kind}"`))?.count;
            },
            querySelectorAll() { return this.children.filter(el => el.dataset.reaction); }
        };
    }
    const c = { console, crypto: { randomUUID }, queueMicrotask,
        localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
        document: { createElement: element },
        supabaseClient: { rpc: async (name, args) => { calls.push({ name, args }); return rpc(name, args); } }
    };
    c.window = c;
    vm.createContext(c);
    vm.runInContext(source, c);
    return { api: c.RotationShareEngagement, calls, storage };
}
const summary = (reaction = null) => ({ view_count: 3, like_count: reaction === "like" ? 1 : 0, dislike_count: reaction === "dislike" ? 1 : 0, reaction });

test("listing batches stats without recording views and reuses the Operator Database visitor ID", async () => {
    const m = mount(async () => ({ data: { ABC123: summary() } }));
    const visitor = randomUUID();
    m.storage.set("rotationforge.profileVisitorId.v1", visitor);
    await m.api.loadMany(["ABC123"]);
    const root = m.api.create("ABC123");
    await tick();
    assert.equal(m.calls.length, 1);
    assert.equal(m.calls[0].name, "get_rotation_share_engagement");
    assert.equal(m.calls[0].args.p_visitor_id, visitor);
    assert.equal(root.querySelector('[data-count="views"]').textContent, "3");
    assert.equal(root.querySelectorAll()[0].disabled, false);
});

test("reactions toggle, switch, serialize duplicate clicks and retain counts after a failed save", async () => {
    let finish, fail = false;
    const m = mount(async (name, args) => {
        if (name === "get_rotation_share_engagement") return { data: { ABC123: summary() } };
        if (fail) return { error: new Error("offline") };
        return new Promise(resolve => { finish = () => resolve({ data: summary(args.p_reaction) }); });
    });
    await m.api.loadMany(["ABC123"]);
    const root = m.api.create("ABC123");
    await tick();
    const [like, dislike] = root.querySelectorAll();
    const first = like.listeners.click();
    like.listeners.click();
    assert.equal(like.disabled, true);
    assert.equal(m.calls.length, 2);
    finish(); await first;
    assert.equal(like.attributes["aria-pressed"], "true");
    const remove = like.listeners.click(); finish(); await remove;
    assert.equal(m.calls.at(-1).args.p_reaction, null);
    assert.equal(like.attributes["aria-pressed"], "false");
    const switchVote = dislike.listeners.click(); finish(); await switchVote;
    assert.equal(dislike.attributes["aria-pressed"], "true");
    fail = true;
    await like.listeners.click();
    assert.equal(dislike.attributes["aria-pressed"], "true");
    assert.equal(like.disabled, false);
    assert.match(root.querySelector("[role=status]").textContent, /Could not save/);
});

test("opening a share records one view request, and a stale summary cannot overwrite a new vote", async () => {
    let finishRefresh;
    const m = mount(async (name, args) => {
        if (name === "record_rotation_share_view") return { data: summary() };
        if (name === "get_rotation_share_engagement") return new Promise(resolve => { finishRefresh = () => resolve({ data: { ABC123: summary() } }); });
        return { data: summary(args.p_reaction) };
    });
    const root = m.api.create("ABC123", { recordView: true });
    await tick();
    assert.equal(m.calls[0].name, "record_rotation_share_view");
    const refresh = m.api.loadMany(["ABC123"]);
    const [like] = root.querySelectorAll();
    await like.listeners.click();
    finishRefresh(); await refresh;
    assert.equal(like.attributes["aria-pressed"], "true");
    assert.equal(root.querySelector('[data-count="like"]').textContent, "1");
});

test("unavailable and malformed stats show an error instead of invented zero counts", async () => {
    for (const result of [{ error: new Error("offline") }, { data: {} }, { data: { ABC123: { view_count: "invalid" } } }]) {
        const m = mount(async () => result);
        const root = m.api.create("ABC123");
        await tick();
        await m.api.loadMany(["ABC123"]);
        assert.equal(root.querySelector('[data-count="views"]').textContent, "—");
        assert.match(root.querySelector("[role=status]").textContent, /Stats unavailable/);
        assert.equal(root.querySelectorAll()[0].disabled, true);
    }
});
