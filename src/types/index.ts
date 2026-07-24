export interface Client {
  id: string;
  membership_number: string;
  name: string;
  phone: string;
  membership_start: string; // YYYY-MM-DD
  membership_end: string;   // YYYY-MM-DD
  status: 'Active' | 'Expired';
  notes: string;
  created_at: string;       // ISO timestamp
}

export interface Attendance {
  id: string;
  client_id: string;
  date: string;            // YYYY-MM-DD
  status: 'Present' | 'Absent';
  marked_at: string;       // ISO timestamp
}

export interface MembershipHistory {
  id: string;
  client_id: string;
  start_date: string;      // YYYY-MM-DD
  end_date: string;        // YYYY-MM-DD
  duration: number;        // in days
  renewed_on: string;      // ISO timestamp
}

export interface GymSettings {
  gymName: string;
  logoUrl: string;         // Data URL or icon identifier
  theme: 'light' | 'dark';
  supabaseUrl: string;
  supabaseAnonKey: string;
  useSupabase: boolean;
  gymLocationLat?: number;
  gymLocationLng?: number;
  gymLocationRadius?: number; // in meters
}

export interface AppNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: string;       // ISO timestamp
}
