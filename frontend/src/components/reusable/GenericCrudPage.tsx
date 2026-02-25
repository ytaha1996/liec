import { Alert, Button, Container, Stack, Typography } from '@mui/material';
import { DynamicForm } from './DynamicForm';
import { GenericTable } from './GenericTable';
import { GenericColumn, GenericField, RowAction } from './types';

export function GenericCrudPage<T extends Record<string, any>>({
  title,
  rows,
  loading,
  fields,
  columns,
  open,
  formValue,
  onOpenCreate,
  onEdit,
  onFormChange,
  onClose,
  onSave,
  customActions,
  emptyText
}: {
  title: string;
  rows: T[];
  loading: boolean;
  fields: GenericField<T>[];
  columns: GenericColumn<T>[];
  open: boolean;
  formValue: Partial<T>;
  onOpenCreate: () => void;
  onEdit: (row: T) => void;
  onFormChange: (next: Partial<T>) => void;
  onClose: () => void;
  onSave: () => void;
  customActions?: RowAction<T>[];
  emptyText?: string;
}) {
  const actions: RowAction<T>[] = [
    { label: 'Edit', onClick: onEdit },
    ...(customActions ?? [])
  ];

  return (
    <Container>
      <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 2 }}>
        <Typography variant='h4'>{title}</Typography>
        <Button variant='contained' onClick={onOpenCreate}>Create</Button>
      </Stack>

      {loading ? <Alert severity='info'>Loading...</Alert> : rows.length === 0 ? <Alert severity='info'>{emptyText ?? `No ${title.toLowerCase()} found`}</Alert> : (
        <GenericTable rows={rows} columns={columns} actions={actions} />
      )}

      <DynamicForm<T>
        open={open}
        title={`${title} Form`}
        fields={fields}
        value={formValue}
        onChange={onFormChange}
        onSubmit={onSave}
        onClose={onClose}
      />
    </Container>
  );
}
