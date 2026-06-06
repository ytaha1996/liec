import React from 'react';
import { Box } from '@mui/material';
import MainPageTitle, { MainPageAction } from './MainPageTitle';
import { PAGE_PADDING_X, PAGE_PADDING_Y } from '../../../theme/tokens';

interface DetailPageLayoutProps {
  title: string;
  chips?: React.ReactNode;
  actions?: MainPageAction[];
  children: React.ReactNode;
}

const DetailPageLayout: React.FC<DetailPageLayoutProps> = ({ title, chips, actions, children }) => (
  <Box>
    <MainPageTitle title={title} chips={chips} actions={actions} />
    <Box sx={{ px: PAGE_PADDING_X, pb: PAGE_PADDING_Y }}>
      {children}
    </Box>
  </Box>
);

export default DetailPageLayout;
