# Proyecto: Sistema de Gestión de Restaurante

## Descripción General

Sistema distribuido para gestión de pedidos en un restaurante, compuesto por un sistema cliente-servidor principal y un microservicio de cocina independiente, comunicados mediante MQTT.

## Arquitectura General

```
[Angular Frontend]
       │
    HTTPS + JWT
       │
[Spring Boot Backend]
       │         │
  Hibernate    MQTT (Mosquitto)
       │         │
  PostgreSQL  [Node.js Kitchen Service]
                  │
              MongoDB
```

## Índice de Documentos de Requerimientos

| Archivo | Descripción |
|---------|-------------|
| `01_FRONTEND.md` | Frontend Angular |
| `02_BACKEND.md` | Backend principal Spring Boot |
| `03_KITCHEN_SERVICE.md` | Microservicio de cocina Node.js |
| `04_DATABASE_MAIN.md` | Base de datos PostgreSQL |
| `05_DATABASE_KITCHEN.md` | Base de datos MongoDB |
| `06_MQTT_COMMUNICATION.md` | Comunicación MQTT entre componentes |
| `07_SECURITY.md` | Seguridad y autenticación JWT |
| `08_DOCKER.md` | Contenedorización Docker |

## Stack Tecnológico Resumen

### Frontend
- Angular (latest)

### Backend Principal
- Java 17+
- Spring Boot
- Spring MVC (DispatcherServlet / Servlets)
- Spring Security
- Spring Data JPA + Hibernate
- PostgreSQL

### Microservicio de Cocina
- Node.js
- Express.js
- TypeScript
- MQTT Client (mqtt.js)
- MongoDB (Mongoose)

### Infraestructura
- MQTT Broker: Mosquitto
- Contenedores: Docker + Docker Compose
- Seguridad: HTTPS/TLS, JWT, bcrypt
