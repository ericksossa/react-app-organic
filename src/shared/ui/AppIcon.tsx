import React from 'react';
import { StyleSheet, View } from 'react-native';

type IconName =
  | 'home'
  | 'leaf'
  | 'search'
  | 'cart'
  | 'bag'
  | 'sun'
  | 'moon'
  | 'bookmark'
  | 'share'
  | 'logout'
  | 'chevron-down'
  | 'back'
  | 'clock'
  | 'copy'
  | 'check-circle'
  | 'x-circle';

type Props = {
  name: IconName;
  color: string;
  size?: number;
};

export function AppIcon({ name, color, size = 18 }: Props) {
  const stroke = Math.max(1.4, size * 0.08);
  const half = size / 2;

  if (name === 'search') {
    return (
      <View style={{ width: size, height: size }}>
        <View
          style={{
            position: 'absolute',
            left: size * 0.12,
            top: size * 0.12,
            width: size * 0.52,
            height: size * 0.52,
            borderRadius: size,
            borderWidth: stroke,
            borderColor: color
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: size * 0.58,
            top: size * 0.58,
            width: size * 0.3,
            height: stroke,
            backgroundColor: color,
            transform: [{ rotate: '45deg' }]
          }}
        />
      </View>
    );
  }

  if (name === 'home') {
    return (
      <View style={{ width: size, height: size }}>
        <View
          style={{
            position: 'absolute',
            left: size * 0.22,
            top: size * 0.44,
            width: size * 0.56,
            height: size * 0.38,
            borderWidth: stroke,
            borderColor: color,
            borderRadius: size * 0.08
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: size * 0.24,
            top: size * 0.2,
            width: size * 0.52,
            height: size * 0.52,
            borderTopWidth: stroke,
            borderLeftWidth: stroke,
            borderColor: color,
            transform: [{ rotate: '45deg' }]
          }}
        />
      </View>
    );
  }

  if (name === 'cart') {
    return (
      <View style={{ width: size, height: size }}>
        <View
          style={{
            position: 'absolute',
            left: size * 0.22,
            top: size * 0.34,
            width: size * 0.56,
            height: size * 0.52,
            borderWidth: stroke,
            borderColor: color,
            borderRadius: size * 0.1
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: size * 0.34,
            top: size * 0.2,
            width: size * 0.32,
            height: size * 0.18,
            borderWidth: stroke,
            borderBottomWidth: 0,
            borderColor: color,
            borderRadius: size
          }}
        />
      </View>
    );
  }

  if (name === 'bag') {
    return (
      <View style={{ width: size, height: size }}>
        <View
          style={{
            position: 'absolute',
            left: size * 0.22,
            top: size * 0.34,
            width: size * 0.56,
            height: size * 0.52,
            borderWidth: stroke,
            borderColor: color,
            borderRadius: size * 0.08
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: size * 0.34,
            top: size * 0.2,
            width: size * 0.32,
            height: size * 0.18,
            borderWidth: stroke,
            borderBottomWidth: 0,
            borderColor: color,
            borderRadius: size
          }}
        />
      </View>
    );
  }

  if (name === 'leaf') {
    return (
      <View style={{ width: size, height: size }}>
        <View
          style={{
            position: 'absolute',
            left: size * 0.2,
            top: size * 0.24,
            width: size * 0.56,
            height: size * 0.42,
            borderWidth: stroke,
            borderColor: color,
            borderTopLeftRadius: size * 0.5,
            borderBottomRightRadius: size * 0.5,
            borderTopRightRadius: size * 0.08,
            borderBottomLeftRadius: size * 0.08,
            transform: [{ rotate: '-34deg' }]
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: size * 0.33,
            top: size * 0.56,
            width: stroke,
            height: size * 0.2,
            backgroundColor: color,
            transform: [{ rotate: '-38deg' }]
          }}
        />
      </View>
    );
  }

  if (name === 'sun') {
    return (
      <View style={{ width: size, height: size }}>
        <View
          style={{
            position: 'absolute',
            left: size * 0.34,
            top: size * 0.34,
            width: size * 0.32,
            height: size * 0.32,
            borderRadius: size,
            borderWidth: stroke,
            borderColor: color
          }}
        />
        <View style={[styles.ray, { left: half - stroke / 2, top: size * 0.06, width: stroke, height: size * 0.14, backgroundColor: color }]} />
        <View style={[styles.ray, { left: half - stroke / 2, top: size * 0.8, width: stroke, height: size * 0.14, backgroundColor: color }]} />
        <View style={[styles.ray, { left: size * 0.06, top: half - stroke / 2, width: size * 0.14, height: stroke, backgroundColor: color }]} />
        <View style={[styles.ray, { left: size * 0.8, top: half - stroke / 2, width: size * 0.14, height: stroke, backgroundColor: color }]} />
      </View>
    );
  }

  if (name === 'moon') {
    return (
      <View style={{ width: size, height: size }}>
        <View
          style={{
            position: 'absolute',
            left: size * 0.24,
            top: size * 0.2,
            width: size * 0.54,
            height: size * 0.54,
            borderRadius: size,
            borderWidth: stroke,
            borderColor: color
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: size * 0.44,
            top: size * 0.14,
            width: size * 0.42,
            height: size * 0.62,
            borderRadius: size,
            backgroundColor: '#000000'
          }}
        />
      </View>
    );
  }

  if (name === 'bookmark') {
    return (
      <View style={{ width: size, height: size }}>
        <View
          style={{
            position: 'absolute',
            left: size * 0.28,
            top: size * 0.12,
            width: size * 0.44,
            height: size * 0.72,
            borderWidth: stroke,
            borderColor: color,
            borderRadius: size * 0.08
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: size * 0.39,
            top: size * 0.58,
            width: size * 0.22,
            height: size * 0.22,
            backgroundColor: '#000000',
            transform: [{ rotate: '45deg' }]
          }}
        />
      </View>
    );
  }

  if (name === 'share') {
    return (
      <View style={{ width: size, height: size }}>
        <View style={{ position: 'absolute', left: half - stroke / 2, top: size * 0.18, width: stroke, height: size * 0.42, backgroundColor: color }} />
        <View style={{ position: 'absolute', left: size * 0.34, top: size * 0.24, width: stroke, height: size * 0.22, backgroundColor: color, transform: [{ rotate: '45deg' }] }} />
        <View style={{ position: 'absolute', left: size * 0.56, top: size * 0.24, width: stroke, height: size * 0.22, backgroundColor: color, transform: [{ rotate: '-45deg' }] }} />
        <View
          style={{
            position: 'absolute',
            left: size * 0.24,
            top: size * 0.56,
            width: size * 0.52,
            height: size * 0.3,
            borderWidth: stroke,
            borderTopWidth: 0,
            borderColor: color,
            borderRadius: size * 0.08
          }}
        />
      </View>
    );
  }

  if (name === 'logout') {
    return (
      <View style={{ width: size, height: size }}>
        <View
          style={{
            position: 'absolute',
            left: size * 0.12,
            top: size * 0.2,
            width: size * 0.28,
            height: size * 0.56,
            borderWidth: stroke,
            borderRightWidth: 0,
            borderColor: color,
            borderRadius: size * 0.08
          }}
        />
        <View style={{ position: 'absolute', left: size * 0.36, top: half - stroke / 2, width: size * 0.42, height: stroke, backgroundColor: color }} />
        <View style={{ position: 'absolute', left: size * 0.66, top: size * 0.34, width: stroke, height: size * 0.22, backgroundColor: color, transform: [{ rotate: '-45deg' }] }} />
        <View style={{ position: 'absolute', left: size * 0.66, top: size * 0.46, width: stroke, height: size * 0.22, backgroundColor: color, transform: [{ rotate: '45deg' }] }} />
      </View>
    );
  }

  if (name === 'chevron-down') {
    return (
      <View style={{ width: size, height: size }}>
        <View style={{ position: 'absolute', left: size * 0.34, top: size * 0.42, width: stroke, height: size * 0.24, backgroundColor: color, transform: [{ rotate: '45deg' }] }} />
        <View style={{ position: 'absolute', left: size * 0.54, top: size * 0.42, width: stroke, height: size * 0.24, backgroundColor: color, transform: [{ rotate: '-45deg' }] }} />
      </View>
    );
  }

  if (name === 'back') {
    return (
      <View style={{ width: size, height: size }}>
        <View style={{ position: 'absolute', left: size * 0.32, top: size * 0.28, width: stroke, height: size * 0.24, backgroundColor: color, transform: [{ rotate: '45deg' }] }} />
        <View style={{ position: 'absolute', left: size * 0.32, top: size * 0.46, width: stroke, height: size * 0.24, backgroundColor: color, transform: [{ rotate: '-45deg' }] }} />
      </View>
    );
  }

  if (name === 'clock') {
    return (
      <View style={{ width: size, height: size }}>
        <View
          style={{
            position: 'absolute',
            left: size * 0.16,
            top: size * 0.16,
            width: size * 0.68,
            height: size * 0.68,
            borderRadius: size,
            borderWidth: stroke,
            borderColor: color
          }}
        />
        <View style={{ position: 'absolute', left: half - stroke / 2, top: size * 0.32, width: stroke, height: size * 0.2, backgroundColor: color }} />
        <View style={{ position: 'absolute', left: half, top: half, width: size * 0.18, height: stroke, backgroundColor: color }} />
      </View>
    );
  }

  if (name === 'copy') {
    return (
      <View style={{ width: size, height: size }}>
        <View
          style={{
            position: 'absolute',
            left: size * 0.22,
            top: size * 0.24,
            width: size * 0.46,
            height: size * 0.5,
            borderWidth: stroke,
            borderColor: color,
            borderRadius: size * 0.06
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: size * 0.34,
            top: size * 0.12,
            width: size * 0.46,
            height: size * 0.5,
            borderWidth: stroke,
            borderColor: color,
            borderRadius: size * 0.06
          }}
        />
      </View>
    );
  }

  if (name === 'check-circle') {
    return (
      <View style={{ width: size, height: size }}>
        <View
          style={{
            position: 'absolute',
            left: size * 0.12,
            top: size * 0.12,
            width: size * 0.76,
            height: size * 0.76,
            borderRadius: size,
            borderWidth: stroke,
            borderColor: color
          }}
        />
        <View style={{ position: 'absolute', left: size * 0.34, top: size * 0.5, width: stroke, height: size * 0.18, backgroundColor: color, transform: [{ rotate: '45deg' }] }} />
        <View style={{ position: 'absolute', left: size * 0.48, top: size * 0.42, width: stroke, height: size * 0.28, backgroundColor: color, transform: [{ rotate: '-45deg' }] }} />
      </View>
    );
  }

  if (name === 'x-circle') {
    return (
      <View style={{ width: size, height: size }}>
        <View
          style={{
            position: 'absolute',
            left: size * 0.12,
            top: size * 0.12,
            width: size * 0.76,
            height: size * 0.76,
            borderRadius: size,
            borderWidth: stroke,
            borderColor: color
          }}
        />
        <View style={{ position: 'absolute', left: half - stroke / 2, top: size * 0.28, width: stroke, height: size * 0.44, backgroundColor: color, transform: [{ rotate: '45deg' }] }} />
        <View style={{ position: 'absolute', left: half - stroke / 2, top: size * 0.28, width: stroke, height: size * 0.44, backgroundColor: color, transform: [{ rotate: '-45deg' }] }} />
      </View>
    );
  }

  return <View style={{ width: size, height: size }} />;
}

const styles = StyleSheet.create({
  dot: {
    position: 'absolute'
  },
  ray: {
    position: 'absolute'
  }
});
