-- PawsRoam PostgreSQL Schema
-- Version: 1.0

-- Users Table
-- Stores user authentication and basic profile information.

-- Optional: Create a UUID extension if you want to use UUIDs for IDs
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Using UUID for IDs
    -- id SERIAL PRIMARY KEY, -- Alternative: auto-incrementing integer ID
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Optional: Index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Optional: Trigger to update 'updated_at' timestamp automatically
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_users_updated_at' AND tgrelid = 'users'::regclass
  ) THEN
    CREATE TRIGGER set_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();
  END IF;
END
$$;

-- Venues Table (Placeholder for future, if using SQL for venues)
/*
CREATE TABLE IF NOT EXISTS venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    type VARCHAR(100), -- e.g., 'cafe', 'park', 'store'
    description TEXT,
    created_by UUID REFERENCES users(id), -- Optional: link to user who added it
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_venues_type ON venues(type);
CREATE INDEX IF NOT EXISTS idx_venues_location ON venues USING GIST (ll_to_earth(latitude, longitude)); -- Requires earthdistance extension

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_venues_updated_at' AND tgrelid = 'venues'::regclass
  ) THEN
    CREATE TRIGGER set_venues_updated_at
    BEFORE UPDATE ON venues
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();
  END IF;
END
$$;
*/

-- Add more tables as needed (Pets, Reviews, etc.)

-- Initial data (optional examples)
/*
-- Example: Inserting a test user (password is 'password123' hashed)
-- You'd normally do this via your application's registration
INSERT INTO users (email, name, password_hash) VALUES
('testuser@example.com', 'Test User', '$2a$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
-- Replace with an actual bcrypt hash if testing manually
*/

SELECT 'Schema setup complete.' AS status;
