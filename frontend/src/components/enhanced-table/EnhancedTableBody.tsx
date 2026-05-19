import { TableBody, TableRow, TableCell, Link, Chip, Checkbox, Tooltip, IconButton, useTheme, Box } from '@mui/material';
import { EnhancedTableColoredChipHeader, EnhancedTableColumnType, EnhanceTableHeaderTypes } from '.';
import { formatCurrencyNumber, formatDate, formatDateTime, formatIntPhoneNumber } from '../../helpers/formatting-utils';
import { BRAND_TEAL } from '../../constants/statusColors';


interface EnhancedTableBodyProps {
  header: EnhanceTableHeaderTypes[];
  data: Record<string, Record<string, any>>;
  selected: string[];
  handleCheckboxClick: (key: string) => void;
}

const EnhancedTableBody: React.FC<EnhancedTableBodyProps> = ({ header, data, selected, handleCheckboxClick }) => {
  const theme = useTheme();

  const renderCellContent = (value: any, head: EnhanceTableHeaderTypes, rowId: string, row: Record<string, any>) => {
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
        const chipHeader = head as EnhancedTableColoredChipHeader;
        const tags = value == null
        ? []
        : Array.isArray(value)
          ? value
          : [String(value)];

        return (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {tags.map((tagKey: string) => {
              const display = chipHeader.chipLabels?.[tagKey] ?? tagKey;
              const color = chipHeader.chipColors?.[tagKey]?.color;
              const backgroundColor =
                chipHeader.chipColors?.[tagKey]?.backgroundColor;

              return (
                <Chip
                  key={tagKey}
                  label={display}
                  size="small"
                  sx={{
                    cursor: 'pointer',
                    color,
                    backgroundColor,
                  }}
                />
              );
            })}
          </Box>
        );
      }
      case EnhancedTableColumnType.LINK:
        return <Link href={head.url ? head.url(row) : '#'}>{value}</Link>;
      case EnhancedTableColumnType.Clickable:
        return <Link component="button" onClick={() => head.onClick(rowId, row)}>{value}</Link>;
      case EnhancedTableColumnType.CURRENCY:
        return formatCurrencyNumber(value);
      case EnhancedTableColumnType.PhoneNumber:
        return formatIntPhoneNumber(value);
      case EnhancedTableColumnType.Action:
        return head.actions.map((action, idx) => action.hidden && action.hidden(row) ? <span key={idx}></span> : (
          <Tooltip key={idx} title={action.label} arrow>
            <IconButton
              sx={{
                '&:hover': {
                  background: '#fff'
                },
                color: theme.palette.primary.main
              }}
              color="inherit"
              size="small"
              onClick={() => action.onClick(rowId)}
            >
              {action.icon}
            </IconButton>
          </Tooltip>
        ))
      default:
        return value;
    }
  };

  return (
    <TableBody>
      {Object.entries(data).map(([key, row]) => {
        const hasClickable = header.some(
          (h) =>
            h.type === EnhancedTableColumnType.Clickable ||
            h.type === EnhancedTableColumnType.Action,
        );
        return (
          <TableRow
            key={key}
            tabIndex={-1}
            hover
            selected={selected.includes(key)}
            sx={{
              cursor: hasClickable ? 'pointer' : 'default',
              transition: 'background-color 0.2s ease',
            }}
          >
            <TableCell padding="checkbox">
              <Checkbox
                checked={selected.includes(key)}
                inputProps={{
                  'aria-labelledby': `enhanced-table-checkbox-${key}`,
                }}
                onClick={() => handleCheckboxClick(key)}
              />
            </TableCell>
            {header.map((column) => (
              <TableCell key={column.id} align={column.numeric ? 'right' : 'left'} sx={{ padding: '12px', color: BRAND_TEAL }}>
                {renderCellContent(row[column.id], column, key, row)}
              </TableCell>
            ))}
          </TableRow>
        );
      })}
    </TableBody>
  );
};

export default EnhancedTableBody;
