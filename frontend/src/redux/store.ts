// store.ts
import { configureStore } from '@reduxjs/toolkit';
import userReducer from './user/userReducer';
import confirmationReducer from './confirmation/confirmationReducer';

export const store = configureStore({
  reducer: {
    user: userReducer,
    confirmation: confirmationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
