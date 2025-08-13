import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import { validateClient } from "../middleware/validate.middleware.js";
import db from "../config/db.config.js";

const router = express.Router();

// Get all clients
router.get("/", verifyToken, (req, res) => {
  const sql = `
    SELECT c.*, 
           COUNT(DISTINCT o.id) as total_orders,
           SUM(o.total_price) as total_amount
    FROM client c
    LEFT JOIN \`orders\` o ON c.id = o.fk_order_client
    GROUP BY c.id
  `;
  db.query(sql, (err, data) => {
    if (err) return res.status(500).json({ error: "Error fetching clients" });
    res.json(data);
  });
});

// Create new client
router.post("/", verifyToken, validateClient, (req, res) => {
  const { name, contact_person, location, phone1, phone2, email } = req.body;
  const sql = `
    INSERT INTO client (name, contact_person, location, phone1, phone2, email) 
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [name, contact_person, location, phone1, phone2, email],
    (err, result) => {
      if (err) return res.status(500).json({ error: "Error creating client" });
      res
        .status(201)
        .json({
          id: result.insertId,
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

// Get single client with order history
router.get("/:id", verifyToken, (req, res) => {
  // Get client details
  const clientSql = "SELECT * FROM client WHERE id = ?";
  db.query(clientSql, [req.params.id], (err, clientData) => {
    if (err) return res.status(500).json({ error: "Error fetching client" });
    if (clientData.length === 0)
      return res.status(404).json({ message: "Client not found" });

    // Get client's orders
    const ordersSql = `
      SELECT o.*, p.name as product_name
      FROM \`orders\` o
      LEFT JOIN product p ON o.fk_order_product = p.id
      WHERE o.fk_order_client = ?
      ORDER BY o.date DESC
    `;
    db.query(ordersSql, [req.params.id], (err, ordersData) => {
      if (err)
        return res.status(500).json({ error: "Error fetching client orders" });

      res.json({
        ...clientData[0],
        orders: ordersData,
      });
    });
  });
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
router.delete("/:id", verifyToken, (req, res) => {
  // Check for existing orders
  const checkOrdersSql =
    "SELECT COUNT(*) as orderCount FROM `orders` WHERE fk_order_client = ?";
  db.query(checkOrdersSql, [req.params.id], (err, data) => {
    if (err) return res.status(500).json({ error: "Error checking orders" });
    if (data[0].orderCount > 0)
      return res.status(400).json({ message: "Client has existing orders" });

    const deleteSql = "DELETE FROM client WHERE id = ?";
    db.query(deleteSql, [req.params.id], (err) => {
      if (err) return res.status(500).json({ error: "Error deleting client" });
      res.json({ message: "Client deleted successfully" });
    });
  });
});

// Get client order summary
router.get("/:id/order-summary", verifyToken, (req, res) => {
  const sql = `
    SELECT 
      COUNT(*) as total_orders,
      SUM(qty) as total_quantity,
      SUM(total_price) as total_amount,
      MIN(date) as first_order_date,
      MAX(date) as last_order_date
    FROM \`orders\`
    WHERE fk_order_client = ?
  `;
  db.query(sql, [req.params.id], (err, data) => {
    if (err)
      return res.status(500).json({ error: "Error fetching order summary" });
    res.json(data[0]);
  });
});

export default router;
