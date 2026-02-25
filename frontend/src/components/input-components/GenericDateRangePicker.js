import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Typography } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
const GenericDateRangePicker = ({ title, value, onChange, error, name, onBlur = () => { }, disabled, }) => {
    const fromValue = value?.[0] ? dayjs(value[0]) : null;
    const toValue = value?.[1] ? dayjs(value[1]) : null;
    const handleFromChange = (v) => {
        const newDate = v && dayjs(v).isValid() ? dayjs(v).toDate() : null;
        onChange([newDate, value?.[1] ?? null]);
    };
    const handleToChange = (v) => {
        const newDate = v && dayjs(v).isValid() ? dayjs(v).toDate() : null;
        onChange([value?.[0] ?? null, newDate]);
    };
    return (_jsx(LocalizationProvider, { dateAdapter: AdapterDayjs, children: _jsxs(Box, { children: [title && (_jsx(Typography, { variant: "subtitle1", sx: { mb: 1, fontWeight: 'bold' }, children: title })), _jsxs(Box, { sx: { display: 'flex', gap: 1, alignItems: 'center' }, children: [_jsx(DatePicker, { label: "From", value: fromValue, onChange: handleFromChange, disabled: disabled, slotProps: { textField: { size: 'small', error: !!error } } }), _jsx(Typography, { variant: "body2", sx: { mx: 0.5 }, children: "\u2013" }), _jsx(DatePicker, { label: "To", value: toValue, onChange: handleToChange, disabled: disabled, slotProps: { textField: { size: 'small', error: !!error } } })] }), error && (_jsx(Typography, { variant: "caption", color: "error", sx: { mt: 1 }, children: error }))] }) }));
};
export default GenericDateRangePicker;
