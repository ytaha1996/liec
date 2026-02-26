import { Box, Card, CardHeader, Paper, Table, TableContainer, Typography } from '@mui/material';
import EnhancedTableHead from './EnhancedTableHead';
import EnhancedTableBody from './EnhancedTableBody';
import EnhancedTablePagination from './EnhancedTablePagination';
import { useEffect, useState } from 'react';
import { EnhanceTableHeaderTypes, EnhancedTableColumnType, ITableMenuAction, Order, getComparator, stableSort } from '.';
import React from 'react';
import EnhancedTableToolbar from './EnhancedTableToolbar';
import { greaterThanInclusive, isDateBetween, isEmpty, lessThanInclusive } from '../../helpers/validation-utils';
import { ITableFilterType, TableFilterTypes } from './index-filter';
import GenericSelectInput from '../input-components/GenericSelectInput';
import { makeStyles } from 'tss-react/mui';
import GenericDateRangePicker from '../input-components/GenericDateRangePicker';
import dayjs from 'dayjs';
import { useTheme } from '@mui/material/styles';

interface EnhancedTableProps {
  header: EnhanceTableHeaderTypes[];
  data: Record<string, Record<string, any>>;
  defaultOrder?: string;
  title: string;
  actions?: ITableMenuAction[];
  filters?: ITableFilterType[];
}


const useStyles = makeStyles()(
  (_theme) => ({
    filters: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '16px',
      padding: '16px',
      backgroundColor: '#f9f9f9',
      borderBottom: '1px solid #ddd',
    },
  })
);



const EnhancedTable: React.FC<EnhancedTableProps> = ({ header, data, defaultOrder, title, actions = [], filters = [] }) => {
  const [orderBy, setOrderBy] = useState<string>(defaultOrder || '');
  const [order, setOrder] = useState<Order>('asc');
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [searchKey, setSearchKey] = useState<string>("");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});

  const [filteredData, setFilteredData] = useState<Record<string, any>>({});

  const { classes } = useStyles();


  useEffect(() => {
    filters.forEach(filter => {
      if (filter.type === TableFilterTypes.SELECT) {
        if (filter.defaultValue && Array.isArray(filter.defaultValue)) {
          setFilterValues(prev => ({ ...prev, [filter.name]: filter.defaultValue }))
        }
      }
    });
  }, [filters]);

  const handleRequestSort = (
    event: React.MouseEvent<unknown>,
    property: string,
  ) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = Object.keys(data);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  const handleClick = (id: string) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected: string[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1),
      );
    }
    setSelected(newSelected);
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };


  useEffect(() => {
    const count = Object.keys(data || {}).length;
    if (count > 0) {
      const result = { ...data };

      Object.keys(result).forEach(key => {
        const includedInSearch = isEmpty(searchKey?.trim()) || Object.values(result[key]).some(v => {
          if (isEmpty(v)) {
            return false;
          }

          if (typeof v === "string") {
            return v?.toLowerCase().includes(searchKey.toLowerCase());
          }

          if (typeof v === "number") {
            return v?.toString().toLowerCase().includes(searchKey.toLowerCase());
          }
          return false;
        });

        if (!includedInSearch) {
          delete result[key];
          return;
        }

        const validFilter = filters.every(f => {
          const value = result[key]?.[f.name];
          if (f.type === TableFilterTypes.SELECT) {
            const fValues: string[] = Array.isArray(filterValues[f.name]) ? filterValues[f.name] : [];
            return fValues.length === 0 || fValues.includes(value)
          } else if (f.type === TableFilterTypes.DATERANGE) {
            const fValues: Date[] = Array.isArray(filterValues[f.name]) ? filterValues[f.name] : [];

            if (fValues.length === 0) {
              return true;
            }

            if (isEmpty(fValues[0]) && isEmpty(fValues[1])) {
              return true;
            }

            const dateHeader = header.filter(h => h.id === f.name && (h.type === EnhancedTableColumnType.DATE || h.type === EnhancedTableColumnType.DATETIME));

            if (!dateHeader || dateHeader.length === 0) {
              return false;
            }

            if (isEmpty(value) || !dayjs(value).isValid()) {
              return false;
            }

            const dateValue = new Date(value);

            if (dayjs(fValues[0]).isValid() && dayjs(fValues[1]).isValid()) {
              return isDateBetween(dateValue, fValues[0], fValues[1]);
            } else if (dayjs(fValues[0]).isValid()) {
              return greaterThanInclusive(dateValue, fValues[0]);
            } else if (dayjs(fValues[1]).isValid()) {
              return lessThanInclusive(dateValue, fValues[1]);
            }

            return false;
          }
          return true;
        });

        if (!validFilter) {
          delete result[key];
          return;
        }

      });

      setFilteredData(result);

    } else {
      setFilteredData(data);
    }

    setPage(0);
  }, [data, searchKey, filterValues, rowsPerPage]);


  const visibleRows = React.useMemo(
    () => {
      let result = stableSort<any>(filteredData, getComparator(order, orderBy));

      let slicedKeys = Object.keys(result).slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage,
      );

      Object.keys(result).forEach(k => {
        if (!slicedKeys.includes(k)) {
          delete result[k];
        }
      });

      return result;
    },
    [order, orderBy, page, rowsPerPage, filteredData],
  );


  const renderFilter = (filter: ITableFilterType) => {

    if (filter.type === TableFilterTypes.SELECT) {
      const items: Record<string, any> = Object.values(data).reduce((acc, c) => ({ ...acc, [c[filter.name]]: c[filter.name] }), {});

      return <GenericSelectInput
        key={filter.name}
        hideError={true}
        title={filter.title}
        type=""
        multiple
        value={filterValues[filter.name]}
        onChange={function (value: any): void {
          setFilterValues({ ...filterValues, [filter.name]: value })
        }}
        name="" items={items}
      />
    }

    return <GenericDateRangePicker
      key={filter.name}
      title={''}
      value={filterValues[filter.name]}
      onChange={function (value: [Date | null, Date | null]): void {
        setFilterValues({ ...filterValues, [filter.name]: value })
      }}
      name={''} />
  };

  const theme = useTheme();

  return (
    <Card style={{ overflow: "visible" }}>
      <CardHeader
        sx={{
          minHeight: '65px',
          backgroundColor: theme.palette.primary.main,
          borderBottom: '1px solid ${theme.palette.divider}',
          borderRadius: '10px 10px 0 0'
        }}
        title={
          <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '18px', color: theme.palette.common.white }}>
            {title}
          </Typography>
        }
        action={<EnhancedTableToolbar onSearchUpdate={(v) => { setSearchKey(v); }} searchKey={searchKey} selected={selected} actions={actions || []} title={''} onFilterUpdate={function (_name: string, _value: any): void { }} />}
      />
      <Box className={classes.filters}>
        {filters.map(f => renderFilter(f))}
      </Box>
      <Box sx={{ width: '100%' }}>
        <Paper sx={{ width: '100%', mb: 2 }}>
          <TableContainer>
            <Table aria-labelledby="tableTitle">
              <EnhancedTableHead
                header={header}
                order={order}
                orderBy={orderBy}
                onSelectAllClick={handleSelectAllClick}
                onRequestSort={handleRequestSort}
                numSelected={selected.length}
                rowCount={Object.keys(filteredData || {}).length}
              />
              <EnhancedTableBody header={header} data={visibleRows} selected={selected} handleCheckboxClick={handleClick} />
            </Table>
          </TableContainer>
          <EnhancedTablePagination
            count={Object.keys(filteredData || {}).length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>
      </Box>
    </Card>
  );
};

export default EnhancedTable;
