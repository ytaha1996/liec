import { useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MainPageSection } from '@/components/layout';
import { GenericDialog } from '@/components/dialogs';
import { GenericNumberInput } from '@/components/inputs';
import { EmptyState } from '@/components/feedback';
import { getJson, putJson, deleteJson } from '@/api/client';
import { parseApiError } from '@/api/parseApiError';
import { useLoader } from '@/hooks/useLoader';
import { useInitializeFunction } from '@/hooks/useInitializeFunction';
import { useAppDispatch } from '@/redux/hooks';
import { OpenConfirmation } from '@/redux/confirmation/confirmationReducer';

interface FxSnapshot {
  id: number;
  shipmentId: number;
  event: string;
  currencyCode: string;
  rateToBase: number;
  capturedAt: string;
}

interface FxSnapshotsSectionProps {
  shipmentId: string;
  canManage: boolean;
}

export function FxSnapshotsSection({ shipmentId, canManage }: FxSnapshotsSectionProps) {
  const dispatch = useAppDispatch();
  const [editCode, setEditCode] = useState<string | null>(null);
  const [editRate, setEditRate] = useState<number | string>('');
  const [saving, setSaving] = useState(false);

  const snapshots = useLoader<FxSnapshot[]>(() =>
    getJson<FxSnapshot[]>(`/api/shipments/${shipmentId}/fx-snapshots`),
  );
  useInitializeFunction([snapshots.reload], [shipmentId]);

  const rows = snapshots.data ?? [];
  if (rows.length === 0 && !canManage) return null;

  const saveOverride = async () => {
    if (!editCode || editRate === '' || Number(editRate) <= 0) {
      toast.error('Rate must be greater than 0.');
      return;
    }
    setSaving(true);
    try {
      await putJson(`/api/shipments/${shipmentId}/fx-snapshots/${editCode}`, {
        rateToBase: Number(editRate),
      });
      toast.success(`FX rate for ${editCode} overridden`);
      setEditCode(null);
      await snapshots.reload();
    } catch (e) {
      toast.error(parseApiError(e).message);
    } finally {
      setSaving(false);
    }
  };

  const removeOverride = (code: string) => {
    dispatch(
      OpenConfirmation({
        title: 'Remove FX Override',
        message: `Remove the manual rate for ${code}? The snapshot reverts to the captured rate.`,
        destructive: true,
        confirmText: 'Remove',
        onSubmit: async () => {
          try {
            await deleteJson(`/api/shipments/${shipmentId}/fx-snapshots/${code}`);
            toast.success('Override removed');
            await snapshots.reload();
          } catch (e) {
            toast.error(parseApiError(e).message);
          }
        },
      }),
    );
  };

  return (
    <MainPageSection title="FX Rate Snapshots">
      {rows.length === 0 ? (
        <EmptyState message="No FX snapshots captured yet." hint="Snapshots are taken at key shipment events." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Currency</TableHead>
              <TableHead>Event</TableHead>
              <TableHead className="text-right">Rate → base</TableHead>
              <TableHead>Captured</TableHead>
              {canManage && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.currencyCode}</TableCell>
                <TableCell>
                  <Badge variant={s.event === 'ManualOverride' ? 'default' : 'secondary'}>
                    {s.event}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{s.rateToBase}</TableCell>
                <TableCell>{new Date(s.capturedAt).toLocaleString()}</TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Override ${s.currencyCode}`}
                      onClick={() => {
                        setEditCode(s.currencyCode);
                        setEditRate(s.rateToBase);
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    {s.event === 'ManualOverride' && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        aria-label={`Remove override ${s.currencyCode}`}
                        onClick={() => removeOverride(s.currencyCode)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <GenericDialog
        open={!!editCode}
        onClose={() => setEditCode(null)}
        title={`Override FX Rate — ${editCode}`}
        size="sm"
      >
        <div className="space-y-3">
          <GenericNumberInput
            name="rateToBase"
            title={`1 ${editCode} = ? (base currency)`}
            value={editRate}
            onChange={(v) => setEditRate(v ?? '')}
            min={0}
            step={0.00000001}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditCode(null)}>
              Cancel
            </Button>
            <Button onClick={saveOverride} disabled={saving}>
              Save Override
            </Button>
          </div>
        </div>
      </GenericDialog>
    </MainPageSection>
  );
}
