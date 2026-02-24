// Color Theory Based Palette Generator
// Generates beautiful, harmonious color palettes using color theory principles

export type ColorScheme = 
  | 'complementary'    // 2 opposite colors + variations
  | 'analogous'        // 3-5 adjacent colors
  | 'triadic'          // 3 colors evenly spaced
  | 'tetradic'         // 4 colors in square
  | 'split-complementary' // 1 base + 2 adjacent to complement
  | 'monochromatic'   // 1 hue with varying saturation/lightness
  | 'rainbow'          // Full spectrum with high contrast
  | 'double-complementary'; // 2 pairs of complementary colors

interface HSL {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

/**
 * Seeded random number generator
 */
class SeededRandom {
  private seed: number;
  
  constructor(seed: number) {
    this.seed = seed;
  }
  
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
  
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }
}

/**
 * Convert HSL to RGB (0-1 range)
 */
const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  h = h % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  
  let r = 0, g = 0, b = 0;
  
  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }
  
  return [r + m, g + m, b + m];
};

/**
 * Generate a complementary color scheme (16 colors)
 */
const generateComplementary = (rng: SeededRandom): HSL[] => {
  const baseHue = rng.range(0, 360);
  const baseSat = rng.range(70, 95);
  const baseLit = rng.range(50, 65);
  
  const colors: HSL[] = [];
  
  // Base color variations (8 colors)
  const lightnesses1 = [30, 40, 50, 60, 70, 45, 55, 65];
  const satAdjust1 = [0, -10, 5, -5, -15, 10, -20, 15];
  
  for (let i = 0; i < 8; i++) {
    colors.push({ 
      h: baseHue + rng.range(-3, 3), 
      s: Math.max(50, Math.min(100, baseSat + satAdjust1[i])), 
      l: lightnesses1[i] 
    });
  }
  
  // Complement variations (8 colors)
  const compHue = (baseHue + 180) % 360;
  const lightnesses2 = [30, 40, 50, 60, 70, 45, 55, 65];
  const satAdjust2 = [0, -10, 5, -5, -15, 10, -20, 15];
  
  for (let i = 0; i < 8; i++) {
    colors.push({ 
      h: compHue + rng.range(-3, 3), 
      s: Math.max(50, Math.min(100, baseSat + satAdjust2[i])), 
      l: lightnesses2[i] 
    });
  }
  
  return colors;
};

/**
 * Generate an analogous color scheme (16 colors)
 */
const generateAnalogous = (rng: SeededRandom): HSL[] => {
  const baseHue = rng.range(0, 360);
  const baseSat = rng.range(70, 90);
  const baseLit = rng.range(50, 65);
  const spread = rng.range(20, 35);
  
  const colors: HSL[] = [];
  
  // 8 different hues across the analogous range
  const hueSteps = [-3, -2, -1, 0, 1, 2, 3, 4];
  
  for (let step of hueSteps) {
    const hue = (baseHue + step * spread) % 360;
    
    // Two variations per hue (light and normal)
    colors.push({
      h: hue,
      s: Math.max(60, Math.min(100, baseSat + rng.range(-10, 10))),
      l: Math.max(40, Math.min(65, baseLit + rng.range(-5, 5)))
    });
    
    colors.push({
      h: hue,
      s: Math.max(50, Math.min(100, baseSat - 15)),
      l: Math.max(55, Math.min(75, baseLit + 15))
    });
  }
  
  return colors;
};

/**
 * Generate a triadic color scheme (16 colors)
 */
const generateTriadic = (rng: SeededRandom): HSL[] => {
  const baseHue = rng.range(0, 360);
  const baseSat = rng.range(70, 95);
  const baseLit = rng.range(50, 65);
  
  const colors: HSL[] = [];
  
  // 3 colors at 120° intervals, each with 5-6 variations
  const variations = [
    { s: 0, l: -20 },
    { s: -10, l: -10 },
    { s: 0, l: 0 },
    { s: -5, l: 10 },
    { s: -15, l: 20 },
  ];
  
  for (let i = 0; i < 3; i++) {
    const hue = (baseHue + i * 120) % 360;
    
    for (let v of variations) {
      colors.push({
        h: hue + rng.range(-3, 3),
        s: Math.max(50, Math.min(100, baseSat + v.s)),
        l: Math.max(30, Math.min(75, baseLit + v.l))
      });
    }
  }
  
  // Add one extra variation to reach 16
  colors.push({
    h: (baseHue + 60) % 360,
    s: baseSat - 20,
    l: 55
  });
  
  return colors;
};

/**
 * Generate a tetradic (square) color scheme (16 colors)
 */
