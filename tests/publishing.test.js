import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = fs.readFileSync("endfield/js/logic/shareCode.js", "utf8");
const storageSource = fs.readFileSync("endfield/js/logic/storage.js", "utf8");
const tick = () => new Promise(resolve => setImmediate(resolve));
function mount({ rpc, clipboardDenied = false } = {}) {
    const elements = new Map(), calls = [], clipboardCalls = [], events = [], eventDetails = [], documentListeners = {};
    const ids = ["shareMetadataModal", "shareMetadataForm", "shareMetadataTitleInput", "shareMetadataDescriptionInput",
        "shareMetadataAuthorPreview", "shareMetadataIntro", "shareMetadataStatus", "shareMetadataModalTitle",
        "cancelShareMetadataBtn", "closeShareMetadataModalBtn", "dismissShareMetadataCardBtn", "copyPublishedShareLinkBtn",
        "shareMetadataCard", "shareMetadataCardType", "shareMetadataCardTitle", "shareMetadataCardAuthor", "shareMetadataCardCode",
        "shareMetadataCardCreated", "shareMetadataCardDescription", "publishedShareLink", "publishedShareOpenLink",
        "publishedShareDiscoverLink", "shareMetadataCopyStatus", "publishRotationStatus", "publishRotationBtn",
        "updatePublishedShareBtn", "publishedShareEditNote", "submitShareMetadataBtn",
        "rotationPublishActions", "exportRotationBtn", "copyShareCodeBtn", "copyShareLinkBtn", "saveRotationMenuBtn"];
    for (const id of ids) {
        const classes = new Set();
        elements.set(id, { hidden: true, disabled: false, value: "", textContent: "", attributes: {}, listeners: {}, listenerOptions: {},
            classList: { add: value => classes.add(value), remove: value => classes.delete(value), contains: value => classes.has(value) },
            setAttribute(key, value) { this.attributes[key] = value; }, closest() { return null; },
            addEventListener(name, callback, options) { this.listeners[name] = callback; this.listenerOptions[name] = options; }, focus() { this.focused = true; },
            select() { this.selected = true; }, scrollIntoView() { this.scrolled = true; } });
    }
    const c = { URL, console: { error() {}, warn() {} },
        location: { protocol: "https:", origin: "https://rotationforge.gg", pathname: "/endfield/" },
        setTimeout: callback => callback(),
        document: { readyState: "loading", addEventListener(name, callback) { documentListeners[name] = callback; }, getElementById: id => elements.get(id) || null },
        selectedTeam: [1, 2, null, null], operators: [{ id: 1, name: "Endministrator" }, { id: 2, name: "Perlica" }],
        rotation: [{ id: 11 }], uiSettings: { timelineMode: "slot" },
        navigator: { clipboard: { writeText: async value => {
            clipboardCalls.push(value);
            if (clipboardDenied) throw new Error("Clipboard denied");
        } } },
        supabaseClient: { rpc: async (name, args) => {
            calls.push({ name, args });
            return rpc ? rpc(name, args) : { data: { short_code: "ABC123", share_type: "rotation", title: args.p_title } };
        } },
        trackPlannerEvent: (name, details) => { events.push(name); eventDetails.push({ name, details }); },
        getPlannerGuideShareSignature: () => "submitted-draft", markPlannerGuidePublished() {} };
    c.window = c;
    vm.createContext(c);
    vm.runInContext(source, c);
    vm.runInContext(storageSource, c);
    c.getDisplayBuildShareCode = () => "test-payload";
    c.initShareMetadataUi();
    c.updateRotationActionStates();
    const get = id => elements.get(id);
    const submit = () => get("shareMetadataForm").listeners.submit({ preventDefault() {} });
    return { c, get, calls, clipboardCalls, events, eventDetails, documentListeners, submit };
}

test("the permanent publish action follows rotation availability, independently of the guide", () => {
    const { c, get } = mount();
    c.rotation = [null];
    c.updateRotationActionStates();
    assert.equal(get("rotationPublishActions").hidden, true);
    c.rotation = [{ id: 11 }];
    c.updateRotationActionStates();
    assert.equal(get("rotationPublishActions").hidden, false);
    assert.equal(get("publishRotationBtn").disabled, false);
    assert.equal(get("publishRotationBtn").textContent, "Publish rotation");
    c.uiSettings.timelineMode = "simulation";
    c.updateRotationActionStates();
    assert.equal(get("publishRotationBtn").textContent, "Publish simulation");
});

