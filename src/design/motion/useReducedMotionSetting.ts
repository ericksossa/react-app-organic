import React from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReducedMotionSetting(): boolean {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    let active = true;

    const sync = async () => {
      try {
        const next = await AccessibilityInfo.isReduceMotionEnabled?.();
        if (active && typeof next === 'boolean') setReduced(next);
      } catch {
        if (active) setReduced(false);
      }
    };

    void sync();

    const subscription = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (next) => {
      setReduced(Boolean(next));
    });

    return () => {
      active = false;
      subscription?.remove?.();
    };
  }, []);

  return reduced;
}
