import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initializeDatabase() {
    const connection = await mysql.createConnection({
        host: process.env.MYSQLHOST || process.env.DB_HOST,
        user: process.env.MYSQLUSER || process.env.DB_USER,
        password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD,
        database: process.env.MYSQLDATABASE || process.env.DB_NAME,
        port: process.env.MYSQLPORT || process.env.DB_PORT,
    });

    try {
        // Read the SQL file
        const sql = fs.readFileSync(path.join(__dirname, 'db', 'bms.sql'), 'utf8');
        
        // Split the SQL file into individual statements
        const statements = sql.split(';').filter(statement => statement.trim());
        
        // Execute each statement
        for (const statement of statements) {
            if (statement.trim()) {
                await connection.query(statement);
                console.log('Executed SQL statement successfully');
            }
        }
        
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
    } finally {
        await connection.end();
    }
}

initializeDatabase();
