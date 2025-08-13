import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import { validateBatchOrder } from "../middleware/validate.middleware.js";
import db from "../config/db.config.js";

import { updateOrderTotalPrice } from "./order.routes.js";
const router = express.Router();

// Get all batch-order assignments
router.get("/", verifyToken, async (req, res) => {
  try {
    const [data] = await db.query(`
      SELECT bo.*, 
             b.batch_number,
             o.date as order_date,
             p.name as product_name,
             c.name as client_name
      FROM batch_order bo
      JOIN batch b ON bo.fk_batch_order_batch = b.id
      JOIN orders o ON bo.fk_batch_order_order = o.id
      JOIN product p ON o.fk_order_product = p.id
      JOIN client c ON o.fk_order_client = c.id
    `);
    res.json(data);
  } catch (error) {
    console.error('Error fetching batch-order assignments:', error);
    res.status(500).json({ error: "Error fetching batch-order assignments", details: error.message });
  }
});

// Get batch-order assignments by batch
router.get("/batch/:batchId", verifyToken, async (req, res) => {
  try {
    const [data] = await db.query(`
      SELECT bo.*, 
             o.date as order_date,
             o.qty as order_qty,
             o.unit_price,
             o.total_price,
             c.name as client_name
      FROM batch_order bo
      JOIN orders o ON bo.fk_batch_order_order = o.id
      JOIN client c ON o.fk_order_client = c.id
      WHERE bo.fk_batch_order_batch = ?
    `, [req.params.batchId]);
    res.json(data);
  } catch (error) {
    console.error('Error fetching batch orders:', error);
    res.status(500).json({ error: "Error fetching batch orders", details: error.message });
  }
});

// Get batch-order assignments by order
router.get("/order/:orderId", verifyToken, async (req, res) => {
  try {
    const [results] = await db.query(`
      SELECT bo.*, 
             b.batch_number,
             b.mfg_date,
             b.exp_date,
             b.init_qty,
             b.cost,
             COALESCE(bo.description, '') as description
      FROM batch_order bo
      JOIN batch b ON bo.fk_batch_order_batch = b.id
      WHERE bo.fk_batch_order_order = ?
    `, [req.params.orderId]);
    
    res.json(results);
  } catch (error) {
    console.error('Error in /order/:orderId:', error);
    res.status(500).json({ error: "Error fetching order batches", details: error.message });
  }
});

// Assign order to batch
router.post("/", verifyToken, validateBatchOrder, async (req, res) => {
  try {
    const { fk_batch_order_batch, fk_batch_order_order, qty, description } = req.body;

    // Check if batch has enough quantity available
    const [batchData] = await db.query(`
      SELECT 
        b.init_qty - COALESCE(SUM(CASE 
          WHEN bo.fk_batch_order_order != ? THEN bo.qty 
          ELSE 0 
        END), 0) as available_qty,
        b.init_qty,
        COALESCE(SUM(bo.qty), 0) as assigned_qty
      FROM batch b
      LEFT JOIN batch_order bo ON b.id = bo.fk_batch_order_batch
      WHERE b.id = ?
      GROUP BY b.id, b.init_qty
    `, [fk_batch_order_order, fk_batch_order_batch]);

    if (batchData.length === 0) {
      return res.status(404).json({ message: "Batch not found" });
    }

    const availableQty = batchData[0].available_qty;
    if (availableQty < qty) {
      return res.status(400).json({
        error: "Insufficient quantity in batch",
        available: availableQty,
        assigned: batchData[0].assigned_qty,
        total: batchData[0].init_qty,
        requested: qty,
      });
    }

    // Create the assignment
    const [result] = await db.query(`
      INSERT INTO batch_order (fk_batch_order_batch, fk_batch_order_order, qty, description)
      VALUES (?, ?, ?, ?)
    `, [fk_batch_order_batch, fk_batch_order_order, qty, description || null]);

    // Update the batch quantity
    await db.query(`UPDATE batch SET qty = qty - ? WHERE id = ?`, [qty, fk_batch_order_batch]);

    // Update order status to 'assigned'
    await db.query(`UPDATE orders SET status = 'assigned' WHERE id = ?`, [fk_batch_order_order]);

    res.status(201).json({
      message: "Batch-order assignment created successfully",
      batch_id: fk_batch_order_batch,
      order_id: fk_batch_order_order,
      qty,
    });
  } catch (error) {
    console.error('Error assigning order to batch:', error);
    
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        error: "This batch is already assigned to this order",
      });
    }
    
    res.status(500).json({ error: "Error assigning order to batch", details: error.message });
  }
});

