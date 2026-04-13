import BookingForm from './pages/BookingForm'
import BookingsList from './pages/BookingsList'
import { useState, useEffect } from 'react'
import { supabase } from './utils/supabaseClient'
import Login from './pages/Login'


export default function App() {
  const [page, setPage] = useState('list')

  const [session, setSession] = useState(undefined); // undefined = still loading

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for login/logout changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Still checking auth
  if (session === undefined) {
    return (
      <div className="min-h-screen bg-[#fdf8f5] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#e8d5cc] border-t-[#c9a96e] rounded-full animate-spin" />
      </div>
    );
  }

  // Not logged in
  if (!session) return <Login />;

  return (
    <div className="min-h-screen bg-[#fdf8f5] font-['Outfit',sans-serif]">
      {/* Decorative gradient bar */}
      <div className="h-1 bg-gradient-to-r from-[#f7d9cc] via-[#c9a96e] to-[#f7d9cc]" />

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-[#f0e6de] px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#c9a96e] to-[#e8c99a] flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-sm">B</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-widest uppercase text-[#c9a96e]">Brewtiful U</h1>
            <p className="text-[10px] text-[#c4a99f] tracking-wider uppercase">Bookings Portal</p>
          </div>
        </div>
        <nav className="flex items-center gap-1 bg-[#fdf0ea] rounded-2xl p-1 border border-[#f0ddd5]">
          <button
            onClick={() => setPage('list')}
            className={`px-5 py-2 rounded-xl text-xs font-medium tracking-wide transition-all duration-200 ${
              page === 'list'
                ? 'bg-[#c9a96e] text-white shadow-sm'
                : 'text-[#c4907a] hover:text-[#c9a96e]'
            }`}
          >
            All Bookings
          </button>
          <button
            onClick={() => setPage('new')}
            className={`px-5 py-2 rounded-xl text-xs font-medium tracking-wide transition-all duration-200 ${
              page === 'new'
                ? 'bg-[#c9a96e] text-white shadow-sm'
                : 'text-[#c4907a] hover:text-[#c9a96e]'
            }`}
          >
            + New Booking
          </button>
        </nav>
      </header>

      {/* Page Content */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        {page === 'list' ? (
          <BookingsList onNewBooking={() => setPage('new')} />
        ) : (
          <BookingForm onSuccess={() => setPage('list')} onCancel={() => setPage('list')} />
        )}
      </main>
    </div>
  )
}