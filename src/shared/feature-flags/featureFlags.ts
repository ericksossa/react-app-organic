import { env } from '../../config/env';

export type FeatureFlagKey = keyof typeof env.featureFlags;

export function isFeatureEnabled(flag: FeatureFlagKey): boolean {
  return env.featureFlags[flag];
}

export function getFeatureFlags() {
  return env.featureFlags;
}
