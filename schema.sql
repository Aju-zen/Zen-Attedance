-- Database Schema for Gym Attendance Tracker

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Clients Table
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_number TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    membership_start DATE,
    membership_end DATE,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Expired')),
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for client searches
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients (name);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients (status);

-- 2. Create Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Present', 'Absent')),
    marked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Prevent duplicate markings for the same client on the same day
    CONSTRAINT unique_client_date UNIQUE (client_id, date)
);

-- Index for attendance date queries
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance (date);
CREATE INDEX IF NOT EXISTS idx_attendance_client_date ON attendance (client_id, date);

-- 3. Create Membership History Table
CREATE TABLE IF NOT EXISTS membership_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    duration INTEGER NOT NULL, -- in days
    renewed_on TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_membership_history_client ON membership_history (client_id);

-- Optional: Create a function and trigger to automatically update the client's status to 'Expired' 
-- if they pass their membership end date. In our frontend, we also double-check this dynamically.
CREATE OR REPLACE FUNCTION check_membership_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.membership_end IS NOT NULL AND NEW.membership_end < CURRENT_DATE THEN
        NEW.status := 'Expired';
    ELSE
        NEW.status := 'Active';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_check_membership_status_insert_update
BEFORE INSERT OR UPDATE ON clients
FOR EACH ROW
EXECUTE FUNCTION check_membership_status();
