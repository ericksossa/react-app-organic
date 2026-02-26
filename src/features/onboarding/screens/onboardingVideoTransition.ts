export const VIDEO_TRANSITION_STEPS = 3;
export const VIDEO_TRANSITION_MIN_STEP_SECONDS = 2.6;
export const VIDEO_TRANSITION_MAX_STEP_SECONDS = 3.2;

export function getVideoTransitionStepSeconds(duration: number): number {
  if (!Number.isFinite(duration) || duration <= 0) {
    return VIDEO_TRANSITION_MIN_STEP_SECONDS;
  }

  return Math.min(
    VIDEO_TRANSITION_MAX_STEP_SECONDS,
    Math.max(VIDEO_TRANSITION_MIN_STEP_SECONDS, duration / VIDEO_TRANSITION_STEPS)
  );
}

