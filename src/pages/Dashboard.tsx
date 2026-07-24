import React from 'react';
import { useApp } from '../context/AppContext';
import { Users, UserCheck, UserX, AlertTriangle, XCircle, ChevronRight } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { clients, attendance, setActivePage } = useApp();

  // 1. Calculations
  const totalClients = clients.length;

  const todayStr = new Date().toISOString().split('T')[0];
  const sevenDaysFromNowStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const presentToday = attendance.filter(a => a.status === 'Present' && a.date === todayStr).length;
  const absentToday = attendance.filter(a => a.status === 'Absent' && a.date === todayStr).length;

  const expiringThisWeek = clients.filter(c => {
    if (!c.membership_end || c.status === 'Expired') return false;
    return c.membership_end >= todayStr && c.membership_end <= sevenDaysFromNowStr;
  }).length;

  const statsCards = [
    {
      title: 'Total Clients',
      value: totalClients,
      icon: Users,
      color: 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/15 dark:text-emerald-400',
      action: () => setActivePage('clients'),
    },
    {
      title: 'Present Today',
      value: presentToday,
      icon: UserCheck,
      color: 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/15 dark:text-emerald-400',
      action: () => setActivePage('attendance'),
    },
    {
      title: 'Absent Today',
      value: absentToday,
      icon: UserX,
      color: 'bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-500/10 dark:border-rose-500/15 dark:text-rose-400',
      action: () => setActivePage('attendance'),
    },
    {
      title: 'Expiring 7 Days',
      value: expiringThisWeek,
      icon: AlertTriangle,
      color: 'bg-amber-50 border-amber-100 text-amber-600 dark:bg-amber-500/10 dark:border-amber-500/15 dark:text-amber-400',
      action: () => setActivePage('expiring'),
    },
  ];

  // Expiring memberships list for quick dashboard viewing
  const quickExpiring = clients
    .filter(c => {
      if (!c.membership_end) return false;
      return c.membership_end >= todayStr && c.membership_end <= sevenDaysFromNowStr;
    })
    .slice(0, 5); // Show top 5 instead of 3 since it has more space now

  return (
    <div className="space-y-6 md:space-y-8 max-w-7xl mx-auto px-4 md:px-6 py-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-medium text-zinc-800 dark:text-white">
          Dashboard Overview
        </h1>
        <p className="text-sm font-normal text-zinc-500 dark:text-zinc-400 mt-1">
          Real-time insights and attendance statistics for today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <button
              key={idx}
              onClick={card.action}
              className={`flex flex-col justify-between rounded-2xl border p-4 text-left shadow-sm transition-all duration-200 hover:-tranzinc-y-0.5 hover:shadow-md outline-none
                ${card.color}`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-sm font-normal opacity-80">
                  {card.title}
                </span>
                <Icon className="h-5 w-5 opacity-70" />
              </div>
              <span className="text-lg md:text-xl font-medium mt-3 leading-none">
                {card.value}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 gap-6">
        {/* Expiring Subscriptions List */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 flex flex-col">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4 dark:border-zinc-800">
            <h2 className="font-medium text-zinc-700 dark:text-zinc-300 text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Expiring This Week
            </h2>
            <button
              onClick={() => setActivePage('expiring')}
              className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
            >
              View All <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          <div className="flex-1 divide-y divide-zinc-100 dark:divide-zinc-800">
            {quickExpiring.length > 0 ? (
              quickExpiring.map(client => {
                const diffTime = new Date(client.membership_end!).getTime() - new Date().getTime();
                const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

                return (
                  <div key={client.id} className="flex items-center justify-between py-3.5 first:pt-1 last:pb-1">
                    <div>
                      <h3 className="font-medium text-zinc-800 dark:text-white text-sm">
                        {client.name}
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {client.phone}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-normal
                          ${
                            daysRemaining === 0
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                          }`}
                      >
                        {daysRemaining === 0 ? 'Expires Today' : `${daysRemaining} Days Left`}
                      </span>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 font-normal">
                        Ends: {client.membership_end}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex h-full flex-col items-center justify-center py-10 text-zinc-400">
                <span className="text-sm font-medium">No expiring memberships this week!</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
