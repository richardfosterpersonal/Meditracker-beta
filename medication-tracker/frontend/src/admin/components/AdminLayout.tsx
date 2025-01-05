/**
 * Admin Layout Component
 * Last Updated: 2024-12-25T20:45:12+01:00
 * Status: INTERNAL
 * Reference: ../../../docs/validation/decisions/VALIDATION_VISIBILITY.md
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import '../styles/admin.css';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();

  // Critical Path: Access Control
  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return (
    <div className="admin-layout">
      <header className="admin-header">
        <h1>Medication Tracker Admin</h1>
        <div className="environment-badge">
          {process.env.NODE_ENV === 'development' ? 'Development' : 'Staging'}
        </div>
      </header>

      <nav className="admin-nav">
        <ul>
          <li>
            <a href="/admin/validation">System Validation</a>
          </li>
          <li>
            <a href="/admin/logs">System Logs</a>
          </li>
          <li>
            <a href="/admin/health">System Health</a>
          </li>
        </ul>
      </nav>

      <main className="admin-content">
        {process.env.NODE_ENV === 'production' ? (
          <div className="production-warning">
            Admin interface is not available in production environment.
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
};
