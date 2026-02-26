import {
  getVideoTransitionStepSeconds,
  VIDEO_TRANSITION_MAX_STEP_SECONDS,
  VIDEO_TRANSITION_MIN_STEP_SECONDS
} from './onboardingVideoTransition';

describe('onboardingVideoTransition', () => {
  it('uses the minimum step for short videos', () => {
    expect(getVideoTransitionStepSeconds(4.5)).toBe(VIDEO_TRANSITION_MIN_STEP_SECONDS);
  });

  it('caps the step for long fallback videos', () => {
    expect(getVideoTransitionStepSeconds(596)).toBe(VIDEO_TRANSITION_MAX_STEP_SECONDS);
  });

  it('keeps a computed mid-range step when duration is in expected range', () => {
    expect(getVideoTransitionStepSeconds(9)).toBe(3);
  });

  it('falls back to the minimum step for invalid durations', () => {
    expect(getVideoTransitionStepSeconds(0)).toBe(VIDEO_TRANSITION_MIN_STEP_SECONDS);
    expect(getVideoTransitionStepSeconds(Number.NaN)).toBe(VIDEO_TRANSITION_MIN_STEP_SECONDS);
  });
});

