import { Component, ChangeDetectionStrategy, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { StatusStream, StreamPublicResponse } from '../../models/stream.model';
import { OverlayDisplayComponent } from '../overlay-display/overlay-display';

/** Reproductor público: iframe de Kick (video + chat) con el overlay del marcador superpuesto. */
@Component({
  selector: 'app-viewer-player',
  standalone: true,
  imports: [CommonModule, OverlayDisplayComponent],
  templateUrl: './viewer-player.html',
  styleUrls: ['./viewer-player.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ViewerPlayerComponent {
  private readonly sanitizer = inject(DomSanitizer);

  readonly stream = input<StreamPublicResponse | null>(null);
  readonly StatusStream = StatusStream;

  readonly safePlayerUrl = computed<SafeResourceUrl | null>(() => {
    const url = this.stream()?.playerIframeUrl;
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });

  readonly safeChatUrl = computed<SafeResourceUrl | null>(() => {
    const url = this.stream()?.chatIframeUrl;
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });
}
