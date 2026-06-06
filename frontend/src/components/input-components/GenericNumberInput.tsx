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
    min?: number;
    max?: number;
    step?: number;
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

const GenericNumberInput: React.FC<IGenericInputProps> = ({ title, value, disabled, error, onChange, name, min, max, step, onBlur = () => { } }) => {
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
            // `inputMode="decimal"` triggers the numeric keypad on mobile
            // browsers without the spinner; `enterKeyHint="next"` makes the
            // virtual keyboard's enter key advance.
            inputProps={{ min, max, step, inputMode: 'decimal', enterKeyHint: 'next' }}
            className={cx(classes.input, !!error ? classes.errorInput : undefined)}
            onChange={(e) => onChange(e.target.value)}
            onFocus={(e) => e.target.select()}
            onBlur={() => onBlur(name)} />
    </GenericInputWrapper>
}


export default GenericNumberInput;
