import React from 'react';
import { tss } from 'tss-react';
import GenericInputWrapper from './GenericInputWrapper';
import { TextField } from '@mui/material';

interface IGenericTextAreaInputProps {
    title: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    name: string;
    onBlur?: (name: string) => void;
    disabled?: boolean;
    rows?: number;
    placeholder?: string;
    className?: string;
    hideError?: boolean;
    variant?: 'standard' | 'filled' | 'outlined';
    containerClassName?: string;
}

const useStyles = tss.create({
    input: {
        width: "100%"
    },
    errorInput: {},
    error: {},
});

const GenericTextAreaInput: React.FC<IGenericTextAreaInputProps> = ({
    title,
    value,
    onChange,
    name,
    error,
    disabled,
    rows = 4,
    placeholder,
    onBlur = () => {},
    className,
    hideError,
    variant = 'outlined',
    containerClassName,
}) => {
    const { classes, cx } = useStyles();

    return (
        <GenericInputWrapper customClasses={{main: containerClassName}} hideError={hideError} title={""} error={error} name={name}>
            <TextField
                multiline
                variant={variant}
                value={value}
                label={title}
                placeholder={placeholder}
                error={!!error}
                disabled={disabled}
                rows={rows}
                maxRows={rows}
                className={cx(classes.input, className, !!error ? classes.errorInput : undefined)}
                onChange={(e) => onChange(e.target.value)}
                onBlur={() => onBlur(name)}
            />
        </GenericInputWrapper>
    );
};

export default GenericTextAreaInput;
