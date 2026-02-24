# Music Lab — Patch 01.3: Evolution & 3D Vision

**Date**: 2026-02-23  
**Version**: Music Lab v2 — Patch 01.3  
**Focus**: Professional Templates, 3D Visualization, Brand Update

---

## 🎨 Brand Update

### Tools for Perception
- Rebranded from "Quantum Symbolics" to **Tools for Perception**
- Subtle "Tools Cloud" mention in supertitle
- Updated subtitle to reflect complex systems, artificial life & experimental symbolics
- Changes applied to:
  - HomePage component
  - WelcomeModal
  - All user-facing interfaces

---

## 🎵 Music Lab: 20 New Professional Templates (Presets 41–60)

### Organic & Acoustic Instruments (41–48)

**41. Classical Guitar Garden** 🎸  
Nylon-string fingerpicking with natural harmonics. Intimate warmth, lattice motion.

**42. Jazz Guitar Voicings** 🎺  
Complex 7th/9th/13th chord voicings. Soft picking, modal dorian harmony.

**43. Bebop Saxophone Lines** 🎷  
Charlie Parker-inspired alto/tenor lines. Blazing 220 BPM bebop runs.

**44. Shakuhachi Wind** 🌬️  
Japanese bamboo flute with breath control. Zen minimalism, pentatonic scales.

**45. Prepared Piano Cage** 🎹  
John Cage-inspired prepared piano. Metallic percussive sounds, chromatic freedom.

**46. Cello Bach Suite** 🎻  
Solo cello in Baroque style. Contraputal lines, harmonic minor depth.

**47. Sitar Raga Meditation** 🪕  
Indian classical raga with tampura drone. Phrygian mode, meditative flow.

**48. Miles Davis Trumpet** 🎺  
Cool jazz modal trumpet with Harmon mute. Dorian mode, laid-back phrasing.

### Experimental FX Showcase (49–52)

**49. Granular Clouds** ☁️  
Granular synthesis with reverse/freeze zones. Ethereal whole-tone atmosphere.

**50. Doppler Highways** 🚀  
High-speed particles with doppler shift. Gravitational zones, sci-fi motion.

**51. Phase Distortion Lab** 🔊  
Bitcrush + ring modulation zones. Digital distortion, controlled chaos.

**52. Spectral Morph** 🌈  
Spectral freeze zones with continuous timbral transformation. Harmonic minor morphing.

### Physics Showcase (53–56)

**53. Orbital Mechanics** 🪐  
Precise Newtonian orbits. Gravitational attraction, celestial harmony.

**54. Ballistic Particles** 🎯  
Parabolic arcs with realistic gravity. Ballistic physics mode showcase.

**55. Magnetic Fields** 🧲  
Push-pull magnetic forces. Attractor/repulsor zones in dynamic balance.

**56. Quantum Tunneling** ⚛️  
Particles tunnel through barriers. Non-local quantum behavior, whole-tone scale.

### Advanced Hybrid Compositions (57–60)

**57. Orchestral AI** 🎼  
Full generative orchestra. All 6+ roles in symphonic harmony, epic cinematic scope.

**58. Cyberpunk Blade Runner** 🌃  
Vangelis-inspired synth pads, ethereal sax, infinite reverb. Neon rain aesthetic.

**59. Afrofuturism** 🌍  
African polyrhythms meet futuristic synths. Sun Ra × Flying Lotus energy.

**60. Celestial Cathedral** ⛪  
Massive drone + celestial choir + epic strings. Infinite vertical space, divine resonance.

---

## 🎯 Template Design Philosophy

All 20 new presets showcase:

### Professional Timbre Modeling
- Realistic envelope shaping (attack/decay/sustain/release)
- Appropriate filter types and resonance
- Authentic pitch ranges per instrument
- Detune and pan spread for organic width

### Advanced FX Integration
- Strategic use of 23 available FX zone effects
- Reverb, delay, filter, distortion parameters
- Bitcrush, ring modulation, spectral processing
- Granular synthesis, doppler shift

### Physics & Motion
- Ballistic gravity modes
- Orbital mechanics
- Magnetic field simulation
- Quantum tunneling behavior

### Musical Authenticity
- Genre-appropriate scales (blues, dorian, phrygian, raga modes)
- Culturally authentic rhythmic patterns (afrobeat, cumbia, bossa nova)
- Historical references (Bach, Cage, Miles Davis, Vangelis)
- Professional BPM ranges

