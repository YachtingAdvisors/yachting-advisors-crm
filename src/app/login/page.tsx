'use client';

import { useState } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

type LoginMode = 'password' | 'magic-link' | 'reset';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<LoginMode>('password');
  const router = useRouter();

  function switchMode(newMode: LoginMode) {
    setMode(newMode);
    setError('');
    setMessage('');
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createBrowserClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push('/');
    router.refresh();
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!email) {
      setError('Enter your email address');
      return;
    }
    setLoading(true);

    const supabase = createBrowserClient();
    const { error: magicError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (magicError) {
      setError(magicError.message);
    } else {
      setMessage('Check your email for a sign-in link. It may take a minute to arrive.');
    }
    setLoading(false);
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!email) {
      setError('Enter your email address');
      return;
    }
    setLoading(true);

    const supabase = createBrowserClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login/reset`,
    });

    if (resetError) {
      setError(resetError.message);
    } else {
      setMessage('Check your email for a password reset link. Use it to set your password.');
    }
    setLoading(false);
  }

  const handleSubmit =
    mode === 'password' ? handlePasswordLogin
    : mode === 'magic-link' ? handleMagicLink
    : handleReset;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f8fa] px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-[#1a1a2e] text-center mb-2">
          Yachting Advisors
        </h1>
        <p className="text-gray-500 text-center mb-8 text-sm">
          Real Estate CRM
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3">
              {error}
            </div>
          )}
          {message && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 text-sm rounded-lg p-3">
              {message}
            </div>
          )}

          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@yachtingadvisors.com"
              className="w-full bg-white border border-gray-300 rounded-lg text-sm text-[#33475b] px-4 py-2.5 focus:outline-none focus:border-[#ff7a59] focus:ring-1 focus:ring-[#ff7a59]"
            />
          </div>

          {mode === 'password' && (
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-white border border-gray-300 rounded-lg text-sm text-[#33475b] px-4 py-2.5 focus:outline-none focus:border-[#ff7a59] focus:ring-1 focus:ring-[#ff7a59]"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#ff7a59] hover:bg-[#e8664a] text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading
              ? mode === 'password' ? 'Signing in...' : 'Sending...'
              : mode === 'password' ? 'Sign In'
              : mode === 'magic-link' ? 'Send Sign-In Link'
              : 'Send Reset Link'}
          </button>

          {/* Divider */}
          {mode === 'password' && (
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-gray-400">or</span>
              </div>
            </div>
          )}

          {/* Magic link option */}
          {mode === 'password' && (
            <button
              type="button"
              onClick={() => switchMode('magic-link')}
              className="w-full py-2.5 text-sm border border-gray-300 rounded-lg text-[#33475b] hover:bg-gray-50 transition-colors"
            >
              Sign in with email link (no password)
            </button>
          )}

          {/* Footer links */}
          <div className="flex flex-col items-center gap-2 pt-1">
            {mode === 'password' && (
              <button
                type="button"
                onClick={() => switchMode('reset')}
                className="text-sm text-gray-500 hover:text-[#33475b] transition-colors"
              >
                Forgot password?
              </button>
            )}
            {mode !== 'password' && (
              <button
                type="button"
                onClick={() => switchMode('password')}
                className="text-sm text-gray-500 hover:text-[#33475b] transition-colors"
              >
                Back to Sign In
              </button>
            )}
            {mode === 'reset' && (
              <button
                type="button"
                onClick={() => switchMode('magic-link')}
                className="text-xs text-[#0091ae] hover:text-[#007a94] transition-colors"
              >
                First time? Sign in with email link instead
              </button>
            )}
            {mode === 'magic-link' && (
              <button
                type="button"
                onClick={() => switchMode('reset')}
                className="text-xs text-[#0091ae] hover:text-[#007a94] transition-colors"
              >
                Need to set a password? Use forgot password
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
