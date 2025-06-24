import * as cheerio from "cheerio";

export function parseDominosOrder({ email_snippet, order_date }) {
  const $ = cheerio.load(email_snippet);
  const result = {
    order_id: "",
    platform: "Dominos",
    order_date,
    items: [],
    total_amount: 0,
    payment_mode: "Unknown",
    delivery_status: "Confirmed",
    delivery_address: "Unknown",
    tracking_id: "",
    tracking_url: "",
    email_snippet,
  };

  // Order ID (Order No.)
  const orderIdText = $("span, p, td").filter((_, el) => $(el).text().match(/Order No/i)).first().text();
  const orderIdMatch = orderIdText.match(/Order No\.?\s*[:.]?\s*([A-Za-z0-9]+)/i);
  if (orderIdMatch) result.order_id = orderIdMatch[1];

  // Payment Mode
  const paymentText = $("span, td").filter((_, el) => $(el).text().toLowerCase().includes("payment mode")).first().parent().text();
  const paymentMatch = paymentText.match(/Payment Mode\s*:?(.+)/i);
  if (paymentMatch) result.payment_mode = paymentMatch[1].trim();

  // Delivery Address
  const addressBlock = $("h2:contains('Delivery Address')").next("span").text().replace(/\s+/g, " ").trim();
  if (addressBlock) result.delivery_address = addressBlock;

  // --- ITEMS TABLE ---
  const itemsHeader = $("h2").filter((_, el) => $(el).text().trim().toLowerCase() === "items").first();
  if (itemsHeader.length) {
    // Go up to the parent <table> (not <td>)
    const itemsTable = itemsHeader.closest("table");
    // Skip the header row (slice(1))
    itemsTable.find("tr").slice(1).each((_, tr) => {
      const tds = $(tr).find("td");
      if (tds.length === 3) {
        // Get name and variant
        let name = $(tds[0]).find("h3").text().trim();
        // Optionally, append variant info if present
        const variant = $(tds[0]).find("span p").text().replace(/\s+/g, " ").trim();
        if (variant) name += " " + variant;
        const quantity = parseInt($(tds[1]).find("h3").text().trim()) || 1;
        const price = parseFloat($(tds[2]).find("h3").text().replace(/[^\d.]/g, "")) || 0;
        if (name) result.items.push({ name, quantity, price });
      }
    });
  }

  // --- ORDER TOTAL (from Order Total span) ---
  const orderTotalSpan = $("span").filter((_, el) => $(el).text().trim().toLowerCase() === "order total").first();
  if (orderTotalSpan.length) {
    const amountSpan = orderTotalSpan.next("span");
    // Remove all non-digit and non-dot characters
    const amountText = amountSpan.text().replace(/[^0-9.]/g, "");
    if (amountText) result.total_amount = parseFloat(amountText);
  }

  return result;
}