test("only owned publications offer updating, and saving retains the original short link", async () => {
    const m = mount({ rpc: async (name, args) => ({ data: {
        short_code: args.p_short_code, share_type: "rotation", title: args.p_title,
        description: args.p_description, revision: args.p_expected_revision + 1, can_edit: true
    } }) });
    const share = { shortCode: "ABC123", shareType: "rotation", title: "Original title", description: "Original notes", revision: 4, canEdit: false };
    m.c.showBuildShareMetadata(share);
    assert.equal(m.get("updatePublishedShareBtn").hidden, true);
    assert.equal(await m.c.updatePublishedBuildShare(), false);
    m.c.showBuildShareMetadata({ ...share, canEdit: true });
    assert.equal(m.get("updatePublishedShareBtn").hidden, false);
    const saving = m.c.updatePublishedBuildShare();
    assert.equal(m.get("shareMetadataTitleInput").value, "Original title");
    assert.match(m.get("shareMetadataIntro").textContent, /link, views and reactions/);
    assert.equal(m.get("submitShareMetadataBtn").textContent, "Save changes");
    assert.equal(await m.c.updatePublishedBuildShare(), false);
    m.get("shareMetadataTitleInput").value = "Updated title";
    m.submit();
    assert.equal(await saving, true);
    assert.equal(m.calls.length, 1);
    assert.equal(m.calls[0].name, "update_rotation_share");
    assert.equal(m.calls[0].args.p_expected_revision, 4);
    assert.equal(m.calls[0].args.p_short_code, "ABC123");
    assert.equal(m.calls[0].args.p_share_payload, "test-payload");
    assert.equal(m.get("publishedShareLink").value, "https://rotationforge.gg/endfield/#share=ABC123");
    assert.equal(m.get("shareMetadataCardTitle").textContent, "Updated title");
    assert.equal(m.clipboardCalls.length, 0);
    const next = m.c.updatePublishedBuildShare();
    m.submit();
    assert.equal(await next, true);
    assert.equal(m.calls[1].args.p_expected_revision, 5);
});

test("a revision conflict retains the local draft and metadata without publishing a duplicate", async () => {
    const m = mount({ rpc: async () => ({ error: { code: "40001" } }) });
    m.c.showBuildShareMetadata({ shortCode: "ABC123", shareType: "rotation", title: "Original", canEdit: true, revision: 1 });
    const saving = m.c.updatePublishedBuildShare();
    m.get("shareMetadataTitleInput").value = "My changed title";
    m.get("shareMetadataDescriptionInput").value = "Keep these edits";
    m.submit();
    assert.equal(await saving, false);
    assert.match(m.get("publishRotationStatus").textContent, /another tab/);
    assert.equal(m.c.rotation.length, 1);
    const retry = m.c.updatePublishedBuildShare();
    assert.equal(m.get("shareMetadataTitleInput").value, "My changed title");
    assert.equal(m.get("shareMetadataDescriptionInput").value, "Keep these edits");
    m.get("cancelShareMetadataBtn").listeners.click();
    assert.equal(await retry, false);
    assert.equal(m.calls.length, 1);
    assert.equal(m.get("updatePublishedShareBtn").disabled, false);
});

test("changing planner mode requires a new publication, and cancellation never updates", async () => {
    const m = mount();
    m.c.showBuildShareMetadata({ shortCode: "ABC123", shareType: "rotation", title: "Original", canEdit: true, revision: 1 });
    m.c.uiSettings.timelineMode = "simulation";
    assert.equal(await m.c.updatePublishedBuildShare(), false);
    assert.equal(m.calls.length, 0);
    m.c.uiSettings.timelineMode = "slot";
    const saving = m.c.updatePublishedBuildShare();
    m.get("cancelShareMetadataBtn").listeners.click();
    assert.equal(await saving, false);
    assert.equal(m.calls.length, 0);
});

test("account changes immediately hide editing and stale ownership responses cannot affect another share", async () => {
    const m = mount();
    let authChanged, finish;
    m.c.supabaseClient.auth = { onAuthStateChange(callback) { authChanged = callback; } };
    m.c.initShareMetadataUi();
    m.c.resolveStoredBuildShare = () => new Promise(resolve => { finish = resolve; });
    m.c.showBuildShareMetadata({ shortCode: "ABC123", shareType: "rotation", canEdit: true });
    authChanged();
    assert.equal(m.get("updatePublishedShareBtn").hidden, true);
    m.c.showBuildShareMetadata({ shortCode: "XYZ789", shareType: "rotation", canEdit: false });
    finish({ canEdit: true });
    await tick();
    assert.equal(m.get("updatePublishedShareBtn").hidden, true);
});

