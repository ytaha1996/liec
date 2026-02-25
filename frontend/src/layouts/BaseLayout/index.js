import { jsx as _jsx } from "react/jsx-runtime";
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
const BaseLayout = ({ children }) => {
    return (_jsx(Box, { sx: {
            flex: 1,
            height: '100%'
        }, children: children || _jsx(Outlet, {}) }));
};
export default BaseLayout;
