import type { ReactNode } from 'react';
import { MainPageTitle, type MainPageAction } from './MainPageTitle';

interface DetailPageLayoutProps {
  title: string;
  subtitle?: string;
  chips?: ReactNode;
  actions?: MainPageAction[];
  children: ReactNode;
}

export function DetailPageLayout({ title, subtitle, chips, actions, children }: DetailPageLayoutProps) {
  return (
    <div className="flex flex-col">
      <MainPageTitle title={title} subtitle={subtitle} chips={chips} actions={actions} />
      <div className="px-4 sm:px-6 pb-4 sm:pb-6 flex flex-col gap-4 sm:gap-6">{children}</div>
    </div>
  );
}
