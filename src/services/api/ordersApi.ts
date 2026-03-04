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
  const root = asObject(response);
  const nested = asObject(root?.data);
  const nestedDeeper = asObject(nested?.data);
  const raw = hasListShape(nestedDeeper) ? nestedDeeper : hasListShape(nested) ? nested : root;
  const rows = extractRows(raw);
  const metaSource = asObject(raw?.meta);

  return {
    page: asNumber(raw?.page) ?? asNumber(metaSource?.page) ?? 1,
    limit: asNumber(raw?.limit) ?? asNumber(metaSource?.limit) ?? 20,
    total: asNumber(raw?.total) ?? asNumber(metaSource?.total) ?? rows.length,
    data: rows.map((item) => normalizeOrder(item)).filter((item): item is OrderDetail => !!item)
  };
}

function normalizeOrder(raw: unknown): OrderDetail | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  const id = asString(data.id) ?? asString(data.orderId) ?? asString(data.order_id) ?? asString(data.uuid);
  if (!id) return null;

  const totals = asObject(data.totals);
  const items =
    (Array.isArray(data.items) && data.items) ||
    (Array.isArray(data.orderItems) && data.orderItems) ||
    [];

  return {
    id,
    status: asString(data.status) ?? asString(data.orderStatus) ?? 'created',
    subtotal: asNumber(data.subtotal) ?? asNumber(totals?.subtotal) ?? asNumber(data.amountSubtotal),
    total: asNumber(data.total) ?? asNumber(totals?.total) ?? asNumber(data.amountTotal),
    createdAt: asString(data.createdAt) ?? asString(data.created_at) ?? asString(data.creationDate),
    addressId: asString(data.addressId) ?? asString(data.address_id),
    deliveryMode: asDeliveryMode(data.deliveryMode),
    slotStart: asString(data.slotStart) ?? asString(data.deliverySlotStart),
    slotEnd: asString(data.slotEnd) ?? asString(data.deliverySlotEnd),
    note: asString(data.note) ?? asString(data.customerNote),
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

function extractRows(raw: Record<string, unknown> | null): unknown[] {
  if (!raw) return [];
  if (Array.isArray(raw.data)) return raw.data;
  if (Array.isArray(raw.orders)) return raw.orders;
  if (Array.isArray(raw.items)) return raw.items;
  if (Array.isArray(raw.results)) return raw.results;

  const nestedData = asObject(raw.data);
  if (nestedData) {
    if (Array.isArray(nestedData.data)) return nestedData.data;
    if (Array.isArray(nestedData.orders)) return nestedData.orders;
    if (Array.isArray(nestedData.items)) return nestedData.items;
    if (Array.isArray(nestedData.results)) return nestedData.results;
  }

  return [];
}

function hasListShape(value: Record<string, unknown> | null): value is Record<string, unknown> {
  if (!value) return false;
  return (
    Array.isArray(value.data) ||
    Array.isArray(value.orders) ||
    Array.isArray(value.items) ||
    Array.isArray(value.results) ||
    typeof value.page !== 'undefined' ||
    typeof value.total !== 'undefined' ||
    value.meta != null
  );
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
