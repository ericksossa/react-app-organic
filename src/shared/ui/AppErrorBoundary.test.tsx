import React from 'react';
import { render } from '@testing-library/react-native';
import { AppErrorBoundary } from './AppErrorBoundary';

function Thrower() {
  throw new Error('boom');
}

describe('AppErrorBoundary', () => {
  const originalConsoleError = console.error;

  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  it('shows fallback UI after child render error', () => {
    const { getByText } = render(
      <AppErrorBoundary>
        <Thrower />
      </AppErrorBoundary>
    );

    expect(getByText('Algo salió mal')).toBeTruthy();
    expect(getByText('Reintentar')).toBeTruthy();
  });
});
