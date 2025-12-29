/**
 * Romanian Diacritics Utilities - DocumentIulia.ro
 * Handles Romanian character normalization for search and comparison
 */

// Romanian diacritics mapping (both standard and comma-below variants)
const ROMANIAN_DIACRITICS_MAP: Record<string, string> = {
  // Uppercase
  'Ă': 'A', 'Â': 'A',
  'Î': 'I',
  'Ș': 'S', 'Ş': 'S', // Both comma-below and cedilla variants
  'Ț': 'T', 'Ţ': 'T', // Both comma-below and cedilla variants
  // Lowercase
  'ă': 'a', 'â': 'a',
  'î': 'i',
  'ș': 's', 'ş': 's',
  'ț': 't', 'ţ': 't',
};

// Extended map for all common European diacritics
const EXTENDED_DIACRITICS_MAP: Record<string, string> = {
  ...ROMANIAN_DIACRITICS_MAP,
  // German
  'Ä': 'A', 'Ö': 'O', 'Ü': 'U', 'ß': 'ss',
  'ä': 'a', 'ö': 'o', 'ü': 'u',
  // French
  'À': 'A', 'Â': 'A', 'Ç': 'C', 'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
  'Î': 'I', 'Ï': 'I', 'Ô': 'O', 'Ù': 'U', 'Û': 'U', 'Ÿ': 'Y',
  'à': 'a', 'â': 'a', 'ç': 'c', 'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
  'î': 'i', 'ï': 'i', 'ô': 'o', 'ù': 'u', 'û': 'u', 'ÿ': 'y',
  // Spanish
  'Ñ': 'N', 'ñ': 'n',
  // Polish
  'Ą': 'A', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N', 'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z',
  'ą': 'a', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
  // Hungarian
  'Ő': 'O', 'Ű': 'U',
  'ő': 'o', 'ű': 'u',
};

/**
 * Normalize Romanian text by replacing diacritics with ASCII equivalents
 * @param text - Text to normalize
 * @returns Normalized text without diacritics
 */
export function normalizeRomanianText(text: string): string {
  if (!text) return '';

  return text
    .split('')
    .map((char) => ROMANIAN_DIACRITICS_MAP[char] || char)
    .join('')
    .toLowerCase();
}

/**
 * Normalize text with extended European diacritics support
 * @param text - Text to normalize
 * @returns Normalized text without diacritics
 */
export function normalizeEuropeanText(text: string): string {
  if (!text) return '';

  return text
    .split('')
    .map((char) => EXTENDED_DIACRITICS_MAP[char] || char)
    .join('')
    .toLowerCase();
}

/**
 * Normalize text using Unicode decomposition (NFD) and removing combining marks
 * More comprehensive but slightly slower
 * @param text - Text to normalize
 * @returns Normalized text
 */
export function normalizeUnicode(text: string): string {
  if (!text) return '';

  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove combining diacritical marks
    .toLowerCase();
}

/**
 * Compare two strings ignoring Romanian diacritics
 * @param a - First string
 * @param b - Second string
 * @returns true if strings match ignoring diacritics
 */
export function compareIgnoringDiacritics(a: string, b: string): boolean {
  return normalizeRomanianText(a) === normalizeRomanianText(b);
}

/**
 * Check if a string contains another string, ignoring diacritics
 * @param haystack - String to search in
 * @param needle - String to search for
 * @returns true if haystack contains needle
 */
export function containsIgnoringDiacritics(haystack: string, needle: string): boolean {
  return normalizeRomanianText(haystack).includes(normalizeRomanianText(needle));
}

/**
 * Create a search-friendly version of text
 * Suitable for indexing and searching
 * @param text - Text to prepare for search
 * @returns Search-ready text
 */
export function prepareForSearch(text: string): string {
  if (!text) return '';

  return normalizeRomanianText(text)
    .replace(/[^\w\s]/g, ' ') // Replace non-alphanumeric with spaces
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();
}

/**
 * Highlight search matches in text, preserving original diacritics
 * @param text - Original text with diacritics
 * @param query - Search query (may or may not have diacritics)
 * @param highlightTag - HTML tag to use for highlighting (default: 'mark')
 * @returns Text with highlighted matches
 */
