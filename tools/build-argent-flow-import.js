import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { buildSql } from './sync-endfield-operators.js';
import { buildArgentFlowSkillsSql } from './build-argent-flow-skills.js';
import { ARGENT_FLOW_LIMITATIONS } from './data/argent-flow-rotation-profile.js';

// Keep English apostrophes and multiline descriptions inside explicit PostgreSQL
// dollar-quoted JSON values, separate from executable SQL.
export function quoteJsonPayloads(sql) {
  return sql.replace(/'((?:[^']|'')*)'::jsonb/g, (_, escaped) => {
    const json = escaped.replaceAll("''", "'");
    JSON.parse(json);
    let tag = '$operator_json$';
    while (json.includes(tag)) tag = tag.slice(0, -1) + '_$';
    return `${tag}${json}${tag}::jsonb`;
  });
}

export function buildArgentFlowImport(catalogSql) {
  const normalized = value => value.replaceAll('\r\n', '\n').trim();
  const matches = [...catalogSql.matchAll(/jsonb_populate_record\(null::public\.operators,\s*'((?:[^']|'')*)'::jsonb\)/g)];
  if (matches.length !== 1) throw new Error('Expected exactly one operator insert');
  const row = JSON.parse(matches[0][1].replaceAll("''", "'"));
  if (row.id !== 34 || row.slug !== 'argent_flow' || row.game !== 'arknights_endfield'
    || normalized(catalogSql) !== normalized(buildSql([{ id: 34, before: null, after: row }]))) {
    throw new Error('Unexpected catalog identity or SQL; rebuild the operator preview');
  }
  row.raw_data = { ...row.raw_data, dataStatus: 'rotation_profile', sourceNote: ARGENT_FLOW_LIMITATIONS };
  const body = sql => sql.split('\n').filter(line => !/^\s*(begin;|commit;)\s*$/i.test(line)).join('\n');
  const skills = buildArgentFlowSkillsSql();
  const updates = skills.split('\n').filter(line => /^update public\.operators /.test(line));
  if (updates.length !== 1 || !updates[0].endsWith('where id=34;')) throw new Error('Unexpected skill migration update');
  const skillBody = body(skills).split('\n').filter(line => line !== updates[0]).join('\n');
  return '-- Argent Flow only. Inserts one operator, six skills and its form.\n'
    + '-- Existing records cause a rollback. Existing RLS policies remain unchanged.\n'
    + 'begin;\n'
    + quoteJsonPayloads(body(buildSql([{ id: 34, before: null, after: row }]))) + '\n'
    + quoteJsonPayloads(skillBody) + '\ncommit;\n';
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const sql = buildArgentFlowImport(await fs.readFile('.cache/november-operator-import/catalog.sql', 'utf8'));
  await fs.writeFile('supabase/argent_flow_import.sql', sql);
  await fs.writeFile('.cache/november-operator-import/argent-flow-only.sql', sql);
  console.log('Generated supabase/argent_flow_import.sql and refreshed argent-flow-only.sql');
}
