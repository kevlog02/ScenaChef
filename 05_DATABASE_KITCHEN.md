# Requerimientos: Base de Datos del Microservicio (MongoDB)

## Tecnología
- **Motor:** MongoDB 7+
- **ODM:** Mongoose (Node.js)
- **Base de datos:** `kitchen_db`

---

## Propósito

MongoDB almacena **únicamente la información operativa de cocina**: una representación simplificada de los pedidos recibidos vía MQTT, necesaria para que el panel de cocina funcione de forma autónoma.

**No almacena:**
- Usuarios
- Roles
- Productos completos
- Información administrativa

---

## Colección: `kitchenorders`

### Schema (Mongoose)

```typescript
const KitchenOrderItemSchema = new Schema({
  productId:   { type: Number, required: true },
  productName: { type: String, required: true },
  quantity:    { type: Number, required: true, min: 1 }
}, { _id: false });

const KitchenOrderSchema = new Schema({
  orderId: {
    type: Number,
    required: true,
    unique: true,
    index: true
    // Corresponde al ID del pedido en PostgreSQL
  },
  tableNumber: {
    type: Number,
    required: true,
    min: 1
  },
  items: {
    type: [KitchenOrderItemSchema],
    required: true,
    validate: [(v: any[]) => v.length > 0, 'Debe tener al menos un item']
  },
  status: {
    type: String,
    enum: ['PENDIENTE', 'EN_PREPARACION', 'LISTO'],
    default: 'PENDIENTE',
    index: true
  },
  receivedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'kitchenorders',
  timestamps: false // manejamos updatedAt manualmente
});

// Middleware: actualizar updatedAt antes de guardar
KitchenOrderSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

KitchenOrderSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});
```

---

## Ejemplo de Documento

```json
{
  "_id": "65a1b2c3d4e5f6a7b8c9d0e1",
  "orderId": 101,
  "tableNumber": 5,
  "items": [
    {
      "productId": 1,
      "productName": "Hamburguesa Clásica",
      "quantity": 2
    },
    {
      "productId": 3,
      "productName": "Papas Fritas",
      "quantity": 1
    }
  ],
  "status": "PENDIENTE",
  "receivedAt": "2024-01-15T14:30:00.000Z",
  "updatedAt": "2024-01-15T14:30:00.000Z"
}
```

---

## Índices

```javascript
// Índice único en orderId (evita duplicados de eventos MQTT)
KitchenOrderSchema.index({ orderId: 1 }, { unique: true });

// Índice en status para queries frecuentes del panel de cocina
KitchenOrderSchema.index({ status: 1 });

// Índice compuesto para filtrar activos ordenados por recepción
KitchenOrderSchema.index({ status: 1, receivedAt: 1 });
```

---

## Queries Principales

### Obtener pedidos activos (panel de cocina)
```typescript
KitchenOrder.find({
  status: { $in: ['PENDIENTE', 'EN_PREPARACION'] }
}).sort({ receivedAt: 1 }); // más antiguos primero
```

### Actualizar estado de pedido
```typescript
KitchenOrder.findOneAndUpdate(
  { orderId: orderId },
  { $set: { status: newStatus, updatedAt: new Date() } },
  { new: true }
);
```

### Verificar duplicado antes de insertar
```typescript
const exists = await KitchenOrder.findOne({ orderId: orderId });
if (!exists) {
  await KitchenOrder.create({ orderId, tableNumber, items, status: 'PENDIENTE' });
}
```

---

## Conexión MongoDB

```typescript
// src/config/database.ts
import mongoose from 'mongoose';

export const connectDatabase = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/kitchen_db';
  
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('MongoDB conectado correctamente');
  } catch (error) {
    console.error('Error conectando a MongoDB:', error);
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB desconectado, intentando reconectar...');
  });
};
```

---

## Configuración Docker

```yaml
# En docker-compose.yml
mongodb:
  image: mongo:7
  container_name: kitchen-mongodb
  environment:
    MONGO_INITDB_DATABASE: kitchen_db
  volumes:
    - mongodb_data:/data/db
  ports:
    - "27017:27017"
  networks:
    - restaurant-network
```

---

## Notas de Diseño

- MongoDB es **independiente** de PostgreSQL: si el backend principal cae, el microservicio de cocina sigue operando con los datos locales.
- Los datos en MongoDB son **operativos y temporales**: solo se necesitan mientras el pedido está activo en cocina.
- No se requiere migración de esquema en MongoDB: Mongoose lo gestiona automáticamente al iniciar.
