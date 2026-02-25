import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { InputLabel } from "@mui/material";
import { tss } from "tss-react";
const useStyles = tss.create({
    root: {
        margin: "0 0 15px"
    },
    label: {
        display: "block",
        fontSize: "14px",
        color: "#223354"
    },
    errorInput: {
        border: "1px solid red"
    },
    error: {
        display: "block",
        color: "red",
        fontSize: "12px",
        lineHeight: "18px",
        minHeight: "18px"
    },
});
const GenericInputWrapper = ({ title, name, error, children, hideError, customClasses }) => {
    const { classes, cx } = useStyles();
    return _jsxs("div", { className: cx(classes.root, customClasses?.main), children: [!!title && _jsx(InputLabel, { className: classes.label, children: title }), children, !hideError &&
                _jsx("span", { className: classes.error, children: error })] });
};
export default GenericInputWrapper;
