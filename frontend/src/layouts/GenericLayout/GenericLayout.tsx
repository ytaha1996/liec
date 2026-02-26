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
    marginTop: '80px',
    position: 'relative',
    height: 'calc(100vh - 80px)',
    overflow: 'auto'
  }
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
