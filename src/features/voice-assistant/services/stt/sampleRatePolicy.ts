export type SampleRatePolicyInput = {
  captureSampleRate: number;
  cheetahSampleRate?: number;
  rhinoSampleRate?: number;
};

export type SampleRatePolicyResult = {
  rhinoDisabled: boolean;
  captureVsCheetahMismatch: boolean;
  rhinoVsCheetahMismatch: boolean;
  rhinoVsCaptureMismatch: boolean;
  reason?: 'rhino_sr_mismatch_disabled';
};

export function evaluateSampleRatePolicy(input: SampleRatePolicyInput): SampleRatePolicyResult {
  const capture = Number(input.captureSampleRate || 0);
  const cheetah = Number(input.cheetahSampleRate || 0);
  const rhino = Number(input.rhinoSampleRate || 0);

  const captureVsCheetahMismatch = Boolean(capture && cheetah && capture !== cheetah);
  const rhinoVsCheetahMismatch = Boolean(rhino && cheetah && rhino !== cheetah);
  const rhinoVsCaptureMismatch = Boolean(rhino && capture && rhino !== capture);

  const shouldDisableRhino = rhinoVsCheetahMismatch || rhinoVsCaptureMismatch;

  return {
    rhinoDisabled: shouldDisableRhino,
    captureVsCheetahMismatch,
    rhinoVsCheetahMismatch,
    rhinoVsCaptureMismatch,
    reason: shouldDisableRhino ? 'rhino_sr_mismatch_disabled' : undefined
  };
}
