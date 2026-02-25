import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Menu from '@mui/material/Menu';
import MenuIcon from '@mui/icons-material/Menu';
import Container from '@mui/material/Container';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { useNavigate } from 'react-router-dom';
import AppLauncher from 'src/components/app-launcher/AppLauncher';
import { applications } from 'src/application';
import { useAppDispatch, useAppSelector } from 'src/redux/hooks';
import { LogoutUser } from 'src/redux/user/userReducer';
import { api } from 'src/api/client';
const settings = ['Profile', 'Update Password', 'Logout'];
const Header = ({ pages = [], links = [], appName = '' }) => {
    const [anchorElNav, setAnchorElNav] = React.useState(null);
    const [anchorElUser, setAnchorElUser] = React.useState(null);
    const [openPasswordDialog, setOpenPasswordDialog] = React.useState(false);
    const [oldPassword, setOldPassword] = React.useState('');
    const [newPassword, setNewPassword] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [snackbar, setSnackbar] = React.useState({ open: false, message: '', severity: 'success' });
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const currentUser = useAppSelector((state) => state.user);
    const userInitials = currentUser
        ? `${currentUser.user.username.charAt(0).toUpperCase()}`
        : 'U';
    const handleSettingAction = (setting) => {
        switch (setting) {
            case 'Logout':
                dispatch(LogoutUser());
                navigate('/login');
                break;
            case 'Profile':
                navigate('/profile');
                break;
            case 'Update Password':
                setOpenPasswordDialog(true);
                break;
            default:
                console.warn(`No action defined for ${setting}`);
        }
    };
    const handleUpdatePassword = async () => {
        if (!oldPassword || !newPassword) {
            setSnackbar({ open: true, message: 'Please fill in both fields', severity: 'error' });
            return;
        }
        setLoading(true);
        try {
            await api.put('/api/auth/change-password', { oldPassword, newPassword });
            setSnackbar({ open: true, message: 'Password updated successfully', severity: 'success' });
            setOpenPasswordDialog(false);
            setOldPassword('');
            setNewPassword('');
        }
        catch (error) {
            const message = error?.response?.data?.message || 'Failed to update password';
            setSnackbar({ open: true, message, severity: 'error' });
        }
        finally {
            setLoading(false);
        }
    };
    const handleClosePasswordDialog = () => {
        setOpenPasswordDialog(false);
        setOldPassword('');
        setNewPassword('');
    };
    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };
    const handleOpenNavMenu = (event) => {
        setAnchorElNav(event.currentTarget);
    };
    const handleOpenUserMenu = (event) => {
        setAnchorElUser(event.currentTarget);
    };
    const handleCloseNavMenu = () => {
        setAnchorElNav(null);
    };
    const handleCloseUserMenu = () => {
        setAnchorElUser(null);
    };
    return (_jsxs(AppBar, { position: "fixed", sx: {
            padding: 1,
            zIndex: (theme) => theme.zIndex.drawer + 1,
            height: '80px'
        }, children: [_jsx(Container, { maxWidth: "xl", children: _jsxs(Toolbar, { disableGutters: true, children: [_jsx(Typography, { variant: "h6", noWrap: true, component: "a", sx: {
                                mr: 2,
                                display: { xs: 'none', md: 'flex' },
                                fontFamily: 'cursive',
                                fontWeight: 'bold',
                                fontSize: '18px',
                                letterSpacing: '.1rem',
                                color: '#fff',
                                textDecoration: 'none',
                                padding: '0 5px 0 5px',
                                zIndex: 1000,
                            }, children: appName }), _jsxs(Box, { sx: { flexGrow: 1, display: { xs: 'flex', md: 'none' } }, children: [_jsx(IconButton, { size: "large", "aria-label": "account of current user", "aria-controls": "menu-appbar", "aria-haspopup": "true", onClick: handleOpenNavMenu, color: "inherit", children: _jsx(MenuIcon, {}) }), _jsx(Menu, { id: "menu-appbar", anchorEl: anchorElNav, anchorOrigin: {
                                        vertical: 'bottom',
                                        horizontal: 'left',
                                    }, keepMounted: true, transformOrigin: {
                                        vertical: 'top',
                                        horizontal: 'left',
                                    }, open: Boolean(anchorElNav), onClose: handleCloseNavMenu, sx: {
                                        display: { xs: 'block', md: 'none' },
                                    }, children: pages.map((page, index) => (_jsx(MenuItem, { onClick: () => {
                                            handleCloseNavMenu();
                                            navigate(links[index]);
                                        }, children: _jsx(Typography, { textAlign: "center", children: page }) }, page))) })] }), _jsx(AppLauncher, { applications: applications(currentUser), appLauncherUrl: '' }), _jsx(Box, { sx: { flexGrow: 1, display: 'flex' }, children: pages.map((page, index) => (_jsx(Button, { onClick: () => navigate(links[index]), sx: { my: 2, color: 'white', display: 'block' }, children: page }, page))) }), _jsxs(Box, { sx: { flexGrow: 0 }, children: [_jsx(Tooltip, { title: currentUser ? `${currentUser.user.username}` : 'User', children: _jsx(IconButton, { onClick: handleOpenUserMenu, sx: { p: 0 }, children: _jsx(Avatar, { sx: {
                                                color: 'white',
                                                fontWeight: 'bold',
                                                width: 40,
                                                height: 40,
                                            }, children: userInitials }) }) }), _jsx(Menu, { sx: { mt: '45px' }, id: "menu-appbar-user", anchorEl: anchorElUser, anchorOrigin: {
                                        vertical: 'top',
                                        horizontal: 'right',
                                    }, keepMounted: true, transformOrigin: {
                                        vertical: 'top',
                                        horizontal: 'right',
                                    }, open: Boolean(anchorElUser), onClose: handleCloseUserMenu, children: settings.map((setting) => (_jsx(MenuItem, { onClick: () => {
                                            handleSettingAction(setting);
                                            handleCloseUserMenu();
                                        }, children: _jsx(Typography, { textAlign: "center", children: setting }) }, setting))) })] })] }) }), _jsxs(Dialog, { open: openPasswordDialog, onClose: handleClosePasswordDialog, maxWidth: "sm", fullWidth: true, children: [_jsx(DialogTitle, { children: "Update Password" }), _jsxs(DialogContent, { children: [_jsx(TextField, { autoFocus: true, margin: "dense", label: "Old Password", type: "password", fullWidth: true, variant: "outlined", value: oldPassword, onChange: (e) => setOldPassword(e.target.value), sx: { mb: 2 } }), _jsx(TextField, { margin: "dense", label: "New Password", type: "password", fullWidth: true, variant: "outlined", value: newPassword, onChange: (e) => setNewPassword(e.target.value) })] }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: handleClosePasswordDialog, disabled: loading, children: "Cancel" }), _jsx(Button, { onClick: handleUpdatePassword, variant: "contained", disabled: loading, children: loading ? 'Updating...' : 'Update' })] })] }), _jsx(Snackbar, { open: snackbar.open, autoHideDuration: 4000, onClose: handleCloseSnackbar, anchorOrigin: { vertical: 'top', horizontal: 'right' }, children: _jsx(Alert, { onClose: handleCloseSnackbar, severity: snackbar.severity, sx: { width: '100%' }, children: snackbar.message }) })] }));
};
export default Header;
