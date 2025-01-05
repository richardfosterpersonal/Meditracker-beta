/**
 * Redux Store Configuration
 * Last Updated: 2025-01-03T22:35:35+01:00
 */

import { configureStore } from '@reduxjs/toolkit';
import notificationReducer from './notification/slice';

export const store = configureStore({
  reducer: {
    notification: notificationReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
