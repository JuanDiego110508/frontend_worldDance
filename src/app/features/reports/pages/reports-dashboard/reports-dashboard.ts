import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportsService } from '../../services/reports.service';
import { DashboardSummaryResponse } from '../../models/reports.model';
import { EventService } from '../../../events/services/event';
import { EventResponseDto } from '../../../events/models/event.model';
import { catchError, finalize, of } from 'rxjs';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-reports-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './reports-dashboard.html',
  styleUrls: ['./reports-dashboard.scss']
})
export class ReportsDashboardComponent implements OnInit {
  private readonly reportsService = inject(ReportsService);
  private readonly eventService = inject(EventService);

  summary = signal<DashboardSummaryResponse | null>(null);
  events = signal<EventResponseDto[]>([]);
  isLoadingSummary = signal<boolean>(true);
  isLoadingEvents = signal<boolean>(true);
  isDownloading = signal<boolean>(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadSummary();
    this.loadEvents();
  }

  private loadSummary(): void {
    this.isLoadingSummary.set(true);
    this.reportsService.getDashboardSummary().pipe(
      catchError(err => {
        console.error('Error loading dashboard summary', err);
        this.error.set('No se pudo cargar el resumen del panel.');
        return of(null);
      }),
      finalize(() => this.isLoadingSummary.set(false))
    ).subscribe(data => {
      if (data) {
        this.summary.set(data);
      }
    });
  }

  private loadEvents(): void {
    this.isLoadingEvents.set(true);
    // 'MINE': el backend (ms-event-category) ya filtra por dueño via X-User-Id,
    // asi que aqui solo se listan los eventos propios (antes se traian TODOS
    // los eventos sin filtrar, exponiendo descargas de eventos ajenos).
    this.eventService.getEventsPage(0, 100, 'MINE').pipe(
      catchError(err => {
        console.error('Error loading events', err);
        return of(null);
      }),
      finalize(() => this.isLoadingEvents.set(false))
    ).subscribe(page => {
      this.events.set(page?.content ?? []);
    });
  }

  eventId(event: EventResponseDto): number {
    return event.idEvent ?? event.id ?? event.IdEvent ?? 0;
  }

  downloadPdf(eventId: number, eventName: string): void {
    if (this.isDownloading()) return;
    this.isDownloading.set(true);

    this.reportsService.exportEventReportPdf(eventId).pipe(
      finalize(() => this.isDownloading.set(false))
    ).subscribe({
      next: (blob: Blob) => {
        const pdfBlob = new Blob([blob], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Reporte_${eventName.replace(/\s+/g, '_')}_PDF.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error downloading PDF', err);
        this.error.set('Error al descargar el PDF del evento.');
      }
    });
  }

  downloadExcel(eventId: number, eventName: string): void {
    if (this.isDownloading()) return;
    this.isDownloading.set(true);

    this.reportsService.exportEventReportExcel(eventId).pipe(
      finalize(() => this.isDownloading.set(false))
    ).subscribe({
      next: (blob: Blob) => {
        const excelBlob = new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(excelBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Reporte_${eventName.replace(/\s+/g, '_')}_Excel.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error downloading Excel', err);
        this.error.set('Error al descargar el Excel del evento.');
      }
    });
  }
}
