import {
  Box,
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import GenericDialog from '../../../components/GenericDialog/GenericDialog';

interface RtdPreviewData {
  departingPackages: Array<{ id: number; customerName: string; status: string }>;
  reassigningPackages: Array<{ id: number; customerName: string; status: string }>;
}

interface ReadyToDepartPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  previewData: RtdPreviewData | null;
  onConfirm: () => void;
  isConfirming: boolean;
}

const ReadyToDepartPreviewDialog = ({ open, onClose, previewData, onConfirm, isConfirming }: ReadyToDepartPreviewDialogProps) => {
  return (
    <GenericDialog open={open} onClose={onClose} title="Ready To Depart — Package Summary">
      {previewData?.departingPackages?.length ? (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="success.main" sx={{ mb: 0.5 }}>
            Packages departing with shipment ({previewData.departingPackages.length})
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {previewData.departingPackages.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>#{p.id}</TableCell>
                  <TableCell>{p.customerName}</TableCell>
                  <TableCell>{p.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      ) : null}
      {previewData?.reassigningPackages?.length ? (
        <Box>
          <Typography variant="subtitle2" color="warning.main" sx={{ mb: 0.5 }}>
            Packages to be reassigned ({previewData.reassigningPackages.length})
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            These will be transferred to the next available Draft shipment on the same route.
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {previewData.reassigningPackages.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>#{p.id}</TableCell>
                  <TableCell>{p.customerName}</TableCell>
                  <TableCell>{p.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      ) : null}
      <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 3 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={isConfirming} onClick={onConfirm}>
          Confirm Ready To Depart
        </Button>
      </Stack>
    </GenericDialog>
  );
};

export default ReadyToDepartPreviewDialog;
