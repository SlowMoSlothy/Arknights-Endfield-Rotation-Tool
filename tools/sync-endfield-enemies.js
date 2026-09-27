import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { requestJson, publicConfiguration, checkDatabaseWriteAccess } from './sync-endfield-equipment.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const SOURCE = 'https://endfield-assets.fffdan.com';
const PROVIDER = 'endfield-assets';
const COLUMNS = ['id','name','category','description','location','hp','defense','resistances','skills','source_url','is_visible','combat_details'];
const requireValue = (ok, message) => { if (!ok) throw new Error(message); };
const canonical = value => JSON.stringify(value, function(key, val) { return val && typeof val === 'object' && !Array.isArray(val) ? Object.fromEntries(Object.entries(val).sort(([a],[b])=>a.localeCompare(b))) : val; });
const same = (a,b) => canonical(a) === canonical(b);
const clean = value => String(value ?? '').replace(/<[^>]*>/g,'').trim();
const nameKey = value => String(value).normalize('NFKC').toLowerCase().trim();
const slug = value => String(value).replaceAll('Æ','Ae').replaceAll('æ','ae').replaceAll('α','alpha').replaceAll('δ','delta').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const numeric = (value, label) => { requireValue(typeof value === 'number' && Number.isFinite(value) && value >= 0, `Invalid ${label}`); return value; };

// Localization IDs are signed int64 hashes; ordinary JSON.parse would round them.
export function parseSource(text) {
  return JSON.parse(text.replace(/("id"\s*:\s*)(-?\d{16,})(?=\s*[,}])/g, '$1"$2"'));
}
export async function sourceJson(endpoint, fetcher = fetch) {
  const url = `${SOURCE}/${endpoint}`;
  for (let attempt=0; attempt<3; attempt++) {
    const response = await fetcher(url, {signal:AbortSignal.timeout(30000),redirect:'error'});
    if (response.ok) return parseSource(await response.text());
    if (attempt<2 && (response.status===429 || response.status>=500)) continue;
    throw new Error(`Enemy source failed (${response.status}): ${endpoint}`);
  }
}
export async function fetchSource(get=sourceJson) {
  const data={};
  // Sequential requests avoid flooding this community service.
  for (const table of ['EnemyTemplateDisplayInfoTable','EnemyTable','EnemyAttributeTemplateTable','EnemyAbilityDescTable','DistributionInfoTable','AttributeMetaTable']) {
    data[table]=await get(`table/${table}/all`);
    requireValue(data[table] && typeof data[table]==='object' && !Array.isArray(data[table]) && Object.keys(data[table]).length, `Empty source table: ${table}`);
  }
  data.text={};
  for (const table of ['EnemyTemplateDisplayInfoTable','EnemyAbilityDescTable','DistributionInfoTable']) Object.assign(data.text,await get(`i18n/dict/EN/table/${table}/all`));
  data.images=await get('vfs/Bundle/search/monstericonbig?suffix=.png');
  requireValue(Array.isArray(data.images) && data.images.length, 'Empty image manifest');
  return data;
}
function localize(ref,text,required=false) {
  const value=clean(ref?.text || text[String(ref?.id)] || '');
  requireValue(!required || value, `Missing English localization: ${ref?.id}`);
  return value;
}
export function stableId(sourceId) {
  const hash=createHash('sha256').update(`rotationforge:enemy:${sourceId}`).digest('hex');
  return `${hash.slice(0,8)}-${hash.slice(8,12)}-5${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`;
}
export function mapSource(data) {
  const meta=data.AttributeMetaTable;
  for (const [id,icon] of [[1,'icon_attribute_maxHp'],[2,'icon_attribute_atk'],[3,'icon_attribute_def'],[80,'icon_attribute_physicalDamageTakenScalar'],[81,'icon_attribute_natural_damage_taken_scalar'],[82,'icon_attribute_crystDamageTakenScalar'],[83,'icon_attribute_pulseDamageTakenScalar'],[84,'icon_attribute_fireDamageTakenScalar'],[85,'icon_ether_damage_taken_scalar']]) requireValue(meta[id]?.iconName===icon,`Changed attribute mapping: ${id}`);
  const rows=[];
  for (const [key,display] of Object.entries(data.EnemyTemplateDisplayInfoTable).sort(([a],[b])=>a.localeCompare(b))) {
    if (!key.startsWith('eny_')) continue; // Exclude training targets and non-enemy records.
    requireValue(/^eny_[a-z0-9_]+$/.test(key) && display.templateId===key, 'Invalid enemy template identity');
    const entity=data.EnemyTable[key], attr=data.EnemyAttributeTemplateTable[entity?.attrTemplateId];
    requireValue(entity?.templateId===key && attr && Array.isArray(attr.levelDependentAttributes),`Missing base attributes: ${key}`);
    const levels=attr.levelDependentAttributes.map(entry=>{
      const values=Object.fromEntries(entry.attrs.map(v=>[v.attrType,v.attrValue]));
      return {level:numeric(values[0],'level'),hp:numeric(values[1],'HP'),atk:numeric(values[2],'ATK'),defense:numeric(values[3],'DEF')};
    }).sort((a,b)=>a.level-b.level);
    requireValue(levels.length===100 && levels.every((row,i)=>row.level===i+1),`Incomplete level table: ${key}`);
    const independent=Object.fromEntries(attr.levelIndependentAttributes.attrs.map(v=>[v.attrType,v.attrValue]));
    const resistances=Object.fromEntries([[80,'physical'],[81,'nature'],[82,'cryo'],[83,'electric'],[84,'heat'],[85,'aether']].map(([type,label])=>[label,numeric(independent[type],`${key} ${label} multiplier`)]));
    const name=localize(display.name,data.text,true);
    const categories={0:'normal',1:'elite',2:'boss',3:'elite',4:'elite'};
    requireValue(Object.hasOwn(categories,display.displayType),`Unknown enemy category: ${key}`);
    const skills=display.abilityDescIds.map((abilityId,index)=>{
      const ability=data.EnemyAbilityDescTable[abilityId];
      requireValue(ability,`Missing ability: ${abilityId}`);
      return {name:localize(ability.name,data.text)||`Field note ${index+1}`,description:localize(ability.description,data.text,true),source_id:abilityId};
    });
    const imagePath=data.images.find(p=>p===`assets/beyond/dynamicassets/gameplay/ui/sprites/monstericonbig/${key}.png`);
    rows.push({sourceId:key,image:imagePath?`${SOURCE}/vfs/Bundle/file/${imagePath}`:'',row:{
      name,category:categories[display.displayType],description:localize(display.description,data.text,true),
      location:display.distributionIds.map(id=>localize(data.DistributionInfoTable[id]?.areaName,data.text,true)).join('; '),
      hp:levels[89].hp,defense:levels[89].defense,resistances,skills,
      source_url:`${SOURCE}/table/EnemyTemplateDisplayInfoTable/${key}`,is_visible:true,
      combat_details:{levels,base_stats_level:90,source_category:['Common','Elite','Boss','Advanced','Alpha'][display.displayType]}
    }});
  }
  requireValue(rows.length>=80,'Enemy source unexpectedly small; no import prepared');
  return rows;
}

