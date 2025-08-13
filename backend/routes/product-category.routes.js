import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import { validateCategory } from "../middleware/validate.middleware.js";
import db from "../config/db.config.js";

const router = express.Router();

// Get all product categories
router.get("/", verifyToken, async (req, res) => {
  try {
    const sql = "SELECT * FROM product_category";
    const [categories] = await db.query(sql);
    console.log('Categories fetched:', categories.length);
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ 
      error: "Error fetching product categories",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get single product category
router.get("/:id", verifyToken, (req, res) => {
  const sql = "SELECT * FROM product_category WHERE id = ?";
  db.query(sql, [req.params.id], (err, data) => {
    if (err)
      return res.status(500).json({ error: "Error fetching product category" });
    if (data.length === 0)
      return res.status(404).json({ message: "Category not found" });
    res.json(data[0]);
  });
});

// Create product category
router.post("/", verifyToken, validateCategory, async (req, res) => {
  try {
    const { name } = req.body;

    // Check if category already exists
    const checkSql = "SELECT * FROM product_category WHERE name = ?";
    const [checkData] = await db.query(checkSql, [name]);

    if (checkData && checkData.length > 0) {
      return res.status(400).json({ error: "Category already exists" });
    }

    // Create new category
    const insertSql = "INSERT INTO product_category (name) VALUES (?)";
    const [result] = await db.query(insertSql, [name]);
    console.log('Category created:', result.insertId);

    res.status(201).json({
      id: result.insertId,
      name: name,
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ 
      error: "Error creating product category",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update product category
router.put("/:id", verifyToken, validateCategory, (req, res) => {
  const { name } = req.body;
  const sql = "UPDATE product_category SET name = ? WHERE id = ?";
  db.query(sql, [name, req.params.id], (err, result) => {
    if (err)
      return res.status(500).json({ error: "Error updating product category" });
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Category not found" });
    res.json({ id: parseInt(req.params.id), name });
  });
});

// Delete product category
router.delete("/:id", verifyToken, (req, res) => {
  const sql = "DELETE FROM product_category WHERE id = ?";
  db.query(sql, [req.params.id], (err, result) => {
    if (err)
      return res.status(500).json({ error: "Error deleting product category" });
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Category not found" });
    res.json({ message: "Category deleted successfully" });
  });
});

export default router;
