import express from 'express';
import { getAllOrders, getOrderById, syncOrders } from '../controllers/orderController.js';

const router = express.Router();
router.get('/', getAllOrders);
router.get('/:id', getOrderById);
router.post('/sync', syncOrders);
export default router;
