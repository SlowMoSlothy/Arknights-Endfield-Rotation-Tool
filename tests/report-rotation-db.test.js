import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

test('report snapshots remain private, bounded and compatible with existing report resolution and Recent fixes',
    { skip: !process.env.PGLITE_TEST_MODULE }, async () => {
    const { PGlite } = await import(pathToFileURL(process.env.PGLITE_TEST_MODULE).href);
    const db = new PGlite(), legacy = randomUUID(), report = randomUUID(), admin = randomUUID();
    const migration = fs.readFileSync('supabase/issue_report_rotations.sql', 'utf8');
    const snapshot = { version: 1, mode: 'slot', share_code: 'PRIVATE_ROTATION_CODE', team: [{ id: 35, name: 'Kay' }],
        rotation: [{ actionType: 'skill', id: 3502, operatorId: 35 }] };
    try {
        await db.exec(`create role anon; create role authenticated; create schema auth;
            create table auth.users(id uuid primary key);
            create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('test.user_id', true),'')::uuid $$;
            create function public.is_app_admin() returns boolean language sql as $$ select coalesce(current_setting('test.app_admin', true),'false')='true' $$;
            grant usage on schema auth to anon, authenticated;
            grant execute on function auth.uid(), public.is_app_admin() to anon, authenticated;
            insert into auth.users values ('${admin}');`);
        await db.exec(fs.readFileSync('supabase/issue_reports.sql', 'utf8').replace(/create extension if not exists pgcrypto;/i, ''));
        await db.query("insert into public.issue_reports(id,report_type,description) values ($1,'bug','A legacy report without a rotation')", [legacy]);
        await db.exec(fs.readFileSync('supabase/recent_fixes.sql', 'utf8'));
        const functionBefore = (await db.query("select pg_get_functiondef('public.set_issue_report_status(uuid,text,text)'::regprocedure) as definition")).rows[0].definition;
        await db.exec(migration); await db.exec(migration);
        assert.equal((await db.query('select rotation_snapshot from public.issue_reports where id=$1', [legacy])).rows[0].rotation_snapshot, null);
        assert.equal((await db.query("select pg_get_functiondef('public.set_issue_report_status(uuid,text,text)'::regprocedure) as definition")).rows[0].definition, functionBefore);
        await db.exec('set role anon');
        await db.query("insert into public.issue_reports(id,report_type,description,rotation_snapshot) values ($1,'bug','A private rotation that reproduces the issue',$2)", [report, snapshot]);
        await assert.rejects(db.query('select rotation_snapshot from public.issue_reports'), { code: '42501' });
        for (const bad of [{}, [], { ...snapshot, version: 2 }, { ...snapshot, rotation: [] },
            { ...snapshot, rotation: Array(241).fill({ id: 3502 }) }, { ...snapshot, mode: 'other' },
            { ...snapshot, share_code: 'x'.repeat(60001) }, { ...snapshot, extra: 'x'.repeat(131072) }]) {
            await assert.rejects(db.query("insert into public.issue_reports(report_type,description,rotation_snapshot) values ('bug','A malformed or excessive rotation snapshot',$1)", [bad]), { code: '23514' });
        }
        await db.exec("set role authenticated; set test.app_admin='false'");
        assert.equal((await db.query('select rotation_snapshot from public.issue_reports')).rows.length, 0);
        await db.exec(`set test.app_admin='true'; set test.user_id='${admin}'`);
        assert.deepEqual((await db.query('select rotation_snapshot from public.issue_reports where id=$1', [report])).rows[0].rotation_snapshot, snapshot);
        await db.query('select * from public.resolve_issue_report_with_fix($1,$2,$3)', [report, 'Rotation behavior fixed', 'The reported conditional effect now appears correctly.']);
        await db.exec('set role anon');
        const publicRows = (await db.query('select * from public.list_recent_fixes()')).rows;
        assert.equal(JSON.stringify(publicRows).includes('PRIVATE_ROTATION_CODE'), false);
        assert.equal(publicRows.some(row => row.title === 'Rotation behavior fixed'), true);
        await assert.rejects(db.query('update public.issue_reports set rotation_snapshot=null'), { code: '42501' });
    } finally { await db.close(); }
});
