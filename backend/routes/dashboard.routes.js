import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import db from "../config/db.config.js";

const router = express.Router();

// Get dashboard summary data
router.get("/summary", verifyToken, (req, res) => {
  const summaryData = {};
  
  // Get total products count
  const productsSql = "SELECT COUNT(*) as count FROM product";
  db.query(productsSql, (err, productsResult) => {
    if (err) {
      console.error('Error fetching product count:', err);
      return res.status(500).json({ error: "Error fetching dashboard summary" });
    }
    summaryData.totalProducts = productsResult[0].count;

    // Get total clients count
    const clientsSql = "SELECT COUNT(*) as count FROM client";
    db.query(clientsSql, (err, clientsResult) => {
      if (err) {
        console.error('Error fetching client count:', err);
        return res.status(500).json({ error: "Error fetching dashboard summary" });
      }
      summaryData.totalClients = clientsResult[0].count;

      // Get orders this month count and revenue
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1; // JavaScript months are 0-based
      
      const ordersSql = `
        SELECT 
          COUNT(*) as count,
          COALESCE(SUM(CASE 
            WHEN total_price IS NULL OR total_price = 0 THEN qty * unit_price
            ELSE total_price 
          END), 0) as revenue
        FROM orders
        WHERE YEAR(date) = ? 
        AND MONTH(date) = ?
        AND status = 'delivered'
      `;

      db.query(ordersSql, [year, month], (err, ordersResult) => {
        if (err) {
          console.error('Error fetching orders data:', err);
          console.error('SQL Query:', ordersSql);
          console.error('Parameters:', [year, month]);
          return res.status(500).json({ error: "Error fetching orders data" });
        }

        // Log the results for debugging
        console.log('Orders result:', ordersResult[0]);
        
        summaryData.ordersThisMonth = ordersResult[0].count;
        // Ensure we're getting a number and not a string
        const revenue = parseFloat(ordersResult[0].revenue);
        summaryData.revenueThisMonth = isNaN(revenue) ? 0 : revenue;
        
        // Log the final summary
        console.log('Final summary:', summaryData);

        // Get low stock items count (using batch table)
        const lowStockSql = `
          SELECT COUNT(DISTINCT fk_batch_product) as count 
          FROM batch 
          WHERE qty < 10 AND exp_date > NOW()
        `;
        db.query(lowStockSql, (err, lowStockResult) => {
          if (err) {
            console.error('Error fetching low stock count:', err);
            return res.status(500).json({ error: "Error fetching dashboard summary" });
          }
          summaryData.lowStockItems = lowStockResult[0].count;

          // Get pending deliveries count
          const deliveriesSql = `
            SELECT COUNT(*) as count 
            FROM orders 
            WHERE status IN ('pending', 'assigned')
          `;
          db.query(deliveriesSql, (err, deliveriesResult) => {
            if (err) {
              console.error('Error fetching pending deliveries:', err);
              return res.status(500).json({ error: "Error fetching dashboard summary" });
            }
            summaryData.pendingDeliveries = deliveriesResult[0].count;

            res.json(summaryData);
          });
        });
      });
    });
  });
});

// Get recent orders
router.get("/recent-orders", verifyToken, (req, res) => {
  const sql = `
    SELECT 
      o.id,
      c.name as client,
      p.name as product,
      DATE_FORMAT(o.date, '%Y-%m-%d') as date,
      o.status
    FROM orders o
    LEFT JOIN client c ON o.fk_order_client = c.id
    LEFT JOIN product p ON o.fk_order_product = p.id
    ORDER BY o.date DESC
    LIMIT 5
  `;
  
  db.query(sql, (err, orders) => {
    if (err) {
      console.error('Error fetching recent orders:', err);
      return res.status(500).json({ error: "Error fetching recent orders" });
    }
    res.json(orders);
  });
});

export default router; 