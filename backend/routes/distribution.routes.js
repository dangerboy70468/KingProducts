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
router.post("/", verifyToken, (req, res) => {
  const { notes, employeeIds, orderIds } = req.body;

  if (!employeeIds?.length || !orderIds?.length) {
    return res
      .status(400)
      .json({ error: "Must provide at least one employee and one order" });
  }

  db.beginTransaction((err) => {
    if (err) {
      console.error("Error starting transaction:", err);
      return res.status(500).json({ error: "Error creating distribution" });
    }

    // 1. Create distribution record
    const distributionSql = `
      INSERT INTO distribution (notes)
      VALUES (?)
    `;

    db.query(distributionSql, [notes], (err, result) => {
      if (err) {
        console.error("Error creating distribution:", err);
        return db.rollback(() => {
          res.status(500).json({ error: "Error creating distribution" });
        });
      }

      const distributionId = result.insertId;

      // 2. Create employee assignments
      const employeeSql = `
        INSERT INTO distribution_employee 
        (fk_distribution_employee_distribution, fk_distribution_employee_employee)
        VALUES ?
      `;

      const employeeValues = employeeIds.map((empId) => [
        distributionId,
        empId,
      ]);

      db.query(employeeSql, [employeeValues], (err) => {
        if (err) {
          console.error("Error assigning employees:", err);
          return db.rollback(() => {
            res.status(500).json({ error: "Error assigning employees" });
          });
        }

        // 3. Create order assignments
        const orderSql = `
          INSERT INTO distribution_order 
          (fk_distribution_order_distribution, fk_distribution_order_order)
          VALUES ?
        `;

        const orderValues = orderIds.map((orderId) => [
          distributionId,
          orderId,
        ]);

        db.query(orderSql, [orderValues], (err) => {
          if (err) {
            console.error("Error assigning orders:", err);
            return db.rollback(() => {
              res.status(500).json({ error: "Error assigning orders" });
            });
          }

          // 4. Update orders status
          const updateOrdersSql = `
            UPDATE orders 
            SET status = 'assigned'
            WHERE id IN (?)
          `;

          db.query(updateOrdersSql, [orderIds], (err) => {
            if (err) {
              console.error("Error updating order status:", err);
              return db.rollback(() => {
                res.status(500).json({ error: "Error updating order status" });
              });
            }

            // Commit transaction
            db.commit((err) => {
              if (err) {
                console.error("Error committing transaction:", err);
                return db.rollback(() => {
                  res
                    .status(500)
                    .json({ error: "Error committing transaction" });
                });
              }

              res.status(201).json({
                id: distributionId,
                notes,
                employeeIds,
                orderIds,
                message: "Distribution created successfully",
              });
            });
          });
        });
      });
    });
  });
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
router.post("/:id/end", verifyToken, (req, res) => {
  // First check if distribution exists and is in correct state
  const checkSql = `
    SELECT departure_time, arrival_time
    FROM distribution 
    WHERE id = ?
  `;

  db.query(checkSql, [req.params.id], (err, data) => {
    if (err) {
      console.error("Error checking distribution:", err);
      return res.status(500).json({ error: "Error checking distribution status" });
    }

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
    const sql = `
      UPDATE distribution 
      SET arrival_time = CURRENT_TIME()
      WHERE id = ? AND departure_time IS NOT NULL AND arrival_time IS NULL
    `;

    db.beginTransaction(err => {
      if (err) {
        console.error("Error starting transaction:", err);
        return res.status(500).json({ error: "Error starting transaction" });
      }

      db.query(sql, [req.params.id], (err, result) => {
        if (err) {
          return db.rollback(() => {
            console.error("Error ending distribution:", err);
            res.status(500).json({ error: "Error ending distribution" });
          });
        }

        if (result.affectedRows === 0) {
          return db.rollback(() => {
            res.status(400).json({ error: "Distribution not started or already ended" });
          });
        }

        // Update orders status
        const updateOrdersSql = `
          UPDATE orders o
          JOIN distribution_order do ON do.fk_distribution_order_order = o.id
          SET o.status = 'delivered'
          WHERE do.fk_distribution_order_distribution = ?
        `;

        db.query(updateOrdersSql, [req.params.id], (err) => {
          if (err) {
            return db.rollback(() => {
              console.error("Error updating orders status:", err);
              res.status(500).json({ error: "Error updating orders status" });
            });
          }

          db.commit(err => {
            if (err) {
              return db.rollback(() => {
                console.error("Error committing transaction:", err);
                res.status(500).json({ error: "Error committing transaction" });
              });
            }
            res.json({ message: "Distribution ended successfully" });
          });
        });
      });
    });
  });
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
router.post("/:id/cancel", verifyToken, (req, res) => {
  db.beginTransaction((err) => {
    if (err) {
      console.error("Error starting transaction:", err);
      return res.status(500).json({ error: "Error canceling distribution" });
    }

    // Check if distribution is in progress
    const checkSql = `
      SELECT departure_time, arrival_time
      FROM distribution 
      WHERE id = ?
    `;

    db.query(checkSql, [req.params.id], (err, data) => {
      if (err) {
        return db.rollback(() => {
          console.error("Error checking distribution:", err);
          res.status(500).json({ error: "Error checking distribution" });
        });
      }

      if (data.length === 0) {
        return db.rollback(() => {
          res.status(404).json({ error: "Distribution not found" });
        });
      }

      if (!data[0].departure_time || data[0].arrival_time) {
        return db.rollback(() => {
          res
            .status(400)
            .json({ error: "Distribution must be in progress to cancel" });
        });
      }

      // Reset distribution departure time
      const updateDistributionSql = `
        UPDATE distribution
        SET departure_time = NULL
        WHERE id = ?
      `;

      db.query(updateDistributionSql, [req.params.id], (err) => {
        if (err) {
          return db.rollback(() => {
            console.error("Error updating distribution:", err);
            res.status(500).json({ error: "Error updating distribution" });
          });
        }

        // Update orders status back to assigned
        const updateOrdersSql = `
          UPDATE orders o
          JOIN distribution_order do ON do.fk_distribution_order_order = o.id
          SET o.status = 'assigned'
          WHERE do.fk_distribution_order_distribution = ?
        `;

        db.query(updateOrdersSql, [req.params.id], (err) => {
          if (err) {
            return db.rollback(() => {
              console.error("Error updating orders status:", err);
              res.status(500).json({ error: "Error updating orders status" });
            });
          }

          db.commit((err) => {
            if (err) {
              return db.rollback(() => {
                console.error("Error committing transaction:", err);
                res.status(500).json({ error: "Error committing transaction" });
              });
            }

            res.json({ message: "Distribution canceled successfully" });
          });
        });
      });
    });
  });
});

export default router;
