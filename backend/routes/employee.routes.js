import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import db from "../config/db.config.js";

const router = express.Router();

// Get all employees
router.get("/employees", verifyToken, (req, res) => {
  try {
    const sql = `
      SELECT e.*, et.name as type_name 
      FROM employee e 
      LEFT JOIN employee_type et ON e.type_id = et.id
    `;

    db.query(sql, (err, results) => {
      if (err) {
        console.error('Database error in /employees:', err);
        return res.status(500).json({ error: "Error fetching employees" });
      }
      res.json(results);
    });
  } catch (error) {
    console.error('Route error in /employees:', error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all employee types
router.get("/employee-types", verifyToken, (req, res) => {
  try {
    const sql = "SELECT * FROM employee_type";

    db.query(sql, (err, results) => {
      if (err) {
        console.error('Database error in /employee-types:', err);
        return res.status(500).json({ error: "Error fetching employee types" });
      }
      res.json(results);
    });
  } catch (error) {
    console.error('Route error in /employee-types:', error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add new employee type
router.post("/employee-types", verifyToken, (req, res) => {
  const { name, description, basic_salary } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }

  // Validate basic_salary
  const salary = basic_salary !== undefined ? parseFloat(basic_salary) : 0;
  if (isNaN(salary) || salary < 0) {
    return res
      .status(400)
      .json({ error: "Basic salary must be a non-negative number" });
  }

  const sql =
    "INSERT INTO employee_type (name, description, basic_salary) VALUES (?, ?, ?)";

  db.query(sql, [name, description, salary], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Error creating employee type" });
    }
    res
      .status(201)
      .json({ id: result.insertId, name, description, basic_salary: salary });
  });
});

// Update employee type
router.put("/employee-types/:id", verifyToken, (req, res) => {
  const { id } = req.params;
  const { name, description, basic_salary } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }

  // Validate basic_salary
  const salary = basic_salary !== undefined ? parseFloat(basic_salary) : 0;
  if (isNaN(salary) || salary < 0) {
    return res
      .status(400)
      .json({ error: "Basic salary must be a non-negative number" });
  }

  const sql =
    "UPDATE employee_type SET name = ?, description = ?, basic_salary = ? WHERE id = ?";

  db.query(sql, [name, description, salary, id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Error updating employee type" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Employee type not found" });
    }

    res.json({ id: parseInt(id), name, description, basic_salary: salary });
  });
});

// Add new employee
router.post("/employees", verifyToken, (req, res) => {
  try {
    const { name, type_id, nic, acc_no, dob, email, password, phone1, phone2 } =
      req.body;

    // Validate required fields
    if (!name || !type_id || !email || !password || !phone1) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check for unique fields
    const checkUniqueSql = `
            SELECT 'email' as field FROM employee WHERE email = ?
            UNION
            SELECT 'nic' as field FROM employee WHERE nic = ? AND nic IS NOT NULL
            UNION
            SELECT 'acc_no' as field FROM employee WHERE acc_no = ? AND acc_no IS NOT NULL
        `;

    db.query(checkUniqueSql, [email, nic, acc_no], (err, duplicates) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Error checking unique fields" });
      }

      if (duplicates.length > 0) {
        const field = duplicates[0].field;
        return res.status(400).json({ error: `${field} already exists` });
      }

      // Check if employee type exists
      const checkTypeSql = "SELECT id FROM employee_type WHERE id = ?";
      db.query(checkTypeSql, [type_id], (err, types) => {
        if (err) {
          console.error(err);
          return res
            .status(500)
            .json({ error: "Error checking employee type" });
        }

        if (types.length === 0) {
          return res.status(400).json({ error: "Invalid employee type" });
        }

        // Insert new employee
        const insertSql = `
                    INSERT INTO employee 
                    (name, type_id, nic, acc_no, dob, email, password, phone1, phone2) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;

        let accNoInt = null;
        if (acc_no) {
          accNoInt = parseInt(acc_no);
          if (isNaN(accNoInt)) {
            return res
              .status(400)
              .json({ error: "Account number must be a valid number" });
          }
        }
        const values = [
          name,
          type_id,
          nic || null,
          accNoInt,
          dob || null,
          email,
          password,
          phone1,
          phone2 || null,
        ];

        db.query(insertSql, values, (err, result) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ error: "Error creating employee" });
          }

          // Fetch the created employee to include type_name
          const getEmployeeSql = `
                        SELECT e.*, et.name as type_name 
                        FROM employee e
                        LEFT JOIN employee_type et ON e.type_id = et.id
                        WHERE e.id = ?
                    `;

          db.query(getEmployeeSql, [result.insertId], (err, employees) => {
            if (err) {
              console.error(err);
              return res
                .status(500)
                .json({ error: "Error fetching created employee" });
            }

            const employee = employees[0];
            delete employee.password;
            res.status(201).json(employee);
          });
        });
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update employee
router.put("/employees/:id", verifyToken, (req, res) => {
  const { id } = req.params;
  const { name, type_id, nic, acc_no, dob, email, phone1, phone2 } = req.body;

  // Validate required fields
  if (!name || !type_id || !email || !phone1) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Check for existing email except current employee
  const checkEmailSql = "SELECT id FROM employee WHERE email = ? AND id != ?";
  db.query(checkEmailSql, [email, id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Error checking email" });
    }

    if (results.length > 0) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const sql = `
      UPDATE employee 
      SET name = ?, type_id = ?, nic = ?, acc_no = ?, 
          dob = ?, email = ?, phone1 = ?, phone2 = ?
      WHERE id = ?
    `;

    db.query(
      sql,
      [name, type_id, nic, acc_no, dob, email, phone1, phone2, id],
      (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: "Error updating employee" });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ error: "Employee not found" });
        }
        res.json({ id, ...req.body });
      }
    );
  });
});

// Delete employee
router.delete("/employees/:id", verifyToken, (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM employee WHERE id = ?";

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Error deleting employee" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }
    res.json({ message: "Employee deleted successfully" });
  });
});

export default router;
