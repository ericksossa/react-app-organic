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
  Shader,
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

const DEV_SHOW_TEST_SHADER = false;

const auroraEffect = Skia.RuntimeEffect.Make(`
uniform float resolutionX;
uniform float resolutionY;
uniform float time;
uniform float voiceEnergy;
uniform float distortAmount;
uniform float listening;
uniform float processing;
uniform float jitter;

float hash(float2 p) {
  p = fract(p * float2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

float noise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float a = hash(i);
  float b = hash(i + float2(1.0, 0.0));
  float c = hash(i + float2(0.0, 1.0));
  float d = hash(i + float2(1.0, 1.0));

  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(float2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 3; i++) {
    v += amp * noise(p);
    p = p * 2.0 + float2(5.7, 3.1);
    amp *= 0.5;
  }
  return v;
}

half4 main(float2 fragCoord) {
  float2 resolution = float2(resolutionX, resolutionY);
  float2 uv = fragCoord / resolution;
  float2 p = uv - 0.5;
  float r = length(p) / 0.5;

  float l = clamp(listening, 0.0, 1.0);
  float pr = clamp(processing, 0.0, 1.0);
  float e = clamp(voiceEnergy, 0.0, 1.0);
  float j = clamp(jitter, 0.0, 1.0);

  float t = time * mix(0.40, 0.58, pr);
  float tighten = mix(1.0, 1.25, pr);

  float nA = fbm(p * (2.4 * tighten) + float2(t * 0.45, -t * 0.35));
  float nB = fbm(p * (3.0 * tighten) + float2(-t * 0.38, t * 0.55));
  float distort = 0.06 + distortAmount * 0.20 + l * 0.10 + e * 0.14 + j * 0.03;
  distort *= mix(1.0, 0.74, pr);

  float2 flow = p + float2(nA - 0.5, nB - 0.5) * distort;

  float b1 = fbm(flow * (1.25 * tighten) + float2(t * 0.10, -t * 0.08));
  float b2 = fbm(flow * (1.55 * tighten) + float2(-t * 0.09, t * 0.12));
  float b3 = fbm(flow * (1.10 * tighten) + float2(t * 0.06, t * 0.07));

  float m1 = smoothstep(0.25, 0.75, b1);
  float m2 = smoothstep(0.30, 0.80, b2);
  float m3 = smoothstep(0.38, 0.86, b3);

  float3 cCyan   = float3(0.08, 0.88, 1.00);
  float3 cTeal   = float3(0.24, 0.96, 0.80);
  float3 cPurple = float3(0.80, 0.56, 1.00);
  float3 cPink   = float3(1.00, 0.64, 0.86);
  float3 cPeach  = float3(1.00, 0.89, 0.74);

  float3 col = cCyan * (0.34 + 0.66 * m1);
  col = mix(col, cTeal,   0.62 * m2);
  col = mix(col, cPurple, 0.22 * m3);
  col = mix(col, cPink,   0.16 * (m1 * m2));
  col = mix(col, cPeach,  0.14 * (m2 * m3));

  float inner = 1.0 - smoothstep(0.0, 1.0, r);
  col += inner * float3(0.10, 0.12, 0.14) * 0.35;
  float core = exp(-r * r * 4.0);
  col += core * float3(0.6, 0.8, 1.0) * (0.15 + e * 0.3);

  float glow = exp(-r * r * (2.2 - e * 0.6));
  col += glow * float3(0.20, 0.24, 0.28) * (0.90 + l * 0.30);

  float edge = 1.0 - smoothstep(0.78, 1.02, r);
  edge = clamp(edge, 0.0, 1.0);
  float alpha = pow(edge, 1.25) * (0.92 + l * 0.06);

  col = max(col, float3(0.10, 0.12, 0.14));
  col *= mix(1.0, 1.1, l);
  col *= mix(1.0, 0.9, pr);
  col = pow(col, float3(0.85));
  float exposure = mix(1.7, 2.4, l);
  col = 1.0 - exp(-col * exposure);

  return half4(col * alpha, alpha);
}
`);

const auroraTestEffect = Skia.RuntimeEffect.Make(`
uniform float resolutionX;
uniform float resolutionY;
uniform float time;

half4 main(float2 fragCoord) {
  float2 uv = fragCoord / float2(resolutionX, resolutionY);
  float pulse = 0.08 * sin(time * 1.6);
  float3 col = float3(uv.x + pulse, uv.y, 0.65);
  return half4(col, 1.0);
}
`);

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