test("suggested titles use the team, stay within 60 characters and remain editable", async () => {
    const { c, get } = mount();
    assert.equal(c.getSuggestedBuildShareTitle(), "Endministrator / Perlica rotation");
    c.uiSettings.timelineMode = "simulation";
    c.operators[0].name = "🌟".repeat(50);
    const suggested = c.getSuggestedBuildShareTitle();
    assert.ok(suggested.length <= 60);
    assert.ok(suggested.endsWith(" simulation"));
    assert.doesNotThrow(() => c.normalizeBuildShareMetadata({ title: suggested }));
    c.selectedTeam = [];
    assert.equal(c.getSuggestedBuildShareTitle(), "Team simulation");
    c.selectedTeam = [2];
    const publishing = c.copyBuildShareLink();
    assert.equal(get("shareMetadataTitleInput").value, "Perlica simulation");
    assert.match(get("shareMetadataIntro").textContent, /public in Discover/);
    assert.match(get("shareMetadataIntro").textContent, /No account/);
    get("cancelShareMetadataBtn").listeners.click();
    assert.equal(await publishing, false);
    assert.equal(c.isBuildSharePublishing(), false);
});

test("publication succeeds with a manual-copy link when clipboard access is denied", async () => {
    const m = mount({ clipboardDenied: true });
    const publishing = m.c.copyBuildShareLink();
    m.get("shareMetadataTitleInput").value = "My opener";
    m.submit();
    assert.equal(await publishing, true);
    assert.equal(m.calls.length, 1);
    assert.equal(m.calls[0].args.p_title, "My opener");
    assert.equal(m.get("shareMetadataCard").hidden, false);
    assert.equal(m.get("shareMetadataCardType").textContent, "Published in Discover");
    assert.equal(m.get("publishedShareLink").value, "https://rotationforge.gg/endfield/#share=ABC123");
    assert.equal(m.get("publishedShareOpenLink").href, m.get("publishedShareLink").value);
    assert.equal(m.get("publishedShareDiscoverLink").href, "https://rotationforge.gg/endfield/community/?type=rotation");
    assert.match(m.get("shareMetadataCopyStatus").textContent, /Published successfully/);
    assert.match(m.get("shareMetadataCopyStatus").textContent, /copy it manually/);
    assert.deepEqual(m.events, ["share_opened", "share_submitted", "share_published"]);
    assert.equal(m.get("publishRotationBtn").disabled, false);
    await m.get("copyPublishedShareLinkBtn").listeners.click();
    assert.equal(m.calls.length, 1);
    assert.equal(m.get("publishedShareLink").selected, true);
});

test("successful automatic copying and retry copying never create another publication", async () => {
    const m = mount();
    const publishing = m.c.copyBuildShareCode();
    m.submit();
    assert.equal(await publishing, true);
    assert.deepEqual(m.clipboardCalls, ["ABC123"]);
    assert.match(m.get("shareMetadataCopyStatus").textContent, /Share code copied/);
    assert.equal(await m.c.copyPublishedShareLink(), true);
    assert.equal(m.calls.length, 1);
    assert.equal(m.clipboardCalls.at(-1), "https://rotationforge.gg/endfield/#share=ABC123");
});

test("repeated clicks during form entry and publication produce only one database request", async () => {
    let resolve;
    const m = mount({ rpc: () => new Promise(done => { resolve = done; }) });
    const publishing = m.c.copyBuildShareLink();
    assert.equal(await m.c.copyBuildShareLink(), false);
    assert.equal(m.get("publishRotationBtn").textContent, "Publish rotation");
    m.submit();
    await tick();
    assert.equal(m.get("publishRotationBtn").disabled, true);
    assert.equal(m.get("publishRotationBtn").textContent, "Publishing…");
    assert.equal(await m.c.copyBuildShareCode(), false);
    assert.equal(m.calls.length, 1);
    resolve({ data: { short_code: "ABC123", share_type: "rotation" } });
    assert.equal(await publishing, true);
    assert.equal(m.get("publishRotationBtn").disabled, false);
});

test("failed publications keep title and description for retry, and cancellation does not publish", async () => {
    const m = mount({ rpc: async () => ({ error: new Error("offline") }) });
    const publishing = m.c.copyBuildShareLink();
    m.get("shareMetadataTitleInput").value = "Custom opener";
    m.get("shareMetadataDescriptionInput").value = "Keep these notes";
    m.submit();
    assert.equal(await publishing, false);
    assert.equal(m.get("shareMetadataCard").hidden, true);
    assert.match(m.get("publishRotationStatus").textContent, /Could not publish/);
    const retry = m.c.copyBuildShareLink();
    assert.equal(m.get("shareMetadataTitleInput").value, "Custom opener");
    assert.equal(m.get("shareMetadataDescriptionInput").value, "Keep these notes");
    m.get("cancelShareMetadataBtn").listeners.click();
    assert.equal(await retry, false);
    assert.equal(m.calls.length, 1);
    assert.equal(m.c.isBuildSharePublishing(), false);
});

