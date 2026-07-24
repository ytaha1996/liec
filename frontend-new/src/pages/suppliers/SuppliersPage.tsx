import { useState } from 'react';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';
import { MainPageTitle } from '@/components/layout';
import { EnhancedTable, EnhancedTableColumnType, type EnhanceTableHeaderTypes } from '@/components/enhanced-table';
import { DynamicFormWidget, DynamicField, type FieldMap } from '@/components/dynamic-form';
import { GenericDialog } from '@/components/dialogs';
import { LoadFailed, TableSkeleton } from '@/components/feedback';
import { getJson, postJson, putJson } from '@/api/client';
import { parseApiError } from '@/api/parseApiError';
import { useLoader } from '@/hooks/useLoader';
import { useInitializeFunction } from '@/hooks/useInitializeFunction';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useUserRole, canWriteMasterData } from '@/helpers/rbac';

interface Supplier {
  id: number;
  name: string;
  email?: string;
  isActive: boolean;
}

const buildFields = (initial: Partial<Supplier> = {}): FieldMap => ({
  name: {
    type: DynamicField.TEXT,
    name: 'name',
    title: 'Name',
    required: true,
    value: initial.name ?? '',
  },
  email: {
    type: DynamicField.EMAIL,
    name: 'email',
    title: 'Email',
    value: initial.email ?? '',
  },
  isActive: {
    type: DynamicField.CHECKBOX,
    name: 'isActive',
    title: 'Active',
    value: initial.isActive ?? true,
  },
});

export default function SuppliersPage() {
  usePageTitle('Suppliers');
  const role = useUserRole();
  const writable = canWriteMasterData(role);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  const suppliers = useLoader<Supplier[]>(() => getJson<Supplier[]>('/api/suppliers'));
  const { initializing, error } = useInitializeFunction([suppliers.reload]);

  const save = async (values: Record<string, unknown>): Promise<boolean> => {
    try {
      if (editing) await putJson(`/api/suppliers/${editing.id}`, values);
      else await postJson('/api/suppliers', values);
      toast.success('Supplier saved');
      setDialogOpen(false);
      setEditing(null);
      await suppliers.reload();
      return true;
    } catch (e) {
      toast.error(parseApiError(e).message);
      return false;
    }
  };

  const tableData = (suppliers.data ?? []).reduce<Record<string, Supplier>>((acc, s) => {
    acc[String(s.id)] = s;
    return acc;
  }, {});

  const headers: EnhanceTableHeaderTypes[] = [
    { id: 'name', label: 'Name', type: EnhancedTableColumnType.TEXT },
    { id: 'email', label: 'Email', type: EnhancedTableColumnType.TEXT },
    {
      id: 'isActive',
      label: 'Active',
      type: EnhancedTableColumnType.COLORED_CHIP,
      chipColors: {
        true: { color: '#fff', backgroundColor: '#2e7d32' },
        false: { color: '#fff', backgroundColor: '#9e9e9e' },
      },
      chipLabels: { true: 'Yes', false: 'No' },
    },
    {
      id: 'actions',
      label: 'Actions',
      type: EnhancedTableColumnType.Action,
      actions: writable
        ? [
            {
              icon: <Pencil className="size-4" />,
              label: 'Edit',
              onClick: (_id, row) => {
                setEditing(row as unknown as Supplier);
                setDialogOpen(true);
              },
            },
          ]
        : [],
    },
  ];

  return (
    <>
      <MainPageTitle
        title="Suppliers"
        action={
          writable
            ? {
                title: 'Create Supplier',
                onClick: () => {
                  setEditing(null);
                  setDialogOpen(true);
                },
              }
            : undefined
        }
      />
      <div className="px-4 sm:px-6 pb-6">
        {initializing ? (
          <TableSkeleton rows={6} columns={3} />
        ) : error ? (
          <LoadFailed what="suppliers" onRetry={suppliers.reload} />
        ) : (
          <EnhancedTable
            title="Suppliers"
            header={headers}
            data={tableData as never}
            defaultOrder="name"
            defaultDirection="asc"
          />
        )}
      </div>

      <GenericDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
        title={editing ? 'Edit Supplier' : 'Create Supplier'}
      >
        <DynamicFormWidget fields={buildFields(editing ?? {})} onSubmit={save} drawerMode />
      </GenericDialog>
    </>
  );
}
