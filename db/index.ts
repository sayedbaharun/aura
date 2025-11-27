import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;

// Railway PostgreSQL Connection with secure SSL
// In production, verify SSL certificates to prevent MITM attacks
// Set DATABASE_SSL_REJECT_UNAUTHORIZED=false only for self-signed certs (not recommended)
const sslConfig = process.env.NODE_ENV === "production"
  ? {
      rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false",
    }
  : false;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig,
});

export const db = drizzle(pool);
