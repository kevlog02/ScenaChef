import { Response } from 'express';

type KitchenEventType = 'connected' | 'order-created' | 'order-status-updated';

const clients = new Set<Response>();

export const openKitchenEventsStream = (res: Response): void => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  clients.add(res);

  sendEvent(res, 'connected', { message: 'SSE connected' });

  res.on('close', () => {
    clients.delete(res);
  });
};

export const broadcastKitchenEvent = (eventType: KitchenEventType, payload: unknown): void => {
  for (const client of clients) {
    try {
      sendEvent(client, eventType, payload);
    } catch {
      clients.delete(client);
    }
  }
};

const sendEvent = (res: Response, eventType: KitchenEventType, payload: unknown): void => {
  res.write(`event: ${eventType}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
};