import { Box, Skeleton, Stack } from '@mui/material';

interface Props {
  rows?: number;
  columns?: number;
}

// Use in place of <CircularProgress /> on list pages while data loads.
// Renders a row-shaped placeholder grid that matches the EnhancedTable
// layout, so the page doesn't jump when data arrives.
const EnhancedTableSkeleton = ({ rows = 5, columns = 6 }: Props) => (
  <Box sx={{ p: 2 }}>
    <Skeleton variant="rectangular" height={48} sx={{ mb: 1, borderRadius: 1 }} />
    <Stack spacing={1.25}>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <Stack key={rowIdx} direction="row" spacing={2} alignItems="center">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton
              key={colIdx}
              variant="text"
              sx={{ flex: colIdx === 0 ? 0.6 : 1, fontSize: '1rem' }}
            />
          ))}
        </Stack>
      ))}
    </Stack>
  </Box>
);

export default EnhancedTableSkeleton;
