import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button, Grid, Typography } from '@mui/material';
import PageTitleWrapper from '../../PageTitleWrapper';
import { useTheme } from '@mui/material/styles';
const MainPageTitle = ({ title, subtitle, action }) => {
    const theme = useTheme();
    return (_jsx(PageTitleWrapper, { children: _jsxs(Grid, { container: true, justifyContent: "space-between", alignItems: "center", spacing: 1, children: [_jsxs(Grid, { children: [_jsx(Typography, { variant: "h3", component: "h1", gutterBottom: true, sx: { fontWeight: 700, color: '#00A6A6' }, children: title }), subtitle && (_jsx(Typography, { variant: "subtitle1", sx: { color: '#6E759F' }, children: subtitle }))] }), action && (_jsx(Grid, { children: _jsx(Button, { variant: "contained", color: "primary", onClick: action.onClick, disabled: action.disabled, sx: {
                            mt: { xs: 2, md: 0 },
                            borderRadius: theme.shape.borderRadius,
                            textTransform: 'none',
                            padding: theme.spacing(1.5, 3),
                            boxShadow: theme.shadows[2],
                            '&:hover': {
                                boxShadow: theme.shadows[4],
                            },
                        }, children: action.title }) }))] }) }));
};
export default MainPageTitle;
