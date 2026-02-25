import { Button } from '@mui/material';
import React from 'react';
import { makeStyles } from 'tss-react/mui';

interface GenericButtonProps {
    text: string;
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    className?: string;
    onClick?: () => void;
    variant?: "text" | "contained" | "outlined";
    color?: "primary" | "inherit" | "secondary" | "success" | "error" | "info" | "warning";
    children?: React.ReactNode;
}

const useStyles = makeStyles()(() => {
    return {
        button: {
            width: "175px"
        },
    };
});


const GenericButton: React.FC<GenericButtonProps> = ({
    text,
    type = 'button',
    disabled = false,
    className = '',
    onClick,
    variant = "contained",
    color = 'primary'
}) => {
    const { classes } = useStyles();

    return (
        <Button
            type={type}
            disabled={disabled}
            variant={variant}
            color={color}
            className={`${classes.button} ${className}`}
            onClick={onClick}
        >
            {text}
        </Button>
    );
};

export default GenericButton;
