import React from 'react';
import { FeatureFlagKey, isFeatureEnabled } from './featureFlags';

type FeatureGateProps = {
  flag: FeatureFlagKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export function FeatureGate({ flag, children, fallback = null }: FeatureGateProps) {
  return isFeatureEnabled(flag) ? <>{children}</> : <>{fallback}</>;
}
