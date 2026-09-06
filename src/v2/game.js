import{UNITS,ENEMIES,BOSSES,COMMANDERS,ARTIFACTS,LEVELS}from'./data.js';
import{LIMITS,clamp,d2,alive,Random,Grid,formation,inside,gateCount}from'./rules.js';
import{makeTimeline,waveRoster,endlessLevel}from'./director.js';
/** Pure fixed-step game state. No DOM, timers or screen-size-dependent combat. */
export class Game{
 constructor({level=0,mode='campaign',commander='captain',training=0,medicine=0,seed=17,sound=()=>{}}={}){
  this.mode=mode;this.levelIndex=clamp(level,0,11);this.round=0;this.commander=COMMANDERS[commander]?commander:'captain';
  this.level=LEVELS[this.levelIndex];this.rng=new Random(seed+level*8191);this.id=1;this.time=0;this.runTime=0;this.x=0;this.targetX=0;this.status='running';this.sound=sound;
  this.units=[];this.enemies=[];this.objects=[];this.effects=[];this.projectiles=[];this.zones=[];this.fallen=[];this.corpses=[];
  this.grid=new Grid();this.artifacts=[];this.choices=[];this.collectedGroups=new Set();this.bossStarted=false;this.bossTime=0;this.tier=1;this.cooldown=0;this.buffUntil=0;this.shieldUntil=0;this.usedLastStand=false;this.banner='Собирай синие ворота. Красные отнимают бойцов.';this.bannerUntil=7;this.healTick=0;this.nextAegis=20;this.eventIndex=0;
  this.mods={damage:1,rate:1,defense:1,health:1+clamp(medicine,0,3)*.05,recruit:1,chain:1,boss:1,regen:0};
  this.stats={kills:0,shots:0,recruited:0,lost:0,trapLoss:0,crates:0,gates:0,damage:0,bosses:0};
  for(const t of COMMANDERS[this.commander].start)this.recruit(t,1);
  this.recruit('rifleman',clamp(training,0,3));this.timeline=makeTimeline(this.level);this.updateFormation(1);
 }
 notice(text){this.banner=text;this.bannerUntil=this.time+3;}
 effect(e){if(this.effects.length<LIMITS.effects)this.effects.push({...e,life:e.ttl||.4,ttl:e.ttl||.4});}
 recruit(type,n,copy=null){
  if(!UNITS[type])throw Error(`Unknown unit ${type}`);n=clamp(Math.floor(n),0,LIMITS.army-this.units.length);
  for(let i=0;i<n;i++){const maxHp=UNITS[type].hp*this.mods.health;this.units.push({id:this.id++,kind:'ally',type,x:this.x,z:-1,hp:copy?maxHp*copy.hp/copy.maxHp:maxHp,maxHp,cd:this.rng.range(0,.4),born:this.time,phase:this.rng.range(0,7),flash:0});}
  this.stats.recruited+=n;return n;
 }
 remove(ids,reason='combat'){
  const set=new Set(ids),dead=this.units.filter(u=>set.has(u.id));this.units=this.units.filter(u=>!set.has(u.id));
  this.stats.lost+=dead.length;if(reason==='trap')this.stats.trapLoss+=dead.length;this.fallen.push(...dead.map(u=>u.type));this.fallen=this.fallen.slice(-120);
  for(const u of dead.slice(0,12))this.effect({kind:'pop',x:u.x,z:u.z,color:'#eb646b',text:'−1',ttl:.8});return dead.length;
 }
 applyGate(o){
  const before=this.units.length;
  if(o.op==='tier'){this.tier=Math.min(3,this.tier+1);this.notice(`ОРУЖИЕ • УРОВЕНЬ ${this.tier}`);return;}
  if(o.op==='buff'){this.buffUntil=this.time+10;this.notice('ФОРСАЖ • 10 СЕКУНД');return;}
  const n=gateCount(before,o.op,o.op==='add'?Math.round(o.value*this.mods.recruit):o.value);
  if(n<before)this.remove(this.units.slice(0,before-n).map(u=>u.id),'trap');
  else if(o.op==='multiply'&&before){const snapshot=[...this.units];for(let i=0;i<n-before;i++){const u=snapshot[i%snapshot.length];this.recruit(u.type,1,u);}}
  else this.recruit(o.unit||'rifleman',n-before);
  const delta=this.units.length-before;this.notice(delta?`${delta>0?'+':''}${delta} БОЙЦОВ`:'МАКСИМУМ 120');this.sound(delta<0?'hurt':'pickup');
  this.effect({kind:'pop',x:o.x,z:0,color:delta<0?'#ee6368':'#2bca8a',text:delta>0?`+${delta}`:`${delta}`,ttl:1});
 }
 row(items,z=30){const group=this.id++;for(const o of items){if(this.objects.length>=LIMITS.objects)break;this.objects.push({...o,id:this.id++,group,z,prevZ:z,speed:3.8,age:0,hit:new Set(),opened:false});}}
 applyArtifact(id){
  if(this.artifacts.includes(id))return false;const a=ARTIFACTS.find(a=>a.id===id);if(!a)return false;
  this.artifacts.push(id);
  if(a.mod==='veteran'){this.mods.damage*=1.25;this.mods.health*=1.25;for(const u of this.units){u.maxHp*=1.25;u.hp*=1.25;}}
  else if(['damage','rate','defense','recruit','chain','boss'].includes(a.mod))this.mods[a.mod]*=a.value;
  else this.mods[a.mod]=(this.mods[a.mod]||0)+a.value;
  return true;
 }
 choose(id){if(this.status!=='choice'||!this.choices.some(a=>a.id===id))return false;this.applyArtifact(id);this.choices=[];this.status='running';this.sound('pickup');return true;}
 offerArtifact(){const pool=ARTIFACTS.filter(a=>!this.artifacts.includes(a.id));if(!pool.length){this.recruit('rifleman',6);return;}this.choices=this.rng.shuffle(pool).slice(0,3);this.status='choice';}
 spawn(type,x=null,z=32){
  if(this.enemies.length>=LIMITS.enemies)return;const d=ENEMIES[type];if(!d)throw Error(`Unknown enemy ${type}`);const hp=d.hp*(1+(this.level.difficulty-1)*.32);
  this.enemies.push({id:this.id++,kind:'enemy',type,x:x??this.rng.range(-5.2,5.2),z,hp,maxHp:hp,radius:d.radius,cd:1,age:0,burn:0,burnDps:0,slow:0,summon:4,phase:this.rng.range(0,7)});
 }
 spawnBoss(id=this.level.boss){
  const d=BOSSES[id];const count=id==='twins'?2:1;
  for(let i=0;i<count;i++){
   const hp=d.hp*4*(1+Math.max(0,this.levelIndex-8)*.06+(this.mode==='endless'?this.round*.04:0))/count;
   const b={id:this.id++,kind:'boss',type:id,x:count===2?(i===0?-2.8:2.8):0,z:18,hp,maxHp:hp,radius:1.35,cd:2.8,age:0,phase:1,burn:0,burnDps:0,slow:0,hidden:false};
   this.enemies.push(b);
   if(id==='walker'||id==='tank')for(const side of [-1,1])this.enemies.push({id:this.id++,kind:'part',type:'gun',owner:b.id,side,x:b.x+side*1.5,z:b.z,hp:hp*.15,maxHp:hp*.15,radius:.5,burn:0,burnDps:0,slow:0});
  }
  this.bossStarted=true;this.bossTime=this.time;this.notice(d.hint);this.sound('boss');
  if(this.mods.phoenix){const n=Math.min(4,this.fallen.length);for(let i=0;i<n;i++)this.recruit(this.fallen.pop(),1);}
 }
 updateFormation(dt){
  // Position is based on the smoothed actual center, never the desired pointer position.
  this.x+=(clamp(this.targetX,-3.5,3.5)-this.x)*Math.min(1,dt*11);
  const frontline={shield:0,shotgun:1,flamethrower:1,rifleman:2,smg:2,machinegun:3,grenadier:3,rocket:3,sniper:4,tesla:3,drone:5,medic:5};
  this.units.sort((a,b)=>frontline[a.type]-frontline[b.type]||a.id-b.id);
  this.units.forEach((u,i)=>{const p=formation(i,this.units.length,this.x);u.x+=(p.x-u.x)*Math.min(1,dt*14);u.z+=(p.z-u.z)*Math.min(1,dt*14);u.flash=Math.max(0,u.flash-dt);});
 }
 update(dt){
  if(this.status!=='running')return;if(!(dt>0&&dt<=.05))throw Error('Use a fixed step <= 0.05 seconds');
  const previous=[...this.units];this.time+=dt;this.runTime+=dt;this.cooldown=Math.max(0,this.cooldown-dt);this.updateFormation(dt);
  while(!this.bossStarted&&this.eventIndex<this.timeline.length&&this.time>=this.timeline[this.eventIndex].at){
   const ev=this.timeline[this.eventIndex++];
   if(ev.kind==='row')this.row(ev.items);
   if(ev.kind==='wave'){const roster=waveRoster(this.rng,ev.pool,ev.budget);roster.forEach((t,i)=>this.spawn(t,((i%12)-5.5)*.83+this.rng.range(-.15,.15),30+Math.floor(i/12)*.65));}
   if(ev.kind==='artifact'){this.offerArtifact();if(this.status==='choice')return;}
  }
  this.updateObjects(dt);this.grid.rebuild(this.enemies);this.updateUnits(dt);this.updateEnemies(dt);this.updateZones(dt);this.updateProjectiles(dt);this.cleanup();
  for(const e of this.effects)e.life-=dt;this.effects=this.effects.filter(e=>e.life>0);
  if(!this.units.length){
   if(this.mods.laststand&&!this.usedLastStand&&previous.length){this.usedLastStand=true;for(const u of previous.slice(0,Math.max(1,Math.ceil(previous.length/4))))this.recruit(u.type,1);this.shieldUntil=this.time+3;this.notice('ВТОРОЙ ШАНС');}
   else{this.status='defeat';return;}
  }
  if(!this.bossStarted&&this.time>=this.level.duration&&this.objects.every(o=>o.z<-.6)&&!this.enemies.some(alive))this.spawnBoss();
  if(this.bossStarted&&!this.enemies.some(e=>e.kind==='boss'&&alive(e))){
   this.enemies=[];this.zones=[];this.stats.bosses++;
   if(this.mode==='endless'){this.round++;this.level=endlessLevel(this.round);this.levelIndex=this.level.id;this.time=0;this.eventIndex=0;this.bossStarted=false;this.collectedGroups.clear();this.timeline=makeTimeline(this.level,this.round);this.nextAegis=20;this.buffUntil=0;this.shieldUntil=0;this.notice(`ВОЛНА ${this.round+1}`);}
   else this.status='victory';
  }
 }
 updateObjects(dt){
  for(const o of this.objects){
   if(o.done)continue;o.prevZ=o.z;o.z-=o.speed*dt;o.age+=dt;
   if(o.kind==='barrel'){if(this.units.some(u=>inside(u,o,.15))){this.hit(o,9999);}}
   else if(o.kind==='hazard'){
    if(o.type==='saw')o.x=clamp(o.x+Math.sin(o.age*1.8)*dt*1.5,-4.5,4.5);
    const active=o.type!=='laser'||(o.age%3.6)>1.3;
    if(active){const hit=this.units.filter(u=>inside(u,o,.18)&&!o.hit.has(u.id));if(hit.length){
     const victims=o.type==='mine'?hit.slice(0,o.value):hit;victims.forEach(u=>o.hit.add(u.id));this.remove(victims.map(u=>u.id),'trap');this.sound('hurt');
     if(o.type==='mine'){o.done=true;this.effect({kind:'blast',x:o.x,z:o.z,r:1.5,color:'#ffac55',ttl:.5});}this.notice(`ЛОВУШКА: −${victims.length}`);
    }}
   }else if(o.prevZ>-.45&&o.z<=-.45&&Math.abs(this.x-o.x)<o.width/2&&!this.collectedGroups.has(o.group)){
    if(o.kind==='gate'){this.applyGate(o);this.stats.gates++;this.collectedGroups.add(o.group);o.done=true;}
    else if(o.opened){const n=this.recruit(o.unit,Math.round(o.count*this.mods.recruit));this.stats.crates++;this.collectedGroups.add(o.group);this.notice(`+${n} • ${UNITS[o.unit].name}`);this.sound('pickup');o.done=true;}
    else {this.notice('ЯЩИК НЕ ОТКРЫТ • стреляй по своей полосе');o.done=true;}
   }
   if(o.z<-7)o.done=true;
  }
  this.objects=this.objects.filter(o=>!o.done);
 }
 pickTarget(u){
  const d=UNITS[u.type];let best=null,score=Infinity;
  for(const e of this.grid.near(u.x,u.z,d.range)){
   if(!alive(e)||e.hidden||e.z<u.z-.5||d2(u,e)>d.range**2)continue;
   const lateral=Math.abs(e.x-u.x);let s=(e.z-u.z)+lateral*4;
   if(d.mode==='sniper'&&(e.kind==='boss'||e.type==='commander'||e.type==='sniper'||e.type==='warbeast'))s-=12;
   if(e.kind==='part')s-=5;
   if(s<score){score=s;best=e;}
  }
  // A lined-up supply container receives fire unless a threat is already at the formation.
  const crate=this.objects.find(o=>o.kind!=='gate'&&o.kind!=='hazard'&&!o.opened&&!o.done&&o.z>u.z&&o.z-u.z<d.range&&Math.abs(o.x-this.x)<1.3);
  if(crate&&(!best||best.z>4))return crate;return best;
 }
 hit(e,damage,pierce=0){
  if(e.dead||e.hp<=0||e.hidden)return;
  if(e.kind==='barrel'){e.hp-=damage;if(e.hp<=0){e.done=true;e.dead=true;this.grid.rebuild(this.enemies);this.blast(e.x,e.z,2.2,100);this.damageZone({x:e.x,z:e.z,radius:2.2},150);}return;}
  if(e.kind==='crate'||e.kind==='cage'){e.hp=Math.max(0,e.hp-damage);if(e.hp===0){e.opened=true;this.sound('pickup');this.effect({kind:'pop',x:e.x,z:e.z,text:'ОТКРЫТО',color:'#42c98c',ttl:.8});}return;}
  let armor=e.type==='shield'?.45:e.type==='tank'&&e.kind!=='boss'?.22:0;
  if(e.kind==='boss'&&e.type==='tank')armor=Math.sin(e.age*1.3)>.3?.05:.6;
  if(e.kind==='boss'&&e.type==='walker'&&this.enemies.some(p=>p.owner===e.id&&alive(p)))armor=.4;
  const value=damage*(1-Math.max(0,armor-pierce));e.hp-=value;e.flash=.07;this.stats.damage+=value;
 }
 chain(origin,damage,n){const used=new Set([origin.id]);let at=origin;
  for(let i=0;i<n;i++){let next=null,best=4.5**2;for(const e of this.grid.near(at.x,at.z,4.5)){const dd=d2(at,e);if(alive(e)&&!e.hidden&&!used.has(e.id)&&dd<best){next=e;best=dd;}}if(!next)break;
   used.add(next.id);this.hit(next,damage*this.mods.chain);this.effect({kind:'bolt',x:at.x,z:at.z,x2:next.x,z2:next.z,color:'#a3efff',ttl:.16});at=next;}
 }
 blast(x,z,r,damage,source='skill'){
  for(const e of this.grid.near(x,z,r+(this.mods.shrapnel?1.5:0))){const dist=Math.sqrt(d2(e,{x,z}));if(dist<r+e.radius)this.hit(e,damage*(1-.3*dist/(r+e.radius)));else if(this.mods.shrapnel&&(source==='rocket'||source==='grenade')&&dist<r+1.5)this.hit(e,damage*.35);}
  this.effect({kind:'blast',x,z,r,color:'#ffb04f',ttl:.5});this.sound('blast');
 }
 updateUnits(dt){
  this.healTick+=dt;if(this.mods.aegis&&this.time>=this.nextAegis){this.shieldUntil=this.time+4;this.nextAegis=this.time+20;}
  const total=this.units.reduce((a,u)=>a+u.hp,0),max=this.units.reduce((a,u)=>a+u.maxHp,0);
  const support=this.mods.network?1+Math.min(.3,this.units.filter(u=>['medic','drone'].includes(u.type)).length*.05):1;
  for(const u of this.units){
   if(!alive(u))continue;const d=UNITS[u.type];u.hp=Math.min(u.maxHp,u.hp+u.maxHp*this.mods.regen*dt);u.cd-=dt;
   if(d.mode==='medic'&&this.healTick>=1){const injured=this.units.filter(alive).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];if(injured)injured.hp=Math.min(injured.maxHp,injured.hp+16);}
   if(u.cd>0)continue;
   if(d.mode==='drone'&&this.enemies.some(e=>e.type==='jammer'&&alive(e)&&d2(e,u)<15**2)){u.cd=.3;continue;}
   const target=this.pickTarget(u);if(!target)continue;
   u.cd=1/(d.rate*this.mods.rate*(this.time<this.buffUntil?1.7:1)*(this.mods.overdrive&&total/max<.4?1.65:1));u.flash=.09;this.stats.shots++;
   const damage=d.damage*this.mods.damage*(1+(this.tier-1)*.25)*support*((target.kind==='boss'||target.kind==='part'||target.type==='warbeast')?this.mods.boss:1);
   if(target.kind==='crate'||target.kind==='cage'||target.kind==='barrel'){this.hit(target,damage);this.trace(u,target);continue;}
   if(d.mode==='grenade'||d.mode==='rocket')this.projectiles.push({x:u.x,z:u.z,fromX:u.x,fromZ:u.z,tx:target.x,tz:target.z,t:0,duration:.5,kind:d.mode,damage,radius:d.mode==='rocket'?3:2.2});
   else if(d.mode==='tesla'){this.hit(target,damage);this.chain(target,damage*.7,3);this.trace(u,target,'bolt');}
   else if(d.mode==='shotgun'||d.mode==='flame'){
    for(const e of this.grid.near(u.x,u.z,d.range))if(alive(e)&&e.z>=u.z&&e.z-u.z<=d.range&&Math.abs(e.x-u.x)<.5+(e.z-u.z)*.21){this.hit(e,damage);if(d.mode==='flame'){e.burn=3;e.burnDps=3;}}
    this.trace(u,target,d.mode==='flame'?'flame':'shot');
   }else{
    this.hit(target,damage,d.mode==='sniper'?.65:0);this.trace(u,target);
    if(this.mods.pierce||d.mode==='sniper'){const extra=this.enemies.filter(e=>alive(e)&&!e.hidden&&e.id!==target.id&&e.z>target.z&&e.z-target.z<8&&Math.abs(e.x-target.x)<.5).sort((a,b)=>a.z-b.z)[0];if(extra){this.hit(extra,damage*.65);this.trace(target,extra);}}
   }
   if(this.mods.fire&&this.stats.shots%3===0){target.burn=this.mods.napalm?6:3;target.burnDps=5*this.mods.damage;}
   if(this.mods.cryo)target.slow=1.4;
   if(this.mods.ricochet&&this.stats.shots%3===0)this.chain(target,damage*.55,1);
   if(this.mods.tesla&&this.stats.shots%12===0)this.chain(target,damage,5);
   if(this.mods.quantum&&this.stats.shots%5===0)this.hit(target,damage*.8);
   this.sound('shot');
  }
  if(this.healTick>=1)this.healTick-=1;
 }
 trace(a,b,kind='shot'){this.effect({kind,x:a.x,z:a.z,x2:b.x,z2:b.z,color:'#fff3ab',ttl:kind==='bolt'?.16:.09});}
 damageZone(shape,damage){for(const u of this.units)if(alive(u)&&inside(u,shape,.16))u.hp-=damage*this.mods.defense*(this.time<this.shieldUntil?.35:1)*(u.type==='shield'?.7:1);}
 zone(shape,delay=1.3,damage=55){this.zones.push({...shape,id:this.id++,delay,remaining:delay,damage});}
 updateZones(dt){for(const z of this.zones){z.remaining-=dt;if(z.remaining<=0&&!z.done){this.damageZone(z,z.damage);z.done=true;this.effect({kind:'blast',x:z.x,z:z.z,r:z.radius||z.width/2,color:'#ff8055',ttl:.45});this.sound('hurt');}}this.zones=this.zones.filter(z=>!z.done);}
 updateProjectiles(dt){for(const p of this.projectiles){p.t+=dt;const q=Math.min(1,p.t/p.duration);p.x=p.fromX+(p.tx-p.fromX)*q;p.z=p.fromZ+(p.tz-p.fromZ)*q;if(q===1&&!p.done){this.blast(p.tx,p.tz,p.radius,p.damage,p.kind);p.done=true;}}this.projectiles=this.projectiles.filter(p=>!p.done);}
 updateEnemies(dt){
  for(const e of [...this.enemies]){
   if(!alive(e))continue;e.age=(e.age||0)+dt;e.flash=Math.max(0,(e.flash||0)-dt);
   if(e.burn>0){e.burn-=dt;this.hit(e,e.burnDps*dt);if(this.mods.napalm)e.slow=Math.max(e.slow,.5);}e.slow=Math.max(0,e.slow-dt);
   if(e.kind==='boss'){this.updateBoss(e,dt);continue;}
   if(e.kind==='part'){const b=this.enemies.find(b=>b.id===e.owner&&alive(b));if(!b)e.hp=0;else{e.x=b.x+e.side*1.5;e.z=b.z+.1;}continue;}
   const d=ENEMIES[e.type];e.cd-=dt;
   if(e.type==='burrower'&&!e.emerged){e.hidden=e.age<2.4;if(e.age>2.4){e.emerged=true;e.hidden=false;e.x=clamp(this.x+this.rng.range(-1.5,1.5),-5,5);e.z=4;this.zone({x:e.x,z:0,radius:.7},1.4,20);}continue;}
   if(e.type==='medic'&&e.cd<=0){for(const a of this.grid.near(e.x,e.z,3))if(alive(a)&&a.kind==='enemy')a.hp=Math.min(a.maxHp,a.hp+6);e.cd=2;}
   if(e.type==='necromancer'){e.summon-=dt;if(e.summon<=0){for(let i=0;i<3;i++)this.spawn('swarmer',e.x+this.rng.range(-1,1),e.z+1);e.summon=5;}}
   if(e.type==='sniper'&&e.z<15){if(e.cd<=0){this.zone({x:this.x,z:-1,radius:.7},1.25,d.damage);e.cd=2.8;}continue;}
   const target=this.units.filter(alive).reduce((best,u)=>!best||d2(e,u)<d2(e,best)?u:best,null);if(!target)continue;
   const dist=Math.sqrt(d2(e,target));
   if(dist<.5+e.radius){
    if(e.type==='bomber'){this.zone({x:e.x,z:e.z,radius:1.6},.8,d.damage);e.hp=0;}
    else if(e.cd<=0){target.hp-=d.damage*this.mods.defense*(target.type==='shield'?.7:1)*(this.time<this.shieldUntil?.35:1);e.cd=1;}
   }else{
    const boosted=this.grid.near(e.x,e.z,3).some(a=>a.type==='commander'&&alive(a));const speed=d.speed*(boosted?1.2:1)*(e.slow>0?.75:1);
    e.x+=(target.x-e.x)/dist*speed*dt*.7;e.z+=(target.z-e.z)/dist*speed*dt;
    // Local separation is bounded and does not turn a crowd into rigid-body physics.
    for(const a of this.grid.near(e.x,e.z,.55)){if(a.id===e.id||a.kind!=='enemy')continue;const dx=e.x-a.x,dz=e.z-a.z,l=Math.hypot(dx,dz);if(l>.01&&l<.45){e.x+=dx/l*dt*.6;e.z+=dz/l*dt*.6;}}
    e.x=clamp(e.x,-5.6,5.6);
   }
  }
 }
 updateBoss(b,dt){
  b.phase=b.hp/b.maxHp>.65?1:b.hp/b.maxHp>.3?2:3;b.cd-=dt;
  b.z+=(17-b.z)*dt*.7;
  if(b.type==='worm'){const phase=b.age%7;b.hidden=phase<2;if(b.hidden)b.x=this.x;}
  if(b.type==='carrier')b.x=Math.sin(b.age*.45)*3;
  if(b.type==='twins')b.x+=Math.sin(b.age*.8+b.id)*dt*.5;
  if(b.cd>0)return;
  const lane=this.x;const front={x:lane,z:-1,radius:1.5};const rect={x:lane,z:-1,shape:'rect',width:2.2,depth:6};
  switch(b.type){
   case'brute':this.zone(rect,1.45,100);b.charge={x:lane,at:this.time+1.45};break;
   case'tank':case'walker':{
    const guns=this.enemies.filter(p=>p.owner===b.id&&alive(p));
    for(const p of guns)this.zone({x:clamp(lane+p.side*1.1,-4,4),z:-1,radius:1},1.4,65);
    if(!guns.length)this.zone(front,1.7,45);
    if(b.type==='walker'&&b.phase>1)this.row([{kind:'hazard',x:-3.4,type:'saw',value:4,radius:.7}],19);
    break;}
   case'brood':for(let i=0;i<8+b.phase*4;i++)this.spawn('swarmer',this.rng.range(-4,4),14+this.rng.range(0,2));this.zone(front,1.7,55);break;
   case'general':for(const t of ['shield','shield','medic','commander','grunt','runner'])this.spawn(t,this.rng.range(-4,4),16);this.zone({...front,radius:.8},1.5,45);break;
   case'twins':this.zone({...rect,x:b.x,width:2.8},1.4,65);if(this.enemies.filter(e=>e.kind==='boss'&&alive(e)).length===1)b.enraged=true;break;
   case'worm':this.zone({...front,radius:1.3},1.6,100);for(let i=0;i<4;i++)this.spawn('burrower',this.rng.range(-4,4),20);break;
   case'carrier':this.zone({...rect,x:lane,width:2.4},1.6,80);for(let i=0;i<6;i++)this.spawn('runner',this.rng.range(-5,5),19);break;
   case'necro':{const fallen=this.corpses.splice(0,Math.min(16,this.corpses.length));for(const t of(fallen.length?fallen:Array(8).fill('swarmer')))this.spawn(t,this.rng.range(-5,5),12+this.rng.range(0,4));this.zone(front,1.8,55);break;}
   case'warlord':if(b.phase===1){for(const t of ['shield','commander','runner','runner','tank'])this.spawn(t,this.rng.range(-4,4),15);}else if(b.phase===2){this.zone(front,1.2,70);this.row([{kind:'hazard',x:lane>0?-3.4:3.4,type:'laser',value:5,shape:'rect',width:2,depth:1}],17);}else{this.zone(rect,1.25,95);for(let i=0;i<6;i++)this.spawn('swarmer',this.rng.range(-4,4),12);}break;
  }
  b.cd=(b.enraged?1.7:3.8)-b.phase*.25;
 }
 cleanup(){
  // Death is marked before effects run, so chain explosions cannot reward the same kill twice.
  for(const e of [...this.enemies])if(e.hp<=0&&!e.dead){
   e.dead=true;if(e.kind==='part'){this.notice('ОРУДИЕ УНИЧТОЖЕНО');continue;}if(e.kind==='boss')continue;
   this.stats.kills++;this.corpses.push(e.type);this.corpses=this.corpses.slice(-90);
   this.effect({kind:'dust',x:e.x,z:e.z,color:ENEMIES[e.type].color,ttl:.4});
   if(e.type==='splitter')for(let i=0;i<3;i++)this.spawn('swarmer',e.x+this.rng.range(-.4,.4),e.z);
   if(this.mods.reaction&&e.burn>0)this.blast(e.x,e.z,1.2,16*this.mods.damage);
   if(this.mods.payload&&this.stats.kills%16===0)this.blast(e.x,e.z,2,35*this.mods.damage);
   if(this.mods.armageddon&&this.stats.kills%80===0){for(const a of this.enemies)this.hit(a,55*this.mods.damage);this.notice('АРМАГЕДДОН');}
  }
  this.enemies=this.enemies.filter(e=>!e.dead);
  const dead=this.units.filter(u=>u.hp<=0);if(dead.length)this.remove(dead.map(u=>u.id));
 }
 ability(){
  if(this.status!=='running'||this.cooldown>0)return false;this.cooldown=24;this.sound('ability');
  if(this.commander==='captain')this.buffUntil=this.time+6;
  if(this.commander==='medic'){for(const u of this.units)u.hp=Math.min(u.maxHp,u.hp+u.maxHp*.45);this.shieldUntil=this.time+4;}
  if(this.commander==='artillery'){this.grid.rebuild(this.enemies);for(const z of[6,13,20])this.blast(this.x,z,3.3,180*this.mods.damage);}
  this.notice(COMMANDERS[this.commander].ability.toUpperCase());return true;
 }
}
