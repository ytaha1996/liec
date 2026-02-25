import { jsx as _jsx } from "react/jsx-runtime";
import { Box, styled } from '@mui/material';
const PageTitle = styled(Box)(({ theme }) => `
        padding: ${theme.spacing(4)} 0;
`);
const Container = styled(Box)(() => `
        padding: 0px;
`);
const PageTitleWrapper = ({ children }) => {
    return (_jsx(PageTitle, { className: "MuiPageTitle-wrapper", children: _jsx(Container, { children: children }) }));
};
export default PageTitleWrapper;
