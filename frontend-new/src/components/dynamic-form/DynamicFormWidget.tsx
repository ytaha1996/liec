import { useMemo, useState, useEffect, type ReactNode } from 'react';
import { useForm, Controller, type FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  GenericInput,
  GenericNumberInput,
  GenericTextArea,
  GenericSelect,
  GenericMultiSelect,
  GenericDatePicker,
  GenericPhoneInput,
  GenericFileInput,
  GenericImageInput,
  GenericImageListInput,
  GenericTagsInput,
  GenericCheckbox,
  GenericCheckboxList,
} from '@/components/inputs';
import {
  buildZodSchema,
  extractDefaults,
  prepareValuesForSubmission,
} from './config-to-zod';
import { DynamicField, type DynamicFieldTypes, type FieldMap } from './types';

interface DynamicFormWidgetProps {
  title?: string;
  fields: FieldMap;
  onSubmit: (values: Record<string, unknown>) => Promise<boolean | void>;
  // When true, suppresses the outer card chrome — used inside dialogs/drawers
  // where the surrounding container already provides padding.
  drawerMode?: boolean;
  children?: ReactNode;
  onFieldChange?: (
    name: string,
    value: unknown,
    allValues: Record<string, unknown>,
  ) => void;
  submitLabel?: string;
}

