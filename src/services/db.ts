import { Client, Attendance, MembershipHistory, GymSettings, DatabaseBackup, LeaderboardEntry } from '../types';
import { supabaseDb } from './supabaseDb';

export interface GymDB {
  // Leaderboard
  getLeaderboard(): Promise<{ top10: LeaderboardEntry[]; allRanked: LeaderboardEntry[] }>;
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
  deleteMockData(): Promise<{ count: number }>;
  importInitialClients(): Promise<{ count: number }>;
  importSeptemberAttendance(): Promise<{ count: number; totalRecords: number }>;

  // Attendance
  getAttendance(date: string): Promise<Attendance[]>;
  getAttendanceRange(startDate: string, endDate: string): Promise<Attendance[]>;
  markAttendance(clientId: string, date: string, status: 'Present' | 'Absent'): Promise<Attendance>;
  initializeDailyAttendance(date?: string): Promise<void>;

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
  }): Promise<{
    success: boolean;
    error?: string;
    details?: {
      name: string;
      membership_number: string;
      time: string;
      membership_end?: string;
      is_expired?: boolean;
      days_left?: number;
      subscription_alert?: string;
    };
  }>;

  // For Testing Only
  clearTestDeviceHistory(deviceFingerprint: string): Promise<void>;

  // Global Settings
  getGlobalSettings(): Promise<Partial<GymSettings> | null>;
  updateGlobalSettings(settings: Partial<GymSettings>): Promise<boolean>;

  // Full Database Backup & Restore
  exportDatabaseBackup(): Promise<DatabaseBackup>;
  importDatabaseBackup(
    backup: DatabaseBackup,
    mode?: 'merge' | 'replace'
  ): Promise<{
    success: boolean;
    stats: {
      clients: number;
      attendance: number;
      membership_history: number;
      device_checkins: number;
    };
  }>;
}

export const db: GymDB = supabaseDb;

export const defaultSettings: GymSettings = {
  gymName: '',
  logoUrl: '', // blank by default
  theme: 'dark',
  supabaseUrl: '',
  supabaseAnonKey: '',
  useSupabase: true,
  gymLocationLat: 10.936700,
  gymLocationLng: 76.955857,
  gymLocationRadius: 500,
};
