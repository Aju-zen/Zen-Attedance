import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { db } from '../services/db';
import { Attendance } from '../types';
import { Search, Check, X, Calendar, CalendarRange, ChevronRight } from 'lucide-react';
import { CustomDatePicker } from '../components/CustomDatePicker';

export const AttendancePage: React.FC = () => {
  const {
    clients,
    selectedDate,
    setSelectedDate,
    markAttendance,
  } = useApp();

  const [dateMode, setDateMode] = useState<'single' | 'range'>('single');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'self_check_in'>('all');
  const [rangeAttendance, setRangeAttendance] = useState<Attendance[]>([]);
  const [loadingRange, setLoadingRange] = useState(false);

  // Helper: compute list of dates between start and end (inclusive, max 60 days)
  const getDatesInRange = (startStr: string, endStr: string): string[] => {
    if (!startStr || !endStr) return [startStr || endStr || new Date().toISOString().split('T')[0]];
    const start = new Date(startStr);
    const end = new Date(endStr);
    
    // If start is after end, swap them
    let [actualStart, actualEnd] = start <= end ? [start, end] : [end, start];
    
    const dates: string[] = [];
    const curr = new Date(actualStart);
    let count = 0;
    while (curr <= actualEnd && count < 60) {
      dates.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
      count++;
    }
    return dates;
  };

  const activeDates = dateMode === 'single' ? [selectedDate] : getDatesInRange(startDate, endDate);
  const earliestDate = activeDates[0];
  const latestDate = activeDates[activeDates.length - 1];

  // Fetch attendance logs for the active date range
  const fetchRangeAttendance = async () => {
    if (!earliestDate || !latestDate) return;
    setLoadingRange(true);
    try {
      const logs = await db.getAttendanceRange(earliestDate, latestDate);
      setRangeAttendance(logs);
    } catch (e) {
      console.error('Error fetching attendance range:', e);
    } finally {
      setLoadingRange(false);
    }
  };

  useEffect(() => {
    fetchRangeAttendance();
  }, [dateMode, selectedDate, startDate, endDate, clients]);

  // Helper to format Date header
  const formatDateHeader = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return {
        weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayMonth: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      };
    }
    return { weekday: '', dayMonth: dateStr };
  };

  // Find attendance status for a client on a specific date
  const getAttendanceRecord = (clientId: string, dateStr: string) => {
    return rangeAttendance.find(a => a.client_id === clientId && a.date === dateStr);
  };

  const getStatus = (clientId: string, dateStr: string): 'Present' | 'Absent' | null => {
    const record = getAttendanceRecord(clientId, dateStr);
    return record ? record.status : null;
  };

  // Handle toggle (Present/Absent)
  const handleToggle = async (clientId: string, dateStr: string, currentStatus: 'Present' | 'Absent' | null) => {
    const newStatus = currentStatus === 'Present' ? 'Absent' : 'Present';
    await markAttendance(clientId, dateStr, newStatus);
    fetchRangeAttendance();
  };

  // Quick Range Presets
  const setPreset = (daysBack: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (daysBack - 1));
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  // Filter and Sort clients
  const filteredAndSortedClients = clients
    .filter(client => {
      const matchesSearch =
        (client.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (client.phone || '').includes(searchQuery) ||
        (client.membership_number && client.membership_number.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesFilter = (() => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'active') return client.status === 'Active';
        if (statusFilter === 'expired') return client.status === 'Expired';
        if (statusFilter === 'self_check_in') {
          // Check if marked present via self checkin on ANY active date
          return rangeAttendance.some(
            a => a.client_id === client.id && activeDates.includes(a.date) && a.status === 'Present' && a.device_fingerprint
          );
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

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-6 py-6 flex flex-col h-full">
      {/* Page Title & View Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-800 dark:text-white tracking-tight">
            Attendance Logs
          </h1>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mt-1">
            Track daily attendance or inspect multi-day logs across custom date ranges.
          </p>
        </div>

        {/* Date Mode & Selection Panel */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white dark:bg-zinc-900 p-2.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          {/* Mode Switcher */}
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setDateMode('single')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                dateMode === 'single'
                  ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              Single Day
            </button>
            <button
              type="button"
              onClick={() => setDateMode('range')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                dateMode === 'range'
                  ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <CalendarRange className="h-3.5 w-3.5" />
              Date Range
            </button>
          </div>

          {/* Date Picker Controls */}
          {dateMode === 'single' ? (
            <div className="w-full sm:w-48">
              <CustomDatePicker
                value={selectedDate}
                onChange={setSelectedDate}
                placeholder="Select Date"
                allowClear={false}
              />
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="w-full sm:w-40">
                <CustomDatePicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="Start Date"
                  allowClear={false}
                  align="left"
                />
              </div>
              <span className="text-xs font-bold text-zinc-400 text-center sm:text-left">to</span>
              <div className="w-full sm:w-40">
                <CustomDatePicker
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="End Date"
                  allowClear={false}
                  align="right"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Date Range Quick Presets (Shown when in Date Range mode) */}
      {dateMode === 'range' && (
        <div className="flex flex-wrap items-center gap-2 bg-emerald-500/5 dark:bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20">
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mr-1">
            Quick Ranges:
          </span>
          <button
            type="button"
            onClick={() => setPreset(3)}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-zinc-800 border border-emerald-500/20 text-zinc-700 dark:text-zinc-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 transition-colors cursor-pointer"
          >
            Last 3 Days
          </button>
          <button
            type="button"
            onClick={() => setPreset(7)}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-zinc-800 border border-emerald-500/20 text-zinc-700 dark:text-zinc-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 transition-colors cursor-pointer"
          >
            Last 7 Days
          </button>
          <button
            type="button"
            onClick={() => setPreset(14)}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-zinc-800 border border-emerald-500/20 text-zinc-700 dark:text-zinc-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 transition-colors cursor-pointer"
          >
            Last 14 Days
          </button>
          <button
            type="button"
            onClick={() => setPreset(30)}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-zinc-800 border border-emerald-500/20 text-zinc-700 dark:text-zinc-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 transition-colors cursor-pointer"
          >
            Last 30 Days
          </button>
          <span className="text-3xs text-zinc-400 dark:text-zinc-500 ml-auto font-medium">
            Showing {activeDates.length} day{activeDates.length !== 1 ? 's' : ''} ({earliestDate} → {latestDate})
          </span>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by client name, membership #, or phone..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-800 dark:bg-zinc-900"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`rounded-xl px-4 py-3 text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0 ${
              statusFilter === 'all'
                ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`rounded-xl px-4 py-3 text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0 ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setStatusFilter('expired')}
            className={`rounded-xl px-4 py-3 text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0 ${
              statusFilter === 'expired'
                ? 'bg-rose-600 text-white dark:bg-rose-500'
                : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
          >
            Expired
          </button>
          <button
            onClick={() => setStatusFilter('self_check_in')}
            className={`rounded-xl px-4 py-3 text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0 ${
              statusFilter === 'self_check_in'
                ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
          >
            Self Check-in
          </button>
        </div>
      </div>

      {/* Attendance Logs Table */}
      <div className="flex-1 rounded-2xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left min-w-full">
            {/* Table Header */}
            <thead className="bg-zinc-50 dark:bg-zinc-900/90 border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="sticky left-0 z-20 bg-zinc-50 dark:bg-zinc-900 px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 min-w-[200px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                  Client Name
                </th>
                
                {/* Date Columns */}
                {activeDates.map(dateStr => {
                  const header = formatDateHeader(dateStr);
                  const isToday = dateStr === todayStr;
                  return (
                    <th
                      key={dateStr}
                      className={`px-4 py-3 text-center text-xs font-bold uppercase tracking-wider min-w-[90px] border-l border-zinc-100 dark:border-zinc-800/60 ${
                        isToday
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'text-zinc-600 dark:text-zinc-300'
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        <span className="text-3xs text-zinc-400 dark:text-zinc-500">{header.weekday}</span>
                        <span className={`text-xs ${isToday ? 'font-black' : 'font-bold'}`}>
                          {header.dayMonth}
                        </span>
                        {isToday && (
                          <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 mt-0.5">
                            Today
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}

                {/* Range Summary Column */}
                {activeDates.length > 1 && (
                  <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 min-w-[110px] border-l border-zinc-200 dark:border-zinc-800">
                    Summary
                  </th>
                )}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredAndSortedClients.length > 0 ? (
                filteredAndSortedClients.map(client => {
                  const isExpired = client.status === 'Expired';
                  
                  // Compute present count in the active range
                  const clientPresentCount = activeDates.reduce((acc, d) => {
                    return acc + (getStatus(client.id, d) === 'Present' ? 1 : 0);
                  }, 0);

                  return (
                    <tr key={client.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors">
                      {/* Sticky Client Info Column */}
                      <td className="sticky left-0 z-10 bg-white dark:bg-zinc-900 px-5 py-3.5 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                        <div className="flex items-center gap-2.5">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-emerald-500 dark:text-emerald-400 uppercase tracking-wider">
                              {client.membership_number || 'No #'}
                            </span>
                            <span className="font-bold text-zinc-800 dark:text-white text-sm leading-tight">
                              {client.name}
                            </span>
                          </div>
                          {isExpired && (
                            <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-3xs font-black tracking-wide uppercase text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                              Expired
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Date Status Toggle Cells */}
                      {activeDates.map(dateStr => {
                        const status = getStatus(client.id, dateStr);
                        const isToday = dateStr === todayStr;

                        return (
                          <td
                            key={dateStr}
                            className={`px-3 py-3 text-center border-l border-zinc-100 dark:border-zinc-800/40 ${
                              isToday ? 'bg-emerald-500/5 dark:bg-emerald-500/5' : ''
                            }`}
                          >
                            <div className="flex items-center justify-center">
                              <button
                                type="button"
                                disabled={isExpired}
                                onClick={() => handleToggle(client.id, dateStr, status)}
                                className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer ${
                                  status === 'Present'
                                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs shadow-emerald-500/30'
                                    : status === 'Absent'
                                      ? 'bg-rose-500 border-rose-500 text-white shadow-xs shadow-rose-500/30'
                                      : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:border-emerald-500/50 hover:text-emerald-500'
                                }`}
                                title={status === 'Present' ? 'Mark Absent' : 'Mark Present'}
                              >
                                {status === 'Present' ? (
                                  <Check className="h-4.5 w-4.5 stroke-[3]" />
                                ) : status === 'Absent' ? (
                                  <X className="h-4.5 w-4.5 stroke-[3]" />
                                ) : (
                                  <span className="text-xs font-bold">-</span>
                                )}
                              </button>
                            </div>
                          </td>
                        );
                      })}

                      {/* Multi-day Summary Column */}
                      {activeDates.length > 1 && (
                        <td className="px-5 py-3.5 text-center border-l border-zinc-200 dark:border-zinc-800">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-extrabold ${
                              clientPresentCount > 0
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                                : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                            }`}
                          >
                            {clientPresentCount} / {activeDates.length}d
                          </span>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={activeDates.length + (activeDates.length > 1 ? 2 : 1)}
                    className="px-6 py-12 text-center text-zinc-400 dark:text-zinc-500 font-medium"
                  >
                    {searchQuery ? 'No matching clients found.' : 'No clients registered.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
