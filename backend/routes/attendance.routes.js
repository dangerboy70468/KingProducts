import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import db, { getCurrentSLTime } from "../config/db.config.js";

const router = express.Router();

// Get all attendance records
router.get("/", verifyToken, (req, res) => {
  const sql = `
    SELECT 
      a.*,
      e.name as employee_name,
      e.nic
    FROM attendance a
    JOIN employee e ON a.fk_attendance_employee = e.id
    ORDER BY a.attendance_date DESC, a.check_in_time DESC
  `;
  db.query(sql, (err, data) => {
    if (err) {
      console.error("Error fetching attendance records:", err);
      return res
        .status(500)
        .json({ error: "Error fetching attendance records" });
    }
    res.json(data);
  });
});

// Get attendance by date range
router.get("/range", verifyToken, (req, res) => {
  const { start_date, end_date } = req.query;
  const sql = `
    SELECT 
      a.*,
      e.name as employee_name,
      e.nic
    FROM attendance a
    JOIN employee e ON a.fk_attendance_employee = e.id
    WHERE a.attendance_date BETWEEN ? AND ?
    ORDER BY a.attendance_date DESC, a.check_in_time DESC
  `;
  db.query(sql, [start_date, end_date], (err, data) => {
    if (err) {
      console.error("Error fetching attendance by date range:", err);
      return res
        .status(500)
        .json({ error: "Error fetching attendance by date range" });
    }
    res.json(data);
  });
});

// Get attendance by employee
router.get("/employee/:employeeId", verifyToken, (req, res) => {
  const { date } = req.query;
  let sql = `
    SELECT 
      a.*,
      e.name as employee_name,
      e.nic
    FROM attendance a
    JOIN employee e ON a.fk_attendance_employee = e.id
    WHERE a.fk_attendance_employee = ?
  `;

  let params = [req.params.employeeId];

  // Add date filter if provided
  if (date) {
    sql += ` AND a.attendance_date = ?`;
    params.push(date);
  }

  sql += ` ORDER BY a.attendance_date DESC, a.check_in_time DESC`;

  db.query(sql, params, (err, data) => {
    if (err) {
      console.error("Error fetching employee attendance:", err);
      return res
        .status(500)
        .json({ error: "Error fetching employee attendance" });
    }
    res.json(data);
  });
});

// Get employee by NIC
router.get("/employee-by-nic/:nic", (req, res) => {
  const sql = `SELECT id, name, nic FROM employee WHERE nic = ?`;

  db.query(sql, [req.params.nic], (err, data) => {
    if (err) {
      console.error("Error finding employee by NIC:", err);
      return res.status(500).json({ error: "Error finding employee" });
    }

    if (data.length === 0) {
      return res
        .status(404)
        .json({ error: "Employee not found with this NIC" });
    }

    res.json(data[0]);
  });
});

