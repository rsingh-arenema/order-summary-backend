function parseFlipkartOrder(subject, html = "", text = "") {
  const platform = "Flipkart";

  const orderId = html.match(/Order ID[:\s]*([A-Z0-9\-]+)/i)?.[1]
    || subject.match(/Order\sID[:\s]*([A-Z0-9\-]+)/i)?.[1]
    || `UNKNOWN-${Date.now()}`;

  const orderDate = new Date().toISOString().slice(0, 10);

  const itemMatches = html.match(/<b>(.*?)<\/b>/gi) || [];
  const items = itemMatches.map(item => item.replace(/<.*?>/g, '').trim()).filter(Boolean);

  const totalMatch = html.match(/(?:Total|Paid Amount)[^\d₹]*₹\s?(\d+(?:\.\d+)?)/i);
  const totalAmount = totalMatch?.[1] ? parseFloat(totalMatch[1]) : 0;

  return {
    platform,
    order_id: orderId,
    order_date: orderDate,
    items,
    total_amount: totalAmount,
    payment_mode: "Online",
    delivery_status: "Delivered",
    tracking_id: "",
    tracking_url: "",
    delivery_address: "",
    email_snippet: text.slice(0, 150) || html.slice(0, 150),
  };
}
export { parseFlipkartOrder};
