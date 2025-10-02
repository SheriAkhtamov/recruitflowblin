import { db, pool } from './db';
import fs from 'fs';
import path from 'path';

// SQL script for creating all necessary tables
const createTablesSQL = `
-- RecruitmentTracker Database Schema
-- This script creates all necessary tables for the recruitment system

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password TEXT NOT NULL,
    plain_password TEXT,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    date_of_birth TIMESTAMP,
    position VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'employee',
    has_report_access BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    is_online BOOLEAN DEFAULT false,
    last_seen_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create vacancies table
CREATE TABLE IF NOT EXISTS vacancies (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    department_id INTEGER REFERENCES departments(id),
    location VARCHAR(255),
    description TEXT,
    requirements TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_by INTEGER REFERENCES users(id),
    hired_candidate_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create candidates table
CREATE TABLE IF NOT EXISTS candidates (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    city VARCHAR(255),
    vacancy_id INTEGER REFERENCES vacancies(id),
    resume_url TEXT,
    resume_filename VARCHAR(255),
    source VARCHAR(100),
    interview_stage_chain JSONB,
    current_stage_index INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    rejection_reason TEXT,
    rejection_stage INTEGER,
    parsed_resume_data JSONB,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create interview_stages table
CREATE TABLE IF NOT EXISTS interview_stages (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER REFERENCES candidates(id),
    stage_index INTEGER NOT NULL,
    stage_name VARCHAR(255) NOT NULL,
    interviewer_id INTEGER REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'pending',
    scheduled_at TIMESTAMP,
    completed_at TIMESTAMP,
    comments TEXT,
    rating INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create interviews table
CREATE TABLE IF NOT EXISTS interviews (
    id SERIAL PRIMARY KEY,
    stage_id INTEGER REFERENCES interview_stages(id),
    candidate_id INTEGER REFERENCES candidates(id),
    interviewer_id INTEGER REFERENCES users(id),
    scheduled_at TIMESTAMP NOT NULL,
    duration INTEGER DEFAULT 30,
    status VARCHAR(50) DEFAULT 'scheduled',
    meeting_link TEXT,
    notes TEXT,
    outcome VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    related_entity_type VARCHAR(50),
    related_entity_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) NOT NULL UNIQUE,
    value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_candidates_vacancy_id ON candidates(vacancy_id);
CREATE INDEX IF NOT EXISTS idx_interview_stages_candidate_id ON interview_stages(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interviews_candidate_id ON interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interviews_interviewer_id ON interviews(interviewer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
`;

// SQL script for adding foreign key constraints that need to be added after table creation
const addConstraintsSQL = `
-- Add foreign key constraint for hired_candidate_id after candidates table is created
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_vacancies_hired_candidate'
    ) THEN
        ALTER TABLE vacancies 
        ADD CONSTRAINT fk_vacancies_hired_candidate 
        FOREIGN KEY (hired_candidate_id) REFERENCES candidates(id);
    END IF;
END $$;
`;

// SQL script for inserting default data
const insertDefaultDataSQL = `
-- Insert default admin users
INSERT INTO users (email, password, plain_password, full_name, role, is_active) 
VALUES 
    ('admin@recruitpro.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin123', 'Administrator', 'admin', true),
    ('hr@recruitpro.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'hr123', 'HR Manager', 'hr_manager', true)
ON CONFLICT (email) DO NOTHING;

-- Insert default departments
INSERT INTO departments (name, description) 
VALUES 
    ('IT', 'Information Technology Department'),
    ('HR', 'Human Resources Department'),
    ('Sales', 'Sales Department'),
    ('Marketing', 'Marketing Department'),
    ('Finance', 'Finance Department')
ON CONFLICT (name) DO NOTHING;

-- Insert sample vacancy (commented out - uncomment if you need sample data)
-- INSERT INTO vacancies (title, department, status, created_by) 
-- SELECT 'Мед представитель', 'Sales', 'active', u.id
-- FROM users u 
-- WHERE u.email = 'admin@recruitpro.com'
-- ON CONFLICT DO NOTHING;
`;

export async function initializeDatabase(): Promise<void> {
  if (!pool) {
    console.log("No database connection available. Skipping database initialization.");
    return;
  }

  try {
    console.log("🔧 Initializing database schema...");
    
    // First, add missing columns to existing tables
    console.log("🔄 Updating existing table schemas...");
    await updateExistingTables();
    
    // Create all tables
    console.log("📋 Creating tables...");
    await pool.query(createTablesSQL);
    
    // Add foreign key constraints
    console.log("🔗 Adding foreign key constraints...");
    await pool.query(addConstraintsSQL);
    
    // Insert default data
    console.log("💾 Inserting default data...");
    await pool.query(insertDefaultDataSQL);
    
    console.log("✅ Database initialization completed successfully!");
    
    // Test the connection
    const result = await pool.query('SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = $1', ['public']);
    console.log(`📊 Database contains ${result.rows[0].table_count} tables`);
    
  } catch (error: any) {
    console.error("❌ Database initialization failed:");
    console.error("Error details:", error.message);
    console.error("Error code:", error.code);
    
    // Don't throw error to prevent server from crashing
    // Just log the error and continue
    console.log("⚠️  Server will continue running in database-less mode");
  }
}

async function updateExistingTables(): Promise<void> {
  try {
    // Make email column nullable for candidates without email
    await pool!.query(`
      ALTER TABLE candidates 
      ALTER COLUMN email DROP NOT NULL;
    `);
    
    // Add any other missing columns here in the future
    console.log("✅ Table schemas updated successfully");
    
  } catch (error: any) {
    console.log("ℹ️  Table update info:", error.message);
    // Don't throw - this is expected if tables don't exist yet
  }
}

export async function checkDatabaseConnection(): Promise<boolean> {
  if (!pool) {
    return false;
  }
  
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    console.error("Database connection check failed:", error);
    return false;
  }
}