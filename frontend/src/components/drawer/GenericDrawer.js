import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// BottomRightDrawer.tsx
import { makeStyles } from 'tss-react/mui';
import Drawer from '@mui/material/Drawer';
const useStyles = makeStyles()((_theme) => ({
    container: {
        width: "100%",
        height: "100%",
    },
    titleContainer: {
        height: "60px",
        backgroundColor: "#243043",
        position: "sticky",
        top: "0",
        width: "100%",
        padding: "15px",
        justifyContent: 'space-between',
        zIndex: '12',
        display: 'flex',
        alignItems: 'center'
    },
    title: {
        color: "#fff",
        fontSize: "15px",
        lineHeight: "20px"
    },
    bodyContainer: {
        padding: "20px 15px 15px",
    },
    closeButton: {
        color: "#fff",
        height: "20px",
        display: "block",
        cursor: "pointer"
    }
}));
const GenericDrawer = ({ children, title, open, onClose }) => {
    const { classes } = useStyles();
    return (_jsx(Drawer, { anchor: "bottom", open: open, ModalProps: { keepMounted: true, slotProps: { backdrop: { invisible: true } } }, PaperProps: {
            sx: {
                width: '350px',
                position: 'absolute',
                right: 0,
                bottom: 0,
                maxHeight: '70%',
                borderTopLeftRadius: 8,
                borderTopRightRadius: 0,
                left: "unset",
                height: "700px",
                "transition": "width 2s",
            },
        }, children: _jsxs("div", { className: classes.container, children: [_jsxs("div", { className: classes.titleContainer, children: [_jsx("div", { className: classes.title, children: title }), _jsx("span", { className: classes.closeButton, onClick: () => onClose(), children: "X" })] }), _jsx("div", { className: classes.bodyContainer, children: children })] }) }));
};
export default GenericDrawer;
