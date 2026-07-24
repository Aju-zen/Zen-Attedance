import React, { useState, useEffect, useCallback } from 'react';
import { db, defaultSettings } from '../services/db';
import { GymSettings } from '../types';

export const CheckInPage: React.FC = () => {
  const [step, setStep] = useState<'request_location' | 'verifying' | 'input' | 'success' | 'error'>('request_location');
  const [errorMessage, setErrorMessage] = useState('');
  const [membershipNumber, setMembershipNumber] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successDetails, setSuccessDetails] = useState<any>(null);
  const [failCount, setFailCount] = useState(0);

  const [gymSettings, setGymSettings] = useState<GymSettings>(defaultSettings);
  
  useEffect(() => {
    db.getGlobalSettings().then(settings => {
      if (settings) {
        setGymSettings(prev => ({ ...prev, ...settings }));
      }
    });
  }, []);

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
        setStep('input');
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
    // Automatically ask for location on mount (not a retry)
    requestLocation(false);
  }, [requestLocation]);

  const getDeviceFingerprint = () => {
    let fp = localStorage.getItem('device_fingerprint');
    if (!fp) {
      fp = crypto.randomUUID();
      localStorage.setItem('device_fingerprint', fp);
    }
    return fp;
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!membershipNumber.trim()) return;

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
        membershipNumber: membershipNumber.trim(),
        deviceFingerprint: fp,
        latitude: location?.lat || 0,
        longitude: location?.lng || 0,
        browser: userAgent,
        ipAddress: 'client-side' // Actually needs server to get true IP
      });

      if (res.success) {
        setSuccessDetails(res.details);
        setStep('success');
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
    if (!window.confirm("This will delete today's attendance and device history for testing. Continue?")) return;
    const fp = getDeviceFingerprint();
    await db.clearTestDeviceHistory(fp);
    setErrorMessage('');
    setStep('input');
    setMembershipNumber('');
    alert("Test data cleared! You can now check in again.");
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 text-zinc-100 relative">
      
      {/* Dev Reset Button */}
      <button 
        onClick={handleClearTestData}
        className="absolute top-4 right-4 bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg text-xs font-mono transition-colors"
        title="Clear device history & today's attendance for testing"
      >
        [Dev: Reset Test Data]
      </button>

      <div className="bg-zinc-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-zinc-700">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30 overflow-hidden shrink-0">
            {gymSettings.logoUrl && gymSettings.logoUrl !== 'Dumbbell' ? (
              <img src={gymSettings.logoUrl} alt="Gym Logo" className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl">💪</span>
            )}
          </div>
          <h1 className="text-3xl font-extrabold text-center tracking-tight text-white mb-0.5">
            {gymSettings.gymName}
          </h1>
          <span className="text-xs font-semibold text-zinc-400 mb-6">
            Zen Tracker
          </span>
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
                onChange={(e) => setMembershipNumber(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-white placeholder-zinc-500 transition-all text-center text-lg tracking-widest uppercase font-mono"
                placeholder="____________"
                required
                disabled={submitting || failCount >= 10}
              />
            </div>
            <button
              type="submit"
              disabled={submitting || !membershipNumber.trim() || failCount >= 10}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-bold py-3 px-4 rounded-lg transition-colors focus:ring-4 focus:ring-emerald-500/50 outline-none"
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
            <button 
              onClick={() => {
                setMembershipNumber('');
                if (errorMessage.includes('Location permission')) {
                  requestLocation(true);
                } else {
                  setStep('input');
                }
              }}
              className="px-6 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center py-6">
             <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-emerald-400 mb-6">Attendance Recorded</h2>
            
            {successDetails && (
              <div className="bg-zinc-900 w-full rounded-lg p-4 border border-zinc-700 space-y-3">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Name:</span>
                  <span className="font-medium text-white">{successDetails.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Membership:</span>
                  <span className="font-medium text-white uppercase">{successDetails.membership_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Time:</span>
                  <span className="font-medium text-white">{successDetails.time}</span>
                </div>
              </div>
            )}
            
            <p className="mt-8 text-sm text-zinc-500">Thank You!</p>
          </div>
        )}
      </div>
    </div>
  );
};
