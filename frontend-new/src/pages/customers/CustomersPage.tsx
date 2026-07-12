import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Pencil, ExternalLink, FileDown } from 'lucide-react';
import { MainPageTitle } from '@/components/layout';
import { EnhancedTable, EnhancedTableColumnType, TableFilterTypes, type EnhanceTableHeaderTypes, type ITableFilterType } from '@/components/enhanced-table';
import { DynamicFormWidget } from '@/components/dynamic-form';
import { GenericDialog } from '@/components/dialogs';
import { TableSkeleton } from '@/components/feedback';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getJson, postJson, putJson } from '@/api/client';
import { parseApiError } from '@/api/parseApiError';
import { useLoader } from '@/hooks/useLoader';
import { useInitializeFunction } from '@/hooks/useInitializeFunction';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useUserRole, canWriteMasterData } from '@/helpers/rbac';
import { buildCustomerFields } from './customerFields';

const ENDPOINT = '/api/customers';

interface Customer {
  id: number;
  name: string;
  primaryPhone: string;
  email?: string;
  companyName?: string;
  taxId?: string;
  billingAddress?: string;
  isActive: boolean;
}

export default function CustomersPage() {
  usePageTitle('Customers');
  const navigate = useNavigate();
  const role = useUserRole();
  const writable = canWriteMasterData(role);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);

  const customers = useLoader<Customer[]>(() => getJson<Customer[]>(ENDPOINT));
  const { initializing } = useInitializeFunction([customers.reload]);

  const save = async (values: Record<string, unknown>): Promise<boolean> => {
    try {
      if (editing) await putJson(`${ENDPOINT}/${editing.id}`, values);
      else await postJson(ENDPOINT, values);
      toast.success(editing ? 'Customer updated' : 'Customer created');
      setDialogOpen(false);
      setEditing(null);
      await customers.reload();
      return true;
    } catch (e) {
      toast.error(parseApiError(e).message);
      return false;
    }
  };

  const exportFormat = async (format: 'csv' | 'vcf') => {
    try {
      const r = await postJson<{ publicUrl: string }>('/api/exports/group-helper', { format });
      window.open(r.publicUrl, '_blank');
      toast.success('Export generated');
    } catch (e) {
      toast.error(parseApiError(e).message);
    }
  };

  const exportExcel = async () => {
    try {
      const r = await postJson<{ publicUrl: string }>('/api/exports/customers-excel');
      window.open(r.publicUrl, '_blank');
      toast.success('Excel ready');
    } catch (e) {
      toast.error(parseApiError(e).message);
    }
  };

  const tableData = (customers.data ?? []).reduce<Record<string, Omit<Customer, 'isActive'> & { isActive: string }>>(
    (acc, c) => {
      acc[String(c.id)] = { ...c, isActive: String(c.isActive) };
      return acc;
    },
    {},
  );

  const headers: EnhanceTableHeaderTypes[] = [
    { id: 'id', label: 'ID', type: EnhancedTableColumnType.NUMBER, numeric: true },
    { id: 'name', label: 'Name', type: EnhancedTableColumnType.TEXT },
    { id: 'primaryPhone', label: 'Phone', type: EnhancedTableColumnType.PhoneNumber },
    { id: 'email', label: 'Email', type: EnhancedTableColumnType.TEXT },
    {
      id: 'isActive',
      label: 'Active',
      type: EnhancedTableColumnType.COLORED_CHIP,
      chipColors: {
        true: { color: '#fff', backgroundColor: '#2e7d32' },
        false: { color: '#fff', backgroundColor: '#9e9e9e' },
      },
      chipLabels: { true: 'Active', false: 'Inactive' },
    },
    {
      id: 'actions',
      label: 'Actions',
      type: EnhancedTableColumnType.Action,
      actions: [
        ...(writable
          ? [
              {
                icon: <Pencil className="size-4" />,
                label: 'Edit',
                onClick: (_id: string, row: Record<string, unknown>) => {
                  setEditing(row as unknown as Customer);
                  setDialogOpen(true);
                },
              },
            ]
          : []),
        {
          icon: <ExternalLink className="size-4" />,
          label: 'Open Detail',
          onClick: (id: string) => navigate(`/master/customers/${id}`),
        },
      ],
    },
  ];

  const filters: ITableFilterType[] = [
    {
      name: 'isActive',
      title: 'Status',
      type: TableFilterTypes.SELECT,
      options: { true: 'Active', false: 'Inactive' },
    },
  ];

  return (
    <>
      <MainPageTitle
        title="Customers"
        action={
          writable
            ? {
                title: 'Create Customer',
                onClick: () => {
                  setEditing(null);
                  setDialogOpen(true);
                },
              }
            : undefined
        }
      />
      <div className="px-4 sm:px-6 pb-6 space-y-6">
        {initializing ? (
          <TableSkeleton rows={6} columns={5} />
        ) : (
          <EnhancedTable
            title="Customers"
            header={headers}
            data={tableData as never}
            defaultOrder="name"
            defaultDirection="asc"
            filters={filters}
          />
        )}

        <div className="space-y-3">
          <Alert>
            <AlertTitle>Exports</AlertTitle>
            <AlertDescription>
              WhatsApp groups reveal phone numbers to all members. Use export features responsibly.
            </AlertDescription>
          </Alert>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={exportExcel}>
              <FileDown className="mr-2 size-4" /> Export Excel
            </Button>
            <Button variant="outline" onClick={() => exportFormat('csv')}>
              <FileDown className="mr-2 size-4" /> Export CSV
            </Button>
            <Button variant="outline" onClick={() => exportFormat('vcf')}>
              <FileDown className="mr-2 size-4" /> Export VCF
            </Button>
          </div>
        </div>
      </div>

      <GenericDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
        title={editing ? 'Edit Customer' : 'Create Customer'}
      >
        <DynamicFormWidget
          fields={buildCustomerFields((editing ?? undefined) as Record<string, unknown> | undefined)}
          onSubmit={save}
          drawerMode
        />
      </GenericDialog>
    </>
  );
}
