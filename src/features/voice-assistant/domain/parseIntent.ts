import { ParsedEntities, ParsedIntent, VoiceIntentType } from './intents';
import { normalizeText, parseQuantityAndUnit } from './normalization';

const ADD_TO_CART_PATTERN = /(agrega|agregame|añade|anade|pon|suma).*(canasta|carrito|cesta)?/;
const REPEAT_ORDER_PATTERN = /(repite|repetir).*(ultima|última).*(compra|orden|pedido)/;
const TRACK_ORDER_PATTERN = /(donde|dónde).*(pedido|orden)|estado.*(pedido|orden)|rastrea.*(pedido|orden)/;
const SEARCH_PATTERN = /(busca|buscar|muestrame|muéstrame|quiero|necesito|traeme|tráeme|encuentra)/;
const LOW_CONFIDENCE_TERMS = /(algo|cosas|productos|mercado|comida)/;

function extractAttributes(normalized: string): ParsedEntities['attributes'] {
  const attrs: ParsedEntities['attributes'] = [];
  if (/organico|organica/.test(normalized)) attrs.push('organico');
  if (/sin quimicos|sin quimico|sin pesticidas/.test(normalized)) attrs.push('sin_quimicos');
  return attrs;
}

function extractSort(normalized: string): ParsedEntities['sort'] {
  if (/mas barato|más barato|economico|económico/.test(normalized)) return 'price_asc';
  if (/mejor calificado|mejor valorado|top/.test(normalized)) return 'rating_desc';
  return undefined;
}

function extractDelivery(normalized: string): ParsedEntities['delivery'] {
  if (/\bhoy\b/.test(normalized)) return 'hoy';
  if (/\bmanana\b|\bmañana\b/.test(normalized)) return 'manana';
  return undefined;
}

function extractProductQuery(original: string, normalized: string, type: VoiceIntentType): string {
  if (type === 'REPEAT_LAST_ORDER' || type === 'TRACK_ORDER') return original.trim();

  const stopWords = [
    'agrega',
    'agregame',
    'añade',
    'anade',
    'pon',
    'suma',
    'busca',
    'buscar',
    'muestrame',
    'muéstrame',
    'quiero',
    'necesito',
    'traeme',
    'tráeme',
    'encuentra',
    'de',
    'en',
    'mi',
    'el',
    'la',
    'los',
    'las',
    'al',
    'a',
    'canasta',
    'carrito',
    'cesta',
    'pedido',
    'kilo',
    'kilos',
    'kg',
    'gramo',
    'gramos',
    'g',
    'libra',
    'libras',
    'lb',
    'unidad',
    'unidades',
    'manojo',
    'manojos',
    'media',
    'docena'
  ];

  const parts = normalized
    .split(/\s+/)
    .filter((token) => token.length > 1 && !stopWords.includes(token) && !/^[\d.,]+$/.test(token));

  const parsed = parts.join(' ').trim();
  return parsed || original.trim();
}

function detectIntent(normalized: string): VoiceIntentType {
  if (REPEAT_ORDER_PATTERN.test(normalized)) return 'REPEAT_LAST_ORDER';
  if (TRACK_ORDER_PATTERN.test(normalized)) return 'TRACK_ORDER';
  if (ADD_TO_CART_PATTERN.test(normalized)) return 'ADD_TO_CART';
  if (SEARCH_PATTERN.test(normalized)) return 'SEARCH_PRODUCTS';
  return 'SEARCH_PRODUCTS';
}

function confidenceFor(normalized: string, productQuery: string, intent: VoiceIntentType): ParsedIntent['confidence'] {
  if (intent === 'REPEAT_LAST_ORDER' || intent === 'TRACK_ORDER') return 'high';
  if (!productQuery || productQuery.length < 3) return 'low';
  if (LOW_CONFIDENCE_TERMS.test(normalized)) return 'low';
  if (productQuery.split(/\s+/).length <= 1) return 'med';
  return 'high';
}

export function parseIntent(transcript: string): ParsedIntent {
  const safeTranscript = transcript.trim();
  const normalized = normalizeText(safeTranscript);
  const type = detectIntent(normalized);

  const productQuery = extractProductQuery(safeTranscript, normalized, type);
  const qtyUnit = parseQuantityAndUnit(normalized);
  const entities: ParsedEntities = {
    productQuery,
    quantity: qtyUnit.quantity,
    unit: qtyUnit.unit,
    attributes: extractAttributes(normalized),
    sort: extractSort(normalized),
    delivery: extractDelivery(normalized)
  };

  const confidence = confidenceFor(normalized, productQuery, type);
  const requiresConfirmation =
    confidence === 'low' ||
    (type === 'SEARCH_PRODUCTS' && productQuery.length < 3) ||
    (type === 'ADD_TO_CART' && !entities.productQuery);

  return {
    type,
    query: safeTranscript,
    confidence,
    requiresConfirmation,
    entities
  };
}
