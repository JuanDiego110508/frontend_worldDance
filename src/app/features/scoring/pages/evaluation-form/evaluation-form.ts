import { Component, signal, computed, inject, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ScoringService } from '../../services/scoring.service';
import { AuthService } from '../../../auth/services/auth.service';
import { CriterionScoreRequest, EvaluationResponse } from '../../models/scoring.model';

interface CriterionFormRow {
  name: string;
  percentage: number;
  score: number;
}

@Component({
  selector: 'app-evaluation-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './evaluation-form.html',
  styleUrls: ['./evaluation-form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EvaluationFormComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly scoringService = inject(ScoringService);
  private readonly authService = inject(AuthService);

  eventId = signal<string>('');
  eventName = signal<string>('Unknown Event');
  modalityId = signal<string>('');
  enrollmentId = signal<string>('');
  participantName = signal<string>('Unknown Participant');
  evaluationId = signal<string | null>(null);

  isEditMode = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  userName = computed(() => {
    const user = this.authService.getCurrentUser();
    if (!user) return 'Judge';
    const first = user.firstName || '';
    const last = user.lastName || '';
    return `${first} ${last}`.trim() || user.email || 'Judge';
  });

  observations = signal<string>('');

  criteria = signal<CriterionFormRow[]>([
    { name: 'Technique', percentage: 40, score: 0 },
    { name: 'Artistry', percentage: 30, score: 0 },
    { name: 'Execution', percentage: 30, score: 0 }
  ]);

  totalPercentage = computed(() => {
    return this.criteria().reduce((sum, c) => sum + c.percentage, 0);
  });

  weightedScore = computed(() => {
    const total = this.criteria().reduce((sum, c) => sum + (c.score * c.percentage / 100), 0);
    return Math.round(total * 100) / 100;
  });

  isValid = computed(() => {
    const crit = this.criteria();
    const allScored = crit.every(c => c.score >= 0 && c.score <= 10 && c.name.trim() !== '');
    const percentOk = this.totalPercentage() === 100;
    return allScored && percentOk;
  });

  ngOnInit(): void {
    const params = this.route.snapshot.paramMap;
    this.eventId.set(params.get('eventId') ?? '');
    this.modalityId.set(params.get('modalityId') ?? '');
    this.enrollmentId.set(params.get('enrollmentId') ?? '');

    const state = history.state;
    if (state?.eventName) {
      this.eventName.set(state.eventName);
    } else {
      this.eventName.set(`Event #${this.eventId()}`);
    }
    
    if (state?.participantName) {
      this.participantName.set(state.participantName);
    } else {
      this.participantName.set(`Participant #${this.enrollmentId()}`);
    }

    const evalId = params.get('evaluationId');
    if (evalId) {
      this.evaluationId.set(evalId);
      this.isEditMode.set(true);
      this.loadEvaluation(evalId);
    }
  }

  private loadEvaluation(evaluationId: string): void {
    this.scoringService.getEvaluation(this.eventId(), this.modalityId(), evaluationId).subscribe({
      next: (evaluation: EvaluationResponse) => {
        this.observations.set(evaluation.observations || '');
        if (evaluation.scores && evaluation.scores.length > 0) {
          this.criteria.set(evaluation.scores.map(s => ({
            name: s.criterionName,
            percentage: s.percentage,
            score: s.score
          })));
        }
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Error loading evaluation');
      }
    });
  }

  addCriterion(): void {
    this.criteria.update(list => [...list, { name: '', percentage: 0, score: 0 }]);
  }

  removeCriterion(index: number): void {
    this.criteria.update(list => list.filter((_, i) => i !== index));
  }

  updateCriterion(index: number, field: keyof CriterionFormRow, value: string | number): void {
    this.criteria.update(list => list.map((c, i) => {
      if (i === index) {
        return { ...c, [field]: value };
      }
      return c;
    }));
  }

  onSubmit(): void {
    if (!this.isValid() || this.isSubmitting()) return;
    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const scores: CriterionScoreRequest[] = this.criteria().map(c => ({
      CriterionName: c.name,
      percentage: c.percentage,
      score: c.score
    }));

    const request = {
      scores,
      observations: this.observations() || undefined
    };

    const obs = this.isEditMode()
      ? this.scoringService.updateEvaluation(
          this.eventId(), this.modalityId(), this.evaluationId()!, request
        )
      : this.scoringService.registerEvaluation(
          this.eventId(), this.modalityId(), this.enrollmentId(), request
        );

    obs.subscribe({
      next: () => {
        this.successMessage.set(this.isEditMode() ? 'Evaluación actualizada exitosamente.' : 'Evaluación registrada exitosamente.');
        this.isSubmitting.set(false);
        setTimeout(() => this.router.navigate(['/scoring']), 1500);
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Error al guardar la evaluación.');
        this.isSubmitting.set(false);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/scoring']);
  }
}
