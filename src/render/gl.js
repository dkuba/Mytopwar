// Local instanced WebGL2, with a software projection of the same geometry as fallback.
const VS=`#version 300 es
precision highp float;
layout(location=0) in vec3 position;layout(location=1) in vec3 normal;
layout(location=2) in vec3 offset;layout(location=3) in vec3 scale;
layout(location=4) in float angle;layout(location=5) in vec4 tint;
uniform mat4 vp;out vec3 n;out vec4 col;out float depth;
void main(){float c=cos(angle),s=sin(angle);mat3 r=mat3(c,0.,-s,0.,1.,0.,s,0.,c);
vec3 w=r*(position*scale)+offset;n=normalize(r*(normal/max(scale,vec3(.001))));col=tint;depth=w.z;gl_Position=vp*vec4(w,1.);}`;
const FS=`#version 300 es
precision highp float;in vec3 n;in vec4 col;in float depth;uniform vec3 fog;out vec4 outColor;
void main(){float d=max(dot(normalize(n),normalize(vec3(-.5,1.,-.7))),0.);
vec3 lit=col.rgb*(.60+d*.40);lit=mix(lit,fog,smoothstep(38.,95.,depth)*.55);outColor=vec4(lit,col.a);}`;
function shader(g,type,source){const s=g.createShader(type);g.shaderSource(s,source);g.compileShader(s);if(!g.getShaderParameter(s,g.COMPILE_STATUS))throw Error(g.getShaderInfoLog(s));return s;}
function geometry(kind){const v=[],indices=[],push=(p,n)=>v.push(...p,...n);
  if(kind==='box')for(const [n,points] of [
    [[0,0,1],[[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]]],
    [[0,0,-1],[[.5,-.5,-.5],[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5]]],
    [[1,0,0],[[.5,-.5,.5],[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5]]],
    [[-1,0,0],[[-.5,-.5,-.5],[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5]]],
    [[0,1,0],[[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5],[-.5,.5,-.5]]],
    [[0,-1,0],[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,.5]]],
  ]){const b=v.length/6;for(const p of points)push(p,n);indices.push(b,b+1,b+2,b,b+2,b+3);}
  else if(kind==='sphere'){const rings=7,sides=10;for(let y=0;y<=rings;y++)for(let x=0;x<=sides;x++){const a=y/rings*Math.PI,b=x/sides*Math.PI*2,p=[Math.sin(a)*Math.cos(b),Math.cos(a),Math.sin(a)*Math.sin(b)];push(p,p);}for(let y=0;y<rings;y++)for(let x=0;x<sides;x++){const a=y*(sides+1)+x,b=a+sides+1;indices.push(a,b,a+1,a+1,b,b+1);}}
  else{const sides=12,top=kind==='cone'?0:1;for(let i=0;i<=sides;i++){const a=i/sides*Math.PI*2,c=Math.cos(a),s=Math.sin(a);push([c,-.5,s],[c,1-top,s]);push([c*top,.5,s*top],[c,1-top,s]);}for(let i=0;i<sides;i++){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}for(const [h,r,ny] of [[-.5,1,-1],[.5,top,1]]){const b=v.length/6;push([0,h,0],[0,ny,0]);for(let i=0;i<=sides;i++){const a=i/sides*Math.PI*2;push([Math.cos(a)*r,h,Math.sin(a)*r],[0,ny,0]);}for(let i=0;i<sides;i++)indices.push(b,b+i+1,b+i+2);}}
  return {vertices:new Float32Array(v),indices:new Uint16Array(indices)};
}
export function multiply(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;}
const norm=v=>{const d=Math.hypot(...v);return v.map(x=>x/d);};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
export function camera(aspect){const eye=[0,22,-25],target=[0,0,11],z=norm(eye.map((v,i)=>v-target[i])),x=norm(cross([0,1,0],z)),y=cross(z,x);
  const view=new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);
  const f=1/Math.tan((aspect<.8?51:40)*Math.PI/360),near=.1,far=180;
  // Reflect horizontally: world +x must be screen-right when looking down the +z road.
  return multiply(new Float32Array([-f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]),view);
}
export class Instancer {
  constructor(canvas){this.canvas=canvas;const g=canvas.getContext('webgl2',{antialias:true,alpha:false,powerPreference:'high-performance'});if(!g)return new SoftwareInstancer(canvas);
    this.mode='webgl2';this.gl=g;this.program=g.createProgram();g.attachShader(this.program,shader(g,g.VERTEX_SHADER,VS));g.attachShader(this.program,shader(g,g.FRAGMENT_SHADER,FS));g.linkProgram(this.program);if(!g.getProgramParameter(this.program,g.LINK_STATUS))throw Error(g.getProgramInfoLog(this.program));
    this.vpLoc=g.getUniformLocation(this.program,'vp');this.fogLoc=g.getUniformLocation(this.program,'fog');this.batches=new Map();this.colors=new Map();
    for(const kind of ['box','sphere','cylinder','cone'])for(const alpha of [false,true]){const mesh=geometry(kind),vao=g.createVertexArray();g.bindVertexArray(vao);const buffer=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,buffer);g.bufferData(g.ARRAY_BUFFER,mesh.vertices,g.STATIC_DRAW);for(let a=0;a<2;a++){g.enableVertexAttribArray(a);g.vertexAttribPointer(a,3,g.FLOAT,false,24,a*12);}const elements=g.createBuffer();g.bindBuffer(g.ELEMENT_ARRAY_BUFFER,elements);g.bufferData(g.ELEMENT_ARRAY_BUFFER,mesh.indices,g.STATIC_DRAW);const instances=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,instances);for(const [loc,n,offset] of [[2,3,0],[3,3,12],[4,1,24],[5,4,28]]){g.enableVertexAttribArray(loc);g.vertexAttribPointer(loc,n,g.FLOAT,false,44,offset);g.vertexAttribDivisor(loc,1);}this.batches.set(kind+(alpha?'t':''),{vao,buffer,elements,instances,length:mesh.indices.length,data:new Float32Array(11*14000),count:0,alpha});}
    g.enable(g.DEPTH_TEST);g.enable(g.BLEND);g.blendFunc(g.SRC_ALPHA,g.ONE_MINUS_SRC_ALPHA);
  }
  color(hex){if(!this.colors.has(hex))this.colors.set(hex,[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255));return this.colors.get(hex);}
  begin(w,h,dpr,background){const g=this.gl;if(this.canvas.width!==Math.round(w*dpr)||this.canvas.height!==Math.round(h*dpr)){this.canvas.width=Math.round(w*dpr);this.canvas.height=Math.round(h*dpr);}g.viewport(0,0,this.canvas.width,this.canvas.height);const color=this.color(background);g.clearColor(...color,1);g.clear(g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT);this.vp=camera(w/h);for(const b of this.batches.values())b.count=0;this.background=color;}
  add(kind,x,y,z,sx,sy,sz,color,yaw=0,alpha=1){const b=this.batches.get(kind+(alpha<1?'t':''));if(b.count>=14000)return;const i=b.count++*11;b.data.set([x,y,z,sx,sy,sz,yaw,...this.color(color),alpha],i);}
  end(){const g=this.gl;g.useProgram(this.program);g.uniformMatrix4fv(this.vpLoc,false,this.vp);g.uniform3fv(this.fogLoc,this.background);this.drawCalls=0;this.instanceCount=0;for(const transparent of [false,true]){g.depthMask(!transparent);for(const b of this.batches.values()){if(b.alpha!==transparent||!b.count)continue;g.bindVertexArray(b.vao);g.bindBuffer(g.ARRAY_BUFFER,b.instances);g.bufferData(g.ARRAY_BUFFER,b.data.subarray(0,b.count*11),g.DYNAMIC_DRAW);g.drawElementsInstanced(g.TRIANGLES,b.length,g.UNSIGNED_SHORT,0,b.count);this.drawCalls++;this.instanceCount+=b.count;}}g.depthMask(true);}
}
/** Same perspective scene, shaded primitives and cached soldiers when WebGL is disabled. */
class SoftwareInstancer {
  constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');if(!this.ctx)throw Error('Браузер не предоставил графический контекст.');this.items=[];this.sprites=new Map();this.colors=new Map();this.mode='software3d';this.unitSprites=new Map();this.baking=false;}
  color(hex){if(!this.colors.has(hex))this.colors.set(hex,[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)));return this.colors.get(hex);}
  shade(hex,n){return `rgb(${this.color(hex).map(v=>Math.min(255,Math.round(v*n))).join(',')})`;}
  begin(w,h,dpr,background){this.w=w;this.h=h;if(this.canvas.width!==Math.round(w*dpr)||this.canvas.height!==Math.round(h*dpr)){this.canvas.width=Math.round(w*dpr);this.canvas.height=Math.round(h*dpr);}this.ctx.setTransform(dpr,0,0,dpr,0,0);this.ctx.fillStyle=background;this.ctx.fillRect(0,0,w,h);this.vp=camera(w/h);this.items=[];this.water=null;}
  add(kind,x,y,z,sx,sy,sz,color,yaw=0,alpha=1){if(sx>100){this.water=color;return;}const layer=y<=.04?(alpha<1?1:0):sz>30?0:2;this.items.push({kind,x,y,z,sx,sy,sz,color,yaw,alpha,layer,depth:z*.852-y*.524});}
  point(x,y,z){if(this.baking)return{x:64+x*58,y:120-y*58-z*30};const m=this.vp,w=Math.max(.5,m[3]*x+m[7]*y+m[11]*z+m[15]);return{x:((m[0]*x+m[4]*y+m[8]*z+m[12])/w+1)*this.w/2,y:(1-(m[1]*x+m[5]*y+m[9]*z+m[13])/w)*this.h/2};}
  sphereSprite(color){if(!this.sprites.has(color)){const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(22,18,2,32,32,32);g.addColorStop(0,this.shade(color,1.15));g.addColorStop(.45,this.shade(color,1));g.addColorStop(1,this.shade(color,.62));ctx.fillStyle=g;ctx.beginPath();ctx.arc(32,32,31,0,Math.PI*2);ctx.fill();this.sprites.set(color,c);}return this.sprites.get(color);}
  poly(points,color){const c=this.ctx;c.fillStyle=color;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fill();}
  unit(key,x,z,size,arrival,produce){if(!this.unitSprites.has(key)){const canvas=document.createElement('canvas');canvas.width=128;canvas.height=160;const saved={ctx:this.ctx,items:this.items,w:this.w,h:this.h};this.ctx=canvas.getContext('2d');this.items=[];this.w=128;this.h=160;this.baking=true;produce();this.items.sort((a,b)=>a.layer-b.layer||b.depth-a.depth);for(const o of this.items)this.draw(o);this.baking=false;Object.assign(this,saved);if(this.unitSprites.size>320)this.unitSprites.delete(this.unitSprites.keys().next().value);this.unitSprites.set(key,canvas);}this.items.push({kind:'sprite',x,y:arrival,z,size,canvas:this.unitSprites.get(key),layer:2,depth:z*.852-arrival*.524});}
  draw(o){const c=this.ctx,p=this.point(o.x,o.y,o.z),q=this.point(o.x+1,o.y,o.z),unit=Math.abs(q.x-p.x);if(o.kind==='sprite'){const k=unit/58*o.size;c.globalAlpha=1;c.drawImage(o.canvas,p.x-64*k,p.y-120*k,128*k,160*k);return;}if(p.y< -300||p.y>this.h+400||p.x< -500||p.x>this.w+500)return;c.globalAlpha=o.alpha;
    if(o.kind==='sphere'){const rx=Math.max(.1,o.sx*unit),ry=Math.max(.1,Math.hypot(o.sy*.88,o.sz*.52)*unit);c.drawImage(this.sphereSprite(o.color),p.x-rx,p.y-ry,rx*2,ry*2);}
    else if(o.kind==='cylinder'||o.kind==='cone'){const top=this.point(o.x,o.y+o.sy/2,o.z),bottom=this.point(o.x,o.y-o.sy/2,o.z),rx=Math.max(.05,o.sx*unit),ry=Math.max(.05,o.sz*unit*.52);c.fillStyle=this.shade(o.color,.77);c.beginPath();c.ellipse(bottom.x,bottom.y,rx,ry,0,0,Math.PI*2);c.fill();if(o.kind==='cone')this.poly([{x:bottom.x-rx,y:bottom.y},{x:top.x,y:top.y},{x:bottom.x+rx,y:bottom.y}],this.shade(o.color,.92));else{this.poly([{x:top.x-rx,y:top.y},{x:top.x+rx,y:top.y},{x:bottom.x+rx,y:bottom.y},{x:bottom.x-rx,y:bottom.y}],this.shade(o.color,.82));c.fillStyle=this.shade(o.color,1.02);c.beginPath();c.ellipse(top.x,top.y,rx,ry,0,0,Math.PI*2);c.fill();}}
    else{const ca=Math.cos(o.yaw),sa=Math.sin(o.yaw),project=(x,y,z)=>this.point(o.x+x*o.sx*ca+z*o.sz*sa,o.y+y*o.sy,o.z-x*o.sx*sa+z*o.sz*ca);for(const [n,v,light] of [
      [[0,1,0],[[-.5,.5,-.5],[.5,.5,-.5],[.5,.5,.5],[-.5,.5,.5]],1.03],
      [[0,0,-1],[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,.5,-.5],[-.5,.5,-.5]],.79],
      [[0,0,1],[[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]],.83],
      [[1,0,0],[[.5,-.5,-.5],[.5,-.5,.5],[.5,.5,.5],[.5,.5,-.5]],.87],
      [[-1,0,0],[[-.5,-.5,-.5],[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5]],.94],
    ]){const nx=n[0]*ca+n[2]*sa,nz=-n[0]*sa+n[2]*ca;if(nx*(-o.x)+n[1]*(22-o.y)+nz*(-25-o.z)>0)this.poly(v.map(v=>project(...v)),this.shade(o.color,light));}}
  }
  end(){const c=this.ctx;if(this.water){c.fillStyle=this.water;c.fillRect(0,0,this.w,this.h);}this.items.sort((a,b)=>a.layer-b.layer||b.depth-a.depth);for(const o of this.items)this.draw(o);c.globalAlpha=1;this.instanceCount=this.items.length;this.drawCalls=this.items.length;}
}
