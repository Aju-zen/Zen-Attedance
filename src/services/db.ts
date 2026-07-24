import { Client, Attendance, MembershipHistory, GymSettings } from '../types';
import { localStorageDb } from './localStorageDb';
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

// Settings helper
const SETTINGS_KEY = 'gym_tracker_settings';
export const defaultSettings: GymSettings = {
  gymName: 'Iron Temple Gym',
  logoUrl: 'Dumbbell', // lucide icon name
  theme: 'dark',
  supabaseUrl: '',
  supabaseAnonKey: '',
  useSupabase: false,
  gymLocationLat: 10.936700,
  gymLocationLng: 76.955857,
  gymLocationRadius: 500,
};

export const getSavedSettings = (): GymSettings => {
  const data = localStorage.getItem(SETTINGS_KEY);
  if (!data) return defaultSettings;
  try {
    return { ...defaultSettings, ...JSON.parse(data) };
  } catch {
    return defaultSettings;
  }
};

export const saveSavedSettings = (settings: GymSettings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

const isSupabaseConfigured = (settings: GymSettings) => {
  return (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) || 
         (settings.useSupabase && settings.supabaseUrl && settings.supabaseAnonKey);
};

// Dispatcher that delegates database operations based on configuration settings
export const db: GymDB = {
  async getClients() {
    const settings = getSavedSettings();
    if (isSupabaseConfigured(settings)) {
      return supabaseDb.getClients();
    }
    return localStorageDb.getClients();
  },

  async addClient(client) {
    const settings = getSavedSettings();
    if (isSupabaseConfigured(settings)) {
      return supabaseDb.addClient(client);
    }
    return localStorageDb.addClient(client);
  },

  async updateClient(id, client) {
    const settings = getSavedSettings();
    if (isSupabaseConfigured(settings)) {
      return supabaseDb.updateClient(id, client);
    }
    return localStorageDb.updateClient(id, client);
  },

  async deleteClient(id) {
    const settings = getSavedSettings();
    if (isSupabaseConfigured(settings)) {
      return supabaseDb.deleteClient(id);
    }
    return localStorageDb.deleteClient(id);
  },

  async getAttendance(date) {
    const settings = getSavedSettings();
    if (isSupabaseConfigured(settings)) {
      return supabaseDb.getAttendance(date);
    }
    return localStorageDb.getAttendance(date);
  },

  async getAttendanceRange(startDate, endDate) {
    const settings = getSavedSettings();
    if (isSupabaseConfigured(settings)) {
      return supabaseDb.getAttendanceRange(startDate, endDate);
    }
    return localStorageDb.getAttendanceRange(startDate, endDate);
  },

  async markAttendance(clientId, date, status) {
    const settings = getSavedSettings();
    if (isSupabaseConfigured(settings)) {
      return supabaseDb.markAttendance(clientId, date, status);
    }
    return localStorageDb.markAttendance(clientId, date, status);
  },

  async getMembershipHistory(clientId) {
    const settings = getSavedSettings();
    if (isSupabaseConfigured(settings)) {
      return supabaseDb.getMembershipHistory(clientId);
    }
    return localStorageDb.getMembershipHistory(clientId);
  },

  async addMembershipHistory(history) {
    const settings = getSavedSettings();
    if (isSupabaseConfigured(settings)) {
      return supabaseDb.addMembershipHistory(history);
    }
    return localStorageDb.addMembershipHistory(history);
  },

  async processSelfCheckIn(params) {
    const settings = getSavedSettings();
    if (isSupabaseConfigured(settings)) {
      return supabaseDb.processSelfCheckIn(params);
    }
    return localStorageDb.processSelfCheckIn(params);
  },

  async clearTestDeviceHistory(deviceFingerprint) {
    const settings = getSavedSettings();
    if (isSupabaseConfigured(settings)) {
      return supabaseDb.clearTestDeviceHistory(deviceFingerprint);
    }
    return localStorageDb.clearTestDeviceHistory(deviceFingerprint);
  },

  async getGlobalSettings() {
    const settings = getSavedSettings();
    if (isSupabaseConfigured(settings)) {
      return supabaseDb.getGlobalSettings();
    }
    return null;
  },

  async updateGlobalSettings(newSettings) {
    const settings = getSavedSettings();
    if (isSupabaseConfigured(settings)) {
      return supabaseDb.updateGlobalSettings(newSettings);
    }
    return false;
  }
};

