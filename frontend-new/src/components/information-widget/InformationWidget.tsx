import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  formatCurrencyNumber,
  formatDate,
  formatDateTime,
  formatIntPhoneNumber,
} from '@/helpers/formatting-utils';
import { MainPageSection } from '@/components/layout/MainPageSection';
import { InformationWidgetFieldTypes, type IInformationWidgetField } from './types';

interface InformationWidgetProps {
  title: string;
  fields: IInformationWidgetField[];
  data: Record<string, unknown>;
  children?: ReactNode;
  actions?: ReactNode;
}

const renderValue = (field: IInformationWidgetField, value: unknown, row: Record<string, unknown>): ReactNode => {
  if (value == null || value === '') return <span className="text-muted-foreground">—</span>;
  switch (field.type) {
    case InformationWidgetFieldTypes.Currency:
      return formatCurrencyNumber(value, field.currency ?? 'USD');
    case InformationWidgetFieldTypes.Date:
      return formatDate(value);
    case InformationWidgetFieldTypes.Datetime:
      return formatDateTime(value);
    case InformationWidgetFieldTypes.Boolean:
      return value ? 'Yes' : 'No';
    case InformationWidgetFieldTypes.MobileNumber:
      return formatIntPhoneNumber(String(value));
    case InformationWidgetFieldTypes.Custom:
      return field.render?.(value, row);
    case InformationWidgetFieldTypes.Text:
    default:
      return String(value);
  }
};

const widthClass = (w: IInformationWidgetField['width']): string => {
  switch (w) {
    case 'full':
      return 'col-span-12';
    case 'two-third':
      return 'col-span-12 sm:col-span-8';
    case 'half':
      return 'col-span-12 sm:col-span-6';
    case 'third':
    default:
      return 'col-span-12 sm:col-span-6 md:col-span-4';
  }
};

export function InformationWidget({
  title,
  fields,
  data,
  children,
  actions,
}: InformationWidgetProps) {
  return (
    <MainPageSection title={title} actions={actions}>
      <div className="grid grid-cols-12 gap-3 sm:gap-4">
        {fields.map((f) => (
          <div key={f.name} className={cn(widthClass(f.width))}>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{f.title}</p>
              {f.action && (
                <button
                  type="button"
                  onClick={f.action.onClick}
                  className="text-xs text-primary hover:underline"
                >
                  {f.action.label}
                </button>
              )}
            </div>
            <div className="text-sm sm:text-base mt-0.5 break-words">
              {renderValue(f, data[f.name], data)}
            </div>
            {f.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>
            )}
          </div>
        ))}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </MainPageSection>
  );
}
