import type { ReactNode } from 'react';
import { BRAND_TEAL } from '@/constants/statusColors';

interface MainPageSectionProps {
  title: string;
  actions?: ReactNode;
  children?: ReactNode;
}

export function MainPageSection({ title, actions, children }: MainPageSectionProps) {
  return (
    <section className="w-full mb-4 sm:mb-6 rounded-lg border bg-card overflow-hidden">
      <header
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-white"
        style={{ backgroundColor: BRAND_TEAL }}
      >
        <h2 className="font-semibold text-base sm:text-lg">{title}</h2>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}
