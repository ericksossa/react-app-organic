import { env } from '../../config/env';
import { ImageURISource } from 'react-native';

function apiOrigin(): string | null {
  try {
    return new URL(env.apiBaseUrl).origin;
  } catch {
    return null;
  }
}

export function resolveMediaUrl(value?: string | null): string | undefined {
  if (!value) return undefined;
  const raw = value.trim();
  if (!raw) return undefined;

  const origin = apiOrigin();
  if (!origin) return raw;

  if (raw.startsWith('/')) {
    return `${origin}${raw}`;
  }

  if (/^https?:\/\//i.test(raw)) {
    try {
      const media = new URL(raw);
      const base = new URL(origin);
      if ((media.hostname === 'localhost' || media.hostname === '127.0.0.1') && base.hostname !== media.hostname) {
        media.protocol = base.protocol;
        media.hostname = base.hostname;
        media.port = base.port;
      }
      return media.toString();
    } catch {
      return raw;
    }
  }

  return `${origin}/${raw.replace(/^\//, '')}`;
}

export function toCachedImageSource(uri?: string): ImageURISource | undefined {
  if (!uri) return undefined;
  return { uri, cache: 'force-cache' };
}
