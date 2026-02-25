import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from '@mui/material';
import { GenericField } from './types';
import { GenericInput } from './GenericInput';

export function DynamicForm<T extends Record<string, any>>({
  open,
  title,
  fields,
  value,
  onChange,
  onSubmit,
  onClose,
  submitting
}: {
  open: boolean;
  title: string;
  fields: GenericField<T>[];
  value: Partial<T>;
  onChange: (next: Partial<T>) => void;
  onSubmit: () => void;
  onClose: () => void;
  submitting?: boolean;
}) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack gap={1} sx={{ mt: 1 }}>
          {fields.map((f) => (
            <GenericInput<T>
              key={String(f.key)}
              field={f}
              value={value[f.key]}
              onChange={(v) => onChange({ ...value, [f.key]: v })}
            />
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant='contained' onClick={onSubmit} disabled={submitting}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}
