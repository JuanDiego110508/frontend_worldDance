import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MusicTrackService } from '../../services/music-track.service';
import { MusicTrackResponseDto } from '../../models/music-track.model';
import { MusicPlayerComponent } from '../../components/music-player/music-player';
import { MusicUploadFormComponent } from '../../components/music-upload-form/music-upload-form';
import { EnrollmentService } from '../../../enrollment/services/enrollment.service';
import { EnrollmentResponseDto, EventRole } from '../../../enrollment/models/enrollment.interface';
import { EventService } from '../../../events/services/event';
import { isSameUser, resolveEventOwnerId } from '../../../events/utils/event-normalize';
import { AuthService } from '../../../auth/services/auth.service';

@Component({
  selector: 'app-music-manager',
  standalone: true,
  imports: [CommonModule, RouterLink, MusicPlayerComponent, MusicUploadFormComponent],
  templateUrl: './music-manager.html',
  styleUrls: ['./music-manager.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MusicManagerComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly musicTrackService = inject(MusicTrackService);
  private readonly enrollmentService = inject(EnrollmentService);
  private readonly eventService = inject(EventService);
  private readonly authService = inject(AuthService);

  enrollmentId = signal<number | null>(null);
  enrollment = signal<EnrollmentResponseDto | null>(null);
  track = signal<MusicTrackResponseDto | null>(null);

  isOwner = signal(false);
  canView = signal(false);

  isLoading = signal(true);
  errorMessage = signal('');

  ngOnInit(): void {
    const eventIdParam = this.route.snapshot.params['eventId'];
    const enrollmentIdParam = this.route.snapshot.params['enrollmentId'];
    const eventId = Number(eventIdParam);
    const enrollmentId = Number(enrollmentIdParam);

    if (!eventIdParam || !enrollmentIdParam || Number.isNaN(eventId) || Number.isNaN(enrollmentId)) {
      this.errorMessage.set('No se especificó una inscripción válida.');
      this.isLoading.set(false);
      return;
    }

    this.enrollmentId.set(enrollmentId);
    this.loadEnrollmentAndPermissions(eventId, enrollmentId);
  }

  /**
   * El backend no expone un `GET /enrollments/{id}`, así que la inscripción se localiza filtrando
   * la lista del evento (`GET /enrollments/event/{eventId}`), que sí existe. Por eso la ruta de
   * esta página lleva tanto el `eventId` como el `enrollmentId`.
   */
  private loadEnrollmentAndPermissions(eventId: number, enrollmentId: number): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.enrollmentService.getEnrollmentsByEvent(eventId).subscribe({
      next: (enrollments) => {
        const enrollment = enrollments.find(e => e.enrollmentId === enrollmentId) ?? null;
        if (!enrollment) {
          this.errorMessage.set('No se encontró la inscripción solicitada en este evento.');
          this.isLoading.set(false);
          return;
        }
        this.enrollment.set(enrollment);
        this.resolvePermissions(enrollment);
      },
      error: (error) => {
        this.errorMessage.set(error?.message ?? 'No fue posible cargar la inscripción.');
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Determina si el usuario actual puede ver la pista: el dueño de la inscripción, el organizador
   * del evento, o un rol ADMIN/STAFF en el evento. Esto es solo para UX (ocultar controles que de
   * todas formas el backend rechazaría) — la autorización real la aplica ms-music-media.
   */
  private resolvePermissions(enrollment: EnrollmentResponseDto): void {
    const currentUserId = this.authService.getCurrentUser()?.id ?? null;
    const isOwner = isSameUser(currentUserId, enrollment.userId);
    this.isOwner.set(isOwner);

    if (isOwner) {
      this.canView.set(true);
      this.loadMetadata(enrollment.enrollmentId);
      return;
    }

    forkJoin({
      event: this.eventService.getEventById(enrollment.eventId).pipe(catchError(() => of(null))),
      role: this.enrollmentService.getUserEventRole(enrollment.eventId, currentUserId ?? 0).pipe(catchError(() => of(null)))
    }).subscribe(({ event, role }) => {
      const isOrganizer = isSameUser(currentUserId, resolveEventOwnerId(event));
      const isStaffOrAdmin = role?.roleInEvent === EventRole.ADMIN || role?.roleInEvent === EventRole.STAFF;
      this.canView.set(isOrganizer || isStaffOrAdmin);

      if (this.canView()) {
        this.loadMetadata(enrollment.enrollmentId);
      } else {
        this.isLoading.set(false);
      }
    });
  }

  private loadMetadata(enrollmentId: number): void {
    this.musicTrackService.getMetadata(enrollmentId).subscribe({
      next: (track) => {
        this.track.set(track);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error?.message ?? 'No fue posible cargar la pista musical.');
        this.isLoading.set(false);
      }
    });
  }

  onUploaded(track: MusicTrackResponseDto): void {
    this.track.set(track);
  }

  get canUpload(): boolean {
    return this.isOwner() && this.enrollment()?.status === 'APPROVED';
  }
}
