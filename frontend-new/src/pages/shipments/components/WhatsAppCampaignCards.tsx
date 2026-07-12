import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MainPageSection } from '@/components/layout';
import { postJson } from '@/api/client';
import { parseApiError } from '@/api/parseApiError';
import { useAppDispatch } from '@/redux/hooks';
import { OpenConfirmation } from '@/redux/confirmation/confirmationReducer';

interface WhatsAppCampaignCardsProps {
  shipmentId: string;
  shipmentStatus: string;
  customerCount: number;
}

const STATUS_ORDER: Record<string, number> = {
  Draft: 0,
  Scheduled: 1,
  ReadyToDepart: 2,
  Departed: 3,
  Arrived: 4,
  Closed: 5,
  Cancelled: -1,
};

const CAMPAIGNS = [
  { key: 'status' as const, title: 'Status Update', description: 'Notify customers about shipment status', minStatus: null },
  { key: 'departure' as const, title: 'Departure Photos', description: 'Send departure photos to customers', minStatus: 'Departed' },
  { key: 'arrival' as const, title: 'Arrival Photos', description: 'Send arrival photos to customers', minStatus: 'Arrived' },
];

export function WhatsAppCampaignCards({
  shipmentId,
  shipmentStatus,
  customerCount,
}: WhatsAppCampaignCardsProps) {
  const dispatch = useAppDispatch();
  const order = STATUS_ORDER[shipmentStatus] ?? -1;
  const visible = CAMPAIGNS.filter((c) => c.minStatus === null || order >= (STATUS_ORDER[c.minStatus] ?? 99));
  if (visible.length === 0 || customerCount === 0) return null;

  const send = async (kind: 'status' | 'departure' | 'arrival') => {
    try {
      if (kind === 'status') await postJson(`/api/shipments/${shipmentId}/whatsapp/status/bulk`);
      else await postJson(`/api/shipments/${shipmentId}/whatsapp/photos/${kind}/bulk`);
      toast.success('Campaign sent');
    } catch (e) {
      toast.error(parseApiError(e).message);
    }
  };

  return (
    <MainPageSection title="WhatsApp Campaigns">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {visible.map((c) => (
          <Card key={c.key} className="flex flex-col">
            <CardContent className="p-4 flex-1 flex flex-col">
              <p className="font-semibold mb-1">{c.title}</p>
              <p className="text-sm text-muted-foreground mb-3">{c.description}</p>
              <p className="text-2xl font-bold mb-3">
                {customerCount}
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  customer{customerCount !== 1 ? 's' : ''}
                </span>
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-auto"
                onClick={() =>
                  dispatch(
                    OpenConfirmation({
                      title: `Send ${c.title}`,
                      message: `Send ${c.title.toLowerCase()} to ${customerCount} customer(s) in this shipment?`,
                      onSubmit: () => send(c.key),
                    }),
                  )
                }
              >
                Send
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </MainPageSection>
  );
}
