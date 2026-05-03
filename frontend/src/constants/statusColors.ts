export const BRAND_TEAL = '#00A6A6';
export const BRAND_NAVY = '#243043';
export const BRAND_PURPLE = '#7B5EA7';

export const SHIPMENT_STATUS_CHIPS: Record<string, { color: string; backgroundColor: string }> = {
  Draft:         { color: '#333', backgroundColor: '#e0e0e0' },
  Scheduled:     { color: '#fff', backgroundColor: '#0288d1' },
  ReadyToDepart: { color: '#fff', backgroundColor: '#ed6c02' },
  Departed:      { color: '#fff', backgroundColor: '#1565c0' },
  Arrived:       { color: '#fff', backgroundColor: '#2e7d32' },
  Closed:        { color: '#fff', backgroundColor: '#616161' },
  Cancelled:     { color: '#fff', backgroundColor: '#c62828' },
};

export const PKG_STATUS_CHIPS: Record<string, { color: string; backgroundColor: string }> = {
  Draft:                { color: '#333', backgroundColor: '#e0e0e0' },
  Received:             { color: '#fff', backgroundColor: '#0288d1' },
  Packed:               { color: '#fff', backgroundColor: '#7b1fa2' },
  ReadyToShip:          { color: '#fff', backgroundColor: '#ed6c02' },
  Shipped:              { color: '#fff', backgroundColor: '#1565c0' },
  ArrivedAtDestination: { color: '#fff', backgroundColor: '#2e7d32' },
  ReadyForHandout:      { color: '#fff', backgroundColor: '#f57c00' },
  HandedOut:            { color: '#fff', backgroundColor: '#388e3c' },
  Cancelled:            { color: '#fff', backgroundColor: '#c62828' },
};

// yes = green, no = neutral gray (not error red — "no photos yet" is not always an error)
export const BOOL_CHIPS: Record<string, { color: string; backgroundColor: string }> = {
  true:  { color: '#fff', backgroundColor: '#2e7d32' },
  false: { color: '#333', backgroundColor: '#e0e0e0' },
};

export const MEDIA_STAGE_CHIPS: Record<string, { color: string; backgroundColor: string }> = {
  Receiving:  { color: '#fff', backgroundColor: '#0288d1' },
  Departure:  { color: '#fff', backgroundColor: '#ed6c02' },
  Arrival:    { color: '#fff', backgroundColor: '#2e7d32' },
  Other:      { color: '#333', backgroundColor: '#e0e0e0' },
};

export const SUPPLY_ORDER_STATUS_CHIPS: Record<string, { color: string; backgroundColor: string }> = {
  Draft:                { color: '#333', backgroundColor: '#e0e0e0' },
  Approved:             { color: '#fff', backgroundColor: '#0288d1' },
  Ordered:              { color: '#fff', backgroundColor: '#ed6c02' },
  DeliveredToWarehouse: { color: '#fff', backgroundColor: '#0097a7' },
  PackedIntoPackage:    { color: '#fff', backgroundColor: '#7b1fa2' },
  Closed:               { color: '#fff', backgroundColor: '#2e7d32' },
  Cancelled:            { color: '#fff', backgroundColor: '#c62828' },
};

export const PRICING_CONFIG_STATUS_CHIPS: Record<string, { color: string; backgroundColor: string }> = {
  Draft:     { color: '#333', backgroundColor: '#e0e0e0' },
  Scheduled: { color: '#fff', backgroundColor: '#0288d1' },
  Active:    { color: '#fff', backgroundColor: '#2e7d32' },
  Retired:   { color: '#fff', backgroundColor: '#616161' },
};

// Status filter options moved to constants/statusLabels.ts
