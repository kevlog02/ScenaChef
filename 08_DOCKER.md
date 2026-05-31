# Requerimientos: Contenedorización Docker

## Tecnología
- **Docker** (Engine 24+)
- **Docker Compose** v2
- Todos los componentes del sistema deben estar contenedorizados

---

## Servicios en Docker Compose

| Servicio | Imagen | Puerto |
|----------|--------|--------|
| `frontend` | Angular (Nginx) | 80/443 |
| `backend` | Spring Boot (JDK 17) | 8080 |
| `kitchen-service` | Node.js 20 | 3000 |
| `postgres-primary` | PostgreSQL 15 | 5432 |
| `postgres-replica` | PostgreSQL 15 | 5433 |
| `mongodb` | MongoDB 7 | 27017 |
| `mosquitto` | Eclipse Mosquitto 2 | 1883 |

---

## `docker-compose.yml`

```yaml
version: '3.9'

networks:
  restaurant-network:
    driver: bridge

volumes:
  postgres_primary_data:
  postgres_replica_data:
  mongodb_data:
  mosquitto_data:
  mosquitto_log:

services:

  # ─── PostgreSQL Primary ────────────────────────────────────
  postgres-primary:
    image: postgres:15
    container_name: postgres-primary
    environment:
      POSTGRES_DB: restaurant_db
      POSTGRES_USER: ${DB_USERNAME}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_primary_data:/var/lib/postgresql/data
      - ./infrastructure/postgres/init:/docker-entrypoint-initdb.d
    networks:
      - restaurant-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USERNAME} -d restaurant_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ─── PostgreSQL Replica ────────────────────────────────────
  postgres-replica:
    image: postgres:15
    container_name: postgres-replica
    environment:
      POSTGRES_DB: restaurant_db
      POSTGRES_USER: ${DB_USERNAME}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      PGDATA: /var/lib/postgresql/data
    volumes:
      - postgres_replica_data:/var/lib/postgresql/data
    depends_on:
      postgres-primary:
        condition: service_healthy
    networks:
      - restaurant-network

  # ─── MongoDB ──────────────────────────────────────────────
  mongodb:
    image: mongo:7
    container_name: kitchen-mongodb
    environment:
      MONGO_INITDB_DATABASE: kitchen_db
    volumes:
      - mongodb_data:/data/db
    networks:
      - restaurant-network
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/kitchen_db --quiet
      interval: 10s
      timeout: 5s
      retries: 5

  # ─── Mosquitto MQTT Broker ────────────────────────────────
  mosquitto:
    image: eclipse-mosquitto:2
    container_name: mosquitto
    volumes:
      - ./infrastructure/mosquitto/mosquitto.conf:/mosquitto/config/mosquitto.conf
      - mosquitto_data:/mosquitto/data
      - mosquitto_log:/mosquitto/log
    ports:
      - "1883:1883"
    networks:
      - restaurant-network
    healthcheck:
      test: ["CMD", "mosquitto_pub", "-h", "localhost", "-t", "health", "-m", "ping", "-q", "0"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ─── Backend Spring Boot ──────────────────────────────────
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: restaurant-backend
    environment:
      - DB_USERNAME=${DB_USERNAME}
      - DB_PASSWORD=${DB_PASSWORD}
      - JWT_SECRET=${JWT_SECRET}
      - SSL_KEY_PASSWORD=${SSL_KEY_PASSWORD}
      - SPRING_DATASOURCE_URL=jdbc:postgresql://postgres-primary:5432/restaurant_db
      - MQTT_BROKER_URL=tcp://mosquitto:1883
    ports:
      - "8080:8080"
    depends_on:
      postgres-primary:
        condition: service_healthy
      mosquitto:
        condition: service_healthy
    networks:
      - restaurant-network
    healthcheck:
      test: ["CMD", "curl", "-f", "https://localhost:8080/actuator/health", "--insecure"]
      interval: 30s
      timeout: 10s
      retries: 5

  # ─── Kitchen Microservice Node.js ─────────────────────────
  kitchen-service:
    build:
      context: ./kitchen-service
      dockerfile: Dockerfile
    container_name: kitchen-service
    environment:
      - PORT=3000
      - MONGODB_URI=mongodb://mongodb:27017/kitchen_db
      - MQTT_BROKER_URL=mqtt://mosquitto:1883
    ports:
      - "3000:3000"
    depends_on:
      mongodb:
        condition: service_healthy
      mosquitto:
        condition: service_healthy
    networks:
      - restaurant-network

  # ─── Frontend Angular ─────────────────────────────────────
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        - API_URL=https://localhost:8080/api
        - KITCHEN_API_URL=http://localhost:3000/api
    container_name: restaurant-frontend
    ports:
      - "80:80"
    depends_on:
      - backend
      - kitchen-service
    networks:
      - restaurant-network
```

