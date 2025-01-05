import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { householdApi } from '../household';
import type { Household, FamilyMember, Medication } from '../../types';

const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const mockHousehold: Household = {
  id: 'house1',
  managerId: 'user1',
  members: [
    {
      id: 'member1',
      name: 'John Doe',
      relationship: 'Son',
      medications: ['med1', 'med2'],
    },
  ],
};

const mockMedications: Medication[] = [
  {
    id: 'med1',
    name: 'Aspirin',
    dosage: '100mg',
    frequency: 'Daily',
    instructions: 'Take with food',
    startDate: '2024-01-01',
    userId: 'member1',
  },
];

// Setup MSW server
const server = setupServer(
  // Get household
  rest.get(`${baseUrl}/household`, (req, res, ctx) => {
    return res(ctx.json(mockHousehold));
  }),

  // Add family member
  rest.post(`${baseUrl}/household/members`, (req, res, ctx) => {
    const newMember: FamilyMember = {
      id: 'member2',
      name: 'New Member',
      relationship: 'Daughter',
      medications: [],
      ...req.body,
    };
    return res(ctx.json(newMember));
  }),

  // Get member medications
  rest.get(`${baseUrl}/household/members/:memberId/medications`, (req, res, ctx) => {
    return res(ctx.json(mockMedications));
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Household API Integration', () => {
  describe('getHousehold', () => {
    it('fetches household data successfully', async () => {
      const result = await householdApi.getHousehold();
      expect(result).toEqual(mockHousehold);
    });

    it('handles network error', async () => {
      server.use(
        rest.get(`${baseUrl}/household`, (req, res, ctx) => {
          return res(ctx.status(500));
        }),
      );

      await expect(householdApi.getHousehold()).rejects.toThrow();
    });
  });

  describe('addFamilyMember', () => {
    const newMember = {
      name: 'New Member',
      relationship: 'Daughter',
    };

    it('adds family member successfully', async () => {
      const result = await householdApi.addFamilyMember(newMember);
      expect(result.name).toBe(newMember.name);
      expect(result.relationship).toBe(newMember.relationship);
      expect(result.id).toBeDefined();
    });

    it('validates required fields', async () => {
      server.use(
        rest.post(`${baseUrl}/household/members`, (req, res, ctx) => {
          return res(
            ctx.status(400),
            ctx.json({ error: 'Name and relationship are required' }),
          );
        }),
      );

      await expect(
        householdApi.addFamilyMember({ name: '', relationship: '' }),
      ).rejects.toThrow();
    });
  });

  describe('getMemberMedications', () => {
    it('fetches member medications successfully', async () => {
      const result = await householdApi.getMemberMedications('member1');
      expect(result).toEqual(mockMedications);
    });

    it('handles non-existent member', async () => {
      server.use(
        rest.get(`${baseUrl}/household/members/:memberId/medications`, (req, res, ctx) => {
          return res(ctx.status(404));
        }),
      );

      await expect(householdApi.getMemberMedications('invalid')).rejects.toThrow();
    });

    it('handles permission error', async () => {
      server.use(
        rest.get(`${baseUrl}/household/members/:memberId/medications`, (req, res, ctx) => {
          return res(ctx.status(403));
        }),
      );

      await expect(householdApi.getMemberMedications('member1')).rejects.toThrow();
    });
  });

  describe('Error handling', () => {
    it('handles timeout', async () => {
      server.use(
        rest.get(`${baseUrl}/household`, (req, res, ctx) => {
          return res(ctx.delay(5000)); // 5 second delay
        }),
      );

      await expect(householdApi.getHousehold()).rejects.toThrow();
    });

    it('handles network failure', async () => {
      server.use(
        rest.get(`${baseUrl}/household`, (req, res) => {
          return res.networkError('Failed to connect');
        }),
      );

      await expect(householdApi.getHousehold()).rejects.toThrow();
    });
  });
});
