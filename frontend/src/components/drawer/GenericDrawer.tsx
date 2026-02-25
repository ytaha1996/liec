// BottomRightDrawer.tsx
import { makeStyles } from 'tss-react/mui';
import React, { PropsWithChildren } from 'react';
import Drawer from '@mui/material/Drawer';

interface GenericDrawerProps {
    title: string;
    open: boolean;
    onClose: () => void;
}

const useStyles = makeStyles()(
    (_theme) => ({
        container: {
            width: "100%",
            height: "100%",
        },
        titleContainer: {
            height: "60px",
            backgroundColor: "#243043",
            position: "sticky",
            top: "0",
            width: "100%",
            padding: "15px",
            justifyContent: 'space-between',
            zIndex: '12',
            display: 'flex',
            alignItems: 'center'
        },
        title: {
            color: "#fff",
            fontSize: "15px",
            lineHeight: "20px"
        },
        bodyContainer: {
            padding: "20px 15px 15px",
        },
        closeButton: {
            color: "#fff",
            height: "20px",
            display: "block",
            cursor: "pointer"
        }
    })
);

const GenericDrawer: React.FC<PropsWithChildren<GenericDrawerProps>> = ({ children, title, open, onClose }) => {

    const { classes } = useStyles();

    return (
        <Drawer
            anchor="bottom"
            open={open}
            ModalProps={{ keepMounted: true, slotProps: { backdrop: { invisible: true } } }}
            PaperProps={{
                sx: {
                    width: '350px',
                    position: 'absolute',
                    right: 0,
                    bottom: 0,
                    maxHeight: '70%',
                    borderTopLeftRadius: 8,
                    borderTopRightRadius: 0,
                    left: "unset",
                    height: "700px",
                    "transition": "width 2s",
                },
            }}
        >

            <div className={classes.container}>
                <div className={classes.titleContainer}>
                    <div className={classes.title}>
                        {title}
                    </div>
                    <span className={classes.closeButton} onClick={() => onClose()}>X</span>
                </div>
                <div className={classes.bodyContainer}>
                    {children}
                </div>

            </div>
        </Drawer>
    );
};

export default GenericDrawer;
