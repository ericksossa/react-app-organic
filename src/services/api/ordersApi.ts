import { apiRequest } from './client';

export type DeliveryMode = 'not_defined' | 'own' | 'third_party' | 'pickup';

export type CreateOrderDto = {
  addressId: string;
  deliveryMode: DeliveryMode;
  slotStart?: string;
  slotEnd?: string;
  note?: string;
};

export type OrderItem = {
  id?: string;
  name: string;
  qty: number;
  unitPrice: number;
  total?: number;
};

export type OrderSummary = {
  id: string;
  status: string;
  subtotal?: number;
  total?: number;
  createdAt?: string;
};

export type OrderDetail = OrderSummary & {
  addressId?: string;
  deliveryMode?: DeliveryMode;
  slotStart?: string;
  slotEnd?: string;
  note?: string;
  items: OrderItem[];
};

export type OrdersListResponse = {
  page: number;
  limit: number;
  total: number;
  data: OrderDetail[];
};

export async function createOrder(payload: CreateOrderDto): Promise<OrderDetail | null> {
  const response = await apiRequest<unknown>('orders', {
    method: 'POST',
    body: payload
  });

  return normalizeOrder(unwrap(response));
}

export async function listOrders(page = 1, limit = 20): Promise<OrdersListResponse> {
  const response = await apiRequest<unknown>(`orders?page=${page}&limit=${limit}`);
  return normalizeList(response);
}

export async function getOrderDetail(id: string): Promise<OrderDetail | null> {
  const response = await apiRequest<unknown>(`orders/${id}`);
  return normalizeOrder(unwrap(response));
}

function normalizeList(response: unknown): OrdersListResponse {
  const raw = unwrap(response) as Record<string, unknown> | null;
  const rows = Array.isArray(raw?.data) ? raw.data : [];

  return {
    page: asNumber(raw?.page) ?? 1,
    limit: asNumber(raw?.limit) ?? 20,
    total: asNumber(raw?.total) ?? rows.length,
    data: rows.map((item) => normalizeOrder(item)).filter((item): item is OrderDetail => !!item)
  };
}

function normalizeOrder(raw: unknown): OrderDetail | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  const id = asString(data.id) ?? asString(data.orderId);
  if (!id) return null;

  const totals = asObject(data.totals);
  const items = Array.isArray(data.items) ? data.items : [];

  return {
    id,
    status: asString(data.status) ?? 'created',
    subtotal: asNumber(data.subtotal) ?? asNumber(totals?.subtotal),
    total: asNumber(data.total) ?? asNumber(totals?.total),
    createdAt: asString(data.createdAt) ?? asString(data.created_at),
    addressId: asString(data.addressId),
    deliveryMode: asDeliveryMode(data.deliveryMode),
    slotStart: asString(data.slotStart),
    slotEnd: asString(data.slotEnd),
    note: asString(data.note),
    items: items.map((item) => normalizeItem(item)).filter((item): item is OrderItem => !!item)
  };
}

function normalizeItem(raw: unknown): OrderItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  const qty = asNumber(data.qty) ?? asNumber(data.quantity) ?? 1;
  const unitPrice = asNumber(data.unitPrice) ?? asNumber(data.price) ?? 0;

  return {
    id: asString(data.id),
    name: asString(data.name) ?? asString(data.productName) ?? 'Producto',
    qty,
    unitPrice,
    total: asNumber(data.total)
  };
}

function unwrap(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const data = (raw as Record<string, unknown>).data;
  return data ?? raw;
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
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

function asDeliveryMode(value: unknown): DeliveryMode | undefined {
  if (value !== 'not_defined' && value !== 'own' && value !== 'third_party' && value !== 'pickup') {
    return undefined;
  }
  return value;
}
