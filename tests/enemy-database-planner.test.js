import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const code=fs.readFileSync('endfield/js/data/enemySkills.js','utf8');
const id='10000000-0000-4000-8000-000000000002';
const row={id,name:'Heat Attacker',is_visible:true,category:'test',avatar_url:'https://ftssllxdkqvmlxhfeqmy.supabase.co/storage/v1/object/public/enemy-avatars/a/b.png',defense:null,resistances:{heat:0,physical:null},skills:[{id:900101,name:'Hit',debuffs:[{id:'operator_attacked'}]}]};
function context(pages=[{data:[row]}]) {
 let queries=[];const client={from(table){queries.push(table);return {select(){return this},eq(key,value){assert.equal(key,'is_visible');assert.equal(value,true);return this},order(){return this},async range(start){return pages[Math.floor(start/1000)]}}}};
 const ctx=vm.createContext({URL,console:{error(){}},window:{},localStorage:{getItem:()=> 'heat_attacker',setItem(){}},supabaseClient:client});vm.runInContext(code,ctx);ctx.queries=queries;return ctx;
}
test('database enemies replace local definitions and legacy IDs preserve skills',async()=>{
 const ctx=context();assert.equal(await vm.runInContext('hydrateEnemyDatabaseFromSupabase()',ctx),true);
 assert.equal(vm.runInContext('getSelectedEnemy().id',ctx),id);
 assert.equal(vm.runInContext('getEnemySkillById(900101).debuffs[0].id',ctx),'operator_attacked');
 assert.equal(vm.runInContext('getEnemyCombatProfile().defense',ctx),100);
 assert.equal(vm.runInContext('getEnemyCombatProfile().resistanceMultipliers.heat',ctx),0);
 assert.equal(vm.runInContext('getEnemyCombatProfile().resistanceMultipliers.physical',ctx),1);
 assert.equal(vm.runInContext('getSelectedEnemy().combatProfile.defense',ctx),null);
 assert.deepEqual(ctx.queries,['enemies']);
});
test('zero defense retained; unsafe images rejected; hidden rows excluded',async()=>{
 const ctx=context([{data:[{...row,defense:0,avatar_url:'javascript:alert(1)'},{...row,id:'hidden',is_visible:false}]}]);
 await vm.runInContext('hydrateEnemyDatabaseFromSupabase()',ctx);
 assert.equal(vm.runInContext('enemies.length',ctx),1);
 assert.equal(vm.runInContext('getEnemyCombatProfile().defense',ctx),0);
 assert.equal(vm.runInContext('getSelectedEnemy().icon',ctx),'/favicon-flat.png');
});
test('empty database and network failures have no hardcoded fallback',async()=>{
 for(const page of [{data:[]},{error:{message:'offline'}}]){
 const ctx=context([page]);await vm.runInContext('hydrateEnemyDatabaseFromSupabase()',ctx);
 assert.equal(vm.runInContext('enemies.length',ctx),0);
 assert.equal(vm.runInContext('enemyCatalogState',ctx),page.error?'error':'ready');
 }
});
test('pagination loads all rows and repeated skill IDs fail safely',async()=>{
 const first=Array.from({length:1000},(_,i)=>({...row,id:String(i),skills:[]}));const ctx=context([{data:first},{data:[row]}]);await vm.runInContext('hydrateEnemyDatabaseFromSupabase()',ctx);assert.equal(vm.runInContext('enemies.length',ctx),1001);
 const duplicate=context([{data:[row,{...row,id:'duplicate'}]}]);assert.equal(await vm.runInContext('hydrateEnemyDatabaseFromSupabase()',duplicate),false);
});

test('compact stats distinguish unknown, neutral and immune incoming damage',()=>{
 const ctx=context();
 vm.runInContext(fs.readFileSync('endfield/js/ui/enemyPanel.js','utf8'),ctx);
 const html=vm.runInContext(`renderEnemyCombatChips({combatProfile:{defense:0,resistanceMultipliers:{physical:0,heat:1,nature:0.8,aether:1}}})`,ctx);
 assert.match(html,/Defense: 0/);
 assert.match(html,/physical: 0× incoming damage/);
 assert.match(html,/heat: 1× incoming damage/);
 assert.match(html,/cryo: unknown; calculation assumes 1× incoming damage/);
 assert.match(html,/aether: 1× incoming damage/);
 assert.doesNotMatch(html,/Defense unknown/);
});
test('database mapping retains Aether multiplier without treating it as neutral damage',()=>{
 const ctx=context();
 const profile=vm.runInContext(`mapDatabaseEnemy({id:'test',name:'Boss',skills:[],resistances:{aether:0.8}}).combatProfile`,ctx);
 assert.equal(profile.resistanceMultipliers.aether,0.8);
 assert.equal(profile.resistanceMultipliers.neutral,undefined);
});
