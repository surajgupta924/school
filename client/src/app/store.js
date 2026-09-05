import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { api } from './api';
import authReducer from '../features/auth/authSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefault) => getDefault({ serializableCheck: false }).concat(api.middleware),
  devTools: import.meta.env.DEV,
});

setupListeners(store.dispatch);
