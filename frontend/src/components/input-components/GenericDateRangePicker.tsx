import React from 'react';
import { Box, Typography } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

interface IGenericDateRangePickerProps {
  title: string;
  value: [Date | null, Date | null];
  onChange: (value: [Date | null, Date | null]) => void;
  error?: string;
  name: string;
  onBlur?: (name: string) => void;
  disabled?: boolean;
}

const GenericDateRangePicker: React.FC<IGenericDateRangePickerProps> = ({
  title,
  value,
  onChange,
  error,
  name,
  onBlur = () => {},
  disabled,
}) => {
  const fromValue = value?.[0] ? dayjs(value[0]) : null;
  const toValue = value?.[1] ? dayjs(value[1]) : null;

  const handleFromChange = (v: any) => {
    const newDate = v && dayjs(v).isValid() ? dayjs(v).toDate() : null;
    onChange([newDate, value?.[1] ?? null]);
  };

  const handleToChange = (v: any) => {
    const newDate = v && dayjs(v).isValid() ? dayjs(v).toDate() : null;
    onChange([value?.[0] ?? null, newDate]);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        {title && (
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
            {title}
          </Typography>
        )}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <DatePicker
            label="From"
            value={fromValue}
            onChange={handleFromChange}
            disabled={disabled}
            slotProps={{ textField: { size: 'small', error: !!error } }}
          />
          <Typography variant="body2" sx={{ mx: 0.5 }}>–</Typography>
          <DatePicker
            label="To"
            value={toValue}
            onChange={handleToChange}
            disabled={disabled}
            slotProps={{ textField: { size: 'small', error: !!error } }}
          />
        </Box>
        {error && (
          <Typography variant="caption" color="error" sx={{ mt: 1 }}>
            {error}
          </Typography>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default GenericDateRangePicker;
