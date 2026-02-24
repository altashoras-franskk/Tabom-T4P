// ── Alchemy Lab — Physics Engine v2 (Bars + Quantum Tunneling) ───────────────
import {
  AlchemyState, AlchemyAgent, AlchemyPhysics, AlchemyElement,
  AlchemyEvent, ElementMix, FIELD_SIZE, AlchemyBar, BarType,
} from './alchemyTypes';
import * as Fields from './alchemyFields';
import {
  checkTransmutation, recordTransmutation, updateTransmutationState,
  createTransmutationState,
} from './alchemyTransmutation';

const rng  = () => Math.random();
const rng2 = () => (Math.random() - 0.5) * 2;

// ── Derive physics from element mix + heat ────────────────────────────────────
export function derivePhysics(mix: ElementMix, heat: number, pulseOp: string, pulseStr: number): AlchemyPhysics {
  let e = { ...mix };
  if (pulseOp === 'SOLVE') {
    const s = pulseStr;
    e = { earth: e.earth*(1-s*.5), water: Math.min(1,e.water+s*.25), air: Math.min(1,e.air+s*.25), fire: e.fire };
  } else if (pulseOp === 'COAGULA') {
    const s = pulseStr;
    e = { earth: Math.min(1,e.earth+s*.3), water: e.water*(1-s*.4), air: e.air*(1-s*.2), fire: Math.min(1,e.fire+s*.15) };
  }
  const sum = e.earth+e.water+e.air+e.fire;
  if (sum > 0) { e.earth/=sum; e.water/=sum; e.air/=sum; e.fire/=sum; }

  const h = heat;
  return {
    diffusion:    0.05 + e.water*0.4 + e.air*0.15,
    decay:        0.015 + e.fire*0.04 - e.water*0.01,
    globalMix:    0.02 + e.air*0.12,
    writeGain:    0.5 + e.fire*1.2 + h*0.5,
    cohesion:     0.05 + e.earth*0.25,
    maxSpeed:     0.012 + e.fire*0.022 + h*0.018 - e.earth*0.008,
    springStr:    0.05 + e.earth*0.25 - e.water*0.04,
    mutationRate: 0.02 + e.fire*0.15 + h*0.12,
    thresholds:   0.35 + e.earth*0.25 - e.fire*0.15,
    breathStr:    0.008 + e.water*0.022,
    heat:         h,
    transformRate:h*0.15 + e.fire*0.08,
    // Quantum tunneling probability: enhanced by tunnel bars and lapis
    tunnelProb:   0.0,  // set per-agent by bar presence
  };
}

// ── Curl-noise flow field ─────────────────────────────────────────────────────
function flowAt(x: number, y: number, t: number): [number, number] {
  const s = 3.5;
  const fx = Math.cos(y*s+t*.15)*0.5 + Math.cos(x*s*.6+t*.28)*0.5;
  const fy = Math.sin(x*s+t*.15)*0.5 + Math.sin(y*s*.6+t*.28)*0.5;
  return [fx, fy];
}

// ── Bar geometry helpers ──────────────────────────────────────────────────────
// Signed distance from point (px,py) to segment (ax,ay)→(bx,by)
function pointToSegment(px:number,py:number,ax:number,ay:number,bx:number,by:number): {
  dist: number; closest:[number,number]; t:number;
} {
  const dx=bx-ax, dy=by-ay;
  const len2=dx*dx+dy*dy;
  let t=len2<1e-10 ? 0 : Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/len2));
  const cx=ax+t*dx, cy=ay+t*dy;
  const ex=px-cx, ey=py-cy;
  return { dist:Math.sqrt(ex*ex+ey*ey), closest:[cx,cy], t };
}

// Check if agent path (x0,y0)→(x1,y1) crosses segment (ax,ay)→(bx,by)
function segmentsIntersect(
  x0:number,y0:number,x1:number,y1:number,
  ax:number,ay:number,bx:number,by:number,
): boolean {
  const dx1=x1-x0, dy1=y1-y0;
  const dx2=bx-ax, dy2=by-ay;
  const d=dx1*dy2-dy1*dx2;
  if (Math.abs(d)<1e-10) return false;
  const t=((ax-x0)*dy2-(ay-y0)*dx2)/d;
  const s=((ax-x0)*dy1-(ay-y0)*dx1)/d;
  return t>=0&&t<=1&&s>=0&&s<=1;
}

