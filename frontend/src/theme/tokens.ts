// Responsive spacing tokens — apply consistently across pages so phones
// gain back ~16px of horizontal viewport without changing the desktop look.
// Values are MUI spacing units (1 = 8px). Tokens are objects so they map
// directly to `sx={{ px: PAGE_PADDING_X }}`.
export const PAGE_PADDING_X = { xs: 2, sm: 3 } as const;  // 16 / 24 px
export const PAGE_PADDING_Y = { xs: 2, sm: 3 } as const;
export const SECTION_GAP    = { xs: 2, sm: 3 } as const;  // between sections
export const SECTION_PAD    = { xs: 2, sm: 2.5 } as const;
export const TITLE_GAP      = { xs: 1.5, sm: 2 } as const;
