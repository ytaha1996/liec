import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { IUserStore } from './types'
import { clearUserToken, decodeRoleFromToken, getUserToken, setUserToken } from '../../helpers/user-token'

// Read the token + role synchronously at module load. Without this, the
// avatar momentarily shows the empty/default role on a fresh tab open
// because the role-decode previously happened in a useEffect (one render
// after the first paint).
const _initialToken = getUserToken() ?? '';
const _initialRole = _initialToken ? (decodeRoleFromToken(_initialToken) ?? '') : '';

const initialState: IUserStore = {
    token: _initialToken,
    user: {
        email: "",
        active: false,
        username: "",
        mobileNumber: "",
    },
    active: false,
    role: _initialRole,
    isAuthenticated: !!_initialToken,
}

export const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        LoginUser: (state, action: PayloadAction<IUserStore>) => {
            setUserToken(action.payload.token);
            state = action.payload;
            state.isAuthenticated = true;
            return state;
        },
        LoadUserSuccess: (state, action: PayloadAction<IUserStore>) => {
            action.payload.token = getUserToken() || '';
            state = action.payload;
            state.isAuthenticated = true;
            return state;
        },
        LogoutUser: () => {
            clearUserToken();
            return initialState;
        },
    },
})

// Action creators are generated for each case reducer function
export const { LoginUser, LoadUserSuccess, LogoutUser } = userSlice.actions

export default userSlice.reducer;
