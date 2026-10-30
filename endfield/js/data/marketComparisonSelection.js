const KEY='rotationforge.market.comparison.selection.v1';
function clean(ids,available){
 return new Set((Array.isArray(ids)?ids:[]).filter(id=>typeof id==='string'&&available.has(id)).filter((id,i,list)=>list.indexOf(id)===i).slice(0,4));
}
export class MarketComparisonSelection{
 constructor(availableIds,storageProvider=()=>globalThis.localStorage){
  this.available=new Set(availableIds);this.storageProvider=storageProvider;this.persistent=true;
  try{let parsed;try{parsed=JSON.parse(storageProvider().getItem(KEY));}catch(error){if(error instanceof SyntaxError)parsed=[];else throw error;}this.ids=clean(parsed,this.available);}
  catch{this.ids=new Set();this.persistent=false;}
 }
 save(){
  const ids=clean([...this.ids],this.available);this.ids.clear();ids.forEach(id=>this.ids.add(id));
  try{this.storageProvider().setItem(KEY,JSON.stringify([...this.ids]));this.persistent=true;}
  catch{this.persistent=false;}
 }
}
