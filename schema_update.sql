-- Update schema for Client Self Check-In

-- Create Device Check-ins Table
CREATE TABLE IF NOT EXISTS device_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_fingerprint TEXT NOT NULL,
    membership_number TEXT NOT NULL,
    check_in_date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address TEXT,
    browser TEXT,
    location_latitude FLOAT,
    location_longitude FLOAT
);

-- Index for checking device per day
CREATE INDEX IF NOT EXISTS idx_device_checkins_fingerprint_date ON device_checkins (device_fingerprint, check_in_date);

-- Alter Attendance Table
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS latitude FLOAT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS longitude FLOAT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;

-- Create Settings Table to hold Gym Location (assuming single row)
CREATE TABLE IF NOT EXISTS gym_settings (
    id INT PRIMARY KEY DEFAULT 1,
    gym_latitude FLOAT DEFAULT 10.936700,
    gym_longitude FLOAT DEFAULT 76.955857,
    allowed_radius_meters FLOAT DEFAULT 500,
    CONSTRAINT single_row CHECK (id = 1)
);

-- Distance calculation function (Haversine)
CREATE OR REPLACE FUNCTION calculate_distance(lat1 float, lon1 float, lat2 float, lon2 float)
RETURNS float AS $$
DECLARE
    radius float = 6371000; -- Earth radius in meters
    dlat float;
    dlon float;
    a float;
    c float;
BEGIN
    dlat = radians(lat2 - lat1);
    dlon = radians(lon2 - lon1);
    a = sin(dlat/2) * sin(dlat/2) + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2) * sin(dlon/2);
    c = 2 * atan2(sqrt(a), sqrt(1-a));
    RETURN radius * c;
END;
$$ LANGUAGE plpgsql;

-- Self Check-In RPC
CREATE OR REPLACE FUNCTION process_self_check_in(
    p_membership_number TEXT,
    p_device_fingerprint TEXT,
    p_latitude FLOAT,
    p_longitude FLOAT,
    p_browser TEXT,
    p_ip_address TEXT
)
RETURNS json AS $$
DECLARE
    v_client_id UUID;
    v_client_name TEXT;
    v_client_status TEXT;
    v_gym_lat FLOAT;
    v_gym_lon FLOAT;
    v_radius FLOAT;
    v_distance FLOAT;
    v_existing_checkin UUID;
    v_device_used_for TEXT;
BEGIN
    -- 1. Check Gym Location Settings
    SELECT gym_location_lat, gym_location_lng, gym_location_radius 
    INTO v_gym_lat, v_gym_lon, v_radius
    FROM gym_settings WHERE id = 1;

    IF v_gym_lat IS NOT NULL AND v_gym_lon IS NOT NULL THEN
        -- Verify distance
        v_distance = calculate_distance(p_latitude, p_longitude, v_gym_lat, v_gym_lon);
        IF v_distance > v_radius THEN
            RETURN json_build_object('success', false, 'error', 'You are not inside the gym.');
        END IF;
    END IF;

    -- 2. Verify Membership
    SELECT id, name, status INTO v_client_id, v_client_name, v_client_status
    FROM clients
    WHERE membership_number = p_membership_number;

    IF v_client_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Invalid membership number.');
    END IF;

    IF v_client_status = 'Expired' THEN
        RETURN json_build_object('success', false, 'error', 'Your membership has expired.');
    END IF;

    -- 3. Check Device Restriction
    -- Allow if device fingerprint was used for the SAME membership number today
    -- Reject if used for a DIFFERENT membership number today
    SELECT membership_number INTO v_device_used_for
    FROM device_checkins
    WHERE device_fingerprint = p_device_fingerprint
      AND check_in_date = CURRENT_DATE
    LIMIT 1;

    IF v_device_used_for IS NOT NULL AND v_device_used_for != p_membership_number THEN
        RETURN json_build_object('success', false, 'error', 'This device has already been used today to check in another member.');
    END IF;

    -- 4. Check Duplicate Attendance
    SELECT id INTO v_existing_checkin
    FROM attendance
    WHERE client_id = v_client_id AND date = CURRENT_DATE AND status = 'Present';

    IF v_existing_checkin IS NOT NULL THEN
        RETURN json_build_object('success', false, 'error', 'Attendance already marked today.');
    END IF;

    -- 5. Insert Records
    INSERT INTO device_checkins (
        device_fingerprint, membership_number, ip_address, browser, location_latitude, location_longitude
    ) VALUES (
        p_device_fingerprint, p_membership_number, p_ip_address, p_browser, p_latitude, p_longitude
    );

    INSERT INTO attendance (
        client_id, date, status, latitude, longitude, device_fingerprint
    ) VALUES (
        v_client_id, CURRENT_DATE, 'Present', p_latitude, p_longitude, p_device_fingerprint
    )
    ON CONFLICT (client_id, date)
    DO UPDATE SET 
        status = 'Present',
        latitude = p_latitude,
        longitude = p_longitude,
        device_fingerprint = p_device_fingerprint,
        marked_at = NOW();

    RETURN json_build_object(
        'success', true, 
        'message', 'Attendance marked successfully.',
        'client_id', v_client_id,
        'client_name', v_client_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE device_checkins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon on device_checkins" ON device_checkins;
CREATE POLICY "Allow all for anon on device_checkins" ON device_checkins FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE gym_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read for anon on gym_settings" ON gym_settings;
CREATE POLICY "Allow read for anon on gym_settings" ON gym_settings FOR SELECT USING (true);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon on attendance" ON attendance;
CREATE POLICY "Allow all for anon on attendance" ON attendance FOR ALL USING (true) WITH CHECK (true);
