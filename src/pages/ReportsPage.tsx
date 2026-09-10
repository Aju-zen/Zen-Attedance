import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { db } from '../services/db';
import { Attendance, Client } from '../types';
import {
  BarChart3,
  Download,
  Printer,
  Users,
  TrendingUp,
  Calendar,
  CalendarRange,
  Search,
  ArrowUpDown,
} from 'lucide-react';
import { CustomDatePicker } from '../components/CustomDatePicker';

interface ClientReportStat {
  client: Client;
  present: number;
  absent: number;
  totalDays: number;
  rate: number;
}

export const ReportsPage: React.FC = () => {
  const { clients, settings } = useApp();
  const [reportLogs, setReportLogs] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  // Date Range state
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29); // Default to last 30 days
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Table search and sort
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'present' | 'absent' | 'rate'>('present');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Load logs for the selected date range
  useEffect(() => {
    const loadLogs = async () => {
      if (!startDate || !endDate) return;
      setLoading(true);
      try {
        const [actualStart, actualEnd] =
          new Date(startDate) <= new Date(endDate)
            ? [startDate, endDate]
            : [endDate, startDate];
        const logs = await db.getAttendanceRange(actualStart, actualEnd);
        setReportLogs(logs);
      } catch (e) {
        console.error('Error fetching report logs:', e);
      } finally {
        setLoading(false);
      }
    };
    loadLogs();
  }, [startDate, endDate, clients]);

  // Quick Preset Handlers
  const handlePreset = (type: 'today' | '7days' | '14days' | 'thisMonth' | '30days' | '90days') => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (type === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (type === '7days') {
      const d = new Date();
      d.setDate(today.getDate() - 6);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (type === '14days') {
      const d = new Date();
      d.setDate(today.getDate() - 13);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (type === 'thisMonth') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(startOfMonth.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (type === '30days') {
      const d = new Date();
      d.setDate(today.getDate() - 29);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (type === '90days') {
      const d = new Date();
      d.setDate(today.getDate() - 89);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(todayStr);
    }
  };

  // Helper to format date strings cleanly (e.g., "Sep 4, 2026")
  const formatDatePretty = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    }
    return dateStr;
  };

  // Calculate total number of calendar days in range (inclusive)
  const durationDays = useMemo(() => {
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const [s, e] = start <= end ? [start, end] : [end, start];
    const diffTime = Math.abs(e.getTime() - s.getTime());
    return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [startDate, endDate]);

  // Aggregate stats per day
  const dateLogMap = useMemo(() => {
    const map = new Map<string, { present: number; total: number }>();
    reportLogs.forEach(log => {
      const entry = map.get(log.date) || { present: 0, total: 0 };
      if (log.status === 'Present') entry.present += 1;
      entry.total += 1;
      map.set(log.date, entry);
    });
    return map;
  }, [reportLogs]);

  const gymDays = dateLogMap.size;
  const totalPresentCount = reportLogs.filter(l => l.status === 'Present').length;
  const avgDailyPresence = gymDays > 0 ? Math.round(totalPresentCount / gymDays) : 0;

  // Client statistics
  const clientStats: ClientReportStat[] = useMemo(() => {
    return clients.map(client => {
      const clientLogs = reportLogs.filter(l => l.client_id === client.id);
      const present = clientLogs.filter(l => l.status === 'Present').length;
      // Days absent calculated against the full selected duration
      const absent = Math.max(0, durationDays - present);
      const rate = durationDays > 0 ? Math.min(100, Math.round((present / durationDays) * 100)) : 0;

      return {
        client,
        present,
        absent,
        totalDays: durationDays,
        rate,
      };
    });
  }, [clients, reportLogs, durationDays]);

  // Filtered and Sorted stats for table
  const filteredAndSortedStats = useMemo(() => {
    return clientStats
      .filter(s => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;
        const nameMatch = (s.client.name || '').toLowerCase().includes(query);
        const memMatch = (s.client.membership_number || '').toLowerCase().includes(query);
        return nameMatch || memMatch;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortBy === 'name') {
          diff = (a.client.name || '').localeCompare(b.client.name || '');
        } else if (sortBy === 'present') {
          diff = a.present - b.present;
        } else if (sortBy === 'absent') {
          diff = a.absent - b.absent;
        } else if (sortBy === 'rate') {
          diff = a.rate - b.rate;
        }
        return sortOrder === 'asc' ? diff : -diff;
      });
  }, [clientStats, searchQuery, sortBy, sortOrder]);

  // Top rankings
  const mostRegular = useMemo(() => {
    return [...clientStats]
      .filter(s => s.present > 0)
      .sort((a, b) => b.rate - a.rate || b.present - a.present)
      .slice(0, 5);
  }, [clientStats]);

  // Weekday stats calculation
  const weekdayStats = useMemo(() => {
    const map = new Map<number, { present: number; count: number }>();
    for (const [dateStr, stats] of dateLogMap.entries()) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const dayOfWeek = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])).getDay();
        const current = map.get(dayOfWeek) || { present: 0, count: 0 };
        current.present += stats.present;
        current.count += 1;
        map.set(dayOfWeek, current);
      }
    }
    return map;
  }, [dateLogMap]);

  const daysOfWeekNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const activeWeekdays = Array.from(weekdayStats.entries())
    .map(([dayOfWeek, stats]) => ({
      dayOfWeek,
      avg: stats.count > 0 ? stats.present / stats.count : 0,
    }))
    .filter(d => d.avg > 0 || weekdayStats.get(d.dayOfWeek)!.count > 0);

  let highestWeekday = { name: 'N/A', avg: 0 };
  let lowestWeekday = { name: 'N/A', avg: 0 };

  if (activeWeekdays.length > 0) {
    activeWeekdays.sort((a, b) => b.avg - a.avg);
    highestWeekday = {
      name: daysOfWeekNames[activeWeekdays[0].dayOfWeek],
      avg: Math.round(activeWeekdays[0].avg),
    };
    lowestWeekday = {
      name: daysOfWeekNames[activeWeekdays[activeWeekdays.length - 1].dayOfWeek],
      avg: Math.round(activeWeekdays[activeWeekdays.length - 1].avg),
    };
  }

  // Toggle sort direction
  const handleSort = (field: 'name' | 'present' | 'absent' | 'rate') => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Export to CSV (Formatted 4-column report)
  const exportExcel = () => {
    let csvContent = '\uFEFF'; // UTF-8 BOM
    csvContent += `"${settings.gymName} - Attendance Report"\r\n`;
    csvContent += `"Date Range","From ${formatDatePretty(startDate)} to ${formatDatePretty(endDate)}"\r\n`;
    csvContent += `"Total Duration","${durationDays} Days"\r\n`;
    csvContent += `"Generated On","${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}"\r\n\r\n`;
    csvContent += 'Client Name,Days Present,Days Absent,Attendance Rate (%)\r\n';

    filteredAndSortedStats.forEach(s => {
      const clientName = s.client.membership_number
        ? `${s.client.name} (${s.client.membership_number})`
        : s.client.name;
      csvContent += `"${clientName.replace(/"/g, '""')}",${s.present},${s.absent},${s.rate}%\r\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `${settings.gymName.replace(/\s+/g, '_')}_Attendance_Report_${startDate}_to_${endDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-6 py-6 text-zinc-900 dark:text-zinc-100">
      {/* Title & Actions (hidden in print) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <BarChart3 className="h-7 w-7 text-emerald-500" />
            Attendance Reports
          </h1>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mt-1">
            Generate custom date range reports, analyze attendance percentages, and export summaries.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={exportExcel}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-bold text-zinc-800 shadow-xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
          >
            <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Excel Export
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4.5 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 cursor-pointer transition-colors"
          >
            <Printer className="h-4 w-4" />
            Print / PDF
          </button>
        </div>
      </div>

      {/* Date Range Selector & Duration Info Box (Interactive controls hidden in print) */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 md:p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Pickers */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1 sm:w-48">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                From Date
              </label>
              <CustomDatePicker value={startDate} onChange={setStartDate} />
            </div>

            <div className="hidden sm:flex items-center self-end pb-2.5 text-zinc-400">
              <span className="text-xs font-bold">to</span>
            </div>

            <div className="flex-1 sm:w-48">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                To Date
              </label>
              <CustomDatePicker value={endDate} onChange={setEndDate} />
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => handlePreset('today')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={() => handlePreset('7days')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => handlePreset('14days')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              Last 14 Days
            </button>
            <button
              onClick={() => handlePreset('thisMonth')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              This Month
            </button>
            <button
              onClick={() => handlePreset('30days')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer"
            >
              Last 30 Days
            </button>
            <button
              onClick={() => handlePreset('90days')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              Last 90 Days
            </button>
          </div>
        </div>

        {/* Top Information Banner Displaying Duration & Range */}
        <div className="mt-4 pt-3.5 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-extrabold text-zinc-900 dark:text-white">
              From {formatDatePretty(startDate)} to {formatDatePretty(endDate)}
            </span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-black border border-emerald-200 dark:border-emerald-800/60">
            <span>Total Duration:</span>
            <span className="underline">{durationDays} {durationDays === 1 ? 'Day' : 'Days'}</span>
          </div>
        </div>
      </div>

      {/* Print-Only Header Banner */}
      <div className="hidden print:block mb-6 border-b-2 border-zinc-900 pb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black text-black uppercase tracking-wide">{settings.gymName}</h1>
            <h2 className="text-lg font-bold text-zinc-800">Attendance Summary Report</h2>
          </div>
          <div className="text-right text-xs text-zinc-600">
            <p>Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm font-bold bg-zinc-100 p-2.5 rounded-lg border border-zinc-300">
          <div>
            <span>Report Duration: </span>
            <span className="font-extrabold text-black">From {formatDatePretty(startDate)} to {formatDatePretty(endDate)}</span>
          </div>
          <div>
            <span>Total Days: </span>
            <span className="font-extrabold text-black">{durationDays} Days</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex h-[35vh] items-center justify-center text-zinc-600 dark:text-zinc-400 font-bold">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            <span>Compiling attendance reports for {durationDays} days...</span>
          </div>
        </div>
      ) : (
        <>
          {/* Page 1 / Section 1: Overview Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4.5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 print-card">
              <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                <span className="text-xs font-bold uppercase tracking-wider">Total Check-Ins</span>
                <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white mt-2 leading-none">
                {totalPresentCount}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold mt-1">
                Recorded presents in selected range
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-4.5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 print-card">
              <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                <span className="text-xs font-bold uppercase tracking-wider">Avg Daily Attendance</span>
                <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white mt-2 leading-none">
                {avgDailyPresence} <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400">clients/day</span>
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold mt-1">
                Across {gymDays} active logged days
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-4.5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 print-card sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                <span className="text-xs font-bold uppercase tracking-wider">Total Duration</span>
                <Calendar className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white mt-2 leading-none">
                {durationDays} <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400">days</span>
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold mt-1">
                {formatDatePretty(startDate)} – {formatDatePretty(endDate)}
              </p>
            </div>
          </div>

          {/* Rankings & Trends (Section 1 details) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Most Regular */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 print-card">
              <h2 className="font-extrabold text-zinc-900 dark:text-white text-base border-b border-zinc-100 pb-3 mb-4 dark:border-zinc-800 flex items-center justify-between">
                <span>Top Regular Members</span>
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">In this period</span>
              </h2>
              <div className="space-y-3">
                {mostRegular.length > 0 ? (
                  mostRegular.map((stat, idx) => (
                    <div
                      key={stat.client.id}
                      className="flex items-center justify-between text-sm py-1 border-b border-zinc-50 dark:border-zinc-800/40 last:border-none"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 text-xs font-black text-zinc-500 dark:text-zinc-400">{idx + 1}.</span>
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">
                          {stat.client.name}
                        </span>
                        {stat.client.membership_number && (
                          <span className="text-3xs font-bold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                            #{stat.client.membership_number}
                          </span>
                        )}
                      </div>
                      <span className="font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50 px-2 py-0.5 rounded-lg dark:bg-emerald-950/60 text-xs border border-emerald-200 dark:border-emerald-800/50">
                        {stat.rate}% ({stat.present}d)
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center py-4">No attendance logged in this range.</p>
                )}
              </div>
            </div>

            {/* Weekday Trends */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 print-card">
              <h2 className="font-extrabold text-zinc-900 dark:text-white text-base border-b border-zinc-100 pb-3 mb-4 dark:border-zinc-800">
                Weekday Attendance Trends
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">
                    Highest Present Weekday
                  </span>
                  <div className="text-right">
                    <span className="font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50 px-2 py-0.5 rounded-lg dark:bg-emerald-950/60 text-xs border border-emerald-200 dark:border-emerald-800/50">
                      {highestWeekday.name}
                    </span>
                    <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-1">Avg: {highestWeekday.avg} present</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm pt-4 border-t border-zinc-100 dark:border-zinc-800/60">
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">
                    Lowest Present Weekday
                  </span>
                  <div className="text-right">
                    <span className="font-black text-rose-700 dark:text-rose-300 bg-rose-50 px-2 py-0.5 rounded-lg dark:bg-rose-950/60 text-xs border border-rose-200 dark:border-rose-800/50">
                      {lowestWeekday.name}
                    </span>
                    <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-1">Avg: {lowestWeekday.avg} present</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Page 2 / Section 2: Detailed Client Attendance Table (Strictly 4 Columns) */}
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden print:border-zinc-300 print:shadow-none print-page-break mt-6">
            {/* Table Controls (hidden in print) */}
            <div className="p-4 md:p-5 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 no-print">
              <div>
                <h2 className="text-base font-extrabold text-zinc-900 dark:text-white">
                  Client Attendance Breakdown
                </h2>
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Showing summary for all {filteredAndSortedStats.length} clients over {durationDays} days.
                </p>
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search client or #..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl text-sm border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* 4-Column Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50/80 text-xs font-extrabold uppercase tracking-wider text-zinc-700 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-300 print:bg-zinc-100 print:text-black">
                    {/* Column 1: Client Name */}
                    <th
                      className="py-3.5 px-4 md:px-6 cursor-pointer hover:text-emerald-600 transition-colors"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Client Name</span>
                        <ArrowUpDown className="h-3.5 w-3.5 text-zinc-400 no-print" />
                      </div>
                    </th>

                    {/* Column 2: Days Present */}
                    <th
                      className="py-3.5 px-4 text-center cursor-pointer hover:text-emerald-600 transition-colors"
                      onClick={() => handleSort('present')}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Days Present</span>
                        <ArrowUpDown className="h-3.5 w-3.5 text-zinc-400 no-print" />
                      </div>
                    </th>

                    {/* Column 3: Days Absent */}
                    <th
                      className="py-3.5 px-4 text-center cursor-pointer hover:text-emerald-600 transition-colors"
                      onClick={() => handleSort('absent')}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Days Absent</span>
                        <ArrowUpDown className="h-3.5 w-3.5 text-zinc-400 no-print" />
                      </div>
                    </th>

                    {/* Column 4: Attendance Percentage */}
                    <th
                      className="py-3.5 px-4 md:px-6 text-right cursor-pointer hover:text-emerald-600 transition-colors"
                      onClick={() => handleSort('rate')}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Attendance %</span>
                        <ArrowUpDown className="h-3.5 w-3.5 text-zinc-400 no-print" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 print:divide-zinc-200">
                  {filteredAndSortedStats.length > 0 ? (
                    filteredAndSortedStats.map((stat) => {
                      const isHigh = stat.rate >= 75;
                      const isModerate = stat.rate >= 50 && stat.rate < 75;

                      return (
                        <tr
                          key={stat.client.id}
                          className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                        >
                          {/* 1. Client Name */}
                          <td className="py-3.5 px-4 md:px-6">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-zinc-900 dark:text-white">
                                {stat.client.name}
                              </span>
                              {stat.client.membership_number && (
                                <span className="text-3xs font-extrabold px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                                  #{stat.client.membership_number}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 2. Days Present */}
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center justify-center min-w-[3rem] px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                              {stat.present} d
                            </span>
                          </td>

                          {/* 3. Days Absent */}
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center justify-center min-w-[3rem] px-2.5 py-1 rounded-lg text-xs font-black bg-zinc-100 text-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                              {stat.absent} d
                            </span>
                          </td>

                          {/* 4. Attendance Percentage */}
                          <td className="py-3.5 px-4 md:px-6 text-right">
                            <div className="inline-flex items-center justify-end gap-2.5">
                              {/* Progress bar (web view only) */}
                              <div className="hidden sm:block w-20 bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden no-print">
                                <div
                                  className={`h-full rounded-full ${
                                    isHigh
                                      ? 'bg-emerald-500'
                                      : isModerate
                                      ? 'bg-amber-500'
                                      : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${stat.rate}%` }}
                                />
                              </div>
                              <span
                                className={`text-xs font-black px-2.5 py-1 rounded-lg border ${
                                  isHigh
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/50'
                                    : isModerate
                                    ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/50'
                                    : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/50'
                                }`}
                              >
                                {stat.rate}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-8 text-center text-sm font-semibold text-zinc-500 dark:text-zinc-400"
                      >
                        No clients found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Summary */}
            <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/30 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs font-bold text-zinc-600 dark:text-zinc-400">
              <span>Total Members Listed: {filteredAndSortedStats.length}</span>
              <span>Report Duration: {durationDays} Days</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

