// store.ts
import { configureStore } from '@reduxjs/toolkit';
import userReducer from './user/userReducer';
import confirmationReducer from './confirmation/confirmationReducer';
export const store = configureStore({
    reducer: {
        user: userReducer,
        confirmation: confirmationReducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({
        serializableCheck: false,
    }),
});
