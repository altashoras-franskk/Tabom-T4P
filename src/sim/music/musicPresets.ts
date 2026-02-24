// ── Music Lab — 60 Curated Presets ──────────────────────────────────────────────
// Each preset is designed as a complete musical experience: physics behavior,
// harmonic language, timbral palette, and visual identity work as one system.
import { MusicPreset, RoleConfig, Envelope } from './musicTypes';

const Q = (a: number, d: number, s: number, r: number): Envelope =>
  ({ attack:a, decay:d, sustain:s, release:r });

const role = (
  proportion: number,
  pitchRange: [number, number],
  envelope: Envelope,
  waveform: RoleConfig['waveform'],
  filterType: BiquadFilterType,
  filterFreq: number,
  filterQ: number,
  gainScale: number,
  detune: number,
  panSpread: number,
  maxVoices: number,
  cooldownMin: number,
): RoleConfig => ({
  proportion, pitchRange, envelope, waveform,
  filterType, filterFreq, filterQ, gainScale, detune,
  panSpread, maxVoices, cooldownMin,
});

// ═════════════════════════════════════════════════════════════════════════════
// ── PRESETS ──────────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════
export const MUSIC_PRESETS: MusicPreset[] = [

  // ═══════════════════════════════════════════════════════════════════════════
  // ── I. AMBIENT & MEDITATIVE ────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  // 1 ── Eno Drift Garden ─────────────────────────────────────────────────────
  // Slow-drifting particles paint long pads and choral washes.
  // motionStyle: drift — particles float like pollen. Few gates, low event rate.
  {
    id:'eno-drift', name:'Eno Drift Garden', intensity:1,
    description:'Pads infinitos, root drift lento. Reverb expansivo como um jardim.',
    vibe:'Infinite, Still, Breathing',
    tags:['Ambient','Eno','Meditative','Soft'],
    bpm:48, scale:'major', root:53, quantaCount:64,
    motionStyle:'drift',
    roles:{
      PAD:     role(.55,[48,72],Q(1.2,.5,.8,2.5),'sine','lowpass',900,1.2,.50,0,.9,4,1.8),
      STRINGS: role(.30,[53,69],Q(.8,.4,.7,1.8),'triangle','lowpass',1200,1,.40,3,.8,3,1.5),
      CHOIR:   role(.15,[60,72],Q(1.5,.6,.75,3.0),'sine','lowpass',700,1,.35,0,1.,2,2.5),
    },
    syncThreshold:.3, encounterR:.18, entainment:.25, eventRate:.25,
    reverbAmt:.85, delayAmt:.5, delayTime:.55, masterGain:.7,
    harmonyMode:'consonant',
    particleGlow:2.2, trailLen:12, lens:'Harmony', bgPulse:false, cinematic:true,
    primary:'#88ffcc', secondary:'#001122', accent:'#ffeebb',
    gateCount:2, attractorCount:1,
  },

  // 2 ── Deep Space Choir ─────────────────────────────────────────────────────
  // Orbital particles singing in vast reverb. Lydian harmonic halos.
  {
    id:'deep-choir', name:'Deep Space Choir', intensity:2,
    description:'Vozes cósmicas orbitando. Cada encontro é um harmônico vocal.',
    vibe:'Vast, Choral, Cosmic',
    tags:['Ambient','Choral','Space','Meditative'],
    bpm:40, scale:'lydian', root:48, quantaCount:72,
    motionStyle:'orbit',
    roles:{
      CHOIR:   role(.50,[48,72],Q(1.8,.7,.82,3.5),'sine','lowpass',800,1.1,.45,0,.95,4,2.0),
      PAD:     role(.30,[42,60],Q(2.0,.8,.85,4.0),'triangle','lowpass',600,1,.35,7,.9,3,2.5),
      STRINGS: role(.20,[55,72],Q(.9,.5,.7,2.0),'sine','lowpass',1400,1.2,.4,-5,.7,2,1.8),
    },
    syncThreshold:.28, encounterR:.20, entainment:.3, eventRate:.2,
    reverbAmt:.92, delayAmt:.6, delayTime:.7, masterGain:.65,
    harmonyMode:'consonant',
    particleGlow:2.8, trailLen:16, lens:'Harmony', bgPulse:false, cinematic:true,
    primary:'#aabbff', secondary:'#020510', accent:'#ffd5a0',
    gateCount:1, attractorCount:1,
  },

  // 3 ── Meditation Pool ──────────────────────────────────────────────────────
  // Ultra-slow meditation physics. Particles barely move. Each note is precious.
  {
    id:'meditation-pool', name:'Meditation Pool', intensity:1,
    description:'Meditação ultralenta. Cada nota emerge como uma gota na superfície.',
    vibe:'Stillness, Breath, Zen',
    tags:['Ambient','Meditative','Soft','Drone'],
    bpm:36, scale:'pentatonic', root:48, quantaCount:40,
    motionStyle:'meditation',
    roles:{
      PAD:     role(.45,[48,72],Q(2.5,1.0,.85,4.0),'sine','lowpass',600,.8,.38,0,.9,3,3.0),
      STRINGS: role(.35,[53,72],Q(1.5,.8,.75,3.0),'triangle','lowpass',800,1,.35,5,.8,2,2.5),
      CHOIR:   role(.20,[60,72],Q(2.0,.8,.80,3.5),'sine','lowpass',550,.9,.30,0,1.,2,3.5),
    },
    syncThreshold:.20, encounterR:.25, entainment:.15, eventRate:.12,
    reverbAmt:.95, delayAmt:.7, delayTime:.8, masterGain:.55,
    harmonyMode:'consonant',
    particleGlow:3.0, trailLen:20, lens:'Harmony', bgPulse:false, cinematic:true,
    primary:'#aaccff', secondary:'#020208', accent:'#ffeedd',
    gateCount:1, attractorCount:0,
  },

  // 4 ── Underwater Harmonics ─────────────────────────────────────────────────
  // School-of-fish motion, detuned sine layers = subaquatic pressure.
  {
    id:'underwater', name:'Underwater Harmonics', intensity:2,
    description:'Cardume submerso. Frequências graves e harmônicos molhados.',
    vibe:'Deep, Pressure, Liquid',
    tags:['Ambient','Aquatic','Drone','Experimental'],
    bpm:52, scale:'dorian', root:40, quantaCount:80,
    motionStyle:'school',
    roles:{
      BASS:    role(.30,[28,48],Q(.3,.3,.75,1.5),'sine','lowpass',200,1.5,.55,-3,.4,3,.8),
      PAD:     role(.35,[40,64],Q(1.5,.5,.80,2.5),'triangle','lowpass',700,1.2,.45,8,.9,3,1.8),
      STRINGS: role(.20,[48,72],Q(.8,.4,.65,1.5),'sine','lowpass',1100,1,.35,0,.7,2,1.2),
      LEAD:    role(.15,[55,76],Q(.15,.2,.50,1.0),'triangle','bandpass',900,2,.30,12,.6,2,1.0),
    },
    syncThreshold:.32, encounterR:.15, entainment:.35, eventRate:.35,
    reverbAmt:.88, delayAmt:.55, delayTime:.45, masterGain:.7,
    harmonyMode:'consonant',
    particleGlow:1.8, trailLen:10, lens:'Harmony', bgPulse:false, cinematic:true,
    primary:'#00aacc', secondary:'#001520', accent:'#88ffee',
    gateCount:3, attractorCount:1,
  },

  // 5 ── Glass Arpeggios ──────────────────────────────────────────────────────
  // Lattice motion — particles snap to grid. Triangle arps shimmer like crystal.
  {
    id:'glass-arps', name:'Glass Arpeggios', intensity:3,
    description:'Arpejos cristalinos em padrão de grade. Philip Glass emergente.',
    vibe:'Crystal, Pattern, Minimalist',
    tags:['Classical','Minimalist','Arpeggios','Generative'],
    bpm:88, scale:'major', root:60, quantaCount:96,
    motionStyle:'lattice',
    roles:{
      ARP:     role(.35,[60,96],Q(.003,.12,.15,.22),'triangle','lowpass',3200,2,.55,0,.6,4,.14),
      LEAD:    role(.25,[60,84],Q(.008,.10,.45,.18),'triangle','lowpass',2400,1.5,.50,5,.5,3,.22),
      PAD:     role(.20,[48,72],Q(.6,.3,.7,1.2),'sine','lowpass',1000,1,.40,0,.8,2,.9),
      BASS:    role(.20,[36,52],Q(.01,.2,.55,.2),'triangle','lowpass',400,1.5,.50,0,.3,3,.35),
    },
    syncThreshold:.42, encounterR:.10, entainment:.55, eventRate:.65,
    reverbAmt:.45, delayAmt:.4, delayTime:.22, masterGain:.78,
    harmonyMode:'consonant',
    particleGlow:1.2, trailLen:5, lens:'Notes', bgPulse:false, cinematic:false,
    primary:'#aaeeff', secondary:'#0a1020', accent:'#ffd700',
    gateCount:4, attractorCount:1,
  },

  // 6 ── Drone Mandala ────────────────────────────────────────────────────────
  // Spiral physics — particles draw mandalas. Deep drones + overtones.
  {
    id:'drone-mandala', name:'Drone Mandala', intensity:1,
    description:'Espiral lenta formando mandala sonora. Drones e overtones emergentes.',
    vibe:'Ritual, Trance, Ancient',
    tags:['Drone','Meditative','Space','Experimental'],
    bpm:44, scale:'phrygian', root:36, quantaCount:56,
    motionStyle:'spiral',
    roles:{
      PAD:     role(.40,[36,60],Q(2.0,.8,.85,3.5),'sawtooth','lowpass',350,2,.50,0,.9,3,2.0),
      CHOIR:   role(.30,[48,72],Q(1.8,.7,.80,3.0),'sine','lowpass',700,1,.40,0,1.,2,2.5),
      STRINGS: role(.20,[42,66],Q(1.0,.5,.70,2.0),'triangle','lowpass',1000,1.2,.35,5,.8,2,1.5),
      BASS:    role(.10,[24,42],Q(.5,.4,.80,2.0),'sine','lowpass',180,.8,.55,0,.3,2,1.5),
    },
    syncThreshold:.25, encounterR:.18, entainment:.20, eventRate:.18,
    reverbAmt:.90, delayAmt:.65, delayTime:.7, masterGain:.6,
    harmonyMode:'modal',
    particleGlow:2.5, trailLen:18, lens:'Harmony', bgPulse:false, cinematic:true,
    primary:'#cc88ff', secondary:'#0a0515', accent:'#ffcc88',
    gateCount:2, attractorCount:1,
  },

  // 7 ── Aurora Borealis ──────────────────────────────────────────────────────
  // Migration physics — particles stream like northern lights. Whole tone mystery.
  {
    id:'aurora', name:'Aurora Borealis', intensity:2,
    description:'Partículas migrando como cortinas de aurora. Melodias etéreas.',
    vibe:'Northern Lights, Ethereal, Slow',
    tags:['Ambient','Space','Experimental','Soft'],
    bpm:46, scale:'whole_tone', root:50, quantaCount:88,
    motionStyle:'migration',
    roles:{
      STRINGS: role(.35,[48,76],Q(1.0,.5,.72,2.0),'triangle','lowpass',1400,1,.40,7,.9,3,1.5),
      PAD:     role(.30,[42,66],Q(1.8,.7,.80,3.0),'sine','lowpass',650,.9,.38,0,.8,3,2.0),
      CHOIR:   role(.20,[55,72],Q(1.5,.6,.75,2.5),'sine','lowpass',600,1,.32,0,1.,2,2.2),
      ARP:     role(.15,[60,88],Q(.05,.15,.20,.5),'triangle','highpass',2000,1.5,.25,12,.7,2,.8),
    },
    syncThreshold:.30, encounterR:.16, entainment:.28, eventRate:.30,
    reverbAmt:.88, delayAmt:.55, delayTime:.55, masterGain:.65,
    harmonyMode:'free',
    particleGlow:2.4, trailLen:14, lens:'Harmony', bgPulse:false, cinematic:true,
    primary:'#44ffcc', secondary:'#020812', accent:'#ff88cc',
    gateCount:3, attractorCount:0,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ── II. ELECTRONIC & CLUB ──────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  // 8 ── Berlin Techno Engine ─────────────────────────────────────────────────
  // Swarm physics — tight cluster bursts on gate crossings. 4/4 emergent.
  {
    id:'berlin-techno', name:'Berlin Techno Engine', intensity:5,
    description:'Kick 4/4 emergente por sync peaks. Bass pulse profundo. Swarm bunker.',
    vibe:'Bunker, Sub-bass, Sidechain',
    tags:['Techno','Club','Electronic','Dark'],
    bpm:132, scale:'minor', root:36, quantaCount:128,
    motionStyle:'swarm',
    roles:{
      KICK:  role(.25,[24,36],Q(.001,.08,.0,.05),'kick','lowpass',200,.5,.90,0,.3,6,.4),
      BASS:  role(.20,[36,48],Q(.005,.18,.6,.12),'sawtooth','lowpass',280,3,.70,-5,.4,4,.25),
      PERC:  role(.20,[60,72],Q(.001,.06,.0,.04),'hihat','highpass',5000,.5,.55,0,.8,4,.18),
      LEAD:  role(.20,[60,80],Q(.01,.10,.4,.18),'sawtooth','lowpass',1400,4,.60,7,.5,3,.3),
      PAD:   role(.15,[48,60],Q(.4,.3,.7,.8),'sawtooth','lowpass',600,2,.35,0,.6,2,.8),
    },
    syncThreshold:.55, encounterR:.12, entainment:.65, eventRate:.9,
    reverbAmt:.18, delayAmt:.15, delayTime:.17, masterGain:.88,
    harmonyMode:'modal',
    particleGlow:1.4, trailLen:5, lens:'Rhythm', bgPulse:true, cinematic:true,
    primary:'#00d4ff', secondary:'#7700ff', accent:'#ff2255',
    gateCount:4, attractorCount:1,
  },

  // 9 ── Minimal Microhouse ───────────────────────────────────────────────────
  // Drift physics — particles wander lazily. Click percussion + groove swing.
  {
    id:'minimal-micro', name:'Minimal Microhouse', intensity:3,
    description:'Groove swing com clicks percussivos. Menos é mais.',
    vibe:'Clicks, Swing, Hypnotic',
    tags:['Techno','Minimal','Groove'],
    bpm:124, scale:'minor', root:36, quantaCount:64,
    motionStyle:'drift',
    roles:{
      KICK:  role(.18,[24,36],Q(.001,.06,.0,.04),'kick','lowpass',180,.4,.80,0,.2,4,.45),
      PERC:  role(.35,[60,84],Q(.001,.04,.0,.02),'snare','bandpass',3500,.8,.50,0,.7,5,.2),
      BASS:  role(.22,[36,48],Q(.01,.12,.3,.1),'triangle','lowpass',350,2,.55,0,.35,3,.35),
      LEAD:  role(.25,[60,72],Q(.008,.08,.4,.12),'square','lowpass',800,3,.45,12,.6,2,.4),
    },
    syncThreshold:.4, encounterR:.09, entainment:.4, eventRate:.6,
    reverbAmt:.12, delayAmt:.25, delayTime:.12, masterGain:.8,
    harmonyMode:'modal',
    particleGlow:1.0, trailLen:3, lens:'Rhythm', bgPulse:false, cinematic:false,
    primary:'#33ff88', secondary:'#1a1a2e', accent:'#ff8833',
    gateCount:3, attractorCount:1,
  },

  // 10 ── Acid Swarm ──────────────────────────────────────────────────────────
  // Murmuration physics — 303 lines slide with flock velocity. High resonance.
  {
    id:'acid-swarm', name:'Acid Swarm', intensity:5,
    description:'303-style acid com flock murmuration. Slides por velocidade do bando.',
    vibe:'Resonance, Squelch, Rave',
    tags:['Techno','Acid','Rave','Electronic'],
    bpm:138, scale:'minor', root:36, quantaCount:96,
    motionStyle:'murmuration',
    roles:{
      KICK:  role(.18,[24,36],Q(.001,.07,.0,.05),'kick','lowpass',220,.5,.85,0,.2,5,.35),
      BASS:  role(.30,[36,52],Q(.002,.12,.45,.08),'sawtooth','lowpass',360,18,.75,-7,.4,4,.14),
      PERC:  role(.22,[60,84],Q(.001,.05,.0,.03),'hihat','highpass',6000,.5,.50,0,.7,4,.16),
      LEAD:  role(.30,[52,76],Q(.003,.10,.35,.10),'sawtooth','lowpass',450,14,.65,0,.5,3,.18),
    },
    syncThreshold:.5, encounterR:.11, entainment:.7, eventRate:.85,
    reverbAmt:.15, delayAmt:.2, delayTime:.14, masterGain:.82,
    harmonyMode:'modal',
    particleGlow:1.6, trailLen:6, lens:'Rhythm', bgPulse:true, cinematic:true,
    primary:'#ff5500', secondary:'#220000', accent:'#00ff88',
    gateCount:4, attractorCount:2,
  },

  // 11 ── Detroit Chords ──────────────────────────────────────────────────────
  // Dance physics — pairs orbit each other. Chord stabs between partners.
  {
    id:'detroit-chords', name:'Detroit Chords', intensity:4,
    description:'Pares orbitantes gerando chord stabs. Dança de Detroit soul.',
    vibe:'Soulful, Chords, Garage',
    tags:['Techno','Club','Groove','Ambient'],
    bpm:122, scale:'minor', root:48, quantaCount:88,
    motionStyle:'dance',
    roles:{
      KICK:    role(.18,[24,36],Q(.001,.10,.0,.06),'kick','lowpass',200,.5,.82,0,.2,4,.42),
      BASS:    role(.18,[36,52],Q(.008,.22,.55,.15),'sawtooth','lowpass',300,2.5,.65,-3,.35,3,.3),
      PAD:     role(.25,[48,72],Q(.08,.15,.65,.45),'sawtooth','lowpass',1200,3,.55,7,.8,4,.5),
      LEAD:    role(.20,[60,84],Q(.01,.08,.50,.15),'square','lowpass',1800,2.5,.50,5,.6,3,.25),
      STRINGS: role(.19,[48,72],Q(.3,.2,.7,1.0),'triangle','lowpass',1400,1,.40,0,.7,3,.8),
    },
    syncThreshold:.48, encounterR:.12, entainment:.55, eventRate:.7,
    reverbAmt:.3, delayAmt:.35, delayTime:.22, masterGain:.82,
    harmonyMode:'modal',
    particleGlow:1.3, trailLen:6, lens:'Harmony', bgPulse:true, cinematic:false,
    primary:'#ff9944', secondary:'#1a0a1e', accent:'#44aaff',
    gateCount:4, attractorCount:1,
  },

  // 12 ── Breakbeat Reactor ───────────────────────────────────────────────────
  // Chaos physics — brownian motion creates unpredictable rhythms. High energy.
  {
    id:'breakbeat', name:'Breakbeat Reactor', intensity:5,
    description:'Caos browniano gerando breaks imprevisíveis. Cada colisão é um hit.',
    vibe:'Breaks, Chaos, Rave',
    tags:['Breakbeat','Electronic','Experimental','Rave'],
    bpm:140, scale:'minor', root:36, quantaCount:112,
    motionStyle:'chaos',
    roles:{
      KICK:  role(.20,[24,36],Q(.001,.06,.0,.04),'kick','lowpass',220,.5,.90,0,.3,6,.3),
      PERC:  role(.30,[48,84],Q(.001,.05,.0,.03),'snare','bandpass',3500,1,.55,0,.8,5,.15),
      BASS:  role(.20,[36,52],Q(.003,.15,.50,.08),'sawtooth','lowpass',280,4,.70,-5,.3,4,.2),
      LEAD:  role(.15,[60,84],Q(.005,.08,.35,.12),'square','bandpass',1600,3,.50,7,.5,3,.18),
      ARP:   role(.15,[60,96],Q(.002,.06,.10,.08),'square','lowpass',2800,2,.45,0,.7,3,.12),
    },
    syncThreshold:.6, encounterR:.10, entainment:.75, eventRate:1.0,
    reverbAmt:.12, delayAmt:.18, delayTime:.11, masterGain:.85,
    harmonyMode:'free',
    particleGlow:1.5, trailLen:4, lens:'Rhythm', bgPulse:true, cinematic:true,
    primary:'#ff2200', secondary:'#0a0008', accent:'#ffcc00',
    gateCount:6, attractorCount:2,
  },

  // 13 ── Dub Techno Fog ──────────────────────────────────────────────────────
  // Organism physics — breathing cluster. Deep delay + reverb wash.
  {
    id:'dub-techno', name:'Dub Techno Fog', intensity:3,
    description:'Massa orgânica respirando em delay infinito. Cordas dubby.',
    vibe:'Dub, Fog, Hypnotic',
    tags:['Techno','Ambient','Drone','Club'],
    bpm:120, scale:'dorian', root:36, quantaCount:80,
    motionStyle:'organism',
    roles:{
      KICK:    role(.15,[24,36],Q(.001,.12,.0,.08),'kick','lowpass',160,.4,.75,0,.2,3,.5),
      BASS:    role(.22,[36,52],Q(.01,.25,.60,.2),'sine','lowpass',250,1.5,.60,0,.3,3,.4),
      PAD:     role(.28,[48,72],Q(.5,.3,.75,1.5),'sawtooth','lowpass',600,2.5,.45,5,.8,3,1.0),
      PERC:    role(.15,[60,84],Q(.001,.04,.0,.03),'hihat','highpass',4500,.5,.40,0,.6,4,.22),
      STRINGS: role(.20,[48,72],Q(.4,.3,.65,1.2),'triangle','lowpass',1100,1,.38,0,.7,2,.9),
    },
    syncThreshold:.38, encounterR:.13, entainment:.45, eventRate:.5,
    reverbAmt:.75, delayAmt:.65, delayTime:.35, masterGain:.75,
    harmonyMode:'modal',
    particleGlow:1.6, trailLen:10, lens:'Harmony', bgPulse:false, cinematic:true,
    primary:'#5588cc', secondary:'#050810', accent:'#aaddff',
    gateCount:3, attractorCount:1,
  },

  // 14 ── Carnival Samba ──────────────────────────────────────────────────────
  // Carnival physics — 3 vortices spinning. Syncopated percussion explosion.
  {
    id:'carnival-samba', name:'Carnival Samba', intensity:5,
    description:'Três vórtices em festa. Percussão sincopada com swing brasileiro.',
    vibe:'Carnaval, Ritmo, Energia',
    tags:['Groove','Dynamic','Electronic','Experimental'],
    bpm:126, scale:'dorian', root:48, quantaCount:120,
    motionStyle:'carnival',
    roles:{
      KICK:    role(.18,[24,36],Q(.001,.07,.0,.05),'kick','lowpass',200,.5,.85,0,.2,5,.35),
      PERC:    role(.30,[48,84],Q(.001,.05,.0,.02),'snare','bandpass',3000,.8,.55,0,.8,5,.14),
      BASS:    role(.18,[36,52],Q(.008,.15,.50,.1),'sawtooth','lowpass',320,3,.65,-3,.35,4,.22),
      ARP:     role(.20,[60,96],Q(.003,.08,.15,.12),'square','lowpass',2400,2,.50,0,.7,4,.1),
      LEAD:    role(.14,[60,84],Q(.01,.10,.40,.15),'sawtooth','lowpass',1600,3,.55,7,.5,3,.2),
    },
    syncThreshold:.55, encounterR:.11, entainment:.7, eventRate:.9,
    reverbAmt:.2, delayAmt:.25, delayTime:.13, masterGain:.85,
    harmonyMode:'modal',
    particleGlow:1.5, trailLen:5, lens:'Rhythm', bgPulse:true, cinematic:true,
    primary:'#ffcc00', secondary:'#1a0a00', accent:'#ff3366',
    gateCount:5, attractorCount:3,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ── III. CLASSICAL & MINIMALIST ────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  // 15 ── Reich Phase Machine ─────────────────────────────────────────────────
  // Revolution physics — spiral collapse/eject creates phasing patterns.
  {
    id:'reich-phase', name:'Reich Phase Machine', intensity:3,
    description:'Phasing emergente por espiral. Padrões se desalinham e realinham.',
    vibe:'Phasing, Pattern, Process',
    tags:['Classical','Minimalist','Generative','Experimental'],
    bpm:96, scale:'major', root:60, quantaCount:80,
    motionStyle:'revolution',
    roles:{
      ARP:     role(.35,[60,84],Q(.003,.10,.18,.15),'triangle','lowpass',2800,1.5,.50,0,.6,4,.16),
      LEAD:    role(.25,[60,80],Q(.005,.08,.45,.12),'triangle','lowpass',2200,1,.48,3,.5,3,.18),
      PAD:     role(.20,[48,72],Q(.5,.3,.7,1.0),'sine','lowpass',900,1,.38,0,.7,2,.8),
      PERC:    role(.20,[60,84],Q(.001,.04,.0,.03),'noise','highpass',4000,.4,.42,0,.6,4,.2),
    },
    syncThreshold:.45, encounterR:.10, entainment:.6, eventRate:.7,
    reverbAmt:.35, delayAmt:.45, delayTime:.28, masterGain:.78,
    harmonyMode:'consonant',
    particleGlow:1.2, trailLen:6, lens:'Notes', bgPulse:false, cinematic:false,
    primary:'#ccffaa', secondary:'#080c08', accent:'#ffaa44',
    gateCount:4, attractorCount:1,
  },

  // 16 ── Satie Gymnopédie ────────────────────────────────────────────────────
  // Drift physics — gentle wandering. Sparse piano-like tones in lydian.
  {
    id:'satie-gymno', name:'Satie Gymnopédie', intensity:2,
    description:'Deriva suave com notas esparsas de piano. Simplicidade perfeita.',
    vibe:'Sparse, Gentle, Elegant',
    tags:['Classical','Minimalist','Soft','Ambient'],
    bpm:62, scale:'lydian', root:53, quantaCount:48,
    motionStyle:'drift',
    roles:{
      LEAD:    role(.40,[60,84],Q(.01,.15,.40,.3),'triangle','lowpass',2000,1,.45,0,.5,2,.5),
      PAD:     role(.30,[48,72],Q(1.0,.5,.75,2.0),'sine','lowpass',800,1,.35,0,.8,2,1.5),
      BASS:    role(.15,[36,52],Q(.05,.3,.55,.4),'sine','lowpass',350,1,.50,0,.3,2,.6),
      STRINGS: role(.15,[48,72],Q(.5,.3,.65,1.5),'triangle','lowpass',1200,1,.35,5,.7,2,1.2),
    },
    syncThreshold:.30, encounterR:.15, entainment:.30, eventRate:.30,
    reverbAmt:.65, delayAmt:.4, delayTime:.35, masterGain:.7,
    harmonyMode:'consonant',
    particleGlow:1.5, trailLen:8, lens:'Notes', bgPulse:false, cinematic:true,
    primary:'#ffeedd', secondary:'#0a0808', accent:'#aaccff',
    gateCount:2, attractorCount:0,
  },

  // 17 ── Bartók Pizzicato ────────────────────────────────────────────────────
  // Jazz physics — small clusters form and dissolve. Plucked string textures.
  {
    id:'bartok-pizz', name:'Bartók Pizzicato', intensity:3,
    description:'Microclusters formam, improvisam e dissolvem. Pizzicato folclórico.',
    vibe:'Folk, Plucked, Angular',
    tags:['Classical','Experimental','Strings','Dynamic'],
    bpm:104, scale:'harmonic_minor', root:45, quantaCount:72,
    motionStyle:'jazz',
    roles:{
      STRINGS: role(.30,[48,76],Q(.003,.08,.12,.15),'triangle','bandpass',1800,2,.50,0,.7,3,.18),
      LEAD:    role(.25,[52,84],Q(.005,.10,.35,.12),'triangle','lowpass',2200,2,.48,5,.5,3,.2),
      PERC:    role(.20,[60,84],Q(.001,.04,.0,.03),'noise','bandpass',2500,.6,.42,0,.6,4,.16),
      PAD:     role(.15,[42,60],Q(.4,.3,.6,1.0),'sine','lowpass',600,1,.35,0,.7,2,.9),
      BASS:    role(.10,[28,48],Q(.01,.15,.45,.15),'triangle','lowpass',300,1.5,.55,0,.3,2,.4),
    },
    syncThreshold:.40, encounterR:.10, entainment:.50, eventRate:.55,
    reverbAmt:.35, delayAmt:.3, delayTime:.18, masterGain:.78,
    harmonyMode:'modal',
    particleGlow:1.0, trailLen:4, lens:'Notes', bgPulse:false, cinematic:false,
    primary:'#ffd700', secondary:'#0c0800', accent:'#88aaff',
    gateCount:4, attractorCount:1,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ── IV. JAZZ & IMPROVISATION ───────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  // 18 ── Cool Jazz Midnight ──────────────────────────────────────────────────
  // Jazz physics — microcluster improvisation. Modal voicings + brush percussion.
  {
    id:'cool-jazz', name:'Cool Jazz Midnight', intensity:3,
    description:'Clusters improvisando em modal. Brushes, piano, contrabaixo.',
    vibe:'Smoky, Modal, Late Night',
    tags:['Jazz','Improvisation','Modal','Soft'],
    bpm:72, scale:'dorian', root:45, quantaCount:64,
    motionStyle:'jazz',
    roles:{
      BASS:    role(.20,[28,48],Q(.02,.25,.65,.3),'triangle','lowpass',280,1.5,.55,0,.3,2,.4),
      LEAD:    role(.25,[55,84],Q(.01,.12,.45,.2),'triangle','lowpass',1800,1.5,.48,0,.5,3,.25),
      PAD:     role(.18,[48,72],Q(.5,.3,.70,1.2),'sine','lowpass',800,1,.38,5,.7,2,.9),
      PERC:    role(.22,[48,72],Q(.001,.06,.0,.04),'noise','bandpass',2000,.5,.40,0,.6,4,.2),
      ARP:     role(.15,[60,88],Q(.005,.10,.20,.15),'triangle','lowpass',2400,1,.40,0,.5,2,.3),
    },
    syncThreshold:.35, encounterR:.12, entainment:.40, eventRate:.45,
    reverbAmt:.55, delayAmt:.4, delayTime:.28, masterGain:.72,
    harmonyMode:'modal',
    particleGlow:1.3, trailLen:7, lens:'Harmony', bgPulse:false, cinematic:true,
    primary:'#ff9944', secondary:'#0a0608', accent:'#88ccff',
    gateCount:3, attractorCount:1,
  },

  // 19 ── Free Jazz Storm ─────────────────────────────────────────────────────
  // War physics — two armies of sound colliding. Chromatic freedom.
  {
    id:'free-jazz', name:'Free Jazz Storm', intensity:5,
    description:'Dois exércitos tímbricos colidindo. Cromatismo livre. Ornette Coleman.',
    vibe:'Free, Collision, Energy',
    tags:['Jazz','Experimental','Dynamic','Improvisation'],
    bpm:108, scale:'chromatic', root:48, quantaCount:96,
    motionStyle:'war',
    roles:{
      LEAD:    role(.25,[48,96],Q(.003,.08,.35,.1),'sawtooth','lowpass',2500,3,.55,7,.6,3,.15),
      PERC:    role(.25,[48,84],Q(.001,.05,.0,.04),'noise','bandpass',3000,.6,.48,0,.8,5,.12),
      BASS:    role(.20,[28,52],Q(.005,.18,.55,.12),'sawtooth','lowpass',350,3,.65,-5,.3,3,.2),
      ARP:     role(.15,[60,96],Q(.002,.06,.15,.08),'square','bandpass',2000,4,.45,12,.7,3,.1),
      PAD:     role(.15,[42,66],Q(.2,.2,.50,.5),'sawtooth','lowpass',700,2,.35,0,.6,2,.5),
    },
    syncThreshold:.55, encounterR:.09, entainment:.65, eventRate:1.0,
    reverbAmt:.25, delayAmt:.2, delayTime:.12, masterGain:.8,
    harmonyMode:'free',
    particleGlow:1.5, trailLen:4, lens:'Tension', bgPulse:true, cinematic:true,
    primary:'#ff3333', secondary:'#0a0004', accent:'#ffcc00',
    gateCount:6, attractorCount:2,
  },

  // 20 ── Bebop Cells ─────────────────────────────────────────────────────────
  // Cells physics — breathing groups. Fast harmonic lines over walking bass.
  {
    id:'bebop-cells', name:'Bebop Cells', intensity:4,
    description:'Grupos celulares respirando. Linhas harmônicas rápidas. Walking bass.',
    vibe:'Swing, Virtuosity, Energy',
    tags:['Jazz','Groove','Dynamic','Improvisation'],
    bpm:160, scale:'mixolydian', root:48, quantaCount:80,
    motionStyle:'cells',
    roles:{
      BASS:    role(.20,[28,52],Q(.01,.12,.55,.1),'triangle','lowpass',350,1.5,.60,0,.3,3,.18),
      LEAD:    role(.30,[55,96],Q(.003,.06,.35,.08),'triangle','lowpass',2800,1.5,.50,0,.5,3,.12),
      PERC:    role(.25,[48,84],Q(.001,.04,.0,.02),'hihat','highpass',5000,.4,.45,0,.7,5,.1),
      ARP:     role(.15,[60,90],Q(.003,.08,.20,.1),'triangle','lowpass',2400,1,.42,5,.6,3,.14),
      PAD:     role(.10,[48,66],Q(.2,.2,.5,.5),'sine','lowpass',700,1,.30,0,.6,2,.8),
    },
    syncThreshold:.50, encounterR:.09, entainment:.60, eventRate:.85,
    reverbAmt:.25, delayAmt:.2, delayTime:.1, masterGain:.78,
    harmonyMode:'modal',
    particleGlow:1.0, trailLen:3, lens:'Notes', bgPulse:false, cinematic:false,
    primary:'#ff9944', secondary:'#0c0608', accent:'#44ff88',
    gateCount:5, attractorCount:1,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ── V. PHYSICS SHOWCASE ────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  // 21 ── Ballistic Cathedral ─────────────────────────────────────────────────
  // Ballistic physics with gravity. Particles fall and bounce, creating rhythm.
  {
    id:'ballistic-cathedral', name:'Ballistic Cathedral', intensity:4,
    description:'Gravidade real. Partículas caem e ricocheteiam em gates — cada quique é uma nota.',
    vibe:'Gravity, Bounce, Percussion',
    tags:['Experimental','Dynamic','Generative'],
    bpm:100, scale:'pentatonic', root:48, quantaCount:60,
    motionStyle:'ballistic',
    roles:{
      PERC:    role(.30,[48,84],Q(.001,.05,.0,.04),'noise','bandpass',2500,.6,.55,0,.7,5,.15),
      LEAD:    role(.25,[55,84],Q(.005,.10,.35,.15),'triangle','lowpass',2200,1.5,.48,0,.5,3,.2),
      BASS:    role(.20,[28,48],Q(.01,.2,.55,.15),'sine','lowpass',250,1,.55,0,.3,3,.3),
      ARP:     role(.15,[60,96],Q(.003,.08,.12,.1),'triangle','lowpass',3000,1.5,.42,5,.6,3,.14),
      STRINGS: role(.10,[48,72],Q(.3,.2,.6,.8),'triangle','lowpass',1200,1,.35,0,.7,2,.8),
    },
    syncThreshold:.45, encounterR:.10, entainment:.55, eventRate:.7,
    reverbAmt:.55, delayAmt:.4, delayTime:.25, masterGain:.78,
    harmonyMode:'consonant',
    particleGlow:1.3, trailLen:5, lens:'Notes', bgPulse:false, cinematic:false,
    primary:'#ffd700', secondary:'#080808', accent:'#88aaff',
    gateCount:5, attractorCount:0,
  },

  // 22 ── Murmuration Song ────────────────────────────────────────────────────
  // Full murmuration with all 8 roles — the flock IS the orchestra.
  {
    id:'murmuration-song', name:'Murmuration Song', intensity:4,
    description:'O bando É a orquestra. 8 roles em formação de estorninho cantante.',
    vibe:'Flock, Orchestra, Emergence',
    tags:['Generative','Experimental','Orchestral','Dynamic'],
    bpm:88, scale:'major', root:48, quantaCount:128,
    motionStyle:'murmuration',
    roles:{
      KICK:    role(.10,[24,36],Q(.001,.08,.0,.05),'kick','lowpass',180,.4,.75,0,.2,3,.45),
      BASS:    role(.12,[36,52],Q(.01,.2,.55,.15),'sine','lowpass',280,1.5,.55,0,.3,3,.35),
      PERC:    role(.12,[48,84],Q(.001,.04,.0,.03),'hihat','highpass',5000,.5,.40,0,.7,4,.18),
      PAD:     role(.15,[48,72],Q(.6,.3,.75,1.2),'sine','lowpass',900,1,.38,0,.8,3,1.0),
      LEAD:    role(.15,[55,84],Q(.008,.1,.45,.15),'triangle','lowpass',2000,1.5,.48,5,.5,3,.22),
      ARP:     role(.12,[60,96],Q(.003,.08,.15,.1),'triangle','lowpass',2800,1,.42,0,.6,3,.14),
      STRINGS: role(.12,[48,76],Q(.35,.2,.65,1.0),'triangle','lowpass',1400,1,.38,3,.8,3,.7),
      CHOIR:   role(.12,[48,72],Q(1.0,.5,.75,2.0),'sine','lowpass',700,1,.32,0,.9,2,1.5),
    },
    syncThreshold:.42, encounterR:.11, entainment:.55, eventRate:.6,
    reverbAmt:.45, delayAmt:.35, delayTime:.22, masterGain:.8,
    harmonyMode:'consonant',
    particleGlow:1.5, trailLen:7, lens:'Harmony', bgPulse:false, cinematic:true,
    primary:'#88aaff', secondary:'#060810', accent:'#ffcc88',
    gateCount:4, attractorCount:1,
  },

  // 23 ── Organism Pulse ──────────────────────────────────────────────────────
  // Organism physics — mass breathes. Pressure creates rhythm, release creates melody.
  {
    id:'organism-pulse', name:'Organism Pulse', intensity:3,
    description:'Organismo vivo respirando. Contração = ritmo, expansão = melodia.',
    vibe:'Alive, Breath, Organic',
    tags:['Generative','Experimental','Organic Instruments','Ambient'],
    bpm:76, scale:'dorian', root:40, quantaCount:96,
    motionStyle:'organism',
    roles:{
      KICK:    role(.12,[24,36],Q(.001,.1,.0,.06),'kick','lowpass',180,.4,.72,0,.2,3,.5),
      BASS:    role(.18,[28,48],Q(.02,.25,.65,.2),'sine','lowpass',220,1,.55,0,.3,3,.4),
      PAD:     role(.25,[42,66],Q(1.0,.5,.80,2.0),'triangle','lowpass',700,1.2,.42,5,.8,3,1.2),
      LEAD:    role(.18,[55,80],Q(.01,.12,.42,.18),'triangle','lowpass',1800,1.5,.45,0,.5,3,.25),
      STRINGS: role(.15,[48,72],Q(.4,.3,.65,1.0),'triangle','lowpass',1200,1,.38,3,.7,2,.8),
      CHOIR:   role(.12,[48,72],Q(1.2,.5,.75,2.5),'sine','lowpass',650,1,.32,0,.9,2,1.5),
    },
    syncThreshold:.38, encounterR:.13, entainment:.45, eventRate:.5,
    reverbAmt:.55, delayAmt:.4, delayTime:.3, masterGain:.75,
    harmonyMode:'modal',
    particleGlow:1.8, trailLen:8, lens:'Events', bgPulse:false, cinematic:true,
    primary:'#44ff88', secondary:'#040a06', accent:'#ff88cc',
    gateCount:3, attractorCount:1,
  },

  // 24 ── Predator Prey ───────────────────────────────────────────────────────
  // Predation physics — roles chase/flee. Musical tension from pursuit.
  {
    id:'predator-prey', name:'Predator Prey', intensity:4,
    description:'Roles perseguem e fogem. A tensão da caça vira tensão harmônica.',
    vibe:'Hunt, Flight, Tension',
    tags:['Experimental','Dynamic','Generative'],
    bpm:112, scale:'harmonic_minor', root:40, quantaCount:88,
    motionStyle:'predation',
    roles:{
      KICK:    role(.12,[24,36],Q(.001,.07,.0,.05),'kick','lowpass',200,.5,.82,0,.2,4,.4),
      BASS:    role(.18,[28,52],Q(.008,.2,.55,.12),'sawtooth','lowpass',300,2.5,.65,-3,.3,3,.25),
      PERC:    role(.18,[48,84],Q(.001,.05,.0,.03),'snare','bandpass',3000,.6,.48,0,.7,5,.15),
      LEAD:    role(.22,[52,88],Q(.005,.08,.40,.12),'sawtooth','lowpass',2000,3,.55,7,.5,3,.18),
      PAD:     role(.15,[42,66],Q(.3,.2,.60,.8),'triangle','lowpass',700,1.5,.38,0,.7,2,.7),
      ARP:     role(.15,[60,90],Q(.003,.08,.15,.1),'square','lowpass',2500,2,.42,0,.6,3,.12),
    },
    syncThreshold:.48, encounterR:.10, entainment:.6, eventRate:.75,
    reverbAmt:.3, delayAmt:.25, delayTime:.15, masterGain:.8,
    harmonyMode:'dissonant',
    particleGlow:1.4, trailLen:5, lens:'Tension', bgPulse:true, cinematic:true,
    primary:'#ff4422', secondary:'#0a0204', accent:'#44ffcc',
    gateCount:5, attractorCount:2,
  },

  // 25 ── Exodus Migration ────────────────────────────────────────────────────
  // Exodus physics — mass fleeing. Notes fire as the swarm crosses gates.
  {
    id:'exodus-song', name:'Exodus Migration', intensity:4,
    description:'Migração em massa cruzando portais sonoros. Épico e linear.',
    vibe:'Epic, Linear, Journey',
    tags:['Generative','Dynamic','Orchestral','Experimental'],
    bpm:94, scale:'mixolydian', root:45, quantaCount:112,
    motionStyle:'exodus',
    roles:{
      KICK:    role(.10,[24,36],Q(.001,.08,.0,.05),'kick','lowpass',180,.4,.78,0,.2,3,.45),
      BASS:    role(.15,[28,48],Q(.01,.2,.55,.15),'triangle','lowpass',300,1.5,.55,0,.3,3,.3),
      STRINGS: role(.25,[42,72],Q(.3,.2,.65,1.0),'triangle','lowpass',1400,1,.42,5,.8,3,.7),
      LEAD:    role(.20,[55,84],Q(.01,.10,.45,.15),'sawtooth','lowpass',2000,2,.50,0,.5,3,.22),
      PAD:     role(.15,[42,66],Q(.6,.3,.75,1.5),'sine','lowpass',800,1,.38,0,.8,2,1.0),
      CHOIR:   role(.15,[48,72],Q(1.0,.5,.75,2.0),'sine','lowpass',700,1,.35,0,.9,2,1.5),
    },
    syncThreshold:.42, encounterR:.12, entainment:.5, eventRate:.6,
    reverbAmt:.5, delayAmt:.4, delayTime:.25, masterGain:.78,
    harmonyMode:'modal',
    particleGlow:1.6, trailLen:8, lens:'Events', bgPulse:false, cinematic:true,
    primary:'#88ff44', secondary:'#060a04', accent:'#ffaa44',
    gateCount:5, attractorCount:0,
  },

  // 26 ── Polarization Duet ───────────────────────────────────────────────────
  // Polarization physics — two harmonic poles emerge. Consonance vs dissonance.
  {
    id:'polarization-duet', name:'Polarization Duet', intensity:3,
    description:'Duas polaridades harmônicas emergem. Consonância vs dissonância viva.',
    vibe:'Duality, Contrast, Tension',
    tags:['Experimental','Generative','Dynamic'],
    bpm:84, scale:'harmonic_minor', root:48, quantaCount:80,
    motionStyle:'polarization',
    roles:{
      PAD:     role(.25,[42,66],Q(.6,.3,.75,1.5),'sawtooth','lowpass',700,2,.42,5,.8,3,1.0),
      LEAD:    role(.22,[52,84],Q(.01,.10,.42,.15),'triangle','lowpass',2000,1.5,.48,0,.5,3,.22),
      STRINGS: role(.20,[48,76],Q(.35,.2,.65,1.0),'triangle','lowpass',1400,1,.38,3,.8,2,.7),
      BASS:    role(.18,[28,52],Q(.02,.25,.60,.2),'sine','lowpass',250,1,.55,0,.3,3,.4),
      CHOIR:   role(.15,[48,72],Q(1.0,.5,.75,2.0),'sine','lowpass',650,1,.32,0,.9,2,1.5),
    },
    syncThreshold:.38, encounterR:.14, entainment:.45, eventRate:.5,
    reverbAmt:.55, delayAmt:.45, delayTime:.35, masterGain:.72,
    harmonyMode:'modal',
    particleGlow:1.8, trailLen:9, lens:'Tension', bgPulse:false, cinematic:true,
    primary:'#ff8800', secondary:'#080404', accent:'#4488ff',
    gateCount:4, attractorCount:1,
  },

  // 27 ── Revolution Spiral ───────────────────────────────────────────────────
  // Revolution physics — spiral tightens then ejects. Musical tension/release cycle.
  {
    id:'revolution-spiral', name:'Revolution Spiral', intensity:4,
    description:'Espiral que aperta até explodir. Cada colapso é um clímax musical.',
    vibe:'Tightening, Release, Cycle',
    tags:['Experimental','Dynamic','Generative'],
    bpm:108, scale:'phrygian', root:40, quantaCount:96,
    motionStyle:'revolution',
    roles:{
      KICK:    role(.12,[24,36],Q(.001,.08,.0,.05),'kick','lowpass',200,.5,.82,0,.2,4,.4),
      BASS:    role(.18,[28,52],Q(.005,.18,.55,.12),'sawtooth','lowpass',320,3,.65,-5,.3,3,.22),
      LEAD:    role(.25,[52,84],Q(.005,.08,.40,.1),'sawtooth','lowpass',1800,3,.55,7,.5,3,.16),
      PERC:    role(.18,[48,84],Q(.001,.05,.0,.03),'snare','bandpass',3000,.6,.48,0,.7,5,.14),
      PAD:     role(.15,[42,66],Q(.3,.2,.55,.6),'triangle','lowpass',600,1.5,.38,0,.6,2,.6),
      ARP:     role(.12,[60,96],Q(.003,.06,.12,.08),'square','lowpass',2600,2,.42,0,.6,3,.1),
    },
    syncThreshold:.50, encounterR:.10, entainment:.65, eventRate:.8,
    reverbAmt:.3, delayAmt:.25, delayTime:.15, masterGain:.82,
    harmonyMode:'dissonant',
    particleGlow:1.5, trailLen:6, lens:'Tension', bgPulse:true, cinematic:true,
    primary:'#cc44ff', secondary:'#0a0210', accent:'#44ffcc',
    gateCount:5, attractorCount:2,
  },

  // 28 ── Explosion Nebula ────────────────────────────────────────────────────
  // Explosion physics — burst/regroup cycles. Each expansion spawns melodic debris.
  {
    id:'explosion-nebula', name:'Explosion Nebula', intensity:5,
    description:'Explosões cíclicas. Cada expansão espalha fragmentos melódicos.',
    vibe:'Burst, Debris, Cosmic',
    tags:['Experimental','Space','Dynamic','Generative'],
    bpm:96, scale:'whole_tone', root:42, quantaCount:104,
    motionStyle:'explosion',
    roles:{
      KICK:    role(.12,[24,36],Q(.001,.06,.0,.04),'kick','lowpass',200,.5,.85,0,.2,5,.35),
      PERC:    role(.22,[48,84],Q(.001,.04,.0,.03),'snare','bandpass',3500,.8,.50,0,.8,5,.12),
      LEAD:    role(.25,[52,88],Q(.003,.08,.30,.1),'triangle','lowpass',2500,2,.50,5,.5,3,.14),
      ARP:     role(.18,[60,96],Q(.002,.06,.12,.08),'triangle','highpass',2000,1.5,.42,12,.7,3,.1),
      PAD:     role(.12,[42,66],Q(.3,.2,.50,.5),'sine','lowpass',650,1,.35,0,.6,2,.6),
      STRINGS: role(.11,[48,72],Q(.2,.2,.55,.8),'triangle','lowpass',1200,1,.35,0,.7,2,.7),
    },
    syncThreshold:.50, encounterR:.10, entainment:.6, eventRate:.8,
    reverbAmt:.4, delayAmt:.35, delayTime:.2, masterGain:.8,
    harmonyMode:'free',
    particleGlow:1.8, trailLen:5, lens:'Events', bgPulse:true, cinematic:true,
    primary:'#ff6600', secondary:'#0a0400', accent:'#88ccff',
    gateCount:5, attractorCount:1,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ── VI. WORLD & MODAL ──────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  // 29 ── Sitar Raga ──────────────────────────────────────────────────────────
  // Spiral physics — slow unwinding like a raga. Phrygian drone tanpura.
  {
    id:'sitar-raga', name:'Sitar Raga Meditation', intensity:2,
    description:'Raga emergente com drone tanpura. Espiral meditativa.',
    vibe:'Raga, Drone, Tanpura',
    tags:['Modal','Meditative','Strings','Ambient'],
    bpm:68, scale:'phrygian', root:45, quantaCount:72,
    motionStyle:'spiral',
    roles:{
      STRINGS: role(.35,[48,84],Q(.01,.12,.45,.3),'triangle','bandpass',1600,3,.50,7,.7,3,.25),
      PAD:     role(.25,[36,60],Q(2.0,.8,.85,3.5),'sine','lowpass',350,1,.45,0,.8,3,2.0),
      LEAD:    role(.20,[55,84],Q(.008,.10,.40,.2),'triangle','lowpass',2200,2,.48,0,.5,3,.22),
      BASS:    role(.10,[28,42],Q(.5,.4,.80,2.0),'sine','lowpass',180,.8,.50,0,.2,2,1.5),
      CHOIR:   role(.10,[48,72],Q(1.5,.6,.75,2.5),'sine','lowpass',600,1,.30,0,.9,2,2.0),
    },
    syncThreshold:.32, encounterR:.15, entainment:.30, eventRate:.35,
    reverbAmt:.75, delayAmt:.5, delayTime:.45, masterGain:.7,
    harmonyMode:'modal',
    particleGlow:2.0, trailLen:12, lens:'Harmony', bgPulse:false, cinematic:true,
    primary:'#ffd700', secondary:'#0a0800', accent:'#ff6644',
    gateCount:3, attractorCount:1,
  },

  // 30 ── Gamelan Bells ───────────────────────────────────────────────────────
  // Lattice physics — grid snapping like metalophone keys. Slendro-like scale.
  {
    id:'gamelan-bells', name:'Gamelan Bells', intensity:3,
    description:'Metalofone em grade. Bells e gongs sobrepostos em camadas.',
    vibe:'Bells, Layers, Ceremony',
    tags:['Modal','Experimental','Minimalist'],
    bpm:78, scale:'pentatonic', root:55, quantaCount:72,
    motionStyle:'lattice',
    roles:{
      LEAD:    role(.30,[55,84],Q(.003,.2,.10,.5),'triangle','bandpass',2800,3,.50,0,.6,3,.25),
      ARP:     role(.25,[60,96],Q(.002,.15,.08,.4),'triangle','bandpass',3500,2,.45,5,.7,3,.18),
      PAD:     role(.20,[42,66],Q(.8,.4,.70,1.5),'sine','lowpass',600,1,.38,0,.8,2,1.0),
      BASS:    role(.15,[28,48],Q(.05,.3,.65,.5),'sine','lowpass',250,1,.50,0,.3,2,.5),
      PERC:    role(.10,[60,84],Q(.001,.08,.0,.06),'noise','bandpass',4000,.4,.38,0,.6,3,.2),
    },
    syncThreshold:.38, encounterR:.12, entainment:.45, eventRate:.55,
    reverbAmt:.65, delayAmt:.5, delayTime:.32, masterGain:.72,
    harmonyMode:'consonant',
    particleGlow:1.4, trailLen:6, lens:'Notes', bgPulse:false, cinematic:false,
    primary:'#ffd700', secondary:'#0c0a04', accent:'#ff4400',
    gateCount:4, attractorCount:1,
  },

  // 31 ── Flamenco Duende ─────────────────────────────────────────────────────
  // Revolution physics — spiraling intensity like a flamenco buildup.
  {
    id:'flamenco', name:'Flamenco Duende', intensity:4,
    description:'Espiral flamenca. Cada volta aperta a intensidade até o grito.',
    vibe:'Fire, Passion, Spiral',
    tags:['Modal','Dynamic','Strings','Groove'],
    bpm:118, scale:'phrygian', root:40, quantaCount:80,
    motionStyle:'revolution',
    roles:{
      STRINGS: role(.30,[48,80],Q(.005,.08,.35,.12),'triangle','bandpass',1800,3,.55,0,.7,3,.16),
      PERC:    role(.25,[48,72],Q(.001,.05,.0,.03),'snare','bandpass',2500,.6,.50,0,.7,5,.12),
      BASS:    role(.18,[28,48],Q(.01,.15,.50,.1),'triangle','lowpass',300,2,.55,0,.3,3,.22),
      LEAD:    role(.15,[55,88],Q(.003,.06,.38,.1),'sawtooth','lowpass',2200,3,.50,5,.5,3,.14),
      PAD:     role(.12,[40,60],Q(.2,.2,.50,.5),'sine','lowpass',500,1.5,.35,0,.6,2,.6),
    },
    syncThreshold:.50, encounterR:.10, entainment:.65, eventRate:.8,
    reverbAmt:.25, delayAmt:.2, delayTime:.12, masterGain:.82,
    harmonyMode:'modal',
    particleGlow:1.3, trailLen:5, lens:'Rhythm', bgPulse:true, cinematic:true,
    primary:'#ff2200', secondary:'#0a0200', accent:'#ffd700',
    gateCount:5, attractorCount:2,
  },

  // 32 ── Saharan Blues ───────────────────────────────────────────────────────
  // Migration physics — desert caravan. Blues scale + pentatonic groove.
  {
    id:'saharan-blues', name:'Saharan Blues', intensity:3,
    description:'Caravana no deserto. Blues do Sahara com groove hipnótico.',
    vibe:'Desert, Trance, Groove',
    tags:['Modal','Groove','Experimental'],
    bpm:108, scale:'blues', root:40, quantaCount:72,
    motionStyle:'migration',
    roles:{
      LEAD:    role(.30,[55,84],Q(.005,.10,.40,.15),'triangle','lowpass',2000,2,.48,5,.5,3,.2),
      BASS:    role(.20,[28,48],Q(.01,.2,.55,.15),'triangle','lowpass',300,1.5,.55,0,.3,3,.3),
      PERC:    role(.22,[48,84],Q(.001,.05,.0,.03),'noise','bandpass',3000,.5,.45,0,.7,4,.16),
      PAD:     role(.15,[36,60],Q(.5,.3,.65,1.0),'sine','lowpass',500,1,.38,0,.7,2,.8),
      STRINGS: role(.13,[48,72],Q(.2,.2,.55,.8),'triangle','lowpass',1200,1,.35,3,.7,2,.7),
    },
    syncThreshold:.40, encounterR:.11, entainment:.50, eventRate:.6,
    reverbAmt:.4, delayAmt:.35, delayTime:.22, masterGain:.78,
    harmonyMode:'modal',
    particleGlow:1.2, trailLen:6, lens:'Harmony', bgPulse:false, cinematic:true,
    primary:'#cc8844', secondary:'#0a0604', accent:'#44aaff',
    gateCount:4, attractorCount:0,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ── VII. ORGANIC INSTRUMENTS ───────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  // 33 ── Cello Solo ──────────────────────────────────────────────────────────
  // Drift physics — lone wanderer. Rich sawtooth filtered to cello timbre.
  {
    id:'cello-solo', name:'Cello Solo', intensity:2,
    description:'Partícula solitária vagando. Timbre de cello em sawtooth filtrado.',
    vibe:'Solo, Intimate, Melancholy',
    tags:['Strings','Soft','Ambient','Classical'],
    bpm:56, scale:'minor', root:36, quantaCount:32,
    motionStyle:'drift',
    roles:{
      STRINGS: role(.50,[36,72],Q(.15,.15,.65,1.5),'sawtooth','lowpass',1200,2,.50,3,.6,2,.4),
      PAD:     role(.30,[36,60],Q(1.2,.5,.78,2.5),'sine','lowpass',600,1,.35,0,.8,2,1.5),
      CHOIR:   role(.20,[48,66],Q(1.0,.4,.70,2.0),'sine','lowpass',550,.9,.28,0,.9,2,2.0),
    },
    syncThreshold:.25, encounterR:.18, entainment:.20, eventRate:.22,
    reverbAmt:.72, delayAmt:.45, delayTime:.4, masterGain:.65,
    harmonyMode:'consonant',
    particleGlow:2.0, trailLen:14, lens:'Harmony', bgPulse:false, cinematic:true,
    primary:'#cc8844', secondary:'#0a0604', accent:'#ffeedd',
    gateCount:2, attractorCount:0,
  },

  // 34 ── Jazz Upright Bass ───────────────────────────────────────────────────
  // Flow physics — walking line. Triangle wave filtered for woody tone.
  {
    id:'upright-bass', name:'Jazz Upright Bass', intensity:2,
    description:'Walking bass line emergente. Tom de madeira com harmônicos naturais.',
    vibe:'Walking, Woody, Groove',
    tags:['Jazz','Strings','Groove'],
    bpm:92, scale:'dorian', root:28, quantaCount:48,
    motionStyle:'flow',
    roles:{
      BASS:    role(.45,[28,52],Q(.015,.18,.55,.2),'triangle','lowpass',400,1.5,.60,0,.3,3,.22),
      LEAD:    role(.25,[48,76],Q(.01,.1,.40,.15),'triangle','lowpass',1800,1,.45,0,.5,2,.3),
      PERC:    role(.15,[48,72],Q(.001,.05,.0,.04),'noise','bandpass',2000,.4,.38,0,.6,3,.22),
      PAD:     role(.15,[42,60],Q(.4,.3,.65,1.0),'sine','lowpass',700,1,.32,0,.7,2,.9),
    },
    syncThreshold:.35, encounterR:.12, entainment:.40, eventRate:.45,
    reverbAmt:.45, delayAmt:.3, delayTime:.22, masterGain:.72,
    harmonyMode:'modal',
    particleGlow:1.0, trailLen:5, lens:'Notes', bgPulse:false, cinematic:false,
    primary:'#cc7744', secondary:'#0a0604', accent:'#88ccff',
    gateCount:3, attractorCount:1,
  },

  // 35 ── Guitar Fingerpick ───────────────────────────────────────────────────
  // Lattice physics — snapped grid like frets. Quick attack triangle tones.
  {
    id:'guitar-pick', name:'Guitar Fingerpick', intensity:3,
    description:'Grade como trastes. Dedilhado emergente em padrões repetitivos.',
    vibe:'Acoustic, Pattern, Folk',
    tags:['Strings','Minimalist','Soft','Generative'],
    bpm:98, scale:'major', root:52, quantaCount:56,
    motionStyle:'lattice',
    roles:{
      LEAD:    role(.35,[52,80],Q(.003,.1,.18,.2),'triangle','lowpass',2400,1.5,.48,0,.5,3,.18),
      ARP:     role(.25,[52,84],Q(.002,.08,.12,.15),'triangle','lowpass',3000,1,.42,0,.6,3,.14),
      BASS:    role(.20,[36,52],Q(.01,.15,.50,.15),'triangle','lowpass',350,1,.52,0,.3,2,.35),
      PAD:     role(.20,[48,66],Q(.5,.3,.6,.8),'sine','lowpass',800,1,.35,0,.7,2,.8),
    },
    syncThreshold:.40, encounterR:.10, entainment:.50, eventRate:.55,
    reverbAmt:.4, delayAmt:.35, delayTime:.2, masterGain:.75,
    harmonyMode:'consonant',
    particleGlow:1.0, trailLen:4, lens:'Notes', bgPulse:false, cinematic:false,
    primary:'#ccaa66', secondary:'#0a0804', accent:'#88aaff',
    gateCount:4, attractorCount:1,
  },

  // 36 ── Saxophone Breath ────────────────────────────────────────────────────
  // Flow physics — fluid movement like breath. Sawtooth+bandpass = sax tone.
  {
    id:'saxophone', name:'Saxophone Breath', intensity:3,
    description:'Sopro fluido. Sawtooth+bandpass como timbre de sax tenor.',
    vibe:'Breath, Fluid, Soul',
    tags:['Jazz','Improvisation','Modal'],
    bpm:82, scale:'mixolydian', root:48, quantaCount:56,
    motionStyle:'flow',
    roles:{
      LEAD:    role(.40,[48,80],Q(.02,.12,.50,.25),'sawtooth','bandpass',1600,3,.55,5,.5,3,.22),
      BASS:    role(.20,[28,48],Q(.02,.22,.60,.2),'triangle','lowpass',300,1.5,.52,0,.3,2,.35),
      PAD:     role(.18,[42,66],Q(.5,.3,.65,1.0),'sine','lowpass',700,1,.35,0,.7,2,.8),
      PERC:    role(.12,[48,72],Q(.001,.06,.0,.04),'noise','bandpass',2200,.4,.38,0,.6,3,.22),
      STRINGS: role(.10,[48,72],Q(.3,.2,.55,.8),'triangle','lowpass',1200,1,.32,0,.7,2,.8),
    },
    syncThreshold:.35, encounterR:.13, entainment:.40, eventRate:.42,
    reverbAmt:.5, delayAmt:.35, delayTime:.25, masterGain:.72,
    harmonyMode:'modal',
    particleGlow:1.2, trailLen:7, lens:'Harmony', bgPulse:false, cinematic:true,
    primary:'#ffaa44', secondary:'#0a0604', accent:'#88ccff',
    gateCount:3, attractorCount:1,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ── VIII. EVOLUTION & SYSTEMS ──────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  // 37 ── Darwin's Garden ─────────────────────────────────────────────────────
  // Predation + high mutation. Roles evolve over time. Musical Darwinism.
  {
    id:'darwin-garden', name:'Darwin\'s Garden', intensity:3,
    description:'Alta mutação. Roles evoluem. O jardim sonoro se auto-seleciona.',
    vibe:'Evolution, Mutation, Emergent',
    tags:['Experimental','Generative','Organic Instruments'],
    bpm:84, scale:'major', root:48, quantaCount:96,
    motionStyle:'predation',
    roles:{
      KICK:    role(.08,[24,36],Q(.001,.08,.0,.05),'kick','lowpass',180,.4,.72,0,.2,3,.5),
      BASS:    role(.12,[28,52],Q(.01,.2,.55,.15),'sine','lowpass',250,1,.52,0,.3,3,.35),
      PERC:    role(.12,[48,84],Q(.001,.04,.0,.03),'hihat','highpass',5000,.5,.38,0,.7,4,.18),
      PAD:     role(.18,[42,66],Q(.5,.3,.70,1.2),'sine','lowpass',800,1,.38,0,.8,3,1.0),
      LEAD:    role(.15,[55,84],Q(.008,.1,.42,.15),'triangle','lowpass',2000,1.5,.45,0,.5,3,.22),
      ARP:     role(.12,[60,96],Q(.003,.08,.15,.1),'triangle','lowpass',2800,1,.40,0,.6,3,.14),
      STRINGS: role(.12,[48,76],Q(.3,.2,.60,.8),'triangle','lowpass',1200,1,.35,3,.7,2,.7),
      CHOIR:   role(.11,[48,72],Q(1.0,.5,.72,2.0),'sine','lowpass',650,1,.30,0,.9,2,1.5),
    },
    syncThreshold:.40, encounterR:.12, entainment:.50, eventRate:.55,
    reverbAmt:.45, delayAmt:.35, delayTime:.25, masterGain:.75,
    harmonyMode:'modal',
    particleGlow:1.5, trailLen:7, lens:'Events', bgPulse:false, cinematic:true,
    primary:'#44cc44', secondary:'#040a04', accent:'#ffaa88',
    gateCount:4, attractorCount:1,
  },

  // 38 ── Ant Colony ──────────────────────────────────────────────────────────
  // School physics — dense swarm with tight alignment. Rhythmic emergence.
  {
    id:'ant-colony', name:'Ant Colony', intensity:3,
    description:'Colônia densa com alinhamento apertado. Ritmo emergente do coletivo.',
    vibe:'Collective, Dense, Pattern',
    tags:['Generative','Experimental','Groove'],
    bpm:116, scale:'minor', root:40, quantaCount:128,
    motionStyle:'school',
    roles:{
      KICK:    role(.15,[24,36],Q(.001,.06,.0,.04),'kick','lowpass',180,.4,.78,0,.2,4,.4),
      PERC:    role(.28,[48,84],Q(.001,.04,.0,.02),'noise','bandpass',3500,.6,.45,0,.7,5,.12),
      BASS:    role(.18,[28,48],Q(.008,.15,.50,.1),'triangle','lowpass',280,1.5,.55,0,.3,3,.25),
      LEAD:    role(.15,[55,80],Q(.005,.08,.35,.1),'square','lowpass',1600,2,.45,0,.5,3,.18),
      ARP:     role(.14,[60,90],Q(.002,.06,.12,.08),'triangle','lowpass',2500,1.5,.40,0,.6,3,.1),
      PAD:     role(.10,[42,60],Q(.3,.2,.55,.6),'sine','lowpass',600,1,.32,0,.6,2,.7),
    },
    syncThreshold:.45, encounterR:.09, entainment:.60, eventRate:.7,
    reverbAmt:.2, delayAmt:.2, delayTime:.12, masterGain:.8,
    harmonyMode:'modal',
    particleGlow:1.0, trailLen:3, lens:'Rhythm', bgPulse:false, cinematic:false,
    primary:'#ff8844', secondary:'#0a0604', accent:'#44ff88',
    gateCount:5, attractorCount:1,
  },

  // 39 ── Neural Network ──────────────────────────────────────────────────────
  // Dance physics — pairs form synapses. Each connection fires a note.
  {
    id:'neural-net', name:'Neural Network', intensity:3,
    description:'Pares formam sinapses. Cada conexão dispara uma nota. Cérebro vivo.',
    vibe:'Synapses, Connections, Intelligence',
    tags:['Generative','Experimental','Electronic'],
    bpm:92, scale:'whole_tone', root:48, quantaCount:80,
    motionStyle:'dance',
    roles:{
      LEAD:    role(.25,[55,88],Q(.003,.08,.30,.1),'triangle','lowpass',2500,2,.48,5,.5,3,.16),
      ARP:     role(.22,[60,96],Q(.002,.06,.12,.08),'square','lowpass',3000,1.5,.42,0,.7,3,.1),
      PAD:     role(.20,[42,66],Q(.4,.3,.60,.8),'sine','lowpass',700,1,.35,0,.7,2,.7),
      PERC:    role(.15,[48,72],Q(.001,.04,.0,.02),'noise','highpass',4500,.4,.38,0,.6,4,.14),
      BASS:    role(.10,[28,48],Q(.01,.2,.50,.12),'triangle','lowpass',280,1.5,.48,0,.3,2,.3),
      STRINGS: role(.08,[48,72],Q(.3,.2,.55,.8),'triangle','lowpass',1200,1,.32,3,.7,2,.8),
    },
    syncThreshold:.42, encounterR:.10, entainment:.55, eventRate:.6,
    reverbAmt:.4, delayAmt:.35, delayTime:.2, masterGain:.75,
    harmonyMode:'free',
    particleGlow:1.5, trailLen:6, lens:'Events', bgPulse:false, cinematic:true,
    primary:'#00e5ff', secondary:'#040810', accent:'#ff88cc',
    gateCount:4, attractorCount:1,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ── IX. ELECTRONIC SUBGENRES ───────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  // 40 ── IDM Lattice ─────────────────────────────────────────────────────────
  // Lattice physics — grid snapping creates broken patterns. Autechre-esque.
  {
    id:'idm-lattice', name:'IDM Lattice', intensity:4,
    description:'Grade quebrando patterns em ritmos impossíveis. Autechre digital.',
    vibe:'Glitch, Grid, Broken',
    tags:['Experimental','Electronic','Glitch'],
    bpm:136, scale:'chromatic', root:48, quantaCount:72,
    motionStyle:'lattice',
    roles:{
      PERC:    role(.28,[48,96],Q(.001,.03,.0,.02),'noise','bandpass',4000,4,.50,0,.8,5,.08),
      BASS:    role(.22,[28,52],Q(.002,.1,.40,.05),'square','lowpass',350,6,.60,-7,.3,3,.15),
      LEAD:    role(.22,[52,96],Q(.002,.06,.25,.06),'square','bandpass',2000,5,.48,12,.6,3,.1),
      ARP:     role(.15,[60,96],Q(.001,.04,.08,.04),'square','highpass',2500,3,.40,0,.7,3,.06),
      PAD:     role(.13,[42,60],Q(.1,.15,.35,.3),'sawtooth','lowpass',600,2,.32,0,.5,2,.5),
    },
    syncThreshold:.55, encounterR:.08, entainment:.7, eventRate:.9,
    reverbAmt:.15, delayAmt:.2, delayTime:.09, masterGain:.78,
    harmonyMode:'free',
    particleGlow:1.0, trailLen:2, lens:'Rhythm', bgPulse:false, cinematic:false,
    primary:'#00e5ff', secondary:'#000a0c', accent:'#ff00ff',
    gateCount:6, attractorCount:2,
  },

  // 41 ── Ambient House ───────────────────────────────────────────────────────
  // Drift physics — gentle 4/4 in haze. Orb-style warmth.
  {
    id:'ambient-house', name:'Ambient House', intensity:3,
    description:'4/4 suave em neblina. Warmth de pads com groove gentil.',
    vibe:'Warm, Hazy, Sunday',
    tags:['Ambient','Club','Electronic','Soft'],
    bpm:118, scale:'major', root:48, quantaCount:80,
    motionStyle:'drift',
    roles:{
      KICK:    role(.15,[24,36],Q(.001,.12,.0,.08),'kick','lowpass',160,.4,.72,0,.2,3,.5),
      BASS:    role(.18,[36,52],Q(.01,.2,.55,.15),'sine','lowpass',250,1,.52,0,.3,3,.35),
      PAD:     role(.28,[48,72],Q(.6,.3,.78,1.5),'sawtooth','lowpass',800,2,.45,5,.8,3,.9),
      LEAD:    role(.18,[60,84],Q(.01,.10,.40,.18),'triangle','lowpass',2000,1.5,.42,0,.5,2,.3),
      ARP:     role(.12,[60,88],Q(.003,.08,.15,.12),'triangle','lowpass',2800,1,.38,0,.6,2,.2),
      PERC:    role(.09,[60,72],Q(.001,.04,.0,.03),'hihat','highpass',5000,.4,.35,0,.6,3,.22),
    },
    syncThreshold:.40, encounterR:.11, entainment:.45, eventRate:.55,
    reverbAmt:.55, delayAmt:.45, delayTime:.28, masterGain:.78,
    harmonyMode:'consonant',
    particleGlow:1.5, trailLen:8, lens:'Harmony', bgPulse:false, cinematic:true,
    primary:'#88ccff', secondary:'#060810', accent:'#ffcc88',
    gateCount:4, attractorCount:1,
  },

  // 42 ── Trance Gates ────────────────────────────────────────────────────────
  // Murmuration physics — flock surges through gates. Arpeggio hypnosis.
  {
    id:'trance-gates', name:'Trance Gates', intensity:5,
    description:'Flock murmuration cruzando portais. Arpejos hipnóticos em cascata.',
    vibe:'Euphoria, Cascade, Energy',
    tags:['Electronic','Club','Rave'],
    bpm:140, scale:'minor', root:45, quantaCount:120,
    motionStyle:'murmuration',
    roles:{
      KICK:    role(.18,[24,36],Q(.001,.07,.0,.05),'kick','lowpass',200,.5,.88,0,.2,5,.35),
      BASS:    role(.16,[36,52],Q(.005,.15,.55,.08),'sawtooth','lowpass',300,2,.68,-5,.3,3,.25),
      ARP:     role(.28,[60,96],Q(.003,.08,.12,.1),'sawtooth','lowpass',2800,3,.55,7,.7,4,.08),
      LEAD:    role(.18,[55,84],Q(.01,.10,.45,.15),'sawtooth','lowpass',2200,3,.52,5,.5,3,.18),
      PAD:     role(.12,[48,66],Q(.3,.2,.65,.8),'sawtooth','lowpass',600,2,.38,0,.7,2,.8),
      PERC:    role(.08,[60,84],Q(.001,.04,.0,.02),'hihat','highpass',6000,.4,.40,0,.7,4,.14),
    },
    syncThreshold:.55, encounterR:.10, entainment:.70, eventRate:.9,
    reverbAmt:.3, delayAmt:.35, delayTime:.15, masterGain:.85,
    harmonyMode:'modal',
    particleGlow:1.6, trailLen:6, lens:'Rhythm', bgPulse:true, cinematic:true,
    primary:'#cc44ff', secondary:'#0a0210', accent:'#44ffcc',
    gateCount:6, attractorCount:2,
  },

  // 43 ── Lo-fi Rain ──────────────────────────────────────────────────────────
  // Organism physics — breathing cluster. Low-pass everything. Warm.
  {
    id:'lofi-rain', name:'Lo-fi Rain', intensity:2,
    description:'Tudo filtrado como vinil. Chuva orgânica. Warmth nostálgica.',
    vibe:'Warm, Vintage, Rain',
    tags:['Ambient','Soft','Electronic','Groove'],
    bpm:75, scale:'pentatonic', root:48, quantaCount:56,
    motionStyle:'organism',
    roles:{
      KICK:    role(.12,[24,36],Q(.001,.12,.0,.08),'kick','lowpass',120,.3,.65,0,.2,2,.55),
      BASS:    role(.18,[36,52],Q(.015,.25,.55,.2),'sine','lowpass',200,1,.48,0,.3,2,.4),
      PAD:     role(.28,[48,66],Q(.8,.4,.75,1.5),'sine','lowpass',550,1,.38,0,.8,2,1.2),
      LEAD:    role(.20,[55,76],Q(.01,.12,.38,.2),'triangle','lowpass',1200,1,.42,0,.4,2,.35),
      PERC:    role(.12,[48,72],Q(.001,.06,.0,.04),'noise','lowpass',2000,.3,.32,0,.5,3,.25),
      ARP:     role(.10,[60,84],Q(.005,.10,.15,.12),'triangle','lowpass',1800,1,.35,0,.5,2,.3),
    },
    syncThreshold:.32, encounterR:.14, entainment:.35, eventRate:.4,
    reverbAmt:.6, delayAmt:.45, delayTime:.3, masterGain:.7,
    harmonyMode:'consonant',
    particleGlow:1.2, trailLen:8, lens:'Harmony', bgPulse:false, cinematic:true,
    primary:'#ccaa88', secondary:'#0a0804', accent:'#88aacc',
    gateCount:3, attractorCount:1,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ── X. CINEMATIC & ORCHESTRAL ──────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  // 44 ── Film Noir ───────────────────────────────────────────────────────────
  // Flow physics — slow suspense. Minor + chromatic tension.
  {
    id:'film-noir', name:'Film Noir', intensity:2,
    description:'Suspense lento em flow. Sombras harmônicas, tensão cromática.',
    vibe:'Suspense, Shadow, Mystery',
    tags:['Ambient','Dark','Experimental'],
    bpm:58, scale:'harmonic_minor', root:36, quantaCount:56,
    motionStyle:'flow',
    roles:{
      PAD:     role(.30,[36,60],Q(1.0,.5,.75,2.0),'sawtooth','lowpass',500,2,.42,5,.8,3,1.2),
      STRINGS: role(.25,[42,72],Q(.5,.3,.65,1.2),'triangle','lowpass',1100,1,.38,3,.7,2,.8),
      BASS:    role(.18,[24,42],Q(.1,.3,.65,1.0),'sine','lowpass',180,1,.50,0,.3,2,.6),
      LEAD:    role(.15,[52,80],Q(.02,.12,.40,.2),'triangle','lowpass',1600,1.5,.42,0,.5,2,.35),
      CHOIR:   role(.12,[48,66],Q(1.2,.5,.72,2.5),'sine','lowpass',550,.9,.30,0,.9,2,2.0),
    },
    syncThreshold:.28, encounterR:.15, entainment:.25, eventRate:.25,
    reverbAmt:.72, delayAmt:.5, delayTime:.45, masterGain:.65,
    harmonyMode:'dissonant',
    particleGlow:1.8, trailLen:12, lens:'Tension', bgPulse:false, cinematic:true,
    primary:'#8888aa', secondary:'#040408', accent:'#ff6644',
    gateCount:2, attractorCount:1,
  },

  // 45 ── Epic Crescendo ──────────────────────────────────────────────────────
  // Exodus physics — all particles migrating toward climax. Full orchestra.
  {
    id:'epic-crescendo', name:'Epic Crescendo', intensity:5,
    description:'Migração épica para o clímax. Orquestra completa em movimento.',
    vibe:'Epic, Climax, Power',
    tags:['Orchestral','Dynamic','Cinematic'],
    bpm:96, scale:'major', root:48, quantaCount:128,
    motionStyle:'exodus',
    roles:{
      KICK:    role(.10,[24,36],Q(.001,.08,.0,.05),'kick','lowpass',200,.5,.82,0,.2,4,.4),
      BASS:    role(.12,[28,48],Q(.01,.2,.55,.15),'triangle','lowpass',300,1.5,.55,0,.3,3,.3),
      PERC:    role(.10,[48,72],Q(.001,.06,.0,.04),'snare','bandpass',3000,.5,.45,0,.7,4,.2),
      STRINGS: role(.22,[42,76],Q(.15,.15,.65,1.2),'sawtooth','lowpass',1400,1.5,.48,5,.8,3,.5),
      LEAD:    role(.15,[55,88],Q(.01,.10,.48,.15),'sawtooth','lowpass',2200,2,.50,3,.5,3,.2),
      PAD:     role(.12,[42,66],Q(.5,.3,.72,1.5),'sine','lowpass',800,1,.38,0,.8,2,.9),
      CHOIR:   role(.12,[48,72],Q(.8,.4,.75,2.0),'sine','lowpass',700,1,.35,0,.9,2,1.2),
      ARP:     role(.07,[60,90],Q(.003,.08,.15,.1),'triangle','lowpass',2800,1,.38,0,.6,2,.14),
    },
    syncThreshold:.48, encounterR:.11, entainment:.55, eventRate:.7,
    reverbAmt:.55, delayAmt:.4, delayTime:.25, masterGain:.82,
    harmonyMode:'consonant',
    particleGlow:1.8, trailLen:8, lens:'Events', bgPulse:true, cinematic:true,
    primary:'#ffd700', secondary:'#0a0800', accent:'#ff4400',
    gateCount:6, attractorCount:1,
  },

  // 46 ── Horror Cells ────────────────────────────────────────────────────────
  // Cells physics — organic pulsing clusters. Chromatic tension. Dissonant.
  {
    id:'horror-cells', name:'Horror Cells', intensity:4,
    description:'Clusters orgânicos pulsando. Dissonância cromática. Tensão visceral.',
    vibe:'Terror, Visceral, Organism',
    tags:['Experimental','Dark','Cinematic'],
    bpm:66, scale:'chromatic', root:36, quantaCount:72,
    motionStyle:'cells',
    roles:{
      PAD:     role(.30,[30,60],Q(.8,.4,.70,2.0),'sawtooth','lowpass',400,3,.45,7,.8,3,1.0),
      STRINGS: role(.25,[36,72],Q(.1,.2,.50,.8),'sawtooth','bandpass',1200,4,.42,12,.7,3,.5),
      BASS:    role(.18,[24,42],Q(.1,.3,.65,1.5),'sine','lowpass',150,1,.55,0,.3,2,.6),
      PERC:    role(.15,[36,72],Q(.001,.08,.0,.05),'noise','bandpass',2000,.5,.38,0,.6,4,.2),
      CHOIR:   role(.12,[42,60],Q(1.5,.6,.70,3.0),'sine','lowpass',450,1,.30,0,.9,2,2.5),
    },
    syncThreshold:.35, encounterR:.14, entainment:.35, eventRate:.4,
    reverbAmt:.7, delayAmt:.55, delayTime:.5, masterGain:.68,
    harmonyMode:'dissonant',
    particleGlow:2.2, trailLen:10, lens:'Tension', bgPulse:false, cinematic:true,
    primary:'#ff3333', secondary:'#080004', accent:'#880066',
    gateCount:3, attractorCount:1,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ── XI. ADVANCED SHOWCASES ─────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  // 47 ── Quantum Tunneling ───────────────────────────────────────────────────
  // Fast particles with many gates. Every crossing = note. Portal physics.
  {
    id:'quantum-tunneling', name:'Quantum Tunneling', intensity:4,
    description:'Partículas rápidas atravessando portais de gate. Cascatas quânticas.',
    vibe:'Portal, Speed, Quantum',
    tags:['Experimental','Electronic','Generative'],
    bpm:128, scale:'whole_tone', root:48, quantaCount:96,
    motionStyle:'swarm',
    roles:{
      LEAD:    role(.25,[52,96],Q(.002,.06,.25,.06),'triangle','lowpass',3000,2,.48,5,.6,3,.1),
      ARP:     role(.25,[60,96],Q(.001,.04,.10,.05),'triangle','highpass',2500,1.5,.42,12,.7,4,.06),
      PERC:    role(.20,[48,84],Q(.001,.03,.0,.02),'noise','bandpass',4000,.5,.40,0,.7,5,.08),
      BASS:    role(.15,[36,52],Q(.003,.12,.45,.08),'square','lowpass',350,3,.55,-5,.3,3,.18),
      PAD:     role(.15,[42,66],Q(.2,.15,.45,.3),'sine','lowpass',700,1,.32,0,.6,2,.5),
    },
    syncThreshold:.55, encounterR:.08, entainment:.7, eventRate:.95,
    reverbAmt:.25, delayAmt:.3, delayTime:.12, masterGain:.8,
    harmonyMode:'free',
    particleGlow:1.2, trailLen:3, lens:'Notes', bgPulse:true, cinematic:false,
    primary:'#00e5ff', secondary:'#000a0c', accent:'#ff88cc',
    gateCount:8, attractorCount:2,
  },

  // 48 ── Ambient Cosmos ──────────────────────────────────────────────────────
  // Meditation physics — barely moving. 9 harmonic layers. Infinite reverb.
  {
    id:'ambient-cosmos', name:'Ambient Cosmos', intensity:1,
    description:'38bpm mega-ambient — 9 camadas harmônicas, whole_tone, reverb infinito.',
    vibe:'Infinite, Vast, Breathing',
    tags:['Ambient','Space','Drone','Meditative'],
    bpm:38, scale:'whole_tone', root:48, quantaCount:64,
    motionStyle:'meditation',
    roles:{
      PAD:     role(.25,[36,60],Q(3.0,1.0,.88,5.0),'sine','lowpass',500,.7,.38,0,.9,3,3.5),
      CHOIR:   role(.20,[48,72],Q(2.5,.8,.82,4.0),'sine','lowpass',600,.9,.32,0,1.,2,3.0),
      STRINGS: role(.20,[42,72],Q(1.5,.6,.72,3.0),'triangle','lowpass',900,1,.35,5,.8,2,2.5),
      LEAD:    role(.15,[55,84],Q(.3,.2,.50,.8),'triangle','lowpass',1400,1,.28,0,.5,2,.8),
      BASS:    role(.10,[24,42],Q(.8,.5,.80,3.0),'sine','lowpass',150,.6,.45,0,.2,2,2.0),
      ARP:     role(.10,[60,96],Q(.1,.15,.20,.5),'triangle','highpass',2200,1.2,.22,12,.7,2,1.0),
    },
    syncThreshold:.20, encounterR:.22, entainment:.15, eventRate:.10,
    reverbAmt:.98, delayAmt:.75, delayTime:.85, masterGain:.55,
    harmonyMode:'consonant',
    particleGlow:3.0, trailLen:24, lens:'Harmony', bgPulse:false, cinematic:true,
    primary:'#8888ff', secondary:'#020208', accent:'#ffddaa',
    gateCount:1, attractorCount:0,
  },

  // 49 ── Polyrhythm Engine ───────────────────────────────────────────────────
  // Carnival physics — 3 vortices at different speeds. Complex rhythmic ratios.
  {
    id:'polyrhythm', name:'Polyrhythm Engine', intensity:4,
    description:'3 vórtices em velocidades diferentes. Polirritmia emergente 3:4:5.',
    vibe:'Complex, Layered, Polyrhythm',
    tags:['Groove','Experimental','Dynamic','Generative'],
    bpm:110, scale:'dorian', root:45, quantaCount:96,
    motionStyle:'carnival',
    roles:{
      KICK:    role(.15,[24,36],Q(.001,.07,.0,.05),'kick','lowpass',200,.5,.82,0,.2,4,.38),
      PERC:    role(.25,[48,84],Q(.001,.04,.0,.02),'snare','bandpass',3000,.6,.48,0,.8,5,.12),
      BASS:    role(.18,[28,52],Q(.008,.15,.52,.1),'triangle','lowpass',300,2,.58,0,.3,3,.2),
      LEAD:    role(.18,[55,84],Q(.005,.08,.38,.12),'triangle','lowpass',2000,1.5,.45,0,.5,3,.16),
      ARP:     role(.14,[60,96],Q(.002,.06,.12,.08),'square','lowpass',2600,2,.40,0,.6,3,.1),
      PAD:     role(.10,[42,60],Q(.3,.2,.55,.6),'sine','lowpass',600,1,.32,0,.6,2,.7),
    },
    syncThreshold:.48, encounterR:.10, entainment:.65, eventRate:.75,
    reverbAmt:.25, delayAmt:.3, delayTime:.18, masterGain:.8,
    harmonyMode:'modal',
    particleGlow:1.3, trailLen:5, lens:'Rhythm', bgPulse:true, cinematic:false,
    primary:'#ffcc00', secondary:'#0a0800', accent:'#ff3366',
    gateCount:5, attractorCount:3,
  },

  // 50 ── All 8 Voices ────────────────────────────────────────────────────────
  // Murmuration — showcases every single voice role in harmony. The full palette.
  {
    id:'all-voices', name:'All 8 Voices', intensity:3,
    description:'Todas as 8 roles em equilíbrio. A paleta completa do Music Lab.',
    vibe:'Complete, Balanced, Showcase',
    tags:['Generative','Orchestral','Groove'],
    bpm:96, scale:'major', root:48, quantaCount:112,
    motionStyle:'murmuration',
    roles:{
      KICK:    role(.12,[24,36],Q(.001,.08,.0,.05),'kick','lowpass',180,.4,.78,0,.2,3,.45),
      BASS:    role(.12,[28,52],Q(.01,.2,.55,.15),'sine','lowpass',260,1,.52,0,.3,3,.32),
      PERC:    role(.12,[48,84],Q(.001,.05,.0,.03),'hihat','highpass',5000,.5,.42,0,.7,4,.16),
      PAD:     role(.14,[48,72],Q(.5,.3,.72,1.2),'sine','lowpass',800,1,.38,0,.8,3,.9),
      LEAD:    role(.14,[55,84],Q(.008,.1,.42,.15),'triangle','lowpass',2000,1.5,.45,0,.5,3,.22),
      ARP:     role(.12,[60,96],Q(.003,.08,.15,.1),'triangle','lowpass',2800,1,.40,0,.6,3,.14),
      STRINGS: role(.12,[48,76],Q(.35,.2,.62,1.0),'triangle','lowpass',1400,1,.36,3,.8,2,.7),
      CHOIR:   role(.12,[48,72],Q(1.0,.5,.72,2.0),'sine','lowpass',650,1,.30,0,.9,2,1.5),
    },
    syncThreshold:.40, encounterR:.11, entainment:.50, eventRate:.55,
    reverbAmt:.45, delayAmt:.35, delayTime:.22, masterGain:.78,
    harmonyMode:'consonant',
    particleGlow:1.3, trailLen:6, lens:'Harmony', bgPulse:false, cinematic:true,
    primary:'#88aaff', secondary:'#060810', accent:'#ffcc88',
    gateCount:4, attractorCount:1,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ── XII. EXTREME & EDGE CASES ──────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  // 51 ── Solo Particle ───────────────────────────────────────────────────────
  // One single particle wandering. Each gate crossing is a solo performance.
  {
    id:'solo-particle', name:'Solo Particle', intensity:1,
    description:'Uma única partícula. Cada gate crossing é uma performance solo.',
    vibe:'Solitude, Focus, Pure',
    tags:['Minimalist','Experimental','Soft'],
    bpm:64, scale:'pentatonic', root:60, quantaCount:1,
    motionStyle:'drift',
    roles:{
      LEAD:    role(1.0,[48,84],Q(.01,.12,.45,.3),'triangle','lowpass',2000,1.5,.55,0,.5,2,.3),
    },
    syncThreshold:.20, encounterR:.20, entainment:.1, eventRate:.3,
    reverbAmt:.8, delayAmt:.6, delayTime:.5, masterGain:.7,
    harmonyMode:'consonant',
    particleGlow:3.0, trailLen:20, lens:'Notes', bgPulse:false, cinematic:true,
    primary:'#ffffff', secondary:'#020204', accent:'#88aaff',
    gateCount:3, attractorCount:0,
  },

  // 52 ── Maximum Density ─────────────────────────────────────────────────────
  // 256 particles in swarm. Pure noise and texture. Not music — sonification.
  {
    id:'max-density', name:'Maximum Density', intensity:5,
    description:'256 partículas em swarm. Textura pura. Som como fenômeno coletivo.',
    vibe:'Mass, Texture, Swarm',
    tags:['Experimental','Drone','Electronic'],
    bpm:120, scale:'chromatic', root:36, quantaCount:256,
    motionStyle:'swarm',
    roles:{
      PERC:    role(.25,[36,96],Q(.001,.03,.0,.02),'noise','bandpass',3000,2,.40,0,.8,6,.06),
      LEAD:    role(.25,[48,96],Q(.001,.04,.10,.04),'square','lowpass',2500,4,.35,0,.6,4,.08),
      ARP:     role(.20,[60,96],Q(.001,.03,.05,.03),'triangle','highpass',3500,2,.30,0,.7,4,.05),
      BASS:    role(.15,[24,48],Q(.002,.1,.35,.05),'sawtooth','lowpass',250,3,.50,-7,.3,3,.12),
      PAD:     role(.15,[36,60],Q(.1,.1,.30,.2),'sawtooth','lowpass',500,2,.28,5,.5,2,.3),
    },
    syncThreshold:.65, encounterR:.06, entainment:.8, eventRate:1.2,
    reverbAmt:.15, delayAmt:.1, delayTime:.08, masterGain:.7,
    harmonyMode:'free',
    particleGlow:.8, trailLen:2, lens:'Events', bgPulse:true, cinematic:true,
    primary:'#ff0055', secondary:'#0a0004', accent:'#00ff88',
    gateCount:8, attractorCount:3,
  },

  // 53 ── Gravity Falls ───────────────────────────────────────────────────────
  // Ballistic with strong gravity. Particles bounce off gates like a xylophone.
  {
    id:'gravity-falls', name:'Gravity Falls', intensity:3,
    description:'Gravidade forte. Partículas ricocheteiam em gates como xilofone.',
    vibe:'Bounce, Playful, Percussive',
    tags:['Experimental','Generative','Dynamic'],
    bpm:90, scale:'major', root:60, quantaCount:48,
    motionStyle:'ballistic',
    roles:{
      LEAD:    role(.35,[60,96],Q(.002,.12,.15,.2),'triangle','bandpass',3000,2,.50,0,.6,3,.16),
      PERC:    role(.25,[48,84],Q(.001,.05,.0,.03),'noise','bandpass',2500,.5,.45,0,.7,4,.14),
      BASS:    role(.20,[36,52],Q(.01,.2,.50,.15),'triangle','lowpass',350,1.5,.52,0,.3,3,.3),
      ARP:     role(.20,[60,88],Q(.002,.08,.12,.1),'triangle','lowpass',2800,1,.42,0,.5,3,.12),
    },
    syncThreshold:.42, encounterR:.10, entainment:.50, eventRate:.6,
    reverbAmt:.45, delayAmt:.35, delayTime:.22, masterGain:.75,
    harmonyMode:'consonant',
    particleGlow:1.2, trailLen:5, lens:'Notes', bgPulse:false, cinematic:false,
    primary:'#44aaff', secondary:'#040810', accent:'#ffcc44',
    gateCount:6, attractorCount:0,
  },

  // 54 ── Noise Meditation ────────────────────────────────────────────────────
  // Meditation physics — noise and texture as meditation. Anti-music zen.
  {
    id:'noise-meditation', name:'Noise Meditation', intensity:2,
    description:'Texturas de ruído como meditação. Anti-música zen. Escuta profunda.',
    vibe:'Noise, Zen, Deep Listening',
    tags:['Experimental','Drone','Meditative'],
    bpm:40, scale:'chromatic', root:36, quantaCount:48,
    motionStyle:'meditation',
    roles:{
      PAD:     role(.40,[24,60],Q(2.0,.8,.82,4.0),'sawtooth','lowpass',300,2,.40,5,.8,3,2.5),
      PERC:    role(.30,[36,84],Q(.5,.3,.10,1.0),'noise','bandpass',1500,1,.35,0,.6,3,1.0),
      BASS:    role(.15,[24,36],Q(1.0,.5,.80,3.0),'sine','lowpass',120,.6,.48,0,.2,2,2.0),
      STRINGS: role(.15,[42,72],Q(.8,.4,.55,1.5),'sawtooth','bandpass',800,3,.30,12,.7,2,1.5),
    },
    syncThreshold:.22, encounterR:.20, entainment:.15, eventRate:.15,
    reverbAmt:.92, delayAmt:.7, delayTime:.8, masterGain:.55,
    harmonyMode:'free',
    particleGlow:2.5, trailLen:18, lens:'Tension', bgPulse:false, cinematic:true,
    primary:'#aaaaaa', secondary:'#040404', accent:'#ff4400',
    gateCount:1, attractorCount:0,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ── XIII. BONUS: FULL SHOWCASES ────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  // 55 ── Dance of Atoms ──────────────────────────────────────────────────────
  // Dance physics — every pair is a musical duo. Waltz in harmonic minor.
  {
    id:'dance-atoms', name:'Dance of Atoms', intensity:3,
    description:'Cada par de partículas é um dueto. Valsa atômica em minor harmônica.',
    vibe:'Waltz, Pairs, Intimate',
    tags:['Generative','Classical','Experimental'],
    bpm:88, scale:'harmonic_minor', root:48, quantaCount:64,
    motionStyle:'dance',
    roles:{
      STRINGS: role(.30,[48,76],Q(.1,.12,.55,1.0),'triangle','lowpass',1400,1.5,.45,3,.7,3,.25),
      LEAD:    role(.22,[55,84],Q(.008,.10,.42,.15),'triangle','lowpass',2000,1.5,.45,0,.5,3,.2),
      PAD:     role(.20,[42,66],Q(.5,.3,.70,1.2),'sine','lowpass',700,1,.38,0,.8,2,.9),
      BASS:    role(.15,[28,48],Q(.015,.2,.55,.15),'sine','lowpass',250,1,.50,0,.3,2,.35),
      CHOIR:   role(.13,[48,72],Q(.8,.4,.70,1.5),'sine','lowpass',600,1,.30,0,.9,2,1.2),
    },
    syncThreshold:.38, encounterR:.13, entainment:.42, eventRate:.5,
    reverbAmt:.55, delayAmt:.4, delayTime:.3, masterGain:.72,
    harmonyMode:'consonant',
    particleGlow:1.6, trailLen:8, lens:'Harmony', bgPulse:false, cinematic:true,
    primary:'#ff88cc', secondary:'#080408', accent:'#88ccff',
    gateCount:3, attractorCount:1,
  },

  // 56 ── Storm Chaser ────────────────────────────────────────────────────────
  // Chaos + explosion alternating. Musical thunderstorm.
  {
    id:'storm-chaser', name:'Storm Chaser', intensity:5,
    description:'Tempestade musical. Caos browniano + explosões cíclicas. Trovão.',
    vibe:'Storm, Thunder, Power',
    tags:['Experimental','Dynamic','Electronic','Dark'],
    bpm:144, scale:'minor', root:36, quantaCount:128,
    motionStyle:'explosion',
    roles:{
      KICK:    role(.18,[24,36],Q(.001,.06,.0,.03),'kick','lowpass',240,.5,.92,0,.2,6,.28),
      PERC:    role(.25,[36,84],Q(.001,.04,.0,.02),'snare','bandpass',3500,.8,.55,0,.8,6,.1),
      BASS:    role(.18,[28,48],Q(.003,.12,.50,.06),'sawtooth','lowpass',320,4,.70,-5,.3,4,.15),
      LEAD:    role(.18,[48,88],Q(.002,.06,.30,.06),'sawtooth','lowpass',2200,3,.52,7,.5,3,.12),
      ARP:     role(.12,[60,96],Q(.001,.04,.08,.04),'square','highpass',2800,2,.40,0,.7,4,.06),
      PAD:     role(.09,[36,60],Q(.15,.15,.40,.3),'sawtooth','lowpass',500,2,.30,0,.5,2,.4),
    },
    syncThreshold:.60, encounterR:.08, entainment:.8, eventRate:1.1,
    reverbAmt:.2, delayAmt:.15, delayTime:.1, masterGain:.85,
    harmonyMode:'dissonant',
    particleGlow:1.5, trailLen:3, lens:'Events', bgPulse:true, cinematic:true,
    primary:'#ff4400', secondary:'#0a0200', accent:'#00ccff',
    gateCount:7, attractorCount:2,
  },

  // 57 ── Silk Road ───────────────────────────────────────────────────────────
  // Migration — long journey through modal scales. All 8 voices traveling.
  {
    id:'silk-road', name:'Silk Road', intensity:3,
    description:'Viagem pela Rota da Seda. 8 vozes migrando em harmonic minor.',
    vibe:'Journey, Caravan, Horizon',
    tags:['Modal','Orchestral','Dynamic','Ambient'],
    bpm:86, scale:'harmonic_minor', root:40, quantaCount:96,
    motionStyle:'migration',
    roles:{
      KICK:    role(.08,[24,36],Q(.001,.1,.0,.06),'kick','lowpass',160,.3,.68,0,.2,2,.5),
      BASS:    role(.12,[28,48],Q(.02,.25,.60,.2),'sine','lowpass',220,1,.50,0,.3,2,.4),
      PERC:    role(.12,[48,72],Q(.001,.06,.0,.04),'noise','bandpass',2500,.4,.38,0,.6,4,.2),
      PAD:     role(.18,[36,60],Q(.8,.4,.72,1.5),'sine','lowpass',600,1,.38,0,.8,3,1.0),
      STRINGS: role(.18,[42,72],Q(.2,.15,.58,1.0),'triangle','lowpass',1400,1.5,.42,5,.8,3,.5),
      LEAD:    role(.14,[52,84],Q(.01,.10,.42,.15),'triangle','bandpass',1800,2,.45,0,.5,3,.22),
      CHOIR:   role(.10,[48,72],Q(1.0,.5,.72,2.0),'sine','lowpass',600,1,.30,0,.9,2,1.5),
      ARP:     role(.08,[60,88],Q(.005,.08,.15,.12),'triangle','lowpass',2400,1,.35,0,.6,2,.18),
    },
    syncThreshold:.38, encounterR:.12, entainment:.42, eventRate:.5,
    reverbAmt:.55, delayAmt:.45, delayTime:.32, masterGain:.72,
    harmonyMode:'modal',
    particleGlow:1.5, trailLen:8, lens:'Harmony', bgPulse:false, cinematic:true,
    primary:'#cc8844', secondary:'#0a0604', accent:'#88ccff',
    gateCount:4, attractorCount:0,
  },

  // 58 ── Cells of Life ───────────────────────────────────────────────────────
  // Cells physics — breathing clusters. Life simulation as music.
  {
    id:'cells-life', name:'Cells of Life', intensity:3,
    description:'Simulação de vida como música. Células respiram, dividem, cantam.',
    vibe:'Life, Breath, Organic',
    tags:['Generative','Experimental','Organic Instruments'],
    bpm:80, scale:'lydian', root:48, quantaCount:104,
    motionStyle:'cells',
    roles:{
      KICK:    role(.08,[24,36],Q(.001,.1,.0,.06),'kick','lowpass',160,.3,.65,0,.2,2,.55),
      BASS:    role(.12,[28,48],Q(.02,.25,.58,.18),'sine','lowpass',220,1,.48,0,.3,2,.38),
      PAD:     role(.22,[42,66],Q(.8,.4,.75,1.5),'sine','lowpass',700,1,.38,0,.8,3,1.0),
      LEAD:    role(.18,[55,84],Q(.008,.1,.40,.15),'triangle','lowpass',2000,1.5,.42,0,.5,3,.22),
      STRINGS: role(.15,[48,76],Q(.3,.2,.58,.8),'triangle','lowpass',1200,1,.35,3,.7,2,.7),
      CHOIR:   role(.13,[48,72],Q(1.0,.5,.72,2.0),'sine','lowpass',600,1,.30,0,.9,2,1.5),
      ARP:     role(.07,[60,88],Q(.003,.08,.15,.1),'triangle','lowpass',2600,1,.35,0,.6,2,.14),
      PERC:    role(.05,[48,72],Q(.001,.05,.0,.03),'noise','highpass',4500,.4,.32,0,.5,3,.2),
    },
    syncThreshold:.38, encounterR:.13, entainment:.42, eventRate:.48,
    reverbAmt:.5, delayAmt:.38, delayTime:.28, masterGain:.75,
    harmonyMode:'consonant',
    particleGlow:1.6, trailLen:7, lens:'Events', bgPulse:false, cinematic:true,
    primary:'#44ffcc', secondary:'#040a08', accent:'#ff88aa',
    gateCount:3, attractorCount:1,
  },

  // 59 ── Revolution Waltz ────────────────────────────────────────────────────
  // Revolution — musical tension builds and releases in 3/4 feel.
  {
    id:'revolution-waltz', name:'Revolution Waltz', intensity:4,
    description:'Espiral valsa. Tensão cresce até colapsar em resolução harmônica.',
    vibe:'Waltz, Spiral, Climax',
    tags:['Classical','Dynamic','Experimental'],
    bpm:102, scale:'minor', root:45, quantaCount:80,
    motionStyle:'revolution',
    roles:{
      STRINGS: role(.28,[42,76],Q(.1,.12,.58,1.0),'sawtooth','lowpass',1400,1.5,.48,5,.8,3,.4),
      LEAD:    role(.22,[55,88],Q(.008,.08,.42,.12),'triangle','lowpass',2200,2,.48,0,.5,3,.18),
      PAD:     role(.18,[42,60],Q(.5,.3,.68,1.2),'sine','lowpass',700,1,.38,0,.7,2,.8),
      BASS:    role(.15,[28,48],Q(.01,.2,.55,.15),'sine','lowpass',280,1,.52,0,.3,2,.3),
      PERC:    role(.10,[48,72],Q(.001,.05,.0,.03),'snare','bandpass',2800,.5,.42,0,.6,4,.18),
      CHOIR:   role(.07,[48,66],Q(.8,.4,.68,1.5),'sine','lowpass',550,.9,.28,0,.8,2,1.2),
    },
    syncThreshold:.48, encounterR:.11, entainment:.58, eventRate:.68,
    reverbAmt:.42, delayAmt:.35, delayTime:.22, masterGain:.78,
    harmonyMode:'modal',
    particleGlow:1.5, trailLen:7, lens:'Tension', bgPulse:false, cinematic:true,
    primary:'#cc44ff', secondary:'#0a0210', accent:'#ffd700',
    gateCount:4, attractorCount:1,
  },

  // 60 ── The Blank Canvas ────────────────────────────────────────────────────
  // Empty starting point — no particles, no gates. You build everything.
  {
    id:'blank-canvas', name:'The Blank Canvas', intensity:0,
    description:'Tela em branco. 0 partículas, 0 gates. Construa tudo do zero.',
    vibe:'Empty, Your Creation, Freedom',
    tags:['Experimental','Minimalist','Generative'],
    bpm:90, scale:'major', root:48, quantaCount:0,
    motionStyle:'drift',
    roles:{
      PAD:     role(.25,[48,72],Q(.5,.3,.70,1.2),'sine','lowpass',800,1,.38,0,.8,2,.9),
      LEAD:    role(.25,[55,84],Q(.008,.1,.42,.15),'triangle','lowpass',2000,1.5,.45,0,.5,3,.22),
      BASS:    role(.25,[28,52],Q(.01,.2,.55,.15),'sine','lowpass',250,1,.50,0,.3,2,.35),
      ARP:     role(.25,[60,96],Q(.003,.08,.15,.1),'triangle','lowpass',2800,1,.40,0,.6,3,.14),
    },
    syncThreshold:.35, encounterR:.12, entainment:.40, eventRate:.5,
    reverbAmt:.5, delayAmt:.4, delayTime:.25, masterGain:.75,
    harmonyMode:'consonant',
    particleGlow:1.5, trailLen:8, lens:'Notes', bgPulse:false, cinematic:false,
    primary:'#ffffff', secondary:'#080808', accent:'#37b2da',
    gateCount:0, attractorCount:0,
  },
];

export const PRESET_MAP = new Map(MUSIC_PRESETS.map(p => [p.id, p]));
export function getPreset(id: string): MusicPreset | undefined {
  return PRESET_MAP.get(id);
}
