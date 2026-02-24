// G) COLOR PALETTES for alien life aesthetics
// Each palette is an array of RGB colors [r, g, b] where each component is 0-1
// All palettes have been expanded to 16 colors for optimal distinction with 12+ particle types

import { generateTheoryBasedPalette } from './colorTheory';

export type PaletteColors = Array<[number, number, number]>;

export interface Palette {
  name: string;
  colors: PaletteColors;
}

// Convert hex to RGB 0-1
const hex = (h: string): [number, number, number] => {
  const r = parseInt(h.slice(1, 3), 16) / 255;
  const g = parseInt(h.slice(3, 5), 16) / 255;
  const b = parseInt(h.slice(5, 7), 16) / 255;
  return [r, g, b];
};

export const PALETTES: Palette[] = [
  {
    name: 'Classic',
    colors: [
      hex('#FF4444'), // red
      hex('#44FF44'), // green
      hex('#4444FF'), // blue
      hex('#FFFF44'), // yellow
      hex('#FF44FF'), // magenta
      hex('#44FFFF'), // cyan
      hex('#FF8844'), // orange
      hex('#8844FF'), // purple
      hex('#44FF88'), // mint
      hex('#FF4488'), // pink
      hex('#88FF44'), // lime
      hex('#4488FF'), // sky
      hex('#FFAA44'), // gold
      hex('#AA44FF'), // violet
      hex('#44FFAA'), // aqua
      hex('#FF44AA'), // rose
    ],
  },
  {
    name: 'Neon Bio',
    colors: [
      hex('#00FFAA'), // electric cyan
      hex('#FF00AA'), // hot pink
      hex('#AAFF00'), // acid green
      hex('#FF6600'), // electric orange
      hex('#0066FF'), // electric blue
      hex('#FF0066'), // neon red
      hex('#66FF00'), // laser green
      hex('#FF00FF'), // magenta
      hex('#00FFFF'), // cyan
      hex('#FFFF00'), // yellow
      hex('#FF0099'), // pink
      hex('#99FF00'), // lime
      hex('#00FF99'), // mint
      hex('#9900FF'), // purple
      hex('#FF9900'), // orange
      hex('#0099FF'), // sky
    ],
  },
  {
    name: 'Alien Dusk',
    colors: [
      hex('#FF6B9D'), // alien rose
      hex('#C44569'), // dark rose
      hex('#FFA07A'), // light salmon
      hex('#FA8072'), // salmon
      hex('#E17055'), // burnt sienna
      hex('#FDCB6E'), // amber
      hex('#6C5CE7'), // purple
      hex('#A29BFE'), // light purple
      hex('#74B9FF'), // light blue
      hex('#00B894'), // turquoise
      hex('#00CEC9'), // cyan
      hex('#81ECEC'), // light cyan
      hex('#55EFC4'), // mint
      hex('#FD79A8'), // pink
      hex('#E84393'), // magenta
      hex('#D63031'), // red
    ],
  },
  {
    name: 'Fungal',
    colors: [
      hex('#8B4513'), // brown
      hex('#A0522D'), // sienna
      hex('#CD853F'), // tan
      hex('#DEB887'), // burlywood
      hex('#F0E68C'), // khaki
      hex('#9ACD32'), // yellow green
      hex('#6B8E23'), // olive
      hex('#556B2F'), // dark olive
      hex('#2F4F4F'), // slate gray
      hex('#8FBC8F'), // dark sea green
      hex('#20B2AA'), // light sea green
      hex('#48D1CC'), // turquoise
      hex('#40E0D0'), // turquoise
      hex('#7FFFD4'), // aquamarine
      hex('#98FB98'), // pale green
      hex('#90EE90'), // light green
    ],
  },
  {
    name: 'Oceanic',
    colors: [
      hex('#001F3F'), // deep blue
      hex('#0074D9'), // blue
      hex('#7FDBFF'), // aqua
      hex('#39CCCC'), // teal
      hex('#3D9970'), // olive
      hex('#2ECC40'), // green
      hex('#01FF70'), // lime
      hex('#FFDC00'), // yellow
      hex('#FF851B'), // orange
      hex('#FF4136'), // red
      hex('#85144B'), // maroon
      hex('#F012BE'), // fuchsia
      hex('#B10DC9'), // purple
      hex('#111111'), // black
      hex('#AAAAAA'), // silver
      hex('#DDDDDD'), // white
    ],
  },
  {
    name: 'Plasma',
    colors: [
      hex('#FF00FF'), // magenta
      hex('#FF00CC'), // pink magenta
      hex('#FF0099'), // hot pink
      hex('#FF0066'), // neon red
      hex('#FF3300'), // orange red
      hex('#FF6600'), // orange
      hex('#FF9900'), // gold
      hex('#FFCC00'), // amber
      hex('#FFFF00'), // yellow
      hex('#CCFF00'), // yellow green
      hex('#99FF00'), // lime
      hex('#66FF00'), // green
      hex('#33FF00'), // neon green
      hex('#00FF33'), // spring green
      hex('#00FF66'), // mint
      hex('#00FF99'), // aqua
    ],
  },
  
  // NEW PALETTES (30+)
  {
    name: 'Sunset',
    colors: [
      hex('#FF6B35'), hex('#F7931E'), hex('#FDC830'),
      hex('#F37335'), hex('#FE4A49'), hex('#D63447'),
      hex('#FF5733'), hex('#C70039'), hex('#900C3F'),
      hex('#FF8C42'), hex('#FFA351'), hex('#FFB85C'),
      hex('#FF9966'), hex('#E85D75'), hex('#FF4500'), hex('#B33000'),
    ],
  },
  {
    name: 'Cherry Blossom',
    colors: [
      hex('#FFB7C5'), hex('#FFC0CB'), hex('#FFD1DC'),
      hex('#E6A8D7'), hex('#D291BC'), hex('#957DAD'),
      hex('#FEA3AA'), hex('#F0B7A4'), hex('#FFC8A2'),
      hex('#D3D0CB'), hex('#A997DF'), hex('#F7CAC9'),
      hex('#FFAAC1'), hex('#E8B4D0'), hex('#C89FBB'), hex('#B57FA6'),
    ],
  },
  {
    name: 'Northern Lights',
    colors: [
      hex('#00FFC6'), hex('#00FFE7'), hex('#00E4FF'),
      hex('#00C5FF'), hex('#00A6FF'), hex('#4D88FF'),
      hex('#8B5CF6'), hex('#A78BFA'), hex('#C4B5FD'),
      hex('#7DD3FC'), hex('#38BDF8'), hex('#0EA5E9'),
      hex('#00FFB3'), hex('#5D9FFF'), hex('#9B73F7'), hex('#60D8F8'),
    ],
  },
  {
    name: 'Desert',
    colors: [
      hex('#EDC9AF'), hex('#E6BC98'), hex('#D2A76E'),
      hex('#C19A6B'), hex('#AA8B5C'), hex('#9C6F46'),
      hex('#F4A460'), hex('#DAA520'), hex('#CD853F'),
      hex('#8B7355'), hex('#A0826D'), hex('#C2B280'),
      hex('#D4A373'), hex('#B8956A'), hex('#E8C4A0'), hex('#967554'),
    ],
  },
  {
    name: 'Toxic',
    colors: [
      hex('#39FF14'), hex('#00FF41'), hex('#0FFF50'),
      hex('#7FFF00'), hex('#ADFF2F'), hex('#CCFF00'),
      hex('#DFFF00'), hex('#F0FF00'), hex('#FFFF00'),
      hex('#FF00FF'), hex('#FF10F0'), hex('#FF1493'),
      hex('#00FF7F'), hex('#BBFF00'), hex('#FF00DD'), hex('#FF3399'),
    ],
  },
  {
    name: 'Galaxy',
    colors: [
      hex('#2C003E'), hex('#512B58'), hex('#9D44C0'),
      hex('#EC53B0'), hex('#FFA0D2'), hex('#FF6FCF'),
      hex('#C724B1'), hex('#8B2FC9'), hex('#5C2E7E'),
      hex('#2E1F3B'), hex('#1C0F2A'), hex('#0F0520'),
      hex('#B83FD8'), hex('#D967E8'), hex('#3D1A52'), hex('#FF88DD'),
    ],
  },
  {
    name: 'Cyberpunk',
    colors: [
      hex('#FF006E'), hex('#FB5607'), hex('#FFBE0B'),
      hex('#8338EC'), hex('#3A86FF'), hex('#00F5FF'),
      hex('#FF00FF'), hex('#00FFFF'), hex('#FFFF00'),
      hex('#FF0080'), hex('#0080FF'), hex('#80FF00'),
      hex('#FF3399'), hex('#AA00FF'), hex('#00FFAA'), hex('#FFAA00'),
    ],
  },
  {
    name: 'Retro Wave',
    colors: [
      hex('#FF6EC7'), hex('#FF10F0'), hex('#BF00FF'),
      hex('#8000FF'), hex('#4000FF'), hex('#0040FF'),
      hex('#0080FF'), hex('#00C0FF'), hex('#00FFFF'),
      hex('#FF007F'), hex('#FF00BF'), hex('#FF0050'),
      hex('#9F00FF'), hex('#6000FF'), hex('#0060FF'), hex('#00A0FF'),
    ],
  },
  {
    name: 'Coral Reef',
    colors: [
      hex('#FF7F50'), hex('#FF6347'), hex('#FFB347'),
      hex('#FFA07A'), hex('#FA8072'), hex('#E9967A'),
      hex('#00CED1'), hex('#48D1CC'), hex('#40E0D0'),
      hex('#7FFFD4'), hex('#66CDAA'), hex('#20B2AA'),
      hex('#FF9966'), hex('#FF8866'), hex('#5FE5E0'), hex('#8FFFEE'),
    ],
  },
  {
    name: 'Midnight',
    colors: [
      hex('#191970'), hex('#000080'), hex('#00008B'),
      hex('#0000CD'), hex('#0000FF'), hex('#1E90FF'),
      hex('#4169E1'), hex('#6495ED'), hex('#87CEEB'),
      hex('#4682B4'), hex('#5F9EA0'), hex('#708090'),
      hex('#0C0C50'), hex('#0000AA'), hex('#2E7FE1'), hex('#7AB8ED'),
    ],
  },
  {
    name: 'Lava',
    colors: [
      hex('#8B0000'), hex('#A52A2A'), hex('#B22222'),
      hex('#DC143C'), hex('#FF0000'), hex('#FF4500'),
      hex('#FF6347'), hex('#FF7F50'), hex('#FFA500'),
      hex('#FF8C00'), hex('#FFD700'), hex('#FFFF00'),
      hex('#990000'), hex('#EE1111'), hex('#FF5522'), hex('#FFB800'),
    ],
  },
  {
    name: 'Ice',
    colors: [
      hex('#E0FFFF'), hex('#AFEEEE'), hex('#B0E0E6'),
      hex('#ADD8E6'), hex('#87CEEB'), hex('#87CEFA'),
      hex('#00BFFF'), hex('#1E90FF'), hex('#6495ED'),
      hex('#4682B4'), hex('#5F9EA0'), hex('#B0C4DE'),
      hex('#CCFFFF'), hex('#99DDEE'), hex('#77D8FF'), hex('#A0D4EE'),
    ],
  },
  {
    name: 'Forest',
    colors: [
      hex('#228B22'), hex('#32CD32'), hex('#00FF00'),
      hex('#7CFC00'), hex('#7FFF00'), hex('#ADFF2F'),
      hex('#9ACD32'), hex('#6B8E23'), hex('#556B2F'),
      hex('#8FBC8F'), hex('#90EE90'), hex('#98FB98'),
      hex('#3DA83D'), hex('#5FCC5F'), hex('#88DD00'), hex('#A0E8A0'),
    ],
  },
  {
    name: 'Pastel Dream',
    colors: [
      hex('#FFB3BA'), hex('#FFDFBA'), hex('#FFFFBA'),
      hex('#BAFFC9'), hex('#BAE1FF'), hex('#E0BBE4'),
      hex('#FFDFD3'), hex('#FEC8D8'), hex('#D4A5A5'),
      hex('#C9E4DE'), hex('#FFCCF9'), hex('#FCCBCB'),
      hex('#FFC8D0'), hex('#FFE8C8'), hex('#D8FFE8'), hex('#F0D8FF'),
    ],
  },
  {
    name: 'Volcano',
    colors: [
      hex('#610000'), hex('#8B0000'), hex('#B22222'),
      hex('#DC143C'), hex('#FF0000'), hex('#FF4500'),
      hex('#FFA500'), hex('#FFD700'), hex('#FFFF00'),
      hex('#696969'), hex('#808080'), hex('#A9A9A9'),
      hex('#450000'), hex('#CC1111'), hex('#FF6611'), hex('#555555'),
    ],
  },
  {
    name: 'Cotton Candy',
    colors: [
      hex('#FFB3D9'), hex('#FFC9E6'), hex('#FFDFF2'),
      hex('#E6B3FF'), hex('#D9B3FF'), hex('#CCB3FF'),
      hex('#B3D9FF'), hex('#B3E6FF'), hex('#B3F2FF'),
      hex('#FFB3E6'), hex('#FFB3D9'), hex('#FFB3CC'),
      hex('#FFA8D4'), hex('#DDA8FF'), hex('#BFC8FF'), hex('#FFC0DC'),
    ],
  },
  {
    name: 'Autumn',
    colors: [
      hex('#8B4513'), hex('#A0522D'), hex('#D2691E'),
      hex('#CD5C5C'), hex('#F08080'), hex('#FA8072'),
      hex('#FFA07A'), hex('#FFB347'), hex('#FFC04C'),
      hex('#FADA5E'), hex('#FFD700'), hex('#DAA520'),
      hex('#B8621E'), hex('#E8775F'), hex('#FFD466'), hex('#CC9933'),
    ],
  },
  {
    name: 'Spring',
    colors: [
      hex('#FFB7CE'), hex('#FFC9E6'), hex('#FFE5F1'),
      hex('#E6FFE6'), hex('#CCFFCC'), hex('#B3FFB3'),
      hex('#FFFFCC'), hex('#FFFFE0'), hex('#FFFACD'),
      hex('#D4F1F4'), hex('#B4E5E7'), hex('#9FD8DB'),
      hex('#FFCCE0'), hex('#DDFFD0'), hex('#FFFFD8'), hex('#C8ECEE'),
    ],
  },
  {
    name: 'Deep Sea',
    colors: [
      hex('#001F3F'), hex('#003B5C'), hex('#005C7A'),
      hex('#007A99'), hex('#0099B8'), hex('#00B8D7'),
      hex('#1BD4E4'), hex('#36E4F2'), hex('#51F4FF'),
      hex('#012840'), hex('#013A5A'), hex('#014C73'),
      hex('#00334D'), hex('#008AAA'), hex('#00CCEE'), hex('#025E88'),
    ],
  },
  {
    name: 'Candy',
    colors: [
      hex('#FF69B4'), hex('#FF1493'), hex('#FF00FF'),
      hex('#DA70D6'), hex('#BA55D3'), hex('#9370DB'),
      hex('#8A2BE2'), hex('#9400D3'), hex('#8B008B'),
      hex('#FF00FF'), hex('#EE82EE'), hex('#DDA0DD'),
      hex('#FF4FB8'), hex('#CC44EE'), hex('#AA22DD'), hex('#F090E8'),
    ],
  },
  {
    name: 'Mint',
    colors: [
      hex('#00FA9A'), hex('#00FF7F'), hex('#3CB371'),
      hex('#2E8B57'), hex('#8FBC8F'), hex('#90EE90'),
      hex('#98FB98'), hex('#AFEEEE'), hex('#7FFFD4'),
      hex('#40E0D0'), hex('#48D1CC'), hex('#00CED1'),
      hex('#11DD88'), hex('#66EE99'), hex('#99FFCC'), hex('#55E8D8'),
    ],
  },
  {
    name: 'Fire',
    colors: [
      hex('#FF0000'), hex('#FF4500'), hex('#FF6347'),
      hex('#FF7F50'), hex('#FFA500'), hex('#FFB347'),
      hex('#FFC04C'), hex('#FFD700'), hex('#FFFF00'),
      hex('#FF8C00'), hex('#FF6600'), hex('#FF4400'),
      hex('#FF1100'), hex('#FF5522'), hex('#FF9933'), hex('#FFEE11'),
    ],
  },
  {
    name: 'Neon Nights',
    colors: [
      hex('#FF00FF'), hex('#FF00AA'), hex('#FF0055'),
      hex('#00FFFF'), hex('#00AAFF'), hex('#0055FF'),
      hex('#00FF00'), hex('#00FF55'), hex('#00FFAA'),
      hex('#FFFF00'), hex('#FFAA00'), hex('#FF5500'),
      hex('#DD00DD'), hex('#0088DD'), hex('#11FF11'), hex('#FFCC00'),
    ],
  },
  {
    name: 'Lavender',
    colors: [
      hex('#E6E6FA'), hex('#D8BFD8'), hex('#DDA0DD'),
      hex('#EE82EE'), hex('#DA70D6'), hex('#FF00FF'),
      hex('#BA55D3'), hex('#9370DB'), hex('#8A2BE2'),
      hex('#9400D3'), hex('#9932CC'), hex('#8B008B'),
      hex('#CCC8E8'), hex('#B088E8'), hex('#AA44EE'), hex('#7700BB'),
    ],
  },
  {
    name: 'Earth',
    colors: [
      hex('#8B7355'), hex('#A0826D'), hex('#C2B280'),
      hex('#DEB887'), hex('#D2B48C'), hex('#F5DEB3'),
      hex('#8B4513'), hex('#A0522D'), hex('#BC8F8F'),
      hex('#CD853F'), hex('#D2691E'), hex('#DAA520'),
      hex('#9A8066'), hex('#CCB090'), hex('#B86F30'), hex('#E0C080'),
    ],
  },
  {
    name: 'Tropical',
    colors: [
      hex('#00CED1'), hex('#20B2AA'), hex('#48D1CC'),
      hex('#40E0D0'), hex('#00FA9A'), hex('#00FF7F'),
      hex('#FFD700'), hex('#FFA500'), hex('#FF8C00'),
      hex('#FF69B4'), hex('#FF1493'), hex('#C71585'),
      hex('#00E4E8'), hex('#22DD88'), hex('#FFCC22'), hex('#FF3388'),
    ],
  },
  {
    name: 'Rainbow',
    colors: [
      hex('#FF0000'), hex('#FF7F00'), hex('#FFFF00'),
      hex('#00FF00'), hex('#0000FF'), hex('#4B0082'),
      hex('#9400D3'), hex('#FF00FF'), hex('#FF007F'),
      hex('#FF00BF'), hex('#7F00FF'), hex('#00FFFF'),
      hex('#FF4400'), hex('#AAFF00'), hex('#0088FF'), hex('#CC00FF'),
    ],
  },
  {
    name: 'Mono Chrome',
    colors: [
      hex('#000000'), hex('#1A1A1A'), hex('#333333'),
      hex('#4D4D4D'), hex('#666666'), hex('#808080'),
      hex('#999999'), hex('#B3B3B3'), hex('#CCCCCC'),
      hex('#E6E6E6'), hex('#F2F2F2'), hex('#FFFFFF'),
    ],
  },
  {
    name: 'Blood Moon',
    colors: [
      hex('#8B0000'), hex('#A00000'), hex('#B50000'),
      hex('#CA0000'), hex('#E00000'), hex('#FF0000'),
      hex('#330000'), hex('#4D0000'), hex('#660000'),
      hex('#800000'), hex('#990000'), hex('#B30000'),
      hex('#700000'), hex('#DD0000'), hex('#550000'), hex('#AA0000'),
    ],
  },
  {
    name: 'Aurora',
    colors: [
      hex('#00FFC6'), hex('#00FFE7'), hex('#00FFFF'),
      hex('#00E4FF'), hex('#00C5FF'), hex('#00A6FF'),
      hex('#4D88FF'), hex('#8B5CF6'), hex('#A855F7'),
      hex('#C084FC'), hex('#D8B4FE'), hex('#E9D5FF'),
      hex('#00FFB8'), hex('#00D4FF'), hex('#6A77FF'), hex('#B877F9'),
    ],
  },
  
  // NEW PRESETS - Artistic & Mystical
  {
    name: 'Hilma af Klint',
    colors: [
      hex('#FFD700'), hex('#FDB931'), hex('#FFA500'), // Golden yellows
      hex('#FF69B4'), hex('#FF1493'), hex('#FF85C1'), // Mystical pinks
      hex('#4169E1'), hex('#6495ED'), hex('#87CEEB'), // Spiritual blues
      hex('#9370DB'), hex('#8A2BE2'), hex('#9932CC'), // Transcendent purples
      hex('#FFCC00'), hex('#FF4488'), hex('#5588EE'), hex('#AA55DD'),
    ],
  },
  {
    name: 'Cosmic Dust',
    colors: [
      hex('#1A1A2E'), hex('#16213E'), hex('#0F3460'),
      hex('#533483'), hex('#9D4EDD'), hex('#C77DFF'),
      hex('#E0AAFF'), hex('#F72585'), hex('#B5179E'),
      hex('#7209B7'), hex('#560BAD'), hex('#3C096C'),
      hex('#202038'), hex('#6644AA'), hex('#DD88FF'), hex('#EE3399'),
    ],
  },
  {
    name: 'Bioluminescence',
    colors: [
      hex('#00FF41'), hex('#00FF88'), hex('#00FFCC'),
      hex('#00FFFF'), hex('#00CCFF'), hex('#0088FF'),
      hex('#0044FF'), hex('#4400FF'), hex('#8800FF'),
      hex('#00FF00'), hex('#88FF00'), hex('#FFFF00'),
      hex('#00FF66'), hex('#00AAFF'), hex('#6600FF'), hex('#AAFF00'),
    ],
  },
  {
    name: 'Steampunk',
    colors: [
      hex('#8B4513'), hex('#A0522D'), hex('#CD853F'),
      hex('#D2691E'), hex('#B8860B'), hex('#DAA520'),
      hex('#696969'), hex('#708090'), hex('#778899'),
      hex('#2F4F4F'), hex('#556B2F'), hex('#8B7355'),
      hex('#996633'), hex('#CC9944'), hex('#8899AA'), hex('#445544'),
    ],
  },
  {
    name: 'Prismatic',
    colors: [
      hex('#FF0000'), hex('#FF3300'), hex('#FF6600'),
      hex('#FF9900'), hex('#FFCC00'), hex('#FFFF00'),
      hex('#CCFF00'), hex('#99FF00'), hex('#66FF00'),
      hex('#33FF00'), hex('#00FF00'), hex('#00FF33'),
      hex('#FF1100'), hex('#FF7711'), hex('#AAFF00'), hex('#11FF11'),
    ],
  },
  {
    name: 'Void',
    colors: [
      hex('#000000'), hex('#0D0D0D'), hex('#1A1A1A'),
      hex('#2A0A2E'), hex('#3F0F4F'), hex('#5A145F'),
      hex('#7A1A7F'), hex('#8B008B'), hex('#9400D3'),
      hex('#4B0082'), hex('#2E0854'), hex('#1A0033'),
      hex('#111111'), hex('#440E55'), hex('#6A1170'), hex('#220044'),
    ],
  },
  {
    name: 'Sakura Night',
    colors: [
      hex('#FFB7D5'), hex('#FFA6C9'), hex('#FF95BE'),
      hex('#2A1A3D'), hex('#3E2856'), hex('#52366F'),
      hex('#1C1035'), hex('#2D1B4E'), hex('#3E2667'),
      hex('#FFD6E8'), hex('#FFC2DC'), hex('#FFAED0'),
      hex('#FFCCDD'), hex('#342047'), hex('#462C60'), hex('#FFB8CC'),
    ],
  },
  {
    name: 'Ancient Gold',
    colors: [
      hex('#FFD700'), hex('#FFC700'), hex('#FFB700'),
      hex('#FFA700'), hex('#FF9700'), hex('#FF8700'),
      hex('#8B7355'), hex('#A0826D'), hex('#B8956A'),
      hex('#D4AF37'), hex('#E6BE5A'), hex('#F8CD7D'),
      hex('#FFEE00'), hex('#FFAA00'), hex('#9A8066'), hex('#CCAA44'),
    ],
  },
  {
    name: 'Nebula',
    colors: [
      hex('#FF006E'), hex('#FB5607'), hex('#FFBE0B'),
      hex('#8338EC'), hex('#3A86FF'), hex('#06FFA5'),
      hex('#FF1654'), hex('#FF477E'), hex('#FF87AB'),
      hex('#B5E48C'), hex('#76C893'), hex('#52B69A'),
      hex('#FF3388'), hex('#9944FF'), hex('#4499FF'), hex('#88DD88'),
    ],
  },
  {
    name: 'Vaporwave',
    colors: [
      hex('#FF71CE'), hex('#01CDFE'), hex('#05FFA1'),
      hex('#B967FF'), hex('#FFFB96'), hex('#FF6AD5'),
      hex('#C774E8'), hex('#94D0FF'), hex('#8795E8'),
      hex('#FF10F0'), hex('#00D9FF'), hex('#00FFC8'),
      hex('#FF88DD'), hex('#22DDFF'), hex('#AA77FF'), hex('#FFEE88'),
    ],
  },
  
  {
    name: 'Random (Color Theory)',
    colors: [], // Will be generated dynamically based on seed
  },
];