export function DynamicFormWidget({
  title,
  fields,
  onSubmit,
  drawerMode,
  children,
  onFieldChange,
  submitLabel = 'Submit',
}: DynamicFormWidgetProps) {
  // Rebuild schema whenever the underlying config changes shape (parents pass
  // a fresh `fields` object on every render because they call `buildFields`
  // inline — diff via JSON of name+type so we don't churn the schema needlessly).
  const schemaKey = useMemo(
    () =>
      JSON.stringify(
        Object.values(fields).map((f) => [
          f.name,
          f.type,
          'items' in f ? Object.keys(f.items as object) : null,
        ]),
      ),
    [fields],
  );
  const schema = useMemo(() => buildZodSchema(fields), [schemaKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset key deliberately EXCLUDES select `items` — the zod schema doesn't
  // validate against option sets, and resetting when a lookup loader refreshes
  // under an open dialog would wipe everything the user has typed.
  const resetKey = useMemo(
    () => JSON.stringify(Object.values(fields).map((f) => [f.name, f.type, f.value])),
    [fields],
  );
  const defaultValues = useMemo(() => extractDefaults(fields), [resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const form = useForm({
    resolver: zodResolver(schema as never),
    defaultValues: defaultValues as FieldValues,
    mode: 'onTouched',
  });

  // Reset when an edit dialog opens with a different record — defaultValues
  // identity changes only on real config changes thanks to the memo above.
  useEffect(() => {
    form.reset(defaultValues as FieldValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValues]);

  const [submitting, setSubmitting] = useState(false);
  const watchAll = form.watch();

  const handleSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const prepared = prepareValuesForSubmission(values as Record<string, unknown>, fields);
      await onSubmit(prepared);
    } finally {
      setSubmitting(false);
    }
  });

  const renderField = (field: DynamicFieldTypes) => {
    if (field.conditionalHidden?.(watchAll as Record<string, unknown>)) return null;
    const disabled =
      field.disabled ||
      submitting ||
      !!field.conditionalDisable?.(watchAll as Record<string, unknown>);
    const required =
      field.required ||
      !!field.conditionalRequired?.(watchAll as Record<string, unknown>);

    // Tailwind only emits classes it can see as literals — template-built
    // names like `sm:col-span-${n}` are silently dropped. Static lookup maps
    // keep every span the config system supports in the final CSS.
    const SM_SPAN: Record<number, string> = {
      3: 'sm:col-span-3', 4: 'sm:col-span-4', 6: 'sm:col-span-6',
      8: 'sm:col-span-8', 12: 'sm:col-span-12',
    };
    const MD_SPAN: Record<number, string> = {
      3: 'md:col-span-3', 4: 'md:col-span-4', 6: 'md:col-span-6',
      8: 'md:col-span-8', 12: 'md:col-span-12',
    };
    const nearest = (n: number) => (n <= 3 ? 3 : n <= 4 ? 4 : n <= 6 ? 6 : n <= 8 ? 8 : 12);
    const spanSm = nearest(field.grid?.sm ?? 12);
    const spanMd = nearest(field.grid?.md ?? spanSm);
    const colSpan = cn('col-span-12', SM_SPAN[spanSm], MD_SPAN[spanMd]);

    return (
      <div key={field.name} className={colSpan}>
        <Controller
          name={field.name}
          control={form.control}
          render={({ field: rhf, fieldState }) => {
            const error = fieldState.error?.message;
            const common = {
              name: field.name,
              title: field.title,
              value: rhf.value,
              onChange: (v: unknown) => {
                rhf.onChange(v);
                onFieldChange?.(field.name, v, {
                  ...(watchAll as Record<string, unknown>),
                  [field.name]: v,
                });
              },
              onBlur: rhf.onBlur,
              error,
              disabled,
              required,
            };

            switch (field.type) {
              case DynamicField.TEXT:
              case DynamicField.EMAIL:
              case DynamicField.CURRENCY:
                return (
                  <GenericInput
                    {...common}
                    value={(rhf.value as string) ?? ''}
                    type={field.type === DynamicField.EMAIL ? 'email' : 'text'}
                    placeholder={'placeholder' in field ? field.placeholder : undefined}
                  />
                );
              case DynamicField.TEXTAREA:
                return (
                  <GenericTextArea
                    {...common}
                    value={(rhf.value as string) ?? ''}
                    rows={field.rows}
                  />
                );
              case DynamicField.NUMBER:
                return (
                  <GenericNumberInput
                    {...common}
                    value={(rhf.value as number | string | null) ?? ''}
                    min={field.min}
                    max={field.max}
                    step={field.step}
                  />
                );
              case DynamicField.PHONENUMBER:
                return <GenericPhoneInput {...common} value={(rhf.value as string) ?? ''} />;
              case DynamicField.DATE:
                return (
                  <GenericDatePicker
                    {...common}
                    value={(rhf.value as string | null) ?? null}
                  />
                );
              case DynamicField.SELECT:
                return (
                  <GenericSelect
                    {...common}
                    value={(rhf.value as string) ?? ''}
                    items={field.items}
                    allowEmpty={field.allowEmpty}
                  />
                );
              case DynamicField.MULTISELECT:
                return (
                  <GenericMultiSelect
                    {...common}
                    value={(rhf.value as string[]) ?? []}
                    items={field.items}
                  />
                );
              case DynamicField.CHECKBOX:
                return (
                  <GenericCheckbox
                    {...common}
                    value={!!rhf.value}
                    description={field.description}
                  />
                );
              case DynamicField.CHECKBOXLIST:
                return (
                  <GenericCheckboxList
                    {...common}
                    value={(rhf.value as string[]) ?? []}
                    items={field.items}
                  />
                );
              case DynamicField.FILE:
                return (
                  <GenericFileInput
                    {...common}
                    value={rhf.value as File | string | null}
                    allowedTypes={field.allowedTypes as never}
                    maxSizeInMbs={field.maxSizeInMbs}
                  />
                );
              case DynamicField.IMAGE:
                return (
                  <GenericImageInput
                    {...common}
                    value={rhf.value as File | string | null}
                  />
                );
              case DynamicField.IMAGELIST:
                return (
                  <GenericImageListInput
                    {...common}
                    value={(rhf.value as (File | string)[]) ?? []}
                    maxImages={field.maxImages}
                  />
                );
              case DynamicField.TAGS:
                return (
                  <GenericTagsInput {...common} value={(rhf.value as string[]) ?? []} />
                );
              default:
                return <></>;
            }
          }}
        />
      </div>
    );
  };

  const body = (
    <form onSubmit={handleSubmit} className="flex flex-col">
      <div className="grid grid-cols-12 gap-3 sm:gap-4">
        {Object.values(fields).map(renderField)}
      </div>
      {children && <div className="mt-4">{children}</div>}
      <div
        className={cn(
          'sticky bottom-0 z-10 mt-4 pt-3 border-t bg-background',
          // Pick up iOS safe-area on phones; standard padding on tablet+.
          'pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] sm:pb-3',
        )}
      >
        <Button type="submit" disabled={submitting} className="w-full sm:w-auto sm:min-w-44">
          {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );

  if (drawerMode) return body;
  return (
    <div className="rounded-lg border bg-card p-4 sm:p-6">
      {title && <h2 className="text-lg font-semibold mb-4">{title}</h2>}
      {body}
    </div>
  );
}
