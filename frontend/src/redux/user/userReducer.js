import { createSlice } from '@reduxjs/toolkit';
import { clearUserToken, getUserToken, setUserToken } from '../../helpers/user-token';
const initialState = {
    token: '',
    user: {
        email: "",
        active: false,
        username: "",
        mobileNumber: "",
    },
    active: false,
    role: "",
    isAuthenticated: false,
};
export const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        LoginUser: (state, action) => {
            setUserToken(action.payload.token);
            state = action.payload;
            state.isAuthenticated = true;
            return state;
        },
        LoadUserSuccess: (state, action) => {
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
});
// Action creators are generated for each case reducer function
export const { LoginUser, LoadUserSuccess, LogoutUser } = userSlice.actions;
export default userSlice.reducer;
