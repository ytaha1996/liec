import { jsx as _jsx } from "react/jsx-runtime";
import { Autocomplete, Box, Chip, TextField } from '@mui/material';
const GenericTagsInput = ({ title, value, error = '', disabled, onChange, }) => (_jsx(Box, { style: { width: '100%', marginBottom: '30px' }, children: _jsx(Autocomplete, { multiple: true, freeSolo: true, options: [], value: value, disabled: disabled, onChange: (_e, newValue) => onChange(newValue), renderTags: (selected, getTagProps) => selected.map((option, index) => (_jsx(Chip, { variant: "outlined", label: option, ...getTagProps({ index }) }))), renderInput: (params) => (_jsx(TextField, { ...params, label: title, error: !!error, helperText: error })) }) }));
export default GenericTagsInput;
