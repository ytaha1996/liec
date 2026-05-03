import { DynamicField, DynamicFieldTypes } from '../../components/dynamic-widget';

export const buildCustomerFields = (
  initial?: Record<string, any>,
): Record<string, DynamicFieldTypes> => ({
  name: {
    type: DynamicField.TEXT,
    name: 'name',
    title: 'Name',
    required: true,
    disabled: false,
    value: initial?.name ?? '',
  },
  primaryPhone: {
    type: DynamicField.PHONENUMBER,
    name: 'primaryPhone',
    title: 'Primary Phone',
    required: true,
    disabled: false,
    value: initial?.primaryPhone ?? '',
  },
  email: {
    type: DynamicField.EMAIL,
    name: 'email',
    title: 'Email',
    required: false,
    disabled: false,
    value: initial?.email ?? '',
  } as any,
  companyName: {
    type: DynamicField.TEXT,
    name: 'companyName',
    title: 'Company Name',
    required: false,
    disabled: false,
    value: initial?.companyName ?? '',
  },
  taxId: {
    type: DynamicField.TEXT,
    name: 'taxId',
    title: 'Tax ID',
    required: false,
    disabled: false,
    value: initial?.taxId ?? '',
  },
  billingAddress: {
    type: DynamicField.TEXT,
    name: 'billingAddress',
    title: 'Billing Address',
    required: false,
    disabled: false,
    value: initial?.billingAddress ?? '',
  },
  isActive: {
    type: DynamicField.CHECKBOX,
    name: 'isActive',
    title: 'Is Active',
    required: false,
    disabled: false,
    value: initial?.isActive === false || initial?.isActive === 'false' ? false : true,
  },
});