// Cache for randomly generated palettes (key: seed)
const randomPaletteCache = new Map<number, PaletteColors>();
let currentRandomSeed = Date.now();

/**
 * Set seed for random palette generation
 */
export const setRandomPaletteSeed = (seed: number): void => {
  currentRandomSeed = seed;
  // Clear cache when seed changes
  randomPaletteCache.clear();
  console.log(`🎨 Random palette seed set to: ${seed}`);
  
  // Notify other modules that palette changed
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('palette-changed'));
  }
};

/**
 * Get or generate random palette for current seed
 * Generates at least 16 distinct colors for proper type distinction
 */
const getRandomPalette = (typesCount: number): PaletteColors => {
  // Always generate at least 16 colors for proper distinction
  const targetCount = Math.max(typesCount, 16);
  
  if (!randomPaletteCache.has(currentRandomSeed)) {
    const colors = generateTheoryBasedPalette(currentRandomSeed, targetCount);
    randomPaletteCache.set(currentRandomSeed, colors);
  }
  return randomPaletteCache.get(currentRandomSeed)!;
};

/**
 * Get RGB color for a particle type from a palette
 * All palettes support 16+ distinct colors for 12+ particle types
 */
export const getPaletteRgb = (
  paletteIndex: number,
  typeIndex: number,
  typesCount: number = 16
): [number, number, number] => {
  const paletteIdx = paletteIndex % PALETTES.length;
  const palette = PALETTES[paletteIdx];
  
  // Special handling for "Random" palette (last one)
  if (paletteIdx === PALETTES.length - 1) {
    const randomColors = getRandomPalette(typesCount);
    return randomColors[typeIndex % randomColors.length];
  }
  
  const color = palette.colors[typeIndex % palette.colors.length];
  return color;
};

/**
 * Get CSS color string for a particle type (for Canvas 2D renderer)
 * Uses the Classic palette by default
 */
export const getTypeColor = (typeIndex: number, paletteIndex: number = 0, typesCount: number = 16): string => {
  const [r, g, b] = getPaletteRgb(paletteIndex, typeIndex, typesCount);
  return `rgb(${Math.floor(r * 255)}, ${Math.floor(g * 255)}, ${Math.floor(b * 255)})`;
};

/**
 * Field layer colors for heatmap overlay
 */
export const FIELD_COLORS = {
  tension: '#FF4444',
  cohesion: '#4444FF',
  scarcity: '#FFAA00',
  novelty: '#AA00FF',
  mythic: '#00FFAA',
};
