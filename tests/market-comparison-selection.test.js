import test from 'node:test';
import assert from 'node:assert/strict';
import {MarketComparisonSelection} from '../endfield/js/data/marketComparisonSelection.js';
const ids=Array.from({length:6},(_,i)=>`domainshop_page_rand_map01:domainshop_goods_rand_map01_${i}`);
function memory(value=null){return {value,getItem(){return this.value;},setItem(key,value){assert.equal(key,'rotationforge.market.comparison.selection.v1');this.value=value;}};}
test('comparison selection survives a fresh visit, removal and clear',()=>{
 const storage=memory(),first=new MarketComparisonSelection(ids,()=>storage);
 first.ids.add(ids[0]);first.ids.add(ids[1]);first.save();
 const revisit=new MarketComparisonSelection(ids,()=>storage);assert.deepEqual([...revisit.ids],ids.slice(0,2));
 revisit.ids.delete(ids[0]);revisit.save();assert.deepEqual([...new MarketComparisonSelection(ids,()=>storage).ids],[ids[1]]);
 revisit.ids.clear();revisit.save();assert.equal(new MarketComparisonSelection(ids,()=>storage).ids.size,0);assert.equal(storage.value,'[]');
});
test('unknown goods, corrupt storage and duplicate entries do not break restoration',()=>{
 for(const value of ['not json','null','{}','42'])assert.equal(new MarketComparisonSelection(ids,()=>memory(value)).ids.size,0);
 const storage=memory(JSON.stringify([ids[0],ids[0],'removed',null,...ids.slice(1)]));
 const saved=new MarketComparisonSelection(ids,()=>storage);assert.deepEqual([...saved.ids],ids.slice(0,4));
 const changedCatalog=new MarketComparisonSelection(ids.slice(1),()=>storage);assert.deepEqual([...changedCatalog.ids],ids.slice(1,5));
 saved.ids.add('unknown');saved.ids.add(ids[5]);saved.save();assert.deepEqual(JSON.parse(storage.value),ids.slice(0,4));
});
test('denied reads/writes retain a usable in-memory selection and report fallback',()=>{
 const unavailable=()=>{throw Error('denied');};const readFail=new MarketComparisonSelection(ids,unavailable);
 assert.equal(readFail.persistent,false);readFail.ids.add(ids[0]);readFail.save();assert(readFail.ids.has(ids[0]));assert.equal(readFail.persistent,false);
 const storage=memory(JSON.stringify([ids[1]]));storage.setItem=()=>{throw Error('quota');};const writeFail=new MarketComparisonSelection(ids,()=>storage);
 writeFail.ids.add(ids[2]);writeFail.save();assert.equal(writeFail.persistent,false);assert.deepEqual([...writeFail.ids],ids.slice(1,3));
});