const generateTetradic = (rng: SeededRandom): HSL[] => {
  const baseHue = rng.range(0, 360);
  const baseSat = rng.range(70, 90);
  const baseLit = rng.range(50, 62);
  
  const colors: HSL[] = [];
  
  // 4 colors at 90° intervals, each with 4 variations
  const variations = [
    { s: 0, l: 0 },
    { s: -10, l: -15 },
    { s: -5, l: 12 },
    { s: -20, l: 20 },
  ];
  
  for (let i = 0; i < 4; i++) {
    const hue = (baseHue + i * 90) % 360;
    
    for (let v of variations) {
      colors.push({
        h: hue + rng.range(-2, 2),
        s: Math.max(50, Math.min(100, baseSat + v.s)),
        l: Math.max(30, Math.min(75, baseLit + v.l))
      });
    }
  }
  
  return colors;
};

/**
 * Generate a split-complementary scheme (16 colors)
 */
const generateSplitComplementary = (rng: SeededRandom): HSL[] => {
  const baseHue = rng.range(0, 360);
  const baseSat = rng.range(75, 95);
  const baseLit = rng.range(50, 62);
  const split = rng.range(25, 35);
  
  const colors: HSL[] = [];
  
  const compHue = (baseHue + 180) % 360;
  
  // Base hue (6 variations)
  const lightnesses1 = [35, 45, 55, 65, 50, 60];
  for (let i = 0; i < 6; i++) {
    colors.push({ 
      h: baseHue + rng.range(-3, 3), 
      s: Math.max(60, Math.min(100, baseSat - (i * 5))), 
      l: lightnesses1[i] 
    });
  }
  
  // Split complement 1 (5 variations)
  const hue1 = (compHue - split + 360) % 360;
  const lightnesses2 = [35, 45, 55, 65, 50];
  for (let i = 0; i < 5; i++) {
    colors.push({ 
      h: hue1 + rng.range(-3, 3), 
      s: Math.max(60, Math.min(100, baseSat - (i * 5))), 
      l: lightnesses2[i] 
    });
  }
  
  // Split complement 2 (5 variations)
  const hue2 = (compHue + split) % 360;
  const lightnesses3 = [35, 45, 55, 65, 50];
  for (let i = 0; i < 5; i++) {
    colors.push({ 
      h: hue2 + rng.range(-3, 3), 
      s: Math.max(60, Math.min(100, baseSat - (i * 5))), 
      l: lightnesses3[i] 
    });
  }
  
  return colors;
};

/**
 * Generate a monochromatic scheme (16 colors)
 */
const generateMonochromatic = (rng: SeededRandom): HSL[] => {
  const baseHue = rng.range(0, 360);
  const baseSat = rng.range(70, 95);
  
  const colors: HSL[] = [];
  
  // 16 variations of same hue with different saturation and lightness
  const variations = [
    { s: 0, l: 25 },
    { s: -10, l: 35 },
    { s: 5, l: 40 },
    { s: -5, l: 45 },
    { s: 0, l: 50 },
    { s: -15, l: 55 },
    { s: 10, l: 60 },
    { s: -20, l: 65 },
    { s: 0, l: 70 },
    { s: -5, l: 75 },
    { s: 5, l: 42 },
    { s: -10, l: 52 },
    { s: 15, l: 58 },
    { s: -25, l: 68 },
    { s: 0, l: 38 },
    { s: -15, l: 48 },
  ];
  
  for (let v of variations) {
    colors.push({
      h: baseHue + rng.range(-5, 5), // slight hue variation
      s: Math.max(40, Math.min(100, baseSat + v.s)),
      l: v.l
    });
  }
  
  return colors;
};

/**
 * Generate a rainbow/spectrum scheme (16 colors)
 * Maximum contrast and distinction for 12+ particle types
 */
const generateRainbow = (rng: SeededRandom): HSL[] => {
  const baseHue = rng.range(0, 360);
  const baseSat = rng.range(75, 95);
  const baseLit = rng.range(50, 65);
  
  const colors: HSL[] = [];
  
  // 16 evenly spaced hues around the color wheel (360/16 = 22.5°)
  const hueStep = 360 / 16;
  
  for (let i = 0; i < 16; i++) {
    const hue = (baseHue + i * hueStep) % 360;
    const satVar = rng.range(-10, 10);
    const litVar = rng.range(-8, 8);
    
    colors.push({
      h: hue,
      s: Math.max(65, Math.min(100, baseSat + satVar)),
      l: Math.max(45, Math.min(70, baseLit + litVar))
    });
  }
  
  return colors;
};

/**
 * Generate a double-complementary scheme (16 colors)
 * Two pairs of complementary colors for maximum distinction
 */
