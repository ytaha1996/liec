import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Card, CardHeader, Paper, Table, TableContainer, Typography } from '@mui/material';
import EnhancedTableHead from './EnhancedTableHead';
import EnhancedTableBody from './EnhancedTableBody';
import EnhancedTablePagination from './EnhancedTablePagination';
import { useEffect, useState } from 'react';
import { EnhancedTableColumnType, getComparator, stableSort } from '.';
import React from 'react';
import EnhancedTableToolbar from './EnhancedTableToolbar';
import { greaterThanInclusive, isDateBetween, isEmpty, lessThanInclusive } from '../../helpers/validation-utils';
import { TableFilterTypes } from './index-filter';
import GenericSelectInput from '../input-components/GenericSelectInput';
import { makeStyles } from 'tss-react/mui';
import GenericDateRangePicker from '../input-components/GenericDateRangePicker';
import dayjs from 'dayjs';
import { useTheme } from '@mui/material/styles';
const useStyles = makeStyles()((_theme) => ({
    filters: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        padding: '16px',
        backgroundColor: '#f9f9f9',
        borderBottom: '1px solid #ddd',
    },
}));
const EnhancedTable = ({ header, data, defaultOrder, title, actions = [], filters = [] }) => {
    const [orderBy, setOrderBy] = useState(defaultOrder || '');
    const [order, setOrder] = useState('asc');
    const [selected, setSelected] = useState([]);
    const [page, setPage] = useState(0);
    const [searchKey, setSearchKey] = useState("");
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [filterValues, setFilterValues] = useState({});
    const [filteredData, setFilteredData] = useState({});
    const { classes } = useStyles();
    useEffect(() => {
        filters.forEach(filter => {
            if (filter.type === TableFilterTypes.SELECT) {
                if (filter.defaultValue && Array.isArray(filter.defaultValue)) {
                    setFilterValues(prev => ({ ...prev, [filter.name]: filter.defaultValue }));
                }
            }
        });
    }, [filters]);
    const handleRequestSort = (event, property) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };
    const handleSelectAllClick = (event) => {
        if (event.target.checked) {
            const newSelected = Object.keys(data);
            setSelected(newSelected);
            return;
        }
        setSelected([]);
    };
    const handleClick = (id) => {
        const selectedIndex = selected.indexOf(id);
        let newSelected = [];
        if (selectedIndex === -1) {
            newSelected = newSelected.concat(selected, id);
        }
        else if (selectedIndex === 0) {
            newSelected = newSelected.concat(selected.slice(1));
        }
        else if (selectedIndex === selected.length - 1) {
            newSelected = newSelected.concat(selected.slice(0, -1));
        }
        else if (selectedIndex > 0) {
            newSelected = newSelected.concat(selected.slice(0, selectedIndex), selected.slice(selectedIndex + 1));
        }
        setSelected(newSelected);
    };
    const handleChangePage = (_event, newPage) => {
        setPage(newPage);
    };
    const handleChangeRowsPerPage = (event) => {
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
                        const fValues = Array.isArray(filterValues[f.name]) ? filterValues[f.name] : [];
                        return fValues.length === 0 || fValues.includes(value);
                    }
                    else if (f.type === TableFilterTypes.DATERANGE) {
                        const fValues = Array.isArray(filterValues[f.name]) ? filterValues[f.name] : [];
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
                        }
                        else if (dayjs(fValues[0]).isValid()) {
                            return greaterThanInclusive(dateValue, fValues[0]);
                        }
                        else if (dayjs(fValues[1]).isValid()) {
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
        }
        else {
            setFilteredData(data);
        }
        setPage(0);
    }, [data, searchKey, filterValues, rowsPerPage]);
    const visibleRows = React.useMemo(() => {
        let result = stableSort(filteredData, getComparator(order, orderBy));
        let slicedKeys = Object.keys(result).slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
        Object.keys(result).forEach(k => {
            if (!slicedKeys.includes(k)) {
                delete result[k];
            }
        });
        return result;
    }, [order, orderBy, page, rowsPerPage, filteredData]);
    const renderFilter = (filter) => {
        if (filter.type === TableFilterTypes.SELECT) {
            const items = Object.values(data).reduce((acc, c) => ({ ...acc, [c[filter.name]]: c[filter.name] }), {});
            return _jsx(GenericSelectInput, { hideError: true, title: filter.title, type: "", multiple: true, value: filterValues[filter.name], onChange: function (value) {
                    setFilterValues({ ...filterValues, [filter.name]: value });
                }, name: "", items: items }, filter.name);
        }
        return _jsx(GenericDateRangePicker, { title: '', value: filterValues[filter.name], onChange: function (value) {
                setFilterValues({ ...filterValues, [filter.name]: value });
            }, name: '' }, filter.name);
    };
    const theme = useTheme();
    return (_jsxs(Card, { style: { overflow: "visible" }, children: [_jsx(CardHeader, { sx: {
                    minHeight: '65px',
                    backgroundColor: theme.palette.primary.main,
                    borderBottom: '1px solid ${theme.palette.divider}',
                    borderRadius: '10px 10px 0 0'
                }, title: _jsx(Typography, { variant: "h6", sx: { fontWeight: 'bold', fontSize: '18px', color: theme.palette.common.white }, children: title }), action: _jsx(EnhancedTableToolbar, { onSearchUpdate: (v) => { setSearchKey(v); }, searchKey: searchKey, selected: selected, actions: actions || [], title: '', onFilterUpdate: function (_name, _value) { } }) }), _jsx(Box, { className: classes.filters, children: filters.map(f => renderFilter(f)) }), _jsx(Box, { sx: { width: '100%' }, children: _jsxs(Paper, { sx: { width: '100%', mb: 2 }, children: [_jsx(TableContainer, { children: _jsxs(Table, { "aria-labelledby": "tableTitle", children: [_jsx(EnhancedTableHead, { header: header, order: order, orderBy: orderBy, onSelectAllClick: handleSelectAllClick, onRequestSort: handleRequestSort, numSelected: selected.length, rowCount: Object.keys(filteredData || {}).length }), _jsx(EnhancedTableBody, { header: header, data: visibleRows, selected: selected, handleCheckboxClick: handleClick })] }) }), _jsx(EnhancedTablePagination, { count: Object.keys(filteredData || {}).length, rowsPerPage: rowsPerPage, page: page, onPageChange: handleChangePage, onRowsPerPageChange: handleChangeRowsPerPage })] }) })] }));
};
export default EnhancedTable;
