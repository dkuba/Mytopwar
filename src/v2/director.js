import {LEVELS,ENEMIES} from './data.js';
const lane=[-3.4,0,3.4];
const gate=(x,op,value,extra={})=>({kind:'gate',x,width:2.65,op,value,...extra});
const hazard=(x,type,value=3)=>({kind:'hazard',x,type,value,radius:type==='saw'?.75:.85,width:2.2,depth:1.1,shape:type==='laser'?'rect':'circle'});
const crate=(x,unit,count,hp=95,kind='crate')=>({kind,x,width:2,unit,count,hp,maxHp:hp});
/** Authored rows have at least one non-punishing lane; later rows demand faster movement. */
export function makeTimeline(level,round=0){
 const i=level.id,d=level.difficulty,events=[];
 const row=(at,items)=>events.push({at,kind:'row',items});
 row(0,[gate(-3.4,'add',8),gate(0,'add',6),gate(3.4,'add',5)]);
 row(9,[gate(-3.4,'add',10),gate(0,'subtract',3+i),gate(3.4,'add',3,{unit:'machinegun'})]);
 row(20,[crate(-3.4,'grenadier',3,85+i*5),{kind:'barrel',x:0,radius:.6,width:1.4,hp:60,maxHp:60},crate(3.4,'shotgun',4,85+i*5)]);
 row(31,[gate(-3.4,'multiply',2),gate(0,'subtract',5+i),gate(3.4,'add',15)]);
 row(43,[hazard(-3.4,i<3?'mine':'saw',3),crate(0,'rifleman',12,100+i*8,'cage'),hazard(3.4,'spikes',3)]);
 events.push({at:54,kind:'artifact'});
 row(56,[gate(-3.4,'tier',1),gate(0,'divide',2),gate(3.4,'add',4,{unit:i<4?'sniper':'tesla'})]);
 row(66,[crate(-3.4,i<5?'medic':'rocket',3,115+i*7),hazard(0,'laser',4),gate(3.4,'buff',1)]);
 row(77,[gate(-3.4,'add',12+i),gate(0,'subtract',7+i),gate(3.4,'multiply',i>7?3:2)]);
 if(i>=3)row(85,[hazard(-3.4,'saw',4),gate(0,'add',5,{unit:'shield'}),crate(3.4,i%2?'drone':'flamethrower',4,130)]);
 if(i>=7)events.push({at:91,kind:'artifact'});
 for(let t=2,stage=0;t<level.duration-8;t+=5.5,stage++){
  const pool=stage<2?['grunt','swarmer']:['grunt','swarmer','runner'];
  if(stage>4)pool.push('shield');
  if(i>=1&&stage>5)pool.push('tank','bomber');
  if(i>=2&&stage>7)pool.push('splitter');
  if(i>=3&&stage>4)pool.push('medic','commander');
  if(i>=4&&stage>8)pool.push('sniper');
  if(i>=6&&stage>5)pool.push('burrower');
  if(i>=7&&stage>6)pool.push('jammer');
  if(i>=8&&stage>8)pool.push('necromancer','warbeast');
  events.push({at:t,kind:'wave',pool,budget:Math.round((12+stage*2.6)*d*(1+round*.04))});
 }
 // Large low-HP waves provide the visible crowd payoff without hiding elite roles.
 events.push({at:40,kind:'wave',pool:['swarmer'],budget:80+i*8});
 events.push({at:73,kind:'wave',pool:['swarmer','grunt'],budget:140+i*10});
 return events.sort((a,b)=>a.at-b.at);
}
export function waveRoster(rng,pool,budget){
 const out=[];
 while(budget>=1&&out.length<150){
  const candidates=pool.filter(t=>ENEMIES[t].cost<=budget);
  if(!candidates.length)break;
  const t=rng.pick(candidates);out.push(t);budget-=ENEMIES[t].cost;
 }
 return out;
}
export function endlessLevel(round){const base=LEVELS[round%LEVELS.length];return{...base,id:Math.min(11,round),name:`Бесконечность · ${round+1}`,difficulty:1+round*.13,duration:88+Math.min(round,6)*3};}
export {lane};
