import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { IUserStore } from './types';
import {
  clearUserToken,
  decodeRoleFromToken,
  getUserToken,
  setUserToken,
} from '@/helpers/user-token';

// Read the token + role synchronously at module load so a refresh on an
// authenticated tab doesn't flash the empty state before the role decodes.
const _initialToken = getUserToken() ?? '';
const _initialRole = _initialToken ? (decodeRoleFromToken(_initialToken) ?? '') : '';

const initialState: IUserStore = {
  token: _initialToken,
  user: {
    email: '',
    active: false,
    username: '',
    mobileNumber: '',
  },
  active: false,
  role: _initialRole,
  isAuthenticated: !!_initialToken,
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    LoginUser: (_state, action: PayloadAction<IUserStore>) => {
      setUserToken(action.payload.token);
      return { ...action.payload, isAuthenticated: true };
    },
    LoadUserSuccess: (_state, action: PayloadAction<IUserStore>) => {
      return {
        ...action.payload,
        token: getUserToken() || '',
        isAuthenticated: true,
      };
    },
    LogoutUser: () => {
      clearUserToken();
      return {
        token: '',
        user: { email: '', active: false, username: '', mobileNumber: '' },
        active: false,
        role: '',
        isAuthenticated: false,
      };
    },
  },
});

export const { LoginUser, LoadUserSuccess, LogoutUser } = userSlice.actions;

export default userSlice.reducer;
