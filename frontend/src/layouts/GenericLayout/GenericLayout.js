import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { makeStyles } from 'tss-react/mui';
import Body from './Body';
import Header from './Header';
import { Outlet } from 'react-router';
const useStyles = makeStyles()((theme) => ({
    mainContainer: {
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: '#f6f6f6',
        fontFamily: 'sans-serif',
    },
    contentWrapper: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        marginTop: '80px',
        position: 'relative',
        height: 'calc(100vh - 80px)',
        overflow: 'auto'
    }
}));
const GenericLayout = ({ pages, links, appName, }) => {
    const { classes } = useStyles();
    return (_jsxs("div", { className: classes.mainContainer, children: [_jsx(Header, { pages: pages, links: links, appName: appName }), _jsx("div", { className: classes.contentWrapper, children: _jsx(Body, { children: _jsx(Outlet, {}) }) })] }));
};
export default GenericLayout;
