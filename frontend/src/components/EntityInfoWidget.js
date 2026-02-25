import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Box, Typography, Avatar, Tooltip, Divider, LinearProgress, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
const EntityInfo = ({ view, onToggle }) => {
    const { title, iconUrl, classification, progress, fields } = view;
    const [isOpen, setIsOpen] = useState(true);
    useEffect(() => {
        document.body.style.setProperty('--entity-info-width', isOpen ? '350px' : '0px');
        return () => {
            document.body.style.removeProperty('--entity-info-width');
        };
    }, [isOpen]);
    const toggleSidebar = () => {
        setIsOpen(!isOpen);
        if (onToggle)
            onToggle();
    };
    return (_jsxs(Box, { sx: {
            position: 'absolute',
            top: '98px',
            left: 0,
            width: isOpen ? '350px' : '0px',
            height: '100%',
            backgroundColor: '#ffffff',
            padding: isOpen ? '20px' : '0px',
            transition: 'width 0.3s ease-in-out',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
        }, children: [_jsx(IconButton, { onClick: toggleSidebar, sx: {
                    position: 'absolute',
                    right: '-40px',
                    top: '20px',
                    backgroundColor: '#ffffff',
                    borderRadius: '50%',
                    boxShadow: 1,
                    zIndex: 10,
                }, children: isOpen ? _jsx(CloseIcon, {}) : _jsx(MenuIcon, {}) }), isOpen && (
            // Outer Box: set direction rtl to move scrollbar to left.
            _jsx(Box, { sx: {
                    width: '100%',
                    height: '100%',
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    direction: 'rtl',
                }, children: _jsxs(Box, { sx: { direction: 'ltr', padding: '0 16px' }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', mb: 2 }, children: [_jsx(Box, { sx: { flexGrow: 1 }, children: _jsx(Tooltip, { title: title, children: _jsx(Typography, { variant: "h6", noWrap: true, sx: {
                                                fontWeight: '700',
                                                color: '#1b1b1bb3',
                                                fontSize: '1.4rem',
                                            }, children: title }) }) }), iconUrl && (_jsx(Avatar, { src: iconUrl, alt: title, sx: {
                                        width: 60,
                                        height: 60,
                                        cursor: 'pointer',
                                        border: '2px solid #25a8b3',
                                    } }))] }), _jsx(Divider, { sx: { mb: 2, borderColor: '#ddd' } }), Object.entries(fields).map(([label, value]) => (_jsxs(Box, { sx: {
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                mb: 2,
                                padding: '2px 0',
                            }, children: [_jsxs(Typography, { variant: "body2", sx: { color: '#1b1b1bb3', fontWeight: '500' }, children: [label, ":"] }), _jsx(Typography, { variant: "body2", sx: { color: '#25a8b3', fontWeight: 'bold' }, children: value })] }, label))), typeof progress === 'number' && (_jsxs(Box, { sx: { mt: 3 }, children: [_jsx(LinearProgress, { variant: "determinate", value: progress, sx: {
                                        backgroundColor: '#e0e0e0',
                                        '& .MuiLinearProgress-bar': { backgroundColor: '#25a8b3' },
                                    } }), _jsxs(Typography, { variant: "caption", sx: { display: 'block', textAlign: 'right', color: '#1b1b1bb3' }, children: [progress, "%"] })] }))] }) }))] }));
};
export default EntityInfo;
