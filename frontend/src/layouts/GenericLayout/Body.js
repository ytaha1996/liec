import { jsx as _jsx } from "react/jsx-runtime";
import Container from '@mui/material/Container';
import { makeStyles } from 'tss-react/mui';
const useStyles = makeStyles()((theme) => ({
    mainContainer: {
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        paddingTop: '20px',
        marginTop: '20px',
        fontFamily: 'inherit',
        // Uncomment breakpoints as needed
        // [theme.breakpoints.up('xs')]: {
        //   margin: '20px 20px 0',
        // },
        // [theme.breakpoints.up('sm')]: {
        //   margin: '20px 0 0',
        // },
    },
}));
const Body = ({ children }) => {
    const { classes } = useStyles();
    return (_jsx(Container, { maxWidth: "xl", className: classes.mainContainer, children: children }));
};
export default Body;
