import { FC, ReactNode } from 'react';
import { Box } from '@mui/material';

interface PageTitleWrapperProps {
  children?: ReactNode;
}

const PageTitleWrapper: FC<PageTitleWrapperProps> = ({ children }) => {
  return (
    <Box
      className="MuiPageTitle-wrapper"
      sx={{ py: { xs: 2, sm: 3, md: 4 } }}
    >
      <Box sx={{ p: 0 }}>{children}</Box>
    </Box>
  );
};

export default PageTitleWrapper;
