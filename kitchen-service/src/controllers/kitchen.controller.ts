import { Request, Response, NextFunction } from 'express';
import { KitchenOrder } from '../models/KitchenOrder';
import { publishStatusUpdate } from '../config/mqtt';

export const getAllOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const orders = await KitchenOrder.find().sort({ receivedAt: -1 });
    res.json(orders);
  } catch (error) {
    next(error);
  }
};

export const getActiveOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const orders = await KitchenOrder.find({
      status: { $in: ['PENDIENTE', 'EN_PREPARACION'] }
    }).sort({ receivedAt: 1 }); // oldest first
    res.json(orders);
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const orderId = parseInt(req.params.orderId, 10);
    if (isNaN(orderId)) {
      res.status(400).json({ error: 'ID de pedido inválido', status: 400 });
      return;
    }
    const order = await KitchenOrder.findOne({ orderId });
    if (!order) {
      res.status(404).json({ error: 'Pedido no encontrado en cocina', status: 404 });
      return;
    }
    res.json(order);
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const orderId = parseInt(req.params.orderId, 10);
    const { status } = req.body;

    if (isNaN(orderId)) {
      res.status(400).json({ error: 'ID de pedido inválido', status: 400 });
      return;
    }

    const validStatuses = ['PENDIENTE', 'EN_PREPARACION', 'LISTO'];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ error: 'Estado de pedido inválido. Debe ser PENDIENTE, EN_PREPARACION o LISTO', status: 400 });
      return;
    }

    const order = await KitchenOrder.findOne({ orderId });
    if (!order) {
      res.status(404).json({ error: 'Pedido no encontrado en cocina', status: 404 });
      return;
    }

    order.status = status as 'PENDIENTE' | 'EN_PREPARACION' | 'LISTO';
    // Mongoose post-save / pre-save hooks will handle updatedAt, but we can also set it manually or save the model.
    // Saving the model triggers pre-save validation and hooks.
    await order.save();

    // Publish MQTT status update event
    publishStatusUpdate(orderId, status);

    res.json({
      orderId: order.orderId,
      status: order.status,
      updatedAt: order.updatedAt
    });
  } catch (error) {
    next(error);
  }
};
