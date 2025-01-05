import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { withPerformanceTracking } from './utils/withPerformanceTracking';
import LoadingFallback from './components/common/LoadingFallback';
import OfflineBanner from './components/common/OfflineBanner';
import { backgroundSync } from './utils/backgroundSync';
import { notificationService } from './utils/notifications';
import InstallPrompt from './components/common/InstallPrompt';
import SecurityDashboard from './components/analytics/SecurityDashboard';
import ComplianceReport from './components/reports/ComplianceReport';
import BackupManager from './components/admin/BackupManager';
import { monitoring } from './utils/monitoring';
import { performanceMonitoring } from './utils/performanceMonitoring';
import { ChakraProvider } from '@chakra-ui/react';

// Lazy load components
const Layout = lazy(() => import('./components/common/Layout'));
const MedicationsPage = lazy(() => import('./components/Medication/MedicationsPage'));
const Login = lazy(() => import('./components/Auth/Login'));
const Register = lazy(() => import('./components/Auth/Register'));
const AddMedication = lazy(() => import('./components/AddMedication/AddMedication'));
const EditMedication = lazy(() => import('./components/EditMedication/EditMedication'));
const FamilyDashboard = lazy(() => import('./components/Family/FamilyDashboard'));
const Profile = lazy(() => import('./components/Profile'));
const AdminDashboard = lazy(() => import('./components/Admin/AdminDashboard'));
const MedicationHistory = lazy(() => import('./components/Medication/MedicationHistory'));
const NotificationCenter = lazy(() => import('./components/Notification/NotificationCenter'));

// Wrap key components with performance tracking
const TrackedMedicationsPage = withPerformanceTracking(MedicationsPage, 'MedicationsPage');
const TrackedLayout = withPerformanceTracking(Layout, 'Layout');
const TrackedLogin = withPerformanceTracking(Login, 'Login');
const TrackedRegister = withPerformanceTracking(Register, 'Register');

// Initialize monitoring
monitoring.initialize(
  process.env.REACT_APP_SENTRY_DSN || '',
  process.env.NODE_ENV
);

const App: React.FC = () => {
  useEffect(() => {
    // Initialize background sync
    backgroundSync.initialize();

    // Initialize notifications
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        notificationService.initialize(registration);
      });
    }

    // Set up error boundary error handler
    const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
      monitoring.captureError(error, {
        component: 'ErrorBoundary',
        metadata: { errorInfo },
      });
    };

    // Clean up performance monitoring on unmount
    return () => {
      performanceMonitoring.cleanup();
    };
  }, []);

  return (
    <ChakraProvider theme={theme}>
      <ErrorBoundary componentName="App" handleError={handleError}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Router>
            <Suspense fallback={<LoadingFallback message="Loading application..." />}>
              <Routes>
                <Route 
                  path="/login" 
                  element={
                    <ErrorBoundary componentName="Login">
                      <Suspense fallback={<LoadingFallback message="Loading login..." />}>
                        <TrackedLogin />
                      </Suspense>
                    </ErrorBoundary>
                  } 
                />
                <Route 
                  path="/register" 
                  element={
                    <ErrorBoundary componentName="Register">
                      <Suspense fallback={<LoadingFallback message="Loading registration..." />}>
                        <TrackedRegister />
                      </Suspense>
                    </ErrorBoundary>
                  } 
                />
                <Route 
                  path="/" 
                  element={
                    <ErrorBoundary componentName="Layout">
                      <Suspense fallback={<LoadingFallback message="Loading layout..." />}>
                        <TrackedLayout />
                      </Suspense>
                    </ErrorBoundary>
                  }
                >
                  <Route 
                    path="medications" 
                    element={
                      <ErrorBoundary componentName="MedicationsPage">
                        <Suspense fallback={<LoadingFallback message="Loading medications..." />}>
                          <TrackedMedicationsPage />
                        </Suspense>
                      </ErrorBoundary>
                    } 
                  />
                  <Route index element={<Navigate to="/medications" replace />} />
                </Route>
                <Route 
                  path="/analytics/security" 
                  element={
                    <ProtectedRoute>
                      <SecurityDashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/reports/compliance" 
                  element={
                    <ProtectedRoute>
                      <ComplianceReport userId={user.id} />
                    </ProtectedRoute>
                  } 
                />
                <Route
                  path="/admin/backups"
                  element={
                    <ProtectedRoute>
                      <BackupManager userId={user.id} />
                    </ProtectedRoute>
                  }
                />
                <Route 
                  path="/family"
                  element={
                    <ProtectedRoute>
                      <ErrorBoundary componentName="FamilyDashboard">
                        <Suspense fallback={<LoadingFallback message="Loading family dashboard..." />}>
                          <FamilyDashboard />
                        </Suspense>
                      </ErrorBoundary>
                    </ProtectedRoute>
                  }
                />
                <Route 
                  path="/notifications"
                  element={
                    <ProtectedRoute>
                      <ErrorBoundary componentName="NotificationCenter">
                        <Suspense fallback={<LoadingFallback message="Loading notifications..." />}>
                          <NotificationCenter />
                        </Suspense>
                      </ErrorBoundary>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Suspense>
            <OfflineBanner />
            <InstallPrompt />
          </Router>
        </ThemeProvider>
      </ErrorBoundary>
    </ChakraProvider>
  );
}

// Wrap the App component itself with performance tracking
export default withPerformanceTracking(App, 'App');
