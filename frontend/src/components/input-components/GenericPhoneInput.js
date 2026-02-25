import { jsx as _jsx } from "react/jsx-runtime";
import { tss } from "tss-react";
import GenericInputWrapper from "./GenericInputWrapper";
import { TextField } from "@mui/material";
const useStyles = tss.create({
    label: {
        display: "block",
    },
    input: {
        width: "100%"
    },
    errorInput: {},
    error: {},
});
const GenericPhoneInput = ({ title, type, value, disabled, error, size = "medium", onChange, name, onBlur = () => { }, onKeyDown = () => { } }) => {
    const { classes, cx } = useStyles();
    return (_jsx(GenericInputWrapper, { title: "", error: error, name: name, children: _jsx(TextField, { type: "tel", label: title, variant: "outlined", value: value ?? '', error: !!error, size: size, disabled: disabled, className: cx(classes.input, !!error ? classes.errorInput : undefined), onChange: (e) => onChange(e.target.value), onBlur: () => onBlur(name), onKeyDown: onKeyDown }) }));
};
export default GenericPhoneInput;
