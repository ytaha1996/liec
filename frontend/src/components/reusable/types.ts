import { ReactNode } from 'react';

export type FieldType = 'text' | 'number' | 'date' | 'select' | 'switch' | 'multiline';

export type Option<T = any> = { label: string; value: T };

export type GenericField<T extends Record<string, any>> = {
  key: keyof T;
  label: string;
  type?: FieldType;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  options?: Option[];
  min?: number;
  max?: number;
  helperText?: string;
  formatter?: (value: any, row?: T) => string;
};

export type ColumnType = 'text' | 'number' | 'date' | 'boolean' | 'currency' | 'custom';

export type GenericColumn<T extends Record<string, any>> = {
  key: keyof T | string;
  header: string;
  type?: ColumnType;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  currency?: string;
  formatter?: (value: any, row: T) => ReactNode;
};

export type RowAction<T extends Record<string, any>> = {
  label: string;
  color?: 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
  variant?: 'text' | 'outlined' | 'contained';
  onClick: (row: T) => void;
  visible?: (row: T) => boolean;
  disabled?: (row: T) => boolean;
};
