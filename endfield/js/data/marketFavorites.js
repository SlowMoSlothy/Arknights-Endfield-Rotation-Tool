const KEY='rotationforge.market.favorites.v1';
const valid=id=>typeof id==='string'&&/^domainshop_page_rand_map0[12]:domainshop_goods_rand_map0[12]_\d+$/.test(id);
export function parseFavorites(value){try{const list=JSON.parse(value);return new Set(Array.isArray(list)?list.filter(valid).slice(0,1000):[]);}catch{return new Set();}}
export class MarketFavorites{
 constructor(storageProvider=()=>globalThis.localStorage){this.storageProvider=storageProvider;this.persistent=true;try{this.ids=parseFavorites(storageProvider().getItem(KEY));}catch{this.ids=new Set();this.persistent=false;}}
 toggle(id){if(!valid(id))return false;if(this.ids.has(id))this.ids.delete(id);else this.ids.add(id);try{this.storageProvider().setItem(KEY,JSON.stringify([...this.ids]));this.persistent=true;}catch{this.persistent=false;}return this.ids.has(id);}
}
