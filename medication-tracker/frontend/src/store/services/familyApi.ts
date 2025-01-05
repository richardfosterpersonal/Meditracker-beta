import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '../index';

export interface FamilyMember {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  relationship: string;
  allergies: string[];
  medicalConditions: string[];
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  permissions: {
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canManageMedications: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateFamilyMemberRequest {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  relationship: string;
  allergies?: string[];
  medicalConditions?: string[];
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  permissions?: {
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canManageMedications: boolean;
  };
}

export const familyApi = createApi({
  reducerPath: 'familyApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${process.env.REACT_APP_API_URL}/family`,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['FamilyMember'],
  endpoints: (builder) => ({
    getFamilyMembers: builder.query<FamilyMember[], void>({
      query: () => '/',
      providesTags: ['FamilyMember'],
    }),

    getFamilyMember: builder.query<FamilyMember, string>({
      query: (id) => `/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'FamilyMember', id }],
    }),

    createFamilyMember: builder.mutation<FamilyMember, CreateFamilyMemberRequest>({
      query: (member) => ({
        url: '/',
        method: 'POST',
        body: member,
      }),
      invalidatesTags: ['FamilyMember'],
    }),

    updateFamilyMember: builder.mutation<
      FamilyMember,
      Partial<FamilyMember> & { id: string }
    >({
      query: ({ id, ...patch }) => ({
        url: `/${id}`,
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'FamilyMember', id },
        'FamilyMember',
      ],
    }),

    deleteFamilyMember: builder.mutation<void, string>({
      query: (id) => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['FamilyMember'],
    }),

    updateFamilyMemberPermissions: builder.mutation<
      FamilyMember,
      { id: string; permissions: FamilyMember['permissions'] }
    >({
      query: ({ id, permissions }) => ({
        url: `/${id}/permissions`,
        method: 'PATCH',
        body: { permissions },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'FamilyMember', id },
        'FamilyMember',
      ],
    }),
  }),
});

export const {
  useGetFamilyMembersQuery,
  useGetFamilyMemberQuery,
  useCreateFamilyMemberMutation,
  useUpdateFamilyMemberMutation,
  useDeleteFamilyMemberMutation,
  useUpdateFamilyMemberPermissionsMutation,
} = familyApi;