// ── Apply bar forces to a single agent ───────────────────────────────────────
export function applyBarForces(
  q: AlchemyAgent,
  nextX: number, nextY: number,
  bars: AlchemyBar[],
  lapisCharge: number,
  dt: number,
): { fx:number; fy:number; tunneled:boolean; channelDir:[number,number]|null } {
  let fx=0, fy=0, tunneled=false;
  let channelDir:[number,number]|null=null;

  for (const bar of bars) {
    if (!bar.active) continue;
    const { dist, closest, t } = pointToSegment(q.x,q.y,bar.x1,bar.y1,bar.x2,bar.y2);
    const [cx,cy] = closest;

    switch (bar.type) {
      // ── ATTRACTOR: gravitational pull toward bar ─────────────────────────
      case 'attractor': {
        const rng = 0.12 + bar.strength * 0.12;
        if (dist < rng && dist > 0.001) {
          const f = bar.strength * (1 - dist/rng) * 0.06;
          fx += (cx-q.x)/dist*f; fy += (cy-q.y)/dist*f;
        }
        break;
      }
      // ── REPULSOR: gravitational push away from bar ───────────────────────
      case 'repulsor': {
        const rng = 0.10 + bar.strength * 0.10;
        if (dist < rng && dist > 0.001) {
          const f = bar.strength * (1 - dist/rng) * 0.08;
          fx -= (cx-q.x)/dist*f; fy -= (cy-q.y)/dist*f;
        }
        break;
      }
      // ── CHANNEL: directional flow along the bar axis ─────────────────────
      // Agents near the bar are guided along its direction (quantum channeling)
      case 'channel': {
        const rng = 0.08 + bar.strength * 0.08;
        if (dist < rng) {
          const barDx=bar.x2-bar.x1, barDy=bar.y2-bar.y1;
          const barLen=Math.sqrt(barDx*barDx+barDy*barDy)+0.001;
          const dirX=barDx/barLen, dirY=barDy/barLen;
          const weight = bar.strength * (1-dist/rng);
          fx += dirX*weight*0.06; fy += dirY*weight*0.06;
          channelDir=[dirX,dirY];
          // Also write field C along channel
        }
        break;
      }
      // ── BARRIER: reflect agents; quantum tunneling based on charge ────────
      case 'barrier': {
        const rng = 0.025 + bar.strength * 0.01;
        if (dist < rng && dist > 0.0005) {
          // Repulsion from barrier surface
          const f = bar.strength * (1 - dist/rng) * 0.15;
          fx -= (cx-q.x)/dist*f; fy -= (cy-q.y)/dist*f;
        }
        // Check if agent trajectory crosses barrier
        if (segmentsIntersect(q.x,q.y,nextX,nextY,bar.x1,bar.y1,bar.x2,bar.y2)) {
          // Quantum tunneling probability: P = charge * lapisBoost
          const lapisBoost = 1 + lapisCharge * 2.0;
          const P = q.charge * 0.15 * lapisBoost;
          if (Math.random() < P) {
            // TUNNEL: pass through
            tunneled = true;
            q.tunneling = true;
          } else {
            // REFLECT: reverse velocity component perpendicular to bar
            const barDx=bar.x2-bar.x1, barDy=bar.y2-bar.y1;
            const barLen=Math.sqrt(barDx*barDx+barDy*barDy)+0.001;
            const nx=barDy/barLen, ny=-barDx/barLen;
            const dot=q.vx*nx+q.vy*ny;
            fx -= nx*dot*2/dt*0.4; fy -= ny*dot*2/dt*0.4;
          }
        }
        break;
      }
      // ── TUNNEL: quantum channel — strongly enhances tunneling probability ─
      // Also creates a "quantum superposition" visual state for agents
      case 'tunnel': {
        const rng = 0.10 + bar.strength * 0.10;
        if (dist < rng) {
          const weight = bar.strength * (1-dist/rng);
          // Agents near tunnel bars get increased coherence
          q.coherence = Math.min(1, q.coherence + weight * dt * 0.8);
          q.charge    = Math.min(1, q.charge    + weight * dt * 0.4);
          // Strong tunneling through any barrier
          q.tunneling = Math.random() < weight * 0.25;
        }
        break;
      }
    }
  }

  return { fx, fy, tunneled, channelDir };
}

