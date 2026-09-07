# Stage 1: Compilación de la aplicación Angular con Node.js 22
FROM node:22-alpine AS build

WORKDIR /app

# Copiar archivos de gestión de paquetes para aprovechar el caché de capas de Docker
COPY package.json package-lock.json ./

# Instalar dependencias exactas
RUN npm ci

# Copiar el código fuente completo del proyecto
COPY . .

# Compilar la aplicación para producción
RUN npm run build

# Stage 2: Servidor Web Nginx ligero para producción
FROM nginx:alpine

# Copiar la configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los assets estáticos generados por Angular desde la etapa de compilación
COPY --from=build /app/dist/WorldDance/browser /usr/share/nginx/html

# Exponer el puerto HTTP estándar 80
EXPOSE 80

# Iniciar el servidor Nginx en primer plano
CMD ["nginx", "-g", "daemon off;"]
