import React, { useState, useEffect } from 'react';
import { API_ROOT } from '../services/api';
import { AlertCircle, ArrowRight } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (token: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const authError = params.get('auth_error');
    const authMode = params.get('auth_mode');

    if (token) {
      onLoginSuccess(token);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (authError) {
      if (authError === 'token_exchange_failed') {
        setErrorMessage('Google token exchange failed. Please verify GOOGLE_CLIENT_SECRET on Render.');
      } else if (authError === 'no_code') {
        setErrorMessage('Google did not return an authorization code.');
      } else {
        setErrorMessage(`Google authentication notice: ${authError}. You can use Quick Login below!`);
      }
    } else if (authMode === 'dev') {
      setErrorMessage('Google OAuth credentials not configured on backend. Use Direct Login below.');
    }
  }, [onLoginSuccess]);

  const handleGoogleLogin = () => {
    setErrorMessage(null);
    window.location.href = `${API_ROOT}/api/auth/google`;
  };

  const handleQuickLogin = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_ROOT}/api/auth/dev-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'oliver.brown@reachinbox.ai', name: 'Oliver Brown' }),
      });
      const data = await res.json();
      if (data.token) {
        onLoginSuccess(data.token);
      }
    } catch (err) {
      console.error('Login error:', err);
      setErrorMessage('Failed to connect to backend. Please check connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_ROOT}/api/auth/dev-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email || 'oliver.brown@reachinbox.ai', name: 'Oliver Brown' }),
      });
      const data = await res.json();
      if (data.token) {
        onLoginSuccess(data.token);
      }
    } catch (err) {
      console.error('Login error:', err);
      setErrorMessage('Failed to log in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col items-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Login</h1>
        <p className="text-xs text-gray-400 mb-6 text-center">ReachInbox Email Job Scheduler</p>

        {errorMessage && (
          <div className="w-full mb-5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Google Login Button (Matching Figma) */}
        <button
          onClick={handleGoogleLogin}
          type="button"
          className="w-full py-2.5 px-4 bg-[#E8F5E9] hover:bg-[#D7ECD9] text-[#1B5E20] font-medium text-sm rounded-full flex items-center justify-center gap-3 transition-colors border border-[#C8E6C9] mb-3 cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Login with Google
        </button>

        {/* 1-Click Instant Demo Login Button */}
        <button
          onClick={handleQuickLogin}
          type="button"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium text-xs rounded-full flex items-center justify-center gap-2 transition-colors border border-gray-200 mb-4 cursor-pointer"
        >
          <span>🚀 Instant One-Click Login (Demo)</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        {/* Divider */}
        <div className="w-full flex items-center my-3">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="px-3 text-xs text-gray-400 font-normal">or sign in with email</span>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleEmailLogin} className="w-full flex flex-col gap-3 mt-1">
          <input
            type="email"
            placeholder="Email ID"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 bg-[#F4F5F7] border border-transparent focus:border-emerald-500 focus:bg-white text-xs rounded-lg outline-none transition-all placeholder:text-gray-400"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2.5 bg-[#F4F5F7] border border-transparent focus:border-emerald-500 focus:bg-white text-xs rounded-lg outline-none transition-all placeholder:text-gray-400"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 mt-2 bg-[#00A859] hover:bg-[#008746] text-white font-medium text-xs rounded-lg transition-colors cursor-pointer text-center shadow-sm"
          >
            {loading ? 'Logging in...' : 'Login with Email'}
          </button>
        </form>
      </div>
    </div>
  );
};
