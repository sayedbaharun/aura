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
  // Connection pool settings to prevent ERR_CONNECTION_RESET on Neon/Railway
  max: 10, // Maximum number of clients in the pool
  min: 2, // Minimum number of clients to keep
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return error after 10 seconds if no connection
  statement_timeout: 30000, // Abort queries that take more than 30 seconds
  query_timeout: 30000, // Timeout for query execution
  keepAlive: true, // Enable TCP keep-alive
  keepAliveInitialDelayMillis: 10000, // Start keep-alive after 10 seconds of idle
});

// Handle pool errors to prevent unhandled exceptions
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

export const db = drizzle(pool);
