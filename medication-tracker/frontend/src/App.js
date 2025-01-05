import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Provider as ReduxProvider } from 'react-redux';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

// Theme
import { theme } from './styles/theme';

// Providers
import { AuthProvider } from './contexts/AuthContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { MedicationProvider } from './contexts/MedicationContext';
import { ProfileProvider } from './contexts/ProfileContext';
import { FamilyMemberProvider } from './contexts/FamilyMemberContext';

// Layout
import Layout from './components/Layout';

// Routes
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import Medications from './components/Medications';
import FamilyMembers from './components/FamilyMembers';
import Profile from './components/Profile';
import AdminDashboard from './components/AdminDashboard';
import MedicationHistory from './components/MedicationHistory';
import NotificationManager from './components/Notification/NotificationManager';
import Reports from './components/Reports';
import Test from './components/Test';

// Store
import { store } from './store';

const App: React.FC = () => {
  return (
    <ReduxProvider store={store}>
      <ErrorBoundary>
        <AuthProvider>
          <MedicationProvider>
            <ThemeProvider theme={theme}>
              <CssBaseline />
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <ProfileProvider>
                  <FamilyMemberProvider>
                    <Routes>
                      <Route path="/login" element={<Login />} />
                      <Route path="/register" element={<Register />} />
                      <Route path="/test" element={<Test />} />
                      <Route path="/" element={
                        <ProtectedRoute>
                          <Layout />
                        </ProtectedRoute>
                      }>
                        <Route index element={<Dashboard />} />
                        <Route path="dashboard" element={<Dashboard />} />
                        <Route path="medications" element={<Medications />} />
                        <Route path="reports" element={
                          <ProtectedRoute>
                            <Reports />
                          </ProtectedRoute>
                        } />
                        <Route path="family-members" element={<FamilyMembers />} />
                        <Route path="profile" element={<Profile />} />
                        <Route path="admin" element={
                          <ProtectedRoute adminOnly>
                            <AdminDashboard />
                          </ProtectedRoute>
                        } />
                        <Route path="history" element={
                          <ProtectedRoute>
                            <MedicationHistory />
                          </ProtectedRoute>
                        } />
                        <Route path="notifications" element={
                          <ProtectedRoute>
                            <NotificationManager />
                          </ProtectedRoute>
                        } />
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Route>
                    </Routes>
                  </FamilyMemberProvider>
                </ProfileProvider>
              </LocalizationProvider>
            </ThemeProvider>
          </MedicationProvider>
        </AuthProvider>
      </ErrorBoundary>
    </ReduxProvider>
  );
};

export default App;