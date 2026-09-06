import {formation,inside,clamp}from'../src/sim/rules.js';
const preference=['recruit','caliber','drum','veteran','meds','execution','network','armor','laststand','tesla','fire','reaction','quantum','shrapnel','capacitor'];
export function drive(s){
  if(s.phase==='choice'){const rank=a=>preference.includes(a.id)?preference.indexOf(a.id):99;const a=[...s.choices].sort((a,b)=>rank(a)-rank(b))[0];s.addArtifact(a.id);return;}
  let goal=s.targetX;
  const prizes=s.objects.filter(o=>o.z>0&&!o.dead&&!s.claimed.has(o.row)&&(['pickup','cage','crate'].includes(o.kind)||o.kind==='gate'&&!['divide','subtract'].includes(o.op)));
  const worth=o=>o.op==='multiply'?s.units.length:o.op==='tier'?10:o.value||o.count||4;
  prizes.sort((a,b)=>Math.abs(a.z-b.z)<.1?worth(b)-worth(a):a.z-b.z);
  if(prizes[0]&&prizes[0].z<34)goal=clamp(prizes[0].x,-3.5,3.5);
  if(s.bossStarted&&s.bosses.length)goal=clamp([...s.bosses].sort((a,b)=>Math.abs(a.x-s.x)-Math.abs(b.x-s.x))[0].x,-3.5,3.5);
  const hazards=s.objects.filter(o=>['mine','saw','spikes','laser'].includes(o.kind)&&o.z<5&&o.z>-5),danger=s.warnings.filter(w=>w.age<w.delay+.2);
  if(hazards.length||danger.length){const cost=x=>{let risk=0;for(let i=0;i<s.units.length;i++){const u=formation(i,s.units.length,x);for(const w of danger)if(inside(u,w,.25))risk+=5;for(const o of hazards)if(inside(u,{...o,z:Math.max(-3,o.z-1),radius:o.kind==='saw'?1:.8},.3))risk+=2;}return risk+Math.abs(x-goal)*.1;};goal=[-3.5,0,3.5].sort((a,b)=>cost(a)-cost(b))[0];}
  s.targetX=goal;if(s.cooldown<=0&&(s.enemies.length>20||s.bossStarted))s.ability();
}
