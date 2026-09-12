import React, { useState, useEffect, useCallback } from 'react';
import { db, defaultSettings } from '../services/db';
import { GymSettings, LeaderboardEntry } from '../types';
import { Trophy, Medal, Award, Flame, UserCheck, ArrowLeft, Search, X, Sparkles, Globe, Smartphone, ArrowRight, Mail, Phone, Check, MessageSquare, Crown } from 'lucide-react';

interface LeaderboardContentProps {
  leaderboardData: { top10: LeaderboardEntry[]; allRanked: LeaderboardEntry[] };
  loading: boolean;
  activeUserMem: string;
}

const LeaderboardContent: React.FC<LeaderboardContentProps> = ({
  leaderboardData,
  loading,
  activeUserMem,
}) => {
  const cleanActiveUser = (activeUserMem || '').trim().toLowerCase();
  const top1Days = Math.max(1, leaderboardData.top10[0]?.presentDays || 1);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="relative flex items-center justify-center mb-3">
          <div className="w-10 h-10 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin"></div>
          <Trophy className="w-4 h-4 text-amber-400 absolute" />
        </div>
        <span className="text-xs text-zinc-400 font-semibold tracking-wide">
          Calculating monthly rankings...
        </span>
      </div>
    );
  }

  if (leaderboardData.top10.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center px-4 bg-zinc-950/40 rounded-2xl border border-zinc-800/60">
        <Trophy className="w-8 h-8 text-zinc-600 mb-2" />
        <span className="text-xs font-semibold text-zinc-300">
          No attendance recorded for this month yet.
        </span>
        <span className="text-[11px] text-zinc-500 mt-0.5">
          Be the first member to check in and claim the #1 spot!
        </span>
      </div>
    );
  }

  const showPodium = leaderboardData.top10.length >= 3;
  const top3 = leaderboardData.top10.slice(0, 3);
  const ranks4to10 = showPodium ? leaderboardData.top10.slice(3) : leaderboardData.top10;

  // Active user position
  const isInTop10 = cleanActiveUser
    ? leaderboardData.top10.some(
        (e) => String(e.membershipNumber).trim().toLowerCase() === cleanActiveUser
      )
    : false;

  const userEntry =
    cleanActiveUser && !isInTop10
      ? leaderboardData.allRanked.find(
          (e) => String(e.membershipNumber).trim().toLowerCase() === cleanActiveUser
        )
      : null;

  const cutoffDays = leaderboardData.top10[leaderboardData.top10.length - 1]?.presentDays || 0;
  const daysToTop10 = userEntry ? Math.max(1, cutoffDays - userEntry.presentDays + 1) : 0;

  return (
    <div className="space-y-4 w-full">
      {/* 1. Gamified Top 3 Podium */}
      {showPodium && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3 items-end pt-3 pb-1">
          {/* 2nd Place (Silver) */}
          {(() => {
            const entry = top3[1];
            const isUser =
              cleanActiveUser &&
              String(entry.membershipNumber).trim().toLowerCase() === cleanActiveUser;

            return (
              <div
                key={entry.clientId}
                className={`relative flex flex-col items-center p-2.5 sm:p-3 rounded-2xl border transition-all text-center ${
                  isUser
                    ? 'bg-linear-to-b from-emerald-500/20 via-zinc-900/95 to-zinc-950 border-emerald-400/60 shadow-[0_0_20px_-5px_rgba(52,211,153,0.3)]'
                    : 'bg-linear-to-b from-slate-400/10 via-zinc-900/90 to-zinc-950 border-slate-400/30 hover:border-slate-300/50 shadow-md'
                }`}
              >
                <div className="relative mb-2">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-zinc-800/90 border border-slate-400/40 flex items-center justify-center text-base shadow-sm">
                    🥈
                  </div>
                  <span className="absolute -bottom-1 -right-1 bg-slate-200 text-zinc-950 text-[9px] font-black px-1.5 py-0.2 rounded-md uppercase tracking-wider">
                    2nd
                  </span>
                </div>

                <span className="text-[11px] sm:text-xs font-bold text-white truncate max-w-full px-1">
                  {entry.name}
                </span>
                {entry.membershipNumber && (
                  <span className="text-[10px] text-zinc-400 font-mono">
                    #{entry.membershipNumber}
                  </span>
                )}
                {isUser && (
                  <span className="mt-1 text-[9px] font-black uppercase bg-emerald-500 text-zinc-950 px-1.5 py-0.2 rounded-md">
                    You
                  </span>
                )}

                <div className="mt-2 inline-flex items-center gap-1 bg-zinc-800/80 px-2 py-0.5 rounded-full border border-zinc-700/60">
                  <span className="text-xs font-black text-zinc-200">{entry.presentDays}</span>
                  <span className="text-[9px] font-medium text-zinc-400">days</span>
                </div>
              </div>
            );
          })()}

          {/* 1st Place (Gold - Elevated Champion) */}
          {(() => {
            const entry = top3[0];
            const isUser =
              cleanActiveUser &&
              String(entry.membershipNumber).trim().toLowerCase() === cleanActiveUser;

            return (
              <div
                key={entry.clientId}
                className={`relative flex flex-col items-center p-3 sm:p-3.5 -mt-3.5 rounded-2xl border transition-all text-center ${
                  isUser
                    ? 'bg-linear-to-b from-amber-500/25 via-emerald-950/30 to-zinc-950 border-amber-400 shadow-[0_0_30px_-5px_rgba(251,191,36,0.4)]'
                    : 'bg-linear-to-b from-amber-500/20 via-zinc-900/95 to-zinc-950 border-amber-400/50 hover:border-amber-300 shadow-[0_0_25px_-5px_rgba(251,191,36,0.3)]'
                }`}
              >
                {/* Floating Crown Badge */}
                <div className="absolute -top-3.5 flex items-center justify-center">
                  <div className="bg-linear-to-r from-amber-400 to-yellow-500 text-zinc-950 p-1 rounded-full shadow-lg">
                    <Crown className="w-3.5 h-3.5 fill-current" />
                  </div>
                </div>

                <div className="relative mb-2 mt-1">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/20 border-2 border-amber-400/60 flex items-center justify-center text-xl shadow-lg shadow-amber-500/20">
                    🥇
                  </div>
                  <span className="absolute -bottom-1 -right-1 bg-amber-400 text-zinc-950 text-[9px] font-black px-1.5 py-0.2 rounded-md uppercase tracking-wider shadow-sm">
                    1st
                  </span>
                </div>

                <span className="text-xs sm:text-sm font-black text-amber-100 truncate max-w-full px-1">
                  {entry.name}
                </span>
                {entry.membershipNumber && (
                  <span className="text-[10px] text-amber-400/80 font-mono">
                    #{entry.membershipNumber}
                  </span>
                )}
                {isUser && (
                  <span className="mt-1 text-[9px] font-black uppercase bg-emerald-500 text-zinc-950 px-1.5 py-0.2 rounded-md">
                    You
                  </span>
                )}

                <div className="mt-2.5 inline-flex items-center gap-1 bg-linear-to-r from-amber-400 to-yellow-500 text-zinc-950 px-2.5 py-0.5 rounded-full font-black text-xs shadow-sm">
                  <span>{entry.presentDays}</span>
                  <span className="text-[9px] uppercase font-bold tracking-wider">days</span>
                </div>
              </div>
            );
          })()}

          {/* 3rd Place (Bronze) */}
          {(() => {
            const entry = top3[2];
            const isUser =
              cleanActiveUser &&
              String(entry.membershipNumber).trim().toLowerCase() === cleanActiveUser;

            return (
              <div
                key={entry.clientId}
                className={`relative flex flex-col items-center p-2.5 sm:p-3 rounded-2xl border transition-all text-center ${
                  isUser
                    ? 'bg-linear-to-b from-emerald-500/20 via-zinc-900/95 to-zinc-950 border-emerald-400/60 shadow-[0_0_20px_-5px_rgba(52,211,153,0.3)]'
                    : 'bg-linear-to-b from-amber-900/20 via-zinc-900/90 to-zinc-950 border-amber-700/40 hover:border-amber-600/60 shadow-md'
                }`}
              >
                <div className="relative mb-2">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-zinc-800/90 border border-amber-700/40 flex items-center justify-center text-base shadow-sm">
                    🥉
                  </div>
                  <span className="absolute -bottom-1 -right-1 bg-amber-700 text-white text-[9px] font-black px-1.5 py-0.2 rounded-md uppercase tracking-wider">
                    3rd
                  </span>
                </div>

                <span className="text-[11px] sm:text-xs font-bold text-white truncate max-w-full px-1">
                  {entry.name}
                </span>
                {entry.membershipNumber && (
                  <span className="text-[10px] text-zinc-400 font-mono">
                    #{entry.membershipNumber}
                  </span>
                )}
                {isUser && (
                  <span className="mt-1 text-[9px] font-black uppercase bg-emerald-500 text-zinc-950 px-1.5 py-0.2 rounded-md">
                    You
                  </span>
                )}

                <div className="mt-2 inline-flex items-center gap-1 bg-zinc-800/80 px-2 py-0.5 rounded-full border border-zinc-700/60">
                  <span className="text-xs font-black text-amber-500">{entry.presentDays}</span>
                  <span className="text-[9px] font-medium text-zinc-400">days</span>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* 2. Ranks 4 to 10 (or 1 to 10 if podium not shown) */}
      {ranks4to10.length > 0 && (
        <div className="bg-zinc-950/75 rounded-2xl border border-zinc-800/80 divide-y divide-zinc-850 overflow-hidden shadow-inner backdrop-blur-sm">
          {ranks4to10.map((entry) => {
            const isUser =
              cleanActiveUser &&
              String(entry.membershipNumber).trim().toLowerCase() === cleanActiveUser;

            const relativePct = Math.min(100, Math.max(12, Math.round((entry.presentDays / top1Days) * 100)));

            return (
              <div
                key={entry.clientId}
                className={`flex items-center justify-between px-3.5 py-2.5 sm:px-4 sm:py-3 transition-all text-xs group ${
                  isUser
                    ? 'bg-emerald-500/15 border-l-4 border-emerald-400 font-bold'
                    : 'hover:bg-zinc-900/60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Rank Badge */}
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-black transition-transform group-hover:scale-105 ${
                      entry.rank === 1
                        ? 'bg-linear-to-br from-amber-400 to-yellow-500 text-zinc-950 shadow-xs'
                        : entry.rank === 2
                        ? 'bg-zinc-300 text-zinc-950 shadow-xs'
                        : entry.rank === 3
                        ? 'bg-amber-700 text-white shadow-xs'
                        : 'bg-zinc-900 text-zinc-400 border border-zinc-750'
                    }`}
                  >
                    {entry.rank <= 3
                      ? entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'
                      : `#${entry.rank}`}
                  </span>

                  <div className="truncate">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className={`truncate ${isUser ? 'text-emerald-300 font-black' : 'text-zinc-200 font-semibold group-hover:text-white'}`}>
                        {entry.name}
                      </span>
                      {isUser && (
                        <span className="text-[9px] font-black uppercase bg-emerald-500 text-zinc-950 px-1.5 py-0.2 rounded-md shrink-0">
                          You
                        </span>
                      )}
                    </div>
                    {entry.membershipNumber && (
                      <span className="text-[10px] text-zinc-500 font-mono">
                        #{entry.membershipNumber}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right side: Attendance days count & relative bar */}
                <div className="flex items-center gap-2.5 shrink-0 pl-2">
                  <div className="hidden sm:flex flex-col items-end gap-0.5">
                    <div className="w-12 h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-linear-to-r from-emerald-500 to-teal-400 rounded-full transition-all"
                        style={{ width: `${relativePct}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1 text-right">
                    <span className="font-black text-emerald-400 text-sm sm:text-base">
                      {entry.presentDays}
                    </span>
                    <span className="text-[10px] font-semibold text-zinc-500">days</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Standings card for user outside Top 10 */}
      {userEntry && (
        <div className="pt-2 animate-in fade-in slide-in-from-bottom-2">
          <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-amber-500 animate-pulse" />
              <span>Your Current Position</span>
            </div>
            {daysToTop10 > 0 && (
              <span className="text-[10px] font-bold text-emerald-400/90 lowercase tracking-normal">
                {daysToTop10} {daysToTop10 === 1 ? 'day' : 'days'} to enter Top 10
              </span>
            )}
          </div>

          <div className="relative overflow-hidden flex items-center justify-between p-3.5 rounded-2xl bg-linear-to-r from-emerald-950/50 via-zinc-900/90 to-emerald-950/50 border border-emerald-500/50 shadow-lg shadow-emerald-950/50">
            <div className="absolute inset-0 bg-linear-to-r from-emerald-500/5 to-transparent pointer-events-none"></div>

            <div className="relative flex items-center gap-3 min-w-0">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-emerald-400 to-emerald-600 text-zinc-950 font-black text-xs shadow-md">
                #{userEntry.rank}
              </span>
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-300 font-extrabold truncate">
                    {userEntry.name}
                  </span>
                  <span className="text-[9px] font-black uppercase bg-emerald-500 text-zinc-950 px-1.5 py-0.2 rounded-md">
                    You
                  </span>
                </div>
                {userEntry.membershipNumber && (
                  <span className="text-[10px] text-emerald-400/70 font-mono">
                    #{userEntry.membershipNumber}
                  </span>
                )}
              </div>
            </div>

            <div className="relative flex items-baseline gap-1 shrink-0">
              <span className="font-black text-emerald-400 text-base">
                {userEntry.presentDays}
              </span>
              <span className="text-[10px] font-bold text-emerald-400/80">days</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

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

  // Welcome Loading Splash State (shows for ~2.4 seconds on open)
  const [showSplash, setShowSplash] = useState(true);
  const [splashFading, setSplashFading] = useState(false);

  // Promotional Ad Contact Modal State
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactCopied, setContactCopied] = useState(false);

  useEffect(() => {
    // Show welcome screen for 2.0s, then fade out smoothly by 2.4s
    const fadeTimer = setTimeout(() => {
      setSplashFading(true);
    }, 2000);

    const hideTimer = setTimeout(() => {
      setShowSplash(false);
    }, 2400);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

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
    const p1 = lat1 * Math.PI / 180;
    const p2 = lat2 * Math.PI / 180;
    const dp = (lat2 - lat1) * Math.PI / 180;
    const dl = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
      Math.cos(p1) * Math.cos(p2) *
      Math.sin(dl / 2) * Math.sin(dl / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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

  if (showSplash || isLoadingSettings) {
    return (
      <div
        className={`min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-white transition-opacity duration-400 select-none relative overflow-hidden ${splashFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
      >
        {/* Background Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"></div>

        {/* Centered App Icon with Pulsing Glow */}
        <div className="relative mb-6 z-10">
          <div className="absolute -inset-3 bg-emerald-500/25 rounded-full blur-xl animate-pulse"></div>
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-zinc-900 border-2 border-emerald-500/40 p-2 shadow-2xl shadow-emerald-500/20 flex items-center justify-center overflow-hidden">
            <img
              src="/app-icon.png"
              alt="Zen Attendance App Icon"
              className="h-full w-full object-cover rounded-full"
            />
          </div>
        </div>

        {/* Welcome Text */}
        <div className="text-center mb-8 z-10">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
            Welcome to <span className="text-emerald-400">Zen Attendance</span>
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-zinc-400 tracking-wide max-w-xs mx-auto">
            {gymSettings.gymName || 'Fast & Seamless Self Check-In'}
          </p>
        </div>

        {/* Sleek Animated Loading Bar & Status */}
        <div className="w-52 sm:w-60 z-10 flex flex-col items-center">
          <div className="w-full h-1.5 bg-zinc-800/90 rounded-full overflow-hidden mb-3 border border-zinc-700/50">
            <div className="h-full bg-linear-to-r from-emerald-500 via-teal-400 to-emerald-400 rounded-full animate-pulse w-full"></div>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-zinc-400 tracking-wider uppercase">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Opening Check-In...</span>
          </div>
        </div>
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
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-zinc-100 relative overflow-hidden selection:bg-emerald-500 selection:text-zinc-950">
      {/* Background Ambient Glows (Super lightweight, GPU accelerated) */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl h-96 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-500/5 via-transparent to-transparent pointer-events-none"></div>

      {/* Top Action Bar */}
      {gymSettings.enableTestMode && (
        <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
          <button
            onClick={handleClearTestData}
            className="bg-zinc-900/90 border border-zinc-700/80 text-zinc-400 hover:text-white px-3 py-1.5 rounded-xl text-xs font-mono transition-colors shadow-sm"
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
        <div className="relative bg-zinc-900/85 backdrop-blur-2xl p-5 sm:p-7 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.06)] w-full max-w-lg border border-zinc-800/80 transition-all space-y-4">
          {/* Top subtle highlight */}
          <div className="absolute inset-x-12 top-0 h-px bg-linear-to-r from-transparent via-amber-500/50 to-transparent"></div>

          {/* Header - Only one back button on top left */}
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <button
              onClick={() => setShowLeaderboardView(false)}
              className="group flex items-center gap-1.5 text-xs font-bold text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 px-3.5 py-1.5 rounded-full border border-zinc-700/60 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Check-In</span>
            </button>

            <span className="text-[10px] font-black uppercase tracking-wider bg-linear-to-r from-amber-500/20 to-amber-500/10 text-amber-400 px-3 py-1 rounded-full border border-amber-500/30 shadow-xs flex items-center gap-1.5">
              <Trophy className="w-3 h-3 text-amber-400" />
              <span>{currentMonthName}</span>
            </span>
          </div>

          {/* Title Banner */}
          <div className="text-center space-y-1">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-linear-to-br from-amber-400/20 to-amber-500/10 text-amber-400 mb-1 border border-amber-400/30 shadow-lg shadow-amber-500/10">
              <Trophy className="h-6 w-6 animate-pulse" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Monthly Leaderboard
            </h2>
            <p className="text-xs text-zinc-400">
              Top attendance champions for {currentMonthName}. Resets on the 1st of every month.
            </p>
          </div>

          {/* Leaderboard Body */}
          <LeaderboardContent
            leaderboardData={leaderboardData}
            loading={loadingLeaderboard}
            activeUserMem={activeUserMem}
          />
        </div>
      ) : (
        /* ========================================================================= */
        /* 2. REGULAR CHECK-IN FLOW                                                  */
        /* ========================================================================= */
        <div className={`relative bg-zinc-900/85 backdrop-blur-2xl p-6 sm:p-8 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.06)] w-full border border-zinc-800/80 transition-all ${step === 'success' ? 'max-w-lg' : 'max-w-md'
          }`}>
          {/* Top subtle highlight */}
          <div className="absolute inset-x-12 top-0 h-px bg-linear-to-r from-transparent via-emerald-500/40 to-transparent"></div>

          <div className="flex flex-col items-center mb-6 sm:mb-8">
            <div className="relative mb-3 group">
              <div className="absolute -inset-1 bg-linear-to-r from-emerald-500/40 to-teal-500/40 rounded-full blur-md opacity-75 group-hover:opacity-100 transition duration-500"></div>
              <div className="relative w-20 h-20 rounded-full bg-zinc-950 p-2 border-2 border-emerald-500/35 shadow-xl flex items-center justify-center overflow-hidden">
                {gymSettings.logoUrl && gymSettings.logoUrl !== 'Dumbbell' ? (
                  <img src={gymSettings.logoUrl} alt="Gym Logo" className="h-full w-full object-cover rounded-full" />
                ) : (
                  <img src="/logo.png" alt="Logo" className="h-full w-full object-contain p-1 rounded-full" />
                )}
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-center tracking-tight text-white mb-3">
              {gymSettings.gymName || 'Zen Attendance'}
            </h1>

            {/* View Leaderboard Button directly above Self Check-In text */}
            <button
              type="button"
              onClick={() => {
                setShowLeaderboardView(true);
                fetchLeaderboard();
              }}
              className="group inline-flex items-center gap-2 bg-linear-to-r from-amber-500/10 via-amber-500/15 to-amber-500/10 hover:from-amber-500/20 hover:to-amber-500/20 active:scale-95 text-amber-300 px-4 py-1.5 rounded-full text-xs font-bold border border-amber-500/30 hover:border-amber-400/60 transition-all shadow-sm cursor-pointer mb-3"
            >
              <Trophy className="h-3.5 w-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
              <span>View Leaderboard</span>
            </button>

            <h2 className="text-lg sm:text-xl font-black text-center text-emerald-400 mb-1">Self Check-In</h2>
            <p className="text-zinc-400 text-xs font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {step === 'verifying' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <div className="relative flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 animate-ping absolute"></div>
                <div className="w-12 h-12 rounded-2xl bg-zinc-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
                  <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-white">Verifying Location</p>
                <p className="text-xs text-zinc-400">Confirming you are inside the gym...</p>
              </div>
            </div>
          )}

          {step === 'input' && (
            <form onSubmit={handleCheckIn} className="space-y-5">
              <div className="flex items-center justify-center gap-2 text-emerald-400 bg-emerald-500/10 py-2.5 px-4 rounded-xl border border-emerald-500/20 mb-6 text-xs font-bold shadow-inner">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Location Verified • You are inside the gym</span>
              </div>

              <div className="space-y-2 text-left">
                <label htmlFor="membership" className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Membership Number
                </label>
                <input
                  id="membership"
                  type="text"
                  value={membershipNumber}
                  onChange={(e) => handleMembershipChange(e.target.value)}
                  className="w-full px-4 py-3.5 bg-zinc-950/90 border border-zinc-700/80 hover:border-zinc-600 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 rounded-2xl text-white placeholder-zinc-600 transition-all text-center text-xl sm:text-2xl font-black tracking-widest uppercase font-mono shadow-inner outline-none"
                  placeholder="EG : 152"
                  required
                  disabled={submitting || failCount >= 10}
                  autoComplete="off"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !membershipNumber.trim() || failCount >= 10}
                className="w-full py-3.5 px-6 rounded-2xl font-black text-sm text-zinc-950 bg-linear-to-r from-emerald-400 via-emerald-500 to-teal-400 hover:from-emerald-300 hover:to-teal-300 active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:active:scale-100 flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"></div>
                    <span>Recording Check-In...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="h-4 w-4" />
                    <span>Check In</span>
                  </>
                )}
              </button>
            </form>
          )}

          {step === 'error' && (
            <div className="flex flex-col items-center py-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-500/10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Location Notice</h3>
                <p className="text-xs sm:text-sm text-rose-300/90 max-w-xs">{errorMessage}</p>
              </div>

              <button
                onClick={() => {
                  if (errorMessage.includes('Location') || errorMessage.includes('not inside the gym')) {
                    requestLocation(true);
                  } else {
                    setStep('input');
                  }
                }}
                className="px-6 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs border border-zinc-700 hover:border-zinc-600 transition-all active:scale-95 shadow-md cursor-pointer"
              >
                Try Again
              </button>
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center py-4 space-y-6">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-2 shadow-lg shadow-emerald-500/20">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-black text-white">Attendance Recorded</h2>
                <span className="text-xs text-emerald-400 font-bold mt-0.5">Checked In Successfully</span>
              </div>

              {/* Top Details Card */}
              {successDetails && (
                <div className="bg-zinc-950/80 w-full rounded-2xl p-4 border border-zinc-800/80 space-y-3 shadow-inner">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-400 text-xs font-semibold">Member Name</span>
                    <span className="font-bold text-white text-base">{successDetails.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-400 text-xs font-semibold">Membership #</span>
                    <span className="font-mono font-black text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      #{successDetails.membership_number}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-400 text-xs font-semibold">Check-In Time</span>
                    <span className="font-bold text-white text-sm">{successDetails.time}</span>
                  </div>
                  {successDetails.subscription_alert && (
                    <div className={`mt-3 pt-3 border-t border-zinc-800/80 text-center font-bold text-xs px-3 py-2 rounded-xl ${successDetails.is_expired
                      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}>
                      {successDetails.subscription_alert}
                    </div>
                  )}
                </div>
              )}

              {/* Leaderboard Section */}
              <div className="w-full space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4.5 w-4.5 text-amber-400 animate-bounce" />
                    <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                      {new Date().toLocaleString('en-US', { month: 'long' })} Leaderboard
                    </h3>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-linear-to-r from-amber-500/20 to-amber-500/10 text-amber-400 px-2.5 py-0.5 rounded-full border border-amber-500/30 shadow-xs">
                    Monthly Top 10
                  </span>
                </div>

                <LeaderboardContent
                  leaderboardData={leaderboardData}
                  loading={loadingLeaderboard}
                  activeUserMem={String(successDetails?.membership_number || activeUserMem)}
                />
              </div>

              <p className="text-xs text-zinc-500 font-medium">Keep crushing your fitness goals!</p>
            </div>
          )}
        </div>
      )}

      {/* Simple Text: Designed & Developed by Ajay © 2026 */}
      <div className={`mt-4 w-full text-center transition-all ${step === 'success' || showLeaderboardView ? 'max-w-lg' : 'max-w-md'}`}>
        <span className="text-xs text-zinc-500 font-medium tracking-wide">
          Designed & Developed by Ajay © 2026
        </span>
      </div>

      {/* Developer Contact Strip */}
      <div className={`mt-2 w-full transition-all ${step === 'success' || showLeaderboardView ? 'max-w-lg' : 'max-w-md'}`}>
        <div
          onClick={() => setShowContactModal(true)}
          className="group cursor-pointer flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-zinc-800/85 hover:bg-zinc-800 border border-emerald-500/25 hover:border-emerald-500/50 shadow-lg shadow-black/25 transition-all backdrop-blur-sm"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400 group-hover:scale-105 group-hover:bg-emerald-500/20 transition-all">
              <Globe className="h-4.5 w-4.5 text-emerald-400" />
            </div>
            <div className="min-w-0 text-left">
              <span className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors block">
                Need website, mobile apps or any webservices?
              </span>
              <p className="text-[11px] text-zinc-400 truncate">
                Contact developer
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowContactModal(true);
            }}
            className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500 text-emerald-300 hover:text-zinc-950 text-xs font-bold border border-emerald-500/30 hover:border-emerald-500 transition-all cursor-pointer shadow-xs"
          >
            <span>Contact</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Contact & Inquiry Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-left">
            <button
              onClick={() => setShowContactModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">
                  Ajay R - Full Stack Developer
                </h3>
                <p className="text-xs text-zinc-400">
                  Website, App & Web Service Development
                </p>
              </div>
            </div>

            {/* Motivational Quote / Callout */}
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-center">
              <p className="text-xs font-semibold text-emerald-300 leading-snug">
                A webservice can make a huge difference in your life and business. Contact now!
              </p>
            </div>

            <div className="space-y-2.5 mb-5 bg-zinc-800/60 p-3.5 rounded-xl border border-zinc-700/60">
              <div className="flex items-start gap-2 text-xs text-zinc-300">
                <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Business Websites:</strong> Ultra-fast, modern responsive design for any business.</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-zinc-300">
                <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Mobile Apps:</strong> iOS & Android applications with custom features.</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-zinc-300">
                <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Custom Applications:</strong> Application to manage your business.</span>
              </div>
            </div>

            <p className="text-xs text-white font-medium mb-4 leading-relaxed">
              Contact developer directly:
            </p>

            <div className="space-y-2.5">
              <a
                href="https://wa.me/919965735550?text=Hello%20Ajay!%20I%20saw%20Zen%20Attendance%20and%20I%20would%20like%20to%20inquire%20about%20developing%20a%20website%2C%20app%2C%20or%20webservice."
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-md cursor-pointer"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Click to Chat on WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText('9965735550');
                  setContactCopied(true);
                  setTimeout(() => setContactCopied(false), 2500);
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition-colors cursor-pointer"
              >
                {contactCopied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Mobile Number Copied!</span>
                  </>
                ) : (
                  <>
                    <span>Copy Mobile Number (9965735550)</span>
                  </>
                )}
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
              <span>Ajay R • 9965735550</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
