import React from 'react';
import { Button, Grid, Typography } from '@mui/material';
import PageTitleWrapper from '../../PageTitleWrapper';
import { useTheme } from '@mui/material/styles';
import { BRAND_TEAL } from '../../../constants/statusColors';

interface IMainPageTitleProps {
  title: string;
  subtitle?: string;
  action?: {
    title: string;
    onClick: () => void;
    disabled?: boolean;
  }
}

const MainPageTitle: React.FC<IMainPageTitleProps> = ({ title, subtitle, action }) => {
  const theme = useTheme();

  return (
    <PageTitleWrapper>
      <Grid container justifyContent="space-between" alignItems="center" spacing={1}>
        <Grid>
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700, color: BRAND_TEAL }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="subtitle1" sx={{ color: '#6E759F' }}>
              {subtitle}
            </Typography>
          )}
        </Grid>
        {action && (
          <Grid>
            <Button
              variant="contained"
              color="primary"
              onClick={action.onClick}
              disabled={action.disabled}
              sx={{
                mt: { xs: 2, md: 0 },
                borderRadius: theme.shape.borderRadius,
                textTransform: 'none',
                padding: theme.spacing(1.5, 3),
                boxShadow: theme.shadows[2],
                '&:hover': {
                  boxShadow: theme.shadows[4],
                },
              }}
            >
              {action.title}
            </Button>
          </Grid>
        )}
      </Grid>
    </PageTitleWrapper>
  );
}

export default MainPageTitle;
