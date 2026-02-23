import { Easing } from 'react-native-reanimated';

function bezierOrFallback(a: number, b: number, c: number, d: number) {
  const maybeBezier = (Easing as unknown as { bezier?: (...args: number[]) => any }).bezier;
  if (typeof maybeBezier === 'function') {
    return maybeBezier(a, b, c, d);
  }

  const maybeOut = (Easing as unknown as { out?: (fn: any) => any }).out;
  const maybeCubic = (Easing as unknown as { cubic?: any }).cubic;
  if (typeof maybeOut === 'function' && maybeCubic) {
    return maybeOut(maybeCubic);
  }

  return undefined;
}

export const motionDurations = {
  micro: 140,
  short: 240,
  base: 420,
  narrative: 720
} as const;

export const motionEasings = {
  organicCss: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
  enterCss: 'cubic-bezier(0, 0, 0.3, 1)',
  exitCss: 'cubic-bezier(0.2, 0, 1, 0.9)',
  organic: bezierOrFallback(0.22, 0.61, 0.36, 1),
  enter: bezierOrFallback(0, 0, 0.3, 1),
  exit: bezierOrFallback(0.2, 0, 1, 0.9)
} as const;

export const motionSpring = {
  stiffness: 180,
  damping: 20,
  mass: 0.8
} as const;

export function motionDuration(
  key: keyof typeof motionDurations,
  reducedMotion?: boolean
): number {
  if (!reducedMotion) return motionDurations[key];
  if (key === 'narrative') return motionDurations.short;
  if (key === 'base') return motionDurations.short;
  return motionDurations.micro;
}
