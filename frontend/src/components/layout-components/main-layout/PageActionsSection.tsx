import React from 'react';
import { Button, Stack } from '@mui/material';
import MainPageSection from './MainPageSection';

export interface PageAction {
  label: string;
  action: string;
  color?: 'primary' | 'error' | 'warning' | 'success' | 'inherit' | 'secondary';
  variant?: 'contained' | 'outlined' | 'text';
  disabled?: boolean;
  onClick: () => void;
}

interface PageActionsSectionProps {
  title?: string;
  actions: PageAction[];
  isPending?: boolean;
  children?: React.ReactNode;
}

const PageActionsSection: React.FC<PageActionsSectionProps> = ({
  title = 'Actions',
  actions,
  isPending = false,
  children,
}) => (
  <MainPageSection title={title}>
    {children}
    {actions.length > 0 && (
      <Stack direction="row" gap={1} flexWrap="wrap">
        {actions.map((a) => (
          <Button
            key={a.action}
            variant={a.variant ?? 'outlined'}
            color={a.color ?? 'primary'}
            onClick={a.onClick}
            disabled={isPending || (a.disabled ?? false)}
          >
            {a.label}
          </Button>
        ))}
      </Stack>
    )}
  </MainPageSection>
);

export default PageActionsSection;
