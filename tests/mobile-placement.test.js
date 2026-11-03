import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function planner(width=390) {
 const nodes={mobileUndoBtn:{disabled:true},mobilePlacementHint:{textContent:''}};
 const ctx=vm.createContext({window:{innerWidth:width},document:{getElementById:id=>nodes[id]||null,querySelectorAll:()=>[],querySelector:()=>null,body:{classList:{toggle(){}}}},
  localStorage:{setItem(){}},crypto:{randomUUID:()=>Math.random().toString()},console,
  BASIC_ATTACK_ACTION_TYPE:'basic-attack',rotation:[null],operatorUltimateStates:{},uiSettings:{timelineMode:'slot'},
  getSkillById:id=>[1,2,3,99].includes(id)?{id,name:`Skill ${id}`,durationSeconds:1}:null,
  getMappedSkillIdForOperatorState:id=>id, handleUltimateStateToggle:id=>{if(id===3)ctx.operatorUltimateStates[1]=!ctx.operatorUltimateStates[1]},
  insertComboChain:(id,index)=>{if(id===1)ctx.rotation.splice(index+1,0,{id:99,uid:'combo'})},
  normalizeQingboMovesInRotation(){},refreshSkillsAfterRotationChange(){},renderRotation(){},
  isSimulationTimelineMode:()=>ctx.uiSettings.timelineMode==='simulation',getSnappedSimulationEntryTime:(_i,t)=>t,
  setTimeout:fn=>{ctx.fireHold=fn;return 1},clearTimeout(){},});
 for(const file of ['endfield/js/logic/snakeLayout.js','endfield/js/logic/storage.js','endfield/js/logic/dragDrop.js','endfield/js/logic/tapInput.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
 return {ctx,nodes};
}
test('mobile taps append complete combo chains and Undo restores the prior rotation',()=>{
 const {ctx,nodes}=planner();ctx.placeMobileTapSkill({actionType:'skill',id:1});
 assert.deepEqual(Array.from(ctx.rotation.filter(Boolean),x=>x.id),[1,99]);assert.equal(nodes.mobileUndoBtn.disabled,false);
 ctx.placeMobileTapSkill({actionType:'skill',id:2});assert.deepEqual(Array.from(ctx.rotation.filter(Boolean),x=>x.id),[1,99,2]);
 ctx.undoMobileRotationEdit();assert.deepEqual(Array.from(ctx.rotation.filter(Boolean),x=>x.id),[1,99]);
 ctx.undoMobileRotationEdit();assert.equal(ctx.rotation.filter(Boolean).length,0);
});
test('choosing a slot replaces it instead of appending, and Undo restores ultimate state',()=>{
 const {ctx}=planner();ctx.placeMobileTapSkill({actionType:'skill',id:2});
 vm.runInContext('mobilePlacementSlotIndex=0',ctx);ctx.placeMobileTapSkill({actionType:'skill',id:3});
 assert.deepEqual(Array.from(ctx.rotation.filter(Boolean),x=>x.id),[3]);assert.equal(ctx.operatorUltimateStates[1],true);
 ctx.undoMobileRotationEdit();assert.deepEqual(Array.from(ctx.rotation.filter(Boolean),x=>x.id),[2]);assert.equal(ctx.operatorUltimateStates[1],undefined);
});
test('simulation taps use the same timed insertion and snapping path as dragging',()=>{
 const {ctx}=planner();ctx.uiSettings.timelineMode='simulation';ctx.placeMobileTapSkill({actionType:'skill',id:2});ctx.placeMobileTapSkill({actionType:'skill',id:3});
 assert.deepEqual(Array.from(ctx.rotation.filter(Boolean),e=>[e.id,e.time]),[[2,0],[3,1]]);
 ctx.undoMobileRotationEdit();assert.deepEqual(Array.from(ctx.rotation.filter(Boolean),e=>[e.id,e.time]),[[2,0]]);
});
test('a scrolling gesture and a consumed long press cannot append a skill',()=>{
 const {ctx}=planner();const skill={dataset:{id:'2'},closest:selector=>selector==='.skill-small'?skill:null};
 const event={target:skill,preventDefault(){},stopPropagation(){}};
 vm.runInContext('mobilePointerGesture={moved:true}',ctx);ctx.handleTapInput(event);assert.equal(ctx.rotation.filter(Boolean).length,0);
 skill.dataset.longPressConsumed='true';ctx.handleTapInput(event);assert.equal(ctx.rotation.filter(Boolean).length,0);
 assert.equal(skill.dataset.longPressConsumed,undefined);
});
test('Undo does not overwrite later changes made outside the mobile operation',()=>{
 const {ctx,nodes}=planner();ctx.placeMobileTapSkill({actionType:'skill',id:2});ctx.rotation.push({id:3});ctx.updateMobileUndoButton();
 assert.equal(nodes.mobileUndoBtn.disabled,true);ctx.undoMobileRotationEdit();assert.equal(ctx.rotation.filter(Boolean).length,2);
});
test('desktop source taps keep the select-then-place behavior',()=>{
 const {ctx}=planner(1280);const skill={dataset:{id:'2'},closest:selector=>selector==='.skill-small'?skill:null};
 ctx.handleTapInput({target:skill,preventDefault(){},stopPropagation(){}});
 assert.equal(ctx.rotation.filter(Boolean).length,0);assert.equal(vm.runInContext('selectedSkill.id',ctx),2);
});
