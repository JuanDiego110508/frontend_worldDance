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
   * URL de WebSocket para la ingesta de cámara: wss://api.worlddance.win/ws/ingest/{eventId}.
   * TCP puro (no WHIP/WebRTC) porque el túnel de Cloudflare descarta el UDP de ICE.
   */
  ingestUrl: string;
  channelUrl: string;
  /** Título/descripción propios de la sesión de transmisión (distintos del nombre del evento). */
  title?: string;
  description?: string;
  /** true si hay un token OAuth de Kick guardado y todavía vigente (no expirado). */
  kickTokenLinked?: boolean;
  /** Instant ISO-8601 de expiración del token; ausente/null si nunca se vinculó Kick. */
  kickTokenExpiresAt?: string | null;
  timestamps: StreamTimestamps;
}

/** Coincide con UpdateStreamConfigRequestDto (PUT /stream/config/{eventId}). */
export interface UpdateStreamConfigRequest {
  channelUrl: string;
  rtmpUrl: string;
  streamKey: string;
  title?: string;
  description?: string;
}

/** Coincide con LiveStreamResponseDto (GET /stream/live, público, sin autenticación). */
export interface LiveStreamSummary {
  eventId: number;
  eventName: string;
}

/**
 * GET /stream/status/{eventId} devuelve un passthrough crudo del ffmpeg-manager
 * (HttpGlobalResponse<Map<String,Object>>). Estos son los campos que ffmpeg-manager realmente
 * envía hoy (ver GET /api/stream/status/:streamId) — no incluye bitrate/latencia/espectadores:
 * ese monitoreo no existe todavía, así que el frontend no debe fingir que sí.
 */
export interface StreamStatus {
  streamId?: string;
  active?: boolean;
  status?: string;
  sourceType?: string;
  destinationUrl?: string;
  startedAt?: string;
  message?: string;
  [key: string]: unknown;
}
