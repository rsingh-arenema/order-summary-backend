import * as cheerio from "cheerio";

function parseZomatoOrder({ email_snippet, order_date }) {
  const $ = cheerio.load(email_snippet);
  const result = {
    order_id: "",
    platform: "Zomato",
    order_date,
    items: [],
    total_amount: null,
    payment_mode: "Unknown",
    delivery_status: "Delivered",
    delivery_address: "Unknown",
    tracking_id: "",
    tracking_url: "",
    email_snippet,
  };

  // 🟠 Order ID
  const orderMatch = email_snippet.match(/ORDER ID[:#\s]*([0-9]+)/i);
  if (orderMatch) result.order_id = orderMatch[1];

  // 🟠 Total Paid
  const totalMatch = email_snippet.match(/Total paid\s*[-–]?\s*₹([\d.,]+)/i);
  if (totalMatch) {
    result.total_amount = parseFloat(totalMatch[1].replace(/,/g, ""));
  }

  // 🟠 Delivery Address (the long address below restaurant name)
  const addressBlock = $("div")
    .filter((_, el) => $(el).text().includes("Sawari North Indian Kitchen"))
    .next()
    .text()
    .trim();

  if (addressBlock && addressBlock.length > 10) {
    result.delivery_address = addressBlock;
  }

  // 🟠 Items (e.g., "3 X Garlic Naan")
  const itemLines = email_snippet
    .split("\n")
    .filter((line) => /\d+\s*[xX]\s+/i.test(line));

  itemLines.forEach((line) => {
    const match = line.match(/(\d+)\s*[xX]\s*(.+?)(₹[\d,.]+)?$/i);
    if (match) {
      result.items.push({
        quantity: parseInt(match[1]),
        name: match[2].trim(),
        price: null, // Zomato emails usually don’t show per-item price
      });
    }
  });

  return result;
}

export { parseZomatoOrder };
