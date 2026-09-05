import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MainPageSection } from '@/components/layout';
import { postJson } from '@/api/client';
import { parseApiError } from '@/api/parseApiError';
import { useAppDispatch } from '@/redux/hooks';
import { OpenConfirmation } from '@/redux/confirmation/confirmationReducer';

// The three campaign kinds the platform can send. Photo campaigns only make
// sense once the shipment has actually departed / arrived.
const CAMPAIGNS = [
  { key: 'status' as const, title: 'Status Update', description: 'Notify about shipment status', minStatus: null },
  { key: 'departure' as const, title: 'Departure Photos', description: 'Send departure photos', minStatus: 'Departed' },
  { key: 'arrival' as const, title: 'Arrival Photos', description: 'Send arrival photos', minStatus: 'Arrived' },
];

const STATUS_ORDER: Record<string, number> = {
  Draft: 0,
  Scheduled: 1,
  ReadyToDepart: 2,
  Departed: 3,
  Arrived: 4,
  Closed: 5,
  Cancelled: -1,
};

interface WhatsAppSendCardsProps {
  shipmentId: string | number;
  shipmentStatus: string;
  /** Bulk mode: how many customers the shipment reaches. */
  customerCount?: number;
  /** Single-customer mode: send to this customer only (used from a package). */
  customerId?: number;
  customerName?: string;
  title?: string;
}

/**
 * WhatsApp campaign cards. With `customerId` set it targets that one customer
 * (the package page); without it, everyone on the shipment (the shipment page).
 * Both modes hit endpoints that already exist — no new backend surface.
 */
export function WhatsAppSendCards({
  shipmentId,
  shipmentStatus,
  customerCount,
  customerId,
  customerName,
  title,
}: WhatsAppSendCardsProps) {
  const dispatch = useAppDispatch();
  const single = customerId != null;
  const order = STATUS_ORDER[shipmentStatus] ?? -1;
  const visible = CAMPAIGNS.filter((c) => c.minStatus === null || order >= (STATUS_ORDER[c.minStatus] ?? 99));

  if (visible.length === 0) return null;
  if (!single && (customerCount ?? 0) === 0) return null;

  const send = async (kind: 'status' | 'departure' | 'arrival') => {
    try {
      if (single) {
        const path =
          kind === 'status'
            ? `/api/customers/${customerId}/whatsapp/status?shipmentId=${shipmentId}`
            : `/api/customers/${customerId}/whatsapp/photos/${kind}?shipmentId=${shipmentId}`;
        await postJson(path);
        toast.success('WhatsApp message sent');
      } else if (kind === 'status') {
        await postJson(`/api/shipments/${shipmentId}/whatsapp/status/bulk`);
        toast.success('Campaign sent');
      } else {
        await postJson(`/api/shipments/${shipmentId}/whatsapp/photos/${kind}/bulk`);
        toast.success('Campaign sent');
      }
    } catch (e) {
      toast.error(parseApiError(e).message);
    }
  };

  const recipient = single ? (customerName ?? 'this customer') : `${customerCount} customer(s) in this shipment`;

  return (
    <MainPageSection title={title ?? (single ? 'WhatsApp' : 'WhatsApp Campaigns')}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {visible.map((c) => (
          <Card key={c.key} className="flex flex-col">
            <CardContent className="p-4 flex-1 flex flex-col">
              <p className="font-semibold mb-1">{c.title}</p>
              <p className="text-sm text-muted-foreground mb-3">{c.description}</p>
              {single ? (
                <p className="text-sm font-medium mb-3 truncate">{customerName}</p>
              ) : (
                <p className="text-2xl font-bold mb-3">
                  {customerCount}
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    customer{customerCount !== 1 ? 's' : ''}
                  </span>
                </p>
              )}
              <Button
                variant="outline"
                size="sm"
                className="mt-auto"
                onClick={() =>
                  dispatch(
                    OpenConfirmation({
                      title: `Send ${c.title}`,
                      message: `Send ${c.title.toLowerCase()} to ${recipient}?`,
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
