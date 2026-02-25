import { jsx as _jsx } from "react/jsx-runtime";
import { tss } from "tss-react";
import GenericInputWrapper from "./GenericInputWrapper";
import { TextField } from "@mui/material";
const useStyles = tss.create({
    label: {
        display: "block",
    },
    input: {
        width: "100%",
    },
    errorInput: {},
    error: {
        color: "red",
    },
});
const GenericNumberInput = ({ title, value, disabled, error, onChange, name, onBlur = () => { } }) => {
    const { classes, cx } = useStyles();
    return _jsx(GenericInputWrapper, { title: "", error: error, name: name, children: _jsx(TextField, { type: "number", label: title, variant: "outlined", value: value, error: !!error, size: "medium", disabled: disabled, className: cx(classes.input, !!error ? classes.errorInput : undefined), onChange: (e) => onChange(e.target.value), onBlur: () => onBlur(name) }) });
};
export default GenericNumberInput;
