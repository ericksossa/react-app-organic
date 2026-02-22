jest.mock('@expo/vector-icons', () => ({
  Feather: ({ name, color, size }: any) => null,
  Ionicons: ({ name, color, size }: any) => null
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import { AnimatedTabIcon } from './AnimatedTabIcon';

describe('AnimatedTabIcon', () => {
  it('renders the provided label', () => {
    const { getByText } = render(
      <AnimatedTabIcon
        focused={false}
        label="Inicio"
        icon="home"
        activeColor="#000"
        inactiveColor="#999"
      />
    );

    expect(getByText('Inicio')).toBeTruthy();
  });

  it.each([
    ['home', true],
    ['home', false],
    ['explore', true],
    ['cart', false]
  ] as const)('renders without crashing for %s (focused=%s)', (icon, focused) => {
    const { getByText } = render(
      <AnimatedTabIcon
        focused={focused}
        label={`tab-${icon}`}
        icon={icon}
        activeColor="#111"
        inactiveColor="#666"
      />
    );

    expect(getByText(`tab-${icon}`)).toBeTruthy();
  });
});
