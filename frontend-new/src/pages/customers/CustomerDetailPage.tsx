import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MainPageSection, DetailPageLayout } from '@/components/layout';
import { Breadcrumbs } from '@/components/misc';
import { InformationWidget, InformationWidgetFieldTypes, type IInformationWidgetField } from '@/components/information-widget';
import { EnhancedTable, EnhancedTableColumnType, type EnhanceTableHeaderTypes } from '@/components/enhanced-table';
import { DynamicFormWidget, DynamicField, type FieldMap } from '@/components/dynamic-form';
import { GenericDialog } from '@/components/dialogs';
import { GenericInput } from '@/components/inputs';
import { Loader, EmptyState } from '@/components/feedback';
import { getJson, putJson, patchJson, postJson } from '@/api/client';
import { parseApiError } from '@/api/parseApiError';
import { useLoader } from '@/hooks/useLoader';
import { useInitializeFunction } from '@/hooks/useInitializeFunction';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useUserRole, canWriteMasterData, canSendWhatsApp } from '@/helpers/rbac';
import { PKG_STATUS_CHIPS } from '@/constants/statusColors';
import { PKG_STATUS_LABELS } from '@/constants/statusLabels';
import { buildCustomerFields } from './customerFields';

const CUSTOMER_INFO_FIELDS: IInformationWidgetField[] = [
  { type: InformationWidgetFieldTypes.Text, name: 'name', title: 'Name' },
  { type: InformationWidgetFieldTypes.MobileNumber, name: 'primaryPhone', title: 'Primary Phone' },
  { type: InformationWidgetFieldTypes.Text, name: 'email', title: 'Email' },
  { type: InformationWidgetFieldTypes.Text, name: 'companyName', title: 'Company Name' },
  { type: InformationWidgetFieldTypes.Text, name: 'taxId', title: 'Tax ID' },
  { type: InformationWidgetFieldTypes.Text, name: 'billingAddress', title: 'Billing Address', width: 'two-third' },
  { type: InformationWidgetFieldTypes.Boolean, name: 'isActive', title: 'Active' },
];

interface Consent {
  optInStatusUpdates?: boolean;
  optInDeparturePhotos?: boolean;
  optInArrivalPhotos?: boolean;
}

interface CustomerDetail {
  id: number;
  name: string;
  primaryPhone: string;
  email?: string;
  companyName?: string;
  taxId?: string;
  billingAddress?: string;
  isActive: boolean;
  whatsAppConsent?: Consent;
}

interface CustomerPackage {
  id: number;
  shipmentId?: number;
  shipmentRefCode?: string;
  status: string;
  chargeAmount?: number;
  createdAt?: string;
}

const buildConsentFields = (initial: Consent): FieldMap => ({
  optInStatusUpdates: {
    type: DynamicField.CHECKBOX,
    name: 'optInStatusUpdates',
    title: 'Opt-in Status Updates',
    value: initial.optInStatusUpdates ?? false,
  },
  optInDeparturePhotos: {
    type: DynamicField.CHECKBOX,
    name: 'optInDeparturePhotos',
    title: 'Opt-in Departure Photos',
    value: initial.optInDeparturePhotos ?? false,
  },
  optInArrivalPhotos: {
    type: DynamicField.CHECKBOX,
    name: 'optInArrivalPhotos',
    title: 'Opt-in Arrival Photos',
    value: initial.optInArrivalPhotos ?? false,
  },
});

