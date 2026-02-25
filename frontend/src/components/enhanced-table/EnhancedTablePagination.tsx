import { TablePagination } from '@mui/material';
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

  return (
    <TablePagination
      rowsPerPageOptions={[10, 25, 50, 100]}
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
        padding: theme.spacing(1),
        color: theme.palette.text.secondary,
        borderRadius: '0 0 10px 10px'
      }}
    />
  );
};

export default EnhancedTablePagination;
