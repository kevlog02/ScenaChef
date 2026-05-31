import { Router } from 'express';
import {
  getAllOrders,
  getActiveOrders,
  getOrderById,
  updateOrderStatus
} from '../controllers/kitchen.controller';

const router = Router();

router.get('/orders', getAllOrders);
router.get('/orders/active', getActiveOrders);
router.get('/orders/:orderId', getOrderById);
router.patch('/orders/:orderId/status', updateOrderStatus);

export default router;
