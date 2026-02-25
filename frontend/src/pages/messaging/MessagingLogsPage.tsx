import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box } from '@mui/material';
import { getJson } from '../../api/client';
import EnhancedTable from '../../components/enhanced-table/EnhancedTable';
import {
  EnhanceTableHeaderTypes,
  EnhancedTableColumnType,
} from '../../components/enhanced-table';
import GenericDialog from '../../components/GenericDialog/GenericDialog';
import MainPageTitle from '../../components/layout-components/main-layout/MainPageTitle';
import MainPageSection from '../../components/layout-components/main-layout/MainPageSection';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

const MessagingLogsPage = () => {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  const { data: campaigns = [] } = useQuery<any[]>({
    queryKey: ['/api/whatsapp/campaigns'],
    queryFn: () => getJson<any[]>('/api/whatsapp/campaigns'),
  });

  const { data: campaignDetail } = useQuery<any>({
    queryKey: ['/api/whatsapp/campaigns', selectedCampaignId],
    queryFn: () => getJson<any>(`/api/whatsapp/campaigns/${selectedCampaignId}`),
    enabled: !!selectedCampaignId,
  });

  const campaignTableData = (campaigns ?? []).reduce((acc: Record<string, any>, item: any) => {
    acc[item.id] = { ...item, completed: String(item.completed) };
    return acc;
  }, {});

  const campaignHeaders: EnhanceTableHeaderTypes[] = [
    { id: 'type', label: 'Type', type: EnhancedTableColumnType.TEXT, numeric: false, disablePadding: false },
    { id: 'createdAt', label: 'Created At', type: EnhancedTableColumnType.DATE, numeric: false, disablePadding: false },
    { id: 'recipientCount', label: 'Recipients', type: EnhancedTableColumnType.NUMBER, numeric: true, disablePadding: false },
    {
      id: 'completed',
      label: 'Completed',
      type: EnhancedTableColumnType.COLORED_CHIP,
      numeric: false,
      disablePadding: false,
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
      numeric: false,
      disablePadding: false,
      actions: [
        {
          icon: <OpenInNewIcon fontSize="small" />,
          label: 'View Logs',
          onClick: (id: string) => setSelectedCampaignId(id),
          hidden: () => false,
        },
      ],
    },
  ];

  const deliveryLogs: any[] = Array.isArray(campaignDetail)
    ? campaignDetail
    : campaignDetail?.logs ?? campaignDetail?.deliveryLogs ?? [];

  const logsTableData = deliveryLogs.reduce((acc: Record<string, any>, item: any, idx: number) => {
    acc[item.id ?? idx] = item;
    return acc;
  }, {});

  const logsHeaders: EnhanceTableHeaderTypes[] = [
    { id: 'phone', label: 'Phone', type: EnhancedTableColumnType.PhoneNumber, numeric: false, disablePadding: false },
    {
      id: 'result',
      label: 'Result',
      type: EnhancedTableColumnType.COLORED_CHIP,
      numeric: false,
      disablePadding: false,
      chipColors: {
        Sent: { color: '#fff', backgroundColor: '#2e7d32' },
        Failed: { color: '#fff', backgroundColor: '#c62828' },
        Pending: { color: '#fff', backgroundColor: '#ed6c02' },
        SkippedNoOptIn: { color: '#333', backgroundColor: '#e0e0e0' },
      },
      chipLabels: {},
    },
    { id: 'sentAt', label: 'Sent At', type: EnhancedTableColumnType.DATE, numeric: false, disablePadding: false },
    { id: 'failureReason', label: 'Failure Reason', type: EnhancedTableColumnType.TEXT, numeric: false, disablePadding: false },
  ];

  return (
    <Box>
      <MainPageTitle title="Messaging Logs" />

      <Box sx={{ px: 3, pb: 3 }}>
        <MainPageSection title="Campaigns">
          <EnhancedTable
            title="Campaigns"
            header={campaignHeaders}
            data={campaignTableData}
            defaultOrder="createdAt"
          />
        </MainPageSection>
      </Box>

      <GenericDialog
        open={!!selectedCampaignId}
        title="Campaign Delivery Logs"
        onClose={() => setSelectedCampaignId(null)}
      >
        <EnhancedTable
          title="Delivery Logs"
          header={logsHeaders}
          data={logsTableData}
          defaultOrder="sentAt"
        />
      </GenericDialog>
    </Box>
  );
};

export default MessagingLogsPage;
