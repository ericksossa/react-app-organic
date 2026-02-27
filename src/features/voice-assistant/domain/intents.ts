export type VoiceIntentType =
  | 'SEARCH_PRODUCTS'
  | 'ADD_TO_CART'
  | 'REPEAT_LAST_ORDER'
  | 'TRACK_ORDER';

export type ConfidenceBucket = 'low' | 'med' | 'high';

export type ParsedEntities = {
  productQuery?: string;
  quantity?: number;
  unit?: 'kg' | 'g' | 'lb' | 'unidad';
  attributes: Array<'organico' | 'sin_quimicos'>;
  sort?: 'price_asc' | 'rating_desc';
  delivery?: 'hoy' | 'manana';
};

export type ParsedIntent = {
  type: VoiceIntentType;
  query: string;
  confidence: ConfidenceBucket;
  requiresConfirmation: boolean;
  entities: ParsedEntities;
};

export type SearchIntent = ParsedIntent & { type: 'SEARCH_PRODUCTS' };
export type AddToCartIntent = ParsedIntent & { type: 'ADD_TO_CART' };
export type RepeatOrderIntent = ParsedIntent & { type: 'REPEAT_LAST_ORDER' };
export type TrackOrderIntent = ParsedIntent & { type: 'TRACK_ORDER' };
