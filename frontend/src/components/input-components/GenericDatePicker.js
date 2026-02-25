import { jsx as _jsx } from "react/jsx-runtime";
import GenericInputWrapper from './GenericInputWrapper';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { makeStyles } from 'tss-react/mui';
import dayjs from 'dayjs';
const useStyles = makeStyles()((_theme, { error }) => ({
    label: {
        display: 'block'
    },
    input: {
        width: '100%'
    },
    errorInput: {},
    error: {}
}));
const GenericDatePicker = ({ title, value, disabled, error, onChange, name, minDate, maxDate, onBlur = () => { } }) => {
    const { classes } = useStyles({ error: !!error });
    const dayjsValue = value ? dayjs(value) : null;
    const dayjsMin = minDate ? dayjs(minDate) : undefined;
    const dayjsMax = maxDate ? dayjs(maxDate) : undefined;
    const onValueChange = (v) => {
        if (v && dayjs(v).isValid()) {
            onChange(dayjs(v).toISOString());
        }
        else {
            onChange(v);
        }
    };
    return (_jsx(GenericInputWrapper, { title: "", error: error, name: name, children: _jsx(DatePicker, { value: dayjsValue, label: title, minDate: dayjsMin, maxDate: dayjsMax, disabled: disabled, onChange: (v) => onValueChange(v), slotProps: {
                textField: {
                    className: classes.input,
                    variant: 'outlined',
                    size: 'medium',
                    error: !!error,
                }
            } }) }));
};
export default GenericDatePicker;