// ── Spawn agent ───────────────────────────────────────────────────────────────
function spawnAgent(id: number, mix: ElementMix): AlchemyAgent {
  const r = rng();
  let element: AlchemyElement;
  const { earth, water, air } = mix;
  if (r < earth) element = 'earth';
  else if (r < earth+water) element = 'water';
  else if (r < earth+water+air) element = 'air';
  else element = 'fire';
  return {
    id, element,
    substance: 'plumbum',   // ✦ all start as lead
    x: 0.15+rng()*0.7, y: 0.15+rng()*0.7,
    vx: rng2()*0.004, vy: rng2()*0.004,
    charge: 0.1+rng()*0.6, coherence: 0.2+rng()*0.5,
    valence: rng2()*0.5, phase: rng(), age: 0,
    linkId: -1, linkTtl: 0, tunneling: false,
  };
}

// ── Create initial state ──────────────────────────────────────────────────────
export function createAlchemyState(count: number, mix: ElementMix, heat: number): AlchemyState {
  const agents: AlchemyAgent[] = [];
  for (let i=0; i<count; i++) agents.push(spawnAgent(i, mix));
  return {
    agents, count,
    field: Fields.createField(),
    metrics: { integrationIndex:.5, tensionIndex:.1, noveltyIndex:.3, lapisCharge:0, meanCharge:.3 },
    lapis: { state:'DORMANT', charge:0, forgeTimer:0, crackRisk:0 },
    elapsed:0, tick:0,
    pulse: { op:'NONE', strength:0, duration:0, maxDur:0 },
    activeEvent:null, eventTimer:0, breathPhase:0,
    elements: { ...mix }, heat,
    transmutation: createTransmutationState(),
  };
}

// ── Spatial grid for proximity ────────────────────────────────────────────────
const SG_SIZE = 12;
let _spatialGrid: number[][] = [];
function buildSpatialGrid(agents: AlchemyAgent[], count: number): void {
  if (_spatialGrid.length < SG_SIZE*SG_SIZE)
    _spatialGrid = Array.from({length:SG_SIZE*SG_SIZE}, ()=>[]);
  else for (let i=0;i<SG_SIZE*SG_SIZE;i++) _spatialGrid[i].length=0;
  for (let i=0;i<count;i++) {
    const q=agents[i];
    const gx=Math.max(0,Math.min(SG_SIZE-1,Math.floor(q.x*SG_SIZE)));
    const gy=Math.max(0,Math.min(SG_SIZE-1,Math.floor(q.y*SG_SIZE)));
    _spatialGrid[gy*SG_SIZE+gx].push(i);
  }
}
function getNearby(x:number,y:number): number[] {
  const gx=Math.max(0,Math.min(SG_SIZE-1,Math.floor(x*SG_SIZE)));
  const gy=Math.max(0,Math.min(SG_SIZE-1,Math.floor(y*SG_SIZE)));
  const r:number[]=[];
  for (let dy=-1;dy<=1;dy++) for (let dx=-1;dx<=1;dx++) {
    const nx=gx+dx, ny=gy+dy;
    if (nx>=0&&nx<SG_SIZE&&ny>=0&&ny<SG_SIZE) r.push(..._spatialGrid[ny*SG_SIZE+nx]);
  }
  return r;
}

let _prevIntegration = 0.5;

