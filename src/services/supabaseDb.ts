import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Client, Attendance, MembershipHistory, GymSettings, DatabaseBackup } from '../types';
import { GymDB } from './db';
import { INITIAL_CLIENT_DATA, INITIAL_CUSTOM_MEMBERSHIP_ORDER } from '../data/initialClients';

let cachedClient: SupabaseClient | null = null;
let cachedUrl = '';
let cachedKey = '';

export const getSupabaseClient = (): SupabaseClient | null => {
  const url = import.meta.env.VITE_SUPABASE_URL || '';
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  if (!url || !key) {
    return null;
  }

  if (cachedClient && cachedUrl === url && cachedKey === key) {
    return cachedClient;
  }

  try {
    cachedUrl = url;
    cachedKey = key;
    cachedClient = createClient(url, key);
    return cachedClient;
  } catch (e) {
    console.error('Failed to initialize Supabase client:', e);
    return null;
  }
};

export const supabaseDb: GymDB = {
  async getClients(): Promise<Client[]> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Supabase getClients error:', error);
      throw error;
    }

    return data as Client[];
  },

  async addClient(client): Promise<Client> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('clients')
      .insert([
        {
          membership_number: client.membership_number,
          name: client.name,
          phone: client.phone || '',
          membership_start: client.membership_start || null,
          membership_end: client.membership_end || null,
          notes: client.notes || '',
          // DB trigger checks status, but we can set default
          status: 'Active',
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase addClient error:', error);
      throw error;
    }

    const newClient = data as Client;

    // Add to membership history if end date is set
    if (client.membership_end) {
      const startStr = client.membership_start || new Date().toISOString().split('T')[0];
      const start = new Date(startStr);
      const end = new Date(client.membership_end);
      const diffTime = Math.max(0, end.getTime() - start.getTime());
      const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      try {
        await this.addMembershipHistory({
          client_id: newClient.id,
          start_date: startStr,
          end_date: client.membership_end,
          duration: durationDays,
        });
      } catch (histErr) {
        console.warn('Failed to record initial membership history:', histErr);
      }
    }

    return newClient;
  },

  async updateClient(id, clientFields): Promise<Client> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not initialized');

    // Get original client to check if membership dates changed
    const { data: origData, error: origError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();
      
    if (origError) throw origError;
    const oldClient = origData as Client;

    const { data, error } = await supabase
      .from('clients')
      .update({
        membership_number: clientFields.membership_number,
        name: clientFields.name,
        phone: clientFields.phone,
        membership_start: clientFields.membership_start || null,
        membership_end: clientFields.membership_end || null,
        notes: clientFields.notes,
        status: clientFields.status,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase updateClient error:', error);
      throw error;
    }

    const updatedClient = data as Client;

    // If membership dates were changed, add to history
    if (
      (clientFields.membership_start && clientFields.membership_start !== oldClient.membership_start) ||
      (clientFields.membership_end && clientFields.membership_end !== oldClient.membership_end)
    ) {
      const start = updatedClient.membership_start;
      const end = updatedClient.membership_end;
      if (start && end) {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        await this.addMembershipHistory({
          client_id: id,
          start_date: start,
          end_date: end,
          duration: durationDays,
        });
      }
    }

    return updatedClient;
  },

  async deleteClient(id): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not initialized');

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase deleteClient error:', error);
      throw error;
    }

    return true;
  },

  async deleteMockData(): Promise<{ count: number }> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not initialized');

    const mockNames = [
      'Alex Mercer', 'Sarah Connor', 'Bruce Wayne', 'Diana Prince',
      'Peter Parker', 'Tony Stark', 'Clark Kent', 'Steve Rogers'
    ];

    // Find all clients that match mock criteria
    const { data: byNotes } = await supabase
      .from('clients')
      .select('id, name')
      .ilike('notes', '%mock%');

    const { data: byNames } = await supabase
      .from('clients')
      .select('id, name')
      .in('name', mockNames);

    const { data: byNum } = await supabase
      .from('clients')
      .select('id, name')
      .ilike('membership_number', 'MOCK%');

    // Collect unique mock client IDs
    const mockClientsMap = new Map<string, string>();
    (byNotes || []).forEach(c => mockClientsMap.set(c.id, c.name));
    (byNames || []).forEach(c => mockClientsMap.set(c.id, c.name));
    (byNum || []).forEach(c => mockClientsMap.set(c.id, c.name));

    const mockIds = Array.from(mockClientsMap.keys());

    if (mockIds.length === 0) {
      return { count: 0 };
    }

    // Delete attendance records for these mock clients
    await supabase.from('attendance').delete().in('client_id', mockIds);

    // Delete membership history for these mock clients
    await supabase.from('membership_history').delete().in('client_id', mockIds);

    // Delete the clients
    const { error: delError } = await supabase.from('clients').delete().in('id', mockIds);
    if (delError) {
      console.error('Supabase deleteMockData error:', delError);
      throw delError;
    }

    return { count: mockIds.length };
  },

  async importInitialClients(): Promise<{ count: number }> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not initialized');

    const todayStr = new Date().toISOString().split('T')[0];

    // Build client payloads
    const payload = INITIAL_CLIENT_DATA.map((client) => {
      const isExpired = client.membership_end < todayStr;
      
      // Compute start date: 1 year prior to end date
      const endD = new Date(client.membership_end);
      const startD = new Date(endD);
      startD.setFullYear(startD.getFullYear() - 1);
      const startStr = startD.toISOString().split('T')[0];

      return {
        membership_number: client.membership_number,
        name: client.name,
        phone: '',
        membership_start: startStr,
        membership_end: client.membership_end,
        status: isExpired ? 'Expired' : 'Active',
        notes: '',
      };
    });

    // Check existing clients by membership number
    const { data: existingClients } = await supabase
      .from('clients')
      .select('id, membership_number');

    const existingMap = new Map<string, string>();
    (existingClients || []).forEach((c: any) => {
      existingMap.set(c.membership_number, c.id);
    });

    // Prepare rows with IDs if already existing (upsert)
    const rowsToUpsert = payload.map((p) => {
      const existingId = existingMap.get(p.membership_number);
      return existingId ? { ...p, id: existingId } : p;
    });

    // Chunk upserts in batches of 50
    const chunkArray = <T>(arr: T[], size: number): T[][] => {
      const chunks: T[][] = [];
      for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
      }
      return chunks;
    };

    const chunks = chunkArray(rowsToUpsert, 50);

    for (const chunk of chunks) {
      const { error } = await supabase
        .from('clients')
        .upsert(chunk, { onConflict: 'id' });

      if (error) {
        console.error('Error upserting initial clients chunk:', error);
        throw error;
      }
    }

    // Re-fetch all clients to map their IDs in the EXACT custom order provided
    const { data: allClients } = await supabase
      .from('clients')
      .select('id, membership_number');

    if (allClients) {
      const clientMap = new Map<string, string>();
      allClients.forEach((c: any) => clientMap.set(c.membership_number, c.id));

      const orderedIds = INITIAL_CUSTOM_MEMBERSHIP_ORDER
        .map((num) => clientMap.get(num))
        .filter((id): id is string => Boolean(id));

      try {
        localStorage.setItem('zen_custom_client_order', JSON.stringify(orderedIds));
      } catch (e) {
        console.warn('Error saving custom order:', e);
      }
    }

    return { count: INITIAL_CLIENT_DATA.length };
  },

  async getAttendance(date): Promise<Attendance[]> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('date', date);

    if (error) {
      console.error('Supabase getAttendance error:', error);
      throw error;
    }

    return data as Attendance[];
  },

  async getAttendanceRange(startDate, endDate): Promise<Attendance[]> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) {
      console.error('Supabase getAttendanceRange error:', error);
      throw error;
    }

    return data as Attendance[];
  },

  async markAttendance(clientId, date, status): Promise<Attendance> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not initialized');

    // Perform upsert since we have a unique constraint on (client_id, date)
    const { data, error } = await supabase
      .from('attendance')
      .upsert(
        {
          client_id: clientId,
          date: date,
          status: status,
          marked_at: new Date().toISOString(),
        },
        { onConflict: 'client_id,date' }
      )
      .select()
      .single();

    if (error) {
      console.error('Supabase markAttendance error:', error);
      throw error;
    }

    return data as Attendance;
  },

  async initializeDailyAttendance(dateStr?: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const targetDate = dateStr || new Date().toISOString().split('T')[0];

    try {
      // 1. Try calling the Supabase PostgreSQL RPC function
      const { error: rpcErr } = await supabase.rpc('initialize_daily_attendance', {
        p_date: targetDate
      });

      if (rpcErr) {
        // Fallback: Query active clients and batch insert 'Absent' status if not exists
        const { data: activeClients } = await supabase
          .from('clients')
          .select('id')
          .eq('status', 'Active');

        if (activeClients && activeClients.length > 0) {
          const records = activeClients.map((c: any) => ({
            client_id: c.id,
            date: targetDate,
            status: 'Absent'
          }));

          await supabase
            .from('attendance')
            .upsert(records, { onConflict: 'client_id,date', ignoreDuplicates: true });
        }
      }
    } catch (e) {
      console.warn('Auto-initialization of daily attendance:', e);
    }
  },

  async getMembershipHistory(clientId): Promise<MembershipHistory[]> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('membership_history')
      .select('*')
      .eq('client_id', clientId)
      .order('renewed_on', { ascending: false });

    if (error) {
      console.error('Supabase getMembershipHistory error:', error);
      throw error;
    }

    return data as MembershipHistory[];
  },

  async addMembershipHistory(history): Promise<MembershipHistory> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('membership_history')
      .insert([
        {
          client_id: history.client_id,
          start_date: history.start_date,
          end_date: history.end_date,
          duration: history.duration,
          renewed_on: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase addMembershipHistory error:', error);
      throw error;
    }

    return data as MembershipHistory;
  },

  async processSelfCheckIn(params): Promise<{
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
  }> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not initialized');

    const cleanNum = params.membershipNumber.trim();
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Fetch client by membership number
    const { data: clientData, error: clientErr } = await supabase
      .from('clients')
      .select('*')
      .ilike('membership_number', cleanNum)
      .maybeSingle();

    if (clientErr) {
      console.error('Supabase fetch client error:', clientErr);
      return { success: false, error: clientErr.message };
    }

    if (!clientData) {
      return { success: false, error: 'Invalid membership number.' };
    }

    // 2. Check Device Restriction (Ensure device wasn't used for a DIFFERENT member today)
    const { data: devCheck } = await supabase
      .from('device_checkins')
      .select('*')
      .eq('device_fingerprint', params.deviceFingerprint)
      .eq('check_in_date', todayStr);

    if (devCheck && devCheck.length > 0) {
      const differentMemberCheckin = devCheck.find(
        (dc: any) => dc.membership_number.toLowerCase() !== cleanNum.toLowerCase()
      );
      if (differentMemberCheckin) {
        return {
          success: false,
          error: 'This device has already been used today to check in another member.',
        };
      }
    }

    // 3. Check Duplicate Attendance (if already marked present today)
    const { data: existingAtt } = await supabase
      .from('attendance')
      .select('*')
      .eq('client_id', clientData.id)
      .eq('date', todayStr)
      .eq('status', 'Present');

    if (existingAtt && existingAtt.length > 0) {
      return { success: false, error: 'Attendance already marked today.' };
    }

    // 4. Mark Attendance (Present)
    const markedAtIso = new Date().toISOString();
    const { error: attError } = await supabase.from('attendance').upsert(
      {
        client_id: clientData.id,
        date: todayStr,
        status: 'Present',
        latitude: params.latitude,
        longitude: params.longitude,
        device_fingerprint: params.deviceFingerprint,
        marked_at: markedAtIso,
      },
      { onConflict: 'client_id,date' }
    );

    if (attError) {
      console.error('Supabase mark attendance error:', attError);
      return { success: false, error: 'Failed to record attendance in database.' };
    }

    // 5. Record Device Check-in Audit
    try {
      await supabase.from('device_checkins').insert({
        device_fingerprint: params.deviceFingerprint,
        membership_number: clientData.membership_number,
        check_in_date: todayStr,
        check_in_time: markedAtIso,
        ip_address: params.ipAddress,
        browser: params.browser,
        location_latitude: params.latitude,
        location_longitude: params.longitude,
      });
    } catch (dcErr) {
      console.warn('Device checkin log warning:', dcErr);
    }

    // 6. Calculate Subscription Alert Message
    let subscription_alert: string | undefined = undefined;
    let is_expired = false;
    let days_left: number | undefined = undefined;

    if (clientData.membership_end) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const parts = clientData.membership_end.split('-');
      if (parts.length === 3) {
        const endDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        endDate.setHours(0, 0, 0, 0);

        const diffTime = endDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const dd = String(endDate.getDate()).padStart(2, '0');
        const mm = String(endDate.getMonth() + 1).padStart(2, '0');
        const yyyy = endDate.getFullYear();
        const formattedEndDate = `${dd}-${mm}-${yyyy}`;

        if (diffDays < 0) {
          is_expired = true;
          days_left = diffDays;
          subscription_alert = `Your subscription ended on: "${formattedEndDate}"`;
        } else if (diffDays <= 7) {
          is_expired = false;
          days_left = diffDays;
          subscription_alert = `Your Subscription ends in (${diffDays}) Days.`;
        }
      }
    }

    return {
      success: true,
      details: {
        name: clientData.name,
        membership_number: clientData.membership_number,
        time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }),
        membership_end: clientData.membership_end,
        is_expired,
        days_left,
        subscription_alert,
      },
    };
  },

  async clearTestDeviceHistory(deviceFingerprint: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not initialized');

    // Delete device checkin history for this fingerprint
    const { error: err1 } = await supabase
      .from('device_checkins')
      .delete()
      .eq('device_fingerprint', deviceFingerprint);

    if (err1) console.error('Error clearing device checkins:', err1);
  },

  async getGlobalSettings(): Promise<Partial<GymSettings> | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('gym_settings')
        .select('*')
        .eq('id', 1)
        .single();

      if (error) {
        console.error('Error fetching global settings from Supabase:', error.message);
        return null;
      }
      
      if (!data) return null;

      return {
        gymName: data.gym_name,
        logoUrl: data.logo_url,
        theme: data.theme,
        gymLocationLat: data.gym_location_lat,
        gymLocationLng: data.gym_location_lng,
        gymLocationRadius: data.gym_location_radius,
        enableTestMode: data.enable_test_mode
      };
    } catch (e: any) {
      console.error('Exception fetching global settings:', e.message);
      return null;
    }
  },

  async updateGlobalSettings(settings: Partial<GymSettings>): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .from('gym_settings')
        .upsert({
          id: 1,
          gym_name: settings.gymName,
          logo_url: settings.logoUrl,
          theme: settings.theme,
          gym_location_lat: settings.gymLocationLat,
          gym_location_lng: settings.gymLocationLng,
          gym_location_radius: settings.gymLocationRadius,
          enable_test_mode: settings.enableTestMode,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (error) {
        console.error('Error updating global settings to Supabase:', error.message);
        return false;
      }
      return true;
    } catch (e: any) {
      console.error('Exception updating global settings:', e.message);
      return false;
    }
  },

  async exportDatabaseBackup(): Promise<DatabaseBackup> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not initialized');

    // 1. Fetch all clients
    const { data: clientsData, error: clientErr } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: true });
    if (clientErr) throw clientErr;

    // 2. Fetch all attendance
    const { data: attendanceData, error: attErr } = await supabase
      .from('attendance')
      .select('*')
      .order('date', { ascending: true });
    if (attErr) throw attErr;

    // 3. Fetch all membership_history
    const { data: historyData, error: histErr } = await supabase
      .from('membership_history')
      .select('*')
      .order('renewed_on', { ascending: true });
    if (histErr) throw histErr;

    // 4. Fetch device_checkins (graceful fallback if table not yet created)
    let deviceCheckinsData: any[] = [];
    try {
      const { data: devData, error: devErr } = await supabase
        .from('device_checkins')
        .select('*')
        .order('check_in_time', { ascending: true });
      if (!devErr && devData) {
        deviceCheckinsData = devData;
      }
    } catch {
      // ignore
    }

    // 5. Fetch gym_settings
    let gymSettingsData: any[] = [];
    try {
      const { data: setts, error: setErr } = await supabase
        .from('gym_settings')
        .select('*');
      if (!setErr && setts) {
        gymSettingsData = setts;
      }
    } catch {
      // ignore
    }

    // 6. Custom order from localStorage
    let customOrder: string[] = [];
    try {
      const saved = localStorage.getItem('zen_custom_client_order');
      if (saved) customOrder = JSON.parse(saved);
    } catch {
      // ignore
    }

    const backup: DatabaseBackup = {
      app: 'Zen Attendance',
      version: '1.0',
      exported_at: new Date().toISOString(),
      gym_name: gymSettingsData[0]?.gym_name || 'Zen Attendance',
      summary: {
        clients_count: clientsData?.length || 0,
        attendance_count: attendanceData?.length || 0,
        membership_history_count: historyData?.length || 0,
        device_checkins_count: deviceCheckinsData?.length || 0,
      },
      data: {
        clients: (clientsData as Client[]) || [],
        attendance: (attendanceData as Attendance[]) || [],
        membership_history: (historyData as MembershipHistory[]) || [],
        device_checkins: deviceCheckinsData || [],
        gym_settings: gymSettingsData || [],
        custom_client_order: customOrder,
      },
    };

    return backup;
  },

  async importDatabaseBackup(
    backup: DatabaseBackup,
    mode: 'merge' | 'replace' = 'replace'
  ): Promise<{
    success: boolean;
    stats: {
      clients: number;
      attendance: number;
      membership_history: number;
      device_checkins: number;
    };
  }> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not initialized');

    if (!backup || !backup.data || !Array.isArray(backup.data.clients)) {
      throw new Error('Invalid backup file structure: Missing clients data.');
    }

    const stats = {
      clients: 0,
      attendance: 0,
      membership_history: 0,
      device_checkins: 0,
    };

    // If replace mode is chosen, wipe existing data in cascading dependency order
    if (mode === 'replace') {
      try {
        await supabase.from('device_checkins').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      } catch (e) {
        console.warn('Wipe device_checkins warning:', e);
      }
      try {
        await supabase.from('attendance').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      } catch (e) {
        console.warn('Wipe attendance warning:', e);
      }
      try {
        await supabase.from('membership_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      } catch (e) {
        console.warn('Wipe membership_history warning:', e);
      }
      try {
        await supabase.from('clients').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      } catch (e) {
        console.warn('Wipe clients warning:', e);
      }
    }

    // Helper to chunk arrays to prevent payload too large
    const chunkArray = <T>(arr: T[], size: number): T[][] => {
      const chunks: T[][] = [];
      for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
      }
      return chunks;
    };

    // 1. Restore Clients
    if (backup.data.clients && backup.data.clients.length > 0) {
      const clientChunks = chunkArray(backup.data.clients, 50);
      for (const chunk of clientChunks) {
        const { error } = await supabase.from('clients').upsert(chunk, { onConflict: 'id' });
        if (error) {
          console.error('Error restoring clients chunk:', error);
          throw new Error(`Failed to restore clients: ${error.message}`);
        }
        stats.clients += chunk.length;
      }
    }

    // 2. Restore Attendance
    if (backup.data.attendance && backup.data.attendance.length > 0) {
      const attendanceChunks = chunkArray(backup.data.attendance, 100);
      for (const chunk of attendanceChunks) {
        const { error } = await supabase.from('attendance').upsert(chunk, { onConflict: 'client_id,date' });
        if (error) {
          console.warn('Attendance chunk upsert error (fallback to id conflict):', error);
          const { error: idErr } = await supabase.from('attendance').upsert(chunk, { onConflict: 'id' });
          if (idErr) {
            console.error('Failed restoring attendance chunk:', idErr);
          }
        }
        stats.attendance += chunk.length;
      }
    }

    // 3. Restore Membership History
    if (backup.data.membership_history && backup.data.membership_history.length > 0) {
      const historyChunks = chunkArray(backup.data.membership_history, 100);
      for (const chunk of historyChunks) {
        const { error } = await supabase.from('membership_history').upsert(chunk, { onConflict: 'id' });
        if (error) {
          console.warn('Membership history chunk upsert warning:', error);
        }
        stats.membership_history += chunk.length;
      }
    }

    // 4. Restore Device Check-ins (if any)
    if (backup.data.device_checkins && backup.data.device_checkins.length > 0) {
      const devChunks = chunkArray(backup.data.device_checkins, 100);
      for (const chunk of devChunks) {
        try {
          await supabase.from('device_checkins').upsert(chunk, { onConflict: 'id' });
          stats.device_checkins += chunk.length;
        } catch (e) {
          console.warn('Device checkin restore warning:', e);
        }
      }
    }

    // 5. Restore Gym Settings
    if (backup.data.gym_settings && backup.data.gym_settings.length > 0) {
      try {
        const settingRow = backup.data.gym_settings[0];
        if (settingRow) {
          await supabase.from('gym_settings').upsert({
            ...settingRow,
            id: 1,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
        }
      } catch (e) {
        console.warn('Gym settings restore warning:', e);
      }
    }

    // 6. Restore Custom Client Order to localStorage
    if (backup.data.custom_client_order && Array.isArray(backup.data.custom_client_order)) {
      try {
        localStorage.setItem(
          'zen_custom_client_order',
          JSON.stringify(backup.data.custom_client_order)
        );
      } catch (e) {
        console.warn('Custom client order restore warning:', e);
      }
    }

    return { success: true, stats };
  }
};
