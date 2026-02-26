// DynamicFormWidget.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { DynamicField, DynamicFieldTypes, prepareValuesForSubmission } from '.';
import GenericInput from '../input-components/GenericTextInput';
import GenericTextAreaInput from '../input-components/GenericTextAreaInput';
import GenericNumberInput from '../input-components/GenericNumberInput';
import GenericSelectInput from '../input-components/GenericSelectInput';
import GenericDatePicker from '../input-components/GenericDatePicker';
import GenericFileInput from '../input-components/GenericFileInput';
import GenericImageInput from '../input-components/GenericImageInput';
import GenericImageListInput from '../input-components/GenericImageListInput';
import GenericButton from '../GenericButton';
import { isEmpty, isValidNumber } from '../../helpers/validation-utils';
import MainPageTitle from '../layout-components/main-layout/MainPageTitle';
import { Card, Grid } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { toast } from 'react-toastify';
import { formatDate } from '../../helpers/formatting-utils';
import dayjs from 'dayjs';
import GenericTagsInput from '../input-components/GenericTagsInput';
import GenericPhoneInput from '../input-components/GenericPhoneInput';

interface IDynamicFormWidgetProps {
  title: string;
  fields: Record<string, DynamicFieldTypes & { grid?: any }>;
  onSubmit: (values: Record<string, any>) => Promise<boolean>;
  drawerMode?: boolean;
  children?: React.ReactNode;
  onFieldChange?: (
    fieldName: string,
    value: any,
    allValues: Record<string, any>
  ) => void;
}

interface IDynamicFormState {
  values: Record<string, any>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
}

const useStyles = makeStyles()((_theme) => ({
  root: {
    padding: '20px 25px'
  },
  drawerRoot: {
    padding: '20px 0'
  },
  additionalContent: {
    marginTop: _theme.spacing(2),
    marginBottom: _theme.spacing(3)
  }
}));

