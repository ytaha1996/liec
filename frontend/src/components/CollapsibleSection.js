import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useState } from 'react';
import { makeStyles } from 'tss-react/mui';
import { Collapse, IconButton } from '@mui/material';
import GenericButton from './GenericButton';
const useStyles = makeStyles()((theme) => ({
    container: {
        width: '100%',
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.body1.fontSize,
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        borderRadius: theme.shape.borderRadius,
        boxShadow: theme.shadows[1],
        marginBottom: theme.spacing(2),
    },
    header: {
        cursor: 'pointer',
        fontSize: theme.typography.h6.fontSize,
        lineHeight: '27px',
        color: theme.palette.text.secondary,
        '&:hover': {
            color: theme.palette.text.primary,
        },
        background: 'transparent',
        border: 'none',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
    },
    content: {
        padding: theme.spacing(2),
    },
    collapse: {
        transform: 'rotate(0deg)',
        transition: theme.transitions.create('transform', {
            duration: theme.transitions.duration.shortest,
        }),
    },
    collapseOpen: {
        transform: 'rotate(180deg)',
    },
    actions: {
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.primary.contrastText,
        '&:hover': {
            backgroundColor: theme.palette.primary.dark,
        },
    },
}));
const CollapsibleSection = ({ title, open, className, classes = {}, children, actions, onButtonClick, }) => {
    const { classes: collapsableClasses, cx } = useStyles();
    const [collapse, setCollapse] = useState(!!open);
    function toggleCollapse() {
        setCollapse(!collapse);
    }
    return (_jsxs("div", { className: collapsableClasses.container, children: [_jsxs("div", { role: "presentation", style: {
                    display: 'flex',
                    alignItems: 'flex-start',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                }, children: [_jsxs("div", { children: [_jsx(IconButton, { "aria-label": 'Show More', className: cx(collapsableClasses.collapse, {
                                    [collapsableClasses.collapseOpen]: collapse,
                                }), onClick: toggleCollapse, children: _jsx(ExpandMoreIcon, {}) }), title] }), actions && (_jsx(GenericButton, { type: "button", onClick: onButtonClick, text: 'Cancel' }))] }), _jsx(Collapse, { in: collapse, timeout: 150, className: cx(collapsableClasses.content, classes.content), classes: className
                    ? {
                        wrapperInner: className,
                    }
                    : {}, children: children })] }));
};
export default CollapsibleSection;