// Update batch-order assignment
router.put(
  "/:batchId/:orderId",
  verifyToken,
  validateBatchOrder,
  (req, res) => {
    const { qty, description } = req.body;

    // Disable safe updates
    db.query("SET SQL_SAFE_UPDATES = 0", (safeErr) => {
      if (safeErr)
        return res.status(500).json({ error: "Error disabling safe updates" });

      // Check available quantity (excluding current assignment)
      const checkBatchSql = `
      SELECT 
        b.init_qty - COALESCE(SUM(CASE 
          WHEN bo.fk_batch_order_order != ? THEN bo.qty 
          ELSE 0 
        END), 0) as available_qty,
        b.init_qty,
        COALESCE(SUM(bo.qty), 0) as assigned_qty,
        COALESCE(SUM(CASE WHEN bo.fk_batch_order_order = ? THEN bo.qty ELSE 0 END), 0) as current_assignment
      FROM batch b
      LEFT JOIN batch_order bo ON b.id = bo.fk_batch_order_batch
      WHERE b.id = ?
      GROUP BY b.id, b.init_qty
    `;

      db.query(
        checkBatchSql,
        [req.params.orderId, req.params.orderId, req.params.batchId],
        async (err, batchData) => {
          if (err) {
            db.query("SET SQL_SAFE_UPDATES = 1");
            return res
              .status(500)
              .json({ error: "Error checking batch quantity" });
          }
          if (batchData.length === 0) {
            db.query("SET SQL_SAFE_UPDATES = 1");
            return res.status(404).json({ message: "Batch not found" });
          }

          const availableQty =
            batchData[0].available_qty + batchData[0].current_assignment;
          if (availableQty < qty) {
            db.query("SET SQL_SAFE_UPDATES = 1");
            return res.status(400).json({
              error: "Insufficient quantity in batch",
              available: availableQty,
              assigned: batchData[0].assigned_qty,
              total: batchData[0].init_qty,
              current_assignment: batchData[0].current_assignment,
              requested: qty,
            });
          }

          // If quantity is available, begin transaction for the update
          db.beginTransaction(async (err) => {
            if (err) {
              db.query("SET SQL_SAFE_UPDATES = 1");
              return res
                .status(500)
                .json({ error: "Error starting transaction" });
            }

            try {
              // Update the assignment
              const updateSql = `
            UPDATE batch_order 
            SET qty = ?, description = ?
            WHERE fk_batch_order_batch = ? AND fk_batch_order_order = ?
          `;

              await new Promise((resolve, reject) => {
                db.query(
                  updateSql,
                  [
                    qty,
                    description || null,
                    req.params.batchId,
                    req.params.orderId,
                  ],
                  (err, result) => {
                    if (err) reject(err);
                    if (result.affectedRows === 0)
                      reject(new Error("Assignment not found"));
                    resolve();
                  }
                );
              });

              // After successful update, adjust the batch quantity
              const qtyDifference = qty - batchData[0].current_assignment;
              const updateBatchSql = `UPDATE batch SET qty = qty - ? WHERE id = ?`;

              await new Promise((resolve, reject) => {
                db.query(
                  updateBatchSql,
                  [qtyDifference, req.params.batchId],
                  (err) => {
                    if (err) reject(err);
                    resolve();
                  }
                );
              });

              // Update diff_qty
              const updateDiffQtySql = `
            UPDATE batch_order bo
            JOIN orders o ON bo.fk_batch_order_order = o.id
            SET bo.diff_qty = o.qty - bo.qty
            WHERE bo.fk_batch_order_batch = ? AND bo.fk_batch_order_order = ?
          `;

              await new Promise((resolve, reject) => {
                db.query(
                  updateDiffQtySql,
                  [req.params.batchId, req.params.orderId],
                  (err) => {
                    if (err) {
                      console.error("Error updating diff_qty:", err);
                      // Don't reject here, as this is not critical
                    }
                    resolve();
                  }
                );
              });

              // Re-enable safe updates
              await new Promise((resolve) => {
                db.query("SET SQL_SAFE_UPDATES = 1", (err) => {
                  if (err) console.error("Error enabling safe updates:", err);
                  resolve();
                });
              });

              // Commit the transaction
              db.commit((err) => {
                if (err) {
                  return db.rollback(() => {
                    res
                      .status(500)
                      .json({ error: "Error committing transaction" });
                  });
                }

                // Update order total_price after batch assignment update
                updateOrderTotalPrice(req.params.orderId, () => {
                  res.json({
                    message:
                      "Batch-order assignment and quantities updated successfully",
                    batch_id: parseInt(req.params.batchId),
                    order_id: parseInt(req.params.orderId),
                    qty,
                    description,
                  });
                });
              });
            } catch (error) {
              return db.rollback(() => {
                db.query("SET SQL_SAFE_UPDATES = 1", () => {
                  res.status(500).json({
                    error:
                      error.message === "Assignment not found"
                        ? "Assignment not found"
                        : "Error updating batch-order assignment",
                  });
                });
              });
            }
          });
        }
      );
    });
  }
);

