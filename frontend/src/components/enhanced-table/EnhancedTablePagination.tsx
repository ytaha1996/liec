import { TablePagination, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React from 'react';

interface EnhancedTablePaginationProps {
  count: number;
  rowsPerPage: number;
  page: number;
  onPageChange: (event: unknown, newPage: number) => void;
  onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const EnhancedTablePagination: React.FC<EnhancedTablePaginationProps> = ({
  count,
  rowsPerPage,
  page,
  onPageChange,
  onRowsPerPageChange,
}) => {
  const theme = useTheme();
  // Compact controls on phones: fewer per-page options, no first/last
  // buttons, tighter typography.
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <TablePagination
      rowsPerPageOptions={isMobile ? [10, 25] : [10, 25, 50, 100]}
      showFirstButton={!isMobile}
      showLastButton={!isMobile}
      component="div"
      count={count}
      rowsPerPage={rowsPerPage}
      page={page}
      onPageChange={onPageChange}
      onRowsPerPageChange={onRowsPerPageChange}
      sx={{
        borderTop: 1,
        borderColor: theme.palette.divider,
        backgroundColor: theme.palette.background.default,
        padding: { xs: 0.5, sm: 1 },
        color: theme.palette.text.secondary,
        borderRadius: '0 0 10px 10px',
        '.MuiTablePagination-toolbar': { px: { xs: 0.5, sm: 2 }, minHeight: { xs: 48, sm: 52 } },
        '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
          fontSize: { xs: 12, sm: 14 },
        },
      }}
    />
  );
};

export default EnhancedTablePagination;
