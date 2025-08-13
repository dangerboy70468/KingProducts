import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import db from "../config/db.config.js";

const router = express.Router();

// Get all distributions
router.get("/", verifyToken, async (req, res) => {
  try {
    const [data] = await db.query(`
      SELECT 
        d.*,
        GROUP_CONCAT(DISTINCT e.name) as employee_names,
        GROUP_CONCAT(DISTINCT CONCAT(o.id, ':', c.name, ' - ', p.name, ' (', COALESCE(bo.qty, 0), ' units)')) as order_details
      FROM distribution d
      LEFT JOIN distribution_employee de ON de.fk_distribution_employee_distribution = d.id
      LEFT JOIN employee e ON e.id = de.fk_distribution_employee_employee
      LEFT JOIN distribution_order do ON do.fk_distribution_order_distribution = d.id
      LEFT JOIN orders o ON o.id = do.fk_distribution_order_order
      LEFT JOIN client c ON c.id = o.fk_order_client
      LEFT JOIN product p ON p.id = o.fk_order_product
      LEFT JOIN batch_order bo ON bo.fk_batch_order_order = o.id
      GROUP BY d.id
      ORDER BY d.date DESC
    `);
    res.json(data);
  } catch (error) {
    console.error('Error fetching distributions:', error);
    res.status(500).json({ error: "Error fetching distribution records", details: error.message });
  }
});

// Get available orders (not assigned to any distribution)
router.get("/available-orders", verifyToken, async (req, res) => {
  try {
    const [data] = await db.query(`
      SELECT 
        o.*,
        c.name as client_name,
        p.name as product_name,
        COALESCE(bo.qty, 0) as assigned_qty,
        COALESCE(o.total_price, COALESCE(bo.qty, 0) * o.unit_price) as total_price
      FROM orders o
      LEFT JOIN distribution_order do ON do.fk_distribution_order_order = o.id
      JOIN client c ON c.id = o.fk_order_client
      JOIN product p ON p.id = o.fk_order_product
      LEFT JOIN batch_order bo ON bo.fk_batch_order_order = o.id
      WHERE do.fk_distribution_order_order IS NULL
        AND o.status = 'assigned'
    `);
    res.json(data);
  } catch (error) {
    console.error('Error fetching available orders:', error);
    res.status(500).json({ error: "Error fetching available orders", details: error.message });
  }
});

// Get available employees (not assigned to any active distribution)
router.get("/available-employees", verifyToken, async (req, res) => {
  try {
    const [data] = await db.query(`
      SELECT e.*, et.name as type_name
      FROM employee e
      JOIN employee_type et ON et.id = e.type_id
      WHERE e.id NOT IN (
        SELECT DISTINCT de.fk_distribution_employee_employee
        FROM distribution_employee de
        JOIN distribution d ON d.id = de.fk_distribution_employee_distribution
        WHERE d.departure_time IS NOT NULL 
        AND d.arrival_time IS NULL
      )
    `);
    res.json(data);
  } catch (error) {
    console.error('Error fetching available employees:', error);
    res.status(500).json({ error: "Error fetching available employees", details: error.message });
  }
});

// Get orders for a specific distribution
router.get("/:id/orders", verifyToken, async (req, res) => {
  try {
    const [data] = await db.query(`
      SELECT 
        o.*,
        c.name as client_name,
        p.name as product_name,
        COALESCE(bo.qty, 0) as assigned_qty,
        bo.description as batch_notes,
        COALESCE(o.total_price, COALESCE(bo.qty, 0) * o.unit_price) as total_price
      FROM orders o
      JOIN distribution_order do ON do.fk_distribution_order_order = o.id
      JOIN client c ON c.id = o.fk_order_client
      JOIN product p ON p.id = o.fk_order_product
      LEFT JOIN batch_order bo ON bo.fk_batch_order_order = o.id
      WHERE do.fk_distribution_order_distribution = ?
    `, [req.params.id]);
    res.json(data);
  } catch (error) {
    console.error('Error fetching distribution orders:', error);
    res.status(500).json({ error: "Error fetching distribution orders", details: error.message });
  }
});

// Get employees for a specific distribution
router.get("/:id/employees", verifyToken, async (req, res) => {
  try {
    const [data] = await db.query(`
      SELECT e.*, et.name as type_name
      FROM employee e
      JOIN distribution_employee de ON de.fk_distribution_employee_employee = e.id
      JOIN employee_type et ON et.id = e.type_id
      WHERE de.fk_distribution_employee_distribution = ?
    `, [req.params.id]);
    res.json(data);
  } catch (error) {
    console.error('Error fetching distribution employees:', error);
    res.status(500).json({ error: "Error fetching distribution employees", details: error.message });
  }
});

// Create new distribution record with employees and orders
router.post("/", verifyToken, async (req, res) => {
  try {
    const { notes, employeeIds, orderIds } = req.body;

    if (!employeeIds?.length || !orderIds?.length) {
      return res.status(400).json({ error: "Must provide at least one employee and one order" });
    }

    // 1. Create distribution record
    const [result] = await db.query(`INSERT INTO distribution (notes) VALUES (?)`, [notes]);
    const distributionId = result.insertId;

    // 2. Create employee assignments
    const employeeValues = employeeIds.map((empId) => [distributionId, empId]);
    await db.query(`
      INSERT INTO distribution_employee 
      (fk_distribution_employee_distribution, fk_distribution_employee_employee)
      VALUES ?
    `, [employeeValues]);

    // 3. Create order assignments
    const orderValues = orderIds.map((orderId) => [distributionId, orderId]);
    await db.query(`
      INSERT INTO distribution_order 
      (fk_distribution_order_distribution, fk_distribution_order_order)
      VALUES ?
    `, [orderValues]);

    // 4. Update orders status
    await db.query(`UPDATE orders SET status = 'assigned' WHERE id IN (?)`, [orderIds]);

    res.status(201).json({
      id: distributionId,
      notes,
      employeeIds,
      orderIds,
      message: "Distribution created successfully",
    });
  } catch (error) {
    console.error('Error creating distribution:', error);
    res.status(500).json({ error: "Error creating distribution", details: error.message });
  }
});

