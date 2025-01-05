import { z } from 'zod';

export const UserType = z.enum(['individual', 'family_manager', 'carer']);
export type UserType = z.infer<typeof UserType>;

export const UserProfile = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  type: UserType,
  timezone: z.string(),
});
export type UserProfile = z.infer<typeof UserProfile>;

export const FamilyMember = z.object({
  id: z.string(),
  name: z.string(),
  dateOfBirth: z.string().optional(),
  relationship: z.string(),
  medications: z.array(z.string()), // Array of medication IDs
});
export type FamilyMember = z.infer<typeof FamilyMember>;

export const Household = z.object({
  id: z.string(),
  managerId: z.string(), // ID of the family manager
  members: z.array(FamilyMember),
});
export type Household = z.infer<typeof Household>;

export const CarerAccess = z.object({
  id: z.string(),
  carerId: z.string(),
  clientId: z.string(), // Can be individual user ID or household ID
  permissions: z.object({
    canView: z.boolean(),
    canEdit: z.boolean(),
    canReceiveAlerts: z.boolean(),
    isEmergencyContact: z.boolean(),
  }),
  accessGrantedAt: z.string(),
  accessExpiresAt: z.string().optional(),
});
export type CarerAccess = z.infer<typeof CarerAccess>;

export const Medication = z.object({
  id: z.string(),
  name: z.string(),
  dosage: z.string(),
  frequency: z.string(),
  instructions: z.string(),
  startDate: z.string(),
  endDate: z.string().optional(),
  userId: z.string(), // ID of the user or family member
  prescribedBy: z.string().optional(),
  interactions: z.array(z.string()).optional(),
});
export type Medication = z.infer<typeof Medication>;
