import { ENEMIES, BOSSES, UNITS } from './catalog.js';
export const ENEMY_COST = {grunt:1,swarmer:.6,runner:1.5,shield:4,tank:8,bomber:3,medic:5,commander:6,splitter:3,sniper:4,burrower:4,jammer:5,necromancer:8,warbeast:16};
export const LEVELS = [
  {name:'Первый плацдарм',biome:'bridge',boss:'brute',pool:['grunt','swarmer'],special:'machinegun',hazard:'mine'},
  {name:'Броневая колонна',biome:'bridge',boss:'tank',pool:['grunt','grunt','shield','runner'],special:'sniper',hazard:'mine'},
  {name:'Мост роя',biome:'bridge',boss:'brood',pool:['swarmer','swarmer','splitter','runner'],special:'shotgun',hazard:'spikes'},
  {name:'Штаб в песках',biome:'desert',boss:'general',pool:['grunt','shield','medic','commander'],special:'grenadier',hazard:'spikes'},
  {name:'Осада',biome:'desert',boss:'walker',pool:['grunt','tank','bomber','shield'],special:'rocket',hazard:'saw'},
  {name:'Двойной удар',biome:'desert',boss:'twins',pool:['runner','runner','bomber','warbeast'],special:'flamethrower',hazard:'saw'},
  {name:'Подземный фронт',biome:'toxic',boss:'worm',pool:['grunt','burrower','splitter','runner'],special:'shield',hazard:'spikes'},
  {name:'Небо в огне',biome:'toxic',boss:'carrier',pool:['grunt','jammer','sniper','runner'],special:'tesla',hazard:'laser'},
  {name:'Возвращение павших',biome:'toxic',boss:'necro',pool:['swarmer','shield','necromancer','medic'],special:'drone',hazard:'laser'},
  {name:'Протокол Омега',biome:'tech',boss:'warlord',pool:['grunt','shield','tank','commander'],special:'rocket',hazard:'laser'},
  {name:'Воздушная крепость',biome:'tech',boss:'carrier',pool:['runner','jammer','bomber','sniper'],special:'sniper',hazard:'saw',variant:true},
  {name:'Последняя колонна',biome:'tech',boss:'warlord',pool:['grunt','warbeast','commander','splitter','tank'],special:'tesla',hazard:'laser',variant:true},
];
const gate=(lane,op,value,unit='rifleman')=>({lane,op,value,unit});
export function timeline(level=1) {
  const l=LEVELS[(level-1)%12], n=level-1, side=n%2?1:-1;
  const wave=(at,budget,pool=l.pool,shape='block')=>({at,type:'wave',budget:Math.round(budget*(1+n*.075)),pool,shape});
  const row=(at,choices)=>({at,type:'row',choices});
  const prop=(at,kind,lane,options={})=>({at,type:'object',kind,lane,options});
  const out=[
    row(0,[gate(0,'add',6+Math.min(4,n))]),
    wave(1,14,['grunt','swarmer']),
    row(8,[gate(-1,'add',7),gate(1,'add',9)]),
    wave(10,32,['grunt','swarmer','runner']),
    prop(16,'cage',side,{unit:l.special,count:3+Math.floor(n/4),hp:35+n*4}),
    prop(17,'mine',-side,{quota:3}),
    {at:22,type:'artifact'},
    row(24,[gate(-1,'multiply',2),gate(0,'subtract',4+Math.floor(n/3)),gate(1,'add',12)]),
    wave(27,60),
    row(33,[gate(side,'tier',1),gate(-side,'add',8)]),
    prop(36,l.hazard,0,{quota:3+Math.floor(n/3)}),
    prop(38,'barrel',side,{hp:18}),
    wave(39,74,l.pool,'flank'),
    {at:45,type:'artifact'},
    prop(46,'crate',-side,{unit:n<3?'grenadier':'rocket',count:3,hp:60+n*5}),
    row(51,[gate(-1,'add',15),gate(0,'divide',2),gate(1,'multiply',2)]),
    wave(54,100),
    prop(58,l.hazard,side,{quota:5}),
    row(63,[gate(-side,'buff',1),gate(side,'add',4,'medic')]),
    {at:68,type:'artifact'},
    wave(70,110,l.pool,'block'),
    prop(74,'cage',side,{unit:l.special,count:4+Math.floor(n/4),hp:80+n*7}),
    row(79,[gate(-1,'add',10),gate(1,'tier',1)]),
    {at:87+Math.min(8,n),type:'boss'},
  ];
  if(n>=4) out.push(prop(61,'saw',0,{quota:3}));
  if(n>=7) out.push(wave(76,30,['sniper','runner']));
  return out.sort((a,b)=>a.at-b.at);
}
export function validateCampaign() {
  for(let level=1;level<=12;level++) {
    const l=LEVELS[level-1],events=timeline(level);if(!BOSSES[l.boss])throw Error('Unknown boss');
    for(const e of events){if(e.type==='wave') for(const type of e.pool) if(!ENEMIES[type]||!ENEMY_COST[type])throw Error('Unknown enemy');
      if(e.options?.unit&&!UNITS[e.options.unit])throw Error('Unknown reward');
      if(e.type==='row'&&!e.choices.some(c=>!['subtract','divide'].includes(c.op)))throw Error('No safe gate');}
    if(events.at(-1).type!=='boss')throw Error('Missing finale');
  }
  return true;
}
