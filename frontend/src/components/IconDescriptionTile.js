import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { NavLink } from 'react-router-dom';
import Logo from './Logo';
import { makeStyles } from 'tss-react/mui';
const useStyles = makeStyles()((theme) => ({
    tileContainer: {
        display: 'flex',
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: theme.shape.borderRadius,
        cursor: 'pointer',
        height: 100,
        transition: theme.transitions.create('border-color', { duration: theme.transitions.duration.shortest }),
        '&:hover': {
            borderColor: theme.palette.primary.main,
            boxShadow: theme.shadows[2],
        },
    },
    tileText: {
        borderLeft: `1px solid ${theme.palette.divider}`,
        padding: theme.spacing(0.5, 0.75),
        overflow: 'hidden',
        background: theme.palette.background.default,
        width: '100%',
        boxSizing: 'border-box',
    },
    tileTitle: {
        margin: 0,
        lineHeight: 'normal',
        fontFamily: '"Poppins", sans-serif',
        fontWeight: 600,
        color: theme.palette.text.primary,
    },
    tileDescription: {
        marginTop: theme.spacing(0.5),
        fontFamily: '"Inter", sans-serif',
        fontSize: theme.typography.body2.fontSize,
        color: theme.palette.text.secondary,
    },
    appLink: {
        textDecoration: 'none',
        color: 'inherit',
        display: 'flex',
        width: '100%',
    },
}));
const IconDescriptionTile = ({ title, description, imgSrc, className, route, onClick, }) => {
    const { classes, cx } = useStyles();
    function renderTile() {
        return (_jsxs(_Fragment, { children: [_jsx(Logo, { verticalPadding: 20, horizontalPadding: 20, src: imgSrc, alt: title, height: 100, width: 100 }), _jsxs("div", { className: classes.tileText, children: [_jsx("h4", { className: classes.tileTitle, children: title }), _jsx("p", { className: classes.tileDescription, children: description })] })] }));
    }
    function containerClasses() {
        return classes.tileContainer + (className ? ` ${className}` : '');
    }
    return route ? (_jsx(NavLink, { to: route, className: cx(classes.appLink, containerClasses()), onClick: onClick, children: renderTile() })) : (_jsx("button", { className: containerClasses(), onClick: onClick, type: "button", children: renderTile() }));
};
export default IconDescriptionTile;
