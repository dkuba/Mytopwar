import { UNITS, ENEMIES, ARTIFACTS, COMMANDERS } from '../data/catalog.js';
import { LEVELS, ENEMY_COST, timeline } from '../data/campaign.js';
import { LIMITS, Random, Grid, clamp, distance2, formation, isAlive } from './rules.js';
import { recruit, removeTroops, damageArea } from './army.js';
import { spawnRow, spawnObject, updateObjects, breakObject } from './world.js';
import { spawnBoss, updateBosses } from './bosses.js';

/** Authoritative simulation. No DOM, viewport dimensions, wall-clock timers or network. */
export class Simulation {
  constructor({level=1,mode='campaign',seed=1,commander='captain',training=0,medicine=0}={}) {
    this.id=1;this.level=clamp(level,1,12);this.sector=this.level;this.mode=mode;
    this.commander=COMMANDERS[commander]?commander:'captain';this.medicine=clamp(medicine,0,3);
    this.rng=new Random(seed);this.seed=seed;this.phase='running';this.time=0;this.stageTime=0;this.distance=0;
    this.x=0;this.targetX=0;this.tier=1;this.speed=5.5;this.cooldown=0;this.buffUntil=0;this.shieldUntil=0;
    this.mods={damage:1,rate:1,health:1,defense:1,recruit:1,boss:1,chain:1};
    this.units=[];this.enemies=[];this.bosses=[];this.parts=[];this.objects=[];this.warnings=[];this.projectiles=[];this.effects=[];this.sounds=[];
    this.fallen=[];this.graveyard=[];this.claimed=new Set();this.artifacts=[];this.choices=[];this.grid=new Grid();
    this.stats={recruited:0,lost:0,trapLoss:0,kills:0,gates:0,rescued:0,damage:0,shots:0,bosses:0};
    this.message={text:'ВЕДИ ОТРЯД • СОБИРАЙ СИНИЕ ВОРОТА',until:6};this.lastStandUsed=false;this.aegisAt=20;
    this.setSector();for(const type of COMMANDERS[this.commander].start)recruit(this,type,1);recruit(this,'rifleman',clamp(training,0,3));
  }
  setSector() {this.definition=LEVELS[(this.sector-1)%12];this.events=timeline(this.sector);this.eventIndex=0;this.stageTime=0;this.bossStarted=false;this.speed=5.5;}
  effect(e) {if(this.effects.length>=LIMITS.effects)this.effects.splice(0,24);this.effects.push({...e,total:e.ttl||.15,ttl:e.ttl||.15});}
  notice(text,duration=2.7) {this.message={text,until:this.time+duration};}
  sound(kind) {if(this.sounds.length<16)this.sounds.push(kind);}
  pause() {if(this.phase==='running')this.phase='paused';}
  resume() {if(this.phase==='paused')this.phase='running';}
  power() {const support=this.mods.network?1+Math.min(.3,this.units.filter(u=>UNITS[u.type].support).length*.05):1;return this.mods.damage*(1+(this.tier-1)*.3)*support;}
  addArtifact(id) {
    if(this.phase!=='choice'||!this.choices.some(a=>a.id===id))return false;
    if(id==='supply') {recruit(this,'rifleman',8);this.units.forEach(u=>u.hp=u.maxHp);}
    else {
      const a=ARTIFACTS.find(v=>v.id===id);if(!a||this.artifacts.includes(id))return false;
      this.artifacts.push(id);
      if(a.mod==='veteran'){this.mods.damage*=1.25;this.mods.health*=1.25;for(const u of this.units){u.hp*=1.25;u.maxHp*=1.25;}}
      else if(['damage','rate','defense','recruit','boss','chain'].includes(a.mod))this.mods[a.mod]*=a.value;
      else this.mods[a.mod]=(this.mods[a.mod]||0)+a.value;
    }
    this.choices=[];this.phase='running';this.notice('АРТЕФАКТ ПОЛУЧЕН');this.sound('pickup');return true;
  }
  offerArtifacts() {
    this.choices=this.rng.shuffle(ARTIFACTS.filter(a=>!this.artifacts.includes(a.id))).slice(0,3);
    if(!this.choices.length)this.choices=[{id:'supply',name:'Полевое снабжение',rarity:'Припасы',description:'+8 стрелков и полное лечение.',tag:'ARMY'}];
    this.phase='choice';
  }
  ability() {
    if(this.phase!=='running'||this.cooldown>0||this.jammed)return false;
    this.cooldown=24;this.sound('ability');
    if(this.commander==='captain')this.buffUntil=this.time+6;
    if(this.commander==='medic'){for(const u of this.units)u.hp=Math.min(u.maxHp,u.hp+u.maxHp*.45);this.shieldUntil=this.time+4;}
    if(this.commander==='artillery')for(const z of [8,14,20])this.blast(this.x,z,3.2,95*this.power());
    this.notice(COMMANDERS[this.commander].ability.toUpperCase());return true;
  }
  spawnEnemy(type,x,z,scale=1) {
    if(this.enemies.length>=LIMITS.enemies)return null;
    const d=ENEMIES[type];if(!d)throw Error(`Unknown enemy ${type}`);
    const hp=d.hp*scale*(1+Math.min(.7,(this.sector-1)*.025));
    const e={id:this.id++,kind:'enemy',type,x:clamp(x,-5.4,5.4),z,hp,maxHp:hp,radius:d.radius,armor:d.armor||0,age:0,cd:1,specialCd:3,
      speed:d.speed*(1+Math.min(.35,(this.sector-1)*.012)),phase:this.rng.range(0,6),slot:this.rng.range(-1.6,1.6),hidden:false};
    this.enemies.push(e);return e;
  }
  spawnWave(e) {
    let budget=e.budget,i=0;
    while(budget>=.6&&i<400){let type=this.rng.pick(e.pool);if(ENEMY_COST[type]>budget)type=budget>=1?'grunt':'swarmer';budget-=ENEMY_COST[type];
      const x=e.shape==='flank'?(i%2?1:-1)*(3+this.rng.range(-.7,.7)):(i%12-5.5)*.76;
      this.spawnEnemy(type,x,32+Math.floor(i/12)*.67+this.rng.range(0,.25));i++;}
    if(e.budget>100)this.notice('ОРДА НА ПОДХОДЕ');
  }
  warn(w) {if(this.warnings.length<32)this.warnings.push({id:this.id++,age:0,...w});}
  step(dt=1/60) {
    if(this.phase!=='running'||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,1/30);
    this.time+=dt;this.stageTime+=dt;this.distance+=this.speed*dt;
    this.x+=clamp(this.targetX-this.x,-5.2*dt,5.2*dt);this.x=clamp(this.x,-3.5,3.5);this.cooldown=Math.max(0,this.cooldown-dt);
    while(this.eventIndex<this.events.length&&this.stageTime>=this.events[this.eventIndex].at){
      const e=this.events[this.eventIndex++];
      if(e.type==='row')spawnRow(this,e.choices);
      if(e.type==='object')spawnObject(this,e.kind,e.lane,e.options);
      if(e.type==='wave')this.spawnWave(e);
      if(e.type==='boss'){this.bossStarted=true;this.speed=0;spawnBoss(this,this.definition.boss);}
      if(e.type==='artifact'){this.offerArtifacts();return;}
    }
    updateObjects(this,dt);
    this.jammed=this.enemies.some(e=>isAlive(e)&&e.type==='jammer'&&e.z<9&&Math.abs(e.x-this.x)<4);
    if(this.mods.aegis&&this.time>=this.aegisAt){this.aegisAt=this.time+20;this.shieldUntil=this.time+4;this.notice('ЩИТ ЭГИДЫ');}
    this.grid.rebuild([...this.enemies,...this.bosses,...this.parts,...this.objects.filter(o=>o.shootable)]);
    this.updateArmy(dt);this.updateEnemies(dt);updateBosses(this,dt);this.updateWarnings(dt);this.updateProjectiles(dt);this.cleanup();
    for(const fx of this.effects)fx.ttl-=dt;this.effects=this.effects.filter(e=>e.ttl>0);
    if(!this.units.length){this.phase='defeat';this.sound('defeat');}
    else if(this.bossStarted&&!this.bosses.length&&!this.enemies.length){
      if(this.mode==='endless'){this.sector++;this.setSector();this.objects=[];this.warnings=[];this.parts=[];this.projectiles=[];this.notice(`СЕКТОР ${this.sector}`);}
      else{this.phase='victory';this.sound('victory');}
    }
  }
  updateArmy(dt) {
    const hpRatio=this.units.reduce((a,u)=>a+u.hp,0)/Math.max(1,this.units.reduce((a,u)=>a+u.maxHp,0));
    const rank=u=>u.type==='shield'?0:UNITS[u.type].support?3:u.type==='sniper'?2:1;
    this.units.sort((a,b)=>rank(a)-rank(b)||a.id-b.id);
    for(let i=0;i<this.units.length;i++){
      const u=this.units[i],d=UNITS[u.type],p=formation(i,this.units.length,this.x);
      u.x+=(p.x-u.x)*Math.min(1,dt*12);u.z+=(p.z-u.z)*Math.min(1,dt*12);u.cd-=dt;u.flash=Math.max(0,u.flash-dt);
      u.hp=Math.min(u.maxHp,u.hp+(this.mods.regen||0)*u.maxHp*dt);
      if(u.type==='medic'){const ally=this.units.filter(v=>v.hp<v.maxHp).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];if(ally)ally.hp=Math.min(ally.maxHp,ally.hp+(5+this.medicine)*dt);}
      if(u.hp<=0||(u.type==='drone'&&this.jammed))continue;
      if(u.cd<=0){const t=this.target(u,d);if(t){this.fire(u,t,d);u.flash=.07;u.cd=1/(d.rate*this.mods.rate*(this.buffUntil>this.time?1.7:1)*(this.mods.overdrive&&hpRatio<.4?1.65:1)*(this.jammed?.9:1));}}
    }
  }
  target(u,d) {
    let best=null,score=Infinity;
    for(const e of this.grid.near(u.x,u.z+d.range/2,d.range/2+3)){
      if(!isAlive(e)||e.hidden||e.z<u.z-.5||distance2(u,e)>d.range*d.range)continue;
      if(Math.abs(e.x-u.x)>.9+(e.z-u.z)*.22)continue;
      const priority=e.shootable&&Math.abs(e.x-this.x)<1.3?-900:d.mode==='sniper'&&(e.kind==='boss'||e.kind==='part'||ENEMIES[e.type]?.elite)?-400:0;
      const value=distance2(u,e)+priority;if(value<score){score=value;best=e;}
    }
    return best;
  }
  fire(u,t,d) {
    this.stats.shots++;const damage=d.damage*this.power();this.sound('shot');
    this.effect({kind:'shot',x:u.x,z:u.z,tx:t.x,tz:t.z,color:d.mode==='tesla'?'#8fe9ff':'#ffe78c',ttl:.09});
    if(d.mode==='rocket'||d.mode==='grenade'){
      if(this.projectiles.length<256)this.projectiles.push({kind:d.mode,x:u.x,z:u.z,tx:t.x,tz:t.z,age:0,duration:d.mode==='rocket'?.3:.5,radius:d.radius,damage});
    }else if(d.mode==='tesla'){this.hit(t,damage);this.chain(t,damage*.7*this.mods.chain,3);}
    else if(d.mode==='shotgun'||d.mode==='flame'){
      const group=[...new Set([t,...this.grid.near(u.x,u.z+5,10)])].filter(e=>isAlive(e)&&!e.hidden&&e.z>=u.z-.3&&e.z-u.z<d.range&&Math.abs(e.x-u.x)<.5+(e.z-u.z)*.3).slice(0,d.mode==='shotgun'?7:14);
      for(const e of group){this.hit(e,damage);if(d.mode==='flame')this.ignite(e,damage*.6);}
    }else{
      this.hit(t,damage,d.pierce||0);
      if(this.mods.pierce)for(const e of this.grid.near(t.x,t.z+2,5).filter(e=>e!==t&&isAlive(e)&&e.z>t.z&&Math.abs(e.x-t.x)<.6).sort((a,b)=>a.z-b.z).slice(0,this.mods.pierce))this.hit(e,damage*.75,d.pierce||0);
    }
    if(this.mods.fire&&this.stats.shots%3===0)this.ignite(t,3*this.power());
    if(this.mods.cryo)t.slowUntil=this.time+1;
    if(this.mods.ricochet&&this.stats.shots%3===0)this.chain(t,damage*.6*this.mods.chain,1);
    if(this.mods.tesla&&this.stats.shots%12===0)this.chain(t,8*this.power()*this.mods.chain,5);
    if(this.mods.quantum&&this.stats.shots%5===0)this.hit(t,damage*.8);
  }
  ignite(t,dps){t.burnUntil=this.time+(this.mods.napalm?6:3);t.burnDps=Math.max(t.burnDps||0,dps);}
  hit(t,damage,pierce=0){
    if(!t||!isAlive(t)||t.hidden)return;
    const elite=t.kind==='boss'||t.kind==='part'||ENEMIES[t.type]?.elite;
    const dealt=Math.min(t.hp,Math.max(0,damage)*(1-clamp((t.armor||0)-pierce,0,.9))*(elite?this.mods.boss:1));
    t.hp-=dealt;this.stats.damage+=dealt;t.hitAt=this.time;
  }
  chain(origin,damage,count){
    const visited=new Set([origin.id]);let from=origin;
    for(let i=0;i<count;i++){
      const next=this.grid.near(from.x,from.z,4).filter(e=>!e.shootable&&isAlive(e)&&!e.hidden&&!visited.has(e.id)&&distance2(from,e)<16).sort((a,b)=>distance2(from,a)-distance2(from,b))[0];
      if(!next)break;visited.add(next.id);this.hit(next,damage);this.effect({kind:'shot',x:from.x,z:from.z,tx:next.x,tz:next.z,color:'#91eeff',ttl:.14});from=next;
    }
  }
  blast(x,z,radius,damage,fragments=false){
    for(const e of [...this.enemies,...this.bosses,...this.parts,...this.objects.filter(o=>o.shootable)]){
      if(distance2({x,z},e)<(radius+(e.radius||.5))**2)this.hit(e,damage);
      else if(fragments&&this.mods.shrapnel&&distance2({x,z},e)<(radius+1.8)**2)this.hit(e,damage*.4);
    }
    this.effect({kind:'blast',x,z,radius,ttl:.42,color:'#ffc051'});this.sound('blast');
  }
  updateEnemies(dt){
    for(const e of [...this.enemies]){
      if(!isAlive(e))continue;const d=ENEMIES[e.type];e.age+=dt;e.cd-=dt;e.specialCd-=dt;
      if(e.burnUntil>this.time)this.hit(e,(e.burnDps||0)*dt);
      const slow=e.slowUntil>this.time||this.mods.napalm&&e.burnUntil>this.time?.75:1;
      if(e.type==='burrower'&&e.age<2.7){e.hidden=true;e.z-=e.speed*dt;continue;}e.hidden=false;
      if(e.type==='medic'&&e.specialCd<=0){for(const v of this.grid.near(e.x,e.z,3))if(v.kind==='enemy'&&isAlive(v)&&distance2(e,v)<9)v.hp=Math.min(v.maxHp,v.hp+3);e.specialCd=1.5;}
      if(e.type==='necromancer'&&e.specialCd<=0){for(let i=0;i<3;i++)this.spawnEnemy('swarmer',e.x+(i-1)*.5,e.z+1,.7);e.specialCd=6;}
      const target=e.z<18?this.units.reduce((a,u)=>!a||distance2(e,u)<distance2(e,a)?u:a,null):null;
      if(e.type==='sniper'&&target&&e.z<16){if(e.cd<=0){if(this.projectiles.length<256)this.projectiles.push({kind:'enemy',x:e.x,z:e.z,tx:target.x,tz:target.z,age:0,duration:1.4,radius:.55,damage:d.damage});e.cd=3;}continue;}
      if(target&&distance2(e,target)<.85**2){
        if(e.type==='bomber'){damageArea(this,{x:e.x,z:e.z,radius:1.6},d.damage);e.hp=0;this.effect({kind:'blast',x:e.x,z:e.z,radius:1.6,ttl:.4,color:'#ff9353'});}
        else if(e.cd<=0){const buff=this.enemies.some(v=>isAlive(v)&&v.type==='commander'&&distance2(v,e)<16)?1.25:1;target.hp-=d.damage*buff*this.mods.defense*(this.shieldUntil>this.time?.35:1)*(1-(UNITS[target.type].armor||0));e.cd=1;}
      }else{
        const goalX=target&&e.z<3?target.x:this.x+e.slot;e.x+=clamp(goalX-e.x,-e.speed*.45*dt,e.speed*.45*dt);
        if(target&&e.z<3)e.z+=clamp(target.z-e.z,-e.speed*slow*dt,e.speed*slow*dt);else e.z-=e.speed*slow*dt;
      }
    }
    for(const b of this.bosses)if(b.burnUntil>this.time&&!b.hidden)this.hit(b,(b.burnDps||0)*dt);
  }
  updateWarnings(dt){
    for(const w of this.warnings){w.age+=dt;if(w.age>=w.delay&&!w.applied){w.applied=true;damageArea(this,w,w.damage);this.effect({kind:'blast',x:w.x,z:w.z,radius:w.radius||1.5,ttl:.45,color:'#ff9353'});this.sound('blast');
      if(w.charge){const b=this.bosses.find(b=>b.id===w.source);if(b){b.x=w.x;b.returnTime=this.time+.7;}}}
      if(w.applied&&w.puddle&&w.age<w.delay+w.puddle)damageArea(this,w,8*dt);
    }
    this.warnings=this.warnings.filter(w=>w.age<w.delay+(w.puddle||.3));
  }
  updateProjectiles(dt){for(const p of this.projectiles){p.age+=dt;if(p.age>=p.duration&&!p.done){p.done=true;if(p.kind==='enemy')damageArea(this,{x:p.tx,z:p.tz,radius:p.radius},p.damage);else this.blast(p.tx,p.tz,p.radius,p.damage,true);}}this.projectiles=this.projectiles.filter(p=>!p.done);}
  cleanup(){
    for(const o of this.objects)if(o.hp<=0)breakObject(this,o);
    // Stable snapshot: children and resurrection cannot mutate the current death iteration.
    for(const e of [...this.enemies])if(e.hp<=0&&!e.dead){e.dead=true;this.stats.kills++;this.graveyard.push({type:e.type,x:e.x});this.effect({kind:'pop',x:e.x,z:e.z,color:ENEMIES[e.type].color,ttl:.3});
      if(e.type==='splitter')for(let i=0;i<3;i++)this.spawnEnemy('swarmer',e.x+(i-1)*.35,e.z,.7);
      if(this.mods.reaction&&e.burnUntil>this.time)this.blast(e.x,e.z,1.5,12*this.power());
      if(this.mods.payload&&this.stats.kills%16===0)this.blast(e.x,e.z,2,18*this.power());
      if(this.mods.armageddon&&this.stats.kills%80===0){for(const v of this.enemies)this.hit(v,18*this.power());this.notice('АРМАГЕДДОН');this.sound('blast');}
    }
    // Preserve earlier-in-array victims of later chain explosions for the next cleanup tick.
    this.graveyard=this.graveyard.slice(-120);this.enemies=this.enemies.filter(e=>!e.dead);
    for(const p of this.parts)if(p.hp<=0&&!p.dead){p.dead=true;const b=this.bosses.find(b=>b.id===p.parent);if(b)b.hp=Math.max(0,b.hp-b.maxHp*.1);this.notice('ОРУДИЕ УНИЧТОЖЕНО');this.blast(p.x,p.z,1,0);}this.parts=this.parts.filter(isAlive);
    for(const b of this.bosses)if(b.hp<=0&&!b.dead){b.dead=true;this.stats.bosses++;this.blast(b.x,b.z,3,0);this.parts=this.parts.filter(p=>p.parent!==b.id);}this.bosses=this.bosses.filter(isAlive);
    removeTroops(this,this.units.filter(u=>u.hp<=0).map(u=>u.id));
  }
}
