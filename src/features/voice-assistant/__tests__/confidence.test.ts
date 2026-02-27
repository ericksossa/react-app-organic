import { scoreConfidence } from '../domain/confidence';
import { ParsedIntent } from '../domain/intents';

function baseIntent(overrides?: Partial<ParsedIntent>): ParsedIntent {
  return {
    type: 'SEARCH_PRODUCTS',
    query: 'busca tomate organico',
    confidence: 'high',
    requiresConfirmation: false,
    entities: {
      productQuery: 'tomate organico',
      attributes: ['organico']
    },
    ...overrides
  };
}

describe('scoreConfidence', () => {
  it('mantiene score alto en catalogo con intent claro', () => {
    const result = scoreConfidence(baseIntent(), 'catalog');
    expect(result.bucket).toBe('high');
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  it('penaliza add_to_cart sin producto', () => {
    const result = scoreConfidence(
      baseIntent({
        type: 'ADD_TO_CART',
        entities: { attributes: [], productQuery: '' }
      }),
      'catalog'
    );

    expect(result.scoreEntities).toBeLessThan(0.5);
    expect(result.bucket).toBe('low');
  });

  it('penaliza contexto checkout', () => {
    const result = scoreConfidence(baseIntent(), 'checkout');
    expect(result.scoreContext).toBeLessThan(0.2);
    expect(result.bucket).toBe('low');
  });

  it('mantiene med para query corta', () => {
    const result = scoreConfidence(
      baseIntent({
        entities: { attributes: [], productQuery: 'pan' },
        confidence: 'med'
      }),
      'voice'
    );

    expect(['med', 'low']).toContain(result.bucket);
  });
});
