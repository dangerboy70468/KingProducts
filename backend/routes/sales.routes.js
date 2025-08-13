import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import db from "../config/db.config.js";

const router = express.Router();

// Get sales summary
router.get("/summary", verifyToken, async (req, res) => {
  try {
    const [data] = await db.query(`
      SELECT 
        COUNT(*) as total_orders,
        CAST(COALESCE(SUM(CASE 
          WHEN total_price IS NULL OR total_price = 0 THEN qty * unit_price
          ELSE total_price 
        END), 0) AS DECIMAL(10,2)) as total_sales,
        CAST(COALESCE(AVG(CASE 
          WHEN total_price IS NULL OR total_price = 0 THEN qty * unit_price
          ELSE total_price 
        END), 0) AS DECIMAL(10,2)) as average_order_value,
        MIN(date) as first_sale_date,
        MAX(date) as last_sale_date
      FROM orders
      WHERE status = 'delivered'
    `);

    const result = {
      total_orders: Number(data[0].total_orders),
      total_sales: Number(data[0].total_sales),
      average_order_value: Number(data[0].average_order_value),
      first_sale_date: data[0].first_sale_date,
      last_sale_date: data[0].last_sale_date
    };

    res.json(result);
  } catch (error) {
    console.error('Error fetching sales summary:', error);
    res.status(500).json({ error: "Error fetching sales summary", details: error.message });
  }
});

// Get sales by date range
router.get("/range", verifyToken, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    if (!start_date || !end_date) {
      return res.status(400).json({ error: "Start date and end date are required" });
    }
    
    const [data] = await db.query(`
      SELECT 
        o.*,
        c.name as client_name,
        p.name as product_name
      FROM orders o
      JOIN client c ON o.fk_order_client = c.id
      JOIN product p ON o.fk_order_product = p.id
      WHERE o.status = 'delivered'
      AND o.date BETWEEN ? AND ?
      ORDER BY o.date DESC
    `, [start_date, end_date]);
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching sales by date range:', error);
    res.status(500).json({ error: "Error fetching sales by date range", details: error.message });
  }
});

// Get sales by product
router.get("/by-product", verifyToken, async (req, res) => {
  try {
    const [data] = await db.query(`
      SELECT 
        p.id as product_id,
        p.name as product_name,
        COUNT(*) as order_count,
        COALESCE(SUM(o.qty), 0) as total_quantity,
        CAST(COALESCE(SUM(CASE 
          WHEN o.total_price IS NULL OR o.total_price = 0 THEN o.qty * o.unit_price
          ELSE o.total_price 
        END), 0) AS DECIMAL(10,2)) as total_sales
      FROM orders o
      JOIN product p ON o.fk_order_product = p.id
      WHERE o.status = 'delivered'
      GROUP BY p.id, p.name
      ORDER BY total_sales DESC
    `);
    
    const result = data.map(row => ({
      ...row,
      total_sales: Number(row.total_sales),
      total_quantity: Number(row.total_quantity),
      order_count: Number(row.order_count)
    }));
    res.json(result);
  } catch (error) {
    console.error('Error fetching sales by product:', error);
    res.status(500).json({ error: "Error fetching sales by product", details: error.message });
  }
});

// Get sales by client
router.get("/by-client", verifyToken, async (req, res) => {
  try {
    const [data] = await db.query(`
      SELECT 
        c.id as client_id,
        c.name as client_name,
        COUNT(*) as total_orders,
        COALESCE(SUM(CASE 
          WHEN o.total_price IS NULL OR o.total_price = 0 THEN o.qty * o.unit_price
          ELSE o.total_price 
        END), 0) as total_sales,
        MAX(o.date) as last_purchase_date
      FROM orders o
      JOIN client c ON o.fk_order_client = c.id
      WHERE o.status = 'delivered'
      GROUP BY c.id, c.name
      ORDER BY total_sales DESC
    `);
    res.json(data);
  } catch (error) {
    console.error('Error fetching sales by client:', error);
    res.status(500).json({ error: "Error fetching sales by client", details: error.message });
  }
});

