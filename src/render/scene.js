import {Instancer} from './gl.js';
import {UNITS,ENEMIES} from '../data/catalog.js';
import {clamp} from '../sim/rules.js';
const THEMES={bridge:{water:'#78cbd7',sand:'#ecd496',green:'#60ae79',road:'#c8d5da'},desert:{water:'#e4bc86',sand:'#f0d497',green:'#90a65e',road:'#cdbf9f'},toxic:{water:'#97cba4',sand:'#bebd93',green:'#558f79',road:'#bad1c6'},tech:{water:'#87b8d1',sand:'#a7bed2',green:'#6e9cac',road:'#c4d1e2'}};
export class Scene{
  constructor(canvas,overlay,quality='high'){this.canvas=canvas;this.overlay=overlay;this.ctx=overlay.getContext('2d');this.g=new Instancer(canvas);this.quality=quality;this.w=0;this.h=0;}
  project(x,y,z){const m=this.g.vp,w=m[3]*x+m[7]*y+m[11]*z+m[15];return{x:((m[0]*x+m[4]*y+m[8]*z+m[12])/w+1)*this.w/2,y:(1-(m[1]*x+m[5]*y+m[9]*z+m[13])/w)*this.h/2,scale:Math.abs(m[0]/w*this.w/2),visible:w>0};}
  inputX(x){const a=this.project(-3.5,0,0),b=this.project(3.5,0,0);return clamp(-3.5+7*(x-a.x)/(b.x-a.x),-3.5,3.5);}
  box(x,y,z,sx,sy,sz,c,yaw=0,a=1){this.g.add('box',x,y,z,sx,sy,sz,c,yaw,a);}
  ball(x,y,z,sx,sy,sz,c,a=1){this.g.add('sphere',x,y,z,sx,sy,sz,c,0,a);}
  disk(x,y,z,r,h,c,a=1){this.g.add('cylinder',x,y,z,r,h,r,c,0,a);}
  shadow(x,z,r=1){this.ball(x,.025,z,r,.025,r*.65,'#476a77',.18);}
  ground(s){const t=THEMES[s.definition.biome]||THEMES.bridge,scroll=s.distance%6;
    this.box(0,-1.1,20,200,.2,180,t.water);this.box(0,-.38,23,12.5,.7,92,'#7b98a5');this.box(0,-.025,23,12,.1,92,t.road);
    for(const x of [-5.5,5.5])this.box(x,.035,23,.12,.02,92,'#f5f7e6');
    for(let i=-2;i<13;i++){const z=i*6-scroll;this.box(0,.035,z,.15,.02,2.7,'#f5dd85');for(const x of [-6.05,6.05]){this.box(x,.18,z,.25,.38,1.1,'#ebeee3');this.box(x,.08,z+2.2,.24,.18,3.4,'#728c9b');}if(i%2===0)this.box(0,.035,z+1.5,11.3,.02,.055,'#aabcc4');}
    const max=this.quality==='low'?3:6;
    for(let i=0;i<max;i++)for(const side of [-1,1]){const z=i*13-(s.distance*.15)%13-6,x=side*(10+(i%3)*2.2);this.ball(x,-.5,z,2.7,.3,2.8,t.sand);this.ball(x,-.25,z,2.2,.28,2.1,t.green);
      if(s.definition.biome==='tech'){this.box(x,.9,z,1.6,2.4,1.8,'#7f9fae');this.box(x,.9,z-1,1.2,.2,.05,'#a3f2f1');this.disk(x,2.2,z,.8,.15,'#bee3e5');}
      else if(s.definition.biome==='desert'){this.disk(x,1,z,.22,2.5,'#87a476');this.box(x+.35,1.3,z,.7,.23,.3,'#87a476');this.disk(x+.64,1.6,z,.16,.7,'#87a476');this.ball(x+1,-.03,z+1,.6,.4,.6,'#c29e73');}
      else{this.disk(x,1,z,.16,2.5,'#b7a87c');for(let j=0;j<5;j++){const a=j/5*Math.PI*2;this.ball(x+Math.cos(a)*.6,2.35,z+Math.sin(a)*.6,.8,.16,.72,'#458d6f');}this.ball(x,2.5,z,.35,.3,.35,'#76b47c');}
    }
    if(this.quality!=='low')for(let i=0;i<20;i++){const x=(i%2?1:-1)*(7.5+(i%5)*2.4),z=(i*5-s.distance*.2)%70;this.box(x,-.76,z,1.2,.02,.035,'#b7e9e6');}
  }
  soldier(u,s,enemy=false){if(u.hidden){this.shadow(u.x,u.z,.3);return;}const d=enemy?ENEMIES[u.type]:UNITS[u.type],scale=enemy?d.radius/.26:.9;
    const frame=Math.floor((s.time*9+(u.phase||0))%4),arrival=enemy?0:Math.max(0,.35-(s.time-(u.born||0))*.8);
    if(this.g.unit){this.g.unit(`${enemy?'e':'a'}-${u.type}-${s.tier}-${frame}`,u.x,u.z,scale,arrival,()=>this.soldierModel(0,0,0,d.color,u.type,enemy,1,frame,s.tier));}
    else this.soldierModel(u.x,arrival,u.z,d.color,u.type,enemy,scale,frame,s.tier);
    if(u.flash>0)this.ball(u.x,.64,u.z+.6,.09,.09,.16,'#fff4b2');
    if(u.burnUntil>s.time)this.ball(u.x,1.05,u.z,.16,.3,.14,'#ffb657',.7);
  }
  soldierModel(x,y,z,color,type,enemy,k,frame,tier){const dir=enemy?-1:1,b=(a,h,c,w,d,l,col,ang=0)=>this.box(x+a*k,y+h*k,z+c*k,w*k,d*k,l*k,col,ang),ball=(a,h,c,w,d,l,col)=>this.ball(x+a*k,y+h*k,z+c*k,w*k,d*k,l*k,col);
    this.shadow(x,z,.32*k);const step=Math.sin(frame*Math.PI/2)*.08;
    b(-.12,.1,step,.16,.18,.28,'#345165');b(.12,.1,-step,.16,.18,.28,'#345165');
    b(0,.37,0,.42,.45,.31,color);b(0,.38,-dir*.21,.26,.3,.17,enemy?'#934249':'#4c7391');
    b(-.26,.43,.05*dir,.13,.32,.16,color);b(.26,.43,.14*dir,.13,.28,.16,color);
    ball(0,.74,.03*dir,.22,.24,.21,'#f4c997');ball(0,.86,0,.265,.17,.26,color);
    b(0,.76,.225*dir,.28,.065,.04,'#3a647e');
    b(.22,.46,.37*dir,.095,.09,type==='sniper'?.65:.4,'#3b5261');
    if(type==='machinegun')b(.2,.48,.28*dir,.23,.16,.35,'#425764');
    if(type==='shield')b(-.34,.46,.26*dir,.27,.62,.09,'#829fb1');
    if(type==='medic'){b(0,.42,-dir*.305,.055,.22,.015,'#f45759');b(0,.42,-dir*.31,.19,.05,.02,'#f45759');}
    if(type==='rocket'||type==='grenadier')b(.25,.6,.17*dir,.2,.2,.65,'#577266');
    if(type==='flamethrower'){ball(-.08,.43,-dir*.26,.09,.25,.1,'#f4bc65');ball(.1,.43,-dir*.26,.09,.25,.1,'#f4bc65');}
    if(type==='tesla'){ball(.25,.6,.3*dir,.11,.11,.1,'#c9ffff');}
    if(type==='drone'){b(.48,1.3,0,.35,.08,.22,'#c4f4ee');for(const a of [-.2,.2])b(.48+a,1.31,0,.25,.02,.09,'#517282');}
    if(tier>=2&&!enemy)b(0,.43,-.175,.15,.11,.03,'#fbe297');
    if(type==='commander'||type==='necromancer'){b(-.27,.7,0,.025,1.1,.025,'#ffe59d');b(-.1,1.08,0,.3,.2,.04,color);}
  }
  boss(b,s){if(b.hidden){this.shadow(b.x,b.z,1.7);return;}const x=b.x,z=b.z,c=b.color,k=b.bossKind;
    this.shadow(x,z,2.2);
    if(['brute','general','twins','warlord','necro'].includes(k)){
      this.soldierModel(x,0,z,c,k==='general'?'commander':k==='necro'?'necromancer':'machinegun',true,k==='warlord'?3.7:3.1,Math.floor(b.age*4)%4,3);
      if(k==='warlord'){for(const side of [-1,1])this.box(x+side,1.55,z,.75,.7,.9,'#697a90');this.ball(x,2.9,z,.38,.19,.36,'#ffe197');}
      if(k==='necro'){this.g.add('cone',x,1,z,1.2,2,1.2,'#695582');this.ball(x,3,z,.28,.45,.28,'#c6a3ef');}
    }else if(k==='tank'){
      for(const side of [-1,1]){this.box(x+side*1.25,.5,z,.7,.65,3,'#4d6470');for(let i=-2;i<=2;i++)this.ball(x+side*1.57,.4,z+i*.5,.06,.22,.22,'#81949b');}
      this.box(x,.8,z,2.45,.8,2.7,c);this.disk(x,1.35,z,.9,.65,b.weak?'#f9d580':c);this.box(x,1.45,z-1.5,.25,.25,2.4,'#627b83');
    }else if(k==='walker'){
      for(const a of [-1,1])for(const side of [-1,1]){this.box(x+side*1.15,.7,z+a*.75,.38,1.4,.48,'#526979');this.box(x+side*1.2,.18,z+a*.85,.75,.35,.9,'#7c98a7');}
      this.box(x,1.65,z,2,1.2,1.9,c);this.ball(x,2.15,z-.8,.4,.28,.1,'#fac879');
      for(const p of s.parts.filter(p=>p.parent===b.id))this.box(p.x,1.8,p.z-.7,.45,.4,1.8,'#526a78');
    }else if(k==='brood'){
      this.ball(x,1,z,.95,.9,1.4,c);this.ball(x,.6,z-1,.6,.5,.6,'#d794b5');for(let i=0;i<3;i++)for(const side of [-1,1]){this.box(x+side*1.2,.45,z+(i-1)*.9,1.7,.2,.22,'#896589',side*(i-1)*.4);this.disk(x+side*1.8,.28,z+(i-1)*1.1,.12,.6,'#715577');}for(const side of [-1,1])this.ball(x+side*.22,.83,z-1.45,.12,.12,.08,'#ffe7c2');
    }else if(k==='worm'){
      for(let i=0;i<6;i++)this.ball(x+Math.sin(i*.7+b.age)*.2,1.6-i*.2,z+i*.75,.85-i*.07,.8-i*.045,.8,c);this.ball(x,1.6,z-.45,.63,.5,.3,'#7c5960');for(let i=0;i<7;i++){const a=i/7*Math.PI*2;this.g.add('cone',x+Math.cos(a)*.45,1.6+Math.sin(a)*.4,z-.73,.12,.35,.12,'#fff1cd');}
    }else if(k==='carrier'){
      this.box(x,2.6,z,1.1,.55,3.3,c);this.box(x,2.5,z,4.9,.18,1.1,'#829fc0');this.box(x,2.8,z+1.4,2.2,.1,.6,'#afbdcc');this.ball(x,2.85,z-.9,.37,.23,.6,'#bce8ec');for(const side of [-1,1]){this.box(x+side*1.5,2.45,z-.1,.45,.5,1.4,'#597988');this.box(x+side*1.5,2.5,z-1,1.25,.08,.12,'#e1e2cd',b.age*14);}
    }
  }
  object(o,s){const x=o.x,z=o.z;
    if(o.kind==='gate'){
      const bad=['subtract','divide'].includes(o.op),c=bad?'#ee6a70':o.op==='tier'?'#b098ea':'#47b5e4';
      for(const side of [-1,1]){this.box(x+side*1.5,.75,z,.14,1.5,.2,c);this.ball(x+side*1.5,1.55,z,.14,.14,.14,'#edfaff');}
      this.box(x,1.1,z,3,.95,.06,c,0,o.claimed?.2:.76);this.box(x,.05,z,3.1,.08,.6,c);
    }else if(o.kind==='cage'||o.kind==='crate'){
      this.box(x,.2,z,1.3,.4,1.15,o.kind==='cage'?'#73a094':'#dbb15d');
      if(o.kind==='cage'){for(const side of [-1,1])for(let i=-2;i<=2;i++)this.box(x+i*.24,.8,z+side*.5,.035,1.2,.035,'#e0e9df');this.box(x,1.38,z,1.3,.12,1.15,'#819e9f');this.soldierModel(x,.2,z,'#62c7ac','rifleman',false,.7,0,1);}
      else{this.box(x,.7,z,1.2,.65,1,'#e4c073');this.box(x,.73,z,.12,.68,1.04,'#68869c');this.box(x,.73,z,1.24,.68,.12,'#68869c');}
    }else if(o.kind==='pickup'){
      this.disk(x,.06,z,.8,.06,'#83e3b4',.5);for(let i=-1;i<=1;i++)this.soldierModel(x+i*.4,.14+Math.sin(s.time*4)*.07,z,'#65c79d',o.unit||'rifleman',false,.72,0,1);
    }else if(o.kind==='barrel'){this.disk(x,.42,z,.42,.8,'#d96552');this.disk(x,.62,z,.44,.08,'#ebc581');this.disk(x,.2,z,.44,.08,'#ebc581');}
    else if(o.kind==='mine'){this.disk(x,.12,z,.58,.2,'#826557');this.ball(x,.29,z,.12,.09,.12,'#ff7569');for(let j=0;j<8;j++){const a=j*Math.PI/4;this.box(x+Math.cos(a)*.53,.1,z+Math.sin(a)*.53,.27,.14,.12,'#bc9972',-a);}}
    else if(o.kind==='spikes'){this.box(x,.05,z,1.5,.12,1.3,'#9a8790');for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)this.g.add('cone',x+a*.42,o.active?.4:.14,z+b*.38,.16,o.active?.8:.23,.16,'#e5dbcd');}
    else if(o.kind==='saw'){this.disk(x,.2,z,.75,.18,'#adbbc2');for(let j=0;j<12;j++){const a=j*Math.PI/6+s.time*5;this.box(x+Math.cos(a)*.75,.23,z+Math.sin(a)*.75,.27,.17,.24,'#eef0df',-a);}this.disk(x,.33,z,.15,.08,'#e48561');}
    else if(o.kind==='laser'){for(const side of [-1,1]){this.box(x+side*1.2,.55,z,.3,1.1,.4,'#617e8e');this.ball(x+side*1.2,1.08,z,.17,.12,.17,'#ffa07d');}this.box(x,.55,z,2.4,.09,.07,o.active?'#ff626d':'#ffd698',0,o.active?.9:.35);}
  }
  label(text,x,y,z,{color='#f5ffff',background=null,size=14}={}){const p=this.project(x,y,z);if(!p.visible||p.y<0||p.y>this.h+30)return;const c=this.ctx;font(c,clamp(size*p.scale/23,9,size*1.3));c.textAlign='center';c.textBaseline='middle';if(background){const w=c.measureText(text).width+18;c.fillStyle=background;c.beginPath();c.roundRect(p.x-w/2,p.y-12,w,24,9);c.fill();}c.fillStyle=color;c.fillText(text,p.x,p.y);}
  render(s){this.w=innerWidth;this.h=innerHeight;const dpr=Math.min(devicePixelRatio||1,this.quality==='low'?1:1.7),t=THEMES[s.definition.biome]||THEMES.bridge;
    this.g.begin(this.w,this.h,dpr,t.water);if(this.overlay.width!==Math.round(this.w*dpr)||this.overlay.height!==Math.round(this.h*dpr)){this.overlay.width=Math.round(this.w*dpr);this.overlay.height=Math.round(this.h*dpr);}this.ctx.setTransform(dpr,0,0,dpr,0,0);this.ctx.clearRect(0,0,this.w,this.h);
    this.ground(s);
    for(const w of s.warnings){const a=w.applied?.3:.18+Math.min(.35,w.age/w.delay*.3);if(w.shape==='rect')this.box(w.x,.06,w.z,w.width,.02,w.depth,'#f47770',0,a);else this.disk(w.x,.06,w.z,w.radius,.02,'#f47770',a);}
    for(const o of s.objects)this.object(o,s);for(const e of s.enemies)if(e.z<65)this.soldier(e,s,true);for(const b of s.bosses)this.boss(b,s);for(const u of s.units)this.soldier(u,s);
    this.box(s.x,.04,0,.65,.04,.12,'#ffffff',.4);this.box(s.x,.04,.2,.65,.04,.12,'#ffffff',-.4);
    if(s.shieldUntil>s.time)this.ball(s.x,.3,-1.5,2.5,1.7,2.5,'#98eefa',.12);
    for(const p of s.projectiles){const k=Math.min(1,p.age/p.duration);this.ball(p.x+(p.tx-p.x)*k,.65+Math.sin(k*Math.PI)*(p.kind==='grenade'?2:.1),p.z+(p.tz-p.z)*k,.1,.1,.18,p.kind==='enemy'?'#f57e6b':'#ffeeba');}
    for(const fx of s.effects){if(fx.kind==='blast'){const a=fx.ttl/fx.total;this.ball(fx.x,.3,fx.z,(fx.radius||1)*(1-a*.3),.4+a*.9,(fx.radius||1)*(1-a*.3),fx.color,a*.7);}if(fx.kind==='pop')this.ball(fx.x,(1-fx.ttl/fx.total)*.7,fx.z,.09,.09,.09,fx.color);}
    this.g.end();const c=this.ctx;
    for(const fx of s.effects)if(fx.kind==='shot'){const a=this.project(fx.x,.65,fx.z),b=this.project(fx.tx,.5,fx.tz);if(a.visible&&b.visible){c.globalAlpha=clamp(fx.ttl/fx.total,0,1);c.strokeStyle=fx.color;c.lineWidth=1.6;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();}}c.globalAlpha=1;
    for(const o of s.objects){if(o.kind==='gate'&&!s.claimed.has(o.row)){const text=o.op==='add'?`+${o.value}`:o.op==='multiply'?`×${o.value}`:o.op==='subtract'?`−${o.value}`:o.op==='divide'?`÷${o.value}`:o.op==='tier'?'ОРУЖИЕ ↑':'ФОРСАЖ';this.label(text,o.x,1.15,o.z,{size:24});}
      if(o.shootable){this.label(String(Math.ceil(o.hp)),o.x,1.7,o.z,{background:'#436778',size:13});if(o.kind!=='barrel')this.label(`+${o.count} ${UNITS[o.unit]?.name||'бойцов'}`,o.x,2.5,o.z,{color:'#3b6c6e',background:'#e6fff1',size:12});}
      if(o.kind==='pickup')this.label(`+${o.count}`,o.x,1.5,o.z,{background:'#2caa85',size:17});
    }
    for(const w of s.warnings)if(!w.applied)this.label('!',w.x,.15,w.z,{color:'#ba4452',size:24});
    this.label(String(s.units.length),s.x,1.5,-2.5,{background:'#2596d9',size:16});
  }
}
function font(c,size){c.font=`900 ${size}px system-ui,sans-serif`;}
