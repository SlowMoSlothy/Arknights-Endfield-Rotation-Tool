import test from 'node:test';
import assert from 'node:assert/strict';
import { buildArgentFlowImport, quoteJsonPayloads } from '../tools/build-argent-flow-import.js';
import { buildSql } from '../tools/sync-endfield-operators.js';
import { argentFlowSkills } from '../tools/data/argent-flow-rotation-profile.js';

const row = { id: 34, slug: 'argent_flow', name: 'Argent Flow', game: 'arknights_endfield', raw_data: { dataStatus: 'catalog_only', description: "It's a mid-air attack.\nKeep all text." } };
const catalog = value => buildSql([{ id: value.id, before: null, after: value }]);
test('standalone import preserves payloads and guards without updates or table creation', () => {
  const sql = buildArgentFlowImport(catalog(row));
  const payloads = [...sql.matchAll(/\$operator_json\$(.*?)\$operator_json\$::jsonb/gs)].map(match => JSON.parse(match[1]));
  assert.equal(payloads.length, 4);
  assert.deepEqual(payloads[0], { ...row, raw_data: { ...row.raw_data, dataStatus: 'rotation_profile', sourceNote: argentFlowSkills[0].simulationLimitations } });
  assert.deepEqual(payloads[1].map(skill => skill.raw_data), argentFlowSkills);
  assert.equal(payloads[2][0].operator_id, 34);
  assert.equal(payloads[3][0].operator_id, 34);
  const executable = sql.replace(/\$operator_json\$.*?\$operator_json\$/gs, "'payload'");
  assert.doesNotMatch(executable, /\b(update|delete|create\s+table|alter\s+table)\b/i);
  assert.equal(sql.split('\n').filter(line => line === 'begin;').length, 1);
  assert.equal(sql.split('\n').filter(line => line === 'commit;').length, 1);
  assert.match(sql, /new_operator_guard/);
  assert.match(sql, /Argent Flow skills already exist/);
  assert.match(sql, /Argent Flow form mechanics already exist/);
});
test('unexpected identities and extra statements are rejected', () => {
  assert.throws(() => buildArgentFlowImport(catalog({ ...row, id: 35 })));
  assert.throws(() => buildArgentFlowImport(catalog(row) + '\nselect 1;'));
});
test('dollar quoting handles apostrophes and delimiter text without changing data', () => {
  const value = { text: "It's $operator_json$ mid-air; 'quoted'" };
  const result = quoteJsonPayloads(`'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`);
  const match = result.match(/^(\$\w+\$)(.*?)\1::jsonb$/s);
  assert.deepEqual(JSON.parse(match[2]), value);
});