export default function CustomerDetailPage() {
  const { id = '0' } = useParams();
  const navigate = useNavigate();
  const role = useUserRole();
  const writable = canWriteMasterData(role);
  const canMessage = canSendWhatsApp(role);
  const [shipmentId, setShipmentId] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const customer = useLoader<CustomerDetail>(() => getJson<CustomerDetail>(`/api/customers/${id}`));
  const packages = useLoader<CustomerPackage[]>(() => getJson<CustomerPackage[]>(`/api/customers/${id}/packages`));

  const { initialized, error } = useInitializeFunction([customer.reload, packages.reload], [id]);

  usePageTitle(customer.data?.name ?? `Customer #${id}`);

  const saveCustomer = async (values: Record<string, unknown>): Promise<boolean> => {
    try {
      await putJson(`/api/customers/${id}`, values);
      toast.success('Customer updated');
      setEditOpen(false);
      await customer.reload();
      return true;
    } catch (e) {
      toast.error(parseApiError(e).message);
      return false;
    }
  };

  const saveConsent = async (values: Record<string, unknown>): Promise<boolean> => {
    try {
      await patchJson(`/api/customers/${id}/whatsapp-consent`, values);
      toast.success('Consent updated');
      await customer.reload();
      return true;
    } catch (e) {
      toast.error(parseApiError(e).message);
      return false;
    }
  };

  const sendWhatsApp = async (kind: 'status' | 'departure' | 'arrival') => {
    if (!shipmentId.trim()) {
      toast.error('Shipment ID is required');
      return;
    }
    setSending(true);
    try {
      const url =
        kind === 'status'
          ? `/api/customers/${id}/whatsapp/status?shipmentId=${shipmentId}`
          : `/api/customers/${id}/whatsapp/photos/${kind}?shipmentId=${shipmentId}`;
      await postJson(url);
      toast.success('WhatsApp message sent');
    } catch (e) {
      toast.error(parseApiError(e).message);
    } finally {
      setSending(false);
    }
  };

  if (!initialized) return <Loader fullScreen />;
  if (error || !customer.data)
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>Customer not found.</AlertDescription>
        </Alert>
      </div>
    );

  const data = customer.data;
  const consent = data.whatsAppConsent ?? {};

  const packagesTableData = (packages.data ?? []).reduce<Record<string, CustomerPackage & Record<string, unknown>>>(
    (acc, p) => {
      acc[String(p.id)] = {
        ...p,
        chargeAmountDisplay: p.chargeAmount != null ? `$${Number(p.chargeAmount).toFixed(2)}` : '—',
        createdAtDisplay: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—',
      };
      return acc;
    },
    {},
  );

  const packagesHeaders: EnhanceTableHeaderTypes[] = [
    {
      id: 'id',
      label: 'Package ID',
      type: EnhancedTableColumnType.Clickable,
      onClick: (_tid, row) => navigate(`/ops/packages/${row.id}`),
    },
    {
      id: 'shipmentRefCode',
      label: 'Shipment',
      type: EnhancedTableColumnType.Clickable,
      onClick: (_tid, row) => navigate(`/ops/shipments/${row.shipmentId}`),
    },
    {
      id: 'status',
      label: 'Status',
      type: EnhancedTableColumnType.COLORED_CHIP,
      chipColors: PKG_STATUS_CHIPS,
      chipLabels: PKG_STATUS_LABELS,
    },
    { id: 'chargeAmountDisplay', label: 'Charge', type: EnhancedTableColumnType.TEXT },
    { id: 'createdAtDisplay', label: 'Created', type: EnhancedTableColumnType.TEXT },
  ];

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Customers', href: '/master/customers' },
          { label: data.name },
        ]}
      />
      <DetailPageLayout
        title={data.name}
        chips={
          <>
            <Badge variant="outline">#{data.id}</Badge>
            <Badge
              style={{
                color: '#fff',
                backgroundColor: data.isActive ? '#2e7d32' : '#9e9e9e',
              }}
            >
              {data.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </>
        }
      >
        <InformationWidget
          title="Info"
          fields={CUSTOMER_INFO_FIELDS}
          data={data as unknown as Record<string, unknown>}
          actions={
            writable ? (
              <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
                Edit Info
              </Button>
            ) : null
          }
        />

        <MainPageSection title="WhatsApp Consent">
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant={consent.optInStatusUpdates ? 'default' : 'secondary'}>
              Status: {consent.optInStatusUpdates ? 'Yes' : 'No'}
            </Badge>
            <Badge variant={consent.optInDeparturePhotos ? 'default' : 'secondary'}>
              Departure: {consent.optInDeparturePhotos ? 'Yes' : 'No'}
            </Badge>
            <Badge variant={consent.optInArrivalPhotos ? 'default' : 'secondary'}>
              Arrival: {consent.optInArrivalPhotos ? 'Yes' : 'No'}
            </Badge>
          </div>
          {writable && (
            <DynamicFormWidget
              fields={buildConsentFields(consent)}
              onSubmit={saveConsent}
              drawerMode
              submitLabel="Update Consent"
            />
          )}
        </MainPageSection>

        {canMessage && (
          <MainPageSection title="Individual WhatsApp">
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="sm:w-64">
                <GenericInput
                  name="shipmentId"
                  title="Shipment ID"
                  value={shipmentId}
                  onChange={setShipmentId}
                  placeholder="e.g. 42"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" disabled={sending} onClick={() => sendWhatsApp('status')}>
                  Status
                </Button>
                <Button variant="outline" disabled={sending} onClick={() => sendWhatsApp('departure')}>
                  Departure Photos
                </Button>
                <Button variant="outline" disabled={sending} onClick={() => sendWhatsApp('arrival')}>
                  Arrival Photos
                </Button>
              </div>
            </div>
          </MainPageSection>
        )}

        <MainPageSection title="Packages">
          {Object.keys(packagesTableData).length === 0 ? (
            <EmptyState message="No packages found for this customer." />
          ) : (
            <EnhancedTable
              title="Customer Packages"
              header={packagesHeaders}
              data={packagesTableData as never}
              defaultOrder="id"
              defaultDirection="desc"
            />
          )}
        </MainPageSection>
      </DetailPageLayout>

      <GenericDialog open={editOpen} onClose={() => setEditOpen(false)} title="Edit Customer">
        <DynamicFormWidget
          fields={buildCustomerFields(data as unknown as Record<string, unknown>)}
          onSubmit={saveCustomer}
          drawerMode
        />
      </GenericDialog>
    </>
  );
}
