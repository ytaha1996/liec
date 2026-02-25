import { jsx as _jsx } from "react/jsx-runtime";
import { Box, CircularProgress } from '@mui/material';
const Loader = ({ size = 40 }) => (_jsx(Box, { sx: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100vh',
    }, children: _jsx(CircularProgress, { size: size }) }));
export default Loader;
