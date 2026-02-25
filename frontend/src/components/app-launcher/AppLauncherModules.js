import { jsx as _jsx } from "react/jsx-runtime";
import { NavLink } from 'react-router-dom';
import CollapsibleSection from '../CollapsibleSection';
import { makeStyles } from 'tss-react/mui';
const useStyles = makeStyles()((theme) => ({
    collapseContent: {
        width: '100%',
        display: 'grid',
        gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
        gap: '10px',
    },
    moduleLink: {
        color: theme.palette.primary.main,
        textDecoration: 'none',
        fontSize: '16px',
        '&:hover': {
            textDecoration: 'underline',
        },
    },
    activeLink: {
        fontWeight: 'bold',
        fontSize: '16px',
        fontFamily: 'sans-serif',
    },
    submoduleLink: {
        marginLeft: '1rem',
    },
}));
const AppLauncherModules = ({ applications, closeModal, searchKey, }) => {
    const { classes, cx } = useStyles();
    return (_jsx(CollapsibleSection, { title: 'All Modules', className: classes.collapseContent, open: true, children: Object.values(applications).map((app) => Object.keys(app.modules).map((moduleName) => (!searchKey ||
            !searchKey.trim() ||
            app.modules[moduleName].title
                .toLowerCase()
                .includes(searchKey.toLowerCase())) && (_jsx(NavLink, { to: app.route + app.modules[moduleName].route, className: ({ isActive }) => cx(classes.moduleLink, { [classes.activeLink]: isActive }), onClick: closeModal, children: app.modules[moduleName].title }, moduleName)))) }));
};
export default AppLauncherModules;
