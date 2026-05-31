# Sistema de Gestión de Restaurante (Distributed)

Este es un sistema distribuido para la gestión de pedidos en un restaurante, compuesto por:
1. **Frontend Angular (v21)**: Una interfaz moderna y glassmórfica estilizada con **Tailwind CSS**.
2. **Backend Spring Boot (v3.3)**: Un servicio HTTP REST robusto con seguridad JWT, almacenamiento JPA en PostgreSQL y mensajería MQTT.
3. **Microservicio de Cocina (Node.js & TypeScript)**: Un servicio autónomo que maneja el panel de preparación en cocina conectado a MongoDB y MQTT.
4. **PostgreSQL Primary-Replica**: Base de datos relacional con replicación en streaming activada para tolerancia a fallos.
5. **MongoDB**: Base de datos orientada a documentos para almacenamiento operativo de la cocina.
6. **Mosquitto MQTT Broker**: Broker de mensajería para comunicación asíncrona de eventos (creación de pedidos y actualización de estados).

---

## Estructura de Archivos

```
restaurant-system/
├── docker-compose.yml
├── .env
├── .env.example
├── .gitignore
├── README.md
│
├── frontend/                   # Aplicación Angular (Tailwind CSS)
│   ├── src/...
│   ├── Dockerfile
│   └── nginx.conf
│
├── backend/                    # API Spring Boot (Java 17)
│   ├── src/...
│   ├── pom.xml
│   └── Dockerfile
│
├── kitchen-service/            # Microservicio de Cocina (NodeJS / TS)
│   ├── src/...
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
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

## Configuración y Variables de Entorno

El archivo `.env` ya ha sido configurado en el directorio raíz. Contiene las siguientes variables:
```env
DB_USERNAME=restaurant_user
DB_PASSWORD=SuperSecretPassword123!
JWT_SECRET=my_secreto_jwt_muy_largo_y_aleatorio_de_64_caracteres_minimo_para_seguridad_HS256
SSL_KEY_PASSWORD=changeit
```

---

## Cómo Ejecutar el Proyecto

> [!IMPORTANT]
> Asegúrate de tener **Docker** y **Docker Compose** instalados y ejecutándose antes de iniciar.

### 1. Levantar la Infraestructura y Servicios
Para construir e iniciar todos los contenedores en segundo plano, ejecuta:
```bash
docker compose up --build -d
```

### 2. Verificar el Estado de los Contenedores
```bash
docker compose ps
```
Deberías ver 7 contenedores en estado `running`:
* `restaurant-frontend` (Puerto 80)
* `restaurant-backend` (Puerto 8080)
* `kitchen-service` (Puerto 3000)
* `postgres-primary` (Puerto 5432)
* `postgres-replica` (Puerto 5433)
* `kitchen-mongodb` (Puerto 27017)
* `mosquitto` (Puerto 1883)

---

## Credenciales por Defecto (Seed Data)

Las siguientes cuentas han sido pre-cargadas en la base de datos para pruebas:

| Rol | Usuario | Contraseña |
|-----|---------|------------|
| **Administrador (ADMIN)** | `admin` | `admin123` |
| **Cajero (CAJERO)** | `cajero1` | `secret` |
| **Cocinero (COCINERO)** | `cocina1` | `secret` |

---

## Pipeline de Prueba E2E (Paso a Paso)

1. **Accede al Frontend**: Abre [http://localhost](http://localhost) en tu navegador.
2. **Iniciar Sesión como Administrador**:
   * Entra con `admin` / `admin123`.
   * Ve a la sección **Usuarios** para crear, editar o ver los roles del personal.
   * Ve a la sección **Productos** para ver el catálogo y modificar la disponibilidad de platos.
3. **Crear un Pedido (Cajero)**:
   * Inicia sesión como `cajero1` / `secret`.
   * Ve a **Pedidos** e ingresa una mesa (ej. Mesa 5).
   * Selecciona productos del menú lateral, ajusta las cantidades y haz clic en **Confirmar**.
   * El pedido se guardará en PostgreSQL (`PENDIENTE`) y se publicará un mensaje en Mosquitto.
4. **Preparar Pedido (Cocinero)**:
   * Inicia sesión como `cocina1` / `secret`.
   * Ve al **Panel de Cocina**. Verás aparecer la tarjeta de la Mesa 5 en estado `PENDIENTE`.
   * Haz clic en **Empezar Preparación**. El estado cambia a `EN_PREPARACION` (enviado vía MQTT al backend principal).
   * Cuando el plato esté listo, haz clic en **Marcar como Listo**. El estado cambia a `LISTO` y desaparece del panel de cocina.
5. **Entregar Pedido (Cajero)**:
   * Regresa con el usuario `cajero1` / `secret` a **Pedidos**.
   * Verás que la tarjeta del pedido ahora tiene un botón **Marcar Entregado** (porque está `LISTO`).
   * Haz clic en él. El estado se actualiza a `ENTREGADO`.
