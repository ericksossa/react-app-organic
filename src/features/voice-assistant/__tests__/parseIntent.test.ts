import { parseIntent } from '../domain/parseIntent';

describe('parseIntent', () => {
  it('detecta SEARCH_PRODUCTS con atributos y entrega', () => {
    const parsed = parseIntent('muéstrame tomates orgánicos para hoy');

    expect(parsed.type).toBe('SEARCH_PRODUCTS');
    expect(parsed.entities.productQuery).toContain('tomates');
    expect(parsed.entities.attributes).toContain('organico');
    expect(parsed.entities.delivery).toBe('hoy');
  });

  it('detecta ADD_TO_CART con cantidad y unidad', () => {
    const parsed = parseIntent('agrega dos kilos de aguacate hass a mi canasta');

    expect(parsed.type).toBe('ADD_TO_CART');
    expect(parsed.entities.quantity).toBe(2);
    expect(parsed.entities.unit).toBe('kg');
    expect(parsed.entities.productQuery).toContain('aguacate');
  });

  it('detecta REPEAT_LAST_ORDER', () => {
    const parsed = parseIntent('repite mi última compra');

    expect(parsed.type).toBe('REPEAT_LAST_ORDER');
    expect(parsed.confidence).toBe('high');
  });

  it('detecta TRACK_ORDER', () => {
    const parsed = parseIntent('dónde va mi pedido');

    expect(parsed.type).toBe('TRACK_ORDER');
    expect(parsed.confidence).toBe('high');
  });

  it('hace fallback a SEARCH_PRODUCTS cuando no reconoce intención', () => {
    const parsed = parseIntent('tomate cherry');

    expect(parsed.type).toBe('SEARCH_PRODUCTS');
    expect(parsed.query).toBe('tomate cherry');
  });

  it('marca requiresConfirmation en baja confianza', () => {
    const parsed = parseIntent('quiero algo');

    expect(parsed.requiresConfirmation).toBe(true);
    expect(parsed.confidence).toBe('low');
  });
});
