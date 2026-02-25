import * as React from 'react';
import { TableHead, TableRow, TableCell, TableSortLabel, Checkbox, Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { IEnhancedTableHeader, Order } from './';

interface EnhancedTableHeadProps {
  header: IEnhancedTableHeader[];
  onRequestSort: (event: React.MouseEvent<unknown>, property: string) => void;
  onSelectAllClick: (event: React.ChangeEvent<HTMLInputElement>) => void;
  order: Order;
  orderBy: string;
  numSelected: number;
  rowCount: number;
}

const EnhancedTableHead: React.FC<EnhancedTableHeadProps> = (props) => {
  const { header, onSelectAllClick, order, orderBy, onRequestSort, numSelected, rowCount } = props;
  const theme = useTheme();

  const createSortHandler = (property: string) => (event: React.MouseEvent<unknown>) => {
    onRequestSort(event, property);
  };

  return (
    <TableHead>
      <TableRow>
        <TableCell padding="checkbox" sx={{ backgroundColor: theme.palette.background.default }}>
          <Checkbox
            color="secondary"
            indeterminate={numSelected > 0 && numSelected < rowCount}
            checked={rowCount > 0 && numSelected === rowCount}
            onChange={onSelectAllClick}
            inputProps={{ 'aria-label': 'select all items' }}
          />
        </TableCell>
        {header.map((headCell) => (
          <TableCell
            key={headCell.id}
            align={headCell.numeric ? 'right' : 'left'}
            padding={headCell.disablePadding ? 'none' : 'normal'}
            sortDirection={orderBy === headCell.id ? order : false}
            sx={{
              backgroundColor: theme.palette.background.default,
              color: theme.palette.text.secondary,
              fontWeight: 'bold',
              borderBottom: `1px solid ${theme.palette.divider}`
            }}
          >
            <TableSortLabel
              active={orderBy === headCell.id}
              direction={orderBy === headCell.id ? order : 'asc'}
              onClick={createSortHandler(headCell.id)}
              sx={{
                '&.MuiTableSortLabel-root:hover': {
                  color: theme.palette.primary.main,
                },
                '&.Mui-active': {
                  color: theme.palette.primary.main,
                }
              }}
            >
              {headCell.label}
              {orderBy === headCell.id ? (
                <Box component="span" sx={{ display: 'none' }}>
                  {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                </Box>
              ) : null}
            </TableSortLabel>
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
};

export default EnhancedTableHead;
