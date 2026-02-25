import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import CollapsibleSection from '../CollapsibleSection';
import IconDescriptionTile from '../IconDescriptionTile';
import { makeStyles } from 'tss-react/mui';
import { Typography } from '@mui/material';
const useStyles = makeStyles()((theme) => ({
    header: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: theme.spacing(4),
    },
    headerTitle: {
        fontSize: '2rem',
        fontWeight: 'bold',
        color: theme.palette.primary.main,
        marginTop: '2rem',
    },
    headerSubtitle: {
        fontSize: '1rem',
        color: theme.palette.text.secondary,
        marginTop: theme.spacing(1),
    },
    tilesContainer: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '20px',
        justifyContent: 'flex-start',
    },
    tileWrapper: {
        flexBasis: 'calc(33.33% - 20px)',
        flexGrow: 0,
        flexShrink: 0,
    },
    emptyState: {
        textAlign: 'center',
        marginTop: theme.spacing(4),
        fontSize: '1rem',
        color: theme.palette.text.secondary,
    },
}));
const AppLauncherApps = ({ applications, closeModal, searchKey, }) => {
    const { classes } = useStyles();
    const [filteredApplications, setFilteredApplications] = useState(applications);
    useEffect(() => {
        if (searchKey && searchKey.trim()) {
            const newApps = {};
            Object.keys(applications).forEach((appKey) => {
                if (applications[appKey].title
                    .toLowerCase()
                    .includes(searchKey.toLowerCase())) {
                    newApps[appKey] = applications[appKey];
                }
            });
            setFilteredApplications(newApps);
        }
        else {
            setFilteredApplications(applications);
        }
    }, [applications, searchKey]);
    const getAppPath = (app) => app.route;
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: classes.header, children: [_jsx(Typography, { className: classes.headerTitle, children: "All Applications" }), _jsx(Typography, { className: classes.headerSubtitle, children: "Browse through your available apps below" })] }), _jsx(CollapsibleSection, { title: "Applications", className: classes.tilesContainer, open: true, children: Object.keys(filteredApplications).length > 0 ? (Object.keys(filteredApplications).map((appKey) => (_jsx("div", { className: classes.tileWrapper, children: _jsx(IconDescriptionTile, { title: filteredApplications[appKey].title, imgSrc: filteredApplications[appKey].icon || '', description: filteredApplications[appKey].description || '', route: getAppPath(filteredApplications[appKey]), onClick: closeModal }) }, appKey)))) : (_jsx(Typography, { className: classes.emptyState, children: "No applications found. Try refining your search." })) })] }));
};
export default AppLauncherApps;
