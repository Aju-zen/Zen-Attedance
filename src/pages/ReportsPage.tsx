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
  const [activePreset, setActivePreset] = useState<string>('30days');

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
    setActivePreset(type);
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
    <div className="bg-white min-h-screen text-black space-y-6 max-w-7xl mx-auto px-4 md:px-6 py-6 font-sans">
      {/* Title & Actions (hidden in print) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-zinc-200 no-print">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-black tracking-tight flex items-center gap-2.5">
            <BarChart3 className="h-7 w-7 text-emerald-600" />
            Attendance Reports
          </h1>
          <p className="text-sm font-bold text-black mt-1">
            Custom date range reports, member attendance breakdown, and duration statistics.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={exportExcel}
            className="inline-flex items-center gap-2 rounded-lg border border-black bg-white px-4 py-2 text-sm font-bold text-black hover:bg-zinc-100 cursor-pointer transition-colors"
          >
            <Download className="h-4 w-4 text-emerald-700" />
            Excel Export
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-lg bg-black px-4.5 py-2 text-sm font-bold text-white hover:bg-zinc-800 cursor-pointer transition-colors"
          >
            <Printer className="h-4 w-4 text-white" />
            Print / PDF
          </button>
        </div>
      </div>

      {/* Date Range Selector & Duration Info (Flat, white background, no boxes) */}
      <div className="space-y-4 pb-4 border-b border-zinc-200 no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Pickers */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1 sm:w-48">
              <label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
                From Date
              </label>
              <CustomDatePicker
                value={startDate}
                onChange={val => {
                  setStartDate(val);
                  setActivePreset('');
                }}
              />
            </div>

            <div className="hidden sm:flex items-center self-end pb-2 text-black font-bold">
              <span>to</span>
            </div>

            <div className="flex-1 sm:w-48">
              <label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
                To Date
              </label>
              <CustomDatePicker
                value={endDate}
                onChange={val => {
                  setEndDate(val);
                  setActivePreset('');
                }}
              />
            </div>
          </div>

          {/* Quick Presets (Clean flat buttons) */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'today', label: 'Today' },
              { id: '7days', label: 'Last 7 Days' },
              { id: '14days', label: 'Last 14 Days' },
              { id: 'thisMonth', label: 'This Month' },
              { id: '30days', label: 'Last 30 Days' },
              { id: '90days', label: 'Last 90 Days' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => handlePreset(p.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors cursor-pointer border ${
                  activePreset === p.id
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black border-zinc-300 hover:border-black'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Duration Information Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-black">
          <div className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-emerald-700" />
            <span className="text-base font-black text-black">
              From {formatDatePretty(startDate)} to {formatDatePretty(endDate)}
            </span>
          </div>
          <div className="text-base font-black text-black">
            Total Duration: <span className="text-emerald-700 underline">{durationDays} {durationDays === 1 ? 'Day' : 'Days'}</span>
          </div>
        </div>
      </div>

      {/* Print-Only Header */}
      <div className="hidden print:block mb-6 border-b-2 border-black pb-4 text-black">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black text-black uppercase tracking-wide">{settings.gymName}</h1>
            <h2 className="text-lg font-black text-black">Attendance Summary Report</h2>
          </div>
          <div className="text-right text-xs font-bold text-black">
            <p>Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm font-black border-t border-b border-black py-2">
          <div>
            <span>Report Duration: </span>
            <span className="text-black">From {formatDatePretty(startDate)} to {formatDatePretty(endDate)}</span>
          </div>
          <div>
            <span>Total Duration: </span>
            <span className="text-black">{durationDays} Days</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex h-[35vh] items-center justify-center text-black font-black">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent" />
            <span>Compiling attendance reports for {durationDays} days...</span>
          </div>
        </div>
      ) : (
        <>
          {/* Page 1 / Section 1: Overview Summary Cards (Flat layout, white background, no boxes) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-6 border-b border-zinc-200">
            <div className="py-2">
              <div className="flex items-center justify-between text-black">
                <span className="text-xs font-black uppercase tracking-wider">Total Check-Ins</span>
                <Users className="h-5 w-5 text-emerald-700" />
              </div>
              <p className="text-3xl font-black text-black mt-2 leading-none">
                {totalPresentCount}
              </p>
              <p className="text-xs text-black font-bold mt-1">
                Recorded presents in selected range
              </p>
            </div>

            <div className="py-2">
              <div className="flex items-center justify-between text-black">
                <span className="text-xs font-black uppercase tracking-wider">Avg Daily Attendance</span>
                <TrendingUp className="h-5 w-5 text-emerald-700" />
              </div>
              <p className="text-3xl font-black text-black mt-2 leading-none">
                {avgDailyPresence} <span className="text-sm font-bold text-black">clients/day</span>
              </p>
              <p className="text-xs text-black font-bold mt-1">
                Across {gymDays} active logged days
              </p>
            </div>

            <div className="py-2 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between text-black">
                <span className="text-xs font-black uppercase tracking-wider">Total Duration</span>
                <Calendar className="h-5 w-5 text-emerald-700" />
              </div>
              <p className="text-3xl font-black text-black mt-2 leading-none">
                {durationDays} <span className="text-sm font-bold text-black">days</span>
              </p>
              <p className="text-xs text-black font-bold mt-1">
                {formatDatePretty(startDate)} – {formatDatePretty(endDate)}
              </p>
            </div>
          </div>

          {/* Section 1 Details: Most Regular & Weekday Trends (Flat lists on white background) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-6 border-b border-zinc-200">
            {/* Most Regular */}
            <div>
              <h2 className="font-black text-black text-base uppercase tracking-wider border-b border-black pb-2 mb-3 flex items-center justify-between">
                <span>Top Regular Members</span>
                <span className="text-xs font-bold text-black normal-case">In this period</span>
              </h2>
              <div className="space-y-2.5">
                {mostRegular.length > 0 ? (
                  mostRegular.map((stat, idx) => (
                    <div
                      key={stat.client.id}
                      className="flex items-center justify-between text-sm py-1 border-b border-zinc-100 last:border-none"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 text-xs font-black text-black">{idx + 1}.</span>
                        <span className="font-black text-black">
                          {stat.client.name}
                        </span>
                        {stat.client.membership_number && (
                          <span className="text-xs font-bold text-black">
                            (#{stat.client.membership_number})
                          </span>
                        )}
                      </div>
                      <span className="font-black text-emerald-700 text-sm">
                        {stat.rate}% ({stat.present}d)
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-black font-bold py-4">No attendance logged in this range.</p>
                )}
              </div>
            </div>

            {/* Weekday Trends */}
            <div>
              <h2 className="font-black text-black text-base uppercase tracking-wider border-b border-black pb-2 mb-3">
                Weekday Attendance Trends
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm py-1 border-b border-zinc-100">
                  <span className="font-bold text-black">
                    Highest Present Weekday
                  </span>
                  <div className="text-right">
                    <span className="font-black text-emerald-700 text-sm">
                      {highestWeekday.name}
                    </span>
                    <span className="text-xs font-bold text-black ml-2">(Avg: {highestWeekday.avg})</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm py-1">
                  <span className="font-bold text-black">
                    Lowest Present Weekday
                  </span>
                  <div className="text-right">
                    <span className="font-black text-rose-600 text-sm">
                      {lowestWeekday.name}
                    </span>
                    <span className="text-xs font-bold text-black ml-2">(Avg: {lowestWeekday.avg})</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Page 2 / Section 2: Detailed Client Attendance Table (Strictly 4 Columns, Pure White, Flat) */}
          <div className="space-y-3 pt-2">
            {/* Table Controls (hidden in print) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 no-print">
              <div>
                <h2 className="text-lg font-black text-black uppercase tracking-wider">
                  Client Attendance Breakdown
                </h2>
                <p className="text-xs font-bold text-black">
                  Showing summary for all {filteredAndSortedStats.length} clients over {durationDays} days.
                </p>
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search client or #..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg text-sm border border-zinc-300 bg-white text-black font-bold focus:outline-hidden focus:border-black"
                />
              </div>
            </div>

            {/* 4-Column Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse border-t border-b border-black">
                <thead>
                  <tr className="border-b-2 border-black bg-white text-xs font-black uppercase tracking-wider text-black">
                    {/* Column 1: Client Name */}
                    <th
                      className="py-3 px-3 md:px-4 cursor-pointer hover:text-emerald-700 transition-colors"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Client Name</span>
                        <ArrowUpDown className="h-3.5 w-3.5 text-black no-print" />
                      </div>
                    </th>

                    {/* Column 2: Days Present */}
                    <th
                      className="py-3 px-3 text-center cursor-pointer hover:text-emerald-700 transition-colors"
                      onClick={() => handleSort('present')}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Days Present</span>
                        <ArrowUpDown className="h-3.5 w-3.5 text-black no-print" />
                      </div>
                    </th>

                    {/* Column 3: Days Absent */}
                    <th
                      className="py-3 px-3 text-center cursor-pointer hover:text-emerald-700 transition-colors"
                      onClick={() => handleSort('absent')}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Days Absent</span>
                        <ArrowUpDown className="h-3.5 w-3.5 text-black no-print" />
                      </div>
                    </th>

                    {/* Column 4: Attendance Percentage */}
                    <th
                      className="py-3 px-3 md:px-4 text-right cursor-pointer hover:text-emerald-700 transition-colors"
                      onClick={() => handleSort('rate')}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Attendance %</span>
                        <ArrowUpDown className="h-3.5 w-3.5 text-black no-print" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 bg-white">
                  {filteredAndSortedStats.length > 0 ? (
                    filteredAndSortedStats.map((stat) => {
                      const isHighOrMid = stat.rate >= 50;

                      return (
                        <tr
                          key={stat.client.id}
                          className="hover:bg-zinc-50 transition-colors"
                        >
                          {/* 1. Client Name */}
                          <td className="py-3 px-3 md:px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-black text-sm">
                                {stat.client.name}
                              </span>
                              {stat.client.membership_number && (
                                <span className="text-xs font-bold text-zinc-600">
                                  #{stat.client.membership_number}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 2. Days Present (GREEN) */}
                          <td className="py-3 px-3 text-center">
                            <span className="font-black text-emerald-700 text-sm">
                              {stat.present} d
                            </span>
                          </td>

                          {/* 3. Days Absent (RED) */}
                          <td className="py-3 px-3 text-center">
                            <span className="font-black text-rose-600 text-sm">
                              {stat.absent} d
                            </span>
                          </td>

                          {/* 4. Attendance Percentage (GREEN if >= 50%, RED if < 50%) */}
                          <td className="py-3 px-3 md:px-4 text-right">
                            <span
                              className={`font-black text-sm ${
                                isHighOrMid ? 'text-emerald-700' : 'text-rose-600'
                              }`}
                            >
                              {stat.rate}%
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-8 text-center text-sm font-bold text-black"
                      >
                        No clients found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Summary */}
            <div className="pt-2 flex items-center justify-between text-xs font-bold text-black">
              <span>Total Members Listed: {filteredAndSortedStats.length}</span>
              <span>Report Duration: {durationDays} Days</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};


