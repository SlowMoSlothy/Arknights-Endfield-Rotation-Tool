// Display-only catalog data. Never writes simulator skills or combat actions.
const check=(ok,message)=>{if(!ok) throw new Error(message);};
export const plainText=value=>String(value??'').replace(/<[^>]*>/g,'').replace(/\[\[|\]\]/g,'').trim();
const number=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))?Number(value):undefined;
export function formatDescription(text,values={}) {
  const lookup=new Map(Object.entries(values).map(([k,v])=>[k.toLowerCase(),number(v)]));
  const atom=x=>/^-?\d+(?:\.\d+)?$/.test(x)?Number(x):lookup.get(x.toLowerCase());
  const evaluate=expr=>{
    if(lookup.has(expr.toLowerCase())) return lookup.get(expr.toLowerCase());
    const match=expr.match(/^([\w.]+)\s*([+*/-])\s*([\w.]+)$/);
    if(!match) return expr.startsWith('-')?-atom(expr.slice(1)):atom(expr);
    const a=atom(match[1]),b=atom(match[3]);if(a===undefined||b===undefined)return;
    return match[2]==='+'?a+b:match[2]==='-'?a-b:match[2]==='*'?a*b:b!==0?a/b:undefined;
  };
  return plainText(text).replace(/\{floor:([^}]+)\}/g,'{$1}').replace(/\{([^{}:]+)(?::([^{}]+))?\}/g,(_,expression,format='')=>{
    const value=evaluate(expression.trim());if(!Number.isFinite(value))return 'value unavailable';
    const percent=format.includes('%'),scaled=percent&&!/100\s*\*|\*\s*100/.test(expression)?value*100:value;
    const precision=Math.min(4,(format.match(/\.([0#]+)/)?.[1]||'').length);
    const rounded=format?Number(scaled.toFixed(precision)):Number(scaled.toFixed(3));
    return String(rounded)+(percent?'%':'');
  });
}
export function mapOperatorCatalog(detail,{text,items}) {
  const translated=(ref,fallback='')=>plainText(text[String(ref?.id??ref)]||ref?.text||fallback);
  const material=entry=>{
    const item=items[entry.id],count=number(entry.count);
    check(item&&count!==undefined&&count>=0,`Unknown material ${entry.id}`);
    const name=translated(item.name||item.nameI18nId);check(name,`Missing material translation ${entry.id}`);
    return {id:entry.id,name,count};
  };
  const groups=Object.values(detail.talents?.skillGroupMap||{}).sort((a,b)=>[0,1,3,2].indexOf(a.skillGroupType)-[0,1,3,2].indexOf(b.skillGroupType));
  check(groups.length>=4,'Incomplete skill groups');
  const skills=groups.map(group=>{
    const name=translated(group.name);check(name,'Missing skill translation');
    const variants=group.skillIdList.map((id,index)=>{
      const source=detail.skills?.[id]?.SkillPatchDataBundle;
      check(Array.isArray(source)&&source.length===12,`Incomplete ranks: ${id}`);
      const suffix=id.replace(detail.charId+'_','');
      const label=/^attack\d+$/.test(suffix)?`Attack ${suffix.match(/\d+$/)[0]}`:suffix==='power_attack'?'Finisher':suffix.includes('plunging')?'Dive attack':index===0?name:`${name} — variant ${index+1}`;
      const ranks=source.map((rank,i)=>{
        check(rank.level===i+1,`Invalid rank order: ${id}`);
        const values=Object.fromEntries((rank.blackboard||[]).map(v=>[v.key,v.value]));
        // The normal-attack description refers to Final Strike's stagger,
        // which is stored on the last attack rather than the first sequence.
        const lastAttack=group.skillGroupType===0?group.skillIdList.filter(skill=>/_attack\d+$/.test(skill)).sort((a,b)=>Number(a.match(/\d+$/)[0])-Number(b.match(/\d+$/)[0])).at(-1):null;
        const descriptionValues=Object.fromEntries((detail.skills[lastAttack||group.skillIdList[0]].SkillPatchDataBundle[i].blackboard||[]).map(v=>[v.key,v.value]));
        const stats=(rank.subDescDataList||[]).map(stat=>({label:translated(stat.name),value:formatDescription(stat.desc,values)}));
        check(stats.every(s=>s.label&&s.value),'Missing skill stat translation');
        return {level:rank.level,description:formatDescription(translated(group.desc),descriptionValues),cooldown:number(rank.coolDown)??null,cost:number(rank.costValue)??null,stats};
      });
      return {id,label,ranks};
    });
    const descriptions=variants[0].ranks.map(rank=>rank.description);
    for(const variant of variants)for(const rank of variant.ranks)delete rank.description;
    return {id:group.skillGroupId,name,descriptions,type:({0:'Basic Attack',1:'Battle Skill',2:'Ultimate',3:'Combo Skill'})[group.skillGroupType]||'Skill',variants};
  });
  const potentials=(detail.potentials?.potentialUnlockBundle||[]).map(p=>{
    const values={};
    for(const effect of p.effectData?.dataList||[]){
      const attr=effect.attrModifier,key=({1:'MaxHp',2:'Atk',3:'Def',9:'CriticalRate',17:'NormalAttackDamageIncrease',29:'HealOutputIncrease',32:'NormalSkillDamageIncrease',39:'Str',40:'Agi',41:'Wisd',42:'Will',50:'PhysicalDamageIncrease',52:'PulseDamageIncrease',53:'CrystDamageIncrease',87:'PhysicalAndSpellInflictionEnhance'})[attr?.attrType];
      if(key)values[key]=attr.attrValue;
      const bb=effect.skillBbModifier;if(bb?.bbKey)values[bb.bbKey]=bb.floatValue;
      for(const b of [...(effect.attachBuff?.blackboard||[]),...(effect.attachSkill?.blackboard||[])])values[b.key]=b.value;
      const param=effect.skillParamModifier;
      if(param?.paramType===1||param?.paramType==='CostValue')values.costvalue=param.paramValue;
      if(param?.paramType===2||param?.paramType==='CoolDown')values.cooldown=param.paramValue;
    }
    const name=translated(p.name),description=formatDescription(translated(p.effectData?.desc),values);
    check(name&&description,'Missing potential text');return {level:p.level,name,description:description==='???'?'Effect description is not available from the source.':description};
  }).sort((a,b)=>a.level-b.level);
  check(potentials.length===5&&potentials.every((p,i)=>p.level===i+1),'Incomplete potentials');
  const promotions=Object.values(detail.talents.charBreakCostMap||{}).map(p=>({name:translated(p.name),materials:(p.requiredItem||[]).map(material)}));
  const upgrades=Object.values(detail.talents.skillLevelUp||{}).map(u=>{
    const group=skills.find(s=>s.id===u.skillGroupId);check(group&&u.level>=2&&u.level<=12,'Invalid skill upgrade');
    const materials=(u.itemBundle||[]).map(material);
    if(u.goldCost)materials.push(material({id:'item_gold',count:u.goldCost}));
    return {skill:group.name,level:u.level,materials};
  });
  check(promotions.length>0&&upgrades.length>0,'Missing upgrade materials');
  return {version:1,source:`https://endfieldtools.dev/localdb/optimized/characters/details/${detail.charId}.json`,skills,potentials,promotions,upgrades};
}
