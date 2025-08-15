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
      ORDER BY p.name
    `;
    const [products] = await db.query(sql);
    console.log('Products fetched:', products.length);
    
    // Add cache-busting headers
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
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
router.get("/category/:categoryId", verifyToken, async (req, res) => {
  try {
    const [data] = await db.query(`
      SELECT p.*, pc.name as category_name 
      FROM product p
      LEFT JOIN product_category pc ON p.fk_product_category = pc.id
      WHERE p.fk_product_category = ?
    `, [req.params.categoryId]);
    res.json(data);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: "Error fetching products", details: error.message });
  }
});

// Get single product
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const [data] = await db.query(`
      SELECT p.*, pc.name as category_name 
      FROM product p
      LEFT JOIN product_category pc ON p.fk_product_category = pc.id
      WHERE p.id = ?
    `, [req.params.id]);
    
    if (data.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }
    
    res.json(data[0]);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: "Error fetching product", details: error.message });
  }
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
router.put("/:id", verifyToken, validateProduct, async (req, res) => {
  try {
    const { name, fk_product_category, price, description } = req.body;
    const [result] = await db.query(`
      UPDATE product 
      SET name=?, fk_product_category=?, price=?, description=?
      WHERE id=?
    `, [name, fk_product_category, price, description, req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Product not found" });
    }
    
    res.json({ id: req.params.id, ...req.body });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: "Error updating product", details: error.message });
  }
});

// Delete product
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const [result] = await db.query("DELETE FROM product WHERE id = ?", [req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Product not found" });
    }
    
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: "Error deleting product", details: error.message });
  }
});

export default router;
