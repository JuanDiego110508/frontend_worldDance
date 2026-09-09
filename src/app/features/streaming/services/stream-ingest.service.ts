import { Injectable, computed, signal } from '@angular/core';

export type IngestState = 'idle' | 'connecting' | 'publishing' | 'error';
export type IngestConnectionState = 'new' | 'connecting' | 'connected' | 'closed' | 'failed';

const LOG_PREFIX = '[Ingest]';

/** Candidatos de mimeType para MediaRecorder, en orden de preferencia (el primero soportado gana). */
const MIME_TYPE_CANDIDATES = [
  'video/webm;codecs=h264,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm;codecs=vp9,opus',
  'video/webm'
];

/**
 * Cada cuánto se generan chunks de MediaRecorder y se envían por el socket. Chunks más pequeños y
 * frecuentes reducen el tamaño de cada frame de WebSocket (ver límite en StreamIngestService.publish
 * y en el gateway/ffmpeg-manager) y bajan la latencia percibida en vivo.
 */
const RECORDER_TIMESLICE_MS = 250;

/** Backoff de reconexión ante un cierre inesperado del socket (no solicitado por stop()). */
const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 8000;

/**
 * Cliente de ingesta de cámara/pantalla por WebSocket (TCP puro), en reemplazo de WHIP/WebRTC.
 * El túnel de Cloudflare descarta el tráfico UDP que WebRTC/ICE necesita, así que en vez de
 * negociar una conexión RTC directa con SRS, el navegador graba el MediaStream local con
 * MediaRecorder y envía los chunks binarios (WebM) por un WebSocket hacia ffmpeg-manager, que los
 * transcodifica y reempuja como RTMP. Todo el transporte de red es HTTP/WS estándar, sin UDP.
 *
 * Si el socket se cae de forma inesperada (red inestable, reinicio del contenedor, etc.) mientras
 * el MediaStream local sigue vivo, el servicio reintenta la conexión solo con backoff en vez de
 * quedar en estado de error permanente: quien lo consuma (stream-admin) no necesita destruir ni
 * recrear ningún componente para recuperarse.
 */
@Injectable({
  providedIn: 'root'
})
export class StreamIngestService {
  private socket: WebSocket | null = null;
  private recorder: MediaRecorder | null = null;

  private lastWsUrl: string | null = null;
  private lastStream: MediaStream | null = null;
  private lastMimeType: string | null = null;
  private intentionalStop = true;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  /** Resultado de la conexión del WebSocket de ingesta. No implica que MediaRecorder ya esté grabando. */
  readonly state = signal<IngestState>('idle');
  readonly errorMessage = signal<string>('');

  /** Estado real del transporte WebSocket. */
  readonly connectionState = signal<IngestConnectionState>('new');

  /** true solo cuando el socket está abierto y MediaRecorder está enviando chunks. */
  readonly isFlowing = computed(() => this.state() === 'publishing' && this.connectionState() === 'connected');

  publish(wsUrl: string, mediaStream: MediaStream): Promise<void> {
    if (this.state() === 'connecting' || this.state() === 'publishing') {
      return Promise.reject(new Error('Ya hay una ingesta en curso.'));
    }

    const mimeType = MIME_TYPE_CANDIDATES.find(type => MediaRecorder.isTypeSupported(type));
    if (!mimeType) {
      const message = 'Este navegador no soporta la grabación de video necesaria (WebM + H.264/VP8/VP9 y Opus).';
      this.state.set('error');
      this.errorMessage.set(message);
      return Promise.reject(new Error(message));
    }

    this.clearReconnectTimer();
    this.lastWsUrl = wsUrl;
    this.lastStream = mediaStream;
    this.lastMimeType = mimeType;
    this.intentionalStop = false;
    this.reconnectAttempts = 0;

    return this.connect(wsUrl, mediaStream, mimeType, /* isReconnect */ false);
  }

