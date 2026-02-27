import { configureStore } from '@reduxjs/toolkit';
import userReducer from './slices/userSlice';
import cartReducer from './slices/cartSlice';
import orderReducer from './slices/orderSlice';
import homeReducer from './slices/homeSlice';
import languageReducer from './slices/languageSlice'; // Import the language slice

export const store = configureStore({
  reducer: {
    user: userReducer,
    cart: cartReducer,
    orders: orderReducer,
    home: homeReducer,
    language: languageReducer, // Add language reducer
  },
});

// Infer types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;