import mysql from "mysql2";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "root",
  database: process.env.DB_NAME || "bms",
  port: process.env.DB_PORT || 3306,
  timezone: '+05:30', // Set to Sri Lanka timezone
  dateStrings: [
    'DATE',
    'DATETIME'
  ],
  typeCast: function (field, next) {
    if (field.type === 'DECIMAL' || field.type === 'NEWDECIMAL') {
      const value = field.string();
      return (value === null) ? null : Number(value);
    }
    if (field.type === 'TIMESTAMP' || field.type === 'DATETIME') {
      const value = field.string();
      if (value === null) return null;
      // Convert to Sri Lanka time for display
      const date = new Date(value);
      return new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
    }
    return next();
  }
});

// Initialize database tables
const initializeDatabase = () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const modelsDir = path.join(__dirname, "..", "models");

  // Read and execute all SQL files in models directory
  fs.readdir(modelsDir, (err, files) => {
    if (err) {
      console.error("Error reading models directory:", err);
      return;
    }

    files.forEach((file) => {
      if (file.endsWith(".sql")) {
        const sqlPath = path.join(modelsDir, file);
        const sql = fs.readFileSync(sqlPath, "utf8");

        db.query(sql, (error) => {
          if (error) {
            console.error(`Error executing ${file}:`, error);
            return;
          }
          console.log(`Successfully executed ${file}`);
        });
      }
    });
  });
};

db.connect((error) => {
  if (error) {
    console.error("Error connecting to the database:", error);
    return;
  }
  console.log("Successfully connected to the database.");

  // Set session timezone to Sri Lanka
  db.query("SET time_zone = '+05:30'", (err) => {
    if (err) {
      console.error("Error setting timezone:", err);
      return;
    }
    console.log("Database timezone set to Asia/Colombo (+05:30)");
  });

  // Initialize tables after connection
  initializeDatabase();
});

// Helper function to get current Sri Lanka time
const getCurrentSLTime = () => {
  const now = new Date();
  // Add 5 hours and 30 minutes for Sri Lanka time
  return new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
};

export { db as default, getCurrentSLTime };
