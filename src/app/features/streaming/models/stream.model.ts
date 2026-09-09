/** Envoltorio genérico real de ms-notification-streaming (idéntico al de los demás microservicios). */
export interface HttpGlobalResponse<T> {
  data: T;
  message: string;
}

/** Coincide con StatusStream de wd-lib-common. */
export enum StatusStream {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  LIVE = 'LIVE',
  FINISHED = 'FINISHED'
}

/** Coincide con la entidad LiveOverlayData (el "marcador" de la competencia). */
export interface LiveOverlayData {
  currentSlotId: string;
  participantLabel: string;
  realTimeScore: number;
  isActive: boolean;
}

/** Coincide con la entidad VodInfo. */
export interface VodInfo {
  isAvailable: boolean;
  recordingUrl: string;
}

/** Coincide con la entidad Timestamps. */
export interface StreamTimestamps {
  createdAt: string;
  scheduledFor: string;
  startedAt: string;
  endAt: string;
}

/** Coincide con CreateStreamSessionRequestDto. */
export interface CreateStreamSessionRequest {
  eventId: number;
  provider: string;
  channelUrl: string;
  rtmpUrl: string;
  streamKey: string;
  /** Instant ISO-8601, ej. 2026-09-10T20:00:00Z */
  scheduleFor: string;
}

/** Coincide con ToggleStreamStateRequestDto. */
export interface ToggleStreamStateRequest {
  enable: boolean;
  sourceType: string;
  destinationUrl?: string;
}

/** Coincide con UpdateOverlayRequesDto (el nombre real del DTO backend trae ese typo). */
export interface UpdateOverlayRequest {
  currentSlotId: string;
  participantLabel: string;
  realTimeScore: number;
  isActive?: boolean;
}

/** Coincide con FinishStreamRequestDto. */
export interface FinishStreamRequest {
  isAvailable?: boolean;
  recordingUrl?: string;
}

/** Coincide con StreamPublicResponseDto (vista del espectador). */
export interface StreamPublicResponse {
  id: string;
  eventId: number;
  statusStream: StatusStream;
  provider: string;
  playerIframeUrl: string;
  chatIframeUrl: string;
  liveOverlayData: LiveOverlayData;
  vodInfo: VodInfo;
}

/** Coincide con StreamAdminResponseDto (vista del operador: incluye credenciales de ingesta). */
export interface StreamAdminResponse extends StreamPublicResponse {
  rtmpUrl: string;
  streamKey: string;
  /**
   * URL de WebSocket para la ingesta de cámara/pantalla: wss://api.worlddance.win/ws/ingest/{eventId}.
   * TCP puro (no WHIP/WebRTC) porque el túnel de Cloudflare descarta el UDP de ICE.
   */
  ingestUrl: string;
  channelUrl: string;
  timestamps: StreamTimestamps;
}

/** Coincide con LiveStreamResponseDto (GET /stream/live, público, sin autenticación). */
export interface LiveStreamSummary {
  eventId: number;
  eventName: string;
}

/**
 * GET /stream/status/{eventId} devuelve un passthrough crudo del ffmpeg-manager
 * (HttpGlobalResponse<Map<String,Object>>), sin forma fija garantizada por el backend.
 */
export interface StreamStatus {
  streamId?: string;
  active?: boolean;
  status?: string;
  bitrate?: number;
  viewers?: number;
  latency?: number;
  message?: string;
  [key: string]: unknown;
}
