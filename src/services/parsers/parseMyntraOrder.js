export const parseMyntraOrder = (subject, content) => {
  const order = {
    order_id: '',
    platform: 'Myntra',
    order_date: new Date().toISOString().split('T')[0],
    items: [],
    total_amount: 0,
    payment_mode: 'Unknown',
    tracking_id: '',
    delivery_status: 'Pending',
    delivery_address: 'Unknown',
    tracking_url: '',
    email_snippet: content
  };

  try {
    const orderIdMatch = content.match(/Order\s*#[:\s]*([A-Z0-9-]+)/i);
    if (orderIdMatch) order.order_id = orderIdMatch[1];

    const amountMatch = content.match(/Amount Paid[:\s]*₹([\d,]+)/i);
    if (amountMatch) order.total_amount = parseFloat(amountMatch[1].replace(/,/g, ''));

    const itemMatches = [...content.matchAll(/Product Name[:\s]*([^\n<]+)/gi)];
    order.items = itemMatches.map(m => m[1].trim());

    const trackMatch = content.match(/Tracking ID[:\s]*([A-Z0-9]+)/i);
    if (trackMatch) order.tracking_id = trackMatch[1];

    const trackUrlMatch = content.match(/(https:\/\/www\.myntra\.com\/[^"' ]+)/i);
    if (trackUrlMatch) order.tracking_url = trackUrlMatch[1];

    return order;
  } catch (err) {
    console.error("Myntra parse error:", err.message);
    return order;
  }
};
