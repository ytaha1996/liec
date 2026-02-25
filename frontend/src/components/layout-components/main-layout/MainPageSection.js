import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { makeStyles } from "tss-react/mui";
import { Box, Paper, Typography, } from "@mui/material";
import CustomDropdown from "../../CustomDropdown";
const useStyles = makeStyles()((theme) => {
    return {
        box: {
            margin: "0 0 24px",
            width: "100%",
        },
        root: {
            width: "100%",
        },
        title: {
            color: "white",
            fontWeight: "700",
        },
        header: {
            padding: "16px",
            borderBottom: "1px solid rgba(224, 224, 224, 1)",
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            justifyItems: "center",
            alignContent: "center",
            flexDirection: "row",
            backgroundColor: '#00A6A6',
            color: '#fff',
            borderRadius: '10px 10px 0 0'
        },
        body: {
            maxHeight: "250px",
            padding: "20px",
        },
        link: {
            color: "rgb(157, 164, 174)",
            display: "block",
            "&:hover": {
                color: "white",
            },
        },
    };
});
const MainPageSection = ({ title, actionsTitle = "Actions", actions = [], children, }) => {
    const { classes } = useStyles();
    return (_jsx(Box, { className: classes.box, children: _jsxs(Paper, { className: classes.root, children: [_jsxs("div", { className: classes.header, children: [_jsx(Typography, { className: classes.title, variant: "h6", id: "pageTitle", component: "div", children: title }), actions && actions.length > 0 ? (_jsx(CustomDropdown, { title: actionsTitle, options: actions })) : (_jsx("span", {}))] }), _jsx("div", { className: classes.body, children: children })] }) }));
};
export default MainPageSection;