const generateDoubleComplementary = (rng: SeededRandom): HSL[] => {
  const baseHue1 = rng.range(0, 360);
  const baseHue2 = (baseHue1 + 90) % 360;
  const baseSat = rng.range(75, 95);
  const baseLit = rng.range(50, 65);
  
  const colors: HSL[] = [];
  
  // First complementary pair (8 colors)
  const lightnesses = [35, 45, 55, 65, 50, 60, 40, 70];
  const satAdjust = [0, -10, 5, -5, -15, 10, -20, 15];
  
  for (let i = 0; i < 4; i++) {
    colors.push({ 
      h: baseHue1 + rng.range(-3, 3), 
      s: Math.max(60, Math.min(100, baseSat + satAdjust[i])), 
      l: lightnesses[i] 
    });
  }
  
  for (let i = 0; i < 4; i++) {
    colors.push({ 
      h: (baseHue1 + 180) % 360 + rng.range(-3, 3), 
      s: Math.max(60, Math.min(100, baseSat + satAdjust[i + 4])), 
      l: lightnesses[i + 4] 
    });
  }
  
  // Second complementary pair (8 colors)
  for (let i = 0; i < 4; i++) {
    colors.push({ 
      h: baseHue2 + rng.range(-3, 3), 
      s: Math.max(60, Math.min(100, baseSat + satAdjust[i])), 
      l: lightnesses[i] 
    });
  }
  
  for (let i = 0; i < 4; i++) {
    colors.push({ 
      h: (baseHue2 + 180) % 360 + rng.range(-3, 3), 
      s: Math.max(60, Math.min(100, baseSat + satAdjust[i + 4])), 
      l: lightnesses[i + 4] 
    });
  }
  
  return colors;
};

/**
 * Generate a beautiful random palette based on color theory
 * @param seed - Random seed for reproducible palettes
 * @param particleCount - Number of particle types (will generate at least 16 colors)
 * @returns Array of RGB colors (0-1 range)
 */
export const generateTheoryBasedPalette = (
  seed: number,
  particleCount: number = 16
): Array<[number, number, number]> => {
  const rng = new SeededRandom(seed);
  
  // Choose a random color scheme based on seed
  const schemes: ColorScheme[] = [
    'complementary',
    'analogous',
    'triadic',
    'tetradic',
    'split-complementary',
    'monochromatic',
    'rainbow',
    'double-complementary'
  ];
  
  const schemeIndex = rng.int(0, schemes.length - 1);
  const scheme = schemes[schemeIndex];
  
  // Generate base colors (always at least 16)
  let hslColors: HSL[] = [];
  
  switch (scheme) {
    case 'complementary':
      hslColors = generateComplementary(rng);
      break;
    case 'analogous':
      hslColors = generateAnalogous(rng);
      break;
    case 'triadic':
      hslColors = generateTriadic(rng);
      break;
    case 'tetradic':
      hslColors = generateTetradic(rng);
      break;
    case 'split-complementary':
      hslColors = generateSplitComplementary(rng);
      break;
    case 'monochromatic':
      hslColors = generateMonochromatic(rng);
      break;
    case 'rainbow':
      hslColors = generateRainbow(rng);
      break;
    case 'double-complementary':
      hslColors = generateDoubleComplementary(rng);
      break;
  }
  
  // Ensure we have enough colors for the particle count
  const targetCount = Math.max(particleCount, 16);
  while (hslColors.length < targetCount) {
    // Duplicate and slightly modify existing colors
    const baseIndex = hslColors.length % (hslColors.length > 0 ? hslColors.length : 1);
    const base = hslColors[baseIndex] || { h: 0, s: 70, l: 50 };
    hslColors.push({
      h: (base.h + rng.range(10, 20)) % 360,
      s: Math.max(50, Math.min(100, base.s + rng.range(-10, 10))),
      l: Math.max(30, Math.min(75, base.l + rng.range(-10, 10)))
    });
  }
  
  // Convert to RGB
  const rgbColors: Array<[number, number, number]> = [];
  
  for (let i = 0; i < targetCount; i++) {
    const hsl = hslColors[i % hslColors.length];
    rgbColors.push(hslToRgb(hsl.h, hsl.s, hsl.l));
  }
  
  console.log(`🎨 Generated ${scheme} palette with ${rgbColors.length} colors (seed ${seed})`);
  
  return rgbColors;
};

/**
 * Get the name of the color scheme for a given seed
 */
export const getColorSchemeName = (seed: number): string => {
  const rng = new SeededRandom(seed);
  const schemes: ColorScheme[] = [
    'complementary',
    'analogous',
    'triadic',
    'tetradic',
    'split-complementary',
    'monochromatic',
    'rainbow',
    'double-complementary'
  ];
  
  const schemeIndex = rng.int(0, schemes.length - 1);
  const scheme = schemes[schemeIndex];
  
  const names: Record<ColorScheme, string> = {
    'complementary': 'Complementar',
    'analogous': 'Análoga',
    'triadic': 'Triádica',
    'tetradic': 'Tetrádica',
    'split-complementary': 'Complementar Dividida',
    'monochromatic': 'Monocromática',
    'rainbow': 'Arco-Íris (Máximo Contraste)',
    'double-complementary': 'Dupla Complementar'
  };
  
  return names[scheme];
};
