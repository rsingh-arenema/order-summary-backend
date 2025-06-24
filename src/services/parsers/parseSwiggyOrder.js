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
    .filter((_, el) => $(el).text().includes("order id:"))
    .text();
  const orderMatch = orderText.match(/order id:\s*(\d+)/i);
  if (orderMatch) result.order_id = orderMatch[1];

  // Delivery Address
  const addressLabel = $("td")
    .filter((_, el) => $(el).text().trim() === "Deliver To:")
    .parent();
  const addressText = addressLabel
    .next()
    .find("td")
    .text()
    .trim();
  if (addressText) result.delivery_address = addressText;

  // Items
  $("tr")
    .has("td:contains('x ')")
    .each((_, tr) => {
      const itemText = $(tr).text().trim();
      const match = itemText.match(/(\d+)\s*x\s*(.*?)₹?([\d,.]+)/);
      if (match) {
        result.items.push({
          name: match[2].trim(),
          quantity: parseInt(match[1]),
          price: parseFloat(match[3].replace(/,/g, "")),
        });
      }
    });

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
