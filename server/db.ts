import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  console.warn(
    "⚠️  DATABASE_URL не задан. Используется режим без БД (заглушка). Установите переменную в .env для полноценной работы.",
  );
  console.log("📖 Пример DATABASE_URL: postgresql://postgres:password@localhost:5432/recruit_pro");
}

let pool: Pool | null = null;
let db: any = {};

if (process.env.DATABASE_URL) {
  try {
    pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      // Connection pool settings
      max: 20, // maximum number of clients in the pool
      idleTimeoutMillis: 30000, // close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // return an error after 2 seconds if connection could not be established
    });
    
    db = drizzle(pool, { schema });
    
    // Test connection on startup
    pool.on('connect', () => {
      console.log('🔗 New database connection established');
    });
    
    pool.on('error', (err) => {
      console.error('💥 Unexpected database error:', err);
    });
    
  } catch (error) {
    console.error('❌ Failed to initialize database connection:', error);
    console.warn('⚠️  Falling back to database-less mode');
    pool = null;
    db = {} as any;
  }
} else {
  console.log('📝 Running in database-less mode for development');
}

export { pool, db };