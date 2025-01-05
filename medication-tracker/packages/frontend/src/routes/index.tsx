import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import Dashboard from '../components/Dashboard';
import HouseholdManager from '../components/Family/HouseholdManager';
import CarerDashboard from '../components/Carer/CarerDashboard';
import Login from '../components/Auth/Login';
import NotFound from '../components/NotFound';
import Unauthorized from '../components/Auth/Unauthorized';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      
      {/* Individual User Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute allowedTypes={['individual']}>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Family Manager Routes */}
      <Route
        path="/household"
        element={
          <ProtectedRoute allowedTypes={['family_manager']}>
            <HouseholdManager />
          </ProtectedRoute>
        }
      />

      {/* Carer Routes */}
      <Route
        path="/carer"
        element={
          <ProtectedRoute allowedTypes={['carer']}>
            <CarerDashboard />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};
