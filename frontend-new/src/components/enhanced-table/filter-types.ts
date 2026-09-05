export const TableFilterTypes = {
  SELECT: 'SELECT',
  DATERANGE: 'DATERANGE',
} as const;
export type TableFilterTypes = (typeof TableFilterTypes)[keyof typeof TableFilterTypes];

interface BaseFilter {
  name: string;
  title: string;
}

export interface SelectFilter extends BaseFilter {
  type: typeof TableFilterTypes.SELECT;
  options: Record<string, string>;
}

export interface DateRangeFilter extends BaseFilter {
  type: typeof TableFilterTypes.DATERANGE;
}

export type ITableFilterType = SelectFilter | DateRangeFilter;
