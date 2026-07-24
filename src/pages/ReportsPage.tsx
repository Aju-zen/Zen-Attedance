import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { db } from '../services/db';
import { Attendance, Client } from '../types';
import { BarChart3, Download, Printer, Users, TrendingUp, Calendar, CheckSquare } from 'lucide-react';

interface ClientReportStat {
  client: Client;
  present: number;
  absent: number;
  total: number;
  rate: number;
}

export const ReportsPage: React.FC = () => {
  const { clients, settings } = useApp();
  const [reportLogs, setReportLogs] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportRange, setReportRange] = useState<'weekly' | 'monthly'>('monthly');

  // Load last 30 days of logs for stats
  useEffect(() => {
    const loadLogs = async () => {
      setLoading(true);
      try {
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        
        const startStr = thirtyDaysAgo.toISOString().split('T')[0];
        const endStr = today.toISOString().split('T')[0];

        const logs = await db.getAttendanceRange(startStr, endStr);
        setReportLogs(logs);
      } catch (e) {
        console.error('Error fetching report logs:', e);
      } finally {
        setLoading(false);
      }
    };
    loadLogs();
  }, [clients]);

  // 1. Calculations
  const dateLogMap = new Map<string, { present: number; total: number }>();
  reportLogs.forEach(log => {
    const entry = dateLogMap.get(log.date) || { present: 0, total: 0 };
    if (log.status === 'Present') entry.present += 1;
    entry.total += 1;
    dateLogMap.set(log.date, entry);
  });

  const gymDays = dateLogMap.size;
  const totalLogsCount = reportLogs.length;
  const totalPresentCount = reportLogs.filter(l => l.status === 'Present').length;
  const totalAbsentCount = reportLogs.filter(l => l.status === 'Absent').length;
  
  const avgDailyPresence = gymDays > 0 ? Math.round(totalPresentCount / gymDays) : 0;
  
  const todayStr = new Date().toISOString().split('T')[0];
  const presentTodayCount = reportLogs.filter(l => l.date === todayStr && l.status === 'Present').length;

  // Client statistics
  const clientStats: ClientReportStat[] = clients.map(client => {
    const clientLogs = reportLogs.filter(l => l.client_id === client.id);
    const present = clientLogs.filter(l => l.status === 'Present').length;
    const absent = clientLogs.filter(l => l.status === 'Absent').length;
    const total = present + absent;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;

    return { client, present, absent, total, rate };
  });

  // Filter clients who have at least one marked log for rankings
  const activeClientsInLogs = clientStats.filter(s => s.total > 0);
  
  const mostRegular = [...activeClientsInLogs]
    .sort((a, b) => b.rate - a.rate || b.present - a.present)
    .slice(0, 5);

  // Weekday stats calculation
  const weekdayStats = new Map<number, { present: number; count: number }>();
  for (const [dateStr, stats] of dateLogMap.entries()) {
    // For local weekday correctly without timezone issues, use components
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const dayOfWeek = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])).getDay();
      const current = weekdayStats.get(dayOfWeek) || { present: 0, count: 0 };
      current.present += stats.present;
      current.count += 1;
      weekdayStats.set(dayOfWeek, current);
    }
  }

  const daysOfWeekNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const activeWeekdays = Array.from(weekdayStats.entries())
    .map(([dayOfWeek, stats]) => ({
      dayOfWeek,
      avg: stats.count > 0 ? stats.present / stats.count : 0
    }))
    .filter(d => d.avg > 0 || weekdayStats.get(d.dayOfWeek)!.count > 0);
  
  let highestWeekday = { name: 'N/A', avg: 0 };
  let lowestWeekday = { name: 'N/A', avg: 0 };
  
  if (activeWeekdays.length > 0) {
    activeWeekdays.sort((a, b) => b.avg - a.avg);
    highestWeekday = { name: daysOfWeekNames[activeWeekdays[0].dayOfWeek], avg: Math.round(activeWeekdays[0].avg) };
    lowestWeekday = { name: daysOfWeekNames[activeWeekdays[activeWeekdays.length - 1].dayOfWeek], avg: Math.round(activeWeekdays[activeWeekdays.length - 1].avg) };
  }



  // 3. Export to CSV (Excel format)
  const exportExcel = () => {
    // CSV Header
    let csvContent = '\uFEFF'; // UTF-8 BOM
    csvContent += 'Client Name,Phone,Status,Start Date,End Date,Days Present,Days Absent,Attendance Rate (%)\r\n';

    clientStats.forEach(s => {
      csvContent += `"${s.client.name.replace(/"/g, '""')}","${s.client.phone || ''}","${s.client.status}","${s.client.membership_start || ''}","${s.client.membership_end || ''}",${s.present},${s.absent},${s.rate}%\r\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${settings.gymName.replace(/\s+/g, '_')}_Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-6 py-6">
      {/* Title & Actions (hidden in print) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-800 dark:text-white tracking-tight">
            Analytics & Reports
          </h1>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mt-1">
            Analyze trends, identify key client patterns, and export database state.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={exportExcel}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4.5 py-2.5 text-sm font-bold text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <Download className="h-4.5 w-4.5 text-emerald-500" />
            Excel Export
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4.5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 cursor-pointer"
          >
            <Printer className="h-4.5 w-4.5" />
            Print / PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-[40vh] items-center justify-center text-zinc-400 font-medium">
          Compiling attendance reports...
        </div>
      ) : (
        <>
          {/* Summary Cards Grid */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900 print-card">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-bold uppercase tracking-wider">Total Attendance</span>
                <Users className="h-4.5 w-4.5 text-emerald-500" />
              </div>
              <p className="text-2xl font-black text-zinc-800 dark:text-white mt-2.5 leading-none">
                {presentTodayCount}
              </p>
              <p className="text-3xs text-zinc-400 dark:text-zinc-500 font-semibold mt-1">
                Members present today
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900 print-card">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-bold uppercase tracking-wider">Average Daily Attendance</span>
                <TrendingUp className="h-4.5 w-4.5 text-emerald-500" />
              </div>
              <p className="text-2xl font-black text-zinc-800 dark:text-white mt-2.5 leading-none">
                {avgDailyPresence} <span className="text-sm font-bold text-zinc-400">clients/day</span>
              </p>
              <p className="text-3xs text-zinc-400 dark:text-zinc-500 font-semibold mt-1">
                Calculated over {gymDays} open days
              </p>
            </div>
          </div>

          {/* Rankings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Most Regular */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 print-card">
              <h2 className="font-extrabold text-zinc-800 dark:text-white text-base border-b border-zinc-100 pb-3 mb-4 dark:border-zinc-800">
                Most Regular Members
              </h2>
              <div className="space-y-3">
                {mostRegular.length > 0 ? (
                  mostRegular.map((stat, idx) => (
                    <div key={stat.client.id} className="flex items-center justify-between text-sm">
                      <span className="font-bold text-zinc-700 dark:text-zinc-300">
                        {idx + 1}. {stat.client.name}
                      </span>
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
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 print-card">
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

          {/* Printable Report View (Visible only during printing) */}
          <div className="hidden print:block print-page-break print-card rounded-xl p-6 mt-10">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-black">{settings.gymName} Attendance Report</h1>
              <p className="text-xs text-gray-500 mt-1">Generated on {new Date().toLocaleDateString()}</p>
            </div>
            
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="py-2">Client Name</th>
                  <th className="py-2">Phone</th>
                  <th className="py-2">Status</th>
                  <th className="py-2 text-right">Days Present</th>
                  <th className="py-2 text-right">Days Absent</th>
                  <th className="py-2 text-right">Attendance Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {clientStats.map(s => (
                  <tr key={s.client.id}>
                    <td className="py-2 font-bold">{s.client.name}</td>
                    <td className="py-2">{s.client.phone || '-'}</td>
                    <td className="py-2">{s.client.status}</td>
                    <td className="py-2 text-right">{s.present}</td>
                    <td className="py-2 text-right">{s.absent}</td>
                    <td className="py-2 text-right font-bold">{s.rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
