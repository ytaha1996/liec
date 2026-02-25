import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { TableBody, TableRow, TableCell, Link, Chip, Checkbox, Tooltip, IconButton, useTheme, Box } from '@mui/material';
import { EnhancedTableColumnType } from '.';
import { formatCurrencyNumber, formatDate, formatDateTime, formatIntPhoneNumber } from '../../helpers/formatting-utils';
const EnhancedTableBody = ({ header, data, selected, handleCheckboxClick }) => {
    const theme = useTheme();
    const renderCellContent = (value, head, rowId, row) => {
        switch (head.type) {
            case EnhancedTableColumnType.TEXT:
                return value;
            case EnhancedTableColumnType.NUMBER:
                return value;
            case EnhancedTableColumnType.DATE:
                return formatDate(value);
            case EnhancedTableColumnType.DATETIME:
                return formatDateTime(value);
            case EnhancedTableColumnType.COLORED_CHIP: {
                const chipHeader = head;
                const tags = value == null
                    ? []
                    : Array.isArray(value)
                        ? value
                        : [String(value)];
                return (_jsx(Box, { sx: { display: 'flex', flexWrap: 'wrap', gap: 0.5 }, children: tags.map((tagKey) => {
                        const display = chipHeader.chipLabels?.[tagKey] ?? tagKey;
                        const color = chipHeader.chipColors?.[tagKey]?.color;
                        const backgroundColor = chipHeader.chipColors?.[tagKey]?.backgroundColor;
                        return (_jsx(Chip, { label: display, size: "small", sx: {
                                cursor: 'pointer',
                                color,
                                backgroundColor,
                            } }, tagKey));
                    }) }));
            }
            case EnhancedTableColumnType.LINK:
                return _jsx(Link, { href: head.url ? head.url(row) : '#', children: value });
            case EnhancedTableColumnType.Clickable:
                return _jsx(Link, { component: "button", onClick: () => head.onClick(rowId, row), children: value });
            case EnhancedTableColumnType.CURRENCY:
                return formatCurrencyNumber(value);
            case EnhancedTableColumnType.PhoneNumber:
                return formatIntPhoneNumber(value);
            case EnhancedTableColumnType.Action:
                return head.actions.map((action, idx) => action.hidden && action.hidden(row) ? _jsx("span", {}, idx) : (_jsx(Tooltip, { title: action.label, arrow: true, children: _jsx(IconButton, { sx: {
                            '&:hover': {
                                background: '#fff'
                            },
                            color: theme.palette.primary.main
                        }, color: "inherit", size: "small", onClick: () => action.onClick(rowId), children: action.icon }) }, idx)));
            default:
                return value;
        }
    };
    return (_jsx(TableBody, { children: Object.entries(data).map(([key, row]) => (_jsxs(TableRow, { tabIndex: -1, hover: true, style: {
                backgroundColor: selected.includes(key) ? '#f0f8ff' : '#fff',
                transition: 'background-color 0.2s ease',
            }, children: [_jsx(TableCell, { padding: "checkbox", children: _jsx(Checkbox, { checked: selected.includes(key), inputProps: {
                            'aria-labelledby': `enhanced-table-checkbox-${key}`,
                        }, onClick: () => handleCheckboxClick(key) }) }), header.map((column) => (_jsx(TableCell, { align: column.numeric ? 'right' : 'left', style: { padding: '12px', color: '#25A8B3' }, children: renderCellContent(row[column.id], column, key, row) }, column.id)))] }, key))) }));
};
export default EnhancedTableBody;
