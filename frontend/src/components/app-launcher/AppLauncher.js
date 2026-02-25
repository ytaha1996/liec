import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo } from 'react';
import AppLauncherModal from './AppLauncherModal';
import { makeStyles } from 'tss-react/mui';
import AppsIcon from '@mui/icons-material/Apps';
const useStyles = makeStyles()(() => ({
    appLauncherButton: {
        margin: '0 5px 0 5px',
        border: 'none',
        outline: 'none',
        background: 'unset',
    },
    appLauncherFig: {
        margin: 0,
    },
    appLauncherImg: {
        height: 25,
        width: 25,
        minWidth: 25,
        cursor: 'pointer',
    },
    dialogPaper: {
        height: '100%',
    },
    dialogContent: {},
}));
const AppLauncher = ({ applications }) => {
    const [open, setOpen] = useState(false);
    const { classes } = useStyles();
    // Use useMemo to compute the filtered applications
    const filteredApplication = useMemo(() => {
        const apps = {};
        Object.keys(applications).forEach((app) => {
            if (!applications[app].hidden) {
                apps[app] = applications[app];
            }
        });
        return apps;
    }, [applications]);
    function openModal() {
        setOpen(true);
    }
    function closeModal() {
        setOpen(false);
    }
    return (_jsxs(_Fragment, { children: [_jsx("button", { className: classes.appLauncherButton, onClick: openModal, type: "button", children: _jsx("figure", { className: classes.appLauncherFig, children: _jsx(AppsIcon, { sx: { fontSize: 25, cursor: 'pointer', color: 'white' } }) }) }), _jsx(AppLauncherModal, { open: open, closeModal: closeModal, applications: filteredApplication })] }));
};
export default AppLauncher;
