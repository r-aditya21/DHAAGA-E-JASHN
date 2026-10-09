// Maps the colour names used in product variants to a display swatch.
// Unknown names fall back to a neutral so a new colour never breaks the UI.
const SWATCHES: Record<string, string> = {
  ivory: '#EFE8DA',
  'warm ivory': '#F8F5EF',
  navy: '#06223C',
  'midnight navy': '#06223C',
  'heritage navy': '#0D3558',
  'midnight blue': '#0A2C4D',
  'sand beige': '#D8C6AA',
  'classic beige': '#D8C6AA',
  beige: '#D8C6AA',
  charcoal: '#2B2B2B',
  'deep charcoal': '#222222',
  slate: '#496174',
  'muted slate': '#496174',
}

export const FALLBACK_SWATCH = '#CFC6B8'

export function colorToHex(name: string): string {
  return SWATCHES[name.trim().toLowerCase()] ?? FALLBACK_SWATCH
}
