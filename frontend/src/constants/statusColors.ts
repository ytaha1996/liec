export const BRAND_TEAL = '#00A6A6';
export const BRAND_NAVY = '#243043';
export const BRAND_PURPLE = '#7B5EA7';

// Semantic palette — every chip background pulls from one of these 7 hexes.
// Keeps the visual language tight: at most TWO blues across the whole UI
// (info-blue for "early" and brand-navy for "in-transit"), distinct enough
// to read as separate states.
const C_DRAFT_BG    = '#e0e0e0'; const C_DRAFT_FG    = '#333';     // pre-action
const C_EARLY       = '#0288d1';                                   // info-blue: early-stage in-progress
const C_ACTIVE      = '#ed6c02';                                   // warning-orange: active stage
const C_TRANSIT     = BRAND_NAVY;                                  // in-transit
const C_COMPLETE    = '#2e7d32';                                   // success-green
const C_RETIRED     = '#616161';                                   // neutral-closed
const C_CANCELLED   = '#c62828';                                   // error-red
const ON_DARK       = '#fff';

export const SHIPMENT_STATUS_CHIPS: Record<string, { color: string; backgroundColor: string }> = {
  Draft:         { color: C_DRAFT_FG, backgroundColor: C_DRAFT_BG },
  Scheduled:     { color: ON_DARK,    backgroundColor: C_EARLY },
  ReadyToDepart: { color: ON_DARK,    backgroundColor: C_ACTIVE },
  Departed:      { color: ON_DARK,    backgroundColor: C_TRANSIT },
  Arrived:       { color: ON_DARK,    backgroundColor: C_COMPLETE },
  Closed:        { color: ON_DARK,    backgroundColor: C_RETIRED },
  Cancelled:     { color: ON_DARK,    backgroundColor: C_CANCELLED },
};

export const PKG_STATUS_CHIPS: Record<string, { color: string; backgroundColor: string }> = {
  Draft:                { color: C_DRAFT_FG, backgroundColor: C_DRAFT_BG },
  Received:             { color: ON_DARK,    backgroundColor: C_EARLY },
  Packed:               { color: ON_DARK,    backgroundColor: C_ACTIVE },
  ReadyToShip:          { color: ON_DARK,    backgroundColor: C_ACTIVE },
  Shipped:              { color: ON_DARK,    backgroundColor: C_TRANSIT },
  ArrivedAtDestination: { color: ON_DARK,    backgroundColor: C_COMPLETE },
  ReadyForHandout:      { color: ON_DARK,    backgroundColor: C_ACTIVE },
  HandedOut:            { color: ON_DARK,    backgroundColor: C_COMPLETE },
  Cancelled:            { color: ON_DARK,    backgroundColor: C_CANCELLED },
};

// yes = green, no = neutral gray (not error red — "no photos yet" is not always an error)
export const BOOL_CHIPS: Record<string, { color: string; backgroundColor: string }> = {
  true:  { color: ON_DARK,    backgroundColor: C_COMPLETE },
  false: { color: C_DRAFT_FG, backgroundColor: C_DRAFT_BG },
};

export const MEDIA_STAGE_CHIPS: Record<string, { color: string; backgroundColor: string }> = {
  Receiving:  { color: ON_DARK,    backgroundColor: C_EARLY },
  Departure:  { color: ON_DARK,    backgroundColor: C_ACTIVE },
  Arrival:    { color: ON_DARK,    backgroundColor: C_COMPLETE },
  Other:      { color: C_DRAFT_FG, backgroundColor: C_DRAFT_BG },
};

export const SUPPLY_ORDER_STATUS_CHIPS: Record<string, { color: string; backgroundColor: string }> = {
  Draft:                { color: C_DRAFT_FG, backgroundColor: C_DRAFT_BG },
  Approved:             { color: ON_DARK,    backgroundColor: C_EARLY },
  Ordered:              { color: ON_DARK,    backgroundColor: C_ACTIVE },
  DeliveredToWarehouse: { color: ON_DARK,    backgroundColor: C_TRANSIT },
  PackedIntoPackage:    { color: ON_DARK,    backgroundColor: C_COMPLETE },
  Closed:               { color: ON_DARK,    backgroundColor: C_RETIRED },
  Cancelled:            { color: ON_DARK,    backgroundColor: C_CANCELLED },
};

export const PRICING_CONFIG_STATUS_CHIPS: Record<string, { color: string; backgroundColor: string }> = {
  Draft:     { color: C_DRAFT_FG, backgroundColor: C_DRAFT_BG },
  Scheduled: { color: ON_DARK,    backgroundColor: C_EARLY },
  Active:    { color: ON_DARK,    backgroundColor: C_COMPLETE },
  Retired:   { color: ON_DARK,    backgroundColor: C_RETIRED },
};

// Status filter options moved to constants/statusLabels.ts
