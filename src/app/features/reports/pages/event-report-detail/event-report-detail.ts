import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';

import { ReportsService } from '../../services/reports.service';
import {
  ENROLLMENT_REPORT_TABS,
  EnrollmentReportFilter,
  EnrollmentReportResponse,
  EventSummaryReportResponse,
  ScheduleReportResponse
} from '../../models/reports.model';
import { EventService } from '../../../events/services/event';
import { EventResponseDto } from '../../../events/models/event.model';
import { isSameUser, resolveEventOwnerId } from '../../../events/utils/event-normalize';
import { AuthService } from '../../../auth/services/auth.service';
import { EnrollmentService } from '../../../enrollment/services/enrollment.service';
import { EventRole } from '../../../enrollment/models/enrollment.interface';

/**
 * Detalle de reportes de un evento puntual. El gating de UI (isOwner /
 * isEventAdmin) es solo cosmetico -- el control real de acceso vive en
 * ReportAccessGuard del backend (ms-reporting-analytics-service), que
 * responde 403 si ninguna de las dos condiciones se cumple. Mismo criterio
 * ya usado en ModalityConfigComponent para isOwner.
 */
@Component({
  selector: 'app-event-report-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './event-report-detail.html',
  styleUrls: ['./event-report-detail.scss']
})
export class EventReportDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly eventService = inject(EventService);
  private readonly authService = inject(AuthService);
  private readonly enrollmentService = inject(EnrollmentService);
  private readonly reportsService = inject(ReportsService);

  readonly tabs = ENROLLMENT_REPORT_TABS;

  eventId = signal<number | null>(null);
  event = signal<EventResponseDto | null>(null);
  isLoadingEvent = signal<boolean>(true);

  private eventAdminRole = signal<EventRole | null>(null);
  isOwner = computed(() => {
    const user = this.authService.getCurrentUser();
    const event = this.event();
    if (!user || !event) return false;
    return isSameUser(user.id, resolveEventOwnerId(event));
  });
  isEventAdmin = computed(() => this.eventAdminRole() === EventRole.ADMIN);
  canAccess = computed(() => this.isOwner() || this.isEventAdmin());

  summary = signal<EventSummaryReportResponse | null>(null);
  isLoadingSummary = signal<boolean>(false);

  activeFilter = signal<EnrollmentReportFilter>('ALL');
  enrollmentReport = signal<EnrollmentReportResponse | null>(null);
  isLoadingEnrollments = signal<boolean>(false);

  schedule = signal<ScheduleReportResponse | null>(null);
  isLoadingSchedule = signal<boolean>(false);

  isDownloading = signal<boolean>(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('eventId');
    const eventId = idParam ? Number(idParam) : NaN;
    if (isNaN(eventId)) {
      this.isLoadingEvent.set(false);
      this.error.set('Evento no válido.');
      return;
    }

    this.eventId.set(eventId);
    this.loadEvent(eventId);
    this.loadEventAdminRole(eventId);
  }

  private loadEvent(eventId: number): void {
    this.isLoadingEvent.set(true);
    this.eventService.getEventById(eventId).pipe(
      catchError(() => {
        this.error.set('No se pudo cargar la información del evento.');
        return of(null);
      }),
      finalize(() => this.isLoadingEvent.set(false))
    ).subscribe(event => {
      this.event.set(event);
      if (event) {
        this.loadSummary(eventId);
        this.loadEnrollments(eventId, this.activeFilter());
        this.loadSchedule(eventId);
      }
    });
  }

  private loadEventAdminRole(eventId: number): void {
    const userId = this.authService.getCurrentUser()?.id;
    if (userId == null) return;

    this.enrollmentService.getUserEventRole(eventId, Number(userId)).pipe(
      // Un 404 significa "sin rol asignado en este evento": resultado valido, no un error.
      catchError(() => of(null))
    ).subscribe(role => this.eventAdminRole.set(role?.roleInEvent ?? null));
  }

  private loadSummary(eventId: number): void {
    this.isLoadingSummary.set(true);
    this.reportsService.getEventSummary(eventId).pipe(
      catchError(() => of(null)),
      finalize(() => this.isLoadingSummary.set(false))
    ).subscribe(summary => this.summary.set(summary));
  }

  private loadSchedule(eventId: number): void {
    this.isLoadingSchedule.set(true);
    this.reportsService.getScheduleAvailability(eventId).pipe(
      catchError(() => of(null)),
      finalize(() => this.isLoadingSchedule.set(false))
    ).subscribe(schedule => this.schedule.set(schedule));
  }

  selectTab(filter: EnrollmentReportFilter): void {
    if (this.activeFilter() === filter) return;
    this.activeFilter.set(filter);
    const eventId = this.eventId();
    if (eventId != null) {
      this.loadEnrollments(eventId, filter);
    }
  }

  private loadEnrollments(eventId: number, filter: EnrollmentReportFilter): void {
    this.isLoadingEnrollments.set(true);
    this.reportsService.getEnrollmentReport(eventId, filter).pipe(
      catchError(() => {
        this.error.set('No se pudo cargar el listado de inscritos.');
        return of(null);
      }),
      finalize(() => this.isLoadingEnrollments.set(false))
    ).subscribe(report => this.enrollmentReport.set(report));
  }

  downloadGeneralPdf(): void {
    const eventId = this.eventId();
    const name = this.event()?.name ?? 'evento';
    if (eventId == null || this.isDownloading()) return;
    this.runDownload(this.reportsService.exportEventReportPdf(eventId), `Reporte_${this.slug(name)}_General.pdf`, 'application/pdf');
  }

  downloadGeneralExcel(): void {
    const eventId = this.eventId();
    const name = this.event()?.name ?? 'evento';
    if (eventId == null || this.isDownloading()) return;
    this.runDownload(
      this.reportsService.exportEventReportExcel(eventId),
      `Reporte_${this.slug(name)}_General.xlsx`,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
  }

  /**
   * Descarga el PDF de inscritos para el filtro indicado (por defecto, la
   * pestaña activa). Recibe el filtro explícito para que cada pestaña
   * pueda tener su propio botón de descarga sin necesidad de seleccionarla
   * primero -- así "todos los informes" (todos/aprobados/no aprobados/
   * con pista/sin pista) son descargables de un vistazo.
   */
  downloadEnrollmentPdf(filter: EnrollmentReportFilter = this.activeFilter()): void {
    const eventId = this.eventId();
    const name = this.event()?.name ?? 'evento';
    if (eventId == null || this.isDownloading()) return;
    this.runDownload(
      this.reportsService.exportEnrollmentPdf(eventId, filter),
      `Inscritos_${this.slug(name)}_${filter}.pdf`,
      'application/pdf'
    );
  }

  downloadSchedulePdf(): void {
    const eventId = this.eventId();
    const name = this.event()?.name ?? 'evento';
    if (eventId == null || this.isDownloading() || !this.schedule()?.available) return;
    this.runDownload(this.reportsService.exportSchedulePdf(eventId), `Cronograma_${this.slug(name)}.pdf`, 'application/pdf');
  }

  private runDownload(source: ReturnType<ReportsService['exportEventReportPdf']>, filename: string, mimeType: string): void {
    this.isDownloading.set(true);
    source.pipe(
      finalize(() => this.isDownloading.set(false))
    ).subscribe({
      next: (blob: Blob) => {
        const typedBlob = new Blob([blob], { type: mimeType });
        const url = window.URL.createObjectURL(typedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error al descargar el reporte', err);
        this.error.set('No se pudo descargar el reporte solicitado.');
      }
    });
  }

  private slug(text: string): string {
    return text.replace(/\s+/g, '_');
  }
}
