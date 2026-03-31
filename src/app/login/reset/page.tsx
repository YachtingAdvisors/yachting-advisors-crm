'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserClient();

    // The reset link lands with a hash fragment containing the access token.
    // Supabase client auto-detects this and establishes a session.
    // We listen for auth state changes and also poll getSession.

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
          setSessionReady(true);
          setChecking(false);
        }
      }
    );

    // Fallback: if onAuthStateChange doesn't fire PASSWORD_RECOVERY,
    // check if we already have a session after a short delay
    // (the hash token may have already been exchanged)
    const timer = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionReady(true);
      }
      setChecking(false);
    }, 2000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    const supabase = createBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    router.push('/');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f8fa] px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-[#1a1a2e] text-center mb-2">
          Set Your Password
        </h1>
        <p className="text-gray-400 text-center mb-8 text-sm">
          Choose a password for your Yachting Advisors account
        </p>

        {checking ? (
          <div className="text-center py-4">
            <p className="text-gray-500 text-sm">Verifying your link...</p>
          </div>
        ) : !sessionReady ? (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-lg p-3">
              This reset link has expired or is invalid. Please request a new one.
            </div>
            <button
              onClick={() => router.push('/login')}
              className="w-full bg-[#ff7a59] hover:bg-[#e8664a] text-white font-medium py-2.5 rounded-lg transition-colors"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="At least 6 characters"
                className="w-full bg-white border border-gray-300 rounded-lg text-sm text-[#33475b] px-4 py-2.5 focus:outline-none focus:border-[#ff7a59] focus:ring-1 focus:ring-[#ff7a59]"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
                className="w-full bg-white border border-gray-300 rounded-lg text-sm text-[#33475b] px-4 py-2.5 focus:outline-none focus:border-[#ff7a59] focus:ring-1 focus:ring-[#ff7a59]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#ff7a59] hover:bg-[#e8664a] text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Setting password...' : 'Set Password & Sign In'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
