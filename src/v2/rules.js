export const LIMITS=Object.freeze({army:120,enemies:700,effects:260,objects:100,road:6});
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const d2=(a,b)=>(a.x-b.x)**2+(a.z-b.z)**2;
export const alive=u=>u.hp>0&&!u.dead;
export class Random{
 constructor(seed=1){this.state=(seed>>>0)||1;}
 next(){let x=this.state;x^=x<<13;x^=x>>>17;x^=x<<5;this.state=x>>>0;return this.state/4294967296;}
 range(a,b){return a+(b-a)*this.next();}
 pick(a){return a[Math.floor(this.next()*a.length)];}
 shuffle(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(this.next()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}
}
export function formation(i,n,x=0){
 const cols=Math.min(10,Math.max(2,Math.ceil(Math.sqrt(n)*1.15))),row=Math.floor(i/cols),inRow=Math.min(cols,n-row*cols);
 return{x:clamp(x,-3.5,3.5)+(i%cols-(inRow-1)/2)*.43,z:-.45-row*.43};
}
export function inside(u,s,p=0){return s.shape==='rect'?Math.abs(u.x-s.x)<=s.width/2+p&&Math.abs(u.z-s.z)<=s.depth/2+p:d2(u,s)<=((s.radius||1)+p)**2;}
export function gateCount(n,op,v){
 if(!Number.isFinite(v)||v<0)throw Error('Invalid gate value');
 switch(op){case'add':return clamp(n+Math.floor(v),0,LIMITS.army);case'multiply':return clamp(Math.floor(n*v),0,LIMITS.army);case'subtract':return Math.max(0,n-Math.floor(v));case'divide':return v>0?Math.floor(n/v):n;default:return n;}
}
export class Grid{
 constructor(size=4){this.size=size;this.cells=new Map();}
 rebuild(items){this.cells.clear();for(const e of items){if(!alive(e)||e.hidden)continue;const k=`${Math.floor(e.x/this.size)},${Math.floor(e.z/this.size)}`;if(!this.cells.has(k))this.cells.set(k,[]);this.cells.get(k).push(e);}}
 near(x,z,r){const out=[],s=this.size;for(let a=Math.floor((x-r)/s);a<=Math.floor((x+r)/s);a++)for(let b=Math.floor((z-r)/s);b<=Math.floor((z+r)/s);b++){const c=this.cells.get(`${a},${b}`);if(c)out.push(...c);}return out;}
}
// Save migration deliberately accepts no arbitrary extra keys from localStorage.
export function normalizeSave(v={}){
 if(!v||typeof v!=='object')v={};const num=(n,d,max)=>Number.isFinite(n)?clamp(Math.floor(n),0,max):d;
 return{version:2,highestLevel:Math.max(1,num(v.highestLevel,1,12)),credits:num(v.credits,0,1e7),bestWave:num(v.bestWave,0,9999),training:num(v.training,0,3),medicine:num(v.medicine,0,3),sound:v.sound!==false,quality:v.quality==='low'?'low':'high',commander:['captain','medic','artillery'].includes(v.commander)?v.commander:'captain',complete:v.complete===true};
}
export function loadSave(storage){try{return normalizeSave(JSON.parse(storage.getItem('last-column-v2')||storage.getItem('last-column-meta')||'{}'));}catch{return normalizeSave();}}
export function saveProgress(storage,s){try{storage.setItem('last-column-v2',JSON.stringify(normalizeSave(s)));return true;}catch{return false;}}
export function purchase(s,key){if(!['training','medicine'].includes(key)||s[key]>=3)return false;const cost=150*(s[key]+1);if(s.credits<cost)return false;s.credits-=cost;s[key]++;return true;}
