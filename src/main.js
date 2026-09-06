import {Game} from './core/game.js';
import {AudioSystem} from './systems/audio.js';

const $=id=>document.getElementById(id);
const meta=loadMeta();
const screens={menu:$('menu'),choice:$('choice'),result:$('result'),pause:$('pause-screen')};
let activeLevel=Math.max(0,Math.min(meta.highestLevel-1,11));
let activeMode='campaign';
let flashTimer=0;

function loadMeta(){try{return {...{highestLevel:1,credits:0,bestWave:0},...JSON.parse(localStorage.getItem('last-column-meta')||'{}')}}catch{return {highestLevel:1,credits:0,bestWave:0}}}
function saveMeta(){localStorage.setItem('last-column-meta',JSON.stringify(meta));refreshMeta()}
function refreshMeta(){$('meta-level').textContent=meta.highestLevel;$('meta-credits').textContent=meta.credits;$('meta-wave').textContent=meta.bestWave}
function hideAll(){Object.values(screens).forEach(s=>s.classList.remove('visible'))}

const ui={
 showGame(){hideAll();$('hud').classList.remove('hidden')},
 openChoice(kicker,title,cards){$('choice-kicker').textContent=kicker;$('choice-title').textContent=title;const root=$('choice-cards');root.innerHTML='';for(const card of cards){const b=document.createElement('button');b.className='choice-card';b.innerHTML=`<span class="rarity">${card.kicker||''}</span><h3>${card.name}</h3><p>${card.description||''}</p><span class="tag">${card.tag||''}</span>`;b.onclick=()=>{audio.unlock();card.onPick()};root.appendChild(b)}screens.choice.classList.add('visible')},
 closeChoice(){screens.choice.classList.remove('visible')},
 updateHud(game){if(!game.state)return;$('hud-level').textContent=game.mode==='endless'?`∞${game.state.endlessWave+1}`:game.levelIndex+1;$('hud-army').textContent=game.state.units.length;$('hud-kills').textContent=game.state.kills;$('level-progress').style.width=`${game.progress()*100}%`;$('ability-cooldown').textContent=game.state.abilityCd<=0?'READY':`${game.state.abilityCd.toFixed(1)}s`;$('ability').classList.toggle('cooling',game.state.abilityCd>0)},
 flash(text){$('wave-label').textContent=text;clearTimeout(flashTimer);flashTimer=setTimeout(()=>$('wave-label').textContent='',1800)},
 togglePause(on){screens.pause.classList.toggle('visible',on)},
 showResult(win,game,reward,elapsed){$('hud').classList.add('hidden');hideAll();screens.result.classList.add('visible');$('result-kicker').textContent=win?'MISSION COMPLETE':'COLUMN LOST';$('result-title').textContent=win?'Victory':'Defeat';$('result-text').textContent=win?'The route is secure. Your surviving troops carry the doctrine forward.':'The horde broke the line. Change your build and try again.';$('result-stats').innerHTML=`<div><span>Kills</span><strong>${game.state.kills}</strong></div><div><span>Survivors</span><strong>${game.state.units.length}</strong></div><div><span>Credits</span><strong>+${reward}</strong></div><div><span>Artifacts</span><strong>${game.state.artifacts.length}</strong></div><div><span>Damage</span><strong>${Math.round(game.state.totalDamage)}</strong></div><div><span>Time</span><strong>${Math.round(elapsed)}s</strong></div>`;meta.credits+=reward;if(game.mode==='campaign'&&win)meta.highestLevel=Math.max(meta.highestLevel,Math.min(12,game.levelIndex+2));if(game.mode==='endless')meta.bestWave=Math.max(meta.bestWave,game.state.endlessWave);saveMeta();$('next').style.display=win&&game.mode==='campaign'&&game.levelIndex<11?'inline-block':'none';$('restart').textContent=game.mode==='endless'?'RESTART ENDLESS':'RETRY'}
};

const audio=new AudioSystem();
const game=new Game($('game'),audio,ui);

function startCampaign(level=activeLevel){activeMode='campaign';activeLevel=Math.max(0,Math.min(level,meta.highestLevel-1,11));game.start(activeLevel,'campaign')}
$('play').onclick=()=>startCampaign(activeLevel);
$('endless').onclick=()=>{activeMode='endless';game.start(0,'endless')};
$('ability').onclick=()=>game.useAbility();
$('pause').onclick=()=>game.togglePause();
$('resume').onclick=()=>game.togglePause();
$('restart').onclick=()=>activeMode==='endless'?game.start(0,'endless'):startCampaign(activeLevel);
$('next').onclick=()=>{activeLevel=Math.min(11,activeLevel+1);startCampaign(activeLevel)};
$('home').onclick=goHome;$('pause-home').onclick=goHome;
function goHome(){game.running=false;game.paused=false;$('hud').classList.add('hidden');hideAll();screens.menu.classList.add('visible');refreshMeta()}

function pointerX(clientX){const normalized=(clientX/window.innerWidth-.5)*2;game.inputX=Math.max(-1,Math.min(1,normalized))}
let dragging=false;
$('game').addEventListener('pointerdown',e=>{dragging=true;audio.unlock();pointerX(e.clientX);$('game').setPointerCapture?.(e.pointerId)});
$('game').addEventListener('pointermove',e=>{if(dragging)pointerX(e.clientX)});
$('game').addEventListener('pointerup',()=>dragging=false);
window.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();game.useAbility()}if(e.key==='Escape')game.togglePause();if(e.key==='a'||e.key==='ArrowLeft')game.inputX=Math.max(-1,game.inputX-.18);if(e.key==='d'||e.key==='ArrowRight')game.inputX=Math.min(1,game.inputX+.18)});

refreshMeta();
