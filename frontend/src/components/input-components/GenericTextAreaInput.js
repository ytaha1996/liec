import { jsx as _jsx } from "react/jsx-runtime";
import { tss } from 'tss-react';
import GenericInputWrapper from './GenericInputWrapper';
import { TextField } from '@mui/material';
const useStyles = tss.create({
    input: {
        width: "100%"
    },
    errorInput: {},
    error: {},
});
const GenericTextAreaInput = ({ title, value, onChange, name, error, disabled, rows = 4, placeholder, onBlur = () => { }, className, hideError, variant = 'outlined', containerClassName, }) => {
    const { classes, cx } = useStyles();
    return (_jsx(GenericInputWrapper, { customClasses: { main: containerClassName }, hideError: hideError, title: "", error: error, name: name, children: _jsx(TextField, { multiline: true, variant: variant, value: value, label: title, placeholder: placeholder, error: !!error, disabled: disabled, rows: rows, maxRows: rows, className: cx(classes.input, className, !!error ? classes.errorInput : undefined), onChange: (e) => onChange(e.target.value), onBlur: () => onBlur(name) }) }));
};
export default GenericTextAreaInput;
