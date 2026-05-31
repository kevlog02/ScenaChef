# Requerimientos: Comunicación MQTT

## Tecnología
- **Broker:** Eclipse Mosquitto 2.x
- **Protocolo:** MQTT 3.1.1
- **Clientes:**
  - Spring Boot: Eclipse Paho Java Client
  - Node.js: mqtt.js

---

## Broker Mosquitto

### Configuración (`mosquitto.conf`)

```conf
listener 1883
allow_anonymous true
persistence true
persistence_location /mosquitto/data/
log_dest file /mosquitto/log/mosquitto.log
log_type error
log_type warning
log_type notice
log_type information
```

> Para producción, deshabilitar `allow_anonymous` y configurar usuario/contraseña.

---

## Topics

| Topic | Publicador | Suscriptor | Descripción |
|-------|-----------|------------|-------------|
| `restaurant/orders/created` | Spring Boot | Node.js | Nuevo pedido creado |
| `restaurant/orders/status` | Node.js | Spring Boot | Actualización de estado desde cocina |

---

## Flujo Completo

### Flujo 1: Creación de Pedido

```
[Cajero - Angular]
      │  POST /api/orders
      ▼
[Spring Boot]
  1. Validar request
  2. Guardar en PostgreSQL → status: PENDIENTE
  3. PUBLISH → restaurant/orders/created
      │
      ▼
[Mosquitto Broker]
      │
      ▼
[Node.js Kitchen Service]
  4. Recibir mensaje MQTT
  5. Verificar no duplicado (por orderId)
  6. Guardar en MongoDB → status: PENDIENTE
      │
      ▼
[Panel de Cocina - Angular]
  7. Polling GET /api/kitchen/orders/active
  8. Mostrar nuevo pedido
```

### Flujo 2: Actualización de Estado

```
[Cocinero - Angular]
      │  PATCH /api/kitchen/orders/:id/status
      ▼
[Node.js Kitchen Service]
  1. Actualizar estado en MongoDB
  2. PUBLISH → restaurant/orders/status
      │
      ▼
[Mosquitto Broker]
      │
      ▼
[Spring Boot]
  3. Recibir mensaje MQTT
  4. Actualizar estado en PostgreSQL
```

---

## Payloads MQTT

### Topic: `restaurant/orders/created`

Publicado por Spring Boot al crear un pedido.

```json
{
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
  "createdAt": "2024-01-15T14:30:00"
}
```

### Topic: `restaurant/orders/status`

Publicado por Node.js al cambiar estado.

```json
{
  "orderId": 101,
  "status": "EN_PREPARACION",
  "updatedAt": "2024-01-15T14:35:00"
}
```

---

## Implementación — Spring Boot (Eclipse Paho)

### `MqttConfig.java`

```java
@Configuration
public class MqttConfig {

    @Value("${mqtt.broker.url}")
    private String brokerUrl;

    @Value("${mqtt.client.id}")
    private String clientId;

    @Bean
    public MqttClient mqttClient() throws MqttException {
        MqttClient client = new MqttClient(brokerUrl, clientId + "-" + UUID.randomUUID());
        MqttConnectOptions options = new MqttConnectOptions();
        options.setCleanSession(true);
        options.setAutomaticReconnect(true);
        options.setConnectionTimeout(30);
        options.setKeepAliveInterval(60);
        client.connect(options);
        return client;
    }
}
```

### `MqttService.java`

