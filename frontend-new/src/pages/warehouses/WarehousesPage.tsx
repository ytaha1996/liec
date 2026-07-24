import { useState } from 'react';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';
import { MainPageTitle } from '@/components/layout';
import { EnhancedTable } from '@/components/enhanced-table';
import {
  EnhancedTableColumnType,
  type EnhanceTableHeaderTypes,
} from '@/components/enhanced-table';
import { DynamicFormWidget, DynamicField, type FieldMap } from '@/components/dynamic-form';
import { GenericDialog } from '@/components/dialogs';
import { LoadFailed, TableSkeleton } from '@/components/feedback';
import { getJson, postJson, putJson } from '@/api/client';
import { parseApiError } from '@/api/parseApiError';
import { useLoader } from '@/hooks/useLoader';
import { useInitializeFunction } from '@/hooks/useInitializeFunction';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useUserRole, canWriteMasterData } from '@/helpers/rbac';

interface Warehouse {
  id: number;
  code: string;
  name: string;
  city: string;
  country: string;
  maxWeightKg: number;
  maxCbm: number;
  isActive: boolean;
}

const buildFields = (initial: Partial<Warehouse> = {}): FieldMap => ({
  code: {
    type: DynamicField.TEXT,
    name: 'code',
    title: 'Code',
    required: true,
    value: initial.code ?? '',
    grid: { sm: 6, md: 4 },
  },
  name: {
    type: DynamicField.TEXT,
    name: 'name',
    title: 'Name',
    required: true,
    value: initial.name ?? '',
    grid: { sm: 6, md: 8 },
  },
  city: {
    type: DynamicField.TEXT,
    name: 'city',
    title: 'City',
    required: true,
    value: initial.city ?? '',
    grid: { sm: 6, md: 6 },
  },
  country: {
    type: DynamicField.TEXT,
    name: 'country',
    title: 'Country',
    required: true,
    value: initial.country ?? '',
    grid: { sm: 6, md: 6 },
  },
  maxWeightKg: {
    type: DynamicField.NUMBER,
    name: 'maxWeightKg',
    title: 'Max Weight (kg, 0 = unlimited)',
    value: initial.maxWeightKg ?? 0,
    min: 0,
    grid: { sm: 6, md: 6 },
  },
  maxCbm: {
    type: DynamicField.NUMBER,
    name: 'maxCbm',
    title: 'Max CBM (0 = unlimited)',
    value: initial.maxCbm ?? 0,
    min: 0,
    grid: { sm: 6, md: 6 },
  },
  isActive: {
    type: DynamicField.CHECKBOX,
    name: 'isActive',
    title: 'Active',
    value: initial.isActive ?? true,
  },
});

export default function WarehousesPage() {
  usePageTitle('Warehouses');
  const role = useUserRole();
  const writable = canWriteMasterData(role);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);

  const warehouses = useLoader<Warehouse[]>(() => getJson<Warehouse[]>('/api/warehouses'));
  const { initializing, error } = useInitializeFunction([warehouses.reload]);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (_id: string, row: Record<string, unknown>) => {
    setEditing(row as unknown as Warehouse);
    setDialogOpen(true);
  };

  const submit = async (values: Record<string, unknown>) => {
    try {
      if (editing) await putJson(`/api/warehouses/${editing.id}`, values);
      else await postJson('/api/warehouses', values);
      toast.success('Warehouse saved');
      setDialogOpen(false);
      await warehouses.reload();
      return true;
    } catch (e) {
      toast.error(parseApiError(e).message);
      return false;
    }
  };

  const tableData = (warehouses.data ?? []).reduce<Record<string, Warehouse>>((acc, w) => {
    acc[String(w.id)] = w;
    return acc;
  }, {});

  const header: EnhanceTableHeaderTypes[] = [
    { id: 'code', label: 'Code', type: EnhancedTableColumnType.TEXT },
    { id: 'name', label: 'Name', type: EnhancedTableColumnType.TEXT },
    { id: 'city', label: 'City', type: EnhancedTableColumnType.TEXT },
    { id: 'country', label: 'Country', type: EnhancedTableColumnType.TEXT },
    { id: 'maxWeightKg', label: 'Max Weight (kg)', type: EnhancedTableColumnType.NUMBER, numeric: true },
    { id: 'maxCbm', label: 'Max CBM', type: EnhancedTableColumnType.NUMBER, numeric: true },
    {
      id: 'isActive',
      label: 'Active',
      type: EnhancedTableColumnType.COLORED_CHIP,
      chipColors: {
        true: { color: '#fff', backgroundColor: '#2e7d32' },
        false: { color: '#333', backgroundColor: '#e0e0e0' },
      },
      chipLabels: { true: 'Yes', false: 'No' },
    },
    {
      id: 'actions',
      label: 'Actions',
      type: EnhancedTableColumnType.Action,
      actions: writable
        ? [{ icon: <Pencil className="size-4" />, label: 'Edit', onClick: openEdit }]
        : [],
    },
  ];

  return (
    <>
      <MainPageTitle
        title="Warehouses"
        action={writable ? { title: 'Create Warehouse', onClick: openCreate } : undefined}
      />
      <div className="px-4 sm:px-6 pb-6">
        {initializing ? (
          <TableSkeleton rows={6} columns={7} />
        ) : error ? (
          <LoadFailed what="warehouses" onRetry={warehouses.reload} />
        ) : (
          <EnhancedTable
            title="Warehouses"
            header={header}
            data={tableData as never}
            defaultOrder="name"
            defaultDirection="asc"
          />
        )}
      </div>

      <GenericDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? 'Edit Warehouse' : 'Create Warehouse'}
      >
        <DynamicFormWidget fields={buildFields(editing ?? {})} onSubmit={submit} drawerMode />
      </GenericDialog>
    </>
  );
}
