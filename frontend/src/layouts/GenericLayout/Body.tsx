import React from 'react';
import Container from '@mui/material/Container';
import { makeStyles } from 'tss-react/mui';


const useStyles = makeStyles()((theme) => ({
  mainContainer: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    fontFamily: 'inherit',
    paddingTop: 8,
    marginTop: 8,
    [theme.breakpoints.up('sm')]: {
      paddingTop: 20,
      marginTop: 20,
    },
  },
}));

const Body: React.FC<React.PropsWithChildren<any>> = ({ children }) => {
  const { classes } = useStyles();

  return (
    <Container maxWidth="xl" className={classes.mainContainer}>
      {children}
    </Container>
  );
};

export default Body;
