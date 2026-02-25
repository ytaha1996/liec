import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Typography } from '@mui/material';
export const PhotoGallery = ({ media }) => {
    const byStage = media.reduce((a, m) => {
        (a[m.stage] ?? (a[m.stage] = [])).push(m);
        return a;
    }, {});
    return (_jsx(Box, { children: Object.entries(byStage).map(([stage, items]) => (_jsxs(Box, { sx: { mb: 2 }, children: [_jsx(Typography, { variant: "h6", sx: { mb: 1 }, children: stage }), _jsx(Box, { sx: { display: 'flex', gap: 1, flexWrap: 'wrap' }, children: items.map((m) => (_jsx("img", { src: m.publicUrl, width: 140, alt: stage, style: { borderRadius: 4 } }, m.id))) })] }, stage))) }));
};
