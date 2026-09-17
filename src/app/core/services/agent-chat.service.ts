import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AgentChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AgentStatusResponse {
  status: string;
  mcp: { online: boolean; mode: string };
  llm: { model: string };
}

interface AgentHistoryResponse {
  messages: AgentChatMessage[];
}

interface AgentChatResponse {
  success: boolean;
  response: string;
}

/**
 * Cliente del backend del Agente IA (service-agentia-backend).
 * `agentApiUrl` es relativo en producción ('/agent'): Nginx (nginx.conf) hace
 * proxy_pass hacia service-agentia-backend:5000 dentro de la red de Docker,
 * igual que /api/ hace proxy hacia api-gateway. Así el navegador nunca depende
 * de un puerto fijo del contenedor del agente.
 */
@Injectable({
  providedIn: 'root'
})
export class AgentChatService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.agentApiUrl;

  getStatus(): Observable<AgentStatusResponse> {
    return this.http.get<AgentStatusResponse>(`${this.baseUrl}/api/status`);
  }

  getHistory(): Observable<AgentHistoryResponse> {
    return this.http.get<AgentHistoryResponse>(`${this.baseUrl}/api/history`);
  }

  sendMessage(message: string): Observable<AgentChatResponse> {
    return this.http.post<AgentChatResponse>(`${this.baseUrl}/api/chat`, { message });
  }

  clearHistory(): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.baseUrl}/api/history/clear`, {});
  }
}
