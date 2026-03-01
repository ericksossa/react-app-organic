export type RhinoActionInference = {
  isUnderstood?: boolean;
  intent?: string;
  slots?: Record<string, string>;
};

export type RhinoActionHandlers = {
  onSearchProducts: (query: string) => Promise<void> | void;
  onAddToCart: (query: string, qty: number) => Promise<void> | void;
  onOpenCart?: () => Promise<void> | void;
  onRemoveFromCart?: (query: string, qty?: number) => Promise<void> | void;
  onClearCart?: () => Promise<void> | void;
};

export type RhinoActionResult = {
  ok: boolean;
  reason?: 'not_understood' | 'unsupported_intent' | 'missing_product_slot' | 'product_not_found' | 'execution_error';
  action?: 'search' | 'add_to_cart' | 'open_cart' | 'remove_from_cart' | 'clear_cart';
  normalizedIntent?: string;
  normalizedSlots?: Record<string, string>;
};

function normalizeValue(value?: string): string {
  return (value ?? '').trim().toLowerCase();
}

function normalizeSlots(slots?: Record<string, string>): Record<string, string> {
  const next: Record<string, string> = {};
  if (!slots) return next;

  for (const [key, value] of Object.entries(slots)) {
    const normalizedKey = normalizeValue(key);
    const normalizedSlotValue = (value ?? '').trim();
    if (!normalizedKey || !normalizedSlotValue) continue;
    next[normalizedKey] = normalizedSlotValue;
  }

  return next;
}

function readProduct(slots: Record<string, string>): string {
  return (
    slots.producto ??
    slots.product ??
    slots.item ??
    slots.query ??
    ''
  ).trim();
}

function readQty(slots: Record<string, string>): number {
  const raw = (slots.cantidad ?? slots.quantity ?? slots.qty ?? '').trim();
  if (!raw) return 1;
  const normalized = raw.toLowerCase().trim();

  const wordToQty: Record<string, number> = {
    uno: 1,
    un: 1,
    una: 1,
    dos: 2,
    tres: 3,
    cuatro: 4
  };

  if (wordToQty[normalized]) return wordToQty[normalized];
  if (normalized.includes('kilo') || normalized.includes('libra')) return 1;

  const value = Number(normalized.replace(',', '.'));
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.floor(value));
}

function normalizeIntent(intent?: string): string {
  return normalizeValue(intent).replace(/\s+/g, '_');
}

export async function executeRhinoAction(
  inference: RhinoActionInference,
  handlers: RhinoActionHandlers
): Promise<RhinoActionResult> {
  if (!inference.isUnderstood) {
    return { ok: false, reason: 'not_understood' };
  }

  const normalizedIntent = normalizeIntent(inference.intent);
  const normalizedSlots = normalizeSlots(inference.slots);

  if (normalizedIntent === 'buscarproducto' || normalizedIntent === 'buscar_producto' || normalizedIntent === 'search_products') {
    const query = readProduct(normalizedSlots);
    if (!query) return { ok: false, reason: 'missing_product_slot', normalizedIntent, normalizedSlots };

    try {
      await handlers.onSearchProducts(query);
      return { ok: true, action: 'search', normalizedIntent, normalizedSlots };
    } catch {
      return { ok: false, reason: 'execution_error', normalizedIntent, normalizedSlots };
    }
  }

  if (
    normalizedIntent === 'agregarcarrito' ||
    normalizedIntent === 'agregar_carrito' ||
    normalizedIntent === 'agregarcanasta' ||
    normalizedIntent === 'agregar_canasta' ||
    normalizedIntent === 'add_to_cart'
  ) {
    const query = readProduct(normalizedSlots);
    if (!query) return { ok: false, reason: 'missing_product_slot', normalizedIntent, normalizedSlots };

    try {
      await handlers.onAddToCart(query, readQty(normalizedSlots));
      return { ok: true, action: 'add_to_cart', normalizedIntent, normalizedSlots };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('product_not_found')) {
        return { ok: false, reason: 'product_not_found', normalizedIntent, normalizedSlots };
      }
      return { ok: false, reason: 'execution_error', normalizedIntent, normalizedSlots };
    }
  }

  if (
    normalizedIntent === 'abrircarrito' ||
    normalizedIntent === 'abrir_carrito' ||
    normalizedIntent === 'abrircanasta' ||
    normalizedIntent === 'abrir_canasta' ||
    normalizedIntent === 'open_cart'
  ) {
    if (!handlers.onOpenCart) return { ok: false, reason: 'unsupported_intent', normalizedIntent, normalizedSlots };
    await handlers.onOpenCart();
    return { ok: true, action: 'open_cart', normalizedIntent, normalizedSlots };
  }

  if (
    normalizedIntent === 'quitarcarrito' ||
    normalizedIntent === 'quitar_carrito' ||
    normalizedIntent === 'quitarcanasta' ||
    normalizedIntent === 'quitar_canasta' ||
    normalizedIntent === 'remove_from_cart'
  ) {
    if (!handlers.onRemoveFromCart) return { ok: false, reason: 'unsupported_intent', normalizedIntent, normalizedSlots };
    const query = readProduct(normalizedSlots);
    await handlers.onRemoveFromCart(query, readQty(normalizedSlots));
    return { ok: true, action: 'remove_from_cart', normalizedIntent, normalizedSlots };
  }

  if (
    normalizedIntent === 'vaciarcarrito' ||
    normalizedIntent === 'vaciar_carrito' ||
    normalizedIntent === 'vaciarcanasta' ||
    normalizedIntent === 'vaciar_canasta' ||
    normalizedIntent === 'clear_cart'
  ) {
    if (!handlers.onClearCart) return { ok: false, reason: 'unsupported_intent', normalizedIntent, normalizedSlots };
    await handlers.onClearCart();
    return { ok: true, action: 'clear_cart', normalizedIntent, normalizedSlots };
  }

  return { ok: false, reason: 'unsupported_intent', normalizedIntent, normalizedSlots };
}
