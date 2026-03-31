'use client';

import { useState } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

type Mode = 'login' | 'signup' | 'reset';

const ALLOWED_DOMAIN = 'yachtingadvisors.com';

function isAllowedEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>('login');
  const router = useRouter();

  function switchMode(newMode: Mode) {
    setMode(newMode);
    setError('');
    setMessage('');
    setPassword('');
    setConfirmPassword('');
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!isAllowedEmail(email)) {
      setError(`Only @${ALLOWED_DOMAIN} email addresses are allowed.`);
      return;
    }
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

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!isAllowedEmail(email)) {
      setError(`Only @${ALLOWED_DOMAIN} email addresses are allowed.`);
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    const supabase = createBrowserClient();
    const { error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (signupError) {
      setError(signupError.message);
      setLoading(false);
      return;
    }

    // Try to sign in immediately (if email confirmation is disabled)
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      // Likely needs email confirmation
      setMessage('Account created! Check your email to confirm, then sign in.');
      setLoading(false);
      return;
    }

    router.push('/');
    router.refresh();
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
      setMessage('Check your email for a password reset link.');
    }
    setLoading(false);
  }

  const handleSubmit =
    mode === 'login' ? handleLogin
    : mode === 'signup' ? handleSignup
    : handleReset;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f8fa] px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-[#1a1a2e] text-center mb-1">
          Yachting Advisors
        </h1>
        <p className="text-gray-400 text-center mb-8 text-sm">
          {mode === 'login' ? 'Sign in to your account' : mode === 'signup' ? 'Create your account' : 'Reset your password'}
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

          {mode !== 'reset' && (
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder={mode === 'signup' ? 'At least 6 characters' : ''}
                className="w-full bg-white border border-gray-300 rounded-lg text-sm text-[#33475b] px-4 py-2.5 focus:outline-none focus:border-[#ff7a59] focus:ring-1 focus:ring-[#ff7a59]"
              />
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
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
              ? mode === 'login' ? 'Signing in...' : mode === 'signup' ? 'Creating account...' : 'Sending...'
              : mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
          </button>

          {/* Footer links */}
          <div className="flex flex-col items-center gap-2 pt-1">
            {mode === 'login' && (
              <>
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="text-sm text-[#0091ae] hover:text-[#007a94] transition-colors"
                >
                  First time? Create an account
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('reset')}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Forgot password?
                </button>
              </>
            )}
            {mode === 'signup' && (
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-sm text-gray-500 hover:text-[#33475b] transition-colors"
              >
                Already have an account? Sign in
              </button>
            )}
            {mode === 'reset' && (
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-sm text-gray-500 hover:text-[#33475b] transition-colors"
              >
                Back to Sign In
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
