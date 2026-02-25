import { MenuItem, Switch, TextField, FormControlLabel } from '@mui/material';
import { GenericField } from './types';

export function GenericInput<T extends Record<string, any>>({
  field,
  value,
  onChange
}: {
  field: GenericField<T>;
  value: any;
  onChange: (next: any) => void;
}) {
  const type = field.type ?? 'text';

  if (type === 'switch') {
    return (
      <FormControlLabel
        control={<Switch checked={!!value} onChange={(_, checked) => onChange(checked)} />}
        label={field.label}
      />
    );
  }

  if (type === 'select') {
    return (
      <TextField
        fullWidth
        select
        margin='dense'
        label={field.label}
        value={value ?? ''}
        required={field.required}
        disabled={field.disabled}
        onChange={(e) => onChange(e.target.value)}
        helperText={field.helperText}
      >
        {(field.options ?? []).map((o) => (
          <MenuItem key={String(o.value)} value={o.value}>{o.label}</MenuItem>
        ))}
      </TextField>
    );
  }

  return (
    <TextField
      fullWidth
      margin='dense'
      label={field.label}
      type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
      multiline={type === 'multiline'}
      minRows={type === 'multiline' ? 3 : undefined}
      InputLabelProps={type === 'date' ? { shrink: true } : undefined}
      value={value ?? ''}
      required={field.required}
      disabled={field.disabled}
      placeholder={field.placeholder}
      inputProps={type === 'number' ? { min: field.min, max: field.max } : undefined}
      onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
      helperText={field.helperText}
    />
  );
}
