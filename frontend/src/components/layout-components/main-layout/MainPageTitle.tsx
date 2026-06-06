import React from 'react';
import { Button, Grid, Stack, Typography } from '@mui/material';
import PageTitleWrapper from '../../PageTitleWrapper';
import { useTheme } from '@mui/material/styles';
import { BRAND_TEAL } from '../../../constants/statusColors';
import CustomDropdown, { ICustomDropdownOption } from '../../CustomDropdown';

export interface MainPageAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  color?: string;
  backgroundColor?: string;
}

interface IMainPageTitleProps {
  title: string;
  subtitle?: string;
  action?: {
    title: string;
    onClick: () => void;
    disabled?: boolean;
  };
  actions?: MainPageAction[];
  chips?: React.ReactNode;
}

const MainPageTitle: React.FC<IMainPageTitleProps> = ({ title, subtitle, action, actions = [], chips }) => {
  const theme = useTheme();

  const primaryActions = actions.filter((a) => a.variant !== 'secondary');
  const secondaryActions = actions.filter((a) => a.variant === 'secondary');

  const totalVisibleButtons = primaryActions.length + (action ? 1 : 0);
  // 2+ buttons would squash awkwardly inline on a phone; stack them.
  const stackButtons = totalVisibleButtons >= 2;

  const secondaryDropdownOptions: ICustomDropdownOption[] = secondaryActions.map((a, i) => ({
    key: `secondary-${i}`,
    title: a.label,
    disabled: a.disabled,
    onClick: a.onClick,
  }));

  const buttonSx = (a?: { color?: string; backgroundColor?: string }) => ({
    borderRadius: theme.shape.borderRadius,
    textTransform: 'none' as const,
    padding: theme.spacing(1, 2.5),
    boxShadow: theme.shadows[2],
    width: { xs: stackButtons ? '100%' : 'auto', sm: 'auto' },
    '&:hover': {
      boxShadow: theme.shadows[4],
      backgroundColor: a?.backgroundColor ? a.backgroundColor : undefined,
      opacity: a?.backgroundColor ? 0.9 : undefined,
    },
    ...(a?.backgroundColor ? { backgroundColor: a.backgroundColor } : {}),
    ...(a?.color ? { color: a.color } : {}),
  });

  return (
    <PageTitleWrapper>
      <Grid container justifyContent="space-between" alignItems="center" spacing={{ xs: 1.5, sm: 1 }}>
        <Grid>
          <Stack direction="row" alignItems="center" gap={{ xs: 1, sm: 2 }} flexWrap="wrap">
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              sx={{ fontWeight: 700, color: BRAND_TEAL, fontSize: { xs: 20, sm: 25 }, mb: 0 }}
            >
              {title}
            </Typography>
            {chips}
          </Stack>
          {subtitle && (
            <Typography variant="subtitle1" sx={{ color: 'text.secondary', fontSize: { xs: 13, sm: 16 } }}>
              {subtitle}
            </Typography>
          )}
        </Grid>
        <Grid sx={{ width: { xs: '100%', sm: 'auto' } }}>
          <Stack
            direction={{ xs: stackButtons ? 'column' : 'row', sm: 'row' }}
            gap={1}
            alignItems={{ xs: stackButtons ? 'stretch' : 'center', sm: 'center' }}
            flexWrap="wrap"
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            {/* Legacy single action */}
            {action && (
              <Button
                variant="contained"
                color="primary"
                onClick={action.onClick}
                disabled={action.disabled}
                sx={buttonSx()}
              >
                {action.title}
              </Button>
            )}
            {/* Primary actions */}
            {primaryActions.map((a, i) => (
              <Button
                key={`primary-${i}`}
                variant="contained"
                onClick={a.onClick}
                disabled={a.disabled}
                sx={buttonSx(a)}
              >
                {a.label}
              </Button>
            ))}
            {/* Secondary actions dropdown */}
            {secondaryDropdownOptions.length > 0 && (
              <CustomDropdown title="More" options={secondaryDropdownOptions} />
            )}
          </Stack>
        </Grid>
      </Grid>
    </PageTitleWrapper>
  );
}

export default MainPageTitle;
