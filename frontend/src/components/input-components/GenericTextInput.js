import { jsx as _jsx } from "react/jsx-runtime";
import { tss } from 'tss-react';
import GenericInputWrapper from './GenericInputWrapper';
import { TextField } from '@mui/material';
const useStyles = tss.create({
    label: {
        display: 'block'
    },
    input: {
        width: '100%'
    },
    errorInput: {},
    error: {}
});
const GenericInput = ({ title, variant = 'outlined', type = 'text', value, disabled, error, size = 'medium', onChange, name, placeholder, onBlur = () => { }, className, hideError, containerClassName }) => {
    const { classes, cx } = useStyles();
    return (_jsx(GenericInputWrapper, { customClasses: { main: containerClassName }, hideError: hideError, title: '', error: error, name: name, children: _jsx(TextField, { type: type, variant: variant, value: value, label: title, placeholder: placeholder, error: !!error, size: size, disabled: disabled, className: cx(classes.input, className, !!error ? classes.errorInput : undefined), onChange: (e) => onChange(e.target.value), onBlur: () => onBlur(name) }) }));
};
export default GenericInput;
