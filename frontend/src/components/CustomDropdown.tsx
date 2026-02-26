import { Button } from '@mui/material';
import React, { useState, useRef, useEffect } from 'react';
import { makeStyles } from 'tss-react/mui';

const useStyles = makeStyles()({
    dropdownContainer: {
        position: 'relative',
        display: 'inline-block',
        width: "150px",
        textTransform: "none !important" as any
    },
    dropdownButton: {
        color: 'white',
        padding: '10px 16px',
        border: 'none',
        cursor: 'pointer',
        width: "100%",
        textTransform: "none !important" as any,
    },
    dropdownContent: {
        position: 'absolute',
        backgroundColor: '#f9f9f9',
        boxShadow: '0px 8px 16px 0px rgba(0,0,0,0.2)',
        zIndex: 1,
        width: "100%"
    },
    dropdownItem: {
        color: 'black',
        padding: '12px 16px',
        textDecoration: 'none',
        display: 'block',
        width: "100%",
        textTransform: "none !important" as any,
        '&:hover': {
            backgroundColor: '#f1f1f1'
        }
    }
});

export interface ICustomDropdownOption {
    key: string;
    title: string;
    disabled?: boolean;
    onClick: () => void;
}

export interface ICustomDropdownProps {
    title: string;
    options: ICustomDropdownOption[];
    className?: string;
}

const Dropdown: React.FC<ICustomDropdownProps> = ({ title, options, className }) => {
    const { classes, cx } = useStyles();
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleClickOutside = (event: Event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setIsOpen(false);
        }
    };

    return (
        <div className={classes.dropdownContainer} ref={dropdownRef}>
            <Button type="button" variant="contained" size="small" className={cx(classes.dropdownButton, className)} onClick={() => setIsOpen(!isOpen)}>
                {title}
            </Button>
            {isOpen && (
                <div className={classes.dropdownContent}>
                    {options.map(option => (
                        <Button
                            key={option.key}
                            type="button"
                            className={classes.dropdownItem}
                            disabled={option.disabled}
                            onClick={() => {
                                setIsOpen(false);
                                option.onClick();
                            }}
                        >
                            {option.title}
                        </Button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Dropdown;
