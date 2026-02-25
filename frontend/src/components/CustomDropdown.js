import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from '@mui/material';
import { useState, useRef, useEffect } from 'react';
import { makeStyles } from 'tss-react/mui';
const useStyles = makeStyles()({
    dropdownContainer: {
        position: 'relative',
        display: 'inline-block',
        width: "150px",
        textTransform: "none !important"
    },
    dropdownButton: {
        color: 'white',
        padding: '10px 16px',
        border: 'none',
        cursor: 'pointer',
        width: "100%",
        textTransform: "none !important",
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
        textTransform: "none !important",
        '&:hover': {
            backgroundColor: '#f1f1f1'
        }
    }
});
const Dropdown = ({ title, options, className }) => {
    const { classes, cx } = useStyles();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    useEffect(() => {
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);
    const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
            setIsOpen(false);
        }
    };
    return (_jsxs("div", { className: classes.dropdownContainer, ref: dropdownRef, children: [_jsx(Button, { type: "button", variant: "contained", size: "small", className: cx(classes.dropdownButton, className), onClick: () => setIsOpen(!isOpen), children: title }), isOpen && (_jsx("div", { className: classes.dropdownContent, children: options.map(option => (_jsx(Button, { type: "button", className: classes.dropdownItem, disabled: option.disabled, onClick: () => {
                        setIsOpen(false);
                        option.onClick();
                    }, children: option.title }, option.key))) }))] }));
};
export default Dropdown;
