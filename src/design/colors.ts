// Minimal color tokens to satisfy the `no inline hex` lint rule until
// setup-design-system lands the full theme provider.
// Values come from project.md §1b.

export const colors = {
  brand500: '#0F766E',
  brand600: '#0E6660',
  bg: '#FAFAF9',
  surface: '#FFFFFF',
  border: '#E7E5E4',
  text: '#0C0A09',
  muted: '#78716C',
  white: '#FFFFFF',
  brandTint: '#0F766E10',
} as const;
