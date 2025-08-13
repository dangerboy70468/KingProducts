import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import db from "../config/db.config.js";

const router = express.Router();

// Get all inventory items
router.get("/", verifyToken, (req, res) => {
  const sql = `
    SELECT i.*, p.name as product_name 
    FROM inventory i
    LEFT JOIN products p ON i.product_id = p.id
  `;
  db.query(sql, (err, data) => {
    if (err) return res.status(500).json({ error: "Error fetching inventory" });
    res.json(data);
  });
});

// Get single inventory item
router.get("/:id", verifyToken, (req, res) => {
  const sql = `
    SELECT i.*, p.name as product_name 
    FROM inventory i
    LEFT JOIN products p ON i.product_id = p.id
    WHERE i.id = ?
  `;
  db.query(sql, [req.params.id], (err, data) => {
    if (err)
      return res.status(500).json({ error: "Error fetching inventory item" });
    if (data.length === 0)
      return res.status(404).json({ message: "Inventory item not found" });
    res.json(data[0]);
  });
});

// Create inventory item
router.post("/", verifyToken, (req, res) => {
  const { productId, initialQty, mfgDate, expDate, cost, description } =
    req.body;

  const sql = `
    INSERT INTO inventory (
      product_id, initial_qty, remain_qty,
      mfg_date, exp_date, cost, description
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      productId,
      initialQty,
      initialQty, // Initially, remaining qty equals initial qty
      mfgDate,
      expDate,
      cost,
      description,
    ],
    (err, result) => {
      if (err)
        return res.status(500).json({ error: "Error creating inventory item" });
      res.status(201).json({
        id: result.insertId,
        ...req.body,
        remainQty: initialQty,
      });
    }
  );
});

// Update inventory item
router.put("/:id", verifyToken, (req, res) => {
  const {
    productId,
    initialQty,
    remainQty,
    mfgDate,
    expDate,
    cost,
    description,
  } = req.body;

  const sql = `
    UPDATE inventory 
    SET product_id=?, initial_qty=?, remain_qty=?,
        mfg_date=?, exp_date=?, cost=?, description=?
    WHERE id=?
  `;

  db.query(
    sql,
    [
      productId,
      initialQty,
      remainQty,
      mfgDate,
      expDate,
      cost,
      description,
      req.params.id,
    ],
    (err, result) => {
      if (err)
        return res.status(500).json({ error: "Error updating inventory item" });
      if (result.affectedRows === 0)
        return res.status(404).json({ message: "Inventory item not found" });
      res.json({ id: req.params.id, ...req.body });
    }
  );
});

// Delete inventory item
router.delete("/:id", verifyToken, (req, res) => {
  const sql = "DELETE FROM inventory WHERE id = ?";
  db.query(sql, [req.params.id], (err, result) => {
    if (err)
      return res.status(500).json({ error: "Error deleting inventory item" });
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Inventory item not found" });
    res.json({ message: "Inventory item deleted successfully" });
  });
});

// Get low stock items
router.get("/status/low-stock", verifyToken, (req, res) => {
  const sql = `
    SELECT i.*, p.name as product_name 
    FROM inventory i
    LEFT JOIN products p ON i.product_id = p.id
    WHERE i.remain_qty < 10
  `;
  db.query(sql, (err, data) => {
    if (err)
      return res.status(500).json({ error: "Error fetching low stock items" });
    res.json(data);
  });
});

export default router;
