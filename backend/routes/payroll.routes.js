import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import db from "../config/db.config.js";

const router = express.Router();

// Get all payroll records (optionally filter by month)
router.get("/", verifyToken, (req, res) => {
  const { month } = req.query;
  let sql = `
    SELECT 
      p.*,
      e.name as employee_name
    FROM payroll p
    JOIN employee e ON p.employee_id = e.id
  `;
  let params = [];
  if (month) {
    sql += " WHERE p.salary_month = ?";
    params.push(month);
  }
  sql += " ORDER BY p.payment_date DESC";
  db.query(sql, params, (err, data) => {
    if (err)
      return res.status(500).json({ error: "Error fetching payroll records" });
    res.json(data);
  });
});

// Get payroll by employee
router.get("/employee/:employeeId", verifyToken, (req, res) => {
  const sql = `
    SELECT 
      p.*,
      e.name as employee_name,
      e.employee_id as employee_code,
      e.position,
      e.department
    FROM payroll p
    JOIN employee e ON p.employee_id = e.id
    WHERE p.employee_id = ?
    ORDER BY p.payment_date DESC
  `;
  db.query(sql, [req.params.employeeId], (err, data) => {
    if (err)
      return res.status(500).json({ error: "Error fetching employee payroll" });
    res.json(data);
  });
});

