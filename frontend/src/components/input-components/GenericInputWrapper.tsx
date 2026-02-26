import { InputLabel } from "@mui/material";
import React from "react";
import { PropsWithChildren } from "react";
import { tss } from "tss-react";

export interface IGenericInputWrapper {
    title: string;
    name: string;
    error?: string;
    customClasses?: {
        main?: string;
        title?: string;
        error?: string;
    }
    hideError?: boolean;
}

const useStyles = tss.create({
    root: {
        margin: "0 0 15px"
    },
    label: {
        display: "block",
        fontSize: "14px",
        color: "#223354"
    },
    errorInput: {
        border: "1px solid red"
    },
    error: {
        display: "block",
        color: "red",
        fontSize: "12px",
        lineHeight: "18px",
        minHeight: "18px"
    },
});

const GenericInputWrapper: React.FC<PropsWithChildren<IGenericInputWrapper>> = ({ title, name, error, children, hideError, customClasses }) => {
    const { classes, cx } = useStyles();
    return <div className={cx(classes.root, customClasses?.main)}>
        {
            !!title && <InputLabel className={classes.label}>{title}</InputLabel >
        }
        {children}
        {
            !hideError &&
            <span className={classes.error}>{error}</span>
        }
    </div>
}

export default GenericInputWrapper;