// Get monthly sales trend
router.get("/monthly-trend", verifyToken, async (req, res) => {
  try {
    const [data] = await db.query(`
      SELECT 
        DATE_FORMAT(date, '%Y-%m') as month,
        COUNT(*) as total_orders,
        CAST(COALESCE(SUM(CASE 
          WHEN total_price IS NULL OR total_price = 0 THEN qty * unit_price
          ELSE total_price 
        END), 0) AS DECIMAL(10,2)) as total_sales,
        CAST(COALESCE(AVG(CASE 
          WHEN total_price IS NULL OR total_price = 0 THEN qty * unit_price
          ELSE total_price 
        END), 0) AS DECIMAL(10,2)) as average_order_value
      FROM orders
      WHERE status = 'delivered'
      GROUP BY DATE_FORMAT(date, '%Y-%m')
      ORDER BY month DESC
      LIMIT 12
    `);
    
    const result = data.map(row => ({
      ...row,
      total_sales: Number(row.total_sales),
      average_order_value: Number(row.average_order_value),
      total_orders: Number(row.total_orders)
    }));
    res.json(result);
  } catch (error) {
    console.error('Error fetching monthly sales trend:', error);
    res.status(500).json({ error: "Error fetching monthly sales trend", details: error.message });
  }
});

// Get top selling products
router.get("/top-products", verifyToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const [data] = await db.query(`
      SELECT 
        p.id as product_id,
        p.name as product_name,
        COALESCE(SUM(o.qty), 0) as total_quantity,
        CAST(COALESCE(SUM(CASE 
          WHEN o.total_price IS NULL OR o.total_price = 0 THEN o.qty * o.unit_price
          ELSE o.total_price 
        END), 0) AS DECIMAL(10,2)) as total_sales,
        COUNT(*) as order_count
      FROM orders o
      JOIN product p ON o.fk_order_product = p.id
      WHERE o.status = 'delivered'
      GROUP BY p.id, p.name
      ORDER BY total_sales DESC
      LIMIT ?
    `, [parseInt(limit)]);
    
    const result = data.map(row => ({
      ...row,
      total_sales: Number(row.total_sales),
      total_quantity: Number(row.total_quantity),
      order_count: Number(row.order_count)
    }));
    res.json(result);
  } catch (error) {
    console.error('Error fetching top products:', error);
    res.status(500).json({ error: "Error fetching top products", details: error.message });
  }
});

// Get production cost for completed orders
router.get("/production-cost", verifyToken, async (req, res) => {
  try {
    const [data] = await db.query(`
      SELECT 
        CAST(COALESCE(SUM(
          CASE
            WHEN b.init_qty > 0 THEN CAST(b.cost * (bo.qty / b.init_qty) AS DECIMAL(10,2))
            ELSE 0
          END
        ), 0) AS DECIMAL(10,2)) as total_production_cost
      FROM orders o
      JOIN batch_order bo ON o.id = bo.fk_batch_order_order
      JOIN batch b ON bo.fk_batch_order_batch = b.id
      WHERE o.status = 'delivered'
    `);
    
    const result = {
      total_production_cost: Number(data[0].total_production_cost)
    };
    res.json(result);
  } catch (error) {
    console.error('Error fetching production cost:', error);
    res.status(500).json({ error: "Error fetching production cost", details: error.message });
  }
});

// Get total orders (all statuses)
router.get("/total-orders", verifyToken, async (req, res) => {
  try {
    const [data] = await db.query(`SELECT COUNT(*) as total_orders FROM orders`);
    res.json(data[0]);
  } catch (error) {
    console.error('Error fetching total orders:', error);
    res.status(500).json({ error: "Error fetching total orders", details: error.message });
  }
});

// Get total delivered orders
router.get("/total-delivered-orders", verifyToken, async (req, res) => {
  try {
    const [data] = await db.query(`SELECT COUNT(*) as total_delivered_orders FROM orders WHERE status = 'delivered'`);
    res.json(data[0]);
  } catch (error) {
    console.error('Error fetching total delivered orders:', error);
    res.status(500).json({ error: "Error fetching total delivered orders", details: error.message });
  }
});

export default router;
