import { useState } from "react";
import { supabase } from "../utils/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError("Incorrect email or password.");
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#fdf8f5] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-[#c9a96e] to-[#d4b97e] rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-[#c9a96e]/25">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#4a3028]">Brewtiful-U</h1>
          <p className="text-sm text-[#c4a99f] mt-1">Spa Lounge · Bookings</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-[#ecddd6] shadow-sm p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs text-[#b89890] mb-1.5 font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@brewtiful.com"
                className="w-full bg-white border border-[#ecddd6] rounded-2xl px-4 py-3.5 text-sm text-[#4a3028] placeholder-[#d4b8b0] focus:outline-none focus:border-[#c9a96e] focus:ring-4 focus:ring-[#c9a96e]/8 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs text-[#b89890] mb-1.5 font-medium">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-white border border-[#ecddd6] rounded-2xl px-4 py-3.5 text-sm text-[#4a3028] placeholder-[#d4b8b0] focus:outline-none focus:border-[#c9a96e] focus:ring-4 focus:ring-[#c9a96e]/8 transition-all"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 bg-rose-50 border border-rose-200 rounded-2xl text-sm text-rose-600">
                <span className="w-4 h-4 rounded-full bg-rose-100 flex items-center justify-center text-xs flex-shrink-0">✕</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl text-sm font-bold bg-gradient-to-r from-[#c9a96e] to-[#d4b97e] text-white hover:from-[#d4b97e] hover:to-[#e0c98e] shadow-lg shadow-[#c9a96e]/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}