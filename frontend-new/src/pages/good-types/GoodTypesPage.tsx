import { useState } from 'react';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';
import { MainPageTitle } from '@/components/layout';
import { EnhancedTable, EnhancedTableColumnType, type EnhanceTableHeaderTypes } from '@/components/enhanced-table';
import { DynamicFormWidget, DynamicField, type FieldMap } from '@/components/dynamic-form';
import { GenericDialog } from '@/components/dialogs';
import { TableSkeleton } from '@/components/feedback';
import { getJson, postJson, putJson } from '@/api/client';
import { parseApiError } from '@/api/parseApiError';
import { useLoader } from '@/hooks/useLoader';
import { useInitializeFunction } from '@/hooks/useInitializeFunction';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useUserRole, canWriteMasterData } from '@/helpers/rbac';

interface GoodType {
  id: number;
  nameEn: string;
  nameAr: string;
  canBreak: boolean;
  canBurn: boolean;
  isActive: boolean;
}

const buildFields = (initial: Partial<GoodType> = {}): FieldMap => ({
  nameEn: {
    type: DynamicField.TEXT,
    name: 'nameEn',
    title: 'Name (EN)',
    required: true,
    value: initial.nameEn ?? '',
    grid: { sm: 6, md: 6 },
  },
  nameAr: {
    type: DynamicField.TEXT,
    name: 'nameAr',
    title: 'Name (AR)',
    required: true,
    value: initial.nameAr ?? '',
    grid: { sm: 6, md: 6 },
  },
  canBreak: {
    type: DynamicField.CHECKBOX,
    name: 'canBreak',
    title: 'Can Break',
    value: initial.canBreak ?? false,
    grid: { sm: 6, md: 4 },
  },
  canBurn: {
    type: DynamicField.CHECKBOX,
    name: 'canBurn',
    title: 'Can Burn',
    value: initial.canBurn ?? false,
    grid: { sm: 6, md: 4 },
  },
  isActive: {
    type: DynamicField.CHECKBOX,
    name: 'isActive',
    title: 'Active',
    value: initial.isActive ?? true,
    grid: { sm: 6, md: 4 },
  },
});

export default function GoodTypesPage() {
  usePageTitle('Good Types');
  const role = useUserRole();
  const writable = canWriteMasterData(role);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GoodType | null>(null);

  const goodTypes = useLoader<GoodType[]>(() => getJson<GoodType[]>('/api/good-types'));
  const { initializing } = useInitializeFunction([goodTypes.reload]);

  const save = async (values: Record<string, unknown>): Promise<boolean> => {
    try {
      if (editing) await putJson(`/api/good-types/${editing.id}`, values);
      else await postJson('/api/good-types', values);
      toast.success('Good type saved');
      setDialogOpen(false);
      setEditing(null);
      await goodTypes.reload();
      return true;
    } catch (e) {
      toast.error(parseApiError(e).message);
      return false;
    }
  };

  const tableData = (goodTypes.data ?? []).reduce<Record<string, GoodType>>((acc, g) => {
    acc[String(g.id)] = g;
    return acc;
  }, {});

  const boolChip = (yes: string, no: string) => ({
    chipColors: {
      true: { color: '#fff', backgroundColor: yes },
      false: { color: '#fff', backgroundColor: no },
    },
    chipLabels: { true: 'Yes', false: 'No' },
  });

  const headers: EnhanceTableHeaderTypes[] = [
    { id: 'nameEn', label: 'Name (EN)', type: EnhancedTableColumnType.TEXT },
    { id: 'nameAr', label: 'Name (AR)', type: EnhancedTableColumnType.TEXT },
    { id: 'canBreak', label: 'Can Break', type: EnhancedTableColumnType.COLORED_CHIP, ...boolChip('#f57c00', '#9e9e9e') },
    { id: 'canBurn', label: 'Can Burn', type: EnhancedTableColumnType.COLORED_CHIP, ...boolChip('#c62828', '#9e9e9e') },
    { id: 'isActive', label: 'Active', type: EnhancedTableColumnType.COLORED_CHIP, ...boolChip('#2e7d32', '#9e9e9e') },
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
                setEditing(row as unknown as GoodType);
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
        title="Good Types"
        action={
          writable
            ? {
                title: 'Create Good Type',
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
          <TableSkeleton rows={8} columns={5} />
        ) : (
          <EnhancedTable
            title="Good Types"
            header={headers}
            data={tableData as never}
            defaultOrder="nameEn"
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
        title={editing ? 'Edit Good Type' : 'Create Good Type'}
      >
        <DynamicFormWidget fields={buildFields(editing ?? {})} onSubmit={save} drawerMode />
      </GenericDialog>
    </>
  );
}
