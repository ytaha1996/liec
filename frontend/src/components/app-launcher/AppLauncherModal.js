import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import AppLauncherApps from './AppLauncherApps';
import AppLauncherModules from './AppLauncherModules';
import { makeStyles } from 'tss-react/mui';
import { Dialog, DialogContent, DialogTitle, IconButton, useMediaQuery, } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import GenericTextInput from '../input-components/GenericTextInput';
const useStyles = makeStyles()(() => ({
    dialogPaper: {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
    },
    dialogTitle: {
        position: 'relative',
        fontSize: '22px',
        lineHeight: '27px',
        borderBottom: '1px solid rgba(220, 220, 220, 0.5)',
        padding: '16px 24px',
        display: 'flex',
        flexDirection: 'row',
        gap: '30px',
    },
    titleWrapper: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    titleText: {
        fontWeight: 600,
        fontSize: '20px',
        margin: 0,
    },
    searchField: {
        width: '100%',
        maxWidth: '400px',
    },
    closeIcon: {
        position: 'absolute',
        top: '16px',
        right: '16px',
        color: '#666',
        '&:hover': {
            color: '#000',
        },
    },
    dialogContent: {
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
    },
}));
const AppLauncherModal = ({ open, closeModal, applications, }) => {
    const { classes } = useStyles();
    const fullScreen = useMediaQuery('@media only screen and (max-width: 700px)');
    const [searchKey, setSearchKey] = useState('');
    useEffect(() => {
        if (!open) {
            setSearchKey('');
        }
    }, [open]);
    const handleChange = (v) => {
        setSearchKey(v);
    };
    return (_jsxs(Dialog, { classes: { paper: classes.dialogPaper }, open: open, onClose: closeModal, fullWidth: true, fullScreen: fullScreen, maxWidth: "xl", children: [_jsxs(DialogTitle, { className: classes.dialogTitle, children: [_jsx(IconButton, { "aria-label": "close", className: classes.closeIcon, onClick: closeModal, children: _jsx(CloseIcon, {}) }), _jsx("div", { className: classes.titleWrapper, children: _jsx("span", { className: classes.titleText, children: "App Launcher" }) }), _jsx(GenericTextInput, { type: "text", name: "search", placeholder: "Search", onChange: handleChange, value: searchKey, className: classes.searchField, title: '', variant: 'standard', hideError: true })] }), _jsxs(DialogContent, { className: classes.dialogContent, children: [_jsx(AppLauncherApps, { applications: applications, closeModal: closeModal, searchKey: searchKey }), _jsx(AppLauncherModules, { applications: applications, closeModal: closeModal, searchKey: searchKey })] })] }));
};
export default AppLauncherModal;
