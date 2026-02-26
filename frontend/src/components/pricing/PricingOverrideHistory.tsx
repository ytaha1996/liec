import React from 'react';
import { Box, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';

interface PricingOverride {
  id: number;
  overrideType: string;
  originalValue: number;
  newValue: number;
  reason: string;
  createdAt: string;
}

interface PricingOverrideHistoryProps {
  overrides: PricingOverride[];
}

const PricingOverrideHistory: React.FC<PricingOverrideHistoryProps> = ({ overrides }) => {
  if (!overrides.length) return null;

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Override History</Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Type</TableCell>
            <TableCell>Original</TableCell>
            <TableCell>New</TableCell>
            <TableCell>Reason</TableCell>
            <TableCell>Date</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {overrides.map((o) => (
            <TableRow key={o.id}>
              <TableCell>{o.overrideType}</TableCell>
              <TableCell>{o.originalValue}</TableCell>
              <TableCell>{o.newValue}</TableCell>
              <TableCell>{o.reason}</TableCell>
              <TableCell>{new Date(o.createdAt).toLocaleDateString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
};

export default PricingOverrideHistory;
