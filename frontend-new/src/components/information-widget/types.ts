import type { ReactNode } from 'react';

export const InformationWidgetFieldTypes = {
  Text: 'Text',
  Currency: 'Currency',
  Date: 'Date',
  Datetime: 'Datetime',
  Boolean: 'Boolean',
  MobileNumber: 'MobileNumber',
  Custom: 'Custom',
} as const;
export type InformationWidgetFieldTypes =
  (typeof InformationWidgetFieldTypes)[keyof typeof InformationWidgetFieldTypes];

export interface IInformationWidgetField {
  type: InformationWidgetFieldTypes;
  name: string;
  title: string;
  description?: string;
  // Half-width = 'half', third-width = 'third', full-width = 'full'. Phones
  // always go full-width; the hint takes effect from sm+.
  width?: 'third' | 'half' | 'two-third' | 'full';
  currency?: string;
  // For Custom type — caller supplies the renderer.
  render?: (value: unknown, row: Record<string, unknown>) => ReactNode;
  // Optional inline action (e.g. "Edit" link next to a single field).
  action?: { label: string; onClick: () => void };
}
