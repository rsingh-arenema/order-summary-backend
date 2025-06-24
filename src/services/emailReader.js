import Imap from "imap";
import { simpleParser } from "mailparser";
import dotenv from "dotenv";
dotenv.config();
import { parseAmazonOrder } from "./parsers/parseAmazonOrder.js";
import { parseFlipkartOrder } from "./parsers/parseFlipkartOrder.js";
import { parseMyntraOrder } from "./parsers/parseMyntraOrder.js";
import { parseSwiggyOrder } from "./parsers/parseSwiggyOrder.js";
import { parseBlinkitOrder } from "./parsers/parseBlinkitOrder.js";

export const fetchRecentOrderEmails = () => {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: process.env.IMAP_USER,
      password: process.env.IMAP_PASSWORD,
      host: process.env.IMAP_HOST,
      port: process.env.IMAP_PORT,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }, // <--- Add this line
    });

    const emails = [];

    imap.once("ready", () => {
      imap.openBox("INBOX", false, () => {
        imap.search(["ALL", ["SUBJECT", "Order"]], (err, results) => {
          if (!results || results.length === 0) {
            imap.end();
            return resolve([]);
          }
          // ✅ Limit to latest 20 emails
          const recentEmails = results.slice(-20);
          const fetch = imap.fetch(recentEmails, {
            bodies: "",
            markSeen: true,
          });

          fetch.on("message", (msg) => {
            msg.on("body", (stream) => {
              simpleParser(stream, async (err, parsed) => {
                const { from, subject, html, text } = parsed;
                const content = html || text || "";

                let extracted;

                if (from.text.includes("amazon")) {
                  extracted = parseAmazonOrder(subject, content);
                } else if (from.text.includes("flipkart")) {
                  extracted = parseFlipkartOrder(subject, content, text);
                } else if (from.text.includes("myntra")) {
                  extracted = parseMyntraOrder(subject, content);
                } else if (from.text.includes("swiggy")) {
                  const order_date = new Date().toISOString().split("T")[0];
                  extracted = parseSwiggyOrder({
                    email_snippet: content,
                    order_date,
                  });
                } else if (from.text.includes("blinkit")) {
                  extracted = parseBlinkitOrder(subject, content, text);
                } else {
                  extracted = {
                    order_id: "UNKNOWN-" + Date.now(),
                    platform: "Unknown",
                    order_date: new Date().toISOString().split("T")[0],
                    items: [],
                    total_amount: 0,
                    payment_mode: "Unknown",
                    tracking_id: "",
                    delivery_status: "Pending",
                    delivery_address: "Unknown",
                    tracking_url: "",
                    email_snippet: content,
                  };
                }

                emails.push(extracted);
              });
            });
          });

          fetch.once("end", () => {
            imap.end();
          });
        });
      });
    });

    imap.once("error", reject);
    imap.once("end", () => resolve(emails));
    imap.connect();
  });
};
