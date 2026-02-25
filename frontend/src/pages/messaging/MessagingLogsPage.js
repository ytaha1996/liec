import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box } from '@mui/material';
import { getJson } from '../../api/client';
import EnhancedTable from '../../components/enhanced-table/EnhancedTable';
import { EnhancedTableColumnType, } from '../../components/enhanced-table';
import GenericDialog from '../../components/GenericDialog/GenericDialog';
import MainPageTitle from '../../components/layout-components/main-layout/MainPageTitle';
import MainPageSection from '../../components/layout-components/main-layout/MainPageSection';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
const MessagingLogsPage = () => {
    const [selectedCampaignId, setSelectedCampaignId] = useState(null);
    const { data: campaigns = [] } = useQuery({
        queryKey: ['/api/whatsapp/campaigns'],
        queryFn: () => getJson('/api/whatsapp/campaigns'),
    });
    const { data: campaignDetail } = useQuery({
        queryKey: ['/api/whatsapp/campaigns', selectedCampaignId],
        queryFn: () => getJson(`/api/whatsapp/campaigns/${selectedCampaignId}`),
        enabled: !!selectedCampaignId,
    });
    const campaignTableData = (campaigns ?? []).reduce((acc, item) => {
        acc[item.id] = { ...item, completed: String(item.completed) };
        return acc;
    }, {});
    const campaignHeaders = [
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
                    icon: _jsx(OpenInNewIcon, { fontSize: "small" }),
                    label: 'View Logs',
                    onClick: (id) => setSelectedCampaignId(id),
                    hidden: () => false,
                },
            ],
        },
    ];
    const deliveryLogs = Array.isArray(campaignDetail)
        ? campaignDetail
        : campaignDetail?.logs ?? campaignDetail?.deliveryLogs ?? [];
    const logsTableData = deliveryLogs.reduce((acc, item, idx) => {
        acc[item.id ?? idx] = item;
        return acc;
    }, {});
    const logsHeaders = [
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
    return (_jsxs(Box, { children: [_jsx(MainPageTitle, { title: "Messaging Logs" }), _jsx(Box, { sx: { px: 3, pb: 3 }, children: _jsx(MainPageSection, { title: "Campaigns", children: _jsx(EnhancedTable, { title: "Campaigns", header: campaignHeaders, data: campaignTableData, defaultOrder: "createdAt" }) }) }), _jsx(GenericDialog, { open: !!selectedCampaignId, title: "Campaign Delivery Logs", onClose: () => setSelectedCampaignId(null), children: _jsx(EnhancedTable, { title: "Delivery Logs", header: logsHeaders, data: logsTableData, defaultOrder: "sentAt" }) })] }));
};
export default MessagingLogsPage;
