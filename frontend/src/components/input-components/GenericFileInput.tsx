import React, { useRef } from "react";
import { tss } from "tss-react";
import GenericInputWrapper from "./GenericInputWrapper";
import { TextField } from "@mui/material";
import { FileType, getMimeTypes } from "../../helpers/file-utils";

interface IGenericInputProps {
    title: string;
    value: any;
    onChange: (value: any) => void;
    error?: string;
    name: string;
    disabled?: boolean;
    size?: "small" | "medium";
    variant?: "standard" | "filled" | "outlined";
    placeholder?: string;
    className?: string;
    hideError?: boolean;
    containerClassName?: string;
    allowedTypes: FileType[];
}

const useStyles = tss.create({
    input: {
        width: "100%"
    },
    hiddenInput: {
        display: "none"
    },
});

const GenericFileInput: React.FC<IGenericInputProps> =
    ({
        title,
        variant = "outlined",
        value,
        disabled,
        error,
        size = "medium",
        onChange,
        name,
        placeholder,
        className,
        hideError,
        containerClassName,
        allowedTypes
    }) => {
        const { classes, cx } = useStyles();
        const fileInputRef = useRef<HTMLInputElement>(null);

        const handleTextFieldClick = () => {
            fileInputRef.current?.click();
        };

        const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) {
                onChange(file);
            }
        };

        const displayValue = typeof value === 'string' ? value : value?.name || '';

        return (
            <GenericInputWrapper customClasses={{ main: containerClassName }} hideError={hideError} title={""} error={error} name={name}>
                <TextField
                    type="text"
                    variant={variant}
                    value={displayValue}
                    label={title}
                    placeholder={placeholder}
                    error={!!error}
                    size={size}
                    disabled={disabled}
                    className={cx(classes.input, className)}
                    onClick={handleTextFieldClick}
                    InputProps={{ readOnly: true }}
                />
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept={getMimeTypes(allowedTypes).join(',')}
                    className={classes.hiddenInput}
                />
            </GenericInputWrapper>
        );
    }

export default GenericFileInput;
