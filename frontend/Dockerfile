# Build stage
FROM node:22-alpine AS build
WORKDIR /app
ENV CI=true
ARG API_URL
ARG KITCHEN_API_URL
RUN npm install -g pnpm@11.3.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# Serve stage
FROM nginx:alpine
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
