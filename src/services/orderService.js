import { orders } from '../data/orders.js';
import { fetchRecentOrderEmails } from './emailReader.js';

export const getOrdersFromDB = async () => orders;
export const getOrderByIdFromDB = async (id) => orders.find(o => o.order_id === id);
export const syncNewOrders = async () => {
  const newOrders = await fetchRecentOrderEmails();
  orders.push(...newOrders);
  return newOrders;
};
