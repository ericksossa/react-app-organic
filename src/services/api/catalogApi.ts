import { apiRequest } from './client';
import { resolveMediaUrl } from '../../shared/utils/media';

export type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  priceFrom?: number | string;
  imageUrl?: string;
  description?: string;
};

export type CatalogResponse = {
  page: number;
  limit: number;
  total: number;
  data: CatalogProduct[];
};

export type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
};

export type ProductVariant = {
  id: string;
  name: string;
  unitType?: string;
  unitValue?: number | string;
  basePrice?: number | string;
  salePrice?: number | string | null;
  inStock?: boolean;
};

export type ProductDetail = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  brand?: string;
  media?: Array<{ url?: string; alt?: string }>;
  variants: ProductVariant[];
};

export async function getCatalog(params?: {
  page?: number;
  limit?: number;
  q?: string;
  categorySlug?: string;
  zoneId?: string;
}): Promise<CatalogResponse> {
  const search = new URLSearchParams();
  if (params?.page) search.set('page', String(params.page));
  if (params?.limit) search.set('limit', String(params.limit));
  if (params?.q) search.set('q', params.q);
  if (params?.categorySlug) search.set('categorySlug', params.categorySlug);
  if (params?.zoneId) search.set('zoneId', params.zoneId);

  const query = search.toString();
  const path = query ? `products?${query}` : 'products';
  const response = await apiRequest<CatalogResponse | { data?: unknown[]; page?: number; limit?: number; total?: number }>(path);
  return normalizeCatalog(response);
}

export async function getCategories(): Promise<CatalogCategory[]> {
  const response = await apiRequest<CatalogCategory[] | { data?: CatalogCategory[] }>('categories');
  if (Array.isArray(response)) return response;
  return response.data ?? [];
}

export async function getProductBySlug(slug: string, zoneId?: string): Promise<ProductDetail | null> {
  const query = zoneId ? `?zoneId=${encodeURIComponent(zoneId)}` : '';
  const response = await apiRequest<ProductDetail | { data?: ProductDetail }>(`products/${slug}${query}`);
  const payload = (response as { data?: ProductDetail })?.data ?? (response as ProductDetail);
  if (!payload?.id) return null;

  return {
    ...payload,
    media: (payload.media ?? [])
      .map((item) => ({ ...item, url: resolveMediaUrl(item.url) }))
      .filter((item) => Boolean(item.url))
  };
}

function normalizeCatalog(
  response: CatalogResponse | { data?: unknown[]; page?: number; limit?: number; total?: number }
): CatalogResponse {
  const source = response as { data?: unknown[]; page?: number; limit?: number; total?: number };
  const rows = Array.isArray(source.data) ? source.data : [];

  return {
    page: source.page ?? 1,
    limit: source.limit ?? 20,
    total: source.total ?? rows.length,
    data: rows.map((entry, index) => normalizeProduct(entry, index))
  };
}

function normalizeProduct(value: unknown, index: number): CatalogProduct {
  const row = (value ?? {}) as Record<string, unknown>;
  const media = Array.isArray(row.media) ? row.media : [];
  const firstMedia = media[0] && typeof media[0] === 'object' ? (media[0] as Record<string, unknown>) : null;

  const id = asString(row.id) ?? `product-${index}`;
  const name = asString(row.name) ?? 'Producto';
  const slug = asString(row.slug) ?? id;
  const priceFrom = asNumber(row.priceFrom) ?? asNumber(row.price_from) ?? asNumber(row.price);
  const imageUrl = resolveMediaUrl(asString(row.imageUrl) ?? asString(firstMedia?.url));
  const description = asString(row.description);

  return { id, name, slug, priceFrom, imageUrl, description };
}

function asString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const parsed = value.trim();
  return parsed || undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}
