import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { db } from '../services/db';
import { Attendance, MembershipHistory } from '../types';
import { ClientFormModal } from '../components/ClientFormModal';
import { ArrowLeft, User, Phone, FileText, Calendar, CheckCircle2, XCircle, Clock, Award, ShieldAlert, Edit2 } from 'lucide-react';

export const ClientDetailsPage: React.FC = () => {
  const { selectedClientId, clients, setActivePage } = useApp();
  const [attendanceLogs, setAttendanceLogs] = useState<Attendance[]>([]);
  const [membershipHistory, setMembershipHistory] = useState<MembershipHistory[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'attendance' | 'memberships'>('attendance');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const client = clients.find(c => c.id === selectedClientId);

  useEffect(() => {
    if (!selectedClientId || !client) return;

    const loadClientData = async () => {
      setLoadingDetails(true);
      try {
        // Query attendance from membership start date (or 90 days ago) to today
        const startDate = client.membership_start || '2026-01-01';
        const endDate = new Date().toISOString().split('T')[0];
        
        const [atts, hists] = await Promise.all([
          db.getAttendanceRange(startDate, endDate),
          db.getMembershipHistory(selectedClientId),
        ]);

        // Filter attendance for this specific client and sort by date descending
        const clientAtts = atts
          .filter(a => a.client_id === selectedClientId)
          .sort((a, b) => b.date.localeCompare(a.date));

        setAttendanceLogs(clientAtts);
        setMembershipHistory(hists);
      } catch (e) {
        console.error('Error loading client details:', e);
      } finally {
        setLoadingDetails(false);
      }
    };

    loadClientData();
  }, [selectedClientId, client]);

  if (!client) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center text-center p-6">
        <ShieldAlert className="h-12 w-12 text-rose-500 mb-4 animate-bounce" />
        <h2 className="text-xl font-bold text-zinc-800 dark:text-white">Client Not Found</h2>
        <button
          onClick={() => setActivePage('clients')}
          className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          Back to Directory
        </button>
      </div>
    );
  }

  // 1. Calculations
  const presentDays = attendanceLogs.filter(a => a.status === 'Present').length;
  const absentDays = attendanceLogs.filter(a => a.status === 'Absent').length;
  const totalDays = presentDays + absentDays;
  const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

  const lastVisitRecord = attendanceLogs.find(a => a.status === 'Present');
  const lastVisitDate = lastVisitRecord ? lastVisitRecord.date : 'No record';

  const isExpired = client.status === 'Expired';

  const getDaysRemaining = (endStr: string): { days: number; text: string } => {
    if (!endStr) return { days: 0, text: 'No End Date' };
    const end = new Date(endStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = end.getTime() - today.getTime();
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (days < 0) {
      return { days, text: `Expired ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} ago` };
    } else if (days === 0) {
      return { days, text: 'Expires Today' };
    } else {
      return { days, text: `${days} day${days !== 1 ? 's' : ''} remaining` };
    }
  };

  const remaining = getDaysRemaining(client.membership_end);

  const formatLongDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-6 py-6">
      {/* Back Button & Title */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActivePage('clients')}
            className="rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 transition shrink-0"
            aria-label="Back to Clients"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tracking-wider uppercase">
              Client Profile
            </span>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-zinc-800 dark:text-white tracking-tight truncate">
              {client.name}
            </h1>
          </div>
        </div>

        <button
          onClick={() => setIsEditModalOpen(true)}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 sm:px-4 text-sm font-bold text-white shadow-md shadow-emerald-500/10 hover:bg-emerald-500 transition active:scale-95 dark:bg-emerald-600 dark:hover:bg-emerald-500"
        >
          <Edit2 className="h-4.5 w-4.5" />
          <span className="hidden sm:inline">Edit Profile</span>
        </button>
      </div>

      {loadingDetails ? (
        <div className="flex h-[40vh] items-center justify-center text-zinc-400 font-medium">
          Loading client record details...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column: Personal info, Membership Details, Stats */}
          <div className="space-y-6">
            {/* Personal Details */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-sm font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-4">
                Personal Information
              </h2>
              <div className="space-y-3.5">
                <div className="flex items-start gap-3">
                  <User className="h-4.5 w-4.5 text-zinc-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">Full Name</p>
                    <p className="text-sm font-bold text-zinc-800 dark:text-white mt-0.5">{client.name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="h-4.5 w-4.5 text-zinc-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">Phone Number</p>
                    <p className="text-sm font-bold text-zinc-800 dark:text-white mt-0.5">{client.phone || 'Not available'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="h-4.5 w-4.5 text-zinc-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">Notes / Medical Conditions</p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-1 leading-relaxed bg-zinc-50 p-2.5 rounded-xl border border-zinc-100 dark:bg-zinc-800/50 dark:border-zinc-800/40">
                      {client.notes || 'No notes added for this client.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Membership status card */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-sm font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-4">
                Membership Details
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Status</span>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-2xs font-extrabold tracking-wide uppercase
                      ${
                        isExpired
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                      }`}
                  >
                    {client.status}
                  </span>
                </div>
                
                <div className="flex items-center justify-between border-t border-zinc-100 pt-3.5 dark:border-zinc-800">
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Remaining</span>
                  <span className={`text-sm font-bold ${isExpired ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {remaining.text}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-zinc-100 pt-3.5 dark:border-zinc-800">
                  <div>
                    <span className="text-3xs font-semibold text-zinc-400 uppercase tracking-wide">Start Date</span>
                    <p className="text-xs font-bold text-zinc-800 dark:text-white mt-0.5">{client.membership_start || 'Not set'}</p>
                  </div>
                  <div>
                    <span className="text-3xs font-semibold text-zinc-400 uppercase tracking-wide">End Date</span>
                    <p className="text-xs font-bold text-zinc-800 dark:text-white mt-0.5">{client.membership_end || 'Not set'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance stats summary */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-sm font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-4">
                Attendance Statistics
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-50 p-3 rounded-xl dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800/40">
                  <span className="text-3xs font-bold text-zinc-400 uppercase tracking-wide flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    Days Present
                  </span>
                  <p className="text-xl font-black text-zinc-800 dark:text-white mt-1.5">{presentDays}</p>
                </div>
                
                <div className="bg-zinc-50 p-3 rounded-xl dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800/40">
                  <span className="text-3xs font-bold text-zinc-400 uppercase tracking-wide flex items-center gap-1.5">
                    <XCircle className="h-3.5 w-3.5 text-rose-500" />
                    Days Absent
                  </span>
                  <p className="text-xl font-black text-zinc-800 dark:text-white mt-1.5">{absentDays}</p>
                </div>

                <div className="bg-zinc-50 p-3 rounded-xl dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800/40">
                  <span className="text-3xs font-bold text-zinc-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Award className="h-3.5 w-3.5 text-emerald-500" />
                    Attend Rate
                  </span>
                  <p className="text-xl font-black text-zinc-800 dark:text-white mt-1.5">{attendancePercentage}%</p>
                </div>

                <div className="bg-zinc-50 p-3 rounded-xl dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800/40">
                  <span className="text-3xs font-bold text-zinc-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-zinc-500" />
                    Last Visit
                  </span>
                  <p className="text-xs font-bold text-zinc-800 dark:text-white mt-2 truncate">{lastVisitDate}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Detailed Lists (Tabs) */}
          <div className="lg:col-span-2 rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden flex flex-col h-[600px] lg:h-auto">
            {/* Tabs Header */}
            <div className="flex border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
              <button
                onClick={() => setActiveTab('attendance')}
                className={`flex-1 px-6 py-4.5 text-sm font-bold text-center border-b-2 outline-none transition
                  ${
                    activeTab === 'attendance'
                      ? 'border-emerald-600 text-emerald-600 dark:border-emerald-500 dark:text-emerald-400'
                      : 'border-transparent text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300'
                  }`}
              >
                Attendance History ({attendanceLogs.length})
              </button>
              <button
                onClick={() => setActiveTab('memberships')}
                className={`flex-1 px-6 py-4.5 text-sm font-bold text-center border-b-2 outline-none transition
                  ${
                    activeTab === 'memberships'
                      ? 'border-emerald-600 text-emerald-600 dark:border-emerald-500 dark:text-emerald-400'
                      : 'border-transparent text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300'
                  }`}
              >
                Membership Cycles ({membershipHistory.length})
              </button>
            </div>

            {/* Tab Panel Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'attendance' ? (
                /* Attendance Logs list */
                attendanceLogs.length > 0 ? (
                  <div className="space-y-3.5">
                    {attendanceLogs.map(log => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between rounded-xl border border-zinc-200 p-4 dark:border-zinc-800/60 dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/10 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-white
                              ${log.status === 'Present' ? 'bg-emerald-500' : 'bg-rose-500'}`}
                          >
                            {log.status === 'Present' ? (
                              <CheckCircle2 className="h-4.5 w-4.5" />
                            ) : (
                              <XCircle className="h-4.5 w-4.5" />
                            )}
                          </span>
                          <div>
                            <p className="text-sm font-bold text-zinc-800 dark:text-white">
                              {formatLongDate(log.date)}
                            </p>
                            <p className="text-3xs text-zinc-400 dark:text-zinc-500 uppercase font-semibold mt-0.5">
                              Logged: {new Date(log.marked_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-xs font-black tracking-wide uppercase
                            ${log.status === 'Present' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                        >
                          {log.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-zinc-400 py-20">
                    <Calendar className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mb-2" />
                    <span className="text-sm font-semibold">No attendance logged yet.</span>
                  </div>
                )
              ) : (
                /* Membership History list */
                membershipHistory.length > 0 ? (
                  <div className="space-y-4 relative border-l border-zinc-300 ml-3.5 pl-5.5 dark:border-zinc-800">
                    {membershipHistory.map(hist => (
                      <div key={hist.id} className="relative py-1">
                        {/* Bullet Circle on Timeline */}
                        <div className="absolute -left-[31px] top-1.5 flex h-5.5 w-5.5 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-white dark:border-zinc-900 shadow-sm">
                          <Clock className="h-3.5 w-3.5" />
                        </div>
                        
                        <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800 bg-zinc-50/20 dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/10 transition-colors">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div>
                              <p className="text-sm font-bold text-zinc-800 dark:text-white">
                                {hist.start_date} to {hist.end_date}
                              </p>
                              <p className="text-3xs text-zinc-400 dark:text-zinc-500 uppercase font-semibold mt-0.5">
                                Renewed on: {new Date(hist.renewed_on).toLocaleDateString()}
                              </p>
                            </div>
                            <span className="inline-flex items-center rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-extrabold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 self-start sm:self-auto">
                              {hist.duration} Days Plan
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-zinc-400 py-20">
                    <Clock className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mb-2" />
                    <span className="text-sm font-semibold">No renewal history.</span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Form Modal overlay */}
      <ClientFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        clientId={client.id}
      />
    </div>
  );
};
