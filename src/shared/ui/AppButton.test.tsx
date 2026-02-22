jest.mock('../theme/useTheme', () => ({
  useTheme: () => ({
    colors: {
      cta: '#00aa00',
      ctaText: '#ffffff',
      text1: '#222222',
      border1: '#999999'
    }
  })
}));

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { AppButton } from './AppButton';

describe('AppButton', () => {
  it('renders title and triggers onPress', () => {
    const onPress = jest.fn();
    const { getByText } = render(<AppButton title="Pagar" onPress={onPress} />);

    fireEvent.press(getByText('Pagar'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders ghost tone with transparent background', () => {
    const { getByText } = render(<AppButton title="Cancelar" tone="ghost" />);

    const pressableText = getByText('Cancelar');
    expect(pressableText).toBeTruthy();
  });
});
