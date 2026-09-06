export class Sound {
  constructor(enabled=true){this.enabled=enabled;this.ctx=null;this.last=0;this.voices=0;}
  unlock(){try{const C=window.AudioContext||window.webkitAudioContext;if(C&&!this.ctx)this.ctx=new C();if(this.ctx?.state==='suspended')this.ctx.resume().catch(()=>{});}catch{this.ctx=null;}}
  play(events){if(!this.enabled||!this.ctx||!events.length||this.voices>10)return;const now=performance.now();if(now-this.last<65)return;this.last=now;
    const type=events.includes('pickup')?'pickup':events.includes('boss')?'boss':events.includes('blast')?'blast':events.includes('ability')?'ability':events.includes('hurt')?'hurt':events[0];
    const [frequency,duration,shape,volume]={pickup:[680,.15,'sine',.025],boss:[100,.25,'sawtooth',.02],blast:[70,.16,'triangle',.04],ability:[320,.2,'sine',.025],hurt:[150,.12,'triangle',.02],shot:[220,.035,'square',.008],break:[490,.1,'triangle',.015],victory:[850,.2,'sine',.035],defeat:[90,.25,'triangle',.02]}[type]||[220,.04,'sine',.01];
    const o=this.ctx.createOscillator(),g=this.ctx.createGain(),t=this.ctx.currentTime;o.type=shape;o.frequency.setValueAtTime(frequency,t);o.frequency.exponentialRampToValueAtTime(frequency*.6,t+duration);g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(this.ctx.destination);this.voices++;o.onended=()=>{o.disconnect();g.disconnect();this.voices--;};o.start();o.stop(t+duration);
  }
}
