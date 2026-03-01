import { useMutation } from '@tanstack/react-query';
import { Box, Button, Card, CardContent, Grid, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import { postJson } from '../../../api/client';
import { useAppDispatch } from '../../../redux/hooks';
import { OpenConfirmation } from '../../../redux/confirmation/confirmationReducer';
import MainPageSection from '../../../components/layout-components/main-layout/MainPageSection';

interface WhatsAppCampaignCardsProps {
  shipmentId: string;
  shipmentStatus: string;
  customerCount: number;
}

const STATUS_ORDER: Record<string, number> = {
  Draft: 0, Scheduled: 1, ReadyToDepart: 2, Departed: 3, Arrived: 4, Closed: 5, Cancelled: -1,
};

const CAMPAIGNS = [
  { key: 'status' as const, title: 'Status Update', description: 'Notify customers about shipment status', minStatus: null },
  { key: 'departure' as const, title: 'Departure Photos', description: 'Send departure photos to customers', minStatus: 'Departed' },
  { key: 'arrival' as const, title: 'Arrival Photos', description: 'Send arrival photos to customers', minStatus: 'Arrived' },
];

const WhatsAppCampaignCards = ({ shipmentId, shipmentStatus, customerCount }: WhatsAppCampaignCardsProps) => {
  const dispatch = useAppDispatch();

  const sendBulk = useMutation({
    mutationFn: (kind: 'status' | 'departure' | 'arrival') => {
      if (kind === 'status') return postJson(`/api/shipments/${shipmentId}/whatsapp/status/bulk`);
      return postJson(`/api/shipments/${shipmentId}/whatsapp/photos/${kind}/bulk`);
    },
    onSuccess: () => toast.success('Campaign sent successfully'),
    onError: () => toast.error('Campaign send failed'),
  });

  const currentOrder = STATUS_ORDER[shipmentStatus] ?? -1;
  const visibleCampaigns = CAMPAIGNS.filter(
    (c) => c.minStatus === null || currentOrder >= (STATUS_ORDER[c.minStatus] ?? 99),
  );

  if (visibleCampaigns.length === 0 || customerCount === 0) return null;

  return (
    <MainPageSection title="WhatsApp Campaigns">
      <Grid container spacing={2}>
        {visibleCampaigns.map((campaign) => (
          <Grid item xs={12} sm={6} md={4} key={campaign.key}>
            <Card sx={{ borderRadius: 2, boxShadow: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {campaign.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {campaign.description}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
                  {customerCount}
                  <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                    customer{customerCount !== 1 ? 's' : ''}
                  </Typography>
                </Typography>
                <Box sx={{ mt: 'auto' }}>
                  <Button
                    variant="outlined"
                    size="small"
                    fullWidth
                    disabled={sendBulk.isPending}
                    onClick={() =>
                      dispatch(OpenConfirmation({
                        open: true,
                        title: `Send ${campaign.title}`,
                        message: `Send ${campaign.title.toLowerCase()} to ${customerCount} customer(s) in this shipment?`,
                        onSubmit: () => sendBulk.mutate(campaign.key),
                      }))
                    }
                  >
                    Send
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </MainPageSection>
  );
};

export default WhatsAppCampaignCards;
