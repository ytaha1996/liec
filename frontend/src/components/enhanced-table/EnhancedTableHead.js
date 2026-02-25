import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { TableHead, TableRow, TableCell, TableSortLabel, Checkbox, Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
const EnhancedTableHead = (props) => {
    const { header, onSelectAllClick, order, orderBy, onRequestSort, numSelected, rowCount } = props;
    const theme = useTheme();
    const createSortHandler = (property) => (event) => {
        onRequestSort(event, property);
    };
    return (_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { padding: "checkbox", sx: { backgroundColor: theme.palette.background.default }, children: _jsx(Checkbox, { color: "secondary", indeterminate: numSelected > 0 && numSelected < rowCount, checked: rowCount > 0 && numSelected === rowCount, onChange: onSelectAllClick, inputProps: { 'aria-label': 'select all items' } }) }), header.map((headCell) => (_jsx(TableCell, { align: headCell.numeric ? 'right' : 'left', padding: headCell.disablePadding ? 'none' : 'normal', sortDirection: orderBy === headCell.id ? order : false, sx: {
                        backgroundColor: theme.palette.background.default,
                        color: theme.palette.text.secondary,
                        fontWeight: 'bold',
                        borderBottom: `1px solid ${theme.palette.divider}`
                    }, children: _jsxs(TableSortLabel, { active: orderBy === headCell.id, direction: orderBy === headCell.id ? order : 'asc', onClick: createSortHandler(headCell.id), sx: {
                            '&.MuiTableSortLabel-root:hover': {
                                color: theme.palette.primary.main,
                            },
                            '&.Mui-active': {
                                color: theme.palette.primary.main,
                            }
                        }, children: [headCell.label, orderBy === headCell.id ? (_jsx(Box, { component: "span", sx: { display: 'none' }, children: order === 'desc' ? 'sorted descending' : 'sorted ascending' })) : null] }) }, headCell.id)))] }) }));
};
export default EnhancedTableHead;
