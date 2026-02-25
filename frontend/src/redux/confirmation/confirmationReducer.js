import { createSlice } from '@reduxjs/toolkit';
const initialState = {
    open: false,
    title: '',
    message: '',
    onSubmit: () => { }
};
export const confirmationSlice = createSlice({
    name: 'confirmation',
    initialState,
    reducers: {
        OpenConfirmation: (state, action) => {
            state = action.payload;
            state.open = true;
            return state;
        },
        CloseConfirmation: (state) => {
            state = initialState;
            return state;
        }
    },
});
// Action creators are generated for each case reducer function
export const { OpenConfirmation, CloseConfirmation } = confirmationSlice.actions;
export default confirmationSlice.reducer;
