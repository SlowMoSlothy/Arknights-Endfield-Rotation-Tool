import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {repairChenCombo} from '../tools/repair-chen-combo.js';

function context(allowSelfTrigger) {
    const combo={id:1403,name:'Soar to the Stars',type:'Combo Skill',shortType:'CS',cooldown:16,allowSelfTrigger,
        comboTriggerMode:'all',comboTriggers:[{effect:'vulnerable',minStacks:1}],
        debuffs:[{appliesEffect:'lift',persistsForCombo:false}]};
    const ctx=vm.createContext({console,crypto:{randomUUID:()=>Math.random().toString()},BUFF_REGISTRY:{},DEBUFF_REGISTRY:{},
        selectedTeam:[27,14,22,33],rotation:[],operators:[
            {id:27,skills:[]},
            {id:14,skills:[{id:1402,type:'Battle Skill',debuffs:[{appliesEffect:'lift',persistsForCombo:false},
                {appliesEffect:'vulnerable',persistsForCombo:true,stackable:true,stacksApplied:1,maxStacks:4}]},combo]},
            {id:22,skills:[{id:2204,type:'Ultimate',buffs:[]}]},
            {id:33,skills:[{id:3302,type:'Battle Skill',debuffs:[{appliesEffect:'cryo_infliction',persistsForCombo:true}]}]}
        ],resolveArtsReactions:effects=>effects});
    ctx.getSkillById=id=>ctx.operators.flatMap(op=>op.skills).find(s=>s.id===id);
    ctx.getOperatorBySkillId=id=>ctx.operators.find(op=>op.skills.some(s=>s.id===id));
    vm.runInContext(fs.readFileSync('endfield/js/logic/comboEngine.js','utf8'),ctx);
    return ctx;
}
test('screenshot sequence reproduces the missing Chen CS and the corrected flag inserts it exactly once',()=>{
    for(const enabled of [false,true]) {
        const ctx=context(enabled);ctx.rotation=[{id:2204},{id:3302},{id:1402}];
        ctx.insertComboChain(1402,2);
        assert.deepEqual(Array.from(ctx.rotation,e=>e.id),enabled?[2204,3302,1402,1403]:[2204,3302,1402]);
        if(enabled)assert.equal(ctx.rotation[3].autoInserted,true);
    }
});
test('self-trigger repair still requires Vulnerable and keeps foreign triggers and cooldown protection',()=>{
    const ctx=context(true);
    assert.equal(ctx.getComboSkillsFromEffects({},14).length,0);
    assert.equal(ctx.getComboSkillsFromEffects({vulnerable:1},14)[0].id,1403);
    assert.equal(ctx.getComboSkillsFromEffects({vulnerable:1},27)[0].id,1403);
    ctx.rotation=[{id:1403},{id:2204},{id:3302},{id:1402}];ctx.insertComboChain(1402,3);
    assert.equal(ctx.rotation.filter(e=>e.id===1403).length,1);
});
const env={SUPABASE_URL:'https://testproject.supabase.co',SUPABASE_ANON_KEY:'test-public',SUPABASE_ACCESS_TOKEN:'test-token'};
const row={id:1403,operator_id:14,name:'Soar to the Stars',skill_type:'Combo Skill',raw_data:{allowSelfTrigger:false,comboTriggers:[{effect:'vulnerable',minStacks:1}],damageProfile:{atkMultiplier:1.2},customAdminField:'preserve'}};
function database(initial=row,{readOnly=false,changedReadback=false}={}) {
    let stored=structuredClone(initial);const writes=[];
    const get=async(_url,options)=>{
        const body=JSON.parse(options.body);
        if(body.query.includes('current_setting'))return [{transaction_read_only:readOnly?'on':'off',default_transaction_read_only:'off',in_recovery:false,database_size_bytes:1}];
        if(body.read_only)return [structuredClone(stored)];
        writes.push(body.query);stored.raw_data.allowSelfTrigger=true;
        if(changedReadback)stored.raw_data.customAdminField='changed';
        return [];
    };
    return {get,writes};
}
test('database repair changes only the targeted flag, verifies read-back and is idempotent',async()=>{
    const db=database();assert.equal((await repairChenCombo({env,get:db.get})).changed,true);
    assert.equal(db.writes.length,1);
    assert.match(db.writes[0],/where id = 1403 and operator_id = 14/);
    assert.match(db.writes[0],/jsonb_set/);
    assert.equal((await repairChenCombo({env,get:db.get})).changed,false);
    assert.equal(db.writes.length,1);
});
test('repair refuses an unexpected identity or read-only project and detects read-back changes',async()=>{
    for(const db of [database({...row,operator_id:15}),database(row,{readOnly:true})]) {
        await assert.rejects(repairChenCombo({env,get:db.get}));assert.equal(db.writes.length,0);
    }
    await assert.rejects(repairChenCombo({env,get:database(row,{changedReadback:true}).get}),/read-back mismatch/);
});
test('reapplying the seed no longer disables Chens self-trigger',()=>{
    const seed=fs.readFileSync('supabase/operator_batch_04_skill_update.sql','utf8');
    const match=seed.match(/\{"id":1403,[^\n]+?\}'::jsonb/);
    assert.ok(match);assert.match(match[0],/"allowSelfTrigger":true/);
});
