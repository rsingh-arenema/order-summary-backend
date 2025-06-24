import { getOrdersFromDB, getOrderByIdFromDB, syncNewOrders } from '../services/orderService.js';

export const getAllOrders = async (req, res) => {
  const data = await getOrdersFromDB();
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginated = data.slice(start, end);

  res.json({
    page,
    limit,
    total: data.length,
    totalPages: Math.ceil(data.length / limit),
    orders: paginated,
  });
};

export const getOrderById = async (req, res) => {
  const data = await getOrderByIdFromDB(req.params.id);
  res.json(data);
};

export const syncOrders = async (req, res) => {
  const synced = await syncNewOrders();
  res.json({ message: 'Orders synced', count: synced.length });
};