---

## Dockerfiles

### `backend/Dockerfile`

```dockerfile
# Build stage
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests

# Run stage
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
COPY src/main/resources/keystore.p12 keystore.p12
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### `kitchen-service/Dockerfile`

```dockerfile
# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Run stage
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/app.js"]
```

### `frontend/Dockerfile`

```dockerfile
# Build stage
FROM node:20-alpine AS build
WORKDIR /app
ARG API_URL
ARG KITCHEN_API_URL
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration=production

# Serve stage
FROM nginx:alpine
COPY --from=build /app/dist/frontend /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### `frontend/nginx.conf`

```nginx
events { worker_connections 1024; }

http {
  include       /etc/nginx/mime.types;
  default_type  application/octet-stream;

  server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # Angular routing - redirigir todas las rutas al index.html
    location / {
      try_files $uri $uri/ /index.html;
    }

    # Cache para assets estáticos
    location ~* \.(js|css|png|jpg|ico|svg)$ {
      expires 1y;
      add_header Cache-Control "public, immutable";
    }
  }
}
```

---

## `.env` (archivo local, NO commitear)

```env
DB_USERNAME=restaurant_user
DB_PASSWORD=SuperSecretPassword123!
JWT_SECRET=mi_secreto_jwt_muy_largo_y_aleatorio_de_64_caracteres_minimo
SSL_KEY_PASSWORD=changeit
```

### `.env.example` (sí commitear)

```env
DB_USERNAME=restaurant_user
DB_PASSWORD=CHANGE_ME
JWT_SECRET=CHANGE_ME_MIN_64_CHARS
SSL_KEY_PASSWORD=CHANGE_ME
```

---

## Estructura de Archivos del Proyecto

```
restaurant-system/
├── docker-compose.yml
├── .env
├── .env.example
├── .gitignore
├── README.md
│
├── frontend/                   # Angular App
│   ├── Dockerfile
│   ├── nginx.conf
│   └── ...
│
├── backend/                    # Spring Boot
│   ├── Dockerfile
│   └── ...
│
├── kitchen-service/            # Node.js
│   ├── Dockerfile
│   └── ...
│
└── infrastructure/
    ├── mosquitto/
    │   └── mosquitto.conf
    └── postgres/
        └── init/
            ├── V1__init_schema.sql
            └── V2__seed_data.sql
```

---

## Comandos Útiles

```bash
# Levantar todo el sistema
docker compose up --build -d

# Ver logs de un servicio
docker compose logs -f backend
docker compose logs -f kitchen-service

# Detener todo
docker compose down

# Detener y eliminar volúmenes (resetear BD)
docker compose down -v

# Reconstruir solo un servicio
docker compose up --build -d backend

# Conectarse a PostgreSQL
docker exec -it postgres-primary psql -U restaurant_user -d restaurant_db

# Conectarse a MongoDB
docker exec -it kitchen-mongodb mongosh kitchen_db
```

---

## `.gitignore`

```
.env
*.p12
*.jks
node_modules/
dist/
target/
*.class
```
