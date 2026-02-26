import React from 'react';
import { makeStyles } from "tss-react/mui";
import {
  Box,
  Paper,
  Typography,
} from "@mui/material";
import CustomDropdown, { ICustomDropdownOption } from "../../CustomDropdown";

interface IMainPageSectionProps {
  title: string;
  actionsTitle?: string;
  actions?: ICustomDropdownOption[];
  children?: React.ReactNode;
}

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

const MainPageSection: React.FC<IMainPageSectionProps> = ({
  title,
  actionsTitle = "Actions",
  actions = [],
  children,
}) => {
  const { classes } = useStyles();

  return (
    <Box className={classes.box}>
      <Paper className={classes.root}>
        <div className={classes.header}>
          <Typography
            className={classes.title}
            variant="h6"
            id="pageTitle"
            component="div"
          >
            {title}
          </Typography>

          {actions && actions.length > 0 ? (
            <CustomDropdown title={actionsTitle} options={actions} />
          ) : (
            <span />
          )}
        </div>

        <div className={classes.body}>{children}</div>
      </Paper>
    </Box>
  );
};

export default MainPageSection;
