import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { Box, Button, Card, CardContent, CircularProgress, TextField, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { postJson, parseApiError } from '../../api/client';
import { LoginUser } from '../../redux/user/userReducer';
import { useAppDispatch } from '../../redux/hooks';
const LoginPage = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const [email, setEmail] = useState('admin@local');
    const [password, setPassword] = useState('Admin123!');
    const login = useMutation({
        mutationFn: () => postJson('/api/auth/login', { email, password }),
        onSuccess: (r) => {
            localStorage.setItem('token', r.token);
            dispatch(LoginUser({
                token: r.token,
                active: r.active ?? true,
                role: r.role ?? '',
                isAuthenticated: true,
                user: r.user ?? { email, active: true, username: email, mobileNumber: '' },
            }));
            toast.success('Logged in successfully');
            navigate('/');
        },
        onError: (e) => {
            toast.error(parseApiError(e).message ?? 'Login failed');
        },
    });
    return (_jsx(Box, { sx: {
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f4f6f8',
        }, children: _jsx(Card, { sx: { maxWidth: 440, width: '100%', borderRadius: 2, boxShadow: 4 }, children: _jsxs(CardContent, { sx: { p: 4 }, children: [_jsx(Typography, { variant: "h4", component: "h1", gutterBottom: true, sx: { fontWeight: 700, color: '#00A6A6', mb: 3 }, children: "Admin Login" }), _jsxs(Box, { component: "form", noValidate: true, sx: { display: 'flex', flexDirection: 'column', gap: 2 }, children: [_jsx(TextField, { label: "Email", type: "email", value: email, onChange: (e) => setEmail(e.target.value), fullWidth: true, disabled: login.isPending }), _jsx(TextField, { label: "Password", type: "password", value: password, onChange: (e) => setPassword(e.target.value), fullWidth: true, disabled: login.isPending, onKeyDown: (e) => { if (e.key === 'Enter')
                                    login.mutate(); } }), _jsx(Button, { variant: "contained", color: "primary", size: "large", onClick: () => login.mutate(), disabled: login.isPending, fullWidth: true, sx: { mt: 1, py: 1.5 }, children: login.isPending ? _jsx(CircularProgress, { size: 22, color: "inherit" }) : 'Login' })] })] }) }) }));
};
export default LoginPage;
