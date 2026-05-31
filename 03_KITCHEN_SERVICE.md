# Requerimientos: Microservicio de Cocina (Node.js)

## Tecnología
- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Lenguaje:** TypeScript
- **Base de datos:** MongoDB (con Mongoose)
- **Mensajería:** mqtt.js (cliente MQTT)
- **Build:** ts-node / tsc

---

## Dependencias (`package.json`)

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "mongoose": "^8.0.0",
    "mqtt": "^5.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/express": "^4.17.0",
    "@types/cors": "^2.8.0",
    "@types/node": "^20.0.0",
    "ts-node": "^10.9.0",
    "nodemon": "^3.0.0"
  }
}
```

---

## Variables de Entorno (`.env`)

```env
PORT=3000
MONGODB_URI=mongodb://mongodb:27017/kitchen_db
MQTT_BROKER_URL=mqtt://mosquitto:1883
MQTT_CLIENT_ID=kitchen-service
MQTT_TOPIC_ORDER_CREATED=restaurant/orders/created
MQTT_TOPIC_ORDER_STATUS=restaurant/orders/status
```

---

## Modelo MongoDB — `KitchenOrder`

```typescript
// src/models/KitchenOrder.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IKitchenOrderItem {
  productId: number;
  productName: string;
  quantity: number;
}

export interface IKitchenOrder extends Document {
  orderId: number;          // ID del sistema principal (PostgreSQL)
  tableNumber: number;
  items: IKitchenOrderItem[];
  status: 'PENDIENTE' | 'EN_PREPARACION' | 'LISTO';
  receivedAt: Date;
  updatedAt: Date;
}

const KitchenOrderSchema = new Schema<IKitchenOrder>({
  orderId:     { type: Number, required: true, unique: true },
  tableNumber: { type: Number, required: true },
  items: [{
    productId:   { type: Number, required: true },
    productName: { type: String, required: true },
    quantity:    { type: Number, required: true }
  }],
  status: {
    type: String,
    enum: ['PENDIENTE', 'EN_PREPARACION', 'LISTO'],
    default: 'PENDIENTE'
  },
  receivedAt: { type: Date, default: Date.now },
  updatedAt:  { type: Date, default: Date.now }
});

export const KitchenOrder = mongoose.model<IKitchenOrder>('KitchenOrder', KitchenOrderSchema);
```

---

## API REST — Endpoints

Base URL: `http://localhost:3000/api`

### Kitchen Orders Controller — `/api/kitchen/orders`

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/kitchen/orders` | Listar todos los pedidos de cocina |
| GET | `/api/kitchen/orders/active` | Solo pedidos PENDIENTE y EN_PREPARACION |
| GET | `/api/kitchen/orders/:orderId` | Obtener pedido por orderId (del sistema principal) |
| PATCH | `/api/kitchen/orders/:orderId/status` | Actualizar estado de preparación |

### Health Check

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/health` | Estado del servicio |

---

## Detalle de Endpoints

### GET `/api/kitchen/orders/active`

**Response 200:**
```json
[
  {
    "_id": "...",
    "orderId": 101,
    "tableNumber": 5,
    "items": [
      { "productId": 1, "productName": "Hamburguesa", "quantity": 2 },
      { "productId": 3, "productName": "Refresco", "quantity": 1 }
    ],
    "status": "PENDIENTE",
    "receivedAt": "2024-01-15T14:30:00.000Z",
    "updatedAt": "2024-01-15T14:30:00.000Z"
  }
]
```

---

### PATCH `/api/kitchen/orders/:orderId/status`

**Request Body:**
```json
{ "status": "EN_PREPARACION" }
```

**Validaciones:**
- `status` debe ser uno de: `PENDIENTE`, `EN_PREPARACION`, `LISTO`
- El pedido debe existir en MongoDB

**Comportamiento:**
1. Actualizar el estado en MongoDB
2. Publicar evento MQTT al topic `restaurant/orders/status`:
```json
{
  "orderId": 101,
  "status": "EN_PREPARACION",
  "updatedAt": "2024-01-15T14:35:00"
}
```

**Response 200:**
```json
{
  "orderId": 101,
  "status": "EN_PREPARACION",
  "updatedAt": "2024-01-15T14:35:00.000Z"
}
```

---

## Servicio MQTT

### `MqttService` (`src/services/mqtt.service.ts`)

```typescript
class MqttService {
  connect(): void
  // Suscribirse al topic: restaurant/orders/created
  // Al recibir mensaje: guardar en MongoDB

  publishStatusUpdate(orderId: number, status: string): void
  // Publicar al topic: restaurant/orders/status
}
```

**Callback al recibir nuevo pedido (`restaurant/orders/created`):**
1. Parsear el payload JSON
2. Verificar si el `orderId` ya existe en MongoDB (evitar duplicados)
3. Si no existe, crear el documento `KitchenOrder` con estado `PENDIENTE`
4. Si existe (duplicado), ignorar o loguear

**Payload recibido esperado:**
```json
{
  "orderId": 101,
  "tableNumber": 5,
  "items": [
    { "productId": 1, "productName": "Hamburguesa", "quantity": 2 }
  ],
  "status": "PENDIENTE",
  "createdAt": "2024-01-15T14:30:00"
}
```

---

## Estructura de Archivos

```
kitchen-service/
├── src/
│   ├── config/
│   │   ├── database.ts       # Conexión MongoDB
│   │   └── mqtt.ts           # Configuración MQTT
│   ├── models/
│   │   └── KitchenOrder.ts   # Mongoose Schema
│   ├── services/
│   │   └── mqtt.service.ts   # Lógica MQTT pub/sub
│   ├── controllers/
│   │   └── kitchen.controller.ts
│   ├── routes/
│   │   └── kitchen.routes.ts
│   ├── middleware/
│   │   └── errorHandler.ts
│   └── app.ts                # Entry point Express
├── .env
├── .env.example
├── package.json
├── tsconfig.json
└── Dockerfile
```

---

## Configuración TypeScript (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## Manejo de Errores

Implementar middleware de error global en Express:
```typescript
// src/middleware/errorHandler.ts
interface ApiError {
  status: number;
  message: string;
}
// Retornar siempre:
// { "error": "mensaje descriptivo", "status": 400/404/500 }
```

Casos:
- Pedido no encontrado → 404
- Status inválido → 400
- Error MQTT al publicar → 500 (pero no interrumpir el flujo, loguear)
- Error MongoDB → 500

---

## CORS

Habilitar CORS para el origen del frontend Angular:
```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  methods: ['GET', 'POST', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

## Scripts `package.json`

```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/app.ts",
    "build": "tsc",
    "start": "node dist/app.js"
  }
}
```
