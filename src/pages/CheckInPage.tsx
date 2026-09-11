import React, { useState, useEffect, useCallback } from 'react';
import { db, defaultSettings } from '../services/db';
import { GymSettings, LeaderboardEntry } from '../types';
import { Trophy, Medal, Award, Flame, UserCheck, ArrowLeft, Search, X } from 'lucide-react';

export const CheckInPage: React.FC = () => {
  const [step, setStep] = useState<'request_location' | 'verifying' | 'input' | 'success' | 'error'>('request_location');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Auto-load remembered membership number from this device's localStorage
  const [membershipNumber, setMembershipNumber] = useState(() => {
    return localStorage.getItem('client_saved_membership') || '';
  });
  
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successDetails, setSuccessDetails] = useState<any>(null);
  const [failCount, setFailCount] = useState(0);

  // Leaderboard View State (Accessible anytime without location requirement)
  const [showLeaderboardView, setShowLeaderboardView] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<{
    top10: LeaderboardEntry[];
    allRanked: LeaderboardEntry[];
  }>({ top10: [], allRanked: [] });
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  // Fetch leaderboard data
  const fetchLeaderboard = useCallback(() => {
    setLoadingLeaderboard(true);
    db.getLeaderboard()
      .then(data => {
        setLeaderboardData(data);
      })
      .catch(err => {
        console.error('Error loading leaderboard:', err);
      })
      .finally(() => {
        setLoadingLeaderboard(false);
      });
  }, []);

  // Distance calculation function (Haversine)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const p1 = lat1 * Math.PI/180;
    const p2 = lat2 * Math.PI/180;
    const dp = (lat2-lat1) * Math.PI/180;
    const dl = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(dp/2) * Math.sin(dp/2) +
              Math.cos(p1) * Math.cos(p2) *
              Math.sin(dl/2) * Math.sin(dl/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const [gymSettings, setGymSettings] = useState<GymSettings>(defaultSettings);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  
  useEffect(() => {
    db.getGlobalSettings().then(settings => {
      if (settings) {
        setGymSettings(prev => ({ ...prev, ...settings }));
      }
      setIsLoadingSettings(false);
    });
    // Pre-fetch leaderboard so it's instantly available
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const requestLocation = useCallback((isRetry = false) => {
    setStep('verifying');
    setErrorMessage('');

    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your browser.');
      setStep('error');
      return;
    }

    const startTime = Date.now();

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.error('Geolocation error:', error);
        
        let msg = 'An unknown error occurred while verifying location.';
        if (error.code === 1) {
          msg = 'Location permission is required to mark attendance. Please allow it and refresh the page.';
        } else if (error.code === 3) {
          msg = 'Location request timed out. Please ensure your GPS is on and try again.';
        } else if (error.code === 2) {
          msg = 'Location information is unavailable. Please check your GPS connection.';
        }

        if (isRetry) {
          const elapsedTime = Date.now() - startTime;
          const waitTime = Math.max(0, 15000 - elapsedTime);
          setTimeout(() => {
            setErrorMessage(msg);
            setStep('error');
          }, waitTime);
        } else {
          setErrorMessage(msg);
          setStep('error');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  }, []);

  useEffect(() => {
    requestLocation(false);
  }, [requestLocation]);

  // Client-side location verification
  useEffect(() => {
    if (location && !isLoadingSettings && step === 'verifying') {
      if (gymSettings.gymLocationLat && gymSettings.gymLocationLng) {
        const dist = calculateDistance(
          location.lat, 
          location.lng, 
          gymSettings.gymLocationLat, 
          gymSettings.gymLocationLng
        );
        const radius = gymSettings.gymLocationRadius || 50;
        
        if (dist > radius) {
          setErrorMessage('You are not inside the gym.');
          setStep('error');
          return;
        }
      }
      setStep('input');
    }
  }, [location, isLoadingSettings, gymSettings, step]);

  if (isLoadingSettings) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const getDeviceFingerprint = () => {
    let fp = localStorage.getItem('device_fingerprint');
    if (!fp) {
      fp = crypto.randomUUID();
      localStorage.setItem('device_fingerprint', fp);
    }
    return fp;
  };

  const handleMembershipChange = (val: string) => {
    setMembershipNumber(val);
    // Persist on device immediately so user never has to re-enter
    localStorage.setItem('client_saved_membership', val.trim());
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNum = membershipNumber.trim();
    if (!cleanNum) return;

    // Save remembered membership number to this device's storage
    localStorage.setItem('client_saved_membership', cleanNum);

    if (failCount >= 10) {
      setErrorMessage('Too many failed attempts. Please try again later.');
      setStep('error');
      return;
    }

    setSubmitting(true);
    
    try {
      const fp = getDeviceFingerprint();
      const userAgent = navigator.userAgent;
      
      const res = await db.processSelfCheckIn({
        membershipNumber: cleanNum,
        deviceFingerprint: fp,
        latitude: location?.lat || 0,
        longitude: location?.lng || 0,
        browser: userAgent,
        ipAddress: 'client-side'
      });

      if (res.success) {
        setSuccessDetails(res.details);
        setStep('success');
        fetchLeaderboard();
      } else {
        setFailCount(prev => prev + 1);
        setErrorMessage(res.error || 'Check-in failed');
        setStep('error');
      }
    } catch (error: any) {
      console.error(error);
      setFailCount(prev => prev + 1);
      setErrorMessage(error.message || 'An unexpected error occurred.');
      setStep('error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClearTestData = async () => {
    if (!window.confirm("This will clear your device's fingerprint history for today so you can check in a different member for testing. Continue?")) return;
    localStorage.removeItem('device_fingerprint');
    localStorage.removeItem('client_saved_membership');
    setErrorMessage('');
    setStep('input');
    setMembershipNumber('');
    alert("Device info cleared! You can now check in another member.");
  };

  const currentMonthName = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

  // Current remembered / entered membership number
  const activeUserMem = (membershipNumber || localStorage.getItem('client_saved_membership') || '').trim().toLowerCase();

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 text-zinc-100 relative">
      
      {/* Top Action Bar */}
      {gymSettings.enableTestMode && (
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button 
            onClick={handleClearTestData}
            className="bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg text-xs font-mono transition-colors"
            title="Clear device history for testing"
          >
            [Dev: Reset Test Data]
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. STANDALONE LEADERBOARD VIEW (Top 10 + Current User Position Fallback)    */}
      {/* ========================================================================= */}
      {showLeaderboardView ? (
        <div className="bg-zinc-800 p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-lg border border-zinc-700 transition-all space-y-5">
          {/* Header - Only one back button on top left */}
          <div className="flex items-center justify-between border-b border-zinc-700 pb-3">
            <button
              onClick={() => setShowLeaderboardView(false)}
              className="flex items-center gap-1.5 text-xs font-bold text-zinc-300 hover:text-white bg-zinc-700/60 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Check-In</span>
            </button>

            <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 px-2.5 py-1 rounded-md border border-amber-500/30">
              {currentMonthName}
            </span>
          </div>

          {/* Title Banner */}
          <div className="text-center space-y-1">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-amber-400/15 text-amber-400 mb-1 border border-amber-400/30 shadow-lg shadow-amber-500/10">
              <Trophy className="h-6 w-6 animate-pulse" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Monthly Leaderboard
            </h2>
            <p className="text-xs text-zinc-400">
              Top 10 attendance turnout for {currentMonthName}. Resets on the 1st of every month.
            </p>
          </div>

          {/* Top 10 Leaderboard List */}
          {loadingLeaderboard ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mb-3"></div>
              <span className="text-xs text-zinc-400 font-semibold">Loading Leaderboard...</span>
            </div>
          ) : leaderboardData.top10.length > 0 ? (
            <div className="space-y-3">
              <div className="bg-zinc-900 rounded-xl border border-zinc-700/80 divide-y divide-zinc-800 overflow-hidden">
                {leaderboardData.top10.map((entry) => {
                  const isCurrentClient =
                    activeUserMem &&
                    entry.membershipNumber &&
                    String(entry.membershipNumber).trim().toLowerCase() === activeUserMem;

                  return (
                    <div
                      key={entry.clientId}
                      className={`flex items-center justify-between px-3.5 py-2.5 transition-all text-xs ${
                        isCurrentClient
                          ? 'bg-emerald-500/20 border-l-4 border-emerald-500 font-bold'
                          : 'hover:bg-zinc-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Rank Badge */}
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                            entry.rank === 1
                              ? 'bg-amber-400 text-zinc-950 shadow-xs'
                              : entry.rank === 2
                              ? 'bg-zinc-300 text-zinc-950 shadow-xs'
                              : entry.rank === 3
                              ? 'bg-amber-700 text-white shadow-xs'
                              : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                          }`}
                        >
                          {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                        </span>
                        
                        <div className="truncate">
                          <span className={`truncate ${isCurrentClient ? 'text-emerald-300 font-black' : 'text-zinc-200'}`}>
                            {entry.name}
                          </span>
                          {entry.membershipNumber && (
                            <span className="text-[10px] text-zinc-500 ml-1.5 font-mono">
                              #{entry.membershipNumber}
                            </span>
                          )}
                          {isCurrentClient && (
                            <span className="ml-2 text-[9px] font-black uppercase bg-emerald-500 text-zinc-950 px-1.5 py-0.2 rounded">
                              You
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className="font-extrabold text-emerald-400">
                          {entry.presentDays}
                        </span>
                        <span className="text-[10px] text-zinc-500">days</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* If user has an auto-filled membership number and is NOT in top 10, show their position at bottom */}
              {(() => {
                if (!activeUserMem) return null;
                const isInTop10 = leaderboardData.top10.some(
                  e => String(e.membershipNumber).trim().toLowerCase() === activeUserMem
                );

                if (isInTop10) return null;

                const userEntry = leaderboardData.allRanked.find(
                  e => String(e.membershipNumber).trim().toLowerCase() === activeUserMem
                );

                if (!userEntry) return null;

                return (
                  <div className="mt-3 pt-2">
                    <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Flame className="h-3.5 w-3.5 text-amber-500" />
                      <span>Your Current Position</span>
                    </div>
                    <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-emerald-500/15 border-2 border-emerald-500/50 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-zinc-950 font-black text-xs">
                          #{userEntry.rank}
                        </span>
                        <div className="truncate">
                          <span className="text-emerald-300 font-bold truncate">
                            {userEntry.name}
                          </span>
                          <span className="text-[10px] text-emerald-400/80 ml-1.5 font-mono">
                            (#{userEntry.membershipNumber})
                          </span>
                          <span className="ml-2 text-[9px] font-black uppercase bg-emerald-500 text-zinc-950 px-1.5 py-0.2 rounded">
                            You
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className="font-extrabold text-emerald-400">
                          {userEntry.presentDays}
                        </span>
                        <span className="text-[10px] text-emerald-400/80">days</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-zinc-500 text-center">
              <span className="text-xs font-semibold">No attendance recorded for this month yet.</span>
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* 2. REGULAR CHECK-IN FLOW                                                  */
        /* ========================================================================= */
        <div className={`bg-zinc-800 p-6 sm:p-8 rounded-2xl shadow-2xl w-full border border-zinc-700 transition-all ${
          step === 'success' ? 'max-w-lg' : 'max-w-md'
        }`}>
          <div className="flex flex-col items-center mb-6 sm:mb-8">
            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30 overflow-hidden shrink-0">
              {gymSettings.logoUrl && gymSettings.logoUrl !== 'Dumbbell' ? (
                <img src={gymSettings.logoUrl} alt="Gym Logo" className="h-full w-full object-cover" />
              ) : (
                <img src="/logo.png" alt="Logo" className="h-full w-full object-contain p-1.5" />
              )}
            </div>
            <h1 className="text-3xl font-extrabold text-center tracking-tight text-white mb-0.5">
              {gymSettings.gymName}
            </h1>
            <span className="text-xs font-semibold text-zinc-400 mb-3">
              Zen Tracker
            </span>

            {/* View Leaderboard Button directly above Self Check-In text */}
            <button
              type="button"
              onClick={() => {
                setShowLeaderboardView(true);
                fetchLeaderboard();
              }}
              className="inline-flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500/25 active:scale-98 text-amber-300 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer mb-3"
            >
              <Trophy className="h-3.5 w-3.5 text-amber-400 animate-bounce" />
              <span>View Leaderboard</span>
            </button>

            <h2 className="text-xl font-bold text-center text-emerald-400 mb-1">Self Check-In</h2>
            <p className="text-zinc-400 text-sm">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>

          {step === 'verifying' && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mb-4"></div>
              <p className="text-zinc-300">Verifying your location...</p>
            </div>
          )}

          {step === 'input' && (
            <form onSubmit={handleCheckIn} className="space-y-6">
              <div className="flex items-center justify-center space-x-2 text-emerald-400 bg-emerald-400/10 p-3 rounded-lg border border-emerald-400/20 mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">You are in the gym</span>
              </div>
              
              <div>
                <label htmlFor="membership" className="block text-sm font-medium text-zinc-300 mb-2">
                  Membership Number
                </label>
                <input
                  id="membership"
                  type="text"
                  value={membershipNumber}
                  onChange={(e) => handleMembershipChange(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-white placeholder-zinc-500 transition-all text-center text-lg tracking-widest uppercase font-mono"
                  placeholder="EG : 152"
                  required
                  disabled={submitting || failCount >= 10}
                />
              </div>
              <button
                type="submit"
                disabled={submitting || !membershipNumber.trim() || failCount >= 10}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-bold py-3 px-4 rounded-lg transition-colors focus:ring-4 focus:ring-emerald-500/50 outline-none cursor-pointer"
              >
                {submitting ? 'Processing...' : 'Check In'}
              </button>
            </form>
          )}

          {step === 'error' && (
            <div className="flex flex-col items-center py-6">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-red-400 text-center font-medium mb-6 text-lg">{errorMessage}</p>
              
              <div className="flex items-center justify-center">
                <button 
                  onClick={() => {
                    if (errorMessage.includes('Location') || errorMessage.includes('not inside the gym')) {
                      requestLocation(true);
                    } else {
                      setStep('input');
                    }
                  }}
                  className="px-6 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors cursor-pointer text-sm font-semibold"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center py-4 space-y-6">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-black text-emerald-400">Attendance Recorded</h2>
              </div>
              
              {/* Top Details Card */}
              {successDetails && (
                <div className="bg-zinc-900 w-full rounded-xl p-4 border border-zinc-700 space-y-2.5 shadow-inner">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-400">Name:</span>
                    <span className="font-bold text-white text-base">{successDetails.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-400">Membership:</span>
                    <span className="font-bold text-emerald-400 uppercase tracking-wider">{successDetails.membership_number}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-400">Time:</span>
                    <span className="font-bold text-white">{successDetails.time}</span>
                  </div>
                  {successDetails.subscription_alert && (
                    <div className={`mt-3 pt-3 border-t border-zinc-800 text-center font-bold text-xs px-3 py-2 rounded-lg ${
                      successDetails.is_expired
                        ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    }`}>
                      {successDetails.subscription_alert}
                    </div>
                  )}
                </div>
              )}

              {/* Leaderboard Section */}
              <div className="w-full space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-700 pb-2">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-amber-400 animate-bounce" />
                    <h3 className="text-base font-black uppercase tracking-wider text-white">
                      {new Date().toLocaleString('en-US', { month: 'long' })} Leaderboard
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-md border border-amber-500/30">
                    Monthly Top 10
                  </span>
                </div>

                {loadingLeaderboard ? (
                  <div className="flex flex-col items-center justify-center py-6">
                    <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mb-2"></div>
                    <span className="text-xs text-zinc-400">Loading Leaderboard...</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Top 10 List */}
                    <div className="bg-zinc-900 rounded-xl border border-zinc-700/80 divide-y divide-zinc-800 overflow-hidden">
                      {leaderboardData.top10.map((entry) => {
                        const isCurrentClient =
                          successDetails?.membership_number &&
                          String(entry.membershipNumber).trim().toLowerCase() ===
                            String(successDetails.membership_number).trim().toLowerCase();

                        return (
                          <div
                            key={entry.clientId}
                            className={`flex items-center justify-between px-3.5 py-2.5 transition-all text-xs ${
                              isCurrentClient
                                ? 'bg-emerald-500/20 border-l-4 border-emerald-500 font-bold'
                                : 'hover:bg-zinc-800/50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {/* Rank Badge */}
                              <span
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                                  entry.rank === 1
                                    ? 'bg-amber-400 text-zinc-950 shadow-xs'
                                    : entry.rank === 2
                                    ? 'bg-zinc-300 text-zinc-950 shadow-xs'
                                    : entry.rank === 3
                                    ? 'bg-amber-700 text-white shadow-xs'
                                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                                }`}
                              >
                                {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                              </span>
                              
                              <div className="truncate">
                                <span className={`truncate ${isCurrentClient ? 'text-emerald-300 font-black' : 'text-zinc-200'}`}>
                                  {entry.name}
                                </span>
                                {entry.membershipNumber && (
                                  <span className="text-[10px] text-zinc-500 ml-1.5 font-mono">
                                    #{entry.membershipNumber}
                                  </span>
                                )}
                                {isCurrentClient && (
                                  <span className="ml-2 text-[9px] font-black uppercase bg-emerald-500 text-zinc-950 px-1.5 py-0.2 rounded">
                                    You
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <span className="font-extrabold text-emerald-400">
                                {entry.presentDays}
                              </span>
                              <span className="text-[10px] text-zinc-500">days</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* If the checked-in user is NOT in the Top 10, show their position at the bottom */}
                    {(() => {
                      if (!successDetails?.membership_number) return null;
                      const cleanUserMem = String(successDetails.membership_number).trim().toLowerCase();
                      const isInTop10 = leaderboardData.top10.some(
                        e => String(e.membershipNumber).trim().toLowerCase() === cleanUserMem
                      );

                      if (isInTop10) return null;

                      const userEntry = leaderboardData.allRanked.find(
                        e => String(e.membershipNumber).trim().toLowerCase() === cleanUserMem
                      );

                      if (!userEntry) return null;

                      return (
                        <div className="mt-3 pt-2">
                          <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <Flame className="h-3.5 w-3.5 text-amber-500" />
                            <span>Your Current Position</span>
                          </div>
                          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-emerald-500/15 border-2 border-emerald-500/50 text-xs">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-zinc-950 font-black text-xs">
                                #{userEntry.rank}
                              </span>
                              <div className="truncate">
                                <span className="text-emerald-300 font-bold truncate">
                                  {userEntry.name}
                                </span>
                                <span className="text-[10px] text-emerald-400/80 ml-1.5 font-mono">
                                  (#{userEntry.membershipNumber})
                                </span>
                                <span className="ml-2 text-[9px] font-black uppercase bg-emerald-500 text-zinc-950 px-1.5 py-0.2 rounded">
                                  You
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <span className="font-extrabold text-emerald-400">
                                {userEntry.presentDays}
                              </span>
                              <span className="text-[10px] text-emerald-400/80">days</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
              
              <p className="text-xs text-zinc-500 font-medium">Keep crushing your fitness goals!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