// ── Main step ─────────────────────────────────────────────────────────────────
export function stepAlchemy(
  state: AlchemyState,
  dt:    number,
  bars:  AlchemyBar[],
): void {
  if (dt<=0||dt>.1) return;
  state.elapsed += dt;
  state.tick++;

  const { agents, count, field } = state;
  const phys = derivePhysics(state.elements, state.heat, state.pulse.op, state.pulse.strength);

  // Breath oscillator (15s period)
  state.breathPhase = (state.elapsed / 15) % 1;

  // Update op pulse
  if (state.pulse.op !== 'NONE') {
    state.pulse.duration -= dt;
    state.pulse.strength = Math.max(0, state.pulse.duration / state.pulse.maxDur);
    if (state.pulse.duration <= 0) state.pulse = { op:'NONE', strength:0, duration:0, maxDur:0 };
  }

  buildSpatialGrid(agents, count);

  for (let i=0;i<count;i++) {
    const q = agents[i];
    q.age += dt;
    q.tunneling = false;
    if (q.linkTtl>0) q.linkTtl-=dt; else { q.linkId=-1; q.linkTtl=0; }
    q.phase = (q.phase + dt*0.067) % 1;

    let fx=0, fy=0;

    // ── Flow field ──────────────────────────────────────────────────────────
    const [flow_x,flow_y] = flowAt(q.x,q.y,state.elapsed);
    fx += flow_x*0.0025; fy += flow_y*0.0025;

    // ── Breath oscillator ───────────────────────────────────────────────────
    const breath = Math.sin(state.breathPhase*Math.PI*2);
    const dcx=q.x-0.5, dcy=q.y-0.5;
    const dr=Math.sqrt(dcx*dcx+dcy*dcy)+0.001;
    const breathF = -breath*phys.breathStr;
    fx += (dcx/dr)*breathF; fy += (dcy/dr)*breathF;

    // ── Field influence ──────────────────────────────────────────────────────
    const A = Fields.sampleField(field.A, q.x, q.y);
    const S = Fields.sampleField(field.S, q.x, q.y);
    const eps = 1.5/FIELD_SIZE;
    const dAx=(Fields.sampleField(field.A,q.x+eps,q.y)-Fields.sampleField(field.A,q.x-eps,q.y))/(2*eps);
    const dAy=(Fields.sampleField(field.A,q.x,q.y+eps)-Fields.sampleField(field.A,q.x,q.y-eps))/(2*eps);
    const dSx=(Fields.sampleField(field.S,q.x+eps,q.y)-Fields.sampleField(field.S,q.x-eps,q.y))/(2*eps);
    const dSy=(Fields.sampleField(field.S,q.x,q.y+eps)-Fields.sampleField(field.S,q.x,q.y-eps))/(2*eps);
    fx += dAx*Math.min(A,1)*phys.cohesion*0.15 - dSx*Math.min(S,1)*0.12;
    fy += dAy*Math.min(A,1)*phys.cohesion*0.15 - dSy*Math.min(S,1)*0.12;

    // ── Element-specific ────────────────────────────────────────────────────
    switch (q.element) {
      case 'earth': fx+=(0.5-q.x)*phys.cohesion*0.015; fy+=(0.5-q.y)*phys.cohesion*0.015; break;
      case 'air':   fx+=rng2()*0.005; fy+=rng2()*0.005; break;
      case 'fire':  fx+=rng2()*0.008; fy+=rng2()*0.008; break;
    }

    // ── Spring link ──────────────────────────────────────────────────────────
    if (q.linkId>=0&&q.linkId<count) {
      const p=agents[q.linkId];
      const dx=p.x-q.x, dy=p.y-q.y, d=Math.sqrt(dx*dx+dy*dy)+0.001;
      const spring=(d-0.06)*phys.springStr;
      fx+=dx/d*spring; fy+=dy/d*spring;
    }

    // ── Cohesion (same-element grouping) ─────────────────────────────────────
    if (phys.cohesion > 0.1) {
      const nearby = getNearby(q.x, q.y);
      let cx2=0, cy2=0, cnt=0;
      for (const j of nearby) {
        if (j===i) continue;
        const p=agents[j];
        const dx=p.x-q.x, dy=p.y-q.y, d2=dx*dx+dy*dy;
        if (d2<0.008&&p.element===q.element) {
          cx2+=p.x; cy2+=p.y; cnt++;
          if (d2<0.0012) {
            const d=Math.sqrt(d2)+.001;
            fx-=dx/d*0.012; fy-=dy/d*0.012;
          }
        }
      }
      if (cnt>0) { fx+=(cx2/cnt-q.x)*phys.cohesion*0.08; fy+=(cy2/cnt-q.y)*phys.cohesion*0.08; }
    }

    // ── Integrate (before bar check) ────────────────────────────────────────
    const damp = Math.pow(0.92, dt*60);
    q.vx = (q.vx+fx)*damp; q.vy = (q.vy+fy)*damp;
    const spd=Math.sqrt(q.vx*q.vx+q.vy*q.vy);
    if (spd>phys.maxSpeed) { q.vx=q.vx/spd*phys.maxSpeed; q.vy=q.vy/spd*phys.maxSpeed; }

    const nextX = q.x + q.vx*dt*45;
    const nextY = q.y + q.vy*dt*45;

    // ── Apply bar forces + quantum tunneling/channeling ───────────────────
    if (bars.length > 0) {
      const barResult = applyBarForces(q, nextX, nextY, bars, state.lapis.charge, dt);
      q.vx += barResult.fx; q.vy += barResult.fy;
      if (barResult.tunneled) q.tunneling = true;
      // Channel: snap velocity slightly toward channel direction
      if (barResult.channelDir) {
        const [cdx,cdy] = barResult.channelDir;
        const spd2=Math.sqrt(q.vx*q.vx+q.vy*q.vy);
        q.vx += cdx*spd2*0.15; q.vy += cdy*spd2*0.15;
      }
    }

    q.x = q.x + q.vx*dt*45;
    q.y = q.y + q.vy*dt*45;

    // Boundary
    if (q.x<0.05){q.x=0.05;q.vx*=-0.5;} if (q.x>0.95){q.x=0.95;q.vx*=-0.5;}
    if (q.y<0.05){q.y=0.05;q.vy*=-0.5;} if (q.y>0.95){q.y=0.95;q.vy*=-0.5;}

    // ── Agent state ──────────────────────────────────────────────────────────
    q.charge    = Math.max(0, Math.min(1, q.charge    + (A-S)*dt*0.15));
    q.coherence = Math.max(0, Math.min(1, q.coherence + (A-S-0.1)*dt*0.08));
    q.valence   = Math.max(-1,Math.min(1, q.valence   + (A-S)*dt*0.05));
  }

  // ── Spring formation (resonance) ─────────────────────────────────────────
  if (state.tick%6===0) {
    const springR2=phys.thresholds*phys.thresholds*0.006;
    for (let i=0;i<count;i++) {
      const qi=agents[i]; if (qi.linkId>=0) continue;
      const nearby=getNearby(qi.x,qi.y);
      for (const j of nearby) {
        if (j<=i) continue;
        const qj=agents[j]; if (qj.linkId>=0) continue;
        const dx=qi.x-qj.x, dy=qi.y-qj.y;
        if (dx*dx+dy*dy>springR2) continue;
        const chargeMatch=1-Math.abs(qi.charge-qj.charge);
        if (chargeMatch>phys.thresholds*0.8&&rng()<phys.springStr*0.3) {
          qi.linkId=j; qi.linkTtl=2+rng()*4;
          qj.linkId=i; qj.linkTtl=qi.linkTtl;
          Fields.depositAgent(field,(qi.x+qj.x)*.5,(qi.y+qj.y)*.5,0,chargeMatch,0,phys.writeGain);
        }
        break;
      }
    }
  }

  // ── Field deposit + update ────────────────────────────────────────────────
  if (state.tick%3===0) {
    for (let i=0;i<count;i++) {
      const q=agents[i];
      // Tunneling agents deposit S (uncertainty, disruption) but also C
      const tunnelingBonus = q.tunneling ? 0.5 : 0;
      const stress   = Math.max(0,q.valence<0?-q.valence:0)+(1-q.coherence)*0.4+tunnelingBonus*0.3;
      const affinity = Math.max(0,q.valence)*q.coherence + (q.tunneling?0.2:0);
      Fields.depositAgent(field,q.x,q.y,q.charge,affinity,stress,phys.writeGain);
    }
  }
  if (state.tick%2===0) {
    Fields.updateField(field, dt*2, phys, state.lapis.state==='FORGED');
  }

  // ── Metrics ───────────────────────────────────────────────────────────────
  if (state.tick%10===0) {
    const fm=Fields.computeFieldMetrics(field);
    const novelty=Math.min(1,Math.abs(fm.integration-_prevIntegration)*25);
    _prevIntegration=fm.integration;
    state.metrics = {
      integrationIndex: fm.integration,
      tensionIndex:     fm.tension,
      noveltyIndex:     novelty,
      lapisCharge:      state.lapis.charge,
      meanCharge:       fm.meanC,
    };
  }

  updateLapis(state, dt, phys);
  updateEvents(state, dt, phys);

  // ── Mutation ──────────────────────────────────────────────────────────────
  if (phys.mutationRate>0.08&&state.tick%30===0) {
    const c2=Math.ceil(count*phys.mutationRate*0.06);
    for (let m=0;m<c2;m++) {
      const idx=Math.floor(rng()*count), q=agents[idx], r=rng();
      if (r<.25) q.element='earth'; else if (r<.5) q.element='water';
      else if (r<.75) q.element='air'; else q.element='fire';
    }
  }

  // ── ✦ Transmutation step (every 8 ticks) ─────────────────────────────────
  if (state.tick % 8 === 0) {
    const { elements, heat, lapis, pulse, transmutation } = state;

    // Compute conjunction: active when both sulphur+mercury present (>=3 each)
    let sulphurCount = 0, mercuryCount = 0;
    for (let i = 0; i < count; i++) {
      if (agents[i].substance === 'sulphur')   sulphurCount++;
      if (agents[i].substance === 'mercurius') mercuryCount++;
    }
    const conjActive = sulphurCount >= 3 && mercuryCount >= 3;

    for (let i = 0; i < count; i++) {
      const q = agents[i];
      const next = checkTransmutation(
        q.substance, q.charge, q.coherence,
        elements, heat,
        lapis.state,
        pulse.op,
        conjActive,
      );
      if (next !== null) {
        // Find which recipe fired (for flash registration)
        const recipeId = next === 'argentum' && conjActive &&
          (q.substance === 'sulphur' || q.substance === 'mercurius')
          ? 'coniunctio' : 'generic';
        q.substance = next;
        recordTransmutation(transmutation, q.x, q.y, next, recipeId);
      }
    }
  }

  // ── Flash aging + counts update (every frame) ────────────────────────────
  updateTransmutationState(
    state.transmutation,
    state.agents.map(a => a.substance),
    dt,  // per-frame dt for flash aging
  );
}

