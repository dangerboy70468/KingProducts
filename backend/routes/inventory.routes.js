import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import db from "../config/db.config.js";

const router = express.Router();

// Get all inventory items
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
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: "Error fetching inventory", details: error.message });
  }
});

// Get single inventory item
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const [data] = await db.query(`
      SELECT b.*, p.name as product_name 
      FROM batch b
      LEFT JOIN product p ON b.fk_batch_product = p.id
      WHERE b.id = ?
    `, [req.params.id]);
    
    if (data.length === 0) {
      return res.status(404).json({ message: "Inventory item not found" });
    }
    res.json(data[0]);
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    res.status(500).json({ error: "Error fetching inventory item", details: error.message });
  }
});

// Create inventory item
router.post("/", verifyToken, async (req, res) => {
  try {
    const { productId, initialQty, mfgDate, expDate, cost, description } = req.body;

    const [result] = await db.query(`
      INSERT INTO batch (
        fk_batch_product, qty, mfg_date, exp_date, cost, description
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [productId, initialQty, mfgDate, expDate, cost, description]);

    res.status(201).json({
      id: result.insertId,
      ...req.body
    });
  } catch (error) {
    console.error('Error creating inventory item:', error);
    res.status(500).json({ error: "Error creating inventory item", details: error.message });
  }
});

// Update inventory item
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const { productId, qty, mfgDate, expDate, cost, description } = req.body;

    const [result] = await db.query(`
      UPDATE batch 
      SET fk_batch_product=?, qty=?, mfg_date=?, exp_date=?, cost=?, description=?
      WHERE id=?
    `, [productId, qty, mfgDate, expDate, cost, description, req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Inventory item not found" });
    }
    res.json({ id: req.params.id, ...req.body });
  } catch (error) {
    console.error('Error updating inventory item:', error);
    res.status(500).json({ error: "Error updating inventory item", details: error.message });
  }
});

// Delete inventory item
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const [result] = await db.query("DELETE FROM batch WHERE id = ?", [req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Inventory item not found" });
    }
    res.json({ message: "Inventory item deleted successfully" });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    res.status(500).json({ error: "Error deleting inventory item", details: error.message });
  }
});

// Get low stock items
router.get("/status/low-stock", verifyToken, async (req, res) => {
  try {
    const [data] = await db.query(`
      SELECT b.*, p.name as product_name 
      FROM batch b
      LEFT JOIN product p ON b.fk_batch_product = p.id
      WHERE b.qty < 10
      ORDER BY b.qty ASC
    `);
    res.json(data);
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    res.status(500).json({ error: "Error fetching low stock items", details: error.message });
  }
});

export default router;
