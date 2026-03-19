'use client';

import { useState } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
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
      setMessage('Check your email for a password reset link');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0c10] px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-white text-center mb-2">
          Yachting Advisors
        </h1>
        <p className="text-gray-500 text-center mb-8 text-sm">
          Meta Leads CRM
        </p>

        <form onSubmit={resetMode ? handleReset : handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3">
              {error}
            </div>
          )}
          {message && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-lg p-3">
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
              className="w-full bg-[#141620] border border-gray-700 rounded-lg text-sm text-gray-200 px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {!resetMode && (
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-[#141620] border border-gray-700 rounded-lg text-sm text-gray-200 px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading
              ? resetMode ? 'Sending...' : 'Signing in...'
              : resetMode ? 'Send Reset Link' : 'Sign In'}
          </button>

          <button
            type="button"
            onClick={() => { setResetMode(!resetMode); setError(''); setMessage(''); }}
            className="w-full text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            {resetMode ? 'Back to Sign In' : 'Forgot password?'}
          </button>
        </form>
      </div>
    </div>
  );
}
