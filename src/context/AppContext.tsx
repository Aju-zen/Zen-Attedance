import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Client, Attendance, AppNotification, GymSettings } from '../types';
import { db, defaultSettings } from '../services/db';
import { getSupabaseClient } from '../services/supabaseDb';

interface AppContextType {
  clients: Client[];
  attendance: Attendance[];
  loading: boolean;
  activePage: string;
  selectedClientId: string | null;
  selectedDate: string;
  settings: GymSettings;
  notifications: AppNotification[];
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
  setActivePage: (page: string, clientId?: string | null) => void;
  setSelectedDate: (date: string) => void;
  setTheme: (theme: 'light' | 'dark') => Promise<void>;
  updateSettings: (settings: GymSettings) => Promise<void>;
  addNotification: (type: AppNotification['type'], message: string) => void;
  clearNotification: (id: string) => void;
  refreshClients: () => Promise<void>;
  loadAttendance: (date: string) => Promise<void>;
  markAttendance: (clientId: string, date: string, status: 'Present' | 'Absent') => Promise<void>;
  addNewClient: (client: { membership_number: string; name: string; phone: string; membership_start: string; membership_end: string; notes: string }) => Promise<void>;
  editClient: (id: string, fields: Partial<Client>) => Promise<void>;
  removeClient: (id: string) => Promise<void>;
  testConnection: (url: string, key: string) => Promise<boolean>;
  seedSupabase: () => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePageInternal] = useState('dashboard');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [settings, setSettings] = useState<GymSettings>(defaultSettings);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const notifiedExpirations = useRef<Set<string>>(new Set());

  // Load settings on startup
  useEffect(() => {
    // Start with default settings to avoid crash
    setSettings(defaultSettings);
    applyTheme(defaultSettings.theme);

    // Fetch from Supabase
    db.getGlobalSettings().then(globalSettings => {
      if (globalSettings) {
        const merged = { ...defaultSettings, ...globalSettings };
        setSettings(merged);
        applyTheme(merged.theme);
      }
    });
  }, []);

  // Sync data when settings/db configuration changes
  useEffect(() => {
    refreshClients();
  }, [settings.useSupabase, settings.supabaseUrl, settings.supabaseAnonKey]);

  // Load attendance when selected date changes or clients reload
  useEffect(() => {
    loadAttendance(selectedDate);
  }, [selectedDate, clients]);

  const applyTheme = (theme: 'light' | 'dark') => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  const addNotification = (type: AppNotification['type'], message: string) => {
    const newNotif: AppNotification = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      message,
      timestamp: new Date().toISOString(),
    };
    // Replace all existing notifications with the new one so they don't overlap
    setNotifications([newNotif]);
  };

  const clearNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const setActivePage = (page: string, clientId: string | null = null) => {
    setActivePageInternal(page);
    setSelectedClientId(clientId);
  };

  const setTheme = async (theme: 'light' | 'dark') => {
    const updated = { ...settings, theme };
    const success = await db.updateGlobalSettings(updated);
    if (success) {
      setSettings(updated);
      applyTheme(theme);
    } else {
      addNotification('error', 'Failed to save theme to database. Check console.');
    }
  };

  const updateSettings = async (updated: GymSettings) => {
    const success = await db.updateGlobalSettings(updated);
    if (success) {
      setSettings(updated);
      applyTheme(updated.theme);
      addNotification('success', 'Settings updated successfully');
    } else {
      addNotification('error', 'Failed to save settings to database. Did you run the SQL?');
    }
  };

  const refreshClients = async () => {
    setLoading(true);
    try {
      const data = await db.getClients();
      setClients(data);

      // Check for membership expirations and trigger warnings
      const todayStr = new Date().toISOString().split('T')[0];
      const threeDaysStr = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      data.forEach(client => {
        if (!client.membership_end) return;

        const end = client.membership_end;
        const cacheKey = `${client.id}-${end}`;

        if (notifiedExpirations.current.has(cacheKey)) return;

        if (end === todayStr) {
          addNotification('warning', `Membership for ${client.name} expires TODAY!`);
          notifiedExpirations.current.add(cacheKey);
        } else if (end === threeDaysStr) {
          addNotification('warning', `Membership for ${client.name} expires in 3 days!`);
          notifiedExpirations.current.add(cacheKey);
        }
      });
    } catch (e: any) {
      console.error(e);
      addNotification('error', `Failed to load clients: ${e.message || 'Database error'}`);
    } finally {
      setLoading(false);
    }
  };

  const loadAttendance = async (date: string) => {
    try {
      const data = await db.getAttendance(date);
      setAttendance(data);
    } catch (e: any) {
      console.error(e);
      addNotification('error', `Failed to load attendance: ${e.message}`);
    }
  };

  const markAttendance = async (clientId: string, date: string, status: 'Present' | 'Absent') => {
    try {
      // Find client name for notification
      const client = clients.find(c => c.id === clientId);
      const clientName = client ? client.name : 'Client';

      const result = await db.markAttendance(clientId, date, status);
      
      // Update local state immediately
      setAttendance(prev => {
        const idx = prev.findIndex(a => a.client_id === clientId && a.date === date);
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = result;
          return updated;
        }
        return [...prev, result];
      });

      addNotification('success', ` ${clientName} marked: ${status}`);
    } catch (e: any) {
      console.error(e);
      addNotification('error', `Failed to save attendance: ${e.message}`);
    }
  };

  const addNewClient = async (clientData: { membership_number: string; name: string; phone: string; membership_start: string; membership_end: string; notes: string }) => {
    try {
      const newClient = await db.addClient(clientData);
      setClients(prev => [...prev, newClient].sort((a, b) => a.name.localeCompare(b.name)));
      addNotification('success', `New client added: ${newClient.name}`);
    } catch (e: any) {
      console.error(e);
      addNotification('error', `Failed to add client: ${e.message}`);
      throw e;
    }
  };

  const editClient = async (id: string, fields: Partial<Client>) => {
    try {
      const updated = await db.updateClient(id, fields);
      setClients(prev => prev.map(c => (c.id === id ? updated : c)));
      addNotification('success', `Client updated: ${updated.name}`);
    } catch (e: any) {
      console.error(e);
      addNotification('error', `Failed to update client: ${e.message}`);
      throw e;
    }
  };

  const removeClient = async (id: string) => {
    try {
      const client = clients.find(c => c.id === id);
      const name = client ? client.name : 'Client';
      await db.deleteClient(id);
      setClients(prev => prev.filter(c => c.id !== id));
      addNotification('success', `Client removed: ${name}`);
    } catch (e: any) {
      console.error(e);
      addNotification('error', `Failed to delete client: ${e.message}`);
      throw e;
    }
  };

  const testConnection = async (url: string, key: string): Promise<boolean> => {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const client = createClient(url, key);
      const { data, error } = await client.from('clients').select('id').limit(1);
      if (error) throw error;
      return true;
    } catch (e: any) {
      console.error(e);
      addNotification('error', `Database connection failed: ${e.message || 'Check credentials and table schema'}`);
      return false;
    }
  };

  const seedSupabase = async (): Promise<boolean> => {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not initialized');

      // Seeding mock clients using Supabase
      const mockNames = [
        'Alex Mercer', 'Sarah Connor', 'Bruce Wayne', 'Diana Prince',
        'Peter Parker', 'Tony Stark', 'Clark Kent', 'Steve Rogers'
      ];
      
      const getRelativeDateStr = (offsetDays: number): string => {
        const d = new Date();
        d.setDate(d.getDate() + offsetDays);
        return d.toISOString().split('T')[0];
      };

      const seedClients = mockNames.map((name, i) => {
        const offsets = [-25, -60, -90, -10, -5, -30, -4, -15];
        const endOffsets = [5, 30, -2, 80, 25, 0, 2, 15];
        return {
          name,
          phone: `+1 (555) 100-200${i}`,
          membership_start: getRelativeDateStr(offsets[i]),
          membership_end: getRelativeDateStr(endOffsets[i]),
          status: endOffsets[i] < 0 ? 'Expired' : 'Active',
          notes: 'Imported mock client.',
        };
      });

      // Clear existing clients (WARNING: deletes cascade)
      // Since it is a seed, we can just insert these
      const { data, error } = await supabase.from('clients').insert(seedClients).select();
      if (error) throw error;

      // Seed membership history
      if (data && data.length > 0) {
        const histories = data.map((c: any) => {
          const start = new Date(c.membership_start);
          const end = new Date(c.membership_end);
          const diffTime = Math.abs(end.getTime() - start.getTime());
          const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return {
            client_id: c.id,
            start_date: c.membership_start,
            end_date: c.membership_end,
            duration: durationDays
          };
        });
        const { error: histError } = await supabase.from('membership_history').insert(histories);
        if (histError) throw histError;

        // Seed 5 days of attendance
        const attendanceLogs: any[] = [];
        const today = new Date();
        
        for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
          const d = new Date();
          d.setDate(today.getDate() - dayOffset);
          const dateStr = d.toISOString().split('T')[0];

          // Skip sundays
          if (d.getDay() === 0) continue;

          data.forEach((c: any) => {
            if (c.status === 'Expired' && dayOffset > 2) return;
            const isPresent = Math.random() < 0.7;
            attendanceLogs.push({
              client_id: c.id,
              date: dateStr,
              status: isPresent ? 'Present' : 'Absent',
              marked_at: new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString()
            });
          });
        }

        const { error: attError } = await supabase.from('attendance').insert(attendanceLogs);
        if (attError) throw attError;
      }

      addNotification('success', 'Mock data successfully seeded to Supabase!');
      await refreshClients();
      return true;
    } catch (e: any) {
      console.error(e);
      addNotification('error', `Failed to seed Supabase: ${e.message}`);
      return false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        clients,
        attendance,
        loading,
        activePage,
        selectedClientId,
        selectedDate,
        settings,
        notifications,
        setNotifications,
        setActivePage,
        setSelectedDate,
        setTheme,
        updateSettings,
        addNotification,
        clearNotification,
        refreshClients,
        loadAttendance,
        markAttendance,
        addNewClient,
        editClient,
        removeClient,
        testConnection,
        seedSupabase,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
