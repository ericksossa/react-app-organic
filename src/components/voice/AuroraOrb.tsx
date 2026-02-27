import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  BlurMask,
  Canvas,
  Circle,
  Fill,
  Group,
  Paint,
  RadialGradient,
  RoundedRect,
  Skia,
  vec
} from '@shopify/react-native-skia';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

type AuroraOrbState = 'idle' | 'listening' | 'processing';

type AuroraOrbProps = {
  state: AuroraOrbState;
  size?: number;
  energy?: SharedValue<number>;
};

type VisualState = {
  time: number;
  voiceEnergy: number;
  distortAmount: number;
  listening: number;
  processing: number;
  jitter: number;
};

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

export const AuroraOrb = React.memo(function AuroraOrb({ state, size = 230, energy }: AuroraOrbProps) {
  const rafRef = React.useRef<number | null>(null);
  const lastTsRef = React.useRef(0);
  const lastEmitRef = React.useRef(0);

  const tRef = React.useRef(0);
  const speedRef = React.useRef(0.34);
  const listeningRef = React.useRef(0);
  const processingRef = React.useRef(0);
  const distortRef = React.useRef(0.2);
  const jitterRef = React.useRef(0);
  const simEnergyRef = React.useRef(0.08);

  const [v, setV] = React.useState<VisualState>({
    time: 0,
    voiceEnergy: 0.08,
    distortAmount: 0.2,
    listening: 0,
    processing: 0,
    jitter: 0
  });

  const [glowPassOpacity, setGlowPassOpacity] = React.useState(0.62);
  const [coreGlowOpacity, setCoreGlowOpacity] = React.useState(0.22);

  React.useEffect(() => {
    const isListening = state === 'listening';
    const isProcessing = state === 'processing';

    listeningRef.current = isListening ? 1 : 0;
    processingRef.current = isProcessing ? 1 : 0;

    // Slower, more organic baseline profile.
    speedRef.current = isProcessing ? 0.26 : isListening ? 0.44 : 0.34;
    distortRef.current = isListening ? 0.62 : isProcessing ? 0.16 : 0.28;
    jitterRef.current = isListening ? 1 : 0;
  }, [state]);

  React.useEffect(() => {
    const loop = (ts: number) => {
      const last = lastTsRef.current || ts;
      const dt = Math.min(0.05, (ts - last) / 1000);
      lastTsRef.current = ts;
      tRef.current += dt * speedRef.current;

      let e: number;
      if (energy) {
        e = clamp01(energy.value ?? 0);
      } else if (state === 'listening') {
        const tt = tRef.current;
        const env =
          0.16 +
          0.24 * (0.5 + 0.5 * Math.sin(tt * 3.4 + 0.4)) +
          0.14 * (0.5 + 0.5 * Math.sin(tt * 7.2 + 1.5));
        const flutter = 0.03 * (0.5 + 0.5 * Math.sin(tt * 12.0 + 2.1));
        e = clamp01(env + flutter);
      } else {
        e = Math.max(0.05, simEnergyRef.current * 0.95);
      }
      simEnergyRef.current = e;

      // 30fps throttled visual state updates for stable rendering on mobile.
      if (ts - lastEmitRef.current >= 33 || lastEmitRef.current === 0) {
        const tt = tRef.current;
        const l = listeningRef.current;
        const p = processingRef.current;
        const jitterOsc =
          (0.5 + 0.5 * Math.sin(tt * 2.6 + 0.4)) * (0.55 + 0.45 * Math.sin(tt * 4.2 + 1.2));

        setV({
          time: tt,
          voiceEnergy: e,
          distortAmount: distortRef.current,
          listening: l,
          processing: p,
          jitter: jitterOsc * jitterRef.current * (1 - p)
        });

        setGlowPassOpacity(Math.max(0.55, Math.min(0.85, 0.65 + e * 0.2)));
        setCoreGlowOpacity(Math.max(0.16, Math.min(0.34, 0.2 + e * 0.16)));
        lastEmitRef.current = ts;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTsRef.current = 0;
      lastEmitRef.current = 0;
    };
  }, [energy, state]);

  // Reanimated shell motion (kept intact conceptually).
  const breath = useSharedValue(0);
  const wobble = useSharedValue(0);
  const baseRotation = useSharedValue(0);
  const scaleAmp = useSharedValue(0.016);
  const wobbleAmp = useSharedValue(1.2);
  const veilOpacity = useSharedValue(0.06);
  const listeningShellMix = useSharedValue(0);

  React.useEffect(() => {
    baseRotation.value = withRepeat(withTiming(1, { duration: 22000, easing: Easing.linear }), -1, false);
  }, [baseRotation]);

  React.useEffect(() => {
    const isListening = state === 'listening';
    const isProcessing = state === 'processing';

    listeningShellMix.value = withTiming(isListening ? 1 : 0, { duration: 220 });
    scaleAmp.value = withTiming(isListening ? 0.04 : isProcessing ? 0.012 : 0.016, { duration: 280 });
    wobbleAmp.value = withTiming(isListening ? 2.6 : isProcessing ? 0.5 : 1.0, { duration: 280 });
    veilOpacity.value = withTiming(isListening ? 0.08 : isProcessing ? 0.04 : 0.06, { duration: 280 });

    cancelAnimation(breath);
    breath.value = withRepeat(
      withTiming(1, {
        duration: isListening ? 1200 : isProcessing ? 3000 : 3400,
        easing: Easing.inOut(Easing.quad)
      }),
      -1,
      true
    );

    cancelAnimation(wobble);
    wobble.value = withRepeat(
      withTiming(1, {
        duration: isListening ? 1800 : isProcessing ? 5200 : 4600,
        easing: Easing.inOut(Easing.quad)
      }),
      -1,
      true
    );
  }, [baseRotation, breath, listeningShellMix, scaleAmp, state, veilOpacity, wobble, wobbleAmp]);

  const shellStyle = useAnimatedStyle(() => {
    const breathingScale = 1 + breath.value * scaleAmp.value;
    const reactiveScale = 1 + listeningShellMix.value * 0.02;
    const totalScale = Math.min(1.1, breathingScale * reactiveScale);
    const wob = interpolate(wobble.value, [0, 1], [-wobbleAmp.value, wobbleAmp.value]);
    const rot = baseRotation.value * 360;

    return { transform: [{ scale: totalScale }, { rotate: `${rot + wob}deg` }] };
  });

  const veilStyle = useAnimatedStyle(() => ({ opacity: veilOpacity.value }));

  const center = React.useMemo(() => vec(size / 2, size / 2), [size]);
  const mainHighlightOrigin = React.useMemo(() => vec(size * 0.35, size * 0.24), [size]);
  const secondaryHighlightOrigin = React.useMemo(() => vec(size * 0.72, size * 0.74), [size]);
  const clipPath = React.useMemo(() => {
    const p = Skia.Path.Make();
    p.addCircle(size / 2, size / 2, size / 2);
    return p;
  }, [size]);

  // Expanded premium blob system (6 blobs, soft, organic, energy-reactive).
  const blobs = React.useMemo(() => {
    const tt = v.time;
    const e = clamp01(v.voiceEnergy);
    const l = v.listening;
    const p = v.processing;
    const wobbleMix = 1 + v.distortAmount * 0.16 + v.jitter * 0.08;

    const baseR = size * (0.21 + 0.06 * e);
    const drift = 0.05 + l * 0.03 - p * 0.015;

    return [
      {
        cx: size * (0.36 + drift * Math.sin(tt * 0.52)),
        cy: size * (0.42 + drift * Math.cos(tt * 0.44)),
        r: baseR * (1.08 + 0.10 * Math.sin(tt * 0.72)) * wobbleMix,
        colorA: 'rgba(0,240,255,0.82)',
        colorB: 'rgba(0,240,255,0.00)',
        opacity: 0.68 + e * 0.16,
        blur: size * 0.24
      },
      {
        cx: size * (0.58 + drift * Math.cos(tt * 0.47 + 0.5)),
        cy: size * (0.36 + drift * Math.sin(tt * 0.43 + 1.2)),
        r: baseR * (1.02 + 0.12 * Math.cos(tt * 0.6 + 0.7)) * wobbleMix,
        colorA: 'rgba(180,80,255,0.72)',
        colorB: 'rgba(180,80,255,0.00)',
        opacity: 0.58 + e * 0.12,
        blur: size * 0.27
      },
      {
        cx: size * (0.49 + drift * Math.sin(tt * 0.42 + 2.2)),
        cy: size * (0.62 + drift * Math.cos(tt * 0.46 + 1.7)),
        r: baseR * (0.96 + 0.12 * Math.sin(tt * 0.58 + 1.6)) * wobbleMix,
        colorA: 'rgba(255,120,220,0.60)',
        colorB: 'rgba(255,120,220,0.00)',
        opacity: 0.54 + e * 0.10,
        blur: size * 0.28
      },
      {
        cx: size * (0.67 + drift * Math.cos(tt * 0.36 + 1.6)),
        cy: size * (0.58 + drift * Math.sin(tt * 0.38 + 0.9)),
        r: baseR * (0.88 + 0.10 * Math.cos(tt * 0.54 + 0.3)) * wobbleMix,
        colorA: 'rgba(255,180,140,0.44)',
        colorB: 'rgba(255,180,140,0.00)',
        opacity: 0.42 + e * 0.08,
        blur: size * 0.25
      },
      {
        cx: size * (0.31 + drift * Math.cos(tt * 0.34 + 2.7)),
        cy: size * (0.60 + drift * Math.sin(tt * 0.33 + 2.1)),
        r: baseR * (0.82 + 0.14 * Math.sin(tt * 0.5 + 2.4)) * wobbleMix,
        colorA: 'rgba(0,240,255,0.76)',
        colorB: 'rgba(0,240,255,0.00)',
        opacity: 0.50 + e * 0.12,
        blur: size * 0.30
      },
      {
        cx: size * (0.54 + drift * Math.sin(tt * 0.3 + 3.1)),
        cy: size * (0.28 + drift * Math.cos(tt * 0.31 + 0.8)),
        r: baseR * (0.74 + 0.10 * Math.cos(tt * 0.46 + 1.9)) * wobbleMix,
        colorA: 'rgba(180,80,255,0.64)',
        colorB: 'rgba(180,80,255,0.00)',
        opacity: 0.46 + e * 0.08,
        blur: size * 0.26
      }
    ];
  }, [size, v.time, v.voiceEnergy, v.listening, v.processing, v.distortAmount, v.jitter]);

  const styles = React.useMemo(() => makeStyles(size), [size]);

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.shell, shellStyle]}>
        <Canvas style={styles.canvas}>
          <Group clip={clipPath}>
            {/* Soft ambient background */}
            <Fill>
              <RadialGradient
                c={center}
                r={size * 0.72}
                colors={['rgba(198,241,255,0.18)', 'rgba(156,214,250,0.08)', 'rgba(88,134,184,0.05)']}
                positions={[0, 0.58, 1]}
              />
            </Fill>

            {/* Main organic aurora mass */}
            <Group
              layer={
                <Paint blendMode="plus" opacity={glowPassOpacity}>
                  <BlurMask blur={size * 0.14} style="normal" />
                </Paint>
              }
            >
              {blobs.map((b, idx) => (
                <Circle key={`blob-${idx}`} cx={b.cx} cy={b.cy} r={b.r}>
                  <Paint blendMode="screen" opacity={b.opacity}>
                    <RadialGradient c={vec(b.cx, b.cy)} r={b.r} colors={[b.colorA, b.colorB]} positions={[0, 1]} />
                    <BlurMask blur={b.blur} style="normal" />
                  </Paint>
                </Circle>
              ))}
            </Group>

            {/* Central luminous core glow */}
            <Circle cx={size / 2} cy={size / 2} r={size * 0.34}>
              <Paint blendMode="screen" opacity={coreGlowOpacity}>
                <RadialGradient
                  c={center}
                  r={size * 0.34}
                  colors={['rgba(255,255,255,0.25)', 'rgba(220,245,255,0.08)', 'rgba(255,255,255,0.00)']}
                  positions={[0, 0.45, 1]}
                />
                <BlurMask blur={size * 0.09} style="normal" />
              </Paint>
            </Circle>

            {/* Depth lift */}
            <Circle cx={size / 2} cy={size / 2} r={size / 2}>
              <Paint opacity={0.14}>
                <RadialGradient
                  c={center}
                  r={size / 2}
                  colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.03)', 'rgba(12,24,42,0.08)']}
                  positions={[0, 0.62, 1]}
                />
              </Paint>
            </Circle>
          </Group>
        </Canvas>

        {/* Glass overlays */}
        <Canvas pointerEvents="none" style={styles.overlayCanvas}>
          <Circle cx={size / 2} cy={size / 2} r={size / 2}>
            <Paint>
              <RadialGradient
                c={center}
                r={size / 2}
                colors={['rgba(255,255,255,0.00)', 'rgba(255,255,255,0.09)', 'rgba(255,255,255,0.20)']}
                positions={[0.72, 0.88, 1]}
              />
              <BlurMask blur={10} style="normal" />
            </Paint>
          </Circle>

          <Group origin={mainHighlightOrigin} transform={[{ rotate: (-18 * Math.PI) / 180 }]}>
            <RoundedRect
              x={size * 0.23}
              y={size * 0.19}
              width={size * 0.26}
              height={size * 0.11}
              r={size * 0.09}
            >
              <Paint color="rgba(255,255,255,0.30)">
                <BlurMask blur={14} style="normal" />
              </Paint>
            </RoundedRect>
          </Group>

          <Group origin={secondaryHighlightOrigin} transform={[{ rotate: (22 * Math.PI) / 180 }]}>
            <RoundedRect
              x={size * 0.54}
              y={size * 0.68}
              width={size * 0.34}
              height={size * 0.15}
              r={size * 0.12}
            >
              <Paint color="rgba(255,255,255,0.12)">
                <BlurMask blur={18} style="normal" />
              </Paint>
            </RoundedRect>
          </Group>
        </Canvas>

        <Animated.View pointerEvents="none" style={[styles.milkyVeil, veilStyle]} />
      </Animated.View>
    </View>
  );
});

function makeStyles(size: number) {
  return StyleSheet.create({
    root: {
      width: size,
      height: size,
      alignItems: 'center',
      justifyContent: 'center'
    },
    shell: {
      width: size,
      height: size,
      borderRadius: size / 2,
      overflow: 'hidden',
      backgroundColor: 'rgba(125,208,228,0.07)',
      borderWidth: 0
    },
    canvas: {
      width: size,
      height: size
    },
    overlayCanvas: {
      ...StyleSheet.absoluteFillObject
    },
    milkyVeil: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(255,255,255,1)'
    }
  });
}
