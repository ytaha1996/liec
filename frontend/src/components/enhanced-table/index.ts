export type Order = 'asc' | 'desc';


function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
    if (b[orderBy] < a[orderBy]) {
        return -1;
    }
    if (b[orderBy] > a[orderBy]) {
        return 1;
    }
    return 0;
}

export function getComparator<Key extends keyof any>(
    order: Order,
    orderBy: Key,
): (
    a: { [key in Key]: number | string },
    b: { [key in Key]: number | string },
) => number {
    return order === 'desc'
        ? (a, b) => descendingComparator(a, b, orderBy)
        : (a, b) => -descendingComparator(a, b, orderBy);
}

// Since 2020 all major browsers ensure sort stability with Array.prototype.sort().
// stableSort() brings sort stability to non-modern browsers (notably IE11). If you
// only support modern browsers you can replace stableSort(exampleArray, exampleComparator)
// with exampleArray.slice().sort(exampleComparator)

export function stableSort<T>(data: Record<string, T>, comparator: (a: T, b: T) => number): Record<string, T> {

    let entries: [string, T][] = Object.entries(data);
    const stabilizedThis = entries.map((entry, index) => [entry[0], entry[1], index] as [string, T, number]);

    stabilizedThis.sort((a, b) => {
        const order = comparator(a[1], b[1]);
        if (order !== 0) {
            return order;
        }
        return a[2] - b[2];
    });

    let result: Record<string, T> = {};
    stabilizedThis.forEach(el => {
        result[el[0]] = el[1];
    });
    return result;
}

export interface EnhancedTableProps {
    numSelected: number;
    onRequestSort: (event: React.MouseEvent<unknown>, property: string) => void;
    onSelectAllClick: (event: React.ChangeEvent<HTMLInputElement>) => void;
    order: Order;
    orderBy: string;
    rowCount: number;
}

export interface ITableMenuAction {
    key: string;
    title: string;
    onClick: (selected: string[]) => void;
    disabled: (selected: string[]) => boolean;
}

export enum EnhancedTableColumnType {
    TEXT = 'text',
    NUMBER = 'number',
    DATE = 'date',
    DATETIME = 'datetime',
    COLORED_CHIP = 'colored_chip',
    LINK = 'link',
    Clickable = 'Clickable',
    CURRENCY = 'currency',
    Action = 'action',
    PhoneNumber = 'PhoneNumber'
}

export interface IEnhancedTableHeader {
    id: string;
    label: string;
    numeric?: boolean;
    type: EnhancedTableColumnType;
    disablePadding?: boolean;
}

export interface IEnhancedTextHeader extends IEnhancedTableHeader {
    type: EnhancedTableColumnType.TEXT;
}

export interface EnhancedTableNumberHeader extends IEnhancedTableHeader {
    type: EnhancedTableColumnType.NUMBER;
}

export interface EnhancedTableDateHeader extends IEnhancedTableHeader {
    type: EnhancedTableColumnType.DATE;
}

export interface EnhancedTableDatetimeHeader extends IEnhancedTableHeader {
    type: EnhancedTableColumnType.DATETIME;
}

export interface EnhancedTableColoredChipHeader extends IEnhancedTableHeader {
    type: EnhancedTableColumnType.COLORED_CHIP;
    chipColors?: Record<string, {color: string, backgroundColor: string}>;
    chipLabels?: Record<string, string>;
}

export interface EnhancedTableLinkHeader extends IEnhancedTableHeader {
    type: EnhancedTableColumnType.LINK;
    url?: (data: any) => string;
}

export interface EnhancedTableCurrencyHeader extends IEnhancedTableHeader {
    type: EnhancedTableColumnType.CURRENCY;
    currencySymbol?: string;
}

export interface EnhancedTableActionHeader extends IEnhancedTableHeader {
    type: EnhancedTableColumnType.Action;
    actions: {
        icon: any;
        label: string;
        onClick: (id: string) => void;
        hidden: (row: Record<string, any>) => boolean;
    }[];

}


export interface EnhancedTablePhoneHeader extends IEnhancedTableHeader {
    type: EnhancedTableColumnType.PhoneNumber;
}




export interface EnhancedTableClickableHeader extends IEnhancedTableHeader {
    type: EnhancedTableColumnType.Clickable;
    onClick: (id: string, row: Record<string, any>) => void;
}

export type EnhanceTableHeaderTypes = IEnhancedTextHeader | EnhancedTableNumberHeader | EnhancedTableDatetimeHeader | EnhancedTableDateHeader | EnhancedTableColoredChipHeader | EnhancedTableLinkHeader | EnhancedTableCurrencyHeader | EnhancedTableActionHeader | EnhancedTableClickableHeader | EnhancedTablePhoneHeader;
