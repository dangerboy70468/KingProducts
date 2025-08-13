import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import { validateProduct } from "../middleware/validate.middleware.js";
import db from "../config/db.config.js";

const router = express.Router();

// Get all products with category info
router.get("/", verifyToken, async (req, res) => {
  try {
    const sql = `
      SELECT p.*, pc.name as category_name 
      FROM product p
      LEFT JOIN product_category pc ON p.fk_product_category = pc.id
    `;
    const [products] = await db.query(sql);
    console.log('Products fetched:', products.length);
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ 
      error: "Error fetching products",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get products by category
router.get("/category/:categoryId", verifyToken, (req, res) => {
  const sql = `
    SELECT p.*, pc.name as category_name 
    FROM product p
    LEFT JOIN product_category pc ON p.fk_product_category = pc.id
    WHERE p.fk_product_category = ?
  `;
  db.query(sql, [req.params.categoryId], (err, data) => {
    if (err) return res.status(500).json({ error: "Error fetching products" });
    res.json(data);
  });
});

// Get single product
router.get("/:id", verifyToken, (req, res) => {
  const sql = `
    SELECT p.*, pc.name as category_name 
    FROM product p
    LEFT JOIN product_category pc ON p.fk_product_category = pc.id
    WHERE p.id = ?
  `;
  db.query(sql, [req.params.id], (err, data) => {
    if (err) return res.status(500).json({ error: "Error fetching product" });
    if (data.length === 0)
      return res.status(404).json({ message: "Product not found" });
    res.json(data[0]);
  });
});

// Create product
router.post("/", verifyToken, validateProduct, async (req, res) => {
  try {
    const { name, fk_product_category, price, description } = req.body;
    const sql = `
      INSERT INTO product (name, fk_product_category, price, description) 
      VALUES (?, ?, ?, ?)
    `;
    const [result] = await db.query(sql, [name, fk_product_category, price, description]);
    console.log('Product created:', result.insertId);
    res.status(201).json({
      id: result.insertId,
      ...req.body,
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ 
      error: "Error creating product",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update product
router.put("/:id", verifyToken, validateProduct, (req, res) => {
  const { name, fk_product_category, price, description } = req.body;
  const sql = `
    UPDATE product 
    SET name=?, fk_product_category=?, price=?, description=?
    WHERE id=?
  `;
  db.query(
    sql,
    [name, fk_product_category, price, description, req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: "Error updating product" });
      if (result.affectedRows === 0)
        return res.status(404).json({ message: "Product not found" });
      res.json({ id: req.params.id, ...req.body });
    }
  );
});

// Delete product
router.delete("/:id", verifyToken, (req, res) => {
  const sql = "DELETE FROM product WHERE id = ?";
  db.query(sql, [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: "Error deleting product" });
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product deleted successfully" });
  });
});

export default router;
