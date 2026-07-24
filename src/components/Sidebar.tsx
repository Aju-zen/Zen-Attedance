import React from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  Clock,
  BarChart3,
  Settings,
  Dumbbell,
  Moon,
  Sun,
  Database
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activePage, setActivePage, settings, setTheme } = useApp();

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'attendance', label: 'Logs', icon: CalendarCheck },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'expiring', label: 'Expiring', icon: Clock, desktopOnly: true },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const currentTheme = settings.theme;

  return (
    <>
      {/* Sticky Mobile Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-zinc-200 bg-white/90 backdrop-blur-md px-4 py-3 shadow-sm md:hidden dark:border-zinc-800 dark:bg-zinc-900/90 no-print">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 dark:bg-emerald-500 text-white overflow-hidden shrink-0 shadow-lg shadow-emerald-500/30">
            {settings.logoUrl && settings.logoUrl !== 'Dumbbell' ? (
              <img src={settings.logoUrl} alt="Logo" className="h-full w-full object-cover" />
            ) : (
              <Dumbbell className="h-5 w-5" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-zinc-800 dark:text-white text-lg tracking-tight leading-tight">
              {settings.gymName}
            </span>
            <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500">
              Zen Tracker
            </span>
          </div>
        </div>

        <button
          onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')}
          className="rounded-full bg-zinc-100 p-2 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors"
          aria-label="Toggle Theme"
        >
          {currentTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </header>

      {/* Bottom Navigation for Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-zinc-200 bg-white pb-safe pt-2 px-1 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] md:hidden dark:border-zinc-800 dark:bg-zinc-900 no-print">
        {navItems.filter(item => !item.desktopOnly).map(item => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`flex flex-col items-center justify-center w-full py-1 gap-1 transition-all
                ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
            >
              <div className={`flex items-center justify-center rounded-xl p-1.5 transition-all ${isActive ? 'bg-emerald-50 dark:bg-emerald-500/15' : ''}`}>
                <Icon className={`h-5 w-5 md:h-6 md:w-6 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              </div>
              <span className={`text-[10px] font-semibold tracking-wide ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Navigation Sidebar (Desktop) */}
      <aside className="hidden md:flex sticky top-0 z-30 h-screen w-64 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 no-print">
        {/* Sidebar Header */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 dark:bg-emerald-500 text-white overflow-hidden shadow-lg shadow-emerald-500/30">
            {settings.logoUrl && settings.logoUrl !== 'Dumbbell' ? (
              <img src={settings.logoUrl} alt="Logo" className="h-full w-full object-cover" />
            ) : (
              <Dumbbell className="h-6 w-6" />
            )}
          </div>
          <div className="overflow-hidden">
            <h1 className="font-bold text-zinc-800 dark:text-white text-lg leading-tight truncate">
              {settings.gymName}
            </h1>
            <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">
              Zen Tracker
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1.5 px-4 py-6 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-150
                  ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                      : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-200'
                  }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
          {/* Connection Status Badge */}
          <div className="flex items-center justify-between rounded-xl bg-zinc-50 p-3.5 text-xs dark:bg-zinc-800/40">
            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
              <Database className="h-4 w-4 text-emerald-500" />
              <span className="font-medium">DB:</span>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 font-bold tracking-wide uppercase
                ${
                  settings.useSupabase
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                }`}
            >
              {settings.useSupabase ? 'Supabase' : 'Offline'}
            </span>
          </div>

          {/* Theme Toggler (Desktop Only) */}
          <button
            onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')}
            className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-200 transition-all"
          >
            <div className="flex items-center gap-3">
              {currentTheme === 'dark' ? (
                <>
                  <Sun className="h-5 w-5 text-amber-500 animate-pulse" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="h-5 w-5 text-emerald-500" />
                  <span>Dark Mode</span>
                </>
              )}
            </div>
          </button>
        </div>
      </aside>
    </>
  );
};
