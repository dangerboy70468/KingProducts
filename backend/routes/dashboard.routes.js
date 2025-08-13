import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import db from "../config/db.config.js";

const router = express.Router();

// Get dashboard summary data
router.get("/summary", verifyToken, async (req, res) => {
  try {
    const summaryData = {};
    
    // Get total products count
    const productsSql = "SELECT COUNT(*) as count FROM product";
    const [productsResult] = await db.query(productsSql);
    summaryData.totalProducts = productsResult[0].count;

    // Get total clients count
    const clientsSql = "SELECT COUNT(*) as count FROM client";
    const [clientsResult] = await db.query(clientsSql);
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

    const [ordersResult] = await db.query(ordersSql, [year, month]);
    
    // Log the results for debugging
    console.log('Orders result:', ordersResult[0]);
    
    summaryData.ordersThisMonth = ordersResult[0].count;
    // Ensure we're getting a number and not a string
    const revenue = parseFloat(ordersResult[0].revenue);
    summaryData.revenueThisMonth = isNaN(revenue) ? 0 : revenue;
    
    // Get low stock items count (using batch table)
    const lowStockSql = `
      SELECT COUNT(DISTINCT fk_batch_product) as count 
      FROM batch 
      WHERE qty < 10 AND exp_date > NOW()
    `;
    const [lowStockResult] = await db.query(lowStockSql);
    summaryData.lowStockItems = lowStockResult[0].count;

    // Get pending deliveries count
    const deliveriesSql = `
      SELECT COUNT(*) as count 
      FROM orders 
      WHERE status IN ('pending', 'assigned')
    `;
    const [deliveriesResult] = await db.query(deliveriesSql);
    summaryData.pendingDeliveries = deliveriesResult[0].count;

    // Log final summary before sending
    console.log('Final dashboard summary:', summaryData);
    res.json(summaryData);
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ 
      error: "Error fetching dashboard summary",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get recent orders
router.get("/recent-orders", verifyToken, async (req, res) => {
  try {
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
    
    const [orders] = await db.query(sql);
    console.log('Recent orders fetched:', orders.length);
    res.json(orders);
  } catch (error) {
    console.error('Error fetching recent orders:', error);
    res.status(500).json({ 
      error: "Error fetching recent orders",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router; 