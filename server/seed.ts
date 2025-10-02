import { pool } from "./db";
import bcrypt from "bcryptjs";

/**
 * Legacy seed function - now integrated into initializeDatabase
 * This function is kept for backward compatibility
 */
export async function seedDatabase() {
  if (!pool) {
    console.log("⚠️  No database connection available. Skipping seeding.");
    return;
  }

  try {
    console.log("🌱 Running legacy seed function...");
    
    // Hash passwords
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const hrPassword = await bcrypt.hash('hr123', 10);
    
    // Insert default users with hashed passwords
    await pool.query(`
      INSERT INTO users (email, password, plain_password, full_name, role, is_active) 
      VALUES 
        ('admin@recruitpro.com', $1, 'admin123', 'Administrator', 'admin', true),
        ('hr@recruitpro.com', $2, 'hr123', 'HR Manager', 'hr_manager', true)
      ON CONFLICT (email) DO UPDATE SET
        password = EXCLUDED.password,
        plain_password = EXCLUDED.plain_password,
        updated_at = CURRENT_TIMESTAMP
    `, [hashedPassword, hrPassword]);
    
    console.log("✅ Legacy seed completed successfully!");
  } catch (error: any) {
    console.error("❌ Legacy seed failed:", error.message);
    // Don't throw to prevent server crash
  }
}