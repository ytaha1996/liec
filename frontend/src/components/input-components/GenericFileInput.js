import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef } from "react";
import { tss } from "tss-react";
import GenericInputWrapper from "./GenericInputWrapper";
import { TextField } from "@mui/material";
import { getMimeTypes } from "../../helpers/file-utils";
const useStyles = tss.create({
    input: {
        width: "100%"
    },
    hiddenInput: {
        display: "none"
    },
});
const GenericFileInput = ({ title, variant = "outlined", value, disabled, error, size = "medium", onChange, name, placeholder, className, hideError, containerClassName, allowedTypes }) => {
    const { classes, cx } = useStyles();
    const fileInputRef = useRef(null);
    const handleTextFieldClick = () => {
        fileInputRef.current?.click();
    };
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            onChange(file);
        }
    };
    const displayValue = typeof value === 'string' ? value : value?.name || '';
    return (_jsxs(GenericInputWrapper, { customClasses: { main: containerClassName }, hideError: hideError, title: "", error: error, name: name, children: [_jsx(TextField, { type: "text", variant: variant, value: displayValue, label: title, placeholder: placeholder, error: !!error, size: size, disabled: disabled, className: cx(classes.input, className), onClick: handleTextFieldClick, InputProps: { readOnly: true } }), _jsx("input", { type: "file", ref: fileInputRef, onChange: handleFileChange, accept: getMimeTypes(allowedTypes).join(','), className: classes.hiddenInput })] }));
};
export default GenericFileInput;
