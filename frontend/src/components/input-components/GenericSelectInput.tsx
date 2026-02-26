import React from "react";
import { tss } from "tss-react";
import GenericInputWrapper from "./GenericInputWrapper";
import { Autocomplete, TextField } from "@mui/material";

interface IGenericInputProps {
    title: string;
    type: string;
    value: string | string[];
    onChange: (value: any) => void;
    error?: string;
    name: string;
    onBlur?: (name: string) => void;
    disabled?: boolean;
    items: Record<string, string>;
    watermark?: string;
    multiple?: boolean;
    hideError?: boolean;
}

interface Item {
    key: string;
    value: string;
}

const useStyles = tss.create({
    label: {
        display: "block",
    },
    input: {
        width: "100%",
    },
    errorInput: {},
    error: {},
});

const GenericSelectInput: React.FC<IGenericInputProps> =
    ({
        title,
        value,
        disabled,
        error,
        onChange,
        name,
        watermark,
        items,
        hideError,
        multiple
    }) => {
        const { classes } = useStyles();

        const itemArray = Object.entries(items).map(([key, value]) => ({
            key,
            value,
        }));

        const selectedValue = multiple
            ? (value as string[] || []).map(v => itemArray.find(item => item.key === v)).filter(Boolean)
            : itemArray.find(item => item.key === value) ?? null;

        const handleChange = (_event: any, newValue: any) => {
            if (multiple) {
                onChange(newValue.map((item: Item) => item.key));
            } else {
                onChange(newValue ? newValue.key : null);
            }
        };


        return <GenericInputWrapper title={""} error={error} name={name} hideError={hideError}>
            <Autocomplete
                id={name}
                multiple={multiple}
                options={itemArray}
                getOptionLabel={(option) => (option && (option as any).value) || ''}
                value={selectedValue as any}
                disabled={disabled}
                onChange={handleChange}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        variant="outlined"
                        size="medium"
                        label={title}
                        error={!!error}
                        placeholder={watermark}
                    />
                )}
            />
        </GenericInputWrapper>
    }


export default GenericSelectInput;