// Start job (set departure time)
router.post("/:id/start", verifyToken, async (req, res) => {
  try {
    // Check if distribution exists and is in correct state
    const [data] = await db.query(`
      SELECT departure_time, arrival_time
      FROM distribution 
      WHERE id = ?
    `, [req.params.id]);

    if (data.length === 0) {
      return res.status(404).json({ error: "Distribution not found" });
    }

    if (data[0].departure_time) {
      return res.status(400).json({ error: "Distribution has already been started" });
    }

    if (data[0].arrival_time) {
      return res.status(400).json({ error: "Cannot start a completed distribution" });
    }

    // Update distribution departure time
    const [result] = await db.query(`
      UPDATE distribution
      SET departure_time = CURRENT_TIME()
      WHERE id = ? AND departure_time IS NULL
    `, [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(400).json({ error: "Distribution already started or not found" });
    }

    // Update orders status
    await db.query(`
      UPDATE orders o
      JOIN distribution_order do ON do.fk_distribution_order_order = o.id
      SET o.status = 'in_transit'
      WHERE do.fk_distribution_order_distribution = ?
    `, [req.params.id]);

    res.json({ message: "Distribution started successfully" });
  } catch (error) {
    console.error('Error starting distribution:', error);
    res.status(500).json({ error: "Error starting distribution", details: error.message });
  }
});

// End distribution
router.post("/:id/end", verifyToken, async (req, res) => {
  try {
    // Check if distribution exists and is in correct state
    const [data] = await db.query(`
      SELECT departure_time, arrival_time
      FROM distribution 
      WHERE id = ?
    `, [req.params.id]);

    if (data.length === 0) {
      return res.status(404).json({ error: "Distribution not found" });
    }

    if (!data[0].departure_time) {
      return res.status(400).json({ error: "Distribution has not been started yet" });
    }

    if (data[0].arrival_time) {
      return res.status(400).json({ error: "Distribution has already been ended" });
    }

    // Update distribution arrival time
    const [result] = await db.query(`
      UPDATE distribution 
      SET arrival_time = CURRENT_TIME()
      WHERE id = ? AND departure_time IS NOT NULL AND arrival_time IS NULL
    `, [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(400).json({ error: "Distribution not started or already ended" });
    }

    // Update orders status to delivered
    await db.query(`
      UPDATE orders o
      JOIN distribution_order do ON do.fk_distribution_order_order = o.id
      SET o.status = 'delivered'
      WHERE do.fk_distribution_order_distribution = ?
    `, [req.params.id]);

    res.json({ message: "Distribution ended successfully" });
  } catch (error) {
    console.error('Error ending distribution:', error);
    res.status(500).json({ error: "Error ending distribution", details: error.message });
  }
});

// Delete distribution (only if not started)
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    // Check if distribution can be deleted
    const [data] = await db.query(`
      SELECT departure_time 
      FROM distribution 
      WHERE id = ?
    `, [req.params.id]);

    if (data.length === 0) {
      return res.status(404).json({ error: "Distribution not found" });
    }

    if (data[0].departure_time !== null) {
      return res.status(400).json({
        error: "Cannot delete distribution that has already started",
      });
    }

    // Update orders status back to assigned
    await db.query(`
      UPDATE orders o
      JOIN distribution_order do ON do.fk_distribution_order_order = o.id
      SET o.status = 'assigned'
      WHERE do.fk_distribution_order_distribution = ?
    `, [req.params.id]);

    // Delete the distribution (cascade will handle related records)
    await db.query(`DELETE FROM distribution WHERE id = ?`, [req.params.id]);

    res.json({ message: "Distribution deleted successfully" });
  } catch (error) {
    console.error('Error deleting distribution:', error);
    res.status(500).json({ error: "Error deleting distribution", details: error.message });
  }
});

// Cancel an in-progress distribution
router.post("/:id/cancel", verifyToken, async (req, res) => {
  try {
    // Check if distribution is in progress
    const [data] = await db.query(`
      SELECT departure_time, arrival_time
      FROM distribution 
      WHERE id = ?
    `, [req.params.id]);

    if (data.length === 0) {
      return res.status(404).json({ error: "Distribution not found" });
    }

    if (!data[0].departure_time || data[0].arrival_time) {
      return res.status(400).json({ error: "Distribution must be in progress to cancel" });
    }

    // Reset distribution departure time
    await db.query(`
      UPDATE distribution
      SET departure_time = NULL
      WHERE id = ?
    `, [req.params.id]);

    // Update orders status back to assigned
    await db.query(`
      UPDATE orders o
      JOIN distribution_order do ON do.fk_distribution_order_order = o.id
      SET o.status = 'assigned'
      WHERE do.fk_distribution_order_distribution = ?
    `, [req.params.id]);

    res.json({ message: "Distribution canceled successfully" });
  } catch (error) {
    console.error('Error canceling distribution:', error);
    res.status(500).json({ error: "Error canceling distribution", details: error.message });
  }
});

export default router;
