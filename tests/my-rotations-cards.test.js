import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

function element(tag) {
    const node={tag,children:[],attributes:{},listeners:{},className:'',textContent:'',
        append(...nodes){this.children.push(...nodes);}, appendChild(child){this.children.push(child);},
        setAttribute(key,value){this.attributes[key]=value;},addEventListener(key,fn){this.listeners[key]=fn;}};
    node.classList={toggle(){},add(name){node.className+=' '+name;}};
    return node;
}
const all = root=>root.children.flatMap(child=>[child,...all(child)]);
function mount() {
    const skills=Array.from({length:20},(_,i)=>({id:i+1,name:`Skill ${i+1}`,type:'Battle Skill'}));
    const selected=[],loaded=[],submitted=[],deleted=[];
    const ctx={window:{},console:{warn(){}},document:{createElement:element},operators:[],
        getSkillById:id=>skills.find(skill=>skill.id===id),
        createSkillIcon:skill=>Object.assign(element('span'),{className:'my-preview-skill-icon',skillId:skill.id}),
        createBasicAttackIcon:skill=>Object.assign(element('span'),{className:'my-preview-skill-icon',isBasicAttack:true})};
    vm.createContext(ctx);vm.runInContext(fs.readFileSync('endfield/js/ui/myRotations.js','utf8'),ctx);
    ctx.selectMyRotation=row=>selected.push(row.id);
    ctx.loadMyRotation=row=>loaded.push(row.id);
    ctx.submitMyRotationForReview=row=>submitted.push(row.id);
    ctx.deleteMyRotation=row=>deleted.push(row.id);
    return {ctx,skills,selected,loaded,submitted,deleted};
}
const row={id:'saved-1',title:'Mi Fu opener',rotation_skill_ids:[1,2,3,4,5,6,7,8,9,10],team_operator_ids:[],created_at:'2026-11-27T12:00:00Z'};

test('saved rotation cards show numbered ordered previews independently of legacy community styles',()=>{
    const m=mount();
    const preview=m.ctx.createMyRotationPreview(row);
    const steps=all(preview).filter(node=>node.className==='my-preview-step');
    assert.equal(preview.attributes['aria-label'],'Skill order preview');
    assert.equal(steps.length,10);
    assert.deepEqual(steps.map(step=>step.children[1].skillId),row.rotation_skill_ids);
    assert.deepEqual(steps.map(step=>step.children[0].textContent),['1','2','3','4','5','6','7','8','9','10']);
    assert.equal(steps[0].attributes['aria-label'],'1. Skill 1');
    assert.equal(all(preview).some(node=>node.textContent==='->'),false);
    const long=m.ctx.createMyRotationPreview({...row,rotation_skill_ids:m.skills.map(skill=>skill.id)});
    assert.equal(all(long).filter(node=>node.className==='my-preview-step').length,12);
    assert.equal(all(long).find(node=>node.className==='my-preview-more').textContent,'+8');
});

test('saved share payload previews preserve basic attacks, ordering and stage variants',()=>{
    const m=mount();
    m.ctx.parseBuildShareCode=()=>({rotation:[{id:2},{id:'attack'},{id:3}]});
    m.ctx.getRotationActionData=action=>action.id==='attack'?{isBasicAttack:true,name:'Leader basic attack'}:m.skills[action.id-1];
    const preview=m.ctx.createMyRotationPreview({...row,share_code:'saved-payload'});
    const steps=all(preview).filter(node=>node.className==='my-preview-step');
    assert.equal(steps.length,3);
    assert.equal(steps[1].children[1].isBasicAttack,true);
    assert.equal(steps[2].title,'3. Skill 3');
});

test('card keyboard navigation leaves nested action buttons alone and preserves their callbacks',()=>{
    const m=mount();
    const card=m.ctx.createMyRotationCard(row);
    const buttons=all(card).filter(node=>node.tag==='button');
    assert.deepEqual(buttons.map(button=>button.textContent),['Load','Submit for Review','Delete']);
    card.listeners.keydown({target:buttons[0],key:'Enter',preventDefault(){throw new Error('Nested button key intercepted');}});
    assert.equal(m.selected.length,0);
    let prevented=false;
    card.listeners.keydown({target:card,key:'Enter',preventDefault(){prevented=true;}});
    assert.equal(prevented,true);assert.deepEqual(m.selected,['saved-1']);
    buttons.forEach(button=>button.listeners.click({stopPropagation(){}}));
    assert.deepEqual(m.loaded,['saved-1']);
    assert.deepEqual(m.submitted,['saved-1']);
    assert.deepEqual(m.deleted,['saved-1']);
});

test('unavailable skills have a readable fallback and submitted rotations keep their disabled action',()=>{
    const m=mount();
    const preview=m.ctx.createMyRotationPreview({...row,rotation_skill_ids:[999]});
    assert.equal(preview.children[0].textContent,'No skill preview available');
    const card=m.ctx.createMyRotationCard({...row,submitted_for_review_at:'2026-11-27T12:00:00Z'});
    assert.equal(all(card).find(node=>node.tag==='button' && node.textContent==='Submitted').disabled,true);
});
