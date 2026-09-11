import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { db } from '../services/db';
import { Attendance } from '../types';
import { Search, Check, X, Calendar, CalendarRange, Maximize2, Minimize2, Smartphone, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
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
  // 1. Custom order is default category, followed by all, active, expired, self_check_in
  const [statusFilter, setStatusFilter] = useState<'custom' | 'all' | 'active' | 'expired' | 'self_check_in'>('custom');
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [customOrder, setCustomOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('zen_custom_client_order');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

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

  // Helper: check if date string is Sunday
  const isSunday = (dateStr: string): boolean => {
    if (!dateStr) return false;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return d.getDay() === 0;
    }
    return new Date(dateStr).getDay() === 0;
  };

  const activeDates = dateMode === 'single' ? [selectedDate] : getDatesInRange(startDate, endDate);
  const nonSundayDates = activeDates.filter(d => !isSunday(d));
  const summaryTotalDays = nonSundayDates.length > 0 ? nonSundayDates.length : activeDates.length;
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

  // Compute effective custom order with all current clients
  const effectiveOrder = useMemo(() => {
    const clientIds = clients.map(c => c.id);
    const validSaved = customOrder.filter(id => clientIds.includes(id));
    const missing = clientIds.filter(id => !validSaved.includes(id));
    return [...validSaved, ...missing];
  }, [clients, customOrder]);

  // Move client 1 step up or down (ideal for one-tap reordering)
  const moveClient = (clientId: string, direction: 'up' | 'down') => {
    const order = [...effectiveOrder];
    const index = order.indexOf(clientId);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= order.length) return;

    const temp = order[index];
    order[index] = order[targetIndex];
    order[targetIndex] = temp;

    setCustomOrder(order);
    try {
      localStorage.setItem('zen_custom_client_order', JSON.stringify(order));
    } catch (e) {
      console.error('Error saving custom client order:', e);
    }
  };

  // Filter and Sort clients
  const filteredAndSortedClients = useMemo(() => {
    const rawQ = searchQuery.trim().toLowerCase();
    const cleanQ = rawQ.replace(/^[#\s]+/, '');
    const alphaQ = rawQ.replace(/[^a-z0-9]/g, '');
    const digitsQ = rawQ.replace(/\D/g, '');

    return clients
      .filter(client => {
        const matchesSearch = (() => {
          if (!rawQ) return true;

          const name = (client.name || '').toLowerCase();
          const phone = (client.phone || '').toLowerCase();
          const mem = (client.membership_number ? String(client.membership_number) : '').toLowerCase();

          // 1. Direct substring match on name, phone, or membership #
          if (name.includes(rawQ) || phone.includes(rawQ) || mem.includes(rawQ)) {
            return true;
          }

          // 2. Match without leading '#' or symbols
          if (cleanQ && (mem.includes(cleanQ) || name.includes(cleanQ))) {
            return true;
          }

          // 3. Normalized alphanumeric match (e.g. '001', 'MD001', 'MD-001')
          const alphaMem = mem.replace(/[^a-z0-9]/g, '');
          if (alphaQ && alphaMem && (alphaMem.includes(alphaQ) || alphaQ.includes(alphaMem))) {
            return true;
          }

          // 4. Numeric match (e.g. searching '1' for '001' or 'MD-001')
          const digitsMem = mem.replace(/\D/g, '');
          if (digitsQ && digitsMem) {
            if (digitsMem.includes(digitsQ) || digitsMem.endsWith(digitsQ)) return true;
            const numMem = parseInt(digitsMem, 10);
            const numQ = parseInt(digitsQ, 10);
            if (!isNaN(numMem) && !isNaN(numQ) && numMem === numQ) return true;
          }

          return false;
        })();

        const matchesFilter = (() => {
          if (statusFilter === 'custom' || statusFilter === 'all') return true;
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
        if (statusFilter === 'custom') {
          const idxA = effectiveOrder.indexOf(a.id);
          const idxB = effectiveOrder.indexOf(b.id);
          const posA = idxA === -1 ? 999999 : idxA;
          const posB = idxB === -1 ? 999999 : idxB;
          return posA - posB;
        }
        const memA = a.membership_number || '';
        const memB = b.membership_number || '';
        return memA.localeCompare(memB, undefined, { numeric: true, sensitivity: 'base' });
      });
  }, [clients, searchQuery, statusFilter, rangeAttendance, activeDates, effectiveOrder]);

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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 shrink-0">
        {/* Search Bar */}
        <div className="relative w-full md:w-80 lg:w-96 shrink-0">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search client or membership #..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-white pl-8.5 pr-3 py-1.5 text-xs sm:text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-800 dark:bg-zinc-900"
          />
        </div>

        {/* Filter Categories Bar (Horizontal scroll on mobile with no overflow) */}
        <div className="flex items-center justify-between md:justify-end gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <div className="flex items-center gap-1 shrink-0">
            {/* 1. Custom Order (First & Default) */}
            <button
              onClick={() => setStatusFilter('custom')}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer shrink-0 ${
                statusFilter === 'custom'
                  ? 'bg-emerald-600 text-white dark:bg-emerald-500 shadow-xs'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`}
            >
              Custom
            </button>

            {/* 2. All (Second) */}
            <button
              onClick={() => {
                setStatusFilter('all');
                setIsEditingOrder(false);
              }}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer shrink-0 ${
                statusFilter === 'all'
                  ? 'bg-emerald-600 text-white dark:bg-emerald-500 shadow-xs'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`}
            >
              All
            </button>

            {/* 3. Active */}
            <button
              onClick={() => {
                setStatusFilter('active');
                setIsEditingOrder(false);
              }}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer shrink-0 ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white dark:bg-emerald-500 shadow-xs'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`}
            >
              Active
            </button>

            {/* 4. Expired */}
            <button
              onClick={() => {
                setStatusFilter('expired');
                setIsEditingOrder(false);
              }}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer shrink-0 ${
                statusFilter === 'expired'
                  ? 'bg-rose-600 text-white dark:bg-rose-500 shadow-xs'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`}
            >
              Expired
            </button>

            {/* 5. Self Check-In */}
            <button
              onClick={() => {
                setStatusFilter('self_check_in');
                setIsEditingOrder(false);
              }}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1 ${
                statusFilter === 'self_check_in'
                  ? 'bg-indigo-600 text-white dark:bg-indigo-500 shadow-xs'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`}
            >
              <Smartphone className="h-3 w-3" />
              Self Check-In
            </button>

            {/* Edit Custom Order Toggle */}
            <button
              onClick={() => {
                if (statusFilter !== 'custom') {
                  setStatusFilter('custom');
                }
                setIsEditingOrder(prev => !prev);
              }}
              className={`ml-1 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                isEditingOrder
                  ? 'bg-amber-600 text-white shadow-xs animate-pulse'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700'
              }`}
              title={isEditingOrder ? 'Finish reordering' : 'Click to rearrange custom member order'}
            >
              {isEditingOrder ? (
                <>
                  <Check className="h-3 w-3" />
                  Done
                </>
              ) : (
                <>
                  <ArrowUpDown className="h-3 w-3 text-emerald-500" />
                  Edit Order
                </>
              )}
            </button>
          </div>

          {/* Fullscreen Active Header Actions */}
          {isFullScreen && (
            <div className="flex items-center gap-2 shrink-0 ml-auto md:ml-2">
              <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-lg hidden sm:inline">
                {dateMode === 'single' ? selectedDate : `${earliestDate} → ${latestDate}`}
              </span>
              <button
                type="button"
                onClick={() => setIsFullScreen(false)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-bold transition cursor-pointer shadow-xs shrink-0"
                title="Exit Full Screen"
              >
                <Minimize2 className="h-3.5 w-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Exit Fullscreen</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. Attendance Logs Table (with Freeze Panes: Fixed Header, Fixed Name Column, Fixed Summary Column) */}
      <div className="flex-1 min-h-0 rounded-2xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto relative">
          <table className="w-full border-collapse text-left min-w-full">
            {/* Table Header (Sticky Top) */}
            <thead className="bg-zinc-100 dark:bg-zinc-800/95 sticky top-0 z-30 border-b border-zinc-200 dark:border-zinc-700">
              <tr>
                {/* Top-Left Corner Header Cell (Pinned on Left and Top) */}
                <th className="sticky top-0 left-0 z-40 bg-zinc-100 dark:bg-zinc-800 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 min-w-[220px] max-w-[290px] shadow-[2px_0_6px_-2px_rgba(0,0,0,0.08)] border-r border-zinc-200 dark:border-zinc-700">
                  <div className="flex items-center justify-between">
                    <span>Client Info</span>
                  </div>
                </th>
                
                {/* Date Header Columns (Scroll Horizontally, Sticky on Top) */}
                {activeDates.map(dateStr => {
                  const header = formatDateHeader(dateStr);
                  const isToday = dateStr === todayStr;
                  const isSun = isSunday(dateStr);
                  return (
                    <th
                      key={dateStr}
                      className={`sticky top-0 z-30 px-3 py-2 text-center text-xs font-bold uppercase tracking-wider min-w-[80px] border-l border-zinc-200 dark:border-zinc-700/80 ${
                        isToday
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                          : isSun
                          ? 'bg-zinc-200/50 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        <span className={`text-3xs ${isSun ? 'text-rose-500/90 dark:text-rose-400/90 font-extrabold' : 'text-zinc-400 dark:text-zinc-500'}`}>
                          {header.weekday}
                        </span>
                        <span className={`text-xs ${isToday ? 'font-black text-emerald-600 dark:text-emerald-400' : 'font-bold'}`}>
                          {header.dayMonth}
                        </span>
                        {isSun && (
                          <span className="text-[7.5px] font-extrabold uppercase text-zinc-400 dark:text-zinc-500">
                            Off Day
                          </span>
                        )}
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
                  <th
                    className="sticky top-0 right-0 z-40 bg-zinc-100 dark:bg-zinc-800 px-4 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 min-w-[100px] shadow-[-2px_0_6px_-2px_rgba(0,0,0,0.08)] border-l border-zinc-200 dark:border-zinc-700"
                    title="Attendance calculated for Mon–Sat operating days (Sundays excluded)"
                  >
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
                  
                  // Compute present count in the active range (excluding Sundays)
                  const targetDates = nonSundayDates.length > 0 ? nonSundayDates : activeDates;
                  const clientPresentCount = targetDates.reduce((acc, d) => {
                    return acc + (getStatus(client.id, d) === 'Present' ? 1 : 0);
                  }, 0);

                  return (
                    <tr
                      key={client.id}
                      className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors"
                    >
                      {/* Left Frozen Column: Membership Number & Name in Same Line */}
                      <td className="sticky left-0 z-20 bg-white dark:bg-zinc-900 px-3 sm:px-4 py-2.5 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.08)] border-r border-zinc-100 dark:border-zinc-800 min-w-[220px] max-w-[290px]">
                        <div className="flex items-center gap-2 overflow-hidden">
                          {/* Large Side-by-Side Up & Down Buttons when in Edit Order mode */}
                          {isEditingOrder && statusFilter === 'custom' && (
                            <div className="flex items-center gap-1 shrink-0 mr-1">
                              <button
                                type="button"
                                onClick={() => moveClient(client.id, 'up')}
                                className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/30 active:scale-90 border border-amber-500/30 transition cursor-pointer shadow-2xs"
                                title="Move up"
                                aria-label="Move up"
                              >
                                <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 stroke-[3]" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveClient(client.id, 'down')}
                                className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/30 active:scale-90 border border-amber-500/30 transition cursor-pointer shadow-2xs"
                                title="Move down"
                                aria-label="Move down"
                              >
                                <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 stroke-[3]" />
                              </button>
                            </div>
                          )}
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
                        const record = getAttendanceRecord(client.id, dateStr);
                        const status = record ? record.status : 'Absent';
                        const isSelfCheckIn = Boolean(record?.device_fingerprint && record?.status === 'Present');
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
                                className={`relative flex h-8 w-8 items-center justify-center rounded-xl border transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer ${
                                  status === 'Present'
                                    ? isSelfCheckIn
                                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs shadow-indigo-500/30'
                                      : 'bg-emerald-500 border-emerald-500 text-white shadow-xs shadow-emerald-500/30'
                                    : 'bg-rose-500 border-rose-500 text-white shadow-xs shadow-rose-500/30'
                                }`}
                                title={status === 'Present' ? (isSelfCheckIn ? 'Self Checked-In via device (Click to toggle)' : 'Mark Absent') : 'Mark Present'}
                              >
                                {status === 'Present' ? (
                                  <Check className="h-4 w-4 stroke-[3]" />
                                ) : (
                                  <X className="h-4 w-4 stroke-[3]" />
                                )}
                                {isSelfCheckIn && (
                                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-indigo-950 border border-white text-[8px] text-white shadow-xs" title="Self Checked-in via mobile">
                                    📱
                                  </span>
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
                            title="Attendance calculated for operating days (Sundays excluded)"
                          >
                            {clientPresentCount} / {summaryTotalDays}d
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
                    {searchQuery
                      ? 'No matching clients found.'
                      : statusFilter === 'self_check_in'
                      ? 'No self check-in members found for this date/range.'
                      : statusFilter === 'active'
                      ? 'No active clients found.'
                      : statusFilter === 'expired'
                      ? 'No expired clients found.'
                      : 'No clients registered.'}
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
