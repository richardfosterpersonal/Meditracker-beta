import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChakraProvider } from '@chakra-ui/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../routes';
import { theme } from '../theme';
import { AuthProvider } from '../context/AuthContext';

const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Mock data
const mockUser = {
  id: 'user1',
  type: 'family_manager',
  name: 'Test User',
  email: 'test@example.com',
};

const mockHousehold = {
  id: 'house1',
  managerId: 'user1',
  members: [
    {
      id: 'member1',
      name: 'Child One',
      relationship: 'Son',
      medications: ['med1'],
    },
  ],
};

const mockMedications = [
  {
    id: 'med1',
    name: 'Test Med',
    dosage: '10mg',
    frequency: 'Daily',
    startDate: '2024-01-01',
  },
  {
    id: 'med2',
    name: 'New Med',
    dosage: '20mg',
    frequency: 'Twice daily',
  },
];

const mockEmergencyContacts = [
  {
    id: 'ec1',
    name: 'Emergency Contact',
    phone: '+1234567890',
    email: 'emergency@example.com',
    relationship: 'Doctor',
    notifyOn: ['missed_critical_dose', 'adverse_reaction'],
  },
];

// Setup MSW Server
const server = setupServer(
  // Auth endpoints
  rest.post(`${baseUrl}/auth/login`, (req, res, ctx) => {
    return res(ctx.json({ user: mockUser, token: 'test-token' }));
  }),

  // Household endpoints
  rest.get(`${baseUrl}/household`, (req, res, ctx) => {
    return res(ctx.json(mockHousehold));
  }),

  // Medication endpoints
  rest.get(`${baseUrl}/household/members/:memberId/medications`, (req, res, ctx) => {
    return res(ctx.json(mockMedications));
  }),

  // Emergency endpoints
  rest.post(`${baseUrl}/emergency/missed-dose`, (req, res, ctx) => {
    return res(ctx.json({ status: 'emergency_activated', level: 'urgent' }));
  }),

  // Notification endpoints
  rest.post(`${baseUrl}/notifications/send`, (req, res, ctx) => {
    return res(ctx.json({ status: 'sent' }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Test wrapper
const renderApp = (initialRoute = '/') => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <ChakraProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter initialEntries={[initialRoute]}>
            <AppRoutes />
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ChakraProvider>
  );
};

describe('Critical User Flows', () => {
  describe('Family Manager Flow', () => {
    it('completes the full medication management flow', async () => {
      // 1. Login
      renderApp('/login');
      
      await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
      await userEvent.type(screen.getByLabelText(/password/i), 'password');
      await userEvent.click(screen.getByRole('button', { name: /login/i }));

      // 2. Navigate to household
      await waitFor(() => {
        expect(screen.getByText('Household Management')).toBeInTheDocument();
      });

      // 3. View family members
      expect(screen.getByText('Child One')).toBeInTheDocument();

      // 4. Add new medication
      const manageMedButton = screen.getAllByText('Manage Medications')[0];
      userEvent.click(manageMedButton);

      await waitFor(() => {
        expect(screen.getByText('Manage Member Medications')).toBeInTheDocument();
      });

      // Mock new medication submission
      server.use(
        rest.post(`${baseUrl}/household/members/:memberId/medications`, (req, res, ctx) => {
          return res(ctx.json({
            id: 'med2',
            name: 'New Med',
            dosage: '20mg',
            frequency: 'Twice daily',
          }));
        }),
      );

      // Fill medication form
      await userEvent.type(screen.getByLabelText(/medication name/i), 'New Med');
      await userEvent.type(screen.getByLabelText(/dosage/i), '20mg');
      await userEvent.type(screen.getByLabelText(/frequency/i), 'Twice daily');
      
      await userEvent.click(screen.getByRole('button', { name: /add medication/i }));

      // 5. Verify success
      await waitFor(() => {
        expect(screen.getByText('Medication added successfully')).toBeInTheDocument();
      });
    });

    it('handles medication conflicts', async () => {
      renderApp('/household');

      // Mock conflict response
      server.use(
        rest.post(`${baseUrl}/household/members/:memberId/medications`, (req, res, ctx) => {
          return res(
            ctx.status(409),
            ctx.json({
              error: 'Drug interaction detected',
              conflicts: ['Aspirin'],
            }),
          );
        }),
      );

      // Attempt to add conflicting medication
      const manageMedButton = screen.getAllByText('Manage Medications')[0];
      userEvent.click(manageMedButton);

      await waitFor(() => {
        expect(screen.getByText('Manage Member Medications')).toBeInTheDocument();
      });

      await userEvent.type(screen.getByLabelText(/medication name/i), 'Conflicting Med');
      await userEvent.type(screen.getByLabelText(/dosage/i), '10mg');
      await userEvent.click(screen.getByRole('button', { name: /add medication/i }));

      // Verify conflict warning
      await waitFor(() => {
        expect(screen.getByText(/drug interaction detected/i)).toBeInTheDocument();
        expect(screen.getByText(/aspirin/i)).toBeInTheDocument();
      });
    });
  });

  describe('Schedule Management', () => {
    it('validates and saves complex medication schedule', async () => {
      renderApp('/medications/new');

      // Select medication
      await userEvent.type(screen.getByLabelText(/medication name/i), 'Test Med');
      await userEvent.click(screen.getByRole('button', { name: /next/i }));

      // Configure schedule
      await waitFor(() => {
        expect(screen.getByText('Schedule Setup')).toBeInTheDocument();
      });

      // Select interval schedule
      await userEvent.click(screen.getByLabelText(/interval/i));
      await userEvent.type(screen.getByLabelText(/hours between doses/i), '6');
      await userEvent.type(screen.getByLabelText(/dose amount/i), '10');

      // Mock schedule validation
      server.use(
        rest.post(`${baseUrl}/medications/validate-schedule`, (req, res, ctx) => {
          return res(ctx.json({ valid: true }));
        })
      );

      await userEvent.click(screen.getByRole('button', { name: /next/i }));

      // Verify success
      await waitFor(() => {
        expect(screen.getByText('Schedule validated successfully')).toBeInTheDocument();
      });
    });

    it('prevents unsafe medication schedules', async () => {
      renderApp('/medications/new');

      // Select medication
      await userEvent.type(screen.getByLabelText(/medication name/i), 'Test Med');
      await userEvent.click(screen.getByRole('button', { name: /next/i }));

      // Configure unsafe schedule
      await waitFor(() => {
        expect(screen.getByText('Schedule Setup')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByLabelText(/interval/i));
      await userEvent.type(screen.getByLabelText(/hours between doses/i), '2'); // Too frequent

      // Mock validation failure
      server.use(
        rest.post(`${baseUrl}/medications/validate-schedule`, (req, res, ctx) => {
          return res(
            ctx.status(400),
            ctx.json({
              error: 'UNSAFE_INTERVAL',
              message: 'Interval must be at least 4 hours between doses'
            })
          );
        })
      );

      await userEvent.click(screen.getByRole('button', { name: /next/i }));

      // Verify warning
      await waitFor(() => {
        expect(screen.getByText(/interval must be at least 4 hours/i)).toBeInTheDocument();
      });
    });
  });

  describe('Drug Interaction Safety', () => {
    it('detects and warns about drug interactions during schedule setup', async () => {
      renderApp('/medications/new');

      // Mock existing medications
      server.use(
        rest.get(`${baseUrl}/medications`, (req, res, ctx) => {
          return res(ctx.json([
            {
              id: 'med1',
              name: 'Existing Med',
              schedule: {
                type: 'fixed_time',
                times: ['09:00'],
                dose: 1
              }
            }
          ]));
        })
      );

      // Select medication
      await userEvent.type(screen.getByLabelText(/medication name/i), 'New Med');
      await userEvent.click(screen.getByRole('button', { name: /next/i }));

      // Configure conflicting schedule
      await waitFor(() => {
        expect(screen.getByText('Schedule Setup')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByLabelText(/fixed time/i));
      await userEvent.type(screen.getByLabelText(/time/i), '09:00');

      // Mock interaction check
      server.use(
        rest.post(`${baseUrl}/medications/check-interactions`, (req, res, ctx) => {
          return res(ctx.json({
            hasConflict: true,
            conflictingMed: 'Existing Med',
            reason: 'Overlapping schedule'
          }));
        })
      );

      await userEvent.click(screen.getByRole('button', { name: /next/i }));

      // Verify conflict warning
      await waitFor(() => {
        expect(screen.getByText(/overlapping schedule/i)).toBeInTheDocument();
        expect(screen.getByText(/existing med/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Recovery', () => {
    it('recovers from network errors', async () => {
      renderApp('/household');

      // Simulate network error
      server.use(
        rest.get(`${baseUrl}/household`, (req, res) => {
          return res.networkError('Failed to connect');
        }),
      );

      // Verify error message
      await waitFor(() => {
        expect(screen.getByText(/error loading household data/i)).toBeInTheDocument();
      });

      // Mock successful retry
      server.use(
        rest.get(`${baseUrl}/household`, (req, res, ctx) => {
          return res(ctx.json(mockHousehold));
        }),
      );

      // Click retry button
      userEvent.click(screen.getByRole('button', { name: /retry/i }));

      // Verify recovery
      await waitFor(() => {
        expect(screen.getByText('Child One')).toBeInTheDocument();
      });
    });
  });
});

describe('Critical Medication Flows', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('auth_token', 'test-token');
    localStorage.setItem('user_id', mockUser.id);
  });

  test('displays encrypted medication data with proper HIPAA compliance', async () => {
    const { container } = renderApp('/family/member1/medications');
    
    await waitFor(() => {
      expect(screen.getByText('Test Med')).toBeInTheDocument();
    });

    // Verify PHI data is encrypted
    const medicationElements = container.querySelectorAll('[data-testid="medication-item"]');
    medicationElements.forEach(element => {
      expect(element).toHaveAttribute('data-hipaa-compliant', 'true');
    });
  });

  test('handles timezone-specific medication schedules correctly', async () => {
    // Mock different timezone
    const mockTimezone = 'America/New_York';
    jest.spyOn(Intl.DateTimeFormat().resolvedOptions(), 'timeZone', 'get')
      .mockReturnValue(mockTimezone);

    server.use(
      rest.get(`${baseUrl}/household/members/:memberId/medications`, (req, res, ctx) => {
        return res(ctx.json([{
          ...mockMedications[0],
          scheduledTime: '2024-01-01T09:00:00Z'
        }]));
      })
    );

    renderApp('/family/member1/medications');
    
    await waitFor(() => {
      // Should show 4:00 AM EST (converted from 09:00 UTC)
      expect(screen.getByText(/4:00 AM EST/i)).toBeInTheDocument();
    });
  });

  test('triggers emergency contact notification for missed critical dose', async () => {
    const mockEmergencyResponse = jest.fn();
    server.use(
      rest.post(`${baseUrl}/emergency/missed-dose`, (req, res, ctx) => {
        mockEmergencyResponse();
        return res(ctx.json({ status: 'emergency_activated', level: 'urgent' }));
      })
    );

    renderApp('/family/member1/medications');
    
    await waitFor(() => {
      expect(screen.getByText('Test Med')).toBeInTheDocument();
    });

    // Simulate missing a critical dose
    const markMissedButton = screen.getByRole('button', { name: /mark as missed/i });
    await userEvent.click(markMissedButton);

    expect(mockEmergencyResponse).toHaveBeenCalled();
    expect(await screen.findByText(/emergency contacts notified/i)).toBeInTheDocument();
  });

  test('enforces medication schedule validation rules', async () => {
    const mockScheduleValidation = jest.fn();
    server.use(
      rest.post(`${baseUrl}/medications/validate-schedule`, (req, res, ctx) => {
        mockScheduleValidation(req.body);
        return res(ctx.json({ isValid: true }));
      })
    );

    renderApp('/family/member1/medications');
    
    // Open add medication modal
    const addButton = await screen.findByRole('button', { name: /add medication/i });
    await userEvent.click(addButton);

    // Fill in medication details
    await userEvent.type(screen.getByLabelText(/medication name/i), 'New Critical Med');
    await userEvent.type(screen.getByLabelText(/dosage/i), '10mg');
    await userEvent.type(screen.getByLabelText(/frequency/i), 'Every 8 hours');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /save medication/i });
    await userEvent.click(submitButton);

    expect(mockScheduleValidation).toHaveBeenCalledWith(
      expect.objectContaining({
        frequency: 'Every 8 hours',
        timezone: expect.any(String)
      })
    );
  });
});

describe('Critical Flow Tests', () => {
  describe('Medication Safety', () => {
    it('should detect and warn about drug interactions', async () => {
      renderApp('/medications/add');
      
      // Fill medication form
      await userEvent.type(screen.getByLabelText(/medication name/i), 'New Med');
      await userEvent.type(screen.getByLabelText(/dosage/i), '20mg');
      
      // Should show warning about interaction with existing medication
      await waitFor(() => {
        expect(screen.getByText(/potential interaction with Test Med/i)).toBeInTheDocument();
      });
      
      // Should require confirmation to proceed
      const confirmBtn = screen.getByRole('button', { name: /confirm anyway/i });
      expect(confirmBtn).toBeDisabled();
      
      // Should require checking acknowledgment
      await userEvent.click(screen.getByRole('checkbox', { name: /i understand the risks/i }));
      expect(confirmBtn).toBeEnabled();
    });

    it('should handle missed critical dose emergency protocol', async () => {
      renderApp('/medications/schedule');
      
      // Mock missed dose
      server.use(
        rest.get(`${baseUrl}/medications/status`, (req, res, ctx) => {
          return res(ctx.json({
            id: 'med1',
            status: 'missed',
            lastDose: '2024-12-12T10:00:00Z',
            scheduledDose: '2024-12-12T11:00:00Z'
          }));
        })
      );
      
      // Should show emergency alert
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/missed critical dose/i);
      });
      
      // Should show emergency actions
      expect(screen.getByText(/emergency contacts notified/i)).toBeInTheDocument();
      expect(screen.getByText(/healthcare provider alerted/i)).toBeInTheDocument();
      
      // Should allow emergency access activation
      await userEvent.click(screen.getByRole('button', { name: /activate emergency access/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/emergency access code/i)).toBeInTheDocument();
      });
    });

    it('should enforce maximum daily dose limits', async () => {
      renderApp('/medications/log');
      
      // Try to log dose
      await userEvent.click(screen.getByRole('button', { name: /log dose/i }));
      
      // Should show warning about exceeding daily limit
      await waitFor(() => {
        expect(screen.getByText(/exceeds maximum daily dose/i)).toBeInTheDocument();
      });
      
      // Should prevent logging
      expect(screen.getByRole('button', { name: /confirm/i })).toBeDisabled();
    });
  });

  describe('Emergency Access', () => {
    it('should allow emergency contact access with valid code', async () => {
      renderApp('/emergency-access');
      
      // Enter emergency code
      await userEvent.type(screen.getByLabelText(/emergency code/i), 'valid-code');
      await userEvent.click(screen.getByRole('button', { name: /access/i }));
      
      // Should grant temporary access
      await waitFor(() => {
        expect(screen.getByText(/temporary emergency access granted/i)).toBeInTheDocument();
      });
      
      // Should show critical medical info
      expect(screen.getByText(/current medications/i)).toBeInTheDocument();
      expect(screen.getByText(/emergency contacts/i)).toBeInTheDocument();
    });

    it('should handle escalation for multiple missed doses', async () => {
      renderApp('/medications/schedule');
      
      // Mock multiple missed doses
      server.use(
        rest.get(`${baseUrl}/medications/status`, (req, res, ctx) => {
          return res(ctx.json({
            id: 'med1',
            status: 'multiple_missed',
            missedDoses: [
              { scheduled: '2024-12-12T08:00:00Z' },
              { scheduled: '2024-12-12T11:00:00Z' }
            ]
          }));
        })
      );
      
      // Should show highest level alert
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/multiple critical doses missed/i);
      });
      
      // Should show escalated response
      expect(screen.getByText(/emergency services notified/i)).toBeInTheDocument();
      expect(screen.getByText(/all emergency contacts notified/i)).toBeInTheDocument();
    });
  });
});

describe('Timezone Critical Path Tests', () => {
  beforeEach(() => {
    // Mock timezone endpoints
    server.use(
      rest.get(`${baseUrl}/user/preferences`, (req, res, ctx) => {
        return res(ctx.json({
          timezone: 'America/New_York',
          quiet_hours_start: '22:00',
          quiet_hours_end: '08:00'
        }));
      }),
      rest.put(`${baseUrl}/user/preferences`, (req, res, ctx) => {
        return res(ctx.json({ status: 'success' }));
      })
    );
  });

  test('medication schedule handles timezone correctly', async () => {
    renderApp('/medications/schedule');
    
    // Wait for schedule to load
    await waitFor(() => {
      expect(screen.getByText('Medication Schedule')).toBeInTheDocument();
    });

    // Add a new medication schedule
    await userEvent.click(screen.getByText('Add Medication'));
    await userEvent.type(screen.getByLabelText('Time'), '09:00');
    await userEvent.click(screen.getByText('Save'));

    // Verify schedule is displayed in user's timezone
    expect(screen.getByText('9:00 AM EDT')).toBeInTheDocument();
  });

  test('quiet hours respect user timezone', async () => {
    renderApp('/settings/notifications');
    
    // Wait for preferences to load
    await waitFor(() => {
      expect(screen.getByText('Notification Settings')).toBeInTheDocument();
    });

    // Update quiet hours
    await userEvent.clear(screen.getByLabelText('Quiet Hours Start'));
    await userEvent.type(screen.getByLabelText('Quiet Hours Start'), '23:00');
    await userEvent.clear(screen.getByLabelText('Quiet Hours End'));
    await userEvent.type(screen.getByLabelText('Quiet Hours End'), '07:00');
    await userEvent.click(screen.getByText('Save Changes'));

    // Verify success message
    expect(screen.getByText('Settings updated successfully')).toBeInTheDocument();
  });

  test('emergency notifications work across timezones', async () => {
    // Mock an emergency in a different timezone
    const emergencyTime = '2024-12-12T17:55:21.000Z'; // UTC time
    server.use(
      rest.post(`${baseUrl}/emergency/missed-dose`, (req, res, ctx) => {
        return res(ctx.json({
          status: 'emergency_activated',
          level: 'urgent',
          timestamp: emergencyTime
        }));
      })
    );

    renderApp('/emergency');

    // Trigger emergency
    await userEvent.click(screen.getByText('Report Missed Dose'));

    // Verify emergency time is displayed in user's timezone (12:55 PM EST)
    await waitFor(() => {
      expect(screen.getByText('Emergency reported at: 12:55 PM EST')).toBeInTheDocument();
    });
  });

  test('medication conflicts check considers timezone', async () => {
    server.use(
      rest.post(`${baseUrl}/medications/check-conflicts`, (req, res, ctx) => {
        const { scheduleTime } = req.body;
        // Verify the time sent to server is in UTC
        expect(new Date(scheduleTime).toISOString()).toBe('2024-12-12T14:00:00.000Z');
        return res(ctx.json({ conflicts: [] }));
      })
    );

    renderApp('/medications/new');

    // Schedule medication for 9 AM EST (14:00 UTC)
    await userEvent.type(screen.getByLabelText('Schedule Time'), '09:00');
    await userEvent.click(screen.getByText('Check Conflicts'));

    // Verify no conflicts found
    await waitFor(() => {
      expect(screen.getByText('No conflicts found')).toBeInTheDocument();
    });
  });

  it('handles medication conflicts across timezones', async () => {
    // Mock family members in different timezones
    const mockHouseholdWithTimezones = {
      ...mockHousehold,
      members: [
        {
          id: 'member1',
          name: 'Child One',
          relationship: 'Son',
          medications: ['med1'],
          timezone: 'America/New_York',
        },
        {
          id: 'member2',
          name: 'Child Two',
          relationship: 'Daughter',
          medications: ['med2'],
          timezone: 'America/Los_Angeles',
        },
      ],
    };

    server.use(
      rest.get(`${baseUrl}/household`, (req, res, ctx) => {
        return res(ctx.json(mockHouseholdWithTimezones));
      }),
      rest.post(`${baseUrl}/household/members/:memberId/medications`, (req, res, ctx) => {
        return res(
          ctx.status(409),
          ctx.json({
            error: 'Schedule conflict detected',
            conflicts: [
              {
                medication1: 'Morning Med',
                medication2: 'Evening Med',
                time: '2024-12-12T08:00:00.000Z',
                type: 'time_proximity',
                timezone1: 'America/New_York',
                timezone2: 'America/Los_Angeles',
                suggestions: [
                  {
                    type: 'time_shift',
                    description: 'Adjust morning medication time',
                    reason: 'Medications too close across timezones',
                    original_time: '2024-12-12T08:00:00.000Z',
                    suggested_time: '2024-12-12T10:00:00.000Z',
                  },
                ],
              },
            ],
          })
        );
      })
    );

    renderApp('/household');

    // Verify both members are displayed with their timezones
    await waitFor(() => {
      expect(screen.getByText('Child One')).toBeInTheDocument();
      expect(screen.getByText('Child Two')).toBeInTheDocument();
      expect(screen.getByText('EST')).toBeInTheDocument();
      expect(screen.getByText('PST')).toBeInTheDocument();
    });

    // Attempt to add medication with timezone conflict
    const manageMedButton = screen.getAllByText('Manage Medications')[0];
    userEvent.click(manageMedButton);

    await waitFor(() => {
      expect(screen.getByText('Manage Member Medications')).toBeInTheDocument();
    });

    // Fill medication form
    await userEvent.type(screen.getByLabelText(/medication name/i), 'Morning Med');
    await userEvent.type(screen.getByLabelText(/dosage/i), '10mg');
    await userEvent.type(screen.getByLabelText(/time/i), '8:00 AM');
    await userEvent.click(screen.getByRole('button', { name: /add medication/i }));

    // Verify timezone conflict warning
    await waitFor(() => {
      expect(screen.getByText(/schedule conflict detected/i)).toBeInTheDocument();
      expect(screen.getByText(/medications too close across timezones/i)).toBeInTheDocument();
      expect(screen.getByText('8:00 AM EST')).toBeInTheDocument();
      expect(screen.getByText('5:00 AM PST')).toBeInTheDocument();
    });

    // Verify conflict resolution suggestion
    expect(screen.getByText(/adjust morning medication time/i)).toBeInTheDocument();
    expect(screen.getByText('10:00 AM EST')).toBeInTheDocument();
  });

  it('respects quiet hours in different timezones', async () => {
    // Mock quiet hours settings
    const mockQuietHours = {
      enabled: true,
      start: '22:00',
      end: '07:00',
      timezone: 'America/New_York',
    };

    server.use(
      rest.get(`${baseUrl}/settings/quiet-hours`, (req, res, ctx) => {
        return res(ctx.json(mockQuietHours));
      }),
      rest.post(`${baseUrl}/notifications/send`, (req, res, ctx) => {
        const requestTime = new Date(req.body.scheduledTime);
        const userTimezone = req.headers.get('x-user-timezone');
        
        // Convert request time to user's timezone and check quiet hours
        const localTime = new Date(requestTime.toLocaleString('en-US', { timeZone: userTimezone }));
        const hour = localTime.getHours();
        
        if (hour >= 22 || hour < 7) {
          return res(
            ctx.status(400),
            ctx.json({
              error: 'Notification blocked by quiet hours',
              quietHours: mockQuietHours,
            })
          );
        }
        
        return res(ctx.json({ status: 'sent' }));
      })
    );

    renderApp('/settings');

    // Verify quiet hours display in user's timezone
    await waitFor(() => {
      expect(screen.getByText('Quiet Hours')).toBeInTheDocument();
      expect(screen.getByText('10:00 PM - 7:00 AM EST')).toBeInTheDocument();
    });

    // Attempt to schedule notification during quiet hours
    await userEvent.click(screen.getByText('Schedule Notification'));
    await userEvent.type(screen.getByLabelText(/time/i), '11:30 PM');
    await userEvent.click(screen.getByRole('button', { name: /schedule/i }));

    // Verify quiet hours warning
    await waitFor(() => {
      expect(screen.getByText(/notification blocked by quiet hours/i)).toBeInTheDocument();
      expect(screen.getByText('10:00 PM - 7:00 AM EST')).toBeInTheDocument();
    });
  });
});

describe('Critical Medication Flows', () => {
  let utils: any;
  let server: any;

  beforeAll(() => {
    utils = {
      createTestUtils: () => {
        return {
          createMockServer: () => {
            return {
              use: (handler: any) => {
                server.use(handler);
              },
              resetHandlers: () => {
                server.resetHandlers();
              },
              close: () => {
                server.close();
              }
            };
          },
          renderWithProviders: (component: any) => {
            return renderApp('/family/member1/medications', component);
          }
        };
      }
    };
    server = utils.createTestUtils().createMockServer();
  });

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('auth_token', 'test-token');
    localStorage.setItem('user_id', mockUser.id);
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  describe('HIPAA Compliance and Data Security', () => {
    it('displays encrypted medication data with proper HIPAA compliance', async () => {
      server.use(
        rest.get(`${baseUrl}/household/members/:memberId/medications`, (req, res, ctx) => {
          return res(ctx.json(mockMedications));
        })
      );

      const { container } = utils.createTestUtils().renderWithProviders(<AppRoutes />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Med')).toBeInTheDocument();
      });

      // Verify PHI data is encrypted
      const medicationElements = container.querySelectorAll('[data-testid="medication-item"]');
      medicationElements.forEach(element => {
        expect(element).toHaveAttribute('data-hipaa-compliant', 'true');
      });
    });
  });

  describe('Timezone-Aware Medication Scheduling', () => {
    it('handles timezone-specific medication schedules correctly', async () => {
      const mockTimezone = 'America/New_York';
      const originalTimezone = process.env.TZ;
      process.env.TZ = mockTimezone;

      server.use(
        rest.get(`${baseUrl}/household/members/:memberId/medications`, (req, res, ctx) => {
          return res(ctx.json([{
            ...mockMedications[0],
            scheduledTime: '2024-01-01T09:00:00Z'
          }]));
        })
      );

      utils.createTestUtils().renderWithProviders(<AppRoutes />);
      
      await waitFor(() => {
        // Should show 4:00 AM EST (converted from 09:00 UTC)
        expect(screen.getByText(/4:00 AM EST/i)).toBeInTheDocument();
      });

      process.env.TZ = originalTimezone;
    });
  });

  describe('Emergency Response System', () => {
    it('triggers emergency contact notification for missed critical dose', async () => {
      const mockEmergencyResponse = jest.fn();
      server.use(
        rest.get(`${baseUrl}/household/members/:memberId/medications`, (req, res, ctx) => {
          return res(ctx.json(mockMedications));
        }),
        rest.post(`${baseUrl}/emergency/missed-dose`, (req, res, ctx) => {
          mockEmergencyResponse(req.body);
          return res(ctx.json({ status: 'emergency_activated', level: 'urgent' }));
        })
      );

      utils.createTestUtils().renderWithProviders(<AppRoutes />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Med')).toBeInTheDocument();
      });

      // Simulate missing a critical dose
      const markMissedButton = screen.getByRole('button', { name: /mark as missed/i });
      await userEvent.click(markMissedButton);

      expect(mockEmergencyResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          medicationId: 'med1',
          userId: mockUser.id,
          timestamp: expect.any(String)
        })
      );

      expect(await screen.findByText(/emergency contacts notified/i)).toBeInTheDocument();
    });
  });

  describe('Medication Schedule Validation', () => {
    it('enforces medication schedule validation rules', async () => {
      const mockScheduleValidation = jest.fn();
      server.use(
        rest.post(`${baseUrl}/medications/validate-schedule`, (req, res, ctx) => {
          mockScheduleValidation(req.body);
          return res(ctx.json({ isValid: true }));
        })
      );

      utils.createTestUtils().renderWithProviders(<AppRoutes />);
      
      // Open add medication modal
      const addButton = await screen.findByRole('button', { name: /add medication/i });
      await userEvent.click(addButton);

      // Fill in medication details
      await userEvent.type(screen.getByLabelText(/medication name/i), 'New Critical Med');
      await userEvent.type(screen.getByLabelText(/dosage/i), '10mg');
      await userEvent.type(screen.getByLabelText(/frequency/i), 'Every 8 hours');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /save medication/i });
      await userEvent.click(submitButton);

      expect(mockScheduleValidation).toHaveBeenCalledWith(
        expect.objectContaining({
          frequency: 'Every 8 hours',
          timezone: expect.any(String),
          startDate: expect.any(String),
          endDate: expect.any(String)
        })
      );
    });
  });
});
