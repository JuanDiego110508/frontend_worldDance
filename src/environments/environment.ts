// URL por defecto: el tunel de Cloudflare hacia el API Gateway (unico backend
// que el equipo puede alcanzar desde sus propias redes, ya que este no corre
// en sus maquinas). Si alguien necesita apuntar a un backend distinto (p. ej.
// su propio docker-compose local), puede sobreescribirlo sin tocar este
// archivo versionado: abrir la consola del navegador y ejecutar
//   localStorage.setItem('apiUrl', 'http://localhost:8080/api/v1')
// y recargar. Para volver al valor por defecto: localStorage.removeItem('apiUrl').
const apiUrlOverride = typeof localStorage !== 'undefined' ? localStorage.getItem('apiUrl') : null;

export const environment = {
  production: false,
  apiUrl: apiUrlOverride || 'https://api.worlddance.win/api/v1'
};
