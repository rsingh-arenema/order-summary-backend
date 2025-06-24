import * as cheerio from "cheerio";

function parseBlinkitOrder(subject, html = "", text = "") {
  const $ = cheerio.load(html);
  const content = html || text || "";
  
  const result = {
    platform: "Blinkit",
    order_id: "",
    order_date: new Date().toISOString().slice(0, 10),
    items: [],
    total_amount: 0,
    payment_mode: "Online",
    delivery_status: "Delivered",
    tracking_id: "",
    tracking_url: "",
    delivery_address: "Unknown",
    email_snippet: content.substring(0, 500),
  };

  try {
    // Enhanced Order ID extraction
    const orderIdPatterns = [
      /Order\s+ID[:\s]*([A-Z0-9\-]+)/i,
      /Order[:\s#]*([A-Z0-9\-]{8,})/i,
      /Invoice[:\s#]*([A-Z0-9\-]+)/i
    ];

    for (const pattern of orderIdPatterns) {
      const orderIdMatch = (content.match(pattern) || subject.match(pattern));
      if (orderIdMatch) {
        result.order_id = orderIdMatch[1];
        break;
      }
    }

    if (!result.order_id) {
      result.order_id = `BLINKIT-${Date.now()}`;
    }

    // Enhanced total amount extraction
    const totalPatterns = [
      /(?:Total|Grand Total|Amount Paid)[^\d₹]*₹\s?(\d+(?:\.\d+)?)/i,
      /₹\s?(\d+(?:\.\d+)?)[^\d]*(?:total|paid)/i,
      /Total[:\s]*₹\s?(\d+(?:\.\d+)?)/i
    ];

    for (const pattern of totalPatterns) {
      const totalMatch = content.match(pattern);
      if (totalMatch) {
        result.total_amount = parseFloat(totalMatch[1]);
        break;
      }
    }

    // Enhanced items extraction
    const items = new Set(); // Use Set to avoid duplicates
    
    // Method 1: Extract from HTML list items
    $("li").each((_, el) => {
      const itemText = $(el).text().trim();
      if (itemText && itemText.length > 2 && itemText.length < 100) {
        // Clean up the item text
        const cleanItem = itemText
          .replace(/₹[\d,.]+/g, '') // Remove price
          .replace(/\d+\s*x\s*/i, '') // Remove quantity multiplier
          .replace(/qty:\s*\d+/i, '') // Remove qty info
          .trim();
        
        if (cleanItem.length > 2) {
          items.add(cleanItem);
        }
      }
    });

    // Method 2: Extract from table rows
    $("tr, td").each((_, el) => {
      const cellText = $(el).text().trim();
      if (cellText && cellText.length > 2 && cellText.length < 100 && 
          !cellText.includes('₹') && !cellText.match(/^\d+$/)) {
        const cleanItem = cellText.replace(/\d+\s*x\s*/i, '').trim();
        if (cleanItem.length > 2) {
          items.add(cleanItem);
        }
      }
    });

    // Method 3: Extract from text patterns
    if (items.size === 0) {
      const itemLines = content
        .split(/\n|\r\n/)
        .filter(line => {
          const cleanLine = line.trim();
          return cleanLine.length > 2 && 
                 cleanLine.length < 100 &&
                 !cleanLine.includes('Blinkit') &&
                 !cleanLine.includes('Order') &&
                 !cleanLine.match(/^₹/) &&
                 !cleanLine.match(/^\d+$/);
        });

      itemLines.slice(0, 10).forEach(line => {
        const cleanLine = line.trim()
          .replace(/₹[\d,.]+/g, '')
          .replace(/\d+\s*x\s*/i, '')
          .trim();
        
        if (cleanLine.length > 2) {
          items.add(cleanLine);
        }
      });
    }

    // Convert Set to array of item objects
    result.items = Array.from(items).slice(0, 10).map(itemName => ({
      name: itemName,
      quantity: 1,
      price: null
    }));

    // Extract delivery address
    const addressPatterns = [
      /Delivery Address[:\s]*([^\n]+)/i,
      /Delivered to[:\s]*([^\n]+)/i,
      /Address[:\s]*([^\n]+)/i
    ];

    for (const pattern of addressPatterns) {
      const addressMatch = content.match(pattern);
      if (addressMatch) {
        result.delivery_address = addressMatch[1].trim();
        break;
      }
    }

    // Extract delivery status
    const statusKeywords = {
      "delivered": "Delivered",
      "out for delivery": "Out for Delivery", 
      "shipped": "Shipped",
      "confirmed": "Confirmed",
      "preparing": "Preparing"
    };

    const lowerContent = content.toLowerCase();
    for (const [keyword, status] of Object.entries(statusKeywords)) {
      if (lowerContent.includes(keyword)) {
        result.delivery_status = status;
        break;
      }
    }

  } catch (error) {
    console.error("Error parsing Blinkit order:", error);
  }

  return result;
}

export { parseBlinkitOrder };