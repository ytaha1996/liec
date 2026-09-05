// Field-type union for the config-driven DynamicFormWidget.
// Mirrors `frontend/src/components/dynamic-widget/index.ts` so callers can
// port form configs across by changing the import path.

export const DynamicField = {
  TEXT: 'TEXT',
  TEXTAREA: 'TEXTAREA',
  NUMBER: 'NUMBER',
  CURRENCY: 'CURRENCY',
  PHONENUMBER: 'PHONENUMBER',
  EMAIL: 'EMAIL',
  SELECT: 'SELECT',
  MULTISELECT: 'MULTISELECT',
  CHECKBOX: 'CHECKBOX',
  CHECKBOXLIST: 'CHECKBOXLIST',
  FILE: 'FILE',
  DATE: 'DATE',
  IMAGE: 'IMAGE',
  IMAGELIST: 'IMAGELIST',
  TAGS: 'TAGS',
} as const;
export type DynamicField = (typeof DynamicField)[keyof typeof DynamicField];

interface BaseField {
  name: string;
  title: string;
  required?: boolean;
  disabled?: boolean;
  // Span hints for the underlying responsive grid. Phones always go full width.
  grid?: { sm?: number; md?: number };
  conditionalRequired?: (values: Record<string, unknown>) => boolean;
  conditionalDisable?: (values: Record<string, unknown>) => boolean;
  conditionalHidden?: (values: Record<string, unknown>) => boolean;
  customValidator?: (value: unknown, values: Record<string, unknown>) => string;
}

export interface TextField extends BaseField {
  type: typeof DynamicField.TEXT | typeof DynamicField.EMAIL | typeof DynamicField.CURRENCY;
  value: string;
  regex?: RegExp;
  placeholder?: string;
}

export interface TextAreaField extends BaseField {
  type: typeof DynamicField.TEXTAREA;
  value: string;
  rows?: number;
}

export interface NumberField extends BaseField {
  type: typeof DynamicField.NUMBER;
  value: number | string;
  min?: number;
  max?: number;
  step?: number;
}

export interface PhoneField extends BaseField {
  type: typeof DynamicField.PHONENUMBER;
  value: string;
}

export interface SelectField extends BaseField {
  type: typeof DynamicField.SELECT;
  value: string;
  items: Record<string, string>;
  allowEmpty?: boolean;
}

export interface MultiSelectField extends BaseField {
  type: typeof DynamicField.MULTISELECT;
  value: string[];
  items: Record<string, string>;
}

export interface CheckboxField extends BaseField {
  type: typeof DynamicField.CHECKBOX;
  value: boolean;
  description?: string;
}

export interface CheckboxListField extends BaseField {
  type: typeof DynamicField.CHECKBOXLIST;
  value: string[];
  items: Record<string, string>;
  minOptions?: number;
  maxOptions?: number;
}

export interface DateField extends BaseField {
  type: typeof DynamicField.DATE;
  value: string | null;
  min?: string;
  max?: string;
}

export interface FileField extends BaseField {
  type: typeof DynamicField.FILE;
  value: File | string | null;
  allowedTypes?: number[];
  maxSizeInMbs?: number;
}

export interface ImageField extends BaseField {
  type: typeof DynamicField.IMAGE;
  value: File | string | null;
}

export interface ImageListField extends BaseField {
  type: typeof DynamicField.IMAGELIST;
  value: (File | string)[];
  maxImages?: number;
}

export interface TagsField extends BaseField {
  type: typeof DynamicField.TAGS;
  value: string[];
}

export type DynamicFieldTypes =
  | TextField
  | TextAreaField
  | NumberField
  | PhoneField
  | SelectField
  | MultiSelectField
  | CheckboxField
  | CheckboxListField
  | DateField
  | FileField
  | ImageField
  | ImageListField
  | TagsField;

export type FieldMap = Record<string, DynamicFieldTypes>;
