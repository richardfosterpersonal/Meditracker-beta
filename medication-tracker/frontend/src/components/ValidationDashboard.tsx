/**
 * Validation Status Dashboard
 * Last Updated: 2024-12-25T20:41:19+01:00
 * Status: BETA
 * Reference: ../../../docs/validation/critical_path/MASTER_CRITICAL_PATH.md
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/validation-dashboard.css';

interface ValidationStatus {
  timestamp: string;
  critical_path_version: string;
  validation_status: {
    total_files: number;
    aligned_files: number;
    outdated_files: number;
    invalid_files: number;
  };
  details: {
    aligned: string[];
    outdated: string[];
    invalid: string[];
  };
}

export const ValidationDashboard: React.FC = () => {
  const [status, setStatus] = useState<ValidationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await axios.get('/api/validation/status');
        setStatus(response.data);
        setError(null);
      } catch (err) {
        setError('Failed to load validation status');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="validation-loading">Loading validation status...</div>;
  }

  if (error) {
    return <div className="validation-error">{error}</div>;
  }

  if (!status) {
    return <div className="validation-error">No validation data available</div>;
  }

  const statusPercentage = (status.validation_status.aligned_files / status.validation_status.total_files) * 100;

  return (
    <div className="validation-dashboard">
      <h2>Validation Status Dashboard</h2>
      
      <div className="validation-summary">
        <div className="validation-header">
          <span>Critical Path Version: {status.critical_path_version}</span>
          <span>Last Updated: {new Date(status.timestamp).toLocaleString()}</span>
        </div>

        <div className="validation-progress">
          <div 
            className="progress-bar" 
            style={{ width: `${statusPercentage}%` }}
            title={`${statusPercentage.toFixed(1)}% Aligned`}
          />
        </div>

        <div className="validation-stats">
          <div className="stat-item aligned">
            <span className="stat-label">Aligned Files</span>
            <span className="stat-value">{status.validation_status.aligned_files}</span>
          </div>
          <div className="stat-item outdated">
            <span className="stat-label">Outdated Files</span>
            <span className="stat-value">{status.validation_status.outdated_files}</span>
          </div>
          <div className="stat-item invalid">
            <span className="stat-label">Invalid Files</span>
            <span className="stat-value">{status.validation_status.invalid_files}</span>
          </div>
        </div>
      </div>

      <div className="validation-details">
        {status.validation_status.outdated_files > 0 && (
          <div className="detail-section outdated">
            <h3>Outdated Files</h3>
            <ul>
              {status.details.outdated.map((file, index) => (
                <li key={index}>{file}</li>
              ))}
            </ul>
          </div>
        )}

        {status.validation_status.invalid_files > 0 && (
          <div className="detail-section invalid">
            <h3>Invalid Files</h3>
            <ul>
              {status.details.invalid.map((file, index) => (
                <li key={index}>{file}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
