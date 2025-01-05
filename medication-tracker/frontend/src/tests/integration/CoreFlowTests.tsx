import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { Dashboard } from '../../components/Dashboard/Dashboard';
import { CarerDashboard } from '../../components/Carer/CarerDashboard';
import { UserPreferences } from '../../components/Settings/UserPreferences';
import { NotificationContext } from '../../contexts/NotificationContext';
import { AuthContext } from '../../contexts/AuthContext';

// Mock server setup
const server = setupServer(
  // Dashboard API mocks
  rest.get('/api/v1/medications/upcoming-doses', (req, res, ctx) => {
    return res(ctx.json([
      {
        id: '1',
        medicationName: 'Test Med',
        scheduledTime: new Date().toISOString(),
        status: 'pending'
      }
    ]));
  }),

  // Carer dashboard API mocks
  rest.get('/api/v1/carer/patients', (req, res, ctx) => {
    return res(ctx.json([
      {
        id: '1',
        name: 'Test Patient',
        compliance: 85,
        status: 'normal'
      }
    ]));
  }),

  // User preferences API mocks
  rest.get('/api/v1/preferences/notifications', (req, res, ctx) => {
    return res(ctx.json({
      email: true,
      push: true,
      reminderTime: 30
    }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock contexts
const mockAuthContext = {
  user: { id: '1', role: 'patient' },
  isAuthenticated: true
};

const mockNotificationContext = {
  notifications: [],
  markAsRead: jest.fn()
};

describe('Core Application Flows', () => {
  describe('Patient Dashboard Flow', () => {
    test('displays all core components and handles medication actions', async () => {
      render(
        <AuthContext.Provider value={mockAuthContext}>
          <NotificationContext.Provider value={mockNotificationContext}>
            <Dashboard />
          </NotificationContext.Provider>
        </AuthContext.Provider>
      );

      // Verify core components are rendered
      await waitFor(() => {
        expect(screen.getByTestId('user-stats')).toBeInTheDocument();
        expect(screen.getByTestId('compliance-chart')).toBeInTheDocument();
        expect(screen.getByTestId('upcoming-doses')).toBeInTheDocument();
        expect(screen.getByTestId('notification-center')).toBeInTheDocument();
      });

      // Test medication interaction
      const takeDoseButton = screen.getByTestId('take-dose-button');
      fireEvent.click(takeDoseButton);
      
      await waitFor(() => {
        expect(screen.getByText('Dose recorded successfully')).toBeInTheDocument();
      });
    });

    test('updates compliance chart when new dose is recorded', async () => {
      render(
        <AuthContext.Provider value={mockAuthContext}>
          <NotificationContext.Provider value={mockNotificationContext}>
            <Dashboard />
          </NotificationContext.Provider>
        </AuthContext.Provider>
      );

      // Record a dose
      const takeDoseButton = screen.getByTestId('take-dose-button');
      fireEvent.click(takeDoseButton);

      // Verify compliance update
      await waitFor(() => {
        const complianceElement = screen.getByTestId('compliance-percentage');
        expect(complianceElement).toHaveTextContent('85%');
      });
    });
  });

  describe('Carer Dashboard Flow', () => {
    test('displays patient list and handles patient interactions', async () => {
      const mockCarerContext = {
        ...mockAuthContext,
        user: { id: '1', role: 'carer' }
      };

      render(
        <AuthContext.Provider value={mockCarerContext}>
          <NotificationContext.Provider value={mockNotificationContext}>
            <CarerDashboard />
          </NotificationContext.Provider>
        </AuthContext.Provider>
      );

      // Verify patient list is displayed
      await waitFor(() => {
        expect(screen.getByText('Test Patient')).toBeInTheDocument();
      });

      // Test patient interaction
      const contactButton = screen.getByTestId('contact-patient-button');
      fireEvent.click(contactButton);
      
      await waitFor(() => {
        expect(screen.getByText('Message sent to patient')).toBeInTheDocument();
      });
    });
  });

  describe('User Preferences Flow', () => {
    test('loads and saves user preferences', async () => {
      render(
        <AuthContext.Provider value={mockAuthContext}>
          <UserPreferences />
        </AuthContext.Provider>
      );

      // Verify preferences are loaded
      await waitFor(() => {
        expect(screen.getByTestId('email-notification-switch')).toBeChecked();
      });

      // Test preference update
      const reminderSelect = screen.getByTestId('reminder-time-select');
      fireEvent.change(reminderSelect, { target: { value: 60 } });

      const saveButton = screen.getByText('Save Preferences');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Preferences saved successfully')).toBeInTheDocument();
      });
    });
  });

  describe('Notification Flow', () => {
    test('handles real-time notifications across components', async () => {
      render(
        <AuthContext.Provider value={mockAuthContext}>
          <NotificationContext.Provider value={mockNotificationContext}>
            <Dashboard />
          </NotificationContext.Provider>
        </AuthContext.Provider>
      );

      // Simulate incoming notification
      server.use(
        rest.get('/api/v1/notifications', (req, res, ctx) => {
          return res(ctx.json([
            {
              id: '1',
              type: 'medication_due',
              message: 'Time to take your medication'
            }
          ]));
        })
      );

      // Verify notification display
      await waitFor(() => {
        expect(screen.getByText('Time to take your medication')).toBeInTheDocument();
      });

      // Test notification interaction
      const notificationButton = screen.getByTestId('notification-action-button');
      fireEvent.click(notificationButton);

      await waitFor(() => {
        expect(mockNotificationContext.markAsRead).toHaveBeenCalledWith('1');
      });
    });
  });
});
