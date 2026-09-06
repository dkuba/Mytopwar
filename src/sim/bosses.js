import { BOSSES } from '../data/catalog.js';
import { clamp } from './rules.js';
import { recruit } from './army.js';
export function spawnBoss(s,kind) {
  const d=BOSSES[kind], health=d.hp*4*(1+Math.max(0,s.sector-12)*.06);
  const make=(x,hp)=>({id:s.id++,kind:'boss',bossKind:kind,x,z:13,y:0,hp,maxHp:hp,radius:1.2,age:0,cd:3,summonCd:4,phase:1,armor:0,color:d.color,hidden:false,returnTime:0});
  s.bosses=[make(0,health)];
  if(kind==='twins')s.bosses=[make(-2.6,health*.6),make(2.6,health*.6)];
  s.bossHpInitial=s.bosses.reduce((total,b)=>total+b.maxHp,0);
  if(kind==='tank'||kind==='walker')for(const dx of [-1.7,1.7])s.parts.push({id:s.id++,kind:'part',bossKind:kind,parent:s.bosses[0].id,dx,x:dx,z:13,hp:health*.12,maxHp:health*.12,radius:.7});
  s.notice(`${d.name} • ${d.hint}`,5);s.sound('boss');
  if(s.mods.phoenix){let n=0;while(s.fallen.length&&n++<4)recruit(s,s.fallen.pop(),1);}
}
function volley(s,b,count=1,delay=1.25) {
  // Aim once at cast time. A moving squad can actually dodge the marked footprint.
  for(let i=0;i<count;i++)s.warn({x:clamp(s.x+(i-(count-1)/2)*2.6,-4.7,4.7),z:-1.6,radius:1.15,delay,damage:75,source:b.id});
}
function summons(s,b,types,count) {
  for(let i=0;i<count;i++)s.spawnEnemy(types[i%types.length],clamp(b.x+(i%7-3)*.65,-5.3,5.3),b.z+2+Math.floor(i/7)*.6);
}
export function updateBosses(s,dt) {
  for(const b of s.bosses) {
    if(b.hp<=0)continue;
    b.age+=dt;b.cd-=dt;b.summonCd-=dt;
    const phase=b.hp/b.maxHp>.66?1:b.hp/b.maxHp>.33?2:3;
    if(phase!==b.phase){b.phase=phase;s.notice(`ФАЗА ${phase} • ${BOSSES[b.bossKind].name}`);}
    const partCount=s.parts.filter(p=>p.parent===b.id&&p.hp>0).length;
    switch(b.bossKind) {
      case 'brute':
        b.z+=((b.returnTime>s.time?2.3:11)-b.z)*dt*2;
        if(b.cd<=0){s.warn({shape:'rect',x:s.x,z:-1.8,width:1.9,depth:6,delay:1.4,damage:110,source:b.id,charge:true});b.cd=4.5-b.phase*.35;}
        break;
      case 'tank':
        b.weak=b.age%7>4;b.armor=b.weak?.08:.6;b.z=13;
        if(b.cd<=0){volley(s,b,Math.max(1,partCount),1.35);b.cd=4.5;}
        break;
      case 'brood':
        if(b.summonCd<=0){summons(s,b,['swarmer'],10+b.phase*3);b.summonCd=5;}
        if(b.cd<=0){s.warn({x:s.x,z:-1.5,radius:1.45,delay:1.3,damage:45,puddle:3.5,source:b.id});b.cd=5;}
        break;
      case 'general':
        b.armor=s.enemies.some(e=>e.type==='commander'&&e.hp>0)?.4:.08;
        if(b.summonCd<=0){summons(s,b,['shield','grunt','grunt','commander'],8+b.phase*2);b.summonCd=7;}
        if(b.cd<=0){volley(s,b,1);b.cd=5;}
        break;
      case 'walker':
        b.armor=partCount?.28:0;
        if(b.cd<=0){for(let i=0;i<Math.max(1,partCount);i++)s.warn({shape:'rect',x:(i?1:-1)*3.1,z:-1.6,width:2.3,depth:6,delay:1.6,damage:85,source:b.id});b.cd=3.4+(.7*(2-partCount));}
        break;
      case 'twins':
        b.rage=s.bosses.filter(v=>v.hp>0).length===1;
        if(b.cd<=0){s.warn({shape:'rect',x:b.x,z:-1.6,width:2.3,depth:6,delay:b.rage?1:1.5,damage:b.rage?105:65,source:b.id});b.cd=b.rage?2.4:4.4;}
        break;
      case 'worm': {
        const cycle=b.age%7;b.hidden=cycle<2;
        if(b.cd<=0){b.x=s.x;s.warn({x:b.x,z:-1.5,radius:1.3,delay:1.6,damage:90,source:b.id});b.cd=7;}
        b.z=b.hidden?8:10;break;
      }
      case 'carrier':
        b.x=Math.sin(b.age*.45)*2.8;b.z=16;
        if(b.cd<=0){volley(s,b,s.definition.variant?2:1,1.5);b.cd=3.4-b.phase*.25;}
        if(b.summonCd<=0){summons(s,b,['runner','jammer'],4+b.phase*2);b.summonCd=8;}
        break;
      case 'necro':
        if(b.summonCd<=0){const dead=s.graveyard.splice(-Math.min(10,s.graveyard.length));for(const corpse of dead)s.spawnEnemy(corpse.type,clamp(corpse.x,-5,5),15+s.rng.range(0,3),.7);b.summonCd=6;if(dead.length)s.notice(`ВОСКРЕШЕНИЕ • ${dead.length}`);}
        if(b.cd<=0){volley(s,b,1,1.2);b.cd=4.8;}break;
      case 'warlord':
        if(b.summonCd<=0){summons(s,b,b.phase===1?['shield','runner']:['swarmer','bomber'],6+b.phase*2);b.summonCd=7;}
        if(b.cd<=0){if(b.phase===3)s.warn({shape:'rect',x:s.x,z:-1.8,width:2.1,depth:6,delay:1.15,damage:120,source:b.id,charge:true});else volley(s,b,b.phase===2?2:1,1.35);b.cd=4.2-b.phase*.35;}
        b.z+=((b.returnTime>s.time?3:13)-b.z)*dt*2;break;
    }
    for(const p of s.parts.filter(v=>v.parent===b.id)){p.x=b.x+p.dx;p.z=b.z;}
  }
}
