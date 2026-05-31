import mqtt, { MqttClient } from 'mqtt';
import { KitchenOrder } from '../models/KitchenOrder';
import { broadcastKitchenEvent } from '../services/sse';

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
      try {
        await handleOrderCreated(JSON.parse(message.toString()));
      } catch (error) {
        console.error('Error parseando mensaje MQTT:', error);
      }
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
  if (!client || !client.connected) {
    console.error('MQTT client not connected. Status update not published.');
    return;
  }
  const payload = JSON.stringify({ orderId, status, updatedAt: new Date().toISOString() });
  client.publish(TOPIC_ORDER_STATUS, payload, { qos: 1 });
  console.log(`MQTT status update published for order #${orderId} to: ${status}`);
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
      broadcastKitchenEvent('order-created', { orderId: data.orderId, status: 'PENDIENTE' });
      console.log(`Pedido #${data.orderId} recibido y guardado en cocina`);
    } else {
      console.log(`Pedido #${data.orderId} ya existe en cocina, ignorando duplicado`);
    }
  } catch (error) {
    console.error('Error procesando pedido MQTT:', error);
  }
}
