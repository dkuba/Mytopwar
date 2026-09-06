export class RNG {
  constructor(seed=Date.now()>>>0){this.state=seed||0x12345678}
  next(){let x=this.state;x^=x<<13;x^=x>>>17;x^=x<<5;this.state=x>>>0;return this.state/4294967296}
  range(a,b){return a+(b-a)*this.next()}
  int(a,b){return Math.floor(this.range(a,b+1))}
  pick(arr){return arr[Math.floor(this.next()*arr.length)]}
  weighted(entries){let r=this.next(),sum=0;for(const [v,w] of entries){sum+=w;if(r<=sum)return v}return entries.at(-1)[0]}
  shuffle(arr){const out=[...arr];for(let i=out.length-1;i>0;i--){const j=Math.floor(this.next()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out}
}
