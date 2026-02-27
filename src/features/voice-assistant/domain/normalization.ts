import { ParsedEntities } from './intents';

const WORD_NUMBERS: Record<string, number> = {
  un: 1,
  uno: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  media: 0.5
};

export function removeDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function collapseSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function normalizeText(value: string): string {
  return collapseSpaces(removeDiacritics(value).toLowerCase());
}

export function parseQuantityAndUnit(normalizedText: string): {
  quantity?: number;
  unit?: ParsedEntities['unit'];
} {
  if (/media\s+docena/.test(normalizedText)) {
    return { quantity: 6, unit: 'unidad' };
  }

  const numeric = normalizedText.match(/\b(\d{1,3})(?:[\.,](\d+))?\b/);
  const wordToken = normalizedText
    .split(/\s+/)
    .find((part) => Object.prototype.hasOwnProperty.call(WORD_NUMBERS, part));

  let quantity = numeric?.[1] ? Number(numeric[1]) : undefined;
  if (!quantity && wordToken) quantity = WORD_NUMBERS[wordToken];

  let unit: ParsedEntities['unit'];
  if (/\b(kilo|kilos|kg)\b/.test(normalizedText)) unit = 'kg';
  else if (/\b(gr|gramo|gramos|g)\b/.test(normalizedText)) unit = 'g';
  else if (/\b(lb|libra|libras)\b/.test(normalizedText)) unit = 'lb';
  else if (/\b(manojo|manojos)\b/.test(normalizedText)) unit = 'manojo';
  else if (/\b(unidad|unidades|u)\b/.test(normalizedText)) unit = 'unidad';

  return { quantity, unit };
}
