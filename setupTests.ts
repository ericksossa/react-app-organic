import '@testing-library/jest-native/extend-expect';

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const RN = require('react-native');

  const animatedComponent = (Component: any) =>
    React.forwardRef((props: any, ref: any) => React.createElement(Component, { ...props, ref }));

  const interpolate = (
    value: number,
    inputRange: number[],
    outputRange: number[]
  ) => {
    if (inputRange.length < 2 || outputRange.length < 2) return outputRange[0] ?? value;
    const [inMin, inMax] = [inputRange[0], inputRange[inputRange.length - 1]];
    const [outMin, outMax] = [outputRange[0], outputRange[outputRange.length - 1]];
    if (inMax === inMin) return outMin;
    const t = Math.max(0, Math.min(1, (value - inMin) / (inMax - inMin)));
    return outMin + (outMax - outMin) * t;
  };

  return {
    __esModule: true,
    default: {
      View: animatedComponent(RN.View),
      ScrollView: animatedComponent(RN.ScrollView),
      FlatList: animatedComponent(RN.FlatList)
    },
    View: animatedComponent(RN.View),
    ScrollView: animatedComponent(RN.ScrollView),
    FlatList: animatedComponent(RN.FlatList),
    Easing: {
      out: (fn: any) => fn,
      inOut: (fn: any) => fn,
      cubic: () => 0,
      sin: () => 0
    },
    Extrapolation: { CLAMP: 'clamp' },
    interpolate,
    useSharedValue: (value: any) => ({ value }),
    useAnimatedStyle: (factory: any) => factory(),
    useAnimatedScrollHandler: () => jest.fn(),
    withTiming: (value: any) => value,
    runOnJS: (fn: any) => fn,
    FadeInDown: {
      delay: () => ({
        duration: () => ({})
      })
    }
  };
});

// RN internal paths move across versions; keep this mock virtual so Jest doesn't require the file to exist.
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({}), { virtual: true });

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
