import {identity,displayName,escapeHtml,number} from './marketData.js?v=5';
const KEY='rotationforge.market.alerts.v1';
const validId=id=>typeof id==='string'&&/^domainshop_page_rand_map0[12]:domainshop_goods_rand_map0[12]_\d+$/.test(id);
export const validTarget=value=>Number.isSafeInteger(value)&&value>0&&value<=2147483647;
export function parseTargets(value){try{const data=JSON.parse(value);return new Map(Array.isArray(data)?data.filter(x=>Array.isArray(x)&&validId(x[0])&&validTarget(x[1])).slice(0,1000):[]);}catch{return new Map();}}
export class MarketAlerts{
 constructor(storageProvider=()=>globalThis.localStorage){this.storageProvider=storageProvider;this.persistent=true;try{this.targets=parseTargets(storageProvider().getItem(KEY));}catch{this.targets=new Map();this.persistent=false;}}
 save(id,value){if(!validId(id)||!validTarget(value))throw Error('Enter a whole target price greater than zero.');this.targets.set(id,value);this.persist();}
 remove(id){this.targets.delete(id);this.persist();}
 persist(){try{this.storageProvider().setItem(KEY,JSON.stringify([...this.targets]));this.persistent=true;}catch{this.persistent=false;}}
 reached(row,favorites){const target=this.targets.get(identity(row));return favorites.has(identity(row))&&validTarget(target)&&row.latest_price<=target;}
}
export function alertEditor(row,target){const id=escapeHtml(identity(row)),name=escapeHtml(displayName(row)),hit=validTarget(target)&&row.latest_price<=target;
 return `<form class="market-alert-editor${hit?' is-reached':''}" data-alert-id="${id}"><label>Target price<input aria-label="Target price for ${name}" name="target" type="number" min="1" max="2147483647" step="1" required inputmode="numeric" placeholder="e.g. 1000" value="${validTarget(target)?target:''}"></label><button type="submit">${validTarget(target)?'Update':'Set alert'}</button>${validTarget(target)?`<button type="button" data-alert-remove="${id}" aria-label="Remove price alert for ${name}">Remove</button><span class="market-alert-state">${hit?'Target reached':'Waiting'} · ${number(row.latest_price)} ${hit?'≤':'>'} ${number(target)}</span>`:''}</form>`;
}
