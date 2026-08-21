import type { ReactNode } from 'react';
import type { ChipColors } from '@/constants/statusColors';

export const EnhancedTableColumnType = {
  TEXT: 'TEXT',
  NUMBER: 'NUMBER',
  DATE: 'DATE',
  DATETIME: 'DATETIME',
  COLORED_CHIP: 'COLORED_CHIP',
  LINK: 'LINK',
  Clickable: 'Clickable',
  CURRENCY: 'CURRENCY',
  PhoneNumber: 'PhoneNumber',
  Action: 'Action',
  CUSTOM: 'CUSTOM',
} as const;
export type EnhancedTableColumnType =
  (typeof EnhancedTableColumnType)[keyof typeof EnhancedTableColumnType];

export type Order = 'asc' | 'desc';

interface BaseHeader {
  id: string;
  label: string;
  numeric?: boolean;
  disablePadding?: boolean;
}

export interface TextHeader extends BaseHeader {
  type:
    | typeof EnhancedTableColumnType.TEXT
    | typeof EnhancedTableColumnType.NUMBER
    | typeof EnhancedTableColumnType.DATE
    | typeof EnhancedTableColumnType.DATETIME
    | typeof EnhancedTableColumnType.CURRENCY
    | typeof EnhancedTableColumnType.PhoneNumber;
  currency?: string;
}

export interface ChipHeader extends BaseHeader {
  type: typeof EnhancedTableColumnType.COLORED_CHIP;
  chipColors?: Record<string, ChipColors>;
  chipLabels?: Record<string, string>;
  // When set, the chip background looks up `row[chipValueKey]` and the cell
  // value itself becomes the label (used by capacity bars + ratio cells).
  chipValueKey?: string;
}

export interface LinkHeader extends BaseHeader {
  type: typeof EnhancedTableColumnType.LINK;
  url: (row: Record<string, unknown>) => string;
}

export interface ClickableHeader extends BaseHeader {
  type: typeof EnhancedTableColumnType.Clickable;
  onClick: (rowId: string, row: Record<string, unknown>) => void;
}

export interface ActionItem {
  icon: ReactNode;
  label: string;
  onClick: (rowId: string, row: Record<string, unknown>) => void;
  hidden?: (row: Record<string, unknown>) => boolean;
}

export interface ActionHeader extends BaseHeader {
  type: typeof EnhancedTableColumnType.Action;
  actions: ActionItem[];
}

export interface CustomHeader extends BaseHeader {
  type: typeof EnhancedTableColumnType.CUSTOM;
  render: (row: Record<string, unknown>, rowId: string) => ReactNode;
}

export type EnhanceTableHeaderTypes =
  | TextHeader
  | ChipHeader
  | LinkHeader
  | ClickableHeader
  | ActionHeader
  | CustomHeader;

export type IEnhancedTableHeader = EnhanceTableHeaderTypes;
export type EnhancedTableColoredChipHeader = ChipHeader;
