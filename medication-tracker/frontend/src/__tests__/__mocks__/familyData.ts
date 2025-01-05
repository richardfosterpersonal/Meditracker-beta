export const mockFamilyMembers = [
  {
    id: '1',
    name: 'Jane Smith',
    email: 'jane@example.com',
    relationship: 'SPOUSE',
    status: 'ACTIVE',
    permissions: {
      canViewMedications: true,
      canEditMedications: true,
      canViewSchedule: true,
      canEditSchedule: true,
      canViewReports: true,
      canManageInventory: true,
    },
    createdAt: '2024-12-08T10:00:00Z',
    updatedAt: '2024-12-08T10:00:00Z',
  },
  {
    id: '2',
    name: 'Tommy Smith',
    email: 'tommy@example.com',
    relationship: 'CHILD',
    status: 'PENDING',
    permissions: {
      canViewMedications: true,
      canEditMedications: false,
      canViewSchedule: true,
      canEditSchedule: false,
      canViewReports: true,
      canManageInventory: false,
    },
    createdAt: '2024-12-08T11:00:00Z',
    updatedAt: '2024-12-08T11:00:00Z',
  },
  {
    id: '3',
    name: 'Mary Johnson',
    email: 'mary@example.com',
    relationship: 'PARENT',
    status: 'ACTIVE',
    permissions: {
      canViewMedications: true,
      canEditMedications: true,
      canViewSchedule: true,
      canEditSchedule: true,
      canViewReports: true,
      canManageInventory: false,
    },
    createdAt: '2024-12-08T12:00:00Z',
    updatedAt: '2024-12-08T12:00:00Z',
  },
];

export const mockFamilyInvitation = {
  email: 'new@example.com',
  name: 'New Member',
  relationship: 'SIBLING',
};

export const mockFamilyPermissions = {
  canViewMedications: true,
  canEditMedications: false,
  canViewSchedule: true,
  canEditSchedule: false,
  canViewReports: true,
  canManageInventory: false,
};

export const mockSubscriptionTiers = {
  FREE: {
    maxFamilyMembers: 0,
    basePrice: 0,
  },
  FAMILY: {
    maxFamilyMembers: 4,
    basePrice: 14.99,
  },
  FAMILY_PLUS_CARE: {
    maxFamilyMembers: 8,
    basePrice: 34.99,
  },
};
