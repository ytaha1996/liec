import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { IConfirmation } from './types'

const initialState: IConfirmation = {
    open: false,
    title: '',
    message: '',
    onSubmit: () => {}
}

export const confirmationSlice = createSlice({
    name: 'confirmation',
    initialState,
    reducers: {
        OpenConfirmation: (state, action: PayloadAction<IConfirmation>) => {
            state = action.payload
            state.open = true;
            return state;
        },
        CloseConfirmation: (state) => {
            state = initialState;
            return state;
        }
    },
})

// Action creators are generated for each case reducer function
export const { OpenConfirmation, CloseConfirmation } = confirmationSlice.actions

export default confirmationSlice.reducer;
