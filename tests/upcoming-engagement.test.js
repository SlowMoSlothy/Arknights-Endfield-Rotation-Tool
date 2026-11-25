import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { enableUpcomingEngagement, engagementVerificationSql } from '../tools/enable-upcoming-engagement.js';
import { upcomingOperatorPreviews } from '../tools/upcoming-operator-previews.js';

const migration = fs.readFileSync('supabase/upcoming_profile_engagement.sql', 'utf8');
const schema = fs.readFileSync('supabase/profile_engagement.sql', 'utf8');
const env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'public-test-key', SUPABASE_ACCESS_TOKEN: 'test-only' };

test('preview migration only updates guarded target validation and matches the catalog identities', () => {
  for (const row of upcomingOperatorPreviews) assert.ok(migration.includes(`('${row.slug}', '${row.name}')`));
  const definition = migration.slice(migration.indexOf('create or replace function'), migration.indexOf('commit;'));
  assert.ok(schema.includes(definition));
  assert.equal((migration.match(/create or replace function/g) || []).length, 1);
  assert.doesNotMatch(migration, /insert into|update public|delete from|grant execute|create table/i);
  assert.match(migration, /op\.raw_data->>'previewSlug'/);
  assert.match(migration, /is_visible is not false/);
  assert.match(migration, /is_visible = true/);
  assert.match(migration, /revoke all on function/);
});

test('enablement checks prerequisites and write mode, applies the narrow migration, and rolls back test counters', async () => {
  const queries = [];
  const result = await enableUpcomingEngagement({ env, get: async (url, options) => {
    assert.equal(url, 'https://api.supabase.com/v1/projects/example/database/query');
    const body = JSON.parse(options.body); queries.push(body);
    if (body.query.includes('to_regprocedure')) return [{ ready: true }];
    if (body.query.includes('transaction_read_only')) return [{ transaction_read_only: 'off', default_transaction_read_only: 'off', in_recovery: false }];
    return [];
  }});
  assert.equal(result.enabled, 10);
  assert.equal(queries.length, 4);
  assert.equal(queries[0].read_only, true);
  assert.equal(queries[2].query, migration);
  assert.match(queries[3].query, /^begin;/);
  assert.match(queries[3].query, /rollback;$/);
  assert.doesNotMatch(queries[3].query, /commit;/);
  assert.match(queries[3].query, /Repeated view was not deduplicated/);
  assert.match(queries[3].query, /Reaction removal failed/);
  assert.match(engagementVerificationSql(), /preview:unknown/);
});

test('missing credentials or engagement schema abort before writes', async () => {
  await assert.rejects(enableUpcomingEngagement({ env: {} }), /Missing SUPABASE_ACCESS_TOKEN/);
  let requests = 0;
  await assert.rejects(enableUpcomingEngagement({ env, get: async () => { requests++; return [{ ready: false }]; } }), /Apply profile_engagement.sql/);
  assert.equal(requests, 1);
});
