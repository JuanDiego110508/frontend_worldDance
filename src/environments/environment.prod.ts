export const environment = {
  production: true,
  // Ruta relativa: Nginx (nginx.conf) sirve el frontend y hace proxy_pass de /api/
  // hacia api-gateway:8080 dentro de la red de Docker. Así el navegador siempre pide
  // al mismo host:puerto donde cargó la página (localhost, IP de LAN o dominio público),
  // sin depender de que "localhost" resuelva al Docker del usuario.
  apiUrl: '/api/v1'
};
