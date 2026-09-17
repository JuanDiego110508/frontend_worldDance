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
  imports: [CommonModule, RouterLink],
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

  userName = computed(() => {
    const user = this.authService.getCurrentUser();
    if (!user) return 'Judge';
    const first = user.firstName || '';
    const last = user.lastName || '';
    return `${first} ${last}`.trim() || user.email || 'Judge';
  });

  userInitials = computed(() => {
    const name = this.userName();
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  });

  results = computed(() => this.scoringService.results());

  sortedResults = computed(() => {
    return [...this.results()].sort((a, b) => (a.ranking ?? 999) - (b.ranking ?? 999));
  });

  hasPublished = computed(() => {
    return this.results().some(r => r.status === ResultStatus.PUBLISHED);
  });

  sessionStatus = signal<string | null>(null);

  ngOnInit(): void {
    const params = this.route.snapshot.paramMap;
    this.eventId.set(params.get('eventId') ?? '');
    this.modalityId.set(params.get('modalityId') ?? '');
    this.loadSession();
    this.loadResults();
  }

  private loadSession(): void {
    this.scoringService.getSession(this.eventId(), this.modalityId()).subscribe({
      next: (session) => this.sessionStatus.set(session.status),
      error: (err) => {
        if (err.message.includes('404')) {
          this.sessionStatus.set('NOT_CREATED');
        }
      }
    });
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

  onOpenSession(): void {
    const user = this.authService.getCurrentUser();
    if (!user) return;
    
    const evals = prompt('Ingrese la cantidad de participantes (evaluaciones esperadas):', '10');
    if (!evals) return;
    const judges = prompt('Ingrese la cantidad de jurados esperados:', '1');
    if (!judges) return;

    const request = {
      expectedEvaluations: parseInt(evals, 10),
      expectedJudges: parseInt(judges, 10),
      organizerId: user.id.toString()
    };

    this.scoringService.openSession(this.eventId(), this.modalityId(), request).subscribe({
      next: () => {
        this.publishMessage.set('Sesión abierta exitosamente.');
        this.loadSession();
      },
      error: (err) => this.errorMessage.set(err.message || 'Error abriendo sesión')
    });
  }

  onCloseSession(): void {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    if (!confirm('¿Estás seguro de cerrar la sesión de evaluación? No se podrán agregar más evaluaciones.')) return;

    this.scoringService.closeSession(this.eventId(), this.modalityId(), user.id.toString()).subscribe({
      next: () => {
        this.publishMessage.set('Sesión de evaluación cerrada.');
        this.loadSession();
        this.loadResults();
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Error closing session');
      }
    });
  }

  onPublish(): void {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    if (!confirm('¿Estás seguro de publicar los resultados de esta modalidad?')) return;

    this.scoringService.publishResults(this.eventId(), this.modalityId(), user.id.toString()).subscribe({
      next: () => {
        this.publishMessage.set('Resultados publicados exitosamente.');
        this.loadSession();
        this.loadResults();
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Error publishing results');
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/scoring']);
  }
}
