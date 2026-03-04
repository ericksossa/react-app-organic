import { apiRequest } from './client';
import { resolveMediaUrl } from '../../shared/utils/media';

export type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  priceFrom?: number | string;
  imageUrl?: string;
  description?: string;
  defaultVariantId?: string;
  inStock?: boolean;
  stockQty?: number;
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
  availableQty?: number | string;
};

export type ProductDetail = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  brand?: string;
  inStock?: boolean;
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

  const source = payload as Record<string, unknown>;
  const normalizedVariants = (payload.variants ?? []).map((variant) => {
    const variantSource = variant as Record<string, unknown>;
    const availableQty =
      asNumber(variantSource.availableQty) ??
      asNumber(variantSource.available_qty) ??
      asNumber((variantSource as { stockQty?: unknown }).stockQty);
    const hasRawInStock = Object.prototype.hasOwnProperty.call(variantSource, 'inStock');
    const rawInStock = variantSource.inStock;
    const normalizedInStock =
      asBoolean(variantSource.inStock) ??
      asBoolean(variantSource.isAvailable) ??
      (typeof availableQty === 'number' ? availableQty > 0 : undefined);
    // Backend may return { inStock: null, availableQty: null } for unavailable variants.
    const unresolvedStock = (rawInStock == null || !hasRawInStock) && availableQty == null;

    return {
      ...variant,
      availableQty: availableQty ?? variant.availableQty,
      inStock: normalizedInStock ?? (unresolvedStock ? false : variant.inStock)
    };
  });

  return {
    ...payload,
    inStock: asBoolean(source.inStock) ?? payload.inStock,
    media: (payload.media ?? [])
      .map((item) => ({ ...item, url: resolveMediaUrl(item.url) }))
      .filter((item) => Boolean(item.url)),
    variants: normalizedVariants
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
  const variants = Array.isArray(row.variants) ? row.variants : [];
  const firstMedia = media[0] && typeof media[0] === 'object' ? (media[0] as Record<string, unknown>) : null;
  const firstVariant =
    variants[0] && typeof variants[0] === 'object' ? (variants[0] as Record<string, unknown>) : null;

  const id = asString(row.id) ?? `product-${index}`;
  const name = asString(row.name) ?? 'Producto';
  const slug = asString(row.slug) ?? id;
  const priceFrom = asNumber(row.priceFrom) ?? asNumber(row.price_from) ?? asNumber(row.price);
  const imageUrl = resolveMediaUrl(asString(row.imageUrl) ?? asString(firstMedia?.url));
  const description = asString(row.description);
  const defaultVariantId =
    asString(row.defaultVariantId) ??
    asString(row.default_variant_id) ??
    asString(row.variantId) ??
    asString(firstVariant?.id);
  const stockQty =
    asNumber(row.stockQty) ??
    asNumber(row.stock_qty) ??
    asNumber(row.availableQty) ??
    asNumber(row.available_qty) ??
    asNumber(firstVariant?.stockQty);
  const inStock =
    asBoolean(row.inStock) ??
    asBoolean(row.isAvailable) ??
    asBoolean(firstVariant?.inStock) ??
    (typeof stockQty === 'number' ? stockQty > 0 : undefined);

  return { id, name, slug, priceFrom, imageUrl, description, defaultVariantId, inStock, stockQty };
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

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return undefined;
    if (['true', '1', 'yes', 'si', 'sí', 'available', 'in_stock'].includes(normalized)) return true;
    if (['false', '0', 'no', 'unavailable', 'out_of_stock'].includes(normalized)) return false;
  }
  return undefined;
}
