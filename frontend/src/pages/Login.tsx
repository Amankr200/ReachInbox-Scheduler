import React, { useState } from 'react';
import { API_ROOT } from '../services/api';

interface LoginProps {
  onLoginSuccess: (token: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = () => {
    // Redirect to backend Google OAuth route
    window.location.href = `${API_ROOT}/api/auth/google`;
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Call dev-login endpoint for fast local testing/demo
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col items-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">Login</h1>

        {/* Google Login Button (Matching Figma) */}
        <button
          onClick={handleGoogleLogin}
          type="button"
          className="w-full py-2.5 px-4 bg-[#E8F5E9] hover:bg-[#D7ECD9] text-[#1B5E20] font-medium text-sm rounded-full flex items-center justify-center gap-3 transition-colors border border-[#C8E6C9] mb-5 cursor-pointer"
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

        {/* Divider */}
        <div className="w-full flex items-center my-4">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="px-3 text-xs text-gray-400 font-normal">or sign up through email</span>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleEmailLogin} className="w-full flex flex-col gap-3 mt-2">
          <input
            type="email"
            placeholder="Email ID"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-[#F4F5F7] border border-transparent focus:border-emerald-500 focus:bg-white text-sm rounded-lg outline-none transition-all placeholder:text-gray-400"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-[#F4F5F7] border border-transparent focus:border-emerald-500 focus:bg-white text-sm rounded-lg outline-none transition-all placeholder:text-gray-400"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-3 bg-[#00A859] hover:bg-[#008746] text-white font-medium text-sm rounded-lg transition-colors cursor-pointer text-center shadow-sm"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};
