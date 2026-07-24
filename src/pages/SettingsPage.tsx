import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Settings, Save, ShieldCheck, Lock, Unlock, Play } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const {
    settings,
    updateSettings,
    addNotification,
    seedSupabase,
    refreshClients,
  } = useApp();

  const [gymName, setGymName] = useState(settings.gymName || '');
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl || '');
  const [theme, setThemeState] = useState(settings.theme || 'dark');
  const [gymLat, setGymLat] = useState(settings.gymLocationLat?.toString() || '');
  const [gymLng, setGymLng] = useState(settings.gymLocationLng?.toString() || '');
  const [gymRadius, setGymRadius] = useState(settings.gymLocationRadius?.toString() || '50');

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [isSeeding, setIsSeeding] = useState(false);

  // 1. Save general settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      ...settings,
      gymName: gymName.trim(),
      logoUrl: logoUrl,
      theme,
      gymLocationLat: gymLat ? parseFloat(gymLat) : undefined,
      gymLocationLng: gymLng ? parseFloat(gymLng) : undefined,
      gymLocationRadius: gymRadius ? parseFloat(gymRadius) : 50,
    });
  };

  // 2. Seed Supabase database
  const handleSeedSupabase = async () => {
    if (!window.confirm('This will seed mock data to your live Supabase database. Are you sure you want to proceed?')) {
      return;
    }

    setIsSeeding(true);
    const success = await seedSupabase();
    setIsSeeding(false);

    if (success) {
      refreshClients();
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 md:px-6 py-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-800 dark:text-white tracking-tight">
          System Settings
        </h1>
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mt-1">
          Customize configuration profiles, active databases, and system backups.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Main Settings Form */}
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Gym & Theme Options */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 md:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
            <h2 className="text-sm font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-2 mb-2">
              <Settings className="h-4.5 w-4.5 text-emerald-500" />
              General Preferences
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Gym Name
                </label>
                <input
                  type="text"
                  required
                  value={gymName}
                  onChange={e => setGymName(e.target.value)}
                  placeholder="e.g. Iron Temple Gym"
                  className="w-full rounded-xl border border-zinc-200 bg-transparent px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-800"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Gym Logo
                </label>
                <div className="flex items-center gap-3">
                  {logoUrl !== 'Dumbbell' && logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="h-10 w-10 rounded-full object-cover bg-zinc-100 dark:bg-zinc-800 shadow-lg shadow-emerald-500/30" />
                  ) : (
                    <div className="h-10 w-10 flex shrink-0 items-center justify-center rounded-full bg-emerald-600 dark:bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
                      <Settings className="h-5 w-5" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 2 * 1024 * 1024) {
                          alert('Please select an image smaller than 2MB');
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          setLogoUrl(evt.target?.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="block w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 dark:file:bg-emerald-500/10 dark:file:text-emerald-400 cursor-pointer"
                  />
                  {logoUrl !== 'Dumbbell' && (
                    <button type="button" onClick={() => setLogoUrl('Dumbbell')} className="text-xs text-rose-500 hover:underline">
                      Reset
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Display Theme
                </label>
                <select
                  value={theme}
                  onChange={e => setThemeState(e.target.value as 'light' | 'dark')}
                  className="w-full rounded-xl border border-zinc-200 bg-transparent px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <option value="light">Light Mode</option>
                  <option value="dark">Dark Mode</option>
                </select>
              </div>
            </div>
          </div>

          {/* Admin Locked Section */}
          {!isAdminAuthenticated ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 md:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-4 flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-2">
                <Lock className="h-6 w-6 text-red-500" />
              </div>
              <h2 className="text-lg font-bold text-zinc-800 dark:text-white">Admin Settings Locked</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                Enter the admin password to manage Gym Location.
              </p>
              <div className="flex w-full max-w-xs items-center gap-2">
                <input
                  type="password"
                  placeholder="Password"
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (adminPasswordInput === '640') {
                        setIsAdminAuthenticated(true);
                        setAdminPasswordInput('');
                        addNotification('success', 'Admin settings unlocked!');
                      } else {
                        addNotification('error', 'Incorrect password!');
                      }
                    }
                  }}
                  className="flex-1 rounded-xl border border-zinc-200 bg-transparent px-4 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-800"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (adminPasswordInput === '640') {
                      setIsAdminAuthenticated(true);
                      setAdminPasswordInput('');
                      addNotification('success', 'Admin settings unlocked!');
                    } else {
                      addNotification('error', 'Incorrect password!');
                    }
                  }}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 transition"
                >
                  Unlock
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Gym Location Settings (Admin) */}
              <div className="rounded-2xl border border-emerald-500/30 bg-white p-5 md:p-6 shadow-sm dark:bg-zinc-900 space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
                  <Unlock className="h-3 w-3" /> UNLOCKED
                </div>
                <h2 className="text-sm font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider flex items-center gap-2 mb-2">
                  <ShieldCheck className="h-4.5 w-4.5" />
                  Gym Location (Admin)
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Gym Latitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={gymLat}
                      onChange={e => setGymLat(e.target.value)}
                      placeholder="e.g. 40.7128"
                      className="w-full rounded-xl border border-zinc-200 bg-transparent px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-800"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Gym Longitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={gymLng}
                      onChange={e => setGymLng(e.target.value)}
                      placeholder="e.g. -74.0060"
                      className="w-full rounded-xl border border-zinc-200 bg-transparent px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-800"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Check-In Radius (meters)
                    </label>
                    <input
                      type="number"
                      value={gymRadius}
                      onChange={e => setGymRadius(e.target.value)}
                      placeholder="e.g. 50"
                      className="w-full rounded-xl border border-zinc-200 bg-transparent px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-800"
                    />
                  </div>
                </div>
                
                {/* Seed button */}
                <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-emerald-500/20">
                  <button
                    type="button"
                    onClick={handleSeedSupabase}
                    disabled={isSeeding}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-extrabold text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer disabled:opacity-50"
                  >
                    <Play className="h-4 w-4 text-emerald-500 animate-pulse" />
                    {isSeeding ? 'Writing Seed...' : 'Seed Mock Data'}
                  </button>
                  <p className="text-xs text-zinc-400">Inserts mock clients for testing purposes.</p>
                </div>
              </div>
            </div>
          )}

          {/* Submit General Settings */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/10 hover:bg-emerald-500 transition cursor-pointer dark:bg-emerald-600 dark:hover:bg-emerald-500"
            >
              <Save className="h-4.5 w-4.5" />
              Save Configurations
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

