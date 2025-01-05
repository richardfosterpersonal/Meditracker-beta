import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { Medication } from '../slices/medicationSlice';

export const medicationApi = createApi({
  reducerPath: 'medicationApi',
  baseQuery: fetchBaseQuery({ 
    baseUrl: '/api/v1/',
    prepareHeaders: (headers, { getState }) => {
      // Add auth header if needed
      const token = (getState() as any).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Medication'],
  endpoints: (builder) => ({
    getMedications: builder.query<Medication[], void>({
      query: () => 'medications',
      providesTags: ['Medication'],
    }),
    getMedicationById: builder.query<Medication, string>({
      query: (id) => `medications/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Medication', id }],
    }),
    addMedication: builder.mutation<Medication, Partial<Medication>>({
      query: (medication) => ({
        url: 'medications',
        method: 'POST',
        body: medication,
      }),
      invalidatesTags: ['Medication'],
    }),
    updateMedication: builder.mutation<Medication, { id: string; medication: Partial<Medication> }>({
      query: ({ id, medication }) => ({
        url: `medications/${id}`,
        method: 'PUT',
        body: medication,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Medication', id }],
    }),
    deleteMedication: builder.mutation<void, string>({
      query: (id) => ({
        url: `medications/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [{ type: 'Medication', id }],
    }),
    updateMedicationCompliance: builder.mutation<void, { id: string; taken: boolean; timestamp?: string }>({
      query: ({ id, taken, timestamp }) => ({
        url: `medications/${id}/compliance`,
        method: 'POST',
        body: { taken, timestamp },
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Medication', id }],
    }),
  }),
});

export const {
  useGetMedicationsQuery,
  useGetMedicationByIdQuery,
  useAddMedicationMutation,
  useUpdateMedicationMutation,
  useDeleteMedicationMutation,
  useUpdateMedicationComplianceMutation,
} = medicationApi;