// Create payroll record
router.post("/", verifyToken, (req, res) => {
  const {
    employee_id,
    salary_month,
    base_salary,
    present_days,
    late_days,
    deduction_percent,
    overtime_hours,
    overtime_rate,
    overtime_pay,
    bonuses,
    deductions,
    total_salary,
    payment_date,
  } = req.body;

  const sql = `
    INSERT INTO payroll (
      employee_id, salary_month, base_salary,
      present_days, late_days, deduction_percent,
      overtime_hours, overtime_rate, overtime_pay,
      bonuses, deductions, total_salary, payment_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      employee_id,
      salary_month,
      base_salary,
      present_days || 0,
      late_days || 0,
      deduction_percent || 0,
      overtime_hours || 0,
      overtime_rate || 0,
      overtime_pay || 0,
      bonuses || 0,
      deductions || 0,
      total_salary,
      payment_date,
    ],
    (err, result) => {
      if (err)
        return res.status(500).json({ error: "Error creating payroll record" });
      res.status(201).json({
        id: result.insertId,
        ...req.body,
      });
    }
  );
});

// Update payroll record
router.put("/:id", verifyToken, (req, res) => {
  const {
    base_salary,
    present_days,
    late_days,
    deduction_percent,
    overtime_hours,
    overtime_rate,
    overtime_pay,
    bonuses,
    deductions,
    total_salary,
    payment_date,
  } = req.body;

  const sql = `
    UPDATE payroll 
    SET base_salary=?, present_days=?, late_days=?, deduction_percent=?,
        overtime_hours=?, overtime_rate=?, overtime_pay=?,
        bonuses=?, deductions=?, total_salary=?, payment_date=?
    WHERE id=?
  `;

  db.query(
    sql,
    [
      base_salary,
      present_days || 0,
      late_days || 0,
      deduction_percent || 0,
      overtime_hours || 0,
      overtime_rate || 0,
      overtime_pay || 0,
      bonuses || 0,
      deductions || 0,
      total_salary,
      payment_date,
      req.params.id,
    ],
    (err, result) => {
      if (err)
        return res.status(500).json({ error: "Error updating payroll record" });
      if (result.affectedRows === 0)
        return res.status(404).json({ message: "Payroll record not found" });
      res.json({
        id: parseInt(req.params.id),
        ...req.body,
      });
    }
  );
});

// Delete payroll record
router.delete("/:id", verifyToken, (req, res) => {
  const sql = "DELETE FROM payroll WHERE id = ?";
  db.query(sql, [req.params.id], (err, result) => {
    if (err)
      return res.status(500).json({ error: "Error deleting payroll record" });
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Payroll record not found" });
    res.json({ message: "Payroll record deleted successfully" });
  });
});

// Get payroll summary by date range
router.get("/summary/range", verifyToken, (req, res) => {
  const { start_date, end_date } = req.query;
  const sql = `
    SELECT 
      e.department,
      COUNT(DISTINCT p.employee_id) as employee_count,
      SUM(p.base_salary) as total_base_salary,
      SUM(p.overtime_pay) as total_overtime_pay,
      SUM(p.bonuses) as total_bonuses,
      SUM(p.deductions) as total_deductions,
      SUM(p.total_salary) as total_payout
    FROM payroll p
    JOIN employee e ON p.employee_id = e.id
    WHERE p.payment_date BETWEEN ? AND ?
    GROUP BY e.department
  `;

  db.query(sql, [start_date, end_date], (err, data) => {
    if (err)
      return res.status(500).json({ error: "Error fetching payroll summary" });
    res.json(data);
  });
});

// Generate salary slip
router.get("/salary-slip/:payrollId", verifyToken, (req, res) => {
  try {
  const sql = `
    SELECT 
      p.*,
      e.name as employee_name,
        e.id as employee_code,
        et.name as position,
        '' as department,
        e.acc_no as bank_account,
        e.nic as pan_number
    FROM payroll p
      LEFT JOIN employee e ON p.employee_id = e.id
      LEFT JOIN employee_type et ON e.type_id = et.id
    WHERE p.id = ?
  `;

  db.query(sql, [req.params.payrollId], (err, data) => {
      if (err) {
        console.error("Database error:", err);
      return res.status(500).json({ error: "Error generating salary slip" });
      }
      
    if (data.length === 0)
      return res.status(404).json({ message: "Payroll record not found" });
      
      // Ensure all required fields have default values if they're null
      const payrollData = data[0];
      const processedData = {
        ...payrollData,
        employee_name: payrollData.employee_name || "Employee",
        employee_code: payrollData.employee_code || "",
        position: payrollData.position || "",
        department: payrollData.department || "",
        bank_account: payrollData.bank_account || "",
        pan_number: payrollData.pan_number || "",
        present_days: payrollData.present_days || 0,
        late_days: payrollData.late_days || 0,
        deduction_percent: payrollData.deduction_percent || 0,
        overtime_hours: payrollData.overtime_hours || 0,
        overtime_rate: payrollData.overtime_rate || 0,
        overtime_pay: payrollData.overtime_pay || 0,
        bonuses: payrollData.bonuses || 0,
        deductions: payrollData.deductions || 0,
        total_salary: payrollData.total_salary || 0
      };
      
      res.json(processedData);
    });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Calculate payroll for all employees for a given month
router.get("/calculate", verifyToken, async (req, res) => {
  const { month } = req.query; // month format: YYYY-MM
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return res
      .status(400)
      .json({ error: "Invalid or missing month (YYYY-MM)" });
  }

  // Get all employees with their type and salary
  const employeesSql = `
    SELECT e.id, e.name, e.type_id, et.name as type_name, et.basic_salary
    FROM employee e
    LEFT JOIN employee_type et ON e.type_id = et.id
  `;

  db.query(employeesSql, async (err, employees) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Error fetching employees" });
    }

    // For each employee, get attendance for the month
    const results = await Promise.all(
      employees.map(
        (emp) =>
          new Promise((resolve) => {
            const attendanceSql = `
              SELECT status
              FROM attendance
              WHERE fk_attendance_employee = ?
                AND DATE_FORMAT(attendance_date, '%Y-%m') = ?
            `;
            db.query(attendanceSql, [emp.id, month], (err, attendance) => {
              if (err) {
                resolve({ ...emp, error: "Error fetching attendance" });
                return;
              }
              const totalDays = attendance.length;
              const lateDays = attendance.filter(
                (a) => a.status === "late"
              ).length;
              const deduction = lateDays >= 3 ? 0.1 : 0;
              const presentDays = totalDays;
              // Salary is proportional to days worked (out of 25)
              const baseSalary = Number(emp.basic_salary) || 0;
              const salaryForDays =
                (baseSalary * Math.min(presentDays, 25)) / 25;
              const finalSalary = salaryForDays * (1 - deduction);
              resolve({
                employee_id: emp.id,
                employee_name: emp.name,
                type_name: emp.type_name,
                base_salary: baseSalary,
                present_days: presentDays,
                late_days: lateDays,
                deduction_percent: deduction * 100,
                final_salary: Math.round(finalSalary * 100) / 100,
              });
            });
          })
      )
    );
    res.json(results);
  });
});

export default router;
