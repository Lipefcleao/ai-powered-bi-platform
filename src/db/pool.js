import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

/**
 * Pool de conexões MySQL otimizado (Azure Replica).
 * Reutiliza conexões ativas, limita filas e reduz overhead de reconexão por requisição.
 */
export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  database: env.db.database,
  user: env.db.user,
  password: env.db.password,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 50,
  connectTimeout: 10000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  namedPlaceholders: true,
  charset: 'utf8mb4'
});
