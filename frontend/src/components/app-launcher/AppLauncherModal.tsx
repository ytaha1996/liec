import React, { useState, useEffect } from 'react';
import AppLauncherApps from './AppLauncherApps';
import AppLauncherModules from './AppLauncherModules';
import { makeStyles } from 'tss-react/mui';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  useMediaQuery,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { IApplication } from '../../IApplication';
import GenericTextInput from '../input-components/GenericTextInput';

interface IAppLauncherModalProps {
  open: boolean;
  closeModal: () => void;
  applications: Record<string, IApplication>;
}

const useStyles = makeStyles()(() => ({
  dialogPaper: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  dialogTitle: {
    position: 'relative',
    fontSize: '22px',
    lineHeight: '27px',
    borderBottom: '1px solid rgba(220, 220, 220, 0.5)',
    padding: '16px 24px',
    display: 'flex',
    flexDirection: 'row',
    gap: '30px',
  },
  titleWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleText: {
    fontWeight: 600,
    fontSize: '20px',
    margin: 0,
  },
  searchField: {
    width: '100%',
    maxWidth: '400px',
  },
  closeIcon: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    color: '#666',
    '&:hover': {
      color: '#000',
    },
  },
  dialogContent: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
  },
}));

const AppLauncherModal: React.FC<IAppLauncherModalProps> = ({
  open,
  closeModal,
  applications,
}) => {
  const { classes } = useStyles();
  const fullScreen = useMediaQuery('@media only screen and (max-width: 700px)');
  const [searchKey, setSearchKey] = useState<string>('');

  useEffect(() => {
    if (!open) {
      setSearchKey('');
    }
  }, [open]);

  const handleChange = (v: any) => {
    setSearchKey(v);
  };

  return (
    <Dialog
      classes={{ paper: classes.dialogPaper }}
      open={open}
      onClose={closeModal}
      fullWidth
      fullScreen={fullScreen}
      maxWidth="xl"
    >
      <DialogTitle className={classes.dialogTitle}>
        <IconButton
          aria-label="close"
          className={classes.closeIcon}
          onClick={closeModal}
        >
          <CloseIcon />
        </IconButton>
        <div className={classes.titleWrapper}>
          <span className={classes.titleText}>App Launcher</span>
        </div>
        <GenericTextInput
          type="text"
          name="search"
          placeholder="Search"
          onChange={handleChange}
          value={searchKey}
          className={classes.searchField}
          title=''
          variant='standard'
          hideError={true}
        />
      </DialogTitle>
      <DialogContent className={classes.dialogContent}>
        <AppLauncherApps
          applications={applications}
          closeModal={closeModal}
          searchKey={searchKey}
        />
        <AppLauncherModules
          applications={applications}
          closeModal={closeModal}
          searchKey={searchKey}
        />
      </DialogContent>
    </Dialog>
  );
};

export default AppLauncherModal;
