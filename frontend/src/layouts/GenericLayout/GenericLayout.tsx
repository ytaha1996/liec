import { makeStyles } from 'tss-react/mui';
import React from 'react';
import Body from './Body';
import Header from './Header';
import { Outlet } from 'react-router';

interface IGenericLayout {
  pages?: string[];
  links?: string[];
  appName?: string;
}

// Content offset tracks the responsive AppBar height in Header.tsx
// (xs: 56, sm: 64, md: 80).
const useStyles = makeStyles()((theme) => ({
  mainContainer: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: '#f6f6f6',
    fontFamily: 'sans-serif',
  },
  contentWrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'auto',
    marginTop: 56,
    height: 'calc(100vh - 56px)',
    [theme.breakpoints.up('sm')]: {
      marginTop: 64,
      height: 'calc(100vh - 64px)',
    },
    [theme.breakpoints.up('md')]: {
      marginTop: 80,
      height: 'calc(100vh - 80px)',
    },
  },
}));

const GenericLayout: React.FC<React.PropsWithChildren<IGenericLayout>> = ({
  pages,
  links,
  appName,
}) => {
  const { classes } = useStyles();
  return (
    <div className={classes.mainContainer}>
      <Header pages={pages} links={links} appName={appName} />
      <div className={classes.contentWrapper}>
        <Body>
          <Outlet />
        </Body>
      </div>
    </div>
  );
};

export default GenericLayout;
