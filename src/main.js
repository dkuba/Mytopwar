import {Simulation} from './sim/simulation.js';
import {Scene} from './render/scene.js';
import {Sound} from './systems/sound.js';
import {loadSave,persistSave,purchase} from './systems/storage.js';
import {COMMANDERS,BOSSES,VERSION} from './data/catalog.js';
import {LEVELS} from './data/campaign.js';
import {clamp,formation} from './sim/rules.js';
import {recruit} from './sim/army.js';
import {spawnRow} from './sim/world.js';
const $=id=>document.getElementById(id);
let storage;try{storage=window.localStorage;}catch{storage=null;}
const save=loadSave(storage),audio=new Sound(save.sound),keys=new Set();
let scene,sim,mode='lobby',selectedLevel=save.highestLevel,last=performance.now(),acc=0,lastHud=0,shownPhase='',qaFreeze=false;
const qa=new URLSearchParams(location.search).get('qa')==='1';
function fail(error){$('fatal').hidden=false;$('fatal-message').textContent=error.message||String(error);}
try{scene=new Scene($('game'),$('overlay'),save.quality);}catch(error){fail(error);}
function button(text,fn,cls=''){const b=document.createElement('button');b.textContent=text;b.className=cls;b.onclick=fn;return b;}
function modal(kicker,title){$('modal-eyebrow').textContent=kicker;$('modal-title').textContent=title;$('modal-content').replaceChildren();$('modal-actions').replaceChildren();$('modal').hidden=false;return $('modal-content');}
function closeModal(){$('modal').hidden=true;}
function persist(){const ok=persistSave(storage,save);$('storage-status').textContent=ok?'Прогресс сохранён':'Сохранение недоступно';refreshLobby();}
function refreshLobby(){
  $('credits').textContent=save.credits;$('completed').textContent=save.campaignComplete?12:Math.max(0,save.highestLevel-1);$('play-level').textContent=`МИССИЯ ${String(selectedLevel).padStart(2,'0')} →`;
  $('sound').textContent=save.sound?'♪':'×';$('sound').title=save.sound?'Выключить звук':'Включить звук';$('quality').textContent=save.quality==='high'?'HD':'SD';$('commanders').replaceChildren();
  for(const [id,c] of Object.entries(COMMANDERS)){const b=button('',()=>{save.commander=id;persist();},'commander'+(save.commander===id?' selected':''));b.title=c.description;b.setAttribute('aria-label',`${c.name}: ${c.description}`);b.setAttribute('aria-pressed',String(save.commander===id));const icon=document.createElement('b');icon.textContent=c.icon;const name=document.createElement('span');name.textContent=c.name;b.append(icon,name);$('commanders').append(b);}
}
function preview(){const s=new Simulation({seed:77});s.events=[];s.time=8;s.distance=0;s.phase='preview';recruit(s,'rifleman',20);recruit(s,'machinegun',8);s.units.forEach((u,i)=>Object.assign(u,formation(i,s.units.length,0),{born:-3}));for(let i=0;i<85;i++)s.spawnEnemy('grunt',(i%12-5.5)*.65,19+Math.floor(i/12)*.6);spawnRow(s,[{lane:-1,op:'add',value:12},{lane:1,op:'multiply',value:2}],10);return s;}
const lobbyScene=preview();
function start(level=selectedLevel,gameMode='campaign'){
  closeModal();audio.unlock();mode='play';selectedLevel=clamp(level,1,12);
  sim=new Simulation({level:selectedLevel,mode:gameMode,seed:(Date.now()>>>0)||1,commander:save.commander,training:save.training,medicine:save.medicine});
  document.body.classList.add('playing');$('lobby').hidden=true;$('hud').hidden=false;keys.clear();last=performance.now();acc=0;shownPhase='';updateHud();
}
function home(){mode='lobby';keys.clear();closeModal();$('hud').hidden=true;document.body.classList.remove('playing');$('lobby').hidden=false;shownPhase='';refreshLobby();}
function togglePause(){if(mode!=='play')return;if(sim.phase==='running'){sim.pause();const root=modal('ПАУЗА','Передышка');const p=document.createElement('p');p.className='modal-note';p.textContent='Армия, снаряды и ловушки остановлены.';root.append(p);$('modal-actions').append(button('Продолжить',()=>{sim.resume();closeModal();acc=0;},'primary'),button('В штаб',home));}else if(sim.phase==='paused'){sim.resume();closeModal();acc=0;}}
function choices(){const root=modal('АРТЕФАКТЫ','Усиль свою колонну'),grid=document.createElement('div');grid.className='artifact-grid';
  for(const a of sim.choices){const b=button('',()=>{if(sim.addArtifact(a.id)){closeModal();shownPhase='running';acc=0;}},'artifact');const icon=document.createElement('span');icon.className='artifact-icon';icon.textContent={FIRE:'♨',STORM:'ϟ',DEFENSE:'✚',ARMY:'⚑',BALLISTIC:'⌁',ORDNANCE:'✦',OFFENSE:'➚',CONTROL:'❄'}[a.tag]||'✦';const rarity=document.createElement('small');rarity.textContent=a.rarity;const h=document.createElement('h3');h.textContent=a.name;const p=document.createElement('p');p.textContent=a.description;b.append(icon,rarity,h,p);grid.append(b);}root.append(grid);
}
function result(){
  if(sim.settled)return;sim.settled=true;const won=sim.phase==='victory',credits=Math.floor((won?100+sim.level*15:20)+sim.stats.kills*.3);save.credits+=credits;
  if(won&&sim.mode==='campaign'){save.highestLevel=Math.min(12,Math.max(save.highestLevel,sim.level+1));if(sim.level===12)save.campaignComplete=true;}
  if(sim.mode==='endless')save.bestWave=Math.max(save.bestWave,sim.sector-sim.level);persist();$('hud').hidden=true;
  const root=modal(won?'МИССИЯ ВЫПОЛНЕНА':'КОЛОННА ОСТАНОВЛЕНА',won?'Путь свободен!':'Попробуем другой маршрут?'),grid=document.createElement('div');grid.className='result-grid';
  for(const [label,value] of [['Побеждено',sim.stats.kills],['В строю',sim.units.length],['Потери от ловушек',sim.stats.trapLoss],['Кредиты',`+${credits}`]]){const d=document.createElement('div'),a=document.createElement('small'),b=document.createElement('strong');a.textContent=label;b.textContent=value;d.append(a,b);grid.append(d);}root.append(grid);
  const p=document.createElement('p');p.className='modal-note';p.textContent=`Ворота: ${sim.stats.gates} · Спасено: ${sim.stats.rescued} · Артефакты: ${sim.artifacts.length} · В бою: ${Math.round(sim.time)} с`;root.append(p);
  if(won&&sim.level<12)$('modal-actions').append(button('Следующая миссия →',()=>start(sim.level+1),'primary'));
  if(won&&sim.level===12)$('modal-actions').append(button('∞ Выживание',()=>start(1,'endless'),'primary'));
  $('modal-actions').append(button('Повторить',()=>start(sim.level,sim.mode)),button('В штаб',home));
}
function missions(){const root=modal('КАМПАНИЯ','Маршрут колонны'),grid=document.createElement('div');grid.className='mission-grid';LEVELS.forEach((l,i)=>{const b=button('',()=>{selectedLevel=i+1;closeModal();refreshLobby();},'mission'+(selectedLevel===i+1?' current':''));b.disabled=i+1>save.highestLevel;const n=document.createElement('strong');n.textContent=String(i+1).padStart(2,'0');const text=document.createElement('span');text.textContent=l.name;b.append(n,text);grid.append(b);});root.append(grid);$('modal-actions').append(button('Назад',closeModal));}
function shop(){const root=modal(`◈ ${save.credits} КРЕДИТОВ`,'Полевой арсенал');for(const [id,title,desc] of [['training','Дополнительный боец','+1 стартовый стрелок за ранг, максимум +3.'],['medicine','Подготовка медиков','Медики лечат на 1 HP/с больше за ранг.']]){const row=document.createElement('div');row.className='shop-item';const text=document.createElement('div'),h=document.createElement('h3'),p=document.createElement('p');h.textContent=`${title} · ${save[id]}/3`;p.textContent=desc;text.append(h,p);const price=150*(save[id]+1),b=button(save[id]>=3?'Максимум':`◈ ${price}`,()=>{if(purchase(save,id)){persist();audio.play(['pickup']);shop();}});b.disabled=save[id]>=3||save.credits<price;row.append(text,b);root.append(row);}$('modal-actions').append(button('Назад',closeModal));}
function updateHud(){if(!sim)return;$('mission-label').textContent=sim.mode==='endless'?`СЕКТОР ${sim.sector}`:`МИССИЯ ${String(sim.level).padStart(2,'0')}`;$('mission-name').textContent=sim.definition.name;$('army-count').textContent=sim.units.length;$('kill-count').textContent=sim.stats.kills;$('progress').style.width=`${Math.min(100,sim.stageTime/(sim.events.at(-1)?.at||1)*100)}%`;
  const commander=COMMANDERS[sim.commander];$('ability-icon').textContent=commander.icon;$('ability-name').textContent=commander.ability;$('ability-cd').textContent=sim.jammed?'ПОМЕХИ':sim.cooldown>0?`${Math.ceil(sim.cooldown)} с`:'ПРОБЕЛ • ГОТОВО';$('ability').disabled=sim.phase!=='running'||sim.cooldown>0||sim.jammed;
  $('notice').textContent=sim.message.until>sim.time?sim.message.text:'';$('build-tags').textContent=`Оружие ${sim.tier} · Артефакты ${sim.artifacts.length}`;$('boss-hud').hidden=!sim.bosses.length;
  if(sim.bosses.length){$('boss-name').textContent=BOSSES[sim.definition.boss].name;$('boss-phase').textContent=`ФАЗА ${Math.max(...sim.bosses.map(b=>b.phase))}`;$('boss-life').style.width=`${sim.bosses.reduce((a,b)=>a+b.hp,0)/(sim.bossHpInitial||sim.bosses.reduce((a,b)=>a+b.maxHp,0))*100}%`;}
}
$('play').onclick=()=>start();$('endless').onclick=()=>start(1,'endless');$('missions').onclick=missions;$('shop').onclick=shop;$('pause').onclick=togglePause;$('ability').onclick=()=>{audio.unlock();sim?.ability();};$('sound').onclick=()=>{audio.unlock();save.sound=!save.sound;audio.enabled=save.sound;persist();};$('quality').onclick=()=>{save.quality=save.quality==='high'?'low':'high';if(scene)scene.quality=save.quality;persist();};
let dragging=false;
$('game').addEventListener('pointerdown',e=>{if(mode!=='play'||sim.phase!=='running')return;dragging=true;audio.unlock();sim.targetX=scene.inputX(e.clientX);e.currentTarget.setPointerCapture(e.pointerId);});
$('game').addEventListener('pointermove',e=>{if(dragging&&mode==='play'&&sim.phase==='running')sim.targetX=scene.inputX(e.clientX);});
for(const event of ['pointerup','pointercancel','lostpointercapture'])$('game').addEventListener(event,()=>dragging=false);
window.addEventListener('keydown',e=>{if(mode!=='play')return;if(['Space','ArrowLeft','ArrowRight','KeyA','KeyD'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.code==='Space'&&!e.repeat)sim.ability();if(e.code==='Escape'&&!e.repeat)togglePause();});
window.addEventListener('keyup',e=>keys.delete(e.code));
function lostFocus(){keys.clear();dragging=false;if(mode==='play'&&sim.phase==='running')togglePause();}
window.addEventListener('blur',lostFocus);document.addEventListener('visibilitychange',()=>{if(document.hidden)lostFocus();});
$('game').addEventListener('webglcontextlost',e=>{e.preventDefault();lostFocus();fail(Error('Графический контекст потерян. Обнови страницу; сохранённый прогресс останется.'));});
function frame(now){const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;try{if(mode==='play'){
    if(sim.phase==='running'&&!qaFreeze){acc+=dt;while(acc>=1/60&&sim.phase==='running'){if(keys.has('KeyA')||keys.has('ArrowLeft'))sim.targetX=clamp(sim.targetX-6/60,-3.5,3.5);if(keys.has('KeyD')||keys.has('ArrowRight'))sim.targetX=clamp(sim.targetX+6/60,-3.5,3.5);sim.step(1/60);acc-=1/60;}}else acc=0;
    if(sim.phase!==shownPhase){shownPhase=sim.phase;if(sim.phase==='choice')choices();if(['victory','defeat'].includes(sim.phase))result();}audio.play(sim.sounds.splice(0));scene.render(sim);if(now-lastHud>100){updateHud();lastHud=now;}
  }else{lobbyScene.time+=dt;lobbyScene.distance+=dt*2;scene.render(lobbyScene);}}catch(error){fail(error);return;}requestAnimationFrame(frame);}
refreshLobby();if(scene)requestAnimationFrame(frame);
// Explicit test harness; absent in ordinary sessions. Never changes normal gameplay rules.
if(qa)window.__qa={start,home,get sim(){return sim;},get scene(){return scene;},freeze(v=true){qaFreeze=v;},step(n=1){for(let i=0;i<n;i++)sim.step();scene.render(sim);updateHud();},version:VERSION};
