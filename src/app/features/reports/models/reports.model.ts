export interface DashboardSummaryResponse {
  totalEvents: number;
  totalRegisteredUsers: number;
  totalApprovedEnrollments: number;
  totalModalities: number;
  totalRevenue: number;
  overallAverageScore: number;
}

/** Refleja EnrollmentReportFilter de ms-reporting-analytics-service. */
export type EnrollmentReportFilter = 'ALL' | 'APPROVED' | 'NOT_APPROVED' | 'WITH_TRACK' | 'WITHOUT_TRACK';

export interface EnrollmentReportTab {
  filter: EnrollmentReportFilter;
  label: string;
  icon: string;
}

export const ENROLLMENT_REPORT_TABS: EnrollmentReportTab[] = [
  { filter: 'ALL', label: 'Todos', icon: 'groups' },
  { filter: 'APPROVED', label: 'Aprobados', icon: 'check_circle' },
  { filter: 'NOT_APPROVED', label: 'No aprobados', icon: 'cancel' },
  { filter: 'WITH_TRACK', label: 'Con pista musical', icon: 'music_note' },
  { filter: 'WITHOUT_TRACK', label: 'Sin pista musical', icon: 'music_off' }
];

export interface EnrollmentReportRow {
  enrollmentId: number;
  fullName: string;
  documentNumber: string;
  email: string;
  modalityName: string;
  status: string;
  statusLabel: string;
  statusCssClass: string;
  hasMusicTrack: boolean | null;
  trackLabel: string;
  trackCssClass: string;
  createdAt: string;
}

export interface EnrollmentReportCounters {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  withTrack: number;
  withoutTrack: number;
}

export interface EnrollmentReportResponse {
  eventId: number;
  eventName: string;
  filter: EnrollmentReportFilter;
  reportTitle: string;
  generatedAt: string;
  counters: EnrollmentReportCounters;
  rows: EnrollmentReportRow[];
}

export interface ScheduleReportSlot {
  id: number;
  enrollmentId: number;
  participantName: string;
  groupName: string;
  division: string;
  category: string;
  style: string;
  startTime: string;
  endTime: string;
  stage: string;
  order: number;
  status: string;
  notes: string;
}

export type ScheduleReportStatus = 'NOT_CONFIGURED' | 'DRAFT_NOT_VISIBLE' | 'AVAILABLE';

export interface ScheduleReportResponse {
  eventId: number;
  eventName: string;
  available: boolean;
  status: ScheduleReportStatus;
  totalSlots: number;
  generatedAt: string | null;
  slots: ScheduleReportSlot[];
}

export interface EventSummaryModalityBreakdown {
  modalityId: number;
  category: string;
  division: string;
  participantCount: number;
  averageScore: number;
}

export interface EventSummaryReportResponse {
  eventId: number;
  eventName: string;
  executionDate: string;
  /** Real: inscripciones con status APPROVED (ms-enrollment), no resultados de jurado. */
  totalParticipants: number;
  totalEnrolled: number;
  totalPending: number;
  totalRejected: number;
  totalWithMusicTrack: number;
  totalWithoutMusicTrack: number;
  totalModalities: number;
  overallAverageScore: number;
  highestScore: number;
  lowestScore: number;
  totalScheduledSlots: number;
  scheduleStatus: string;
  modalities: EventSummaryModalityBreakdown[];
}
