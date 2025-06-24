export const parseAmazonOrder = (subject, content) => {
  const order = {
    order_id: '',
    platform: 'Amazon',
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
    // Extract order ID
    const orderIdMatch = content.match(/Order\s*#\s*([\d-]+)/i);
    if (orderIdMatch) order.order_id = orderIdMatch[1];

    // Extract total amount
    const amountMatch = content.match(/Grand Total:.*?₹[\s]*([\d,]+)/i);
    if (amountMatch) order.total_amount = parseFloat(amountMatch[1].replace(/,/g, ''));

    // Extract item names (basic)
    const itemMatches = [...content.matchAll(/(?:Item|Items) Ordered[\s\S]{0,200}?(?:<b>|>)([^<\n]+)</gi)];
    order.items = itemMatches.map(m => m[1].trim());

    // Extract tracking ID (optional)
    const trackMatch = content.match(/Tracking ID[:\s]*([A-Z0-9]+)/i);
    if (trackMatch) order.tracking_id = trackMatch[1];

    // Tracking URL
    const trackUrlMatch = content.match(/(https:\/\/www\.amazon\.[^\s"]+tracking[^\s"]+)/i);
    if (trackUrlMatch) order.tracking_url = trackUrlMatch[1];

    return order;
  } catch (err) {
    console.error("Amazon parse error:", err.message);
    return order;
  }
};