```java
@Service
public class MqttService implements MqttCallback {

    private final MqttClient mqttClient;
    private final OrderRepository orderRepository;

    @Value("${mqtt.topic.order.created}")
    private String topicOrderCreated;

    @Value("${mqtt.topic.order.status.updated}")
    private String topicOrderStatus;

    @PostConstruct
    public void subscribe() throws MqttException {
        mqttClient.setCallback(this);
        mqttClient.subscribe(topicOrderStatus, 1); // QoS 1
    }

    public void publishOrderCreated(OrderCreatedEvent event) {
        String payload = objectMapper.writeValueAsString(event);
        MqttMessage message = new MqttMessage(payload.getBytes(StandardCharsets.UTF_8));
        message.setQos(1);
        message.setRetained(false);
        mqttClient.publish(topicOrderCreated, message);
    }

    @Override
    public void messageArrived(String topic, MqttMessage message) {
        if (topic.equals(topicOrderStatus)) {
            String payload = new String(message.getPayload());
            OrderStatusUpdateEvent event = objectMapper.readValue(payload, OrderStatusUpdateEvent.class);
            // Actualizar estado en PostgreSQL
            orderRepository.updateStatus(event.getOrderId(), OrderStatus.valueOf(event.getStatus()));
        }
    }

    @Override
    public void connectionLost(Throwable cause) {
        log.error("MQTT connection lost: {}", cause.getMessage());
        // El auto-reconnect de Paho maneja la reconexión
    }

    @Override
    public void deliveryComplete(IMqttDeliveryToken token) {}
}
```

---

## Implementación — Node.js (mqtt.js)

### `src/config/mqtt.ts`

```typescript
import mqtt, { MqttClient } from 'mqtt';
import { KitchenOrder } from '../models/KitchenOrder';

const TOPIC_ORDER_CREATED = process.env.MQTT_TOPIC_ORDER_CREATED || 'restaurant/orders/created';
const TOPIC_ORDER_STATUS  = process.env.MQTT_TOPIC_ORDER_STATUS  || 'restaurant/orders/status';

let client: MqttClient;

export const connectMqtt = (): void => {
  const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';

  client = mqtt.connect(brokerUrl, {
    clientId: process.env.MQTT_CLIENT_ID || 'kitchen-service',
    clean: true,
    reconnectPeriod: 5000,
  });

  client.on('connect', () => {
    console.log('MQTT conectado al broker');
    client.subscribe(TOPIC_ORDER_CREATED, { qos: 1 });
  });

  client.on('message', async (topic, message) => {
    if (topic === TOPIC_ORDER_CREATED) {
      await handleOrderCreated(JSON.parse(message.toString()));
    }
  });

  client.on('error', (err) => {
    console.error('MQTT error:', err.message);
  });

  client.on('reconnect', () => {
    console.warn('MQTT reconectando...');
  });
};

export const publishStatusUpdate = (orderId: number, status: string): void => {
  const payload = JSON.stringify({ orderId, status, updatedAt: new Date().toISOString() });
  client.publish(TOPIC_ORDER_STATUS, payload, { qos: 1 });
};

async function handleOrderCreated(data: any): Promise<void> {
  try {
    const exists = await KitchenOrder.findOne({ orderId: data.orderId });
    if (!exists) {
      await KitchenOrder.create({
        orderId:     data.orderId,
        tableNumber: data.tableNumber,
        items:       data.items,
        status:      'PENDIENTE'
      });
      console.log(`Pedido #${data.orderId} recibido y guardado en cocina`);
    }
  } catch (error) {
    console.error('Error procesando pedido MQTT:', error);
  }
}
```

---

## Calidad de Servicio (QoS)

| QoS | Comportamiento |
|-----|----------------|
| 0 | Máximo una entrega (fire and forget) |
| **1** | **Al menos una entrega** ← **Usar este** |
| 2 | Exactamente una entrega |

Usar **QoS 1** para garantizar entrega de pedidos sin la complejidad de QoS 2.

---

## Manejo de Errores MQTT

- **Spring Boot:** Paho con `setAutomaticReconnect(true)` reconecta automáticamente
- **Node.js:** mqtt.js con `reconnectPeriod: 5000` reintenta cada 5 segundos
- **Duplicados:** El microservicio verifica `orderId` antes de insertar en MongoDB
- **Mensajes perdidos:** Con QoS 1, el broker reintenta hasta recibir ACK
