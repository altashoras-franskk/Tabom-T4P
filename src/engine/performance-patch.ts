// Performance optimization patch
// This module contains the FPS monitoring logic

export const checkPerformanceAndAutoReduce = (
  fps: number,
  now: number,
  lastAutoReduceTime: number,
  particleCount: number,
  onReduce: (newCount: number, reduction: number) => void
): number => {
  // Wait at least 30 seconds between reductions to avoid cascade
  if ((now - lastAutoReduceTime) < 30000) return lastAutoReduceTime;

  // Only cut when truly unplayable (< 10 FPS) and there's something to cut
  if (fps < 10 && particleCount > 300) {
    const reduction = Math.floor(particleCount * 0.10); // gentle 10% trim
    const newCount = Math.max(300, particleCount - reduction);
    onReduce(newCount, reduction);
    return now;
  }

  // Mild nudge only for sustained very-low FPS with high counts
  if (fps < 14 && particleCount > 1200) {
    const reduction = Math.floor(particleCount * 0.05); // 5% only
    const newCount = Math.max(600, particleCount - reduction);
    onReduce(newCount, reduction);
    return now;
  }

  return lastAutoReduceTime;
};