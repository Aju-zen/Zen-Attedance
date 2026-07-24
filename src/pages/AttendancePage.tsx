import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { db } from '../services/db';
import { Attendance, Client } from '../types';
import { Search, Calendar, Check, X, Filter } from 'lucide-react';
import { CustomDatePicker } from '../components/CustomDatePicker';

export const AttendancePage: React.FC = () => {
  const {
    clients,
    selectedDate,
    setSelectedDate,
    markAttendance,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'self_check_in'>('all');
  const [rangeAttendance, setRangeAttendance] = useState<Attendance[]>([]);
  const [loadingRange, setLoadingRange] = useState(false);

  // 1. Calculate D, D-1, D-2 date strings
  const getOffsetDateStr = (baseDateStr: string, offsetDays: number): string => {
    const date = new Date(baseDateStr);
    date.setDate(date.getDate() + offsetDays);
    return date.toISOString().split('T')[0];
  };

  const d0 = selectedDate; // Selected Date (Editable)

  // 2. Fetch attendance logs for selectedDate whenever selectedDate changes or client actions trigger
  const fetchRangeAttendance = async () => {
    setLoadingRange(true);
    try {
      const logs = await db.getAttendanceRange(d0, d0);
      setRangeAttendance(logs);
    } catch (e) {
      console.error('Error fetching attendance range:', e);
    } finally {
      setLoadingRange(false);
    }
  };

  useEffect(() => {
    fetchRangeAttendance();
  }, [selectedDate, clients]);

  // Helper to format Date header
  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  // 3. Find attendance status for a client on a specific date
  const getAttendanceRecord = (clientId: string, dateStr: string) => {
    return rangeAttendance.find(a => a.client_id === clientId && a.date === dateStr);
  };

  const getStatus = (clientId: string, dateStr: string): 'Present' | 'Absent' | null => {
    const record = getAttendanceRecord(clientId, dateStr);
    return record ? record.status : null;
  };

  // 4. Handle Checkbox toggles (Present/Absent)
  const handleToggle = async (clientId: string, dateStr: string, currentStatus: 'Present' | 'Absent' | null) => {
    const newStatus = currentStatus === 'Present' ? 'Absent' : 'Present';
    // Save immediately
    await markAttendance(clientId, dateStr, newStatus);
    // Refresh range data to show update immediately
    fetchRangeAttendance();
  };

  // 5. Filter and Sort clients
  const filteredAndSortedClients = clients
    .filter(client => {
      const matchesSearch =
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.phone.includes(searchQuery);

      const matchesFilter = (() => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'active') return client.status === 'Active';
        if (statusFilter === 'expired') return client.status === 'Expired';
        if (statusFilter === 'self_check_in') {
          const record = getAttendanceRecord(client.id, d0);
          return !!(record && record.status === 'Present' && record.device_fingerprint);
        }
        return true;
      })();

      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      const memA = a.membership_number || '';
      const memB = b.membership_number || '';
      return memA.localeCompare(memB, undefined, { numeric: true, sensitivity: 'base' });
    });

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-6 py-6 flex flex-col h-full">
      {/* Page Title & Date Selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-800 dark:text-white tracking-tight">
            Attendance Register
          </h1>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mt-1">
            Log today's presence or select a date to edit historical logs.
          </p>
        </div>

        {/* Date Selector */}
        <div className="self-start md:self-auto z-20">
          <CustomDatePicker
            value={selectedDate}
            onChange={setSelectedDate}
          />
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by client name or phone..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-800 dark:bg-zinc-900"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`rounded-xl px-4 py-3 text-xs font-bold transition flex items-center gap-1.5 shadow-sm
              ${
                statusFilter === 'all'
                  ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`rounded-xl px-4 py-3 text-xs font-bold transition flex items-center gap-1.5 shadow-sm
              ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`}
          >
            Active Only
          </button>
          <button
            onClick={() => setStatusFilter('expired')}
            className={`rounded-xl px-4 py-3 text-xs font-bold transition flex items-center gap-1.5 shadow-sm
              ${
                statusFilter === 'expired'
                  ? 'bg-rose-600 text-white dark:bg-rose-500'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`}
          >
            Expired
          </button>
          <button
            onClick={() => setStatusFilter('self_check_in')}
            className={`rounded-xl px-4 py-3 text-xs font-bold transition flex items-center gap-1.5 shadow-sm
              ${
                statusFilter === 'self_check_in'
                  ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`}
          >
            Self Check-in
          </button>
        </div>
      </div>

      {/* Attendance Register Table */}
      <div className="flex-1 rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
        <table className="w-full border-collapse text-left">
          {/* Sticky Header */}
          <thead className="sticky top-0 z-10 bg-zinc-50 dark:bg-zinc-900/80 dark:backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 w-1/3">
                Client Name
              </th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 text-center">
                {formatDateHeader(d0)}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {filteredAndSortedClients.length > 0 ? (
              filteredAndSortedClients.map(client => {
                const isExpired = client.status === 'Expired';
                const statusD0 = getStatus(client.id, d0);

                return (
                  <tr key={client.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                    {/* Client name with status badge */}
                    <td className="px-6 py-4.5">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-bold text-emerald-500 dark:text-emerald-400 uppercase tracking-wider">
                            {client.membership_number || 'No Mem. #'}
                          </span>
                          <span className="font-bold text-zinc-800 dark:text-white text-sm leading-tight">
                            {client.name}
                          </span>
                        </div>
                        {isExpired && (
                          <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-3xs font-black tracking-wide uppercase text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                            Expired
                          </span>
                        )}
                      </div>
                    </td>

                    {/* D0 column (Present Date) */}
                    <td className="px-6 py-4.5 text-center bg-emerald-50/10 dark:bg-emerald-500/2">
                      <div className="flex items-center justify-center">
                        <button
                          disabled={isExpired}
                          onClick={() => handleToggle(client.id, d0, statusD0)}
                          className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all focus:outline-none focus:ring-2 active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer
                            ${
                              statusD0 === 'Present'
                                ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/25 focus:ring-emerald-500/20'
                                : 'bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-500/25 focus:ring-rose-500/20'
                            }`}
                          title={statusD0 === 'Present' ? "Mark Absent" : "Mark Present"}
                        >
                          {statusD0 === 'Present' ? <Check className="h-5 w-5 stroke-[3]" /> : <X className="h-5 w-5 stroke-[3]" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={2} className="px-6 py-12 text-center text-zinc-400 dark:text-zinc-500 font-medium">
                  {searchQuery ? 'No matching clients found.' : 'No clients registered.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
