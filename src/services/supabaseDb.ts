import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Client, Attendance, MembershipHistory, GymSettings } from '../types';
import { GymDB } from './db';

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
          phone: client.phone,
          membership_start: client.membership_start || null,
          membership_end: client.membership_end || null,
          notes: client.notes,
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

    // Add to membership history if dates are set
    if (client.membership_start && client.membership_end) {
      const start = new Date(client.membership_start);
      const end = new Date(client.membership_end);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      await this.addMembershipHistory({
        client_id: newClient.id,
        start_date: client.membership_start,
        end_date: client.membership_end,
        duration: durationDays,
      });
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

  async processSelfCheckIn(params) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase.rpc('process_self_check_in', {
      p_membership_number: params.membershipNumber,
      p_device_fingerprint: params.deviceFingerprint,
      p_latitude: params.latitude,
      p_longitude: params.longitude,
      p_browser: params.browser,
      p_ip_address: params.ipAddress
    });

    if (error) {
      console.error('Supabase processSelfCheckIn error:', error);
      return { success: false, error: error.message };
    }

    // Since the RPC returns a JSON object, check the structure
    if (data && data.success) {
      return {
        success: true,
        details: {
          name: data.client_name || 'Member', // Ideally we'd get name back too, but we didn't add it in SQL, we can just say 'Member' or refetch. Let's do a quick refetch of name if needed, or just let UI show the membership.
          membership_number: params.membershipNumber,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      };
    } else {
      return { success: false, error: data?.error || 'Unknown error' };
    }
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

    // Also delete attendance for today that matches this fingerprint
    // to allow a full end-to-end reset for testing
    const todayStr = new Date().toISOString().split('T')[0];
    const { error: err2 } = await supabase
      .from('attendance')
      .delete()
      .eq('device_fingerprint', deviceFingerprint)
      .eq('date', todayStr);

    if (err2) console.error('Error clearing attendance:', err2);
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

      if (error || !data) return null;

      return {
        gymName: data.gym_name,
        logoUrl: data.logo_url,
        theme: data.theme,
        gymLocationLat: data.gym_location_lat,
        gymLocationLng: data.gym_location_lng,
        gymLocationRadius: data.gym_location_radius
      };
    } catch (e) {
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
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (error) {
        console.error('Error updating settings in Supabase:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Exception updating settings in Supabase:', e);
      return false;
    }
  }
};
