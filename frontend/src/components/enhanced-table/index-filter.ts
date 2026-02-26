
export enum TableFilterTypes {
    SELECT = "SELECT",
    DATERANGE = "DATERANGE",
}


export interface ITableFilterBase {
    name: string;
    type: TableFilterTypes;
    title: string;
    value?: any;
    options?: { [key: string]: string };
}


export interface ITableFilterSelect extends ITableFilterBase {
    type: TableFilterTypes.SELECT;
    defaultValue?: string[];
}

export interface ITableFilterDateRange extends ITableFilterBase {
    type: TableFilterTypes.DATERANGE;
}

export type ITableFilterType = ITableFilterSelect | ITableFilterDateRange;