function updateLapis(state:AlchemyState,dt:number,phys:AlchemyPhysics):void {
  const m=state.metrics, l=state.lapis, h=state.heat;
  l.crackRisk+=dt*((h>0.7?(h-0.7)*0.3:0)+(state.activeEvent==='BURNOUT'?0.05:0));
  l.crackRisk=Math.max(0,Math.min(1,l.crackRisk-dt*0.02));
  switch(l.state){
    case 'DORMANT':
      l.charge+=dt*m.integrationIndex*0.04; l.charge=Math.min(0.4,l.charge);
      if(l.charge>0.25&&m.integrationIndex>0.6){l.state='FORMING';l.forgeTimer=0;}
      break;
    case 'FORMING':
      l.forgeTimer+=dt;
      l.charge+=dt*m.integrationIndex*0.06-dt*m.tensionIndex*0.04;
      l.charge=Math.max(0.2,Math.min(0.85,l.charge));
      if(l.charge>0.7&&l.forgeTimer>15&&m.integrationIndex>0.65)l.state='FORGED';
      if(l.crackRisk>0.75){l.state='CRACKED';l.charge*=0.5;}
      break;
    case 'FORGED':
      l.charge+=dt*(m.integrationIndex-0.5)*0.04;
      l.charge=Math.max(0.4,Math.min(1.0,l.charge));
      if(l.crackRisk>0.85||state.activeEvent==='BURNOUT'){l.state='CRACKED';l.charge*=0.4;}
      break;
    case 'CRACKED':
      l.charge+=dt*(m.integrationIndex-0.5)*0.025;
      l.charge=Math.max(0.05,Math.min(0.5,l.charge));
      l.crackRisk-=dt*0.04;
      if(l.crackRisk<=0&&l.charge>0.3&&m.integrationIndex>0.6){l.state='FORMING';l.forgeTimer=0;}
      break;
  }
  state.metrics.lapisCharge=l.charge;
}

