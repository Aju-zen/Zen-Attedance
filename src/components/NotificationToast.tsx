import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export const NotificationToast: React.FC = () => {
  const { notifications, clearNotification } = useApp();

  // Handle auto-dismissal
  useEffect(() => {
    if (notifications.length === 0) return;

    // Set a timer for the oldest notification
    const oldest = notifications[notifications.length - 1];
    const timer = setTimeout(() => {
      clearNotification(oldest.id);
    }, 5000);

    return () => clearTimeout(timer);
  }, [notifications, clearNotification]);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2 p-4 sm:p-0 no-print">
      {notifications.map(n => {
        let Icon = Info;
        let iconColor = 'text-emerald-500';
        let bgColor = 'bg-emerald-50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/40';
        let textColor = 'text-emerald-800 dark:text-emerald-200';

        switch (n.type) {
          case 'success':
            Icon = CheckCircle2;
            iconColor = 'text-emerald-500';
            bgColor = 'bg-emerald-50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/40';
            textColor = 'text-emerald-800 dark:text-emerald-200';
            break;
          case 'warning':
            Icon = AlertTriangle;
            iconColor = 'text-amber-500';
            bgColor = 'bg-amber-50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/40';
            textColor = 'text-amber-800 dark:text-amber-200';
            break;
          case 'error':
            Icon = AlertCircle;
            iconColor = 'text-rose-500';
            bgColor = 'bg-rose-50 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/40';
            textColor = 'text-rose-800 dark:text-rose-200';
            break;
        }

        return (
          <div
            key={n.id}
            className={`flex w-full items-start gap-3 rounded-2xl border p-4 shadow-lg backdrop-blur-md transition-all duration-300 animate-slide-in
              ${bgColor} ${textColor}`}
          >
            <Icon className={`h-5 w-5 shrink-0 ${iconColor}`} />
            <div className="flex-1 text-sm font-medium leading-normal">{n.message}</div>
            <button
              onClick={() => clearNotification(n.id)}
              className="rounded-lg p-0.5 hover:bg-black/5 dark:hover:bg-white/5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              aria-label="Dismiss Notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
