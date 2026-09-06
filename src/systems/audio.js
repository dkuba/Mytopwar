export class AudioSystem {
  constructor(){this.ctx=null;this.lastShot=0}
  unlock(){if(!this.ctx){this.ctx=new (window.AudioContext||window.webkitAudioContext)()} if(this.ctx.state==='suspended')this.ctx.resume()}
  tone(freq=220,duration=.05,type='square',gain=.025){if(!this.ctx)return;const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(gain,this.ctx.currentTime);g.gain.exponentialRampToValueAtTime(.0001,this.ctx.currentTime+duration);o.connect(g);g.connect(this.ctx.destination);o.start();o.stop(this.ctx.currentTime+duration)}
  shot(kind){const now=performance.now();if(now-this.lastShot<45)return;this.lastShot=now;this.tone(kind==='rocket'?90:kind==='grenade'?120:210,.035,kind==='rocket'?'sawtooth':'square',.012)}
  explosion(big=false){this.tone(big?54:72,big?.28:.16,'sawtooth',big?.07:.04)}
  pickup(){this.tone(620,.07,'sine',.04);setTimeout(()=>this.tone(860,.08,'sine',.03),55)}
  ability(){this.tone(130,.09,'sawtooth',.05);setTimeout(()=>this.tone(260,.12,'sawtooth',.04),70)}
}
