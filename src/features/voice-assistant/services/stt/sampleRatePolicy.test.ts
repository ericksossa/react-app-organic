import { evaluateSampleRatePolicy } from './sampleRatePolicy';

describe('evaluateSampleRatePolicy', () => {
  it('keeps Rhino enabled when sample rates match', () => {
    const result = evaluateSampleRatePolicy({
      captureSampleRate: 16000,
      cheetahSampleRate: 16000,
      rhinoSampleRate: 16000
    });

    expect(result.rhinoDisabled).toBe(false);
    expect(result.captureVsCheetahMismatch).toBe(false);
    expect(result.rhinoVsCheetahMismatch).toBe(false);
    expect(result.rhinoVsCaptureMismatch).toBe(false);
  });

  it('disables Rhino on mismatch and reports reason', () => {
    const result = evaluateSampleRatePolicy({
      captureSampleRate: 16000,
      cheetahSampleRate: 16000,
      rhinoSampleRate: 8000
    });

    expect(result.rhinoDisabled).toBe(true);
    expect(result.reason).toBe('rhino_sr_mismatch_disabled');
    expect(result.rhinoVsCheetahMismatch).toBe(true);
    expect(result.rhinoVsCaptureMismatch).toBe(true);
  });
});
