import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
// DynamicFormWidget.tsx
import { useEffect, useState, useCallback } from 'react';
import { DynamicField, prepareValuesForSubmission } from '.';
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
const DynamicFormWidget = ({ title, fields, onSubmit, drawerMode = false, children, onFieldChange }) => {
    const { classes } = useStyles();
    const [formState, setFormState] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    // Build initial state from fields
    useEffect(() => {
        const initialValues = {};
        const initialErrors = {};
        const initialTouched = {};
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
    const validateField = useCallback((fieldName, values) => {
        const field = Object.values(fields).find((f) => f.name === fieldName);
        if (!field)
            return '';
        const fieldValue = values[field.name];
        const dynamicRequired = field.required ||
            (typeof field.conditionalRequired === 'function' &&
                field.conditionalRequired(values));
        if (dynamicRequired && isEmpty(fieldValue))
            return 'Required';
        if (isEmpty(fieldValue))
            return '';
        switch (field.type) {
            case DynamicField.TEXT:
                return field.regex && !field.regex.test(fieldValue)
                    ? `Invalid ${field.title}`
                    : '';
            case DynamicField.NUMBER:
            case DynamicField.CURRENCY:
                if (!isValidNumber(fieldValue))
                    return 'Invalid Number!';
                const fieldNumber = Number(fieldValue);
                if (!isEmpty(field.min) && fieldNumber < field.min)
                    return `Minimum value is ${field.min}`;
                if (!isEmpty(field.max) && fieldNumber > field.max)
                    return `Maximum value is ${field.max}`;
                return '';
            case DynamicField.DATE:
                if (!dayjs(fieldValue).isValid())
                    return 'Invalid Date!';
                const fieldDate = dayjs(fieldValue);
                if (!isEmpty(field.min) && fieldDate.isBefore(field.min))
                    return `Minimum Date is ${formatDate(field.min)}`;
                if (!isEmpty(field.max) && fieldDate.isAfter(field.max))
                    return `Maximum Date is ${formatDate(field.max)}`;
                return '';
            case DynamicField.FILE:
                if (typeof fieldValue !== 'string') {
                    const fileValue = fieldValue;
                    if (field.maxSizeInMbs &&
                        fileValue.size > field.maxSizeInMbs * 1024 * 1024)
                        return `Max file size is ${field.maxSizeInMbs} MB`;
                }
                else if (isEmpty(fieldValue)) {
                    return 'Required';
                }
                return '';
            case DynamicField.MULTISELECT:
            case DynamicField.TAGS: {
                const arr = fieldValue;
                if (!Array.isArray(arr))
                    return 'Invalid';
                if (dynamicRequired && arr.length === 0)
                    return 'Required';
                return '';
            }
            case DynamicField.CHECKBOXLIST: {
                const arrValue = fieldValue;
                if (!Array.isArray(arrValue))
                    return 'Invalid';
                if (dynamicRequired && arrValue.length === 0)
                    return 'Required';
                if (!isEmpty(field.minOptions) && arrValue.length < field.minOptions)
                    return `Minimum allowed options is ${field.minOptions}`;
                if (!isEmpty(field.maxOptions) && arrValue.length > field.maxOptions)
                    return `Maximum allowed options is ${field.maxOptions}`;
                return '';
            }
            default:
                return '';
        }
    }, [fields]);
    // Unified update function for all field types
    const updateFieldValue = useCallback((name, value) => {
        setFormState((prev) => {
            if (!prev)
                return prev;
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
    }, [onFieldChange, formState, validateField]);
    const handleBlur = useCallback((name) => {
        setFormState((prev) => {
            if (!prev)
                return prev;
            return {
                ...prev,
                touched: { ...prev.touched, [name]: true },
                errors: { ...prev.errors, [name]: validateField(name, prev.values) }
            };
        });
    }, [validateField]);
    const submit = async () => {
        if (!formState)
            return;
        setSubmitting(true);
        const newErrors = {};
        const newTouched = {};
        Object.values(fields).forEach((field) => {
            newErrors[field.name] = validateField(field.name, formState.values);
            newTouched[field.name] = true;
        });
        setFormState((prev) => prev ? { ...prev, errors: newErrors, touched: newTouched } : prev);
        const isValid = Object.values(newErrors).every((err) => isEmpty(err));
        if (isValid) {
            const preparedValues = prepareValuesForSubmission(formState.values, fields);
            await onSubmit(preparedValues);
        }
        else {
            toast.error('Incomplete Form!');
        }
        setSubmitting(false);
    };
    const renderField = useCallback((field) => {
        if (!formState)
            return null;
        // Check if hidden dynamically
        if (typeof field.conditionalHidden === 'function' &&
            field.conditionalHidden(formState.values))
            return null;
        const isDisabled = field.disabled ||
            (typeof field.conditionalDisable === 'function' &&
                field.conditionalDisable(formState.values)) ||
            submitting;
        const dynamicRequired = field.required ||
            (typeof field.conditionalRequired === 'function' &&
                field.conditionalRequired(formState.values));
        const label = dynamicRequired && !isEmpty(field.title)
            ? `${field.title}*`
            : field.title;
        // Shared props for most inputs
        const commonProps = {
            key: field.name,
            name: field.name,
            title: label,
            value: formState.values[field.name],
            onChange: (v) => updateFieldValue(field.name, v),
            onBlur: () => handleBlur(field.name),
            error: formState.touched[field.name]
                ? formState.errors[field.name]
                : '',
            disabled: isDisabled
        };
        switch (field.type) {
            case DynamicField.TEXT:
                return _jsx(GenericInput, { ...commonProps, type: "text" });
            case DynamicField.TEXTAREA:
                return _jsx(GenericTextAreaInput, { ...commonProps });
            case DynamicField.NUMBER:
                return _jsx(GenericNumberInput, { ...commonProps });
            case DynamicField.PHONENUMBER:
                return _jsx(GenericPhoneInput, { ...commonProps, type: "text" });
            case DynamicField.CURRENCY:
                return _jsx(GenericInput, { ...commonProps, type: "text" });
            case DynamicField.DATE:
                return (_jsx(GenericDatePicker, { ...commonProps, minDate: field.min, maxDate: field.max }));
            case DynamicField.SELECT:
                return (_jsx(GenericSelectInput, { ...commonProps, items: field.items, type: "" }));
            case DynamicField.MULTISELECT:
                return (_jsx(GenericSelectInput, { ...commonProps, multiple: true, items: field.items, type: "" }));
            case DynamicField.FILE:
                return (_jsx(GenericFileInput, { ...commonProps, allowedTypes: field.allowedTypes }));
            case DynamicField.IMAGE:
                return (_jsx(GenericImageInput, { name: field.name, title: field.title, value: formState.values[field.name], onChange: (v) => updateFieldValue(field.name, v), error: formState.touched[field.name]
                        ? formState.errors[field.name] || ''
                        : '', disabled: isDisabled }));
            case DynamicField.IMAGELIST:
                return (_jsx(GenericImageListInput, { name: field.name, title: field.title, value: formState.values[field.name], onChange: (v) => updateFieldValue(field.name, v), error: formState.touched[field.name]
                        ? formState.errors[field.name] || ''
                        : '', disabled: isDisabled, maxImages: field.maxImages }));
            case DynamicField.TAGS:
                return _jsx(GenericTagsInput, { ...commonProps });
            default:
                return null;
        }
    }, [formState, handleBlur, submitting, updateFieldValue]);
    const renderBody = () => {
        if (!formState)
            return null;
        return (_jsxs(_Fragment, { children: [_jsx("div", { children: Object.values(fields)
                        .filter((field) => typeof field.conditionalHidden === 'function'
                        ? !field.conditionalHidden(formState.values)
                        : true)
                        .map((field) => (_jsx(Grid, { ...(field.grid || { xs: 12 }), children: renderField(field) }, field.name))) }), children && (_jsx("div", { className: classes.additionalContent, children: children })), _jsx(GenericButton, { type: "button", onClick: submit, disabled: submitting, text: "Submit" })] }));
    };
    return (_jsxs("div", { children: [title && _jsx(MainPageTitle, { title: title }), drawerMode ? (renderBody()) : (_jsx(Card, { className: drawerMode ? classes.drawerRoot : classes.root, children: renderBody() }))] }));
};
export default DynamicFormWidget;
