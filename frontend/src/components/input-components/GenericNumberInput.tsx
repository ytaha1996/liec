import React from "react";
import { tss } from "tss-react";
import GenericInputWrapper from "./GenericInputWrapper";
import { TextField } from "@mui/material";

interface IGenericInputProps {
    title: string;
    value: any;
    onChange: (value: any) => void;
    error?: string;
    name: string;
    onBlur?: (name: string) => void;
    disabled?: boolean;
}

const useStyles = tss.create({
    label: {
        display: "block",
    },
    input: {
        width: "100%",
    },
    errorInput: {},
    error: {
        color: "red",
    },
});

const GenericNumberInput: React.FC<IGenericInputProps> = ({ title, value, disabled, error, onChange, name, onBlur = () => { } }) => {
    const { classes, cx } = useStyles();
    return <GenericInputWrapper title={""} error={error} name={name}>
        <TextField
            type="number"
            label={title}
            variant="outlined"
            value={value}
            error={!!error}
            size="medium"
            disabled={disabled}
            className={cx(classes.input, !!error ? classes.errorInput : undefined)}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => onBlur(name)} />
    </GenericInputWrapper>
}


export default GenericNumberInput;