export function highlightMatches(
  text: string,
  query: string,
  highlightTag: string = 'mark'
): string {
  if (!text || !query) return text;

  const normalizedText = normalizeRomanianText(text);
  const normalizedQuery = normalizeRomanianText(query);

  if (!normalizedQuery) return text;

  const result: string[] = [];
  let lastIndex = 0;
  let searchIndex = normalizedText.indexOf(normalizedQuery);

  while (searchIndex !== -1) {
    // Add text before match
    result.push(text.slice(lastIndex, searchIndex));
    // Add highlighted match (preserving original characters)
    const matchEnd = searchIndex + query.length;
    result.push(`<${highlightTag}>${text.slice(searchIndex, matchEnd)}</${highlightTag}>`);

    lastIndex = matchEnd;
    searchIndex = normalizedText.indexOf(normalizedQuery, lastIndex);
  }

  // Add remaining text
  result.push(text.slice(lastIndex));

  return result.join('');
}

/**
 * Sort an array of strings using Romanian collation rules
 * @param items - Array of strings to sort
 * @param locale - Locale for sorting (default: 'ro')
 * @returns Sorted array
 */
export function sortRomanian<T>(
  items: T[],
  getter: (item: T) => string = (item) => String(item),
  locale: string = 'ro'
): T[] {
  const collator = new Intl.Collator(locale, { sensitivity: 'base' });
  return [...items].sort((a, b) => collator.compare(getter(a), getter(b)));
}

/**
 * Filter items by search query, ignoring diacritics
 * @param items - Array of items to filter
 * @param query - Search query
 * @param getSearchableText - Function to extract searchable text from item
 * @returns Filtered array
 */
export function filterByQuery<T>(
  items: T[],
  query: string,
  getSearchableText: (item: T) => string
): T[] {
  if (!query) return items;

  const normalizedQuery = normalizeRomanianText(query);

  return items.filter((item) => {
    const searchableText = normalizeRomanianText(getSearchableText(item));
    return searchableText.includes(normalizedQuery);
  });
}

/**
 * Romanian-aware fuzzy search scoring
 * @param text - Text to search in
 * @param query - Search query
 * @returns Score from 0 (no match) to 1 (exact match)
 */
export function fuzzySearchScore(text: string, query: string): number {
  if (!text || !query) return 0;

  const normalizedText = normalizeRomanianText(text);
  const normalizedQuery = normalizeRomanianText(query);

  // Exact match
  if (normalizedText === normalizedQuery) return 1;

  // Contains query
  if (normalizedText.includes(normalizedQuery)) {
    return 0.8 + (normalizedQuery.length / normalizedText.length) * 0.2;
  }

  // Starts with query
  if (normalizedText.startsWith(normalizedQuery)) {
    return 0.9;
  }

  // Character-by-character fuzzy match
  let score = 0;
  let queryIndex = 0;

  for (let i = 0; i < normalizedText.length && queryIndex < normalizedQuery.length; i++) {
    if (normalizedText[i] === normalizedQuery[queryIndex]) {
      score += 1;
      queryIndex++;
    }
  }

  return queryIndex === normalizedQuery.length
    ? (score / normalizedText.length) * 0.7
    : 0;
}

// Export Romanian alphabet for reference
export const ROMANIAN_ALPHABET = 'AĂÂBCDEFGHIÎJKLMNOPQRSȘTȚUVWXYZaăâbcdefghiîjklmnopqrsștțuvwxyz';

// Common Romanian business terms that should be searchable
export const ROMANIAN_BUSINESS_TERMS = {
  factura: ['factura', 'facturi', 'facturare'],
  client: ['client', 'clienti', 'clienți'],
  furnizor: ['furnizor', 'furnizori'],
  plata: ['plata', 'plati', 'plăți', 'platit', 'plătit'],
  tva: ['tva', 'taxa pe valoarea adaugata', 'taxă pe valoarea adăugată'],
  anaf: ['anaf', 'administratia nationala de administrare fiscala'],
};
