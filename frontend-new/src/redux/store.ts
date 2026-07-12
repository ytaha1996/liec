import { configureStore } from '@reduxjs/toolkit';
import userReducer from './user/userReducer';
import confirmationReducer from './confirmation/confirmationReducer';

export const store = configureStore({
  reducer: {
    user: userReducer,
    confirmation: confirmationReducer,
  },
  // `confirmation.onSubmit` is a function ref — turning serializable check off
  // is the same trick the original `frontend/` uses to allow function refs in
  // confirmation payloads.
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
