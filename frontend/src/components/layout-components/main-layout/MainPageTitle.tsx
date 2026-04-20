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

  const secondaryDropdownOptions: ICustomDropdownOption[] = secondaryActions.map((a, i) => ({
    key: `secondary-${i}`,
    title: a.label,
    disabled: a.disabled,
    onClick: a.onClick,
  }));

  const buttonSx = (a?: { color?: string; backgroundColor?: string }) => ({
    mt: { xs: 2, md: 0 },
    borderRadius: theme.shape.borderRadius,
    textTransform: 'none' as const,
    padding: theme.spacing(1, 2.5),
    boxShadow: theme.shadows[2],
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
      <Grid container justifyContent="space-between" alignItems="center" spacing={1}>
        <Grid>
          <Stack direction="row" alignItems="center" gap={2} flexWrap="wrap">
            <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700, color: BRAND_TEAL }}>
              {title}
            </Typography>
            {chips}
          </Stack>
          {subtitle && (
            <Typography variant="subtitle1" sx={{ color: '#6E759F' }}>
              {subtitle}
            </Typography>
          )}
        </Grid>
        <Grid>
          <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
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
