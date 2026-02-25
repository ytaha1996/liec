import { jsx as _jsx } from "react/jsx-runtime";
import { tss } from "tss-react";
import GenericInputWrapper from "./GenericInputWrapper";
import { Autocomplete, TextField } from "@mui/material";
const useStyles = tss.create({
    label: {
        display: "block",
    },
    input: {
        width: "100%",
    },
    errorInput: {},
    error: {},
});
const GenericSelectInput = ({ title, value, disabled, error, onChange, name, watermark, items, hideError, multiple }) => {
    const { classes } = useStyles();
    const itemArray = Object.entries(items).map(([key, value]) => ({
        key,
        value,
    }));
    const selectedValue = multiple
        ? (value || []).map(v => itemArray.find(item => item.key === v)).filter(Boolean)
        : itemArray.find(item => item.key === value) ?? null;
    const handleChange = (_event, newValue) => {
        if (multiple) {
            onChange(newValue.map((item) => item.key));
        }
        else {
            onChange(newValue ? newValue.key : null);
        }
    };
    return _jsx(GenericInputWrapper, { title: "", error: error, name: name, hideError: hideError, children: _jsx(Autocomplete, { id: name, multiple: multiple, options: itemArray, getOptionLabel: (option) => (option && option.value) || '', value: selectedValue, disabled: disabled, onChange: handleChange, renderInput: (params) => (_jsx(TextField, { ...params, variant: "outlined", size: "medium", label: title, error: !!error, placeholder: watermark })) }) });
};
export default GenericSelectInput;