function updateEvents(state:AlchemyState,dt:number,phys:AlchemyPhysics):void {
  if(state.activeEvent){
    state.eventTimer+=dt;
    if(state.eventTimer>4){state.activeEvent=null;state.eventTimer=0;}
    return;
  }
  const m=state.metrics,h=state.heat;
  if(phys.writeGain>1.6&&h>0.7&&m.tensionIndex>0.65){
    state.activeEvent='BURNOUT';state.eventTimer=0;
    for(let k=0;k<Math.ceil(state.count*0.15);k++){
      const q=state.agents[Math.floor(rng()*state.count)];
      q.valence=-0.5;q.coherence=Math.max(0,q.coherence-0.3);
    }
    return;
  }
  if(phys.cohesion>0.25&&m.noveltyIndex<0.05&&state.elapsed>20){
    state.activeEvent='CRYSTALLIZATION';state.eventTimer=0;return;
  }
  if(phys.diffusion>0.38&&m.integrationIndex<0.3){
    state.activeEvent='DISSOLUTION';state.eventTimer=0;
    for(const q of state.agents){q.linkId=-1;q.linkTtl=0;}
    return;
  }
  if(phys.globalMix>0.1&&m.integrationIndex<0.35&&m.noveltyIndex>0.6){
    state.activeEvent='NOISE';state.eventTimer=0;
  }
}

export function applyOpPulse(state:AlchemyState,op:'SOLVE'|'COAGULA'):void {
  if(state.pulse.op!=='NONE') return;
  const dur=3.5;
  state.pulse={op,strength:1,duration:dur,maxDur:dur};
  const field=state.field, n=field.C.length;
  if(op==='SOLVE') for(let i=0;i<n;i++) field.S[i]=Math.min(1,field.S[i]+0.08);
  else             for(let i=0;i<n;i++) field.A[i]=Math.min(1,field.A[i]+0.10);
}