import * as cheerio from "cheerio";

function parseFlipkartOrder({ email_snippet, order_date }) {
  const $ = cheerio.load(email_snippet);
  const result = {
    order_id: "",
    platform: "Flipkart",
    order_date,
    items: [],
    total_amount: null,
    payment_mode: "Unknown",
    delivery_status: "Confirmed",
    delivery_address: "Unknown",
    tracking_id: "",
    tracking_url: "",
    email_snippet,
  };

  // 🟠 Order ID
  const orderIdText = $("p")
    .filter((_, el) => $(el).text().includes("Order ID"))
    .text();
  const orderMatch = orderIdText.match(/Order ID\s*([A-Z0-9]+)/i);
  if (orderMatch) result.order_id = orderMatch[1];

  // 🟠 Items (robust: look for p.link > a and price span)
  $("p.link").each((_, p) => {
    const a = $(p).find("a").first();
    if (a.length) {
      const name = a.text().trim();
      // Price is in a span after the <a>
      let price = null;
      const priceSpan = a.nextAll("span").first();
      if (priceSpan.length) {
        const priceMatch = priceSpan.text().match(/Rs\.?\s*([\d,.]+)/i);
        if (priceMatch) price = parseFloat(priceMatch[1].replace(/,/g, ""));
      }
      // Quantity is in the next <p> with "Qty:"
      let quantity = 1;
      const qtyP = $(p).parent().find("p").filter((_, el) => $(el).text().includes("Qty:")).first();
      const qtyMatch = qtyP.text().match(/Qty:\s*(\d+)/i);
      if (qtyMatch) quantity = parseInt(qtyMatch[1]);
      result.items.push({ name, quantity, price });
    }
  });

  // 🟠 Total Amount
  let total = null;
  const amountText = $("td, p, span").filter((_, el) => /Amount Paid|Grand Total|Total Paid/i.test($(el).text())).text();
  const totalMatch = amountText.match(/(?:₹|Rs\.?)\s*([\d,]+)/i);
  if (totalMatch) total = parseFloat(totalMatch[1].replace(/,/g, ""));
  result.total_amount = total;

  // 🟠 Delivery Address (look for .address or "Delivery Address" label)
  let address = "";
  const addressDiv = $(".address");
  if (addressDiv.length) {
    address = addressDiv.text().replace(/Delivery Address/i, "").replace(/\s+/g, " ").trim();
  } else {
    // fallback: look for "Delivery Address" label and next <p>
    const deliveryLabel = $("p").filter((_, el) => $(el).text().includes("Delivery Address")).first();
    if (deliveryLabel.length) {
      const nextP = deliveryLabel.next("p");
      if (nextP.length) address = nextP.text().trim();
    }
  }
  if (address) result.delivery_address = address;

  return result;
}

export { parseFlipkartOrder };
