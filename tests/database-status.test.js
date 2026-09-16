import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchDatabaseStatus, createEnemyIndex, updateHomeStatus} from '../tools/build-enemy-pages.js';
function client(result) { return {from:()=>({select:()=>({eq:()=>({single:async()=>result})})})}; }
test('database status supports both states and only defaults for missing migration', async()=>{
 for(const value of [true,false]) assert.equal(await fetchDatabaseStatus(client({data:{work_in_progress:value}})),value);
 assert.equal(await fetchDatabaseStatus(client({error:{code:'PGRST205'}})),true);
 await assert.rejects(fetchDatabaseStatus(client({error:{code:'42501',message:'denied'}})));
 await assert.rejects(fetchDatabaseStatus(client({data:{work_in_progress:null}})));
});
test('status reaches generated pages and bounded homepage marker',()=>{
 assert.match(createEnemyIndex([],true),/Work in progress/);
 assert.doesNotMatch(createEnemyIndex([],false),/Work in progress/);
 const html='before<!-- enemy-database-status:start -->old<!-- enemy-database-status:end -->after';
 assert.equal(updateHomeStatus(html,false),'before<!-- enemy-database-status:start --><!-- enemy-database-status:end -->after');
 assert.match(updateHomeStatus(html,true),/Work in progress/);
 assert.throws(()=>updateHomeStatus('missing',true));
});