const DynamicFormWidget: React.FC<IDynamicFormWidgetProps> = ({
  title,
  fields,
  onSubmit,
  drawerMode = false,
  children,
  onFieldChange
}) => {
  const { classes } = useStyles();
  const [formState, setFormState] = useState<IDynamicFormState | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Build initial state from fields
  useEffect(() => {
    const initialValues: Record<string, any> = {};
    const initialErrors: Record<string, string> = {};
    const initialTouched: Record<string, boolean> = {};
    Object.values(fields).forEach((field) => {
      initialValues[field.name] = field.value;
      initialErrors[field.name] = '';
      initialTouched[field.name] = false;
    });
    setFormState({
      values: initialValues,
      errors: initialErrors,
      touched: initialTouched
    });
  }, [fields]);

  // Validate a single field
  const validateField = useCallback(
    (fieldName: string, values: Record<string, any>): string => {
      const field = Object.values(fields).find((f) => f.name === fieldName);
      if (!field) return '';
      const fieldValue = values[field.name];
      const dynamicRequired =
        field.required ||
        (typeof field.conditionalRequired === 'function' &&
          field.conditionalRequired(values));
      if (dynamicRequired && isEmpty(fieldValue)) return 'Required';
      if (isEmpty(fieldValue)) return '';
      switch (field.type) {
        case DynamicField.TEXT:
          return field.regex && !field.regex.test(fieldValue)
            ? `Invalid ${field.title}`
            : '';
        case DynamicField.NUMBER:
        case DynamicField.CURRENCY:
          if (!isValidNumber(fieldValue)) return 'Invalid Number!';
          const fieldNumber = Number(fieldValue);
          if (!isEmpty(field.min) && fieldNumber < (field.min as number))
            return `Minimum value is ${field.min}`;
          if (!isEmpty(field.max) && fieldNumber > (field.max as number))
            return `Maximum value is ${field.max}`;
          return '';
        case DynamicField.DATE:
          if (!dayjs(fieldValue).isValid()) return 'Invalid Date!';
          const fieldDate = dayjs(fieldValue);
          if (!isEmpty(field.min) && fieldDate.isBefore(field.min))
            return `Minimum Date is ${formatDate(field.min)}`;
          if (!isEmpty(field.max) && fieldDate.isAfter(field.max))
            return `Maximum Date is ${formatDate(field.max)}`;
          return '';
        case DynamicField.FILE:
          if (typeof fieldValue !== 'string') {
            const fileValue = fieldValue as File;
            if (
              field.maxSizeInMbs &&
              fileValue.size > field.maxSizeInMbs * 1024 * 1024
            )
              return `Max file size is ${field.maxSizeInMbs} MB`;
          } else if (isEmpty(fieldValue)) {
            return 'Required';
          }
          return '';
        case DynamicField.MULTISELECT:
        case DynamicField.TAGS: {
          const arr = fieldValue as string[];
          if (!Array.isArray(arr)) return 'Invalid';
          if (dynamicRequired && arr.length === 0) return 'Required';
          return '';
        }
        case DynamicField.CHECKBOXLIST: {
          const arrValue = fieldValue as string[];
          if (!Array.isArray(arrValue)) return 'Invalid';
          if (dynamicRequired && arrValue.length === 0) return 'Required';
          if (!isEmpty(field.minOptions) && arrValue.length < (field.minOptions as number))
            return `Minimum allowed options is ${field.minOptions}`;
          if (!isEmpty(field.maxOptions) && arrValue.length > (field.maxOptions as number))
            return `Maximum allowed options is ${field.maxOptions}`;
          return '';
        }
        default:
          return '';
      }
    },
    [fields]
  );

  // Unified update function for all field types
  const updateFieldValue = useCallback(
    (name: string, value: any) => {
      setFormState((prev) => {
        if (!prev) return prev;
        const updatedValues = { ...prev.values, [name]: value };
        return {
          values: updatedValues,
          errors: {
            ...prev.errors,
            [name]: validateField(name, updatedValues)
          },
          touched: { ...prev.touched, [name]: true }
        };
      });
      // Bubble up value change with updated values
      if (onFieldChange && formState) {
        const updatedValues = { ...formState.values, [name]: value };
        onFieldChange(name, value, updatedValues);
      }
    },
    [onFieldChange, formState, validateField]
  );

  const handleBlur = useCallback(
    (name: string) => {
      setFormState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          touched: { ...prev.touched, [name]: true },
          errors: { ...prev.errors, [name]: validateField(name, prev.values) }
        };
      });
    },
    [validateField]
  );

  const submit = async () => {
    if (!formState) return;
    setSubmitting(true);
    const newErrors: Record<string, string> = {};
    const newTouched: Record<string, boolean> = {};
    Object.values(fields).forEach((field) => {
      newErrors[field.name] = validateField(field.name, formState.values);
      newTouched[field.name] = true;
    });
    setFormState((prev) =>
      prev ? { ...prev, errors: newErrors, touched: newTouched } : prev
    );
    const isValid = Object.values(newErrors).every((err) => isEmpty(err));
    if (isValid) {
      const preparedValues = prepareValuesForSubmission(
        formState.values,
        fields
      );
      await onSubmit(preparedValues);
    } else {
      toast.error('Incomplete Form!');
    }
    setSubmitting(false);
  };

  const renderField = useCallback(
    (field: DynamicFieldTypes & { grid?: any }) => {
      if (!formState) return null;
      // Check if hidden dynamically
      if (
        typeof field.conditionalHidden === 'function' &&
        field.conditionalHidden(formState.values)
      )
        return null;

      const isDisabled =
        field.disabled ||
        (typeof field.conditionalDisable === 'function' &&
          field.conditionalDisable(formState.values)) ||
        submitting;
      const dynamicRequired =
        field.required ||
        (typeof field.conditionalRequired === 'function' &&
          field.conditionalRequired(formState.values));
      const label =
        dynamicRequired && !isEmpty(field.title)
          ? `${field.title}*`
          : field.title;

      // Shared props for most inputs
      const commonProps = {
        key: field.name,
        name: field.name,
        title: label,
        value: formState.values[field.name],
        onChange: (v: any) => updateFieldValue(field.name, v),
        onBlur: () => handleBlur(field.name),
        error: formState.touched[field.name]
          ? formState.errors[field.name]
          : '',
        disabled: isDisabled
      };

      switch (field.type) {
        case DynamicField.TEXT:
          return <GenericInput {...commonProps} type="text" />;
        case DynamicField.TEXTAREA:
          return <GenericTextAreaInput {...commonProps} />;
        case DynamicField.NUMBER:
          return <GenericNumberInput {...commonProps} />;
        case DynamicField.PHONENUMBER:
          return <GenericPhoneInput {...commonProps} type="text" />;
        case DynamicField.CURRENCY:
          return <GenericInput {...commonProps} type="text" />;
        case DynamicField.DATE:
          return (
            <GenericDatePicker
              {...commonProps}
              minDate={(field as any).min}
              maxDate={(field as any).max}
            />
          );
        case DynamicField.SELECT:
          return (
            <GenericSelectInput {...commonProps} items={(field as any).items} type="" />
          );
        case DynamicField.MULTISELECT:
          return (
            <GenericSelectInput
              {...commonProps}
              multiple
              items={(field as any).items}
              type=""
            />
          );
        case DynamicField.FILE:
          return (
            <GenericFileInput
              {...commonProps}
              allowedTypes={(field as any).allowedTypes}
            />
          );
        case DynamicField.IMAGE:
          return (
            <GenericImageInput
              name={field.name}
              title={field.title}
              value={formState.values[field.name]}
              onChange={(v: any) => updateFieldValue(field.name, v)}
              error={
                formState.touched[field.name]
                  ? formState.errors[field.name] || ''
                  : ''
              }
              disabled={isDisabled}
            />
          );
        case DynamicField.IMAGELIST:
          return (
            <GenericImageListInput
              name={field.name}
              title={field.title}
              value={formState.values[field.name]}
              onChange={(v: any) => updateFieldValue(field.name, v)}
              error={
                formState.touched[field.name]
                  ? formState.errors[field.name] || ''
                  : ''
              }
              disabled={isDisabled}
              maxImages={(field as any).maxImages}
            />
          );
        case DynamicField.TAGS:
          return <GenericTagsInput {...commonProps} />;
        default:
          return null;
      }
    },
    [formState, handleBlur, submitting, updateFieldValue]
  );

  const renderBody = () => {
    if (!formState) return null;
    return (
      <>
        <div>
          {Object.values(fields)
            .filter((field) =>
              typeof field.conditionalHidden === 'function'
                ? !field.conditionalHidden(formState.values)
                : true
            )
            .map((field) => (
              <Grid key={field.name} {...(field.grid || { xs: 12 })}>
                {renderField(field)}
              </Grid>
            ))}
        </div>
        {children && (
          <div className={classes.additionalContent}>{children}</div>
        )}
        <GenericButton
          type="button"
          onClick={submit}
          disabled={submitting}
          text="Submit"
        />
      </>
    );
  };

  return (
    <div>
      {title && <MainPageTitle title={title} />}
      {drawerMode ? (
        renderBody()
      ) : (
        <Card className={drawerMode ? classes.drawerRoot : classes.root}>
          {renderBody()}
        </Card>
      )}
    </div>
  );
};

export default DynamicFormWidget;
