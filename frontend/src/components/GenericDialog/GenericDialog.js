import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { makeStyles } from 'tss-react/mui';
const useStyles = makeStyles()((theme) => ({
    dialogTitle: {
        margin: 0,
        padding: theme.spacing(2),
        backgroundColor: '#243043',
        color: '#fff',
        position: 'relative',
    },
    headerAction: {
        position: 'absolute',
        right: theme.spacing(6), // leave space for the close button
        top: theme.spacing(1),
    },
    closeButton: {
        position: 'absolute',
        right: theme.spacing(1),
        top: theme.spacing(1),
        color: '#fff',
    },
    dialogContent: {
        padding: `${theme.spacing(3)} !important`,
        marginTop: theme.spacing(2),
    },
}));
const GenericDialog = ({ open, title, onClose, headerAction, children, }) => {
    const { classes } = useStyles();
    return (_jsxs(Dialog, { open: open, onClose: onClose, fullWidth: true, maxWidth: "md", children: [_jsxs(DialogTitle, { className: classes.dialogTitle, children: [title, headerAction && _jsx("div", { className: classes.headerAction, children: headerAction }), _jsx(IconButton, { "aria-label": "close", className: classes.closeButton, onClick: onClose, children: _jsx(CloseIcon, {}) })] }), _jsx(DialogContent, { className: classes.dialogContent, sx: { paddingTop: 2 }, children: children })] }));
};
export default GenericDialog;
