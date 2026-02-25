import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { LoginUser } from './redux/user/userReducer';
import { getUserToken } from './helpers/user-token';
import Loader from './components/Loader';
import BaseLayout from './layouts/BaseLayout';
import LoginPage from './pages/auth/LoginPage';
import { Protected } from './Protected';
export const Portal = () => {
    const [loaded, setLoaded] = useState(false);
    const dispatch = useDispatch();
    useEffect(() => {
        const token = getUserToken();
        if (token) {
            // Token exists - assume authenticated (backend will reject expired tokens)
            const userStore = {
                token,
                active: true,
                role: 'admin',
                isAuthenticated: true,
                user: {
                    email: 'admin',
                    active: true,
                    username: 'Admin',
                    mobileNumber: '',
                }
            };
            dispatch(LoginUser(userStore));
        }
        setLoaded(true);
    }, []);
    return loaded ? (_jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(BaseLayout, { children: _jsx(LoginPage, {}) }) }), _jsx(Route, { path: "*", element: _jsx(Protected, {}) })] })) : _jsx(Loader, { size: 75 });
};
