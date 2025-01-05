import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export interface MedicationSchedule {
  id: string;
  userId: string;
  medicationName: string;
  dosage: string;
  frequency: {
    type: 'daily' | 'weekly' | 'monthly';
    times: string[];
    daysOfWeek?: number[];
    daysOfMonth?: number[];
  };
  startDate: string;
  endDate?: string;
  instructions?: string;
  refillReminder?: {
    enabled: boolean;
    threshold: number;
    lastRefillDate?: string;
    nextRefillDate?: string;
  };
  status: 'active' | 'paused' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface DoseLog {
  id: string;
  scheduleId: string;
  status: 'taken' | 'missed' | 'skipped' | 'late';
  scheduledTime: string;
  takenTime?: string;
  notes?: string;
}

export interface AdherenceStats {
  taken: number;
  missed: number;
  late: number;
  skipped: number;
  adherenceRate: number;
}

export const medicationScheduleApi = createApi({
  reducerPath: 'medicationScheduleApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${process.env.REACT_APP_API_URL}/api`,
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('token');
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['MedicationSchedule', 'DoseLogs'],
  endpoints: (builder) => ({
    getSchedules: builder.query<MedicationSchedule[], void>({
      query: () => '/medication-schedules',
      providesTags: ['MedicationSchedule'],
    }),

    getScheduleById: builder.query<MedicationSchedule, string>({
      query: (id) => `/medication-schedules/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'MedicationSchedule', id }],
    }),

    createSchedule: builder.mutation<MedicationSchedule, Partial<MedicationSchedule>>({
      query: (schedule) => ({
        url: '/medication-schedules',
        method: 'POST',
        body: schedule,
      }),
      invalidatesTags: ['MedicationSchedule'],
    }),

    updateSchedule: builder.mutation<
      MedicationSchedule,
      Partial<MedicationSchedule> & { id: string }
    >({
      query: ({ id, ...patch }) => ({
        url: `/medication-schedules/${id}`,
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'MedicationSchedule', id },
        'MedicationSchedule',
      ],
    }),

    deleteSchedule: builder.mutation<void, string>({
      query: (id) => ({
        url: `/medication-schedules/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['MedicationSchedule'],
    }),

    getDoseLogs: builder.query<DoseLog[], string>({
      query: (scheduleId) => `/medication-schedules/${scheduleId}/doses`,
      providesTags: ['DoseLogs'],
    }),

    logDose: builder.mutation<DoseLog, {
      scheduleId: string;
      status: DoseLog['status'];
      scheduledTime: string;
      takenTime?: string;
      notes?: string;
    }>({
      query: ({ scheduleId, ...body }) => ({
        url: `/medication-schedules/${scheduleId}/doses`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['DoseLogs'],
    }),

    getAdherenceStats: builder.query<AdherenceStats, string>({
      query: (scheduleId) => `/medication-schedules/${scheduleId}/adherence`,
      providesTags: ['DoseLogs'],
    }),

    updateRefillInfo: builder.mutation<
      MedicationSchedule,
      { scheduleId: string; refillDate: string }
    >({
      query: ({ scheduleId, refillDate }) => ({
        url: `/medication-schedules/${scheduleId}/refill`,
        method: 'POST',
        body: { refillDate },
      }),
      invalidatesTags: (_result, _error, { scheduleId }) => [
        { type: 'MedicationSchedule', id: scheduleId },
      ],
    }),

    pauseSchedule: builder.mutation<void, string>({
      query: (scheduleId) => ({
        url: `/medication-schedules/${scheduleId}/pause`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, scheduleId) => [
        { type: 'MedicationSchedule', id: scheduleId },
      ],
    }),

    resumeSchedule: builder.mutation<void, string>({
      query: (scheduleId) => ({
        url: `/medication-schedules/${scheduleId}/resume`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, scheduleId) => [
        { type: 'MedicationSchedule', id: scheduleId },
      ],
    }),
  }),
});

export const {
  useGetSchedulesQuery,
  useGetScheduleByIdQuery,
  useCreateScheduleMutation,
  useUpdateScheduleMutation,
  useDeleteScheduleMutation,
  useGetDoseLogsQuery,
  useLogDoseMutation,
  useGetAdherenceStatsQuery,
  useUpdateRefillInfoMutation,
  usePauseScheduleMutation,
  useResumeScheduleMutation,
} = medicationScheduleApi;
