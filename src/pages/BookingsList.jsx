import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'

const STATUS_STYLES = {
  pending:   'bg-amber-50 text-amber-600 border-amber-200',
  confirmed: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  cancelled: 'bg-rose-50 text-rose-400 border-rose-200',
  completed: 'bg-sky-50 text-sky-500 border-sky-200',
}

const STATUS_OPTIONS = ['pending', 'confirmed', 'cancelled', 'completed']

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function formatTime(timeStr) {
  if (!timeStr) return '—'
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${m} ${ampm}`
}

function ServiceTag({ s, size = 'sm' }) {
  const label = s.option_label && s.option_label !== 'Default' ? `${s.service_name} · ${s.option_label}` : s.service_name
  const price = s.option_price ? ` ₱${Number(s.option_price).toLocaleString()}` : ''
  return (
    <span className={`inline-flex items-center gap-1 bg-white text-[#7a5a50] px-3 py-1.5 rounded-xl border border-[#f0ddd5] ${size === 'xs' ? 'text-[10px]' : 'text-xs'}`}>
      {label}
      {price && <span className="text-[#c9a96e] font-medium">{price}</span>}
    </span>
  )
}

export default function BookingsList({ onNewBooking }) {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState(null)
  const [updatingStatus, setUpdatingStatus] = useState(null)

  const fetchBookings = async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select(`*, booking_services (service_id, service_name, option_label, option_price)`)
      .order('booking_date', { ascending: true })
      .order('booking_time', { ascending: true })

    if (!error && data) setBookings(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchBookings()
    const channel = supabase
      .channel('bookings-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, fetchBookings)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const updateStatus = async (bookingId, newStatus) => {
    setUpdatingStatus(bookingId)
    await supabase.from('bookings').update({ status: newStatus }).eq('id', bookingId)
    await fetchBookings()
    setUpdatingStatus(null)
  }

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter)
  const counts = bookings.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1
    return acc
  }, {})

  return (
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-2xl font-semibold text-[#5a3e36]">Bookings</h2>
          <p className="text-[#c4a99f] text-sm mt-1">{bookings.length} total appointment{bookings.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={onNewBooking}
          className="px-5 py-2.5 rounded-2xl text-sm font-semibold bg-gradient-to-r from-[#c9a96e] to-[#d4b97e] text-white hover:from-[#d4b97e] hover:to-[#e0c98e] shadow-md transition-all"
        >
          + New Booking
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {STATUS_OPTIONS.map(s => (
          <div
            key={s}
            onClick={() => setFilter(filter === s ? 'all' : s)}
            className={`bg-white rounded-2xl border p-4 cursor-pointer transition-all hover:shadow-md ${
              filter === s ? 'border-[#c9a96e] shadow-md' : 'border-[#f0ddd5]'
            }`}
          >
            <div className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border mb-2 ${STATUS_STYLES[s]}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </div>
            <div className="text-2xl font-semibold text-[#5a3e36]">{counts[s] || 0}</div>
          </div>
        ))}
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {['all', ...STATUS_OPTIONS].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-xl text-xs font-medium tracking-wide transition-all border ${
              filter === s
                ? 'bg-[#c9a96e]/10 text-[#a07840] border-[#c9a96e]/30'
                : 'bg-white text-[#b89890] border-[#f0ddd5] hover:border-[#e0ccc5] hover:text-[#7a5a50]'
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
            <span className="ml-1.5 opacity-60">
              {s === 'all' ? bookings.length : (counts[s] || 0)}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-20 text-[#d4b8b0] text-sm">Loading bookings...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-[#f0ddd5]">
          <div className="text-4xl mb-3">🌸</div>
          <p className="text-[#c4a99f] text-sm">No bookings found</p>
          <button onClick={onNewBooking} className="mt-3 text-[#c9a96e] text-sm hover:underline">
            Create the first one →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(booking => {
            const dateObj = booking.booking_date ? new Date(booking.booking_date + 'T00:00:00') : null
            const total = booking.booking_services?.reduce((sum, s) => sum + (s.option_price || 0), 0) || 0
            return (
              <div
                key={booking.id}
                className={`bg-white rounded-3xl border transition-all overflow-hidden ${
                  expanded === booking.id ? 'border-[#c9a96e]/30 shadow-md' : 'border-[#f0ddd5] hover:border-[#e0ccc5] hover:shadow-sm'
                }`}
              >
                {/* Row */}
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer"
                  onClick={() => setExpanded(expanded === booking.id ? null : booking.id)}
                >
                  {/* Date badge */}
                  <div className="text-center min-w-[44px] bg-[#fdf8f5] rounded-2xl border border-[#f0ddd5] py-2 px-1">
                    <div className="text-[9px] text-[#c4a99f] uppercase tracking-wider font-medium">
                      {dateObj ? MONTHS[dateObj.getMonth()] : '—'}
                    </div>
                    <div className="text-lg font-bold text-[#5a3e36] leading-tight">
                      {dateObj ? dateObj.getDate() : '—'}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[#5a3e36]">{booking.customer_name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${STATUS_STYLES[booking.status] || STATUS_STYLES.pending}`}>
                        {booking.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-[#c4a99f] flex-wrap">
                      <span>{formatTime(booking.booking_time)}</span>
                      {booking.contact_number && <><span>·</span><span>{booking.contact_number}</span></>}
                      <span>·</span>
                      <span>{booking.booking_services?.length || 0} service{booking.booking_services?.length !== 1 ? 's' : ''}</span>
                      {total > 0 && <><span>·</span><span className="text-[#c9a96e] font-medium">₱{total.toLocaleString()}</span></>}
                    </div>
                  </div>

                  {/* Service preview — desktop */}
                  <div className="hidden md:flex flex-wrap gap-1.5 max-w-xs justify-end">
                    {booking.booking_services?.slice(0, 2).map(s => (
                      <span key={s.service_id} className="text-[10px] bg-[#fdf0ea] text-[#b89070] px-2.5 py-1 rounded-lg border border-[#f0ddd5]">
                        {s.service_name}{s.option_label && s.option_label !== 'Default' ? ` · ${s.option_label}` : ''}
                      </span>
                    ))}
                    {booking.booking_services?.length > 2 && (
                      <span className="text-[10px] text-[#c4a99f] px-2 py-1">
                        +{booking.booking_services.length - 2} more
                      </span>
                    )}
                  </div>

                  <span className={`text-[#c4a99f] text-base transition-transform duration-200 ${expanded === booking.id ? 'rotate-180' : ''}`}>
                    ⌄
                  </span>
                </div>

                {/* Expanded */}
                {expanded === booking.id && (
                  <div className="border-t border-[#f0ddd5] px-5 py-5 bg-[#fdf8f5] space-y-4">
                    {/* Services with variants */}
                    <div>
                      <p className="text-[10px] text-[#c4a99f] uppercase tracking-widest font-medium mb-2">Services</p>
                      <div className="flex flex-wrap gap-2">
                        {booking.booking_services?.map(s => (
                          <ServiceTag key={s.service_id} s={s} />
                        ))}
                      </div>
                      {total > 0 && (
                        <p className="text-xs text-[#c9a96e] font-semibold mt-3">
                          Estimated Total: ₱{total.toLocaleString()}
                        </p>
                      )}
                    </div>

                    {/* Notes */}
                    {booking.notes && (
                      <div>
                        <p className="text-[10px] text-[#c4a99f] uppercase tracking-widest font-medium mb-2">Notes</p>
                        <p className="text-sm text-[#7a5a50] bg-white rounded-2xl px-4 py-3 border border-[#f0ddd5]">{booking.notes}</p>
                      </div>
                    )}

                    {/* Status */}
<div>
  <p className="text-[10px] text-[#c4a99f] uppercase tracking-widest font-medium mb-2">Actions</p>
  <div className="flex gap-2 flex-wrap">
    {booking.status !== 'cancelled' && booking.status !== 'completed' && (
      <button
        onClick={() => updateStatus(booking.id, 'cancelled')}
        disabled={updatingStatus === booking.id}
        className="px-4 py-2 rounded-xl text-xs border font-medium transition-all bg-white text-rose-400 border-rose-200 hover:bg-rose-50 disabled:opacity-40"
      >
        Cancel Booking
      </button>
    )}
    <button
      onClick={async () => {
  if (!confirm('Delete this booking permanently?')) return;
  setUpdatingStatus(booking.id);

  // 1. Clear technician assignments first (local SQLite)
  try {
    await window.api.deleteTechnicianAssignments(String(booking.id));
  } catch (e) {
    console.error('Failed to clear assignments:', e);
  }

  // 2. Delete booking_services (check your actual FK column name)
  await supabase.from('booking_services').delete().eq('booking_id', booking.id);

  // 3. Delete the booking itself
  const { error } = await supabase.from('bookings').delete().eq('id', booking.id);

  if (error) {
    console.error('Delete failed:', error);
    alert('Delete failed: ' + error.message);
    setUpdatingStatus(null);
    return;
  }

  await fetchBookings();
  setExpanded(null);
  setUpdatingStatus(null);
}}
      disabled={updatingStatus === booking.id}
      className="px-4 py-2 rounded-xl text-xs border font-medium transition-all bg-white text-gray-400 border-gray-200 hover:bg-gray-50 hover:text-rose-500 hover:border-rose-200 disabled:opacity-40"
    >
      Delete
    </button>
  </div>
</div>

                    <p className="text-[10px] text-[#d4b8b0]">
                      Created {new Date(booking.created_at).toLocaleString('en-PH')}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}