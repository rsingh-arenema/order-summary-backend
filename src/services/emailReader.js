import Imap from "imap";
import { simpleParser } from "mailparser";
import dotenv from "dotenv";
dotenv.config();

import { parseFlipkartOrder } from "./parsers/parseFlipkartOrder.js";
import { parseSwiggyOrder } from "./parsers/parseSwiggyOrder.js";
import { parseZomatoOrder } from "./parsers/parseZomatoOrder.js";
import { parseDominosOrder } from "./parsers/parseDominosOrder.js";

export const fetchRecentOrderEmails = () => {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: process.env.IMAP_USER,
      password: process.env.IMAP_PASSWORD,
      host: process.env.IMAP_HOST,
      port: process.env.IMAP_PORT,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
    });

    const emails = [];
    const limit = process.env.EMAIL_LIMIT
      ? parseInt(process.env.EMAIL_LIMIT)
      : 20;

    imap.once("ready", () => {
      imap.openBox("INBOX", false, () => {
        imap.search(["ALL", ["SUBJECT", "Order"]], (err, results) => {
          if (!results || results.length === 0) {
            imap.end();
            return resolve([]);
          }

          const recentEmails = results.slice(-limit);
          const fetch = imap.fetch(recentEmails, {
            bodies: "",
            markSeen: true,
          });

          fetch.on("message", (msg) => {
            msg.on("body", (stream) => {
              simpleParser(stream, async (err, parsed) => {
                const { from, subject, html, text } = parsed;
                const content = html || text || "";
                const lowerFrom = from.text.toLowerCase();
                const lowerContent = content.toLowerCase();

                const isSupported = [
                  "flipkart",
                  "swiggy",
                  "zomato",
                  "dominos",
                ].some((keyword) => lowerFrom.includes(keyword));

                const isFlipkart = lowerFrom.includes("flipkart");
                const isSwiggy = lowerFrom.includes("swiggy");
                const isZomato = lowerFrom.includes("zomato");
                const isDominos = lowerFrom.includes("dominos");

                let hasOrderDetails = false;
                if (isFlipkart) {
                  hasOrderDetails =
                    lowerContent.includes("order id") &&
                    (lowerContent.includes("amount paid") ||
                      lowerContent.includes("rs"));
                } else if (isSwiggy) {
                  hasOrderDetails =
                    lowerContent.includes("order") &&
                    (lowerContent.includes("total paid") ||
                      lowerContent.includes("total") ||
                      lowerContent.includes("amount"));
                } else if (isDominos) {
                  hasOrderDetails =
                    lowerContent.includes("order") &&
                    (lowerContent.includes("total") ||
                      lowerContent.includes("amount") ||
                      lowerContent.includes("rs"));
                } else if (isZomato) {
                  hasOrderDetails =
                    lowerContent.includes("order") &&
                    (lowerContent.includes("total") ||
                      lowerContent.includes("amount") ||
                      lowerContent.includes("rs"));
                } else {
                  hasOrderDetails = false;
                }

                if (!isSupported || !hasOrderDetails) return;

                const order_date = new Date().toISOString().split("T")[0];
                let extracted = null;

                if (lowerFrom.includes("flipkart")) {
                  extracted = parseFlipkartOrder({
                    email_snippet: content,
                    order_date,
                  });
                } else if (lowerFrom.includes("swiggy")) {
                  extracted = parseSwiggyOrder({
                    email_snippet: content,
                    order_date,
                  });
                } else if (lowerFrom.includes("zomato")) {
                  extracted = parseZomatoOrder({
                    email_snippet: content,
                    order_date,
                  });
                } else if (lowerFrom.includes("dominos")) {
                  extracted = parseDominosOrder({
                    email_snippet: content,
                    order_date,
                  });
                }
                if (!extracted) {
                  console.log(
                    `[Parser Skipped] Reason: Missing data | From: ${from.text} | Subject: ${subject}`
                  );
                }

                if (extracted) emails.push(extracted);
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