export function planImport(source, existing, keys={}) {
  const changes=[],protectedRows=[],retained=[],seen=new Set(),usedSlugs=new Set(existing.map(row=>row.combat_details?.catalog_import?.slug || slug(row.name)));
  const nameCounts=new Map(); for(const item of source) nameCounts.set(nameKey(item.row.name),(nameCounts.get(nameKey(item.row.name))||0)+1);
  for(const item of source) {
    requireValue(!seen.has(item.sourceId),'Duplicate source identity');seen.add(item.sourceId);
    const bound=existing.filter(row=>row.combat_details?.catalog_import?.source_id===item.sourceId);
    const named=existing.filter(row=>nameKey(row.name)===nameKey(item.row.name));
    requireValue(bound.length<=1,'Ambiguous source binding');
    const fixed=keys[item.sourceId] || stableId(item.sourceId);
    const old=bound[0] || existing.find(row=>row.id===fixed) || (nameCounts.get(nameKey(item.row.name))===1 && named.length===1?named[0]:null);
    requireValue(old || named.length===0 || nameCounts.get(nameKey(item.row.name))>1,`Ambiguous existing enemy: ${item.row.name}`);
    if (old && old.combat_details?.catalog_import?.provider!==PROVIDER) { protectedRows.push({sourceId:item.sourceId,id:old.id,name:old.name}); continue; }
    const prior=old?.combat_details?.catalog_import;
    let route=prior?.slug || slug(item.row.name);
    if(!prior && (usedSlugs.has(route)||nameCounts.get(nameKey(item.row.name))>1)) route+=`-${item.sourceId.replaceAll('_','-')}`;
    requireValue(route && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(route),'Invalid imported route'); usedSlugs.add(route);
    const next={id:old?.id||fixed};
    // Once a value differs from the last source snapshot, the editor owns it.
    for(const [field,value] of Object.entries(item.row)) {
      if(field==='combat_details') continue;
      next[field]=old && (!prior.snapshot || !same(old[field],prior.snapshot[field]))?old[field]:value;
    }
    const oldDetails=old?.combat_details||{},details={...oldDetails}; delete details.catalog_import;
    for(const [field,value] of Object.entries(item.row.combat_details)) details[field]=old && !same(oldDetails[field],prior?.snapshot?.combat_details?.[field])?oldDetails[field]:value;
    details.catalog_import={provider:PROVIDER,source_id:item.sourceId,slug:route,portrait_url:item.image,snapshot:structuredClone(item.row)};next.combat_details=details;
    if(!old || COLUMNS.some(field=>!same(next[field],old[field]))) changes.push({before:old?structuredClone(old):null,after:structuredClone(next)});
  }
  for(const row of existing) if(!source.some(item=>item.sourceId===row.combat_details?.catalog_import?.source_id)) retained.push(row.id);
  const previouslyImported=existing.filter(row=>row.combat_details?.catalog_import?.provider===PROVIDER);
  requireValue(previouslyImported.length===0 || source.length>=previouslyImported.length*0.9,'Source shrank unexpectedly');
  requireValue(new Set(changes.map(change=>change.after.id)).size===changes.length,'Duplicate target ID');
  return {changes,protectedRows,retained,sourceCount:source.length,missingImages:source.filter(item=>!item.image).map(item=>item.row.name)};
}

