import { UNITS } from '../data/catalog.js';
import { LIMITS, clamp, formation, gateCount, inside } from './rules.js';
export function recruit(s, type, requested, copy = null) {
  if (!UNITS[type]) throw new Error(`Unknown troop: ${type}`);
  const count = clamp(Math.floor(requested), 0, LIMITS.army - s.units.length);
  for (let i = 0; i < count; i++) {
    const maxHp = UNITS[type].hp * (s.mods.health || 1);
    const p = formation(s.units.length, s.units.length + 1, s.x);
    s.units.push({id:s.id++,kind:'ally',type,x:s.x,z:-1,hp:copy ? maxHp * copy.hp / copy.maxHp : maxHp,maxHp,
      cd:s.rng.range(0,.3),born:s.time,phase:s.rng.range(0,7),flash:0,target:p});
  }
  s.stats.recruited += count;
  return count;
}
export function removeTroops(s, ids, reason = 'combat') {
  const remove = new Set(ids), fallen = s.units.filter(u => remove.has(u.id));
  if (!fallen.length) return 0;
  s.units = s.units.filter(u => !remove.has(u.id));
  s.stats.lost += fallen.length;
  if (reason === 'trap') s.stats.trapLoss += fallen.length;
  s.fallen.push(...fallen.map(u => u.type));
  s.fallen = s.fallen.slice(-120);
  for (const u of fallen.slice(0,12)) s.effect({kind:'pop',x:u.x,z:u.z,color:'#ef6570',text:'−1',ttl:.8});
  return fallen.length;
}
export function applyGate(s, o) {
  const before = s.units.length;
  if (o.op === 'tier') { s.tier = Math.min(3,s.tier + 1); s.notice(`ОРУЖИЕ • УРОВЕНЬ ${s.tier}`); return; }
  if (o.op === 'buff') { s.buffUntil = s.time + 10; s.notice('ФОРСАЖ • 10 СЕКУНД'); return; }
  const value = o.op === 'add' ? Math.round(o.value * s.mods.recruit) : o.value;
  const after = gateCount(before,o.op,value);
  if (after < before) removeTroops(s,s.units.slice(0,before-after).map(u=>u.id),'trap');
  else if (o.op === 'multiply' && before) {
    // Clone only the pre-gate snapshot. Preserve health ratios; multiplication is not healing.
    const originals = [...s.units];
    for (let i=0;i<after-before;i++) {const source=originals[i%originals.length]; recruit(s,source.type,1,source);}
  } else recruit(s,o.unit || 'rifleman',after-before);
  const delta = s.units.length-before;
  s.notice(delta ? `${delta>0?'+':''}${delta} БОЙЦОВ` : 'МАКСИМУМ 120');
  s.sound(delta<0?'hurt':'pickup');
}
export function damageArea(s, shape, amount, lethalQuota = 0, alreadyHit = null) {
  const touched=s.units.filter(u=>inside(u,shape,.16)&&(!alreadyHit||!alreadyHit.has(u.id)));
  const victims=lethalQuota?touched.slice(0,lethalQuota):touched;
  for (const u of victims) {
    if (alreadyHit) alreadyHit.add(u.id);
    if (!lethalQuota) u.hp-=amount*s.mods.defense*(s.shieldUntil>s.time?.35:1)*(1-(UNITS[u.type].armor||0));
  }
  if (lethalQuota) return removeTroops(s,victims.map(u=>u.id),'trap');
  return victims.length;
}
