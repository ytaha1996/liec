import React from 'react';
import { Button } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { formatCurrencyNumber, formatDate, formatDateTime } from '../../helpers/formatting-utils';
import { isEmpty } from '../../helpers/validation-utils';
import MainPageSection from '../layout-components/main-layout/MainPageSection';
import { ICustomDropdownOption } from '../CustomDropdown';

export enum InformationWidgetFieldTypes {
  Text = 'Text',
  Currency = 'Currency',
  Date = 'Date',
  Datetime = 'Datetime',
  Boolean = 'Boolean',
  MobileNumber = 'MobileNumber',
}

export interface IInformationWidgetField {
  type: InformationWidgetFieldTypes;
  name: string;
  title: string;
  description?: string;
  width: 'third' | 'two-third' | 'full';
  action?: { label: string; onClick: () => void };
}

interface IInformationWidgetProps {
  title: string;
  actionsTitle?: string;
  actions?: ICustomDropdownOption[];
  fields: IInformationWidgetField[];
  data: Record<string, any>;
  children?: React.ReactNode;
}

const useStyles = makeStyles()((theme) => ({
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    width: '100%',
  },
  colFull: {
    gridColumn: '1 / span 3',
  },
  colTwoThirds: {
    gridColumn: '1 / span 2',
  },
  fieldTitle: {
    display: 'block',
    fontFamily: theme.typography.caption.fontFamily,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    fontWeight: 700,
    color: theme.palette.text.secondary,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    marginBottom: '4px',
  },
  fieldValue: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  fieldText: {
    fontFamily: theme.typography.body2.fontFamily,
    fontSize: theme.typography.body2.fontSize,
    fontWeight: theme.typography.body2.fontWeight,
    lineHeight: theme.typography.body2.lineHeight,
  },
}));

const InformationWidget: React.FC<IInformationWidgetProps> = ({
  title,
  actionsTitle,
  actions = [],
  fields,
  data,
  children,
}) => {
  const { classes } = useStyles();

  const renderFieldText = (field: IInformationWidgetField): string => {
    if (isEmpty(data[field.name])) return '--';
    switch (field.type) {
      case InformationWidgetFieldTypes.Text:
        return String(data[field.name]);
      case InformationWidgetFieldTypes.Currency:
        return formatCurrencyNumber(data[field.name]);
      case InformationWidgetFieldTypes.Date:
        return formatDate(data[field.name]);
      case InformationWidgetFieldTypes.Datetime:
        return formatDateTime(data[field.name]);
      case InformationWidgetFieldTypes.Boolean:
        return data[field.name] === true ? 'Yes' : 'No';
      case InformationWidgetFieldTypes.MobileNumber:
        return String(data[field.name]);
      default:
        return String(data[field.name]);
    }
  };

  const renderItem = (field: IInformationWidgetField) => {
    const itemClass =
      field.width === 'full'
        ? classes.colFull
        : field.width === 'two-third'
        ? classes.colTwoThirds
        : undefined;
    return (
      <div className={itemClass} key={field.name}>
        <span className={classes.fieldTitle}>{field.title}</span>
        <div className={classes.fieldValue}>
          <span className={classes.fieldText}>{renderFieldText(field)}</span>
          {field.action && (
            <Button size="small" variant="text" onClick={field.action.onClick} sx={{ p: 0, minWidth: 'auto', lineHeight: 1 }}>
              {field.action.label}
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <MainPageSection title={title} actionsTitle={actionsTitle} actions={actions}>
      <div className={classes.gridContainer}>{fields.map((f) => renderItem(f))}</div>
      {children}
    </MainPageSection>
  );
};

export default InformationWidget;
