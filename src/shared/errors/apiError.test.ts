import { getErrorMessage } from './apiError';

describe('getErrorMessage', () => {
  it('returns api error message when available', () => {
    expect(getErrorMessage({ status: 400, message: 'bad request' }, 'fallback')).toBe('bad request');
  });

  it('returns native error message', () => {
    expect(getErrorMessage(new Error('boom'), 'fallback')).toBe('boom');
  });

  it('returns fallback when unknown error', () => {
    expect(getErrorMessage(null, 'fallback')).toBe('fallback');
  });
});
