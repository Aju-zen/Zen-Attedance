import { Client, Attendance, MembershipHistory, GymSettings } from '../types';
import { supabaseDb } from './supabaseDb';

export interface GymDB {
  // Clients
  getClients(): Promise<Client[]>;
  addClient(client: {
    membership_number: string;
    name: string;
    phone: string;
    membership_start: string;
    membership_end: string;
    notes: string;
  }): Promise<Client>;
  updateClient(id: string, client: Partial<Client>): Promise<Client>;
  deleteClient(id: string): Promise<boolean>;

  // Attendance
  getAttendance(date: string): Promise<Attendance[]>;
  getAttendanceRange(startDate: string, endDate: string): Promise<Attendance[]>;
  markAttendance(clientId: string, date: string, status: 'Present' | 'Absent'): Promise<Attendance>;

  // Membership History
  getMembershipHistory(clientId: string): Promise<MembershipHistory[]>;
  addMembershipHistory(history: Omit<MembershipHistory, 'id' | 'renewed_on'>): Promise<MembershipHistory>;

  // Self Check-In
  processSelfCheckIn(params: {
    membershipNumber: string;
    deviceFingerprint: string;
    latitude: number;
    longitude: number;
    browser: string;
    ipAddress: string;
  }): Promise<{ success: boolean; error?: string; details?: { name: string; membership_number: string; time: string } }>;

  // For Testing Only
  clearTestDeviceHistory(deviceFingerprint: string): Promise<void>;

  // Global Settings
  getGlobalSettings(): Promise<Partial<GymSettings> | null>;
  updateGlobalSettings(settings: Partial<GymSettings>): Promise<boolean>;
}

export const db: GymDB = supabaseDb;

export const defaultSettings: GymSettings = {
  gymName: 'Iron Temple Gym',
  logoUrl: 'Dumbbell', // lucide icon name
  theme: 'dark',
  supabaseUrl: '',
  supabaseAnonKey: '',
  useSupabase: true,
  gymLocationLat: 10.936700,
  gymLocationLng: 76.955857,
  gymLocationRadius: 500,
};

