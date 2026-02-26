import React from "react";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { CloseConfirmation } from "../redux/confirmation/confirmationReducer";
import { makeStyles } from 'tss-react/mui';
import GenericButton from "./GenericButton";

const useStyles = makeStyles()({
  container: {
    width: "600px",
    padding: "20px 15px",
  },
  cancelButton: {
    backgroundColor: "#fff",
    color: "#243043",
    border: "1px solid #243043",
    '&:hover': {
      color: 'white',
      backgroundColor: 'grey',
      border: '1px solid grey'
    }
  },
  title: {
    borderBottom: "1px solid grey",
    margin: 0,
  }
});

interface Props { }


const ConfirmationBox: React.FC<Props> = () => {

  const { classes } = useStyles();
  const { open, title, message, onSubmit } = useAppSelector(
    (state) => state.confirmation
  );
  const dispatch = useAppDispatch();

  const handleCancel = () => {
    dispatch(CloseConfirmation());
  };

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit();
      dispatch(CloseConfirmation());
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <div className={classes.container}>
        <h2 className={classes.title} id="alert-dialog-title">{title}</h2>
        <p>{message}</p>
        <DialogActions>
          <GenericButton onClick={handleCancel} text={"Cancel"} className={classes.cancelButton} />
          <GenericButton onClick={handleSubmit} text={"Confirm"} />
        </DialogActions>
      </div>

    </Dialog>
  );
};

export default ConfirmationBox;
