import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import db from "../config/db.config.js";

const router = express.Router();

// Get production requirements grouped by product and date
router.get("/requirements", verifyToken, (req, res) => {
  console.log("Fetching production requirements...");
  const sql = `    SELECT 
      p.id as product_id,
      p.name as product_name,
      DATE_FORMAT(o.required_date, '%Y-%m-%d') as required_date,
      o.qty as required_quantity,
      c.name as client_name,
      o.id as order_id,
      o.status,
      CASE 
        WHEN DATE(o.required_date) < CURDATE() THEN 'overdue'
        WHEN DATE(o.required_date) = CURDATE() THEN 'today'
        WHEN DATE(o.required_date) = DATE_ADD(CURDATE(), INTERVAL 1 DAY) THEN 'tomorrow'
        ELSE 'upcoming'
      END as urgency
    FROM orders o
    JOIN product p ON o.fk_order_product = p.id
    JOIN client c ON o.fk_order_client = c.id
    WHERE o.status = 'pending'
    ORDER BY o.required_date ASC, p.name ASC
  `;

  db.query(sql, (err, data) => {
    if (err) {
      console.error("Database error details:", err);
      return res
        .status(500)
        .json({ error: "Error fetching production requirements" });
    }
    console.log("Raw data:", data); // Group by urgency and then by product
    const groupedByUrgency = data.reduce((acc, row) => {
      const dateStr = row.required_date;
      const urgencyGroup = acc.find((g) => g.urgency === row.urgency);

      if (urgencyGroup) {
        const existingProduct = urgencyGroup.products.find(
          (p) => p.product_id === row.product_id
        );
        if (existingProduct) {
          existingProduct.quantity += row.required_quantity;
          if (!existingProduct.clients.includes(row.client_name)) {
            existingProduct.clients.push(row.client_name);
          }
          existingProduct.order_count++;
        } else {
          urgencyGroup.products.push({
            product_id: row.product_id,
            product_name: row.product_name,
            quantity: row.required_quantity,
            clients: [row.client_name],
            order_count: 1,
            required_date: dateStr,
          });
        }
      } else {
        acc.push({
          urgency: row.urgency,
          products: [
            {
              product_id: row.product_id,
              product_name: row.product_name,
              quantity: row.required_quantity,
              clients: [row.client_name],
              order_count: 1,
              required_date: dateStr,
            },
          ],
        });
      }
      return acc;
    }, []);

    // Sort urgency groups in specific order: overdue, today, tomorrow, upcoming
    const urgencyOrder = ["overdue", "today", "tomorrow", "upcoming"];
    groupedByUrgency.sort(
      (a, b) =>
        urgencyOrder.indexOf(a.urgency) - urgencyOrder.indexOf(b.urgency)
    );

    // Sort products within each urgency group by date
    groupedByUrgency.forEach((group) => {
      group.products.sort(
        (a, b) =>
          new Date(a.required_date).getTime() -
          new Date(b.required_date).getTime()
      );
    });

    res.json(groupedByUrgency);
  });
});

export default router;
