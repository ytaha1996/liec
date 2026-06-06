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
            // Right-anchored drawer on desktop, bottom-anchored on mobile so
            // the keyboard doesn't push the form off-screen.
            anchor="right"
            open={open}
            onClose={onClose}
            ModalProps={{ keepMounted: true }}
            PaperProps={{
                sx: {
                    // Full viewport on phones, fixed 420px on tablets+.
                    width: { xs: '100vw', sm: 420 },
                    maxWidth: '100vw',
                    height: '100%',
                    borderTopLeftRadius: { xs: 0, sm: 8 },
                    borderBottomLeftRadius: { xs: 0, sm: 8 },
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
