import React from "react";
import { tss } from "tss-react";
import GenericInputWrapper from "./GenericInputWrapper";
import { TextField } from "@mui/material";

interface IGenericInputProps {
    title: string;
    type: string;
    value: any;
    onChange: (value: any) => void;
    error?: string;
    name: string;
    onBlur?: (name: string) => void;
    disabled?: boolean;
    size?: "small" | "medium";
    onKeyDown?: (e: React.KeyboardEvent) => void;
}

const useStyles = tss.create({
    label: {
        display: "block",
    },
    input: {
        width: "100%"
    },
    errorInput: {},
    error: {},
});

const GenericPhoneInput: React.FC<IGenericInputProps> = ({
    title,
    type,
    value,
    disabled,
    error,
    size = "medium",
    onChange,
    name,
    onBlur = () => {},
    onKeyDown = () => {}
}) => {
    const { classes, cx } = useStyles();

    return (
        <GenericInputWrapper title={""} error={error} name={name}>
            <TextField
                type="tel"
                label={title}
                variant="outlined"
                value={value ?? ''}
                error={!!error}
                size={size}
                disabled={disabled}
                className={cx(classes.input, !!error ? classes.errorInput : undefined)}
                onChange={(e) => onChange(e.target.value)}
                onBlur={() => onBlur(name)}
                onKeyDown={onKeyDown}
            />
        </GenericInputWrapper>
    );
}

export default GenericPhoneInput;
