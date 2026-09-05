import { DynamicField, type FieldMap } from '@/components/dynamic-form';

export const buildCustomerFields = (initial?: Record<string, unknown>): FieldMap => ({
  name: {
    type: DynamicField.TEXT,
    name: 'name',
    title: 'Name',
    required: true,
    value: (initial?.name as string) ?? '',
    grid: { sm: 12, md: 6 },
  },
  primaryPhone: {
    type: DynamicField.PHONENUMBER,
    name: 'primaryPhone',
    title: 'Primary Phone',
    required: true,
    value: (initial?.primaryPhone as string) ?? '',
    grid: { sm: 6, md: 6 },
  },
  email: {
    type: DynamicField.EMAIL,
    name: 'email',
    title: 'Email',
    value: (initial?.email as string) ?? '',
    grid: { sm: 6, md: 6 },
  },
  companyName: {
    type: DynamicField.TEXT,
    name: 'companyName',
    title: 'Company Name',
    value: (initial?.companyName as string) ?? '',
    grid: { sm: 6, md: 6 },
  },
  taxId: {
    type: DynamicField.TEXT,
    name: 'taxId',
    title: 'Tax ID',
    value: (initial?.taxId as string) ?? '',
    grid: { sm: 6, md: 6 },
  },
  billingAddress: {
    type: DynamicField.TEXT,
    name: 'billingAddress',
    title: 'Billing Address',
    value: (initial?.billingAddress as string) ?? '',
    grid: { sm: 12, md: 12 },
  },
  isActive: {
    type: DynamicField.CHECKBOX,
    name: 'isActive',
    title: 'Active',
    value:
      initial?.isActive === false || initial?.isActive === 'false' ? false : true,
  },
});
