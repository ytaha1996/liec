import React, { useState, useMemo } from 'react';
import AppLauncherModal from './AppLauncherModal';
import { makeStyles } from 'tss-react/mui';
import { IApplication } from '../../IApplication';
import AppsIcon from '@mui/icons-material/Apps';

interface IAppLauncherProps {
  appLauncherUrl: string;
  applications: Record<string, IApplication>;
}

const useStyles = makeStyles()(() => ({
  appLauncherButton: {
    margin: '0 5px 0 5px',
    border: 'none',
    outline: 'none',
    background: 'unset',
  },
  appLauncherFig: {
    margin: 0,
  },
  appLauncherImg: {
    height: 25,
    width: 25,
    minWidth: 25,
    cursor: 'pointer',
  },
  dialogPaper: {
    height: '100%',
  },
  dialogContent: {},
}));

const AppLauncher: React.FC<IAppLauncherProps> = ({ applications }) => {
  const [open, setOpen] = useState(false);
  const { classes } = useStyles();

  // Use useMemo to compute the filtered applications
  const filteredApplication = useMemo(() => {
    const apps: Record<string, IApplication> = {};
    Object.keys(applications).forEach((app) => {
      if (!applications[app].hidden) {
        apps[app] = applications[app];
      }
    });
    return apps;
  }, [applications]);

  function openModal() {
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
  }

  return (
    <>
      <button
        className={classes.appLauncherButton}
        onClick={openModal}
        type="button"
      >
        <figure className={classes.appLauncherFig}>
          <AppsIcon sx={{ fontSize: 25, cursor: 'pointer', color: 'white' }} />
        </figure>
      </button>
      <AppLauncherModal
        open={open}
        closeModal={closeModal}
        applications={filteredApplication}
      />
    </>
  );
};

export default AppLauncher;
