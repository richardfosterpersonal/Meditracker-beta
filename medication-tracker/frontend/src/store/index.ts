import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import medicationReducer from './medication/slice';
import authReducer from './auth/slice';
import notificationReducer from './notification/slice';
import familyReducer from './family/slice';
import { validationMiddleware } from './middleware/validation';
import { syncMiddleware } from './middleware/sync';
import { errorMiddleware } from './middleware/error';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    medications: medicationReducer,
    notifications: notificationReducer,
    family: familyReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(validationMiddleware)
      .concat(syncMiddleware)
      .concat(errorMiddleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
