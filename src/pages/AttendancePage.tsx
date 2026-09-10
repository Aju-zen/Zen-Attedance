import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { db } from '../services/db';
import { Attendance } from '../types';
import { Search, Check, X, Calendar, CalendarRange, Maximize2, Minimize2 } from 'lucide-react';
import { CustomDatePicker } from '../components/CustomDatePicker';

export const AttendancePage: React.FC = () => {
  const {
    clients,
    selectedDate,
    setSelectedDate,
    markAttendance,
  } = useApp();

  const [dateMode, setDateMode] = useState<'single' | 'range'>('single');
  const [isFullScreen, setIsFullScreen] = useState(false);
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
      if (dateMode === 'single') {
        await db.initializeDailyAttendance(selectedDate);
      }
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

  const getStatus = (clientId: string, dateStr: string): 'Present' | 'Absent' => {
    const record = getAttendanceRecord(clientId, dateStr);
    return record ? record.status : 'Absent';
  };

  // Handle toggle (Present/Absent)
  const handleToggle = async (clientId: string, dateStr: string, currentStatus: 'Present' | 'Absent') => {
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
    <div
      className={`flex flex-col h-full ${
        isFullScreen
          ? 'fixed inset-0 z-[100] bg-zinc-50 dark:bg-zinc-950 p-2 sm:p-3 overflow-hidden w-screen h-screen'
          : 'space-y-4 max-w-7xl mx-auto px-4 md:px-6 py-6'
      }`}
    >
      {/* 1. Normal View Header Controls (Hidden in Full Screen) */}
      {!isFullScreen && (
        <>
          {/* Page Title & View Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 shrink-0">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-zinc-800 dark:text-white tracking-tight">
                Attendance Logs
              </h1>
              <p className="text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">
                Track daily presence or inspect multi-day logs across custom date ranges.
              </p>
            </div>

            {/* Date Mode & Selection Panel */}
            <div className="flex flex-wrap items-center gap-2.5 bg-white dark:bg-zinc-900 p-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
              {/* Mode Switcher */}
              <div className="flex bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-xl shrink-0">
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
                <div className="w-40 sm:w-44">
                  <CustomDatePicker
                    value={selectedDate}
                    onChange={setSelectedDate}
                    placeholder="Select Date"
                    allowClear={false}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <div className="w-32 sm:w-36">
                    <CustomDatePicker
                      value={startDate}
                      onChange={setStartDate}
                      placeholder="Start Date"
                      allowClear={false}
                      align="left"
                    />
                  </div>
                  <span className="text-xs font-bold text-zinc-400">to</span>
                  <div className="w-32 sm:w-36">
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

              {/* Fullscreen Trigger Button */}
              <button
                type="button"
                onClick={() => setIsFullScreen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer shadow-xs"
                title="View in Full Screen"
              >
                <Maximize2 className="h-3.5 w-3.5 text-emerald-500" />
                <span className="hidden sm:inline">Fullscreen</span>
              </button>
            </div>
          </div>

          {/* Date Range Quick Presets (Normal mode only) */}
          {dateMode === 'range' && (
            <div className="flex flex-wrap items-center gap-1.5 bg-emerald-500/5 dark:bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20 shrink-0">
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
            </div>
          )}
        </>
      )}

      {/* 2. Top Bar (Streamlined for Fullscreen and Normal Views) */}
      <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
        {/* Search & Status Filters */}
        <div className="flex flex-1 items-center gap-2 min-w-[260px]">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search client or membership #..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white pl-8.5 pr-3 py-1.5 text-xs sm:text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-800 dark:bg-zinc-900"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 shrink-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer shrink-0 ${
                statusFilter === 'all'
                  ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer shrink-0 ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('expired')}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer shrink-0 ${
                statusFilter === 'expired'
                  ? 'bg-rose-600 text-white dark:bg-rose-500'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`}
            >
              Expired
            </button>
          </div>
        </div>

        {/* Fullscreen Active Header Actions */}
        {isFullScreen && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg">
              {dateMode === 'single' ? selectedDate : `${earliestDate} → ${latestDate}`}
            </span>
            <button
              type="button"
              onClick={() => setIsFullScreen(false)}
              className="flex items-center gap-1 px-3 py-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-bold transition cursor-pointer shadow-xs"
              title="Exit Full Screen"
            >
              <Minimize2 className="h-3.5 w-3.5 text-emerald-400" />
              Exit Fullscreen
            </button>
          </div>
        )}
      </div>

      {/* 3. Attendance Logs Table (with Freeze Panes: Fixed Header, Fixed Name Column, Fixed Summary Column) */}
      <div className="flex-1 min-h-0 rounded-2xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto relative">
          <table className="w-full border-collapse text-left min-w-full">
            {/* Table Header (Sticky Top) */}
            <thead className="bg-zinc-100 dark:bg-zinc-800/95 sticky top-0 z-30 border-b border-zinc-200 dark:border-zinc-700">
              <tr>
                {/* Top-Left Corner Header Cell (Pinned on Left and Top) */}
                <th className="sticky top-0 left-0 z-40 bg-zinc-100 dark:bg-zinc-800 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 min-w-[220px] max-w-[280px] shadow-[2px_0_6px_-2px_rgba(0,0,0,0.08)] border-r border-zinc-200 dark:border-zinc-700">
                  Client Info
                </th>
                
                {/* Date Header Columns (Scroll Horizontally, Sticky on Top) */}
                {activeDates.map(dateStr => {
                  const header = formatDateHeader(dateStr);
                  const isToday = dateStr === todayStr;
                  return (
                    <th
                      key={dateStr}
                      className={`sticky top-0 z-30 px-3 py-2 text-center text-xs font-bold uppercase tracking-wider min-w-[80px] border-l border-zinc-200 dark:border-zinc-700/80 ${
                        isToday
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        <span className="text-3xs text-zinc-400 dark:text-zinc-500">{header.weekday}</span>
                        <span className={`text-xs ${isToday ? 'font-black text-emerald-600 dark:text-emerald-400' : 'font-bold'}`}>
                          {header.dayMonth}
                        </span>
                        {isToday && (
                          <span className="text-[8px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                            Today
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}

                {/* Range Summary Column Header (Pinned on Right and Top) */}
                {activeDates.length > 1 && (
                  <th className="sticky top-0 right-0 z-40 bg-zinc-100 dark:bg-zinc-800 px-4 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 min-w-[100px] shadow-[-2px_0_6px_-2px_rgba(0,0,0,0.08)] border-l border-zinc-200 dark:border-zinc-700">
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
                    <tr key={client.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors">
                      {/* Left Frozen Column: Membership Number & Name in Same Line */}
                      <td className="sticky left-0 z-20 bg-white dark:bg-zinc-900 px-4 py-2.5 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.08)] border-r border-zinc-100 dark:border-zinc-800 min-w-[220px] max-w-[280px]">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider bg-emerald-50 dark:bg-emerald-500/15 px-2 py-0.5 rounded-md shrink-0">
                            {client.membership_number || 'No #'}
                          </span>
                          <span className="font-bold text-zinc-800 dark:text-white text-sm truncate" title={client.name}>
                            {client.name}
                          </span>
                          {isExpired && (
                            <span className="inline-flex items-center rounded-full bg-rose-50 px-1.5 py-0.5 text-3xs font-black tracking-wide uppercase text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 shrink-0 ml-auto">
                              Exp
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Middle Scrollable Date Status Toggle Cells */}
                      {activeDates.map(dateStr => {
                        const status = getStatus(client.id, dateStr);
                        const isToday = dateStr === todayStr;

                        return (
                          <td
                            key={dateStr}
                            className={`px-2 py-2 text-center border-l border-zinc-100 dark:border-zinc-800/40 min-w-[80px] ${
                              isToday ? 'bg-emerald-500/5 dark:bg-emerald-500/5' : ''
                            }`}
                          >
                            <div className="flex items-center justify-center">
                              <button
                                type="button"
                                disabled={isExpired}
                                onClick={() => handleToggle(client.id, dateStr, status)}
                                className={`flex h-8 w-8 items-center justify-center rounded-xl border transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer ${
                                  status === 'Present'
                                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs shadow-emerald-500/30'
                                    : 'bg-rose-500 border-rose-500 text-white shadow-xs shadow-rose-500/30'
                                }`}
                                title={status === 'Present' ? 'Mark Absent' : 'Mark Present'}
                              >
                                {status === 'Present' ? (
                                  <Check className="h-4 w-4 stroke-[3]" />
                                ) : (
                                  <X className="h-4 w-4 stroke-[3]" />
                                )}
                              </button>
                            </div>
                          </td>
                        );
                      })}

                      {/* Right Frozen Column: Multi-day Summary */}
                      {activeDates.length > 1 && (
                        <td className="sticky right-0 z-20 bg-white dark:bg-zinc-900 px-4 py-2.5 text-center shadow-[-2px_0_6px_-2px_rgba(0,0,0,0.08)] border-l border-zinc-200 dark:border-zinc-800 min-w-[100px]">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-extrabold ${
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
