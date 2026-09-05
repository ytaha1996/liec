import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { IConfirmation } from './types';

const initialState: IConfirmation = {
  open: false,
  title: '',
  message: '',
  onSubmit: () => {},
};

export const confirmationSlice = createSlice({
  name: 'confirmation',
  initialState,
  reducers: {
    OpenConfirmation: (_state, action: PayloadAction<Omit<IConfirmation, 'open'>>) => ({
      ...action.payload,
      open: true,
    }),
    CloseConfirmation: () => initialState,
  },
});

export const { OpenConfirmation, CloseConfirmation } = confirmationSlice.actions;

export default confirmationSlice.reducer;