// QR-based check-in/out with NIC
router.post("/qr-scan", (req, res) => {
  console.log('Received QR scan request:', req.body);

  const { nic } = req.body;

  // Validate NIC
  if (!nic || typeof nic !== 'string' || !nic.trim()) {
    console.error('Invalid NIC in request:', req.body);
    return res.status(400).json({ error: "Valid NIC is required" });
  }

  const cleanNIC = nic.trim();

  // Find employee by NIC
  const findEmployeeSql = `SELECT id, name FROM employee WHERE nic = ?`;

  console.log('Looking up employee with NIC:', cleanNIC);

  db.query(findEmployeeSql, [cleanNIC], (err, employees) => {
    if (err) {
      console.error("Error finding employee:", err);
      return res.status(500).json({ error: "Error finding employee" });
    }

    if (employees.length === 0) {
      console.error('No employee found with NIC:', cleanNIC);
      return res.status(404).json({ 
        error: "Employee not found with this NIC",
        details: "Please verify the NIC number or contact your administrator"
      });
    }

    const employee = employees[0];
    const employeeId = employee.id;
    
    // Get current time in Sri Lanka timezone
    const now = getCurrentSLTime();
    
    // Format date as YYYY-MM-DD
    const currentDate = now.toISOString().split('T')[0];
    
    // Format time as HH:mm:ss
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const currentTime = `${hours}:${minutes}:${seconds}`;

    console.log('Processing attendance for employee:', {
      id: employeeId,
      name: employee.name,
      date: currentDate,
      time: currentTime,
      timezone: 'Asia/Colombo'
    });

    // Check if employee already has an attendance record for today
    const checkRecordSql = `
      SELECT id, 
             check_in_time,
             check_out_time,
             attendance_date,
             CONVERT_TZ(check_in_time, '+00:00', '+05:30') as local_check_in_time,
             CONVERT_TZ(check_out_time, '+00:00', '+05:30') as local_check_out_time
      FROM attendance 
      WHERE fk_attendance_employee = ? 
      AND DATE(CONVERT_TZ(attendance_date, '+00:00', '+05:30')) = ?
    `;

    db.query(checkRecordSql, [employeeId, currentDate], (err, records) => {
      if (err) {
        console.error("Error checking attendance record:", err);
        return res.status(500).json({ error: "Error checking attendance record" });
      }

      console.log('Found existing attendance records:', records);

      // If no record exists for today, create check-in
      if (records.length === 0) {
        // Determine status based on check-in time (using Sri Lanka time)
        const checkInHour = parseInt(hours);
        const checkInMinute = parseInt(minutes);
        let status = "on time";

        // If check-in after 9:10 AM Sri Lanka time (9:00 + 10 minutes grace period)
        if (checkInHour > 9 || (checkInHour === 9 && checkInMinute > 10)) {
          status = "late";
        }

        console.log('Creating new check-in record:', {
          employeeId,
          currentDate,
          currentTime,
          status,
          timezone: 'Asia/Colombo'
        });

        // Use INSERT INTO to create a new attendance record
        const insertSql = `
          INSERT INTO attendance 
          (fk_attendance_employee, attendance_date, check_in_time, status) 
          VALUES (?, ?, CONVERT_TZ(?, '+05:30', '+00:00'), ?)
        `;

        const checkInDateTime = `${currentDate} ${currentTime}`;
        
        db.query(
          insertSql,
          [employeeId, currentDate, checkInDateTime, status],
          (err, result) => {
            if (err) {
              // Check if error is due to duplicate entry
              if (err.code === "ER_DUP_ENTRY") {
                console.error('Duplicate attendance record error:', err);
                return res.status(400).json({
                  error: "Attendance record already exists for today",
                  employee_name: employee.name,
                });
              }

              console.error("Error recording check-in:", err);
              return res.status(500).json({ error: "Error recording check-in" });
            }

            console.log('Successfully recorded check-in:', result);

            return res.status(201).json({
              message: "Check-in recorded successfully",
              employee_name: employee.name,
              time: currentTime,
              status: status,
              type: "check-in",
              timezone: "Asia/Colombo"
            });
          }
        );
      }
      // If record exists but no check-out, update with check-out
      else if (records[0].check_out_time === null) {
        console.log('Recording check-out for existing record:', records[0]);

        const updateSql = `
          UPDATE attendance 
          SET check_out_time = CONVERT_TZ(?, '+05:30', '+00:00'),
              total_hours = TIMESTAMPDIFF(
                HOUR, 
                check_in_time, 
                CONVERT_TZ(?, '+05:30', '+00:00')
              )
          WHERE id = ?
        `;

        const checkOutDateTime = `${currentDate} ${currentTime}`;

        db.query(updateSql, [checkOutDateTime, checkOutDateTime, records[0].id], (err, result) => {
          if (err) {
            console.error("Error recording check-out:", err);
            return res.status(500).json({ error: "Error recording check-out" });
          }

          console.log('Successfully recorded check-out:', result);

          return res.status(200).json({
            message: "Check-out recorded successfully",
            employee_name: employee.name,
            time: currentTime,
            type: "check-out",
            timezone: "Asia/Colombo"
          });
        });
      }
      // If already checked in and out today
      else {
        console.log('Employee already completed attendance for today:', records[0]);

        return res.status(400).json({
          error: "Already completed check-in and check-out for today",
          employee_name: employee.name,
          status: "complete",
          check_in_time: records[0].local_check_in_time,
          check_out_time: records[0].local_check_out_time,
          timezone: "Asia/Colombo"
        });
      }
    });
  });
});

// Get attendance summary by date range
router.get("/summary", verifyToken, (req, res) => {
  const { start_date, end_date } = req.query;
  const sql = `
    SELECT 
      e.id as employee_id,
      e.name as employee_name,
      COUNT(a.id) as total_days,
      COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_days,
      COUNT(CASE WHEN a.status = 'on time' THEN 1 END) as on_time_days
    FROM employee e
    LEFT JOIN attendance a ON e.id = a.fk_attendance_employee
    AND a.attendance_date BETWEEN ? AND ?
    GROUP BY e.id, e.name
  `;

  db.query(sql, [start_date, end_date], (err, data) => {
    if (err) {
      console.error("Error fetching attendance summary:", err);
      return res
        .status(500)
        .json({ error: "Error fetching attendance summary" });
    }
    res.json(data);
  });
});

export default router;
