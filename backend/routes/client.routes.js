import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import { validateClient } from "../middleware/validate.middleware.js";
import db from "../config/db.config.js";

const router = express.Router();

// Get all clients
router.get("/", verifyToken, async (req, res) => {
  try {
    const sql = `
      SELECT c.*, 
             COUNT(DISTINCT o.id) as total_orders,
             COALESCE(SUM(o.total_price), 0) as total_amount
      FROM client c
      LEFT JOIN \`orders\` o ON c.id = o.fk_order_client
      GROUP BY c.id
    `;
    const [clients] = await db.query(sql);
    console.log('Clients fetched:', clients.length);
    res.json(clients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ 
      error: "Error fetching clients",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Create new client
router.post("/", verifyToken, validateClient, async (req, res) => {
  try {
    const { name, contact_person, location, phone1, phone2, email } = req.body;
    const sql = `
      INSERT INTO client (name, contact_person, location, phone1, phone2, email) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.query(sql, [name, contact_person, location, phone1, phone2, email]);
    console.log('Client created:', result.insertId);
    
    res.status(201).json({
      id: result.insertId,
      name,
      contact_person,
      location,
      phone1,
      phone2,
      email,
    });
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ 
      error: "Error creating client",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get single client with order history
router.get("/:id", verifyToken, async (req, res) => {
  try {
    // Get client details
    const clientSql = "SELECT * FROM client WHERE id = ?";
    const [clientData] = await db.query(clientSql, [req.params.id]);

    if (clientData.length === 0) {
      return res.status(404).json({ message: "Client not found" });
    }

    // Get client's orders
    const ordersSql = `
      SELECT o.*, p.name as product_name
      FROM \`orders\` o
      LEFT JOIN product p ON o.fk_order_product = p.id
      WHERE o.fk_order_client = ?
      ORDER BY o.date DESC
    `;
    const [ordersData] = await db.query(ordersSql, [req.params.id]);

    console.log('Client and orders fetched for ID:', req.params.id);
    res.json({
      ...clientData[0],
      orders: ordersData,
    });
  } catch (error) {
    console.error('Error fetching client details:', error);
    res.status(500).json({ 
      error: "Error fetching client details",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update client
router.put("/:id", verifyToken, validateClient, (req, res) => {
  const { name, contact_person, location, phone1, phone2, email } = req.body;
  const sql = `
    UPDATE client 
    SET name=?, contact_person=?, location=?, phone1=?, phone2=?, email=?
    WHERE id=?
  `;

  db.query(
    sql,
    [name, contact_person, location, phone1, phone2, email, req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: "Error updating client" });
      if (result.affectedRows === 0)
        return res.status(404).json({ message: "Client not found" });
      res.json({
        id: parseInt(req.params.id),
        name,
        contact_person,
        location,
        phone1,
        phone2,
        email,
      });
    }
  );
});

// Delete client
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    // Check for existing orders
    const checkOrdersSql =
      "SELECT COUNT(*) as orderCount FROM `orders` WHERE fk_order_client = ?";
    const [orderData] = await db.query(checkOrdersSql, [req.params.id]);
    
    if (orderData[0].orderCount > 0) {
      return res.status(400).json({ message: "Client has existing orders" });
    }

    const deleteSql = "DELETE FROM client WHERE id = ?";
    const [deleteResult] = await db.query(deleteSql, [req.params.id]);

    if (deleteResult.affectedRows === 0) {
      return res.status(404).json({ message: "Client not found" });
    }

    console.log('Client deleted:', req.params.id);
    res.json({ message: "Client deleted successfully" });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ 
      error: "Error deleting client",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get client order summary
router.get("/:id/order-summary", verifyToken, async (req, res) => {
  try {
    const sql = `
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(qty), 0) as total_quantity,
        COALESCE(SUM(total_price), 0) as total_amount,
        MIN(date) as first_order_date,
        MAX(date) as last_order_date
      FROM \`orders\`
      WHERE fk_order_client = ?
    `;
    const [data] = await db.query(sql, [req.params.id]);
    console.log('Order summary fetched for client:', req.params.id);
    res.json(data[0]);
  } catch (error) {
    console.error('Error fetching order summary:', error);
    res.status(500).json({ 
      error: "Error fetching order summary",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
