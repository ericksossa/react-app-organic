import { resolveMediaUrl, toCachedImageSource } from './media';

describe('media utils', () => {
  const original = process.env.EXPO_PUBLIC_API_BASE_URL;
  const loadMedia = () => {
    let mod: typeof import('./media');
    jest.isolateModules(() => {
      mod = require('./media');
    });
    return mod!;
  };

  afterEach(() => {
    jest.resetModules();
    process.env.EXPO_PUBLIC_API_BASE_URL = original;
  });

  it('resolves relative media path using API origin', () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.com/green-cart/v1';
    const { resolveMediaUrl: resolve } = loadMedia();

    expect(resolve('/uploads/item.png')).toBe('https://api.example.com/uploads/item.png');
    expect(resolve('uploads/item.png')).toBe('https://api.example.com/uploads/item.png');
  });

  it('keeps non-empty absolute urls', () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.com/green-cart/v1';
    const { resolveMediaUrl: resolve } = loadMedia();

    expect(resolve('https://cdn.example.com/a.png')).toBe('https://cdn.example.com/a.png');
  });

  it('returns undefined for empty values', () => {
    expect(resolveMediaUrl('')).toBeUndefined();
    expect(resolveMediaUrl('   ')).toBeUndefined();
    expect(resolveMediaUrl(undefined)).toBeUndefined();
  });

  it('builds force-cache image source', () => {
    expect(toCachedImageSource('https://a.com/x.png')).toEqual({ uri: 'https://a.com/x.png', cache: 'force-cache' });
    expect(toCachedImageSource(undefined)).toBeUndefined();
  });
});
