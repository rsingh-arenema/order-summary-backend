import * as cheerio from "cheerio";

function parseSwiggyOrder ({ email_snippet, order_date }) {
  const $ = cheerio.load(email_snippet);
  const result = {
    order_id: "",
    platform: "Swiggy",
    order_date,
    items: [],
    total_amount: 0,
    payment_mode: "Unknown",
    delivery_status: "Delivered",
    delivery_address: "Unknown",
    tracking_id: "",
    tracking_url: "",
    email_snippet,
  };

  // Order ID
  const orderText = $("td")
    .filter((_, el) => $(el).text().toLowerCase().includes("order id:"))
    .text();
  const orderMatch = orderText.match(/order id:\s*(\d+)/i);
  if (orderMatch) result.order_id = orderMatch[1];

  // Delivery Address (robust: finds the first non-empty <td> after "Deliver To:")
  const deliverToTd = $("td").filter((_, el) => $(el).text().trim() === "Deliver To:");
  if (deliverToTd.length) {
    let address = "Unknown";
    let tr = deliverToTd.closest("tr").next();
    // Loop through next siblings until we find a non-empty <td>
    while (tr.length) {
      const text = tr.find("td").text().trim();
      if (text) {
        address = text;
        break;
      }
      tr = tr.next();
    }
    result.delivery_address = address;
  }

  // Items: Each item is in its own table, so select those tables
  $("table").each((_, table) => {
    const tds = $(table).find("tr").first().find("td");
    if (tds.length === 2) {
      const qtyName = $(tds[0]).text().trim();
      const priceText = $(tds[1]).text().replace(/[^\d.]/g, "");
      // Match "1 x Item Name"
      const match = qtyName.match(/^(\d+)\s*x\s*(.+)$/);
      if (match && priceText) {
        result.items.push({
          name: match[2].trim(),
          quantity: parseInt(match[1]),
          price: parseFloat(priceText),
        });
      }
    }
  });

  // Remove duplicate items (optional, in case of HTML quirks)
  result.items = result.items.filter(
    (item, idx, arr) =>
      arr.findIndex(
        (i) => i.name === item.name && i.price === item.price && i.quantity === item.quantity
      ) === idx
  );

  // Total Amount (Grand Total)
  $("td")
    .filter((_, el) => $(el).text().trim() === "Grand Total")
    .each((_, el) => {
      const priceEl = $(el).next();
      const priceText = priceEl.text().trim().replace(/₹/g, "").replace(",", "");
      if (!isNaN(priceText)) {
        result.total_amount = parseFloat(priceText);
      }
    });

  return result;
}

export { parseSwiggyOrder  };
