import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import { validateBatch } from "../middleware/validate.middleware.js";
import db from "../config/db.config.js";

const router = express.Router();

// Get all batches with product info
router.get("/", verifyToken, (req, res) => {
  const sql = `
    SELECT b.*, p.name as product_name 
    FROM batch b
    LEFT JOIN product p ON b.fk_batch_product = p.id
  `;
  db.query(sql, (err, data) => {
    if (err) return res.status(500).json({ error: "Error fetching batches" });
    res.json(data);
  });
});

// Get batches by product
router.get("/product/:productId", verifyToken, (req, res) => {
  const sql = `
    SELECT b.*, p.name as product_name 
    FROM batch b
    LEFT JOIN product p ON b.fk_batch_product = p.id
    WHERE b.fk_batch_product = ?
  `;
  db.query(sql, [req.params.productId], (err, data) => {
    if (err) return res.status(500).json({ error: "Error fetching batches" });
    res.json(data);
  });
});

// Get single batch
router.get("/:id", verifyToken, (req, res) => {
  const sql = `
    SELECT b.*, p.name as product_name 
    FROM batch b
    LEFT JOIN product p ON b.fk_batch_product = p.id
    WHERE b.id = ?
  `;
  db.query(sql, [req.params.id], (err, data) => {
    if (err) return res.status(500).json({ error: "Error fetching batch" });
    if (data.length === 0)
      return res.status(404).json({ message: "Batch not found" });
    res.json(data[0]);
  });
});

// Create batch
router.post("/", verifyToken, validateBatch, (req, res) => {
  const {
    fk_batch_product,
    batch_number,
    mfg_date,
    exp_date,
    init_qty,
    cost,
    description,
  } = req.body;

  // Format dates for MySQL datetime and ensure proper number formatting
  const mfgDate = new Date(mfg_date)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
  const expDate = new Date(exp_date)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
  const quantity = parseInt(init_qty);
  const batchCost = parseFloat(cost).toFixed(2);
  const sql = `
    INSERT INTO batch (
      fk_batch_product, batch_number, mfg_date,
      exp_date, init_qty, qty, cost, description
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  db.query(
    sql,
    [
      parseInt(fk_batch_product),
      batch_number,
      mfgDate,
      expDate,
      quantity,
      quantity, // Set initial qty as qty
      batchCost,
      description || null,
    ],
    (err, result) => {
      if (err) {
        // Log detailed error information
        console.error("Database error in batch creation:", {
          error: err,
          message: err.message,
          code: err.code,
          sqlState: err.sqlState,
          sql: err.sql,
          payload: req.body,
        });

        if (err.code === "ER_DUP_ENTRY") {
          return res.status(400).json({
            error: "Batch number already exists",
            details: err.message,
          });
        }

        if (err.code === "ER_NO_REFERENCED_ROW_2") {
          return res.status(400).json({
            error: "Invalid product reference",
            details: "The specified product does not exist",
          });
        }

        return res.status(500).json({
          error: "Error creating batch",
          details: err.message,
          code: err.code,
        });
      }

      res.status(201).json({
        id: result.insertId,
        ...req.body,
      });
    }
  );
});

// Update batch
router.put("/:id", verifyToken, validateBatch, (req, res) => {
  const {
    fk_batch_product,
    batch_number,
    mfg_date,
    exp_date,
    init_qty,
    cost,
    description,
  } = req.body;

  const sql = `
    UPDATE batch 
    SET fk_batch_product=?, batch_number=?, mfg_date=?,
        exp_date=?, init_qty=?, cost=?, description=?
    WHERE id=?
  `;

  db.query(
    sql,
    [
      fk_batch_product,
      batch_number,
      mfg_date,
      exp_date,
      init_qty,
      cost,
      description,
      req.params.id,
    ],
    (err, result) => {
      if (err) return res.status(500).json({ error: "Error updating batch" });
      if (result.affectedRows === 0)
        return res.status(404).json({ message: "Batch not found" });
      res.json({ id: req.params.id, ...req.body });
    }
  );
});

// Delete batch
router.delete("/:id", verifyToken, (req, res) => {
  const sql = "DELETE FROM batch WHERE id = ?";
  db.query(sql, [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: "Error deleting batch" });
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Batch not found" });
    res.json({ message: "Batch deleted successfully" });
  });
});

// Get batch orders
router.get("/:id/orders", verifyToken, (req, res) => {
  const sql = `
    SELECT bo.*, o.*, p.name as product_name, c.name as client_name
    FROM batch_order bo
    JOIN orders o ON bo.fk_batch_order_order = o.id
    JOIN product p ON o.fk_order_product = p.id
    JOIN client c ON o.fk_order_client = c.id
    WHERE bo.fk_batch_order_batch = ?
  `;
  db.query(sql, [req.params.id], (err, data) => {
    if (err)
      return res.status(500).json({ error: "Error fetching batch orders" });
    res.json(data);
  });
});

// Add order to batch
router.post("/:batchId/orders/:orderId", verifyToken, (req, res) => {
  const { qty } = req.body;
  const sql =
    "INSERT INTO batch_order (fk_batch_order_batch, fk_batch_order_order, qty) VALUES (?, ?, ?)";
  db.query(
    sql,
    [req.params.batchId, req.params.orderId, qty],
    (err, result) => {
      if (err)
        return res.status(500).json({ error: "Error adding order to batch" });
      res.status(201).json({
        batchId: req.params.batchId,
        orderId: req.params.orderId,
        qty,
      });
    }
  );
});

export default router;
