import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createIndexPage} from '../tools/build-operator-pages.js';
import {createEnemyIndex} from '../tools/build-enemy-pages.js';

for (const [kind, render] of [['operator',createIndexPage],['enemy',createEnemyIndex]]) {
  test(`${kind} catalog defaults to creation order in HTML and browser, including reset`, () => {
    const rows = [
      {name:'Alpha',created_at:'2026-01-01',updated_at:'2026-12-31'},
      {name:'Zulu',created_at:'2026-10-19'},
      {name:'Beta',created_at:'2026-10-19'},
      {name:'Unknown',created_at:'invalid'}
    ].map((row,i)=>({...row,id:String(i+1),slug:row.name.toLowerCase(),star:6,skills:[],resistances:{},category:'normal'}));
    const html = render(rows);
    assert.match(html, /<select name="sort">\s*<option value="newest">Newest first/);
    const names = [...html.matchAll(/class="operator-tile"[^>]+data-name="([^"]+)"/g)].map(m=>m[1]);
    assert.deepEqual(names,['beta','zulu','alpha','unknown']);
    assert.equal(rows[0].name,'Alpha');
    const cards = rows.map(row=>({dataset:{name:row.name.toLowerCase(),search:row.name.toLowerCase(),added:String(Date.parse(row.created_at)||0)}}));
    const elements = Object.fromEntries(['search','sort','category','class','element','rarity'].map(k=>[k,{value:k==='sort'?'newest':''}]));
    const handlers={};
    const grid={children:[...cards],querySelectorAll:()=>cards,append(c){this.children=this.children.filter(x=>x!==c).concat(c);}};
    const form={elements,querySelector:s=>elements[s.match(/name='([^']+)'/)[1]],addEventListener:(e,f)=>handlers[e]=f};
    const count={},empty={};
    const nodes={'.operator-grid':grid,'.operator-toolbar':form,'.empty-state':empty,['#'+kind+'-count']:count};
    const script=kind==='enemy'?fs.readFileSync('endfield/js/ui/enemyCatalog.js','utf8'):[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].find(m=>m[1].includes('const sortedCards'))[1];
    vm.runInNewContext(script,{document:{querySelector:s=>nodes[s],getElementById:id=>nodes['#'+id]},setTimeout:f=>f(),requestAnimationFrame:f=>f()});
    const order=()=>grid.children.map(c=>c.dataset.name);
    assert.deepEqual(order(),names);
    elements.sort.value='name';handlers.change();assert.deepEqual(order(),['alpha','beta','unknown','zulu']);
    elements.search.value='zulu';handlers.input();assert.equal(cards.filter(c=>!c.hidden).length,1);
    elements.search.value='';elements.sort.value='newest';handlers.reset();assert.deepEqual(order(),names);
  });
}
