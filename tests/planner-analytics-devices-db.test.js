import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import test from "node:test";
import { pathToFileURL } from "node:url";

test("device upgrade resets once, combines cohort filters and protects analytics and publications", { skip: !process.env.PGLITE_TEST_MODULE }, async () => {
    const { PGlite } = await import(pathToFileURL(process.env.PGLITE_TEST_MODULE).href);
    const db = new PGlite();
    try {
        await db.exec(`
            create role anon; create role authenticated;
            create function public.is_app_admin() returns boolean language sql as $$ select current_setting('test.app_admin', true) = 'true' $$;
            create table public.planner_events (
                visit_id uuid not null, event_name text not null, entry_kind text not null, mode text not null,
                created_at timestamptz not null default now(), primary key (visit_id, event_name)
            );
            alter table public.planner_events enable row level security;
            revoke all on public.planner_events from public, anon, authenticated;
            create table public.planner_excluded_visits (visit_id uuid primary key, created_at timestamptz not null default now());
            alter table public.planner_excluded_visits enable row level security;
            revoke all on public.planner_excluded_visits from public, anon, authenticated;
            create table public.rotation_share_codes (short_code text primary key);
            insert into public.rotation_share_codes values ('ABC234');
            create table public.rotation_share_engagement (short_code text, view_count integer);
            insert into public.rotation_share_engagement values ('ABC234', 5);
        `);
        const oldVisit = randomUUID(), excluded = randomUUID();
        await db.query("insert into public.planner_events values ($1, 'builder_opened', 'unknown', 'slot', now() - interval '1 day')", [oldVisit]);
        await db.query("insert into public.planner_excluded_visits (visit_id) values ($1)", [excluded]);
        const upgrade = fs.readFileSync("supabase/planner_analytics_devices.sql", "utf8");
        await db.exec(upgrade);
        const report = async (kind = "all", device = "all", days = 7) => (await db.query(
            "select public.get_planner_funnel($1, $2, $3) as data", [days, kind, device]
        )).rows[0].data;
        const record = async (id, names, device, kind = "new") => db.query(
            "select public.record_planner_events($1, $2::jsonb)",
            [id, JSON.stringify(names.map(event_name => ({ event_name, entry_kind: event_name === "builder_opened" ? "unknown" : kind, mode: "slot", ...(device === undefined ? {} : { device_type: device }) })))]
        );
        await db.exec("set role authenticated; set test.app_admin = 'true'");
        let data = await report();
        const resetAt = data.reset_at;
        assert.ok(resetAt);
        assert.deepEqual(data.counts, {});
        await assert.rejects(db.query("select * from public.planner_analytics_state"), { code: "42501" });
        await db.exec("set test.app_admin = 'false'; set role anon");
        await assert.rejects(report(), { code: "42501" });
        await assert.rejects(db.query("select * from public.planner_analytics_state"), { code: "42501" });
        await db.exec("set role authenticated");
        await assert.rejects(report(), { code: "42501" });
        await db.exec("set role anon");
        const mobile = randomUUID(), desktop = randomUUID(), tablet = randomUUID(), restored = randomUUID(), legacy = randomUUID(), failed = randomUUID();
        await record(mobile, ["builder_opened", "builder_ready", "team_selected", "first_skill_placed", "share_published"], "mobile");
        await record(desktop, ["builder_opened", "builder_ready", "team_selected"], "desktop");
        await record(tablet, ["builder_opened", "builder_ready", "share_opened"], "tablet", "shared");
        await record(restored, ["builder_opened", "builder_ready", "first_skill_placed"], "mobile", "restored");
        await record(legacy, ["builder_opened", "builder_ready"]);
        await record(failed, ["builder_opened", "builder_failed"], "mobile", "unknown");
        // A later event cannot move a visit to another device group.
        await record(mobile, ["share_opened"], "desktop");
        await record(excluded, ["builder_opened", "builder_ready"], "mobile");
        await assert.rejects(record(randomUUID(), ["builder_opened"], "spoofed device model"), { code: "23514" });
        await db.exec("set role authenticated; set test.app_admin = 'true'");
        data = await report();
        assert.equal(data.counts.builder_opened, 6);
        assert.equal(data.counts.builder_ready, 5);
        assert.equal(data.counts.share_published, 1);
        assert.deepEqual(data.devices, { mobile: 3, desktop: 1, tablet: 1, unknown: 1 });
        assert.deepEqual(data.entries, { new: 3, restored: 1, shared: 1, unknown: 1 });
        const phone = await report("all", "mobile");
        assert.equal(phone.counts.builder_opened, 3);
        assert.equal(phone.counts.first_skill_placed, 2);
        assert.equal(phone.counts.share_opened, 1);
        assert.equal((await report("all", "desktop")).counts.share_opened, undefined);
        data = await report("new", "mobile");
        assert.equal(data.counts.builder_opened, 1);
        assert.deepEqual(data.devices, { mobile: 1, desktop: 1, unknown: 1 });
        assert.equal((await report("shared", "mobile")).counts.builder_opened, undefined);
        assert.equal((await report("shared", "tablet")).counts.share_opened, 1);
        assert.equal((await report("all", "unknown")).counts.builder_opened, 1);
        assert.deepEqual((await db.query("select public.get_planner_funnel(7, 'all') as data")).rows[0].data, await report());
        await assert.rejects(report("all", "invalid"), { code: "22023" });
        await assert.rejects(report("all", null), { code: "22023" });
        await record(randomUUID(), ["builder_opened"], "desktop"); // Admin writes stay excluded.
        assert.equal((await report()).counts.builder_opened, 6);
        await db.exec("reset role");
        await db.exec(upgrade);
        assert.equal((await report()).reset_at, resetAt);
        assert.equal((await report()).counts.builder_opened, 6);
        assert.equal((await db.query("select device_type from public.planner_events where visit_id = $1", [oldVisit])).rows[0].device_type, "unknown");
        assert.equal((await db.query("select count(*)::int as total from public.planner_excluded_visits")).rows[0].total, 1);
        assert.equal((await db.query("select count(*)::int as total from public.rotation_share_codes")).rows[0].total, 1);
        assert.equal((await db.query("select view_count from public.rotation_share_engagement")).rows[0].view_count, 5);
        // Late steps from pre-reset page loads cannot repopulate the fresh report.
        await db.exec("update public.planner_analytics_state set reset_at = clock_timestamp()");
        await db.exec("set test.app_admin = 'false'; set role anon");
        await record(mobile, ["share_failed"], "mobile");
        await record(randomUUID(), ["builder_opened", "builder_ready"], "desktop");
        await db.exec("set role authenticated; set test.app_admin = 'true'");
        data = await report();
        assert.equal(data.counts.builder_opened, 1);
        assert.equal(data.counts.share_failed, undefined);
        await db.exec("reset role");
        // The full setup script can also be safely rerun after the focused upgrade.
        await db.exec(fs.readFileSync("supabase/planner_analytics.sql", "utf8"));
        assert.deepEqual(await report(), data);
    } finally { await db.close(); }
});