export const AuroraOrb = React.memo(function AuroraOrb({ state, size = 230, energy }: AuroraOrbProps) {
  const rafRef = React.useRef<number | null>(null);
  const lastTsRef = React.useRef(0);
  const lastEmitRef = React.useRef(0);

  const tRef = React.useRef(0);
  const speedRef = React.useRef(0.44);
  const listeningRef = React.useRef(0);
  const processingRef = React.useRef(0);
  const distortRef = React.useRef(0.2);
  const jitterRef = React.useRef(0);
  const simEnergyRef = React.useRef(0.08);

  const [u, setU] = React.useState({
    resolutionX: size,
    resolutionY: size,
    time: 0,
    voiceEnergy: 0.08,
    distortAmount: 0.2,
    listening: 0,
    processing: 0,
    jitter: 0
  });
  const [glowPassOpacity, setGlowPassOpacity] = React.useState(0.55);

  const runtimeAvailable = !!auroraEffect && !!auroraTestEffect;

  React.useEffect(() => {
    if (!__DEV__) return;
    const auroraAny = auroraEffect as unknown as { errorText?: string } | null;
    const testAny = auroraTestEffect as unknown as { errorText?: string } | null;

    console.log('[AuroraOrb] RuntimeEffect compiled?', !!auroraEffect);
    if (!auroraEffect) {
      console.log('[AuroraOrb] RuntimeEffect errorText:', auroraAny?.errorText ?? 'n/a');
    }

    console.log('[AuroraOrb] RuntimeEffect test compiled?', !!auroraTestEffect);
    if (!auroraTestEffect) {
      console.log('[AuroraOrb] RuntimeEffect test errorText:', testAny?.errorText ?? 'n/a');
    }
  }, []);

  React.useEffect(() => {
    const isListening = state === 'listening';
    const isProcessing = state === 'processing';

    listeningRef.current = isListening ? 1 : 0;
    processingRef.current = isProcessing ? 1 : 0;
    speedRef.current = isProcessing ? 0.52 : isListening ? 0.84 : 0.44;
    distortRef.current = isListening ? 0.62 : isProcessing ? 0.14 : 0.2;
    jitterRef.current = isListening ? 1 : 0;
  }, [state]);

  React.useEffect(() => {
    setU((prev) => ({ ...prev, resolutionX: size, resolutionY: size }));
  }, [size]);

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
          0.18 +
          0.22 * (0.5 + 0.5 * Math.sin(tt * 6.2 + 0.4)) +
          0.10 * (0.5 + 0.5 * Math.sin(tt * 13.0 + 1.7));
        const flutter = 0.04 * (0.5 + 0.5 * Math.sin(tt * 22.0 + 2.1));
        e = clamp01(env + flutter);
      } else {
        e = Math.max(0.06, simEnergyRef.current * 0.94);
      }
      simEnergyRef.current = e;

      if (ts - lastEmitRef.current >= 33 || lastEmitRef.current === 0) {
        const tt = tRef.current;
        const l = listeningRef.current;
        const p = processingRef.current;
        const jitterOsc =
          (0.5 + 0.5 * Math.sin(tt * 3.5 + 0.4)) * (0.55 + 0.45 * Math.sin(tt * 5.8 + 1.2));

        setU({
          resolutionX: size,
          resolutionY: size,
          time: tt,
          voiceEnergy: e,
          distortAmount: distortRef.current,
          listening: l,
          processing: p,
          jitter: jitterOsc * jitterRef.current * (1 - p)
        });

        setGlowPassOpacity(Math.max(0.45, Math.min(0.85, 0.65 + e * 0.2)));

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
  }, [energy, size, state]);

  const breath = useSharedValue(0);
  const wobble = useSharedValue(0);
  const baseRotation = useSharedValue(0);
  const scaleAmp = useSharedValue(0.016);
  const wobbleAmp = useSharedValue(1.2);
  const veilOpacity = useSharedValue(0.2);
  const listeningShellMix = useSharedValue(0);

  React.useEffect(() => {
    baseRotation.value = withRepeat(withTiming(1, { duration: 18000, easing: Easing.linear }), -1, false);
  }, [baseRotation]);

  React.useEffect(() => {
    const isListening = state === 'listening';
    const isProcessing = state === 'processing';

    listeningShellMix.value = withTiming(isListening ? 1 : 0, { duration: 220 });
    scaleAmp.value = withTiming(isListening ? 0.045 : isProcessing ? 0.014 : 0.016, { duration: 280 });
    wobbleAmp.value = withTiming(isListening ? 3.2 : isProcessing ? 0.6 : 1.2, { duration: 280 });
    veilOpacity.value = withTiming(isListening ? 0.08 : isProcessing ? 0.04 : 0.06, { duration: 280 });

    cancelAnimation(breath);
    breath.value = withRepeat(
      withTiming(1, {
        duration: isListening ? 920 : isProcessing ? 2600 : 2800,
        easing: Easing.inOut(Easing.quad)
      }),
      -1,
      true
    );

    cancelAnimation(wobble);
    wobble.value = withRepeat(
      withTiming(1, {
        duration: isListening ? 1200 : isProcessing ? 4200 : 3800,
        easing: Easing.inOut(Easing.quad)
      }),
      -1,
      true
    );
  }, [baseRotation, breath, listeningShellMix, scaleAmp, state, veilOpacity, wobble, wobbleAmp]);

  const shellStyle = useAnimatedStyle(() => {
    const breathingScale = 1 + breath.value * scaleAmp.value;
    const reactiveScale = 1 + listeningShellMix.value * 0.02;
    const totalScale = Math.min(1.11, breathingScale * reactiveScale);
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

  const fallbackBlobs = React.useMemo(() => {
    const tt = u.time;
    const e = clamp01(u.voiceEnergy);
    const baseR = size * 0.24;

    return [
      {
        cx: size * (0.36 + 0.07 * Math.sin(tt * 0.9)),
        cy: size * (0.42 + 0.06 * Math.cos(tt * 0.7)),
        r: baseR * (1.0 + 0.12 * Math.sin(tt * 1.4)),
        colorA: 'rgba(58,227,255,0.62)',
        colorB: 'rgba(58,227,255,0.00)',
        opacity: 0.55 + e * 0.18,
        blur: 22
      },
      {
        cx: size * (0.58 + 0.06 * Math.cos(tt * 0.8 + 0.5)),
        cy: size * (0.36 + 0.07 * Math.sin(tt * 0.75 + 1.2)),
        r: baseR * 1.08,
        colorA: 'rgba(162,107,255,0.56)',
        colorB: 'rgba(162,107,255,0.00)',
        opacity: 0.52 + e * 0.12,
        blur: 24
      },
      {
        cx: size * (0.49 + 0.06 * Math.sin(tt * 0.65 + 2.2)),
        cy: size * (0.62 + 0.07 * Math.cos(tt * 0.72 + 1.7)),
        r: baseR * 1.05,
        colorA: 'rgba(255,121,199,0.48)',
        colorB: 'rgba(255,121,199,0.00)',
        opacity: 0.48 + e * 0.12,
        blur: 26
      },
      {
        cx: size * (0.68 + 0.05 * Math.cos(tt * 0.6 + 1.6)),
        cy: size * (0.56 + 0.05 * Math.sin(tt * 0.66 + 0.8)),
        r: baseR * 0.92,
        colorA: 'rgba(255,214,150,0.44)',
        colorB: 'rgba(255,214,150,0.00)',
        opacity: 0.42 + e * 0.08,
        blur: 24
      }
    ];
  }, [size, u.time, u.voiceEnergy]);

  const activeEffect = __DEV__ && DEV_SHOW_TEST_SHADER ? auroraTestEffect : auroraEffect;
  const styles = React.useMemo(() => makeStyles(size), [size]);

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.shell, shellStyle]}>
        <Canvas style={styles.canvas}>
          <Group clip={clipPath}>
            {runtimeAvailable && activeEffect ? (
              <>
                <Group opacity={0.85}>
                  <Fill>
                    <Shader source={activeEffect} uniforms={u} />
                  </Fill>
                </Group>

                <Group
                  layer={
                    <Paint blendMode="plus" opacity={glowPassOpacity}>
                      <BlurMask blur={32} style="normal" />
                    </Paint>
                  }
                >
                  <Fill>
                    <Shader source={activeEffect} uniforms={u} />
                  </Fill>
                </Group>

                <Circle cx={size / 2} cy={size / 2} r={size * 0.36}>
                  <Paint blendMode="screen" opacity={0.9}>
                    <RadialGradient
                      c={center}
                      r={size * 0.36}
                      colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.00)']}
                      positions={[0, 1]}
                    />
                    <BlurMask blur={20} style="normal" />
                  </Paint>
                </Circle>
              </>
            ) : (
              <>
                <Fill color="rgba(16,26,42,0.95)" />
                {fallbackBlobs.map((b, idx) => (
                  <Circle key={`blob-${idx}`} cx={b.cx} cy={b.cy} r={b.r}>
                    <Paint blendMode="screen" opacity={b.opacity}>
                      <RadialGradient c={vec(b.cx, b.cy)} r={b.r} colors={[b.colorA, b.colorB]} positions={[0, 1]} />
                      <BlurMask blur={b.blur} style="normal" />
                    </Paint>
                  </Circle>
                ))}
              </>
            )}

            <Circle cx={size / 2} cy={size / 2} r={size / 2}>
              <Paint opacity={0.16}>
                <RadialGradient
                  c={center}
                  r={size / 2}
                  colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.03)', 'rgba(12,24,42,0.10)']}
                  positions={[0, 0.62, 1]}
                />
              </Paint>
            </Circle>
          </Group>
        </Canvas>

        <Canvas pointerEvents="none" style={styles.overlayCanvas}>
          <Circle cx={size / 2} cy={size / 2} r={size / 2}>
            <Paint>
              <RadialGradient
                c={center}
                r={size / 2}
                colors={['rgba(255,255,255,0.00)', 'rgba(255,255,255,0.10)', 'rgba(255,255,255,0.22)']}
                positions={[0.72, 0.88, 1]}
              />
              <BlurMask blur={10} style="normal" />
            </Paint>
          </Circle>

          <Circle cx={size / 2} cy={size / 2} r={size / 2}>
            <Paint opacity={0.5}>
              <RadialGradient
                c={center}
                r={size / 2}
                colors={['rgba(0,0,0,0.00)', 'rgba(0,0,0,0.18)']}
                positions={[0.65, 1]}
              />
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
