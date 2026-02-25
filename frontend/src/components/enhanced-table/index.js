function descendingComparator(a, b, orderBy) {
    if (b[orderBy] < a[orderBy]) {
        return -1;
    }
    if (b[orderBy] > a[orderBy]) {
        return 1;
    }
    return 0;
}
export function getComparator(order, orderBy) {
    return order === 'desc'
        ? (a, b) => descendingComparator(a, b, orderBy)
        : (a, b) => -descendingComparator(a, b, orderBy);
}
// Since 2020 all major browsers ensure sort stability with Array.prototype.sort().
// stableSort() brings sort stability to non-modern browsers (notably IE11). If you
// only support modern browsers you can replace stableSort(exampleArray, exampleComparator)
// with exampleArray.slice().sort(exampleComparator)
export function stableSort(data, comparator) {
    let entries = Object.entries(data);
    const stabilizedThis = entries.map((entry, index) => [entry[0], entry[1], index]);
    stabilizedThis.sort((a, b) => {
        const order = comparator(a[1], b[1]);
        if (order !== 0) {
            return order;
        }
        return a[2] - b[2];
    });
    let result = {};
    stabilizedThis.forEach(el => {
        result[el[0]] = el[1];
    });
    return result;
}
export var EnhancedTableColumnType;
(function (EnhancedTableColumnType) {
    EnhancedTableColumnType["TEXT"] = "text";
    EnhancedTableColumnType["NUMBER"] = "number";
    EnhancedTableColumnType["DATE"] = "date";
    EnhancedTableColumnType["DATETIME"] = "datetime";
    EnhancedTableColumnType["COLORED_CHIP"] = "colored_chip";
    EnhancedTableColumnType["LINK"] = "link";
    EnhancedTableColumnType["Clickable"] = "Clickable";
    EnhancedTableColumnType["CURRENCY"] = "currency";
    EnhancedTableColumnType["Action"] = "action";
    EnhancedTableColumnType["PhoneNumber"] = "PhoneNumber";
})(EnhancedTableColumnType || (EnhancedTableColumnType = {}));
