import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import { validateBatch } from "../middleware/validate.middleware.js";
import db from "../config/db.config.js";

const router = express.Router();

// Get all batches with product info
router.get("/", verifyToken, async (req, res) => {
  try {
    const [data] = await db.query(`
      SELECT b.*, p.name as product_name 
      FROM batch b
      LEFT JOIN product p ON b.fk_batch_product = p.id
      ORDER BY b.id DESC
    `);
    res.json(data);
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({ error: "Error fetching batches", details: error.message });
  }
});

// Get batches by product
router.get("/product/:productId", verifyToken, async (req, res) => {
  try {
    const [data] = await db.query(`
      SELECT b.*, p.name as product_name 
      FROM batch b
      LEFT JOIN product p ON b.fk_batch_product = p.id
      WHERE b.fk_batch_product = ?
    `, [req.params.productId]);
    res.json(data);
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({ error: "Error fetching batches", details: error.message });
  }
});

// Get single batch
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const [data] = await db.query(`
      SELECT b.*, p.name as product_name 
      FROM batch b
      LEFT JOIN product p ON b.fk_batch_product = p.id
      WHERE b.id = ?
    `, [req.params.id]);
    
    if (data.length === 0) {
      return res.status(404).json({ message: "Batch not found" });
    }
    res.json(data[0]);
  } catch (error) {
    console.error('Error fetching batch:', error);
    res.status(500).json({ error: "Error fetching batch", details: error.message });
  }
});

// Create batch
router.post("/", verifyToken, validateBatch, async (req, res) => {
  try {
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

    const [result] = await db.query(`
      INSERT INTO batch (
        fk_batch_product, batch_number, mfg_date,
        exp_date, init_qty, qty, cost, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      parseInt(fk_batch_product),
      batch_number,
      mfgDate,
      expDate,
      quantity,
      quantity, // Set initial qty as qty
      batchCost,
      description || null,
    ]);

    res.status(201).json({
      id: result.insertId,
      ...req.body,
    });
  } catch (error) {
    console.error("Database error in batch creation:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        error: "Batch number already exists",
        details: error.message,
      });
    }

    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({
        error: "Invalid product reference",
        details: "The specified product does not exist",
      });
    }

    res.status(500).json({
      error: "Error creating batch",
      details: error.message,
    });
  }
});

// Update batch
router.put("/:id", verifyToken, validateBatch, async (req, res) => {
  try {
    const {
      fk_batch_product,
      batch_number,
      mfg_date,
      exp_date,
      init_qty,
      cost,
      description,
    } = req.body;

    const [result] = await db.query(`
      UPDATE batch 
      SET fk_batch_product=?, batch_number=?, mfg_date=?,
          exp_date=?, init_qty=?, cost=?, description=?
      WHERE id=?
    `, [
      fk_batch_product,
      batch_number,
      mfg_date,
      exp_date,
      init_qty,
      cost,
      description,
      req.params.id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Batch not found" });
    }
    res.json({ id: req.params.id, ...req.body });
  } catch (error) {
    console.error('Error updating batch:', error);
    res.status(500).json({ error: "Error updating batch", details: error.message });
  }
});

// Delete batch
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const [result] = await db.query("DELETE FROM batch WHERE id = ?", [req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Batch not found" });
    }
    res.json({ message: "Batch deleted successfully" });
  } catch (error) {
    console.error('Error deleting batch:', error);
    res.status(500).json({ error: "Error deleting batch", details: error.message });
  }
});

// Get batch orders
router.get("/:id/orders", verifyToken, async (req, res) => {
  try {
    const [data] = await db.query(`
      SELECT bo.*, o.*, p.name as product_name, c.name as client_name
      FROM batch_order bo
      JOIN orders o ON bo.fk_batch_order_order = o.id
      JOIN product p ON o.fk_order_product = p.id
      JOIN client c ON o.fk_order_client = c.id
      WHERE bo.fk_batch_order_batch = ?
    `, [req.params.id]);
    res.json(data);
  } catch (error) {
    console.error('Error fetching batch orders:', error);
    res.status(500).json({ error: "Error fetching batch orders", details: error.message });
  }
});

// Add order to batch
router.post("/:batchId/orders/:orderId", verifyToken, async (req, res) => {
  try {
    const { qty } = req.body;
    
    const [result] = await db.query(
      "INSERT INTO batch_order (fk_batch_order_batch, fk_batch_order_order, qty) VALUES (?, ?, ?)",
      [req.params.batchId, req.params.orderId, qty]
    );
    
    res.status(201).json({
      batchId: req.params.batchId,
      orderId: req.params.orderId,
      qty,
    });
  } catch (error) {
    console.error('Error adding order to batch:', error);
    res.status(500).json({ error: "Error adding order to batch", details: error.message });
  }
});

export default router;
