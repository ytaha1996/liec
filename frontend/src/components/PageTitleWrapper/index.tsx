import { FC, ReactNode } from 'react';
import { Box, styled } from '@mui/material';

const PageTitle = styled(Box)(
  ({ theme }) => `
        padding: ${theme.spacing(4)} 0;
`
);

const Container = styled(Box)(
  () => `
        padding: 0px;
`
);

interface PageTitleWrapperProps {
  children?: ReactNode;
}

const PageTitleWrapper: FC<PageTitleWrapperProps> = ({ children }) => {
  return (
    <PageTitle className="MuiPageTitle-wrapper">
      <Container>{children}</Container>
    </PageTitle>
  );
};

export default PageTitleWrapper;
