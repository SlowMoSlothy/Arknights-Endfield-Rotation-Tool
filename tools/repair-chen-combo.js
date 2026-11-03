import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {publicConfiguration, requestJson, checkDatabaseWriteAccess} from './sync-endfield-equipment.js';

export async function repairChenCombo({env=process.env, get=requestJson}={}) {
    const token=env.SUPABASE_ACCESS_TOKEN;
    if (!token) throw new Error('Missing SUPABASE_ACCESS_TOKEN');
    const config=await publicConfiguration(env);
    const ref=new URL(config.url).hostname.split('.')[0];
    if (!/^[a-z0-9]+$/.test(ref)) throw new Error('Invalid Supabase project reference');
    const query=(sql,readOnly)=>get(`https://api.supabase.com/v1/projects/${ref}/database/query`,{
        method:'POST', headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
        body:JSON.stringify({query:sql,read_only:readOnly})
    });
    const read=async()=>{
        const rows=await query(`select id, operator_id, name, skill_type, raw_data from public.operator_skills where id=1403 and operator_id=14 /* ${randomUUID()} */`,true);
        const row=rows?.[0];
        if (rows?.length!==1 || Number(row.id)!==1403 || Number(row.operator_id)!==14
            || row.name!=='Soar to the Stars' || row.skill_type!=='Combo Skill'
            || !Array.isArray(row.raw_data?.comboTriggers)
            || !row.raw_data.comboTriggers.some(trigger=>trigger.effect==='vulnerable' && trigger.minStacks===1)) {
            throw new Error('Chen combo identity or trigger check failed');
        }
        return row;
    };
    const before=await read();
    if (before.raw_data.allowSelfTrigger===true) return {changed:false,skillId:1403,allowSelfTrigger:true};
    await checkDatabaseWriteAccess(ref,token,get);
    await query(await fs.readFile(new URL('../supabase/chen_combo_self_trigger.sql',import.meta.url),'utf8'),false);
    const after=await read();
    if (!isDeepStrictEqual(after.raw_data,{...before.raw_data,allowSelfTrigger:true})) {
        throw new Error('Chen combo read-back mismatch; inspect database before retrying');
    }
    return {changed:true,skillId:1403,allowSelfTrigger:true};
}
if (process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
    repairChenCombo().then(result=>console.log(JSON.stringify(result))).catch(error=>{console.error(error.message);process.exitCode=1;});
}
