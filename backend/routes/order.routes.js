import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import { validateOrder } from "../middleware/validate.middleware.js";
import db from "../config/db.config.js";

const router = express.Router();

// Helper function to update total_price for an order based on batch assignments
export const updateOrderTotalPrice = async (orderId) => {
  try {
    const sql = `
      SELECT 
        o.unit_price,
        COALESCE(SUM(bo.qty), 0) as total_assigned_qty
      FROM orders o
      LEFT JOIN batch_order bo ON o.id = bo.fk_batch_order_order
      WHERE o.id = ?
      GROUP BY o.id, o.unit_price
    `;

    const [result] = await db.query(sql, [orderId]);

    if (result.length === 0) {
      throw new Error("Order not found");
    }

    const { unit_price, total_assigned_qty } = result[0];
    const new_total_price = parseFloat((Number(unit_price) * Number(total_assigned_qty)).toFixed(2));

    const updateSql = `UPDATE orders SET total_price = ? WHERE id = ?`;
    await db.query(updateSql, [new_total_price, orderId]);

    console.log('Order total price updated:', { orderId, new_total_price });
    return new_total_price;
  } catch (error) {
    console.error("Error updating order total price:", error);
    throw error;
  }
};

// Get all orders with client and product info
router.get("/", verifyToken, async (req, res) => {
  try {
    const sql = `
      SELECT o.*, c.name as client_name, p.name as product_name,
             DATE_FORMAT(o.required_date, '%Y-%m-%d') as required_date
      FROM \`orders\` o
      LEFT JOIN client c ON o.fk_order_client = c.id
      LEFT JOIN product p ON o.fk_order_product = p.id
    `;
    const [orders] = await db.query(sql);
    console.log('Orders fetched:', orders.length);
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ 
      error: "Error fetching orders",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get orders by client
router.get("/client/:clientId", verifyToken, (req, res) => {
  const sql = `
    SELECT o.*, c.name as client_name, p.name as product_name 
    FROM \`orders\` o
    LEFT JOIN client c ON o.fk_order_client = c.id
    LEFT JOIN product p ON o.fk_order_product = p.id
    WHERE o.fk_order_client = ?
  `;
  db.query(sql, [req.params.clientId], (err, data) => {
    if (err) return res.status(500).json({ error: "Error fetching orders" });
    res.json(data);
  });
});

// Get single order
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const sql = `
      SELECT o.*, c.name as client_name, p.name as product_name,
             bo.qty as batch_qty, bo.description as batch_description, b.batch_number
      FROM \`orders\` o
      LEFT JOIN client c ON o.fk_order_client = c.id
      LEFT JOIN product p ON o.fk_order_product = p.id
      LEFT JOIN batch_order bo ON o.id = bo.fk_batch_order_order
      LEFT JOIN batch b ON bo.fk_batch_order_batch = b.id
      WHERE o.id = ?
    `;
    const [data] = await db.query(sql, [req.params.id]);
    
    if (data.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Group batch information
    const order = {
      ...data[0],
      batches: data
        .map((row) => ({
          batch_number: row.batch_number,
          qty: row.batch_qty,
          description: row.batch_description
        }))
        .filter((batch) => batch.batch_number),
    };

    delete order.batch_number;
    delete order.batch_qty;
    delete order.batch_description;

    console.log('Order fetched:', order.id);
    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ 
      error: "Error fetching order",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Create order
router.post("/", verifyToken, validateOrder, async (req, res) => {
  try {
    const {
      fk_order_client,
      fk_order_product,
      qty,
      unit_price,
      required_date,
      status,
    } = req.body;

    // Validate required_date
    if (!required_date) {
      return res.status(400).json({
        error: "Missing required field: required_date",
      });
    }

    if (
      status &&
      !["pending", "assigned", "in_transit", "completed"].includes(status)
    ) {
      return res.status(400).json({
        error:
          "Invalid status value. Must be one of: pending, assigned, in_transit, completed",
      });
    }

    // Set current date and required date to noon UTC to avoid timezone issues
    const currentDate = new Date();
    currentDate.setUTCHours(12, 0, 0, 0);
    const date = currentDate.toISOString().slice(0, 19).replace("T", " ");

    const reqDate = new Date(required_date);
    reqDate.setUTCHours(12, 0, 0, 0);
    const formattedRequiredDate = reqDate
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    // First get the client and product names
    const getNamesSql = `
      SELECT c.name as client_name, p.name as product_name 
      FROM client c, product p 
      WHERE c.id = ? AND p.id = ?
    `;

    const [namesData] = await db.query(getNamesSql, [fk_order_client, fk_order_product]);

    if (namesData.length === 0) {
      return res.status(400).json({
        error: "Invalid client or product ID"
      });
    }

    const total_price = parseFloat((Number(qty) * Number(unit_price)).toFixed(2));
    const sql = `
      INSERT INTO orders (
        fk_order_client, fk_order_product, qty,
        unit_price, total_price, date, required_date, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      fk_order_client,
      fk_order_product,
      qty,
      unit_price,
      total_price,
      date,
      formattedRequiredDate,
      status || "pending",
    ];

    const [result] = await db.query(sql, params);
    console.log('Order created:', result.insertId);

    res.status(201).json({
      id: result.insertId,
      ...req.body,
      total_price,
      date,
      client_name: namesData[0].client_name,
      product_name: namesData[0].product_name,
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ 
      error: "Error creating order",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update order
router.put("/:id", verifyToken, validateOrder, (req, res) => {
  const {
    fk_order_client,
    fk_order_product,
    qty,
    unit_price,
    required_date,
    status,
  } = req.body;

  // Validate required_date
  if (!required_date) {
    return res.status(400).json({
      error: "Missing required field: required_date",
    });
  }

  if (
    status &&
    !["pending", "assigned", "in_transit", "completed"].includes(status)
  ) {
    return res.status(400).json({
      error:
        "Invalid status value. Must be one of: pending, assigned, in_transit, completed",
    });
  }

  const reqDate = new Date(required_date);
  reqDate.setUTCHours(12, 0, 0, 0);
  const formattedRequiredDate = reqDate
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
  const sql = `
    UPDATE orders 
    SET fk_order_client=?, fk_order_product=?, qty=?,
        unit_price=?, total_price=?, required_date=?, status=?
    WHERE id=?
  `;

  const total_price = parseFloat((Number(qty) * Number(unit_price)).toFixed(2));
  const params = [
    fk_order_client,
    fk_order_product,
    qty,
    unit_price,
    total_price,
    formattedRequiredDate,
    status || "pending",
    req.params.id,
  ];

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error("Database error details:", err);
      return res.status(500).json({
        error: "Error updating order",
        details: err.message,
      });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json({
      id: req.params.id,
      ...req.body,
      total_price,
    });
  });
});

// Delete order
router.delete("/:id", verifyToken, (req, res) => {
  // First delete related batch_order records
  const deleteBatchOrdersSql =
    "DELETE FROM batch_order WHERE fk_batch_order_order = ?";
  db.query(deleteBatchOrdersSql, [req.params.id], (batchErr) => {
    if (batchErr)
      return res
        .status(500)
        .json({ error: "Error deleting batch order relations" });

    // Then delete the order
    const deleteOrderSql = "DELETE FROM `orders` WHERE id = ?";
    db.query(deleteOrderSql, [req.params.id], (err, result) => {
      if (err) return res.status(500).json({ error: "Error deleting order" });
      if (result.affectedRows === 0)
        return res.status(404).json({ message: "Order not found" });
      res.json({ message: "Order and related records deleted successfully" });
    });
  });
});

// Get production requirements
router.get("/production-requirements", verifyToken, async (req, res) => {
  try {
    const sql = `
      SELECT 
        p.id as product_id,
        p.name as product_name,
        SUM(o.qty) as total_quantity,
        MIN(o.required_date) as earliest_required_date,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'order_id', o.id,
            'quantity', o.qty,
            'required_date', DATE_FORMAT(o.required_date, '%Y-%m-%d'),
            'client_name', c.name,
            'total_by_date', (
              SELECT SUM(o2.qty)
              FROM orders o2
              WHERE o2.fk_order_product = p.id
              AND o2.status = 'pending'
              AND DATE(o2.required_date) = DATE(o.required_date)
            )
          )
        ) as orders
      FROM orders o
      JOIN product p ON o.fk_order_product = p.id
      JOIN client c ON o.fk_order_client = c.id
      WHERE o.status = 'pending'
      GROUP BY p.id, p.name
      ORDER BY earliest_required_date ASC
    `;

    const [data] = await db.query(sql);

    // Parse the JSON_ARRAYAGG result for each row
    const formattedData = data.map((item) => ({
      ...item,
      orders: JSON.parse(item.orders),
    }));

    console.log('Production requirements fetched:', formattedData.length);
    res.json(formattedData);
  } catch (error) {
    console.error('Error fetching production requirements:', error);
    res.status(500).json({ 
      error: "Error fetching production requirements",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;