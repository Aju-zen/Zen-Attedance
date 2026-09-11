import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Settings, Save, MapPin, ShieldCheck, Lock, Unlock, Play, Trash2, Download, Upload, Database, FileJson, CheckCircle2, AlertTriangle, X, RefreshCw, Layers, CalendarCheck } from 'lucide-react';
import { DatabaseBackup } from '../types';

export const SettingsPage: React.FC = () => {
  const {
    settings,
    updateSettings,
    addNotification,
    seedSupabase,
    deleteMockData,
    refreshClients,
    exportBackup,
    parseBackupFile,
    importBackup,
    importInitialClients,
    importSeptemberAttendance,
  } = useApp();

  const [gymName, setGymName] = useState(settings.gymName || '');
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl || '');
  const [theme, setThemeState] = useState(settings.theme || 'dark');
  const [gymLat, setGymLat] = useState(settings.gymLocationLat?.toString() || '');
  const [gymLng, setGymLng] = useState(settings.gymLocationLng?.toString() || '');
  const [gymRadius, setGymRadius] = useState(settings.gymLocationRadius?.toString() || '50');
  const [enableTestMode, setEnableTestMode] = useState(settings.enableTestMode || false);

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [isSeeding, setIsSeeding] = useState(false);
  const [isDeletingMock, setIsDeletingMock] = useState(false);
  const [isImportingRoster, setIsImportingRoster] = useState(false);
  const [isImportingAttendance, setIsImportingAttendance] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<DatabaseBackup | null>(null);
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportRoster = async () => {
    if (!window.confirm('Import 75 member records and set the custom list order?')) {
      return;
    }
    setIsImportingRoster(true);
    await importInitialClients();
    setIsImportingRoster(false);
  };

  const handleImportSeptAttendance = async () => {
    if (!window.confirm('Import attendance records for Sept 1 to Sept 9 (164 attendance entries across 75 clients)?')) {
      return;
    }
    setIsImportingAttendance(true);
    await importSeptemberAttendance();
    setIsImportingAttendance(false);
  };

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
      enableTestMode: enableTestMode,
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

  // 3. Delete Mock Data from Supabase
  const handleDeleteMockData = async () => {
    if (!window.confirm('Are you sure you want to delete all mock data from your database? This will permanently remove seeded mock clients and their attendance logs.')) {
      return;
    }

    setIsDeletingMock(true);
    const success = await deleteMockData();
    setIsDeletingMock(false);

    if (success) {
      refreshClients();
    }
  };

  // 4. Export Database Backup
  const handleExportBackup = async () => {
    setIsExporting(true);
    await exportBackup();
    setIsExporting(false);
  };

  // 5. Select File for Import
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseBackupFile(file);
      setPendingBackup(parsed);
    } catch (err: any) {
      addNotification('error', err.message || 'Invalid backup file');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 6. Confirm and Run Restore
  const handleConfirmRestore = async () => {
    if (!pendingBackup) return;
    setIsImporting(true);
    const success = await importBackup(pendingBackup, restoreMode);
    setIsImporting(false);
    if (success) {
      setPendingBackup(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 md:px-6 py-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-800 dark:text-white tracking-tight flex items-center gap-3">
          System Settings
          {import.meta.env.VITE_SUPABASE_URL ? (
            <span className="text-xs bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-full border border-emerald-500/20 font-bold">Cloud Connected</span>
          ) : (
            <span className="text-xs bg-red-500/10 text-red-500 px-2 py-1 rounded-full border border-red-500/20 font-bold">Cloud Disconnected (Missing VITE_ Keys)</span>
          )}
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
                    <div className="h-10 w-10 flex shrink-0 items-center justify-center rounded-full bg-emerald-600 dark:bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 overflow-hidden">
                      <img src="/logo.png" alt="Logo" className="h-full w-full object-contain p-1" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          const img = new Image();
                          img.onload = () => {
                            // Resize image using canvas to ensure payload is tiny (prevents Supabase 413 Payload Too Large)
                            const canvas = document.createElement('canvas');
                            const MAX_WIDTH = 256;
                            const MAX_HEIGHT = 256;
                            let width = img.width;
                            let height = img.height;
                            
                            if (width > height) {
                              if (width > MAX_WIDTH) {
                                height = Math.round((height * MAX_WIDTH) / width);
                                width = MAX_WIDTH;
                              }
                            } else {
                              if (height > MAX_HEIGHT) {
                                width = Math.round((width * MAX_HEIGHT) / height);
                                height = MAX_HEIGHT;
                              }
                            }
                            
                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            if (ctx) {
                              ctx.drawImage(img, 0, 0, width, height);
                              // Compress to webp or jpeg
                              const compressedBase64 = canvas.toDataURL('image/webp', 0.8);
                              setLogoUrl(compressedBase64);
                            } else {
                              // Fallback if canvas fails for some reason
                              setLogoUrl(evt.target?.result as string);
                            }
                          };
                          img.src = evt.target?.result as string;
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
                Enter the admin password to access Database Backup/Export, Restore/Import, and Gym Location controls.
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
              {/* Database Backup & Disaster Recovery Card (Inside Admin Settings) */}
              <div className="rounded-2xl border border-emerald-500/30 bg-white p-5 md:p-6 shadow-sm dark:bg-zinc-900 space-y-4 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider flex items-center gap-2">
                      <Database className="h-4.5 w-4.5" />
                      Database Export & Import (Admin)
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Export entire database tables to a JSON backup or restore from a previous backup snapshot.
                    </p>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 self-start sm:self-auto shrink-0">
                    Full DB Backup
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  {/* Export Card */}
                  <div className="flex flex-col justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-sm font-bold text-zinc-800 dark:text-white">Export Full Database</span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        Downloads an exact JSON backup containing all <strong>Clients</strong>, <strong>Attendance Records</strong>, <strong>Membership Histories</strong>, <strong>Device Check-ins</strong>, <strong>Settings</strong>, and <strong>Custom Client Order</strong>.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportBackup}
                      disabled={isExporting}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white px-4 py-2.5 text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {isExporting ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          Generating Backup...
                        </>
                      ) : (
                        <>
                          <Download className="h-3.5 w-3.5" />
                          Export Data (.json)
                        </>
                      )}
                    </button>
                  </div>

                  {/* Import Card */}
                  <div className="flex flex-col justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Upload className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-sm font-bold text-zinc-800 dark:text-white">Import Database Backup</span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        Upload a previously exported backup file (<code className="font-mono text-3xs bg-zinc-200 dark:bg-zinc-700 px-1 py-0.5 rounded">.json</code>) to restore your entire database or recover deleted data.
                      </p>
                    </div>
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json,application/json"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isImporting}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white px-4 py-2.5 text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Import Backup File (.json)
                      </button>
                    </div>
                  </div>
                </div>
              </div>

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

                <div className="mt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableTestMode}
                      onChange={(e) => setEnableTestMode(e.target.checked)}
                      className="w-4 h-4 text-emerald-500 rounded focus:ring-emerald-500 dark:ring-offset-zinc-900 focus:ring-2 bg-zinc-100 border-zinc-300 dark:bg-zinc-800 dark:border-zinc-700"
                    />
                    <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                      Enable Test Mode (Show Reset Test Data Button)
                    </span>
                  </label>
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        (position) => {
                          setGymLat(position.coords.latitude.toString());
                          setGymLng(position.coords.longitude.toString());
                          addNotification('success', 'Location updated to your current position.');
                        },
                        (err) => {
                          addNotification('error', 'Could not get location. Ensure GPS is enabled.');
                        },
                        { enableHighAccuracy: true }
                      );
                    } else {
                      addNotification('error', 'Geolocation not supported by this browser.');
                    }
                  }}
                  className="rounded-lg bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400 transition mt-2 flex items-center gap-2"
                >
                  <MapPin className="h-4 w-4" />
                  Set to My Current Location
                </button>
                
                {/* Seed and Delete Mock Data buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-emerald-500/20">
                  <button
                    type="button"
                    onClick={handleSeedSupabase}
                    disabled={isSeeding || isDeletingMock}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-extrabold text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer disabled:opacity-50 transition"
                  >
                    <Play className="h-4 w-4 text-emerald-500" />
                    {isSeeding ? 'Writing Seed...' : 'Seed Mock Data'}
                  </button>

                  <button
                    type="button"
                    onClick={handleImportRoster}
                    disabled={isImportingRoster || isImportingAttendance || isSeeding || isDeletingMock}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-extrabold text-emerald-700 dark:text-emerald-300 shadow-2xs hover:bg-emerald-500/20 cursor-pointer disabled:opacity-50 transition"
                  >
                    <Layers className="h-4 w-4 text-emerald-500" />
                    {isImportingRoster ? 'Importing 75 Clients...' : 'Import 75 Client Roster'}
                  </button>

                  <button
                    type="button"
                    onClick={handleImportSeptAttendance}
                    disabled={isImportingAttendance || isImportingRoster || isSeeding || isDeletingMock}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2.5 text-xs font-extrabold text-indigo-700 dark:text-indigo-300 shadow-2xs hover:bg-indigo-500/20 cursor-pointer disabled:opacity-50 transition"
                  >
                    <CalendarCheck className="h-4 w-4 text-indigo-500" />
                    {isImportingAttendance ? 'Importing Attendance...' : 'Import Sept 1-9 Attendance'}
                  </button>

                  <button
                    type="button"
                    onClick={handleDeleteMockData}
                    disabled={isSeeding || isDeletingMock}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/50 px-4 py-2.5 text-xs font-extrabold text-rose-600 shadow-2xs hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-950/50 cursor-pointer disabled:opacity-50 transition"
                  >
                    <Trash2 className="h-4 w-4 text-rose-500" />
                    {isDeletingMock ? 'Deleting Mock Data...' : 'Delete Mock Data'}
                  </button>

                  <p className="text-xs text-zinc-400">Seed sample records or remove all mock testing data.</p>
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

      {/* Backup Confirmation & Restore Preview Modal */}
      {pendingBackup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <FileJson className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Restore Database Backup</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Exported on {new Date(pendingBackup.exported_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPendingBackup(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body: Stats Breakdown */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60 text-center">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Clients</span>
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                    {pendingBackup.summary?.clients_count ?? pendingBackup.data.clients?.length ?? 0}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60 text-center">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Attendance</span>
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                    {pendingBackup.summary?.attendance_count ?? pendingBackup.data.attendance?.length ?? 0}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60 text-center">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Renewals</span>
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                    {pendingBackup.summary?.membership_history_count ?? pendingBackup.data.membership_history?.length ?? 0}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60 text-center">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Check-ins</span>
                  <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                    {pendingBackup.summary?.device_checkins_count ?? pendingBackup.data.device_checkins?.length ?? 0}
                  </span>
                </div>
              </div>

              {/* Restore Mode Choice */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
                  Select Restore Strategy:
                </label>
                <div className="space-y-2">
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      restoreMode === 'replace'
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-500/60'
                        : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="restoreMode"
                      checked={restoreMode === 'replace'}
                      onChange={() => setRestoreMode('replace')}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-zinc-800 dark:text-white block">
                        Full Restore (Wipe & Replace) - Recommended
                      </span>
                      <span className="text-3xs text-zinc-500 dark:text-zinc-400 block mt-0.5">
                        Clears existing database records and perfectly restores all data from the backup snapshot.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      restoreMode === 'merge'
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-500/60'
                        : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="restoreMode"
                      checked={restoreMode === 'merge'}
                      onChange={() => setRestoreMode('merge')}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-zinc-800 dark:text-white block">
                        Merge / Upsert Only
                      </span>
                      <span className="text-3xs text-zinc-500 dark:text-zinc-400 block mt-0.5">
                        Keeps existing database records, overwriting matching records and appending new ones.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Warning Notice */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <p className="text-3xs sm:text-xs leading-relaxed">
                  This action writes data directly to your connected database. All relations and UUIDs from the backup will be restored.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-zinc-50 dark:bg-zinc-800/40 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                disabled={isImporting}
                onClick={() => setPendingBackup(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-700 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isImporting}
                onClick={handleConfirmRestore}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Restoring Database...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Confirm & Restore Data
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

