import * as cheerio from "cheerio";

export function parseGenericOrder(subject, content, fromEmail) {
  const $ = cheerio.load(content);
  
  // Try to determine platform from email or subject
  const determinePlatform = () => {
    const fromText = fromEmail.toLowerCase();
    const subjectText = subject.toLowerCase();
    
    const platformKeywords = {
      'amazon': 'Amazon',
      'flipkart': 'Flipkart', 
      'myntra': 'Myntra',
      'swiggy': 'Swiggy',
      'zomato': 'Zomato',
      'blinkit': 'Blinkit',
      'bigbasket': 'BigBasket',
      'grofers': 'Grofers',
      'dunzo': 'Dunzo',
      'uber': 'Uber Eats',
      'dominos': 'Dominos',
      'pizzahut': 'Pizza Hut',
      'kfc': 'KFC',
      'mcdonalds': 'McDonalds',
      'nykaa': 'Nykaa',
      'ajio': 'Ajio',
      'jabong': 'Jabong'
    };
    
    for (const [keyword, platform] of Object.entries(platformKeywords)) {
      if (fromText.includes(keyword) || subjectText.includes(keyword)) {
        return platform;
      }
    }
    
    return 'Unknown';
  };

  const result = {
    order_id: "",
    platform: determinePlatform(),
    order_date: new Date().toISOString().split("T")[0],
    items: [],
    total_amount: 0,
    payment_mode: "Unknown",
    tracking_id: "",
    delivery_status: "Pending",
    delivery_address: "Unknown",
    tracking_url: "",
    email_snippet: content.substring(0, 500),
  };

  try {
    // Generic Order ID patterns
    const orderIdPatterns = [
      /Order[:\s#]*([A-Z0-9\-]{6,})/i,
      /Order ID[:\s]*([A-Z0-9\-]{6,})/i,
      /Invoice[:\s#]*([A-Z0-9\-]{6,})/i,
      /Reference[:\s#]*([A-Z0-9\-]{6,})/i,
      /Transaction[:\s#]*([A-Z0-9\-]{6,})/i
    ];

    for (const pattern of orderIdPatterns) {
      const orderIdMatch = content.match(pattern);
      if (orderIdMatch) {
        result.order_id = orderIdMatch[1];
        break;
      }
    }

    if (!result.order_id) {
      result.order_id = `${result.platform.toUpperCase()}-${Date.now()}`;
    }

    // Generic total amount patterns
    const totalPatterns = [
      /(?:Total|Grand Total|Amount|Final Amount)[^₹Rs\d]*(?:₹|Rs\.?)\s*([\d,.]+)/i,
      /(?:Paid|Payment)[^₹Rs\d]*(?:₹|Rs\.?)\s*([\d,.]+)/i,
      /₹\s*([\d,.]+)[^\d]*(?:total|paid|amount)/i
    ];

    for (const pattern of totalPatterns) {
      const totalMatch = content.match(pattern);
      if (totalMatch) {
        result.total_amount = parseFloat(totalMatch[1].replace(/,/g, ""));
        break;
      }
    }

    // Generic delivery address patterns
    const addressPatterns = [
      /(?:Delivery|Shipping) Address[:\s]*([^\n]+)/i,
      /(?:Delivered|Shipped) to[:\s]*([^\n]+)/i,
      /Address[:\s]*([^\n]+)/i
    ];

    for (const pattern of addressPatterns) {
      const addressMatch = content.match(pattern);
      if (addressMatch) {
        const address = addressMatch[1].trim();
        if (address.length > 10) {
          result.delivery_address = address;
          break;
        }
      }
    }

    // Generic items extraction
    const items = new Set();
    
    // Try to extract from common HTML structures
    $("li, tr, td, p, div").each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 3 && text.length < 100) {
        // Skip common non-item text
        const skipPatterns = [
          /order/i, /total/i, /amount/i, /address/i, /delivery/i,
          /payment/i, /thank/i, /regards/i, /support/i, /help/i,
          /unsubscribe/i, /privacy/i, /terms/i, /copyright/i,
          /^\d+$/, /^₹/, /^rs/i, /email/i, /phone/i, /contact/i
        ];
        
        if (!skipPatterns.some(pattern => pattern.test(text))) {
          const cleanText = text
            .replace(/₹[\d,.]+/g, '') // Remove prices
            .replace(/\d+\s*x\s*/i, '') // Remove quantity
            .replace(/qty[:\s]*\d+/i, '') // Remove qty
            .trim();
          
          if (cleanText.length > 3) {
            items.add(cleanText);
          }
        }
      }
    });

    result.items = Array.from(items).slice(0, 5).map(itemName => ({
      name: itemName,
      quantity: 1,
      price: null
    }));

    // Generic delivery status
    const statusKeywords = {
      "delivered": "Delivered",
      "shipped": "Shipped",
      "out for delivery": "Out for Delivery",
      "in transit": "In Transit", 
      "confirmed": "Confirmed",
      "preparing": "Preparing",
      "processing": "Processing"
    };

    const lowerContent = content.toLowerCase();
    for (const [keyword, status] of Object.entries(statusKeywords)) {
      if (lowerContent.includes(keyword)) {
        result.delivery_status = status;
        break;
      }
    }

    // Generic tracking ID
    const trackingPatterns = [
      /(?:Tracking|Track|AWB|Reference)[:\s#]*([A-Z0-9]{8,})/i,
      /Track your (?:order|package)[:\s]*([A-Z0-9]+)/i
    ];

    for (const pattern of trackingPatterns) {
      const trackingMatch = content.match(pattern);
      if (trackingMatch) {
        result.tracking_id = trackingMatch[1];
        break;
      }
    }

    // Generic tracking URL
    const trackingUrlMatch = content.match(/(https?:\/\/[^\s]+(?:track|trace)[^\s]*)/i);
    if (trackingUrlMatch) {
      result.tracking_url = trackingUrlMatch[1];
    }

    // Generic payment mode detection
    const paymentKeywords = {
      "credit card": "Credit Card",
      "debit card": "Debit Card", 
      "upi": "UPI",
      "netbanking": "Net Banking",
      "wallet": "Wallet",
      "cash on delivery": "COD",
      "cod": "COD",
      "online": "Online"
    };

    for (const [keyword, mode] of Object.entries(paymentKeywords)) {
      if (lowerContent.includes(keyword)) {
        result.payment_mode = mode;
        break;
      }
    }

  } catch (error) {
    console.error("Error parsing generic order:", error);
  }

  return result;
}