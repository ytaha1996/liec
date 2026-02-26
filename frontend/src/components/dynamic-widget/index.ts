import dayjs from 'dayjs';
import { FileType } from '../../helpers/file-utils';
import { formatDate } from '../../helpers/formatting-utils';
import { isEmpty } from '../../helpers/validation-utils';

export enum DynamicField {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  CURRENCY = 'CURRENCY',
  PHONENUMBER = 'PHONENUMBER',
  SELECT = 'SELECT',
  MULTISELECT = 'MULTISELECT',
  RADIOGROUP = 'RADIOGROUP',
  CHECKBOX = 'CHECKBOX',
  CHECKBOXLIST = 'CHECKBOXLIST',
  TEXTAREA = 'TEXTAREA',
  FILE = 'FILE',
  DATE = 'DATE',
  EMAIL = "EMAIL",
  IMAGE = 'IMAGE',
  IMAGELIST = 'IMAGELIST',
  TAGS = 'TAGS',
}

export interface IDynamicBaseField {
  type: DynamicField;
  name: string;
  title: string;
  required: boolean;
  disabled: boolean;
  value: any;
  grid?: Record<string, number>;
  customValidator?: (v: any) => string;
  conditionalDisable?: (values?: Record<string, any>) => boolean;
  conditionalHidden?: (values?: Record<string, any>) => boolean;
  conditionalRequired?: (values: Record<string, any>) => boolean;
}

export interface IDynamicTextField extends IDynamicBaseField {
  type: DynamicField.TEXT;
  regex?: RegExp;
  minChars?: number;
  maxChars?: number;
  inputType?: string;
}

export interface IDynamicTextAreaField extends IDynamicBaseField {
  type: DynamicField.TEXTAREA;
  regex?: RegExp;
  minChars?: number;
  maxChars?: number;
}

export interface IDynamicPhoneNumbeField extends IDynamicBaseField {
  type: DynamicField.PHONENUMBER;
}

export interface IDynamicNumberField extends IDynamicBaseField {
  type: DynamicField.NUMBER;
  min?: number;
  max?: number;
}

export interface IDynamicCurrencyField extends IDynamicBaseField {
  type: DynamicField.CURRENCY;
  min?: number;
  max?: number;
}

export interface IDynamicSelectField extends IDynamicBaseField {
  type: DynamicField.SELECT;
  minOptions?: number;
  maxOptions?: number;
  items: Record<string, string>;
  value: string | string[];
}

export interface IDynamicMultiSelectField extends IDynamicBaseField {
  type: DynamicField.MULTISELECT;
  minOptions?: number;
  maxOptions?: number;
  items: Record<string, string>;
  value: string[];
}

export interface IDynamicRadioGroupField extends IDynamicBaseField {
  type: DynamicField.RADIOGROUP;
  items: Record<string, string>;
  value: string;
}

export interface IDynamicCheckboxField extends IDynamicBaseField {
  type: DynamicField.CHECKBOX;
  value: boolean;
}

export interface IDynamicCheckboxListField extends IDynamicBaseField {
  type: DynamicField.CHECKBOXLIST;
  minOptions?: number;
  maxOptions?: number;
  items: Record<string, string>;
  value: string[];
}

export interface IDynamicFileField extends IDynamicBaseField {
  value: string | File;
  maxSizeInMbs?: number;
  allowedTypes: FileType[];
  type: DynamicField.FILE;
}

export interface IDynamiDatePickerField extends IDynamicBaseField {
  type: DynamicField.DATE;
  min?: Date;
  max?: Date;
}

export interface IDynamicImageField extends IDynamicBaseField {
  type: DynamicField.IMAGE;
}

export interface IDynamicImageListField extends IDynamicBaseField {
  type: DynamicField.IMAGELIST;
  value: string[];
  maxImages?: number;
}

export interface IDynamicTagsField extends IDynamicBaseField {
  type: DynamicField.TAGS;
  value: string[];
}

export type DynamicFieldTypes =
  | IDynamicTextField
  | IDynamicNumberField
  | IDynamicCurrencyField
  | IDynamicTextAreaField
  | IDynamicSelectField
  | IDynamicMultiSelectField
  | IDynamicRadioGroupField
  | IDynamicCheckboxField
  | IDynamicCheckboxListField
  | IDynamicPhoneNumbeField
  | IDynamicFileField
  | IDynamiDatePickerField
  | IDynamicImageField
  | IDynamicImageListField
  | IDynamicTagsField;


export const prepareValuesForSubmission = (data: Record<string, any>, fields: Record<string, DynamicFieldTypes>): Record<string, any> => {
  var result: Record<string, any> = { ...data };
  Object.keys(fields).forEach(k => {
    if (fields[k].type === DynamicField.DATE) {
      if (!isEmpty(data[k]) && dayjs(data[k] as any).isValid()) {
        result[k] = formatDate(data[k], "YYYY-MM-DD");
      }
    }
  });
  return result;
}
