import React from 'react';
import { Autocomplete, Box, Chip, TextField } from '@mui/material';

interface Props {
  name:     string;
  title:    string;
  value:    string[];
  error?:   string;
  disabled?: boolean;
  onChange: (v: string[]) => void;
  onBlur?: (name: string) => void;
}

const GenericTagsInput: React.FC<Props> = ({
  title,
  value,
  error = '',
  disabled,
  onChange,
}) => (
  <Box style={{ width: '100%', marginBottom: '30px' }}>
    <Autocomplete
      multiple
      freeSolo
      options={[]}
      value={value}
      disabled={disabled}
      onChange={(_e, newValue) => onChange(newValue as string[])}
      renderTags={(selected, getTagProps) =>
        selected.map((option, index) => (
          <Chip
            variant="outlined"
            label={option}
            {...getTagProps({ index })}
          />
        ))
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label={title}
          error={!!error}
          helperText={error}
        />
      )}
    />
  </Box>
);

export default GenericTagsInput;
