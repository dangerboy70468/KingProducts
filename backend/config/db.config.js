import mysql from "mysql2";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

// Log only non-sensitive connection details
console.log('Database configuration:', {
  host: process.env.DB_HOST || "switchback.proxy.rlwy.net",
  user: process.env.DB_USER || "root",
  database: process.env.DB_NAME || "railway",
  port: process.env.DB_PORT || 36399
});

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || "switchback.proxy.rlwy.net",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "aUsyGZHcMGJGlvdgNLAElxqxnrltXUED",
  database: process.env.DB_NAME || "railway",
  port: process.env.DB_PORT || 36399,
  ssl: {
    rejectUnauthorized: false
  },
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
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Convert pool to use promises
const db = pool.promise();

// Initialize database tables
const initializeDatabase = async () => {
  try {
    // Set timezone
    await db.query("SET time_zone = '+05:30'");
    console.log("Database timezone set to Asia/Colombo (+05:30)");

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const modelsDir = path.join(__dirname, "..", "models");

    // Read and execute all SQL files
    const files = await fs.promises.readdir(modelsDir);
    for (const file of files) {
      if (file.endsWith(".sql")) {
        const sqlPath = path.join(modelsDir, file);
        const sql = await fs.promises.readFile(sqlPath, "utf8");
        try {
          await db.query(sql);
          console.log(`Successfully executed ${file}`);
        } catch (error) {
          console.error(`Error executing ${file}:`, error);
        }
      }
    }

    console.log("Successfully connected to the database and initialized tables.");
  } catch (error) {
    console.error("Database initialization error:", error);
  }
};

// Initialize the database
initializeDatabase();

// Helper function to get current Sri Lanka time
const getCurrentSLTime = () => {
  const now = new Date();
  // Add 5 hours and 30 minutes for Sri Lanka time
  return new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
};

export { db as default, getCurrentSLTime };
