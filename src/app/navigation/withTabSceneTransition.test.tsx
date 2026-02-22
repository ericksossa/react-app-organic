const mockUseIsFocused = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => mockUseIsFocused()
}));

import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { withTabSceneTransition } from './withTabSceneTransition';

function DummyScene({ label }: { label: string }) {
  return <Text>{label}</Text>;
}

describe('withTabSceneTransition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders wrapped component when focused', () => {
    mockUseIsFocused.mockReturnValue(true);
    const Wrapped = withTabSceneTransition(DummyScene);
    const { getByText } = render(<Wrapped label="scene-focused" />);

    expect(getByText('scene-focused')).toBeTruthy();
  });

  it('renders wrapped component when not focused', () => {
    mockUseIsFocused.mockReturnValue(false);
    const Wrapped = withTabSceneTransition(DummyScene);
    const { getByText } = render(<Wrapped label="scene-blur" />);

    expect(getByText('scene-blur')).toBeTruthy();
  });
});
