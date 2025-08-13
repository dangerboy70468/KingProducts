import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import db from "../config/db.config.js";

const router = express.Router();

// Get sales summary
router.get("/summary", verifyToken, (req, res) => {
  // First, let's check what orders we have and their status values
  db.query('SELECT id, status, LOWER(TRIM(status)) as cleaned_status FROM orders', (err, statusData) => {
    if (err) {
      console.error('Error checking order statuses:', err);
      return res.status(500).json({ error: "Error checking order statuses" });
    }
    
    console.log('All order statuses:', JSON.stringify(statusData, null, 2));

    // Now get the delivered orders
    db.query('SELECT * FROM orders WHERE LOWER(TRIM(status)) = "delivered"', (err, ordersData) => {
      if (err) {
        console.error('Error checking orders:', err);
        return res.status(500).json({ error: "Error checking orders" });
      }
      
      console.log('All delivered orders:', JSON.stringify(ordersData, null, 2));

      const sql = `
        SELECT 
          COUNT(*) as total_orders,
          SUM(qty * unit_price) as raw_calculated_total,
          SUM(total_price) as raw_total_price,
          SUM(CASE 
            WHEN total_price IS NULL OR total_price = 0 THEN qty * unit_price
            ELSE total_price 
          END) as final_total,
          CAST(COALESCE(SUM(CASE 
            WHEN total_price IS NULL OR total_price = 0 THEN qty * unit_price
            ELSE total_price 
          END), 0) AS DECIMAL(10,2)) as total_sales,
          CAST(COALESCE(AVG(CASE 
            WHEN total_price IS NULL OR total_price = 0 THEN qty * unit_price
            ELSE total_price 
          END), 0) AS DECIMAL(10,2)) as average_order_value,
          MIN(date) as first_sale_date,
          MAX(date) as last_sale_date,
          GROUP_CONCAT(
            CONCAT(
              'id:', id, 
              ',qty:', qty,
              ',unit_price:', unit_price,
              ',total_price:', COALESCE(total_price, 'NULL'),
              ',calculated:', qty * unit_price,
              ',date:', date,
              ',status:', status
            )
            ORDER BY id SEPARATOR '; '
          ) as debug_data
        FROM orders
        WHERE LOWER(TRIM(status)) = 'delivered'
      `;

      console.log('Executing SQL:', sql);

      db.query(sql, (err, data) => {
        if (err) {
          console.error('Error fetching sales summary:', err);
          return res.status(500).json({ error: "Error fetching sales summary" });
        }

        console.log('Raw SQL result:', JSON.stringify(data[0], null, 2));

        // Convert string numbers to actual numbers and handle dates
        const result = {
          total_orders: Number(data[0].total_orders),
          total_sales: Number(data[0].total_sales),
          raw_calculated_total: Number(data[0].raw_calculated_total),
          raw_total_price: Number(data[0].raw_total_price),
          final_total: Number(data[0].final_total),
          average_order_value: Number(data[0].average_order_value),
          first_sale_date: data[0].first_sale_date,
          last_sale_date: data[0].last_sale_date,
          debug_data: data[0].debug_data
        };

        console.log('Processed result:', JSON.stringify(result, null, 2));
        res.json(result);
      });
    });
  });
});

// Get sales by date range
router.get("/range", verifyToken, (req, res) => {
  const { start_date, end_date } = req.query;
  if (!start_date || !end_date) {
    return res.status(400).json({ error: "Start date and end date are required" });
  }
  
  const sql = `
    SELECT 
      o.*,
      c.name as client_name,
      p.name as product_name
    FROM orders o
    JOIN client c ON o.fk_order_client = c.id
    JOIN product p ON o.fk_order_product = p.id
    WHERE LOWER(TRIM(o.status)) = 'delivered'
    AND o.date BETWEEN ? AND ?
    ORDER BY o.date DESC
  `;
  db.query(sql, [start_date, end_date], (err, data) => {
    if (err) {
      console.error('Error fetching sales by date range:', err);
      return res.status(500).json({ error: "Error fetching sales by date range" });
    }
    res.json(data);
  });
});

