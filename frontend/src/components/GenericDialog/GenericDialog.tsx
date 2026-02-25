// GenericDialog.tsx
import React, { PropsWithChildren } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { makeStyles } from 'tss-react/mui';

interface GenericDialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  headerAction?: React.ReactNode;
}

const useStyles = makeStyles()((theme) => ({
  dialogTitle: {
    margin: 0,
    padding: theme.spacing(2),
    backgroundColor: '#243043',
    color: '#fff',
    position: 'relative',
  },
  headerAction: {
    position: 'absolute',
    right: theme.spacing(6), // leave space for the close button
    top: theme.spacing(1),
  },
  closeButton: {
    position: 'absolute',
    right: theme.spacing(1),
    top: theme.spacing(1),
    color: '#fff',
  },
  dialogContent: {
    padding: `${theme.spacing(3)} !important`,
    marginTop: theme.spacing(2),
  },
}));

const GenericDialog: React.FC<PropsWithChildren<GenericDialogProps>> = ({
  open,
  title,
  onClose,
  headerAction,
  children,
}) => {
  const { classes } = useStyles();

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle className={classes.dialogTitle}>
        {title}
        {headerAction && <div className={classes.headerAction}>{headerAction}</div>}
        <IconButton aria-label="close" className={classes.closeButton} onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent className={classes.dialogContent} sx={{ paddingTop: 2 }}>
        {children}
      </DialogContent>
    </Dialog>
  );
};

export default GenericDialog;
