import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;

// Railway/Neon PostgreSQL Connection with SSL
// Default: Allow self-signed certificates (common for cloud databases)
// Set DATABASE_SSL_REJECT_UNAUTHORIZED=true for strict CA verification
const sslConfig = process.env.NODE_ENV === "production"
  ? {
      rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true",
    }
  : false;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig,
});

export const db = drizzle(pool);
