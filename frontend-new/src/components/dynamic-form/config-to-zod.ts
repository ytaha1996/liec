import { z } from 'zod';
import { DynamicField, type FieldMap, type DynamicFieldTypes } from './types';

// Per-field "is empty" check so we can layer the dynamic-required rule on top
// of an otherwise-loose schema. Mirrors the original isEmpty semantics:
// `null`, `undefined`, `''`, and empty arrays count as missing.
const isMissing = (v: unknown): boolean => {
  if (v == null) return true;
  if (typeof v === 'string') return v.length === 0;
  if (Array.isArray(v)) return v.length === 0;
  return false;
};

const baseSchemaFor = (field: DynamicFieldTypes): z.ZodType => {
  switch (field.type) {
    case DynamicField.TEXT:
    case DynamicField.EMAIL:
    case DynamicField.CURRENCY:
    case DynamicField.TEXTAREA:
    case DynamicField.PHONENUMBER:
    case DynamicField.SELECT:
      return z.string().nullable().optional();
    case DynamicField.NUMBER:
      return z.union([z.number(), z.string(), z.null(), z.undefined()]).optional();
    case DynamicField.DATE:
      return z.string().nullable().optional();
    case DynamicField.CHECKBOX:
      return z.boolean().optional();
    case DynamicField.MULTISELECT:
    case DynamicField.CHECKBOXLIST:
    case DynamicField.TAGS:
      return z.array(z.string()).optional();
    case DynamicField.IMAGELIST:
      return z.array(z.any()).optional();
    case DynamicField.FILE:
    case DynamicField.IMAGE:
      return z.any().optional();
    default:
      return z.any().optional();
  }
};

// Build a zod schema from a config map. Dynamic rules (`conditionalRequired`,
// `customValidator`) attach via a single `superRefine` so they all see the full
// values bag — required for fields whose validity depends on a sibling.
export function buildZodSchema(fields: FieldMap): z.ZodType {
  const shape: Record<string, z.ZodType> = {};
  for (const f of Object.values(fields)) {
    shape[f.name] = baseSchemaFor(f);
  }
  return z.object(shape).passthrough().superRefine((values, ctx) => {
    for (const field of Object.values(fields)) {
      // Skip rules for hidden fields — a hidden field can't be "missing".
      if (field.conditionalHidden?.(values as Record<string, unknown>)) continue;

      const value = (values as Record<string, unknown>)[field.name];
      const required =
        field.required ||
        field.conditionalRequired?.(values as Record<string, unknown>) ||
        false;

      if (required && isMissing(value)) {
        ctx.addIssue({
          code: 'custom',
          path: [field.name],
          message: 'Required',
        });
        continue;
      }
      if (isMissing(value)) continue;

      // Field-type-specific shape checks.
      if (field.type === DynamicField.NUMBER) {
        const n = typeof value === 'number' ? value : parseFloat(String(value));
        if (Number.isNaN(n)) {
          ctx.addIssue({ code: 'custom', path: [field.name], message: 'Invalid number' });
          continue;
        }
        if (field.min != null && n < field.min) {
          ctx.addIssue({
            code: 'custom',
            path: [field.name],
            message: `Minimum value is ${field.min}`,
          });
        }
        if (field.max != null && n > field.max) {
          ctx.addIssue({
            code: 'custom',
            path: [field.name],
            message: `Maximum value is ${field.max}`,
          });
        }
      }

      if (field.type === DynamicField.TEXT && field.regex && typeof value === 'string') {
        if (!field.regex.test(value)) {
          ctx.addIssue({
            code: 'custom',
            path: [field.name],
            message: `Invalid ${field.title}`,
          });
        }
      }

      if (field.type === DynamicField.EMAIL && typeof value === 'string') {
        // Permissive on purpose — matches the backend's .EmailAddress() which
        // accepts dotless intranet domains (e.g. the seed admin "admin@local").
        const re = /^[^\s@]+@[^\s@]+$/;
        if (!re.test(value)) {
          ctx.addIssue({ code: 'custom', path: [field.name], message: 'Invalid email' });
        }
      }

      if (field.type === DynamicField.CHECKBOXLIST) {
        const arr = value as string[];
        if (field.minOptions != null && arr.length < field.minOptions) {
          ctx.addIssue({
            code: 'custom',
            path: [field.name],
            message: `Pick at least ${field.minOptions}`,
          });
        }
        if (field.maxOptions != null && arr.length > field.maxOptions) {
          ctx.addIssue({
            code: 'custom',
            path: [field.name],
            message: `Pick at most ${field.maxOptions}`,
          });
        }
      }

      if (field.type === DynamicField.FILE && value instanceof File && field.maxSizeInMbs) {
        if (value.size > field.maxSizeInMbs * 1024 * 1024) {
          ctx.addIssue({
            code: 'custom',
            path: [field.name],
            message: `Max file size is ${field.maxSizeInMbs} MB`,
          });
        }
      }

      if (field.customValidator) {
        const msg = field.customValidator(value, values as Record<string, unknown>);
        if (msg) {
          ctx.addIssue({ code: 'custom', path: [field.name], message: msg });
        }
      }
    }
  });
}

export function extractDefaults(fields: FieldMap): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of Object.values(fields)) out[f.name] = f.value;
  return out;
}

// Mirrors the existing helper — DATE fields go out as `YYYY-MM-DD`.
export function prepareValuesForSubmission(
  values: Record<string, unknown>,
  fields: FieldMap,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...values };
  for (const f of Object.values(fields)) {
    if (f.type === DynamicField.DATE && typeof out[f.name] === 'string') {
      const v = out[f.name] as string;
      out[f.name] = v.length >= 10 ? v.slice(0, 10) : v;
    }
  }
  return out;
}
