// Optional PostgreSQL integration: PGLITE_TEST_MODULE=/absolute/path/to/pglite/dist/index.js
// Keeps the application free of a database-test runtime dependency.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import test from "node:test";
import { pathToFileURL } from "node:url";

test("analytics migration enforces anonymous writes, admin-only reports and visit cohorts", {
    skip: !process.env.PGLITE_TEST_MODULE
}, async () => {
    const { PGlite } = await import(pathToFileURL(process.env.PGLITE_TEST_MODULE).href);
    const db = new PGlite();
    try {
        await db.exec(`
            create role anon; create role authenticated;
            create function public.is_app_admin() returns boolean language sql as $$
                select current_setting('test.app_admin', true) = 'true';
            $$;
        `);
        const migration = fs.readFileSync("supabase/planner_analytics.sql", "utf8");
        await db.exec(migration);
        await db.exec(migration);
        const record = (id, names, kind = "new") => db.query(
            "select public.record_planner_events($1::uuid, $2::jsonb)",
            [id, JSON.stringify(names.map(event_name => ({ event_name, entry_kind: kind, mode: "slot" })))]
        );
        const report = async (days = 7, kind = "all") => (await db.query(
            "select public.get_planner_funnel($1, $2) as report", [days, kind]
        )).rows[0].report;

        await db.exec("set role anon");
        const fresh = randomUUID(), restored = randomUUID(), shared = randomUUID(), failed = randomUUID();
        await record(fresh, ["builder_opened", "builder_ready", "team_selected", "first_skill_placed", "share_opened", "share_published"]);
        await record(fresh, ["share_opened", "share_published"]);
        await record(restored, ["builder_opened", "builder_ready", "example_loaded"], "restored");
        await record(shared, ["builder_opened", "builder_ready"], "shared");
        await record(failed, ["builder_opened", "builder_failed"], "unknown");
        await record(randomUUID(), ["first_skill_placed"]); // No corresponding opened visit.
        await assert.rejects(db.query("select * from public.planner_events"), { code: "42501" });
        await assert.rejects(report(), { code: "42501" });
        await assert.rejects(record(randomUUID(), ["fake_event"]), { code: "23514" });
        await assert.rejects(db.query("select public.record_planner_events($1, '{}'::jsonb)", [randomUUID()]), { code: "22023" });
        await assert.rejects(record(randomUUID(), Array(10).fill("builder_opened")), { code: "22023" });

        await db.exec("set role authenticated");
        await assert.rejects(report(), { code: "42501" });
        await db.exec("set test.app_admin = 'true'");
        let data = await report();
        assert.equal(data.counts.builder_opened, 4);
        assert.equal(data.counts.builder_ready, 3);
        assert.equal(data.counts.first_skill_placed, 1);
        assert.equal(data.counts.share_published, 1);
        assert.equal(data.counts.builder_failed, 1);
        assert.deepEqual(data.entries, { new: 1, restored: 1, shared: 1, unknown: 1 });
        data = await report(7, "new");
        assert.equal(data.counts.builder_opened, 1);
        assert.equal(data.counts.share_published, 1);
        data = await report(7, "restored");
        assert.equal(data.counts.example_loaded, 1);
        assert.equal(data.counts.first_skill_placed, undefined);
        assert.equal((await report(7, "shared")).counts.builder_opened, 1);
        await assert.rejects(report(365), { code: "22023" });
        await assert.rejects(report(7, "invalid"), { code: "22023" });
        await assert.rejects(db.query("select * from public.planner_events"), { code: "42501" });

        await db.exec("reset role");
        await db.query("update public.planner_events set created_at = now() - interval '8 days' where visit_id = $1", [fresh]);
        await db.exec("set role authenticated");
        assert.equal((await report()).counts.builder_opened, 3);
        assert.equal((await report(30)).counts.builder_opened, 4);
    } finally {
        await db.close();
    }
});
