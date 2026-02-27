import { collapseSpaces, normalizeText, parseQuantityAndUnit, removeDiacritics } from '../domain/normalization';

describe('normalization', () => {
  it('removeDiacritics elimina acentos', () => {
    expect(removeDiacritics('aguacate húmedo')).toBe('aguacate humedo');
  });

  it('collapseSpaces compacta espacios', () => {
    expect(collapseSpaces('  tomate   cherry   ')).toBe('tomate cherry');
  });

  it('normalizeText aplica lower + espacios + diacríticos', () => {
    expect(normalizeText('  MÉZCLA   Orgánica  ')).toBe('mezcla organica');
  });

  it('parsea media docena como 6 unidades', () => {
    expect(parseQuantityAndUnit('agrega media docena de limones')).toEqual({ quantity: 6, unit: 'unidad' });
  });

  it('parsea cantidad en palabras y unidad manojos', () => {
    expect(parseQuantityAndUnit('agrega dos manojos de cilantro')).toEqual({ quantity: 2, unit: 'manojo' });
  });

  it('parsea unidad libras', () => {
    expect(parseQuantityAndUnit('agrega 2 libras de papa')).toEqual({ quantity: 2, unit: 'lb' });
  });
});