// Get sales by product
router.get("/by-product", verifyToken, (req, res) => {
  const sql = `
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
    WHERE LOWER(TRIM(o.status)) = 'delivered'
    GROUP BY p.id, p.name
    ORDER BY total_sales DESC
  `;
  db.query(sql, (err, data) => {
    if (err) {
      console.error('Error fetching sales by product:', err);
      return res.status(500).json({ error: "Error fetching sales by product" });
    }
    // Convert string numbers to actual numbers
    const result = data.map(row => ({
      ...row,
      total_sales: Number(row.total_sales),
      total_quantity: Number(row.total_quantity),
      order_count: Number(row.order_count)
    }));
    res.json(result);
  });
});

// Get sales by client
router.get("/by-client", verifyToken, (req, res) => {
  const sql = `
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
  `;
  db.query(sql, (err, data) => {
    if (err)
      return res.status(500).json({ error: "Error fetching sales by client" });
    res.json(data);
  });
});

// Get monthly sales trend
router.get("/monthly-trend", verifyToken, (req, res) => {
  const sql = `
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
    WHERE LOWER(TRIM(status)) = 'delivered'
    GROUP BY DATE_FORMAT(date, '%Y-%m')
    ORDER BY month DESC
    LIMIT 12
  `;
  db.query(sql, (err, data) => {
    if (err) {
      console.error('Error fetching monthly sales trend:', err);
      return res.status(500).json({ error: "Error fetching monthly sales trend" });
    }
    // Convert string numbers to actual numbers
    const result = data.map(row => ({
      ...row,
      total_sales: Number(row.total_sales),
      average_order_value: Number(row.average_order_value),
      total_orders: Number(row.total_orders)
    }));
    res.json(result);
  });
});

// Get top selling products
router.get("/top-products", verifyToken, (req, res) => {
  const { limit = 10 } = req.query;
  const sql = `
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
    WHERE LOWER(TRIM(o.status)) = 'delivered'
    GROUP BY p.id, p.name
    ORDER BY total_sales DESC
    LIMIT ?
  `;
  db.query(sql, [parseInt(limit)], (err, data) => {
    if (err) {
      console.error('Error fetching top products:', err);
      return res.status(500).json({ error: "Error fetching top products" });
    }
    // Convert string numbers to actual numbers
    const result = data.map(row => ({
      ...row,
      total_sales: Number(row.total_sales),
      total_quantity: Number(row.total_quantity),
      order_count: Number(row.order_count)
    }));
    res.json(result);
  });
});

// Get production cost for completed orders
router.get("/production-cost", verifyToken, (req, res) => {
  const sql = `
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
    WHERE LOWER(TRIM(o.status)) = 'delivered'
  `;
  db.query(sql, (err, data) => {
    if (err) {
      console.error('Error fetching production cost:', err);
      return res.status(500).json({ error: "Error fetching production cost" });
    }
    // Convert string number to actual number
    const result = {
      total_production_cost: Number(data[0].total_production_cost)
    };
    res.json(result);
  });
});

// Get total orders (all statuses)
router.get("/total-orders", verifyToken, (req, res) => {
  const sql = `SELECT COUNT(*) as total_orders FROM orders`;
  db.query(sql, (err, data) => {
    if (err) {
      console.error('Error fetching total orders:', err);
      return res.status(500).json({ error: "Error fetching total orders" });
    }
    res.json(data[0]);
  });
});

// Get total delivered orders
router.get("/total-delivered-orders", verifyToken, (req, res) => {
  const sql = `SELECT COUNT(*) as total_delivered_orders FROM orders WHERE status = 'delivered'`;
  db.query(sql, (err, data) => {
    if (err) {
      console.error('Error fetching total delivered orders:', err);
      return res.status(500).json({ error: "Error fetching total delivered orders" });
    }
    res.json(data[0]);
  });
});

export default router;
