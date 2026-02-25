import { jsx as _jsx } from "react/jsx-runtime";
import { Button } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
const useStyles = makeStyles()(() => {
    return {
        button: {
            width: "175px"
        },
    };
});
const GenericButton = ({ text, type = 'button', disabled = false, className = '', onClick, variant = "contained", color = 'primary' }) => {
    const { classes } = useStyles();
    return (_jsx(Button, { type: type, disabled: disabled, variant: variant, color: color, className: `${classes.button} ${className}`, onClick: onClick, children: text }));
};
export default GenericButton;
