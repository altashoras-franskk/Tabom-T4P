let _sampler: ((x:number,y:number)=>any) | null = null;
let _sigilSampler: ((x:number,y:number)=>any) | null = null;
let _sigilDeposit: ((kind:'bond'|'rift'|'bloom'|'oath', x:number,y:number, amount:number)=>void) | null = null;

export function setFieldSampler(fn: (x:number,y:number)=>any) { 
  _sampler = fn; 
}

export function setSigilSampler(fn:(x:number,y:number)=>any){ 
  _sigilSampler = fn; 
}

export function setSigilDepositor(fn:(kind:any,x:number,y:number,amount:number)=>void){ 
  _sigilDeposit = fn; 
}

export function depositSigil(kind:'bond'|'rift'|'bloom'|'oath', x:number,y:number, amount:number){
  if (_sigilDeposit) _sigilDeposit(kind,x,y,amount);
}

export function fieldInfluence(x:number,y:number) {
  const base = _sampler ? _sampler(x,y) : { 
    nutrient: 0.5, 
    tension: 0, 
    memory: 0, 
    entropy: 0, 
    scarcity: 0.5, 
    cohesion: 0, 
    volatility: 0 
  };
  const sig = _sigilSampler ? _sigilSampler(x,y) : { bond:0, rift:0, bloom:0, oath:0 };
  return { 
    ...base, 
    sigilBond: sig.bond, 
    sigilRift: sig.rift, 
    sigilBloom: sig.bloom, 
    sigilOath: sig.oath 
  };
}
