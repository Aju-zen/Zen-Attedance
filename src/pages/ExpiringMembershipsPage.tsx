import React from 'react';
import { useApp } from '../context/AppContext';
import { AlertTriangle, Clock, Calendar, Phone, ArrowRight } from 'lucide-react';

export const ExpiringMembershipsPage: React.FC = () => {
  const { clients, setActivePage } = useApp();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Helper to calculate days remaining
  const getDaysRemaining = (endStr: string): number | null => {
    if (!endStr) return null;
    const end = new Date(endStr);
    const diffTime = end.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Group clients - ONLY memberships expiring between 8 and 30 days
  const expiring8to30Days = clients.filter(c => {
    if (!c.membership_end || c.status === 'Expired') return false;
    const days = getDaysRemaining(c.membership_end);
    return days !== null && days > 7 && days <= 30;
  }).sort((a, b) => a.membership_end.localeCompare(b.membership_end));

  const renderClientRow = (client: typeof clients[0], days: number) => {
    return (
      <div
        key={client.id}
        onClick={() => setActivePage('client-detail', client.id)}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-zinc-200 bg-zinc-50/20 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:bg-zinc-800/30 transition-all cursor-pointer group"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-zinc-800 dark:text-white text-sm group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              {client.name}
            </h3>
            {client.membership_number && (
              <span className="text-2xs font-semibold text-zinc-400 dark:text-zinc-500">
                #{client.membership_number}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400 dark:text-zinc-500">
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {client.phone || 'No phone'}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Ends: {client.membership_end}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-0 border-zinc-100 pt-2.5 sm:pt-0 dark:border-zinc-800">
          <span
            className="inline-flex items-center rounded-full px-3 py-1 text-2xs font-extrabold tracking-wide uppercase shadow-2xs bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
          >
            {days} Days Remaining
          </span>

          <ArrowRight className="hidden sm:block h-4 w-4 text-zinc-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all dark:text-zinc-600" />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 md:space-y-8 max-w-7xl mx-auto px-4 md:px-6 py-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-800 dark:text-white tracking-tight">
          Upcoming Expiring Subscriptions (8 to 30 Days)
        </h1>
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mt-1">
          Review upcoming memberships expiring in the next 8 to 30 days. Subscriptions expiring within 7 days are shown on the Home Dashboard.
        </p>
      </div>

      {/* 8 to 30 Days Section */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 md:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
        <div className="flex items-center gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
          <Clock className="h-5 w-5 text-amber-500" />
          <h2 className="font-extrabold text-zinc-800 dark:text-white text-base">
            Expiring in 8 to 30 Days
          </h2>
          <span className="ml-auto rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-extrabold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
            {expiring8to30Days.length}
          </span>
        </div>

        <div className="space-y-3">
          {expiring8to30Days.length > 0 ? (
            expiring8to30Days.map(client => {
              const days = getDaysRemaining(client.membership_end)!;
              return renderClientRow(client, days);
            })
          ) : (
            <div className="flex flex-col items-center justify-center text-zinc-400 py-8">
              <span className="text-sm font-semibold">No upcoming expirations in the 8-30 day window.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