// Delete batch-order assignment
router.delete("/:batchId/:orderId", verifyToken, async (req, res) => {
  const { batchId, orderId } = req.params;

  // Disable safe updates
  db.query("SET SQL_SAFE_UPDATES = 0", (safeErr) => {
    if (safeErr)
      return res.status(500).json({ error: "Error disabling safe updates" });

    // First get the assigned quantity
    const getQtySql =
      "SELECT qty FROM batch_order WHERE fk_batch_order_batch = ? AND fk_batch_order_order = ?";

    db.query(getQtySql, [batchId, orderId], (err, qtyData) => {
      if (err) {
        db.query("SET SQL_SAFE_UPDATES = 1");
        return res
          .status(500)
          .json({ error: "Error getting assignment details" });
      }
      if (qtyData.length === 0) {
        db.query("SET SQL_SAFE_UPDATES = 1");
        return res.status(404).json({ error: "Assignment not found" });
      }

      const assignedQty = qtyData[0].qty;

      // Begin transaction
      db.beginTransaction((err) => {
        if (err) {
          db.query("SET SQL_SAFE_UPDATES = 1");
          return res.status(500).json({ error: "Error starting transaction" });
        }

        // Delete the assignment
        const deleteSql =
          "DELETE FROM batch_order WHERE fk_batch_order_batch = ? AND fk_batch_order_order = ?";
        db.query(deleteSql, [batchId, orderId], (err) => {
          if (err) {
            return db.rollback(() => {
              db.query("SET SQL_SAFE_UPDATES = 1");
              res.status(500).json({ error: "Error deleting assignment" });
            });
          }

          // Update batch quantity
          const updateBatchSql = "UPDATE batch SET qty = qty + ? WHERE id = ?";
          db.query(updateBatchSql, [assignedQty, batchId], (err) => {
            if (err) {
              return db.rollback(() => {
                db.query("SET SQL_SAFE_UPDATES = 1");
                res
                  .status(500)
                  .json({ error: "Error updating batch quantity" });
              });
            }

            // Update order status to 'pending'
            const updateOrderStatusSql = `
              UPDATE orders
              SET status = 'pending'
              WHERE id = ?
            `;

            db.query(updateOrderStatusSql, [orderId], (orderStatusErr) => {
              if (orderStatusErr) {
                console.error("Error updating order status:", orderStatusErr);
                return db.rollback(() => {
                  db.query("SET SQL_SAFE_UPDATES = 1");
                  res.status(500).json({
                    error:
                      "Assignment deleted and batch updated, but failed to update order status.",
                  });
                });
              }

              // Re-enable safe updates
              db.query("SET SQL_SAFE_UPDATES = 1", (safeErr) => {
                if (safeErr) {
                  console.error("Error enabling safe updates:", safeErr);
                }

                // Commit transaction
                db.commit((err) => {
                  if (err) {
                    return db.rollback(() => {
                      res
                        .status(500)
                        .json({ error: "Error committing transaction" });
                    });
                  }
                  // Update order total_price after batch assignment delete
                  updateOrderTotalPrice(orderId, () => {
                    res.json({
                      message:
                        "Assignment removed successfully, batch quantity and order status updated",
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});

export default router;
