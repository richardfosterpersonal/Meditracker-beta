import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { carerApi } from '../carer';
import type { UserProfile, CarerAccess, Medication } from '../../types';

const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const mockClients: UserProfile[] = [
  {
    id: 'client1',
    name: 'John Doe',
    email: 'john@example.com',
    type: 'individual',
    timezone: 'UTC',
  },
  {
    id: 'client2',
    name: 'Family Manager',
    email: 'family@example.com',
    type: 'family_manager',
    timezone: 'UTC',
  },
];

const mockCarerAccess: CarerAccess = {
  id: 'access1',
  carerId: 'carer1',
  clientId: 'client1',
  permissions: {
    canView: true,
    canEdit: false,
    canReceiveAlerts: true,
    isEmergencyContact: true,
  },
  accessGrantedAt: '2024-01-01T00:00:00Z',
};

const mockMedications: Medication[] = [
  {
    id: 'med1',
    name: 'Aspirin',
    dosage: '100mg',
    frequency: 'Daily',
    instructions: 'Take with food',
    startDate: '2024-01-01',
    userId: 'client1',
  },
];

// Setup MSW server
const server = setupServer(
  // Get assigned clients
  rest.get(`${baseUrl}/carer/clients`, (req, res, ctx) => {
    return res(ctx.json(mockClients));
  }),

  // Get client access
  rest.get(`${baseUrl}/carer/access/:clientId`, (req, res, ctx) => {
    return res(ctx.json(mockCarerAccess));
  }),

  // Request access
  rest.post(`${baseUrl}/carer/access/request`, (req, res, ctx) => {
    return res(ctx.json({ ...mockCarerAccess, clientId: req.body.clientId }));
  }),

  // Get client medications
  rest.get(`${baseUrl}/carer/clients/:clientId/medications`, (req, res, ctx) => {
    return res(ctx.json(mockMedications));
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Carer API Integration', () => {
  describe('getAssignedClients', () => {
    it('fetches assigned clients successfully', async () => {
      const result = await carerApi.getAssignedClients();
      expect(result).toEqual(mockClients);
    });

    it('handles authentication error', async () => {
      server.use(
        rest.get(`${baseUrl}/carer/clients`, (req, res, ctx) => {
          return res(ctx.status(401));
        }),
      );

      await expect(carerApi.getAssignedClients()).rejects.toThrow();
    });
  });

  describe('getClientAccess', () => {
    it('fetches client access successfully', async () => {
      const result = await carerApi.getClientAccess('client1');
      expect(result).toEqual(mockCarerAccess);
    });

    it('handles non-existent client', async () => {
      server.use(
        rest.get(`${baseUrl}/carer/access/:clientId`, (req, res, ctx) => {
          return res(ctx.status(404));
        }),
      );

      await expect(carerApi.getClientAccess('invalid')).rejects.toThrow();
    });
  });

  describe('requestAccess', () => {
    const accessRequest = {
      clientId: 'client2',
      permissions: {
        canView: true,
        canEdit: false,
        canReceiveAlerts: true,
        isEmergencyContact: false,
      },
    };

    it('requests access successfully', async () => {
      const result = await carerApi.requestAccess(
        accessRequest.clientId,
        accessRequest.permissions,
      );
      expect(result.clientId).toBe(accessRequest.clientId);
      expect(result.permissions).toEqual(accessRequest.permissions);
    });

    it('validates permission requirements', async () => {
      server.use(
        rest.post(`${baseUrl}/carer/access/request`, (req, res, ctx) => {
          return res(
            ctx.status(400),
            ctx.json({ error: 'Invalid permissions requested' }),
          );
        }),
      );

      await expect(
        carerApi.requestAccess(accessRequest.clientId, {
          ...accessRequest.permissions,
          canEdit: true, // Attempting to request edit permission
        }),
      ).rejects.toThrow();
    });
  });

  describe('getClientMedications', () => {
    it('fetches client medications successfully', async () => {
      const result = await carerApi.getClientMedications('client1');
      expect(result).toEqual(mockMedications);
    });

    it('handles insufficient permissions', async () => {
      server.use(
        rest.get(`${baseUrl}/carer/clients/:clientId/medications`, (req, res, ctx) => {
          return res(
            ctx.status(403),
            ctx.json({ error: 'Insufficient permissions' }),
          );
        }),
      );

      await expect(carerApi.getClientMedications('client1')).rejects.toThrow();
    });

    it('validates medication access scope', async () => {
      const clientId = 'client2';
      server.use(
        rest.get(`${baseUrl}/carer/clients/${clientId}/medications`, (req, res, ctx) => {
          // Simulate checking if medications belong to the client
          const medications = mockMedications.filter(
            (med) => med.userId === clientId,
          );
          return res(ctx.json(medications));
        }),
      );

      const result = await carerApi.getClientMedications(clientId);
      expect(result).toHaveLength(0); // No medications for client2
    });
  });

  describe('Error Handling', () => {
    it('handles rate limiting', async () => {
      server.use(
        rest.get(`${baseUrl}/carer/clients`, (req, res, ctx) => {
          return res(
            ctx.status(429),
            ctx.json({ error: 'Too many requests' }),
          );
        }),
      );

      await expect(carerApi.getAssignedClients()).rejects.toThrow();
    });

    it('handles server errors', async () => {
      server.use(
        rest.get(`${baseUrl}/carer/clients`, (req, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({ error: 'Internal server error' }),
          );
        }),
      );

      await expect(carerApi.getAssignedClients()).rejects.toThrow();
    });

    it('handles malformed responses', async () => {
      server.use(
        rest.get(`${baseUrl}/carer/clients`, (req, res, ctx) => {
          return res(ctx.json({ malformed: 'data' }));
        }),
      );

      await expect(carerApi.getAssignedClients()).rejects.toThrow();
    });
  });
});
