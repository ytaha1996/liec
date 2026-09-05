import { describe, it, expect } from 'vitest';
import { buildZodSchema, extractDefaults, prepareValuesForSubmission } from '../config-to-zod';
import { DynamicField, type FieldMap } from '../types';

/** Collects the messages zod produced, keyed by field. */
function errorsFor(fields: FieldMap, values: Record<string, unknown>): Record<string, string[]> {
  const result = buildZodSchema(fields).safeParse(values);
  if (result.success) return {};
  const out: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0]);
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

const text = (name: string, extra: Record<string, unknown> = {}) =>
  ({ type: DynamicField.TEXT, name, title: name, value: '', ...extra }) as never;

describe('required rules', () => {
  const fields: FieldMap = { code: text('code', { required: true }) };

  it('rejects an empty required field', () => {
    expect(errorsFor(fields, { code: '' }).code).toEqual(['Required']);
    expect(errorsFor(fields, { code: null }).code).toEqual(['Required']);
    expect(errorsFor(fields, {}).code).toEqual(['Required']);
  });

  it('accepts it once filled', () => {
    expect(errorsFor(fields, { code: '4111' })).toEqual({});
  });

  it('treats an empty array as missing', () => {
    const list: FieldMap = {
      tags: { type: DynamicField.TAGS, name: 'tags', title: 'Tags', required: true, value: [] } as never,
    };
    expect(errorsFor(list, { tags: [] }).tags).toEqual(['Required']);
    expect(errorsFor(list, { tags: ['a'] })).toEqual({});
  });

  it('does not treat false or zero as missing', () => {
    // A required checkbox that is unticked is still an answer, and 0 is a
    // legitimate amount — neither is an empty field.
    const mixed: FieldMap = {
      agreed: { type: DynamicField.CHECKBOX, name: 'agreed', title: 'Agreed', required: true, value: false } as never,
      qty: { type: DynamicField.NUMBER, name: 'qty', title: 'Qty', required: true, value: 0 } as never,
    };
    expect(errorsFor(mixed, { agreed: false, qty: 0 })).toEqual({});
  });
});

describe('conditional rules', () => {
  // The Currencies form: an anchor and a rate are required unless this is the
  // base currency, at which point both are hidden.
  const fields: FieldMap = {
    isBase: { type: DynamicField.CHECKBOX, name: 'isBase', title: 'Base', value: false } as never,
    anchor: {
      type: DynamicField.SELECT,
      name: 'anchor',
      title: 'Anchor',
      items: { USD: 'USD' },
      value: '',
      conditionalRequired: (v: Record<string, unknown>) => !v.isBase,
      conditionalHidden: (v: Record<string, unknown>) => !!v.isBase,
    } as never,
  };

  it('requires the field while the condition holds', () => {
    expect(errorsFor(fields, { isBase: false, anchor: '' }).anchor).toEqual(['Required']);
  });

  it('drops the requirement when the field is hidden', () => {
    expect(errorsFor(fields, { isBase: true, anchor: '' })).toEqual({});
  });

  it('re-evaluates against the live values, not the values at build time', () => {
    // The schema is built once; ticking the box must change the outcome.
    const schema = buildZodSchema(fields);
    expect(schema.safeParse({ isBase: false, anchor: '' }).success).toBe(false);
    expect(schema.safeParse({ isBase: true, anchor: '' }).success).toBe(true);
  });
});

describe('number bounds', () => {
  const fields: FieldMap = {
    rate: { type: DynamicField.NUMBER, name: 'rate', title: 'Rate', value: '', min: 0, max: 100 } as never,
  };

  it('rejects something that is not a number', () => {
    expect(errorsFor(fields, { rate: 'abc' }).rate).toEqual(['Invalid number']);
  });

  it('enforces the bounds', () => {
    expect(errorsFor(fields, { rate: -1 }).rate).toEqual(['Minimum value is 0']);
    expect(errorsFor(fields, { rate: 101 }).rate).toEqual(['Maximum value is 100']);
  });

  it('accepts the bounds themselves and a numeric string', () => {
    expect(errorsFor(fields, { rate: 0 })).toEqual({});
    expect(errorsFor(fields, { rate: 100 })).toEqual({});
    expect(errorsFor(fields, { rate: '42.5' })).toEqual({});
  });
});

describe('custom validators', () => {
  it('surfaces the message the validator returns', () => {
    const fields: FieldMap = {
      discount: {
        type: DynamicField.NUMBER,
        name: 'discount',
        title: 'Discount',
        value: '',
        customValidator: (v: unknown, all: Record<string, unknown>) =>
          Number(v) > Number(all.charge) ? 'A discount cannot exceed the charge.' : null,
      } as never,
      charge: { type: DynamicField.NUMBER, name: 'charge', title: 'Charge', value: '' } as never,
    };

    expect(errorsFor(fields, { charge: 100, discount: 150 }).discount)
      .toEqual(['A discount cannot exceed the charge.']);
    expect(errorsFor(fields, { charge: 100, discount: 50 })).toEqual({});
  });

  it('does not run on a missing optional field', () => {
    // Otherwise every optional field would fail its own rule while blank.
    const fields: FieldMap = {
      note: { type: DynamicField.TEXT, name: 'note', title: 'Note', value: '', customValidator: () => 'always wrong' } as never,
    };
    expect(errorsFor(fields, { note: '' })).toEqual({});
    expect(errorsFor(fields, { note: 'x' }).note).toEqual(['always wrong']);
  });
});

describe('email and regex', () => {
  it('accepts the dotless intranet domain the seed admin uses', () => {
    const fields: FieldMap = {
      email: { type: DynamicField.EMAIL, name: 'email', title: 'Email', value: '' } as never,
    };
    expect(errorsFor(fields, { email: 'admin@local' })).toEqual({});
    expect(errorsFor(fields, { email: 'not-an-email' }).email).toEqual(['Invalid email']);
  });

  it('applies a text regex, naming the field in the message', () => {
    const fields: FieldMap = {
      tiiuCode: text('tiiuCode', { title: 'TIIU Code', regex: /^[A-Z]{3,4}\d{4,7}$/ }),
    };
    expect(errorsFor(fields, { tiiuCode: 'TIIU6591456' })).toEqual({});
    expect(errorsFor(fields, { tiiuCode: 'nope' }).tiiuCode).toEqual(['Invalid TIIU Code']);
  });
});

describe('defaults and submission', () => {
  const fields: FieldMap = {
    name: text('name', { value: 'ABBAS HIJAZI' }),
    when: { type: DynamicField.DATE, name: 'when', title: 'When', value: '' } as never,
  };

  it('reads the initial values straight off the config', () => {
    expect(extractDefaults(fields)).toEqual({ name: 'ABBAS HIJAZI', when: '' });
  });

  it('trims a date down to YYYY-MM-DD before it is sent', () => {
    const out = prepareValuesForSubmission({ name: 'x', when: '2026-09-04T18:00:00.000Z' }, fields);
    expect(out.when).toBe('2026-09-04');
  });

  it('leaves a short date and non-date fields alone', () => {
    const out = prepareValuesForSubmission({ name: 'x', when: '2026-09-04' }, fields);
    expect(out).toEqual({ name: 'x', when: '2026-09-04' });
  });
});
