import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';

test('resolving atomically publishes safe fix copy; retries, restoration and migration reruns preserve consistency',
    {skip: !process.env.PGLITE_TEST_MODULE}, async () => {
    const {PGlite} = await import(pathToFileURL(process.env.PGLITE_TEST_MODULE).href);
    const db = new PGlite();
    const admin = randomUUID(), si = randomUUID(), report = randomUUID(), failure = randomUUID(), dismissed = randomUUID();
    const migration = fs.readFileSync('supabase/recent_fixes.sql', 'utf8');
    const list = async () => (await db.query('select * from public.list_recent_fixes()')).rows;
    const asAdmin = () => db.exec(`set role authenticated; set test.app_admin = 'true'; set test.user_id = '${admin}'`);
    const resolve = (id, title = '', summary = '') => db.query('select * from public.resolve_issue_report_with_fix($1,$2,$3)',[id,title,summary]);
    const status = async id => (await db.query('select status from public.issue_reports where id=$1',[id])).rows[0].status;
    try {
        await db.exec(`create role anon; create role authenticated; create schema auth;
            create table auth.users(id uuid primary key);
            create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('test.user_id', true),'')::uuid $$;
            create function public.is_app_admin() returns boolean language sql as $$ select coalesce(current_setting('test.app_admin', true),'false')='true' $$;
            grant usage on schema auth to anon, authenticated;
            grant execute on function auth.uid(), public.is_app_admin() to anon, authenticated;
            insert into auth.users values ('${admin}');`);
        await db.exec(fs.readFileSync('supabase/issue_reports.sql','utf8').replace(/create extension if not exists pgcrypto;/i,''));
        await db.query(`insert into public.issue_reports(id,report_type,description,team_operator_ids,status,reviewed_at)
            values ($1,'missing_data','Si Brushwork Realm missing infliction',array[33],'resolved','2026-11-27T20:00:00Z')`,[si]);
        await db.exec(migration);
        assert.equal((await list()).length,4);
        await db.exec('set role anon');
        await assert.rejects(db.query('select * from public.issue_reports'),{code:'42501'});
        await assert.rejects(db.query('select * from public.recent_fixes'),{code:'42501'});
        await assert.rejects(resolve(si),{code:'42501'});
        assert.equal((await list()).length,4);
        await db.query(`insert into public.issue_reports(id,report_type,description,additional_information,page_url,team_operator_names)
            values ($1,'bug','Private report with private@example.invalid','INTERNAL DEBUG DETAILS','https://example.invalid/private',array['PRIVATE TEAM'])`,[report]);
        await db.query(`insert into public.issue_reports(id,report_type,description) values ($1,'bug','A separate report for rollback testing'),($2,'other','This report will be dismissed only')`,[failure,dismissed]);
        await db.exec('set role authenticated');
        await assert.rejects(resolve(report),{code:'42501'});
        await asAdmin();
        await assert.rejects(resolve(report,'No','Too short'),{code:'22023'});
        assert.equal(await status(report),'pending');
        assert.equal((await list()).length,4);
        await db.exec('reset role');
        await db.exec(`alter table public.recent_fixes add constraint test_insert_failure check (title <> 'Reject this insert')`);
        await asAdmin();
        await assert.rejects(resolve(failure,'Reject this insert','A valid public summary that fails on insert.'),{code:'23514'});
        assert.equal(await status(failure),'pending','A failed publication must roll back the status update');
        assert.equal((await list()).length,4);
        const result = (await resolve(report,'Skill effect corrected','The missing skill effect now appears in the rotation.')).rows[0];
        assert.equal(result.status,'resolved');
        const first = (await list()).find(row=>row.title==='Skill effect corrected');
        assert.match(first.thank_you,/anonymous reporter/);
        await resolve(report,'Changed by a retry','This retry must not replace the existing public entry.');
        assert.deepEqual((await list()).find(row=>row.entry_key===first.entry_key),first);
        await db.query("select * from public.set_issue_report_status($1,'resolved','PRIVATE ADMIN NOTE')",[report]);
        assert.equal((await list()).length,5);
        await assert.rejects(db.query("update public.recent_fixes set title='Unauthorized update'"),{code:'42501'});
        await db.query("select * from public.set_issue_report_status($1,'pending')",[report]);
        assert.equal((await list()).length,4,'Restoring removes the public announcement');
        await resolve(report);
        assert.equal((await list()).length,5);
        assert.equal((await list()).find(row=>row.entry_key===first.entry_key).title,'Planner issue fixed');
        await db.query("select * from public.set_issue_report_status($1,'dismissed','PRIVATE DISMISSAL NOTE')",[dismissed]);
        assert.equal((await list()).length,5,'Dismissal does not publish a fix');
        await db.query("select * from public.set_issue_report_status($1,'pending')",[si]);
        assert.equal((await list()).some(row=>row.entry_key==='si-brushwork-realm-infliction'),false);
        await resolve(si,'Si · Brushwork Realm','Updated the handling of Brushwork Realm Infliction.');
        assert.equal((await list()).length,5,'The seeded Si entry must not be duplicated');
        await db.exec('set role anon');
        const publicRows = await list();
        assert.deepEqual(Object.keys(publicRows[0]).sort(),['entry_key','fixed_at','summary','thank_you','title']);
        const serialized = JSON.stringify(publicRows);
        for (const privateValue of [report,si,'private@example.invalid','INTERNAL DEBUG DETAILS','PRIVATE ADMIN NOTE','PRIVATE DISMISSAL NOTE','PRIVATE TEAM','example.invalid/private']) {
            assert.equal(serialized.includes(privateValue),false,privateValue);
        }
        await db.exec('reset role');
        await db.exec(migration);
        assert.equal((await list()).length,5);
        assert.equal((await db.query('select count(*)::integer as n from public.recent_fixes')).rows[0].n,5);
        await asAdmin();
        await assert.rejects(resolve(randomUUID()),{code:'P0002'});
    } finally { await db.close(); }
});
