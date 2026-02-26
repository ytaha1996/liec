import React from 'react';
import GenericInputWrapper from './GenericInputWrapper';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { makeStyles } from 'tss-react/mui';
import dayjs from 'dayjs';

interface IGenericDatePickerProps {
  title: string;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  name: string;
  onBlur?: (name: string) => void;
  disabled?: boolean;
  minDate?: Date | string;
  maxDate?: Date | string;
}

const useStyles = makeStyles<{ error: boolean }>()((_theme, { error }) => ({
  label: {
    display: 'block'
  },
  input: {
    width: '100%'
  },
  errorInput: {},
  error: {}
}));

const GenericDatePicker: React.FC<IGenericDatePickerProps> = ({
  title,
  value,
  disabled,
  error,
  onChange,
  name,
  minDate,
  maxDate,
  onBlur = () => {}
}) => {
  const { classes } = useStyles({ error: !!error });

  const dayjsValue = value ? dayjs(value) : null;
  const dayjsMin = minDate ? dayjs(minDate) : undefined;
  const dayjsMax = maxDate ? dayjs(maxDate) : undefined;

  const onValueChange = (v: any) => {
    if (v && dayjs(v).isValid()) {
      onChange(dayjs(v).toISOString());
    } else {
      onChange(v);
    }
  };

  return (
    <GenericInputWrapper title="" error={error} name={name}>
      <DatePicker
        value={dayjsValue}
        label={title}
        minDate={dayjsMin}
        maxDate={dayjsMax}
        disabled={disabled}
        onChange={(v) => onValueChange(v)}
        slotProps={{
          textField: {
            className: classes.input,
            variant: 'outlined',
            size: 'medium',
            error: !!error,
          }
        }}
      />
    </GenericInputWrapper>
  );
};

export default GenericDatePicker;
