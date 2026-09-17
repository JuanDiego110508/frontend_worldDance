import { Component, ChangeDetectionStrategy, signal, computed, inject, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgentChatService, AgentChatMessage } from '../../../core/services/agent-chat.service';

type DisplayMessage = (AgentChatMessage | { role: 'thinking'; content: string }) & { id: number };

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
    return { ...message, id: this.nextMessageId++ };
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
