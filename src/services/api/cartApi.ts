import { apiRequest } from './client';
import { CartItem, CartSnapshot } from '../../features/cart/types';
import { resolveMediaUrl } from '../../shared/utils/media';

type CartActiveTotalsResponse = {
  subtotal?: string | number;
  total?: string | number;
  deliveryFee?: string | number;
  discount?: string | number;
};

type CartActiveItemResponse = {
  id?: string;
  itemId?: string;
  productId?: string;
  variantId?: string;
  qty?: number | string;
  quantity?: number | string;
  unitPrice?: number | string;
  unitPriceSnapshot?: number | string;
  price?: number | string;
  name?: string;
  productName?: string;
  variantName?: string;
  imageUrl?: string;
  product?: Record<string, unknown>;
  variant?: Record<string, unknown>;
};

type CartActiveResponse = {
  id: string;
  userId: string;
  zoneId: string | null;
  status: string;
  items: CartActiveItemResponse[];
  totals: CartActiveTotalsResponse;
};

type CartActiveEnvelope = { data: CartActiveResponse };
type CartMutationResponse = CartActiveResponse | CartActiveEnvelope | { id?: string } | null;

export async function getActiveCart(): Promise<CartSnapshot> {
  const response = await apiRequest<CartActiveResponse | CartActiveEnvelope>('cart/active');
  return normalizeCartSnapshot(response);
}

export async function setCartZone(zoneId: string): Promise<void> {
  await apiRequest<CartMutationResponse>('cart/zone', {
    method: 'PUT',
    body: { zoneId }
  });
}

export async function addCartItem(payload: { variantId: string; qty: number; note?: string }): Promise<void> {
  await apiRequest<CartMutationResponse>('cart/items', {
    method: 'POST',
    body: payload
  });
}

export async function updateCartItemQty(itemId: string, qty: number): Promise<void> {
  await apiRequest<CartMutationResponse>(`cart/items/${itemId}`, {
    method: 'PATCH',
    body: { qty }
  });
}

export async function removeCartItem(itemId: string): Promise<void> {
  await apiRequest<CartMutationResponse>(`cart/items/${itemId}`, {
    method: 'DELETE'
  });
}

function normalizeCartSnapshot(response: CartActiveResponse | CartActiveEnvelope): CartSnapshot {
  const payload = unwrap(response);
  const items = (payload.items ?? []).map((entry, index) => normalizeItem(entry, index));

  return {
    id: payload.id,
    userId: payload.userId,
    zoneId: payload.zoneId,
    status: payload.status,
    totals: {
      subtotal: Number(payload.totals?.subtotal ?? 0),
      total: Number(payload.totals?.total ?? 0),
      deliveryFee: toNumber(payload.totals?.deliveryFee) ?? undefined,
      discount: toNumber(payload.totals?.discount) ?? undefined
    },
    items
  };
}

function normalizeItem(item: CartActiveItemResponse, index: number): CartItem {
  const product = asRecord(item.product);
  const variant = asRecord(item.variant);

  const productId = item.productId ?? readString(product, ['id']) ?? `product-${index}`;
  const variantId = item.variantId ?? readString(variant, ['id']) ?? `variant-${index}`;
  const id = item.id ?? item.itemId ?? `${productId}:${variantId}`;

  const name = item.name ?? item.productName ?? readString(product, ['name']) ?? 'Producto';
  const variantName = item.variantName ?? readString(variant, ['name']) ?? 'Presentacion';
  const unitPrice =
    toNumber(item.unitPrice ?? item.unitPriceSnapshot ?? item.price) ??
    readNumber(variant, ['unitPrice', 'salePrice', 'basePrice']) ??
    0;
  const qty = Math.max(1, Math.trunc(toNumber(item.qty ?? item.quantity) ?? 1));
  const imageUrl = resolveMediaUrl(
    item.imageUrl ?? readString(product, ['imageUrl']) ?? readString(firstMedia(product), ['url'])
  );

  return {
    id,
    productId,
    variantId,
    name,
    variantName,
    unitPrice,
    qty,
    imageUrl
  };
}

function unwrap(value: CartActiveResponse | CartActiveEnvelope): CartActiveResponse {
  if ('data' in value && value.data) return value.data;
  return value as CartActiveResponse;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function firstMedia(product: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!product) return null;
  const media = Array.isArray(product.media) ? product.media : [];
  return media[0] && typeof media[0] === 'object' ? (media[0] as Record<string, unknown>) : null;
}

function readString(source: Record<string, unknown> | null, keys: string[]): string | undefined {
  if (!source) return undefined;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return undefined;
}

function readNumber(source: Record<string, unknown> | null, keys: string[]): number | undefined {
  if (!source) return undefined;
  for (const key of keys) {
    const value = toNumber(source[key]);
    if (value !== undefined) return value;
  }
  return undefined;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}
