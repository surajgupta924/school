import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { logout, setTokens } from '../features/auth/authSlice';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: '/api',
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth?.accessToken;
    if (token) headers.set('authorization', `Bearer ${token}`);
    return headers;
  },
});

/**
 * Access tokens live for 15 minutes. A single in-flight refresh is shared by every
 * request that got a 401 so a burst of parallel queries cannot rotate the refresh
 * token more than once.
 */
let refreshPromise = null;

async function runRefresh(api, extraOptions) {
  const refreshToken = api.getState().auth?.refreshToken;
  const result = await rawBaseQuery(
    {
      url: '/auth/refresh',
      method: 'POST',
      body: { refreshToken },
    },
    api,
    extraOptions
  );

  if (result.data?.accessToken) {
    api.dispatch(setTokens(result.data));
    return result.data.accessToken;
  }

  api.dispatch(logout());
  return null;
}

const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    const url = typeof args === 'string' ? args : String(args?.url || '');
    if (url.includes('/auth/login') || url.includes('/auth/refresh')) {
      return result;
    }

    if (!refreshPromise) {
      refreshPromise = runRefresh(api, extraOptions).finally(() => {
        refreshPromise = null;
      });
    }

    const newToken = await refreshPromise;
    if (newToken) {
      result = await rawBaseQuery(args, api, extraOptions);
    }
  }

  return result;
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  keepUnusedDataFor: 60,
  tagTypes: [
    'Auth',
    'Stats',
    'Student',
    'Teacher',
    'Staff',
    'Parent',
    'Class',
    'Attendance',
    'IdCard',
    'Fee',
    'Receipt',
    'Route',
    'Vehicle',
    'Assignment',
    'Trip',
    'Exam',
    'ExamResult',
    'Homework',
    'Leave',
    'Notice',
    'Inbox',
    'Settings',
    'Audit',
  ],
  endpoints: (builder) => ({
    /* ─────────────── Auth ─────────────── */
    login: builder.mutation({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      invalidatesTags: ['Auth', 'Stats', 'Inbox'],
    }),
    logoutServer: builder.mutation({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
    }),
    me: builder.query({
      query: () => '/auth/me',
      providesTags: ['Auth'],
    }),
    demoAccounts: builder.query({
      query: () => '/auth/demo-accounts',
      transformResponse: (res) => res?.accounts || [],
    }),
    changePassword: builder.mutation({
      query: (body) => ({ url: '/auth/change-password', method: 'POST', body }),
    }),

    /* ─────────────── Dashboard ─────────────── */
    getStats: builder.query({
      query: () => '/dashboard/stats',
      providesTags: ['Stats'],
    }),

    /* ─────────────── Students ─────────────── */
    getStudents: builder.query({
      query: (params = {}) => ({ url: '/students', params }),
      transformResponse: (res) => res?.students || [],
      providesTags: (result) =>
        result
          ? [...result.map((s) => ({ type: 'Student', id: s.id })), { type: 'Student', id: 'LIST' }]
          : [{ type: 'Student', id: 'LIST' }],
    }),
    getStudent: builder.query({
      query: (id) => `/students/${id}`,
      transformResponse: (res) => res?.student,
      providesTags: (r, e, id) => [{ type: 'Student', id }],
    }),
    createStudent: builder.mutation({
      query: (body) => ({ url: '/students', method: 'POST', body }),
      invalidatesTags: [{ type: 'Student', id: 'LIST' }, 'Stats'],
    }),
    updateStudent: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/students/${id}`, method: 'PUT', body }),
      invalidatesTags: (r, e, arg) => [{ type: 'Student', id: arg.id }, { type: 'Student', id: 'LIST' }],
    }),
    deleteStudent: builder.mutation({
      query: (id) => ({ url: `/students/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Student', id: 'LIST' }, 'Stats'],
    }),

    /* ─────────────── Teachers ─────────────── */
    getTeachers: builder.query({
      query: () => '/teachers',
      transformResponse: (res) => res?.teachers || [],
      providesTags: (result) =>
        result
          ? [...result.map((t) => ({ type: 'Teacher', id: t.id })), { type: 'Teacher', id: 'LIST' }]
          : [{ type: 'Teacher', id: 'LIST' }],
    }),
    createTeacher: builder.mutation({
      query: (body) => ({ url: '/teachers', method: 'POST', body }),
      invalidatesTags: [{ type: 'Teacher', id: 'LIST' }, 'Stats'],
    }),
    updateTeacher: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/teachers/${id}`, method: 'PUT', body }),
      invalidatesTags: [{ type: 'Teacher', id: 'LIST' }],
    }),
    deleteTeacher: builder.mutation({
      query: (id) => ({ url: `/teachers/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Teacher', id: 'LIST' }, 'Stats'],
    }),

    /* ─────────────── Staff & Parents ─────────────── */
    getStaff: builder.query({
      query: (params = {}) => ({ url: '/staff', params }),
      transformResponse: (res) => res?.staff || [],
      providesTags: [{ type: 'Staff', id: 'LIST' }],
    }),
    createStaff: builder.mutation({
      query: (body) => ({ url: '/staff', method: 'POST', body }),
      invalidatesTags: [{ type: 'Staff', id: 'LIST' }, 'Stats'],
    }),
    updateStaff: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/staff/${id}`, method: 'PUT', body }),
      invalidatesTags: [{ type: 'Staff', id: 'LIST' }],
    }),
    deleteStaff: builder.mutation({
      query: (id) => ({ url: `/staff/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Staff', id: 'LIST' }, 'Stats'],
    }),
    getParents: builder.query({
      query: () => '/staff/parents/list',
      transformResponse: (res) => res?.parents || [],
      providesTags: [{ type: 'Parent', id: 'LIST' }],
    }),
    createParent: builder.mutation({
      query: (body) => ({ url: '/staff/parents', method: 'POST', body }),
      invalidatesTags: [{ type: 'Parent', id: 'LIST' }, 'Stats'],
    }),

    /* ─────────────── Classes ─────────────── */
    getClasses: builder.query({
      query: (params = {}) => ({ url: '/classes', params }),
      transformResponse: (res) => res?.classes || [],
      providesTags: [{ type: 'Class', id: 'LIST' }],
    }),
    createClass: builder.mutation({
      query: (body) => ({ url: '/classes', method: 'POST', body }),
      invalidatesTags: [{ type: 'Class', id: 'LIST' }],
    }),
    updateClass: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/classes/${id}`, method: 'PUT', body }),
      invalidatesTags: [{ type: 'Class', id: 'LIST' }],
    }),
    deleteClass: builder.mutation({
      query: (id) => ({ url: `/classes/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Class', id: 'LIST' }],
    }),

    /* ─────────────── Attendance ─────────────── */
    getAttendance: builder.query({
      query: (params = {}) => ({ url: '/attendance', params }),
      transformResponse: (res) => res?.attendance || [],
      providesTags: [{ type: 'Attendance', id: 'LIST' }],
    }),
    getAttendanceToday: builder.query({
      query: (params = {}) => ({ url: '/attendance/today', params }),
      providesTags: [{ type: 'Attendance', id: 'TODAY' }],
    }),
    getAttendanceReport: builder.query({
      query: (params = {}) => ({ url: '/attendance/reports', params }),
      providesTags: [{ type: 'Attendance', id: 'REPORT' }],
    }),
    markAttendance: builder.mutation({
      query: (body) => ({ url: '/attendance/mark', method: 'POST', body }),
      invalidatesTags: ['Attendance', 'Stats'],
    }),
    scanQrAttendance: builder.mutation({
      // Server contract: { token, session, status }
      query: ({ qrToken, token, session = 'morning', status = 'present' }) => ({
        url: '/attendance/scan-qr',
        method: 'POST',
        body: { token: token || qrToken, session, status },
      }),
      invalidatesTags: ['Attendance', 'Stats'],
    }),

    /* ─────────────── ID card / QR ─────────────── */
    getIdCard: builder.query({
      query: (studentId) => `/idcard/student/${studentId}`,
      transformResponse: (res) => res?.idCard,
      providesTags: (r, e, id) => [{ type: 'IdCard', id }],
    }),
    generateStudentQr: builder.mutation({
      query: ({ studentId, rotate = false }) => ({
        url: `/idcard/student/${studentId}/qr`,
        method: 'POST',
        body: { rotate },
      }),
      transformResponse: (res) => res?.qr,
      invalidatesTags: (r, e, arg) => [{ type: 'IdCard', id: arg.studentId }],
    }),

    /* ─────────────── Fees ─────────────── */
    getFees: builder.query({
      query: (params = {}) => ({ url: '/fees', params }),
      transformResponse: (res) => res?.fees || [],
      providesTags: [{ type: 'Fee', id: 'LIST' }],
    }),
    createFee: builder.mutation({
      query: (body) => ({ url: '/fees', method: 'POST', body }),
      invalidatesTags: [{ type: 'Fee', id: 'LIST' }, 'Stats', 'Inbox'],
    }),
    payFee: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/fees/${id}/pay`, method: 'PATCH', body }),
      invalidatesTags: [{ type: 'Fee', id: 'LIST' }, 'Receipt', 'Stats'],
    }),
    sendFeeReminders: builder.mutation({
      query: () => ({ url: '/fees/reminders', method: 'POST' }),
      invalidatesTags: ['Inbox'],
    }),
    getReceipts: builder.query({
      query: (params = {}) => ({ url: '/fees/receipts', params }),
      transformResponse: (res) => res?.receipts || [],
      providesTags: ['Receipt'],
    }),

    /* ─────────────── Transport ─────────────── */
    getRoutes: builder.query({
      query: (params = {}) => ({ url: '/transport/routes', params }),
      transformResponse: (res) => res?.routes || [],
      providesTags: [{ type: 'Route', id: 'LIST' }],
    }),
    createRoute: builder.mutation({
      query: (body) => ({ url: '/transport/routes', method: 'POST', body }),
      invalidatesTags: [{ type: 'Route', id: 'LIST' }],
    }),
    updateRoute: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/transport/routes/${id}`, method: 'PUT', body }),
      invalidatesTags: [{ type: 'Route', id: 'LIST' }],
    }),
    deleteRoute: builder.mutation({
      query: (id) => ({ url: `/transport/routes/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Route', id: 'LIST' }],
    }),

    getVehicles: builder.query({
      query: (params = {}) => ({ url: '/transport/vehicles', params }),
      transformResponse: (res) => res?.vehicles || [],
      providesTags: [{ type: 'Vehicle', id: 'LIST' }],
    }),
    createVehicle: builder.mutation({
      query: (body) => ({ url: '/transport/vehicles', method: 'POST', body }),
      invalidatesTags: [{ type: 'Vehicle', id: 'LIST' }, 'Stats'],
    }),
    updateVehicle: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/transport/vehicles/${id}`, method: 'PUT', body }),
      invalidatesTags: [{ type: 'Vehicle', id: 'LIST' }],
    }),
    deleteVehicle: builder.mutation({
      query: (id) => ({ url: `/transport/vehicles/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Vehicle', id: 'LIST' }, 'Stats'],
    }),

    getAssignments: builder.query({
      query: (params = {}) => ({ url: '/transport/assignments', params }),
      transformResponse: (res) => res?.assignments || [],
      providesTags: [{ type: 'Assignment', id: 'LIST' }],
    }),
    createAssignment: builder.mutation({
      query: (body) => ({ url: '/transport/assignments', method: 'POST', body }),
      invalidatesTags: [{ type: 'Assignment', id: 'LIST' }],
    }),
    updateAssignment: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/transport/assignments/${id}`, method: 'PUT', body }),
      invalidatesTags: [{ type: 'Assignment', id: 'LIST' }],
    }),
    deleteAssignment: builder.mutation({
      query: (id) => ({ url: `/transport/assignments/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Assignment', id: 'LIST' }],
    }),

    getActiveTrips: builder.query({
      query: () => '/transport/trips/active',
      transformResponse: (res) => res?.trips || [],
      providesTags: [{ type: 'Trip', id: 'ACTIVE' }],
    }),
    getTripHistory: builder.query({
      query: (id) => `/transport/trips/${id}/history`,
      transformResponse: (res) => res?.trip,
      providesTags: (r, e, id) => [{ type: 'Trip', id }],
    }),
    startTrip: builder.mutation({
      query: (body) => ({ url: '/transport/trips/start', method: 'POST', body }),
      transformResponse: (res) => res?.trip,
      invalidatesTags: [{ type: 'Trip', id: 'ACTIVE' }, 'Stats'],
    }),
    endTrip: builder.mutation({
      query: (id) => ({ url: `/transport/trips/${id}/end`, method: 'POST' }),
      invalidatesTags: [{ type: 'Trip', id: 'ACTIVE' }, 'Stats'],
    }),
    pushTripLocation: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/transport/trips/${id}/location`,
        method: 'POST',
        body,
      }),
    }),

    /* ─────────────── Exams ─────────────── */
    getExams: builder.query({
      query: (params = {}) => ({ url: '/exams', params }),
      transformResponse: (res) => res?.exams || [],
      providesTags: [{ type: 'Exam', id: 'LIST' }],
    }),
    createExam: builder.mutation({
      query: (body) => ({ url: '/exams', method: 'POST', body }),
      invalidatesTags: [{ type: 'Exam', id: 'LIST' }],
    }),
    updateExam: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/exams/${id}`, method: 'PUT', body }),
      invalidatesTags: [{ type: 'Exam', id: 'LIST' }],
    }),
    deleteExam: builder.mutation({
      query: (id) => ({ url: `/exams/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Exam', id: 'LIST' }],
    }),
    getExamResults: builder.query({
      query: (id) => `/exams/${id}/results`,
      transformResponse: (res) => res?.results || [],
      providesTags: (r, e, id) => [{ type: 'ExamResult', id }],
    }),
    saveExamResults: builder.mutation({
      query: ({ id, results }) => ({ url: `/exams/${id}/results`, method: 'POST', body: { results } }),
      invalidatesTags: (r, e, arg) => [{ type: 'ExamResult', id: arg.id }, 'Inbox'],
    }),

    /* ─────────────── Homework ─────────────── */
    getHomework: builder.query({
      query: (params = {}) => ({ url: '/homework', params }),
      transformResponse: (res) => res?.homework || [],
      providesTags: [{ type: 'Homework', id: 'LIST' }],
    }),
    createHomework: builder.mutation({
      query: (body) => ({ url: '/homework', method: 'POST', body }),
      invalidatesTags: [{ type: 'Homework', id: 'LIST' }, 'Inbox'],
    }),
    updateHomework: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/homework/${id}`, method: 'PUT', body }),
      invalidatesTags: [{ type: 'Homework', id: 'LIST' }],
    }),
    deleteHomework: builder.mutation({
      query: (id) => ({ url: `/homework/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Homework', id: 'LIST' }],
    }),

    /* ─────────────── Leaves ─────────────── */
    getLeaves: builder.query({
      query: (params = {}) => ({ url: '/leaves', params }),
      transformResponse: (res) => res?.leaves || [],
      providesTags: [{ type: 'Leave', id: 'LIST' }],
    }),
    createLeave: builder.mutation({
      query: (body) => ({ url: '/leaves', method: 'POST', body }),
      invalidatesTags: [{ type: 'Leave', id: 'LIST' }, 'Stats'],
    }),
    reviewLeave: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/leaves/${id}/review`, method: 'PATCH', body }),
      invalidatesTags: [{ type: 'Leave', id: 'LIST' }, 'Stats', 'Inbox'],
    }),
    cancelLeave: builder.mutation({
      query: (id) => ({ url: `/leaves/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Leave', id: 'LIST' }, 'Stats'],
    }),

    /* ─────────────── Notices & Inbox ─────────────── */
    getNotices: builder.query({
      query: () => '/notifications/notices',
      transformResponse: (res) => res?.notices || [],
      providesTags: [{ type: 'Notice', id: 'LIST' }],
    }),
    createNotice: builder.mutation({
      query: (body) => ({ url: '/notifications/notices', method: 'POST', body }),
      invalidatesTags: [{ type: 'Notice', id: 'LIST' }, 'Inbox', 'Stats'],
    }),
    deleteNotice: builder.mutation({
      query: (id) => ({ url: `/notifications/notices/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Notice', id: 'LIST' }],
    }),
    getInbox: builder.query({
      query: () => '/notifications/inbox',
      transformResponse: (res) => res?.notifications || [],
      providesTags: ['Inbox'],
    }),
    markNotificationRead: builder.mutation({
      query: (id) => ({ url: `/notifications/inbox/${id}/read`, method: 'PATCH' }),
      invalidatesTags: ['Inbox', 'Stats'],
    }),
    markAllNotificationsRead: builder.mutation({
      query: () => ({ url: '/notifications/inbox/read-all', method: 'PATCH' }),
      invalidatesTags: ['Inbox', 'Stats'],
    }),

    /* ─────────────── Settings ─────────────── */
    getSettings: builder.query({
      query: () => '/settings',
      transformResponse: (res) => res?.settings,
      providesTags: ['Settings'],
    }),
    updateSettings: builder.mutation({
      query: (body) => ({ url: '/settings', method: 'PUT', body }),
      invalidatesTags: ['Settings', 'Stats'],
    }),
    getAuditLogs: builder.query({
      query: (params = { limit: 100 }) => ({ url: '/settings/audit-logs', params }),
      transformResponse: (res) => res?.logs || [],
      providesTags: ['Audit'],
    }),

    /* ─────────────── Parent portal ─────────────── */
    getParentChildren: builder.query({
      query: () => '/parent/children',
      transformResponse: (res) => res?.children || [],
      providesTags: ['Students'],
    }),
    getParentMessages: builder.query({
      query: (params = {}) => ({ url: '/parent/messages', params }),
      transformResponse: (res) => res?.messages || [],
      providesTags: ['Inbox'],
    }),
    sendParentAlert: builder.mutation({
      query: (body) => ({ url: '/parent/alert', method: 'POST', body }),
      invalidatesTags: ['Inbox'],
    }),
  }),
});

export const {
  useLoginMutation,
  useLogoutServerMutation,
  useMeQuery,
  useDemoAccountsQuery,
  useChangePasswordMutation,
  useGetStatsQuery,
  useGetStudentsQuery,
  useGetStudentQuery,
  useCreateStudentMutation,
  useUpdateStudentMutation,
  useDeleteStudentMutation,
  useGetTeachersQuery,
  useCreateTeacherMutation,
  useUpdateTeacherMutation,
  useDeleteTeacherMutation,
  useGetStaffQuery,
  useCreateStaffMutation,
  useUpdateStaffMutation,
  useDeleteStaffMutation,
  useGetParentsQuery,
  useCreateParentMutation,
  useGetClassesQuery,
  useCreateClassMutation,
  useUpdateClassMutation,
  useDeleteClassMutation,
  useGetAttendanceQuery,
  useGetAttendanceTodayQuery,
  useGetAttendanceReportQuery,
  useMarkAttendanceMutation,
  useScanQrAttendanceMutation,
  useGetIdCardQuery,
  useGenerateStudentQrMutation,
  useGetFeesQuery,
  useCreateFeeMutation,
  usePayFeeMutation,
  useSendFeeRemindersMutation,
  useGetReceiptsQuery,
  useGetRoutesQuery,
  useCreateRouteMutation,
  useUpdateRouteMutation,
  useDeleteRouteMutation,
  useGetVehiclesQuery,
  useCreateVehicleMutation,
  useUpdateVehicleMutation,
  useDeleteVehicleMutation,
  useGetAssignmentsQuery,
  useCreateAssignmentMutation,
  useUpdateAssignmentMutation,
  useDeleteAssignmentMutation,
  useGetActiveTripsQuery,
  useGetTripHistoryQuery,
  useStartTripMutation,
  useEndTripMutation,
  usePushTripLocationMutation,
  useGetExamsQuery,
  useCreateExamMutation,
  useUpdateExamMutation,
  useDeleteExamMutation,
  useGetExamResultsQuery,
  useSaveExamResultsMutation,
  useGetHomeworkQuery,
  useCreateHomeworkMutation,
  useUpdateHomeworkMutation,
  useDeleteHomeworkMutation,
  useGetLeavesQuery,
  useCreateLeaveMutation,
  useReviewLeaveMutation,
  useCancelLeaveMutation,
  useGetNoticesQuery,
  useCreateNoticeMutation,
  useDeleteNoticeMutation,
  useGetInboxQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useGetSettingsQuery,
  useUpdateSettingsMutation,
  useGetAuditLogsQuery,
  useGetParentChildrenQuery,
  useGetParentMessagesQuery,
  useSendParentAlertMutation,
} = api;