const literal = value => "'"+JSON.stringify(value).replaceAll("'","''")+"'::jsonb";
export function buildSql(plan) {
  const statements=['begin;', 'set local standard_conforming_strings = on;', 'lock table public.enemies in share row exclusive mode;'];
  for(const {before,after} of plan.changes) {
    const expected=before?`exists(select 1 from public.enemies e where e.id='${after.id}'::uuid and to_jsonb(e) @> ${literal(before)})`:`not exists(select 1 from public.enemies where id='${after.id}'::uuid)`;
    requireValue(/^[0-9a-f-]{36}$/.test(after.id),'Invalid target UUID');
    // A failed optimistic guard aborts the transaction before any stale write.
    statements.push(`select 1 / case when (${expected}) then 1 else 0 end as unchanged_enemy_guard;`);
    statements.push(`insert into public.enemies (${COLUMNS.join(',')}) select ${COLUMNS.join(',')} from jsonb_populate_record(null::public.enemies,${literal(after)}) on conflict(id) do update set ${COLUMNS.filter(c=>c!=='id').map(c=>`${c}=excluded.${c}`).join(',')};`);
  }
  statements.push('commit;'); return statements.join('\n');
}

async function readExisting(config,token,get=requestJson) {
  const rows=[];
  for(let offset=0;;offset+=500) {
    const batch=token?await get(`https://api.supabase.com/v1/projects/${config.ref}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({query:`select * from public.enemies order by id limit 500 offset ${offset}`,read_only:true})}):await get(`${config.url}/rest/v1/enemies?select=*&order=id&limit=500&offset=${offset}`,{headers:{apikey:config.key}});
    requireValue(Array.isArray(batch),'Invalid existing enemy response');rows.push(...batch);if(batch.length<500) return rows;
  }
}
export async function sync({apply=false,output=path.join(ROOT,'.cache/enemy-import'),env=process.env}={}) {
  const config=await publicConfiguration(env); config.ref=new URL(config.url).hostname.match(/^([a-z0-9]+)\.supabase\.co$/)?.[1];
  const token=env.SUPABASE_ACCESS_TOKEN;
  if(apply) {requireValue(config.ref && token,'--apply requires SUPABASE_ACCESS_TOKEN');await checkDatabaseWriteAccess(config.ref,token);}
  console.log('Reading enemy tables and English localization from the public community API...');
  const existing=await readExisting(config,token), data=await fetchSource(), source=mapSource(data);
  const keys=JSON.parse(await fs.readFile(path.join(ROOT,'tools/data/enemy-source-keys.json'),'utf8'));
  const plan=planImport(source,existing,keys),query=buildSql(plan);
  await fs.mkdir(output,{recursive:true});
  await fs.writeFile(path.join(output,'catalog.sql'),query);
  await fs.writeFile(path.join(output,'catalog.json'),JSON.stringify(plan.changes.map(c=>c.after),null,2));
  const report={fetchedAt:new Date().toISOString(),source:SOURCE,project:config.ref,readScope:token?'all rows including drafts':'public rows only; use the Actions preview for a complete comparison',sha256:createHash('sha256').update(query).digest('hex'),sourceCount:plan.sourceCount,added:plan.changes.filter(c=>!c.before).map(c=>c.after.name),changed:plan.changes.filter(c=>c.before).map(c=>c.after.name),protected:plan.protectedRows,retained:plan.retained,missingImages:plan.missingImages};
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));
  console.log(`${plan.sourceCount} source templates; ${report.added.length} new, ${report.changed.length} changed, ${report.protected.length} manually maintained profiles protected.`);
  if(apply && plan.changes.length) {
    await requestJson(`https://api.supabase.com/v1/projects/${config.ref}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({query,read_only:false})});
    const saved=await readExisting(config,token);
    requireValue(plan.changes.every(({after})=>{const row=saved.find(r=>r.id===after.id);return row && COLUMNS.every(key=>same(row[key],after[key]));}),'Read-back differs after write; inspect the database before retrying');
    console.log('Applied in one transaction and verified every saved row.');
  }
  return report;
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  try {const {values}=parseArgs({options:{apply:{type:'boolean',default:false},output:{type:'string'}}});await sync(values);}catch(error){console.error(`Enemy import failed: ${error.message}`);process.exitCode=1;}
}
