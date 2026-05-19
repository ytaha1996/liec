import React from 'react';
import { Box } from '@mui/material';
import MainPageTitle, { MainPageAction } from './MainPageTitle';

interface DetailPageLayoutProps {
  title: string;
  chips?: React.ReactNode;
  actions?: MainPageAction[];
  children: React.ReactNode;
}

const DetailPageLayout: React.FC<DetailPageLayoutProps> = ({ title, chips, actions, children }) => (
  <Box>
    <MainPageTitle title={title} chips={chips} actions={actions} />
    <Box sx={{ px: 3, pb: 3 }}>
      {children}
    </Box>
  </Box>
);

export default DetailPageLayout;
