import * as cheerio from "cheerio";

function parseAmazonOrder({ email_snippet, order_date }) {
  const $ = cheerio.load(email_snippet);
  const result = {
    order_id: "",
    platform: "Amazon",
    order_date,
    items: [],
    total_amount: null,
    payment_mode: "Unknown",
    delivery_status: "Confirmed",
    delivery_address: "Unknown",
    tracking_id: "",
    tracking_url: "",
    email_snippet: email_snippet.substring(0, 500), // Limit snippet length
  };

  try {
    // Enhanced Order ID extraction patterns
    const orderIdPatterns = [
      /Order[^\d]*#?\s*(\d{3}-\d{7}-\d{7})/i,
      /Order[^\d]*#?\s*([A-Z0-9]{10,})/i,
      /Order ID[:\s]*([A-Z0-9-]{10,})/i,
      /Your order[^\d]*(\d{3}-\d{7}-\d{7})/i
    ];

    for (const pattern of orderIdPatterns) {
      const orderIdMatch = email_snippet.match(pattern);
      if (orderIdMatch) {
        result.order_id = orderIdMatch[1];
        break;
      }
    }

    // Enhanced Total Amount extraction
    const totalPatterns = [
      /Order Total[^₹Rs\d]*(?:₹|Rs\.?)\s*([\d,.]+)/i,
      /Total[^₹Rs\d]*(?:₹|Rs\.?)\s*([\d,.]+)/i,
      /Amount[^₹Rs\d]*(?:₹|Rs\.?)\s*([\d,.]+)/i,
      /Grand Total[^₹Rs\d]*(?:₹|Rs\.?)\s*([\d,.]+)/i
    ];

    for (const pattern of totalPatterns) {
      const totalMatch = email_snippet.match(pattern);
      if (totalMatch) {
        result.total_amount = parseFloat(totalMatch[1].replace(/,/g, ""));
        break;
      }
    }

    // Enhanced delivery address extraction
    const addressPatterns = [
      "Your order will be sent to:",
      "Shipping Address:",
      "Delivery Address:",
      "Ship to:"
    ];

    for (const pattern of addressPatterns) {
      const addressElement = $("td, div, p")
        .filter((_, el) => $(el).text().includes(pattern))
        .next();
      
      if (addressElement.length > 0) {
        const addressText = addressElement.text().trim().replace(/\s+/g, " ");
        if (addressText.length > 10) {
          result.delivery_address = addressText;
          break;
        }
      }
    }

    // Enhanced item extraction
    const itemSelectors = [
      'img[alt]',
      'td[style*="product"]',
      'div[class*="product"]',
      'span[class*="product"]'
    ];

    // Try different methods to extract items
    for (const selector of itemSelectors) {
      $(selector).each((_, el) => {
        const name = $(el).attr("alt") || $(el).text();
        if (name && name.trim().length > 4 && !name.includes("Amazon")) {
          const cleanName = name.trim().replace(/\s+/g, " ");
          // Avoid duplicates
          if (!result.items.some(item => item.name === cleanName)) {
            result.items.push({ 
              name: cleanName, 
              quantity: 1, 
              price: null 
            });
          }
        }
      });
      
      if (result.items.length > 0) break;
    }

    // Try to extract items from text patterns if no items found
    if (result.items.length === 0) {
      const itemLines = email_snippet
        .split(/\n|\r\n/)
        .filter(line => {
          const cleanLine = line.trim();
          return cleanLine.length > 10 && 
                 cleanLine.length < 100 &&
                 !cleanLine.includes("Amazon") &&
                 !cleanLine.includes("Order") &&
                 !/^\d+$/.test(cleanLine) &&
                 !/^₹/.test(cleanLine);
        });

      itemLines.slice(0, 5).forEach(line => { // Limit to 5 items
        const cleanLine = line.trim().replace(/\s+/g, " ");
        if (cleanLine) {
          result.items.push({
            name: cleanLine,
            quantity: 1,
            price: null
          });
        }
      });
    }

    // Try to extract tracking information
    const trackingPatterns = [
      /Track your package[:\s]*([A-Z0-9]+)/i,
      /Tracking ID[:\s]*([A-Z0-9]+)/i,
      /AWB[:\s]*([A-Z0-9]+)/i
    ];

    for (const pattern of trackingPatterns) {
      const trackingMatch = email_snippet.match(pattern);
      if (trackingMatch) {
        result.tracking_id = trackingMatch[1];
        break;
      }
    }

    // Extract tracking URL
    const trackingUrlMatch = email_snippet.match(/(https?:\/\/[^\s]+track[^\s]*)/i);
    if (trackingUrlMatch) {
      result.tracking_url = trackingUrlMatch[1];
    }

    // Determine delivery status based on email content
    const statusKeywords = {
      "shipped": "Shipped",
      "delivered": "Delivered", 
      "out for delivery": "Out for Delivery",
      "in transit": "In Transit",
      "confirmed": "Confirmed"
    };

    const lowerContent = email_snippet.toLowerCase();
    for (const [keyword, status] of Object.entries(statusKeywords)) {
      if (lowerContent.includes(keyword)) {
        result.delivery_status = status;
        break;
      }
    }

  } catch (error) {
    console.error("Error parsing Amazon order:", error);
  }

  return result;
}

export { parseAmazonOrder };