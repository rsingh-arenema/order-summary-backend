import { getOrdersFromDB, getOrderByIdFromDB, syncNewOrders } from '../services/orderService.js';

export const getAllOrders = async (req, res) => {
  const data = await getOrdersFromDB();
  res.json(data);
};

export const getOrderById = async (req, res) => {
  const data = await getOrderByIdFromDB(req.params.id);
  res.json(data);
};

export const syncOrders = async (req, res) => {
  const synced = await syncNewOrders();
  res.json({ message: 'Orders synced', count: synced.length });
};
