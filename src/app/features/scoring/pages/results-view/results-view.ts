import { Component, signal, computed, inject, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ScoringService } from '../../services/scoring.service';
import { AuthService } from '../../../auth/services/auth.service';
import { ResultResponse } from '../../models/scoring.model';
import { ResultStatus } from '../../enums/scoring-enums';
import { RESULT_STATUS_LABELS } from '../../enums/scoring-enums';

@Component({
  selector: 'app-results-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './results-view.html',
  styleUrls: ['./results-view.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResultsViewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly scoringService = inject(ScoringService);
  private readonly authService = inject(AuthService);

  eventId = signal<string>('');
  modalityId = signal<string>('');
  isLoading = signal<boolean>(true);
  errorMessage = signal<string>('');
  publishMessage = signal<string>('');

  results = computed(() => this.scoringService.results());

  sortedResults = computed(() => {
    return [...this.results()].sort((a, b) => (a.ranking ?? 999) - (b.ranking ?? 999));
  });

  hasPublished = computed(() => {
    return this.results().some(r => r.status === ResultStatus.PUBLISHED);
  });

  ngOnInit(): void {
    const params = this.route.snapshot.paramMap;
    this.eventId.set(params.get('eventId') ?? '');
    this.modalityId.set(params.get('modalityId') ?? '');
    this.loadResults();
  }

  private loadResults(): void {
    this.isLoading.set(true);
    this.scoringService.getResultsByModality(this.eventId(), this.modalityId()).subscribe({
      next: () => this.isLoading.set(false),
      error: (err) => {
        this.errorMessage.set(err.message || 'Error loading results');
        this.isLoading.set(false);
      }
    });
  }

  getStatusLabel(status: ResultStatus): string {
    return RESULT_STATUS_LABELS[status] || status;
  }

  getStatusClass(status: ResultStatus): string {
    switch (status) {
      case ResultStatus.PUBLISHED: return 'status-published';
      case ResultStatus.READY: return 'status-ready';
      case ResultStatus.PENDING: return 'status-pending';
      default: return '';
    }
  }

  getRankingClass(ranking: number): string {
    if (ranking === 1) return 'rank-gold';
    if (ranking === 2) return 'rank-silver';
    if (ranking === 3) return 'rank-bronze';
    return '';
  }

  getRankingEmoji(ranking: number): string {
    if (ranking === 1) return '🥇';
    if (ranking === 2) return '🥈';
    if (ranking === 3) return '🥉';
    return `#${ranking}`;
  }

  onPublish(): void {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    if (!confirm('¿Estás seguro de publicar los resultados de esta modalidad?')) return;

    this.scoringService.publishResults(this.eventId(), this.modalityId(), user.id.toString()).subscribe({
      next: () => {
        this.publishMessage.set('Resultados publicados exitosamente.');
        this.loadResults();
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Error publishing results');
      }
    });
  }

  onCloseSession(): void {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    if (!confirm('¿Estás seguro de cerrar la sesión de evaluación? No se podrán agregar más evaluaciones.')) return;

    this.scoringService.closeSession(this.eventId(), this.modalityId(), user.id.toString()).subscribe({
      next: () => {
        this.publishMessage.set('Sesión de evaluación cerrada.');
        this.loadResults();
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Error closing session');
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/scoring']);
  }
}
