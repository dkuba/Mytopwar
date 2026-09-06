import { LIMITS, clamp } from './rules.js';
import { applyGate, damageArea, recruit } from './army.js';
export function spawnRow(s, choices, z=34) {
  const row=s.id++;
  for (const choice of choices) {
    if (s.objects.length>=LIMITS.objects) break;
    s.objects.push({id:s.id++,row,kind:'gate',x:choice.lane*3.55,z,width:3.15,...choice,claimed:false});
  }
}
export function spawnObject(s, kind, lane, options={}) {
  if (s.objects.length>=LIMITS.objects) return;
  const o={id:s.id++,kind,x:lane*3.55,baseX:lane*3.55,z:34,width:1.6,age:0,hit:new Set(),...options};
  if (kind==='cage'||kind==='crate'||kind==='barrel') {o.hp=options.hp||60;o.maxHp=o.hp;o.shootable=true;}
  s.objects.push(o); return o;
}
export function updateObjects(s,dt) {
  for (const o of s.objects) {
    // A terminal loss cannot be undone for free by the next object in this row.
    if (!s.units.length) break;
    const previousZ=o.z; o.z-=s.speed*dt; o.age+=dt;
    if(o.kind==='saw') o.x=clamp(o.baseX+Math.sin(o.age*1.2)*1.7,-4.9,4.9);
    if(o.kind==='gate' && previousZ>0 && o.z<=0 && !s.claimed.has(o.row) && Math.abs(s.x-o.x)<o.width/2) {
      s.claimed.add(o.row); applyGate(s,o); o.claimed=true; s.stats.gates++;
    }
    if(o.kind==='pickup' && previousZ>.05 && o.z<=.05 && Math.abs(s.x-o.x)<1.1) {
      const n=recruit(s,o.unit||'rifleman',Math.round((o.count||5)*s.mods.recruit));
      s.notice(n?`СПАСЕНО +${n}`:'АРМИЯ УКОМПЛЕКТОВАНА • 120'); s.sound('pickup'); s.stats.rescued+=n; o.dead=true;
    }
    // Hazards hit actual body positions, unlike squad-wide arithmetic gates.
    if(['mine','spikes','saw','laser'].includes(o.kind)) {
      const active=o.kind==='laser'?o.age%3>1:o.kind==='spikes'?o.age%3.2>1.2:true;
      o.active=active;
      const shape=o.kind==='laser'?{shape:'rect',x:o.x,z:o.z,width:2.5,depth:.35}:{x:o.x,z:o.z,radius:o.kind==='saw'?.8:.7};
      if(active && (o.quota ?? 5)>o.hit.size) {
        const hadLastStand=s.lastStandUsed;
        const lost=damageArea(s,shape,0,(o.quota??5)-o.hit.size,o.hit);
        if(lost) {if(s.lastStandUsed===hadLastStand)s.notice(`ЛОВУШКА: −${lost}`);s.sound('hurt');if(o.kind==='mine'){o.dead=true;s.effect({kind:'blast',x:o.x,z:o.z,radius:1.2,ttl:.45,color:'#ffa543'});}}
      }
    }
    if(o.z< -7) o.dead=true;
  }
  s.objects=s.objects.filter(o=>!o.dead);
  // Bound row bookkeeping during endless runs.
  const rows=new Set(s.objects.map(o=>o.row)); for(const row of s.claimed) if(!rows.has(row)) s.claimed.delete(row);
}
export function breakObject(s,o) {
  if(!o.shootable||o.dead||o.hp>0) return;
  o.shootable=false;
  if(o.kind==='barrel') {o.dead=true;s.blast(o.x,o.z,2.5,75);damageArea(s,{x:o.x,z:o.z,radius:2.5},50);return;}
  o.kind='pickup'; s.effect({kind:'blast',x:o.x,z:o.z,radius:1,ttl:.35,color:'#5af7d0'});s.sound('break');
  s.notice('КОНТЕЙНЕР ОТКРЫТ • ПОДБЕРИ ОТРЯД');
}
