import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { FormControl, FormLabel, FormGroup, FormControlLabel, Checkbox, } from "@mui/material";
const GenericCheckBox = ({ label, options, onChange, value, defaultValue, }) => {
    const initialValue = value || defaultValue; // Use the defaultValue if value is falsy
    const handleCheckChange = (option) => {
        const updatedValue = initialValue.includes(option)
            ? initialValue.filter((item) => item !== option) // Remove the option if it's already selected
            : [...initialValue, option]; // Add the option if it's not selected
        onChange(updatedValue);
    };
    return (_jsxs(FormControl, { children: [_jsx(FormLabel, { id: "demo-checkbox-group-label", children: label }), _jsx(FormGroup, { children: options.map((option, index) => (_jsx(FormControlLabel, { control: _jsx(Checkbox, { checked: initialValue.includes(option), onChange: () => handleCheckChange(option) }), label: option }, index))) })] }));
};
export default GenericCheckBox;