test("Cancel, close, backdrop and Escape measure an explicit publication-form cancellation without sending", async () => {
    for (const cancel of [
        m => m.get("cancelShareMetadataBtn").listeners.click(),
        m => m.get("closeShareMetadataModalBtn").listeners.click(),
        m => m.get("shareMetadataModal").listeners.click({ target: m.get("shareMetadataModal") }),
        m => m.documentListeners.keydown({ key: "Escape" })
    ]) {
        const m = mount();
        const publishing = m.c.copyBuildShareLink();
        cancel(m);
        assert.equal(await publishing, false);
        assert.deepEqual(m.events, ["share_opened", "share_cancelled"]);
        assert.equal(m.calls.length, 0);
        m.get("cancelShareMetadataBtn").listeners.click();
        assert.deepEqual(m.events, ["share_opened", "share_cancelled"]);
    }
});

test("native validation and trimmed-input validation are measured before any send, and corrections can publish", async () => {
    for (const native of [true, false]) {
        const m = mount();
        const publishing = m.c.copyBuildShareLink();
        if (native) {
            assert.equal(m.get("shareMetadataForm").listenerOptions.invalid, true);
            m.get("shareMetadataForm").listeners.invalid();
        } else {
            m.get("shareMetadataTitleInput").value = "   ";
            m.submit();
        }
        assert.equal(m.calls.length, 0);
        assert.equal(m.get("shareMetadataModal").classList.contains("open"), true);
        assert.deepEqual(m.events, ["share_opened", "share_invalid"]);
        m.get("shareMetadataTitleInput").value = "Corrected title";
        m.submit();
        assert.equal(await publishing, true);
        assert.deepEqual(m.events, ["share_opened", "share_invalid", "share_submitted", "share_published"]);
    }
});

test("editing an existing publication does not fabricate publication-form milestones", async () => {
    const m = mount();
    m.c.showBuildShareMetadata({ shortCode: "ABC123", shareType: "rotation", title: "Existing title", canEdit: true, revision: 1 });
    const editing = m.c.updatePublishedBuildShare();
    m.get("shareMetadataForm").listeners.invalid();
    m.get("shareMetadataTitleInput").value = "  ";
    m.submit();
    m.get("cancelShareMetadataBtn").listeners.click();
    assert.equal(await editing, false);
    assert.deepEqual(m.events, []);
    assert.equal(m.calls.length, 0);
});

test("replacing a pending dialog programmatically is not a user cancellation", async () => {
    const m = mount();
    const first = m.c.requestBuildShareMetadata();
    const second = m.c.requestBuildShareMetadata();
    assert.equal(await first, null);
    assert.deepEqual(m.events, ["share_opened", "share_opened"]);
    m.get("cancelShareMetadataBtn").listeners.click();
    assert.equal(await second, null);
    assert.equal(m.events.at(-1), "share_cancelled");
});

test("publication failures send only a fixed cause category, including unavailable service and invalid responses", async () => {
    for (const [error, kind] of [
        [new TypeError("Failed to fetch secret.example/invalid"), "network"],
        [{ name: "AbortError", message: "private timeout detail" }, "network"],
        [{ code: "23514", message: "secret title rejected" }, "validation"],
        [{ code: "42501", message: "private permission detail" }, "database"],
        [{ code: "PGRST202", message: "missing function" }, "unavailable"],
        [new TypeError("Cannot read properties of an internal object"), "unknown"]
    ]) {
        const m = mount({ rpc: async () => ({ error }) });
        await assert.rejects(m.c.createStoredBuildShare({ title: "My opener" }));
        assert.deepEqual(m.events, ["share_submitted", "share_failed"]);
        assert.deepEqual(JSON.parse(JSON.stringify(m.eventDetails.at(-1).details)), { failure_kind: kind });
        assert.doesNotMatch(JSON.stringify(m.eventDetails), /secret|private|permission|timeout|internal object/);
    }
    const missing = mount();
    missing.c.supabaseClient = null;
    await assert.rejects(missing.c.createStoredBuildShare({ title: "My opener" }));
    assert.equal(missing.eventDetails.at(-1).details.failure_kind, "unavailable");
    const invalid = mount({ rpc: async () => ({ data: { short_code: "bad" } }) });
    await assert.rejects(invalid.c.createStoredBuildShare({ title: "My opener" }));
    assert.equal(invalid.eventDetails.at(-1).details.failure_kind, "database");
});

test("failed telemetry callbacks cannot interrupt publication or a modal cancellation", async () => {
    const m = mount();
    m.c.trackPlannerEvent = () => { throw new Error("analytics unavailable"); };
    const publishing = m.c.copyBuildShareLink();
    m.submit();
    assert.equal(await publishing, true);
    assert.equal(m.calls.length, 1);
    const cancelled = m.c.copyBuildShareLink();
    m.get("cancelShareMetadataBtn").listeners.click();
    assert.equal(await cancelled, false);
});
