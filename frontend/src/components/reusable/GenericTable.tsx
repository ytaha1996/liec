import { Button, Chip, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { GenericColumn, RowAction } from './types';

function formatValue<T extends Record<string, any>>(col: GenericColumn<T>, row: T) {
  const raw = (row as any)[col.key as string];
  if (col.formatter) return col.formatter(raw, row);
  switch (col.type) {
    case 'boolean': return <Chip size='small' label={raw ? 'Yes' : 'No'} color={raw ? 'success' : 'default'} />;
    case 'date': return raw ? new Date(raw).toLocaleDateString() : '';
    case 'currency': return typeof raw === 'number' ? `${raw.toFixed(2)} ${col.currency ?? ''}`.trim() : raw;
    default: return String(raw ?? '');
  }
}

export function GenericTable<T extends Record<string, any>>({
  rows,
  columns,
  actions,
  rowKey = 'id'
}: {
  rows: T[];
  columns: GenericColumn<T>[];
  actions?: RowAction<T>[];
  rowKey?: keyof T | string;
}) {
  return (
    <Table>
      <TableHead>
        <TableRow>
          {columns.map((c) => <TableCell key={String(c.key)} align={c.align} sx={{ width: c.width }}>{c.header}</TableCell>)}
          {actions?.length ? <TableCell>Actions</TableCell> : null}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={String((r as any)[rowKey as string])}>
            {columns.map((c) => <TableCell key={String(c.key)} align={c.align}>{formatValue(c, r)}</TableCell>)}
            {actions?.length ? (
              <TableCell>
                {actions.filter((a) => a.visible ? a.visible(r) : true).map((a) => (
                  <Button
                    key={a.label}
                    size='small'
                    color={a.color ?? 'primary'}
                    variant={a.variant ?? 'text'}
                    disabled={a.disabled ? a.disabled(r) : false}
                    onClick={() => a.onClick(r)}
                  >
                    {a.label}
                  </Button>
                ))}
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
