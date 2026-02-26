import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import PageTitleWrapper from '../../PageTitleWrapper';

interface DetailPageLayoutProps {
  title: string;
  chips?: React.ReactNode;
  children: React.ReactNode;
}

const DetailPageLayout: React.FC<DetailPageLayoutProps> = ({ title, chips, children }) => (
  <Box>
    <PageTitleWrapper>
      <Stack direction="row" alignItems="center" gap={2} flexWrap="wrap">
        <Typography variant="h3" component="h1" sx={{ fontWeight: 700, color: '#00A6A6' }}>
          {title}
        </Typography>
        {chips}
      </Stack>
    </PageTitleWrapper>
    <Box sx={{ px: 3, pb: 3 }}>
      {children}
    </Box>
  </Box>
);

export default DetailPageLayout;
