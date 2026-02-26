import React, { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { IUserStore } from './redux/user/types';
import { useDispatch } from 'react-redux';
import { LoginUser } from './redux/user/userReducer';
import { getUserToken } from './helpers/user-token';
import Loader from './components/Loader';
import BaseLayout from './layouts/BaseLayout';
import LoginPage from './pages/auth/LoginPage';
import { Protected } from './Protected';

export const Portal: React.FC = () => {
  const [loaded, setLoaded] = useState<boolean>(false);
  const dispatch = useDispatch();

  useEffect(() => {
    const token = getUserToken();
    if (token) {
      // Token exists - assume authenticated (backend will reject expired tokens)
      const userStore: IUserStore = {
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

  return loaded ? (
    <Routes>
      <Route path="/login" element={<BaseLayout><LoginPage /></BaseLayout>} />
      <Route path="*" element={<Protected />} />
    </Routes>
  ) : <Loader size={75} />;
};