  async stop(): Promise<void> {
    this.intentionalStop = true;
    this.clearReconnectTimer();
    this.lastWsUrl = null;
    this.lastStream = null;
    this.lastMimeType = null;
    this.reconnectAttempts = 0;

    this.cleanupRecorder();
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      this.socket.close(1000, 'client-stop');
    }
    this.socket = null;
    this.state.set('idle');
    this.connectionState.set('new');
    this.errorMessage.set('');
  }

  private connect(wsUrl: string, mediaStream: MediaStream, mimeType: string, isReconnect: boolean): Promise<void> {
    this.state.set('connecting');
    this.connectionState.set('connecting');
    if (!isReconnect) {
      this.errorMessage.set('');
    }
    console.info(`${LOG_PREFIX} ${isReconnect ? 'Reconectando' : 'Conectando'} WebSocket de ingesta hacia`, wsUrl, `(mimeType=${mimeType})`);

    return new Promise((resolve, reject) => {
      const socket = new WebSocket(wsUrl);
      this.socket = socket;
      let settled = false;

      const settleOk = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      const settleErr = (err: Error) => {
        if (settled) return;
        settled = true;
        reject(err);
      };

      socket.addEventListener('open', () => {
        console.info(`${LOG_PREFIX} WebSocket de ingesta abierto.`);
        this.reconnectAttempts = 0;
        this.connectionState.set('connected');
        this.state.set('publishing');
        this.errorMessage.set('');
        this.startRecording(mediaStream, socket, mimeType);
        settleOk();
      });

      socket.addEventListener('error', () => {
        console.error(`${LOG_PREFIX} Error de transporte en el WebSocket de ingesta.`);
        settleErr(new Error('No fue posible conectar el WebSocket de ingesta con el servidor.'));
      });

      socket.addEventListener('close', (event) => {
        console.info(`${LOG_PREFIX} WebSocket de ingesta cerrado (code=${event.code}, reason="${event.reason}").`);
        this.cleanupRecorder();
        this.connectionState.set('closed');

        if (this.intentionalStop) {
          settleErr(new Error('Ingesta detenida.'));
          return;
        }

        const trackStillLive = this.lastStream?.getTracks().some(track => track.readyState === 'live') ?? false;
        if (trackStillLive && this.lastWsUrl && this.lastMimeType) {
          this.scheduleReconnect();
        } else {
          this.state.set('idle');
          this.errorMessage.set('');
        }

        settleErr(new Error('El WebSocket de ingesta se cerró inesperadamente.'));
      });
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    this.reconnectAttempts += 1;
    const delay = Math.min(RECONNECT_BASE_DELAY_MS * 2 ** (this.reconnectAttempts - 1), RECONNECT_MAX_DELAY_MS);

    this.state.set('connecting');
    this.errorMessage.set(
      `Se perdió la conexión de ingesta; reintentando en ${Math.round(delay / 1000)}s (intento ${this.reconnectAttempts})...`
    );
    console.warn(`${LOG_PREFIX} Reintentando conexión en ${delay}ms (intento ${this.reconnectAttempts}).`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.intentionalStop || !this.lastWsUrl || !this.lastStream || !this.lastMimeType) return;
      this.connect(this.lastWsUrl, this.lastStream, this.lastMimeType, /* isReconnect */ true).catch(() => {
        // El propio 'close' handler ya decide si se reintenta de nuevo o se abandona.
      });
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private startRecording(stream: MediaStream, socket: WebSocket, mimeType: string): void {
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_500_000 });
    this.recorder = recorder;

    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
        socket.send(event.data);
      }
    });

    recorder.addEventListener('error', (event) => {
      console.error(`${LOG_PREFIX} Error en MediaRecorder:`, event);
    });

    recorder.start(RECORDER_TIMESLICE_MS);
  }

  private cleanupRecorder(): void {
    if (this.recorder && this.recorder.state !== 'inactive') {
      try {
        this.recorder.stop();
      } catch {
        // Ya pudo haberse detenido junto con el track/stream subyacente.
      }
    }
    this.recorder = null;
  }
}
