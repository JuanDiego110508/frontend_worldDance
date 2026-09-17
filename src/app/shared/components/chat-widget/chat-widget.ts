import { Component, ChangeDetectionStrategy, signal, computed, inject, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Observable, finalize } from 'rxjs';
import { AgentChatService, AgentChatMessage } from '../../../core/services/agent-chat.service';
import { ReportsService } from '../../../features/reports/services/reports.service';
import { DownloadLink, ParsedMessage, parseMessageContent } from './chat-message-formatter';

type DisplayMessage = (AgentChatMessage | { role: 'thinking'; content: string }) & {
  id: number;
  timestamp: number;
  parsed: ParsedMessage | null;
};

interface ChatSuggestion {
  command: string;
  description: string;
  insert: string;
}

/** Atajos de prompts frecuentes, sugeridos al escribir "/". No son comandos que
 * interprete el backend: solo insertan un texto de partida para que el usuario
 * lo complete (ej. con el nombre del evento) antes de enviarlo. */
const CHAT_SUGGESTIONS: ChatSuggestion[] = [
  { command: '/cronograma', description: 'Consultar el cronograma de un evento', insert: 'Muéstrame el cronograma de ' },
  { command: '/generar-cronograma', description: 'Generar el cronograma de un evento', insert: 'Genera el cronograma de ' },
  { command: '/eventos', description: 'Listar eventos disponibles', insert: '¿Qué eventos hay disponibles?' },
  { command: '/resultados', description: 'Consultar resultados de una modalidad', insert: 'Muéstrame los resultados de ' },
  { command: '/ranking', description: 'Consultar el ranking de un evento', insert: 'Muéstrame el ranking de ' },
  { command: '/reporte', description: 'Exportar un reporte del evento', insert: 'Exporta el reporte en PDF de ' },
  { command: '/ayuda', description: 'Ver qué puede hacer el asistente', insert: '¿Qué puedes hacer?' }
];

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-widget.html',
  styleUrl: './chat-widget.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatWidgetComponent implements AfterViewChecked {
  private readonly agentChat = inject(AgentChatService);
  private readonly reportsService = inject(ReportsService);
  private readonly http = inject(HttpClient);

  @ViewChild('messagesEl') private messagesEl?: ElementRef<HTMLDivElement>;
  @ViewChild('inputEl') private inputEl?: ElementRef<HTMLInputElement>;
  private shouldScroll = false;
  private nextMessageId = 0;

  readonly isOpen = signal(false);
  readonly isOnline = signal(false);
  readonly isSending = signal(false);
  readonly messages = signal<DisplayMessage[]>([]);
  readonly draft = signal('');

  readonly suggestions = computed<ChatSuggestion[]>(() => {
    const text = this.draft();
    if (!text.startsWith('/')) return [];

    const query = text.slice(1).toLowerCase();
    return CHAT_SUGGESTIONS.filter(s => s.command.slice(1).toLowerCase().startsWith(query));
  });

  readonly statusText = computed(() =>
    this.isOnline() ? 'En línea • Competiciones & Pistas' : 'Reconectando…'
  );

  private historyLoaded = false;
  private statusTimer?: ReturnType<typeof setInterval>;

  toggle(): void {
    this.isOpen.update(v => !v);

    if (this.isOpen()) {
      this.checkStatus();
      if (!this.statusTimer) {
        this.statusTimer = setInterval(() => this.checkStatus(), 10000);
      }
      if (!this.historyLoaded) {
        this.loadHistory();
      }
    }
  }

  close(): void {
    this.isOpen.set(false);
  }

  private checkStatus(): void {
    this.agentChat.getStatus().subscribe({
      next: () => this.isOnline.set(true),
      error: () => this.isOnline.set(false)
    });
  }

  private loadHistory(): void {
    this.historyLoaded = true;
    this.agentChat.getHistory().subscribe({
      next: ({ messages }) => {
        this.messages.set(
          messages.length
            ? messages.map(m => this.withId(m))
            : [this.withId({ role: 'assistant', content: '¡Hola! Soy el asistente IA de World Dance. ¿En qué puedo ayudarte?' })]
        );
        this.scrollToBottom();
      },
      error: () => {
        this.messages.set([
          this.withId({ role: 'assistant', content: '¡Hola! Soy el asistente IA de World Dance. (No se pudo cargar el historial)' })
        ]);
      }
    });
  }

  applySuggestion(suggestion: ChatSuggestion): void {
    this.draft.set(suggestion.insert);
    this.inputEl?.nativeElement.focus();
  }

  send(): void {
    const text = this.draft().trim();
    if (!text || this.isSending()) return;

    this.draft.set('');
    this.messages.update(msgs => [
      ...msgs,
      this.withId({ role: 'user', content: text }),
      this.withId({ role: 'thinking', content: 'Pensando...' })
    ]);
    this.isSending.set(true);
    this.scrollToBottom();

    this.agentChat.sendMessage(text).subscribe({
      next: ({ response }) => {
        this.replaceThinking(this.withId({ role: 'assistant', content: response }));
      },
      error: (err) => {
        const message = err?.status === 0
          ? 'Error de conexión con el servidor. Verifica que el backend esté ejecutándose.'
          : `Error: ${err?.error?.error || 'Desconocido'}`;
        this.replaceThinking(this.withId({ role: 'assistant', content: message }));
      }
    });
  }

  private withId(message: AgentChatMessage | { role: 'thinking'; content: string }): DisplayMessage {
    return {
      ...message,
      id: this.nextMessageId++,
      timestamp: Date.now(),
      parsed: message.role === 'assistant' ? parseMessageContent(message.content) : null
    };
  }

  formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private readonly downloadingUrls = signal<Set<string>>(new Set());

  isDownloading(link: DownloadLink): boolean {
    return this.downloadingUrls().has(link.url);
  }

  /** Descarga un reporte que el asistente generó (ver wd_exportar_reporte_pdf/
   * excel): reusa ReportsService -- el mismo GET con responseType 'blob' que
   * ya usa la página de Reportes -- para que viaje con el Bearer token de
   * quien está chateando (el interceptor lo agrega solo), no con las
   * credenciales de la cuenta de servicio del agente. */
  download(link: DownloadLink): void {
    if (this.isDownloading(link)) return;
    this.downloadingUrls.update(set => new Set(set).add(link.url));

    const source: Observable<Blob> = link.eventId != null
      ? link.format === 'pdf'
        ? this.reportsService.exportEventReportPdf(link.eventId)
        : this.reportsService.exportEventReportExcel(link.eventId)
      : this.http.get(link.url, { responseType: 'blob' });

    const mimeType = link.format === 'pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const filename = `Reporte_Evento_${link.eventId ?? 'WorldDance'}.${link.format === 'pdf' ? 'pdf' : 'xlsx'}`;

    source.pipe(
      finalize(() => this.downloadingUrls.update(set => {
        const next = new Set(set);
        next.delete(link.url);
        return next;
      }))
    ).subscribe({
      next: (blob) => {
        const typedBlob = new Blob([blob], { type: mimeType });
        const objectUrl = window.URL.createObjectURL(typedBlob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(objectUrl);
      },
      error: (err) => {
        console.error('Error al descargar el reporte del asistente', err);
        this.messages.update(msgs => [
          ...msgs,
          this.withId({ role: 'assistant', content: `No se pudo descargar el archivo. Puedes intentar abrir el enlace directamente: ${link.url}` })
        ]);
        this.scrollToBottom();
      }
    });
  }

  private replaceThinking(final: DisplayMessage): void {
    this.messages.update(msgs => [...msgs.filter(m => m.role !== 'thinking'), final]);
    this.isSending.set(false);
    this.scrollToBottom();
  }

  clearHistory(): void {
    this.agentChat.clearHistory().subscribe({
      next: () => {
        this.messages.set([this.withId({ role: 'assistant', content: 'Historial limpiado. ¿De qué más quieres hablar?' })]);
      },
      error: () => {
        this.messages.update(msgs => [...msgs, this.withId({ role: 'assistant', content: 'No se pudo limpiar el historial.' })]);
      }
    });
  }

  private scrollToBottom(): void {
    this.shouldScroll = true;
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll && this.messagesEl) {
      this.messagesEl.nativeElement.scrollTop = this.messagesEl.nativeElement.scrollHeight;
      this.shouldScroll = false;
    }
  }
}
