import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { MainPageTitle, MainPageSection } from '@/components/layout';
import { EnhancedTable, EnhancedTableColumnType, type EnhanceTableHeaderTypes } from '@/components/enhanced-table';
import { GenericDialog } from '@/components/dialogs';
import { LoadFailed, TableSkeleton } from '@/components/feedback';
import { getJson } from '@/api/client';
import { useLoader } from '@/hooks/useLoader';
import { useInitializeFunction } from '@/hooks/useInitializeFunction';
import { usePageTitle } from '@/hooks/usePageTitle';

interface Campaign {
  id: number;
  type: string;
  createdAt: string;
  recipientCount: number;
  completed: boolean;
}

interface DeliveryLog {
  id: number;
  phone: string;
  result: string;
  sentAt?: string;
  failureReason?: string;
}

export default function MessagingLogsPage() {
  usePageTitle('Messaging Logs');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  const campaigns = useLoader<Campaign[]>(() => getJson<Campaign[]>('/api/whatsapp/campaigns'));
  const campaignDetail = useLoader<{ logs?: DeliveryLog[]; deliveryLogs?: DeliveryLog[] } | DeliveryLog[]>(
    () =>
      selectedCampaignId
        ? getJson(`/api/whatsapp/campaigns/${selectedCampaignId}`)
        : Promise.resolve([]),
  );

  const { initializing, error } = useInitializeFunction([campaigns.reload]);

  // Reload campaign detail when the selected id changes.
  useEffect(() => {
    if (selectedCampaignId) campaignDetail.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCampaignId]);

  const campaignTableData = (campaigns.data ?? []).reduce<Record<string, Omit<Campaign, 'completed'> & { completed: string }>>(
    (acc, c) => {
      acc[String(c.id)] = { ...c, completed: String(c.completed) };
      return acc;
    },
    {},
  );

  const campaignHeaders: EnhanceTableHeaderTypes[] = [
    { id: 'type', label: 'Type', type: EnhancedTableColumnType.TEXT },
    { id: 'createdAt', label: 'Created At', type: EnhancedTableColumnType.DATE },
    { id: 'recipientCount', label: 'Recipients', type: EnhancedTableColumnType.NUMBER, numeric: true },
    {
      id: 'completed',
      label: 'Completed',
      type: EnhancedTableColumnType.COLORED_CHIP,
      chipColors: {
        true: { color: '#fff', backgroundColor: '#2e7d32' },
        false: { color: '#fff', backgroundColor: '#ed6c02' },
      },
      chipLabels: { true: 'Yes', false: 'Pending' },
    },
    {
      id: 'campaignActions',
      label: 'Actions',
      type: EnhancedTableColumnType.Action,
      actions: [
        {
          icon: <ExternalLink className="size-4" />,
          label: 'View Logs',
          onClick: (id) => setSelectedCampaignId(id),
        },
      ],
    },
  ];

  const detail = campaignDetail.data;
  const deliveryLogs: DeliveryLog[] = Array.isArray(detail)
    ? detail
    : detail?.logs ?? detail?.deliveryLogs ?? [];

  const logsTableData = deliveryLogs.reduce<Record<string, DeliveryLog>>((acc, log, idx) => {
    acc[String(log.id ?? idx)] = log;
    return acc;
  }, {});

  const logsHeaders: EnhanceTableHeaderTypes[] = [
    { id: 'phone', label: 'Phone', type: EnhancedTableColumnType.PhoneNumber },
    {
      id: 'result',
      label: 'Result',
      type: EnhancedTableColumnType.COLORED_CHIP,
      chipColors: {
        Sent: { color: '#fff', backgroundColor: '#2e7d32' },
        Failed: { color: '#fff', backgroundColor: '#c62828' },
        Pending: { color: '#fff', backgroundColor: '#ed6c02' },
        SkippedNoOptIn: { color: '#333', backgroundColor: '#e0e0e0' },
      },
      chipLabels: {},
    },
    { id: 'sentAt', label: 'Sent At', type: EnhancedTableColumnType.DATETIME },
    { id: 'failureReason', label: 'Failure Reason', type: EnhancedTableColumnType.TEXT },
  ];

  return (
    <>
      <MainPageTitle title="Messaging Logs" />
      <div className="px-4 sm:px-6 pb-6">
        <MainPageSection title="Campaigns">
          {initializing ? (
            <TableSkeleton rows={6} columns={5} />
          ) : error ? (
            <LoadFailed what="campaigns" onRetry={campaigns.reload} />
          ) : (
            <EnhancedTable
              title="Campaigns"
              header={campaignHeaders}
              data={campaignTableData as never}
              defaultOrder="createdAt"
              defaultDirection="desc"
            />
          )}
        </MainPageSection>
      </div>

      <GenericDialog
        open={!!selectedCampaignId}
        onClose={() => setSelectedCampaignId(null)}
        title="Campaign Delivery Logs"
        size="lg"
      >
        <EnhancedTable
          title="Delivery Logs"
          header={logsHeaders}
          data={logsTableData as never}
          defaultOrder="sentAt"
          defaultDirection="desc"
        />
      </GenericDialog>
    </>
  );
}
