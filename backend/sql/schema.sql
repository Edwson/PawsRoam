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

-- Venues Table
-- Stores information about pet-friendly businesses and locations.
-- Inspired by the user-provided 'businesses' table from MariaDB dump.
CREATE TABLE IF NOT EXISTS venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Optional: link to the user who owns/manages this venue
    name VARCHAR(255) NOT NULL,
    address TEXT, -- Full address as a single text block for simplicity now
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    latitude DECIMAL(10,8) NOT NULL, -- Sufficient precision for Leaflet
    longitude DECIMAL(11,8) NOT NULL, -- Sufficient precision for Leaflet
    phone_number VARCHAR(30),
    website VARCHAR(255),
    description TEXT,
    opening_hours JSONB, -- Store opening hours as JSON (e.g., { "Mon": "9am-5pm", "Tue": ... })

    type VARCHAR(50) NOT NULL DEFAULT 'unknown', -- e.g., 'cafe', 'park', 'store', 'restaurant', 'hotel'

    -- Pet Policy Fields (simplified from user's schema)
    pet_policy_summary VARCHAR(255),
    pet_policy_details TEXT,
    allows_off_leash BOOLEAN DEFAULT FALSE,
    has_indoor_seating_for_pets BOOLEAN DEFAULT FALSE,
    has_outdoor_seating_for_pets BOOLEAN DEFAULT FALSE,
    water_bowls_provided BOOLEAN DEFAULT FALSE,
    pet_treats_available BOOLEAN DEFAULT FALSE,
    pet_menu_available BOOLEAN DEFAULT FALSE,
    dedicated_pet_area BOOLEAN DEFAULT FALSE,
    weight_limit_kg DECIMAL(5,2),
    -- pet_size_limit VARCHAR(20) CHECK (pet_size_limit IN ('small', 'medium', 'large', 'any')) DEFAULT 'any', -- Using VARCHAR instead of ENUM for broader compatibility
    carrier_required BOOLEAN DEFAULT FALSE,
    additional_pet_services TEXT,

    -- Rating fields
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    review_count INTEGER DEFAULT 0,

    status VARCHAR(50) DEFAULT 'active', -- e.g., 'active', 'pending_approval', 'temporarily_closed'

    google_place_id VARCHAR(255) UNIQUE, -- Optional: for linking with Google Places

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common query fields
CREATE INDEX IF NOT EXISTS idx_venues_name ON venues(name); -- For searching by name (consider GIN/GIST for full-text search later)
CREATE INDEX IF NOT EXISTS idx_venues_type ON venues(type);
CREATE INDEX IF NOT EXISTS idx_venues_city ON venues(city);
-- For geospatial queries, PostGIS extension would be ideal. For now, simple lat/long.
-- CREATE INDEX IF NOT EXISTS idx_venues_location ON venues USING GIST (ll_to_earth(latitude, longitude)); -- Requires earthdistance & cube extensions

-- Apply the updated_at trigger to venues table
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


-- Pets Table
-- Stores information about user's pets.
CREATE TABLE IF NOT EXISTS pets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Each pet must belong to a user
    name VARCHAR(100) NOT NULL,
    species VARCHAR(50) NOT NULL, -- e.g., 'Dog', 'Cat', 'Bird', 'Rabbit', 'Other'
    breed VARCHAR(100), -- Optional
    birthdate DATE, -- Optional
    avatar_url VARCHAR(255), -- Optional, URL to an image of the pet
    notes TEXT, -- Optional, for any extra details about the pet
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookup of pets by user
CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets(user_id);

-- Apply the updated_at trigger to pets table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_pets_updated_at' AND tgrelid = 'pets'::regclass
  ) THEN
    CREATE TRIGGER set_pets_updated_at
    BEFORE UPDATE ON pets
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();
  END IF;
END
$$;


-- Reviews Table
-- Stores user reviews for venues.
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    visit_date DATE, -- Optional: when the user visited the venue
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_venue_review UNIQUE (user_id, venue_id) -- Allow only one review per user per venue
);

-- Indexes for faster lookup of reviews
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_venue_id ON reviews(venue_id);

-- Apply the updated_at trigger to reviews table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_reviews_updated_at' AND tgrelid = 'reviews'::regclass
  ) THEN
    CREATE TRIGGER set_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();
  END IF;
END
$$;


-- Add more tables as needed (Images, Favorites, Awards etc. from user's schema)

-- Initial data (optional examples)
/*
-- Example: Inserting a test user (password is 'password123' hashed)
-- You'd normally do this via your application's registration
-- Ensure you have a valid password_hash if inserting manually.
-- Example: INSERT INTO users (email, name, password_hash) VALUES
-- ('owner@example.com', 'Venue Owner', '$2a$10$somebcryptgeneratedhashhere');

-- Sample Venue Data (uncomment and modify as needed)
-- Make sure to replace 'owner_user_id_placeholder' with an actual user's UUID if you have one, or set to NULL.

/*
INSERT INTO venues (
    name, address, city, state_province, postal_code, country,
    latitude, longitude, phone_number, website, description, opening_hours, type,
    pet_policy_summary, allows_off_leash, has_outdoor_seating_for_pets, water_bowls_provided, status
) VALUES
(
    'The Wagging Tail Cafe', '123 Bark Street', 'Pawsburg', 'CA', '90210', 'USA',
    34.052235, -118.243683, '555-1234', 'http://waggingtail.com',
    'A friendly cafe that loves dogs! We have a special patio area for pets and offer free puppuccinos.',
    '{ "Mon-Fri": "8am-6pm", "Sat": "9am-4pm", "Sun": "Closed" }'::jsonb, 'cafe',
    'Well-behaved dogs welcome on the patio. Water bowls available.', TRUE, TRUE, TRUE, 'active'
),
(
    'Happy Hounds Park', '456 Fetch Lane', 'Pawsburg', 'CA', '90211', 'USA',
    34.062235, -118.253683, NULL, NULL,
    'Large, fenced-in off-leash dog park with separate areas for small and large dogs. Features agility equipment and water fountains.',
    '{ "Mon-Sun": "6am-10pm" }'::jsonb, 'park',
    'Dogs must be vaccinated and licensed. Owners must clean up after their pets.', TRUE, TRUE, TRUE, 'active'
),
(
    'The Pampered Pet Store', '789 Treat Boulevard', 'Pawsburg', 'CA', '90212', 'USA',
    34.072235, -118.263683, '555-5678', 'http://pamperedpet.com',
    'Your one-stop shop for premium pet food, toys, accessories, and grooming services. Leashed pets are welcome inside!',
    '{ "Mon-Sat": "9am-8pm", "Sun": "10am-6pm" }'::jsonb, 'store',
    'Leashed, well-behaved pets are welcome in the store.', FALSE, TRUE, FALSE, 'active'
),
(
    'Seaside Dog Beach', 'Beach Road End', 'Pawsburg', 'CA', '90213', 'USA',
    34.042235, -118.233683, NULL, NULL,
    'Designated off-leash dog beach area. Enjoy the sun, sand, and surf with your furry friend!',
    '{ "Mon-Sun": "Dawn till Dusk" }'::jsonb, 'park', -- 'beach' could also be a type
    'Off-leash allowed in designated area. Please observe all beach rules.', TRUE, TRUE, FALSE, 'active'
);
*/

SELECT 'Schema setup complete.' AS status;