---

## 🌐 3D Visualization Mode

### New Feature: Real-time 3D Rendering

**Technology**: Three.js WebGL renderer

**Camera Modes**:
- **Orbital**: Smooth rotating camera around origin (default)
- **Top-Down**: Bird's eye view (12 units up)
- **Side View**: Orthogonal perspective (12 units side)
- **First-Person**: Immersive ground-level view

### 3D Particle Rendering

**Visual Features**:
- Spherical particles with role-based colors
- Emissive glow based on brightness/charge
- Dynamic scaling by energy level
- Smooth rotation and animation
- Fog effects for depth perception

**Spatial Mapping**:
- X/Y coordinates → 3D X/Z plane (×5 scale)
- Charge/brightness → Y elevation
- Phase → vertical oscillation
- Trails preserved from 2D state

**Lighting**:
- Ambient base lighting
- Two colored point lights (cyan, magenta)
- Dynamic emissive materials
- Standard PBR shading (metalness/roughness)

### UI Integration

**Toggle Button**: Top HUD — "◎ 3D" button  
**Camera Selector**: ORB / TOP / SIDE / FPP buttons (appears when 3D active)  
**Info Overlay**: Bottom-right corner shows:
- 3D Vision Active indicator
- Current camera mode
- Particle count
- Interaction hint

**Seamless Switching**: Toggle between 2D canvas and 3D view without losing state

---

## 🔧 Technical Implementation

### Dependencies Added
```json
{
  "three": "^0.183.1",
  "@types/three": "^0.183.1"
}
```

### New Files
- `/src/render/music3DRenderer.tsx` — Three.js renderer component
- `/PATCH_01.3_NOTES.md` — This documentation

### Modified Files
- `/src/app/components/HomePage.tsx` — Brand update
- `/src/guide/WelcomeModal.tsx` — Brand update
- `/src/sim/music/musicPresets.ts` — 20 new presets (41–60)
- `/src/app/MusicLab.tsx` — 3D mode integration

---

## 🎮 User Experience

### Workflow
1. Select any preset (including new organic/FX/physics presets)
2. Click "◎ 3D" button in top HUD
3. Choose camera mode (ORB/TOP/SIDE/FPP)
4. Observe particles in 3D space
5. Audio/physics continue seamlessly
6. Toggle back to 2D anytime

### Performance
- Efficient particle instancing
- Automatic cleanup of old particles
- Respects paused state
- 60 FPS target on modern hardware

### Accessibility
- Visual indicator when 3D active
- Camera mode clearly labeled
- Particle count displayed
- Non-intrusive overlay design

---

## 📊 Statistics

**New Presets**: 20 (total now 60)  
**3D Camera Modes**: 4  
**Lines of Code**: ~600 (3D renderer) + ~1,200 (presets)  
**Instruments Modeled**: 8 organic instruments  
**FX Techniques**: 4 advanced processing methods  
**Physics Modes**: 4 realistic simulations  
**Hybrid Compositions**: 4 genre-blending pieces

---

## 🚀 Future Enhancements

### Potential 3D Features
- [ ] Particle trails in 3D space
- [ ] Interactive 3D tools (spawn/excite in 3D)
- [ ] VR headset support (WebXR)
- [ ] Custom shader effects
- [ ] Post-processing (bloom, SSAO)
- [ ] FX zone visualization in 3D
- [ ] Gate/attractor 3D geometry

### Additional Templates
- [ ] More world music traditions (gamelan, kora, didgeridoo)
- [ ] Modern production styles (lo-fi, vaporwave, hyperpop)
- [ ] Classical composition techniques (fugue, canon, variations)
- [ ] Advanced sound design (FM synthesis, wavetable)

---

## ✨ Highlights

**Most Authentic**: Classical Guitar Garden (preset 41)  
**Most Experimental**: Quantum Tunneling (preset 56)  
**Most Cinematic**: Celestial Cathedral (preset 60)  
**Best FX Showcase**: Granular Clouds (preset 49)  
**Most Rhythmic**: Afrofuturism (preset 59)  

**Coolest 3D Camera**: Orbital mode (smooth cinematic rotation)  
**Best for Performance**: Top-down view (see all interactions clearly)

---

**End of Patch 01.3 Notes**

*Tools for Perception — Explore the edges of musical emergence*
