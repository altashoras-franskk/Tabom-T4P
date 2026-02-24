// Performance and quality configuration
export type SimQuality = 'FAST' | 'HIGH' | 'ULTRA';
export type RenderQuality = 'FAST' | 'HIGH' | 'ULTRA';

export interface PerformanceConfig {
  simQuality: SimQuality;
  renderQuality: RenderQuality;
  maxStepsPerFrame: number;
  fieldSampleRate: number; // 1 = every step, 2 = every 2 steps, etc
  resolutionScale: number; // 0.5 to 1.0
}

export const getMaxStepsForQuality = (quality: SimQuality): number => {
  switch (quality) {
    case 'FAST': return 10; // Allow up to 10x speed
    case 'HIGH': return 12; // Allow up to 10x speed + margin
    case 'ULTRA': return 15; // Allow up to 10x speed + extra margin
  }
};

export const getFieldSampleRateForQuality = (quality: SimQuality): number => {
  switch (quality) {
    case 'FAST': return 2; // Sample field every 2 steps
    case 'HIGH': return 1; // Every step
    case 'ULTRA': return 1;
  }
};

export const createPerformanceConfig = (): PerformanceConfig => ({
  simQuality: 'FAST',
  renderQuality: 'FAST',
  maxStepsPerFrame: 10, // Allow up to 10x speed by default
  fieldSampleRate: 2,
  resolutionScale: 0.75, // Reduced from 0.85 for better FPS
});

export const applyQualityPreset = (config: PerformanceConfig, quality: SimQuality): void => {
  config.simQuality = quality;
  config.maxStepsPerFrame = getMaxStepsForQuality(quality);
  config.fieldSampleRate = getFieldSampleRateForQuality(quality);
  
  // Also adjust render quality to match
  config.renderQuality = quality;
  
  switch (quality) {
    case 'FAST':
      config.resolutionScale = 0.75;
      break;
    case 'HIGH':
      config.resolutionScale = 1.0;
      break;
    case 'ULTRA':
      config.resolutionScale = 1.0;
      break;
  }
};
