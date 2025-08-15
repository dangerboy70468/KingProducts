import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import { validateCategory } from "../middleware/validate.middleware.js";
import db from "../config/db.config.js";

const router = express.Router();

// Get all product categories
router.get("/", verifyToken, async (req, res) => {
  try {
    const sql = "SELECT * FROM product_category ORDER BY name";
    const [categories] = await db.query(sql);
    console.log('Categories fetched:', categories.length);
    
    // Add cache-busting headers and timestamp
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Last-Modified': new Date().toUTCString(),
      'ETag': `"${Date.now()}"`
    });
    
    res.json({
      data: categories,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ 
      error: "Error fetching product categories",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get single product category
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const [data] = await db.query("SELECT * FROM product_category WHERE id = ?", [req.params.id]);
    
    if (data.length === 0) {
      return res.status(404).json({ message: "Category not found" });
    }
    
    res.json(data[0]);
  } catch (error) {
    console.error('Error fetching product category:', error);
    res.status(500).json({ error: "Error fetching product category", details: error.message });
  }
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

    // Return all categories to help frontend update
    const [allCategories] = await db.query("SELECT * FROM product_category ORDER BY name");

    res.status(201).json({
      created: {
        id: result.insertId,
        name: name,
      },
      allCategories: allCategories,
      timestamp: Date.now()
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
router.put("/:id", verifyToken, validateCategory, async (req, res) => {
  try {
    const { name } = req.body;
    const [result] = await db.query("UPDATE product_category SET name = ? WHERE id = ?", [name, req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Category not found" });
    }
    
    res.json({ id: parseInt(req.params.id), name });
  } catch (error) {
    console.error('Error updating product category:', error);
    res.status(500).json({ error: "Error updating product category", details: error.message });
  }
});

// Delete product category
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const [result] = await db.query("DELETE FROM product_category WHERE id = ?", [req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Category not found" });
    }
    
    // Return updated categories and products for frontend
    const [allCategories] = await db.query("SELECT * FROM product_category ORDER BY name");
    const [allProducts] = await db.query(`
      SELECT p.*, pc.name as category_name 
      FROM product p
      LEFT JOIN product_category pc ON p.fk_product_category = pc.id
      ORDER BY p.name
    `);
    
    res.json({ 
      message: "Category deleted successfully",
      allCategories: allCategories,
      allProducts: allProducts,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error deleting product category:', error);
    res.status(500).json({ error: "Error deleting product category", details: error.message });
  }
});

export default router;
