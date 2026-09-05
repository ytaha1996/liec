import { GenericDialog } from '@/components/dialogs';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/misc/StatusBadge';
import { PKG_STATUS_CHIPS } from '@/constants/statusColors';
import { PKG_STATUS_LABELS } from '@/constants/statusLabels';

interface PreviewPackage {
  id: number;
  customerName: string;
  status: string;
}

interface RtdPreviewData {
  departingPackages: PreviewPackage[];
  reassigningPackages: PreviewPackage[];
}

interface ReadyToDepartPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  previewData: RtdPreviewData | null;
  onConfirm: () => void;
  isConfirming: boolean;
}

function PreviewTable({ packages }: { packages: PreviewPackage[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {packages.map((p) => (
          <TableRow key={p.id}>
            <TableCell>#{p.id}</TableCell>
            <TableCell>{p.customerName}</TableCell>
            <TableCell>
              <StatusBadge
                value={p.status}
                labels={PKG_STATUS_LABELS}
                colors={PKG_STATUS_CHIPS}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function ReadyToDepartPreviewDialog({
  open,
  onClose,
  previewData,
  onConfirm,
  isConfirming,
}: ReadyToDepartPreviewDialogProps) {
  return (
    <GenericDialog
      open={open}
      onClose={onClose}
      title="Ready To Depart — Package Summary"
      size="lg"
    >
      {previewData?.departingPackages?.length ? (
        <div className="space-y-2 mb-4">
          <p className="text-sm font-semibold text-green-700">
            Packages departing with shipment ({previewData.departingPackages.length})
          </p>
          <PreviewTable packages={previewData.departingPackages} />
        </div>
      ) : null}
      {previewData?.reassigningPackages?.length ? (
        <div className="space-y-1">
          <p className="text-sm font-semibold text-amber-700">
            Packages to be reassigned ({previewData.reassigningPackages.length})
          </p>
          <p className="text-xs text-muted-foreground">
            These will be transferred to the next available Draft shipment on the same route.
          </p>
          <PreviewTable packages={previewData.reassigningPackages} />
        </div>
      ) : null}
      <div className="flex justify-end gap-2 mt-6">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={onConfirm} disabled={isConfirming}>
          Confirm Ready To Depart
        </Button>
      </div>
    </GenericDialog>
  );
}
