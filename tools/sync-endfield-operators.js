import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual, parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { requestJson, publicConfiguration, checkDatabaseWriteAccess } from './sync-endfield-equipment.js';

export const SOURCE = 'https://endfieldtools.dev/localdb/optimized/characters/';
const FIELDS = {hp:1,atk:2,strength:39,agility:40,intellect:41,will:42};
const ALIASES = {endministrator:'chr_0002_endminm',zhuang:'chr_0030_zhuangfy',mi_fu:'chr_0031_mifu'};
const assert = (condition,message) => {if(!condition) throw new Error(message);};
const key = value => String(value).toLowerCase().replace(/[^a-z0-9]/g,'');
const camel = name => name.replace(/_([a-z0-9])/g,(_,letter)=>letter.toUpperCase());
export function mapLevels(detail) {
  assert(Array.isArray(detail.attributes),'Missing operator attributes');
  const levels = new Map();
  for(const entry of detail.attributes) {
    const attrs=entry.Attribute?.attrs;
    assert(Array.isArray(attrs),'Invalid attribute row');
    const values=new Map(attrs.map(attr=>[attr.attrType,attr.attrValue]));
    const level=Number(values.get(0));
    assert(Number.isInteger(level)&&level>=1,'Invalid level');
    if(level>90) continue;
    const row={level};
    for(const [field,type] of Object.entries(FIELDS)) {
      const value=values.get(type);
      assert(value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))&&Number(value)>=0,`Missing or invalid ${field} at level ${level}`);
      row[field]=Number(value);
    }
    // Breakthrough boundaries repeat a level. Never silently select different stats.
    assert(!levels.has(level)||isDeepStrictEqual(levels.get(level),row),`Conflicting breakthrough values at level ${level}`);
    levels.set(level,row);
  }
  const result=[...levels.values()].sort((a,b)=>a.level-b.level);
  assert(result.length===90&&result.every((row,index)=>row.level===index+1),'Incomplete levels 1–90');
  return result;
}
export function planOperator(row,detail) {
  const levels=mapLevels(detail),source=SOURCE+`details/${detail.charId}.json`;
  const stats={base_stats_level:90};
  for(const field of Object.keys(FIELDS)) {
    stats[`base_${field}`]=Math.floor(levels[89][field]);
    stats[`base_${field}_level_1`]=['hp','atk'].includes(field)?levels[0][field]:Math.round(levels[0][field]*10)/10;
  }
  const raw=structuredClone(row.raw_data||{}),prior=raw.operatorCatalogImport;
  assert(!prior||prior.sourceId===detail.charId,'Source identity changed');
  const after={};
  for(const [field,value] of Object.entries(stats)) {
    // Subsequent imports preserve edits made after the previous import.
    after[field]=prior && !isDeepStrictEqual(row[field],prior.stats[field])?row[field]:value;
    const rawKey=camel(field);
    if(!prior||isDeepStrictEqual(raw[rawKey],prior.rawStats?.[rawKey])) raw[rawKey]=after[field];
  }
  raw.baseStatsMissing=false;
  raw.operatorCatalogImport={sourceId:detail.charId,source,levels,stats,rawStats:Object.fromEntries(Object.keys(stats).map(field=>[camel(field),after[field]]))};
  after.raw_data=raw;
  const rawPatch=Object.fromEntries(Object.entries(raw).filter(([field,value])=>!isDeepStrictEqual(value,row.raw_data?.[field])));
  return {id:row.id,name:row.name,version:row._import_version,rawPatch,before:Object.fromEntries(Object.keys(after).map(field=>[field,row[field]])),after};
}
const literal=value=>`'${JSON.stringify(value).replaceAll("'","''")}'::jsonb`;
export function buildSql(changes) {
  return ['begin;','set local standard_conforming_strings=on;','lock table public.operators in share row exclusive mode;',...changes.flatMap(change=>{
    assert(Number.isSafeInteger(change.id)&&change.id>0,'Invalid operator id');
    const fields=Object.keys(change.after);
    assert(fields.every(field=>/^base_(stats_level|(?:hp|atk|strength|agility|intellect|will)(?:_level_1)?)$/.test(field)||field==='raw_data'),'Unexpected update field');
    assert(change.version===undefined||/^[a-f0-9]{32}$/.test(change.version),'Invalid row version');
    const guard=change.version?`md5(to_jsonb(o)::text)='${change.version}'`:`to_jsonb(o) @> ${literal(change.before)}`;
    return [`select 1 / case when exists(select 1 from public.operators o where id=${change.id} and ${guard}) then 1 else 0 end as unchanged_operator_guard;`,
      `update public.operators o set ${fields.map(field=>field==='raw_data'?`raw_data=coalesce(o.raw_data,'{}'::jsonb) || ${literal(change.rawPatch)}`:`${field}=v.${field}`).join(',')} from jsonb_populate_record(null::public.operators,${literal(change.after)}) v where o.id=${change.id};`];
  }),'commit;'].join('\n');
}
export function normalizeRows(rows) {
  assert(Array.isArray(rows),'Invalid operator response');
  return rows.map(row=>Object.fromEntries(Object.entries(row).map(([field,value])=>[field,
    /^base_(stats_level|(?:hp|atk|strength|agility|intellect|will)(?:_level_1)?)$/.test(field)&&typeof value==='string'&&value.trim()!==''&&Number.isFinite(Number(value))?Number(value):value])));
}
async function readRows(config,token) {
  const rows=token?await requestJson(`https://api.supabase.com/v1/projects/${config.ref}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({query:`select o.*,md5(to_jsonb(o)::text) as _import_version from public.operators o where game='arknights_endfield' order by id /* ${randomUUID()} */`,read_only:true})}):
    await requestJson(`${config.url}/rest/v1/operators?select=*&game=eq.arknights_endfield&order=id`,{headers:{apikey:config.key}});
  // Management SQL serializes PostgreSQL numeric columns as strings; REST uses numbers.
  return normalizeRows(rows);
}
export async function sync({apply=false,output='.cache/operator-import',env=process.env}={}) {
  const config=await publicConfiguration(env);config.ref=new URL(config.url).hostname.split('.')[0];
  const token=env.SUPABASE_ACCESS_TOKEN;
  if(apply){assert(token,'Missing SUPABASE_ACCESS_TOKEN');await checkDatabaseWriteAccess(config.ref,token);}
  const existing=await readRows(config,token),list=Object.values(await requestJson(SOURCE+'characters-list.json'));
  assert(Array.isArray(existing)&&existing.length>=25&&list.length>=30,'Incomplete operator catalog');
  const changes=[],matches=[],used=new Set();
  for(const row of existing) {
    const candidates=list.filter(item=>ALIASES[row.slug]?item.charId===ALIASES[row.slug]:key(item.engName)===key(row.name));
    assert(candidates.length===1,`Cannot unambiguously match ${row.name}`);
    const item=candidates[0];assert(/^chr_[a-z0-9_]+$/.test(item.charId)&&!used.has(item.charId),'Invalid or duplicate source identity');used.add(item.charId);
    const detail=await requestJson(SOURCE+`details/${item.charId}.json`);
    assert(detail.charId===item.charId&&detail.engName===item.engName,'Source detail identity mismatch');
    const change=planOperator(row,detail);if(!isDeepStrictEqual(change.before,change.after)) changes.push(change);
    matches.push({id:row.id,name:row.name,sourceId:item.charId});
  }
  const query=buildSql(changes),report={source:SOURCE,fetchedAt:new Date().toISOString(),project:config.ref,readScope:token?'all operators including drafts':'public operators',matched:matches,changed:changes.map(c=>({name:c.name,stats:Object.keys(c.after).filter(k=>k!=='raw_data'&&!isDeepStrictEqual(c.before[k],c.after[k])).map(k=>({field:k,before:c.before[k],after:c.after[k]}))})),unmatchedSource:list.filter(item=>!used.has(item.charId)).map(item=>({id:item.charId,name:item.engName}))};
  await fs.mkdir(output,{recursive:true});await fs.writeFile(path.join(output,'catalog.sql'),query);await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));
  console.log(`${matches.length} operators matched; ${changes.length} updates. Skills and simulation mechanics are outside this importer.`);
  if(apply&&changes.length) {
    assert(changes.every(change=>change.version),'Missing database row versions');
    await requestJson(`https://api.supabase.com/v1/projects/${config.ref}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({query,read_only:false})});
    for(let attempt=0;attempt<3;attempt++) {
      const saved=await readRows(config,token);
      const valid=changes.every(c=>{const row=saved.find(r=>r.id===c.id);return row&&Object.keys(c.after).every(k=>isDeepStrictEqual(row[k],c.after[k]));});
      if(valid){console.log('Applied and verified all operator updates.');return report;}
      assert(attempt<2,'Read-back mismatch; inspect saved rows before another write');await new Promise(r=>setTimeout(r,1000));
    }
  }
  return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  try {const {values}=parseArgs({options:{apply:{type:'boolean',default:false},output:{type:'string'}}});await sync(values);}catch(error){console.error(error.message);process.exitCode=1;}
}
