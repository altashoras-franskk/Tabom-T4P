// Time management with fixed timestep accumulator
export interface TimeState {
  running: boolean;
  speed: number; // 1, 2, 3, 5
  
  // Fixed timestep accumulator
  accumulator: number;
  tick: number;
  elapsed: number;
  
  // Frame timing
  lastFrameTime: number;
  frameCount: number;
  fps: number;
  
  // Subsystem accumulators
  fieldAccumulator: number;
  reconfigAccumulator: number;
  
  // Performance
  maxStepsPerFrame: number; // Dynamic cap
}

export const createTimeState = (): TimeState => ({
  running: true,
  speed: 1,
  
  accumulator: 0,
  tick: 0,
  elapsed: 0,
  
  lastFrameTime: 0,
  frameCount: 0,
  fps: 60,
  
  fieldAccumulator: 0,
  reconfigAccumulator: 0,
  
  maxStepsPerFrame: 10, // Allow up to 10x speed
});

// Fixed timestep - more stable than 1/60
const BASE_STEP = 1 / 120; // 0.008333s
const MAX_FRAME_DT = 0.1; // Prevent spiral of death

export { BASE_STEP };

// Field update rate (20Hz)
const FIELD_DT = 1 / 20;

export const updateTime = (
  state: TimeState,
  currentTime: number,
  reconfigInterval: number
): { 
  stepCount: number; 
  fieldTick: boolean; 
  reconfigTick: boolean;
} => {
  const rawDelta = state.lastFrameTime === 0 ? BASE_STEP : (currentTime - state.lastFrameTime) / 1000;
  const delta = Math.min(rawDelta, MAX_FRAME_DT);
  
  state.lastFrameTime = currentTime;
  state.frameCount++;

  if (state.frameCount % 30 === 0) {
    state.fps = Math.round(1 / delta);
  }

  if (!state.running) {
    return { stepCount: 0, fieldTick: false, reconfigTick: false };
  }

  // Accumulate real time scaled by speed
  state.accumulator += delta * state.speed;

  // Consume fixed steps with dynamic cap
  let stepCount = 0;
  while (state.accumulator >= BASE_STEP && stepCount < state.maxStepsPerFrame) {
    stepCount++;
    state.accumulator -= BASE_STEP;
    state.tick++;
    state.elapsed += BASE_STEP;
  }
  
  // If we hit the cap, discard excess to prevent spiral
  if (stepCount >= state.maxStepsPerFrame) {
    state.accumulator = 0;
  }

  // Field accumulator (scaled by speed)
  state.fieldAccumulator += delta * state.speed;
  const fieldTick = state.fieldAccumulator >= FIELD_DT;
  if (fieldTick) {
    state.fieldAccumulator -= FIELD_DT;
  }

  // Reconfig accumulator (scaled by speed)
  state.reconfigAccumulator += delta * state.speed;
  const reconfigTick = state.reconfigAccumulator >= reconfigInterval;
  if (reconfigTick) {
    state.reconfigAccumulator = 0;
  }

  return { stepCount, fieldTick, reconfigTick };
};
