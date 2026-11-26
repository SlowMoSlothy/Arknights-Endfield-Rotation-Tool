import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import test from "node:test";
import { pathToFileURL } from "node:url";

test("publication tracking upgrades existing device statistics without resetting them or exposing error details", { skip: !process.env.PGLITE_TEST_MODULE }, async () => {
    const { PGlite } = await import(pathToFileURL(process.env.PGLITE_TEST_MODULE).href);
    const db = new PGlite();
    try {
        await db.exec(`
            create role anon; create role authenticated;
            create function public.is_app_admin() returns boolean language sql as $$ select current_setting('test.app_admin', true) = 'true' $$;
            create table public.planner_events (
                visit_id uuid not null, event_name text not null check (event_name in (
                    'builder_opened','builder_ready','builder_failed','team_selected','first_skill_placed',
                    'share_opened','share_published','share_failed','example_loaded'
                )), entry_kind text not null, mode text not null, device_type text not null default 'unknown',
                created_at timestamptz not null default now(), primary key (visit_id,event_name)
            );
            alter table public.planner_events enable row level security;
            revoke all on public.planner_events from public, anon, authenticated;
            create table public.planner_excluded_visits (visit_id uuid primary key, created_at timestamptz not null default now());
            alter table public.planner_excluded_visits enable row level security;
            revoke all on public.planner_excluded_visits from public, anon, authenticated;
            create table public.planner_analytics_state (singleton boolean primary key default true check(singleton), reset_at timestamptz not null default clock_timestamp());
            insert into public.planner_analytics_state values (true, now() - interval '1 hour');
            alter table public.planner_analytics_state enable row level security;
            revoke all on public.planner_analytics_state from public, anon, authenticated;
            create table public.rotation_share_codes (short_code text primary key);
            insert into public.rotation_share_codes values ('ABC234');
            create table public.rotation_share_engagement (view_count integer);
            insert into public.rotation_share_engagement values (5);
        `);
        const legacy = randomUUID(), excluded = randomUUID();
        await db.query("insert into public.planner_events(visit_id,event_name,entry_kind,mode,device_type) select $1, name, 'new', 'slot', 'mobile' from unnest(array['builder_opened','builder_ready','share_opened','share_failed']) name", [legacy]);
        await db.query("insert into public.planner_excluded_visits(visit_id) values($1)", [excluded]);
        const resetAt = (await db.query("select reset_at::text as value from public.planner_analytics_state")).rows[0].value;
        const migration = fs.readFileSync("supabase/planner_analytics_publishing.sql", "utf8");
        await db.exec(migration);
        const record = (id, events, kind = "new", device = "mobile") => db.query(
            "select public.record_planner_events($1,$2::jsonb)", [id, JSON.stringify(events.map(event => ({
                entry_kind: kind, mode: "slot", device_type: device,
                ...(typeof event === "string" ? { event_name: event } : event)
            })))]
        );
        const report = async (device = "all", kind = "all") => (await db.query("select public.get_planner_funnel(7,$1,$2) as data", [kind, device])).rows[0].data;
        await db.exec("set role anon; set test.app_admin='false'");
        await assert.rejects(report(), { code: "42501" });
        await assert.rejects(db.query("select * from public.planner_events"), { code: "42501" });
        await db.exec("set role authenticated");
        await assert.rejects(report(), { code: "42501" });
        await db.exec("set test.app_admin='true'");
        let data = await report();
        assert.equal(data.counts.builder_opened, 1);
        assert.equal(data.counts.share_opened, 1);
        assert.deepEqual(data.failure_counts, { unknown: 1 });
        const started = data.publishing_started_at;
        assert.ok(started);
        await db.exec("set role anon; set test.app_admin='false'");
        const retried = randomUUID();
        const names = ["builder_opened","builder_ready","builder_failed","team_selected","first_skill_placed","share_opened","share_invalid","share_cancelled","share_submitted","share_failed","share_published","example_loaded"];
        await record(retried, names.map(name => ({ event_name: name, ...(name === "share_failed" ? { failure_kind: "network", message: "secret error text", url: "private.example" } : {}) })));
        await record(retried, [{ event_name: "share_failed", failure_kind: "database" }, "share_submitted", "share_cancelled"]);
        await record(randomUUID(), ["builder_opened","builder_ready","share_submitted",{ event_name: "share_failed", failure_kind: "database" }], "restored", "desktop");
        await record(randomUUID(), ["builder_opened","builder_ready","share_submitted",{ event_name: "share_failed", failure_kind: "validation" }], "new", "tablet");
        await record(randomUUID(), ["builder_opened","builder_ready","share_submitted",{ event_name: "share_failed", failure_kind: "unavailable" }], "shared", "desktop");
        await record(randomUUID(), ["builder_opened","builder_ready","share_submitted",{ event_name: "share_failed" }], "new", "unknown");
        await record(excluded, ["builder_opened","builder_ready","share_submitted",{ event_name: "share_failed", failure_kind: "network" }]);
        const invalid = randomUUID();
        await assert.rejects(record(invalid, ["builder_opened",{ event_name: "share_failed", failure_kind: "private error message" }]), { code: "23514" });
        await assert.rejects(record(randomUUID(), Array(13).fill("share_submitted")), { code: "22023" });
        await db.exec("set role authenticated; set test.app_admin='true'");
        data = await report();
        assert.equal(data.counts.builder_opened, 6);
        assert.equal(data.counts.share_submitted, 5);
        assert.equal(data.counts.share_cancelled, 1);
        assert.equal(data.counts.share_invalid, 1);
        assert.equal(data.counts.share_published, 1);
        assert.equal(data.counts.share_failed, 6);
        assert.deepEqual(data.failure_counts, { network: 1, database: 1, validation: 1, unavailable: 1, unknown: 2 });
        assert.deepEqual((await report("desktop", "restored")).failure_counts, { database: 1 });
        assert.deepEqual((await report("mobile")).failure_counts, { network: 1, unknown: 1 });
        assert.deepEqual((await db.query("select public.get_planner_funnel(7,'all') as data")).rows[0].data, data);
        await record(randomUUID(), ["builder_opened","share_submitted",{ event_name: "share_failed", failure_kind: "network" }]);
        assert.equal((await report()).counts.builder_opened, 6); // Admin collection still excluded.
        await db.exec("reset role");
        assert.equal((await db.query("select count(*)::int as n from public.planner_events where visit_id=$1", [retried])).rows[0].n, 12);
        assert.equal((await db.query("select failure_kind from public.planner_events where visit_id=$1 and event_name='share_failed'", [retried])).rows[0].failure_kind, "network");
        assert.equal((await db.query("select count(*)::int as n from public.planner_events where visit_id=$1", [invalid])).rows[0].n, 0);
        assert.equal((await db.query("select count(*)::int as n from public.rotation_share_codes")).rows[0].n, 1);
        assert.equal((await db.query("select view_count from public.rotation_share_engagement")).rows[0].view_count, 5);
        assert.equal((await db.query("select reset_at::text as value from public.planner_analytics_state")).rows[0].value, resetAt);
        for (const sql of [migration, fs.readFileSync("supabase/planner_analytics_devices.sql", "utf8"), fs.readFileSync("supabase/planner_analytics.sql", "utf8")]) {
            await db.exec(sql);
            assert.deepEqual(await report(), data);
            assert.equal((await report()).publishing_started_at, started);
        }
    } finally { await db.close(); }
});
