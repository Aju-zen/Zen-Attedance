import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { db } from '../services/db';
import { Attendance, Client, LeaderboardEntry } from '../types';
import {
  BarChart3,
  Printer,
  Download,
  Users,
  TrendingUp,
  Calendar,
  CalendarRange,
  Search,
  ArrowUpDown,
  Trophy,
  X,
  Flame,
} from 'lucide-react';
import { CustomDatePicker } from '../components/CustomDatePicker';
import { generateAndDownloadAttendancePdf } from '../utils/generateAttendancePdf';

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

  // Full Leaderboard Modal State (with search filter)
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<{
    top10: LeaderboardEntry[];
    allRanked: LeaderboardEntry[];
  }>({ top10: [], allRanked: [] });
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [leaderboardSearch, setLeaderboardSearch] = useState('');

  const loadLeaderboard = async () => {
    setLoadingLeaderboard(true);
    try {
      const data = await db.getLeaderboard();
      setLeaderboardData(data);
    } catch (e) {
      console.error('Error fetching leaderboard in reports:', e);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

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

  // Helper to check if a date is Sunday
  const isSunday = (dateStr: string): boolean => {
    if (!dateStr) return false;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return d.getDay() === 0;
    }
    return new Date(dateStr).getDay() === 0;
  };

  // Helper to format date strings cleanly (e.g., "Sep 4, 2026")
  const formatDatePretty = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    }
    return dateStr;
  };

  // Helper to format date strings as DD/MM/YYYY (e.g., "10/08/2026")
  const formatDateDMY = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const month = parts[1].padStart(2, '0');
      const day = parts[2].padStart(2, '0');
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  };

  // Calculate total number of operating days in range (excluding Sundays, Mon-Sat = 6 days/week)
  const durationDays = useMemo(() => {
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const [s, e] = start <= end ? [start, end] : [end, start];
    
    let count = 0;
    const curr = new Date(s.getFullYear(), s.getMonth(), s.getDate());
    const finalDate = new Date(e.getFullYear(), e.getMonth(), e.getDate());
    
    while (curr <= finalDate) {
      if (curr.getDay() !== 0) { // Exclude Sunday
        count++;
      }
      curr.setDate(curr.getDate() + 1);
    }
    return count;
  }, [startDate, endDate]);

  // Filter out any Sunday logs (ignore Sunday for attendance calculation)
  const nonSundayLogs = useMemo(() => {
    return reportLogs.filter(l => !isSunday(l.date));
  }, [reportLogs]);

  // Aggregate stats per day (excluding Sundays)
  const dateLogMap = useMemo(() => {
    const map = new Map<string, { present: number; total: number }>();
    nonSundayLogs.forEach(log => {
      const entry = map.get(log.date) || { present: 0, total: 0 };
      if (log.status === 'Present') entry.present += 1;
      entry.total += 1;
      map.set(log.date, entry);
    });
    return map;
  }, [nonSundayLogs]);

  const gymDays = dateLogMap.size;
  const totalPresentCount = nonSundayLogs.filter(l => l.status === 'Present').length;
  const avgDailyPresence = gymDays > 0 ? Math.round(totalPresentCount / gymDays) : 0;

  // Client statistics (calculated strictly on operating non-Sunday days)
  const clientStats: ClientReportStat[] = useMemo(() => {
    return clients.map(client => {
      const clientLogs = nonSundayLogs.filter(l => l.client_id === client.id);
      const present = clientLogs.filter(l => l.status === 'Present').length;
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
  }, [clients, nonSundayLogs, durationDays]);

  // Filtered and Sorted stats for table
  const filteredAndSortedStats = useMemo(() => {
    const rawQ = searchQuery.trim().toLowerCase();
    const cleanQ = rawQ.replace(/^[#\s]+/, '');
    const alphaQ = rawQ.replace(/[^a-z0-9]/g, '');
    const digitsQ = rawQ.replace(/\D/g, '');

    return clientStats
      .filter(s => {
        if (!rawQ) return true;
        const name = (s.client.name || '').toLowerCase();
        const mem = (s.client.membership_number ? String(s.client.membership_number) : '').toLowerCase();

        if (name.includes(rawQ) || mem.includes(rawQ)) return true;
        if (cleanQ && (mem.includes(cleanQ) || name.includes(cleanQ))) return true;

        const alphaMem = mem.replace(/[^a-z0-9]/g, '');
        if (alphaQ && alphaMem && (alphaMem.includes(alphaQ) || alphaQ.includes(alphaMem))) {
          return true;
        }

        const digitsMem = mem.replace(/\D/g, '');
        if (digitsQ && digitsMem) {
          if (digitsMem.includes(digitsQ) || digitsMem.endsWith(digitsQ)) return true;
          const numMem = parseInt(digitsMem, 10);
          const numQ = parseInt(digitsQ, 10);
          if (!isNaN(numMem) && !isNaN(numQ) && numMem === numQ) return true;
        }

        return false;
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
      .slice(0, 10);
  }, [clientStats]);

  // Weekday stats calculation (Monday through Saturday)
  const weekdayStats = useMemo(() => {
    const map = new Map<number, { present: number; count: number }>();
    for (const [dateStr, stats] of dateLogMap.entries()) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const dayOfWeek = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).getDay();
        if (dayOfWeek === 0) continue; // Exclude Sunday
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

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Print handler that ensures document.title is formatted for PDF filename
  const handlePrint = () => {
    const originalTitle = document.title;
    const gymClean = (settings.gymName || 'Matrx_Den_640').trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
    document.title = `${gymClean}_Attendance_Report_${startDate}_to_${endDate}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  // Direct Browser PDF Download Handler (Instantly downloads .pdf file directly to Browser Downloads)
  const handleDownloadReport = () => {
    setIsDownloadingPdf(true);
    try {
      generateAndDownloadAttendancePdf({
        gymName: settings.gymName || 'Matrx Den 640',
        startDate,
        endDate,
        durationDays,
        totalPresentCount,
        avgDailyPresence,
        clientStats: filteredAndSortedStats,
        mostRegular,
        highestWeekday,
        lowestWeekday,
        gymDays,
      });
    } catch (err) {
      console.error('Error generating PDF download:', err);
      // Fallback: print to PDF if canvas/blob generation fails
      handlePrint();
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-6 py-6 text-zinc-900 dark:text-zinc-100">
      {/* ========================================================================= */}
      {/* 1. ON-SCREEN / WEBSITE VIEW (Normal modern UI, hidden in print)            */}
      {/* ========================================================================= */}
      <div className="space-y-6 no-print">
        {/* Title & Actions */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <BarChart3 className="h-7 w-7 text-emerald-500" />
              Analytics & Reports
            </h1>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mt-1">
              Select date ranges, review client attendance percentages, and generate reports.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                setShowLeaderboardModal(true);
                loadLeaderboard();
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-2.5 text-sm font-bold text-amber-700 dark:text-amber-400 shadow-2xs hover:bg-amber-500/20 cursor-pointer transition-colors"
              title="View full monthly member attendance leaderboard"
            >
              <Trophy className="h-4.5 w-4.5 text-amber-500" />
              View Leaderboard
            </button>
            <button
              onClick={handleDownloadReport}
              disabled={isDownloadingPdf}
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-800 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600 cursor-pointer transition-colors disabled:opacity-50"
              title="Download PDF report directly into your browser downloads folder"
            >
              <Download className="h-4.5 w-4.5" />
              {isDownloadingPdf ? 'Downloading PDF...' : 'Download Report PDF'}
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4.5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 cursor-pointer transition-colors"
              title="Print or Save as PDF"
            >
              <Printer className="h-4.5 w-4.5" />
              Print / Save PDF
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FULL LEADERBOARD MODAL (Admin Reports with Live Search)                   */}
        {/* ========================================================================= */}
        {showLeaderboardModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
            <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-500 border border-amber-500/20">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                      Monthly Attendance Leaderboard
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        {new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Complete member turnout rankings. Resets on the 1st of every month.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowLeaderboardModal(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search by member name, #membership number, or rank..."
                    value={leaderboardSearch}
                    onChange={(e) => setLeaderboardSearch(e.target.value)}
                    className="w-full pl-10 pr-9 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-800 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 transition"
                  />
                  {leaderboardSearch && (
                    <button
                      onClick={() => setLeaderboardSearch('')}
                      className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Leaderboard Table / List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {loadingLeaderboard ? (
                  <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
                    <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <span className="text-xs font-bold">Loading monthly leaderboard...</span>
                  </div>
                ) : (() => {
                  const filtered = leaderboardData.allRanked.filter((entry) => {
                    if (!leaderboardSearch.trim()) return true;
                    const q = leaderboardSearch.toLowerCase().trim();
                    return (
                      entry.name.toLowerCase().includes(q) ||
                      (entry.membershipNumber && String(entry.membershipNumber).toLowerCase().includes(q)) ||
                      String(entry.rank).includes(q)
                    );
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
                        <span className="text-xs font-semibold">No matching members found.</span>
                      </div>
                    );
                  }

                  return (
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
                      {filtered.map((entry) => (
                        <div
                          key={entry.clientId}
                          className="flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-900/60 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Rank Badge */}
                            <span
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                                entry.rank === 1
                                  ? 'bg-amber-400 text-zinc-950 shadow-xs'
                                  : entry.rank === 2
                                  ? 'bg-zinc-300 text-zinc-950 shadow-xs'
                                  : entry.rank === 3
                                  ? 'bg-amber-700 text-white shadow-xs'
                                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                              }`}
                            >
                              {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                            </span>

                            <div className="truncate">
                              <span className="font-bold text-zinc-800 dark:text-white">
                                {entry.name}
                              </span>
                              {entry.membershipNumber && (
                                <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500 ml-2">
                                  #{entry.membershipNumber}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 pl-3">
                            <span className="font-black text-sm text-emerald-600 dark:text-emerald-400">
                              {entry.presentDays}
                            </span>
                            <span className="text-[11px] font-semibold text-zinc-400">
                              {entry.presentDays === 1 ? 'day' : 'days'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 flex items-center justify-between text-xs text-zinc-500 shrink-0">
                <span>Total Ranked Members: <strong>{leaderboardData.allRanked.length}</strong></span>
                <button
                  onClick={() => setShowLeaderboardModal(false)}
                  className="px-4 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold hover:bg-zinc-300 dark:hover:bg-zinc-700 transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Date Range Selector Box */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 md:p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Pickers */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex-1 sm:w-48">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
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

              <div className="hidden sm:flex items-center self-end pb-2.5 text-zinc-400">
                <span className="text-xs font-bold">to</span>
              </div>

              <div className="flex-1 sm:w-48">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
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

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    activePreset === p.id
                      ? 'bg-emerald-600 text-white shadow-xs font-black'
                      : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Top Duration & Date Range Info */}
          <div className="mt-4 pt-3.5 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarRange className="h-4.5 w-4.5 text-emerald-500" />
              <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                From {formatDatePretty(startDate)} to {formatDatePretty(endDate)}
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 text-xs font-bold border border-emerald-200 dark:border-emerald-500/20">
              <span>Total Duration:</span>
              <span className="font-extrabold">{durationDays} {durationDays === 1 ? 'Day' : 'Days'} (Excl. Sundays)</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex h-[35vh] items-center justify-center text-zinc-400 font-medium">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              <span>Compiling attendance reports...</span>
            </div>
          </div>
        ) : (
          <>
            {/* Summary Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-zinc-200 bg-white p-4.5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Check-Ins</span>
                  <Users className="h-4.5 w-4.5 text-emerald-500" />
                </div>
                <p className="text-2xl md:text-3xl font-black text-zinc-800 dark:text-white mt-2 leading-none">
                  {totalPresentCount}
                </p>
                <p className="text-3xs text-zinc-400 dark:text-zinc-500 font-semibold mt-1">
                  Recorded presents in selected range
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-4.5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Average Daily Attendance</span>
                  <TrendingUp className="h-4.5 w-4.5 text-emerald-500" />
                </div>
                <p className="text-2xl md:text-3xl font-black text-zinc-800 dark:text-white mt-2 leading-none">
                  {avgDailyPresence} <span className="text-sm font-bold text-zinc-400">clients/day</span>
                </p>
                <p className="text-3xs text-zinc-400 dark:text-zinc-500 font-semibold mt-1">
                  Calculated over {gymDays} logged days
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-4.5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900 sm:col-span-2 lg:col-span-1">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Operating Days</span>
                  <Calendar className="h-4.5 w-4.5 text-emerald-500" />
                </div>
                <p className="text-2xl md:text-3xl font-black text-zinc-800 dark:text-white mt-2 leading-none">
                  {durationDays} <span className="text-sm font-bold text-zinc-400">days</span>
                </p>
                <p className="text-3xs text-zinc-400 dark:text-zinc-500 font-semibold mt-1">
                  Mon – Sat (Sundays excluded)
                </p>
              </div>
            </div>

            {/* Rankings & Trends */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Most Regular */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="font-extrabold text-zinc-800 dark:text-white text-base border-b border-zinc-100 pb-3 mb-4 dark:border-zinc-800 flex items-center justify-between">
                  <span>Most Regular Members</span>
                  <span className="text-xs font-medium text-zinc-400">In this period</span>
                </h2>
                <div className="space-y-3">
                  {mostRegular.length > 0 ? (
                    mostRegular.slice(0, 5).map((stat, idx) => (
                      <div key={stat.client.id} className="flex items-center justify-between text-sm py-1 border-b border-zinc-50 dark:border-zinc-800/40 last:border-none">
                        <div className="flex items-center gap-2">
                          <span className="w-5 text-xs font-bold text-zinc-400">{idx + 1}.</span>
                          <span className="font-bold text-zinc-700 dark:text-zinc-300">
                            {stat.client.name}
                          </span>
                          {stat.client.membership_number && (
                            <span className="text-3xs font-bold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                              #{stat.client.membership_number}
                            </span>
                          )}
                        </div>
                        <span className="font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 px-2 py-0.5 rounded-lg dark:bg-emerald-500/10 text-xs">
                          {stat.rate}% ({stat.present}d)
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center py-4">No data logged.</p>
                  )}
                </div>
              </div>

              {/* Weekday Trends */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="font-extrabold text-zinc-800 dark:text-white text-base border-b border-zinc-100 pb-3 mb-4 dark:border-zinc-800">
                  Weekday Attendance Trends
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">
                      Highest Present Weekday
                    </span>
                    <div className="text-right">
                      <span className="font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 px-2 py-0.5 rounded-lg dark:bg-emerald-500/10 text-xs">
                        {highestWeekday.name}
                      </span>
                      <p className="text-xs text-zinc-400 mt-1">Avg: {highestWeekday.avg} present</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm pt-4 border-t border-zinc-50 dark:border-zinc-800/50">
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">
                      Lowest Present Weekday
                    </span>
                    <div className="text-right">
                      <span className="font-black text-rose-600 dark:text-rose-400 bg-rose-50 px-2 py-0.5 rounded-lg dark:bg-rose-500/10 text-xs">
                        {lowestWeekday.name}
                      </span>
                      <p className="text-xs text-zinc-400 mt-1">Avg: {lowestWeekday.avg} present</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Client Attendance Breakdown Table */}
            <div className="rounded-2xl border border-zinc-200 bg-white shadow-2xs dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
              {/* Table Controls */}
              <div className="p-4 md:p-5 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-extrabold text-zinc-800 dark:text-white">
                    Client Attendance Breakdown
                  </h2>
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Showing {filteredAndSortedStats.length} clients over {durationDays} days.
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
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl text-sm border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* 4-Column Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50/70 text-xs font-extrabold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
                      {/* Column 1: Client Name */}
                      <th
                        className="py-3 px-4 md:px-6 cursor-pointer hover:text-emerald-500 transition-colors"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Client Name</span>
                          <ArrowUpDown className="h-3.5 w-3.5 text-zinc-400" />
                        </div>
                      </th>

                      {/* Column 2: Days Present */}
                      <th
                        className="py-3 px-4 text-center cursor-pointer hover:text-emerald-500 transition-colors"
                        onClick={() => handleSort('present')}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <span>Days Present</span>
                          <ArrowUpDown className="h-3.5 w-3.5 text-zinc-400" />
                        </div>
                      </th>

                      {/* Column 3: Days Absent */}
                      <th
                        className="py-3 px-4 text-center cursor-pointer hover:text-emerald-500 transition-colors"
                        onClick={() => handleSort('absent')}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <span>Days Absent</span>
                          <ArrowUpDown className="h-3.5 w-3.5 text-zinc-400" />
                        </div>
                      </th>

                      {/* Column 4: Attendance Percentage */}
                      <th
                        className="py-3 px-4 md:px-6 text-right cursor-pointer hover:text-emerald-500 transition-colors"
                        onClick={() => handleSort('rate')}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span>Attendance %</span>
                          <ArrowUpDown className="h-3.5 w-3.5 text-zinc-400" />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {filteredAndSortedStats.length > 0 ? (
                      filteredAndSortedStats.map((stat) => {
                        const isHigh = stat.rate >= 75;
                        const isModerate = stat.rate >= 50 && stat.rate < 75;

                        return (
                          <tr
                            key={stat.client.id}
                            className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                          >
                            {/* 1. Client Name */}
                            <td className="py-3.5 px-4 md:px-6">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-zinc-800 dark:text-zinc-200">
                                  {stat.client.name}
                                </span>
                                {stat.client.membership_number && (
                                  <span className="text-3xs font-extrabold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                                    #{stat.client.membership_number}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* 2. Days Present */}
                            <td className="py-3.5 px-4 text-center">
                              <span className="inline-flex items-center justify-center min-w-[3rem] px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                                {stat.present} d
                              </span>
                            </td>

                            {/* 3. Days Absent */}
                            <td className="py-3.5 px-4 text-center">
                              <span className="inline-flex items-center justify-center min-w-[3rem] px-2.5 py-1 rounded-lg text-xs font-black bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                                {stat.absent} d
                              </span>
                            </td>

                            {/* 4. Attendance Percentage */}
                            <td className="py-3.5 px-4 md:px-6 text-right">
                              <div className="inline-flex items-center justify-end gap-2.5">
                                <div className="hidden sm:block w-20 bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
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
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                                      : isModerate
                                      ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                                      : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
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
                          className="py-8 text-center text-sm font-semibold text-zinc-400 dark:text-zinc-500"
                        >
                          No clients found matching your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="p-3.5 bg-zinc-50/50 dark:bg-zinc-800/30 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs font-bold text-zinc-500 dark:text-zinc-400">
                <span>Total Members: {filteredAndSortedStats.length}</span>
                <span>Period: {durationDays} Days</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. COMPLETELY NEW PDF / PRINT DOCUMENT (PURE WHITE, TEXT-ONLY, NO BOXES)  */}
      {/* ========================================================================= */}
      <div
        className="print-report-container hidden print:block font-sans print-root"
        style={{ backgroundColor: '#ffffff', color: '#000000', margin: 0, padding: 0 }}
      >
        {/* ===================================================================== */}
        {/* PAGE 1: EXECUTIVE INSIGHTS & ANALYTICAL SUMMARY                       */}
        {/* ===================================================================== */}
        <div style={{ minHeight: '92vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: '20px' }}>
          <div>
            {/* Header: Gym Name & Report Heading */}
            <div style={{ borderBottom: '2.5px solid #0f172a', paddingBottom: '12px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h1 style={{ fontSize: '26px', fontWeight: 900, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                    {settings.gymName}
                  </h1>
                  <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', marginTop: '4px', letterSpacing: '0.02em', margin: 0 }}>
                    Executive Attendance Summary & Analytics
                  </h2>
                </div>
                <div style={{ textAlign: 'right', fontSize: '11px', fontWeight: 700, color: '#0f172a' }}>
                  <p style={{ margin: 0 }}>Generated: {new Date().toLocaleDateString()}</p>
                  <p style={{ margin: 0, marginTop: '2px' }}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>

              {/* Duration Banner (Text-only line) */}
              <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #94a3b8', display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                <div>
                  <span>Date: </span>
                  <span style={{ fontWeight: 900, color: '#000000' }}>
                    {formatDateDMY(startDate)} to {formatDateDMY(endDate)}
                  </span>
                </div>
                <div>
                  <span>Total Operating Days: </span>
                  <span style={{ fontWeight: 900, color: '#000000', textDecoration: 'underline' }}>
                    {durationDays}
                  </span>
                </div>
              </div>
            </div>

            {/* Key Metrics (Pure text with vertical accent bar, no box backgrounds) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', paddingBottom: '20px', marginBottom: '24px', borderBottom: '1px solid #cbd5e1' }}>
              <div style={{ borderLeft: '3px solid #0f172a', paddingLeft: '12px' }}>
                <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#334155', margin: 0, letterSpacing: '0.05em' }}>
                  Total Check-Ins
                </p>
                <p style={{ fontSize: '28px', fontWeight: 900, color: '#000000', margin: '4px 0 0 0', lineHeight: 1 }}>
                  {totalPresentCount}
                </p>
                <p style={{ fontSize: '10px', fontWeight: 600, color: '#475569', margin: '4px 0 0 0' }}>
                  Recorded attendance in range
                </p>
              </div>

              <div style={{ borderLeft: '3px solid #166534', paddingLeft: '12px' }}>
                <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#166534', margin: 0, letterSpacing: '0.05em' }}>
                  Avg Daily Attendance
                </p>
                <p style={{ fontSize: '28px', fontWeight: 900, color: '#166534', margin: '4px 0 0 0', lineHeight: 1 }}>
                  {avgDailyPresence} <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>clients/day</span>
                </p>
                <p style={{ fontSize: '10px', fontWeight: 600, color: '#475569', margin: '4px 0 0 0' }}>
                  Across {gymDays} active logged days
                </p>
              </div>

              <div style={{ borderLeft: '3px solid #0f172a', paddingLeft: '12px' }}>
                <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#334155', margin: 0, letterSpacing: '0.05em' }}>
                  Total Active Members
                </p>
                <p style={{ fontSize: '28px', fontWeight: 900, color: '#000000', margin: '4px 0 0 0', lineHeight: 1 }}>
                  {clientStats.length}
                </p>
                <p style={{ fontSize: '10px', fontWeight: 600, color: '#475569', margin: '4px 0 0 0' }}>
                  Registered gym clients
                </p>
              </div>
            </div>

            {/* Analytics Section: Most Regular Members & Weekday Trends */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '32px' }}>
              {/* Most Regular Members */}
              <div>
                <h3 style={{ fontSize: '13px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0f172a', borderBottom: '2px solid #0f172a', paddingBottom: '6px', margin: '0 0 12px 0' }}>
                  Most Regular Members (Top Turnout)
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {mostRegular.length > 0 ? (
                    mostRegular.map((stat, idx) => (
                      <div
                        key={stat.client.id}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', paddingBottom: '4px', borderBottom: '1px solid #e2e8f0' }}
                      >
                        <div>
                          <span style={{ fontWeight: 900, color: '#000000', marginRight: '6px' }}>{idx + 1}.</span>
                          <span style={{ fontWeight: 800, color: '#0f172a' }}>{stat.client.name}</span>
                          {stat.client.membership_number && (
                            <span style={{ fontSize: '10px', fontWeight: 600, color: '#334155', marginLeft: '6px' }}>
                              (#{stat.client.membership_number})
                            </span>
                          )}
                        </div>
                        <span style={{ fontWeight: 900, color: '#166534', fontSize: '12px' }}>
                          {stat.rate}% ({stat.present} days)
                        </span>
                      </div>
                    ))
                  ) : (
                    <p style={{ fontSize: '11px', color: '#475569', margin: 0 }}>No attendance data logged in this range.</p>
                  )}
                </div>
              </div>

              {/* Weekday Trends */}
              <div>
                <h3 style={{ fontSize: '13px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0f172a', borderBottom: '2px solid #0f172a', paddingBottom: '6px', margin: '0 0 12px 0' }}>
                  Weekday Attendance Patterns
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', paddingBottom: '6px', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ fontWeight: 700, color: '#1e293b' }}>Highest Present Weekday:</span>
                    <span style={{ fontWeight: 900, color: '#166534', fontSize: '13px' }}>
                      {highestWeekday.name} (Avg: {highestWeekday.avg})
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', paddingBottom: '6px', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ fontWeight: 700, color: '#1e293b' }}>Lowest Present Weekday:</span>
                    <span style={{ fontWeight: 900, color: '#991b1b', fontSize: '13px' }}>
                      {lowestWeekday.name} (Avg: {lowestWeekday.avg})
                    </span>
                  </div>

                  <p style={{ fontSize: '11px', fontWeight: 600, color: '#334155', lineHeight: 1.5, margin: '8px 0 0 0' }}>
                    This analytical overview highlights gym engagement, peak days, and regular member consistency during the period. The complete individual member attendance report begins on Page 2.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Page 1 Footer */}
          <div style={{ borderTop: '2px solid #0f172a', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 800, color: '#0f172a' }}>
            <span>Zen Attendance</span>
            <span>Page 1 of 2</span>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* PAGE 2+: FULL MEMBER ATTENDANCE REPORT (TABLE ONLY, NO BOXES)         */}
        {/* ===================================================================== */}
        <div style={{ breakBefore: 'page', pageBreakBefore: 'always', paddingTop: '16px' }}>
          {/* Header on Page 2 */}
          <div style={{ borderBottom: '2.5px solid #0f172a', paddingBottom: '10px', marginBottom: '14px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
              {settings.gymName} Attendance Report
            </h1>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
              <span>Date: {formatDateDMY(startDate)} to {formatDateDMY(endDate)}</span>
              <span>Total Operating Days: {durationDays}</span>
            </div>
          </div>

          {/* 4-Column Table: Zero Background Fills, Crisp Flat Lines, Rich Dark Text */}
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #0f172a', color: '#000000', textTransform: 'uppercase', fontSize: '11px', fontWeight: 900, letterSpacing: '0.03em' }}>
                <th style={{ padding: '8px 6px' }}>Client Name</th>
                <th style={{ padding: '8px 6px', textAlign: 'center' }}>Days Present</th>
                <th style={{ padding: '8px 6px', textAlign: 'center' }}>Days Absent</th>
                <th style={{ padding: '8px 6px', textAlign: 'right' }}>Attendance %</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedStats.map((stat) => {
                const isHighOrMid = stat.rate >= 50;

                return (
                  <tr key={stat.client.id} style={{ borderBottom: '1px solid #cbd5e1' }}>
                    {/* 1. Client Name (Dark Charcoal / Black) */}
                    <td style={{ padding: '6px', fontWeight: 800, color: '#0f172a' }}>
                      {stat.client.name}
                      {stat.client.membership_number && (
                        <span style={{ fontWeight: 600, color: '#475569', marginLeft: '6px', fontSize: '10px' }}>
                          (#{stat.client.membership_number})
                        </span>
                      )}
                    </td>

                    {/* 2. Days Present (Deep Dark Green) */}
                    <td style={{ padding: '6px', textAlign: 'center', fontWeight: 900, color: '#166534', fontSize: '12px' }}>
                      {stat.present}
                    </td>

                    {/* 3. Days Absent (Deep Dark Crimson Red) */}
                    <td style={{ padding: '6px', textAlign: 'center', fontWeight: 900, color: '#991b1b', fontSize: '12px' }}>
                      {stat.absent}
                    </td>

                    {/* 4. Attendance Percentage (Deep Green / Deep Red) */}
                    <td
                      style={{
                        padding: '6px',
                        textAlign: 'right',
                        fontWeight: 900,
                        fontSize: '12px',
                        color: isHighOrMid ? '#166534' : '#991b1b',
                      }}
                    >
                      {stat.rate}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Page 2 Footer */}
          <div style={{ marginTop: '24px', borderTop: '2px solid #0f172a', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 800, color: '#0f172a' }}>
            <span>Zen Attendance</span>
            <span>Page 2+ • End of Report</span>
          </div>
        </div>
      </div>
    </div>
  );
};





